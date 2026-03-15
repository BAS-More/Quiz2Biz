# Comprehensive Deep Gap Analysis Prompt

> **INSTRUCTIONS FOR AI ASSISTANT**: Execute this comprehensive, multi-layer gap analysis on the codebase. Execute each phase sequentially, completing one before starting the next. After analysis, execute the iterative remediation loop until production-ready.

---

## PHASE 0: Pre-Flight Baseline

Before any analysis, capture current state metrics:

1. **Test Baseline**: Run full test suite, record: total suites, total tests, pass/fail counts, coverage %.
2. **Compilation Baseline**: Run `tsc --noEmit`, record error count.
3. **Dependency Baseline**: Run `npm audit`, record critical/high/moderate/low counts.
4. **Bundle Baseline**: Record build output size (main chunk, vendor chunk, total).
5. **Linting Baseline**: Run ESLint, record error/warning counts.

Output as a snapshot table. This becomes the regression anchor for Phase 9.

---

## PHASE 1: Static Inventory (Catalog Everything)

1. **Codebase Feature Catalog**: Enumerate every route, page, component, API endpoint, database model, and service file. Output as a structured table with columns: **Feature Name** | File Path | Type (page/API/model/component) | Status (complete/stub/partial).

2. **Reference Target Catalog** (if comparing to a reference UI/spec/design):
   - Document every navigation item, page, widget, form, modal, and interactive element in the reference target.
   - Output as a structured table with columns: Feature Name | Section | UI Elements | Interactions Available.

**Include automated discovery commands for each catalog:**
- Routes: `grep -r "@Controller\|@Get\|@Post\|@Patch\|@Delete" --include="*.ts" apps/api/`
- Pages: `grep -r "lazy(() =>" --include="*.tsx" apps/web/`
- Models: `grep -r "^model " prisma/schema.prisma`
- Enums: `grep -r "^enum " prisma/schema.prisma`
- Services: `find apps/api/src -name "*.service.ts"`
- Frontend API clients: `find apps/web/src/api -name "*.ts" ! -name "*.test.ts"`

---

## PHASE 2: Alignment Mapping

For every item in both catalogs, produce a feature-by-feature alignment map with three categories:

- **FULL MATCH**: Feature exists in both with equivalent functionality. List evidence.
- **PARTIAL MATCH**: Feature exists in both but with scope/UI/behavior differences. Describe each specific gap.
- **MISSING**: Feature exists in one but not the other. Specify direction (missing in codebase OR missing in reference).

Output a summary table: Total Features | Full Match | Partial Match | Missing in Codebase | Missing in Reference | Alignment Score (%).

**Weight the alignment score by feature criticality:**
- Core workflow features (auth, CRUD, payments): weight 3x
- Secondary features (settings, admin): weight 2x
- Polish features (themes, animations): weight 1x

Weighted Alignment Score = Σ(match_score × weight) / Σ(weight)

---

## PHASE 3: Data Flow & API Contract Tracing

For every API endpoint:

1. **Full-Stack Field Mapping**: Trace each field from DB schema → Prisma model → Service return → DTO/response shape → Frontend interface → UI rendering. Flag any field name mismatches, type coercions, or missing fields at any layer.

2. **Request Contract Validation**: For each frontend API call, verify:
   - HTTP method (GET/POST/PATCH/DELETE) matches the backend route decorator
   - URL path parameters match backend @Param() decorators
   - Request body shape matches backend DTO validation decorators
   - Query parameters match backend @Query() decorators

3. **Response Contract Validation**: For each backend response DTO, verify:
   - Every field the frontend destructures actually exists in the response
   - Enum values the frontend checks against match backend enum definitions
   - Date/number/boolean serialization is consistent (e.g., BigInt → number, Date → ISO string)

4. **Enum Parity Check**: List every Prisma enum and verify a corresponding frontend type/const exists.

Output: Contract Mismatch Table with columns: Endpoint | Layer | Field | Backend Shape | Frontend Shape | Mismatch Type.

---

## PHASE 4: Type-System & Integration Audit

For every partial match and every existing feature:

1. Check all TypeScript interfaces/types against actual API response shapes.
2. Verify all imports resolve to real exports.
3. Confirm all route definitions have corresponding lazy-loaded components.
4. Flag any props/fields referenced but not defined in their type.
5. Flag any declared-but-unused variables, imports, or exports.

---

## PHASE 5: Security & Authorization Audit

