/**
 * Error Code System & Recovery Components
 *
 * Implements a comprehensive error code taxonomy for support reference
 * and provides actionable error recovery actions.
 *
 * Nielsen Heuristic: Help users recognize, diagnose, and recover from errors
 */

import { useState, useCallback } from 'react';

// ============================================================================
// Error Code Taxonomy
// ============================================================================

export type ErrorCategory =
  | 'AUTH' // Authentication errors
  | 'AUTHZ' // Authorization errors
  | 'NET' // Network errors
  | 'API' // API errors
  | 'VALID' // Validation errors
  | 'FILE' // File operation errors
  | 'DB' // Database errors
  | 'PAY' // Payment errors
  | 'SYS' // System errors
  | 'UNKNOWN';

export interface ErrorCode {
  code: string;
  category: ErrorCategory;
  httpStatus?: number;
  message: string;
  userMessage: string;
  recoveryActions: RecoveryAction[];
  isRetryable: boolean;
  supportLevel: 'self' | 'contact' | 'urgent';
}

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => void | Promise<void>;
  isPrimary?: boolean;
}

// ============================================================================
// Error Code Registry
// ============================================================================

export const ERROR_CODES: Record<string, Omit<ErrorCode, 'code'>> = {
  // Authentication Errors (AUTH-xxx)
  'AUTH-001': {
    category: 'AUTH',
    httpStatus: 401,
    message: 'Invalid credentials',
    userMessage:
      'The email or password you entered is incorrect. Please check your spelling and try again.',
    recoveryActions: [
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Re-enter your credentials',
        action: () => {},
        isPrimary: true,
      },
      {
        id: 'reset',
        label: 'Reset Password',
        description: 'Get a password reset link',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },
  'AUTH-002': {
    category: 'AUTH',
    httpStatus: 401,
    message: 'Session expired',
    userMessage: 'Your session has expired for security reasons. Please sign in again to continue.',
    recoveryActions: [
      {
        id: 'login',
        label: 'Sign In',
        description: 'Return to login page',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: false,
    supportLevel: 'self',
  },
  'AUTH-003': {
    category: 'AUTH',
    httpStatus: 401,
    message: 'Email not verified',
    userMessage:
      'Please verify your email address before signing in. Check your inbox for the verification link.',
    recoveryActions: [
      {
        id: 'resend',
        label: 'Resend Email',
        description: 'Send a new verification link',
        action: () => {},
        isPrimary: true,
      },
      {
        id: 'support',
        label: 'Contact Support',
        description: 'Get help with verification',
        action: () => {},
      },
    ],
    isRetryable: false,
    supportLevel: 'self',
  },
  'AUTH-004': {
    category: 'AUTH',
    httpStatus: 403,
    message: 'Account locked',
    userMessage:
      'Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
    recoveryActions: [
      {
        id: 'reset',
        label: 'Reset Password',
        description: 'Unlock with password reset',
        action: () => {},
      },
      {
        id: 'support',
        label: 'Contact Support',
        description: 'Get immediate help',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: false,
    supportLevel: 'contact',
  },

  // Authorization Errors (AUTHZ-xxx)
  'AUTHZ-001': {
    category: 'AUTHZ',
    httpStatus: 403,
    message: 'Insufficient permissions',
    userMessage:
      "You don't have permission to access this resource. Please contact your administrator.",
    recoveryActions: [
      {
        id: 'back',
        label: 'Go Back',
        description: 'Return to previous page',
        action: () => window.history.back(),
        isPrimary: true,
      },
      {
        id: 'home',
        label: 'Go to Dashboard',
        description: 'Return to main dashboard',
        action: () => {},
      },
    ],
    isRetryable: false,
    supportLevel: 'contact',
  },
  'AUTHZ-002': {
    category: 'AUTHZ',
    httpStatus: 403,
    message: 'Feature not available',
    userMessage:
      'This feature requires a Professional or Enterprise subscription. Upgrade your plan to access it.',
    recoveryActions: [
      {
        id: 'upgrade',
        label: 'View Plans',
        description: 'See available subscription options',
        action: () => {},
        isPrimary: true,
      },
      { id: 'contact', label: 'Contact Sales', description: 'Talk to our team', action: () => {} },
    ],
    isRetryable: false,
    supportLevel: 'self',
  },

  // Network Errors (NET-xxx)
  'NET-001': {
    category: 'NET',
    message: 'Network connection lost',
    userMessage:
      'Unable to connect to the server. Please check your internet connection and try again.',
    recoveryActions: [
      {
        id: 'retry',
        label: 'Retry',
        description: 'Try connecting again',
        action: () => window.location.reload(),
        isPrimary: true,
      },
      {
        id: 'offline',
        label: 'Work Offline',
        description: 'Continue in offline mode',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },
  'NET-002': {
    category: 'NET',
    message: 'Request timeout',
    userMessage:
      'The server is taking too long to respond. This might be due to a slow connection.',
    recoveryActions: [
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Retry the request',
        action: () => {},
        isPrimary: true,
      },
      {
        id: 'reduce',
        label: 'Simplify Request',
        description: 'Try with smaller data',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },

  // API Errors (API-xxx)
  'API-400': {
    category: 'API',
    httpStatus: 400,
    message: 'Bad request',
    userMessage: 'The information you provided is invalid. Please check your input and try again.',
    recoveryActions: [
      {
        id: 'fix',
        label: 'Fix Input',
        description: 'Review and correct the form',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },
  'API-404': {
    category: 'API',
    httpStatus: 404,
    message: 'Resource not found',
    userMessage: "The page or resource you're looking for doesn't exist or has been moved.",
    recoveryActions: [
      {
        id: 'home',
        label: 'Go to Dashboard',
        description: 'Return to main dashboard',
        action: () => {},
        isPrimary: true,
      },
      {
        id: 'back',
        label: 'Go Back',
        description: 'Return to previous page',
        action: () => window.history.back(),
      },
    ],
    isRetryable: false,
    supportLevel: 'self',
  },
  'API-500': {
    category: 'API',
    httpStatus: 500,
    message: 'Server error',
    userMessage:
      'Something went wrong on our end. Our team has been notified and is working on a fix.',
    recoveryActions: [
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Retry the request',
        action: () => window.location.reload(),
        isPrimary: true,
      },
      {
        id: 'support',
        label: 'Report Issue',
        description: 'Submit a bug report',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'contact',
  },
  'API-503': {
    category: 'API',
    httpStatus: 503,
    message: 'Service unavailable',
    userMessage:
      "The service is temporarily unavailable. We're working to restore it as quickly as possible.",
    recoveryActions: [
      {
        id: 'status',
        label: 'Check Status',
        description: 'View system status page',
        action: () => {},
        isPrimary: true,
      },
      {
        id: 'retry',
        label: 'Retry Later',
        description: 'Try again in a few minutes',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },

  // Validation Errors (VALID-xxx)
  'VALID-001': {
    category: 'VALID',
    message: 'Required field missing',
    userMessage: 'Please fill in all required fields before submitting.',
    recoveryActions: [
      {
        id: 'fix',
        label: 'Complete Form',
        description: 'Fill in missing fields',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },
  'VALID-002': {
    category: 'VALID',
    message: 'Invalid format',
    userMessage: 'Please check the format of your input. See the field hints for expected format.',
    recoveryActions: [
      {
        id: 'fix',
        label: 'Fix Format',
        description: 'Correct the input format',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },

  // File Errors (FILE-xxx)
  'FILE-001': {
    category: 'FILE',
    message: 'File too large',
    userMessage: "The file you're trying to upload exceeds the maximum size limit (50MB).",
    recoveryActions: [
      {
        id: 'compress',
        label: 'Compress File',
        description: 'Reduce file size and try again',
        action: () => {},
        isPrimary: true,
      },
      {
        id: 'different',
        label: 'Choose Different',
        description: 'Select a different file',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },
  'FILE-002': {
    category: 'FILE',
    message: 'Invalid file type',
    userMessage:
      'This file type is not supported. Please upload a PDF, Word document, or image file.',
    recoveryActions: [
      {
        id: 'convert',
        label: 'Convert File',
        description: 'Convert to a supported format',
        action: () => {},
      },
      {
        id: 'different',
        label: 'Choose Different',
        description: 'Select a different file',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },
  'FILE-003': {
    category: 'FILE',
    message: 'Upload failed',
    userMessage: 'The file upload was interrupted. Please try again.',
    recoveryActions: [
      {
        id: 'retry',
        label: 'Retry Upload',
        description: 'Try uploading again',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },

  // Payment Errors (PAY-xxx)
  'PAY-001': {
    category: 'PAY',
    message: 'Payment declined',
    userMessage:
      'Your payment was declined. Please check your card details or try a different payment method.',
    recoveryActions: [
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Re-enter payment details',
        action: () => {},
        isPrimary: true,
      },
      {
        id: 'different',
        label: 'Use Different Card',
        description: 'Try a different payment method',
        action: () => {},
      },
      {
        id: 'contact',
        label: 'Contact Bank',
        description: 'Contact your card issuer',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },
  'PAY-002': {
    category: 'PAY',
    message: 'Insufficient funds',
    userMessage: 'Your card has insufficient funds. Please try a different payment method.',
    recoveryActions: [
      {
        id: 'different',
        label: 'Use Different Card',
        description: 'Try a different payment method',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: true,
    supportLevel: 'self',
  },

  // System Errors (SYS-xxx)
  'SYS-001': {
    category: 'SYS',
    message: 'Storage quota exceeded',
    userMessage:
      "You've reached your storage limit. Please delete some files or upgrade your plan.",
    recoveryActions: [
      {
        id: 'manage',
        label: 'Manage Files',
        description: 'Delete unnecessary files',
        action: () => {},
      },
      {
        id: 'upgrade',
        label: 'Upgrade Plan',
        description: 'Get more storage',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: false,
    supportLevel: 'self',
  },
  'SYS-002': {
    category: 'SYS',
    message: 'Maintenance mode',
    userMessage:
      'The system is currently undergoing scheduled maintenance. Please try again later.',
    recoveryActions: [
      {
        id: 'status',
        label: 'Check Status',
        description: 'View maintenance schedule',
        action: () => {},
        isPrimary: true,
      },
    ],
    isRetryable: false,
    supportLevel: 'self',
  },
};

// ============================================================================
// Error Helper Functions
// ============================================================================

export function getErrorCode(code: string): ErrorCode {
  const errorDef = ERROR_CODES[code];
  if (errorDef) {
    return { code, ...errorDef };
  }
  // Return generic unknown error
  return {
    code: code || 'UNKNOWN-001',
    category: 'UNKNOWN',
    message: 'Unknown error',
    userMessage:
      'An unexpected error occurred. Please try again or contact support if the problem persists.',
    recoveryActions: [
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Retry the operation',
        action: () => window.location.reload(),
        isPrimary: true,
      },
      {
        id: 'support',
        label: 'Contact Support',
        description: 'Get help from our team',
        action: () => {},
      },
    ],
    isRetryable: true,
    supportLevel: 'contact',
  };
}

export function parseApiError(error: unknown): ErrorCode {
  if (error instanceof Error && 'code' in error) {
    return getErrorCode((error as Error & { code: string }).code);
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.code === 'string') {
      return getErrorCode(err.code);
    }
    if (typeof err.statusCode === 'number') {
      return getErrorCode(`API-${err.statusCode}`);
    }
  }
  return getErrorCode('UNKNOWN-001');
}

// ============================================================================
// Error Display Component
// ============================================================================

export interface ErrorDisplayProps {
  error: ErrorCode | string;
  onDismiss?: () => void;
  onRetry?: () => void;
  showCode?: boolean;
  className?: string;
}

const categoryColors: Record<
  ErrorCategory,
  { bg: string; border: string; text: string; icon: string }
> = {
  AUTH: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
  },
  AUTHZ: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    icon: 'text-orange-600',
  },
  NET: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: 'text-gray-600',
  },
  API: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600' },
  VALID: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600',
  },
  FILE: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    icon: 'text-purple-600',
  },
  DB: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600' },
  PAY: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
  },
  SYS: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600' },
  UNKNOWN: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: 'text-gray-600',
  },
};

export function ErrorDisplay({
  error,
  onDismiss,
  onRetry,
  showCode = true,
  className = '',
}: ErrorDisplayProps) {
  const errorObj = typeof error === 'string' ? getErrorCode(error) : error;
  const colors = categoryColors[errorObj.category];
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border p-4 ${colors.bg} ${colors.border} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-medium ${colors.text}`}>{errorObj.userMessage}</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`ml-auto -mr-1 flex-shrink-0 rounded p-1 hover:bg-black/5 ${colors.text}`}
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Error code */}
          {showCode && (
            <p className={`mt-1 text-xs ${colors.text} opacity-70`}>
              Error code: {errorObj.code}
              {errorObj.supportLevel === 'contact' &&
                ' • Please include this code when contacting support'}
            </p>
          )}

          {/* Recovery actions */}
          {errorObj.recoveryActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {errorObj.recoveryActions.slice(0, isExpanded ? undefined : 2).map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    action.isPrimary
                      ? `${colors.text} bg-white border ${colors.border} hover:bg-gray-50 font-medium`
                      : `${colors.text} hover:underline`
                  }`}
                  title={action.description}
                >
                  {action.label}
                </button>
              ))}
              {errorObj.recoveryActions.length > 2 && !isExpanded && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className={`text-sm ${colors.text} hover:underline`}
                >
                  More options...
                </button>
              )}
            </div>
          )}

          {/* Retry shortcut */}
          {errorObj.isRetryable && onRetry && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <button
                onClick={onRetry}
                className={`text-sm ${colors.text} hover:underline flex items-center gap-1`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Auto-retry in 5 seconds
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Auto-Retry Hook
// ============================================================================

export interface UseAutoRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export function useAutoRetry(operation: () => Promise<void>, options: UseAutoRetryOptions = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextRetryIn, setNextRetryIn] = useState<number | null>(null);

  const calculateDelay = useCallback(
    (attempt: number) => {
      const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
      return Math.min(delay, maxDelayMs);
    },
    [initialDelayMs, backoffMultiplier, maxDelayMs],
  );

  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    const delay = calculateDelay(retryCount);

    // Countdown
    const startTime = Date.now();
    const countdownInterval = setInterval(() => {
      const remaining = Math.max(0, delay - (Date.now() - startTime));
      setNextRetryIn(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 100);

    await new Promise((resolve) => setTimeout(resolve, delay));
    clearInterval(countdownInterval);
    setNextRetryIn(null);

    try {
      await operation();
      setRetryCount(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, calculateDelay, operation]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setError(null);
    setNextRetryIn(null);
  }, []);

  return {
    retry,
    reset,
    retryCount,
    isRetrying,
    error,
    nextRetryIn,
    hasExhaustedRetries: retryCount >= maxRetries,
    canRetry: retryCount < maxRetries && !isRetrying,
  };
}

export default ErrorDisplay;
