/**
 * Authentication E2E Tests
 * Tests user registration, login, logout, and authentication flows
 */
import { test, expect, Page } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test user credentials
const testUser = {
  email: `e2e-test-${Date.now()}@quiz2biz.test`,
  password: 'Test@Password123!',
  firstName: 'E2E',
  lastName: 'TestUser',
};

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /register|sign up/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /register|sign up|create account/i })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/required|email|password/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    
    await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i);
    await passwordInput.fill('weak');
    await passwordInput.blur();
    
    // Should show password requirements
    await expect(page.getByText(/characters|uppercase|number|special/i)).toBeVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    // Fill registration form
    await page.getByLabel(/first name/i).fill(testUser.firstName);
    await page.getByLabel(/last name/i).fill(testUser.lastName);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^password$/i).fill(testUser.password);
    
    // Check for confirm password if exists
    const confirmPassword = page.getByLabel(/confirm password/i);
    if (await confirmPassword.isVisible()) {
      await confirmPassword.fill(testUser.password);
    }
    
    // Accept terms if checkbox exists
    const termsCheckbox = page.getByRole('checkbox', { name: /terms|agree/i });
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    
    // Submit
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/dashboard|verify|success/i, { timeout: 10000 });
  });

  test('should show error for duplicate email', async ({ page }) => {
    // First, try to register with an existing email
    await page.getByLabel(/email/i).fill('test@quiz2biz.com');
    await page.getByLabel(/^password$/i).fill(testUser.password);
    
    const confirmPassword = page.getByLabel(/confirm password/i);
    if (await confirmPassword.isVisible()) {
      await confirmPassword.fill(testUser.password);
    }
    
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    // Should show error about existing user
    await expect(page.getByText(/already exists|already registered|in use/i)).toBeVisible({ timeout: 10000 });
  });

  test('should have link to login page', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /login|sign in|already have/i });
    await expect(loginLink).toBeVisible();
    
    await loginLink.click();
    await expect(page).toHaveURL(/login|signin/i);
  });
});

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /login|sign in|welcome/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    await expect(page.getByText(/required|email|password/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid@email.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    await expect(page.getByText(/invalid|incorrect|not found|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Use test credentials (should be seeded in global setup)
    await page.getByLabel(/email/i).fill('test@quiz2biz.com');
    await page.getByLabel(/password/i).fill('Test@Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /forgot|reset|trouble/i });
    await expect(forgotLink).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /register|sign up|create/i });
    await expect(registerLink).toBeVisible();
    
    await registerLink.click();
    await expect(page).toHaveURL(/register|signup/i);
  });
});

test.describe('User Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@quiz2biz.com');
    await page.getByLabel(/password/i).fill('Test@Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Find and click logout button/link
    const userMenu = page.getByRole('button', { name: /user|profile|account|menu/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }
    
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
      .or(page.getByRole('link', { name: /logout|sign out/i }));
    await logoutButton.click();
    
    // Should redirect to login or home
    await expect(page).toHaveURL(/login|signin|\/$/i, { timeout: 10000 });
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login|signin/i, { timeout: 10000 });
  });

  test('should allow authenticated users to access protected routes', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@quiz2biz.com');
    await page.getByLabel(/password/i).fill('Test@Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    
    // Navigate to protected route
    await page.goto('/dashboard');
    
    // Should stay on dashboard
    await expect(page).toHaveURL(/dashboard/i, { timeout: 10000 });
  });
});

test.describe('Session Persistence', () => {
  test('should maintain session after page reload', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@quiz2biz.com');
    await page.getByLabel(/password/i).fill('Test@Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
    
    // Reload page
    await page.reload();
    
    // Should still be on protected page
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10000 });
  });
});
