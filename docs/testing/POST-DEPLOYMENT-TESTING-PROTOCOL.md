# POST-DEPLOYMENT TESTING PROTOCOL

> **INSTRUCTIONS FOR AI ASSISTANT**: When this file is added to a conversation, you MUST immediately begin executing the complete post-deployment testing protocol below. Do not wait for additional instructions. Execute systematically and report findings. This verifies that production is working correctly and catches anything missed pre-deployment.

---

## AUTOMATIC EXECUTION TRIGGER

**AI ASSISTANT: START EXECUTION NOW**

You are now in **Post-Deployment Testing Mode**. Execute all phases in order. For each section:
1. Run the actual checks/tests against PRODUCTION
2. Report PASS/FAIL status with evidence
3. Document any issues found
4. Escalate critical issues IMMEDIATELY
5. **TRIGGER ROLLBACK if critical issues detected**

**Do not skip any section. Do not summarize. Execute and verify.**

---

## PRE-EXECUTION: GATHER DEPLOYMENT CONTEXT

```
BEFORE STARTING, COLLECT:
□ Production URL: [URL]
□ Deployment timestamp: [time]
□ Version deployed: [X.Y.Z]
□ Previous version: [X.Y.Z]
□ Deployer: [name]
□ Change summary: [brief description]
□ Rollback procedure: [documented location]
□ On-call contact: [name/phone]
□ Monitoring dashboard URL: [URL]
□ Error tracking dashboard URL: [URL]
```

---

# PART 1: IMMEDIATE VERIFICATION (0-15 Minutes)

**CRITICAL: Complete within 15 minutes of deployment**

---

## PHASE 1: HEALTH CHECK VERIFICATION

### 1.1 Application Health Endpoints
```
EXECUTE NOW:

curl -s [production-url]/health
Expected: 200 OK with healthy status

curl -s [production-url]/api/health
Expected: 200 OK with all services healthy

REPORT:
| Endpoint | Status | Response Time | Result |
|----------|--------|---------------|--------|
| /health | [code] | [ms] | [PASS/FAIL] |
| /api/health | [code] | [ms] | [PASS/FAIL] |

ROLLBACK TRIGGER: Any health check fails = IMMEDIATE ROLLBACK
```

### 1.2 Database Connectivity
```
VERIFY:
□ Application can connect to database
□ Read operations work
□ Write operations work (if safe to test)
□ Connection pool healthy

EVIDENCE: Health check response or test query result
ROLLBACK TRIGGER: Database connectivity failure = IMMEDIATE ROLLBACK
```

### 1.3 External Service Connectivity
```
FOR EACH EXTERNAL SERVICE:
| Service | Status | Response Time | Result |
|---------|--------|---------------|--------|
| [Auth service] | [status] | [ms] | [PASS/FAIL] |
| [Payment service] | [status] | [ms] | [PASS/FAIL] |
| [Email service] | [status] | [ms] | [PASS/FAIL] |
| [Cache service] | [status] | [ms] | [PASS/FAIL] |

ROLLBACK TRIGGER: Critical service unavailable = IMMEDIATE ROLLBACK
```

### 1.4 SSL/TLS Verification
```
VERIFY:
□ HTTPS working
□ Certificate valid
□ Certificate not expiring within 30 days
□ Correct certificate chain
□ No mixed content warnings

EXECUTE: curl -vI https://[production-url] 2>&1 | grep -i ssl

ROLLBACK TRIGGER: SSL failure = IMMEDIATE ROLLBACK
```

### 1.5 DNS Resolution
```
VERIFY:
□ Domain resolves correctly
□ All subdomains resolve
□ CDN endpoints resolve

EXECUTE: nslookup [production-domain]

ROLLBACK TRIGGER: DNS failure = IMMEDIATE ROLLBACK
```

---

## PHASE 2: SMOKE TESTS (Critical Paths)

### 2.1 Homepage Load
```
EXECUTE:
□ Navigate to [production-url]
□ Verify page loads completely
□ Verify no JavaScript errors in console
□ Verify all assets load (images, CSS, JS)
□ Measure page load time

REPORT:
- Page load time: [seconds]
- JavaScript errors: [count]
- Failed assets: [list]
- Status: [PASS/FAIL]

ROLLBACK TRIGGER: Homepage broken = IMMEDIATE ROLLBACK
```

### 2.2 Authentication Flow
```
EXECUTE WITH TEST ACCOUNT:
□ Navigate to login page
□ Enter valid credentials
□ Submit login form
□ Verify redirect to dashboard/home
□ Verify session created
□ Verify user context loaded

REPORT:
- Login successful: [Yes/No]
- Redirect worked: [Yes/No]
- Session valid: [Yes/No]
- Time to complete: [seconds]
- Status: [PASS/FAIL]

ROLLBACK TRIGGER: Login broken = IMMEDIATE ROLLBACK
```

