# Pre-Deployment Testing: Complete Verification Protocol

> **MANDATORY**: All checks must pass TWICE consecutively before any deployment.
> No exceptions. No partial passes. No bypassing for any reason.

---

## Phase 0: Pre-Verification Readiness

### 0.1 Environment Verification
```
□ Source branch is correct (feature → develop, develop → staging, staging → main)
□ All commits are signed
□ No merge conflicts pending
□ Branch is up to date with target
□ CI pipeline has completed
□ All pipeline stages green
□ No pending dependency updates with security issues
□ Environment variables documented
□ Secrets rotated if needed
□ Infrastructure provisioned
□ Database migrations ready
□ Rollback plan documented
□ Deployment window scheduled
□ On-call team notified
□ Stakeholders informed
```

### 0.2 Code Completeness Verification
```
□ All files in scope reviewed
□ No TODO comments for this release
□ No FIXME comments for this release
□ No console.log/print debug statements
□ No hardcoded credentials
□ No hardcoded environment-specific values
□ No commented-out code blocks
□ All imports used
□ No unused exports
□ No dead code paths
□ All error messages are user-friendly
□ All error codes are documented
□ Feature flags configured correctly
□ Analytics/telemetry events added
□ Logging statements appropriate
```

---

## Phase 1: Static Analysis

### 1.1 Code Quality Checks
```
□ ESLint/TSLint: 0 errors, 0 warnings
□ Prettier: All files formatted
□ TypeScript: strict mode, no errors
□ Stylelint (CSS): 0 errors
□ EditorConfig: All files compliant
□ File naming conventions followed
□ Directory structure correct
□ Import order correct
□ No circular dependencies
□ Complexity metrics within limits (cyclomatic < 10)
□ Maintainability index > 65
□ Code duplication < 3%
```

### 1.2 Security Static Analysis (SAST)
```
□ Snyk: No high/critical vulnerabilities
□ npm audit: No high/critical vulnerabilities  
□ SonarQube: Security hotspots reviewed
□ Semgrep: No security warnings
□ GitLeaks: No secrets detected
□ TruffleHog: No credentials in history
□ Bandit (Python): No security issues
□ Brakeman (Ruby): No security issues
□ OWASP Dependency Check: Pass
□ License compliance check: Pass
□ CVE database check: No known vulnerabilities
```

### 1.3 Type Safety Verification
```
□ TypeScript strict mode enabled
□ No any types (except justified)
□ No type assertions without validation
□ All function parameters typed
□ All return types explicit
□ No implicit any
□ Null checks enforced
□ Undefined checks enforced
□ Enum exhaustiveness checked
□ Discriminated unions exhaustive
□ Generic constraints correct
□ Declaration files generated
```

---

## Phase 2: Unit Testing

### 2.1 Coverage Requirements
```
□ Line coverage ≥ 80%
□ Branch coverage ≥ 80%
□ Function coverage ≥ 80%
□ Statement coverage ≥ 80%
□ New code coverage ≥ 90%
□ Critical paths coverage = 100%
□ Error handlers coverage = 100%
□ Edge cases coverage = 100%
□ No untested public methods
□ No untested exported functions
```

### 2.2 Test Quality Verification
```
□ All tests have meaningful names
□ All tests have clear assertions
□ No tests with only one assertion (where appropriate)
□ No tests that always pass
□ No tests that test implementation details
□ No flaky tests (run 3x to verify)
□ No tests dependent on execution order
□ No tests dependent on external state
□ No tests with hardcoded timeouts
□ All mocks properly cleaned up
□ All spies properly restored
□ Test data isolated per test
□ Snapshot tests reviewed
```

### 2.3 Unit Test Categories
```
□ Pure functions tested
□ Class methods tested
□ Static methods tested
□ Private methods tested via public interface
□ Constructors tested
□ Getters/setters tested
□ Event handlers tested
□ Callbacks tested
□ Promise handlers tested
□ Error throwing tested
□ Error catching tested
□ Validation logic tested
□ Business rules tested
□ Edge cases tested
□ Boundary conditions tested
□ Null/undefined inputs tested
□ Empty inputs tested
□ Invalid inputs tested
□ Concurrent access tested (where applicable)
```

---

## Phase 3: Integration Testing

