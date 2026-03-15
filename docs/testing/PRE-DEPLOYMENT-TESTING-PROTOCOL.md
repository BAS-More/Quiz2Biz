# PRE-DEPLOYMENT TESTING PROTOCOL

> **INSTRUCTIONS FOR AI ASSISTANT**: When this file is added to a conversation, you MUST immediately begin executing the complete pre-deployment testing protocol below. Do not wait for additional instructions. Execute systematically and report findings. This is "DNA-level" testing - thorough, foundational, comprehensive.

---

## AUTOMATIC EXECUTION TRIGGER

**AI ASSISTANT: START EXECUTION NOW**

You are now in **Pre-Deployment Testing Mode**. Execute all phases in order. For each section:
1. Run the actual checks/tests
2. Report PASS/FAIL status with evidence
3. Document any issues found
4. Continue to next section
5. **BLOCK DEPLOYMENT if any Critical/High issues remain unresolved**

**Do not skip any section. Do not summarize. Execute and verify.**

---

# PART 1: FOUNDATION TESTING (Shift-Left)

---

## PHASE 1: PROJECT DISCOVERY

### 1.1 Identify Project Structure
```
EXECUTE NOW:
□ List the root directory structure
□ Identify tech stack (package.json, requirements.txt, pom.xml, go.mod, etc.)
□ Identify all test directories and their purpose
□ Identify configuration files (.env, config/, etc.)
□ Identify deployment files (Dockerfile, docker-compose, terraform, etc.)
□ Identify CI/CD pipeline files (.github/workflows, azure-pipelines, etc.)
```

### 1.2 Identify Test Commands
```
EXECUTE NOW:
□ Find all test scripts in package.json or equivalent
□ Find all build scripts
□ Find lint/format scripts
□ Find deployment scripts
□ Find database migration scripts
□ Document any missing essential scripts
```

### 1.3 Report Project Profile
```
REPORT:
- Project Name: [detected]
- Language: [detected]
- Framework: [detected]
- Test Framework: [detected]
- Build Tool: [detected]
- Database: [detected]
- Deployment Target: [detected]
- CI/CD Platform: [detected]
```

---

## PHASE 2: STATIC ANALYSIS

### 2.1 Linting
```
EXECUTE: npm run lint (or equivalent)
REPORT:
- Status: [PASS/FAIL]
- Error count: [number]
- Warning count: [number]
- Files with issues: [list]
BLOCKING: >0 errors = FAIL
```

### 2.2 Type Checking
```
EXECUTE: npx tsc --noEmit (or equivalent)
REPORT:
- Status: [PASS/FAIL]
- Error count: [number]
- Files with type errors: [list]
BLOCKING: >0 errors = FAIL
```

### 2.3 Formatting Verification
```
EXECUTE: npm run format:check (or equivalent)
REPORT:
- Status: [PASS/FAIL]
- Files needing format: [count]
BLOCKING: >0 unformatted files = FAIL
```

### 2.4 Code Complexity Analysis
```
EXECUTE: Analyze cyclomatic complexity
VERIFY:
- No function exceeds complexity of 20
- Average complexity <10
- Flag functions with complexity >15
REPORT:
| Function | File | Complexity | Status |
|----------|------|------------|--------|
BLOCKING: Any function >20 = FAIL
```

### 2.5 Maintainability Index
```
CALCULATE: Maintainability Index for each module
THRESHOLDS:
- 85-100: Highly Maintainable (PASS)
- 65-84: Moderately Maintainable (PASS)
- 20-64: Difficult to Maintain (WARNING)
- 0-19: Unmaintainable (FAIL)
REPORT: MI score per module
BLOCKING: Any module <65 = FAIL
```

### 2.6 Dead Code Detection
```
SEARCH FOR:
- Unused imports
- Unused variables
- Unused functions
- Commented-out code blocks (>10 lines)
- Unreachable code
REPORT: List of dead code locations
BLOCKING: >50 instances = FAIL
```

### 2.7 Duplicate Code Detection
```
ANALYZE: Code duplication percentage
THRESHOLD: <3% duplication allowed
REPORT:
- Total duplication: [X%]
- Duplicate blocks: [list locations]
BLOCKING: >5% duplication = FAIL
```

---

## PHASE 3: SECURITY VULNERABILITY SCAN

### 3.1 Dependency Vulnerabilities
```
EXECUTE: npm audit (or equivalent)
REPORT:
| Severity | Count | Status |
|----------|-------|--------|
| Critical | [n] | BLOCKING |
| High | [n] | BLOCKING |
| Moderate | [n] | WARNING |
| Low | [n] | INFO |
BLOCKING: >0 Critical OR >0 High = FAIL
```

### 3.2 Hardcoded Secrets Scan
```
SEARCH FOR patterns in non-test files:
- password=["'][^"']+["']
- secret=["'][^"']+["']
- api_key=["'][^"']+["']
- apiKey=["'][^"']+["']
- private_key
- credentials
- token=["'][^"']+["'] (excluding test mocks)
- AWS_ACCESS_KEY
- AZURE_CLIENT_SECRET
- DATABASE_URL with credentials
REPORT:
- Files with potential secrets: [list]
- Line numbers: [list]
BLOCKING: Any hardcoded secret = CRITICAL FAIL
```

