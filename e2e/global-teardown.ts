/**
 * Global Teardown for Quiz2Biz E2E Tests
 * Runs once after all tests to clean up
 */
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 E2E Global Teardown - Starting...');

  const apiUrl = process.env.API_URL || 'http://localhost:3000';

  try {
    // Clean up test data
    await fetch(`${apiUrl}/api/v1/test/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);
  } catch {
    // Cleanup endpoint might not exist
  }

  console.log('✅ E2E Global Teardown - Complete');
}

export default globalTeardown;