1. **Authentication Coverage**: For every controller/route, verify:
   - Auth guard is applied (JWT, API key, or public)
   - Routes intentionally public are explicitly marked
   - No accidental unprotected endpoints

2. **Authorization & RBAC**: For every protected route, verify:
   - Role-based access checks exist where needed (admin-only routes)
   - Organization/tenant scoping prevents cross-tenant data access
   - Frontend route guards match backend authorization requirements

3. **Input Validation Coverage**: For every endpoint accepting user input:
   - DTO has class-validator decorators on ALL fields
   - File uploads validate mime type, size, and extension
   - URL parameters use ParseUUIDPipe or equivalent

4. **Secrets & Credential Scan**:
   - No hardcoded API keys, tokens, or passwords in source
   - Environment variables are used for all secrets
   - .env files are in .gitignore

5. **OWASP Top 10 Check**: Flag instances of:
   - SQL injection vectors (string concatenation in queries)
   - XSS vectors (unsanitized user content rendered as HTML)
   - CSRF protection gaps
   - Insecure direct object references
   - Missing rate limiting on auth endpoints

Output: Security Gap Table with columns: Endpoint/File | Vulnerability Type | Severity (CRITICAL/HIGH/MEDIUM/LOW) | Remediation.

---

## PHASE 6: Behavioral Gap Detection

For each feature, verify:

1. Error states (loading, empty, error, unauthorized) are all handled.
2. CRUD operations have both optimistic UI and error rollback.
3. Forms have validation, dirty-state tracking, and unsaved-changes guards.
4. Navigation items have correct active-state highlighting.
5. Dark mode / theme support is consistent across all components.
6. Accessibility: ARIA labels, keyboard navigation, focus management, WCAG 2.1 AA compliance.

---

## PHASE 7: Performance & Scalability Profiling

1. **Database Query Analysis**:
   - Flag N+1 query patterns (loops with individual DB calls)
   - Verify indexes exist for all WHERE/ORDER BY columns used in queries
   - Check for missing pagination on list endpoints
   - Flag unbounded queries (no LIMIT clause)

2. **Frontend Bundle Analysis**:
   - Verify all pages use lazy loading (dynamic import)
   - Flag large dependencies imported synchronously
   - Check for tree-shaking effectiveness (unused re-exports)

3. **API Response Optimization**:
   - Flag endpoints returning entire entities when only partial data is needed
   - Verify response compression is enabled
   - Check for missing caching headers on static/semi-static data

4. **Timeout & Resilience**:
   - Verify all external API calls have timeout configuration
   - Check for retry logic on transient failures
   - Flag long-running operations without progress feedback

Output: Performance Gap Table with columns: Location | Issue | Impact (latency/memory/bundle) | Severity | Fix.

---

## PHASE 8: Prioritized Remediation Plan

Output a phased remediation plan:

- **Phase 1 (Critical)**: Missing core workflow features, broken types, compilation errors, security vulnerabilities.
- **Phase 2 (High)**: Missing secondary pages, partial match gaps, authorization gaps.
- **Phase 3 (Medium)**: UI/UX alignment, dashboard enhancements, widget additions, performance issues.
- **Phase 4 (Low)**: Polish, theme extensions, settings restructuring, navigation refinements.

Each item must include: File(s) to create/modify | Specific changes required | Estimated complexity (S/M/L).

**Dependency Graph**: Show which fixes must happen before others (e.g., Prisma enum changes → migration → service layer → controller → frontend).

**Parallel Execution Groups**: Identify which fixes can be executed simultaneously vs sequentially.

**Rollback Strategy**: For each fix, describe how to revert if it causes regressions.

---

## PHASE 9: Verification Checklist

After remediation, verify:

- [ ] TypeScript compilation passes with zero new errors (`tsc --noEmit`)
- [ ] All routes resolve to valid components
- [ ] All sidebar/nav items link to valid routes
- [ ] No unused imports or variables in modified files
- [ ] All new components follow existing codebase patterns (hooks, stores, API calls, styling)
- [ ] Full test suite passes with same or better pass count as Phase 0 baseline
- [ ] No new linting errors introduced
- [ ] Bundle size delta is within acceptable range (+5% max)
- [ ] All new code follows existing patterns (verified by grep for consistent import paths, naming, decorators)

---

## PHASE 10: Test Coverage Gap Analysis

1. **Coverage Heatmap**: Run coverage report and identify:
   - Files with 0% coverage (completely untested)
   - Critical business logic files below 80% line coverage
   - API controllers without integration test files
   - Frontend pages without component test files