### 3.1 API Integration Tests
```
□ All endpoints have tests
□ All HTTP methods tested per endpoint
□ All query parameters tested
□ All path parameters tested
□ All request body variations tested
□ All response codes verified
□ All response schemas validated
□ All error responses tested
□ Authentication required endpoints tested
□ Authorization levels tested
□ Rate limiting tested
□ Pagination tested
□ Sorting tested
□ Filtering tested
□ Search functionality tested
□ File upload tested
□ File download tested
□ Bulk operations tested
□ Batch operations tested
□ Webhook triggers tested
```

### 3.2 Database Integration Tests
```
□ CRUD operations verified
□ Transactions tested
□ Rollback behavior tested
□ Connection pooling tested
□ Query timeout handling tested
□ Deadlock handling tested
□ Constraint violations tested
□ Migration up tested
□ Migration down tested
□ Seed data verified
□ Index usage verified
□ Query performance acceptable
□ N+1 queries eliminated
□ Soft delete tested
□ Cascading operations tested
□ Triggers verified (if any)
□ Stored procedures verified (if any)
□ Views verified (if any)
```

### 3.3 Cache Integration Tests
```
□ Cache hit verified
□ Cache miss verified
□ Cache invalidation verified
□ Cache expiration verified
□ Cache eviction verified
□ Cache serialization verified
□ Cache deserialization verified
□ Cache key collision tested
□ Cache stampede prevention verified
□ Distributed cache sync verified
□ Cache failover tested
□ Cache recovery tested
```

### 3.4 External Service Integration Tests
```
□ OAuth providers tested (Google, Microsoft, etc.)
□ Payment gateway tested (sandbox)
□ Email service tested
□ SMS service tested
□ Push notification service tested
□ File storage service tested
□ CDN configuration tested
□ Analytics service tested
□ Monitoring service tested
□ Log aggregation tested
□ Search service tested (if any)
□ Queue service tested
□ Third-party APIs tested
□ Webhook receivers tested
□ Webhook senders tested
```

---

## Phase 4: Contract Testing

### 4.1 API Contract Verification
```
□ OpenAPI spec matches implementation
□ All documented endpoints exist
□ All existing endpoints documented
□ Request schemas match spec
□ Response schemas match spec
□ Error schemas match spec
□ Headers match spec
□ Query parameters match spec
□ Path parameters match spec
□ Content types match spec
□ Status codes match spec
□ Pagination format matches spec
□ Sorting format matches spec
□ Filtering format matches spec
```

### 4.2 Frontend-Backend Contract
```
□ API client matches server responses
□ Type definitions match backend
□ Enum values synchronized
□ Error codes synchronized
□ Response wrapper handled correctly
□ Null/undefined handling consistent
□ Date format consistent
□ Number precision consistent
□ Array handling consistent
□ Nested object handling consistent
□ Optional fields handled correctly
□ Deprecated fields handled correctly
```

### 4.3 Event Contract (if applicable)
```
□ Event schemas documented
□ Event producers tested
□ Event consumers tested
□ Event versioning handled
□ Event ordering handled
□ Event deduplication handled
□ Dead letter queue tested
□ Retry logic tested
□ Poison message handling tested
```

---

## Phase 5: End-to-End Testing

### 5.1 Critical User Journeys
```
□ Registration flow complete
□ Login flow complete
□ Password reset flow complete
□ Email verification flow complete
□ Profile update flow complete
□ Subscription/purchase flow complete
□ Core business flow complete (all steps)
□ Settings management flow complete
□ Data export flow complete
□ Account deletion flow complete
□ Logout flow complete
□ Session timeout handling complete
□ Multi-tab handling complete
□ Browser back/forward handling complete
```

### 5.2 Browser Compatibility
```
□ Chrome (latest) tested
□ Chrome (latest - 1) tested
□ Firefox (latest) tested
□ Firefox (latest - 1) tested
□ Safari (latest) tested
□ Safari (latest - 1) tested
□ Edge (latest) tested
□ Mobile Safari (iOS latest) tested
□ Chrome Mobile (Android latest) tested
□ Samsung Internet tested (if applicable)
□ All browsers: JavaScript enabled
□ All browsers: Cookies enabled
□ All browsers: LocalStorage works
□ All browsers: SessionStorage works
```

