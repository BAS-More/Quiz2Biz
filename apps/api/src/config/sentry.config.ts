/**
 * Sentry Configuration for Quiz2Biz API
 *
 * Provides error tracking, performance monitoring, and alerting
 * for production error capturing.
 */

import * as Sentry from '@sentry/nestjs';

// Profiling is optional - only load if available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodeProfilingIntegration: (() => any) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodeProfilingIntegration = require('@sentry/profiling-node').nodeProfilingIntegration;
} catch {
  // Profiling not available
}

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  debug: boolean;
}

/**
 * Get Sentry configuration from environment
 */
export function getSentryConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    release:
      process.env.SENTRY_RELEASE || `quiz2biz-api@${process.env.npm_package_version || '1.0.0'}`,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    debug: process.env.SENTRY_DEBUG === 'true',
  };
}

/**
 * Initialize Sentry for the API
 * Call this before NestFactory.create()
 */
export function initializeSentry(): void {
  const config = getSentryConfig();

  // Only initialize if DSN is provided
  if (!config.dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,

    // Performance Monitoring
    tracesSampleRate: config.tracesSampleRate,

    // Profiling (requires @sentry/profiling-node)
    profilesSampleRate: config.profilesSampleRate,

    integrations: [
      // Enable profiling if available
      ...(nodeProfilingIntegration ? [nodeProfilingIntegration()] : []),
    ],

    // Debug mode for development
    debug: config.debug,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data?.password) {
            breadcrumb.data.password = '[REDACTED]';
          }
          if (breadcrumb.data?.token) {
            breadcrumb.data.token = '[REDACTED]';
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Configure error sampling
    beforeSendTransaction(event) {
      // Filter out health check transactions
      if (
        event.transaction === 'GET /health' ||
        event.transaction === 'GET /ready' ||
        event.transaction === 'GET /live'
      ) {
        return null;
      }
      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Request aborted',
      'ECONNRESET',
      'EPIPE',
    ],
  });

  console.log(`Sentry initialized for environment: ${config.environment}`);
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, unknown>): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message for logging
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; role?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Don't include sensitive data
  });
}

/**
 * Clear user context on logout
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info',
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Alerting rules configuration
 */
export const ALERTING_RULES = {
  // Error rate thresholds
  errorRate: {
    warning: 0.01, // 1% error rate
    critical: 0.05, // 5% error rate
  },

  // Response time thresholds (ms)
  responseTime: {
    warning: 500,
    critical: 1000,
  },

  // Specific error types to alert on
  criticalErrors: ['DatabaseError', 'AuthenticationError', 'PaymentError', 'SecurityError'],

  // Alert channels (configure in Sentry dashboard)
  channels: {
    email: true,
    slack: true,
    pagerduty: false,
  },
};

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  ALERTING_RULES,
};
