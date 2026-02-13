/**
 * Quiz2Biz E2E Test Fixtures
 * Provides reusable test data and utilities
 */
import { test as base, expect, Page, APIRequestContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ============================================
// USER FIXTURES
// ============================================
export const testUsers = {
  admin: {
    id: 'usr_admin_001',
    email: 'admin@quiz2biz.test',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'ADMIN',
    subscription: 'ENTERPRISE',
  },
  moderator: {
    id: 'usr_mod_001',
    email: 'moderator@quiz2biz.test',
    password: 'ModeratorPassword123!',
    name: 'Moderator User',
    role: 'MODERATOR',
    subscription: 'PROFESSIONAL',
  },
  user: {
    id: 'usr_user_001',
    email: 'user@quiz2biz.test',
    password: 'UserPassword123!',
    name: 'Regular User',
    role: 'USER',
    subscription: 'FREE',
  },
  professionalUser: {
    id: 'usr_pro_001',
    email: 'pro@quiz2biz.test',
    password: 'ProPassword123!',
    name: 'Professional User',
    role: 'USER',
    subscription: 'PROFESSIONAL',
  },
  enterpriseUser: {
    id: 'usr_ent_001',
    email: 'enterprise@quiz2biz.test',
    password: 'EnterprisePassword123!',
    name: 'Enterprise User',
    role: 'USER',
    subscription: 'ENTERPRISE',
  },
  newUser: {
    email: `testuser-${Date.now()}@quiz2biz.test`,
    password: 'NewUserPassword123!',
    name: 'New Test User',
    role: 'USER',
    subscription: 'FREE',
  },
};

// ============================================
// QUESTIONNAIRE FIXTURES
// ============================================
export const testQuestionnaires = {
  securityAssessment: {
    id: 'q_security_001',
    name: 'Security Assessment',
    dimension: 'SECURITY',
    questions: 15,
    estimatedTime: '30 minutes',
  },
  architectureReview: {
    id: 'q_arch_001',
    name: 'Architecture Review',
    dimension: 'ARCHITECTURE',
    questions: 12,
    estimatedTime: '25 minutes',
  },
  dataPrivacy: {
    id: 'q_privacy_001',
    name: 'Data Privacy & Compliance',
    dimension: 'PRIVACY',
    questions: 18,
    estimatedTime: '35 minutes',
  },
  operationalReadiness: {
    id: 'q_ops_001',
    name: 'Operational Readiness',
    dimension: 'OPERATIONAL',
    questions: 10,
    estimatedTime: '20 minutes',
  },
  financialHealth: {
    id: 'q_finance_001',
    name: 'Financial Health',
    dimension: 'FINANCIAL',
    questions: 8,
    estimatedTime: '15 minutes',
  },
};

// ============================================
// RESPONSE FIXTURES (All 11 Question Types)
// ============================================
export const testResponses = {
  yesNo: {
    type: 'BOOLEAN',
    value: true,
  },
  scale: {
    type: 'SCALE',
    value: 4,
    min: 1,
    max: 5,
  },
  text: {
    type: 'TEXT',
    value: 'This is a test response for E2E testing with comprehensive details.',
  },
  longText: {
    type: 'LONG_TEXT',
    value:
      'This is a longer response that provides more context and explanation for the E2E testing scenario. It includes multiple sentences and covers various aspects of the question.',
  },
  multipleChoice: {
    type: 'MULTIPLE_CHOICE',
    value: ['Option A', 'Option C'],
  },
  singleChoice: {
    type: 'SINGLE_CHOICE',
    value: 'Option B',
  },
  number: {
    type: 'NUMBER',
    value: 42,
  },
  percentage: {
    type: 'PERCENTAGE',
    value: 85,
  },
  date: {
    type: 'DATE',
    value: '2026-01-15',
  },
  dateRange: {
    type: 'DATE_RANGE',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  },
  matrix: {
    type: 'MATRIX',
    value: {
      Security: 4,
      Performance: 5,
      Scalability: 3,
    },
  },
};

// ============================================
// EVIDENCE FIXTURES
// ============================================
export const testEvidence = {
  document: {
    id: 'ev_doc_001',
    type: 'DOCUMENT',
    name: 'security-policy.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 1024, // 1MB
    description: 'Security policy document for compliance',
  },
  screenshot: {
    id: 'ev_img_001',
    type: 'IMAGE',
    name: 'dashboard-screenshot.png',
    mimeType: 'image/png',
    size: 512 * 1024, // 512KB
    description: 'Screenshot of security dashboard',
  },
  codeSnippet: {
    id: 'ev_code_001',
    type: 'CODE',
    name: 'auth-implementation.ts',
    mimeType: 'text/typescript',
    content: 'export const authenticate = (token: string) => { /* ... */ };',
    description: 'Authentication implementation code',
  },
  link: {
    id: 'ev_link_001',
    type: 'URL',
    url: 'https://github.com/org/repo/security',
    description: 'Link to security documentation',
  },
  ciReport: {
    id: 'ev_ci_001',
    type: 'CI_ARTIFACT',
    name: 'test-report.xml',
    mimeType: 'application/xml',
    source: 'azure-pipelines',
    description: 'CI/CD test report',
  },
};

// ============================================
// SUBSCRIPTION FIXTURES
// ============================================
export const testSubscriptions = {
  free: {
    tier: 'FREE',
    features: ['3 questionnaires', 'Basic reports', 'Email support'],
    price: 0,
  },
  professional: {
    tier: 'PROFESSIONAL',
    monthlyPrice: 49,
    yearlyPrice: 470,
    features: [
      'Unlimited questionnaires',
      'Advanced reports',
      'Document generation',
      'Priority support',
    ],
    stripeTestPriceId: 'price_test_professional',
  },
  enterprise: {
    tier: 'ENTERPRISE',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: [
      'All Professional features',
      'Team collaboration',
      'API access',
      'SSO',
      'Dedicated support',
    ],
    stripeTestPriceId: 'price_test_enterprise',
  },
};

// ============================================
// STRIPE TEST CARD FIXTURES
// ============================================
export const stripeTestCards = {
  visa: {
    number: '4242424242424242',
    expiry: '12/30',
    cvc: '123',
    zip: '12345',
  },
  visaDebit: {
    number: '4000056655665556',
    expiry: '12/30',
    cvc: '123',
    zip: '12345',
  },
  mastercard: {
    number: '5555555555554444',
    expiry: '12/30',
    cvc: '123',
    zip: '12345',
  },
  amex: {
    number: '378282246310005',
    expiry: '12/30',
    cvc: '1234',
    zip: '12345',
  },
  declined: {
    number: '4000000000000002',
    expiry: '12/30',
    cvc: '123',
    zip: '12345',
  },
  insufficientFunds: {
    number: '4000000000009995',
    expiry: '12/30',
    cvc: '123',
    zip: '12345',
  },
  expiredCard: {
    number: '4000000000000069',
    expiry: '12/30',
    cvc: '123',
    zip: '12345',
  },
  requires3DS: {
    number: '4000002500003155',
    expiry: '12/30',
    cvc: '123',
    zip: '12345',
  },
};

// ============================================
// APPROVAL WORKFLOW FIXTURES
// ============================================
export const testApprovals = {
  pending: {
    id: 'apr_001',
    type: 'POLICY_LOCK',
    status: 'PENDING',
    requester: testUsers.user,
    reason: 'Security policy update required for compliance',
    createdAt: '2026-01-15T10:00:00Z',
  },
  approved: {
    id: 'apr_002',
    type: 'ADR_APPROVAL',
    status: 'APPROVED',
    requester: testUsers.user,
    approver: testUsers.admin,
    reason: 'ADR-005: Database migration strategy',
    approvedAt: '2026-01-14T15:30:00Z',
  },
  rejected: {
    id: 'apr_003',
    type: 'POLICY_LOCK',
    status: 'REJECTED',
    requester: testUsers.user,
    rejector: testUsers.admin,
    reason: 'Access policy modification',
    rejectionReason: 'Does not meet security requirements',
    rejectedAt: '2026-01-13T09:00:00Z',
  },
};

// ============================================
// DOCUMENT GENERATION FIXTURES
// ============================================
export const testDocuments = {
  technologyRoadmap: {
    template: 'technology-roadmap',
    title: 'Technology Roadmap 2026',
    format: 'markdown',
    sections: ['Executive Summary', 'Current State', 'Target Architecture', 'Timeline'],
  },
  businessPlan: {
    template: 'business-plan',
    title: 'Business Plan Q1 2026',
    format: 'pdf',
    sections: ['Overview', 'Market Analysis', 'Financial Projections', 'Risks'],
  },
  policyPack: {
    template: 'policy-pack',
    title: 'Security Policy Pack',
    format: 'zip',
    policies: ['security', 'privacy', 'access-control', 'incident-response'],
  },
  architectureDossier: {
    template: 'architecture-dossier',
    title: 'Architecture Dossier',
    format: 'markdown',
    sections: ['C4 Diagrams', 'ADRs', 'Data Flow', 'Security Architecture'],
  },
};

// ============================================
// SESSION FIXTURES
// ============================================
export const testSessions = {
  active: {
    id: 'ses_001',
    status: 'IN_PROGRESS',
    progress: 45,
    questionsAnswered: 7,
    totalQuestions: 15,
    startedAt: '2026-01-15T08:00:00Z',
  },
  completed: {
    id: 'ses_002',
    status: 'COMPLETED',
    progress: 100,
    questionsAnswered: 15,
    totalQuestions: 15,
    startedAt: '2026-01-14T10:00:00Z',
    completedAt: '2026-01-14T11:30:00Z',
    score: 87,
  },
  abandoned: {
    id: 'ses_003',
    status: 'ABANDONED',
    progress: 20,
    questionsAnswered: 3,
    totalQuestions: 15,
    startedAt: '2026-01-10T14:00:00Z',
  },
};

// Extended test fixture with authentication
interface AuthenticatedFixtures {
  authenticatedPage: Page;
  adminPage: Page;
}

export const test = base.extend<AuthenticatedFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login as regular user before test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user.email);
    await page.fill('[data-testid="password-input"]', testUsers.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Login as admin before test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.admin.email);
    await page.fill('[data-testid="password-input"]', testUsers.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

// Re-export expect for convenience
export { expect };

// Helper functions
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login with specified credentials
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Logout current user
   */
  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }

  /**
   * Navigate to a specific questionnaire
   */
  async navigateToQuestionnaire(name: string) {
    await this.page.goto('/questionnaires');
    await this.page.click(`[data-testid="questionnaire-${name}"]`);
  }

  /**
   * Answer a question based on type
   */
  async answerQuestion(type: string, value: any) {
    switch (type) {
      case 'BOOLEAN':
        await this.page.click(`[data-testid="answer-${value ? 'yes' : 'no'}"]`);
        break;
      case 'SCALE':
        await this.page.click(`[data-testid="scale-value-${value}"]`);
        break;
      case 'TEXT':
        await this.page.fill('[data-testid="text-answer"]', value);
        break;
      case 'SINGLE_CHOICE':
        await this.page.click(`[data-testid="option-${value}"]`);
        break;
      case 'MULTIPLE_CHOICE':
        for (const option of value) {
          await this.page.click(`[data-testid="option-${option}"]`);
        }
        break;
    }
    await this.page.click('[data-testid="submit-answer"]');
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(endpoint: string) {
    return this.page.waitForResponse(
      (response) => response.url().includes(endpoint) && response.status() === 200,
    );
  }

  /**
   * Take screenshot with descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Clear local storage and cookies
   */
  async clearState() {
    await this.page.evaluate(() => localStorage.clear());
    await this.page.context().clearCookies();
  }

  /**
   * Upload a file to a file input
   */
  async uploadFile(selector: string, filePath: string) {
    const fileInput = await this.page.locator(selector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    const element = await this.page.locator(selector);
    return element.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoading() {
    await this.page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });
  }
}

