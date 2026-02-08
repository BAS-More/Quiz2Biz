/**
 * AIPredictiveErrors.tsx - Sprint 34 Task 5
 * Predictive Error Prevention with AI input pattern analysis
 * Nielsen Heuristic: Error prevention, Help users avoid errors
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface InputPattern {
  id: string;
  fieldType: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'file';
  pattern: string;
  description: string;
  severity: 'warning' | 'error' | 'info';
}

export interface PredictedError {
  id: string;
  fieldId: string;
  fieldName: string;
  message: string;
  suggestion: string;
  confidence: number;
  severity: 'warning' | 'error' | 'info';
  rule: string;
  autoFixable: boolean;
  autoFixValue?: string;
}

export interface InputAnalysis {
  value: string;
  fieldId: string;
  fieldType: string;
  predictions: PredictedError[];
  quality: number; // 0-100
  completeness: number; // 0-100
}

export interface FieldConfig {
  id: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'file';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  test: (value: string, fieldConfig: FieldConfig) => boolean;
  message: string;
  suggestion: string;
  severity: 'warning' | 'error' | 'info';
  autoFixable: boolean;
  autoFix?: (value: string) => string;
}

export interface PredictiveErrorContextValue {
  predictions: Map<string, PredictedError[]>;
  isAnalyzing: boolean;
  analyzeInput: (fieldId: string, value: string, config: FieldConfig) => Promise<PredictedError[]>;
  clearPredictions: (fieldId?: string) => void;
  applyAutoFix: (fieldId: string, errorId: string) => string | null;
  dismissPrediction: (fieldId: string, errorId: string) => void;
  getFieldQuality: (fieldId: string) => number;
}

// ============================================================================
// Default Validation Rules
// ============================================================================

const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  // Email validation
  {
    id: 'email-format',
    name: 'Email Format',
    test: (value, config) => {
      if (config.type !== 'email') {
        return true;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: "This doesn't look like a valid email address",
    suggestion: 'Check for typos - emails should be like name@example.com',
    severity: 'error',
    autoFixable: false,
  },
  {
    id: 'email-typo-domain',
    name: 'Common Email Typo',
    test: (value, config) => {
      if (config.type !== 'email') {
        return true;
      }
      const commonTypos = [
        'gmial.com',
        'gmal.com',
        'gmail.co',
        'hotmal.com',
        'yaho.com',
        'outloo.com',
      ];
      const domain = value.split('@')[1]?.toLowerCase();
      return !commonTypos.includes(domain);
    },
    message: 'Did you mean a different email domain?',
    suggestion: 'Common domains: gmail.com, hotmail.com, yahoo.com, outlook.com',
    severity: 'warning',
    autoFixable: true,
    autoFix: (value) => {
      const typoFixes: Record<string, string> = {
        'gmial.com': 'gmail.com',
        'gmal.com': 'gmail.com',
        'gmail.co': 'gmail.com',
        'hotmal.com': 'hotmail.com',
        'yaho.com': 'yahoo.com',
        'outloo.com': 'outlook.com',
      };
      const [local, domain] = value.split('@');
      return `${local}@${typoFixes[domain?.toLowerCase()] || domain}`;
    },
  },

  // Text length validation
  {
    id: 'min-length',
    name: 'Minimum Length',
    test: (value, config) => {
      if (!config.minLength) {
        return true;
      }
      return value.length >= config.minLength;
    },
    message: 'This response seems too short',
    suggestion: 'Try providing more detail - aim for at least {minLength} characters',
    severity: 'warning',
    autoFixable: false,
  },
  {
    id: 'max-length',
    name: 'Maximum Length',
    test: (value, config) => {
      if (!config.maxLength) {
        return true;
      }
      return value.length <= config.maxLength;
    },
    message: 'This response is too long',
    suggestion: 'Try to be more concise - maximum {maxLength} characters allowed',
    severity: 'error',
    autoFixable: true,
    autoFix: (value) => value.slice(0, 500) + '...',
  },

  // Number validation
  {
    id: 'number-format',
    name: 'Number Format',
    test: (value, config) => {
      if (config.type !== 'number') {
        return true;
      }
      return !isNaN(parseFloat(value)) && isFinite(Number(value));
    },
    message: 'This should be a number',
    suggestion: 'Remove any letters or special characters, use only digits and decimal point',
    severity: 'error',
    autoFixable: true,
    autoFix: (value) => value.replace(/[^0-9.-]/g, ''),
  },

  // Whitespace validation
  {
    id: 'leading-trailing-whitespace',
    name: 'Whitespace',
    test: (value) => value === value.trim(),
    message: 'Extra spaces detected at start or end',
    suggestion: 'The extra spaces will be removed automatically',
    severity: 'info',
    autoFixable: true,
    autoFix: (value) => value.trim(),
  },
  {
    id: 'multiple-spaces',
    name: 'Multiple Spaces',
    test: (value) => !/\s{2,}/.test(value),
    message: 'Multiple consecutive spaces detected',
    suggestion: 'Consider cleaning up the extra spaces',
    severity: 'info',
    autoFixable: true,
    autoFix: (value) => value.replace(/\s+/g, ' '),
  },

  // Capitalization
  {
    id: 'all-caps',
    name: 'All Caps',
    test: (value) => {
      if (value.length < 10) {
        return true;
      }
      return value !== value.toUpperCase();
    },
    message: 'Writing in ALL CAPS can be hard to read',
    suggestion: 'Consider using sentence case for better readability',
    severity: 'info',
    autoFixable: true,
    autoFix: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  },

  // Completeness patterns
  {
    id: 'incomplete-sentence',
    name: 'Incomplete Sentence',
    test: (value, config) => {
      if (config.type !== 'textarea' || value.length < 20) {
        return true;
      }
      // Check if ends with proper punctuation or continues
      return /[.!?]$/.test(value.trim()) || value.length < 50;
    },
    message: 'This response may be incomplete',
    suggestion: 'Consider ending with proper punctuation or adding more detail',
    severity: 'warning',
    autoFixable: false,
  },

  // Common questionnaire patterns
  {
    id: 'vague-answer',
    name: 'Vague Answer Detection',
    test: (value, config) => {
      if (config.type !== 'textarea') {
        return true;
      }
      const vaguePatterns = [
        /^(yes|no|maybe|depends|n\/a|na|none|nothing|idk|dunno)$/i,
        /^(we do|we have|we use)$/i,
        /^(it|this|that|there)$/i,
      ];
      return !vaguePatterns.some((p) => p.test(value.trim()));
    },
    message: 'This answer might be too vague',
    suggestion: 'Try providing specific details, examples, or context',
    severity: 'warning',
    autoFixable: false,
  },

  // Security-related patterns
  {
    id: 'potential-pii',
    name: 'PII Detection',
    test: (value) => {
      // SSN pattern
      if (/\b\d{3}-\d{2}-\d{4}\b/.test(value)) {
        return false;
      }
      // Credit card pattern
      if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(value)) {
        return false;
      }
      return true;
    },
    message: 'Potential sensitive information detected',
    suggestion: 'Please avoid entering SSN, credit card numbers, or other sensitive data',
    severity: 'error',
    autoFixable: false,
  },

  // URL validation
  {
    id: 'url-format',
    name: 'URL Format',
    test: (value, _config) => {
      if (!value.includes('http')) {
        return true;
      } // Not a URL
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: "This URL doesn't appear to be valid",
    suggestion: 'URLs should start with http:// or https://',
    severity: 'warning',
    autoFixable: true,
    autoFix: (value) => {
      if (value.startsWith('www.')) {
        return `https://${value}`;
      }
      if (!value.startsWith('http')) {
        return `https://${value}`;
      }
      return value;
    },
  },
];

// ============================================================================
// AI Pattern Analysis (Mock - Replace with actual ML model)
// ============================================================================

class AIPatternAnalyzer {
  static async analyzeWithAI(value: string, fieldConfig: FieldConfig): Promise<PredictedError[]> {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const predictions: PredictedError[] = [];

    // Run default validation rules
    for (const rule of DEFAULT_VALIDATION_RULES) {
      if (!rule.test(value, fieldConfig)) {
        predictions.push({
          id: `${fieldConfig.id}-${rule.id}`,
          fieldId: fieldConfig.id,
          fieldName: fieldConfig.name,
          message: rule.message
            .replace('{minLength}', String(fieldConfig.minLength))
            .replace('{maxLength}', String(fieldConfig.maxLength)),
          suggestion: rule.suggestion
            .replace('{minLength}', String(fieldConfig.minLength))
            .replace('{maxLength}', String(fieldConfig.maxLength)),
          confidence: 0.9,
          severity: rule.severity,
          rule: rule.name,
          autoFixable: rule.autoFixable,
          autoFixValue: rule.autoFix ? rule.autoFix(value) : undefined,
        });
      }
    }

    // Run custom rules if provided
    if (fieldConfig.customRules) {
      for (const rule of fieldConfig.customRules) {
        if (!rule.test(value, fieldConfig)) {
          predictions.push({
            id: `${fieldConfig.id}-${rule.id}`,
            fieldId: fieldConfig.id,
            fieldName: fieldConfig.name,
            message: rule.message,
            suggestion: rule.suggestion,
            confidence: 0.85,
            severity: rule.severity,
            rule: rule.name,
            autoFixable: rule.autoFixable,
            autoFixValue: rule.autoFix ? rule.autoFix(value) : undefined,
          });
        }
      }
    }

    // AI-based pattern analysis (mock)
    const aiPredictions = await this.runAIPatternAnalysis(value, fieldConfig);
    predictions.push(...aiPredictions);

    return predictions.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private static async runAIPatternAnalysis(
    value: string,
    fieldConfig: FieldConfig,
  ): Promise<PredictedError[]> {
    const predictions: PredictedError[] = [];

    // Simulate AI pattern detection
    // In production, this would call an ML model

    // Detect potential copy-paste artifacts
    if (/[\u200B-\u200D\uFEFF]/.test(value)) {
      predictions.push({
        id: `${fieldConfig.id}-hidden-chars`,
        fieldId: fieldConfig.id,
        fieldName: fieldConfig.name,
        message: 'Hidden characters detected (possible copy-paste artifact)',
        suggestion:
          'This text may have been copied from elsewhere and contains invisible characters',
        confidence: 0.75,
        severity: 'info',
        rule: 'AI Pattern: Hidden Characters',
        autoFixable: true,
        autoFixValue: value.replace(/[\u200B-\u200D\uFEFF]/g, ''),
      });
    }

    // Detect placeholder text
    const placeholderPatterns = [
      /lorem ipsum/i,
      /placeholder/i,
      /example text/i,
      /\[.*\]/,
      /<.*>/,
      /xxx+/i,
      /test\s*text/i,
    ];
    if (placeholderPatterns.some((p) => p.test(value))) {
      predictions.push({
        id: `${fieldConfig.id}-placeholder`,
        fieldId: fieldConfig.id,
        fieldName: fieldConfig.name,
        message: 'This looks like placeholder text',
        suggestion: 'Replace with your actual response',
        confidence: 0.8,
        severity: 'warning',
        rule: 'AI Pattern: Placeholder Detection',
        autoFixable: false,
      });
    }

    // Detect incomplete URLs
    if (value.includes('http') && !value.includes('.')) {
      predictions.push({
        id: `${fieldConfig.id}-incomplete-url`,
        fieldId: fieldConfig.id,
        fieldName: fieldConfig.name,
        message: 'This URL appears to be incomplete',
        suggestion: 'Make sure to include the full domain (e.g., example.com)',
        confidence: 0.7,
        severity: 'warning',
        rule: 'AI Pattern: Incomplete URL',
        autoFixable: false,
      });
    }

    return predictions;
  }

  static calculateQuality(value: string, predictions: PredictedError[]): number {
    if (!value) {
      return 0;
    }

    let quality = 100;

    // Deduct based on error severity
    for (const pred of predictions) {
      switch (pred.severity) {
        case 'error':
          quality -= 30 * pred.confidence;
          break;
        case 'warning':
          quality -= 15 * pred.confidence;
          break;
        case 'info':
          quality -= 5 * pred.confidence;
          break;
      }
    }

    return Math.max(0, Math.min(100, Math.round(quality)));
  }
}

// ============================================================================
// Context
// ============================================================================

const PredictiveErrorContext = createContext<PredictiveErrorContextValue | null>(null);

export const usePredictiveErrors = (): PredictiveErrorContextValue => {
  const context = useContext(PredictiveErrorContext);
  if (!context) {
    throw new Error('usePredictiveErrors must be used within PredictiveErrorProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface PredictiveErrorProviderProps {
  children: React.ReactNode;
  debounceMs?: number;
}

export const PredictiveErrorProvider: React.FC<PredictiveErrorProviderProps> = ({
  children,
  debounceMs = 300,
}) => {
  const [predictions, setPredictions] = useState<Map<string, PredictedError[]>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fieldQualities, setFieldQualities] = useState<Map<string, number>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const dismissedPredictions = useRef<Set<string>>(new Set());

  const analyzeInput = useCallback(
    async (fieldId: string, value: string, config: FieldConfig): Promise<PredictedError[]> => {
      // Clear existing debounce timer
      const existingTimer = debounceTimers.current.get(fieldId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      return new Promise((resolve) => {
        const timer = setTimeout(async () => {
          setIsAnalyzing(true);

          try {
            let fieldPredictions = await AIPatternAnalyzer.analyzeWithAI(value, config);

            // Filter out dismissed predictions
            fieldPredictions = fieldPredictions.filter(
              (p) => !dismissedPredictions.current.has(p.id),
            );

            // Calculate quality
            const quality = AIPatternAnalyzer.calculateQuality(value, fieldPredictions);

            setPredictions((prev) => {
              const updated = new Map(prev);
              updated.set(fieldId, fieldPredictions);
              return updated;
            });

            setFieldQualities((prev) => {
              const updated = new Map(prev);
              updated.set(fieldId, quality);
              return updated;
            });

            resolve(fieldPredictions);
          } catch (error) {
            console.error('Error analyzing input:', error);
            resolve([]);
          } finally {
            setIsAnalyzing(false);
          }
        }, debounceMs);

        debounceTimers.current.set(fieldId, timer);
      });
    },
    [debounceMs],
  );

  const clearPredictions = useCallback((fieldId?: string) => {
    if (fieldId) {
      setPredictions((prev) => {
        const updated = new Map(prev);
        updated.delete(fieldId);
        return updated;
      });
      setFieldQualities((prev) => {
        const updated = new Map(prev);
        updated.delete(fieldId);
        return updated;
      });
    } else {
      setPredictions(new Map());
      setFieldQualities(new Map());
    }
  }, []);

  const applyAutoFix = useCallback(
    (fieldId: string, errorId: string): string | null => {
      const fieldPredictions = predictions.get(fieldId);
      const prediction = fieldPredictions?.find((p) => p.id === errorId);

      if (prediction?.autoFixable && prediction.autoFixValue) {
        // Remove the prediction after applying fix
        setPredictions((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(fieldId) || [];
          updated.set(
            fieldId,
            existing.filter((p) => p.id !== errorId),
          );
          return updated;
        });

        return prediction.autoFixValue;
      }

      return null;
    },
    [predictions],
  );

  const dismissPrediction = useCallback((fieldId: string, errorId: string) => {
    dismissedPredictions.current.add(errorId);

    setPredictions((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(fieldId) || [];
      updated.set(
        fieldId,
        existing.filter((p) => p.id !== errorId),
      );
      return updated;
    });
  }, []);

  const getFieldQuality = useCallback(
    (fieldId: string): number => {
      return fieldQualities.get(fieldId) ?? 100;
    },
    [fieldQualities],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const value: PredictiveErrorContextValue = {
    predictions,
    isAnalyzing,
    analyzeInput,
    clearPredictions,
    applyAutoFix,
    dismissPrediction,
    getFieldQuality,
  };

  return (
    <PredictiveErrorContext.Provider value={value}>{children}</PredictiveErrorContext.Provider>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    position: 'relative' as const,
    width: '100%',
  },
  predictionsPanel: {
    marginTop: '8px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
  },
  predictionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
  },
  predictionIcon: {
    flexShrink: 0,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionIconError: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  predictionIconWarning: {
    backgroundColor: '#fefce8',
    color: '#ca8a04',
  },
  predictionIconInfo: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
  },
  predictionContent: {
    flex: 1,
    minWidth: 0,
  },
  predictionMessage: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
    margin: 0,
    marginBottom: '4px',
  },
  predictionSuggestion: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  predictionActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  actionButton: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  autoFixButton: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  dismissButton: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  qualityIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  qualityBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  qualityFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s, background-color 0.3s',
  },
  qualityLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    minWidth: '80px',
    textAlign: 'right' as const,
  },
  inlineWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  inlineWarningError: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  inlineWarningWarning: {
    backgroundColor: '#fefce8',
    color: '#ca8a04',
  },
  inlineWarningInfo: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
  },
  analyzingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    color: '#64748b',
    fontSize: '13px',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// ============================================================================
// UI Components
// ============================================================================

interface PredictionsPanelProps {
  fieldId: string;
  showQuality?: boolean;
  compact?: boolean;
}

export const PredictionsPanel: React.FC<PredictionsPanelProps> = ({
  fieldId,
  showQuality = true,
  compact = false,
}) => {
  const { predictions, isAnalyzing, applyAutoFix, dismissPrediction, getFieldQuality } =
    usePredictiveErrors();
  const fieldPredictions = predictions.get(fieldId) || [];
  const quality = getFieldQuality(fieldId);

  if (fieldPredictions.length === 0 && !isAnalyzing) {
    return null;
  }

  const getIconStyle = (severity: PredictedError['severity']) => {
    switch (severity) {
      case 'error':
        return styles.predictionIconError;
      case 'warning':
        return styles.predictionIconWarning;
      case 'info':
        return styles.predictionIconInfo;
    }
  };

  const getQualityColor = (q: number) => {
    if (q >= 80) {
      return '#22c55e';
    }
    if (q >= 60) {
      return '#eab308';
    }
    if (q >= 40) {
      return '#f97316';
    }
    return '#ef4444';
  };

  return (
    <div style={styles.predictionsPanel}>
      {isAnalyzing && (
        <div style={styles.analyzingIndicator}>
          <div style={styles.spinner} />
          Analyzing...
        </div>
      )}

      {fieldPredictions.map((prediction) => (
        <div key={prediction.id} style={styles.predictionItem}>
          <div style={{ ...styles.predictionIcon, ...getIconStyle(prediction.severity) }}>
            {prediction.severity === 'error' && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {prediction.severity === 'warning' && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            )}
            {prediction.severity === 'info' && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            )}
          </div>

          <div style={styles.predictionContent}>
            <p style={styles.predictionMessage}>{prediction.message}</p>
            {!compact && <p style={styles.predictionSuggestion}>{prediction.suggestion}</p>}

            <div style={styles.predictionActions}>
              {prediction.autoFixable && (
                <button
                  style={{ ...styles.actionButton, ...styles.autoFixButton }}
                  onClick={() => {
                    const fixed = applyAutoFix(fieldId, prediction.id);
                    if (fixed) {
                      // Emit event for parent to handle
                      const event = new CustomEvent('predictive-autofix', {
                        detail: { fieldId, value: fixed },
                      });
                      window.dispatchEvent(event);
                    }
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#bfdbfe')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
                >
                  Auto-fix
                </button>
              )}
              <button
                style={{ ...styles.actionButton, ...styles.dismissButton }}
                onClick={() => dismissPrediction(fieldId, prediction.id)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}

      {showQuality && fieldPredictions.length > 0 && (
        <div style={styles.qualityIndicator}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Quality</span>
          <div style={styles.qualityBar}>
            <div
              style={{
                ...styles.qualityFill,
                width: `${quality}%`,
                backgroundColor: getQualityColor(quality),
              }}
            />
          </div>
          <span style={styles.qualityLabel}>{quality}%</span>
        </div>
      )}
    </div>
  );
};

interface InlineWarningProps {
  fieldId: string;
  showFirst?: boolean;
}

export const InlineWarning: React.FC<InlineWarningProps> = ({ fieldId, showFirst = true }) => {
  const { predictions } = usePredictiveErrors();
  const fieldPredictions = predictions.get(fieldId) || [];

  if (fieldPredictions.length === 0) {
    return null;
  }

  const prediction = showFirst
    ? fieldPredictions[0]
    : fieldPredictions.find((p) => p.severity === 'error') || fieldPredictions[0];

  const getStyle = (severity: PredictedError['severity']) => {
    switch (severity) {
      case 'error':
        return styles.inlineWarningError;
      case 'warning':
        return styles.inlineWarningWarning;
      case 'info':
        return styles.inlineWarningInfo;
    }
  };

  return (
    <div style={{ ...styles.inlineWarning, ...getStyle(prediction.severity) }}>
      {prediction.severity === 'error' && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )}
      {prediction.severity === 'warning' && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
      {prediction.severity === 'info' && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      )}
      <span>{prediction.message}</span>
    </div>
  );
};

// ============================================================================
// Hook for Input Integration
// ============================================================================

interface UsePredictiveInputOptions {
  fieldId: string;
  fieldName: string;
  fieldType: FieldConfig['type'];
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  customRules?: ValidationRule[];
  enabled?: boolean;
}

export const usePredictiveInput = (options: UsePredictiveInputOptions) => {
  const { analyzeInput, predictions, getFieldQuality, clearPredictions } = usePredictiveErrors();
  const lastValueRef = useRef<string>('');

  const handleChange = useCallback(
    (value: string) => {
      if (!options.enabled) {
        return;
      }
      if (value === lastValueRef.current) {
        return;
      }
      lastValueRef.current = value;

      analyzeInput(options.fieldId, value, {
        id: options.fieldId,
        name: options.fieldName,
        type: options.fieldType,
        required: options.required,
        minLength: options.minLength,
        maxLength: options.maxLength,
        customRules: options.customRules,
      });
    },
    [analyzeInput, options],
  );

  const fieldPredictions = predictions.get(options.fieldId) || [];
  const quality = getFieldQuality(options.fieldId);
  const hasErrors = fieldPredictions.some((p) => p.severity === 'error');
  const hasWarnings = fieldPredictions.some((p) => p.severity === 'warning');

  // Listen for auto-fix events
  useEffect(() => {
    const handleAutoFix = (event: Event) => {
      const customEvent = event as CustomEvent<{ fieldId: string; value: string }>;
      if (customEvent.detail.fieldId === options.fieldId) {
        // Parent component should handle updating the value
      }
    };

    window.addEventListener('predictive-autofix', handleAutoFix);
    return () => window.removeEventListener('predictive-autofix', handleAutoFix);
  }, [options.fieldId]);

  return {
    handleChange,
    predictions: fieldPredictions,
    quality,
    hasErrors,
    hasWarnings,
    clearPredictions: () => clearPredictions(options.fieldId),
  };
};

// ============================================================================
// CSS Animation
// ============================================================================

const globalStyle = document.createElement('style');
globalStyle.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('style[data-predictive-errors]')) {
  globalStyle.setAttribute('data-predictive-errors', 'true');
  document.head.appendChild(globalStyle);
}

export default {
  PredictiveErrorProvider,
  usePredictiveErrors,
  PredictionsPanel,
  InlineWarning,
  usePredictiveInput,
  DEFAULT_VALIDATION_RULES,
};
