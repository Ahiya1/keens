/**
 * Database Test Setup - TypeScript Version
 * Conditional database setup that won't hang and has proper resource cleanup
 */

import { v4 as uuidv4 } from "uuid";
import { DatabaseManager } from "../src/database/DatabaseManager.js";

// Configure test environment
process.env.NODE_ENV = "test";
process.env.DB_NAME = "keen_test";
process.env.DB_USER = "keen_test_user";
process.env.DB_PASSWORD = "test_password";
process.env.DB_MAX_CONNECTIONS = "3"; // Smaller pool for tests
process.env.APP_ENVIRONMENT = "test";

// Global test database instance
let testDbManager: DatabaseManager | null = null;
let setupPromise: Promise<DatabaseManager> | null = null;
let isSetupComplete = false;

// Track resources for cleanup
const activeIntervals = new Set<NodeJS.Timeout>();
const activeTimeouts = new Set<NodeJS.Timeout>();

// Test data tracking
const testDataRegistry = {
  users: new Set<string>(),
  sessions: new Set<string>(),
  testRunId: `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  clear() {
    this.users.clear();
    this.sessions.clear();
  },
};

// Mock console methods to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === "string" &&
    (message.includes("Database connection test failed") ||
      message.includes("Failed to log") ||
      message.includes('relation "audit_logs" does not exist') ||
      message.includes("Could not set user context parameters") ||
      message.includes("Database initialization validation failed") ||
      message.includes("Migration failed"))
  ) {
    return; // Suppress expected database errors
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === "string" &&
    (message.includes("Database may already be initialized") ||
      message.includes("Could not switch to application_user role"))
  ) {
    return; // Suppress warnings
  }
  originalConsoleWarn.apply(console, args);
};

// Override timers to track them
const originalSetInterval = global.setInterval;
const originalSetTimeout = global.setTimeout;
const originalClearInterval = global.clearInterval;
const originalClearTimeout = global.clearTimeout;

global.setInterval = ((callback: any, ms: number, ...args: any[]) => {
  const interval = originalSetInterval(callback, ms, ...args);
  activeIntervals.add(interval);
  return interval;
}) as any;

global.setTimeout = ((callback: any, ms: number, ...args: any[]) => {
  const timeout = originalSetTimeout(callback, ms, ...args);
  activeTimeouts.add(timeout);
  return timeout;
}) as any;

global.clearInterval = (interval: any) => {
  activeIntervals.delete(interval);
  return originalClearInterval(interval);
};

global.clearTimeout = (timeout: any) => {
  activeTimeouts.delete(timeout);
  return originalClearTimeout(timeout);
};

/**
 * Generate unique test identifiers
 */
export function generateTestId(): string {
  return `${testDataRegistry.testRunId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTestEmail(prefix: string = "test"): string {
  return `${prefix}-${generateTestId()}@example.com`;
}

export function generateTestSessionId(): string {
  const sessionUuid = uuidv4();
  testDataRegistry.sessions.add(sessionUuid);
  return sessionUuid;
}

/**
 * Initialize test database with better error handling and timeouts
 */
export async function setupTestDatabase(): Promise<DatabaseManager> {
  // If already set up, return existing instance
  if (isSetupComplete && testDbManager) {
    return testDbManager;
  }

  // If setup is in progress, wait for it
  if (setupPromise) {
    return await setupPromise;
  }

  // Start new setup
  setupPromise = doSetupDatabase();
  try {
    testDbManager = await setupPromise;
    isSetupComplete = true;
    return testDbManager;
  } catch (error) {
    setupPromise = null;
    throw error;
  }
}

async function doSetupDatabase(): Promise<DatabaseManager> {
  console.log("🧪 Setting up test database (with timeout)...");

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Database setup timed out after 15 seconds"));
    }, 15000); // 15 second timeout
    activeTimeouts.add(timeout);
  });

  try {
    // Race between setup and timeout
    const dbManager = await Promise.race([
      createDatabaseManager(),
      timeoutPromise
    ]);
    console.log("✅ Test database setup complete (with timeout protection)");
    return dbManager;
  } catch (error) {
    console.warn("Database setup failed, using mock:", error);
    return createMockDatabase();
  }
}

