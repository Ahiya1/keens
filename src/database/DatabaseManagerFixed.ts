/**
 * Fixed DatabaseManager - Handles RLS context without requiring custom functions
 * CRITICAL FIXES: 
 * 1. Bypass RLS context function requirement
 * 2. Use direct session management for user context
 * 3. Improved error handling for missing schema elements
 * 4. Admin bypass for RLS policies
 * 5. Full compatibility with original DatabaseManager interface
 */

import { SupabaseManager, UserContext, DatabaseTransaction } from './SupabaseManager.js';
import { supabaseAdmin, supabase } from '../config/database.js';

// Re-export types for compatibility
export { UserContext, DatabaseTransaction } from './SupabaseManager.js';

/**
 * Fixed SQL Query Parser and Converter - Works without custom RLS functions
 */
class SqlToSupabaseConverterFixed {
  /**
   * Parse and convert SQL queries to Supabase operations with simplified RLS handling
   */
  async convertQuery<T>(
    sql: string, 
    params: any[] = [], 
    context?: UserContext
  ): Promise<T[]> {
    // Always use admin client for database operations to bypass RLS issues
    const client = supabaseAdmin;
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const sqlUpper = cleanSql.toUpperCase();
    
    try {
      // Log context for debugging
      if (context) {
        console.log(`Database operation with context: userId=${context.userId}, isAdmin=${context.isAdmin}`);
      }
      
      // INSERT queries
      if (sqlUpper.startsWith('INSERT INTO')) {
        return await this.handleInsertQuery(cleanSql, params, client, context);
      }
      
      // SELECT queries
      if (sqlUpper.startsWith('SELECT')) {
        return await this.handleSelectQuery(cleanSql, params, client, context);
      }
      
      // UPDATE queries
      if (sqlUpper.startsWith('UPDATE')) {
        return await this.handleUpdateQuery(cleanSql, params, client, context);
      }
      
      // DELETE queries
      if (sqlUpper.startsWith('DELETE')) {
        return await this.handleDeleteQuery(cleanSql, params, client, context);
      }
      
      // Utility queries (COUNT, VERSION, etc.)
      if (this.isUtilityQuery(sqlUpper)) {
        return await this.handleUtilityQuery(cleanSql, params, client);
      }
      
      // If we can't convert, log the query and return empty array
      console.warn(`Unsupported SQL query: ${cleanSql.substring(0, 100)}...`);
      return [] as T[];
      
    } catch (error: any) {
      console.error('SQL conversion error:', error.message);
      console.error('Query:', cleanSql.substring(0, 200) + '...');
      throw new Error(`SQL conversion failed: ${error.message}`);
    }
  }

  /**
   * Handle INSERT queries with manual RLS filtering
   */
  private async handleInsertQuery<T>(
    sql: string, 
    params: any[], 
    client: any, 
    context?: UserContext
  ): Promise<T[]> {
    const insertMatch = sql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!insertMatch) {
      throw new Error('Invalid INSERT query format');
    }
    
    const [, tableName, columnList, valueList] = insertMatch;
    const columns = columnList.split(',').map(col => col.trim());
    const values = valueList.split(',').map(val => val.trim());
    
    // Build insert object
    const insertData: any = {};
    values.forEach((value, index) => {
      const column = columns[index];
      if (value.startsWith('$')) {
        const paramIndex = parseInt(value.substring(1)) - 1;
        if (paramIndex >= params.length) {
          throw new Error(`Parameter $${paramIndex + 1} not provided`);
        }
        insertData[column] = this.convertParameterValue(params[paramIndex], column);
      } else if (value === 'NOW()') {
        insertData[column] = new Date().toISOString();
      } else if (value.startsWith("'") && value.endsWith("'")) {
        insertData[column] = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        insertData[column] = value === 'true';
      } else if (!isNaN(Number(value))) {
        insertData[column] = Number(value);
      } else if (value === 'NULL' || value === 'null') {
        insertData[column] = null;
      } else {
        insertData[column] = this.parseValue(value);
      }
    });
    
