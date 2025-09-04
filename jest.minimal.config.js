/**
 * Minimal Jest Configuration for Debugging
 * No setup files, minimal configuration to isolate issues
 */

export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  
  // Just run the basic test
  testMatch: [
    "<rootDir>/tests/basic/**/*.test.ts"
  ],
  
  // NO setup files to avoid any hanging issues
  
  testTimeout: 5000,
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
  },

  // Mock setup
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  clearMocks: true,
};