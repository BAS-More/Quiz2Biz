# Automated Bug Detection Scripts

> Executable scripts to automatically detect bugs from each taxonomy category

---

## 1. Contract Mismatch Detector

Detects the exact bug we found - response structure mismatches.

```typescript
// tests/contract/api-contract.test.ts
import { OpenAPIValidator } from '@seriousme/openapi-schema-validator';
import axios from 'axios';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

describe('API Contract Compliance', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  let spec: any;
  
  beforeAll(async () => {
    // Load OpenAPI spec
    const specFile = fs.readFileSync('./docs/openapi.yaml', 'utf8');
    spec = yaml.load(specFile);
  });
  
  // Auto-generate tests for every endpoint in spec
  const generateContractTests = () => {
    const paths = Object.keys(spec.paths);
    
    paths.forEach(path => {
      const methods = Object.keys(spec.paths[path]);
      
      methods.forEach(method => {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const operation = spec.paths[path][method];
          const operationId = operation.operationId || `${method} ${path}`;
          
          it(`${operationId} response matches spec`, async () => {
            // Make request (with auth if needed)
            const response = await makeRequest(method, path, operation);
            
            // Validate response against spec
            const expectedSchema = operation.responses['200']?.content?.['application/json']?.schema;
            
            if (expectedSchema) {
              const errors = validateAgainstSchema(response.data, expectedSchema);
              expect(errors).toEqual([]);
            }
          });
        }
      });
    });
  };
});
```

---

## 2. Authentication Flow Exhaustive Tester

Tests every possible auth scenario.

