/**
 * Regression Test Setup
 * Configures test environment for regression tests
 */

import { HISTORICAL_BUG_CATALOG, REGRESSION_TEST_TAGS } from './regression-catalog';

// ============================================================================
// Global Setup
// ============================================================================

beforeAll(() => {
  console.log('\n📋 REGRESSION TEST SUITE');
  console.log(`Running ${HISTORICAL_BUG_CATALOG.length} regression tests\n`);
});

afterAll(() => {
  console.log('\n✅ Regression test suite complete\n');
});

// ============================================================================
// Custom Matchers
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeImmutable(): R;
      toNotThrowNull(): R;
    }
  }
}

expect.extend({
  /**
   * Verifies that an object was not mutated
   */
  toBeImmutable(received: object, original: object) {
    const pass = JSON.stringify(received) === JSON.stringify(original);
    return {
      message: () =>
        pass
          ? 'Expected object to be mutated but it was not'
          : `Expected object to remain unchanged but it was mutated.\n` +
            `Original: ${JSON.stringify(original)}\n` +
            `Received: ${JSON.stringify(received)}`,
      pass,
    };
  },

  /**
   * Verifies that a function handles null inputs gracefully
   */
  toNotThrowNull(received: () => unknown) {
    let error: Error | null = null;
    let result: unknown;

    try {
      result = received();
    } catch (e) {
      error = e as Error;
    }

    const isNullError =
      error?.message?.toLowerCase().includes('null') ||
      error?.message?.toLowerCase().includes('undefined') ||
      error?.name === 'TypeError';

    return {
      message: () =>
        isNullError
          ? `Expected function to handle null gracefully but it threw: ${error?.message}`
          : 'Function handled null input gracefully',
      pass: !isNullError,
    };
  },
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to document which bug a test covers
 */
export function testForBug(bugId: string, description: string, testFn: () => void | Promise<void>) {
  const bug = HISTORICAL_BUG_CATALOG.find((b) => b.id === bugId);
  if (!bug) {
    console.warn(`Warning: No bug found with ID ${bugId}`);
  }

  const taggedDescription = `${REGRESSION_TEST_TAGS.forBug(bugId)} ${description}`;
  return test(taggedDescription, testFn);
}

/**
 * Creates a frozen deep copy for immutability testing
 */
export function deepFreeze<T extends object>(obj: T): T {
  const copy = JSON.parse(JSON.stringify(obj)) as T;
  return Object.freeze(copy);
}

/**
 * Waits for a specific condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

/**
 * Mock timer utilities for race condition tests
 */
export function setupFakeTimers() {
  jest.useFakeTimers();
  return {
    advanceBy: (ms: number) => jest.advanceTimersByTime(ms),
    cleanup: () => jest.useRealTimers(),
  };
}

// ============================================================================
// Shared Test Data
// ============================================================================

export const testData = {
  validUser: {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  },
  nullUser: null,
  undefinedUser: undefined,
  emptyUser: {},

  validSession: {
    id: 'session-123',
    userId: 'user-123',
    status: 'IN_PROGRESS',
  },

  validQuestionnaire: {
    id: 'questionnaire-123',
    title: 'Test Questionnaire',
    questions: [
      { id: 'q1', text: 'Question 1' },
      { id: 'q2', text: 'Question 2' },
    ],
  },
};

export default {
  testForBug,
  deepFreeze,
  waitForCondition,
  setupFakeTimers,
  testData,
};