### 5.3 Responsive Design
```
□ Desktop (1920x1080) verified
□ Desktop (1366x768) verified
□ Laptop (1280x800) verified
□ Tablet landscape (1024x768) verified
□ Tablet portrait (768x1024) verified
□ Mobile landscape (667x375) verified
□ Mobile portrait (375x667) verified
□ Small mobile (320x568) verified
□ Large mobile (414x896) verified
□ Touch interactions work
□ Hover states have touch alternatives
□ Pinch zoom works where appropriate
□ Orientation change handled
□ Keyboard shows/hides correctly
□ Safe area insets handled
```

### 5.4 Offline/Network Conditions
```
□ Slow 3G connection tested
□ Offline mode tested (if applicable)
□ Network disconnect during operation tested
□ Network reconnect recovery tested
□ Request timeout handling tested
□ Retry behavior tested
□ Partial load handling tested
□ Progressive loading tested
□ Service worker caching tested (if applicable)
□ Background sync tested (if applicable)
```

---

## Phase 6: Security Testing

### 6.1 Authentication Security
```
□ Credential brute force protected
□ Account lockout works
□ Password complexity enforced
□ Password history checked (no reuse)
□ Session timeout enforced
□ Concurrent session limit enforced
□ Token expiration enforced
□ Token refresh secure
□ Logout invalidates sessions
□ Password change invalidates sessions
□ Remember me security verified
□ OAuth state parameter validated
□ MFA enforcement verified
□ MFA bypass impossible
```

### 6.2 Authorization Security
```
□ All endpoints require appropriate auth
□ Role-based access enforced
□ Resource-level permissions enforced
□ Horizontal privilege escalation blocked
□ Vertical privilege escalation blocked
□ IDOR vulnerabilities tested
□ Function-level access control verified
□ API key scoping verified
□ JWT claims validated
□ Deleted user access blocked
□ Suspended user access blocked
```

### 6.3 Input Validation Security
```
□ SQL injection tested
□ NoSQL injection tested
□ XSS (reflected) tested
□ XSS (stored) tested
□ XSS (DOM) tested
□ Command injection tested
□ Path traversal tested
□ SSRF tested
□ XXE tested
□ LDAP injection tested
□ Template injection tested
□ Header injection tested
□ File upload validation tested
□ File type validation tested
□ File size limits enforced
```

### 6.4 Security Headers
```
□ Content-Security-Policy configured
□ X-Content-Type-Options: nosniff
□ X-Frame-Options configured
□ X-XSS-Protection configured
□ Strict-Transport-Security configured
□ Referrer-Policy configured
□ Permissions-Policy configured
□ CORS properly restricted
□ Cookie security flags set
□ Cache-Control for sensitive data
```

### 6.5 Data Protection
```
□ PII encrypted at rest
□ PII encrypted in transit
□ Sensitive data not logged
□ Sensitive data not in URLs
□ Sensitive data not in error messages
□ Credit card data handled securely
□ GDPR compliance verified
□ Data retention enforced
□ Data deletion verified
□ Backup encryption verified
```

---

## Phase 7: Performance Testing

### 7.1 Load Testing
```
□ Expected load tested (100% normal traffic)
□ Peak load tested (200% normal traffic)
□ Sustained load tested (4 hours)
□ Response times within SLA
□ Error rate < 0.1% under normal load
□ Error rate < 1% under peak load
□ Memory usage stable
□ CPU usage acceptable
□ Connection pool not exhausted
□ Database connections stable
□ Cache hit rate acceptable
□ Bandwidth within limits
```

### 7.2 Stress Testing
```
□ Breaking point identified
□ Graceful degradation verified
□ Recovery after overload verified
□ No data corruption under stress
□ No security bypass under stress
□ Error messages appropriate
□ Logging continues under stress
□ Monitoring alerts triggered
□ Auto-scaling triggered (if applicable)
□ Circuit breakers activated (if applicable)
```

### 7.3 Performance Benchmarks
```
□ Page load time < 3s (3G)
□ Time to first byte < 500ms
□ First contentful paint < 1.5s
□ Largest contentful paint < 2.5s
□ Time to interactive < 3.5s
□ Cumulative layout shift < 0.1
□ First input delay < 100ms
□ API response time p50 < 100ms
□ API response time p95 < 500ms
□ API response time p99 < 1s
□ Database query time p95 < 100ms
□ Cache response time < 10ms
```

