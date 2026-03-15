# Comprehensive System Testing Methodology

> **Purpose**: Catch bugs BEFORE production by testing what actually matters - the contracts, integrations, and real user flows - not just individual units in isolation.

## Core Testing Philosophy

**The bug we caught**: Login API returned `200 OK` with `{ success: true, data: { accessToken, ... } }` but the frontend expected `{ accessToken, ... }` directly. Unit tests passed because each side was "correct" in isolation. Integration tests failed to catch this because they didn't validate the actual contract.

**Key Insight**: Most production bugs occur at **boundaries** - where systems meet, where data transforms, where assumptions differ.

---

## Level 1: Contract & Schema Testing

### 1.1 API Response Contract Validation

```typescript
// Test ACTUAL response structure, not just status codes
describe('Auth API Contracts', () => {
  it('POST /auth/login returns correctly structured response', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'password' });
    
    // DON'T just check status
    expect(response.status).toBe(200);
    
    // DO validate exact response structure
    expect(response.body).toMatchObject({
      success: expect.any(Boolean),
      data: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: expect.stringMatching(/^Bearer$/),
        user: {
          id: expect.any(String),
          email: expect.any(String),
          role: expect.any(String),
        },
      },
      meta: {
        timestamp: expect.any(String),
      },
    });
    
    // Validate JWT structure
    const token = response.body.data.accessToken;
    const parts = token.split('.');
    expect(parts).toHaveLength(3); // header.payload.signature
    
    // Decode and validate payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    expect(payload).toHaveProperty('sub');
    expect(payload).toHaveProperty('exp');
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });
});
```

### 1.2 Frontend-Backend Contract Tests

```typescript
// Test that frontend correctly handles backend responses
describe('Frontend API Client Contract', () => {
  it('correctly unwraps wrapped API responses', async () => {
    // Mock the exact response structure from backend
    const backendResponse = {
      success: true,
      data: { accessToken: 'xxx', refreshToken: 'yyy', user: { id: '1' } },
      meta: { timestamp: '2024-01-01' }
    };
    
    // Simulate what frontend does
    const result = apiClient.processResponse(backendResponse);
    
    // Frontend should unwrap to get direct data
    expect(result.accessToken).toBe('xxx');
    expect(result.success).toBeUndefined(); // Should NOT be present
  });
  
  it('handles error responses correctly', async () => {
    const errorResponse = {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Wrong password' },
      meta: { timestamp: '2024-01-01' }
    };
    
    await expect(apiClient.processResponse(errorResponse))
      .rejects.toThrow('Wrong password');
  });
});
```

### 1.3 Schema Drift Detection

```typescript
// Detect when API schemas change
describe('API Schema Stability', () => {
  it('login response matches OpenAPI spec', async () => {
    const response = await request(app).post('/api/v1/auth/login').send(validCredentials);
    const spec = await loadOpenAPISpec('./docs/openapi.yaml');
    
    const validator = new OpenAPIValidator(spec);
    const errors = validator.validate(response.body, 'LoginResponse');
    
    expect(errors).toEqual([]);
  });
});
```

---

## Level 2: Integration Point Testing

### 2.1 Full Authentication Flow Testing

```typescript
describe('Complete Authentication Flow', () => {
  let accessToken: string;
  let refreshToken: string;
  let csrfToken: string;
  
  it('Step 1: Obtain CSRF token', async () => {
    const response = await request(app)
      .get('/api/v1/auth/csrf-token')
      .expect(200);
    
    csrfToken = response.body.csrfToken;
    expect(csrfToken).toBeTruthy();
    
    // Verify cookie is set
    const cookies = response.headers['set-cookie'];
    expect(cookies.some(c => c.includes('csrf-token'))).toBe(true);
  });
  
  it('Step 2: Login with CSRF token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'test@test.com', password: 'password' })
      .expect(200);
    
    accessToken = response.body.data.accessToken;
    refreshToken = response.body.data.refreshToken;
    
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });
  
  it('Step 3: Access protected route with token', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    
    expect(response.body.data.email).toBe('test@test.com');
  });
  
  it('Step 4: Protected route fails without token', async () => {
    await request(app)
      .get('/api/v1/auth/me')
      .expect(401);
  });
  
  it('Step 5: Protected route fails with invalid token', async () => {
    await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
  
  it('Step 6: Refresh token generates new access token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    
    const newAccessToken = response.body.data.accessToken;
    expect(newAccessToken).toBeTruthy();
    expect(newAccessToken).not.toBe(accessToken);
    
    // New token should work
    await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);
  });
  
  it('Step 7: Logout invalidates refresh token', async () => {
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);
    
    // Refresh token should no longer work
    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
```