### 2.3 Core Business Flow
```
EXECUTE PRIMARY BUSINESS FLOW:
[Document specific steps for your application]

Step 1: [action] → Result: [PASS/FAIL]
Step 2: [action] → Result: [PASS/FAIL]
Step 3: [action] → Result: [PASS/FAIL]
...

VERIFY:
□ Flow completes successfully
□ Data saved correctly
□ Confirmation displayed
□ No errors encountered

ROLLBACK TRIGGER: Core business flow broken = IMMEDIATE ROLLBACK
```

### 2.4 Critical API Endpoints
```
TEST EACH CRITICAL ENDPOINT:
| Endpoint | Method | Auth | Status | Response Time | Result |
|----------|--------|------|--------|---------------|--------|
| /api/users/me | GET | Yes | [code] | [ms] | [PASS/FAIL] |
| /api/[critical] | GET | Yes | [code] | [ms] | [PASS/FAIL] |
| /api/[critical] | POST | Yes | [code] | [ms] | [PASS/FAIL] |

ROLLBACK TRIGGER: Critical API failure = IMMEDIATE ROLLBACK
```

### 2.5 Logout Flow
```
EXECUTE:
□ Click logout button
□ Verify redirect to login page
□ Verify session invalidated
□ Verify protected routes inaccessible
□ Verify no cached sensitive data

REPORT: Status: [PASS/FAIL]
```

---

## PHASE 3: ERROR MONITORING CHECK

### 3.1 Error Rate Comparison
```
COMPARE (last 15 minutes vs baseline):
| Metric | Baseline | Current | Change | Status |
|--------|----------|---------|--------|--------|
| Error count | [n] | [n] | [+/-n%] | [OK/ALERT] |
| Error rate | [%] | [%] | [+/-n%] | [OK/ALERT] |
| New error types | - | [n] | - | [OK/ALERT] |

ROLLBACK TRIGGER: 
- Error rate >2x baseline = IMMEDIATE ROLLBACK
- New critical error types = ESCALATE
```

### 3.2 Exception Tracking
```
CHECK ERROR TRACKING DASHBOARD (Sentry/etc.):
□ No new Critical exceptions
□ No new High frequency exceptions
□ No data corruption errors
□ No security-related errors
□ No database errors

NEW ERRORS SINCE DEPLOYMENT:
| Error | Count | Severity | Impact | Action |
|-------|-------|----------|--------|--------|

ROLLBACK TRIGGER: Critical exception pattern = EVALUATE ROLLBACK
```

### 3.3 Log Analysis
```
CHECK APPLICATION LOGS:
□ No ERROR level entries
□ No FATAL level entries
□ No stack traces
□ No connection errors
□ No timeout errors

GREP FOR CRITICAL PATTERNS:
grep -i "error\|exception\|fatal\|timeout\|connection refused" logs

SUSPICIOUS LOG ENTRIES:
| Timestamp | Level | Message | Action |
|-----------|-------|---------|--------|

ROLLBACK TRIGGER: Critical log patterns = EVALUATE ROLLBACK
```

---

# PART 2: GOLDEN HOUR MONITORING (15-60 Minutes)

**Monitor continuously for the first hour after deployment**

---

## PHASE 4: PERFORMANCE MONITORING

### 4.1 Response Time Tracking
```
MONITOR EVERY 5 MINUTES:
| Time | Endpoint | P50 (ms) | P95 (ms) | P99 (ms) | Status |
|------|----------|----------|----------|----------|--------|
| +15m | /api/main | [ms] | [ms] | [ms] | [OK/WARN] |
| +20m | /api/main | [ms] | [ms] | [ms] | [OK/WARN] |
| +25m | /api/main | [ms] | [ms] | [ms] | [OK/WARN] |
...

THRESHOLDS:
- P50: <200ms (OK), 200-500ms (WARN), >500ms (ALERT)
- P95: <500ms (OK), 500-1000ms (WARN), >1000ms (ALERT)
- P99: <1000ms (OK), 1000-2000ms (WARN), >2000ms (ALERT)

ROLLBACK TRIGGER: Sustained P95 >2x baseline for 15 minutes = ROLLBACK
```

### 4.2 Throughput Monitoring
```
TRACK:
| Time | Requests/sec | Baseline | Deviation | Status |
|------|--------------|----------|-----------|--------|
| +15m | [n] | [n] | [+/-n%] | [OK/WARN] |
| +30m | [n] | [n] | [+/-n%] | [OK/WARN] |
| +45m | [n] | [n] | [+/-n%] | [OK/WARN] |
| +60m | [n] | [n] | [+/-n%] | [OK/WARN] |

ALERT THRESHOLD: >20% drop in throughput = INVESTIGATE
```