### 7.4 Resource Optimization
```
□ JavaScript bundle size acceptable
□ CSS bundle size acceptable
□ Images optimized
□ Fonts optimized
□ Gzip/Brotli compression enabled
□ HTTP/2 or HTTP/3 enabled
□ CDN configured
□ Cache headers optimized
□ Prefetching configured
□ Code splitting effective
□ Tree shaking effective
□ Lazy loading implemented
```

---

## Phase 8: Accessibility Testing

### 8.1 Automated Accessibility
```
□ axe-core: 0 critical violations
□ axe-core: 0 serious violations
□ axe-core: All warnings reviewed
□ WAVE: 0 errors
□ Lighthouse accessibility score ≥ 90
□ HTML validation passed
□ ARIA validation passed
□ Color contrast AA compliant (4.5:1)
□ Color contrast AAA compliant (7:1) for important content
```

### 8.2 Manual Accessibility
```
□ Keyboard navigation complete
□ Tab order logical
□ Focus visible on all elements
□ No keyboard traps
□ Skip links work
□ Screen reader tested (NVDA or VoiceOver)
□ Screen reader announces dynamic content
□ Form labels associated
□ Form errors announced
□ Images have alt text
□ Decorative images hidden
□ Videos have captions
□ Audio has transcript
□ No flashing content
□ Motion can be reduced
```

### 8.3 WCAG 2.2 Compliance
```
□ 1.1.1 Non-text Content (A)
□ 1.2.1 Audio-only and Video-only (A)
□ 1.2.2 Captions (A)
□ 1.2.3 Audio Description (A)
□ 1.2.5 Audio Description (AA)
□ 1.3.1 Info and Relationships (A)
□ 1.3.2 Meaningful Sequence (A)
□ 1.3.3 Sensory Characteristics (A)
□ 1.3.4 Orientation (AA)
□ 1.3.5 Identify Input Purpose (AA)
□ 1.4.1 Use of Color (A)
□ 1.4.2 Audio Control (A)
□ 1.4.3 Contrast (AA)
□ 1.4.4 Resize Text (AA)
□ 1.4.5 Images of Text (AA)
□ 1.4.10 Reflow (AA)
□ 1.4.11 Non-text Contrast (AA)
□ 1.4.12 Text Spacing (AA)
□ 1.4.13 Content on Hover/Focus (AA)
□ 2.1.1 Keyboard (A)
□ 2.1.2 No Keyboard Trap (A)
□ 2.1.4 Character Key Shortcuts (A)
□ 2.2.1 Timing Adjustable (A)
□ 2.2.2 Pause, Stop, Hide (A)
□ 2.3.1 Three Flashes (A)
□ 2.4.1 Bypass Blocks (A)
□ 2.4.2 Page Titled (A)
□ 2.4.3 Focus Order (A)
□ 2.4.4 Link Purpose (A)
□ 2.4.5 Multiple Ways (AA)
□ 2.4.6 Headings and Labels (AA)
□ 2.4.7 Focus Visible (AA)
□ 2.5.1 Pointer Gestures (A)
□ 2.5.2 Pointer Cancellation (A)
□ 2.5.3 Label in Name (A)
□ 2.5.4 Motion Actuation (A)
□ 3.1.1 Language of Page (A)
□ 3.1.2 Language of Parts (AA)
□ 3.2.1 On Focus (A)
□ 3.2.2 On Input (A)
□ 3.2.3 Consistent Navigation (AA)
□ 3.2.4 Consistent Identification (AA)
□ 3.3.1 Error Identification (A)
□ 3.3.2 Labels or Instructions (A)
□ 3.3.3 Error Suggestion (AA)
□ 3.3.4 Error Prevention (AA)
□ 4.1.1 Parsing (A) - Obsolete in 2.2
□ 4.1.2 Name, Role, Value (A)
□ 4.1.3 Status Messages (AA)
```

---

## Phase 9: Documentation Verification

### 9.1 Technical Documentation
```
□ README updated
□ API documentation updated
□ Architecture diagrams updated
□ Database schema documented
□ Environment setup documented
□ Deployment procedure documented
□ Rollback procedure documented
□ Troubleshooting guide updated
□ Changelog updated
□ Version number updated
□ Migration guide (if breaking changes)
□ Upgrade guide (if applicable)
```

### 9.2 User Documentation
```
□ User guide updated (if applicable)
□ FAQ updated
□ Help content updated
□ Error messages documented
□ New features documented
□ Changed features documented
□ Deprecated features documented
□ Known issues documented
□ Workarounds documented
```