### 2.2 Database Transaction Integrity

```typescript
describe('Database Transaction Integrity', () => {
  it('rolls back on partial failure', async () => {
    const initialUserCount = await prisma.user.count();
    const initialTokenCount = await prisma.refreshToken.count();
    
    // Simulate failure mid-transaction
    jest.spyOn(prisma.refreshToken, 'create').mockRejectedValueOnce(new Error('DB Error'));
    
    await expect(
      authService.login({ email: 'test@test.com', password: 'password' })
    ).rejects.toThrow();
    
    // Both tables should be unchanged
    expect(await prisma.user.count()).toBe(initialUserCount);
    expect(await prisma.refreshToken.count()).toBe(initialTokenCount);
  });
  
  it('handles concurrent operations correctly', async () => {
    const userId = 'test-user-id';
    
    // Simulate 10 concurrent refresh token operations
    const promises = Array(10).fill(null).map(() => 
      authService.refresh(validRefreshToken)
    );
    
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled');
    
    // All should succeed without race conditions
    expect(successes).toHaveLength(10);
    
    // Database should be consistent
    const tokens = await prisma.refreshToken.findMany({ where: { userId } });
    expect(tokens.length).toBeGreaterThanOrEqual(1);
  });
});
```

### 2.3 External Service Integration

```typescript
describe('Redis Cache Integration', () => {
  it('stores and retrieves tokens correctly', async () => {
    const key = 'refresh:test-token';
    const value = 'user-id-123';
    const ttl = 3600;
    
    await redisService.set(key, value, ttl);
    const retrieved = await redisService.get(key);
    
    expect(retrieved).toBe(value);
  });
  
  it('handles Redis connection failure gracefully', async () => {
    // Simulate Redis down
    jest.spyOn(redisService, 'get').mockRejectedValueOnce(new Error('Connection refused'));
    
    // System should handle gracefully
    const result = await authService.validateRefreshToken('some-token');
    expect(result).toBe(false); // Should fail safe, not crash
  });
  
  it('TTL expiration works correctly', async () => {
    await redisService.set('temp-key', 'value', 1); // 1 second TTL
    
    expect(await redisService.get('temp-key')).toBe('value');
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(await redisService.get('temp-key')).toBeNull();
  });
});
```

---

## Level 3: Security Testing

### 3.1 Authentication Security

```typescript
describe('Authentication Security', () => {
  it('rate limits login attempts', async () => {
    const attempts = Array(10).fill(null);
    
    for (const _ of attempts) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
    }
    
    // 6th attempt should be rate limited
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'correct' });
    
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
  
  it('locks account after failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
    }
    
    // Even with correct password, account is locked
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'correct' });
    
    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain('locked');
  });
  
  it('JWT tokens expire correctly', async () => {
    // Create token that expires in 1 second
    const shortLivedToken = jwt.sign(
      { sub: 'user-id', email: 'test@test.com' },
      process.env.JWT_SECRET,
      { expiresIn: '1s' }
    );
    
    // Should work immediately
    await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${shortLivedToken}`)
      .expect(200);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Should fail after expiration
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${shortLivedToken}`);
    
    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain('expired');
  });
  
  it('prevents token reuse after logout', async () => {
    const { accessToken, refreshToken } = await login();
    
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    
    // Refresh token should not work
    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
```

### 3.2 Input Validation & Injection Prevention

```typescript
describe('Input Validation Security', () => {
  const maliciousInputs = [
    { name: 'SQL Injection', value: "'; DROP TABLE users; --" },
    { name: 'XSS Script', value: '<script>alert("xss")</script>' },
    { name: 'NoSQL Injection', value: '{"$gt": ""}' },
    { name: 'Command Injection', value: '; rm -rf /' },
    { name: 'Path Traversal', value: '../../../etc/passwd' },
    { name: 'LDAP Injection', value: '*)(uid=*))(|(uid=*' },
    { name: 'XML Entity', value: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>' },
  ];
  
  maliciousInputs.forEach(({ name, value }) => {
    it(`sanitizes ${name} in email field`, async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: value, password: 'password' });
      
      // Should reject or sanitize, never execute
      expect(response.status).toBeOneOf([400, 401]);
      
      // Database should be unaffected
      const users = await prisma.user.findMany();
      expect(users.length).toBeGreaterThan(0); // Table not dropped
    });
    
    it(`sanitizes ${name} in user profile`, async () => {
      const response = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: value });
      
      if (response.status === 200) {
        // If accepted, should be sanitized
        expect(response.body.data.name).not.toContain('<script>');
        expect(response.body.data.name).not.toContain('DROP TABLE');
      }
    });
  });
  
  it('rejects oversized payloads', async () => {
    const hugePayload = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB
    
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(hugePayload);
    
    expect(response.status).toBe(413); // Payload Too Large
  });
});
```