### 3.3 SQL Injection Vulnerability Check
```
SEARCH FOR:
- String concatenation in SQL queries
- Template literals in SQL without parameterization
- Raw query execution without sanitization
VERIFY:
- All queries use parameterized statements
- ORM is used correctly
BLOCKING: Any SQL injection vulnerability = CRITICAL FAIL
```

### 3.4 XSS Vulnerability Check
```
SEARCH FOR:
- innerHTML assignments without sanitization
- dangerouslySetInnerHTML without sanitization
- eval() usage
- document.write() usage
- Unescaped user input in templates
BLOCKING: Any XSS vulnerability = CRITICAL FAIL
```

### 3.5 Authentication Security
```
VERIFY:
□ Passwords hashed with bcrypt/argon2 (not MD5/SHA1)
□ JWT tokens have expiration
□ Refresh token rotation implemented
□ Session invalidation on logout
□ Rate limiting on auth endpoints
□ Account lockout after failed attempts
REPORT: [checklist status]
BLOCKING: Any missing = FAIL
```

### 3.6 Authorization Security
```
VERIFY:
□ Role-based access control implemented
□ Resource ownership checks present
□ No horizontal privilege escalation possible
□ No vertical privilege escalation possible
□ All API endpoints have auth guards
□ Sensitive operations require re-authentication
REPORT: [checklist status]
BLOCKING: Any missing = FAIL
```

### 3.7 Security Headers Check
```
VERIFY CONFIGURATION FOR:
□ Content-Security-Policy
□ X-Content-Type-Options: nosniff
□ X-Frame-Options: DENY or SAMEORIGIN
□ Strict-Transport-Security (HSTS)
□ X-XSS-Protection: 1; mode=block
□ Referrer-Policy
□ Permissions-Policy
REPORT: [checklist status]
BLOCKING: Missing CSP or HSTS = FAIL
```

### 3.8 OWASP Top 10 Verification
```
VERIFY PROTECTION AGAINST:
□ A01:2021 - Broken Access Control
□ A02:2021 - Cryptographic Failures
□ A03:2021 - Injection
□ A04:2021 - Insecure Design
□ A05:2021 - Security Misconfiguration
□ A06:2021 - Vulnerable Components
□ A07:2021 - Authentication Failures
□ A08:2021 - Software/Data Integrity Failures
□ A09:2021 - Security Logging Failures
□ A10:2021 - Server-Side Request Forgery
REPORT: [checklist status per item]
BLOCKING: Any unprotected = FAIL
```

---

## PHASE 4: UNIT TESTING

### 4.1 Run Unit Tests
```
EXECUTE: npm test (or equivalent)
REPORT:
- Total test suites: [number]
- Total tests: [number]
- Passed: [number]
- Failed: [number]
- Skipped: [number]
- Duration: [time]
BLOCKING: >0 failures = FAIL
```

### 4.2 Coverage Analysis
```
EXECUTE: npm run test:cov (or equivalent)
REPORT:
| Metric | Percentage | Threshold | Status |
|--------|------------|-----------|--------|
| Lines | [X%] | 80% | [PASS/FAIL] |
| Branches | [X%] | 70% | [PASS/FAIL] |
| Functions | [X%] | 80% | [PASS/FAIL] |
| Statements | [X%] | 80% | [PASS/FAIL] |
BLOCKING: Any metric below threshold = FAIL
```

### 4.3 Analyze Test Quality
```
VERIFY:
□ Tests are independent (no order dependency)
□ Tests use proper assertions (not just console.log)
□ Edge cases covered (null, undefined, empty, boundaries)
□ Error paths tested
□ Async operations properly awaited
□ Mocks/stubs properly reset between tests
□ No flaky tests (run 3x to verify)
REPORT: [checklist status]
```

### 4.4 Failure Analysis
```
FOR EACH FAILED TEST:
- Test name: [name]
- File: [path:line]
- Error message: [message]
- Stack trace: [relevant portion]
- Suspected cause: [analysis]
- Fix recommendation: [suggestion]
```

---

## PHASE 5: INTEGRATION TESTING

### 5.1 Database Integration
```
VERIFY:
□ Database connection configured correctly
□ Connection pooling configured
□ Migrations are up to date
□ Can connect to database
□ CRUD operations work
□ Transactions work correctly
□ Connection cleanup on shutdown
EXECUTE: Integration tests against test database
REPORT: [Pass/Fail with details]
BLOCKING: Any database issue = FAIL
```

### 5.2 API Endpoint Testing
```
FOR EACH API ENDPOINT:
| Endpoint | Method | Auth | Validation | Error Handling | Tests | Status |
|----------|--------|------|------------|----------------|-------|--------|

VERIFY EACH HAS:
□ Route handler implemented
□ Input validation (DTOs)
□ Authentication guard (if required)
□ Authorization check (if required)
□ Proper error responses
□ Integration tests
BLOCKING: Any endpoint without tests = FAIL
```