### 4.3 Resource Utilization
```
MONITOR:
| Resource | Current | Threshold | Status |
|----------|---------|-----------|--------|
| CPU | [%] | <70% | [OK/WARN/CRIT] |
| Memory | [%] | <80% | [OK/WARN/CRIT] |
| Disk | [%] | <85% | [OK/WARN/CRIT] |
| DB Connections | [n/max] | <80% | [OK/WARN/CRIT] |
| Thread Pool | [n/max] | <80% | [OK/WARN/CRIT] |

ALERT THRESHOLDS:
- >70% CPU sustained = WARN
- >80% Memory sustained = WARN
- >90% any resource = CRITICAL

ROLLBACK TRIGGER: Resource exhaustion pattern = EVALUATE ROLLBACK
```

### 4.4 Database Performance
```
MONITOR:
| Metric | Current | Baseline | Status |
|--------|---------|----------|--------|
| Query time (avg) | [ms] | [ms] | [OK/WARN] |
| Slow queries | [count] | [count] | [OK/WARN] |
| Active connections | [n] | [n] | [OK/WARN] |
| Lock waits | [count] | [count] | [OK/WARN] |
| Deadlocks | [count] | 0 | [OK/CRIT] |

ALERT TRIGGERS:
- >2x slow queries = WARN
- Any deadlocks = INVESTIGATE
- Connection pool exhaustion = CRITICAL
```

### 4.5 Cache Performance (if applicable)
```
MONITOR:
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Hit rate | [%] | >90% | [OK/WARN] |
| Miss rate | [%] | <10% | [OK/WARN] |
| Eviction rate | [/sec] | baseline | [OK/WARN] |
| Memory usage | [%] | <80% | [OK/WARN] |

ALERT TRIGGER: Hit rate <80% = INVESTIGATE
```

---

## PHASE 5: ERROR RATE MONITORING

### 5.1 HTTP Error Rates
```
TRACK EVERY 5 MINUTES:
| Time | 4xx Rate | 5xx Rate | Total Errors | Status |
|------|----------|----------|--------------|--------|
| +15m | [%] | [%] | [n] | [OK/WARN/CRIT] |
| +20m | [%] | [%] | [n] | [OK/WARN/CRIT] |
...

THRESHOLDS:
- 4xx rate: <2% OK, 2-5% WARN, >5% ALERT
- 5xx rate: <0.5% OK, 0.5-1% WARN, >1% CRITICAL

ROLLBACK TRIGGER: 5xx rate >2% sustained 10 minutes = ROLLBACK
```

### 5.2 Business Error Rates
```
TRACK APPLICATION-SPECIFIC ERRORS:
| Error Type | Count/5min | Baseline | Deviation | Status |
|------------|------------|----------|-----------|--------|
| Payment failures | [n] | [n] | [+/-n%] | [status] |
| Auth failures | [n] | [n] | [+/-n%] | [status] |
| Validation errors | [n] | [n] | [+/-n%] | [status] |
| [Custom error] | [n] | [n] | [+/-n%] | [status] |

ALERT TRIGGER: >50% increase in any business error = INVESTIGATE
```

### 5.3 Failed Transaction Monitoring
```
TRACK:
| Transaction Type | Attempts | Failures | Rate | Status |
|------------------|----------|----------|------|--------|
| User registration | [n] | [n] | [%] | [status] |
| Order submission | [n] | [n] | [%] | [status] |
| Payment processing | [n] | [n] | [%] | [status] |
| [Custom] | [n] | [n] | [%] | [status] |

ROLLBACK TRIGGER: Critical transaction failure rate >5% = ROLLBACK
```

---

## PHASE 6: FEATURE FLAG VERIFICATION (If Using Feature Flags)

### 6.1 Feature Flag Status
```
VERIFY ALL FLAGS:
| Flag Name | Expected | Actual | Users Affected | Status |
|-----------|----------|--------|----------------|--------|
| [feature_1] | [on/off] | [on/off] | [%] | [OK/MISMATCH] |
| [feature_2] | [on/off] | [on/off] | [%] | [OK/MISMATCH] |

MISMATCH = INVESTIGATE IMMEDIATELY
```

### 6.2 Gradual Rollout Verification
```
IF USING GRADUAL ROLLOUT:
| Rollout Stage | Target % | Actual % | Status |
|---------------|----------|----------|--------|
| Current | [%] | [%] | [OK/MISMATCH] |

VERIFY:
□ Correct percentage of users seeing new feature
□ Control group unaffected
□ No feature leakage
```

