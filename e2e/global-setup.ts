/**
 * Global Setup for Quiz2Biz E2E Tests
 * Runs once before all tests to set up the test environment
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  
  console.log('🚀 E2E Global Setup - Starting...');
  console.log(`   Base URL: ${baseURL}`);

  // Wait for API to be ready
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
    console.warn('⚠️ API health check timed out, proceeding anyway...');
  }

  // Create a test user for authentication tests
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Seed test data via API if available
    const seedResponse = await fetch(`${apiUrl}/api/v1/test/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (seedResponse?.ok) {
      console.log('✅ Test data seeded');
    }
  } catch {
    // Seed endpoint might not exist, continue
  }

  await browser.close();

  console.log('✅ E2E Global Setup - Complete');
}

export default globalSetup;