### 5.3 External Service Integration
```
FOR EACH EXTERNAL SERVICE:
| Service | Purpose | Config | Error Handling | Timeout | Fallback | Tests |
|---------|---------|--------|----------------|---------|----------|-------|

VERIFY:
□ Configuration externalized (env vars)
□ Connection error handling
□ Timeout handling configured
□ Retry logic implemented
□ Fallback behavior defined
□ Circuit breaker pattern (if applicable)
BLOCKING: Missing error handling = FAIL
```

### 5.4 Message Queue Integration (if applicable)
```
VERIFY:
□ Queue connection configured
□ Message publishing works
□ Message consuming works
□ Dead letter queue configured
□ Retry policy configured
□ Message acknowledgment correct
REPORT: [checklist status]
```

### 5.5 Cache Integration (if applicable)
```
VERIFY:
□ Cache connection configured
□ Cache read/write works
□ Cache invalidation works
□ TTL configured appropriately
□ Cache miss handling correct
□ Cache failure fallback exists
REPORT: [checklist status]
```

---

## PHASE 6: CONTRACT TESTING

### 6.1 API Response Structure Verification
```
FOR EACH API ENDPOINT:
DOCUMENT:
- Expected response structure
- Actual response structure
- Match status

COMMON PATTERNS TO VERIFY:
□ Response wrapper consistency: { success, data, meta, error }
□ Pagination structure: { items, total, page, limit }
□ Error structure: { code, message, details }
□ Date format: ISO 8601
□ ID format consistency
BLOCKING: Any mismatch = FAIL
```

### 6.2 Frontend-Backend Type Synchronization
```
VERIFY:
□ Backend DTOs match frontend types
□ Enum values synchronized
□ Optional/required fields consistent
□ Nullable fields handled correctly
□ Array types match
REPORT: List any mismatches
BLOCKING: Any type mismatch = FAIL
```

### 6.3 API Version Compatibility
```
IF API versioning used:
□ v1 endpoints still work
□ Breaking changes only in new versions
□ Deprecation notices in place
□ Migration path documented
```

### 6.4 GraphQL Schema Validation (if applicable)
```
EXECUTE: Schema validation
VERIFY:
□ Schema compiles without errors
□ All resolvers implemented
□ Types match database models
□ Input validation present
```

---

## PHASE 7: END-TO-END TESTING

### 7.1 Critical User Flows
```
EXECUTE E2E TESTS FOR:

FLOW 1: User Registration
□ Navigate to registration page
□ Fill valid registration form
□ Submit form
□ Verify confirmation (email/redirect)
□ Verify user created in database
STATUS: [PASS/FAIL]

FLOW 2: User Login
□ Navigate to login page
□ Enter valid credentials
□ Submit form
□ Verify redirect to dashboard
□ Verify session/token created
STATUS: [PASS/FAIL]

FLOW 3: Password Reset
□ Navigate to forgot password
□ Enter email
□ Submit form
□ Verify email sent
□ Click reset link
□ Enter new password
□ Verify login with new password
STATUS: [PASS/FAIL]

FLOW 4: Core Business Flow
□ [Document project-specific main flow]
□ Step 1: [action]
□ Step 2: [action]
□ Step n: [action]
□ Verify expected outcome
STATUS: [PASS/FAIL]

FLOW 5: User Logout
□ Click logout
□ Verify redirect to login
□ Verify session invalidated
□ Verify protected routes inaccessible
STATUS: [PASS/FAIL]

BLOCKING: Any critical flow failure = FAIL
```

### 7.2 E2E Test Execution
```
EXECUTE: npm run test:e2e (or equivalent)
REPORT:
- Total scenarios: [number]
- Passed: [number]
- Failed: [number]
- Duration: [time]
- Screenshots/videos: [if captured]
BLOCKING: Any failure = FAIL
```

### 7.3 Error Scenario Testing
```
TEST ERROR HANDLING:
□ Invalid form submission shows errors
□ 404 page displays correctly
□ 500 error shows user-friendly message
□ Network timeout shows appropriate message
□ Session expiry redirects to login
□ Unauthorized access shows 403
REPORT: [checklist status]
```

---

## PHASE 8: PERFORMANCE TESTING

### 8.1 Build Performance
```
EXECUTE: npm run build
REPORT:
- Build time: [duration]
- Build status: [success/fail]
- Output size: [total KB/MB]
- Largest bundles: [list top 5]
- Warnings: [count and list]
THRESHOLDS:
- Build time: <5 minutes
- Bundle size: <500KB (gzipped, for web)
BLOCKING: Build failure = FAIL
```

### 8.2 Bundle Analysis (Frontend)
```
EXECUTE: Bundle analysis
REPORT:
| Bundle | Size (gzip) | Status |
|--------|-------------|--------|
| main | [size] | [OK/WARN] |
| vendor | [size] | [OK/WARN] |
| [chunk] | [size] | [OK/WARN] |

VERIFY:
□ No duplicate dependencies
□ Tree shaking working
□ Code splitting effective
□ Lazy loading implemented
```

