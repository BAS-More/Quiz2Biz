# UNIVERSAL SOFTWARE TESTING PROTOCOL

> **INSTRUCTIONS FOR AI ASSISTANT**: When this file is added to a conversation, you MUST immediately begin executing the complete testing protocol below. Do not wait for additional instructions. Execute systematically and report findings.

---

## AUTOMATIC EXECUTION TRIGGER

**AI ASSISTANT: START EXECUTION NOW**

You are now in **Testing Protocol Mode**. Execute all sections in order. For each section:
1. Run the actual checks/tests
2. Report PASS/FAIL status
3. Document any issues found
4. Continue to next section

**Do not skip any section. Do not summarize. Execute and verify.**

---

## PHASE 1: PROJECT DISCOVERY (Execute First)

### 1.1 Identify Project Structure
```
EXECUTE NOW:
- List the root directory
- Identify the tech stack (package.json, requirements.txt, pom.xml, go.mod, etc.)
- Identify test directories
- Identify configuration files
- Identify deployment files
```

### 1.2 Identify Test Commands
```
EXECUTE NOW:
- Find all test scripts in package.json or equivalent
- Find all build scripts
- Find lint/format scripts
- Find deployment scripts
```

### 1.3 Report Project Profile
```
REPORT:
- Language: [detected]
- Framework: [detected]
- Test Framework: [detected]
- Build Tool: [detected]
- Deployment Target: [detected]
```

---

## PHASE 2: STATIC ANALYSIS (Execute Second)

### 2.1 Linting
```
EXECUTE: npm run lint (or equivalent)
REPORT: Pass/Fail + error count
```

### 2.2 Type Checking
```
EXECUTE: npx tsc --noEmit (or equivalent)
REPORT: Pass/Fail + error count
```

### 2.3 Formatting
```
EXECUTE: npm run format:check (or equivalent)
REPORT: Pass/Fail + files needing format
```

### 2.4 Security Vulnerabilities
```
EXECUTE: npm audit (or equivalent)
REPORT: Critical/High/Medium/Low counts
```

### 2.5 Hardcoded Secrets Check
```
SEARCH FOR patterns:
- password=
- secret=
- api_key=
- apiKey=
- credentials
- token= (in non-test files)
REPORT: Files with potential secrets
```

---

## PHASE 3: UNIT TESTING (Execute Third)

### 3.1 Run Unit Tests
```
EXECUTE: npm test (or equivalent)
REPORT: 
- Total tests
- Passed
- Failed
- Skipped
- Coverage percentage
```

### 3.2 Analyze Failures
```
FOR EACH FAILURE:
- Test name
- Error message
- File location
- Suspected cause
```

---

## PHASE 4: INTEGRATION TESTING (Execute Fourth)

### 4.1 Database Connectivity
```
VERIFY:
- Database connection configured
- Migrations up to date
- Can connect to database
```

### 4.2 API Endpoints
```
IDENTIFY all API endpoints
VERIFY each has:
- Route handler
- Input validation
- Error handling
- Tests
```

### 4.3 External Services
```
IDENTIFY external integrations
VERIFY each has:
- Configuration
- Error handling
- Timeout handling
- Fallback behavior
```

---

## PHASE 5: CONTRACT TESTING (Execute Fifth)

### 5.1 API Response Structure
```
FOR EACH API ENDPOINT:
- Document expected response structure
- Verify frontend expects same structure
- Check for wrapper mismatches (common bug!)
```

### 5.2 Type Synchronization
```
VERIFY:
- Backend types match frontend types
- Enum values synchronized
- Optional/required fields consistent
```

### 5.3 Common Contract Issues to Check
```
SPECIFICALLY VERIFY:
- Response wrapper handling ({ success, data, meta } pattern)
- Null vs undefined handling
- Date format consistency
- Error response format
```

---

## PHASE 6: END-TO-END TESTING (Execute Sixth)

### 6.1 Critical Flows
```
VERIFY these flows work end-to-end:
1. User registration
2. User login
3. Password reset
4. Core business flow (main feature)
5. User logout
```

### 6.2 E2E Test Execution
```
EXECUTE: npm run test:e2e (or equivalent)
REPORT: Pass/Fail for each flow
```

---

## PHASE 7: SECURITY TESTING (Execute Seventh)

### 7.1 Authentication
```
VERIFY:
- Password hashing used
- JWT/session properly implemented
- Token expiration enforced
- Logout invalidates session
```

### 7.2 Authorization
```
VERIFY:
- Role-based access control
- Resource ownership checks
- No horizontal privilege escalation
- No vertical privilege escalation
```

### 7.3 Input Validation
```
CHECK FOR:
- SQL injection protection
- XSS protection
- Command injection protection
- Path traversal protection
```

### 7.4 Security Headers
```
VERIFY PRESENCE:
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security
```

---

## PHASE 8: PERFORMANCE TESTING (Execute Eighth)

### 8.1 Build Performance
```
EXECUTE: npm run build
REPORT:
- Build time
- Bundle sizes
- Any warnings
```

### 8.2 Load Test (if available)
```
EXECUTE: npm run test:load (if available)
REPORT:
- Requests per second
- Average response time
- Error rate
```

---

## PHASE 9: ACCESSIBILITY TESTING (Execute Ninth)

### 9.1 Automated Checks
```
EXECUTE: npm run test:accessibility (or pa11y/axe)
REPORT:
- Critical violations
- Serious violations
- Moderate violations
```

