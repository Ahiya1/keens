/**
 * Enhanced Jest Configuration for keen Agent Framework
 * Includes tests for logging, progress reporting, and enhanced agent functionality
 */

export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/api/**/*.test.ts",
    "<rootDir>/tests/agent/**/*.test.ts",  // Include enhanced agent tests
    "<rootDir>/tests/phase1/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/index.ts",
    "!src/database/migrations/run.ts",
    "!src/database/seeds/run.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 40,  // Keep original threshold for now
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
  verbose: true,

  // Enhanced transform configuration
  transform: {
    "^.+\.ts$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },

  // Module mapping for ESM
  moduleNameMapper: {
    "^(\.{1,2}/.*)\.js$": "$1",
  },

  // Coverage reporting
  coverageDirectory: "coverage-enhanced",
  coverageReporters: [
    "text",
    "lcov",
    "html",
    "json-summary"
  ],

  // Watch mode settings for development
  watchPathIgnorePatterns: [
    "node_modules",
    "dist",
    "coverage",
    "coverage-enhanced",
    "test-results",
    ".git"
  ],

  // Performance settings
  maxWorkers: "50%",
  cache: true,
  cacheDirectory: "<rootDir>/.jest-cache-enhanced",

  // Error handling
  bail: false, // Continue running tests even if some fail
  errorOnDeprecated: false, // More lenient for now

  // Mock settings
  clearMocks: true,
  restoreMocks: true,
};