### 3.3 CSRF & CORS Testing

```typescript
describe('CSRF Protection', () => {
  it('rejects state-changing requests without CSRF token', async () => {
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ questionnaireId: 'test' });
    
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_TOKEN_MISSING');
  });
  
  it('rejects requests with invalid CSRF token', async () => {
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-CSRF-Token', 'invalid-token')
      .send({ questionnaireId: 'test' });
    
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });
  
  it('accepts requests with valid CSRF token', async () => {
    const csrfResponse = await request(app).get('/api/v1/auth/csrf-token');
    const csrfToken = csrfResponse.body.csrfToken;
    
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-CSRF-Token', csrfToken)
      .set('Cookie', csrfResponse.headers['set-cookie'])
      .send({ questionnaireId: 'test' });
    
    expect(response.status).toBe(201);
  });
});

describe('CORS Policy', () => {
  it('allows requests from whitelisted origins', async () => {
    const response = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'https://quiz2biz.com');
    
    expect(response.headers['access-control-allow-origin']).toBe('https://quiz2biz.com');
  });
  
  it('blocks requests from unknown origins', async () => {
    const response = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'https://malicious-site.com');
    
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
```

---

## Level 4: Error Handling & Edge Cases

### 4.1 Error Response Consistency

```typescript
describe('Error Response Format', () => {
  const errorScenarios = [
    { endpoint: '/api/v1/auth/login', method: 'POST', body: {}, expectedCode: 'VALIDATION_ERROR' },
    { endpoint: '/api/v1/auth/login', method: 'POST', body: { email: 'invalid' }, expectedCode: 'VALIDATION_ERROR' },
    { endpoint: '/api/v1/auth/login', method: 'POST', body: { email: 'test@test.com', password: 'wrong' }, expectedCode: 'INVALID_CREDENTIALS' },
    { endpoint: '/api/v1/nonexistent', method: 'GET', expectedCode: 'NOT_FOUND' },
    { endpoint: '/api/v1/users/invalid-id', method: 'GET', expectedCode: 'NOT_FOUND' },
  ];
  
  errorScenarios.forEach(({ endpoint, method, body, expectedCode }) => {
    it(`returns consistent error format for ${method} ${endpoint}`, async () => {
      const req = request(app)[method.toLowerCase()](endpoint);
      if (body) req.send(body);
      
      const response = await req;
      
      // All errors should have consistent structure
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });
      
      expect(response.body.error.code).toBe(expectedCode);
    });
  });
});
```

### 4.2 Boundary & Edge Cases

```typescript
describe('Boundary Conditions', () => {
  describe('String Field Limits', () => {
    it('accepts email at max length (254 chars)', async () => {
      const maxEmail = 'a'.repeat(243) + '@example.com'; // 254 chars
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: maxEmail, password: 'Valid123!' });
      
      expect(response.status).toBeOneOf([200, 201, 400]); // Valid or validation error, not crash
    });
    
    it('rejects email over max length', async () => {
      const overMaxEmail = 'a'.repeat(244) + '@example.com'; // 255 chars
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: overMaxEmail, password: 'Valid123!' });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Numeric Limits', () => {
    it('handles maximum integer values', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .query({ page: Number.MAX_SAFE_INTEGER, limit: 100 });
      
      expect(response.status).toBeOneOf([200, 400]); // Not 500
    });
    
    it('handles negative values gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .query({ page: -1, limit: -10 });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Empty & Null Values', () => {
    it('handles empty string inputs', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: '', password: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('handles null values', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: null, password: null });
      
      expect(response.status).toBe(400);
    });
    
    it('handles missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });
  });
  
  describe('Unicode & Special Characters', () => {
    it('handles unicode in text fields', async () => {
      const response = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: '日本語名前 🎉 Émile' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('日本語名前 🎉 Émile');
    });
    
    it('handles RTL text', async () => {
      const response = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'שלום עולם' });
      
      expect(response.status).toBe(200);
    });
  });
});
```

---

## Level 5: End-to-End Browser Testing

