/**
 * Global Teardown for Quiz2Biz E2E Tests
 * Runs once after all tests to clean up test data
 */
import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 E2E Global Teardown - Starting...');

  try {
    const seedScript = path.resolve(__dirname, '..', 'prisma', 'seeds', 'e2e-seed.ts');
    execSync(
      `npx ts-node --compiler-options "{\\\"module\\\":\\\"CommonJS\\\"}" "${seedScript}" cleanup`,
      {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, NODE_ENV: 'test' },
        stdio: 'inherit',
        timeout: 30_000,
      },
    );
  } catch (error) {
    console.warn('⚠️  E2E cleanup failed (non-critical):', error);
  }

  console.log('✅ E2E Global Teardown - Complete');
}

export default globalTeardown;
