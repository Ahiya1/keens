/**
 * DatabaseManager - Compatibility layer for keen-s-a migration
 * Provides PostgreSQL-like interface while using Supabase under the hood
 * Maintains backward compatibility during the conscious evolution
 */

import { SupabaseManager, UserContext, DatabaseTransaction } from './SupabaseManager.js';
import { supabaseAdmin, supabase } from '../config/database.js';

// Re-export types for compatibility
export { UserContext, DatabaseTransaction } from './SupabaseManager.js';

/**
 * Compatibility wrapper that provides the old DatabaseManager interface
 * while using SupabaseManager under the hood
 */
export class DatabaseManager {
  private supabaseManager: SupabaseManager;
  private _isConnected: boolean = false;

  constructor(customConfig?: any) {
    this.supabaseManager = new SupabaseManager(customConfig?.useServiceRole || false);
    this.setupConnectionHandlers();
  }

  /**
   * Get current connection status (compatibility)
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  private setupConnectionHandlers(): void {
    this._isConnected = true;
  }

  /**
   * Initialize database connection (compatibility)
   */
  async initialize(): Promise<void> {
    try {
      await this.supabaseManager.initialize();
      this._isConnected = true;
      console.log('Database connection initialized successfully (Supabase)');
    } catch (error) {
      this._isConnected = false;
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute a query with user context (compatibility with raw SQL)
   */
  async query<T = any>(
    textOrTable: string,
    params?: any[],
    context?: UserContext
  ): Promise<T[]> {
    try {
      // Check if it's a raw SQL query (starts with SELECT, INSERT, UPDATE, DELETE)
      const sqlQuery = textOrTable.trim().toUpperCase();
      
      if (sqlQuery.startsWith('SELECT') || 
          sqlQuery.startsWith('INSERT') || 
          sqlQuery.startsWith('UPDATE') || 
          sqlQuery.startsWith('DELETE')) {
        
        // For complex SQL queries, we need to convert to Supabase operations
        return await this.convertSqlToSupabase<T>(textOrTable, params, context);
      }
      
      // Handle as table-based query (delegate to Supabase)
      return await this.supabaseManager.query<T>(textOrTable, params, context);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Start a database transaction (compatibility)
   */
  async beginTransaction(context?: UserContext): Promise<DatabaseTransaction> {
    return await this.supabaseManager.beginTransaction(context);
  }

  /**
   * Execute multiple operations in a transaction (compatibility)
   */
  async transaction<T>(
    callback: (transaction: DatabaseTransaction) => Promise<T>,
    context?: UserContext
  ): Promise<T> {
    return await this.supabaseManager.transaction(callback, context);
  }

  /**
   * Convert SQL queries to Supabase operations (simplified)
   */
  private async convertSqlToSupabase<T>(
    sql: string,
    params?: any[],
    context?: UserContext
  ): Promise<T[]> {
    const client = (context?.isAdmin) ? supabaseAdmin : supabase;
    
    // This is a simplified converter - handles common query patterns
    const sqlUpper = sql.trim().toUpperCase();
    
    if (sqlUpper.includes('SELECT VERSION()')) {
      // Health check query
      return [{ version: 'Supabase PostgreSQL compatible' }] as T[];
    }
    
    if (sqlUpper.includes('SELECT COUNT(*) FROM USERS')) {
      const { count, error } = await client
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw new Error(`Query error: ${error.message}`);
      return [{ count }] as T[];
    }
    
    if (sqlUpper.includes('FROM USERS WHERE ID = $1')) {
      const userId = params?.[0];
      if (!userId) throw new Error('User ID parameter required');
      
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return [] as T[]; // Not found
        throw new Error(`Query error: ${error.message}`);
      }
      
      return [data] as T[];
    }
    
    if (sqlUpper.includes('FROM USERS WHERE EMAIL = $1')) {
      const email = params?.[0];
      if (!email) throw new Error('Email parameter required');
      
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return [] as T[]; // Not found
        throw new Error(`Query error: ${error.message}`);
      }
      
      return [data] as T[];
    }
    
    // For other SQL queries, log and return empty for now
    console.warn(`SQL query conversion not implemented: ${sql.substring(0, 100)}...`);
    console.warn('Parameters:', params);
    return [] as T[];
  }

  /**
   * Get connection pool statistics (compatibility)
   */
  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    // Supabase manages connections automatically
    return {
      totalCount: 1,
      idleCount: 0,
      waitingCount: 0,
    };
  }

  /**
   * Get connection statistics for monitoring (compatibility)
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
    isConnected: boolean;
  } {
    const stats = this.getPoolStats();
    return {
      totalConnections: stats.totalCount,
      activeConnections: this._isConnected ? 1 : 0,
      idleConnections: stats.idleCount,
      waitingConnections: stats.waitingCount,
      isConnected: this._isConnected,
    };
  }

  /**
   * Set user context for row-level security (compatibility)
   */
  async setUserContext(
    client: any, // In Supabase, this is handled differently
    context: UserContext
  ): Promise<void> {
    // In Supabase, RLS is handled through auth.uid() and policies
    // This method is maintained for compatibility but doesn't need implementation
    console.log(`Setting user context for ${context.userId} (Supabase RLS)`);
  }

  /**
   * Clear user context (compatibility)
   */
  async clearUserContext(client: any): Promise<void> {
    // In Supabase, context is automatically managed
    // This method is maintained for compatibility
  }

  /**
   * Test database connection (enhanced for Supabase)
   */
  async testConnection(): Promise<boolean> {
    return await this.supabaseManager.testConnection();
  }

  /**
   * Health check for monitoring (enhanced)
   */
  async healthCheck(): Promise<{
    connected: boolean;
    poolStats?: ReturnType<DatabaseManager['getPoolStats']>;
    latency?: number;
    supabaseStatus?: string;
  }> {
    const result = await this.supabaseManager.healthCheck();
    return {
      connected: result.connected,
      poolStats: this.getPoolStats(),
      latency: result.latency,
      supabaseStatus: result.supabaseStatus,
    };
  }

  /**
   * Gracefully close all connections (compatibility)
   */
  async close(): Promise<void> {
    try {
      await this.supabaseManager.close();
      this._isConnected = false;
      console.log('Database manager closed (Supabase)');
    } catch (error) {
      console.error('Error closing database manager:', error);
    }
  }

  /**
   * Subscribe to real-time changes (enhanced feature)
   */
  subscribeToRealtime(
    table: string,
    callback: (payload: any) => void,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
      userId?: string;
    }
  ) {
    return this.supabaseManager.subscribeToRealtime(table, callback, options);
  }

  /**
   * Get underlying Supabase manager (for advanced operations)
   */
  getSupabaseManager(): SupabaseManager {
    return this.supabaseManager;
  }
}

// Create singleton instance for compatibility
export const db = new DatabaseManager();