### 8.3 API Response Time Baseline
```
MEASURE for each critical endpoint:
| Endpoint | Method | Avg (ms) | P95 (ms) | P99 (ms) | Status |
|----------|--------|----------|----------|----------|--------|

THRESHOLDS:
- Avg: <200ms
- P95: <500ms
- P99: <1000ms
BLOCKING: Any endpoint >1000ms avg = FAIL
```

### 8.4 Database Query Performance
```
IDENTIFY slow queries:
| Query | Avg Time | Rows Scanned | Index Used | Status |
|-------|----------|--------------|------------|--------|

VERIFY:
□ All queries use indexes
□ No N+1 query patterns
□ Connection pool sized correctly
□ Query timeout configured
BLOCKING: Any query >1s = FAIL
```

### 8.5 Load Testing (if infrastructure available)
```
EXECUTE: npm run test:load (k6, Artillery, etc.)
SCENARIOS:
- Normal load: [X] concurrent users
- Peak load: [Y] concurrent users
- Stress test: [Z] concurrent users

REPORT:
| Scenario | RPS | Avg Response | Error Rate | Status |
|----------|-----|--------------|------------|--------|
| Normal | [n] | [ms] | [%] | [PASS/FAIL] |
| Peak | [n] | [ms] | [%] | [PASS/FAIL] |
| Stress | [n] | [ms] | [%] | [INFO] |

THRESHOLDS:
- Error rate: <1% at normal load
- Error rate: <5% at peak load
BLOCKING: >1% errors at normal load = FAIL
```

### 8.6 Memory Leak Detection
```
EXECUTE: Memory profiling during tests
VERIFY:
□ Memory usage stable over time
□ No memory growth pattern
□ Garbage collection working
□ No dangling references
REPORT: Memory trend graph/data
BLOCKING: Detected memory leak = FAIL
```

---

## PHASE 9: ACCESSIBILITY TESTING

### 9.1 Automated Accessibility Scan
```
EXECUTE: npm run test:accessibility (axe, pa11y, etc.)
REPORT:
| Severity | Count | Status |
|----------|-------|--------|
| Critical | [n] | BLOCKING |
| Serious | [n] | BLOCKING |
| Moderate | [n] | WARNING |
| Minor | [n] | INFO |

BLOCKING: >0 Critical OR >0 Serious = FAIL
```

### 9.2 WCAG 2.2 Compliance Checklist
```
LEVEL A (MUST HAVE):
□ 1.1.1 Non-text Content: All images have alt text
□ 1.2.1 Audio-only/Video-only: Alternatives provided
□ 1.3.1 Info and Relationships: Semantic HTML used
□ 1.3.2 Meaningful Sequence: Reading order logical
□ 1.4.1 Use of Color: Color not sole indicator
□ 2.1.1 Keyboard: All functionality keyboard accessible
□ 2.1.2 No Keyboard Trap: Focus can move freely
□ 2.4.1 Bypass Blocks: Skip links provided
□ 2.4.2 Page Titled: Descriptive page titles
□ 3.1.1 Language of Page: Lang attribute set
□ 4.1.1 Parsing: Valid HTML
□ 4.1.2 Name, Role, Value: ARIA properly used

LEVEL AA (SHOULD HAVE):
□ 1.4.3 Contrast (Minimum): 4.5:1 for text
□ 1.4.4 Resize Text: Readable at 200% zoom
□ 1.4.10 Reflow: No horizontal scroll at 320px
□ 2.4.6 Headings and Labels: Descriptive
□ 2.4.7 Focus Visible: Focus indicator visible
□ 3.2.3 Consistent Navigation: Same order
□ 3.2.4 Consistent Identification: Same function = same name

REPORT: [checklist status]
BLOCKING: Any Level A failure = FAIL
```

### 9.3 Keyboard Navigation Testing
```
VERIFY:
□ Tab order is logical
□ All interactive elements focusable
□ Focus visible on all elements
□ Modal focus trap works correctly
□ Escape closes modals
□ Arrow keys work in menus/lists
□ Enter/Space activate buttons
REPORT: [checklist status]
BLOCKING: Any keyboard issue = FAIL
```

### 9.4 Screen Reader Testing
```
VERIFY (with NVDA/VoiceOver):
□ Page title announced
□ Headings navigable
□ Links have descriptive text
□ Form fields have labels
□ Error messages announced
□ Dynamic content announced (aria-live)
□ Images described (alt text)
REPORT: [checklist status]
```

---

## PHASE 10: UI & VISUAL TESTING

### 10.1 Visual Regression Testing
```
EXECUTE: npm run test:visual (Percy, Chromatic, BackstopJS)
COMPARE against baseline:
□ Homepage
□ Login page
□ Dashboard
□ All critical user flows
□ Error states
□ Empty states
□ Loading states

REPORT:
- Visual diffs detected: [count]
- Intentional changes: [count]
- Unintentional changes: [count]
BLOCKING: Unintentional visual changes = FAIL
```