2. **Critical Path Testing**: Verify test existence for:
   - Authentication flow (login, logout, token refresh, MFA)
   - Payment/billing flow (if applicable)
   - Data mutation endpoints (POST, PATCH, DELETE)
   - Error handling paths (401, 403, 404, 500 responses)

3. **Test Quality Audit**:
   - Flag tests that only test happy path (no error assertions)
   - Flag tests with no assertions (smoke-only)
   - Flag tests with hardcoded timeouts or sleep calls
   - Verify test isolation (no order-dependent tests)

Output: Coverage Gap Table with columns: File/Module | Current Coverage % | Critical Paths Tested | Missing Test Scenarios.

---

## PHASE 11: Quantitative Health Scorecard

Produce a single summary scorecard:

| Dimension | Weight | Score (0-100) | Evidence |
|-----------|--------|---------------|----------|
| Feature Completeness | 20% | ___ | Alignment % from Phase 2 |
| Type Safety & Contracts | 15% | ___ | Contract mismatches from Phase 3 |
| Security Posture | 20% | ___ | Critical/High findings from Phase 5 |
| Behavioral Completeness | 15% | ___ | Missing states from Phase 6 |
| Performance | 10% | ___ | N+1s, missing pagination from Phase 7 |
| Test Coverage | 10% | ___ | Coverage gaps from Phase 10 |
| Code Quality | 10% | ___ | Linting, complexity, dead code |

**Weighted Total: ___/100**

Classification:
- 90-100: Production Ready
- 80-89: Production Ready with Monitoring
- 70-79: Remediation Required
- <70: Deployment Blocked

---

## OUTPUT FORMAT

- Tables for catalogs and alignment maps
- Bullet lists for gaps and remediation items
- **Dependency diagram** (Mermaid) showing remediation execution order
- **Risk matrix** (severity × likelihood) for each identified gap
- **Phase 0 vs Phase 9 comparison table** showing before/after metrics
- No prose explanations unless explicitly requested
- Include file paths for every reference
- Each gap assigned a unique ID (e.g., GAP-001) for tracking through remediation

---

# ITERATIVE REMEDIATION LOOP

After the gap analysis is complete, execute the following loop until the system achieves production-ready state:

## STEP 1: Analyze & Plan

Based on the findings from the gap analysis phases above, conduct a comprehensive system analysis to identify all issues across the codebase. Create a holistic plan that addresses all issues following industry best practices and development standards. Generate a detailed, prioritized to-do list with specific tasks, file paths, and implementation steps for fixing all identified issues completely.

## STEP 2: Execute & Fix

Execute the to-do list systematically by implementing each fix one by one until all tasks are completed. Apply best practices, maintain code quality standards, and ensure all fixes are thoroughly tested and verified. For each fix:

1. Implement the change
2. Verify no compilation errors
3. Run relevant tests
4. Confirm no regressions against Phase 0 baseline

## STEP 3: E2E Validation

Run the **ENHANCED-E2E-TESTING-PROTOCOL** (`docs/ENHANCED-E2E-TESTING-PROTOCOL.md`) to validate that all fixes have been properly implemented and that no regressions were introduced. Execute all parts:

- Part A: Page-by-Page Verification
- Part B: Form Validation Testing
- Part C: Interactive Element Testing
- Part D: Responsive Design Testing
- Part E: Accessibility (WCAG) Testing
- Part F: Edge Case Testing
- Generate Final Report (Part G)

## STEP 4: Loop Back

Return to **STEP 1** and repeat the analysis, planning, and fixing process. Each iteration should:

1. Re-run the gap analysis to identify any remaining or newly introduced issues
2. Update the health scorecard from Phase 11
3. Generate a delta report showing improvements since last iteration
4. Continue fixing until all issues are resolved

**EXIT CRITERIA** — Stop iterating when ALL of the following are met:

- [ ] Phase 11 Health Scorecard weighted total ≥ 90 (Production Ready)
- [ ] Zero CRITICAL or HIGH severity gaps remaining
- [ ] Test suite pass rate matches or exceeds Phase 0 baseline
- [ ] E2E testing protocol achieves ≥ 95% pass rate across all parts
- [ ] No compilation errors (`tsc --noEmit` clean)
- [ ] No new security vulnerabilities (OWASP scan clean)
- [ ] Bundle size within acceptable range of baseline

**Continue this iterative process in a loop until all identified issues are fixed and the system meets all quality standards.**