```typescript
// tests/security/auth-exhaustive.test.ts
describe('Authentication Security Exhaustive', () => {
  const baseUrl = process.env.API_URL;
  
  // Token manipulation tests
  describe('JWT Token Security', () => {
    const tokenManipulations = [
      { name: 'empty token', token: '' },
      { name: 'null token', token: 'null' },
      { name: 'undefined token', token: 'undefined' },
      { name: 'spaces only', token: '   ' },
      { name: 'bearer only', token: 'Bearer' },
      { name: 'bearer with space', token: 'Bearer ' },
      { name: 'wrong prefix', token: 'Basic validtoken' },
      { name: 'no prefix', token: 'validtoken' },
      { name: 'double bearer', token: 'Bearer Bearer validtoken' },
      { name: 'lowercase bearer', token: 'bearer validtoken' },
      { name: 'truncated token', token: 'Bearer eyJhbGciOi' },
      { name: 'malformed base64', token: 'Bearer not.valid.base64!' },
      { name: 'wrong algorithm (none)', token: generateNoneAlgToken() },
      { name: 'wrong algorithm (HS256 when RS256)', token: generateWrongAlgToken() },
      { name: 'expired token', token: generateExpiredToken() },
      { name: 'future nbf', token: generateFutureToken() },
      { name: 'wrong issuer', token: generateWrongIssuerToken() },
      { name: 'wrong audience', token: generateWrongAudienceToken() },
      { name: 'tampered payload', token: generateTamperedToken() },
      { name: 'null byte in token', token: 'Bearer valid\x00token' },
      { name: 'unicode in token', token: 'Bearer validtoken™' },
    ];
    
    tokenManipulations.forEach(({ name, token }) => {
      it(`rejects ${name}`, async () => {
        const response = await axios.get(`${baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: token },
          validateStatus: () => true,
        });
        
        expect(response.status).toBe(401);
        expect(response.data.error?.code).toMatch(/UNAUTHORIZED|INVALID_TOKEN|TOKEN_EXPIRED/);
      });
    });
  });
  
  // Session manipulation tests
  describe('Session Security', () => {
    it('cannot use session ID from different user', async () => {
      const user1Session = await loginAs('user1@test.com');
      const user2Session = await loginAs('user2@test.com');
      
      // Try to use user1's session to access user2's data
      const response = await axios.get(`${baseUrl}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${user2Session.accessToken}` },
        // But with user1's cookies
        headers: { Cookie: user1Session.cookies },
      });
      
      // Should get user2's data (token wins) or error, never user1's data
      expect(response.data.data.email).not.toBe('user1@test.com');
    });
  });
  
  // Brute force protection
  describe('Brute Force Protection', () => {
    it('locks account after threshold', async () => {
      const email = `locktest-${Date.now()}@test.com`;
      await createUser(email);
      
      // Attempt wrong password multiple times
      for (let i = 0; i < 10; i++) {
        await axios.post(`${baseUrl}/api/v1/auth/login`, {
          email,
          password: 'wrongpassword' + i,
        }, { validateStatus: () => true });
      }
      
      // Even with correct password, should be locked
      const response = await axios.post(`${baseUrl}/api/v1/auth/login`, {
        email,
        password: 'correctpassword',
      }, { validateStatus: () => true });
      
      expect(response.status).toBe(401);
      expect(response.data.error.message).toMatch(/locked/i);
    });
    
    it('rate limits login attempts', async () => {
      const responses: number[] = [];
      
      // Rapid fire requests
      const promises = Array(20).fill(null).map(() => 
        axios.post(`${baseUrl}/api/v1/auth/login`, {
          email: 'ratelimit@test.com',
          password: 'password',
        }, { validateStatus: () => true })
      );
      
      const results = await Promise.all(promises);
      const rateLimited = results.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

---

## 3. Input Fuzzer

Automatically generates and tests malicious inputs.

```typescript
// tests/security/input-fuzzer.test.ts
describe('Input Fuzzing', () => {
  // Malicious payloads database
  const fuzzyInputs = {
    sqlInjection: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1; UPDATE users SET admin=1 WHERE id=1; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#",
      "') OR ('1'='1",
      "'; EXEC xp_cmdshell('dir'); --",
      "1' AND '1'='1",
      "1' ORDER BY 1--+",
    ],
    nosqlInjection: [
      '{"$gt": ""}',
      '{"$ne": null}',
      '{"$where": "this.password.length > 0"}',
      '{"$regex": ".*"}',
      '{"$or": [{}]}',
      '{"__proto__": {"admin": true}}',
      '{"constructor": {"prototype": {"admin": true}}}',
    ],
    xss: [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '"><script>alert(1)</script>',
      "'-alert(1)-'",
      '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
      '{{constructor.constructor("alert(1)")()}}',
    ],
    commandInjection: [
      '; ls -la',
      '| cat /etc/passwd',
      '`whoami`',
      '$(whoami)',
      '& ping -c 10 localhost',
      '\n/bin/bash -i',
      '|| true',
      '&& echo vulnerable',
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc/passwd',
      '/etc/passwd%00.jpg',
      '....\/....\/....\/etc/passwd',
    ],
    bufferOverflow: [
      'A'.repeat(10000),
      'A'.repeat(100000),
      '\x00'.repeat(1000),
      String.fromCharCode(...Array(1000).fill(0).map(() => Math.random() * 256)),
    ],
    formatString: [
      '%s%s%s%s%s%s%s%s%s%s',
      '%x%x%x%x%x%x%x%x%x%x',
      '%n%n%n%n%n%n%n%n%n%n',
      '%p%p%p%p%p%p%p%p%p%p',
    ],
    unicode: [
      '\u0000', // Null
      '\u202e', // RTL override
      '\ufeff', // BOM
      '\u200b', // Zero-width space
      '\u2028', // Line separator
      '\u2029', // Paragraph separator
      'A\u0300\u0300\u0300\u0300\u0300', // Combining marks
      '\ud83d\ude00', // Emoji
      '\ud800', // Unpaired surrogate
      '﷽'.repeat(100), // Long Unicode character
    ],
  };
  
  // Endpoints to test
  const endpoints = [
    { method: 'POST', path: '/api/v1/auth/login', fields: ['email', 'password'] },
    { method: 'POST', path: '/api/v1/auth/register', fields: ['email', 'password', 'name'] },
    { method: 'POST', path: '/api/v1/sessions', fields: ['questionnaireId', 'name'], auth: true },
    { method: 'PATCH', path: '/api/v1/users/profile', fields: ['name', 'company'], auth: true },
  ];
  
  endpoints.forEach(({ method, path, fields, auth }) => {
    describe(`Fuzzing ${method} ${path}`, () => {
      Object.entries(fuzzyInputs).forEach(([category, payloads]) => {
        fields.forEach(field => {
          payloads.forEach((payload, index) => {
            it(`${field} resists ${category} #${index + 1}`, async () => {
              const body: any = {};
              fields.forEach(f => {
                body[f] = f === field ? payload : 'validvalue';
              });
              
              const headers: any = { 'Content-Type': 'application/json' };
              if (auth) {
                headers.Authorization = `Bearer ${await getValidToken()}`;
              }
              
              const response = await axios({
                method: method.toLowerCase(),
                url: `${baseUrl}${path}`,
                data: body,
                headers,
                validateStatus: () => true,
                timeout: 5000,
              });
              
              // Should not crash (500)
              expect(response.status).not.toBe(500);
              
              // Should not execute (check for signs of injection)
              expect(response.data).not.toMatch(/syntax error/i);
              expect(response.data).not.toMatch(/SQL/i);
              expect(response.data).not.toMatch(/root:/);
              expect(response.data).not.toMatch(/uid=/);
            });
          });
        });
      });
    });
  });
});
```

---

## 4. Concurrency Tester

Finds race conditions and concurrent access bugs.

```typescript
// tests/concurrency/race-conditions.test.ts
describe('Race Condition Detection', () => {
  describe('Double Spending Prevention', () => {
    it('prevents concurrent balance withdrawal', async () => {
      // Setup user with known balance
      const user = await createUserWithBalance(100);
      const token = await loginAs(user.email);
      
      // Attempt 10 concurrent withdrawals of 20 each
      // Only 5 should succeed (100 / 20 = 5)
      const promises = Array(10).fill(null).map(() =>
        axios.post(`${baseUrl}/api/v1/billing/withdraw`, {
          amount: 20,
        }, {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true,
        })
      );
      
      const results = await Promise.all(promises);
      const successes = results.filter(r => r.status === 200);
      const failures = results.filter(r => r.status !== 200);
      
      // Should have exactly 5 successes
      expect(successes.length).toBe(5);
      expect(failures.length).toBe(5);
      
      // Final balance should be 0, not negative
      const balance = await getBalance(user.id);
      expect(balance).toBe(0);
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Inventory Overselling Prevention', () => {
    it('prevents concurrent purchase of limited item', async () => {
      // Create item with quantity 1
      const item = await createItem({ quantity: 1 });
      
      // 10 concurrent purchase attempts
      const users = await Promise.all(
        Array(10).fill(null).map(() => createAndLoginUser())
      );
      
      const promises = users.map(user =>
        axios.post(`${baseUrl}/api/v1/orders`, {
          itemId: item.id,
          quantity: 1,
        }, {
          headers: { Authorization: `Bearer ${user.token}` },
          validateStatus: () => true,
        })
      );
      
      const results = await Promise.all(promises);
      const successes = results.filter(r => r.status === 201);
      
      // Only 1 should succeed
      expect(successes.length).toBe(1);
      
      // Item quantity should be 0
      const updatedItem = await getItem(item.id);
      expect(updatedItem.quantity).toBe(0);
    });
  });
  
  describe('Token Refresh Race', () => {
    it('handles concurrent token refresh correctly', async () => {
      const { accessToken, refreshToken } = await login();
      
      // 5 concurrent refresh attempts with same refresh token
      const promises = Array(5).fill(null).map(() =>
        axios.post(`${baseUrl}/api/v1/auth/refresh`, {
          refreshToken,
        }, { validateStatus: () => true })
      );
      
      const results = await Promise.all(promises);
      const successes = results.filter(r => r.status === 200);
      
      // With token rotation: only 1 should succeed
      // Without token rotation: all 5 should succeed
      // Either is valid, but behavior should be consistent
      expect(successes.length).toBeGreaterThanOrEqual(1);
      
      // All successful responses should have valid tokens
      for (const success of successes) {
        expect(success.data.data.accessToken).toBeTruthy();
      }
    });
  });
  
  describe('Concurrent Write Detection', () => {
    it('detects optimistic locking conflicts', async () => {
      const resource = await createResource();
      const token = await getToken();
      
      // Get resource twice
      const get1 = await axios.get(`${baseUrl}/api/v1/resources/${resource.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const get2 = await axios.get(`${baseUrl}/api/v1/resources/${resource.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update with version from first get
      const update1 = await axios.patch(
        `${baseUrl}/api/v1/resources/${resource.id}`,
        { name: 'Update 1', version: get1.data.data.version },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );
      
      // Update with version from second get (now stale)
      const update2 = await axios.patch(
        `${baseUrl}/api/v1/resources/${resource.id}`,
        { name: 'Update 2', version: get2.data.data.version },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );
      
      // First should succeed, second should fail with conflict
      expect(update1.status).toBe(200);
      expect(update2.status).toBe(409); // Conflict
    });
  });
});
```

---

## 5. Error Handling Verifier

Ensures all error paths are handled correctly.

```typescript
// tests/resilience/error-handling.test.ts
describe('Error Handling Completeness', () => {
  describe('Database Failure Handling', () => {
    it('handles database connection failure', async () => {
      // Simulate DB down by using wrong connection
      const response = await axios.get(`${baseUrl}/api/v1/health`, {
        headers: { 'X-Test-DB-Failure': 'connection-refused' },
        validateStatus: () => true,
      });
      
      // Should not expose internal error details
      expect(response.data).not.toMatch(/ECONNREFUSED/);
      expect(response.data).not.toMatch(/connection/i);
      
      // Should return appropriate status
      expect(response.status).toBe(503);
      expect(response.data.error.code).toBe('SERVICE_UNAVAILABLE');
    });
    
    it('handles query timeout', async () => {
      const response = await axios.get(`${baseUrl}/api/v1/reports/complex`, {
        headers: { 'X-Test-Slow-Query': 'true' },
        validateStatus: () => true,
        timeout: 35000, // Allow for 30s timeout + buffer
      });
      
      expect(response.status).toBe(504);
      expect(response.data.error.code).toBe('GATEWAY_TIMEOUT');
    });
  });
  
  describe('External Service Failure Handling', () => {
    const services = ['redis', 'email', 'storage', 'payment'];
    
    services.forEach(service => {
      it(`handles ${service} service failure gracefully`, async () => {
        const response = await axios.post(
          `${baseUrl}/api/v1/test/trigger-${service}-action`,
          {},
          {
            headers: { 
              'X-Test-Service-Failure': service,
              Authorization: `Bearer ${await getToken()}`,
            },
            validateStatus: () => true,
          }
        );
        
        // Should not crash
        expect(response.status).not.toBe(500);
        
        // Should provide meaningful error
        expect(response.data.error).toBeDefined();
        expect(response.data.error.message).not.toContain('undefined');
        expect(response.data.error.message).not.toContain('null');
      });
    });
  });
  
  describe('Malformed Request Handling', () => {
    const malformedRequests = [
      { name: 'invalid JSON', body: '{invalid}', contentType: 'application/json' },
      { name: 'empty body', body: '', contentType: 'application/json' },
      { name: 'null body', body: 'null', contentType: 'application/json' },
      { name: 'array body where object expected', body: '[]', contentType: 'application/json' },
      { name: 'wrong content type', body: '{"valid": "json"}', contentType: 'text/plain' },
      { name: 'form data as JSON', body: 'key=value', contentType: 'application/json' },
      { name: 'binary garbage', body: Buffer.from([0x00, 0x01, 0x02]), contentType: 'application/json' },
    ];
    
    malformedRequests.forEach(({ name, body, contentType }) => {
      it(`handles ${name}`, async () => {
        const response = await axios.post(
          `${baseUrl}/api/v1/auth/login`,
          body,
          {
            headers: { 'Content-Type': contentType },
            validateStatus: () => true,
            transformRequest: [(data) => data], // Don't transform
          }
        );
        
        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });
    });
  });
});
```

---

## 6. Boundary Condition Scanner

Tests all edge values.

```typescript
// tests/boundary/limits.test.ts
describe('Boundary Condition Testing', () => {
  describe('Numeric Boundaries', () => {
    const numericBoundaries = [
      { name: 'zero', value: 0 },
      { name: 'negative zero', value: -0 },
      { name: 'one', value: 1 },
      { name: 'negative one', value: -1 },
      { name: 'max safe integer', value: Number.MAX_SAFE_INTEGER },
      { name: 'min safe integer', value: Number.MIN_SAFE_INTEGER },
      { name: 'max safe + 1', value: Number.MAX_SAFE_INTEGER + 1 },
      { name: 'max value', value: Number.MAX_VALUE },
      { name: 'min value', value: Number.MIN_VALUE },
      { name: 'infinity', value: Infinity },
      { name: 'negative infinity', value: -Infinity },
      { name: 'NaN', value: NaN },
      { name: 'float precision', value: 0.1 + 0.2 },
      { name: 'very small float', value: 0.0000000001 },
      { name: 'scientific notation', value: 1e308 },
    ];
    
    numericBoundaries.forEach(({ name, value }) => {
      it(`handles numeric boundary: ${name}`, async () => {
        const response = await axios.post(
          `${baseUrl}/api/v1/test/numeric`,
          { value },
          { validateStatus: () => true }
        );
        
        // Should not crash
        expect(response.status).not.toBe(500);
        
        // Response should be deterministic
        const response2 = await axios.post(
          `${baseUrl}/api/v1/test/numeric`,
          { value },
          { validateStatus: () => true }
        );
        expect(response.status).toBe(response2.status);
      });
    });
  });
  
  describe('String Boundaries', () => {
    const stringBoundaries = [
      { name: 'empty string', value: '' },
      { name: 'single char', value: 'a' },
      { name: 'max length', value: 'a'.repeat(255) },
      { name: 'max + 1', value: 'a'.repeat(256) },
      { name: 'very long', value: 'a'.repeat(100000) },
      { name: 'null char', value: '\x00' },
      { name: 'all whitespace', value: '   \t\n   ' },
      { name: 'unicode max', value: '\u{10FFFF}' },
      { name: 'emoji', value: '👨‍👩‍👧‍👦' }, // Multi-codepoint emoji
      { name: 'RTL text', value: '\u202Eevil' },
      { name: 'combining chars', value: 'a\u0300\u0300\u0300\u0300\u0300' },
    ];
    
    stringBoundaries.forEach(({ name, value }) => {
      it(`handles string boundary: ${name}`, async () => {
        const response = await axios.post(
          `${baseUrl}/api/v1/test/string`,
          { value },
          { validateStatus: () => true }
        );
        
        expect(response.status).not.toBe(500);
      });
    });
  });
  
  describe('Date Boundaries', () => {
    const dateBoundaries = [
      { name: 'unix epoch', value: '1970-01-01T00:00:00Z' },
      { name: 'before epoch', value: '1969-12-31T23:59:59Z' },
      { name: 'y2k', value: '2000-01-01T00:00:00Z' },
      { name: 'y2038 problem', value: '2038-01-19T03:14:07Z' },
      { name: 'far future', value: '9999-12-31T23:59:59Z' },
      { name: 'leap second', value: '2016-12-31T23:59:60Z' },
      { name: 'DST spring forward', value: '2024-03-10T02:30:00-05:00' },
      { name: 'DST fall back', value: '2024-11-03T01:30:00-04:00' },
      { name: 'leap year Feb 29', value: '2024-02-29T12:00:00Z' },
      { name: 'non-leap year Feb 29', value: '2023-02-29T12:00:00Z' },
      { name: 'invalid date', value: '2024-13-45T99:99:99Z' },
    ];
    
    dateBoundaries.forEach(({ name, value }) => {
      it(`handles date boundary: ${name}`, async () => {
        const response = await axios.post(
          `${baseUrl}/api/v1/test/date`,
          { value },
          { validateStatus: () => true }
        );
        
        expect(response.status).not.toBe(500);
      });
    });
  });
  
  describe('Array Boundaries', () => {
    it('handles empty array', async () => {
      const response = await axios.post(
        `${baseUrl}/api/v1/test/array`,
        { items: [] },
        { validateStatus: () => true }
      );
      expect(response.status).not.toBe(500);
    });
    
    it('handles single element array', async () => {
      const response = await axios.post(
        `${baseUrl}/api/v1/test/array`,
        { items: ['one'] },
        { validateStatus: () => true }
      );
      expect(response.status).not.toBe(500);
    });
    
    it('handles large array', async () => {
      const response = await axios.post(
        `${baseUrl}/api/v1/test/array`,
        { items: Array(10000).fill('item') },
        { validateStatus: () => true }
      );
      expect(response.status).not.toBe(500);
    });
    
    it('handles nested arrays', async () => {
      let nested: any = 'value';
      for (let i = 0; i < 100; i++) {
        nested = [nested];
      }
      
      const response = await axios.post(
        `${baseUrl}/api/v1/test/array`,
        { items: nested },
        { validateStatus: () => true }
      );
      expect(response.status).not.toBe(500);
    });
  });
});
```

---

## 7. State Consistency Checker

Verifies state is consistent across operations.

```typescript
// tests/consistency/state.test.ts
describe('State Consistency', () => {
  describe('Frontend-Backend State Sync', () => {
    it('localStorage matches server state after operations', async ({ page }) => {
      await loginAs('test@test.com', page);
      
      // Create something
      await page.click('[data-testid="create-project"]');
      await page.fill('[name="name"]', 'Test Project');
      await page.click('[data-testid="submit"]');
      
      // Get frontend state
      const frontendState = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('projects') || '[]');
      });
      
      // Get backend state
      const backendState = await axios.get(`${baseUrl}/api/v1/projects`, {
        headers: { Authorization: `Bearer ${await getStoredToken(page)}` },
      });
      
      // Compare
      expect(frontendState.length).toBe(backendState.data.data.length);
      expect(frontendState.map(p => p.id).sort())
        .toEqual(backendState.data.data.map(p => p.id).sort());
    });
  });
  
  describe('Database Referential Integrity', () => {
    it('no orphaned records after deletion', async () => {
      // Create user with related data
      const user = await createUserWithProjects(5);
      
      // Delete user
      await axios.delete(`${baseUrl}/api/v1/users/${user.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      
      // Check for orphaned projects
      const orphanedProjects = await prisma.project.findMany({
        where: { userId: user.id },
      });
      
      expect(orphanedProjects.length).toBe(0);
    });
    
    it('all foreign keys reference existing records', async () => {
      // Query for broken foreign keys
      const brokenRefs = await prisma.$queryRaw`
        SELECT p.id, p.user_id 
        FROM projects p 
        LEFT JOIN users u ON p.user_id = u.id 
        WHERE u.id IS NULL
      `;
      
      expect(brokenRefs).toHaveLength(0);
    });
  });
  
  describe('Cache Consistency', () => {
    it('cache reflects database after update', async () => {
      const project = await createProject();
      
      // Ensure cached
      await axios.get(`${baseUrl}/api/v1/projects/${project.id}`);
      
      // Update directly in DB (simulating another service)
      await prisma.project.update({
        where: { id: project.id },
        data: { name: 'Updated Name' },
      });
      
      // Invalidate cache
      await axios.post(`${baseUrl}/api/v1/admin/cache/invalidate`, {
        key: `project:${project.id}`,
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      
      // Should get updated value
      const response = await axios.get(`${baseUrl}/api/v1/projects/${project.id}`);
      expect(response.data.data.name).toBe('Updated Name');
    });
  });
});
```

---

## 8. Chaos Test Suite

Introduces failures to verify resilience.

```typescript
// tests/chaos/resilience.test.ts
describe('Chaos Engineering Tests', () => {
  describe('Service Failure Recovery', () => {
    it('recovers from database restart', async () => {
      // Verify healthy
      let health = await axios.get(`${baseUrl}/api/v1/health`);
      expect(health.data.status).toBe('ok');
      
      // Simulate database restart
      await triggerChaos('database-restart');
      
      // Wait for recovery
      await waitFor(async () => {
        const h = await axios.get(`${baseUrl}/api/v1/health`, {
          validateStatus: () => true,
        });
        return h.data.status === 'ok';
      }, { timeout: 60000 });
      
      // Verify functional
      const response = await axios.get(`${baseUrl}/api/v1/sessions`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      expect(response.status).toBe(200);
    });
    
    it('handles partial service degradation', async () => {
      // Inject latency to database
      await triggerChaos('database-latency', { latencyMs: 500 });
      
      // Requests should still work, just slower
      const start = Date.now();
      const response = await axios.get(`${baseUrl}/api/v1/sessions`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        timeout: 10000,
      });
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeGreaterThan(500); // Reflects latency
      
      // Cleanup
      await triggerChaos('database-latency', { latencyMs: 0 });
    });
  });
  
  describe('Network Partition Handling', () => {
    it('handles network partition gracefully', async () => {
      // Simulate network partition
      await triggerChaos('network-partition');
      
      // Requests should timeout or fail gracefully
      const response = await axios.get(`${baseUrl}/api/v1/health`, {
        timeout: 5000,
        validateStatus: () => true,
      });
      
      expect(response.status).toBeOneOf([503, 504]);
      
      // Heal partition
      await triggerChaos('network-heal');
      
      // Should recover
      await waitFor(async () => {
        const h = await axios.get(`${baseUrl}/api/v1/health`, {
          validateStatus: () => true,
        });
        return h.status === 200;
      });
    });
  });
  
  describe('Resource Exhaustion', () => {
    it('handles memory pressure', async () => {
      // Trigger memory pressure
      await triggerChaos('memory-pressure');
      
      // Should still respond (maybe degraded)
      const response = await axios.get(`${baseUrl}/api/v1/health`, {
        timeout: 30000,
        validateStatus: () => true,
      });
      
      expect(response.status).not.toBe(500);
      
      // Release pressure
      await triggerChaos('memory-release');
    });
    
    it('handles connection pool exhaustion', async () => {
      // Exhaust connections
      const promises = Array(1000).fill(null).map(() =>
        axios.get(`${baseUrl}/api/v1/sessions`, {
          headers: { Authorization: `Bearer ${validToken}` },
          validateStatus: () => true,
        })
      );
      
      const results = await Promise.all(promises);
      
      // Should gracefully reject excess, not crash
      const errors = results.filter(r => r.status >= 500);
      expect(errors.length).toBe(0);
      
      // Some may be rejected with 503, but not 500
      const rejected = results.filter(r => r.status === 503);
      // OK to have some rejections under load
    });
  });
});
```

---

## Usage

Run all tests:
```bash
# Contract tests
npm run test:contract

# Security tests
npm run test:security

# Concurrency tests
npm run test:concurrency

# Resilience tests
npm run test:resilience

# Boundary tests
npm run test:boundary

# Full chaos suite (staging only)
CHAOS_ENABLED=true npm run test:chaos

# Complete bug detection
npm run test:bugs
```

Configure in package.json:
```json
{
  "scripts": {
    "test:bugs": "npm run test:contract && npm run test:security && npm run test:concurrency && npm run test:resilience && npm run test:boundary"
  }
}
```