### 10.2 Cross-Browser Testing
```
EXECUTE tests on:
| Browser | Version | Status | Issues |
|---------|---------|--------|--------|
| Chrome | latest | [PASS/FAIL] | [list] |
| Firefox | latest | [PASS/FAIL] | [list] |
| Safari | latest | [PASS/FAIL] | [list] |
| Edge | latest | [PASS/FAIL] | [list] |
| Chrome Mobile | latest | [PASS/FAIL] | [list] |
| Safari iOS | latest | [PASS/FAIL] | [list] |

BLOCKING: Any major browser failure = FAIL
```

### 10.3 Responsive Design Testing
```
TEST at breakpoints:
| Breakpoint | Width | Status | Issues |
|------------|-------|--------|--------|
| Mobile S | 320px | [PASS/FAIL] | [list] |
| Mobile L | 425px | [PASS/FAIL] | [list] |
| Tablet | 768px | [PASS/FAIL] | [list] |
| Laptop | 1024px | [PASS/FAIL] | [list] |
| Desktop | 1440px | [PASS/FAIL] | [list] |
| 4K | 2560px | [PASS/FAIL] | [list] |

VERIFY at each:
□ No horizontal scroll
□ Text readable
□ Touch targets ≥44x44px (mobile)
□ Navigation accessible
□ Images responsive
□ Forms usable
BLOCKING: Any breakpoint failure = FAIL
```

### 10.4 Component Snapshot Testing
```
EXECUTE: npm run test:snapshot
REPORT:
- Snapshots total: [count]
- Snapshots passed: [count]
- Snapshots updated: [count]
- Snapshots failed: [count]
BLOCKING: Unintentional snapshot changes = FAIL
```

### 10.5 Animation & Interaction Testing
```
VERIFY:
□ Loading states render correctly
□ Transitions complete smoothly (<300ms)
□ No layout shift during interactions (CLS <0.1)
□ Hover states visible
□ Focus states visible
□ Active states provide feedback
□ Disabled states clearly indicated
REPORT: [checklist status]
```

### 10.6 Dark Mode Testing (if applicable)
```
VERIFY:
□ All components support dark mode
□ Color contrast maintained
□ Images/icons visible
□ No hardcoded colors
□ Theme toggle works
□ System preference respected
REPORT: [checklist status]
```

---

## PHASE 11: DOCUMENTATION VERIFICATION

### 11.1 Code Documentation
```
VERIFY:
□ README.md exists and is current
□ API documentation exists (Swagger/OpenAPI)
□ Environment setup documented
□ Deployment steps documented
□ Troubleshooting guide exists
□ Architecture documentation exists
REPORT: [checklist status]
```

### 11.2 API Documentation
```
VERIFY:
□ All endpoints documented
□ Request/response schemas defined
□ Authentication requirements documented
□ Error responses documented
□ Examples provided
□ Swagger UI accessible (if applicable)
BLOCKING: Undocumented endpoints = FAIL
```

### 11.3 Environment Documentation
```
VERIFY:
□ .env.example exists
□ All required env vars documented
□ Default values provided where safe
□ Sensitive vars marked as required
□ Environment-specific configs documented
REPORT: [checklist status]
```

### 11.4 Inline Code Documentation
```
VERIFY:
□ Complex functions have JSDoc/docstrings
□ Public APIs documented
□ Configuration options documented
□ "Why" comments for non-obvious code
□ TODO comments have tickets
REPORT: [checklist status]
```

---

## PHASE 12: BUILD & DEPLOYMENT READINESS

### 12.1 Build Verification
```
EXECUTE: npm run build
VERIFY:
□ Build completes without errors
□ Output artifacts created
□ No console warnings (or all acknowledged)
□ Source maps generated (if required)
□ Assets optimized
REPORT: Build status and artifacts
BLOCKING: Build failure = FAIL
```

### 12.2 Environment Configuration
```
VERIFY:
□ All required env vars defined
□ No hardcoded environment values
□ Secrets in secure storage (not in code)
□ Environment-specific configs work
□ Default values are safe defaults
REPORT: [checklist status]
BLOCKING: Missing required env vars = FAIL
```

### 12.3 Docker/Container Readiness (if applicable)
```
EXECUTE: docker build
VERIFY:
□ Dockerfile valid
□ Multi-stage build used (if applicable)
□ Non-root user configured
□ Health check defined
□ No secrets in image
□ Image size reasonable (<500MB)
□ Container starts successfully
□ Health check passes
REPORT: Image details and health status
BLOCKING: Container won't start = FAIL
```

### 12.4 CI/CD Pipeline Verification
```
VERIFY:
□ Pipeline configuration valid
□ All stages defined
□ Tests run in pipeline
□ Linting runs in pipeline
□ Security scan runs in pipeline
□ Build artifacts created
□ Deployment steps defined
□ Rollback procedure exists
REPORT: [checklist status]
```

