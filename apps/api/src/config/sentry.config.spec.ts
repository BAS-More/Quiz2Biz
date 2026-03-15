/**
 * @fileoverview Tests for sentry.config.ts
 */
import * as Sentry from '@sentry/nestjs';

// Mock Sentry before imports
jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
  captureException: jest.fn().mockReturnValue('event-id'),
  captureMessage: jest.fn().mockReturnValue('message-id'),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  startInactiveSpan: jest.fn().mockReturnValue({ finish: jest.fn() }),
}));

import { Logger } from '@nestjs/common';
import {
  getSentryConfig,
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  ALERTING_RULES,
} from './sentry.config';

describe('getSentryConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default config when no env vars set', () => {
    delete process.env.SENTRY_DSN;
    delete process.env.NODE_ENV;
    delete process.env.SENTRY_RELEASE;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_PROFILES_SAMPLE_RATE;
    delete process.env.SENTRY_DEBUG;

    const config = getSentryConfig();

    expect(config.dsn).toBe('');
    expect(config.environment).toBe('development');
    expect(config.tracesSampleRate).toBe(0.1);
    expect(config.profilesSampleRate).toBe(0.1);
    expect(config.debug).toBe(false);
  });

  it('should use env vars when set', () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';
    process.env.NODE_ENV = 'production';
    process.env.SENTRY_RELEASE = 'v1.0.0';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';
    process.env.SENTRY_PROFILES_SAMPLE_RATE = '0.3';
    process.env.SENTRY_DEBUG = 'true';

    const config = getSentryConfig();

    expect(config.dsn).toBe('https://test@sentry.io/123');
    expect(config.environment).toBe('production');
    expect(config.release).toBe('v1.0.0');
    expect(config.tracesSampleRate).toBe(0.5);
    expect(config.profilesSampleRate).toBe(0.3);
    expect(config.debug).toBe(true);
  });
});

describe('initializeSentry', () => {
  const originalEnv = process.env;
  const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
  });

  it('should skip initialization when DSN not provided', () => {
    delete process.env.SENTRY_DSN;

    initializeSentry();

    expect(warnSpy).toHaveBeenCalledWith('Sentry DSN not configured, skipping initialization');
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('should initialize when DSN is provided', () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';

    initializeSentry();

    expect(Sentry.init).toHaveBeenCalled();
  });
});

describe('captureException', () => {
  it('should capture exception with context', () => {
    const error = new Error('Test error');
    const context = { userId: '123' };

    const eventId = captureException(error, context);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: context,
    });
    expect(eventId).toBe('event-id');
  });

  it('should capture exception without context', () => {
    const error = new Error('Test error');

    captureException(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: undefined,
    });
  });
});

describe('captureMessage', () => {
  it('should capture message with default level', () => {
    const messageId = captureMessage('Test message');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info');
    expect(messageId).toBe('message-id');
  });

  it('should capture message with custom level', () => {
    captureMessage('Error message', 'error');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Error message', 'error');
  });
});

describe('setUser', () => {
  it('should set user context', () => {
    const user = { id: 'user-123', email: 'test@example.com', role: 'admin' };

    setUser(user);

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'test@example.com',
    });
  });

  it('should set user with only id', () => {
    const user = { id: 'user-456' };

    setUser(user);

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'user-456',
      email: undefined,
    });
  });
});

describe('clearUser', () => {
  it('should clear user context', () => {
    clearUser();

    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});

describe('addBreadcrumb', () => {
  it('should add breadcrumb with default level', () => {
    addBreadcrumb('test-category', 'Test message', { key: 'value' });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'test-category',
        message: 'Test message',
        data: { key: 'value' },
        level: 'info',
      }),
    );
  });

  it('should add breadcrumb with custom level', () => {
    addBreadcrumb('error-category', 'Error occurred', { error: 'details' }, 'error');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'error-category',
        message: 'Error occurred',
        level: 'error',
      }),
    );
  });

  it('should add breadcrumb without data', () => {
    addBreadcrumb('simple-category', 'Simple message');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'simple-category',
        message: 'Simple message',
        data: undefined,
      }),
    );
  });
});

describe('startTransaction', () => {
  it('should start inactive span', () => {
    const span = startTransaction('test-transaction', 'http');

    expect(Sentry.startInactiveSpan).toHaveBeenCalledWith({
      name: 'test-transaction',
      op: 'http',
    });
    expect(span).toBeDefined();
  });
});

