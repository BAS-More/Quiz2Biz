/**
 * Quiz2Biz E2E Tests - Admin Dashboard
 * Tests: View sessions, approve/reject decisions, user management
 */
import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.admin.email);
    await page.fill('[data-testid="password-input"]', testUsers.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Dashboard Overview', () => {
    test('should display admin dashboard with statistics', async ({ page }) => {
      await page.goto('/admin');

      // Verify admin dashboard is displayed
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();

      // Verify statistics cards
      await expect(page.locator('[data-testid="total-users-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-sessions-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-approvals-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-score-card"]')).toBeVisible();
    });

    test('should show recent activity feed', async ({ page }) => {
      await page.goto('/admin');

      // Verify activity feed
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item"]').first()).toBeVisible();
    });

    test('should navigate to different admin sections', async ({ page }) => {
      await page.goto('/admin');

      // Test navigation to Users
      await page.click('[data-testid="nav-users"]');
      await expect(page).toHaveURL(/\/admin\/users/);

      // Test navigation to Sessions
      await page.click('[data-testid="nav-sessions"]');
      await expect(page).toHaveURL(/\/admin\/sessions/);

      // Test navigation to Approvals
      await page.click('[data-testid="nav-approvals"]');
      await expect(page).toHaveURL(/\/admin\/approvals/);
    });
  });

  test.describe('Session Management', () => {
    test('should display list of all sessions', async ({ page }) => {
      await page.goto('/admin/sessions');

      // Verify sessions list
      await expect(page.locator('[data-testid="sessions-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-row"]').first()).toBeVisible();
    });

    test('should filter sessions by status', async ({ page }) => {
      await page.goto('/admin/sessions');

      // Apply filter
      await page.selectOption('[data-testid="session-status-filter"]', 'IN_PROGRESS');

      // Verify filtered results
      const sessionRows = page.locator('[data-testid="session-row"]');
      const count = await sessionRows.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(sessionRows.nth(i).locator('[data-testid="session-status"]')).toContainText(
          'In Progress',
        );
      }
    });

    test('should search sessions by user email', async ({ page }) => {
      await page.goto('/admin/sessions');

      // Search for specific user
      await page.fill('[data-testid="session-search-input"]', 'test@example.com');
      await page.click('[data-testid="search-button"]');

      // Wait for search results
      await page.waitForResponse(
        (response) => response.url().includes('/api/admin/sessions') && response.status() === 200,
      );
    });

    test('should view session details', async ({ page }) => {
      await page.goto('/admin/sessions');

      // Click on first session
      await page.click('[data-testid="session-row"]');

      // Verify session details page
      await expect(page.locator('[data-testid="session-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-user-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-responses"]')).toBeVisible();
    });

    test('should export sessions to CSV', async ({ page }) => {
      await page.goto('/admin/sessions');

      // Setup download handler
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-csv-button"]');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toContain('sessions');
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });
  });

  test.describe('Approval Workflow', () => {
    test('should display pending approvals list', async ({ page }) => {
      await page.goto('/admin/approvals');

      // Verify approvals list
      await expect(page.locator('[data-testid="approvals-list"]')).toBeVisible();
    });

    test('should view approval request details', async ({ page }) => {
      await page.goto('/admin/approvals');

      // Click on first approval request
      const approvalItem = page.locator('[data-testid="approval-item"]').first();
      if (await approvalItem.isVisible()) {
        await approvalItem.click();

        // Verify approval details
        await expect(page.locator('[data-testid="approval-details"]')).toBeVisible();
        await expect(page.locator('[data-testid="approval-requester"]')).toBeVisible();
        await expect(page.locator('[data-testid="approval-reason"]')).toBeVisible();
        await expect(page.locator('[data-testid="approve-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="reject-button"]')).toBeVisible();
      }
    });

    test('should approve a pending request', async ({ page }) => {
      await page.goto('/admin/approvals');

      // Find a pending approval
      const approvalItem = page.locator('[data-testid="approval-item"]').first();
      if (await approvalItem.isVisible()) {
        await approvalItem.click();

        // Add approval comment
        await page.fill(
          '[data-testid="approval-comment"]',
          'Approved by admin - meets requirements',
        );

        // Click approve
        await page.click('[data-testid="approve-button"]');

        // Verify success
        await expect(page.locator('[data-testid="approval-success-message"]')).toBeVisible();
      }
    });

    test('should reject a pending request', async ({ page }) => {
      await page.goto('/admin/approvals');

      // Find a pending approval
      const approvalItem = page.locator('[data-testid="approval-item"]').first();
      if (await approvalItem.isVisible()) {
        await approvalItem.click();

        // Add rejection reason (required)
        await page.fill('[data-testid="rejection-reason"]', 'Does not meet security requirements');

        // Click reject
        await page.click('[data-testid="reject-button"]');

        // Verify rejection
        await expect(page.locator('[data-testid="rejection-success-message"]')).toBeVisible();
      }
    });

    test('should filter approvals by type', async ({ page }) => {
      await page.goto('/admin/approvals');

      // Filter by type
      await page.selectOption('[data-testid="approval-type-filter"]', 'POLICY_LOCK');

      // Verify filtered results
      const approvalItems = page.locator('[data-testid="approval-item"]');
      const count = await approvalItems.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(approvalItems.nth(i).locator('[data-testid="approval-type"]')).toContainText(
          'Policy Lock',
        );
      }
    });
  });

  test.describe('User Management', () => {
    test('should display users list', async ({ page }) => {
      await page.goto('/admin/users');

      // Verify users list
      await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-row"]').first()).toBeVisible();
    });

    test('should search users by email', async ({ page }) => {
      await page.goto('/admin/users');

      // Search
      await page.fill('[data-testid="user-search-input"]', testUsers.user.email);
      await page.click('[data-testid="search-button"]');

      // Verify search results
      await expect(page.locator('[data-testid="user-row"]')).toContainText(testUsers.user.email);
    });

    test('should view user details', async ({ page }) => {
      await page.goto('/admin/users');

      // Click on first user
      await page.click('[data-testid="user-row"]');

      // Verify user details
      await expect(page.locator('[data-testid="user-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-role"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-subscription"]')).toBeVisible();
    });

    test('should change user role', async ({ page }) => {
      await page.goto('/admin/users');

      // Click on a user
      await page.click('[data-testid="user-row"]');

      // Change role
      await page.selectOption('[data-testid="user-role-select"]', 'MODERATOR');
      await page.click('[data-testid="save-role-button"]');

      // Verify success
      await expect(page.locator('[data-testid="role-updated-message"]')).toBeVisible();
    });

    test('should deactivate user account', async ({ page }) => {
      await page.goto('/admin/users');

      // Click on a user
      await page.click('[data-testid="user-row"]');

      // Deactivate
      await page.click('[data-testid="deactivate-user-button"]');

      // Confirm dialog
      await page.click('[data-testid="confirm-deactivate-button"]');

      // Verify deactivation
      await expect(page.locator('[data-testid="user-deactivated-message"]')).toBeVisible();
    });

    test('should filter users by role', async ({ page }) => {
      await page.goto('/admin/users');

      // Filter by role
      await page.selectOption('[data-testid="role-filter"]', 'ADMIN');

      // Verify filtered results
      const userRows = page.locator('[data-testid="user-row"]');
      const count = await userRows.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(userRows.nth(i).locator('[data-testid="user-role-badge"]')).toContainText(
          'Admin',
        );
      }
    });
  });

  test.describe('Audit Log', () => {
    test('should display audit log', async ({ page }) => {
      await page.goto('/admin/audit-log');

      // Verify audit log is displayed
      await expect(page.locator('[data-testid="audit-log"]')).toBeVisible();
      await expect(page.locator('[data-testid="audit-entry"]').first()).toBeVisible();
    });

    test('should filter audit log by action type', async ({ page }) => {
      await page.goto('/admin/audit-log');

      // Filter by action
      await page.selectOption('[data-testid="audit-action-filter"]', 'USER_LOGIN');

      // Verify filtered results
      const auditEntries = page.locator('[data-testid="audit-entry"]');
      const count = await auditEntries.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(auditEntries.nth(i).locator('[data-testid="audit-action"]')).toContainText(
          'Login',
        );
      }
    });

    test('should filter audit log by date range', async ({ page }) => {
      await page.goto('/admin/audit-log');

      // Set date range
      await page.fill('[data-testid="audit-date-from"]', '2026-01-01');
      await page.fill('[data-testid="audit-date-to"]', '2026-01-31');
      await page.click('[data-testid="apply-date-filter"]');

      // Verify filter is applied
      await expect(page.locator('[data-testid="date-filter-applied"]')).toBeVisible();
    });

    test('should export audit log', async ({ page }) => {
      await page.goto('/admin/audit-log');

      // Export
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-audit-log-button"]');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toContain('audit');
    });
  });

  test.describe('System Settings', () => {
    test('should display system settings', async ({ page }) => {
      await page.goto('/admin/settings');

      // Verify settings page
      await expect(page.locator('[data-testid="system-settings"]')).toBeVisible();
    });

    test('should update email settings', async ({ page }) => {
      await page.goto('/admin/settings');

      // Navigate to email settings
      await page.click('[data-testid="email-settings-tab"]');

      // Update settings
      await page.fill('[data-testid="smtp-host-input"]', 'smtp.sendgrid.net');
      await page.click('[data-testid="save-email-settings-button"]');

      // Verify success
      await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
    });

    test('should test email configuration', async ({ page }) => {
      await page.goto('/admin/settings');

      // Navigate to email settings
      await page.click('[data-testid="email-settings-tab"]');

      // Send test email
      await page.click('[data-testid="send-test-email-button"]');

      // Verify test result
      await expect(page.locator('[data-testid="test-email-result"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Access Control', () => {
    test('should deny access to non-admin users', async ({ page }) => {
      // Logout
      await page.click('[data-testid="logout-button"]');

      // Login as regular user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', testUsers.user.email);
      await page.fill('[data-testid="password-input"]', testUsers.user.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Try to access admin page
      await page.goto('/admin');

      // Verify access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should allow moderator limited access', async ({ page }) => {
      // Logout
      await page.click('[data-testid="logout-button"]');

      // Login as moderator
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', testUsers.moderator.email);
      await page.fill('[data-testid="password-input"]', testUsers.moderator.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Access admin page
      await page.goto('/admin');

      // Verify limited access (can view but not manage users)
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
      await page.goto('/admin/users');
      await expect(page.locator('[data-testid="no-edit-permissions"]')).toBeVisible();
    });
  });
});