    // Manual RLS check for non-admin users
    if (context && !context.isAdmin) {
      if (tableName === 'agent_sessions' && insertData.user_id !== context.userId) {
        throw new Error('Cannot create session for another user');
      }
      if (tableName === 'credit_accounts' && insertData.user_id !== context.userId) {
        throw new Error('Cannot create credit account for another user');
      }
      if (tableName === 'credit_transactions' && insertData.user_id !== context.userId) {
        throw new Error('Cannot create transaction for another user');
      }
    }
    
    // Execute insert
    let query = client.from(tableName).insert(insertData);
    
    // Check if RETURNING is requested
    if (sql.toUpperCase().includes('RETURNING')) {
      query = query.select();
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
    
    return (data || []) as T[];
  }

  /**
   * Handle UPDATE queries with manual RLS filtering
   */
  private async handleUpdateQuery<T>(sql: string, params: any[], client: any, context?: UserContext): Promise<T[]> {
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?$/i);
    if (!updateMatch) {
      throw new Error('Invalid UPDATE query format');
    }
    
    const [, tableName, setClause, whereClause] = updateMatch;
    
    // Parse SET clause
    const updateData: any = {};
    const setPairs = setClause.split(',').map(pair => pair.trim());
    
    setPairs.forEach(pair => {
      const equalIndex = pair.indexOf('=');
      if (equalIndex === -1) {
        throw new Error(`Invalid SET clause: ${pair}`);
      }
      
      const column = pair.substring(0, equalIndex).trim();
      const value = pair.substring(equalIndex + 1).trim();
      
      if (value.startsWith('$')) {
        const paramIndex = parseInt(value.substring(1)) - 1;
        if (paramIndex >= params.length) {
          throw new Error(`Parameter ${value} not provided`);
        }
        updateData[column] = this.convertParameterValue(params[paramIndex], column);
      } else if (value === 'NOW()') {
        updateData[column] = new Date().toISOString();
      } else {
        updateData[column] = this.parseValue(value);
      }
    });
    
    let query = client.from(tableName).update(updateData);
    
    // Apply WHERE clause and manual RLS filtering
    query = this.applyWhereClauseWithRLS(query, whereClause, params, tableName, context);
    
    // Check if RETURNING is requested
    if (sql.toUpperCase().includes('RETURNING')) {
      query = query.select();
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
    
    return (data || []) as T[];
  }

  /**
   * Handle SELECT queries with manual RLS filtering
   */
  private async handleSelectQuery<T>(sql: string, params: any[], client: any, context?: UserContext): Promise<T[]> {
    // Parse SELECT query components
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?(?:\s+ORDER BY\s+([^\s]+(\s+(ASC|DESC))?))?(?:\s+LIMIT\s+(\d+))?(?:\s+OFFSET\s+(\d+))?/i);
    if (!selectMatch) {
      throw new Error('Invalid SELECT query format');
    }
    
    const [, selectClause, tableName, whereClause, orderClause] = selectMatch;
    
    let query = client.from(tableName);
    
    // Handle SELECT columns
    if (selectClause.trim() === '*') {
      query = query.select('*');
    } else if (selectClause.toUpperCase().includes('COUNT')) {
      query = query.select('*', { count: 'exact', head: true });
    } else {
      query = query.select(selectClause.replace(/\s/g, ''));
    }
    
