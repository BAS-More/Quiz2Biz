/**
 * Validation Test Suite Index
 *
 * This module exports all validation test suites for organized testing.
 * All tests are automatically discovered by Jest via *.spec.ts pattern.
 *
 * Test Suites:
 * - security-scan.spec.ts: OWASP Top 10, secrets detection, injection prevention
 * - accessibility.spec.ts: WCAG 2.1, ARIA compliance, contrast ratios
 * - ux-quality.spec.ts: Nielsen heuristics, error handling, user feedback
 * - code-hygiene.spec.ts: SOLID, DRY, naming conventions, type safety
 * - dependency-health.spec.ts: Package versions, security vulnerabilities, licenses
 *
 * Run all validation tests:
 *   npm test -- --testPathPattern="validation"
 *
 * Run specific validation test:
 *   npm test -- --testPathPattern="security-scan"
 */

export const VALIDATION_TEST_SUITES = [
  'security-scan.spec.ts',
  'accessibility.spec.ts',
  'ux-quality.spec.ts',
  'code-hygiene.spec.ts',
  'dependency-health.spec.ts',
] as const;

export type ValidationTestSuite = (typeof VALIDATION_TEST_SUITES)[number];
