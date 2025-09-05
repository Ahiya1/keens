/**
 * Minimal Jest Setup - No Database Dependencies
 * This setup file provides basic test environment without database initialization
 * to prevent hanging and resource conflicts
 */
export declare function generateTestId(): string;
export declare function generateTestEmail(prefix?: string): string;
export declare const mockDatabaseHelpers: {
    setupTestDatabase: () => Promise<{
        query: () => Promise<never[]>;
        close: () => Promise<void>;
        isConnected: boolean;
    }>;
    cleanupTestDatabase: () => Promise<void>;
    createTestUser: () => Promise<{
        id: string;
        email: string;
        username: string;
    }>;
};
//# sourceMappingURL=jest-minimal-setup.d.ts.map