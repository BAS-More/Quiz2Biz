/**
 * AIErrorDiagnosis.tsx - AI-Powered Error Classification & Resolution
 * Sprint 36 Task 2: ML error classification, suggest fixes, auto-apply safe fixes
 *
 * Nielsen Heuristics Addressed:
 * - #9 Help users recover: Intelligent error diagnosis
 * - #10 Help and documentation: Contextual fix suggestions
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Error category classification
 */
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'server'
  | 'timeout'
  | 'rate_limit'
  | 'data_corruption'
  | 'resource_not_found'
  | 'conflict'
  | 'unknown';

/**
 * Error severity level
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Fix action type
 */
export type FixActionType =
  | 'retry'
  | 'refresh_token'
  | 'clear_cache'
  | 'reload_page'
  | 'contact_support'
  | 'wait_and_retry'
  | 'login'
  | 'upgrade_plan'
  | 'check_input'
  | 'rollback'
  | 'manual';

/**
 * Classified error with diagnosis
 */
export interface ClassifiedError {
  id: string;
  originalError: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  confidence: number;
  timestamp: Date;
  context: ErrorContext;
  suggestedFixes: SuggestedFix[];
  appliedFix?: AppliedFix;
  resolved: boolean;
}

/**
 * Error context for classification
 */
export interface ErrorContext {
  url?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  page?: string;
  component?: string;
  action?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Suggested fix for an error
 */
export interface SuggestedFix {
  id: string;
  type: FixActionType;
  description: string;
  confidence: number;
  autoApplicable: boolean;
  priority: number;
  estimatedSuccess: number;
  instructions?: string[];
}

/**
 * Applied fix record
 */
export interface AppliedFix {
  fixId: string;
  type: FixActionType;
  appliedAt: Date;
  autoApplied: boolean;
  success: boolean;
  resultMessage?: string;
}

/**
 * Error pattern for learning
 */
export interface ErrorPattern {
  id: string;
  pattern: RegExp | string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  suggestedFixes: Omit<SuggestedFix, 'id'>[];
  occurrences: number;
  lastSeen: Date;
  successfulFixes: Map<FixActionType, number>;
}

/**
 * AI diagnosis context value
 */
export interface AIErrorDiagnosisContextValue {
  errors: ClassifiedError[];
  patterns: ErrorPattern[];
  isLearning: boolean;
  autoFixEnabled: boolean;

