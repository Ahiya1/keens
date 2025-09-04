/**
 * Jest Environment Setup
 * Sets environment variables without complex database setup to avoid timeouts
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.DB_NAME = "keen_test";
process.env.DB_USER = "keen_test_user";
process.env.DB_PASSWORD = "test_password";
process.env.ANTHROPIC_API_KEY = "sk-ant-api03-test-key-for-jest-unit-testing-only-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890-test";
process.env.APP_ENVIRONMENT = "test";
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
      message.includes("relation does not exist"))
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
      message.includes("Could not switch to application_user role"))
  ) {
    return; // Suppress warnings
  }
  originalConsoleWarn.apply(console, args);
};
