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
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  it('should skip initialization when DSN not provided', () => {
    delete process.env.SENTRY_DSN;

    initializeSentry();

    expect(consoleSpy).toHaveBeenCalledWith('Sentry DSN not configured, skipping initialization');
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
