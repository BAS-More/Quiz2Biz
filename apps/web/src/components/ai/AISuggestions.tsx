/**
 * AI Answer Suggestions Component
 * Sprint 34: AI Help Assistant
 *
 * Nielsen Heuristic: Recognition over Recall
 * - Smart suggestions based on question patterns
 * - Industry best practice recommendations
 * - One-click answer population
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AnswerSuggestion {
  id: string;
  text: string;
  confidence: number; // 0-1
  source: 'ai' | 'template' | 'history';
  reasoning?: string;
  standardRefs?: string[];
}

export interface QuestionContext {
  questionId: string;
  questionText: string;
  questionType: string;
  dimensionId?: string;
  dimensionName?: string;
  options?: string[];
  previousAnswers?: Record<string, string>;
  industryContext?: string;
}

export interface AISuggestionsConfig {
  apiEndpoint: string;
  apiKey?: string;
  maxSuggestions?: number;
  minConfidence?: number;
  enableTemplates?: boolean;
  enableHistory?: boolean;
}

export interface AISuggestionsContextValue {
  suggestions: AnswerSuggestion[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: (context: QuestionContext) => Promise<void>;
  clearSuggestions: () => void;
  acceptSuggestion: (suggestion: AnswerSuggestion) => void;
  dismissSuggestion: (suggestionId: string) => void;
  config: AISuggestionsConfig;
}

// ============================================================================
// Template Suggestions Database
// ============================================================================

const TEMPLATE_SUGGESTIONS: Record<string, AnswerSuggestion[]> = {
  // Security dimension templates
  security: [
    {
      id: 'sec-1',
      text: 'We implement defense-in-depth with multiple security layers including network segmentation, endpoint protection, and application-level security controls.',
      confidence: 0.85,
      source: 'template',
      reasoning: 'Standard industry practice for security posture',
      standardRefs: ['ISO 27001 A.13.1', 'NIST CSF PR.AC'],
    },
    {
      id: 'sec-2',
      text: 'Security reviews are conducted at each SDLC phase, with automated SAST/DAST scanning integrated into CI/CD pipelines.',
      confidence: 0.82,
      source: 'template',
      reasoning: 'DevSecOps best practice',
      standardRefs: ['OWASP ASVS 1.14', 'NIST SP 800-53 SA-11'],
    },
  ],
  // Architecture dimension templates
  architecture: [
    {
      id: 'arch-1',
      text: 'Our architecture follows microservices patterns with clear service boundaries, API contracts, and event-driven communication for loose coupling.',
      confidence: 0.88,
      source: 'template',
      reasoning: 'Modern cloud-native architecture pattern',
      standardRefs: ['AWS Well-Architected Framework', 'TOGAF ADM'],
    },
    {
      id: 'arch-2',
      text: 'We maintain Architecture Decision Records (ADRs) for all significant technical decisions, reviewed by the architecture review board.',
      confidence: 0.8,
      source: 'template',
      reasoning: 'Documentation best practice',
      standardRefs: ['IEEE 42010'],
    },
  ],
  // Compliance dimension templates
  compliance: [
    {
      id: 'comp-1',
      text: 'We maintain a comprehensive compliance matrix mapping controls to ISO 27001, SOC 2 Type II, and GDPR requirements, with quarterly attestation reviews.',
      confidence: 0.9,
      source: 'template',
      reasoning: 'Multi-framework compliance approach',
      standardRefs: ['ISO 27001', 'SOC 2', 'GDPR'],
    },
  ],
  // Data protection templates
  data: [
    {
      id: 'data-1',
      text: 'Personal data is encrypted at rest (AES-256) and in transit (TLS 1.3), with key management via Azure Key Vault with automatic rotation.',
      confidence: 0.92,
      source: 'template',
      reasoning: 'Data protection best practice',
      standardRefs: ['GDPR Art. 32', 'ISO 27001 A.10.1'],
    },
  ],
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AISuggestionsConfig = {
  apiEndpoint: '/api/ai/suggestions',
  maxSuggestions: 3,
  minConfidence: 0.7,
  enableTemplates: true,
  enableHistory: true,
};

// ============================================================================
// Context
// ============================================================================

const AISuggestionsContext = createContext<AISuggestionsContextValue | null>(null);

export function useAISuggestions(): AISuggestionsContextValue {
  const context = useContext(AISuggestionsContext);
  if (!context) {
    throw new Error('useAISuggestions must be used within an AISuggestionsProvider');
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

export interface AISuggestionsProviderProps {
  children: React.ReactNode;
  config?: Partial<AISuggestionsConfig>;
  onSuggestionAccepted?: (suggestion: AnswerSuggestion, context: QuestionContext) => void;
}

export const AISuggestionsProvider: React.FC<AISuggestionsProviderProps> = ({
  children,
  config: initialConfig,
  onSuggestionAccepted,
}) => {
  const [suggestions, setSuggestions] = useState<AnswerSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<QuestionContext | null>(null);

  const config = { ...DEFAULT_CONFIG, ...initialConfig };

  const getTemplateSuggestions = useCallback(
    (context: QuestionContext): AnswerSuggestion[] => {
      if (!config.enableTemplates) {
        return [];
      }

      const dimensionKey = context.dimensionName?.toLowerCase() || '';
      const templates = TEMPLATE_SUGGESTIONS[dimensionKey] || [];

      return templates.filter((s) => s.confidence >= (config.minConfidence || 0.7));
    },
    [config.enableTemplates, config.minConfidence],
  );

  const fetchSuggestions = useCallback(
    async (context: QuestionContext) => {
      setIsLoading(true);
      setError(null);
      setCurrentContext(context);

      try {
        // Get template suggestions first
        const templateSuggestions = getTemplateSuggestions(context);

        // Fetch AI suggestions
        const response = await fetch(config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            question: context.questionText,
            questionType: context.questionType,
            dimension: context.dimensionName,
            options: context.options,
            previousAnswers: context.previousAnswers,
            industry: context.industryContext,
            maxSuggestions: config.maxSuggestions,
          }),
        });

        if (!response.ok) {
          // Fall back to templates only
          setSuggestions(templateSuggestions.slice(0, config.maxSuggestions || 3));
          return;
        }

        const data = await response.json();
        const aiSuggestions: AnswerSuggestion[] = (data.suggestions || []).map(
          (s: Partial<AnswerSuggestion>, idx: number) => ({
            id: `ai-${idx}`,
            text: s.text || '',
            confidence: s.confidence || 0.75,
            source: 'ai' as const,
            reasoning: s.reasoning,
            standardRefs: s.standardRefs,
          }),
        );

        // Combine and deduplicate
        const allSuggestions = [...aiSuggestions, ...templateSuggestions]
          .filter((s) => s.confidence >= (config.minConfidence || 0.7))
          .slice(0, config.maxSuggestions || 3);

        setSuggestions(allSuggestions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
        // Fall back to templates on error
        const templateSuggestions = getTemplateSuggestions(context);
        setSuggestions(templateSuggestions.slice(0, config.maxSuggestions || 3));
      } finally {
        setIsLoading(false);
      }
    },
    [config, getTemplateSuggestions],
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setCurrentContext(null);
  }, []);

  const acceptSuggestion = useCallback(
    (suggestion: AnswerSuggestion) => {
      if (currentContext && onSuggestionAccepted) {
        onSuggestionAccepted(suggestion, currentContext);
      }
    },
    [currentContext, onSuggestionAccepted],
  );

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  }, []);

  const value: AISuggestionsContextValue = {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    clearSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    config,
  };

  return <AISuggestionsContext.Provider value={value}>{children}</AISuggestionsContext.Provider>;
};

// ============================================================================
// Suggestion Card Component
// ============================================================================

export interface SuggestionCardProps {
  suggestion: AnswerSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  showReasoning?: boolean;
  showStandardRefs?: boolean;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onAccept,
  onDismiss,
  showReasoning = true,
  showStandardRefs = true,
}) => {
  const confidenceColor =
    suggestion.confidence >= 0.85
      ? '#22C55E'
      : suggestion.confidence >= 0.75
        ? '#F59E0B'
        : '#6B7280';

  const sourceLabel = {
    ai: '🤖 AI Suggestion',
    template: '📋 Best Practice',
    history: '📜 Based on History',
  };

  // Source icons for aria-hidden rendering
  const sourceIcon = {
    ai: '🤖',
    template: '📋',
    history: '📜',
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.sourceLabel}>
          <span aria-hidden="true">{sourceIcon[suggestion.source]}</span>{' '}
          {sourceLabel[suggestion.source].split(' ').slice(1).join(' ')}
        </span>
        <div style={styles.confidenceContainer}>
          <span style={styles.confidenceLabel}>Confidence:</span>
          <span style={{ ...styles.confidenceValue, color: confidenceColor }}>
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
      </div>

      <div style={styles.cardContent}>
        <p style={styles.suggestionText}>{suggestion.text}</p>

        {showReasoning && suggestion.reasoning && (
          <div style={styles.reasoning}>
            <span style={styles.reasoningIcon} aria-hidden="true">
              💡
            </span>
            <span style={styles.reasoningText}>{suggestion.reasoning}</span>
          </div>
        )}

        {showStandardRefs && suggestion.standardRefs && suggestion.standardRefs.length > 0 && (
          <div style={styles.standardRefs}>
            <span style={styles.standardRefsLabel}>Standards:</span>
            {suggestion.standardRefs.map((ref, idx) => (
              <span key={idx} style={styles.standardRefBadge}>
                {ref}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={styles.cardActions}>
        <button onClick={onDismiss} style={styles.dismissButton}>
          Dismiss
        </button>
        <button onClick={onAccept} style={styles.acceptButton}>
          Use This Answer
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Suggestions Panel Component
// ============================================================================

export interface SuggestionsPanelProps {
  className?: string;
  title?: string;
  emptyMessage?: string;
  showReasoning?: boolean;
  showStandardRefs?: boolean;
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  className = '',
  title = 'AI Suggestions',
  emptyMessage = 'No suggestions available for this question.',
  showReasoning = true,
  showStandardRefs = true,
}) => {
  const { suggestions, isLoading, error, acceptSuggestion, dismissSuggestion } = useAISuggestions();

  if (isLoading) {
    return (
      <div className={className} style={styles.panel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelIcon} aria-hidden="true">
            ✨
          </span>
          <span style={styles.panelTitle}>{title}</span>
        </div>
        <div style={styles.loading}>
          <span style={styles.loadingSpinner} aria-hidden="true">
            ⏳
          </span>
          <span>Generating suggestions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelIcon} aria-hidden="true">
          ✨
        </span>
        <span style={styles.panelTitle}>{title}</span>
        {suggestions.length > 0 && <span style={styles.suggestionCount}>{suggestions.length}</span>}
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span aria-hidden="true">⚠️</span> {error}
        </div>
      )}

      {suggestions.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon} aria-hidden="true">
            💭
          </span>
          <span style={styles.emptyText}>{emptyMessage}</span>
        </div>
      ) : (
        <div style={styles.suggestionsList}>
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={() => acceptSuggestion(suggestion)}
              onDismiss={() => dismissSuggestion(suggestion.id)}
              showReasoning={showReasoning}
              showStandardRefs={showStandardRefs}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Inline Suggestion Component
// ============================================================================

export interface InlineSuggestionProps {
  suggestion: AnswerSuggestion;
  onAccept: () => void;
  compact?: boolean;
}

export const InlineSuggestion: React.FC<InlineSuggestionProps> = ({
  suggestion,
  onAccept,
  compact = false,
}) => (
  <div style={compact ? styles.inlineCompact : styles.inline}>
    <div style={styles.inlineContent}>
      <span style={styles.inlineIcon} aria-hidden="true">
        💡
      </span>
      <span style={styles.inlineText}>
        {compact ? suggestion.text.slice(0, 100) + '...' : suggestion.text}
      </span>
    </div>
    <button onClick={onAccept} style={styles.inlineButton}>
      Use
    </button>
  </div>
);

// ============================================================================
// Hook for Auto-Fetch
// ============================================================================

export function useAutoSuggestions(context: QuestionContext | null, enabled = true) {
  const { fetchSuggestions, clearSuggestions } = useAISuggestions();

  useEffect(() => {
    if (enabled && context) {
      fetchSuggestions(context);
    } else {
      clearSuggestions();
    }

    return () => {
      clearSuggestions();
    };
  }, [context?.questionId, enabled]);
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  // Panel
  panel: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  panelIcon: {
    fontSize: '18px',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    flex: 1,
  },
  suggestionCount: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: '#2563EB',
    padding: '2px 8px',
    borderRadius: '10px',
  },

  // Loading
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px',
    color: '#6B7280',
    fontSize: '14px',
  },
  loadingSpinner: {
    animation: 'spin 1s linear infinite',
  },

  // Error
  errorBanner: {
    padding: '8px 16px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    fontSize: '13px',
  },

  // Empty
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    color: '#9CA3AF',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '13px',
    textAlign: 'center',
  },

  // List
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #F3F4F6',
  },
  sourceLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#6B7280',
  },
  confidenceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  confidenceLabel: {
    fontSize: '10px',
    color: '#9CA3AF',
  },
  confidenceValue: {
    fontSize: '12px',
    fontWeight: 600,
  },
  cardContent: {
    padding: '12px',
  },
  suggestionText: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#111827',
  },
  reasoning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#FEF3C7',
    borderRadius: '6px',
  },
  reasoningIcon: {
    fontSize: '12px',
    flexShrink: 0,
  },
  reasoningText: {
    fontSize: '12px',
    color: '#92400E',
    lineHeight: 1.4,
  },
  standardRefs: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
  },
  standardRefsLabel: {
    fontSize: '11px',
    color: '#6B7280',
  },
  standardRefBadge: {
    fontSize: '10px',
    fontWeight: 500,
    color: '#1E40AF',
    backgroundColor: '#DBEAFE',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '8px 12px',
    borderTop: '1px solid #F3F4F6',
  },
  dismissButton: {
    padding: '6px 12px',
    fontSize: '12px',
    color: '#6B7280',
    backgroundColor: 'transparent',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  acceptButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#FFFFFF',
    backgroundColor: '#2563EB',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // Inline
  inline: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '8px',
  },
  inlineCompact: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '6px',
  },
  inlineContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  inlineIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  inlineText: {
    fontSize: '13px',
    lineHeight: 1.4,
    color: '#1E40AF',
  },
  inlineButton: {
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#FFFFFF',
    backgroundColor: '#2563EB',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
};

// ============================================================================
// Export
// ============================================================================

export default SuggestionsPanel;
