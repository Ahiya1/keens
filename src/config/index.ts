/**
 * Configuration exports for keen-s-a
 * Enhanced cloud-native configuration with Supabase integration
 */

// Supabase configuration exports (updated for keen-s-a)
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
  type RealTimeConfig,
} from "./database.js";

// Anthropic configuration exports (preserved)
export {
  AnthropicConfigManager,
  KEEN_DEFAULT_CONFIG,
  type AnthropicConfig,
  type ContextUtilization,
} from "./AnthropicConfig.js";

// Environment loader export
export { EnvLoader } from "./EnvLoader.js";

// Import types for the combined config
import type { AnthropicConfig } from "./AnthropicConfig.js";
import { 
  supabaseConfig,
  adminConfig, 
  creditConfig,
  realTimeConfig,
  securityConfig,
  performanceConfig,
  monitoringConfig,
  deploymentConfig,
  type SupabaseConfig, 
  type AdminConfig, 
  type CreditConfig 
} from "./database.js";

// Enhanced configuration for keen-s-a platform
export interface KeenSAConfig {
  supabase: SupabaseConfig;
  anthropic: AnthropicConfig;
  admin: AdminConfig;
  credits: CreditConfig;
  security: typeof securityConfig;
  performance: typeof performanceConfig;
  monitoring: typeof monitoringConfig;
  deployment: typeof deploymentConfig;
  realTime: typeof realTimeConfig;
}

// Export convenience function to get complete platform config
export async function getKeenSAConfig(): Promise<KeenSAConfig> {
  const { AnthropicConfigManager, KEEN_DEFAULT_CONFIG } = await import(
    "./AnthropicConfig.js"

  const anthropicManager = new AnthropicConfigManager(KEEN_DEFAULT_CONFIG);

  return {
    supabase: supabaseConfig,
    anthropic: anthropicManager.getConfig(),
    admin: adminConfig,
    credits: creditConfig,
    security: securityConfig,
    performance: performanceConfig,
    monitoring: monitoringConfig,
    deployment: deploymentConfig,
    realTime: realTimeConfig,
  };
}

// Backward compatibility (deprecated, use KeenSAConfig)
export type KeenPlatformConfig = KeenSAConfig;
export const getKeenPlatformConfig = getKeenSAConfig;

// Backward compatibility for database config
export const databaseConfig = supabaseConfig;
export const config = supabaseConfig;
export const testConfig = supabaseConfig; // For tests, use same config

// Re-export database interface types for compatibility
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