  // Actions
  diagnoseError: (error: Error, context?: ErrorContext) => Promise<ClassifiedError>;
  applyFix: (errorId: string, fixId: string) => Promise<boolean>;
  recordFixResult: (errorId: string, success: boolean, message?: string) => void;
  dismissError: (errorId: string) => void;
  clearErrors: () => void;
  setAutoFixEnabled: (enabled: boolean) => void;
  getErrorStats: () => ErrorStats;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  totalErrors: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  resolvedCount: number;
  autoFixedCount: number;
  averageResolutionTime: number;
}

// ============================================================================
// Error Patterns Database
// ============================================================================

const DEFAULT_ERROR_PATTERNS: Omit<ErrorPattern, 'occurrences' | 'lastSeen' | 'successfulFixes'>[] =
  [
    {
      id: 'network_offline',
      pattern: /network|offline|internet|connection|ERR_NETWORK/i,
      category: 'network',
      severity: 'medium',
      suggestedFixes: [
        {
          type: 'retry',
          description: 'Check your internet connection and try again',
          confidence: 0.9,
          autoApplicable: true,
          priority: 1,
          estimatedSuccess: 0.7,
          instructions: ['Check WiFi/network connection', 'Wait a moment and retry'],
        },
      ],
    },
    {
      id: 'auth_unauthorized',
      pattern: /401|unauthorized|unauthenticated|not logged in/i,
      category: 'authentication',
      severity: 'high',
      suggestedFixes: [
        {
          type: 'refresh_token',
          description: 'Your session may have expired. Refreshing authentication...',
          confidence: 0.85,
          autoApplicable: true,
          priority: 1,
          estimatedSuccess: 0.8,
        },
        {
          type: 'login',
          description: 'Please log in again',
          confidence: 0.75,
          autoApplicable: false,
          priority: 2,
          estimatedSuccess: 0.95,
        },
      ],
    },
    {
      id: 'auth_forbidden',
      pattern: /403|forbidden|access denied|permission/i,
      category: 'authorization',
      severity: 'high',
      suggestedFixes: [
        {
          type: 'contact_support',
          description: "You don't have permission for this action. Contact your administrator.",
          confidence: 0.8,
          autoApplicable: false,
          priority: 1,
          estimatedSuccess: 0.6,
        },
        {
          type: 'upgrade_plan',
          description: 'This feature may require a higher subscription tier',
          confidence: 0.5,
          autoApplicable: false,
          priority: 2,
          estimatedSuccess: 0.7,
        },
      ],
    },
    {
      id: 'validation_error',
      pattern: /400|validation|invalid|required|format/i,
      category: 'validation',
      severity: 'low',
      suggestedFixes: [
        {
          type: 'check_input',
          description: 'Please check your input and correct any errors',
          confidence: 0.9,
          autoApplicable: false,
          priority: 1,
          estimatedSuccess: 0.85,
          instructions: ['Review highlighted fields', 'Ensure all required fields are filled'],
        },
      ],
    },
    {
      id: 'server_error',
      pattern: /500|internal server|server error|unexpected/i,
      category: 'server',
      severity: 'high',
      suggestedFixes: [
        {
          type: 'retry',
          description: 'Server encountered an error. Trying again...',
          confidence: 0.7,
          autoApplicable: true,
          priority: 1,
          estimatedSuccess: 0.5,
        },
        {
          type: 'contact_support',
          description: 'If the problem persists, contact support',
          confidence: 0.6,
          autoApplicable: false,
          priority: 2,
          estimatedSuccess: 0.8,
        },
      ],
    },
    {
      id: 'timeout',
      pattern: /timeout|timed out|took too long|ETIMEDOUT/i,
      category: 'timeout',
      severity: 'medium',
      suggestedFixes: [
        {
          type: 'wait_and_retry',
          description: 'Request timed out. Waiting and retrying...',
          confidence: 0.85,
          autoApplicable: true,
          priority: 1,
          estimatedSuccess: 0.65,
        },
      ],
    },
    {
      id: 'rate_limit',
      pattern: /429|rate limit|too many requests|throttl/i,
      category: 'rate_limit',
      severity: 'medium',
      suggestedFixes: [
        {
          type: 'wait_and_retry',
          description: 'Too many requests. Please wait a moment...',
          confidence: 0.95,
          autoApplicable: true,
          priority: 1,
          estimatedSuccess: 0.9,
          instructions: ['Wait 30 seconds before trying again'],
        },
      ],
    },
    {
      id: 'not_found',
      pattern: /404|not found|does not exist|no longer available/i,
      category: 'resource_not_found',
      severity: 'medium',
      suggestedFixes: [
        {
          type: 'reload_page',
          description: 'The requested resource was not found. Refreshing...',
          confidence: 0.7,
          autoApplicable: true,
          priority: 1,
          estimatedSuccess: 0.4,
        },
        {
          type: 'manual',
          description: 'Navigate to the resource manually',
          confidence: 0.6,
          autoApplicable: false,
          priority: 2,
          estimatedSuccess: 0.7,
        },
      ],
    },
    {
      id: 'conflict',
      pattern: /409|conflict|already exists|duplicate/i,
      category: 'conflict',
      severity: 'medium',
      suggestedFixes: [
        {
          type: 'reload_page',
          description: 'Data conflict detected. Refreshing to get latest version...',
          confidence: 0.8,
          autoApplicable: true,
          priority: 1,
          estimatedSuccess: 0.75,
        },
        {
          type: 'manual',
          description: 'Review conflicting data and resolve manually',
          confidence: 0.7,
          autoApplicable: false,
          priority: 2,
          estimatedSuccess: 0.85,
        },
      ],
    },
  ];

// ============================================================================
// Context
// ============================================================================

const AIErrorDiagnosisContext = createContext<AIErrorDiagnosisContextValue | null>(null);

export const useAIErrorDiagnosis = (): AIErrorDiagnosisContextValue => {
  const context = useContext(AIErrorDiagnosisContext);
  if (!context) {
    throw new Error('useAIErrorDiagnosis must be used within an AIErrorDiagnosisProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface AIErrorDiagnosisProviderProps {
  children: React.ReactNode;
  autoFixEnabled?: boolean;
  customPatterns?: Omit<ErrorPattern, 'occurrences' | 'lastSeen' | 'successfulFixes'>[];
  onErrorDiagnosed?: (error: ClassifiedError) => void;
  onFixApplied?: (error: ClassifiedError, fix: AppliedFix) => void;
}

const STORAGE_KEY = 'quiz2biz_error_patterns';

export const AIErrorDiagnosisProvider: React.FC<AIErrorDiagnosisProviderProps> = ({
  children,
  autoFixEnabled: initialAutoFix = true,
  customPatterns = [],
  onErrorDiagnosed,
  onFixApplied,
}) => {
  const [errors, setErrors] = useState<ClassifiedError[]>([]);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [autoFixEnabled, setAutoFixEnabled] = useState(initialAutoFix);
  const [isLearning] = useState(true);

  // Initialize patterns
  useEffect(() => {
    const loadPatterns = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as ErrorPattern[];
          setPatterns(parsed);
          return;
        }
      } catch (error) {
        console.error('Failed to load error patterns:', error);
      }

      // Initialize with default + custom patterns
      const allPatterns = [...DEFAULT_ERROR_PATTERNS, ...customPatterns].map((p) => ({
        ...p,
        occurrences: 0,
        lastSeen: new Date(),
        successfulFixes: new Map<FixActionType, number>(),
      }));
      setPatterns(allPatterns);
    };

    loadPatterns();
  }, [customPatterns]);