### 12.5 Infrastructure Readiness
```
VERIFY:
□ Target environment provisioned
□ Database accessible
□ Cache accessible (if used)
□ Message queue accessible (if used)
□ External services configured
□ SSL certificates valid
□ DNS configured
□ Load balancer configured (if used)
□ Monitoring configured
□ Logging configured
REPORT: [checklist status]
BLOCKING: Any infrastructure issue = FAIL
```

---

# PART 2: HUMAN VALIDATION (Shift-Right Pre-Release)

---

## PHASE 13: ALPHA TESTING (Internal Team)

### 13.1 Alpha Environment Setup
```
ENVIRONMENT:
- URL: [staging/alpha URL]
- Access: Internal team only
- Data: Synthetic test data
- Duration: 3-5 business days minimum

VERIFY SETUP:
□ Alpha environment deployed
□ Test data seeded
□ All team members have access
□ Bug tracking system ready
□ Communication channel established
```

### 13.2 Alpha Test Execution
```
INTERNAL TEAM MUST TEST:

USER REGISTRATION & AUTHENTICATION:
□ Register new account
□ Verify email (if applicable)
□ Login with valid credentials
□ Login with invalid credentials (verify error)
□ Password reset flow
□ Logout
□ Session timeout behavior

CORE BUSINESS FLOWS:
□ [Flow 1 - describe]
□ [Flow 2 - describe]
□ [Flow 3 - describe]

USER ROLES & PERMISSIONS:
□ Test as Admin user
□ Test as Regular user
□ Test as Guest (if applicable)
□ Verify permission restrictions work

EDGE CASES:
□ Empty states (no data)
□ Large data sets
□ Special characters in inputs
□ Boundary values
□ Concurrent operations

INTENTIONAL BREAK ATTEMPTS:
□ SQL injection attempts
□ XSS attempts
□ Invalid data submission
□ Rapid repeated submissions
□ Browser back/forward navigation
□ Multiple tabs with same session

DEVICE TESTING:
□ Desktop (Windows/Mac)
□ Tablet
□ Mobile phone
□ Different browsers
```

### 13.3 Alpha Bug Tracking
```
FOR EACH BUG FOUND:
| ID | Severity | Title | Steps | Expected | Actual | Status |
|----|----------|-------|-------|----------|--------|--------|

SEVERITY DEFINITIONS:
- P0 (Blocker): System unusable, data loss, security breach
- P1 (Critical): Major feature broken, no workaround
- P2 (Major): Feature impaired, workaround exists
- P3 (Minor): Cosmetic, minor inconvenience

BLOCKING: Any P0 or P1 bugs = CANNOT PROCEED TO BETA
```

### 13.4 Alpha Exit Criteria
```
REQUIRED FOR BETA PROMOTION:
□ All P0 bugs fixed and verified
□ All P1 bugs fixed and verified
□ Core flows work 100%
□ No data corruption issues
□ Performance acceptable (<3s page load)
□ No security vulnerabilities
□ Internal team sign-off obtained
  - Dev Lead: [signature/date]
  - QA Lead: [signature/date]
  - Product Owner: [signature/date]

DOCUMENT: Alpha Test Summary Report
```

---

## PHASE 14: BETA TESTING (Limited External Users)

### 14.1 Beta Environment Setup
```
ENVIRONMENT:
- URL: [beta/preview URL]
- Access: Selected external users (5-20% of target)
- Data: Real user data with consent
- Duration: 1-2 weeks minimum

PARTICIPANT SELECTION:
□ Mix of power users and novices
□ Geographic diversity
□ Device diversity
□ Representative demographics
□ Signed beta agreement/consent

MONITORING SETUP:
□ Error tracking active (Sentry/etc.)
□ Analytics tracking active
□ Performance monitoring active
□ User session recording active (with consent)
□ Feedback mechanism in-app
□ Support channel established
```

### 14.2 Beta Feature Flags
```
CONFIGURE:
| Feature | Flag Name | Default | Beta Users |
|---------|-----------|---------|------------|
| [Feature 1] | [flag] | OFF | ON |
| [Feature 2] | [flag] | OFF | ON |

VERIFY:
□ Flag toggle works without restart
□ User targeting rules work
□ Percentage rollout works
□ Fallback when flag service down
```

### 14.3 Beta Monitoring Dashboard
```
TRACK IN REAL-TIME:
- Active beta users: [count]
- Error rate: [%] (target: <1%)
- API response time P95: [ms] (target: <500ms)
- Page load time: [s] (target: <3s)
- Conversion funnel completion: [%]
- Feature adoption rate: [%]
- Session duration: [avg]
- Bounce rate: [%]

ALERT THRESHOLDS:
- Error rate >2%: ALERT
- Response time >1000ms: ALERT
- Significant funnel drop: ALERT
```

### 14.4 Beta Feedback Collection
```
COLLECT VIA:
□ In-app feedback widget
□ Post-session survey (NPS score)
□ Support ticket analysis
□ User interview sessions (3-5 users)
□ Heatmap analysis
□ Session recording review

FEEDBACK TEMPLATE:
- User ID: [anonymous]
- Feature used: [name]
- Issue type: Bug / Usability / Feature Request
- Description: [text]
- Severity (user perception): [1-5]
```

