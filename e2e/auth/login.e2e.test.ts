/**
 * Quiz2Biz E2E Tests - Login Flow
 * Tests: Login, logout, session management, password reset
 */
import { test, expect } from '@playwright/test';
import { testUsers, createTestHelpers } from '../fixtures';

test.describe('User Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with all required fields', async ({ page }) => {
    // Verify form elements are present
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

    // Verify OAuth buttons
    await expect(page.locator('[data-testid="google-oauth-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="microsoft-oauth-button"]')).toBeVisible();

    // Verify links
    await expect(page.locator('text=Forgot password')).toBeVisible();
    await expect(page.locator('text=Create an account')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
    await page.click('[data-testid="login-button"]');

    // Check for error message
    await expect(
      page.locator('text=Invalid credentials').or(page.locator('text=incorrect')),
    ).toBeVisible();
  });

  test('should show error for non-existent email', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'nonexistent@quiz2biz.test');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="login-button"]');

    // Check for error message
    await expect(
      page.locator('text=Invalid credentials').or(page.locator('text=not found')),
    ).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="login-button"]');

    // Check for validation error
    await expect(page.locator('text=valid email')).toBeVisible();
  });

  test('should require password field', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    // Leave password empty
    await page.click('[data-testid="login-button"]');

    // Check for validation error
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.click('text=Create an account');
    await page.waitForURL('/register');
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.click('text=Forgot password');
    await page.waitForURL('/forgot-password');
    await expect(page.locator('[data-testid="reset-password-button"]')).toBeVisible();
  });

  test('should show remember me option', async ({ page }) => {
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeVisible();
  });
});

test.describe('Session Management', () => {
  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Reload the page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    expect(page.url()).toContain('/dashboard');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/\/login/);
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access questionnaires without login
    await page.goto('/questionnaires');

    // Should redirect to login with redirect parameter
    await page.waitForURL(/\/login/);

    // Login
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');

    // Should redirect to original intended page
    await page.waitForURL('/questionnaires', { timeout: 10000 });
  });

  test('should display user information in header', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Click user menu
    await page.click('[data-testid="user-menu"]');

    // Should display user email
    await expect(page.locator(`text=${testUsers.user.email}`)).toBeVisible();
  });

  test('should handle session expiration gracefully', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Clear cookies to simulate session expiration
    await context.clearCookies();

    // Try to perform an action
    await page.goto('/questionnaires');

    // Should redirect to login with appropriate message
    await page.waitForURL(/\/login/);
    await expect(
      page.locator('text=session expired').or(page.locator('text=Please login')),
    ).toBeVisible();
  });
});

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('should display password reset form', async ({ page }) => {
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-password-button"]')).toBeVisible();
    await expect(page.locator('text=Back to login')).toBeVisible();
  });

  test('should send password reset email', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.click('[data-testid="reset-password-button"]');

    // Should show success message
    await expect(
      page.locator('text=reset email sent').or(page.locator('text=Check your email')),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format for reset', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="reset-password-button"]');

    // Should show validation error
    await expect(page.locator('text=valid email')).toBeVisible();
  });

  test('should navigate back to login', async ({ page }) => {
    await page.click('text=Back to login');
    await page.waitForURL('/login');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should handle reset token flow', async ({ page }) => {
    // Navigate to reset page with token
    await page.goto('/reset-password?token=valid-reset-token');

    // Should show new password form
    await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-new-password-button"]')).toBeVisible();
  });

  test('should validate new password requirements', async ({ page }) => {
    await page.goto('/reset-password?token=valid-reset-token');

    await page.fill('[data-testid="new-password-input"]', 'weak');
    await page.fill('[data-testid="confirm-password-input"]', 'weak');
    await page.click('[data-testid="submit-new-password-button"]');

    // Should show password strength error
    await expect(
      page.locator('text=Password must be at least').or(page.locator('text=requirements')),
    ).toBeVisible();
  });

  test('should handle invalid reset token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token');

    // Should show error message
    await expect(page.locator('text=invalid').or(page.locator('text=expired'))).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Admin Login', () => {
  test('should allow admin to access admin panel', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.admin.email);
    await page.fill('[data-testid="password-input"]', testUsers.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Navigate to admin panel
    await page.goto('/admin');

    // Admin should have access
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  });

  test('should deny regular user from admin panel', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Try to access admin panel
    await page.goto('/admin');

    // Should show access denied or redirect
    await expect(page.locator('text=Access denied').or(page.locator('text=Unauthorized')))
      .toBeVisible({ timeout: 5000 })
      .catch(async () => {
        // Or should redirect to dashboard
        expect(page.url()).not.toContain('/admin');
      });
  });
});