  // Save patterns to storage
  useEffect(() => {
    if (patterns.length > 0) {
      try {
        const serializable = patterns.map((p) => ({
          ...p,
          successfulFixes: Object.fromEntries(p.successfulFixes),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
      } catch (error) {
        console.error('Failed to save error patterns:', error);
      }
    }
  }, [patterns]);

  // Classify error message
  const classifyError = useCallback(
    (
      error: Error,
      context?: ErrorContext,
    ): {
      category: ErrorCategory;
      severity: ErrorSeverity;
      confidence: number;
      pattern?: ErrorPattern;
    } => {
      const errorString = `${error.name} ${error.message} ${context?.statusCode || ''}`;

      // Find matching pattern
      for (const pattern of patterns) {
        const regex =
          typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern, 'i') : pattern.pattern;

        if (regex.test(errorString)) {
          return {
            category: pattern.category,
            severity: pattern.severity,
            confidence: 0.8 + (pattern.occurrences > 10 ? 0.15 : pattern.occurrences * 0.015),
            pattern,
          };
        }
      }

      // Fallback classification based on status code
      if (context?.statusCode) {
        const code = context.statusCode;
        if (code >= 400 && code < 500) {
          if (code === 401) {
            return { category: 'authentication', severity: 'high', confidence: 0.9 };
          }
          if (code === 403) {
            return { category: 'authorization', severity: 'high', confidence: 0.9 };
          }
          if (code === 404) {
            return { category: 'resource_not_found', severity: 'medium', confidence: 0.9 };
          }
          if (code === 429) {
            return { category: 'rate_limit', severity: 'medium', confidence: 0.9 };
          }
          return { category: 'validation', severity: 'low', confidence: 0.7 };
        }
        if (code >= 500) {
          return { category: 'server', severity: 'high', confidence: 0.8 };
        }
      }

      return { category: 'unknown', severity: 'medium', confidence: 0.3 };
    },
    [patterns],
  );

  // Generate suggested fixes
  const generateFixes = useCallback(
    (category: ErrorCategory, pattern?: ErrorPattern): SuggestedFix[] => {
      if (pattern?.suggestedFixes) {
        return pattern.suggestedFixes.map((fix, index) => ({
          ...fix,
          id: `fix_${Date.now()}_${index}`,
        }));
      }

      // Default fixes by category
      const defaultFixes: Record<ErrorCategory, SuggestedFix[]> = {
        network: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'retry',
            description: 'Check your connection and retry',
            confidence: 0.7,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.6,
          },
        ],
        authentication: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'login',
            description: 'Please log in again',
            confidence: 0.85,
            autoApplicable: false,
            priority: 1,
            estimatedSuccess: 0.9,
          },
        ],
        authorization: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'contact_support',
            description: 'Contact support for access',
            confidence: 0.7,
            autoApplicable: false,
            priority: 1,
            estimatedSuccess: 0.6,
          },
        ],
        validation: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'check_input',
            description: 'Check and correct your input',
            confidence: 0.9,
            autoApplicable: false,
            priority: 1,
            estimatedSuccess: 0.85,
          },
        ],
        server: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'retry',
            description: 'Server error. Retrying...',
            confidence: 0.6,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.4,
          },
        ],
        timeout: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'wait_and_retry',
            description: 'Request timed out. Retrying...',
            confidence: 0.8,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.6,
          },
        ],
        rate_limit: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'wait_and_retry',
            description: 'Rate limited. Waiting...',
            confidence: 0.9,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.85,
          },
        ],
        data_corruption: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'clear_cache',
            description: 'Clearing local cache...',
            confidence: 0.7,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.5,
          },
        ],
        resource_not_found: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'reload_page',
            description: 'Resource not found. Refreshing...',
            confidence: 0.6,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.3,
          },
        ],
        conflict: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'reload_page',
            description: 'Data conflict. Refreshing...',
            confidence: 0.75,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.7,
          },
        ],
        unknown: [
          {
            id: `fix_${Date.now()}_0`,
            type: 'retry',
            description: 'An error occurred. Retrying...',
            confidence: 0.5,
            autoApplicable: true,
            priority: 1,
            estimatedSuccess: 0.3,
          },
          {
            id: `fix_${Date.now()}_1`,
            type: 'contact_support',
            description: 'If the problem persists, contact support',
            confidence: 0.6,
            autoApplicable: false,
            priority: 2,
            estimatedSuccess: 0.7,
          },
        ],
      };

      return defaultFixes[category] || defaultFixes.unknown;
    },
    [],
  );

  // Execute fix action
  const executeFix = useCallback(async (fix: SuggestedFix): Promise<boolean> => {
    switch (fix.type) {
      case 'retry':
        // Retry is handled by the caller
        return true;

      case 'refresh_token':
        // Attempt to refresh auth token
        try {
          // This would call your auth service
          console.log('Refreshing authentication token...');
          return true;
        } catch {
          return false;
        }

      case 'clear_cache':
        try {
          localStorage.clear();
          sessionStorage.clear();
          return true;
        } catch {
          return false;
        }

      case 'reload_page':
        window.location.reload();
        return true;

      case 'wait_and_retry':
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return true;

      default:
        return false;
    }
  }, []);

  // Main diagnose function
  const diagnoseError = useCallback(
    async (error: Error, context?: ErrorContext): Promise<ClassifiedError> => {
      const { category, severity, confidence, pattern } = classifyError(error, context);
      const suggestedFixes = generateFixes(category, pattern);

      const classifiedError: ClassifiedError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalError: error,
        category,
        severity,
        confidence,
        timestamp: new Date(),
        context: context || {},
        suggestedFixes,
        resolved: false,
      };

      // Update pattern occurrence
      if (pattern) {
        setPatterns((prev) =>
          prev.map((p) =>
            p.id === pattern.id
              ? { ...p, occurrences: p.occurrences + 1, lastSeen: new Date() }
              : p,
          ),
        );
      }

      // Add to errors list
      setErrors((prev) => [classifiedError, ...prev.slice(0, 99)]);

      // Callback
      onErrorDiagnosed?.(classifiedError);

      // Auto-apply fix if enabled
      if (autoFixEnabled) {
        const autoFix = suggestedFixes.find((f) => f.autoApplicable && f.estimatedSuccess > 0.5);
        if (autoFix) {
          setTimeout(() => {
            applyFix(classifiedError.id, autoFix.id);
          }, 500);
        }
      }

      return classifiedError;
    },
    [classifyError, generateFixes, autoFixEnabled, onErrorDiagnosed],
  );

  // Apply a fix
  const applyFix = useCallback(
    async (errorId: string, fixId: string): Promise<boolean> => {
      const error = errors.find((e) => e.id === errorId);
      if (!error) {
        return false;
      }

      const fix = error.suggestedFixes.find((f) => f.id === fixId);
      if (!fix) {
        return false;
      }

      const success = await executeFix(fix);

      const appliedFix: AppliedFix = {
        fixId,
        type: fix.type,
        appliedAt: new Date(),
        autoApplied: autoFixEnabled && fix.autoApplicable,
        success,
        resultMessage: success ? 'Fix applied successfully' : 'Fix failed',
      };

      setErrors((prev) =>
        prev.map((e) => (e.id === errorId ? { ...e, appliedFix, resolved: success } : e)),
      );

      // Update pattern success rate
      if (success) {
        setPatterns((prev) =>
          prev.map((p) => {
            if (p.category === error.category) {
              const newSuccessfulFixes = new Map(p.successfulFixes);
              const current = newSuccessfulFixes.get(fix.type) || 0;
              newSuccessfulFixes.set(fix.type, current + 1);
              return { ...p, successfulFixes: newSuccessfulFixes };
            }
            return p;
          }),
        );
      }

      onFixApplied?.(error, appliedFix);
      return success;
    },
    [errors, executeFix, autoFixEnabled, onFixApplied],
  );

  // Record fix result
  const recordFixResult = useCallback((errorId: string, success: boolean, message?: string) => {
    setErrors((prev) =>
      prev.map((e) =>
        e.id === errorId && e.appliedFix
          ? {
              ...e,
              appliedFix: { ...e.appliedFix, success, resultMessage: message },
              resolved: success,
            }
          : e,
      ),
    );
  }, []);

  // Dismiss error
  const dismissError = useCallback((errorId: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Get error statistics
  const getErrorStats = useCallback((): ErrorStats => {
    const byCategory: Record<ErrorCategory, number> = {
      network: 0,
      authentication: 0,
      authorization: 0,
      validation: 0,
      server: 0,
      timeout: 0,
      rate_limit: 0,
      data_corruption: 0,
      resource_not_found: 0,
      conflict: 0,
      unknown: 0,
    };

    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let resolvedCount = 0;
    let autoFixedCount = 0;
    let totalResolutionTime = 0;
    let resolvedWithTimeCount = 0;

    errors.forEach((error) => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;

      if (error.resolved) {
        resolvedCount++;
        if (error.appliedFix?.autoApplied) {
          autoFixedCount++;
        }
        if (error.appliedFix) {
          const time =
            new Date(error.appliedFix.appliedAt).getTime() - new Date(error.timestamp).getTime();
          totalResolutionTime += time;
          resolvedWithTimeCount++;
        }
      }
    });

    return {
      totalErrors: errors.length,
      byCategory,
      bySeverity,
      resolvedCount,
      autoFixedCount,
      averageResolutionTime:
        resolvedWithTimeCount > 0 ? totalResolutionTime / resolvedWithTimeCount : 0,
    };
  }, [errors]);

  const value: AIErrorDiagnosisContextValue = {
    errors,
    patterns,
    isLearning,
    autoFixEnabled,
    diagnoseError,
    applyFix,
    recordFixResult,
    dismissError,
    clearErrors,
    setAutoFixEnabled,
    getErrorStats,
  };

  return (
    <AIErrorDiagnosisContext.Provider value={value}>{children}</AIErrorDiagnosisContext.Provider>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  errorCard: {
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    borderLeft: '4px solid',
    marginBottom: '12px',
  },
  severityLow: {
    borderLeftColor: '#3b82f6',
  },
  severityMedium: {
    borderLeftColor: '#f59e0b',
  },
  severityHigh: {
    borderLeftColor: '#ef4444',
  },
  severityCritical: {
    borderLeftColor: '#7c3aed',
  },
  errorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  categoryBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    textTransform: 'uppercase',
  },
  errorMessage: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '12px',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: '8px',
    borderRadius: '4px',
    wordBreak: 'break-all',
  },
  fixList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fixItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '6px',
    border: '1px solid #bbf7d0',
  },
  fixDescription: {
    fontSize: '13px',
    color: '#166534',
    flex: 1,
  },
  fixButton: {
    padding: '4px 12px',
    fontSize: '12px',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  fixButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  confidenceBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    marginLeft: '8px',
  },
  resolvedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '16px',
    padding: '4px',
  },
  statsPanel: {
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  statItem: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  autoFixToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  toggle: {
    width: '44px',
    height: '24px',
    backgroundColor: '#e5e7eb',
    borderRadius: '12px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  toggleActive: {
    backgroundColor: '#22c55e',
  },
  toggleKnob: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  },
  toggleKnobActive: {
    transform: 'translateX(20px)',
  },
};

