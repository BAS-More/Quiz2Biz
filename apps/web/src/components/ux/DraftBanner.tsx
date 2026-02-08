/**
 * Draft Recovery Banner Component
 *
 * Displays a banner when a user has an unsaved draft to recover.
 * Nielsen Heuristic: User Control & Freedom - Clear indication of recoverable work.
 */

import { useState, useEffect } from 'react';
import type { DraftData } from '../../hooks/useDraftAutosave';
import { isDraftRecoverable, formatTimeSinceSave } from '../../hooks/useDraftAutosave';

// ============================================================================
// Types
// ============================================================================

export interface DraftBannerProps {
  draft: DraftData | null;
  onResume: () => void;
  onDiscard: () => void;
  className?: string;
  position?: 'top' | 'bottom';
}

export interface AutosaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
  className?: string;
}

// ============================================================================
// Styles (inline for portability)
// ============================================================================

const styles = {
  banner: {
    base: `
      w-full p-4 flex items-center justify-between gap-4
      border rounded-lg shadow-sm
      animate-in slide-in-from-top duration-300
    `,
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  },
  button: {
    primary: `
      px-4 py-2 rounded-md font-medium text-sm
      bg-blue-600 text-white hover:bg-blue-700
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      transition-colors duration-150
    `,
    secondary: `
      px-4 py-2 rounded-md font-medium text-sm
      bg-white text-gray-700 border border-gray-300
      hover:bg-gray-50
      focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
      transition-colors duration-150
    `,
    danger: `
      px-4 py-2 rounded-md font-medium text-sm
      bg-white text-red-600 border border-red-300
      hover:bg-red-50
      focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
      transition-colors duration-150
    `,
  },
  indicator: {
    base: 'flex items-center gap-2 text-sm',
    saving: 'text-blue-600',
    saved: 'text-green-600',
    unsaved: 'text-yellow-600',
    error: 'text-red-600',
  },
  icon: {
    size: 'w-5 h-5',
    spinner: 'animate-spin',
  },
};

// ============================================================================
// Icons (inline SVG for portability)
// ============================================================================

const Icons = {
  Clock: () => (
    <svg className={styles.icon.size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Resume: () => (
    <svg className={styles.icon.size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Trash: () => (
    <svg className={styles.icon.size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  Check: () => (
    <svg className={styles.icon.size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Spinner: () => (
    <svg className={`${styles.icon.size} ${styles.icon.spinner}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ),
  Warning: () => (
    <svg className={styles.icon.size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  Error: () => (
    <svg className={styles.icon.size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Document: () => (
    <svg className={styles.icon.size} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
};

// ============================================================================
// Draft Banner Component
// ============================================================================

export function DraftBanner({
  draft,
  onResume,
  onDiscard,
  className = '',
  position = 'top',
}: DraftBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  useEffect(() => {
    if (draft && isDraftRecoverable(draft)) {
      // Slight delay for animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [draft]);

  if (!draft || !isVisible) {
    return null;
  }

  const lastSavedDate = new Date(draft.lastSavedAt);
  const timeSinceSave = formatTimeSinceSave(lastSavedDate);
  const completionPercent =
    draft.metadata.totalQuestions > 0
      ? Math.round((draft.metadata.completedQuestions / draft.metadata.totalQuestions) * 100)
      : 0;

  const handleDiscard = () => {
    if (showConfirmDiscard) {
      onDiscard();
      setIsVisible(false);
    } else {
      setShowConfirmDiscard(true);
    }
  };

  return (
    <div
      className={`${styles.banner.base} ${styles.banner.info} ${className}`}
      role="alert"
      aria-live="polite"
      style={{
        position: position === 'top' ? 'relative' : 'fixed',
        bottom: position === 'bottom' ? '1rem' : 'auto',
        left: position === 'bottom' ? '1rem' : 'auto',
        right: position === 'bottom' ? '1rem' : 'auto',
        zIndex: 50,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icons.Document />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Resume your draft?</h3>
          <p className="text-sm mt-1 opacity-90">
            You have an unsaved draft for{' '}
            <span className="font-medium">
              {draft.metadata.questionnaireName || 'this questionnaire'}
            </span>
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
            <span className="flex items-center gap-1">
              <Icons.Clock />
              {timeSinceSave}
            </span>
            <span>
              {completionPercent}% complete ({draft.metadata.completedQuestions}/
              {draft.metadata.totalQuestions} questions)
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {showConfirmDiscard ? (
          <>
            <span className="text-sm text-red-600 mr-2">Are you sure?</span>
            <button
              onClick={() => setShowConfirmDiscard(false)}
              className={styles.button.secondary}
              aria-label="Cancel discard"
            >
              Cancel
            </button>
            <button
              onClick={handleDiscard}
              className={styles.button.danger}
              aria-label="Confirm discard draft"
            >
              Discard
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleDiscard}
              className={styles.button.secondary}
              aria-label="Discard draft"
            >
              <Icons.Trash />
              <span className="ml-1">Discard</span>
            </button>
            <button onClick={onResume} className={styles.button.primary} aria-label="Resume draft">
              <Icons.Resume />
              <span className="ml-1">Resume</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Autosave Indicator Component
// ============================================================================

export function AutosaveIndicator({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  error,
  className = '',
}: AutosaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isSaving]);

  const getIndicatorState = () => {
    if (error) {
      return {
        icon: <Icons.Error />,
        text: 'Failed to save',
        style: styles.indicator.error,
        ariaLabel: `Autosave error: ${error}`,
      };
    }
    if (isSaving) {
      return {
        icon: <Icons.Spinner />,
        text: 'Saving...',
        style: styles.indicator.saving,
        ariaLabel: 'Saving draft',
      };
    }
    if (showSaved) {
      return {
        icon: <Icons.Check />,
        text: 'Saved',
        style: styles.indicator.saved,
        ariaLabel: 'Draft saved',
      };
    }
    if (hasUnsavedChanges) {
      return {
        icon: <Icons.Warning />,
        text: 'Unsaved changes',
        style: styles.indicator.unsaved,
        ariaLabel: 'You have unsaved changes',
      };
    }
    if (lastSaved) {
      return {
        icon: <Icons.Clock />,
        text: formatTimeSinceSave(lastSaved),
        style: styles.indicator.saved,
        ariaLabel: `Last saved ${formatTimeSinceSave(lastSaved)}`,
      };
    }
    return null;
  };

  const state = getIndicatorState();
  if (!state) {
    return null;
  }

  return (
    <div
      className={`${styles.indicator.base} ${state.style} ${className}`}
      role="status"
      aria-label={state.ariaLabel}
      aria-live="polite"
    >
      {state.icon}
      <span>{state.text}</span>
      {error && (
        <button
          className="underline ml-2 hover:no-underline"
          onClick={() => window.location.reload()}
          aria-label="Retry saving"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default DraftBanner;