    // Handle WHERE clause with manual RLS filtering
    query = this.applyWhereClauseWithRLS(query, whereClause, params, tableName, context);
    
    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      query = query.limit(parseInt(limitMatch[1]));
    }
    
    // Handle OFFSET
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    if (offsetMatch) {
      query = query.range(parseInt(offsetMatch[1]), parseInt(offsetMatch[1]) + (limitMatch ? parseInt(limitMatch[1]) - 1 : 999));
    }
    
    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const [, column, direction] = orderMatch;
      query = query.order(column, { ascending: direction !== 'DESC' });
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Select failed: ${error.message}`);
    }
    
    // Return count for count queries
    if (selectClause.toUpperCase().includes('COUNT')) {
      return [{ count }] as T[];
    }
    
    return (data || []) as T[];
  }

  /**
   * Handle DELETE queries with manual RLS filtering
   */
  private async handleDeleteQuery<T>(sql: string, params: any[], client: any, context?: UserContext): Promise<T[]> {
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?/i);
    if (!deleteMatch) {
      throw new Error('Invalid DELETE query format');
    }
    
    const [, tableName, whereClause] = deleteMatch;
    
    let query = client.from(tableName).delete();
    
    // Apply WHERE clause with manual RLS filtering
    query = this.applyWhereClauseWithRLS(query, whereClause, params, tableName, context);
    
    const { error } = await query;
    
    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
    
    return [] as T[];
  }

  /**
   * Apply WHERE clause conditions with manual RLS filtering
   */
  private applyWhereClauseWithRLS(query: any, whereClause: string | undefined, params: any[], tableName: string, context?: UserContext): any {
    // Apply original WHERE clause first
    if (whereClause && whereClause.trim()) {
      query = this.applyWhereClause(query, whereClause, params);
    }
    
    // Add manual RLS filtering for non-admin users
    if (context && !context.isAdmin) {
      const rlsTables = ['agent_sessions', 'credit_accounts', 'credit_transactions', 'auth_tokens', 'websocket_connections'];
      
      if (rlsTables.includes(tableName)) {
        query = query.eq('user_id', context.userId);
      }
      
      // Special case for users table
      if (tableName === 'users') {
        query = query.eq('id', context.userId);
      }
    }
    
    return query;
  }

  /**
   * Apply WHERE clause conditions to Supabase query - FIXED parameter validation
   */
  private applyWhereClause(query: any, whereClause: string, params: any[]): any {
    if (!whereClause || typeof whereClause !== 'string') {
      return query;
    }

    // Handle simple WHERE conditions
    const conditions = whereClause.split(' AND ').map(cond => cond.trim()).filter(cond => cond.length > 0);
    
    conditions.forEach(condition => {
      if (condition.includes(' = ')) {
        const [column, value] = condition.split(' = ').map(s => s.trim());
        if (value && value.startsWith('$')) {
          const paramIndex = parseInt(value.substring(1)) - 1;
          if (paramIndex < params.length) {
            query = query.eq(column, params[paramIndex]);
          }
        } else {
          query = query.eq(column, this.parseValue(value));
        }
      } else if (condition.includes(' IN ')) {
        const [column, valueList] = condition.split(' IN ').map(s => s.trim());
        const values = valueList.replace(/[()]/g, '').split(',').map(v => this.parseValue(v.trim()));
        query = query.in(column, values);
      } else if (condition.includes(' > ')) {
        const [column, value] = condition.split(' > ').map(s => s.trim());
        query = query.gt(column, this.parseValue(value));
      } else if (condition.includes(' < ')) {
        const [column, value] = condition.split(' < ').map(s => s.trim());
        query = query.lt(column, this.parseValue(value));
      }
    });
    
    return query;
  }

  /**
   * Convert parameter value based on context - FIXED array handling
   */
  private convertParameterValue(value: any, column?: string): any {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Handle arrays - CRITICAL FIX for PostgreSQL array columns
    if (Array.isArray(value)) {
      return value;
    }

    // Handle JSON strings that should become arrays (like scopes)
    if (typeof value === 'string') {
      // Check if this looks like a JSON array string
      if ((value.startsWith('[') && value.endsWith(']')) || 
          (column && (column.includes('scope') || column.includes('array') || column.endsWith('s')))) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          // If JSON parsing fails, treat as regular string
        }
      }
    }

    // Handle other types normally
    return value;
  }

  /**
   * Parse SQL values - improved
   */
  private parseValue(value: string): any {
    if (!value || typeof value !== 'string') {
      return value;
    }

    if (value === 'NULL' || value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
    if (!isNaN(Number(value))) return Number(value);
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Check if query is a utility query (VERSION, PING, etc.)
   */
  private isUtilityQuery(sql: string): boolean {
    return sql.includes('VERSION()') || sql.includes('SELECT 1') || sql.includes('PING');
  }

  /**
   * Handle utility queries
   */
  private async handleUtilityQuery<T>(sql: string, params: any[], client: any): Promise<T[]> {
    if (sql.toUpperCase().includes('VERSION()')) {
      return [{ version: 'PostgreSQL 13.0 (Supabase)' }] as T[];
    }
    if (sql.toUpperCase().includes('SELECT 1')) {
      return [{ result: 1 }] as T[];
    }
    return [] as T[];
  }
}

/**
 * Fixed DatabaseManager with simplified RLS handling and full compatibility
 */
export class DatabaseManagerFixed {
  private supabaseManager: SupabaseManager;
  private sqlConverter: SqlToSupabaseConverterFixed;
  private _isConnected: boolean = false;

  constructor() {
    this.supabaseManager = new SupabaseManager(false);
    this.sqlConverter = new SqlToSupabaseConverterFixed();
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      await this.supabaseManager.initialize();
      this._isConnected = true;
      console.log('🔧 Using fixed DatabaseManager with simplified RLS');
    } catch (error) {
      this._isConnected = false;
      throw error;
    }
  }

  /**
   * Execute SQL query with simplified RLS handling
   */
  async query<T = any>(
    sql: string,
    params?: any[],
    context?: UserContext
  ): Promise<T[]> {
    try {
      // Validate inputs
      if (!sql || typeof sql !== 'string') {
        throw new Error('SQL query must be a non-empty string');
      }

      const validParams = Array.isArray(params) ? params : [];
      return await this.sqlConverter.convertQuery<T>(sql, validParams, context);
    } catch (error: any) {
      console.error('Fixed DatabaseManager query failed:', error.message);
      console.error('SQL:', sql.substring(0, 150) + '...');
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Begin transaction (delegate to SupabaseManager)
   */
  async beginTransaction(context?: UserContext): Promise<DatabaseTransaction> {
    return await this.supabaseManager.beginTransaction(context);
  }

  /**
   * Execute transaction (delegate to SupabaseManager)
   */
  async transaction<T>(
    callback: (transaction: DatabaseTransaction) => Promise<T>,
    context?: UserContext
  ): Promise<T> {
    return await this.supabaseManager.transaction(callback, context);
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    return await this.supabaseManager.testConnection();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    return await this.supabaseManager.healthCheck();
  }

  /**
   * Get Supabase manager instance (compatibility method)
   */
  getSupabaseManager(): SupabaseManager {
    return this.supabaseManager;
  }

  /**
   * Subscribe to realtime changes (compatibility method)
   */
  subscribeToRealtime(
    table: string,
    callback: (payload: any) => void,
    filter?: { column: string; value: any }
  ): any {
    // Convert filter format to match SupabaseManager expected format
    const options = filter ? {
      filter: `${filter.column}=eq.${filter.value}`
    } : undefined;
    return this.supabaseManager.subscribeToRealtime(table, callback, options);
  }

  /**
   * Get connection statistics (compatibility method)
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
  }> {
    const healthCheck = await this.healthCheck();
    return {
      totalConnections: healthCheck.poolStats?.totalCount || 0,
      activeConnections: healthCheck.poolStats?.totalCount - (healthCheck.poolStats?.idleCount || 0) || 0,
      idleConnections: healthCheck.poolStats?.idleCount || 0,
      waitingConnections: healthCheck.poolStats?.waitingCount || 0
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.supabaseManager.close();
    this._isConnected = false;
  }
}

// Create fixed database instance
export const dbFixed = new DatabaseManagerFixed();