### 14.5 Beta Bug Triage
```
CATEGORIZE ALL REPORTED ISSUES:
| Priority | Response SLA | Action |
|----------|--------------|--------|
| P0 (Blocker) | 4 hours | Fix immediately, pause rollout |
| P1 (Critical) | 24 hours | Fix before GA |
| P2 (Major) | 1 week | Fix in next sprint |
| P3 (Minor) | Backlog | Schedule for future |

DAILY TRIAGE MEETING:
□ Review new bugs
□ Assign priorities
□ Assign owners
□ Track resolution
```

### 14.6 Beta Exit Criteria
```
REQUIRED FOR GA:
□ Error rate <1% sustained for 72 hours
□ NPS score ≥30 (or improving trend)
□ No P0/P1 bugs unresolved
□ Feature adoption >50% of beta users
□ Performance within SLA
□ No security incidents
□ User satisfaction >70%
□ Stakeholder sign-off:
  - Product Owner: [signature/date]
  - Engineering Lead: [signature/date]
  - QA Lead: [signature/date]
  - Customer Success: [signature/date]

DOCUMENT: Beta Test Summary Report
```

---

## PHASE 15: USER ACCEPTANCE TESTING (UAT)

### 15.1 UAT Environment Setup
```
ENVIRONMENT:
- URL: [UAT environment - production-like]
- Access: Business stakeholders, product owners
- Data: Production-like or sanitized production copy
- Duration: 3-5 business days

PARTICIPANTS:
- Product Owner(s)
- Business Analysts
- Key customers/stakeholders
- Compliance officer (if applicable)
- Security lead

VERIFY SETUP:
□ UAT environment deployed
□ Production-like data loaded
□ All stakeholders have access
□ Test case document prepared
□ Sign-off document prepared
```

### 15.2 UAT Test Cases
```
PREPARE TEST CASES FROM:
□ Original requirements/user stories
□ Acceptance criteria
□ Business process documentation
□ Regulatory requirements
□ Edge cases from production support

TEST CASE FORMAT:
| TC-ID | User Story | Scenario | Steps | Expected | Actual | Pass/Fail | Tester |
|-------|------------|----------|-------|----------|--------|-----------|--------|
```

### 15.3 UAT Execution Checklist
```
BUSINESS STAKEHOLDERS VERIFY:

FUNCTIONAL ACCEPTANCE:
□ All acceptance criteria met per user story
□ Business workflows complete successfully
□ Data displays correctly and accurately
□ Calculations are correct
□ Reports generate expected outputs
□ Search/filter functions work correctly

INTEGRATION ACCEPTANCE:
□ External system integrations work
□ Data sync is accurate
□ API responses are correct

USABILITY ACCEPTANCE:
□ UI is intuitive and user-friendly
□ Error messages are helpful
□ Help documentation accessible
□ Workflow is efficient

BUSINESS RULES:
□ All business rules enforced
□ Validation rules working
□ Authorization rules working

REGULATORY/COMPLIANCE (if applicable):
□ Audit trail functioning
□ Data retention rules applied
□ Privacy requirements met
□ Accessibility requirements met

BRANDING/MESSAGING:
□ Logo and branding correct
□ Messaging consistent
□ Legal disclaimers present
□ Copyright notices present
```

### 15.4 UAT Defect Management
```
IF DEFECTS FOUND:

CLASSIFY:
| Severity | Definition | Action |
|----------|------------|--------|
| Critical | Blocks business process | Must fix before go-live |
| High | Major impact, workaround exists | Should fix before go-live |
| Medium | Minor impact | Can defer with risk acceptance |
| Low | Cosmetic | Defer to post-launch |

FOR EACH DEFECT:
1. Document: ID, description, severity, steps
2. Business decision: Fix / Defer / Workaround / Accept risk
3. If fix required: Development → Retest → Verify
4. Update test case result
5. Update sign-off document
```

### 15.5 UAT Sign-Off
```
SIGN-OFF DOCUMENT:

PROJECT: [Name]
VERSION: [X.Y.Z]
UAT PERIOD: [Start Date] - [End Date]

TEST SUMMARY:
- Total Test Cases: [count]
- Passed: [count]
- Failed: [count]
- Deferred: [count]
- Not Tested: [count]

KNOWN ISSUES AT RELEASE:
| ID | Severity | Description | Workaround | Risk Acceptance |
|----|----------|-------------|------------|-----------------|

SIGN-OFF:
□ Product Owner: _____________ Date: _______
  "Functional requirements have been met"

□ Business Sponsor: _____________ Date: _______
  "Business value has been delivered"

□ Compliance Officer: _____________ Date: _______
  "Regulatory requirements have been met"

□ Security Lead: _____________ Date: _______
  "Security requirements have been met"

□ Operations Lead: _____________ Date: _______
  "System is operationally ready"

DEPLOYMENT AUTHORIZATION:
□ APPROVED for production deployment
□ APPROVED with conditions: [list conditions]
□ NOT APPROVED - must address: [list blockers]

Authorized by: _____________ Date: _______
```

