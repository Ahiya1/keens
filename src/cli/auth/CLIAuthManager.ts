/**
 * CLI Authentication Manager
 * Handles local authentication state, token storage, and user session management for CLI
 */

import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { AuthenticationService } from "../../api/services/AuthenticationService.js";
import { UserDAO } from "../../database/dao/UserDAO.js";
import { DatabaseManager } from "../../database/DatabaseManager.js";
import { AuditLogger } from "../../api/services/AuditLogger.js";
import { UserContext } from "../../database/DatabaseManager.js";
import { LoginCredentials, ClientInfo } from "../../api/types.js";

export interface CLIAuthState {
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    role: string;
    isAdmin: boolean;
    adminPrivileges?: any;
  };
  tokens: {
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
    );
  }

  /**
   * Initialize the auth manager and load existing authentication state
   */
  async initialize(): Promise<void> {
    try {
      // Initialize database connection
      if (!this.db.isConnected) {
        await this.db.initialize();
      }
      
      // Load existing auth state
      await this.loadAuthState();
      
      // Validate and refresh token if needed
      if (this.currentAuth) {
        await this.validateAndRefreshAuth();
      }
    } catch (error) {
      console.error('Failed to initialize CLI auth manager:', error);
      // Clear invalid auth state
      this.currentAuth = null;
      await this.clearAuthState();
    }
  }

  /**
   * Login with email and password
   */
  async login(options: CLILoginOptions): Promise<{ success: boolean; message: string }> {
    try {
      const credentials: LoginCredentials = {
        email: options.email,
        password: options.password
      };

      const clientInfo: ClientInfo = {
        ip: '127.0.0.1', // CLI is always local
        userAgent: 'keen-cli',
        deviceId: await this.getDeviceId()
      };

      const authResult = await this.authService.login(credentials, clientInfo);
      
      // 🔧 FIXED: Handle potential undefined values properly with fallbacks
      if (!authResult.user || !authResult.tokens) {
        throw new Error('Invalid authentication result');
      }
      
      // Create CLI auth state with proper null checking and fallbacks
      this.currentAuth = {
        user: {
          id: authResult.user.id,
          email: authResult.user.email || '',
          username: authResult.user.username || '',
          displayName: authResult.user.display_name || undefined,
          role: authResult.user.role || 'user',
          isAdmin: authResult.user.is_admin || false,
          adminPrivileges: authResult.user.admin_privileges || undefined
        },
        tokens: {
          accessToken: authResult.tokens.access_token,
          refreshToken: authResult.tokens.refresh_token,
          expiresAt: Date.now() + (authResult.tokens.expires_in * 1000)
        },
        loginTime: Date.now(),
        lastActivity: Date.now()
      };

      // Save auth state to file
      await this.saveAuthState();

      const isAdmin = authResult.adminAccess || authResult.user.is_admin || false;
      const username = authResult.user.username || authResult.user.email || 'Unknown User';
      return {
        success: true,
        message: `Successfully logged in as ${username}${isAdmin ? ' (Admin)' : ''}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed'
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
          console.warn('Failed to revoke refresh token:', error);
        }
      }

      // Clear local auth state
      this.currentAuth = null;
      await this.clearAuthState();

      return {
        success: true,
        message: 'Successfully logged out'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logout failed'
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
      adminPrivileges: this.currentAuth.user.adminPrivileges
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
      );
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
      );

      // Update tokens
      this.currentAuth.tokens.accessToken = refreshed.access_token;
      this.currentAuth.tokens.expiresAt = Date.now() + (refreshed.expires_in * 1000);
      this.currentAuth.lastActivity = Date.now();

      // Save updated state
      await this.saveAuthState();
      return true;
    } catch (error) {
      // Refresh failed, clear auth state
      this.currentAuth = null;
      await this.clearAuthState();
      return false;
    }
  }

  /**
   * Load authentication state from file
   */
  private async loadAuthState(): Promise<void> {
    try {
      await this.ensureAuthDirectory();
      const data = await fs.readFile(this.authFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Validate required fields
      if (parsed.user?.id && parsed.tokens?.accessToken && parsed.tokens?.refreshToken) {
        this.currentAuth = parsed;
      }
    } catch (error) {
      // File doesn't exist or is invalid - that's fine for first time
      this.currentAuth = null;
    }
  }

  /**
   * Save authentication state to file
   */
  private async saveAuthState(): Promise<void> {
    try {
      await this.ensureAuthDirectory();
      await fs.writeFile(
        this.authFile, 
        JSON.stringify(this.currentAuth, null, 2),
        { mode: 0o600 } // Read/write for owner only
      );
    } catch (error) {
      console.error('Failed to save auth state:', error);
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
   */
  private async getDeviceId(): Promise<string> {
    const deviceFile = join(homedir(), '.keen', 'device-id');
    
    try {
      return await fs.readFile(deviceFile, 'utf-8');
    } catch (error) {
      // Generate new device ID using ES module import
      const deviceId = randomBytes(16).toString('hex');
      try {
        await this.ensureAuthDirectory();
        await fs.writeFile(deviceFile, deviceId, { mode: 0o600 });
      } catch (writeError) {
        console.warn('Failed to save device ID:', writeError);
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
      console.error('Error during auth manager cleanup:', error);
    }
  }
}

// Singleton instance for CLI usage
export const cliAuth = new CLIAuthManager();