### 9.3 Operational Documentation
```
□ Runbooks updated
□ Alert documentation updated
□ On-call procedures updated
□ Escalation procedures updated
□ Incident response procedures updated
□ Disaster recovery procedures updated
□ Backup procedures documented
□ Restore procedures documented
□ Monitoring dashboards configured
□ Log queries documented
```

---

## Phase 10: Pre-Deployment Checklist

### 10.1 Final Verification
```
□ All Phase 1-9 checks passed FIRST TIME
□ All Phase 1-9 checks passed SECOND TIME (consecutive)
□ No manual overrides or exceptions
□ All test results documented
□ Test evidence archived
□ Coverage reports archived
□ Security scan reports archived
□ Performance test reports archived
□ Accessibility audit archived
```

### 10.2 Deployment Readiness
```
□ Deployment artifacts built
□ Artifacts integrity verified (checksum)
□ Container images tagged
□ Container images scanned
□ Infrastructure ready
□ Database migrations ready
□ Feature flags configured
□ Rollback plan verified
□ Rollback tested in staging
□ Monitoring alerts configured
□ On-call team confirmed
□ Communication plan ready
□ Stakeholder approval obtained
□ Change ticket approved
□ Deployment window confirmed
```

### 10.3 Go/No-Go Decision
```
□ All mandatory checks: PASS
□ All critical issues: RESOLVED
□ All high issues: RESOLVED or ACCEPTED
□ Risk assessment: ACCEPTABLE
□ Rollback plan: VERIFIED
□ Monitoring: READY
□ Support team: NOTIFIED
□ Final approval: OBTAINED
```

---

## Execution Timeline

| Phase | Duration | Blocking |
|-------|----------|----------|
| Phase 0: Readiness | 30 min | Yes |
| Phase 1: Static Analysis | 10 min | Yes |
| Phase 2: Unit Testing | 5 min | Yes |
| Phase 3: Integration Testing | 15 min | Yes |
| Phase 4: Contract Testing | 10 min | Yes |
| Phase 5: E2E Testing | 30 min | Yes |
| Phase 6: Security Testing | 20 min | Yes |
| Phase 7: Performance Testing | 30 min | No* |
| Phase 8: Accessibility Testing | 20 min | Yes |
| Phase 9: Documentation | 15 min | No |
| Phase 10: Final Checklist | 15 min | Yes |
| **Total (first run)** | **~3 hours** | |
| **Total (second run)** | **~2.5 hours** | |
| **Total with fixes** | **~6-8 hours** | |

*Performance testing can run in parallel with security testing

---

## Automated Execution Script

```bash
#!/bin/bash
# pre-deploy-verification.sh

set -e  # Exit on any failure

echo "=========================================="
echo "PRE-DEPLOYMENT VERIFICATION - RUN $1 of 2"
echo "=========================================="

# Phase 1: Static Analysis
echo "Phase 1: Static Analysis..."
npm run lint
npm run type-check
npm run format:check
npm audit --audit-level=high
npx snyk test
npx gitleaks detect

# Phase 2: Unit Testing
echo "Phase 2: Unit Testing..."
npm run test:unit -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'

# Phase 3: Integration Testing
echo "Phase 3: Integration Testing..."
npm run test:integration

# Phase 4: Contract Testing
echo "Phase 4: Contract Testing..."
npm run test:contract

# Phase 5: E2E Testing
echo "Phase 5: E2E Testing..."
npx playwright test

# Phase 6: Security Testing
echo "Phase 6: Security Testing..."
npm run test:security

# Phase 7: Performance Testing
echo "Phase 7: Performance Testing..."
npm run test:performance

# Phase 8: Accessibility Testing
echo "Phase 8: Accessibility Testing..."
npm run test:accessibility

echo "=========================================="
echo "RUN $1 COMPLETE - ALL CHECKS PASSED"
echo "=========================================="

if [ "$1" == "1" ]; then
    echo "Starting second consecutive run..."
    ./pre-deploy-verification.sh 2
elif [ "$1" == "2" ]; then
    echo "=========================================="
    echo "TWO CONSECUTIVE RUNS COMPLETE"
    echo "DEPLOYMENT APPROVED"
    echo "=========================================="
fi
```
