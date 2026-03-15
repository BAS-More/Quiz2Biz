/**
 * Document Generation Flow E2E Tests
 * Tests the complete document generation and purchase flow
 */
import { test, expect, Page } from '@playwright/test';

// Helper to login before tests
async function loginUser(page: Page) {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill('test@quiz2biz.com');
  await page.getByLabel(/password/i).fill('Test@Password123!');
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await expect(page).toHaveURL(/dashboard|home/i, { timeout: 15000 });
}

// Helper to navigate to an existing project
async function navigateToProject(page: Page) {
  await page.goto('/dashboard');
  const projectCard = page.getByRole('button', { name: /continue|resume|view/i }).first()
    .or(page.getByRole('link', { name: /continue|resume|view/i }).first());

  if (await projectCard.isVisible()) {
    await projectCard.click();
    await expect(page).toHaveURL(/project|questionnaire|chat/i, { timeout: 10000 });
  }
}

test.describe('Document Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Document Menu', () => {
    test('should display available document types', async ({ page }) => {
      await navigateToProject(page);

      // Navigate to documents menu
      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Should see document type options
      await expect(
        page.getByText(/business plan|executive summary|financial|pitch deck/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test('should show pricing for document types', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Should see prices
      await expect(page.getByText(/\$\d+|\d+\.\d{2}/)).toBeVisible({ timeout: 10000 });
    });

    test('should show quality level options', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Click on a document type
      const documentCard = page.getByText(/business plan/i).first();
      if (await documentCard.isVisible()) {
        await documentCard.click();
      }

      // Should see quality level options
      await expect(
        page.getByText(/basic|standard|enhanced|premium|professional/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test('should indicate document availability based on facts', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Should show availability status or fact count requirement
      const availabilityIndicator = page.getByText(/available|not available|facts|more information/i);
      await expect(availabilityIndicator).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Document Selection', () => {
    test('should be able to select a document type', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Select a document type
      const documentCard = page.getByText(/business plan|executive summary/i).first();
      await documentCard.click();

      // Should show document details or quality selection
      await expect(
        page.getByText(/select|choose|quality|generate/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test('should be able to select quality level', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Select document and quality
      const documentCard = page.getByText(/business plan|executive summary/i).first();
      await documentCard.click();

      // Select a quality level
      const qualityOption = page.getByRole('radio', { name: /standard|enhanced/i })
        .or(page.getByRole('button', { name: /standard|enhanced/i }));

      if (await qualityOption.isVisible()) {
        await qualityOption.click();

        // Price should update
        await expect(page.getByText(/\$\d+|\d+\.\d{2}/)).toBeVisible();
      }
    });

    test('should show price calculation based on quality', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Navigate to document selection
      const documentCard = page.getByText(/business plan|executive summary/i).first();
      await documentCard.click();

      // Check for price breakdown
      const priceBreakdown = page.getByText(/base price|multiplier|total|final/i);
      // Price information should be visible somewhere
      await expect(page.getByText(/\$/)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Checkout Flow', () => {
    test('should display checkout button', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Look for checkout/purchase/generate button
      const checkoutButton = page.getByRole('button', { name: /checkout|purchase|buy|generate/i });
      await expect(checkoutButton).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to payment page on checkout', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|generate|download/i })
        .or(page.getByRole('button', { name: /documents|generate|download/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Select document and proceed to checkout
      const documentCard = page.getByText(/business plan|executive summary/i).first();
      await documentCard.click();

      const checkoutButton = page.getByRole('button', { name: /checkout|purchase|buy/i });
      if (await checkoutButton.isVisible()) {
        await checkoutButton.click();

        // Should navigate to payment or show Stripe checkout
        await expect(
          page.getByText(/payment|card|stripe|checkout/i)
            .or(page.frameLocator('iframe').getByText(/payment/i))
        ).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe('Generated Documents', () => {
    test('should display list of purchased documents', async ({ page }) => {
      await navigateToProject(page);

      // Navigate to documents section
      const documentsLink = page.getByRole('link', { name: /documents|my documents|downloads/i })
        .or(page.getByRole('button', { name: /documents|my documents|downloads/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Should show document list or empty state
      const docList = page.getByText(/generated|purchased|download|no documents/i);
      await expect(docList).toBeVisible({ timeout: 10000 });
    });

    test('should have download button for generated documents', async ({ page }) => {
      await navigateToProject(page);

      const documentsLink = page.getByRole('link', { name: /documents|my documents|downloads/i })
        .or(page.getByRole('button', { name: /documents|my documents|downloads/i }));

      if (await documentsLink.isVisible()) {
        await documentsLink.click();
      }

      // Look for download buttons
      const downloadButton = page.getByRole('button', { name: /download|pdf|docx/i })
        .or(page.getByRole('link', { name: /download|pdf|docx/i }));

      // Document list or download button should be visible
      await expect(
        downloadButton.or(page.getByText(/no documents|generate/i))
      ).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('Document Preview', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display document preview', async ({ page }) => {
    await navigateToProject(page);

    const documentsLink = page.getByRole('link', { name: /documents|my documents/i })
      .or(page.getByRole('button', { name: /documents|my documents/i }));

    if (await documentsLink.isVisible()) {
      await documentsLink.click();
    }

    // Find preview button
    const previewButton = page.getByRole('button', { name: /preview|view/i });

    if (await previewButton.isVisible()) {
      await previewButton.click();

      // Should show document preview modal or page
      const preview = page.getByRole('dialog')
        .or(page.getByText(/preview/i));
      await expect(preview).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Document Formats', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should offer multiple download formats (PDF, DOCX)', async ({ page }) => {
    await navigateToProject(page);

    const documentsLink = page.getByRole('link', { name: /documents|my documents/i })
      .or(page.getByRole('button', { name: /documents|my documents/i }));

    if (await documentsLink.isVisible()) {
      await documentsLink.click();
    }

    // Look for format options
    const formatOptions = page.getByText(/pdf|docx|word/i);
    await expect(formatOptions).toBeVisible({ timeout: 10000 });
  });
});