### 6.3 Feature-Specific Metrics
```
FOR EACH NEW FEATURE:
| Feature | Metric | Baseline | Current | Status |
|---------|--------|----------|---------|--------|
| [Feature A] | Error rate | [%] | [%] | [status] |
| [Feature A] | Latency | [ms] | [ms] | [status] |
| [Feature A] | Adoption | - | [%] | [info] |

FLAG FOR INVESTIGATION: Any feature with error rate >2x control
```

---

## PHASE 7: CANARY ANALYSIS (If Using Canary Deployment)

### 7.1 Canary vs Baseline Comparison
```
COMPARE CANARY TO BASELINE:
| Metric | Baseline | Canary | Difference | Status |
|--------|----------|--------|------------|--------|
| Error rate | [%] | [%] | [+/-n%] | [PASS/FAIL] |
| Latency P50 | [ms] | [ms] | [+/-n%] | [PASS/FAIL] |
| Latency P95 | [ms] | [ms] | [+/-n%] | [PASS/FAIL] |
| Latency P99 | [ms] | [ms] | [+/-n%] | [PASS/FAIL] |
| Success rate | [%] | [%] | [+/-n%] | [PASS/FAIL] |

AUTO-ROLLBACK THRESHOLDS:
- Error rate >2x baseline = AUTO-ROLLBACK
- Latency P95 >3x baseline = AUTO-ROLLBACK
- Success rate <95% = AUTO-ROLLBACK
```

### 7.2 Canary Promotion Criteria
```
PROMOTE CANARY WHEN ALL TRUE:
□ Error rate within 10% of baseline for 30 minutes
□ Latency within 20% of baseline for 30 minutes
□ No new error types
□ Resource utilization normal
□ No user-reported issues

PROMOTION DECISION: [PROMOTE / HOLD / ROLLBACK]
```

---

# PART 3: EXTENDED MONITORING (1-24 Hours)

---

## PHASE 8: 24-HOUR STABILITY VERIFICATION

### 8.1 Trend Analysis
```
TRACK HOURLY:
| Hour | Error Rate | P95 Latency | CPU | Memory | Status |
|------|------------|-------------|-----|--------|--------|
| +1h | [%] | [ms] | [%] | [%] | [status] |
| +2h | [%] | [ms] | [%] | [%] | [status] |
| +4h | [%] | [ms] | [%] | [%] | [status] |
| +8h | [%] | [ms] | [%] | [%] | [status] |
| +12h | [%] | [ms] | [%] | [%] | [status] |
| +24h | [%] | [ms] | [%] | [%] | [status] |

VERIFY:
□ No upward trend in errors
□ No upward trend in latency
□ No memory leak pattern (steady growth)
□ No connection pool leak
□ Performance stable across traffic patterns
```

### 8.2 Memory Leak Detection
```
ANALYZE MEMORY TREND:
| Time | Heap Used | Heap Total | External | Trend |
|------|-----------|------------|----------|-------|
| +1h | [MB] | [MB] | [MB] | [stable/growing] |
| +4h | [MB] | [MB] | [MB] | [stable/growing] |
| +8h | [MB] | [MB] | [MB] | [stable/growing] |
| +24h | [MB] | [MB] | [MB] | [stable/growing] |

ALERT: Consistent growth pattern = MEMORY LEAK SUSPECTED
```

### 8.3 Connection Pool Health
```
VERIFY OVER 24 HOURS:
□ Database connections not leaking
□ HTTP connections properly closed
□ WebSocket connections managed correctly
□ File descriptors not leaking

EVIDENCE: Connection count trends
```

### 8.4 Log Volume Analysis
```
COMPARE LOG VOLUME:
| Log Level | Pre-Deploy (24h) | Post-Deploy (24h) | Change |
|-----------|------------------|-------------------|--------|
| ERROR | [count] | [count] | [+/-n%] |
| WARN | [count] | [count] | [+/-n%] |
| INFO | [count] | [count] | [+/-n%] |

ALERT: >50% increase in ERROR logs = INVESTIGATE
```

---

## PHASE 9: REAL USER MONITORING (RUM)

### 9.1 Core Web Vitals
```
TRACK FROM REAL USERS:
| Metric | Good | Needs Work | Poor | Status |
|--------|------|------------|------|--------|
| LCP (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s | [status] |
| FID (First Input Delay) | <100ms | 100-300ms | >300ms | [status] |
| CLS (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 | [status] |
| INP (Interaction to Next Paint) | <200ms | 200-500ms | >500ms | [status] |
| TTFB (Time to First Byte) | <800ms | 800-1800ms | >1800ms | [status] |

TARGET: >75% of users in "Good" range for all metrics
```

