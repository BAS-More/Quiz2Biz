/**
 * Quiz2Biz E2E Tests - Document Generation Flow
 * Tests: Technology Roadmap, Business Plan, Policy Pack, Full Deliverables ZIP
 */
import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Document Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Technology Roadmap Generation', () => {
    test('should display document generation page', async ({ page }) => {
      await page.goto('/documents');

      // Verify documents page is displayed
      await expect(page.locator('[data-testid="documents-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="generate-document-button"]')).toBeVisible();
    });

    test('should show available document templates', async ({ page }) => {
      await page.goto('/documents');

      // Verify document templates are displayed
      await expect(page.locator('[data-testid="template-technology-roadmap"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-business-plan"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-policy-pack"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-architecture-dossier"]')).toBeVisible();
    });

    test('should generate Technology Roadmap document', async ({ page }) => {
      await page.goto('/documents');

      // Select Technology Roadmap template
      await page.click('[data-testid="template-technology-roadmap"]');

      // Configure generation options
      await page.click('[data-testid="include-diagrams-checkbox"]');
      await page.click('[data-testid="include-timeline-checkbox"]');

      // Start generation
      await page.click('[data-testid="generate-document-button"]');

      // Wait for generation to complete
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Verify download button is available
      await expect(page.locator('[data-testid="download-document-button"]')).toBeVisible();
    });

    test('should download generated Technology Roadmap', async ({ page }) => {
      await page.goto('/documents');

      // Select and generate Technology Roadmap
      await page.click('[data-testid="template-technology-roadmap"]');
      await page.click('[data-testid="generate-document-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Setup download handler
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-document-button"]');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toContain('technology-roadmap');
      expect(download.suggestedFilename()).toMatch(/\.(md|pdf|docx)$/);
    });
  });

  test.describe('Business Plan Generation', () => {
    test('should generate Business Plan document', async ({ page }) => {
      await page.goto('/documents');

      // Select Business Plan template
      await page.click('[data-testid="template-business-plan"]');

      // Configure generation options
      await page.selectOption('[data-testid="format-select"]', 'pdf');
      await page.click('[data-testid="include-financial-projections-checkbox"]');

      // Start generation
      await page.click('[data-testid="generate-document-button"]');

      // Wait for generation to complete
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });
    });

    test('should include financial projections in Business Plan', async ({ page }) => {
      await page.goto('/documents');

      // Select Business Plan template
      await page.click('[data-testid="template-business-plan"]');
      await page.click('[data-testid="include-financial-projections-checkbox"]');
      await page.click('[data-testid="generate-document-button"]');

      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Preview document should include financial section
      await page.click('[data-testid="preview-document-button"]');
      await expect(page.locator('[data-testid="document-preview"]')).toContainText('Financial');
    });

    test('should select different output formats', async ({ page }) => {
      await page.goto('/documents');

      // Select Business Plan template
      await page.click('[data-testid="template-business-plan"]');

      // Test format selection
      const formatSelect = page.locator('[data-testid="format-select"]');
      await expect(formatSelect).toBeVisible();

      // Verify available formats
      const options = await formatSelect.locator('option').allTextContents();
      expect(options).toContain('Markdown');
      expect(options).toContain('PDF');
      expect(options).toContain('DOCX');
    });
  });

  test.describe('Policy Pack Generation', () => {
    test('should generate Policy Pack with all policies', async ({ page }) => {
      await page.goto('/documents');

      // Select Policy Pack template
      await page.click('[data-testid="template-policy-pack"]');

      // Select all policies
      await page.click('[data-testid="select-all-policies-checkbox"]');

      // Start generation
      await page.click('[data-testid="generate-document-button"]');

      // Wait for generation to complete
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 60000,
      });
    });

    test('should select individual policies for generation', async ({ page }) => {
      await page.goto('/documents');

      // Select Policy Pack template
      await page.click('[data-testid="template-policy-pack"]');

      // Select specific policies
      await page.click('[data-testid="policy-security"]');
      await page.click('[data-testid="policy-privacy"]');
      await page.click('[data-testid="policy-access-control"]');

      // Verify selection count
      await expect(page.locator('[data-testid="selected-count"]')).toContainText(
        '3 policies selected',
      );

      // Generate
      await page.click('[data-testid="generate-document-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });
    });

    test('should include control mappings in Policy Pack', async ({ page }) => {
      await page.goto('/documents');

      // Select Policy Pack template
      await page.click('[data-testid="template-policy-pack"]');
      await page.click('[data-testid="policy-security"]');
      await page.click('[data-testid="include-control-mappings-checkbox"]');
      await page.click('[data-testid="generate-document-button"]');

      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Preview should include control mappings
      await page.click('[data-testid="preview-document-button"]');
      await expect(page.locator('[data-testid="document-preview"]')).toContainText('ISO 27001');
      await expect(page.locator('[data-testid="document-preview"]')).toContainText('NIST');
    });
  });

  test.describe('Full Deliverables ZIP', () => {
    test('should generate full deliverables package', async ({ page }) => {
      await page.goto('/documents');

      // Select Full Deliverables option
      await page.click('[data-testid="generate-full-deliverables-button"]');

      // Verify confirmation dialog
      await expect(page.locator('[data-testid="deliverables-confirmation-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="deliverables-confirmation-dialog"]')).toContainText(
        'Generate all documents',
      );

      // Confirm generation
      await page.click('[data-testid="confirm-generate-button"]');

      // Wait for generation (longer timeout for full package)
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 120000,
      });
    });

    test('should download full deliverables as ZIP', async ({ page }) => {
      await page.goto('/documents');

      // Generate full deliverables
      await page.click('[data-testid="generate-full-deliverables-button"]');
      await page.click('[data-testid="confirm-generate-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 120000,
      });

      // Download ZIP
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-zip-button"]');
      const download = await downloadPromise;

      // Verify ZIP download
      expect(download.suggestedFilename()).toContain('deliverables');
      expect(download.suggestedFilename()).toMatch(/\.zip$/);
    });

    test('should show deliverables contents before download', async ({ page }) => {
      await page.goto('/documents');

      // Generate full deliverables
      await page.click('[data-testid="generate-full-deliverables-button"]');
      await page.click('[data-testid="confirm-generate-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 120000,
      });

      // View contents
      await page.click('[data-testid="view-contents-button"]');

      // Verify contents list
      await expect(page.locator('[data-testid="contents-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="contents-list"]')).toContainText(
        'Technology Roadmap',
      );
      await expect(page.locator('[data-testid="contents-list"]')).toContainText('Business Plan');
      await expect(page.locator('[data-testid="contents-list"]')).toContainText('Policy Pack');
      await expect(page.locator('[data-testid="contents-list"]')).toContainText(
        'Architecture Dossier',
      );
    });

    test('should customize deliverables package contents', async ({ page }) => {
      await page.goto('/documents');

      // Open custom deliverables dialog
      await page.click('[data-testid="generate-full-deliverables-button"]');
      await page.click('[data-testid="customize-contents-button"]');

      // Deselect some documents
      await page.click('[data-testid="include-architecture-dossier"]');
      await page.click('[data-testid="include-test-strategy"]');

      // Verify selection
      await expect(page.locator('[data-testid="documents-selected-count"]')).toBeVisible();

      // Generate custom package
      await page.click('[data-testid="confirm-generate-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 120000,
      });
    });
  });

  test.describe('Document Preview', () => {
    test('should preview document before download', async ({ page }) => {
      await page.goto('/documents');

      // Generate a document
      await page.click('[data-testid="template-technology-roadmap"]');
      await page.click('[data-testid="generate-document-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Open preview
      await page.click('[data-testid="preview-document-button"]');

      // Verify preview is displayed
      await expect(page.locator('[data-testid="document-preview-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="document-preview-content"]')).toBeVisible();
    });

    test('should navigate through multi-page preview', async ({ page }) => {
      await page.goto('/documents');

      // Generate a document
      await page.click('[data-testid="template-business-plan"]');
      await page.click('[data-testid="generate-document-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Open preview
      await page.click('[data-testid="preview-document-button"]');

      // Check pagination controls
      await expect(page.locator('[data-testid="preview-page-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-page-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="prev-page-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Page 1');

      // Navigate to next page
      await page.click('[data-testid="next-page-button"]');
      await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Page 2');
    });

    test('should close preview modal', async ({ page }) => {
      await page.goto('/documents');

      // Generate a document
      await page.click('[data-testid="template-technology-roadmap"]');
      await page.click('[data-testid="generate-document-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Open preview
      await page.click('[data-testid="preview-document-button"]');
      await expect(page.locator('[data-testid="document-preview-modal"]')).toBeVisible();

      // Close preview
      await page.click('[data-testid="close-preview-button"]');
      await expect(page.locator('[data-testid="document-preview-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Generation History', () => {
    test('should display generation history', async ({ page }) => {
      await page.goto('/documents');

      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');

      // Verify history list is displayed
      await expect(page.locator('[data-testid="generation-history-list"]')).toBeVisible();
    });

    test('should re-download previously generated document', async ({ page }) => {
      await page.goto('/documents');

      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');

      // Find a previous generation
      const historyItem = page.locator('[data-testid="history-item"]').first();
      await expect(historyItem).toBeVisible();

      // Click download
      const downloadPromise = page.waitForEvent('download');
      await historyItem.locator('[data-testid="re-download-button"]').click();
      await downloadPromise;
    });

    test('should filter generation history by document type', async ({ page }) => {
      await page.goto('/documents');

      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');

      // Apply filter
      await page.selectOption('[data-testid="history-filter-type"]', 'technology-roadmap');

      // Verify filtered results
      const historyItems = page.locator('[data-testid="history-item"]');
      const count = await historyItems.count();

      for (let i = 0; i < count; i++) {
        await expect(historyItems.nth(i)).toContainText('Technology Roadmap');
      }
    });

    test('should delete generation history item', async ({ page }) => {
      await page.goto('/documents');

      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');

      // Get initial count
      const initialCount = await page.locator('[data-testid="history-item"]').count();

      // Delete first item
      await page
        .locator('[data-testid="history-item"]')
        .first()
        .locator('[data-testid="delete-history-button"]')
        .click();

      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');

      // Verify count decreased
      await expect(page.locator('[data-testid="history-item"]')).toHaveCount(initialCount - 1);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when generation fails', async ({ page }) => {
      await page.goto('/documents');

      // Try to generate without required data
      await page.click('[data-testid="template-technology-roadmap"]');

      // Simulate API error by navigating to invalid session
      await page.evaluate(() => {
        localStorage.setItem('forceGenerationError', 'true');
      });

      await page.click('[data-testid="generate-document-button"]');

      // Verify error message is displayed
      await expect(page.locator('[data-testid="generation-error"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('[data-testid="generation-error"]')).toContainText(
        'Failed to generate',
      );
    });

    test('should allow retry after generation failure', async ({ page }) => {
      await page.goto('/documents');

      // Generate a document (assuming previous error is cleared)
      await page.click('[data-testid="template-technology-roadmap"]');
      await page.click('[data-testid="generate-document-button"]');

      // If error occurs, retry button should be available
      const errorElement = page.locator('[data-testid="generation-error"]');
      if (await errorElement.isVisible({ timeout: 5000 })) {
        await expect(page.locator('[data-testid="retry-generation-button"]')).toBeVisible();
        await page.click('[data-testid="retry-generation-button"]');
      }
    });

    test('should validate required questionnaire completion', async ({ page }) => {
      await page.goto('/documents');

      // Select a template that requires completed questionnaire
      await page.click('[data-testid="template-policy-pack"]');

      // Check if warning is displayed for incomplete questionnaire
      const warning = page.locator('[data-testid="questionnaire-incomplete-warning"]');
      if (await warning.isVisible({ timeout: 2000 })) {
        await expect(warning).toContainText('complete the questionnaire');
      }
    });
  });

  test.describe('Template Customization', () => {
    test('should customize document title', async ({ page }) => {
      await page.goto('/documents');

      // Select template
      await page.click('[data-testid="template-technology-roadmap"]');

      // Customize title
      await page.fill('[data-testid="document-title-input"]', 'Custom Technology Roadmap 2026');

      // Generate
      await page.click('[data-testid="generate-document-button"]');
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({
        timeout: 30000,
      });

      // Preview should show custom title
      await page.click('[data-testid="preview-document-button"]');
      await expect(page.locator('[data-testid="document-preview-content"]')).toContainText(
        'Custom Technology Roadmap 2026',
      );
    });

    test('should add custom sections to document', async ({ page }) => {
      await page.goto('/documents');

      // Select template
      await page.click('[data-testid="template-technology-roadmap"]');

      // Add custom section
      await page.click('[data-testid="add-custom-section-button"]');
      await page.fill('[data-testid="custom-section-title"]', 'Executive Summary');
      await page.fill(
        '[data-testid="custom-section-content"]',
        'This is the executive summary for 2026.',
      );
      await page.click('[data-testid="save-custom-section-button"]');

      // Verify section is added
      await expect(page.locator('[data-testid="custom-sections-list"]')).toContainText(
        'Executive Summary',
      );
    });

    test('should select document branding options', async ({ page }) => {
      await page.goto('/documents');

      // Select template
      await page.click('[data-testid="template-business-plan"]');

      // Open branding options
      await page.click('[data-testid="branding-options-button"]');

      // Select company logo
      const fileInput = page.locator('[data-testid="logo-upload-input"]');
      await expect(fileInput).toBeAttached();

      // Select color scheme
      await page.click('[data-testid="color-scheme-professional"]');

      // Close branding options
      await page.click('[data-testid="save-branding-button"]');
    });
  });
});
