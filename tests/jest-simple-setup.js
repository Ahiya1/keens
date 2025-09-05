/**
 * Simplified Jest Setup for Testing-Focused Tests
 * Minimal setup without broken source dependencies
 */
/// <reference types="jest" />
// Configure test environment
process.env.NODE_ENV = "test";
process.env.DB_NAME = "keen_test";
process.env.DB_USER = "keen_test_user";
process.env.DB_PASSWORD = "test_password";
process.env.ANTHROPIC_API_KEY = "sk-test-key";
// Mock console to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = (...args) => {
    const message = args[0];
    if (typeof message === "string" &&
        (message.includes("Database connection") ||
            message.includes("Failed to log") ||
            message.includes("Migration failed"))) {
        return; // Suppress expected errors during tests
    }
    originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
    const message = args[0];
    if (typeof message === "string" &&
        (message.includes("Database may already be initialized") ||
            message.includes("Supabase"))) {
        return; // Suppress warnings
    }
    originalConsoleWarn.apply(console, args);
};
// Test utilities (exported functions instead of globals)
export function generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
export function generateTestEmail(prefix = "test") {
    return `${prefix}-${generateTestId()}@example.com`;
}
// Cleanup handler
process.on("exit", () => {
    // Cleanup any global resources
});
// Export utilities for tests
export { originalConsoleError, originalConsoleWarn };
//# sourceMappingURL=jest-simple-setup.js.map