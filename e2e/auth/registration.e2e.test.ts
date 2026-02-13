/**
 * Quiz2Biz E2E Tests - User Registration Flow
 * Tests: Registration, email verification, validation errors
 */
import { test, expect } from '@playwright/test';
import { testUsers, createTestHelpers } from '../fixtures';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form with all required fields', async ({ page }) => {
    // Verify form elements are present
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible();

    // Verify OAuth buttons
    await expect(page.locator('[data-testid="google-oauth-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="microsoft-oauth-button"]')).toBeVisible();

    // Verify link to login
    await expect(page.locator('text=Already have an account')).toBeVisible();
  });

  test('should successfully register a new user', async ({ page }) => {
    const newUser = {
      name: `Test User ${Date.now()}`,
      email: `testuser-${Date.now()}@quiz2biz.test`,
      password: 'SecurePassword123!',
    };

    // Fill registration form
    await page.fill('[data-testid="name-input"]', newUser.name);
    await page.fill('[data-testid="email-input"]', newUser.email);
    await page.fill('[data-testid="password-input"]', newUser.password);
    await page.fill('[data-testid="confirm-password-input"]', newUser.password);

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Wait for success - should redirect to email verification page
    await page.waitForURL(/\/verify-email|\/registration-success/, { timeout: 10000 });

    // Verify success message
    await expect(page.locator('text=verification email')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click register without filling any fields
    await page.click('[data-testid="register-button"]');

    // Check for validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');

    // Check for email validation error
    await expect(page.locator('text=valid email')).toBeVisible();
  });

  test('should validate password strength requirements', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@quiz2biz.test');
    await page.fill('[data-testid="password-input"]', 'weak');
    await page.fill('[data-testid="confirm-password-input"]', 'weak');
    await page.click('[data-testid="register-button"]');

    // Check for password strength error
    await expect(
      page
        .locator('text=Password must be at least 8 characters')
        .or(page.locator('text=Password must contain')),
    ).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@quiz2biz.test');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
    await page.click('[data-testid="register-button"]');

    // Check for password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should show error for existing email', async ({ page }) => {
    // Try to register with existing user email
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
    await page.click('[data-testid="register-button"]');

    // Check for existing email error
    await expect(
      page.locator('text=email already exists').or(page.locator('text=already registered')),
    ).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('text=Already have an account');
    await page.waitForURL('/login');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should initiate Google OAuth flow', async ({ page }) => {
    // Click Google OAuth button
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('[data-testid="google-oauth-button"]'),
    ]);

    // Verify OAuth popup opens
    await expect(popup).toBeTruthy();
    expect(popup.url()).toContain('accounts.google.com');
    await popup.close();
  });

  test('should initiate Microsoft OAuth flow', async ({ page }) => {
    // Click Microsoft OAuth button
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('[data-testid="microsoft-oauth-button"]'),
    ]);

    // Verify OAuth popup opens
    await expect(popup).toBeTruthy();
    expect(popup.url()).toContain('login.microsoftonline.com');
    await popup.close();
  });
});

test.describe('Email Verification Flow', () => {
  test('should display email verification page', async ({ page }) => {
    await page.goto('/verify-email');

    // Verify page content
    await expect(page.locator('text=Verify your email')).toBeVisible();
    await expect(page.locator('[data-testid="resend-email-button"]')).toBeVisible();
  });

  test('should handle valid verification token', async ({ page }) => {
    // Navigate with valid token (mock token for testing)
    await page.goto('/verify-email?token=valid-test-token');

    // Should show success or redirect to login
    await expect(
      page.locator('text=Email verified').or(page.locator('[data-testid="login-button"]')),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should handle invalid verification token', async ({ page }) => {
    await page.goto('/verify-email?token=invalid-token');

    // Should show error message
    await expect(page.locator('text=invalid').or(page.locator('text=expired'))).toBeVisible({
      timeout: 5000,
    });
  });

  test('should allow resending verification email', async ({ page }) => {
    await page.goto('/verify-email');

    // Click resend button
    await page.click('[data-testid="resend-email-button"]');

    // Should show confirmation
    await expect(page.locator('text=email sent').or(page.locator('text=Resent'))).toBeVisible({
      timeout: 5000,
    });
  });
});