### 9.2 Page Performance by Geography
```
TRACK BY REGION:
| Region | Page Load | LCP | FID | Status |
|--------|-----------|-----|-----|--------|
| North America | [s] | [s] | [ms] | [status] |
| Europe | [s] | [s] | [ms] | [status] |
| Asia Pacific | [s] | [s] | [ms] | [status] |
| Other | [s] | [s] | [ms] | [status] |

ALERT: Any region >2x others = INVESTIGATE CDN/routing
```

### 9.3 Browser/Device Performance
```
TRACK BY PLATFORM:
| Platform | Sessions | Errors | Avg Load Time | Status |
|----------|----------|--------|---------------|--------|
| Chrome Desktop | [n] | [n] | [s] | [status] |
| Chrome Mobile | [n] | [n] | [s] | [status] |
| Safari Desktop | [n] | [n] | [s] | [status] |
| Safari iOS | [n] | [n] | [s] | [status] |
| Firefox | [n] | [n] | [s] | [status] |
| Edge | [n] | [n] | [s] | [status] |

ALERT: Any platform with >5% error rate = INVESTIGATE
```

### 9.4 JavaScript Error Tracking
```
NEW JS ERRORS SINCE DEPLOYMENT:
| Error Message | Count | Browsers | Impact | Priority |
|---------------|-------|----------|--------|----------|
| [error] | [n] | [list] | [%users] | [P0-P3] |

ROLLBACK CONSIDERATION: JS error affecting >5% users = EVALUATE
```

---

## PHASE 10: USER EXPERIENCE VERIFICATION

### 10.1 User Journey Completion Rates
```
COMPARE TO BASELINE:
| Journey | Baseline | Current | Change | Status |
|---------|----------|---------|--------|--------|
| Registration complete | [%] | [%] | [+/-n%] | [status] |
| Login success | [%] | [%] | [+/-n%] | [status] |
| [Core flow] complete | [%] | [%] | [+/-n%] | [status] |
| Purchase complete | [%] | [%] | [+/-n%] | [status] |

ALERT: >10% drop in any completion rate = INVESTIGATE
```

### 10.2 Session Metrics
```
COMPARE:
| Metric | Baseline | Current | Change | Status |
|--------|----------|---------|--------|--------|
| Avg session duration | [min] | [min] | [+/-n%] | [status] |
| Pages per session | [n] | [n] | [+/-n%] | [status] |
| Bounce rate | [%] | [%] | [+/-n%] | [status] |
| Return visitor rate | [%] | [%] | [+/-n%] | [status] |

ALERT: >20% negative change = INVESTIGATE
```

### 10.3 Conversion Funnel Analysis
```
COMPARE FUNNEL:
| Step | Baseline | Current | Drop-off | Status |
|------|----------|---------|----------|--------|
| Landing | [n] | [n] | - | [status] |
| Step 1 | [n] | [n] | [%] | [status] |
| Step 2 | [n] | [n] | [%] | [status] |
| Conversion | [n] | [n] | [%] | [status] |

ALERT: Any step with >5% increased drop-off = INVESTIGATE
```

---

## PHASE 11: USER FEEDBACK MONITORING

### 11.1 Support Ticket Analysis
```
MONITOR:
| Time Period | New Tickets | Baseline | Category Breakdown |
|-------------|-------------|----------|-------------------|
| 0-1h | [n] | [n] | Bug: [n], Help: [n], Feature: [n] |
| 1-4h | [n] | [n] | Bug: [n], Help: [n], Feature: [n] |
| 4-24h | [n] | [n] | Bug: [n], Help: [n], Feature: [n] |

ALERT: >30% increase in bug tickets = INVESTIGATE
```

### 11.2 In-App Feedback
```
ANALYZE FEEDBACK SINCE DEPLOYMENT:
| Sentiment | Count | Topics |
|-----------|-------|--------|
| Positive | [n] | [keywords] |
| Neutral | [n] | [keywords] |
| Negative | [n] | [keywords] |

NEW NEGATIVE THEMES:
- [Theme 1]: [count] mentions
- [Theme 2]: [count] mentions

ALERT: New negative theme with >5 mentions = INVESTIGATE
```

### 11.3 Social Media Monitoring
```
MONITOR FOR PROJECT MENTIONS:
□ Twitter/X mentions
□ Reddit discussions
□ App store reviews (if applicable)
□ Community forums

NEW ISSUES REPORTED:
| Platform | Issue | Count | Severity |
|----------|-------|-------|----------|

ALERT: Viral negative report = ESCALATE IMMEDIATELY
```

### 11.4 NPS Score Tracking (if available)
```
COMPARE NPS:
| Period | NPS Score | Baseline | Change |
|--------|-----------|----------|--------|
| Post-deploy (24h) | [score] | [score] | [+/-n] |

ALERT: NPS drop >10 points = INVESTIGATE
```

