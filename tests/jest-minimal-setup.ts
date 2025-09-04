/**
 * Minimal Jest Setup - No Database Dependencies
 * This setup file provides basic test environment without database initialization
 * to prevent hanging and resource conflicts
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.APP_ENVIRONMENT = "test";
process.env.ANTHROPIC_API_KEY = "sk-ant-api03-test-key-for-jest-unit-testing-only-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890-test";

// Basic database environment variables (but no actual database connection)
process.env.DB_NAME = "keen_test";
process.env.DB_USER = "keen_test_user";
process.env.DB_PASSWORD = "test_password";
process.env.DB_MAX_CONNECTIONS = "5";

// Mock console methods to reduce noise during testing
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const message = args[0];
  if (
    typeof message === "string" &&
    (message.includes("Database connection") ||
      message.includes("Failed to log") ||
      message.includes("Migration failed") ||
      message.includes("relation does not exist") ||
      message.includes("unrecognized configuration parameter"))
  ) {
    return; // Suppress expected errors during tests
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === "string" &&
    (message.includes("Database may already be initialized") ||
      message.includes("Supabase") ||
      message.includes("Could not switch to application_user role") ||
      message.includes("Could not set user context parameters"))
  ) {
    return; // Suppress warnings
  }
  originalConsoleWarn.apply(console, args);
};

// Simple cleanup function that doesn't hang
afterAll(() => {
  // Force cleanup any remaining timeouts/intervals
  if (global.gc) {
    global.gc();
  }
});

// Export helper functions for tests that need them
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTestEmail(prefix: string = "test"): string {
  return `${prefix}-${generateTestId()}@example.com`;
}

// Mock database functions for tests that need them
export const mockDatabaseHelpers = {
  setupTestDatabase: () => Promise.resolve({
    query: () => Promise.resolve([]),
    close: () => Promise.resolve(),
    isConnected: false
  }),
  cleanupTestDatabase: () => Promise.resolve(),
  createTestUser: () => Promise.resolve({
    id: "test-user-id",
    email: "test@example.com",
    username: "testuser"
  })
};