/**
 * @fileoverview Tests for common/tests/validation barrel exports
 */
import { VALIDATION_TEST_SUITES, ValidationTestSuite } from './index';

describe('common/tests/validation index', () => {
  it('should export VALIDATION_TEST_SUITES array', () => {
    expect(VALIDATION_TEST_SUITES).toBeDefined();
    expect(Array.isArray(VALIDATION_TEST_SUITES)).toBe(true);
  });

  it('should contain expected test suite names', () => {
    expect(VALIDATION_TEST_SUITES).toContain('security-scan.spec.ts');
    expect(VALIDATION_TEST_SUITES).toContain('accessibility.spec.ts');
    expect(VALIDATION_TEST_SUITES).toContain('ux-quality.spec.ts');
    expect(VALIDATION_TEST_SUITES).toContain('code-hygiene.spec.ts');
    expect(VALIDATION_TEST_SUITES).toContain('dependency-health.spec.ts');
  });

  it('should have ValidationTestSuite type', () => {
    const testSuite: ValidationTestSuite = 'security-scan.spec.ts';
    expect(testSuite).toBeDefined();
  });
});