---

# PART 4: PRODUCTION VALIDATION TESTS

---

## PHASE 12: RE-RUN E2E TESTS IN PRODUCTION

### 12.1 Production Smoke Tests
```
EXECUTE AGAINST PRODUCTION (with test account):

TEST 1: Homepage Load
□ Execute: Navigate to production URL
□ Verify: Page loads in <3 seconds
□ Verify: No JS errors
□ Result: [PASS/FAIL]

TEST 2: User Authentication
□ Execute: Login with test credentials
□ Verify: Successful login
□ Verify: Dashboard loads
□ Verify: User context correct
□ Result: [PASS/FAIL]

TEST 3: Core Business Flow
□ Execute: [specific flow steps]
□ Verify: Flow completes
□ Verify: Data saved correctly
□ Result: [PASS/FAIL]

TEST 4: API Endpoints
□ Execute: Call critical APIs
□ Verify: Correct responses
□ Verify: Response times acceptable
□ Result: [PASS/FAIL]

TEST 5: Logout
□ Execute: Logout
□ Verify: Session cleared
□ Verify: Redirect to login
□ Result: [PASS/FAIL]

ROLLBACK TRIGGER: Any smoke test fails = EVALUATE ROLLBACK
```

### 12.2 Data Integrity Verification
```
VERIFY:
□ No orphaned records created
□ No duplicate records created
□ Foreign key relationships intact
□ Required fields populated
□ Timestamps correct
□ Audit trail functioning

RUN INTEGRITY QUERIES:
[Document specific queries for your application]

ROLLBACK TRIGGER: Data corruption detected = IMMEDIATE ROLLBACK
```

### 12.3 Security Verification in Production
```
VERIFY:
□ HTTPS enforced (HTTP redirects)
□ Security headers present
□ CORS properly configured
□ Rate limiting active
□ Authentication required on protected routes
□ Authorization working correctly

EXECUTE SECURITY CHECKS:
curl -I https://[production-url] | grep -i security

ROLLBACK TRIGGER: Security misconfiguration = EVALUATE ROLLBACK
```

### 12.4 Integration Verification
```
VERIFY ALL INTEGRATIONS:
| Integration | Test Method | Status | Evidence |
|-------------|-------------|--------|----------|
| Payment gateway | Test transaction | [PASS/FAIL] | [ref] |
| Email service | Test email | [PASS/FAIL] | [ref] |
| SMS service | Test SMS | [PASS/FAIL] | [ref] |
| Analytics | Events firing | [PASS/FAIL] | [ref] |
| [Custom] | [method] | [PASS/FAIL] | [ref] |

ROLLBACK TRIGGER: Critical integration failure = EVALUATE ROLLBACK
```

---

## PHASE 13: PRODUCTION PERFORMANCE VALIDATION

### 13.1 Load Test Against Production (If Safe)
```
⚠️ ONLY IF SAFE TO RUN AGAINST PRODUCTION

EXECUTE LIMITED LOAD TEST:
- Duration: 5 minutes
- Load: 50% of normal traffic
- Target: Non-critical endpoints only

RESULTS:
| Metric | Value | Baseline | Status |
|--------|-------|----------|--------|
| RPS achieved | [n] | [n] | [status] |
| Avg response | [ms] | [ms] | [status] |
| Error rate | [%] | [%] | [status] |
| P95 latency | [ms] | [ms] | [status] |
```

### 13.2 Database Performance Validation
```
CHECK PRODUCTION DATABASE:
□ Query performance within baseline
□ No long-running queries
□ Index usage correct
□ No lock contention
□ Replication lag (if applicable) within limits

EVIDENCE: Query stats, slow query log
```

### 13.3 CDN Performance Validation
```
VERIFY CDN (if used):
□ Cache hit rate acceptable
□ Origin shield working
□ Correct cache headers
□ Purge completed (if needed)
□ SSL termination correct

CHECK FROM MULTIPLE LOCATIONS:
| Location | Response Time | Cache Status |
|----------|---------------|--------------|
| [Location 1] | [ms] | [HIT/MISS] |
| [Location 2] | [ms] | [HIT/MISS] |
| [Location 3] | [ms] | [HIT/MISS] |
```

---

## PHASE 14: ROLLBACK READINESS

### 14.1 Rollback Verification
```
VERIFY ROLLBACK CAPABILITY:
□ Previous version artifacts available
□ Rollback procedure documented
□ Database rollback plan ready (if needed)
□ Feature flags can be toggled
□ DNS can be switched (if needed)
□ Rollback tested recently

ROLLBACK PROCEDURE SUMMARY:
1. [Step 1]
2. [Step 2]
3. [Step 3]
...

ESTIMATED ROLLBACK TIME: [minutes]
```

