/**
 * Quiz2Biz E2E Tests - Payment Flow
 * Tests: Upgrade flow, Stripe integration, subscription management, invoices
 */
import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures';

// Stripe test card numbers
const STRIPE_TEST_CARDS = {
  visa: '4242424242424242',
  visaDebit: '4000056655665556',
  mastercard: '5555555555554444',
  amex: '378282246310005',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  expiredCard: '4000000000000069',
  processingError: '4000000000000119',
  requiresAuth: '4000002500003155',
};

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Billing Page', () => {
    test('should display current subscription status', async ({ page }) => {
      await page.goto('/billing');

      // Verify billing page is displayed
      await expect(page.locator('[data-testid="billing-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-name"]')).toBeVisible();
    });

    test('should show subscription details for paid users', async ({ page }) => {
      await page.goto('/billing');

      // Check if user has active subscription
      const planName = page.locator('[data-testid="plan-name"]');
      const planText = await planName.textContent();

      if (planText !== 'Free') {
        await expect(page.locator('[data-testid="billing-cycle"]')).toBeVisible();
        await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible();
        await expect(page.locator('[data-testid="payment-method"]')).toBeVisible();
      }
    });

    test('should display upgrade options for free users', async ({ page }) => {
      await page.goto('/billing');

      // Verify upgrade options
      await expect(page.locator('[data-testid="upgrade-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-professional"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-enterprise"]')).toBeVisible();
    });
  });

  test.describe('Upgrade Flow', () => {
    test('should display pricing page with all tiers', async ({ page }) => {
      await page.goto('/pricing');

      // Verify pricing tiers
      await expect(page.locator('[data-testid="pricing-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="tier-free"]')).toBeVisible();
      await expect(page.locator('[data-testid="tier-professional"]')).toBeVisible();
      await expect(page.locator('[data-testid="tier-enterprise"]')).toBeVisible();
    });

    test('should show feature comparison table', async ({ page }) => {
      await page.goto('/pricing');

      // Verify feature comparison
      await expect(page.locator('[data-testid="feature-comparison-table"]')).toBeVisible();

      // Check key features are listed
      await expect(page.locator('[data-testid="feature-questionnaires"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-document-generation"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-team-members"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-support"]')).toBeVisible();
    });

    test('should initiate upgrade to Professional plan', async ({ page }) => {
      await page.goto('/pricing');

      // Click upgrade on Professional plan
      await page.click('[data-testid="upgrade-professional-button"]');

      // Verify redirect to checkout
      await expect(page).toHaveURL(/\/checkout/);
      await expect(page.locator('[data-testid="checkout-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="selected-plan"]')).toContainText('Professional');
    });

    test('should toggle between monthly and yearly billing', async ({ page }) => {
      await page.goto('/pricing');

      // Get monthly price
      const monthlyPrice = await page
        .locator('[data-testid="professional-price-monthly"]')
        .textContent();

      // Toggle to yearly
      await page.click('[data-testid="billing-toggle-yearly"]');

      // Verify yearly price is different (should be discounted)
      const yearlyPrice = await page
        .locator('[data-testid="professional-price-yearly"]')
        .textContent();
      expect(monthlyPrice).not.toBe(yearlyPrice);
    });
  });

  test.describe('Checkout Process', () => {
    test('should display Stripe payment form', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Verify Stripe elements are loaded
      await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('[data-testid="billing-address-form"]')).toBeVisible();
    });

    test('should complete payment with test card', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Wait for Stripe to load
      await page.waitForSelector('[data-testid="stripe-card-element"]', { timeout: 10000 });

      // Fill Stripe card element (using iframe)
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();

      // Fill card number
      await stripeFrame.locator('[name="cardnumber"]').fill(STRIPE_TEST_CARDS.visa);
      await stripeFrame.locator('[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('[name="cvc"]').fill('123');
      await stripeFrame.locator('[name="postal"]').fill('12345');

      // Fill billing address
      await page.fill('[data-testid="billing-name"]', 'Test User');
      await page.fill('[data-testid="billing-email"]', testUsers.user.email);
      await page.fill('[data-testid="billing-address"]', '123 Test Street');
      await page.fill('[data-testid="billing-city"]', 'Test City');
      await page.selectOption('[data-testid="billing-country"]', 'US');
      await page.fill('[data-testid="billing-zip"]', '12345');

      // Submit payment
      await page.click('[data-testid="submit-payment-button"]');

      // Wait for payment processing
      await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();

      // Verify success (may redirect to success page)
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 30000 });
    });

    test('should handle declined card gracefully', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Wait for Stripe to load
      await page.waitForSelector('[data-testid="stripe-card-element"]', { timeout: 10000 });

      // Fill with declined card
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await stripeFrame.locator('[name="cardnumber"]').fill(STRIPE_TEST_CARDS.declined);
      await stripeFrame.locator('[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('[name="cvc"]').fill('123');
      await stripeFrame.locator('[name="postal"]').fill('12345');

      // Fill billing address
      await page.fill('[data-testid="billing-name"]', 'Test User');

      // Submit payment
      await page.click('[data-testid="submit-payment-button"]');

      // Verify error message
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined');
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Submit without filling form
      await page.click('[data-testid="submit-payment-button"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="name-required-error"]')).toBeVisible();
    });

    test('should apply coupon code', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Enter coupon code
      await page.fill('[data-testid="coupon-input"]', 'TESTDISCOUNT');
      await page.click('[data-testid="apply-coupon-button"]');

      // Verify discount applied
      await expect(page.locator('[data-testid="discount-applied"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="discounted-total"]')).toBeVisible();
    });

    test('should handle invalid coupon code', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Enter invalid coupon
      await page.fill('[data-testid="coupon-input"]', 'INVALIDCODE');
      await page.click('[data-testid="apply-coupon-button"]');

      // Verify error
      await expect(page.locator('[data-testid="coupon-error"]')).toBeVisible();
    });
  });

  test.describe('Subscription Management', () => {
    test('should display manage subscription options', async ({ page }) => {
      await page.goto('/billing');

      // Check if user has active subscription
      const manageButton = page.locator('[data-testid="manage-subscription-button"]');
      if (await manageButton.isVisible()) {
        await manageButton.click();

        // Verify management options
        await expect(page.locator('[data-testid="subscription-management"]')).toBeVisible();
        await expect(page.locator('[data-testid="change-plan-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="update-payment-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="cancel-subscription-button"]')).toBeVisible();
      }
    });

    test('should update payment method', async ({ page }) => {
      await page.goto('/billing');

      const updateButton = page.locator('[data-testid="update-payment-button"]');
      if (await updateButton.isVisible()) {
        await updateButton.click();

        // Verify update form
        await expect(page.locator('[data-testid="update-payment-form"]')).toBeVisible();

        // Fill new card details
        const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
        await stripeFrame.locator('[name="cardnumber"]').fill(STRIPE_TEST_CARDS.mastercard);
        await stripeFrame.locator('[name="exp-date"]').fill('12/30');
        await stripeFrame.locator('[name="cvc"]').fill('123');

        // Save
        await page.click('[data-testid="save-payment-method-button"]');

        // Verify success
        await expect(page.locator('[data-testid="payment-method-updated"]')).toBeVisible({
          timeout: 10000,
        });
      }
    });

    test('should change billing cycle', async ({ page }) => {
      await page.goto('/billing');

      const changeButton = page.locator('[data-testid="change-billing-cycle-button"]');
      if (await changeButton.isVisible()) {
        await changeButton.click();

        // Select new billing cycle
        await page.click('[data-testid="billing-cycle-yearly"]');
        await page.click('[data-testid="confirm-change-button"]');

        // Verify confirmation
        await expect(page.locator('[data-testid="billing-cycle-changed"]')).toBeVisible();
      }
    });

    test('should cancel subscription with confirmation', async ({ page }) => {
      await page.goto('/billing');

      const cancelButton = page.locator('[data-testid="cancel-subscription-button"]');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Verify confirmation dialog
        await expect(page.locator('[data-testid="cancel-confirmation-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="cancel-confirmation-dialog"]')).toContainText(
          'Are you sure',
        );

        // Select cancellation reason
        await page.selectOption('[data-testid="cancellation-reason"]', 'too_expensive');

        // Confirm cancellation
        await page.click('[data-testid="confirm-cancel-button"]');

        // Verify cancellation scheduled
        await expect(page.locator('[data-testid="cancellation-scheduled"]')).toBeVisible();
      }
    });

    test('should show downgrade options', async ({ page }) => {
      await page.goto('/billing');

      const changeButton = page.locator('[data-testid="change-plan-button"]');
      if (await changeButton.isVisible()) {
        await changeButton.click();

        // Verify plan options
        await expect(page.locator('[data-testid="plan-selection"]')).toBeVisible();

        // Check downgrade warning
        await page.click('[data-testid="select-free-plan"]');
        await expect(page.locator('[data-testid="downgrade-warning"]')).toBeVisible();
      }
    });
  });

  test.describe('Invoice History', () => {
    test('should display invoice history', async ({ page }) => {
      await page.goto('/billing/invoices');

      // Verify invoices page
      await expect(page.locator('[data-testid="invoices-page"]')).toBeVisible();
    });

    test('should download invoice PDF', async ({ page }) => {
      await page.goto('/billing/invoices');

      const invoiceRow = page.locator('[data-testid="invoice-row"]').first();
      if (await invoiceRow.isVisible()) {
        // Setup download handler
        const downloadPromise = page.waitForEvent('download');
        await invoiceRow.locator('[data-testid="download-invoice-button"]').click();
        const download = await downloadPromise;

        // Verify download
        expect(download.suggestedFilename()).toContain('invoice');
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      }
    });

    test('should filter invoices by date', async ({ page }) => {
      await page.goto('/billing/invoices');

      // Set date filter
      await page.fill('[data-testid="invoice-date-from"]', '2026-01-01');
      await page.fill('[data-testid="invoice-date-to"]', '2026-12-31');
      await page.click('[data-testid="apply-filter-button"]');

      // Verify filter applied
      await expect(page.locator('[data-testid="filter-applied"]')).toBeVisible();
    });

    test('should view invoice details', async ({ page }) => {
      await page.goto('/billing/invoices');

      const invoiceRow = page.locator('[data-testid="invoice-row"]').first();
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click();

        // Verify invoice details
        await expect(page.locator('[data-testid="invoice-details"]')).toBeVisible();
        await expect(page.locator('[data-testid="invoice-number"]')).toBeVisible();
        await expect(page.locator('[data-testid="invoice-date"]')).toBeVisible();
        await expect(page.locator('[data-testid="invoice-amount"]')).toBeVisible();
        await expect(page.locator('[data-testid="invoice-status"]')).toBeVisible();
      }
    });
  });

  test.describe('Feature Gating', () => {
    test('should show upgrade prompt for premium features on free plan', async ({ page }) => {
      await page.goto('/dashboard');

      // Try to access premium feature
      await page.click('[data-testid="generate-policy-pack-button"]');

      // Verify upgrade prompt
      await expect(page.locator('[data-testid="upgrade-required-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-required-modal"]')).toContainText(
        'Professional',
      );
    });

    test('should allow access to features based on subscription tier', async ({ page }) => {
      await page.goto('/dashboard');

      // Check available features based on current plan
      const planName = await page.locator('[data-testid="current-plan-name"]').textContent();

      if (planName === 'Free') {
        // Verify free tier limitations
        await expect(page.locator('[data-testid="questionnaire-limit"]')).toContainText('3');
      } else if (planName === 'Professional') {
        // Verify professional tier access
        await expect(page.locator('[data-testid="questionnaire-limit"]')).toContainText(
          'Unlimited',
        );
      }
    });

    test('should show usage limits for current plan', async ({ page }) => {
      await page.goto('/billing');

      // Verify usage display
      await expect(page.locator('[data-testid="usage-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="questionnaires-used"]')).toBeVisible();
      await expect(page.locator('[data-testid="documents-generated"]')).toBeVisible();
    });
  });

  test.describe('Enterprise Contact', () => {
    test('should display enterprise contact form', async ({ page }) => {
      await page.goto('/pricing');

      // Click on Enterprise contact
      await page.click('[data-testid="enterprise-contact-button"]');

      // Verify contact form
      await expect(page.locator('[data-testid="enterprise-contact-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-size-select"]')).toBeVisible();
    });

    test('should submit enterprise inquiry', async ({ page }) => {
      await page.goto('/pricing');

      // Click on Enterprise contact
      await page.click('[data-testid="enterprise-contact-button"]');

      // Fill form
      await page.fill('[data-testid="company-name-input"]', 'Test Enterprise Corp');
      await page.selectOption('[data-testid="company-size-select"]', '500+');
      await page.fill('[data-testid="contact-email-input"]', 'enterprise@test.com');
      await page.fill('[data-testid="contact-message-input"]', 'Interested in enterprise pricing');

      // Submit
      await page.click('[data-testid="submit-inquiry-button"]');

      // Verify success
      await expect(page.locator('[data-testid="inquiry-submitted"]')).toBeVisible();
    });
  });

  test.describe('Payment Error Recovery', () => {
    test('should handle payment failure and allow retry', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Wait for Stripe to load
      await page.waitForSelector('[data-testid="stripe-card-element"]', { timeout: 10000 });

      // Fill with insufficient funds card
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await stripeFrame.locator('[name="cardnumber"]').fill(STRIPE_TEST_CARDS.insufficientFunds);
      await stripeFrame.locator('[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('[name="cvc"]').fill('123');
      await stripeFrame.locator('[name="postal"]').fill('12345');

      // Fill billing address
      await page.fill('[data-testid="billing-name"]', 'Test User');

      // Submit payment
      await page.click('[data-testid="submit-payment-button"]');

      // Verify error and retry option
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="retry-payment-button"]')).toBeVisible();
    });

    test('should handle 3D Secure authentication', async ({ page }) => {
      await page.goto('/checkout?plan=professional');

      // Wait for Stripe to load
      await page.waitForSelector('[data-testid="stripe-card-element"]', { timeout: 10000 });

      // Fill with 3D Secure required card
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      await stripeFrame.locator('[name="cardnumber"]').fill(STRIPE_TEST_CARDS.requiresAuth);
      await stripeFrame.locator('[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('[name="cvc"]').fill('123');
      await stripeFrame.locator('[name="postal"]').fill('12345');

      // Fill billing address
      await page.fill('[data-testid="billing-name"]', 'Test User');

      // Submit payment
      await page.click('[data-testid="submit-payment-button"]');

      // Verify 3D Secure modal appears (Stripe handles this)
      // Note: In test mode, this should auto-complete
      await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
    });
  });
});
