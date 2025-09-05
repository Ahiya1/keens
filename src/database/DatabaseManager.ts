/**
 * Updated DatabaseManager - Routes to Enhanced Version
 * CRITICAL FIX: Replaces problematic DatabaseManager with enhanced SQL conversion
 * Maintains backward compatibility while using DatabaseManagerEnhanced under the hood
 */

import { DatabaseManagerEnhanced, UserContext, DatabaseTransaction } from './DatabaseManagerEnhanced.js';

// Re-export types for backward compatibility
export { UserContext, DatabaseTransaction } from './DatabaseManagerEnhanced.js';

/**
 * Compatibility wrapper that maintains the old DatabaseManager interface
 * but uses the enhanced version with proper SQL conversion under the hood
 */
export class DatabaseManager extends DatabaseManagerEnhanced {
  constructor(customConfig?: any) {
    super();
    console.log('🔄 Using enhanced DatabaseManager with proper SQL conversion');
  }
}

// Create singleton instance using enhanced manager
export const db = new DatabaseManager();
