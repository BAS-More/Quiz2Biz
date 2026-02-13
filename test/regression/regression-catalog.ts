/**
 * Regression Test Suite Configuration
 * Documents historical bugs and ensures they don't recur
 */

// ============================================================================
// Historical Bug Catalog
// ============================================================================

export interface HistoricalBug {
  id: string;
  title: string;
  description: string;
  rootCause: string;
  fix: string;
  affectedFiles: string[];
  sprintFixed: number;
  dateFixed: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: BugCategory;
  testFile: string;
  preventionMeasures: string[];
}

export type BugCategory =
  | 'null-reference'
  | 'import-error'
  | 'type-mismatch'
  | 'data-mutation'
  | 'async-race-condition'
  | 'react-hook'
  | 'api-contract'
  | 'security'
  | 'performance'
  | 'logic-error';

/**
 * Catalog of all historical bugs with regression tests
 */
export const HISTORICAL_BUG_CATALOG: HistoricalBug[] = [
  // BUG-001: Session Service Null Pointer
  {
    id: 'BUG-001',
    title: 'Session Service Null Pointer Exception',
    description:
      'SessionService.getOrCreateSession() threw null pointer when accessing user.id before null check',
    rootCause: 'Premature access to nullable user object properties before defensive null checking',
    fix: 'Added early return with proper null check before accessing user properties',
    affectedFiles: ['apps/api/src/modules/session/session.service.ts'],
    sprintFixed: 18,
    dateFixed: '2026-01-15',
    severity: 'critical',
    category: 'null-reference',
    testFile: 'test/regression/session-null-pointer.test.ts',
    preventionMeasures: [
      'Enable strict null checks in TypeScript',
      'Use optional chaining (?.) for nullable properties',
      'Add unit tests for null/undefined inputs',
    ],
  },

  // BUG-002: Client.ts Duplicate Imports
  {
    id: 'BUG-002',
    title: 'Web Client Duplicate Import Statements',
    description:
      'apps/web/src/lib/client.ts had duplicate import statements causing module resolution errors',
    rootCause: 'Manual file editing introduced duplicate lines during merge conflict resolution',
    fix: 'Removed duplicate import statements, added ESLint rule for duplicate imports',
    affectedFiles: ['apps/web/src/lib/client.ts'],
    sprintFixed: 18,
    dateFixed: '2026-01-15',
    severity: 'medium',
    category: 'import-error',
    testFile: 'test/regression/client-duplicate-imports.test.ts',
    preventionMeasures: [
      'Enable ESLint no-duplicate-imports rule',
      'Use import organization tools (eslint-plugin-import)',
      'Run lint check before commits',
    ],
  },

  // BUG-003: Admin Questionnaire Deep Clone Issue
  {
    id: 'BUG-003',
    title: 'Admin Questionnaire Shallow Copy Mutation',
    description:
      'AdminQuestionnaireService modified original questionnaire object when creating duplicates',
    rootCause: 'Used spread operator for shallow copy instead of deep clone for nested objects',
    fix: 'Implemented proper deep clone using structuredClone() for nested question arrays',
    affectedFiles: ['apps/api/src/modules/admin/services/admin-questionnaire.service.ts'],
    sprintFixed: 18,
    dateFixed: '2026-01-16',
    severity: 'high',
    category: 'data-mutation',
    testFile: 'test/regression/admin-deep-clone.test.ts',
    preventionMeasures: [
      'Use structuredClone() for deep copies',
      'Avoid mutating input parameters',
      'Add Object.freeze() in tests to detect mutations',
    ],
  },

  // BUG-004: React Hook Dependency Array Issues
  {
    id: 'BUG-004',
    title: 'useEffect Missing Dependencies Causing Stale Closures',
    description:
      'Questionnaire components had useEffect hooks with missing dependency arrays causing stale state',
    rootCause:
      'Dependencies in useEffect were not properly listed, causing callbacks to reference outdated state',
    fix: 'Added exhaustive-deps ESLint rule and fixed all dependency arrays',
    affectedFiles: [
      'apps/web/src/components/questionnaire/QuestionRenderer.tsx',
      'apps/web/src/components/dashboard/ScoreDashboard.tsx',
    ],
    sprintFixed: 18,
    dateFixed: '2026-01-17',
    severity: 'high',
    category: 'react-hook',
    testFile: 'test/regression/hook-dependencies.test.ts',
    preventionMeasures: [
      'Enable react-hooks/exhaustive-deps ESLint rule',
      'Use useCallback for stable function references',
      'Test with React StrictMode enabled',
    ],
  },

  // BUG-005: Enum String Comparison in Heatmap Service
  {
    id: 'BUG-005',
    title: 'Heatmap Service Enum Type Coercion Issue',
    description:
      'HeatmapService compared string enum values incorrectly due to implicit type coercion',
    rootCause:
      'Prisma returns enum as string at runtime, but TypeScript types them as enum literals',
    fix: 'Added explicit type casting and string comparison for Prisma enum fields',
    affectedFiles: ['apps/api/src/modules/heatmap/heatmap.service.ts'],
    sprintFixed: 19,
    dateFixed: '2026-01-20',
    severity: 'medium',
    category: 'type-mismatch',
    testFile: 'test/regression/enum-comparison.test.ts',
    preventionMeasures: [
      'Use String() for explicit string conversion',
      'Create type-safe comparison helper functions',
      'Test with actual database values, not mock enums',
    ],
  },

  // BUG-006: OAuth Token Refresh Race Condition
  {
    id: 'BUG-006',
    title: 'Concurrent Token Refresh Causing Auth Failures',
    description:
      'Multiple simultaneous API calls triggered parallel token refresh, invalidating tokens',
    rootCause:
      'No request queuing during token refresh, multiple refreshes consumed the same refresh token',
    fix: 'Implemented request queue with Promise-based mutex for token refresh',
    affectedFiles: ['apps/web/src/lib/client.ts'],
    sprintFixed: 20,
    dateFixed: '2026-01-22',
    severity: 'high',
    category: 'async-race-condition',
    testFile: 'test/regression/token-refresh-race.test.ts',
    preventionMeasures: [
      'Use mutex/semaphore for single-threaded operations',
      'Queue requests during refresh window',
      'Add request retry with exponential backoff',
    ],
  },

  // BUG-007: File Upload Size Validation Bypass
  {
    id: 'BUG-007',
    title: 'File Upload Validation Only Client-Side',
    description: 'Large file uploads could bypass client-side validation and crash server',
    rootCause: 'File size validation was only implemented in frontend, not in backend',
    fix: 'Added server-side file size validation with multer limits and custom middleware',
    affectedFiles: [
      'apps/api/src/modules/evidence-registry/evidence-registry.controller.ts',
      'apps/web/src/components/inputs/FileUploadInput.tsx',
    ],
    sprintFixed: 21,
    dateFixed: '2026-01-25',
    severity: 'critical',
    category: 'security',
    testFile: 'test/regression/file-upload-validation.test.ts',
    preventionMeasures: [
      'Always validate on server-side',
      'Set multer file size limits',
      'Add server resource protection (memory limits)',
    ],
  },

  // BUG-008: N+1 Query in Session List
  {
    id: 'BUG-008',
    title: 'N+1 Query Loading Sessions with Responses',
    description:
      'Admin session list endpoint triggered N+1 queries when loading sessions with responses',
    rootCause:
      'Prisma include was missing for responses relation, causing lazy loading per session',
    fix: 'Added proper Prisma include with response count aggregation',
    affectedFiles: ['apps/api/src/modules/admin/services/admin-questionnaire.service.ts'],
    sprintFixed: 22,
    dateFixed: '2026-01-27',
    severity: 'medium',
    category: 'performance',
    testFile: 'test/regression/n-plus-one-queries.test.ts',
    preventionMeasures: [
      'Use Prisma include for related data',
      'Add database query logging in development',
      'Set up query count assertions in tests',
    ],
  },

  // BUG-009: JWT Expiry Off-By-One
  {
    id: 'BUG-009',
    title: 'JWT Token Expiry Calculation Off-By-One',
    description: 'JWT tokens were being rejected 1 second before actual expiry due to rounding',
    rootCause: 'Token expiry used Math.floor() while verification used Math.ceil() for timestamp',
    fix: 'Standardized timestamp handling to use seconds with consistent rounding',
    affectedFiles: [
      'apps/api/src/modules/auth/auth.service.ts',
      'apps/api/src/modules/auth/guards/jwt-auth.guard.ts',
    ],
    sprintFixed: 23,
    dateFixed: '2026-01-28',
    severity: 'low',
    category: 'logic-error',
    testFile: 'test/regression/jwt-expiry.test.ts',
    preventionMeasures: [
      'Use consistent timestamp handling library (date-fns)',
      'Add clock skew tolerance (5 seconds)',
      'Test edge cases around expiry boundary',
    ],
  },

  // BUG-010: API Response Schema Mismatch
  {
    id: 'BUG-010',
    title: 'API Response Missing Required Fields',
    description:
      'Questionnaire API response was missing sectionProgress field expected by frontend',
    rootCause: 'API response DTO was updated but service implementation was not changed',
    fix: 'Added sectionProgress calculation to service and updated response mapper',
    affectedFiles: [
      'apps/api/src/modules/questionnaire/questionnaire.service.ts',
      'apps/api/src/modules/questionnaire/dto/questionnaire-response.dto.ts',
    ],
    sprintFixed: 24,
    dateFixed: '2026-01-28',
    severity: 'medium',
    category: 'api-contract',
    testFile: 'test/regression/api-schema-mismatch.test.ts',
    preventionMeasures: [
      'Use API contract testing (Pact)',
      'Generate TypeScript types from OpenAPI spec',
      'Add response validation middleware',
    ],
  },
];

