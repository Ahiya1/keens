/**
 * Test Setup Configuration - Fixed Version
 * Global test configuration and database setup with proper resource cleanup
 */
import { DatabaseManager } from "../src/database/DatabaseManager.js";
/**
 * Generate unique test identifiers to avoid conflicts
 */
export declare function generateTestId(): string;
/**
 * Generate unique test email
 */
export declare function generateTestEmail(prefix?: string): string;
/**
 * Generate unique session ID - now generates proper UUIDs for database compatibility
 */
export declare function generateTestSessionId(): string;
/**
 * Get the UUID for a test session ID (for database operations)
 */
export declare function getSessionUuid(sessionId: string): string;
/**
 * Initialize test database with migrations
 */
export declare function setupTestDatabase(): Promise<DatabaseManager>;
/**
 * Cleanup test database and all resources
 */
export declare function cleanupTestDatabase(): Promise<void>;
/**
 * Create test user for testing with unique email
 */
export declare function createTestUser(email?: string | null, username?: string | null, isAdmin?: boolean): Promise<{
    id: string;
    email: string;
    username: string;
    context: any;
}>;
/**
 * Get test database instance
 */
export declare function getTestDatabase(): DatabaseManager | null;
/**
 * Create test user in database (with better error handling)
 */
export declare function createTestUserInDB(email?: string | null, username?: string | null, _password?: string, // Use underscore prefix to indicate intentionally unused parameter
isAdmin?: boolean): Promise<{
    id: string;
    email: string;
    username: string;
}>;
/**
 * Cleanup specific test users (useful for individual test cleanup)
 */
export declare function cleanupTestUsers(emails: string[]): Promise<void>;
/**
 * Force cleanup all resources (for emergency cleanup)
 */
export declare function forceCleanupResources(): void;
//# sourceMappingURL=setup.d.ts.map