### 9.2 Manual Checklist
```
VERIFY:
- All images have alt text
- Form fields have labels
- Color contrast sufficient
- Keyboard navigation works
```

---

## PHASE 10: DOCUMENTATION VERIFICATION (Execute Tenth)

### 10.1 Code Documentation
```
VERIFY:
- README exists and accurate
- API documentation exists
- Environment setup documented
- Deployment steps documented
```

### 10.2 Inline Documentation
```
CHECK:
- Complex functions documented
- Public APIs documented
- Configuration options documented
```

---

## PHASE 11: BUILD & DEPLOYMENT READINESS (Execute Eleventh)

### 11.1 Build Verification
```
EXECUTE: npm run build
VERIFY:
- Build completes without errors
- Output artifacts created
- No console warnings
```

### 11.2 Environment Configuration
```
VERIFY:
- .env.example exists
- All required env vars documented
- No hardcoded environment values
- Secrets management in place
```

### 11.3 Deployment Configuration
```
VERIFY:
- Dockerfile/deployment config valid
- CI/CD pipeline configured
- Rollback procedure documented
```

---

## FINAL REPORT TEMPLATE

After completing all phases, generate this report:

```
================================================================================
                    TESTING PROTOCOL EXECUTION REPORT
================================================================================

Project: [name]
Date: [timestamp]
Executed by: AI Assistant

--------------------------------------------------------------------------------
EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Overall Status: [PASS/FAIL]
Critical Issues: [count]
High Issues: [count]
Medium Issues: [count]
Low Issues: [count]

--------------------------------------------------------------------------------
PHASE RESULTS
--------------------------------------------------------------------------------

| Phase | Status | Issues |
|-------|--------|--------|
| 1. Project Discovery | [PASS/FAIL] | [count] |
| 2. Static Analysis | [PASS/FAIL] | [count] |
| 3. Unit Testing | [PASS/FAIL] | [count] |
| 4. Integration Testing | [PASS/FAIL] | [count] |
| 5. Contract Testing | [PASS/FAIL] | [count] |
| 6. E2E Testing | [PASS/FAIL] | [count] |
| 7. Security Testing | [PASS/FAIL] | [count] |
| 8. Performance Testing | [PASS/FAIL] | [count] |
| 9. Accessibility Testing | [PASS/FAIL] | [count] |
| 10. Documentation | [PASS/FAIL] | [count] |
| 11. Deployment Readiness | [PASS/FAIL] | [count] |

--------------------------------------------------------------------------------
CRITICAL ISSUES (Must Fix Before Deployment)
--------------------------------------------------------------------------------
1. [Issue description]
   - Location: [file:line]
   - Impact: [description]
   - Fix: [recommendation]

2. [...]

--------------------------------------------------------------------------------
HIGH PRIORITY ISSUES (Should Fix)
--------------------------------------------------------------------------------
1. [Issue description]
   - Location: [file:line]
   - Impact: [description]
   - Fix: [recommendation]

--------------------------------------------------------------------------------
DEPLOYMENT RECOMMENDATION
--------------------------------------------------------------------------------
[ ] APPROVED - All checks passed
[ ] CONDITIONAL - Fix critical issues first
[ ] NOT APPROVED - Multiple failures

--------------------------------------------------------------------------------
NEXT STEPS
--------------------------------------------------------------------------------
1. [Action item]
2. [Action item]
3. [Action item]

================================================================================
                              END OF REPORT
================================================================================
```

---

## POST-DEPLOYMENT VERIFICATION (Execute After Deployment)

If deployment has occurred, also execute:

### Immediate Checks (0-5 minutes)
```
EXECUTE:
- curl [deployed-url]/health
- curl [deployed-url]/api/health
- Verify homepage loads
REPORT: All health checks passing
```

### Smoke Tests (5-30 minutes)
```
EXECUTE:
- Login flow
- Core feature flow
- Logout flow
REPORT: All smoke tests passing
```

### Monitoring Check
```
VERIFY:
- Error rate normal
- Response time normal
- No new error types
- No spike in logs
```

---

## MEMORY PROMPTS TO SAVE

After execution, suggest the user save these memories:

### If Critical Issues Found:
```
SUGGEST SAVING AS "common_pitfalls_experience":
Title: [Issue type] in [Project name]
Content: [What went wrong], [How it was detected], [How to fix]
Keywords: [relevant technical terms]
```

### If New Testing Pattern Discovered:
```
SUGGEST SAVING AS "development_test_specification":
Title: [Testing pattern name]
Content: [What to test], [How to test], [Why important]
Keywords: testing, [specific area]
```

### If Project-Specific Learning:
```
SUGGEST SAVING AS "project_introduction":
Title: [Project name] Testing Configuration
Content: [Test commands], [Known issues], [Special requirements]
Keywords: [project name], testing, configuration
```

---

## EXECUTION COMMANDS REFERENCE

For quick reference during execution:

```bash
# Static Analysis
npm run lint
npm run format:check
npx tsc --noEmit
npm audit

# Testing
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:accessibility

# Build
npm run build

# If testing framework script exists:
npm run test:framework:pre
npm run test:framework:post
```

---

## AI ASSISTANT FINAL INSTRUCTION

**YOU MUST:**
1. Execute every phase above systematically
2. Run actual commands (not just describe them)
3. Report actual results (not theoretical)
4. Document all issues found
5. Generate the final report
6. Suggest memories to save
7. Run TWICE for deployment approval (two consecutive passes required)

**BEGIN EXECUTION NOW.**