// ============================================================================
// Regression Test Utilities
// ============================================================================

/**
 * Get all bugs by category
 */
export function getBugsByCategory(category: BugCategory): HistoricalBug[] {
  return HISTORICAL_BUG_CATALOG.filter((bug) => bug.category === category);
}

/**
 * Get all bugs by severity
 */
export function getBugsBySeverity(severity: HistoricalBug['severity']): HistoricalBug[] {
  return HISTORICAL_BUG_CATALOG.filter((bug) => bug.severity === severity);
}

/**
 * Get bugs affecting a specific file
 */
export function getBugsAffectingFile(filePath: string): HistoricalBug[] {
  return HISTORICAL_BUG_CATALOG.filter((bug) =>
    bug.affectedFiles.some((f) => f.includes(filePath) || filePath.includes(f)),
  );
}

/**
 * Get bug by ID
 */
export function getBugById(id: string): HistoricalBug | undefined {
  return HISTORICAL_BUG_CATALOG.find((bug) => bug.id === id);
}

/**
 * Generate regression test summary
 */
export function generateRegressionSummary(): RegressionSummary {
  const categoryCounts: Record<BugCategory, number> = {
    'null-reference': 0,
    'import-error': 0,
    'type-mismatch': 0,
    'data-mutation': 0,
    'async-race-condition': 0,
    'react-hook': 0,
    'api-contract': 0,
    security: 0,
    performance: 0,
    'logic-error': 0,
  };

  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const bug of HISTORICAL_BUG_CATALOG) {
    categoryCounts[bug.category]++;
    severityCounts[bug.severity]++;
  }

  return {
    totalBugs: HISTORICAL_BUG_CATALOG.length,
    categoryCounts,
    severityCounts,
    testFiles: HISTORICAL_BUG_CATALOG.map((b) => b.testFile),
    preventionMeasures: [...new Set(HISTORICAL_BUG_CATALOG.flatMap((b) => b.preventionMeasures))],
  };
}