### 14.2 Rollback Decision Matrix
```
ROLLBACK IMMEDIATELY IF:
□ Error rate >5% sustained 10+ minutes
□ P0 bug affecting >10% users
□ Data corruption detected
□ Security breach detected
□ Core business flow broken
□ Payment processing broken
□ Authentication broken

EVALUATE ROLLBACK IF:
□ Error rate >2% sustained 15+ minutes
□ P1 bug affecting >5% users
□ Performance >50% degraded
□ Significant user complaints
□ Business stakeholder request

MONITOR BUT CONTINUE IF:
□ Minor errors (<1% users affected)
□ Cosmetic issues
□ Edge case bugs
□ Performance within acceptable range
```

### 14.3 Rollback Execution Log (If Needed)
```
IF ROLLBACK EXECUTED:
- Rollback initiated: [timestamp]
- Reason: [description]
- Initiated by: [name]
- Rollback method: [description]
- Rollback completed: [timestamp]
- Verification: [PASS/FAIL]
- Post-rollback status: [stable/issues]
```

---

# PART 5: POST-DEPLOYMENT REPORTS

---

## PHASE 15: INCIDENT MANAGEMENT (If Issues Occurred)

### 15.1 Incident Documentation
```
IF INCIDENTS OCCURRED:

INCIDENT RECORD:
- Incident ID: [ID]
- Severity: [P0/P1/P2/P3]
- Detected: [timestamp]
- Resolved: [timestamp]
- Duration: [minutes]
- Users affected: [count/percentage]
- Business impact: [description]

TIMELINE:
| Time | Event | Action | By |
|------|-------|--------|-----|
| [time] | Incident detected | [action] | [name] |
| [time] | Investigation started | [action] | [name] |
| [time] | Root cause identified | [action] | [name] |
| [time] | Fix deployed / Rollback | [action] | [name] |
| [time] | Verified resolved | [action] | [name] |
```

### 15.2 Root Cause Analysis
```
ROOT CAUSE:
- What happened: [description]
- Why it happened: [analysis]
- Why it wasn't caught pre-deployment: [analysis]
- Contributing factors: [list]

5 WHYS:
1. Why? [answer]
2. Why? [answer]
3. Why? [answer]
4. Why? [answer]
5. Why? [root cause]
```

### 15.3 Action Items
```
PREVENTIVE MEASURES:
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add test for [scenario] | [name] | [date] | [status] |
| Improve monitoring for [X] | [name] | [date] | [status] |
| Update runbook for [Y] | [name] | [date] | [status] |
| [Custom action] | [name] | [date] | [status] |
```

---

## FINAL POST-DEPLOYMENT REPORT

