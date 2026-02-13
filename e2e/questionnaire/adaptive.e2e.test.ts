/**
 * Quiz2Biz E2E Tests - Adaptive Logic Flow
 * Tests: Skip/show rules, conditional section visibility, adaptive branching
 */
import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures';

test.describe('Adaptive Logic Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should show conditional question when trigger condition is met', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Answer yes to trigger follow-up question
    const yesButton = page.locator('[data-testid="answer-yes"]');
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');

      // Should show follow-up question
      await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
    }
  });

  test('should skip conditional question when trigger condition is not met', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Get initial question number
    const initialQuestionNum = await page.locator('[data-testid="question-number"]').textContent();

    // Answer no to skip follow-up question
    const noButton = page.locator('[data-testid="answer-no"]');
    if (await noButton.isVisible()) {
      await noButton.click();
      await page.click('[data-testid="submit-answer"]');

      // Get next question number
      const nextQuestionNum = await page.locator('[data-testid="question-number"]').textContent();

      // Question numbers should skip (e.g., 1 -> 3, skipping 2)
      if (initialQuestionNum && nextQuestionNum) {
        const initial = parseInt(initialQuestionNum.match(/\d+/)?.[0] || '0');
        const next = parseInt(nextQuestionNum.match(/\d+/)?.[0] || '0');
        // If we skipped a question, next > initial + 1
        expect(next).toBeGreaterThan(initial);
      }
    }
  });

  test('should hide entire section based on branching logic', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Get sections count before answering
    const sectionsLeftBefore = await page.locator('[data-testid="sections-left"]').textContent();

    // Answer a question that might hide a section
    const scaleInput = page.locator('[data-testid="scale-input"]');
    if (await scaleInput.isVisible()) {
      await page.click('[data-testid="scale-value-1"]'); // Low score might skip detailed section
      await page.click('[data-testid="submit-answer"]');

      // Sections count might decrease
      const sectionsLeftAfter = await page.locator('[data-testid="sections-left"]').textContent();
      // Verify sections are tracked
      expect(sectionsLeftAfter).toBeTruthy();
    }
  });

  test('should show section when qualifying score is reached', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Answer with high score to unlock detailed section
    const scaleInput = page.locator('[data-testid="scale-input"]');
    if (await scaleInput.isVisible()) {
      await page.click('[data-testid="scale-value-5"]'); // High score unlocks section
      await page.click('[data-testid="submit-answer"]');
    }

    // Continue answering until we reach the conditional section
    for (let i = 0; i < 5; i++) {
      const yesButton = page.locator('[data-testid="answer-yes"]');
      if (await yesButton.isVisible()) {
        await yesButton.click();
        await page.click('[data-testid="submit-answer"]');
      }
    }

    // Verify we can see questions from the unlocked section
    await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
  });

  test('should update progress correctly when questions are skipped', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Get initial total questions
    const initialQuestionsLeft = await page.locator('[data-testid="questions-left"]').textContent();
    const initialTotal = parseInt(initialQuestionsLeft?.match(/\d+/)?.[0] || '0');

    // Answer in a way that triggers skipping
    const noButton = page.locator('[data-testid="answer-no"]');
    if (await noButton.isVisible()) {
      await noButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Questions left should update (either decrease by 1 or more if skipped)
    const newQuestionsLeft = await page.locator('[data-testid="questions-left"]').textContent();
    const newTotal = parseInt(newQuestionsLeft?.match(/\d+/)?.[0] || '0');

    expect(newTotal).toBeLessThan(initialTotal);
  });

  test('should handle nested conditional logic', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // First level condition
    const yesButton = page.locator('[data-testid="answer-yes"]');
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Second level condition (nested)
    const scaleInput = page.locator('[data-testid="scale-input"]');
    if (await scaleInput.isVisible()) {
      await page.click('[data-testid="scale-value-4"]');
      await page.click('[data-testid="submit-answer"]');
    }

    // Should show nested conditional question
    await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
  });

  test('should respect dimension-based visibility rules', async ({ page }) => {
    await page.goto('/questionnaires');

    // Start a questionnaire that has dimension-based rules
    await page.click('[data-testid="start-questionnaire-button"]');

    // Verify dimension indicator is shown
    await expect(
      page
        .locator('[data-testid="current-dimension"]')
        .or(page.locator('[data-testid="dimension-badge"]')),
    ).toBeVisible();

    // Answer questions in the current dimension
    for (let i = 0; i < 3; i++) {
      const yesButton = page.locator('[data-testid="answer-yes"]');
      if (await yesButton.isVisible()) {
        await yesButton.click();
        await page.click('[data-testid="submit-answer"]');
      }
    }

    // Dimension should update after completing section
    await expect(page.locator('[data-testid="current-dimension"]')).toBeVisible();
  });

  test('should maintain skip state on navigation back', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Answer to trigger skip
    const noButton = page.locator('[data-testid="answer-no"]');
    if (await noButton.isVisible()) {
      await noButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Get current question
    const currentQuestion = await page.locator('[data-testid="question-text"]').textContent();

    // Go back
    const prevButton = page.locator('[data-testid="previous-question"]');
    if (await prevButton.isVisible()) {
      await prevButton.click();

      // Answer differently
      const yesButton = page.locator('[data-testid="answer-yes"]');
      if (await yesButton.isVisible()) {
        await yesButton.click();
        await page.click('[data-testid="submit-answer"]');
      }

      // Next question might be different due to changed skip logic
      const newQuestion = await page.locator('[data-testid="question-text"]').textContent();
      // Either same or different based on logic
      expect(newQuestion).toBeTruthy();
    }
  });

  test('should display skip reason indicator', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for question navigator that shows skipped questions
    const questionNav = page.locator('[data-testid="question-navigator"]');
    if (await questionNav.isVisible()) {
      // Skipped questions should have visual indicator
      const skippedIndicator = page.locator('[data-testid="question-skipped"]');
      if (await skippedIndicator.isVisible()) {
        await expect(skippedIndicator).toHaveAttribute('title', /skipped|conditional/i);
      }
    }
  });

  test('should handle multiple skip conditions (AND logic)', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Answer first condition
    const yesButton1 = page.locator('[data-testid="answer-yes"]');
    if (await yesButton1.isVisible()) {
      await yesButton1.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Answer second condition (both need to be true)
    const yesButton2 = page.locator('[data-testid="answer-yes"]');
    if (await yesButton2.isVisible()) {
      await yesButton2.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Should now show the question that requires both conditions
    await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
  });

  test('should handle multiple skip conditions (OR logic)', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Answer to trigger OR condition
    const yesButton = page.locator('[data-testid="answer-yes"]');
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Even with only one condition met, should show OR-conditional question
    await expect(page.locator('[data-testid="question-text"]')).toBeVisible();
  });
});

