/**
 * AI Answer Suggestions Component
 * Sprint 34: AI Help Assistant
 *
 * Nielsen Heuristic: Recognition over Recall
 * - Smart suggestions based on question patterns
 * - Industry best practice recommendations
 * - One-click answer population
 */

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';

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

  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...initialConfig }), [initialConfig]);

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
      ? 'var(--color-success-500)'
      : suggestion.confidence >= 0.75
        ? 'var(--color-warning-500)'
        : 'var(--color-surface-500)';

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
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.sourceLabel}>
          <span aria-hidden="true">{sourceIcon[suggestion.source]}</span>{' '}
          {sourceLabel[suggestion.source].split(' ').slice(1).join(' ')}
        </span>
        <div className={styles.confidenceContainer}>
          <span className={styles.confidenceLabel}>Confidence:</span>
          <span className={styles.confidenceValue} style={{ color: confidenceColor }}>
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className={styles.cardContent}>
        <p className={styles.suggestionText}>{suggestion.text}</p>

        {showReasoning && suggestion.reasoning && (
          <div className={styles.reasoning}>
            <span className={styles.reasoningIcon} aria-hidden="true">
              💡
            </span>
            <span className={styles.reasoningText}>{suggestion.reasoning}</span>
          </div>
        )}

        {showStandardRefs && suggestion.standardRefs && suggestion.standardRefs.length > 0 && (
          <div className={styles.standardRefs}>
            <span className={styles.standardRefsLabel}>Standards:</span>
            {suggestion.standardRefs.map((ref, idx) => (
              <span key={idx} className={styles.standardRefBadge}>
                {ref}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.cardActions}>
        <button onClick={onDismiss} className={styles.dismissButton}>
          Dismiss
        </button>
        <button onClick={onAccept} className={styles.acceptButton}>
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
      <div className={`${className} ${styles.panel}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelIcon} aria-hidden="true">
            ✨
          </span>
          <span className={styles.panelTitle}>{title}</span>
        </div>
        <div className={styles.loading}>
          <span className={styles.loadingSpinner} aria-hidden="true">
            ⏳
          </span>
          <span>Generating suggestions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} ${styles.panel}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon} aria-hidden="true">
          ✨
        </span>
        <span className={styles.panelTitle}>{title}</span>
        {suggestions.length > 0 && <span className={styles.suggestionCount}>{suggestions.length}</span>}
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span aria-hidden="true">⚠️</span> {error}
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            💭
          </span>
          <span className={styles.emptyText}>{emptyMessage}</span>
        </div>
      ) : (
        <div className={styles.suggestionsList}>
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
    <div className={styles.inlineContent}>
      <span className={styles.inlineIcon} aria-hidden="true">
        💡
      </span>
      <span className={styles.inlineText}>
        {compact ? suggestion.text.slice(0, 100) + '...' : suggestion.text}
      </span>
    </div>
    <button onClick={onAccept} className={styles.inlineButton}>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.questionId, enabled]);
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  // Panel
  panel: 'bg-surface-50 border border-surface-200 rounded-xl overflow-hidden',
  panelHeader: 'flex items-center gap-2 px-4 py-3 bg-surface-100 border-b border-surface-200',
  panelIcon: 'text-lg',
  panelTitle: 'text-sm font-semibold text-surface-900 flex-1',
  suggestionCount: 'text-xs font-semibold text-white bg-brand-600 px-2 py-0.5 rounded-full',

  // Loading
  loading: 'flex items-center justify-center gap-2 p-6 text-surface-500 text-sm',
  loadingSpinner: 'animate-spin',

  // Error
  errorBanner: 'px-4 py-2 bg-danger-50 text-danger-600 text-[13px]',

  // Empty
  emptyState: 'flex flex-col items-center p-6 text-surface-400',
  emptyIcon: 'text-[32px] mb-2 opacity-50',
  emptyText: 'text-[13px] text-center',

  // List
  suggestionsList: 'flex flex-col gap-3 p-4',

  // Card
  card: 'bg-surface-50 border border-surface-200 rounded-lg overflow-hidden transition-shadow duration-150',
  cardHeader: 'flex justify-between items-center px-3 py-2 bg-surface-100 border-b border-surface-100',
  sourceLabel: 'text-[11px] font-medium text-surface-500',
  confidenceContainer: 'flex items-center gap-1',
  confidenceLabel: 'text-[10px] text-surface-400',
  confidenceValue: 'text-xs font-semibold',
  cardContent: 'p-3',
  suggestionText: 'm-0 mb-2 text-sm leading-relaxed text-surface-900',
  reasoning: 'flex items-start gap-1.5 mt-2 p-2 bg-warning-100 rounded-md',
  reasoningIcon: 'text-xs shrink-0',
  reasoningText: 'text-xs text-warning-800 leading-snug',
  standardRefs: 'flex flex-wrap items-center gap-1.5 mt-2',
  standardRefsLabel: 'text-[11px] text-surface-500',
  standardRefBadge: 'text-[10px] font-medium text-brand-800 bg-brand-100 px-1.5 py-0.5 rounded',
  cardActions: 'flex justify-end gap-2 px-3 py-2 border-t border-surface-100',
  dismissButton: 'px-3 py-1.5 text-xs text-surface-500 bg-transparent border border-surface-300 rounded-md cursor-pointer font-[inherit]',
  acceptButton: 'px-3 py-1.5 text-xs font-medium text-white bg-brand-600 border-none rounded-md cursor-pointer font-[inherit]',

  // Inline
  inline: 'flex items-start gap-3 p-3 bg-brand-50 border border-brand-200 rounded-lg',
  inlineCompact: 'flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-200 rounded-md',
  inlineContent: 'flex-1 flex items-start gap-2',
  inlineIcon: 'text-base shrink-0',
  inlineText: 'text-[13px] leading-snug text-brand-800',
  inlineButton: 'px-2.5 py-1 text-xs font-medium text-white bg-brand-600 border-none rounded cursor-pointer whitespace-nowrap font-[inherit]',
};

// ============================================================================
// Export
// ============================================================================

export default SuggestionsPanel;