describe('ALERTING_RULES', () => {
  it('should have error rate thresholds', () => {
    expect(ALERTING_RULES.errorRate.warning).toBe(0.01);
    expect(ALERTING_RULES.errorRate.critical).toBe(0.05);
  });

  it('should have response time thresholds', () => {
    expect(ALERTING_RULES.responseTime.warning).toBe(500);
    expect(ALERTING_RULES.responseTime.critical).toBe(1000);
  });

  it('should have critical errors list', () => {
    expect(ALERTING_RULES.criticalErrors).toContain('DatabaseError');
    expect(ALERTING_RULES.criticalErrors).toContain('AuthenticationError');
    expect(ALERTING_RULES.criticalErrors).toContain('PaymentError');
    expect(ALERTING_RULES.criticalErrors).toContain('SecurityError');
  });

  it('should have channel configuration', () => {
    expect(ALERTING_RULES.channels.email).toBe(true);
    expect(ALERTING_RULES.channels.slack).toBe(true);
    expect(ALERTING_RULES.channels.pagerduty).toBe(false);
  });
});

// ================================================================
// ADDITIONAL COVERAGE: beforeSend, beforeSendTransaction,
// initializeSentry with DSN, config branch coverage, default export
// ================================================================

describe('initializeSentry - Sentry.init options', () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should pass correct config to Sentry.init', () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/999';
    process.env.NODE_ENV = 'staging';
    process.env.SENTRY_RELEASE = 'v2.0.0';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.8';
    process.env.SENTRY_PROFILES_SAMPLE_RATE = '0.5';
    process.env.SENTRY_DEBUG = 'true';

    initializeSentry();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test@sentry.io/999',
        environment: 'staging',
        release: 'v2.0.0',
        tracesSampleRate: 0.8,
        profilesSampleRate: 0.5,
        debug: true,
      }),
    );
  });

  it('should log initialization message with environment', () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';
    process.env.NODE_ENV = 'production';

    initializeSentry();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('production'));
  });

  it('should include beforeSend in init options', () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';

    initializeSentry();

    const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(initCall.beforeSend).toBeDefined();
    expect(typeof initCall.beforeSend).toBe('function');
  });

  it('should include beforeSendTransaction in init options', () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';

    initializeSentry();

    const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(initCall.beforeSendTransaction).toBeDefined();
    expect(typeof initCall.beforeSendTransaction).toBe('function');
  });

  it('should include ignoreErrors list', () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';

    initializeSentry();

    const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(initCall.ignoreErrors).toContain('Non-Error promise rejection captured');
    expect(initCall.ignoreErrors).toContain('Request aborted');
    expect(initCall.ignoreErrors).toContain('ECONNRESET');
    expect(initCall.ignoreErrors).toContain('EPIPE');
  });

  describe('beforeSend callback', () => {
    let beforeSend: (event: any) => any;

    beforeEach(() => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      initializeSentry();
      beforeSend = (Sentry.init as jest.Mock).mock.calls[0][0].beforeSend;
    });

    it('should strip authorization header from request', () => {
      const event = {
        request: {
          headers: {
            authorization: 'Bearer secret-token',
            'content-type': 'application/json',
          },
        },
      };

      const result = beforeSend(event);
      expect(result.request.headers.authorization).toBeUndefined();
      expect(result.request.headers['content-type']).toBe('application/json');
    });

    it('should strip cookie header from request', () => {
      const event = {
        request: {
          headers: {
            cookie: 'session=abc123',
          },
        },
      };

      const result = beforeSend(event);
      expect(result.request.headers.cookie).toBeUndefined();
    });

    it('should strip x-api-key header from request', () => {
      const event = {
        request: {
          headers: {
            'x-api-key': 'my-secret-key',
          },
        },
      };

      const result = beforeSend(event);
      expect(result.request.headers['x-api-key']).toBeUndefined();
    });

    it('should handle event without request headers', () => {
      const event = { message: 'test error' };
      const result = beforeSend(event);
      expect(result).toEqual({ message: 'test error' });
    });

    it('should handle event with request but no headers', () => {
      const event = { request: { url: '/api/test' } };
      const result = beforeSend(event);
      expect(result.request.url).toBe('/api/test');
    });

    it('should redact password in breadcrumbs', () => {
      const event = {
        breadcrumbs: [
          { data: { password: 'super-secret', username: 'admin' } },
          { data: { safe: 'data' } },
        ],
      };

      const result = beforeSend(event);
      expect(result.breadcrumbs[0].data.password).toBe('[REDACTED]');
      expect(result.breadcrumbs[0].data.username).toBe('admin');
      expect(result.breadcrumbs[1].data.safe).toBe('data');
    });

    it('should redact token in breadcrumbs', () => {
      const event = {
        breadcrumbs: [{ data: { token: 'jwt-abc123', action: 'login' } }],
      };

      const result = beforeSend(event);
      expect(result.breadcrumbs[0].data.token).toBe('[REDACTED]');
      expect(result.breadcrumbs[0].data.action).toBe('login');
    });

    it('should handle breadcrumbs without data', () => {
      const event = {
        breadcrumbs: [{ category: 'http', message: 'request' }],
      };

      const result = beforeSend(event);
      expect(result.breadcrumbs[0].category).toBe('http');
    });

    it('should handle event without breadcrumbs', () => {
      const event = { message: 'no breadcrumbs' };
      const result = beforeSend(event);
      expect(result).toEqual({ message: 'no breadcrumbs' });
    });

    it('should return the event after processing', () => {
      const event = {
        request: { headers: { authorization: 'Bearer x' } },
        breadcrumbs: [{ data: { password: 'p', token: 't' } }],
      };

      const result = beforeSend(event);
      expect(result).toBeTruthy();
      expect(result.request.headers.authorization).toBeUndefined();
      expect(result.breadcrumbs[0].data.password).toBe('[REDACTED]');
      expect(result.breadcrumbs[0].data.token).toBe('[REDACTED]');
    });
  });

  describe('beforeSendTransaction callback', () => {
    let beforeSendTransaction: (event: any) => any;

    beforeEach(() => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      initializeSentry();
      beforeSendTransaction = (Sentry.init as jest.Mock).mock.calls[0][0].beforeSendTransaction;
    });

    it('should filter out GET /health transactions', () => {
      const event = { transaction: 'GET /health' };
      const result = beforeSendTransaction(event);
      expect(result).toBeNull();
    });

    it('should filter out GET /ready transactions', () => {
      const event = { transaction: 'GET /ready' };
      const result = beforeSendTransaction(event);
      expect(result).toBeNull();
    });

    it('should filter out GET /live transactions', () => {
      const event = { transaction: 'GET /live' };
      const result = beforeSendTransaction(event);
      expect(result).toBeNull();
    });

    it('should allow normal API transactions through', () => {
      const event = { transaction: 'GET /api/v1/sessions' };
      const result = beforeSendTransaction(event);
      expect(result).toEqual({ transaction: 'GET /api/v1/sessions' });
    });

    it('should allow POST transactions through', () => {
      const event = { transaction: 'POST /api/v1/answers' };
      const result = beforeSendTransaction(event);
      expect(result).toEqual({ transaction: 'POST /api/v1/answers' });
    });

    it('should allow transactions with different paths', () => {
      const event = { transaction: 'GET /api/v1/documents' };
      const result = beforeSendTransaction(event);
      expect(result).not.toBeNull();
    });
  });
});