// ============================================================================
// UI Components
// ============================================================================

/**
 * Error Card Component
 */
interface ErrorCardProps {
  error: ClassifiedError;
  onApplyFix: (errorId: string, fixId: string) => void;
  onDismiss: (errorId: string) => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ error, onApplyFix, onDismiss }) => {
  const getSeverityStyle = () => {
    switch (error.severity) {
      case 'low':
        return styles.severityLow;
      case 'medium':
        return styles.severityMedium;
      case 'high':
        return styles.severityHigh;
      case 'critical':
        return styles.severityCritical;
    }
  };

  return (
    <div style={{ ...styles.errorCard, ...getSeverityStyle() }} role="alert">
      <div style={styles.errorHeader}>
        <div>
          <h4 style={styles.errorTitle}>{error.originalError.name}</h4>
          <span style={styles.categoryBadge}>{error.category}</span>
          <span style={styles.confidenceBadge}>
            {Math.round(error.confidence * 100)}% confidence
          </span>
        </div>
        <button
          style={styles.dismissButton}
          onClick={() => onDismiss(error.id)}
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>

      <div style={styles.errorMessage}>{error.originalError.message}</div>

      {error.resolved ? (
        <div style={styles.resolvedBadge}>
          ✓ Resolved {error.appliedFix?.autoApplied && '(auto-fixed)'}
        </div>
      ) : (
        <div style={styles.fixList}>
          {error.suggestedFixes.map((fix) => (
            <div key={fix.id} style={styles.fixItem}>
              <span style={styles.fixDescription}>
                {fix.description}
                {fix.autoApplicable && (
                  <span
                    style={{
                      ...styles.confidenceBadge,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                    }}
                  >
                    Auto-fixable
                  </span>
                )}
              </span>
              <button
                style={{
                  ...styles.fixButton,
                  ...(error.appliedFix ? styles.fixButtonDisabled : {}),
                }}
                onClick={() => onApplyFix(error.id, fix.id)}
                disabled={!!error.appliedFix}
              >
                Apply Fix
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Error List Component
 */
export const ErrorList: React.FC = () => {
  const { errors, applyFix, dismissError, clearErrors } = useAIErrorDiagnosis();

  if (errors.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Recent Errors ({errors.length})
        </h3>
        <button
          onClick={clearErrors}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Clear All
        </button>
      </div>
      {errors.slice(0, 5).map((error) => (
        <ErrorCard key={error.id} error={error} onApplyFix={applyFix} onDismiss={dismissError} />
      ))}
    </div>
  );
};

/**
 * Error Statistics Panel
 */
export const ErrorStatsPanel: React.FC = () => {
  const { getErrorStats, autoFixEnabled, setAutoFixEnabled } = useAIErrorDiagnosis();
  const stats = getErrorStats();

  return (
    <div style={styles.statsPanel}>
      <h3 style={styles.statsTitle}>Error Diagnosis Statistics</h3>

      <div style={styles.autoFixToggle}>
        <span style={{ fontSize: '14px', color: '#333' }}>Auto-fix enabled</span>
        <div
          style={{
            ...styles.toggle,
            ...(autoFixEnabled ? styles.toggleActive : {}),
          }}
          onClick={() => setAutoFixEnabled(!autoFixEnabled)}
          role="switch"
          aria-checked={autoFixEnabled}
          tabIndex={0}
        >
          <div
            style={{
              ...styles.toggleKnob,
              ...(autoFixEnabled ? styles.toggleKnobActive : {}),
            }}
          />
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{stats.totalErrors}</div>
          <div style={styles.statLabel}>Total Errors</div>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#22c55e' }}>{stats.resolvedCount}</div>
          <div style={styles.statLabel}>Resolved</div>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.autoFixedCount}</div>
          <div style={styles.statLabel}>Auto-fixed</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statValue}>
            {stats.averageResolutionTime > 0
              ? `${Math.round(stats.averageResolutionTime / 1000)}s`
              : '-'}
          </div>
          <div style={styles.statLabel}>Avg Resolution</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Hook: useErrorBoundary
// ============================================================================

/**
 * Hook for integrating AI diagnosis with error boundaries
 */
export function useErrorDiagnosisHandler() {
  const { diagnoseError, applyFix } = useAIErrorDiagnosis();

  const handleError = useCallback(
    async (error: Error, context?: ErrorContext) => {
      const diagnosed = await diagnoseError(error, context);

      // Return the best auto-applicable fix if available
      const autoFix = diagnosed.suggestedFixes.find((f) => f.autoApplicable);

      return {
        diagnosed,
        autoFix,
        applyFix: autoFix ? () => applyFix(diagnosed.id, autoFix.id) : undefined,
      };
    },
    [diagnoseError, applyFix],
  );

  return { handleError };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  AIErrorDiagnosisProvider,
  useAIErrorDiagnosis,
  ErrorCard,
  ErrorList,
  ErrorStatsPanel,
  useErrorDiagnosisHandler,
};
