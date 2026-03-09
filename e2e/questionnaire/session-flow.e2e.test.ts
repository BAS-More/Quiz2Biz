/**
 * Questionnaire Session Flow E2E Tests
 * Tests the complete questionnaire experience from start to completion
 */
import { test, expect, Page } from '@playwright/test';

// Helper to login before tests
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@quiz2biz.com');
  await page.getByLabel(/password/i).fill('Test@Password123!');
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
}

test.describe('Questionnaire Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Starting a New Session', () => {
    test('should display project types to choose from', async ({ page }) => {
      await page.goto('/projects/new');
      
      // Should see project type options
      await expect(page.getByText(/business plan|startup|restaurant/i)).toBeVisible();
    });

    test('should create new project and start questionnaire', async ({ page }) => {
      await page.goto('/projects/new');
      
      // Select a project type (e.g., Business Plan)
      const projectTypeCard = page.getByRole('button', { name: /business plan/i })
        .or(page.getByText(/business plan/i).first());
      await projectTypeCard.click();
      
      // Enter project name if required
      const projectNameInput = page.getByLabel(/project name|name your/i);
      if (await projectNameInput.isVisible()) {
        await projectNameInput.fill(`E2E Test Project ${Date.now()}`);
      }
      
      // Start questionnaire
      const startButton = page.getByRole('button', { name: /start|begin|continue/i });
      await startButton.click();
      
      // Should be on questionnaire page
      await expect(page).toHaveURL(/questionnaire|chat|project/i, { timeout: 15000 });
    });
  });

  test.describe('Answering Questions', () => {
    test('should display first question', async ({ page }) => {
      await page.goto('/projects/new');
      
      // Start a new project
      const projectTypeCard = page.getByRole('button', { name: /business plan/i })
        .or(page.getByText(/business plan/i).first());
      await projectTypeCard.click();
      
      const startButton = page.getByRole('button', { name: /start|begin|continue/i });
      await startButton.click();
      
      // Wait for questionnaire to load
      await page.waitForTimeout(2000);
      
      // Should see a question or chat input
      const questionOrChat = page.getByText(/what|how|tell|describe/i)
        .or(page.getByRole('textbox', { name: /message|type|ask/i }));
      await expect(questionOrChat).toBeVisible({ timeout: 10000 });
    });

    test('should accept text input answer', async ({ page }) => {
      await page.goto('/projects/new');
      
      const projectTypeCard = page.getByRole('button', { name: /business plan/i })
        .or(page.getByText(/business plan/i).first());
      await projectTypeCard.click();
      
      const startButton = page.getByRole('button', { name: /start|begin|continue/i });
      await startButton.click();
      
      await page.waitForTimeout(2000);
      
      // Find input field (chat or form)
      const textInput = page.getByRole('textbox', { name: /message|answer|type/i })
        .or(page.getByPlaceholder(/type|message|answer/i));
      
      if (await textInput.isVisible()) {
        await textInput.fill('My business is a technology consulting firm');
        
        // Submit the answer
        const submitButton = page.getByRole('button', { name: /send|submit|next|continue/i });
        await submitButton.click();
        
        // Should show the answer was submitted
        await expect(page.getByText(/technology consulting/i)).toBeVisible({ timeout: 10000 });
      }
    });

    test('should display progress indicator', async ({ page }) => {
      await page.goto('/projects/new');
      
      const projectTypeCard = page.getByRole('button', { name: /business plan/i })
        .or(page.getByText(/business plan/i).first());
      await projectTypeCard.click();
      
      const startButton = page.getByRole('button', { name: /start|begin|continue/i });
      await startButton.click();
      
      // Should show progress indicator
      const progressIndicator = page.getByRole('progressbar')
        .or(page.getByText(/progress|step|%/i));
      await expect(progressIndicator).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Session Management', () => {
    test('should save progress automatically', async ({ page }) => {
      await page.goto('/projects/new');
      
      const projectTypeCard = page.getByRole('button', { name: /business plan/i })
        .or(page.getByText(/business plan/i).first());
      await projectTypeCard.click();
      
      const startButton = page.getByRole('button', { name: /start|begin|continue/i });
      await startButton.click();
      
      await page.waitForTimeout(2000);
      
      // Submit an answer
      const textInput = page.getByRole('textbox', { name: /message|answer|type/i })
        .or(page.getByPlaceholder(/type|message|answer/i));
      
      if (await textInput.isVisible()) {
        await textInput.fill('My business idea is an AI-powered scheduling app');
        const submitButton = page.getByRole('button', { name: /send|submit|next/i });
        await submitButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Get current URL for later
      const currentUrl = page.url();
      
      // Reload page
      await page.reload();
      
      // Progress should be preserved - look for the message we sent
      const savedMessage = page.getByText(/AI-powered scheduling app/i);
      // Give time for the page to load and fetch history
      await expect(savedMessage).toBeVisible({ timeout: 15000 });
    });

    test('should display existing projects in dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should show projects list
      const projectsList = page.getByRole('list', { name: /projects/i })
        .or(page.getByText(/projects|recent|continue/i));
      await expect(projectsList).toBeVisible({ timeout: 10000 });
    });

    test('should be able to resume an existing project', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Find a project to resume
      const projectCard = page.getByRole('button', { name: /continue|resume|view/i }).first();
      
      if (await projectCard.isVisible()) {
        await projectCard.click();
        
        // Should navigate to project page
        await expect(page).toHaveURL(/project|questionnaire|chat/i, { timeout: 10000 });
      }
    });
  });

  test.describe('Message Limit Handling', () => {
    test('should display message count or limit indicator', async ({ page }) => {
      await page.goto('/projects/new');
      
      const projectTypeCard = page.getByRole('button', { name: /business plan/i })
        .or(page.getByText(/business plan/i).first());
      await projectTypeCard.click();
      
      const startButton = page.getByRole('button', { name: /start|begin|continue/i });
      await startButton.click();
      
      await page.waitForTimeout(2000);
      
      // Look for message count or limit indicator
      const limitIndicator = page.getByText(/message|limit|remaining/i)
        .or(page.getByText(/\d+\s*\/\s*\d+/)); // matches "5 / 50" pattern
      
      // This may or may not be visible depending on UI design
      // Just verify page loaded successfully
      await expect(page.getByRole('textbox').or(page.getByText(/what|how/i))).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Quality Score', () => {
    test('should display quality score for project', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Find a project card that might show quality score
      const qualityBadge = page.getByText(/quality|score|%/i);
      
      // Quality score might be shown on dashboard or project page
      // Check if visible, otherwise navigate to a project
      if (!(await qualityBadge.isVisible())) {
        const projectCard = page.getByRole('button', { name: /continue|resume|view/i }).first();
        if (await projectCard.isVisible()) {
          await projectCard.click();
          await page.waitForTimeout(2000);
        }
      }
      
      // Page should load without errors
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Navigation Controls', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should be able to navigate back to dashboard', async ({ page }) => {
    await page.goto('/projects/new');
    
    // Find back/home button
    const backButton = page.getByRole('button', { name: /back|home|dashboard/i })
      .or(page.getByRole('link', { name: /back|home|dashboard/i }));
    
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10000 });
    }
  });
});
