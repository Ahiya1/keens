/**
 * Database Test Setup - Fixed Version
 * Conditional database setup that won't hang and has proper resource cleanup
 */
import { DatabaseManager } from "../src/database/DatabaseManager.js";
/**
 * Generate unique test identifiers
 */
export declare function generateTestId(): string;
export declare function generateTestEmail(prefix?: string): string;
export declare function generateTestSessionId(): string;
/**
 * Initialize test database with better error handling and timeouts
 */
export declare function setupTestDatabase(): Promise<DatabaseManager>;
/**
 * Fast cleanup that won't hang
 */
export declare function cleanupTestDatabase(): Promise<void>;
/**
 * Create test user (works with both real and mock database)
 */
export declare function createTestUser(email?: string | null, username?: string | null, isAdmin?: boolean): Promise<{
    id: string;
    email: string;
    username: string;
    context: any;
}>;
/**
 * Get test database instance (can be null or mock)
 */
export declare function getTestDatabase(): DatabaseManager | null;
//# sourceMappingURL=setup-database.d.ts.map