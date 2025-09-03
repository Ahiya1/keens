/**
 * UserDAO - Enhanced user management for keen-s-a with Supabase integration
 * Combines Supabase Auth with custom user management and admin privilege handling
 */

import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { DatabaseManager, UserContext } from "../DatabaseManager.js";
import { securityConfig, adminConfig, supabase, supabaseAdmin } from "../../config/database.js";

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash?: string; // Optional with Supabase Auth
  display_name?: string;
  avatar_url?: string; // Supabase Auth field
  role: "user" | "admin" | "super_admin";
  is_admin: boolean;
  admin_privileges?: {
    unlimited_credits?: boolean;
    bypass_rate_limits?: boolean;
    view_all_analytics?: boolean;
    user_impersonation?: boolean;
    system_diagnostics?: boolean;
    priority_execution?: boolean;
    global_access?: boolean;
    audit_access?: boolean;
  };
  email_verified: boolean;
  account_status: "active" | "suspended" | "banned";
  mfa_enabled: boolean;
  mfa_secret?: string;
  recovery_codes?: string[];
  timezone: string;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  last_login_ip?: string; // Added missing field
  last_seen?: Date; // Enhanced for real-time
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  display_name?: string;
  timezone?: string;
  preferences?: Record<string, any>;
  useSupabaseAuth?: boolean; // Option to use Supabase Auth vs custom auth
}

export interface LoginRequest {
  email: string;
  password: string;
  ip_address?: string;
}

export interface LoginResponse {
  user: Omit<User, "password_hash" | "mfa_secret" | "recovery_codes">;
  token: string;
  refresh_token?: string;
  expires_in: number;
  session?: any; // Supabase session if using Supabase Auth
}

export class UserDAO {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new user account (supports both Supabase Auth and custom)
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    let userId: string;
    let supabaseUser: any = null;

