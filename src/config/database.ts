/**
 * Database configuration management for keen-s-a
 * Handles Supabase cloud-native configuration with preserved functionality
 * SECURITY: Removed sensitive logging
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EnvLoader } from "./EnvLoader.js";

// Load environment variables from multiple locations
EnvLoader.load();

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  dbUrl?: string; // For direct connections if needed
}

export interface AdminConfig {
  email: string;
  password: string;
  username: string;
}

export interface CreditConfig {
  markupMultiplier: number;
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
}

export interface RealTimeConfig {
  enabled: boolean;
  channels: string[];
}

export interface TestConfig {
  database: string;
  host: string;
  port: number;
  user: string;
  password: string;
  maxConnections: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseFloat(value) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  return value ? value.toLowerCase() === "true" : defaultValue;
}

// Supabase Configuration (Primary)
export const supabaseConfig: SupabaseConfig = {
  url: getEnvVar("SUPABASE_URL"),
  anonKey: getEnvVar("SUPABASE_ANON_KEY"),
  serviceRoleKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
  dbUrl: process.env.SUPABASE_DB_URL, // Optional direct connection
};

// Test configuration for database tests
export const testConfig: TestConfig = {
  database: process.env.DB_NAME || "keen_test",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "keen_test_user",
  password: process.env.DB_PASSWORD || "test_password",
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "5"),
};

// Admin configuration (preserved from keen-s)
export const adminConfig: AdminConfig = {
  email: getEnvVar("ADMIN_EMAIL", "ahiya.butman@gmail.com"),
  password: getEnvVar("ADMIN_PASSWORD", "2con-creator"),
  username: getEnvVar("ADMIN_USERNAME", "ahiya_admin"),
};

// Credit system configuration (preserved)
export const creditConfig: CreditConfig = {
  markupMultiplier: getEnvFloat("CREDIT_MARKUP_MULTIPLIER", 5.0),
  defaultDailyLimit: getEnvFloat("DEFAULT_DAILY_LIMIT", 100.0),
  defaultMonthlyLimit: getEnvFloat("DEFAULT_MONTHLY_LIMIT", 1000.0),
  autoRechargeThreshold: getEnvFloat("AUTO_RECHARGE_THRESHOLD", 10.0),
  autoRechargeAmount: getEnvFloat("AUTO_RECHARGE_AMOUNT", 50.0),
};

// Real-time configuration (enhanced for keen-s-a)
export const realTimeConfig: RealTimeConfig = {
  enabled: getEnvBoolean("REAL_TIME_ENABLED", true),
  channels: (process.env.REAL_TIME_CHANNELS || "agent_sessions,credits,websocket_connections").split(","),
};

// Security configuration (preserved)
export const securityConfig = {
  bcryptRounds: getEnvNumber("BCRYPT_ROUNDS", 12),
  jwtSecret: getEnvVar("JWT_SECRET"),
  jwtExpiresIn: getEnvVar("JWT_EXPIRES_IN", "24h"),
  jwtRefreshExpiresIn: getEnvVar("JWT_REFRESH_EXPIRES_IN", "7d"),
  apiKeyLength: getEnvNumber("API_KEY_LENGTH", 32),
  sessionTimeout: getEnvNumber("SESSION_TIMEOUT", 3600000),
  rateLimitWindow: getEnvNumber("RATE_LIMIT_WINDOW", 3600000),
  rateLimitMaxRequests: getEnvNumber("RATE_LIMIT_MAX_REQUESTS", 1000),
};

// Performance configuration (adapted for Supabase)
export const performanceConfig = {
  connectionPoolSize: getEnvNumber("CONNECTION_POOL_SIZE", 10), // Less relevant for Supabase
  queryTimeout: getEnvNumber("QUERY_TIMEOUT", 30000),
  maxQueryComplexity: getEnvNumber("MAX_QUERY_COMPLEXITY", 1000),
};

// Monitoring configuration (preserved)
export const monitoringConfig = {
  logLevel: getEnvVar("LOG_LEVEL", "info"),
  metricsEnabled: getEnvBoolean("METRICS_ENABLED", true),
  auditLogEnabled: getEnvBoolean("AUDIT_LOG_ENABLED", true),
};

// Deployment configuration (keen-s-a specific)
export const deploymentConfig = {
  landingUrl: getEnvVar("LANDING_URL", "keen.sh"),
  dashboardHost: getEnvVar("DASHBOARD_HOST", "localhost"),
  dashboardPort: getEnvNumber("DASHBOARD_PORT", 3001),
  railwayProjectId: process.env.RAILWAY_PROJECT_ID,
  vercelProjectId: process.env.VERCEL_PROJECT_ID,
};

// Create Supabase clients
export const createSupabaseClient = (useServiceRole = false): SupabaseClient => {
  const key = useServiceRole ? supabaseConfig.serviceRoleKey : supabaseConfig.anonKey;
  return createClient(supabaseConfig.url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

// Service role client for admin operations (equivalent to direct DB access in keen-s)
export const supabaseAdmin = createSupabaseClient(true);

// Anonymous client for user operations
export const supabase = createSupabaseClient(false);

// Database connection test function
// SECURITY: Removed sensitive logging
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      if (process.env.DEBUG) {
        console.error('Supabase connection test failed:', error.message);
      }
      return false;
    }
    
    if (process.env.DEBUG) {
      console.log('Supabase connected successfully');
    }
    return true;
  } catch (error) {
    if (process.env.DEBUG) {
      console.error('Supabase connection test error');
    }
    return false;
  }
};
