/**
 * Jest Configuration for keen API Gateway Tests
 * Modern ESM configuration with chalk mocking
 */

export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/api/**/*.test.ts",
    "<rootDir>/tests/agent/**/*.test.ts", // Added agent tests
    "<rootDir>/tests/integration/**/*.test.ts",
    "<rootDir>/tests/performance/**/*.test.ts",
    "<rootDir>/tests/security/**/*.test.ts"
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
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
  verbose: true,

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

  // Mock setup
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};
