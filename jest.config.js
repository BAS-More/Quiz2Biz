/**
 * Root Jest configuration
 * 
 * This config is used when running `npx jest` from the workspace root.
 * Individual apps/libs have their own jest configs for isolated testing.
 * 
 * Frontend (apps/web) uses Vitest - run separately with `npm run test -w web`
 */
module.exports = {
  // Jest projects - each should have their own jest.config
  projects: [
    '<rootDir>/apps/api',
    '<rootDir>/apps/cli',
    '<rootDir>/libs/orchestrator',
    '<rootDir>/test/regression',
    '<rootDir>/test/performance',
  ],
  // Exclude paths from all projects
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  testTimeout: 30000,
  verbose: true,
};
