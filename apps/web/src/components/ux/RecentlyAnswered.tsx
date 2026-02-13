/**
 * Recently Answered Indicator Component
 *
 * Shows timestamp badges on recently answered questions.
 * Highlights items answered in the last 5 minutes.
 *
 * Nielsen Heuristic #1: Visibility of System Status
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AnsweredQuestion {
  /** Question ID */
  questionId: string;
  /** When the question was answered */
  answeredAt: Date;
  /** Question text/label */
  questionText?: string;
  /** Section ID */
  sectionId?: string;
  /** Whether the answer was modified (vs first time) */
  wasModified?: boolean;
}

export interface RecentlyAnsweredConfig {
  /** Time threshold for "recent" (ms) */
  recentThreshold?: number;
  /** Time threshold for "very recent" (ms) */
  veryRecentThreshold?: number;
  /** Whether to show relative time */
  showRelativeTime?: boolean;
  /** Whether to auto-update timestamps */
  autoUpdate?: boolean;
  /** Update interval (ms) */
  updateInterval?: number;
}

// ============================================================================
// Time Formatting Utilities
// ============================================================================

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) {
    return 'Just now';
  }
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }

  return date.toLocaleDateString();
}

export function isRecent(date: Date, thresholdMs: number = 5 * 60 * 1000): boolean {
  const now = new Date();
  return now.getTime() - date.getTime() < thresholdMs;
}

export function isVeryRecent(date: Date, thresholdMs: number = 60 * 1000): boolean {
  const now = new Date();
  return now.getTime() - date.getTime() < thresholdMs;
}

// ============================================================================
// Context & Hook
// ============================================================================

interface RecentlyAnsweredContextValue {
  answers: AnsweredQuestion[];
  addAnswer: (answer: AnsweredQuestion) => void;
  removeAnswer: (questionId: string) => void;
  clearAnswers: () => void;
  getRecentAnswers: (thresholdMs?: number) => AnsweredQuestion[];
  isQuestionRecent: (questionId: string) => boolean;
}

const RecentlyAnsweredContext = React.createContext<RecentlyAnsweredContextValue | null>(null);

