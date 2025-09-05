/**
 * CLI Authentication Manager - FIXED VERSION
 * CRITICAL FIX: Removed graceful fallbacks that hide database failures
 * Uses enhanced DatabaseManager with proper SQL conversion
 * Now properly exposes database connection issues instead of hiding them
 */

import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import chalk from "chalk";
import { AuthenticationService } from "../../api/services/AuthenticationService.js";
import { UserDAO } from "../../database/dao/UserDAO.js";
import { DatabaseManagerEnhanced } from "../../database/DatabaseManagerEnhanced.js";
import { AuditLogger } from "../../api/services/AuditLogger.js";
import { UserContext } from "../../database/DatabaseManagerEnhanced.js";
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
  private db: DatabaseManagerEnhanced;
  private currentAuth: CLIAuthState | null = null;

  constructor() {
    // Initialize auth file path in user's home directory
    const keenDir = join(homedir(), '.keen');
    this.authFile = join(keenDir, 'auth.json');

    // FIXED: Use enhanced DatabaseManager with proper SQL conversion
    this.db = new DatabaseManagerEnhanced();
    this.userDAO = new UserDAO(this.db as any); // Cast for compatibility

    // Create audit logger
    const auditLogger = new AuditLogger(this.db as any);

    this.authService = new AuthenticationService(
      this.db as any,
      this.userDAO,
      auditLogger
    );
  }

  /**
   * Initialize the auth manager - FIXED: No graceful fallbacks
   * CRITICAL FIX: Database failures are now properly exposed
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔍 Initializing CLI authentication...');
      
      // FIXED: Always initialize database connection first
      // No graceful fallbacks - if DB fails, the whole init fails
      console.log('🔌 Connecting to database...');
      await this.db.initialize();
      
      if (!this.db.isConnected) {
        throw new Error('Database connection failed - cannot continue without database');
      }
      
      console.log('✅ Database connected successfully');
      
      // Load existing auth state after confirming DB works
      console.log('📁 Loading authentication state...');
      await this.loadAuthState();
      
      // FIXED: Always validate tokens against database
      // No cached auth fallbacks - if tokens are invalid, clear them
      if (this.currentAuth) {
        console.log('🔑 Validating existing authentication...');
        const isValid = await this.validateAndRefreshAuth();
        
        if (!isValid) {
          console.warn('⚠️ Existing authentication invalid - clearing auth state');
          this.currentAuth = null;
          await this.clearAuthState();
        } else {
          console.log('✅ Authentication validated successfully');
        }
      }
      
      console.log('🎉 CLI authentication initialized successfully');
      
    } catch (error: any) {
      console.error('❌ CLI authentication initialization failed:', error.message);
      
      // FIXED: Clear any invalid auth state on failure
      this.currentAuth = null;
      await this.clearAuthState();
      
      // FIXED: Re-throw error instead of hiding it
      throw new Error(`Authentication system initialization failed: ${error.message}`);
    }
  }

  /**
   * Login with email and password - FIXED: No graceful fallbacks
   */
  async login(options: CLILoginOptions): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔐 Attempting login...');
      
      // FIXED: Ensure database is connected before login
      if (!this.db.isConnected) {
        throw new Error('Database connection required for login');
      }
      
      const credentials: LoginCredentials = {
        email: options.email,
        password: options.password,
      };

      const clientInfo: ClientInfo = {
        ip: '127.0.0.1',
        userAgent: 'keen-cli-fixed',
        deviceId: await this.getDeviceId(),
      };

      console.log('🔍 Authenticating with database...');
      const authResult = await this.authService.login(credentials, clientInfo);

      if (!authResult.user || !authResult.tokens) {
        throw new Error('Invalid authentication result from server');
      }

      // Create CLI auth state with proper validation
      this.currentAuth = {
        user: {
          id: authResult.user.id,
          email: authResult.user.email || '',
          username: authResult.user.username || '',
          displayName: authResult.user.display_name || undefined,
          role: authResult.user.role || 'user',
          isAdmin: authResult.user.is_admin || false,
          adminPrivileges: authResult.user.admin_privileges || undefined,
        },
        tokens: {
          accessToken: authResult.tokens.access_token,
          refreshToken: authResult.tokens.refresh_token,
          expiresAt: Date.now() + (authResult.tokens.expires_in * 1000),
        },
        loginTime: Date.now(),
        lastActivity: Date.now(),
      };

      // FIXED: Save auth state with proper error handling
      console.log('💾 Saving authentication state...');
      await this.saveAuthState();

      // Verify the file was actually saved
      const exists = await fs.access(this.authFile).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Failed to persist authentication state to disk');
      }

      const isAdmin = authResult.adminAccess || authResult.user.is_admin || false;
      const username = authResult.user.username || authResult.user.email || 'Unknown User';
      
      console.log('✅ Login successful');
      return {
        success: true,
        message: `Successfully logged in as ${username}${isAdmin ? ' (Admin)' : ''}`
      };
      
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  /**
   * Get current user context - FIXED: No graceful fallbacks
   */
  async getCurrentUserContext(): Promise<UserContext | null> {
    if (!this.currentAuth) {
      return null;
    }

    // FIXED: Always validate token expiration
    if (Date.now() > this.currentAuth.tokens.expiresAt) {
      console.log('🔄 Token expired, attempting refresh...');
      const refreshed = await this.refreshToken();
      
      if (!refreshed) {
        console.warn('⚠️ Token refresh failed - clearing authentication');
        this.currentAuth = null;
        await this.clearAuthState();
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
   * Check if user is currently authenticated - FIXED: Strict validation
   */
  isAuthenticated(): boolean {
    if (!this.currentAuth) {
      return false;
    }

    // FIXED: Strict token expiration check with small buffer
    const isValid = Date.now() < (this.currentAuth.tokens.expiresAt - 60 * 1000); // 1-minute buffer
    
    if (!isValid) {
      console.warn('⚠️ Authentication expired');
    }
    
    return isValid;
  }

  /**
   * Get current user info
   */
  getCurrentUser(): CLIAuthState['user'] | null {
    return this.currentAuth?.user || null;
  }

  /**
   * Require authentication - FIXED: Clear error messages
   */
  async requireAuth(): Promise<UserContext> {
    const userContext = await this.getCurrentUserContext();
    if (!userContext) {
      throw new Error(
        'Authentication required. Please run "keen login" to authenticate.'
      );
    }

    return userContext;
  }

  /**
   * Validate and refresh authentication - FIXED: No graceful fallbacks
   */
  private async validateAndRefreshAuth(): Promise<boolean> {
    if (!this.currentAuth) {
      return false;
    }

    // Check if token is expired
    if (Date.now() > this.currentAuth.tokens.expiresAt) {
      console.log('🔄 Token expired, refreshing...');
      return await this.refreshToken();
    }

    // FIXED: Always validate token with server - no graceful fallbacks
    try {
      console.log('🔍 Validating token with server...');
      await this.authService.verifyAccessToken(this.currentAuth.tokens.accessToken);
      console.log('✅ Token validation successful');
      return true;
    } catch (error: any) {
      console.warn('⚠️ Token validation failed:', error.message);
      // Try to refresh if verification fails
      return await this.refreshToken();
    }
  }

  /**
   * Refresh access token - FIXED: Clear error handling
   */
  private async refreshToken(): Promise<boolean> {
    if (!this.currentAuth?.tokens.refreshToken) {
      console.warn('⚠️ No refresh token available');
      return false;
    }

    try {
      console.log('🔄 Refreshing access token...');
      const refreshed = await this.authService.refreshAccessToken(
        this.currentAuth.tokens.refreshToken
      );

      // Update tokens
      this.currentAuth.tokens.accessToken = refreshed.access_token;
      this.currentAuth.tokens.expiresAt = Date.now() + (refreshed.expires_in * 1000);
      this.currentAuth.lastActivity = Date.now();

      // Save updated state
      await this.saveAuthState();
      console.log('✅ Token refresh successful');
      return true;
      
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.message);
      
      // FIXED: Clear auth state on refresh failure
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
        console.log('📁 Auth state loaded from file');
      } else {
        console.warn('⚠️ Invalid auth state file, clearing');
        await this.clearAuthState();
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('📝 No existing auth state found');
      } else {
        console.warn('⚠️ Failed to load auth state:', error.message);
      }
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

      // Verify file was written
      const exists = await fs.access(this.authFile).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Auth file was not created');
      }
    } catch (error) {
      console.error('❌ Failed to save auth state:', error);
      throw error;
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
      // Generate new device ID using cryptographically secure random bytes
      const deviceId = randomBytes(16).toString('hex');
      try {
        await this.ensureAuthDirectory();
        await fs.writeFile(deviceFile, deviceId, { mode: 0o600 });
      } catch (writeError) {
        console.warn('⚠️ Failed to save device ID');
      }
      return deviceId;
    }
  }

  /**
   * Logout - clear authentication state
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔐 Logging out...');
      
      // Clear current auth state
      this.currentAuth = null;
      
      // Clear auth state file
      await this.clearAuthState();
      
      console.log('✅ Logout successful');
      return {
        success: true,
        message: 'Successfully logged out'
      };
      
    } catch (error: any) {
      console.error('❌ Logout failed:', error.message);
      return {
        success: false,
        message: error.message || 'Logout failed',
      };
    }
  }

  /**
   * Cleanup - close database connection
   */
  async cleanup(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      console.error('❌ Error during auth manager cleanup:', error);
    }
  }
}

// Export fixed instance
export const cliAuth = new CLIAuthManager();
