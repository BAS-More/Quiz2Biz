/**
 * Jest Configuration for Performance Test Suite
 */

module.exports = {
  displayName: 'performance',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['<rootDir>/test/performance/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // Module resolution
  moduleNameMapper: {
    '^@libs/(.*)$': '<rootDir>/libs/$1/src',
    '^@/(.*)$': '<rootDir>/apps/api/src/$1',
  },
  
  // Longer timeouts for performance tests
  testTimeout: 60000,
  
  // Verbose output for debugging
  verbose: true,
};
