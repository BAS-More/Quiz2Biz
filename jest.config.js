/**
 * Root Jest configuration
 * 
 * This config is used when running `npx jest` from the workspace root.
 * Individual apps/libs have their own jest configs for isolated testing.
 */
module.exports = {
  // Only test apps that have proper configurations
  projects: [
    '<rootDir>/apps/api',
    '<rootDir>/apps/cli',
    '<rootDir>/test/regression',
  ],
  // Exclude libs that need special setup or dependencies
  testPathIgnorePatterns: [
    '/node_modules/',
    '/libs/orchestrator/', // Requires tiktoken, pino etc.
    '/dist/',
  ],
  testTimeout: 30000,
  verbose: true,
};
