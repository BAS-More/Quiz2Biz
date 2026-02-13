/**
 * Quiz2Biz E2E Global Setup
 * Runs once before all tests
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Global Setup...');

  // Get the base URL from config
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:5173';
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  // Wait for services to be ready
  console.log('⏳ Waiting for services...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Check web app is running
  try {
    await page.goto(baseURL, { timeout: 30000 });
    console.log('✅ Web app is running');
  } catch (error) {
    console.warn('⚠️ Web app not ready, tests may fail');
  }

  // Check API is running
  try {
    const response = await page.request.get(`${apiURL}/health`);
    if (response.ok()) {
      console.log('✅ API is running');
    }
  } catch (error) {
    console.warn('⚠️ API not ready, tests may fail');
  }

  await browser.close();

  // Set up test database (if needed)
  if (process.env.E2E_RESET_DB === 'true') {
    console.log('🗄️ Resetting test database...');
    // Database reset logic would go here
  }

  console.log('✅ E2E Global Setup complete');
}

export default globalSetup;
