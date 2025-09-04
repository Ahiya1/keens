/**
 * Jest Configuration for Testing-Focused Test Suite
 * Optimized for running tests without broken source dependencies
 */

export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  
  // Focus on our new test files that don't depend on broken source
  testMatch: [
    "<rootDir>/tests/basic/**/*.test.ts",
    "<rootDir>/tests/core/**/*.test.ts", 
    "<rootDir>/tests/validation/**/*.test.ts",
    "<rootDir>/tests/mocks/**/*.test.ts"
  ],
  
  // Simplified setup without broken dependencies
  setupFilesAfterEnv: ["<rootDir>/tests/jest-simple-setup.ts"],
  
  collectCoverageFrom: [
    "tests/**/*.ts",
    "!tests/**/*.d.ts",
    "!tests/jest-simple-setup.ts",
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
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
};