    if (request.useSupabaseAuth !== false) {
      // Use Supabase Auth by default
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: request.email,
        password: request.password,
        email_confirm: true,
        user_metadata: {
          username: request.username,
          display_name: request.display_name || request.username,
        },
      });

      if (error) {
        throw new Error(`Failed to create user with Supabase Auth: ${error.message}`);
      }

      supabaseUser = data.user;
      userId = supabaseUser.id;
    } else {
      // Use custom auth (backward compatibility)
      userId = uuidv4();
    }

    // Create user record in our users table
    const hashedPassword = request.useSupabaseAuth === false 
      ? await bcrypt.hash(request.password, securityConfig.bcryptRounds)
      : null;

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: request.email,
        username: request.username,
        password_hash: hashedPassword,
        display_name: request.display_name || request.username,
        avatar_url: supabaseUser?.user_metadata?.avatar_url,
        timezone: request.timezone || 'UTC',
        preferences: request.preferences || {},
        email_verified: supabaseUser ? true : false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user record: ${error.message}`);
    }

    // Remove sensitive data from response
    const user = { ...data };
    delete user.password_hash;
    delete user.mfa_secret;
    delete user.recovery_codes;

    return user as User;
  }

  /**
   * Authenticate user login (supports both Supabase Auth and custom)
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    // Try Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: request.email,
      password: request.password,
    });

    let user: User | null = null;
    let token: string;
    let refreshToken: string | undefined;
    let expiresIn: number;

    if (authData.user && !authError) {
      // Supabase Auth successful
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User record not found');
      }

      user = userData as User;
      token = authData.session?.access_token || '';
      refreshToken = authData.session?.refresh_token;
      expiresIn = authData.session?.expires_in || 3600;

      // Update last login in our table
      await supabaseAdmin
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: request.ip_address,
          last_seen: new Date().toISOString(),
        })
        .eq('id', user.id);

    } else {
      // Fall back to custom auth for backward compatibility
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', request.email)
        .eq('account_status', 'active')
        .single();

      if (userError || !userData) {
        throw new Error('Invalid email or password');
      }

      user = userData as User;

      if (!user.password_hash) {
        throw new Error('User configured for Supabase Auth only');
      }

      const isValidPassword = await bcrypt.compare(request.password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate custom JWT tokens
      if (!securityConfig.jwtSecret) {
        throw new Error('JWT secret not configured');
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isAdmin: user.is_admin,
        adminPrivileges: user.admin_privileges || {},
      };

      const jwtOptions: any = { expiresIn: securityConfig.jwtExpiresIn };
      token = jwt.sign(tokenPayload, securityConfig.jwtSecret, jwtOptions);
      expiresIn = 24 * 60 * 60; // 24 hours

      // Update last login
      await supabaseAdmin
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          last_login_ip: request.ip_address,
          last_seen: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    if (!user) {
      throw new Error('Authentication failed');
    }

    // Remove sensitive data
    const safeUser = { ...user };
    delete safeUser.password_hash;
    delete safeUser.mfa_secret;
    delete safeUser.recovery_codes;

    return {
      user: safeUser,
      token,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      session: authData.session,
    };
  }

  /**
   * Get user by email for authentication purposes (includes password_hash)
   */
  async getUserByEmailForAuth(
    email: string,
    context?: UserContext
  ): Promise<User | null> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return null;
    }

    return user as User;
  }

  /**
   * Verify admin user credentials
   */
  async verifyAdminUser(email: string, password: string): Promise<boolean> {
    if (email !== adminConfig.email) {
      return false;
    }

    const { data: adminUser, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', adminConfig.email)
      .eq('is_admin', true)
      .single();

    if (error || !adminUser) {
      return false;
    }

    // Try Supabase Auth first
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!authError) {
      return true;
    }

    // Fall back to custom auth if password_hash exists
    if (adminUser.password_hash) {
      return await bcrypt.compare(password, adminUser.password_hash);
    }

    return false;
  }

  /**
   * Check if user is admin with specific privileges
   */
  async isAdminUser(userId: string): Promise<{
    isAdmin: boolean;
    privileges?: User['admin_privileges'];
  }> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_admin, admin_privileges')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { isAdmin: false, privileges: {} };
    }

    return {
      isAdmin: user.is_admin || false,
      privileges: user.admin_privileges || {},
    };
  }

  /**
   * Get user by ID (with admin context for access control)
   */
  async getUserById(userId: string, context?: UserContext): Promise<User | null> {
    let query = supabaseAdmin.from('users').select('*').eq('id', userId);

    // Apply RLS by using regular client for non-admin users
    if (!context?.isAdmin) {
      query = supabase.from('users').select('*').eq('id', userId);
    }

    const { data: user, error } = await query.single();

    if (error || !user) {
      return null;
    }

    // Remove sensitive data unless admin is accessing
    if (!context?.isAdmin) {
      delete user.password_hash;
      delete user.mfa_secret;
      delete user.recovery_codes;
    }

    return user as User;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string, context?: UserContext): Promise<User | null> {
    let query = supabaseAdmin.from('users').select('*').eq('email', email);

    if (!context?.isAdmin) {
      query = supabase.from('users').select('*').eq('email', email);
    }

    const { data: user, error } = await query.single();

    if (error || !user) {
      return null;
    }

    // Remove sensitive data unless admin is accessing
    if (!context?.isAdmin) {
      delete user.password_hash;
      delete user.mfa_secret;
      delete user.recovery_codes;
    }

    return user as User;
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updates: Partial<Pick<User, 'display_name' | 'timezone' | 'preferences' | 'avatar_url'>>,
    context?: UserContext
  ): Promise<User> {
    // Prepare updates
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Use appropriate client based on admin context
    const client = context?.isAdmin ? supabaseAdmin : supabase;

    const { data: user, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    // Remove sensitive data unless admin
    if (!context?.isAdmin) {
      delete user.password_hash;
      delete user.mfa_secret;
      delete user.recovery_codes;
    }

    return user as User;
  }

  /**
   * List all users (admin only)
   */
  async listUsers(
    limit: number = 50,
    offset: number = 0,
    context?: UserContext
  ): Promise<{
    users: Omit<User, 'password_hash' | 'mfa_secret' | 'recovery_codes'>[];
    total: number;
  }> {
    if (!context?.isAdmin) {
      throw new Error('Admin privileges required to list all users');
    }

    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get user count: ${countError.message}`);
    }

    // Get users with pagination
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id, email, username, display_name, avatar_url, role, is_admin, mfa_enabled,
        admin_privileges, email_verified, account_status, timezone,
        preferences, created_at, updated_at, last_login_at, last_login_ip, last_seen
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`);
    }

    return {
      users: users || [],
      total: count || 0,
    };
  }

  /**
   * Delete user account (admin only or self)
   */
  async deleteUser(userId: string, context?: UserContext): Promise<boolean> {
    // Allow users to delete their own account or admin to delete any account
    if (!context?.isAdmin && context?.userId !== userId) {
      throw new Error('Insufficient privileges to delete this user account');
    }

    // Don't allow deletion of the main admin account
    const user = await this.getUserById(userId);
    if (user?.email === adminConfig.email) {
      throw new Error('Cannot delete the main admin account');
    }

    // Delete from Supabase Auth if using Supabase Auth
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) {
        console.warn('Failed to delete from Supabase Auth:', authError.message);
      }
    } catch (error) {
      console.warn('User not in Supabase Auth:', error);
    }

    // Delete from our users table
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    return true;
  }

  /**
   * Verify JWT token and extract user context (supports both Supabase and custom JWT)
   */
  async verifyToken(token: string): Promise<UserContext | null> {
    try {
      // Try Supabase token first
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (user && !error) {
        // Get additional user data from our table
        const userData = await this.getUserById(user.id);
        if (userData) {
          return {
            userId: user.id,
            isAdmin: userData.is_admin || false,
            adminPrivileges: userData.admin_privileges || {},
            user,
          };
        }
      }

      // Fall back to custom JWT verification
      if (!securityConfig.jwtSecret) {
        return null;
      }

      const decoded = jwt.verify(token, securityConfig.jwtSecret) as any;

      return {
        userId: decoded.userId,
        isAdmin: decoded.isAdmin || false,
        adminPrivileges: decoded.adminPrivileges || {},
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user password (supports both auth methods)
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    context?: UserContext
  ): Promise<boolean> {
    const user = await this.getUserById(userId, context);
    if (!user) {
      throw new Error('User not found');
    }

    // Try Supabase Auth update first
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (!error) {
        return true;
      }
    } catch (error) {
      console.warn('Supabase Auth password update failed, falling back to custom auth');
    }

    // Fall back to custom password handling
    if (!user.password_hash) {
      throw new Error('User configured for Supabase Auth only');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, securityConfig.bcryptRounds);

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }

    return true;
  }

  /**
   * Subscribe to user changes (real-time feature)
   */
  subscribeToUserChanges(
    userId: string,
    callback: (payload: any) => void
  ) {
    return this.db.subscribeToRealtime(
      'users',
      callback,
      {
        event: '*',
        filter: `id=eq.${userId}`,
      }
    );
  }

  /**
   * Update user's last seen timestamp (for real-time presence)
   */
  async updateLastSeen(userId: string): Promise<void> {
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
  }

  /**
   * Hash a token for secure storage (backward compatibility)
   */
  private hashToken(token: string): string {
    return require("crypto").createHash("sha256").update(token).digest("hex");
  }
}
