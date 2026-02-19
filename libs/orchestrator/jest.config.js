module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testRegex: '.*\\.test\\.ts$',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@libs/database(.*)$': '<rootDir>/../../database/src$1',
    '^@libs/redis(.*)$': '<rootDir>/../../redis/src$1',
    '^@libs/shared(.*)$': '<rootDir>/../../shared/src$1',
  },
  testTimeout: 30000,
  // Skip tests that require external dependencies not installed
  testPathIgnorePatterns: [
    '/node_modules/',
    'manual-test.js',
  ],
};