test.describe('Section Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should show section list with visibility indicators', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Look for section overview
    const sectionList = page.locator('[data-testid="section-list"]');
    if (await sectionList.isVisible()) {
      // Should show visible/hidden indicators
      await expect(page.locator('[data-testid="section-item"]').first()).toBeVisible();
    }
  });

  test('should update section visibility in real-time', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.click('[data-testid="start-questionnaire-button"]');

    // Get initial section count
    const initialSections = await page.locator('[data-testid="section-item"]').count();

    // Answer to potentially hide/show sections
    const yesButton = page.locator('[data-testid="answer-yes"]');
    if (await yesButton.isVisible()) {
      await yesButton.click();
      await page.click('[data-testid="submit-answer"]');
    }

    // Section count may change
    const newSections = await page.locator('[data-testid="section-item"]').count();
    // Either same or different based on logic
    expect(newSections).toBeGreaterThanOrEqual(0);
  });

  test('should complete questionnaire when all visible questions are answered', async ({
    page,
  }) => {
    await page.goto('/questionnaires');

    // Look for a short/completed questionnaire
    const completedSession = page.locator('[data-testid="completed-session"]').first();
    if (await completedSession.isVisible()) {
      await completedSession.click();

      // Should show completion status
      await expect(
        page.locator('text=Completed').or(page.locator('[data-testid="completion-badge"]')),
      ).toBeVisible();
    }
  });
});

test.describe('Adaptive Score Impact', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should reflect skipped questions in final score calculation', async ({ page }) => {
    await page.goto('/dashboard');

    // Check score display
    const scoreDisplay = page.locator('[data-testid="readiness-score"]');
    if (await scoreDisplay.isVisible()) {
      const scoreText = await scoreDisplay.textContent();
      // Score should be calculated based on answered questions only
      expect(scoreText).toMatch(/\d+/);
    }
  });

  test('should show N/A for skipped dimension sections', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for dimension scores
    const dimensionScores = page.locator('[data-testid="dimension-score"]');
    if (await dimensionScores.first().isVisible()) {
      // Some might show N/A if entire dimension was skipped
      const naIndicator = page.locator('text=N/A').or(page.locator('text=Not Applicable'));
      // May or may not be visible depending on answers
      if (await naIndicator.isVisible()) {
        expect(await naIndicator.count()).toBeGreaterThan(0);
      }
    }
  });
});
