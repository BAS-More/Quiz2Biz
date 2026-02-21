/**
 * @fileoverview Tests for common/tests barrel exports
 */
import * as tests from './index';

describe('common/tests index', () => {
  it('should export COMMON_TEST_SUITES', () => {
    expect(tests.COMMON_TEST_SUITES).toBeDefined();
    expect(tests.COMMON_TEST_SUITES.security).toContain('api-security.spec.ts');
    expect(tests.COMMON_TEST_SUITES.validation).toContain('accessibility.spec.ts');
  });

  it('should export VALIDATION_TEST_SUITES from validation', () => {
    expect(tests.VALIDATION_TEST_SUITES).toBeDefined();
    expect(tests.VALIDATION_TEST_SUITES.length).toBeGreaterThan(0);
  });
});
