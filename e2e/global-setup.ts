/**
 * Global Setup for Quiz2Biz E2E Tests
 * Runs once before all tests to set up the test environment
 */
import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log('🚀 E2E Global Setup - Starting...');
  console.log(`   Base URL: ${baseURL}`);

  // -----------------------------------------------------------------------
  // 1. Wait for API to be ready (hard-fail on timeout)
  // -----------------------------------------------------------------------
  const maxRetries = 30;
  let retries = 0;
  const apiUrl = process.env.API_URL || 'http://localhost:3000';

  while (retries < maxRetries) {
    try {
      const response = await fetch(`${apiUrl}/api/v1/health/live`);
      if (response.ok) {
        console.log('✅ API is ready');
        break;
      }
    } catch {
      // API not ready yet
    }
    retries++;
    await new Promise((r) => setTimeout(r, 2000));
    if (retries % 5 === 0) {
      console.log(`⏳ Waiting for API... (${retries}/${maxRetries})`);
    }
  }

  if (retries >= maxRetries) {
    throw new Error(
      `❌ API health check timed out after ${maxRetries * 2}s. ` +
      `Cannot run E2E tests without a running API at ${apiUrl}`,
    );
  }

  // -----------------------------------------------------------------------
  // 2. Seed E2E test data via Prisma (idempotent)
  // -----------------------------------------------------------------------
  try {
    const seedScript = path.resolve(__dirname, '..', 'prisma', 'seeds', 'e2e-seed.ts');
    console.log('🌱 Seeding E2E test data...');
    execSync(
      `npx ts-node --compiler-options "{\\\"module\\\":\\\"CommonJS\\\"}" "${seedScript}"`,
      {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, NODE_ENV: 'test' },
        stdio: 'inherit',
        timeout: 30_000,
      },
    );
    console.log('✅ Test data seeded');
  } catch (error) {
    console.warn('⚠️  E2E seed script failed (tests may still run if data exists):', error);
  }

  console.log('✅ E2E Global Setup - Complete');
}

export default globalSetup;
