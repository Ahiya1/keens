/**
 * CLI Authentication Manager
 * Handles local authentication state, token storage, and user session management for CLI
 * SECURITY: Removed sensitive logging and improved error handling - Enhanced
 */

import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import chalk from "chalk";
import { AuthenticationService } from "../../api/services/AuthenticationService.js";
import { UserDAO } from "../../database/dao/UserDAO.js";
import { DatabaseManager } from "../../database/DatabaseManager.js";
import { AuditLogger } from "../../api/services/AuditLogger.js";
import { UserContext } from "../../database/DatabaseManager.js";
import { LoginCredentials, ClientInfo } from "../../api/types.js";

export interface CLIAuthState {
  user: {,
    id: string;
    email: string;
    username: string;
    displayName?: string;
    role: string;
    isAdmin: boolean;
    adminPrivileges?: any;
  };
  tokens: {,
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
  loginTime: number;
  lastActivity: number;
}

export interface CLILoginOptions {
  email: string;
  password: string;
  remember?: boolean;
}

export class CLIAuthManager {
  private authFile: string;
  private authService: AuthenticationService;
  private userDAO: UserDAO;
  private db: DatabaseManager;
  private currentAuth: CLIAuthState | null = null;

  constructor() {
    // Initialize auth file path in user's home directory
    const keenDir = join(homedir(), '.keen');
    this.authFile = join(keenDir, 'auth.json');
    
    // Initialize database and services
    this.db = new DatabaseManager();
    this.userDAO = new UserDAO(this.db);
    
    // Create audit logger (simplified for CLI)
    const auditLogger = new AuditLogger(this.db);
    
    this.authService = new AuthenticationService(
      this.db,
      this.userDAO,
      auditLogger

  }

  /**
   * Initialize the auth manager and load existing authentication state
   * SECURITY: Removed sensitive information from logs - Enhanced
   */
  async initialize(): Promise<void> {
    try {
      // Load existing auth state FIRST before initializing database
      // This ensures we don't lose auth if database init fails
      await this.loadAuthState();
      
      // Initialize database connection only if needed
      if (!this.db.isConnected) {
        try {
          await this.db.initialize();
        } catch (dbError) {
          // Database init failed, but we might still have valid auth state
          // Don't clear the auth state just because DB is down
          if (process.env.DEBUG) {
            console.warn('Database connection failed, but continuing with cached auth');
          }
        }
      }
      
      // Only validate tokens if we have a database connection
      if (this.currentAuth && this.db.isConnected) {
        try {
          await this.validateAndRefreshAuth();
        } catch (validationError) {
          // Token validation failed, but keep the auth state
          // The token might still be valid, just can't verify with DB
          if (process.env.DEBUG) {
            console.warn('Token validation failed, using cached auth');
          }
        }
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.error('Failed to initialize CLI auth manager:', error);
      }
      // DON'T clear auth state on initialization errors!
      // The auth file might still be valid even if DB is down
    }
  }

  /**
   * Login with email and password
   * SECURITY: No sensitive data logged in production
   */
  async login(options: CLILoginOptions): Promise<{ success: boolean; message: string }> {
    try {
      const credentials: LoginCredentials = {
        email: options.email,
        password: options.password,
      };

      const clientInfo: ClientInfo = {
        ip: '127.0.0.1', // CLI is always local
        userAgent: 'keen-cli',
        deviceId: await this.getDeviceId(),
      };

      const authResult = await this.authService.login(credentials, clientInfo);
      
      // Handle potential undefined values properly with fallbacks
      if (!authResult.user || !authResult.tokens) {
        throw new Error('Invalid authentication result');
      }
      
      // Create CLI auth state with proper null checking and fallbacks
      this.currentAuth = {
        user: {,
          id: authResult.user.id,
          email: authResult.user.email || '',
          username: authResult.user.username || '',
          displayName: authResult.user.display_name || undefined,
          role: authResult.user.role || 'user',
          isAdmin: authResult.user.is_admin || false,
          adminPrivileges: authResult.user.admin_privileges || undefined,
        },
        tokens: {,
          accessToken: authResult.tokens.access_token,
          refreshToken: authResult.tokens.refresh_token,
          expiresAt: Date.now() + (authResult.tokens.expires_in * 1000),
        },
        loginTime: Date.now(),
        lastActivity: Date.now(),
      };

      // Save auth state to file and ensure it completes
      try {
        await this.saveAuthState();
        
        // Verify the file was actually saved
        const exists = await fs.access(this.authFile).then(() => true).catch(() => false);
        if (!exists) {
          throw new Error('Failed to save authentication state to disk');
        }
      } catch (saveError: any) {
        if (process.env.DEBUG) {
          console.error('Failed to persist authentication:', saveError.message);
        }
        // Continue anyway - auth is in memory
      }

      const isAdmin = authResult.adminAccess || authResult.user.is_admin || false;
      const username = authResult.user.username || authResult.user.email || 'Unknown User';
      return {
        success: true,
        message: `Successfully logged in as ${username}${isAdmin ? ' (Admin)' : ''}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout and clear authentication state
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.currentAuth?.tokens.refreshToken) {
        // Revoke the refresh token on server
        try {
          await this.authService.revokeRefreshToken(this.currentAuth.tokens.refreshToken);
        } catch (error) {
          // Continue with logout even if revocation fails
          if (process.env.DEBUG) {
            console.warn('Failed to revoke refresh token');
          }
        }
      }

      // Clear local auth state
      this.currentAuth = null;
      await this.clearAuthState();

      return {
        success: true,
        message: 'Successfully logged out',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logout failed',
      };
    }
  }

  /**
   * Get current user context for database operations
   */
  async getCurrentUserContext(): Promise<UserContext | null> {
    if (!this.currentAuth) {
      return null;
    }

    // Validate token is still valid
    if (Date.now() > this.currentAuth.tokens.expiresAt) {
      // Try to refresh
      if (!(await this.refreshToken())) {
        return null;
      }
    }

    return {
      userId: this.currentAuth.user.id,
      isAdmin: this.currentAuth.user.isAdmin,
      adminPrivileges: this.currentAuth.user.adminPrivileges,
    };
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    if (!this.currentAuth) {
      return false;
    }

    // Check if token is expired (with 5-minute buffer)
    return Date.now() < (this.currentAuth.tokens.expiresAt - 5 * 60 * 1000);
  }

  /**
   * Get current user info
   */
  getCurrentUser(): CLIAuthState['user'] | null {
    return this.currentAuth?.user || null;
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    if (this.currentAuth) {
      this.currentAuth.lastActivity = Date.now();
      // Save updated state (don't await to avoid blocking)
      this.saveAuthState().catch(() => {});
    }
  }

  /**
   * Require authentication - throw error if not authenticated
   */
  async requireAuth(): Promise<UserContext> {
    const userContext = await this.getCurrentUserContext();
    if (!userContext) {
      throw new Error(
        'Authentication required. Please run "keen login" to authenticate.'

    }
    
    this.updateActivity();
    return userContext;
  }

  /**
   * Validate and refresh authentication if needed
   */
  private async validateAndRefreshAuth(): Promise<boolean> {
    if (!this.currentAuth) {
      return false;
    }

    // Check if token is expired
    if (Date.now() > this.currentAuth.tokens.expiresAt) {
      return await this.refreshToken();
    }

    // Validate token with server
    try {
      await this.authService.verifyAccessToken(this.currentAuth.tokens.accessToken);
      return true;
    } catch (error) {
      // Try to refresh if verification fails
      return await this.refreshToken();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(): Promise<boolean> {
    if (!this.currentAuth?.tokens.refreshToken) {
      return false;
    }

    try {
      const refreshed = await this.authService.refreshAccessToken(
        this.currentAuth.tokens.refreshToken

      // Update tokens
      this.currentAuth.tokens.accessToken = refreshed.access_token;
      this.currentAuth.tokens.expiresAt = Date.now() + (refreshed.expires_in * 1000);
      this.currentAuth.lastActivity = Date.now();

      // Save updated state
      await this.saveAuthState();
      return true;
    } catch (error) {
      // Refresh failed, but don't immediately clear auth state
      // User might just be offline or DB might be down
      if (process.env.DEBUG) {
        console.warn('Token refresh failed');
      }
      // Only clear if token is definitely expired
      if (Date.now() > this.currentAuth.tokens.expiresAt + 24 * 60 * 60 * 1000) {
        // Token expired more than 24 hours ago, clear it
        this.currentAuth = null;
        await this.clearAuthState();
      }
      return false;
    }
  }

  /**
   * Load authentication state from file
   * SECURITY: Removed sensitive logging of user data - Enhanced
   */
  private async loadAuthState(): Promise<void> {
    try {
      await this.ensureAuthDirectory();
      
      if (process.env.DEBUG) {}
      
      const data = await fs.readFile(this.authFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Validate required fields
      if (parsed.user?.id && parsed.tokens?.accessToken && parsed.tokens?.refreshToken) {
        this.currentAuth = parsed;
        
        if (process.env.DEBUG) {}
      } else {
        if (process.env.DEBUG) {}
      }
    } catch (error: any) {
      // File doesn't exist or is invalid - that's fine for first time
      if (process.env.DEBUG) {}
      this.currentAuth = null;
    }
  }

  /**
   * Save authentication state to file
   * SECURITY: Reduced debug logging - Enhanced
   */
  private async saveAuthState(): Promise<void> {
    try {
      await this.ensureAuthDirectory();
      
      if (process.env.DEBUG) {}
      
      await fs.writeFile(
        this.authFile, 
        JSON.stringify(this.currentAuth, null, 2),
        { mode: 0o600 } // Read/write for owner only

      // Verify file was written
      const exists = await fs.access(this.authFile).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Auth file was not created');
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.error('Failed to save auth state:', error);
      }
      throw error; // Re-throw to handle upstream
    }
  }

  /**
   * Clear authentication state file
   */
  private async clearAuthState(): Promise<void> {
    try {
      await fs.unlink(this.authFile);
    } catch (error) {
      // File might not exist - that's fine
    }
  }

  /**
   * Ensure .keen directory exists
   */
  private async ensureAuthDirectory(): Promise<void> {
    const keenDir = join(homedir(), '.keen');
    try {
      await fs.mkdir(keenDir, { recursive: true, mode: 0o700 });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Get or generate device ID for tracking
   * SECURITY: Using crypto.randomBytes instead of Math.random - Enhanced
   */
  private async getDeviceId(): Promise<string> {
    const deviceFile = join(homedir(), '.keen', 'device-id');
    
    try {
      return await fs.readFile(deviceFile, 'utf-8');
    } catch (error) {
      // Generate new device ID using cryptographically secure random bytes
      const deviceId = randomBytes(16).toString('hex');
      try {
        await this.ensureAuthDirectory();
        await fs.writeFile(deviceFile, deviceId, { mode: 0o600 });
      } catch (writeError) {
        if (process.env.DEBUG) {
          console.warn('Failed to save device ID');
        }
      }
      return deviceId;
    }
  }

  /**
   * Cleanup - close database connection
   */
  async cleanup(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      if (process.env.DEBUG) {
        console.error('Error during auth manager cleanup:', error);
      }
    }
  }
}

// Singleton instance for CLI usage
export const cliAuth = new CLIAuthManager();