### 5.1 Real User Flow Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('new user registration to first assessment', async ({ page }) => {
    // Step 1: Navigate to registration
    await page.goto('https://quiz2biz.com/auth/register');
    await expect(page.locator('h2')).toContainText('Create your account');
    
    // Step 2: Fill registration form
    const uniqueEmail = `test-${Date.now()}@test.com`;
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    
    // Step 3: Submit and verify redirect
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Step 4: Verify logged in state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Step 5: Start new assessment
    await page.click('text=New Project');
    await expect(page).toHaveURL(/\/questionnaire/);
    
    // Step 6: Complete first question
    await page.fill('textarea[name="ideaDescription"]', 'Test business idea');
    await page.click('button:has-text("Continue")');
    
    // Step 7: Verify progress saved
    await page.reload();
    await expect(page.locator('textarea[name="ideaDescription"]')).toHaveValue('Test business idea');
  });
  
  test('login persists across browser sessions', async ({ page, context }) => {
    // Login
    await page.goto('https://quiz2biz.com/auth/login');
    await page.fill('[name="email"]', 'test@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Close and reopen browser (simulated)
    const cookies = await context.cookies();
    const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
    
    // Clear and restore
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    // Restore session
    await context.addCookies(cookies);
    await page.evaluate((storage) => {
      const data = JSON.parse(storage);
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });
    }, localStorage);
    
    // Navigate and verify still logged in
    await page.goto('https://quiz2biz.com/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
```

### 5.2 API Response Validation in E2E

```typescript
test.describe('Frontend-Backend Contract E2E', () => {
  test('login response is correctly processed', async ({ page }) => {
    // Intercept API response
    let apiResponse: any;
    await page.route('**/api/v1/auth/login', async (route) => {
      const response = await route.fetch();
      apiResponse = await response.json();
      await route.fulfill({ response });
    });
    
    // Perform login
    await page.goto('https://quiz2biz.com/auth/login');
    await page.fill('[name="email"]', 'test@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify API response structure
    expect(apiResponse).toMatchObject({
      success: true,
      data: {
        accessToken: expect.any(String),
        user: expect.any(Object),
      },
    });
    
    // Verify frontend stored token correctly
    const authStorage = await page.evaluate(() => 
      JSON.parse(localStorage.getItem('auth-storage') || '{}')
    );
    
    expect(authStorage.state.accessToken).toBe(apiResponse.data.accessToken);
    expect(authStorage.state.user.email).toBe(apiResponse.data.user.email);
  });
});
```

---

## Level 6: Performance & Load Testing

### 6.1 Load Testing Script (k6)

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.01'],             // Error rate under 1%
    login_duration: ['p(95)<1000'],    // Login under 1s
  },
};

export default function () {
  // Test login endpoint
  const loginStart = Date.now();
  const loginRes = http.post(
    'https://api.quiz2biz.com/api/v1/auth/login',
    JSON.stringify({ email: 'loadtest@test.com', password: 'password' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginDuration.add(Date.now() - loginStart);
  
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has accessToken': (r) => JSON.parse(r.body).data?.accessToken !== undefined,
  });
  errorRate.add(!loginSuccess);
  
  if (loginSuccess) {
    const token = JSON.parse(loginRes.body).data.accessToken;
    
    // Test authenticated endpoints
    const meRes = http.get('https://api.quiz2biz.com/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    check(meRes, {
      'me status is 200': (r) => r.status === 200,
    });
    
    // Test creating a session
    const sessionRes = http.post(
      'https://api.quiz2biz.com/api/v1/sessions',
      JSON.stringify({ questionnaireId: 'test' }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    check(sessionRes, {
      'session created': (r) => r.status === 201,
    });
  }
  
  sleep(1);
}
```

### 6.2 Database Performance Testing

```typescript
describe('Database Performance', () => {
  it('handles 1000 concurrent reads', async () => {
    const startTime = Date.now();
    
    const promises = Array(1000).fill(null).map(() => 
      prisma.user.findUnique({ where: { id: testUserId } })
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Under 5 seconds
  });
  
  it('complex query performs under 100ms', async () => {
    const startTime = Date.now();
    
    await prisma.session.findMany({
      where: {
        userId: testUserId,
        status: 'COMPLETED',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        responses: true,
        questionnaire: { include: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100);
  });
});
```

---

## Level 7: Accessibility Testing

### 7.1 Automated Accessibility Checks

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Compliance', () => {
  const pagesToTest = [
    '/auth/login',
    '/auth/register',
    '/dashboard',
    '/questionnaire/new',
    '/billing',
  ];
  
  pagesToTest.forEach((pagePath) => {
    test(`${pagePath} has no critical accessibility violations`, async ({ page }) => {
      await page.goto(`https://quiz2biz.com${pagePath}`);
      
      // Wait for dynamic content
      await page.waitForLoadState('networkidle');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toEqual([]);
    });
  });
  
  test('login form is keyboard navigable', async ({ page }) => {
    await page.goto('https://quiz2biz.com/auth/login');
    
    // Tab through form
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Email input
    await expect(page.locator('[name="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Password input
    await expect(page.locator('[name="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Submit button
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // Enter should submit
    await page.keyboard.type('test@test.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('password');
    await page.keyboard.press('Enter');
    
    await expect(page).toHaveURL(/\/dashboard|\/auth\/login/);
  });
  
  test('screen reader announcements work', async ({ page }) => {
    await page.goto('https://quiz2biz.com/auth/login');
    
    // Verify ARIA live regions
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
    
    // Trigger an error
    await page.click('button[type="submit"]');
    
    // Error should be announced
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible();
  });
});
```

---

## Level 8: Regression Testing

### 8.1 Visual Regression

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('login page matches baseline', async ({ page }) => {
    await page.goto('https://quiz2biz.com/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Full page screenshot comparison
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 100,
      threshold: 0.2,
    });
  });
  
  test('dashboard matches baseline', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    
    await page.goto('https://quiz2biz.com/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixels: 100,
    });
  });
});
```

### 8.2 API Contract Regression

```typescript
describe('API Contract Regression', () => {
  // Snapshot all API response structures
  const endpoints = [
    { method: 'GET', path: '/api/v1/health' },
    { method: 'POST', path: '/api/v1/auth/login', body: validCredentials },
    { method: 'GET', path: '/api/v1/auth/me', auth: true },
    { method: 'GET', path: '/api/v1/sessions', auth: true },
    { method: 'GET', path: '/api/v1/questionnaires', auth: true },
  ];
  
  endpoints.forEach(({ method, path, body, auth }) => {
    it(`${method} ${path} response structure unchanged`, async () => {
      let req = request(app)[method.toLowerCase()](path);
      
      if (auth) {
        req = req.set('Authorization', `Bearer ${validToken}`);
      }
      if (body) {
        req = req.send(body);
      }
      
      const response = await req;
      
      // Match response structure against saved snapshot
      expect(response.body).toMatchSnapshot();
    });
  });
});
```

---

## Execution Checklist

### Pre-Deployment Testing Sequence

```bash
# 1. Unit Tests (fast feedback)
npm run test:unit -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'

# 2. Contract Tests
npm run test:contract

# 3. Integration Tests  
npm run test:integration

# 4. Security Tests
npm run test:security

# 5. E2E Tests (against staging)
PLAYWRIGHT_BASE_URL=https://staging.quiz2biz.com npx playwright test

# 6. Performance Tests
k6 run --out json=results.json load-test.js

# 7. Accessibility Tests
npx playwright test accessibility/

# 8. Visual Regression
npx playwright test visual/ --update-snapshots
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/comprehensive-test.yml
name: Comprehensive Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        
      - name: Unit Tests
        run: npm run test:unit -- --coverage
        
      - name: Contract Tests  
        run: npm run test:contract
        
      - name: Integration Tests
        run: npm run test:integration
        
      - name: Security Tests
        run: npm run test:security
        
      - name: Build Application
        run: npm run build
        
      - name: Start Application
        run: npm run start &
        env:
          NODE_ENV: test
          
      - name: Wait for Application
        run: npx wait-on http://localhost:3000/api/v1/health
        
      - name: E2E Tests
        run: npx playwright test
        
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        
      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/
            test-results/
```

---

## Key Learnings Applied

| Bug Pattern | Test Type That Catches It |
|-------------|---------------------------|
| Response wrapper mismatch | Contract tests, E2E API validation |
| Auth token not stored | E2E localStorage verification |
| CSRF token missing | Integration auth flow tests |
| Rate limiting bypass | Security rate limit tests |
| SQL injection | Input validation security tests |
| Session not persisting | E2E persistence tests |
| Race condition | Concurrent operation tests |
| Memory leak | Performance/load tests |
| Accessibility violation | Automated a11y scans |
| Visual regression | Screenshot comparison |

---

## Remember

> **Tests that pass but don't catch bugs are worse than no tests** - they give false confidence.

Every test should answer: "What specific production bug would this catch?"

If you can't answer that, the test is probably not worth having.