```
================================================================================
            POST-DEPLOYMENT TESTING PROTOCOL - EXECUTION REPORT
================================================================================

Project: [name]
Version Deployed: [X.Y.Z]
Deployment Time: [timestamp]
Report Generated: [timestamp]
Executed by: [AI Assistant / Team]

--------------------------------------------------------------------------------
EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Deployment Status: [SUCCESSFUL / PARTIAL / ROLLED BACK]
Monitoring Period: [duration]
Overall Health: [HEALTHY / DEGRADED / CRITICAL]
Incidents: [count]
User Impact: [None / Minimal / Moderate / Severe]

--------------------------------------------------------------------------------
PHASE RESULTS SUMMARY
--------------------------------------------------------------------------------

| # | Phase | Status | Issues | Notes |
|---|-------|--------|--------|-------|
| 1 | Health Checks (0-15min) | [P/F] | [n] | [notes] |
| 2 | Smoke Tests (0-15min) | [P/F] | [n] | [notes] |
| 3 | Error Monitoring (0-15min) | [P/F] | [n] | [notes] |
| 4 | Performance (15-60min) | [P/F] | [n] | [notes] |
| 5 | Error Rates (15-60min) | [P/F] | [n] | [notes] |
| 6 | Feature Flags | [P/F] | [n] | [notes] |
| 7 | Canary Analysis | [P/F/N/A] | [n] | [notes] |
| 8 | 24h Stability | [P/F] | [n] | [notes] |
| 9 | Real User Monitoring | [P/F] | [n] | [notes] |
| 10 | User Experience | [P/F] | [n] | [notes] |
| 11 | User Feedback | [P/F] | [n] | [notes] |
| 12 | Production E2E Tests | [P/F] | [n] | [notes] |
| 13 | Performance Validation | [P/F] | [n] | [notes] |
| 14 | Rollback Readiness | [P/F] | [n] | [notes] |
| 15 | Incident Management | [P/F/N/A] | [n] | [notes] |

--------------------------------------------------------------------------------
KEY METRICS COMPARISON
--------------------------------------------------------------------------------

| Metric | Pre-Deploy | Post-Deploy | Change | Status |
|--------|------------|-------------|--------|--------|
| Error Rate | [%] | [%] | [+/-n%] | [OK/WARN/CRIT] |
| P95 Latency | [ms] | [ms] | [+/-n%] | [OK/WARN/CRIT] |
| Throughput | [rps] | [rps] | [+/-n%] | [OK/WARN/CRIT] |
| CPU Usage | [%] | [%] | [+/-n%] | [OK/WARN/CRIT] |
| Memory Usage | [%] | [%] | [+/-n%] | [OK/WARN/CRIT] |
| LCP | [s] | [s] | [+/-n%] | [OK/WARN/CRIT] |
| User Satisfaction | [score] | [score] | [+/-n] | [OK/WARN/CRIT] |

--------------------------------------------------------------------------------
ISSUES DETECTED
--------------------------------------------------------------------------------

CRITICAL ISSUES:
1. [Issue description]
   - Detected: [time]
   - Impact: [description]
   - Resolution: [action taken]
   - Status: [resolved/ongoing]

HIGH PRIORITY ISSUES:
1. [Issue description]
   - Impact: [description]
   - Resolution: [action taken]
   - Status: [resolved/ongoing]

MEDIUM/LOW ISSUES:
1. [Issue description] - [status]

--------------------------------------------------------------------------------
INCIDENTS (If Any)
--------------------------------------------------------------------------------

INCIDENT 1:
- ID: [ID]
- Severity: [P0-P3]
- Duration: [minutes]
- Root Cause: [brief]
- Resolution: [action]
- Follow-up: [action items]

--------------------------------------------------------------------------------
USER FEEDBACK SUMMARY
--------------------------------------------------------------------------------
- Support tickets: [count] (+/-[n]% vs baseline)
- Negative feedback: [count]
- New issues reported: [list themes]
- Positive feedback: [count]

--------------------------------------------------------------------------------
RECOMMENDATIONS
--------------------------------------------------------------------------------

IMMEDIATE ACTIONS:
1. [Action item]
2. [Action item]

FOLLOW-UP ACTIONS:
1. [Action item] - Due: [date]
2. [Action item] - Due: [date]

PROCESS IMPROVEMENTS:
1. [Suggestion]
2. [Suggestion]

--------------------------------------------------------------------------------
SIGN-OFF
--------------------------------------------------------------------------------

Post-Deployment Verification Complete: [Yes/No]
Production Stable: [Yes/No]
Rollback Executed: [Yes/No]

Verified by: _____________ Date: _______ Time: _______

DEPLOYMENT OUTCOME: [SUCCESS / SUCCESS WITH ISSUES / ROLLED BACK]

================================================================================
                              END OF REPORT
================================================================================
```

---

## MEMORY PROMPTS TO SAVE

### If Issues Found:
```
SUGGEST SAVING AS "common_pitfalls_experience":
Title: [Issue type] discovered post-deployment
Content: [What went wrong], [How it was detected], [Symptoms], [Resolution]
Keywords: post-deployment, production, [specific issue type]
```

### If New Monitoring Pattern Discovered:
```
SUGGEST SAVING AS "development_test_specification":
Title: Post-deployment monitoring for [scenario]
Content: [What to monitor], [Thresholds], [Alert conditions]
Keywords: monitoring, production, post-deployment
```

### If Rollback Executed:
```
SUGGEST SAVING AS "common_pitfalls_experience":
Title: Rollback triggered by [cause]
Content: [Symptoms], [Detection method], [Rollback procedure], [Prevention]
Keywords: rollback, deployment failure, production incident
```

---

## AI ASSISTANT FINAL INSTRUCTION

**YOU MUST:**
1. Execute every phase above systematically
2. Run actual checks against production (not simulated)
3. Report actual results with evidence
4. Escalate critical issues IMMEDIATELY
5. Trigger rollback discussion if thresholds exceeded
6. Generate the final report
7. Suggest memories to save based on findings

**MONITORING SCHEDULE:**
- Phase 1-3: Immediately (0-15 minutes)
- Phase 4-7: Golden hour (15-60 minutes)
- Phase 8-11: Extended (1-24 hours)
- Phase 12-15: As needed / continuous

**ESCALATION PATH:**
1. Critical issue detected → Notify on-call immediately
2. Rollback threshold met → Initiate rollback discussion
3. User-impacting issue → Notify product owner
4. Security issue → Notify security team

**BEGIN EXECUTION NOW.**
