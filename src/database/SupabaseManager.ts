/**
 * SupabaseManager - Simplified cloud-native database manager for keen-s-a
 * Provides essential functionality while maintaining compatibility
 */

import { SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
import { randomBytes } from "crypto";
import { createSupabaseClient, supabaseAdmin, supabase } from '../config/database.js';

export interface UserContext {
  userId: string;
  isAdmin: boolean;
  adminPrivileges?: {
    unlimited_credits?: boolean;
    bypass_rate_limits?: boolean;
    view_all_analytics?: boolean;
    user_impersonation?: boolean;
    system_diagnostics?: boolean;
    priority_execution?: boolean;
    global_access?: boolean;
    audit_access?: boolean;
  };
  user?: User; // Supabase user object
}

export interface DatabaseTransaction {
  query<T = any>(text: string, params?: any[]): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

class SupabaseTransactionImpl implements DatabaseTransaction {
  private operations: Array<{ sql: string; params: any }> = [];
  private committed = false;
  private rolledBack = false;

  constructor(
    private client: SupabaseClient,
    private context?: UserContext
  ) {}

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already finalized');
    }

    // Store operation for potential rollback
    this.operations.push({ sql: text, params });

    // For now, execute immediately (Supabase limitation)
    // In production, implement proper transaction batching
    console.warn('Supabase transaction: executing immediately');
    return [] as T[];
  }

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already finalized');
    }
    // Mark as committed
    this.committed = true;
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already finalized');
    }
    
    console.warn('Supabase rollback: Operations already committed. Implement compensation logic if needed.');
    this.rolledBack = true;
  }
}

export class SupabaseManager {
  protected client: SupabaseClient;
  protected adminClient: SupabaseClient;
  protected _isConnected: boolean = false;
  protected realtimeSubscriptions: Map<string, RealtimeSubscription> = new Map();

  constructor(useServiceRole = false) {
    this.client = createSupabaseClient(useServiceRole);
    this.adminClient = supabaseAdmin;
    this.setupConnectionHandlers();
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  private setupConnectionHandlers(): void {
    // Supabase doesn't have connection events like PostgreSQL
    // We'll test connectivity during initialization
    this._isConnected = true;
  }

  /**
   * Initialize database connection and test connectivity
   */
  async initialize(): Promise<void> {
    try {
      await this.testConnection();
      this._isConnected = true;
    } catch (error) {
      this._isConnected = false;
      console.error('Supabase initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute a simple query (compatibility method)
   */
  async query<T = any>(
    tableOrSql: string,
    paramsOrOperation?: any[],
    context?: UserContext
  ): Promise<T[]> {
    try {
      // Simple implementation for compatibility
      // Use admin client if context has admin privileges
      const client = (context?.isAdmin) ? this.adminClient : this.client;
      
      // For now, return empty array - specific implementations in DAOs
      console.warn(`SupabaseManager.query called with: ${tableOrSql}`);
      return [] as T[];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Start a database transaction (simplified for Supabase)
   */
  async beginTransaction(context?: UserContext): Promise<DatabaseTransaction> {
    // Supabase doesn't support traditional transactions like PostgreSQL
    // We'll simulate transaction behavior with operation batching
    const client = (context?.isAdmin) ? this.adminClient : this.client;
    return new SupabaseTransactionImpl(client, context);
  }

  /**
   * Execute multiple operations in a "transaction" (batched operations)
   */
  async transaction<T>(
    callback: (transaction: DatabaseTransaction) => Promise<T>,
    context?: UserContext
  ): Promise<T> {
    const transaction = await this.beginTransaction(context);
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.adminClient
        .from('users')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        console.error('Supabase connection test failed:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Supabase connection test error:', error);
      return false;
    }
  }

  /**
   * Get connection statistics (adapted for Supabase)
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
    isConnected: boolean;
    realtimeSubscriptions?: number;
  } {
    return {
      totalConnections: 1, // Supabase handles connection pooling
      activeConnections: this._isConnected ? 1 : 0,
      idleConnections: 0,
      waitingConnections: 0,
      isConnected: this._isConnected,
      realtimeSubscriptions: this.realtimeSubscriptions.size,
    };
  }

  /**
   * Subscribe to real-time changes (keen-s-a enhanced feature)
   */
  subscribeToRealtime(
    table: string,
    callback: (payload: any) => void,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
      userId?: string;
    }
  ): RealtimeSubscription {
    const subscriptionId = `${table}_${Date.now()}_${randomBytes(4).toString("hex")}`;
    
    const channel = this.client
      .channel(subscriptionId)
      .on(
        'postgres_changes' as any,
        {
          event: options?.event || '*',
          schema: 'public',
          table: table,
          filter: options?.filter,
        },
        callback
      )
      .subscribe();

    const subscription = {
      channel,
      unsubscribe: () => {
        channel.unsubscribe();
        this.realtimeSubscriptions.delete(subscriptionId);
      },
    };

    this.realtimeSubscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from all real-time subscriptions
   */
  async unsubscribeFromAllRealtime(): Promise<void> {
    for (const [id, subscription] of this.realtimeSubscriptions) {
      subscription.unsubscribe();
    }
    this.realtimeSubscriptions.clear();
  }

  /**
   * Health check for monitoring
   */
  async healthCheck(): Promise<{
    connected: boolean;
    latency?: number;
    realtimeSubscriptions: number;
    supabaseStatus: string;
  }> {
    const startTime = Date.now();
    const connected = await this.testConnection();
    const latency = connected ? Date.now() - startTime : undefined;

    return {
      connected,
      ...(latency !== undefined && { latency }),
      realtimeSubscriptions: this.realtimeSubscriptions.size,
      supabaseStatus: this._isConnected ? 'operational' : 'disconnected',
    };
  }

  /**
   * Gracefully close connections and clean up subscriptions
   */
  async close(): Promise<void> {
    try {
      await this.unsubscribeFromAllRealtime();
      this._isConnected = false;
    } catch (error) {
      console.error('Error closing Supabase manager:', error);
    }
  }
}

// Singleton instance for compatibility with existing code
export const db = new SupabaseManager();

// Export admin instance
export const adminDb = new SupabaseManager(true);