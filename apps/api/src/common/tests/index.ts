/**
 * Common Test Suite Index
 * 
 * Centralizes all common test modules for the API.
 * Tests are auto-discovered by Jest via *.spec.ts pattern.
 * 
 * Test Categories:
 * 
 * 1. Security Tests:
 *    - api-security.spec.ts: API endpoint security validation
 *    - input-validation.security.spec.ts: Input sanitization tests
 * 
 * 2. Validation Tests (./validation/):
 *    - security-scan.spec.ts: OWASP Top 10, secrets, injection
 *    - accessibility.spec.ts: WCAG 2.1, ARIA, contrast
 *    - ux-quality.spec.ts: Nielsen heuristics, error handling
 *    - code-hygiene.spec.ts: SOLID, DRY, naming, type safety
 *    - dependency-health.spec.ts: Packages, CVEs, licenses
 * 
 * Commands:
 *   npm test                                    # Run all tests
 *   npm test -- --testPathPattern="common"     # Run common tests only
 *   npm test -- --testPathPattern="validation" # Run validation tests only
 */

export * from './validation';

export const COMMON_TEST_SUITES = {
  security: ['api-security.spec.ts', 'input-validation.security.spec.ts'],
  validation: [
    'security-scan.spec.ts',
    'accessibility.spec.ts',
    'ux-quality.spec.ts',
    'code-hygiene.spec.ts',
    'dependency-health.spec.ts',
  ],
} as const;