describe('getSentryConfig - additional branch coverage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should generate default release with npm_package_version', () => {
    delete process.env.SENTRY_RELEASE;
    process.env.npm_package_version = '3.2.1';

    const config = getSentryConfig();
    expect(config.release).toBe('quiz2biz-api@3.2.1');
  });

  it('should generate default release with 1.0.0 when no version available', () => {
    delete process.env.SENTRY_RELEASE;
    delete process.env.npm_package_version;

    const config = getSentryConfig();
    expect(config.release).toBe('quiz2biz-api@1.0.0');
  });

  it('should not enable debug when SENTRY_DEBUG is not "true"', () => {
    process.env.SENTRY_DEBUG = 'false';

    const config = getSentryConfig();
    expect(config.debug).toBe(false);
  });

  it('should not enable debug when SENTRY_DEBUG is undefined', () => {
    delete process.env.SENTRY_DEBUG;

    const config = getSentryConfig();
    expect(config.debug).toBe(false);
  });
});

describe('default export', () => {
  it('should export all expected functions', async () => {
    const defaultExport = await import('./sentry.config').then((m) => m.default);
    expect(defaultExport.initializeSentry).toBeDefined();
    expect(defaultExport.captureException).toBeDefined();
    expect(defaultExport.captureMessage).toBeDefined();
    expect(defaultExport.setUser).toBeDefined();
    expect(defaultExport.clearUser).toBeDefined();
    expect(defaultExport.addBreadcrumb).toBeDefined();
    expect(defaultExport.startTransaction).toBeDefined();
    expect(defaultExport.ALERTING_RULES).toBeDefined();
  });
});