---

# FINAL PRE-DEPLOYMENT REPORT

```
================================================================================
              PRE-DEPLOYMENT TESTING PROTOCOL - EXECUTION REPORT
================================================================================

Project: [name]
Version: [X.Y.Z]
Date: [timestamp]
Executed by: [AI Assistant / Team]

--------------------------------------------------------------------------------
EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Overall Status: [APPROVED / CONDITIONAL / NOT APPROVED]
Critical Issues: [count]
High Issues: [count]
Medium Issues: [count]
Low Issues: [count]

--------------------------------------------------------------------------------
PHASE RESULTS SUMMARY
--------------------------------------------------------------------------------

| # | Phase | Status | Critical | High | Medium | Low |
|---|-------|--------|----------|------|--------|-----|
| 1 | Project Discovery | [P/F] | [n] | [n] | [n] | [n] |
| 2 | Static Analysis | [P/F] | [n] | [n] | [n] | [n] |
| 3 | Security Scan | [P/F] | [n] | [n] | [n] | [n] |
| 4 | Unit Testing | [P/F] | [n] | [n] | [n] | [n] |
| 5 | Integration Testing | [P/F] | [n] | [n] | [n] | [n] |
| 6 | Contract Testing | [P/F] | [n] | [n] | [n] | [n] |
| 7 | E2E Testing | [P/F] | [n] | [n] | [n] | [n] |
| 8 | Performance Testing | [P/F] | [n] | [n] | [n] | [n] |
| 9 | Accessibility Testing | [P/F] | [n] | [n] | [n] | [n] |
| 10 | UI/Visual Testing | [P/F] | [n] | [n] | [n] | [n] |
| 11 | Documentation | [P/F] | [n] | [n] | [n] | [n] |
| 12 | Build/Deploy Ready | [P/F] | [n] | [n] | [n] | [n] |
| 13 | Alpha Testing | [P/F] | [n] | [n] | [n] | [n] |
| 14 | Beta Testing | [P/F] | [n] | [n] | [n] | [n] |
| 15 | UAT | [P/F] | [n] | [n] | [n] | [n] |

--------------------------------------------------------------------------------
BLOCKING ISSUES (Must Fix Before Deployment)
--------------------------------------------------------------------------------
1. [Issue description]
   - Phase: [#]
   - Severity: [Critical/High]
   - Location: [file:line or component]
   - Impact: [description]
   - Recommendation: [fix suggestion]

--------------------------------------------------------------------------------
HIGH PRIORITY ISSUES (Should Fix)
--------------------------------------------------------------------------------
1. [Issue description]
   - Phase: [#]
   - Severity: [High]
   - Impact: [description]
   - Recommendation: [fix suggestion]

--------------------------------------------------------------------------------
COVERAGE METRICS
--------------------------------------------------------------------------------
| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Line Coverage | [X%] | 80% | [P/F] |
| Branch Coverage | [X%] | 70% | [P/F] |
| Function Coverage | [X%] | 80% | [P/F] |
| E2E Flows Covered | [n/m] | 100% | [P/F] |
| Accessibility (A) | [n/n] | 100% | [P/F] |
| Accessibility (AA) | [n/n] | 100% | [P/F] |

--------------------------------------------------------------------------------
PERFORMANCE BASELINE
--------------------------------------------------------------------------------
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Build Time | [s] | <300s | [P/F] |
| Bundle Size | [KB] | <500KB | [P/F] |
| API P95 Latency | [ms] | <500ms | [P/F] |
| Page Load | [s] | <3s | [P/F] |
| LCP | [s] | <2.5s | [P/F] |
| FID | [ms] | <100ms | [P/F] |
| CLS | [score] | <0.1 | [P/F] |

--------------------------------------------------------------------------------
SIGN-OFFS OBTAINED
--------------------------------------------------------------------------------
□ Development Team Lead: [name] [date]
□ QA Lead: [name] [date]
□ Security Lead: [name] [date]
□ Product Owner: [name] [date]
□ Business Sponsor: [name] [date]
□ Operations Lead: [name] [date]

--------------------------------------------------------------------------------
DEPLOYMENT DECISION
--------------------------------------------------------------------------------
[ ] ✅ APPROVED - All checks passed, proceed with deployment
[ ] ⚠️ CONDITIONAL - Fix listed issues, then deploy
[ ] ❌ NOT APPROVED - Blocking issues must be resolved

Authorized by: _____________ Date: _______

================================================================================
                              END OF REPORT
================================================================================
```

---

## AI ASSISTANT FINAL INSTRUCTION

**YOU MUST:**
1. Execute every phase above systematically
2. Run actual commands (not just describe them)
3. Report actual results (not theoretical)
4. Document all issues found with evidence
5. Generate the final report
6. **BLOCK DEPLOYMENT** if Critical/High issues exist
7. Obtain human sign-offs for Alpha/Beta/UAT phases

**TWO-PASS REQUIREMENT:**
Run the entire protocol TWICE. Both passes must succeed for deployment approval.

**BEGIN EXECUTION NOW.**
