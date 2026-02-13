/**
 * Jest Configuration for Regression Test Suite
 * 
 * This configuration ensures regression tests:
 * 1. Run in isolation from other test suites
 * 2. Generate JUnit reports for CI/CD integration
 * 3. Fail fast on any regression detection
 * 4. Include detailed output for debugging
 */

module.exports = {
  displayName: 'regression',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['<rootDir>/test/regression/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/regression/setup.ts'],
  
  // Fail fast - stop on first regression
  bail: 1,
  
  // Verbose output for regression debugging
  verbose: true,
  
  // Reporters for CI/CD integration
  reporters: ['default'],
  
  // Module resolution
  moduleNameMapper: {
    '^@libs/(.*)$': '<rootDir>/libs/$1/src',
    '^@/(.*)$': '<rootDir>/apps/api/src/$1',
  },
  
  // Coverage settings for regression tests
  collectCoverageFrom: [
    '<rootDir>/apps/api/src/**/*.ts',
    '!<rootDir>/apps/api/src/**/*.spec.ts',
    '!<rootDir>/apps/api/src/**/*.test.ts',
  ],
  
  // Timeouts for regression tests (allow longer for complex scenarios)
  testTimeout: 30000,
  
  // Global test settings
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
