/**
 * Database module index for keen-s-a
 * Exports Supabase-based database management with preserved interfaces
 */

// Core database managers
export {
  DatabaseManager,
  db,
  UserContext,
  DatabaseTransaction
} from './DatabaseManager.js';

export {
  SupabaseManager,
  RealtimeSubscription
} from './SupabaseManager.js';

// Main database service
export {
  DatabaseService,
  databaseService
} from './DatabaseService.js';

// Configuration (enhanced for cloud-native)
export {
  supabaseConfig,
  adminConfig,
  creditConfig,
  realTimeConfig,
  securityConfig,
  performanceConfig,
  monitoringConfig,
  deploymentConfig,
  createSupabaseClient,
  supabaseAdmin,
  supabase,
  testSupabaseConnection,
  type SupabaseConfig,
  type AdminConfig,
  type CreditConfig,
  type RealTimeConfig
} from '../config/database.js';

// Preserved DAO interfaces (updated for Supabase)
export { UserDAO } from './dao/UserDAO.js';
export { CreditDAO } from './dao/CreditDAO.js';
export { SessionDAO } from './dao/SessionDAO.js';
export { AnalyticsDAO } from './dao/AnalyticsDAO.js';
export { WebSocketDAO } from './dao/WebSocketDAO.js';
export { ValidationDAO } from './dao/ValidationDAO.js';

// Backward compatibility types
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
}

// Backward compatibility exports
import { db } from './SupabaseManager.js';
export { db as default };