export interface RegressionSummary {
  totalBugs: number;
  categoryCounts: Record<BugCategory, number>;
  severityCounts: Record<HistoricalBug['severity'], number>;
  testFiles: string[];
  preventionMeasures: string[];
}

// ============================================================================
// Jest Configuration for Regression Tests
// ============================================================================

/**
 * Jest configuration for regression test suite
 */
export const regressionJestConfig = {
  displayName: 'regression',
  testMatch: ['<rootDir>/test/regression/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/test/regression/setup.ts'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results/regression',
        outputName: 'regression-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' > ',
        usePathForSuiteName: true,
      },
    ],
  ],
  collectCoverageFrom: [
    // Focus on files that have had bugs
    ...HISTORICAL_BUG_CATALOG.flatMap((b) => b.affectedFiles),
  ],
};

// ============================================================================
// Regression Test Tags
// ============================================================================

/**
 * Custom Jest matchers and tags for regression tests
 */
export const REGRESSION_TEST_TAGS = {
  // Mark a test as a regression test for a specific bug
  forBug: (bugId: string) => `@regression:${bugId}`,

  // Mark a test by category
  forCategory: (category: BugCategory) => `@category:${category}`,

  // Mark a test by severity
  forSeverity: (severity: HistoricalBug['severity']) => `@severity:${severity}`,

  // Critical path tests that must pass before deployment
  criticalPath: '@critical-path',

  // Tests that verify security fixes
  securityFix: '@security-fix',

  // Tests that verify performance fixes
  performanceFix: '@performance-fix',
};

/**
 * Jest test runner configuration with filtering by tags
 */
export function getTestFilterByTag(tag: string): string {
  return `--testNamePattern="${tag}"`;
}

/**
 * Get all regression test tags
 */
export function getAllRegressionTags(): string[] {
  const tags: string[] = [];

  for (const bug of HISTORICAL_BUG_CATALOG) {
    tags.push(REGRESSION_TEST_TAGS.forBug(bug.id));
    tags.push(REGRESSION_TEST_TAGS.forCategory(bug.category));
    tags.push(REGRESSION_TEST_TAGS.forSeverity(bug.severity));
  }

  return [...new Set(tags)];
}

// ============================================================================
// Export
// ============================================================================

export default {
  HISTORICAL_BUG_CATALOG,
  getBugsByCategory,
  getBugsBySeverity,
  getBugsAffectingFile,
  getBugById,
  generateRegressionSummary,
  regressionJestConfig,
  REGRESSION_TEST_TAGS,
  getAllRegressionTags,
};