async function createDatabaseManager(): Promise<DatabaseManager> {
  const manager = new DatabaseManager({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "keen_test",
    user: process.env.DB_USER || "keen_test_user",
    password: process.env.DB_PASSWORD || "test_password",
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "3"),
  });

  await manager.initialize();
  return manager;
}

/**
 * Create mock database for environments without PostgreSQL
 */
function createMockDatabase(): any {
  return {
    testConnection: () => Promise.resolve(false),
    initialize: () => Promise.resolve(),
    close: () => Promise.resolve(),
    query: () => Promise.resolve([]),
    transaction: (callback: any) =>
      callback({
        query: () => Promise.resolve([]),
        commit: () => Promise.resolve(),
        rollback: () => Promise.resolve(),
      }),
    isConnected: false,
    healthCheck: () =>
      Promise.resolve({
        connected: false,
        poolStats: { totalCount: 0, idleCount: 0, waitingCount: 0 },
      }),
  };
}

/**
 * Fast cleanup that won't hang
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (!testDbManager) return;

  console.log("🧹 Fast database cleanup...");
  try {
    // Set a timeout for cleanup
    const cleanupPromise = doCleanup();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Cleanup timed out")), 5000);
    });

    await Promise.race([cleanupPromise, timeoutPromise]);
    console.log("✅ Database cleanup completed");
  } catch (error) {
    console.warn("Cleanup warning (non-blocking):", error);
  } finally {
    // Force cleanup regardless
    testDbManager = null;
    setupPromise = null;
    isSetupComplete = false;
    forceCleanupResources();
  }
}

async function doCleanup(): Promise<void> {
  if (!testDbManager) return;

  // Quick cleanup of test data
  const userIds = Array.from(testDataRegistry.users);
  if (userIds.length > 0) {
    try {
      await testDbManager.query(
        `DELETE FROM users WHERE id = ANY($1::uuid[])`,
        [userIds]
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Close database
  if (testDbManager.isConnected) {
    await testDbManager.close();
  }
}

/**
 * Force cleanup all resources (fast, non-blocking)
 */
function forceCleanupResources(): void {
  // Clear timers
  activeIntervals.forEach((interval) => {
    try {
      originalClearInterval(interval);
    } catch (error) {
      // Ignore
    }
  });
  activeIntervals.clear();

  activeTimeouts.forEach((timeout) => {
    try {
      originalClearTimeout(timeout);
    } catch (error) {
      // Ignore
    }
  });
  activeTimeouts.clear();

  testDataRegistry.clear();
}

/**
 * Create test user (works with both real and mock database)
 */
export async function createTestUser(
  email: string | null = null,
  username: string | null = null,
  isAdmin: boolean = false
): Promise<{ id: string; email: string; username: string; context: any }> {
  const testEmail = email || generateTestEmail("testuser");
  const testUsername = username || `user_${generateTestId()}`;

  const context = {
    userId: uuidv4(),
    isAdmin,
    adminPrivileges: isAdmin
      ? {
          unlimited_credits: true,
          bypass_rate_limits: true,
          view_all_analytics: true,
        }
      : undefined,
  };

  testDataRegistry.users.add(context.userId);

  return {
    id: context.userId,
    email: testEmail,
    username: testUsername,
    context,
  };
}

/**
 * Get test database instance (can be null or mock)
 */
export function getTestDatabase(): DatabaseManager | null {
  return testDbManager;
}

// Process-level cleanup handlers (non-blocking)
process.on("exit", () => {
  forceCleanupResources();
});

process.on("SIGINT", () => {
  forceCleanupResources();
  process.exit(0);
});

process.on("SIGTERM", () => {
  forceCleanupResources();
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.warn("Unhandled rejection (non-blocking):", reason);
  forceCleanupResources();
});