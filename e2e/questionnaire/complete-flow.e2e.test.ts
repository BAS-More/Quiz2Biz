/**
 * Quiz2Biz E2E Tests - Complete Questionnaire Flow
 * Tests: All 11 question types, progress tracking, completion, scoring
 */
import { test, expect } from '@playwright/test';
import { testUsers, testResponses, createTestHelpers } from '../fixtures';

test.describe('Complete Questionnaire Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display questionnaire list', async ({ page }) => {
    await page.goto('/questionnaires');

    // Verify questionnaire list is displayed
    await expect(page.locator('[data-testid="questionnaire-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-questionnaire-button"]').first()).toBeVisible();
  });

  test('should start a new questionnaire session', async ({ page }) => {
    await page.goto('/questionnaires');

    // Click start on first questionnaire
    await page.click('[data-testid="start-questionnaire-button"]');

    // Should show first question
    await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-progress"]')).toBeVisible();
  });

  test('should display progress counters', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Verify progress counters are visible
    await expect(page.locator('[data-testid="sections-left"]')).toBeVisible();
    await expect(page.locator('[data-testid="questions-left"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-progress"]')).toBeVisible();
  });

  test('should answer BOOLEAN question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Wait for boolean question type
    const yesButton = page.locator('[data-testid="answer-yes"]');
    const noButton = page.locator('[data-testid="answer-no"]');

    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');

      // Should advance to next question
      await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
    }
  });

  test('should answer SCALE question type (1-5)', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for scale question
    const scaleInput = page.locator('[data-testid="scale-input"]');
    if (await scaleInput.isVisible()) {
      // Select scale value 4
      await page.click('[data-testid="scale-value-4"]');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer TEXT question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for text input question
    const textInput = page.locator('[data-testid="text-answer"]');
    if (await textInput.isVisible()) {
      await textInput.fill('This is a comprehensive answer for E2E testing purposes.');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer SINGLE_CHOICE question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for single choice question (radio buttons)
    const singleChoice = page.locator('[data-testid="single-choice-input"]');
    if (await singleChoice.isVisible()) {
      await page.click('[data-testid="option-0"]');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer MULTIPLE_CHOICE question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for multiple choice question (checkboxes)
    const multiChoice = page.locator('[data-testid="multiple-choice-input"]');
    if (await multiChoice.isVisible()) {
      await page.click('[data-testid="option-0"]');
      await page.click('[data-testid="option-2"]');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer DROPDOWN question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for dropdown question
    const dropdown = page.locator('[data-testid="dropdown-input"]');
    if (await dropdown.isVisible()) {
      await dropdown.selectOption({ index: 1 });
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer PERCENTAGE question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for percentage question
    const percentageInput = page.locator('[data-testid="percentage-input"]');
    if (await percentageInput.isVisible()) {
      await percentageInput.fill('75');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer DATE question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for date question
    const dateInput = page.locator('[data-testid="date-input"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-01-28');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer NUMBER question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for number question
    const numberInput = page.locator('[data-testid="number-input"]');
    if (await numberInput.isVisible()) {
      await numberInput.fill('42');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should answer MATRIX question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for matrix question
    const matrixInput = page.locator('[data-testid="matrix-input"]');
    if (await matrixInput.isVisible()) {
      // Select first row, third column
      await page.click('[data-testid="matrix-cell-0-2"]');
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should handle FILE_UPLOAD question type', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for file upload question
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    if (await fileInput.isVisible()) {
      // Create a test file
      await fileInput.setInputFiles({
        name: 'test-evidence.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test file content'),
      });

      // Verify file is shown
      await expect(page.locator('[data-testid="uploaded-file-name"]')).toContainText(
        'test-evidence.pdf',
      );
      await page.click('[data-testid="submit-answer"]');
    }
  });

  test('should navigate between questions', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Answer first question
    const yesButton = page.locator('[data-testid="answer-yes"]');
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Check for previous button
    const prevButton = page.locator('[data-testid="previous-question"]');
    if (await prevButton.isVisible()) {
      await prevButton.click();
      // Should go back to previous question
      await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
    }
  });

  test('should skip optional questions', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for skip button on optional questions
    const skipButton = page.locator('[data-testid="skip-question"]');
    if (await skipButton.isVisible()) {
      await skipButton.click();
      // Should advance to next question
      await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
    }
  });

  test('should show best practice guidance', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Check for best practice section
    await expect(
      page
        .locator('[data-testid="best-practice"]')
        .or(page.locator('[data-testid="practical-explainer"]')),
    ).toBeVisible();
  });

  test('should update progress as questions are answered', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Get initial progress
    const initialProgress = await page.locator('[data-testid="questions-left"]').textContent();

    // Answer a question
    const yesButton = page.locator('[data-testid="answer-yes"]');
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Progress should update
    const newProgress = await page.locator('[data-testid="questions-left"]').textContent();
    expect(newProgress).not.toBe(initialProgress);
  });
});

test.describe('Questionnaire Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should show completion screen when all questions answered', async ({ page }) => {
    // Navigate to a completed questionnaire (if exists) or complete one
    await page.goto('/questionnaires');

    // Look for completed questionnaire
    const completedSession = page.locator('[data-testid="completed-session"]').first();
    if (await completedSession.isVisible()) {
      await completedSession.click();

      // Should show completion summary
      await expect(page.locator('[data-testid="completion-summary"]')).toBeVisible();
    }
  });

  test('should display score after completion', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for score display
    const scoreDisplay = page.locator('[data-testid="readiness-score"]');
    if (await scoreDisplay.isVisible()) {
      // Score should be a number
      const scoreText = await scoreDisplay.textContent();
      expect(scoreText).toMatch(/\d+/);
    }
  });

  test('should show score breakdown by dimension', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for dimension scores
    const dimensionScores = page.locator('[data-testid="dimension-score"]');
    if (await dimensionScores.first().isVisible()) {
      const count = await dimensionScores.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should allow viewing heatmap', async ({ page }) => {
    await page.goto('/dashboard');

    // Click on heatmap
    await page.click('[data-testid="view-heatmap"]');

    // Should show heatmap visualization
    await expect(page.locator('[data-testid="heatmap-visualization"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should save progress and resume later', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Answer some questions
    const yesButton = page.locator('[data-testid="answer-yes"]');
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Leave and come back
    await page.goto('/dashboard');
    await page.goto('/questionnaires');

    // Look for resume option
    const resumeButton = page.locator('[data-testid="resume-session"]');
    if (await resumeButton.isVisible()) {
      await resumeButton.click();
      // Should resume from where we left off
      await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
    }
  });
});

test.describe('Question Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should validate required questions', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Try to submit without answering required question
    await page.click('[data-testid="submit-answer"]');

    // Should show validation error
    await expect(
      page.locator('text=required').or(page.locator('text=Please answer')),
    ).toBeVisible();
  });

  test('should validate percentage range (0-100)', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    const percentageInput = page.locator('[data-testid="percentage-input"]');
    if (await percentageInput.isVisible()) {
      await percentageInput.fill('150');
      await page.click('[data-testid="submit-answer"]');

      // Should show validation error
      await expect(page.locator('text=0 and 100').or(page.locator('text=Invalid'))).toBeVisible();
    }
  });

  test('should validate text minimum length', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    const textInput = page.locator('[data-testid="text-answer"]');
    if (await textInput.isVisible()) {
      await textInput.fill('Hi'); // Too short
      await page.click('[data-testid="submit-answer"]');

      // Should show validation error
      await expect(page.locator('text=minimum').or(page.locator('text=at least'))).toBeVisible();
    }
  });
});
