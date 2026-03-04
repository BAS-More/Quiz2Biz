/**
 * Jest configuration for CLI
 * Uses isolated coverage collection to avoid mock pollution
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js'],
  // Force clean mock state for each test
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Coverage for lib/config.ts only (real tests exist)
  collectCoverageFrom: ['<rootDir>/src/lib/config.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    'src/lib/config.ts': {
      statements: 90,
      branches: 50,
      functions: 100,
      lines: 90,
    },
  },
};