// Export helper factory
export const createTestHelpers = (page: Page) => new TestHelpers(page);

// ============================================
// API UTILITIES
// ============================================
export class ApiUtils {
  constructor(private request: APIRequestContext) {}

  /**
   * Get authentication token for a user
   */
  async getAuthToken(email: string, password: string): Promise<string> {
    const response = await this.request.post('/api/auth/login', {
      data: { email, password },
    });
    const data = await response.json();
    return data.accessToken;
  }

  /**
   * Create a test session via API
   */
  async createSession(token: string, questionnaireId: string) {
    return this.request.post('/api/sessions', {
      headers: { Authorization: `Bearer ${token}` },
      data: { questionnaireId },
    });
  }

  /**
   * Submit a response via API
   */
  async submitResponse(token: string, sessionId: string, questionId: string, value: any) {
    return this.request.post(`/api/sessions/${sessionId}/responses`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { questionId, value },
    });
  }

  /**
   * Get session details via API
   */
  async getSession(token: string, sessionId: string) {
    return this.request.get(`/api/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Delete test data via API (admin only)
   */
  async cleanupTestData(adminToken: string) {
    return this.request.delete('/api/admin/test-cleanup', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }
}

export const createApiUtils = (request: APIRequestContext) => new ApiUtils(request);

// ============================================
// DATA LOADING UTILITIES
// ============================================
export class DataLoader {
  /**
   * Load fixture data from JSON file
   */
  static loadFixture<T>(filename: string): T {
    const fixturePath = path.join(__dirname, 'data', filename);
    const data = fs.readFileSync(fixturePath, 'utf-8');
    return JSON.parse(data) as T;
  }

  /**
   * Get test file path
   */
  static getTestFilePath(filename: string): string {
    return path.join(__dirname, 'test-files', filename);
  }

  /**
   * Create test file if not exists
   */
  static createTestFile(filename: string, content: string | Buffer): string {
    const filePath = path.join(__dirname, 'test-files', filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Generate random test data
   */
  static randomString(length: number = 10): string {
    return Math.random()
      .toString(36)
      .substring(2, length + 2);
  }

  static randomEmail(): string {
    return `test-${Date.now()}-${this.randomString(5)}@quiz2biz.test`;
  }

  static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// ============================================
// WAIT UTILITIES
// ============================================
export class WaitUtils {
  constructor(private page: Page) {}

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(timeout: number = 5000) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for element text to change
   */
  async waitForTextChange(selector: string, originalText: string, timeout: number = 5000) {
    await this.page.waitForFunction(
      ({ sel, orig }) => {
        const el = document.querySelector(sel);
        return el && el.textContent !== orig;
      },
      { sel: selector, orig: originalText },
      { timeout },
    );
  }

  /**
   * Wait for toast/notification
   */
  async waitForToast(type: 'success' | 'error' | 'info' = 'success') {
    await this.page.waitForSelector(`[data-testid="toast-${type}"]`, { timeout: 5000 });
  }

  /**
   * Retry action until success
   */
  async retryAction(action: () => Promise<void>, maxRetries: number = 3, delay: number = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await action();
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await this.page.waitForTimeout(delay);
      }
    }
  }
}

export const createWaitUtils = (page: Page) => new WaitUtils(page);

// ============================================
// MOCK UTILITIES
// ============================================
export class MockUtils {
  constructor(private page: Page) {}

  /**
   * Mock API response
   */
  async mockApiResponse(url: string, response: any, status: number = 200) {
    await this.page.route(`**${url}`, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock API error
   */
  async mockApiError(url: string, status: number = 500, message: string = 'Internal Server Error') {
    await this.page.route(`**${url}`, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message, statusCode: status }),
      });
    });
  }

  /**
   * Mock slow API response
   */
  async mockSlowResponse(url: string, delayMs: number = 3000) {
    await this.page.route(`**${url}`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }

  /**
   * Clear all mocks
   */
  async clearMocks() {
    await this.page.unroute('**/*');
  }
}

export const createMockUtils = (page: Page) => new MockUtils(page);

// ============================================
// ASSERTION UTILITIES
// ============================================
export class AssertionUtils {
  constructor(private page: Page) {}

  /**
   * Assert element count
   */
  async assertElementCount(selector: string, expectedCount: number) {
    const elements = await this.page.locator(selector).all();
    expect(elements.length).toBe(expectedCount);
  }

  /**
   * Assert URL contains
   */
  async assertUrlContains(text: string) {
    const url = this.page.url();
    expect(url).toContain(text);
  }

  /**
   * Assert local storage value
   */
  async assertLocalStorage(key: string, expectedValue: string) {
    const value = await this.page.evaluate((k) => localStorage.getItem(k), key);
    expect(value).toBe(expectedValue);
  }

  /**
   * Assert no console errors
   */
  async assertNoConsoleErrors() {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    // Wait a bit for any async errors
    await this.page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  }
}

export const createAssertionUtils = (page: Page) => new AssertionUtils(page);

// ============================================
// TEST DATA FACTORY
// ============================================
export const TestDataFactory = {
  /**
   * Create a unique user
   */
  createUser: () => ({
    email: DataLoader.randomEmail(),
    password: 'TestPassword123!',
    name: `Test User ${DataLoader.randomString(5)}`,
  }),

  /**
   * Create a test response
   */
  createResponse: (type: string) => {
    switch (type) {
      case 'BOOLEAN':
        return { type, value: Math.random() > 0.5 };
      case 'SCALE':
        return { type, value: DataLoader.randomNumber(1, 5) };
      case 'TEXT':
        return { type, value: `Test response ${DataLoader.randomString(20)}` };
      case 'NUMBER':
        return { type, value: DataLoader.randomNumber(1, 100) };
      default:
        return { type: 'TEXT', value: 'Default test response' };
    }
  },

  /**
   * Create evidence data
   */
  createEvidence: (type: string = 'DOCUMENT') => ({
    id: `ev_${DataLoader.randomString(8)}`,
    type,
    name: `test-evidence-${DataLoader.randomString(5)}.pdf`,
    description: `Test evidence ${DataLoader.randomString(10)}`,
  }),
};
