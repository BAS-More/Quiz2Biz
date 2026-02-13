/**
 * Sentry Configuration for Quiz2Biz Web App
 *
 * Provides error tracking and performance monitoring for the React frontend.
 */

import * as Sentry from '@sentry/react';

export interface SentryWebConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  debug: boolean;
}

/**
 * Get Sentry configuration from environment
 */
export function getSentryConfig(): SentryWebConfig {
  return {
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    environment: import.meta.env.VITE_NODE_ENV || 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE || 'quiz2biz-web@1.0.0',
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1',
    ),
    replaysOnErrorSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE || '1.0',
    ),
    debug: import.meta.env.VITE_SENTRY_DEBUG === 'true',
  };
}

/**
 * Initialize Sentry for the React app
 * Call this in main.tsx before rendering
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

    // Session Replay
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,

    integrations: [
      // Browser tracing for performance
      Sentry.browserTracingIntegration(),

      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        // Mask sensitive inputs
        maskAllInputs: true,
      }),
    ],

    // Debug mode for development
    debug: config.debug,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive data from user info
      if (event.user) {
        delete event.user.ip_address;
      }

      // Filter sensitive breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
          // Filter out local storage access
          if (breadcrumb.category === 'console' && breadcrumb.message?.includes('localStorage')) {
            return false;
          }
          return true;
        });
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop',
      'Non-Error promise rejection',

      // Network errors that are expected
      'Network request failed',
      'Failed to fetch',
      'Load failed',

      // User-initiated navigation
      'Abort',
      'ChunkLoadError',
    ],

    // Deny URLs (third-party scripts)
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,

      // Firefox extensions
      /^moz-extension:\/\//i,

      // Safari extensions
      /^safari-web-extension:\/\//i,
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
export function setUser(user: { id: string; email?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
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
 * Sentry Error Boundary component
 * Wrap your app or components with this for error boundary functionality
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Sentry profiler HOC for component performance tracking
 */
export const withSentryProfiler = Sentry.withProfiler;

/**
 * Create a feedback widget for users to report issues
 */
export function createFeedbackWidget(): void {
  // Feedback widget is configured in Sentry dashboard
  console.log('Sentry feedback widget available');
}

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  SentryErrorBoundary,
  withSentryProfiler,
};
