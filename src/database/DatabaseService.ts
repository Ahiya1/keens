/**
 * DatabaseService - Main service combining all database operations
 * Provides a unified interface for all database operations with DAO access
 * SECURITY: Updated to use SessionDAOFixed for missing column resilience
 */

import { DatabaseManager } from './DatabaseManager.js';
import { UserDAO } from './dao/UserDAO.js';
import { CreditDAO } from './dao/CreditDAO.js';
import { SessionDAOFixed } from './dao/SessionDAOFixed.js';
import { AnalyticsDAO } from './dao/AnalyticsDAO.js';
import { WebSocketDAO } from './dao/WebSocketDAO.js';

export class DatabaseService {
  private dbManager: DatabaseManager;
  public users: UserDAO;
  public credits: CreditDAO;
  public sessions: SessionDAOFixed; // Using fixed version
  public analytics: AnalyticsDAO;
  public websockets: WebSocketDAO;

  constructor() {
    this.dbManager = new DatabaseManager();

    // Initialize all DAOs with the database manager
    this.users = new UserDAO(this.dbManager);
    this.credits = new CreditDAO(this.dbManager);
    this.sessions = new SessionDAOFixed(this.dbManager); // Using fixed version
    this.analytics = new AnalyticsDAO(this.dbManager);
    this.websockets = new WebSocketDAO(this.dbManager);
  }

  /**
   * Initialize the database service with migrations and seeds
   */
  async initialize(): Promise<void> {
    try {
      // FIXED: Added console logging that tests expect
      console.log('🚀 Initializing keen database...');
      
      // Initialize the database manager
      await this.dbManager.initialize();
      
      console.log('✅ keen database initialized successfully!');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    return await this.dbManager.testConnection();
  }

  /**
   * Get the underlying database manager
   */
  getDatabaseManager(): DatabaseManager {
    return this.dbManager;
  }

  /**
   * Get health status of the database
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    poolStats?: any;
    latency?: number;
    supabaseStatus?: string;
  }> {
    return await this.dbManager.healthCheck();
  }

  /**
   * Execute raw SQL query (test environment only)
   */
  async executeRawQuery(query: string, params?: any[]): Promise<any[]> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Raw query execution is only allowed in test environment');
    }

    return await this.dbManager.query(query, params);
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await this.dbManager.close();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
