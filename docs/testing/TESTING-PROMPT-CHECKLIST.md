# System Validation Testing Prompt

> Use this prompt to thoroughly validate any system before deployment. Copy the relevant sections and execute them systematically.

---

## Pre-Testing Setup Checklist

Before running tests, verify:

- [ ] Test database is isolated (not production)
- [ ] Test user accounts exist with known credentials
- [ ] Environment variables are set for test environment
- [ ] External services are mocked or using test endpoints
- [ ] Previous test data is cleared/reset

---

## 1. Contract Validation Tests

### 1.1 API Response Structure Validation

For EACH API endpoint, verify:

```
□ Response includes ALL expected fields (not just status code)
□ Response field types match specification (string, number, object, array)
□ Nested objects have correct structure
□ Wrapper format is consistent ({ success, data, meta } or direct)
□ Error responses follow consistent format
□ Content-Type header is correct
□ Response encoding is UTF-8
```

**Test Command:**
```bash
# For each endpoint, capture and validate full response
curl -s -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' | jq .

# Validate against expected schema
# Expected: { success: boolean, data: { accessToken: string, ... }, meta: { ... } }
```

### 1.2 Frontend-Backend Contract Verification

```
□ Frontend API client correctly handles wrapped responses
□ Frontend correctly extracts data from response structure  
□ Frontend stores extracted data in correct location (localStorage, state)
□ Frontend sends requests with correct headers (Authorization, CSRF)
□ Frontend handles error responses appropriately
□ Frontend retry logic works for token refresh
```

**Verification:**
```javascript
// In browser console after login attempt:
console.log(localStorage.getItem('auth-storage'));
// Should show: { state: { accessToken: "...", user: {...} }, version: 0 }
```

---

## 2. Authentication Flow Tests

### 2.1 Complete Auth Flow Sequence

Execute in order, each must pass before proceeding:

```
□ Step 1: GET /auth/csrf-token returns token and sets cookie
□ Step 2: POST /auth/login with CSRF returns tokens + user
□ Step 3: GET /auth/me with Bearer token returns user data
□ Step 4: POST /auth/refresh with refresh token returns new access token
□ Step 5: POST /auth/logout invalidates refresh token
□ Step 6: POST /auth/refresh with invalidated token returns 401
```

### 2.2 Negative Auth Tests

```
□ Login without CSRF token → 403 CSRF_TOKEN_MISSING
□ Login with invalid CSRF → 403 CSRF_TOKEN_INVALID  
□ Login with wrong password → 401 INVALID_CREDENTIALS
□ Login with non-existent email → 401 INVALID_CREDENTIALS (same as wrong password)
□ Access protected route without token → 401 UNAUTHORIZED
□ Access protected route with expired token → 401 TOKEN_EXPIRED
□ Access protected route with malformed token → 401 INVALID_TOKEN
□ Refresh with invalid refresh token → 401 INVALID_REFRESH_TOKEN
```

### 2.3 Session Persistence Tests

```
□ After login, refresh page → still logged in
□ After login, close browser, reopen → still logged in (if remember me)
□ After token expires, auto-refresh works transparently
□ After logout, cannot use old tokens
□ Multiple tabs share session state
```

---

## 3. Security Tests

### 3.1 Input Validation

For each user input field, test:

```
□ SQL injection: ' OR '1'='1'; DROP TABLE users; --
□ XSS: <script>alert('xss')</script>
□ NoSQL injection: {"$gt": ""}
□ Command injection: ; rm -rf /
□ Path traversal: ../../../etc/passwd
□ Oversized input: 10MB+ payload
□ Unicode edge cases: 日本語, العربية, 🎉
□ Null bytes: \x00
□ Empty string vs null vs undefined
□ Maximum length values
□ Negative numbers where positive expected
□ Float where integer expected
```

### 3.2 Authentication Security

