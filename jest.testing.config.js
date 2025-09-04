/**
 * Jest Configuration for Comprehensive Testing
 * Fixed to include all test directories and proper coverage collection
 */

export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  
  // Include ALL test directories with actual test files
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/api/**/*.test.ts",
    "<rootDir>/tests/agent/**/*.test.ts",
    "<rootDir>/tests/integration/**/*.test.ts",
    "<rootDir>/tests/security/**/*.test.ts",
    "<rootDir>/tests/performance/**/*.test.ts",
    "<rootDir>/tests/advanced/**/*.test.ts",
    "<rootDir>/tests/tools/**/*.test.ts",
    "<rootDir>/tests/cli/**/*.test.ts",
    "<rootDir>/tests/database/**/*.test.ts",
    "<rootDir>/tests/basic/**/*.test.ts",
    "<rootDir>/tests/core/**/*.test.ts", 
    "<rootDir>/tests/validation/**/*.test.ts"
  ],
  
  // Use simple setup to avoid database timeouts
  setupFilesAfterEnv: ["<rootDir>/tests/jest-simple-setup.ts"],
  
  // FIXED: Collect coverage from SOURCE files, not test files
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/index.ts",
    "!src/database/migrations/run.ts",
    "!src/database/seeds/run.ts",
  ],
  
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  testTimeout: 10000,
  verbose: false, // Keep quiet for --silent mode
  silent: true,   // Enable silent mode by default

  // Modern transform configuration
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
    // Map chalk to our mock
    "^chalk$": "<rootDir>/tests/__mocks__/chalk.js"
  },

  // Allow transformation of ES modules in node_modules  
  transformIgnorePatterns: [
    "node_modules/(?!(chalk|ansi-styles|supports-color|has-flag|strip-ansi|ansi-regex)/)"
  ],

  // Coverage reporting
  coverageDirectory: "coverage-testing",
  coverageReporters: [
    "text",
    "lcov",
    "html",
    "json-summary"
  ],

  // Mock setup
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  clearMocks: true,
  restoreMocks: true,
  
  // Exclude problematic tests that might hang
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/coverage/",
    "<rootDir>/coverage-testing/"
  ],
};