export const useRecentlyAnswered = () => {
  const context = React.useContext(RecentlyAnsweredContext);
  if (!context) {
    throw new Error('useRecentlyAnswered must be used within RecentlyAnsweredProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

interface RecentlyAnsweredProviderProps {
  children: React.ReactNode;
  config?: RecentlyAnsweredConfig;
  persistKey?: string;
}

export const RecentlyAnsweredProvider: React.FC<RecentlyAnsweredProviderProps> = ({
  children,
  config = {},
  persistKey = 'quiz2biz_recent_answers',
}) => {
  const {
    recentThreshold = 5 * 60 * 1000, // 5 minutes
    autoUpdate = true,
    updateInterval = 10000, // 10 seconds
  } = config;

  const [answers, setAnswers] = useState<AnsweredQuestion[]>(() => {
    // Load from localStorage
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const stored = localStorage.getItem(persistKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((a: Record<string, unknown>) => ({
          ...a,
          answeredAt: new Date(a.answeredAt as string),
        }));
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // Auto-refresh to update relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!autoUpdate) {
      return;
    }
    const interval = setInterval(() => setTick((t) => t + 1), updateInterval);
    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(persistKey, JSON.stringify(answers));
    } catch {
      // Storage full or disabled
    }
  }, [answers, persistKey]);

  // Clean up old answers periodically
  useEffect(() => {
    const cleanup = () => {
      setAnswers((prev) =>
        prev.filter((a) => {
          const age = Date.now() - a.answeredAt.getTime();
          return age < 24 * 60 * 60 * 1000; // Keep for 24 hours max
        }),
      );
    };

    cleanup(); // Initial cleanup
    const interval = setInterval(cleanup, 60 * 60 * 1000); // Every hour
    return () => clearInterval(interval);
  }, []);

  const addAnswer = useCallback((answer: AnsweredQuestion) => {
    setAnswers((prev) => {
      // Remove existing answer for same question
      const filtered = prev.filter((a) => a.questionId !== answer.questionId);
      return [answer, ...filtered];
    });
  }, []);

  const removeAnswer = useCallback((questionId: string) => {
    setAnswers((prev) => prev.filter((a) => a.questionId !== questionId));
  }, []);

  const clearAnswers = useCallback(() => {
    setAnswers([]);
  }, []);

  const getRecentAnswers = useCallback(
    (thresholdMs: number = recentThreshold) => {
      return answers.filter((a) => isRecent(a.answeredAt, thresholdMs));
    },
    [answers, recentThreshold],
  );

  const isQuestionRecent = useCallback(
    (questionId: string) => {
      const answer = answers.find((a) => a.questionId === questionId);
      return answer ? isRecent(answer.answeredAt, recentThreshold) : false;
    },
    [answers, recentThreshold],
  );

  return (
    <RecentlyAnsweredContext.Provider
      value={{
        answers,
        addAnswer,
        removeAnswer,
        clearAnswers,
        getRecentAnswers,
        isQuestionRecent,
      }}
    >
      {children}
    </RecentlyAnsweredContext.Provider>
  );
};

// ============================================================================
// Indicator Badge Component
// ============================================================================

interface RecentBadgeProps {
  answeredAt: Date;
  wasModified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RecentBadge: React.FC<RecentBadgeProps> = ({
  answeredAt,
  wasModified = false,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const isVery = isVeryRecent(answeredAt);
  const recent = isRecent(answeredAt);

  if (!recent) {
    return null;
  }

  const sizeStyles = {
    sm: { fontSize: 10, padding: '2px 6px' },
    md: { fontSize: 11, padding: '3px 8px' },
    lg: { fontSize: 12, padding: '4px 10px' },
  };

  return (
    <span
      className={`recent-badge ${isVery ? 'recent-badge--very-recent' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...sizeStyles[size],
        background: isVery ? '#c6f6d5' : '#fefcbf',
        color: isVery ? '#22543d' : '#744210',
        borderRadius: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
      title={`Answered ${answeredAt.toLocaleString()}`}
    >
      {showIcon && (
        <span style={{ fontSize: sizeStyles[size].fontSize }}>{isVery ? '✨' : '🕐'}</span>
      )}
      {formatRelativeTime(answeredAt)}
      {wasModified && (
        <span style={{ fontSize: sizeStyles[size].fontSize - 1 }} title="Modified">
          ✏️
        </span>
      )}
    </span>
  );
};

// ============================================================================
// Question Item with Recent Indicator
// ============================================================================

interface QuestionNavItemProps {
  questionId: string;
  questionNumber: number;
  questionText: string;
  isAnswered: boolean;
  isSkipped?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
  className?: string;
}

export const QuestionNavItem: React.FC<QuestionNavItemProps> = ({
  questionId,
  questionNumber,
  questionText,
  isAnswered,
  isSkipped = false,
  isCurrent = false,
  onClick,
  className = '',
}) => {
  const { answers, isQuestionRecent } = useRecentlyAnswered();

  const answer = answers.find((a) => a.questionId === questionId);
  const isRecent = isQuestionRecent(questionId);

  return (
    <button
      className={`question-nav-item ${className}`}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        background: isCurrent ? '#ebf8ff' : 'transparent',
        border: isCurrent ? '2px solid #3182ce' : '1px solid #e2e8f0',
        borderRadius: 8,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      aria-current={isCurrent ? 'step' : undefined}
    >
      {/* Status indicator */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          fontSize: 14,
          fontWeight: 600,
          background: isAnswered
            ? isRecent
              ? '#c6f6d5'
              : '#9ae6b4'
            : isSkipped
              ? '#fefcbf'
              : '#edf2f7',
          color: isAnswered ? '#22543d' : isSkipped ? '#744210' : '#4a5568',
        }}
      >
        {isAnswered ? '✓' : isSkipped ? '○' : questionNumber}
      </span>

      {/* Question text */}
      <span
        style={{
          flex: 1,
          fontSize: 14,
          color: '#2d3748',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {questionText}
      </span>

      {/* Recent badge */}
      {answer && isRecent && (
        <RecentBadge answeredAt={answer.answeredAt} wasModified={answer.wasModified} size="sm" />
      )}
    </button>
  );
};

// ============================================================================
// Recent Activity Summary
// ============================================================================

interface RecentActivitySummaryProps {
  className?: string;
}

export const RecentActivitySummary: React.FC<RecentActivitySummaryProps> = ({ className = '' }) => {
  const { getRecentAnswers } = useRecentlyAnswered();

  const veryRecent = getRecentAnswers(60 * 1000); // Last minute
  const recent = getRecentAnswers(5 * 60 * 1000); // Last 5 minutes
  const lastHour = getRecentAnswers(60 * 60 * 1000); // Last hour

  return (
    <div className={`recent-activity ${className}`}>
      <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#4a5568' }}>📊 Recent Activity</h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Last minute:</span>
          <span style={{ fontWeight: 600, color: '#22543d' }}>{veryRecent.length} answered</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Last 5 minutes:</span>
          <span style={{ fontWeight: 600, color: '#2b6cb0' }}>{recent.length} answered</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Last hour:</span>
          <span style={{ fontWeight: 600, color: '#4a5568' }}>{lastHour.length} answered</span>
        </div>
      </div>

      {veryRecent.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#718096' }}>
            ✨ Great momentum! Keep going!
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Timeline Component
// ============================================================================

interface RecentAnswersTimelineProps {
  maxItems?: number;
  className?: string;
}

export const RecentAnswersTimeline: React.FC<RecentAnswersTimelineProps> = ({
  maxItems = 10,
  className = '',
}) => {
  const { answers } = useRecentlyAnswered();

  const recentAnswers = useMemo(() => {
    return answers
      .sort((a, b) => b.answeredAt.getTime() - a.answeredAt.getTime())
      .slice(0, maxItems);
  }, [answers, maxItems]);

  if (recentAnswers.length === 0) {
    return (
      <div
        className={`recent-timeline ${className}`}
        style={{ textAlign: 'center', padding: 20, color: '#718096' }}
      >
        <p>No recent answers yet.</p>
        <p style={{ fontSize: 13 }}>Start answering questions to see your progress here!</p>
      </div>
    );
  }

  return (
    <div className={`recent-timeline ${className}`}>
      <h4 style={{ margin: '0 0 16px', fontSize: 14, color: '#4a5568' }}>🕐 Recent Answers</h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recentAnswers.map((answer) => (
          <div
            key={answer.questionId}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 12,
              background: '#f7fafc',
              borderRadius: 8,
              borderLeft: `3px solid ${isVeryRecent(answer.answeredAt) ? '#48bb78' : '#ecc94b'}`,
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#2d3748' }}>
                {answer.questionText || `Question ${answer.questionId}`}
              </p>
              {answer.sectionId && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#718096' }}>
                  Section: {answer.sectionId}
                </p>
              )}
            </div>
            <RecentBadge
              answeredAt={answer.answeredAt}
              wasModified={answer.wasModified}
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Hook for marking questions as answered
// ============================================================================

export function useMarkAnswered() {
  const { addAnswer } = useRecentlyAnswered();

  const markAnswered = useCallback(
    (
      questionId: string,
      options: Partial<Omit<AnsweredQuestion, 'questionId' | 'answeredAt'>> = {},
    ) => {
      addAnswer({
        questionId,
        answeredAt: new Date(),
        ...options,
      });
    },
    [addAnswer],
  );

  return markAnswered;
}

// ============================================================================
// Highlight Animation Component
// ============================================================================

interface RecentHighlightProps {
  isRecent: boolean;
  children: React.ReactNode;
  className?: string;
}

export const RecentHighlight: React.FC<RecentHighlightProps> = ({
  isRecent,
  children,
  className = '',
}) => {
  return (
    <div
      className={`recent-highlight ${isRecent ? 'recent-highlight--active' : ''} ${className}`}
      style={{
        position: 'relative',
        animation: isRecent ? 'recent-pulse 2s ease-in-out' : 'none',
      }}
    >
      {children}
      <style>{`
        @keyframes recent-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(72, 187, 120, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(72, 187, 120, 0);
          }
        }

        .recent-highlight--active {
          border-radius: 8px;
          background: linear-gradient(
            90deg,
            rgba(72, 187, 120, 0.1) 0%,
            transparent 100%
          );
        }
      `}</style>
    </div>
  );
};

export default RecentlyAnsweredProvider;