```
□ Rate limiting: 5+ rapid login attempts → 429
□ Account lockout: Multiple failures → account locked
□ Password not in logs or responses
□ Tokens expire correctly
□ Refresh tokens single-use (optional)
□ Logout invalidates all sessions (optional)
□ HTTPS enforced (HTTP redirects to HTTPS)
□ Secure cookies (HttpOnly, Secure, SameSite)
```

### 3.3 Authorization Tests

```
□ User A cannot access User B's data
□ Regular user cannot access admin endpoints
□ Deleted user cannot authenticate
□ Suspended user cannot authenticate
□ Token for one resource cannot access another
```

---

## 4. Error Handling Tests

### 4.1 Error Response Consistency

All error responses must have:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "meta": {
    "timestamp": "ISO8601",
    "requestId": "uuid"
  }
}
```

Test these scenarios return correct format:
```
□ 400 Bad Request (validation error)
□ 401 Unauthorized (auth required)
□ 403 Forbidden (permission denied)
□ 404 Not Found (resource missing)
□ 409 Conflict (duplicate resource)
□ 429 Too Many Requests (rate limited)
□ 500 Internal Server Error (unhandled error)
□ 503 Service Unavailable (downstream failure)
```

### 4.2 Graceful Degradation

```
□ Database down → appropriate error, not crash
□ Redis down → graceful fallback or error
□ External API down → timeout and error
□ Network partition → retry logic works
□ Partial data available → returns what it can
```

---

## 5. Integration Tests

### 5.1 Database Operations

```
□ CRUD operations work correctly
□ Transactions commit on success
□ Transactions rollback on failure
□ Concurrent operations don't corrupt data
□ Foreign key constraints enforced
□ Unique constraints enforced
□ Soft deletes work correctly
□ Audit timestamps updated
```

### 5.2 Cache Operations

```
□ Cache stores data correctly
□ Cache retrieves data correctly
□ Cache expires at TTL
□ Cache invalidation works
□ Cache miss falls through to database
□ Cache doesn't return stale data after update
```

### 5.3 External Service Integration

```
□ OAuth providers (Google, Microsoft) work
□ Email sending works
□ Payment processing works (test mode)
□ File storage works
□ Third-party APIs work
□ Webhooks receive correctly
□ Webhooks retry on failure
```

---

## 6. Performance Tests

### 6.1 Response Time Thresholds

```
□ Health check: < 50ms
□ Login: < 500ms
□ Token refresh: < 200ms
□ Simple GET: < 100ms
□ List with pagination: < 200ms
□ Complex query: < 500ms
□ File upload: < 5s (for reasonable size)
```

### 6.2 Load Testing

```
□ 50 concurrent users: < 500ms p95
□ 100 concurrent users: < 1s p95
□ 500 concurrent users: system stable
□ Memory usage stable under load
□ No connection pool exhaustion
□ No deadlocks under concurrent writes
```

### 6.3 Stress Testing

```
□ System recovers after overload
□ Requests queue rather than fail
□ Error rate < 1% under normal load
□ Graceful degradation under extreme load
```

---

## 7. End-to-End User Flow Tests

### 7.1 Critical User Journeys

Test complete flows, not just individual steps:

**Registration Flow:**
```
□ Navigate to /register
□ Fill form with valid data
□ Submit form
□ Verify redirect to dashboard
□ Verify logged in state
□ Verify welcome email sent
□ Refresh page → still logged in
```

**Login Flow:**
```
□ Navigate to /login
□ Enter valid credentials
□ Submit form
□ Verify redirect to dashboard
□ Verify user data displayed correctly
□ Verify access to protected pages
□ Logout → redirected to login
□ Back button → cannot access protected pages
```

**Core Business Flow:**
```
□ Create new resource
□ View resource
□ Edit resource
□ Delete resource
□ Verify changes persisted
□ Verify related data updated
```

### 7.2 Edge Case Flows

```
□ Login with remember me → persists across sessions
□ Login without remember me → session only
□ Password reset flow complete
□ Email verification flow complete
□ Account deletion flow complete
□ Subscription upgrade/downgrade flow
```

---

## 8. Accessibility Tests

### 8.1 Automated Checks (axe-core)

```
□ No critical WCAG 2.1 AA violations
□ No serious WCAG 2.1 AA violations
□ Color contrast meets minimum ratios
□ All images have alt text
□ All form fields have labels
□ All buttons have accessible names
```

### 8.2 Manual Keyboard Navigation

```
□ All interactive elements reachable via Tab
□ Focus visible on all elements
□ Focus order logical
□ Enter activates buttons/links
□ Escape closes modals
□ No keyboard traps
```

### 8.3 Screen Reader Compatibility

```
□ Page has proper heading structure
□ Live regions announce dynamic changes
□ Error messages announced
□ Form validation errors announced
□ Loading states announced
```

---

## 9. Cross-Browser Testing

Test on minimum:
```
□ Chrome (latest)
□ Firefox (latest)
□ Safari (latest)
□ Edge (latest)
□ Mobile Safari (iOS)
□ Chrome Mobile (Android)
```

For each browser verify:
```
□ Layout renders correctly
□ Fonts display correctly
□ Forms work correctly
□ JavaScript executes without errors
□ Authentication works
□ Local storage works
□ Cookies work correctly
```

---

## 10. Regression Tests

### 10.1 Visual Regression

```
□ Login page matches baseline
□ Dashboard matches baseline
□ Key pages match baselines
□ Mobile layouts match baselines
□ Dark mode (if applicable) matches baselines
```

### 10.2 API Regression

```
□ All endpoint response structures match snapshots
□ No breaking changes to documented API
□ Deprecated fields still present during deprecation period
□ New fields are additive only
```

### 10.3 Functional Regression

```
□ All existing features still work
□ All existing tests still pass
□ No performance degradation
□ No increase in error rates
```

---

## Test Execution Order

Execute in this order for best results:

1. **Contract Tests** (5 min) - Catch interface mismatches early
2. **Unit Tests** (2 min) - Fast feedback on logic
3. **Security Tests** (10 min) - Don't ship vulnerabilities
4. **Integration Tests** (5 min) - Verify components work together
5. **E2E Tests** (15 min) - Validate real user flows
6. **Performance Tests** (10 min) - Ensure acceptable speed
7. **Accessibility Tests** (5 min) - Ensure usability
8. **Regression Tests** (5 min) - Ensure nothing broke

**Total: ~1 hour for comprehensive validation**

---

## Post-Testing Verification

After all tests pass:

```
□ Coverage report shows >80% line coverage
□ No critical/high security vulnerabilities
□ No accessibility violations
□ Performance meets thresholds
□ All E2E flows complete successfully
□ Visual baselines updated if intentional changes
□ Test report generated and archived
```

---

## Red Flags to Watch For

If you see these, investigate before deploying:

- [ ] Tests passing but taking much longer than usual
- [ ] Flaky tests (passing sometimes, failing sometimes)
- [ ] Coverage dropping without explanation
- [ ] New warnings in test output
- [ ] Tests requiring unusual setup/teardown
- [ ] Tests that pass in isolation but fail together
- [ ] 200 OK but empty or wrong response body
- [ ] Tests that don't verify response content, only status codes

---

## Template: Bug Prevention Checklist

For every feature/fix, verify:

```
□ Unit test for the specific logic
□ Integration test for the feature's data flow
□ Contract test if API changed
□ E2E test if user flow changed
□ Security test if auth/input handling changed
□ Performance test if query/algorithm changed
□ Accessibility test if UI changed
□ Regression test to ensure nothing broke
```

**The bug we would have caught:**
- Contract test would verify: "Does frontend correctly parse `{ success, data }` wrapper?"
- E2E test would verify: "After login, is `localStorage.auth-storage.state.accessToken` populated?"
