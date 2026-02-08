/**
 * First-Time Onboarding Component
 *
 * Interactive product tour shown on first login.
 * Highlights key features step-by-step.
 *
 * Nielsen Heuristic #10: Help and Documentation
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface OnboardingStep {
  /** Unique step ID */
  id: string;
  /** CSS selector for target element */
  target: string;
  /** Step title */
  title: string;
  /** Step description */
  content: string;
  /** Tooltip placement relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Whether this step is required (can't skip) */
  required?: boolean;
  /** Custom action button text */
  actionText?: string;
  /** Callback when action button clicked */
  onAction?: () => void;
  /** Image/GIF URL for visual guidance */
  image?: string;
  /** Highlight style */
  highlightStyle?: 'spotlight' | 'border' | 'pulse';
  /** Wait for user action before proceeding */
  waitForAction?: string; // CSS selector of element to click
  /** Delay before showing this step (ms) */
  delay?: number;
}

export interface OnboardingTour {
  /** Tour unique identifier */
  id: string;
  /** Tour name */
  name: string;
  /** Tour description */
  description: string;
  /** Tour steps */
  steps: OnboardingStep[];
  /** Show on first visit only */
  showOnce?: boolean;
  /** Required minimum steps to complete */
  minStepsRequired?: number;
}

export interface OnboardingState {
  /** Currently active tour */
  activeTour: OnboardingTour | null;
  /** Current step index */
  currentStep: number;
  /** Whether tour is in progress */
  isActive: boolean;
  /** Completed tour IDs */
  completedTours: string[];
  /** Dismissed tour IDs */
  dismissedTours: string[];
}

// ============================================================================
// Default Tours
// ============================================================================

export const ONBOARDING_TOURS: OnboardingTour[] = [
  {
    id: 'welcome-tour',
    name: 'Welcome to Quiz2Biz',
    description: 'Learn the basics in 2 minutes',
    showOnce: true,
    minStepsRequired: 3,
    steps: [
      {
        id: 'welcome',
        target: '[data-tour="dashboard"]',
        title: 'Welcome to Quiz2Biz! 👋',
        content: "This is your command center. Let's take a quick tour to help you get started.",
        placement: 'bottom',
        highlightStyle: 'spotlight',
        image: '/images/tour/welcome.gif',
      },
      {
        id: 'score-overview',
        target: '[data-tour="readiness-score"]',
        title: 'Your Readiness Score',
        content:
          'This shows your overall production readiness. Our goal is to get you to 95%+ by completing assessments.',
        placement: 'bottom',
        highlightStyle: 'pulse',
      },
      {
        id: 'start-assessment',
        target: '[data-tour="new-assessment"]',
        title: 'Start Your First Assessment',
        content:
          'Click here to begin a new assessment. Choose from Security, Technology, or Business templates.',
        placement: 'left',
        highlightStyle: 'border',
        actionText: 'Try it now',
      },
      {
        id: 'heatmap',
        target: '[data-tour="heatmap"]',
        title: 'Visual Progress Heatmap',
        content:
          'The heatmap shows gaps at a glance. Red cells need attention, green cells are on track.',
        placement: 'top',
        highlightStyle: 'spotlight',
      },
      {
        id: 'sidebar-nav',
        target: '[data-tour="sidebar"]',
        title: 'Quick Navigation',
        content: 'Use the sidebar to jump between assessments, reports, settings, and help.',
        placement: 'right',
        highlightStyle: 'border',
      },
      {
        id: 'help-shortcut',
        target: '[data-tour="help-button"]',
        title: 'Need Help? Press ?',
        content:
          'Press the ? key anytime to see keyboard shortcuts, or click the help icon for FAQs.',
        placement: 'left',
        highlightStyle: 'pulse',
      },
      {
        id: 'complete',
        target: '[data-tour="dashboard"]',
        title: "You're Ready! 🎉",
        content:
          "That's the basics! Start your first assessment when you're ready. We're here to help.",
        placement: 'bottom',
        highlightStyle: 'spotlight',
        actionText: 'Get Started',
      },
    ],
  },
  {
    id: 'questionnaire-tour',
    name: 'Completing Assessments',
    description: 'Learn how to answer questions effectively',
    showOnce: true,
    steps: [
      {
        id: 'question-types',
        target: '[data-tour="question-card"]',
        title: 'Answering Questions',
        content:
          'Questions come in different formats: multiple choice, text, scales, and file uploads.',
        placement: 'bottom',
        highlightStyle: 'spotlight',
      },
      {
        id: 'progress-tracker',
        target: '[data-tour="progress-sidebar"]',
        title: 'Track Your Progress',
        content:
          'The sidebar shows all sections and questions. Completed items have a green checkmark.',
        placement: 'right',
        highlightStyle: 'border',
      },
      {
        id: 'evidence-upload',
        target: '[data-tour="evidence-upload"]',
        title: 'Attach Evidence',
        content:
          'Upload documents, screenshots, or links to boost your confidence score. Evidence is optional but recommended.',
        placement: 'top',
        highlightStyle: 'pulse',
      },
      {
        id: 'autosave',
        target: '[data-tour="autosave-indicator"]',
        title: 'Auto-Save Active',
        content:
          'Your work is saved automatically every 30 seconds. No need to worry about losing progress!',
        placement: 'bottom',
        highlightStyle: 'border',
      },
      {
        id: 'skip-return',
        target: '[data-tour="skip-button"]',
        title: 'Skip & Return',
        content:
          'Not sure about a question? Skip it and come back later. Skipped questions are highlighted in yellow.',
        placement: 'top',
        highlightStyle: 'spotlight',
      },
    ],
  },
  {
    id: 'billing-tour',
    name: 'Billing & Subscriptions',
    description: 'Manage your plan and payments',
    showOnce: false,
    steps: [
      {
        id: 'current-plan',
        target: '[data-tour="current-plan"]',
        title: 'Your Current Plan',
        content: 'View your subscription details, usage limits, and next billing date.',
        placement: 'bottom',
        highlightStyle: 'spotlight',
      },
      {
        id: 'upgrade',
        target: '[data-tour="upgrade-button"]',
        title: 'Upgrade for More',
        content:
          'Unlock unlimited assessments, advanced reports, and priority support by upgrading.',
        placement: 'left',
        highlightStyle: 'pulse',
      },
      {
        id: 'invoices',
        target: '[data-tour="invoices"]',
        title: 'Invoice History',
        content:
          'Download past invoices for your records. All payments are processed securely via Stripe.',
        placement: 'top',
        highlightStyle: 'border',
      },
    ],
  },
];

// ============================================================================
// Context
// ============================================================================

interface OnboardingContextValue {
  state: OnboardingState;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  endTour: (complete?: boolean) => void;
  resetTour: (tourId: string) => void;
  resetAllTours: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = 'quiz2biz_onboarding_state';

function loadOnboardingState(): Partial<OnboardingState> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveOnboardingState(state: Partial<OnboardingState>): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled
  }
}

// ============================================================================
// Provider
// ============================================================================

interface OnboardingProviderProps {
  children: React.ReactNode;
  tours?: OnboardingTour[];
  autoStart?: boolean;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  tours = ONBOARDING_TOURS,
  autoStart = true,
}) => {
  const [state, setState] = useState<OnboardingState>(() => {
    const stored = loadOnboardingState();
    return {
      activeTour: null,
      currentStep: 0,
      isActive: false,
      completedTours: stored.completedTours || [],
      dismissedTours: stored.dismissedTours || [],
    };
  });

  // Auto-start welcome tour for new users
  useEffect(() => {
    if (!autoStart) {
      return;
    }

    const welcomeTour = tours.find((t) => t.id === 'welcome-tour');
    if (
      welcomeTour &&
      welcomeTour.showOnce &&
      !state.completedTours.includes('welcome-tour') &&
      !state.dismissedTours.includes('welcome-tour') &&
      !state.isActive
    ) {
      // Delay to let the page render first
      const timeout = setTimeout(() => {
        startTour('welcome-tour');
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [autoStart, tours, state.completedTours, state.dismissedTours, state.isActive]);

  const startTour = useCallback(
    (tourId: string) => {
      const tour = tours.find((t) => t.id === tourId);
      if (!tour) {
        return;
      }

      setState((prev) => ({
        ...prev,
        activeTour: tour,
        currentStep: 0,
        isActive: true,
      }));
    },
    [tours],
  );

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (!prev.activeTour) {
        return prev;
      }

      const nextIndex = prev.currentStep + 1;
      if (nextIndex >= prev.activeTour.steps.length) {
        // Tour complete
        const newCompleted = [...prev.completedTours, prev.activeTour.id];
        saveOnboardingState({
          completedTours: newCompleted,
          dismissedTours: prev.dismissedTours,
        });
        return {
          ...prev,
          activeTour: null,
          currentStep: 0,
          isActive: false,
          completedTours: newCompleted,
        };
      }

      return {
        ...prev,
        currentStep: nextIndex,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const endTour = useCallback((complete = false) => {
    setState((prev) => {
      if (!prev.activeTour) {
        return prev;
      }

      const tourId = prev.activeTour.id;
      const newCompleted = complete ? [...prev.completedTours, tourId] : prev.completedTours;
      const newDismissed = !complete ? [...prev.dismissedTours, tourId] : prev.dismissedTours;

      saveOnboardingState({
        completedTours: newCompleted,
        dismissedTours: newDismissed,
      });

      return {
        ...prev,
        activeTour: null,
        currentStep: 0,
        isActive: false,
        completedTours: newCompleted,
        dismissedTours: newDismissed,
      };
    });
  }, []);

  const resetTour = useCallback((tourId: string) => {
    setState((prev) => {
      const newCompleted = prev.completedTours.filter((id) => id !== tourId);
      const newDismissed = prev.dismissedTours.filter((id) => id !== tourId);
      saveOnboardingState({
        completedTours: newCompleted,
        dismissedTours: newDismissed,
      });
      return {
        ...prev,
        completedTours: newCompleted,
        dismissedTours: newDismissed,
      };
    });
  }, []);

  const resetAllTours = useCallback(() => {
    setState((prev) => {
      saveOnboardingState({ completedTours: [], dismissedTours: [] });
      return {
        ...prev,
        completedTours: [],
        dismissedTours: [],
      };
    });
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        state,
        startTour,
        nextStep,
        prevStep,
        skipStep,
        endTour,
        resetTour,
        resetAllTours,
      }}
    >
      {children}
      {state.isActive && state.activeTour && (
        <OnboardingOverlay
          tour={state.activeTour}
          currentStep={state.currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipStep}
          onClose={() => endTour(false)}
        />
      )}
    </OnboardingContext.Provider>
  );
};

// ============================================================================
// Overlay Component
// ============================================================================

interface OnboardingOverlayProps {
  tour: OnboardingTour;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  tour,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onClose,
}) => {
  const step = tour.steps[currentStep];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Find target element and calculate position
  useEffect(() => {
    if (!step) {
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(step.target);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
        // Scroll target into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    // Initial find
    const delay = step.delay || 100;
    const timeout = setTimeout(findTarget, delay);

    // Re-find on resize/scroll
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget);
    };
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
        case 'Enter':
          onNext();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose]);

  if (!step) {
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tour.steps.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Center on screen if no target found
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 360;
    const tooltipHeight = 280;

    let top = 0;
    let left = 0;

    switch (step.placement) {
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + padding;
        break;
      default:
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    }

    // Keep within viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

    return {
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
    };
  };

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
    >
      {/* Backdrop */}
      <div className="onboarding-backdrop" onClick={onClose} />

      {/* Spotlight highlight */}
      {targetRect && step.highlightStyle === 'spotlight' && (
        <div
          className="onboarding-spotlight"
          style={{
            position: 'fixed',
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Border highlight */}
      {targetRect && step.highlightStyle === 'border' && (
        <div
          className="onboarding-border-highlight"
          style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            border: '3px solid #3182ce',
            borderRadius: 8,
            pointerEvents: 'none',
            animation: 'pulse-border 2s infinite',
          }}
        />
      )}

      {/* Pulse highlight */}
      {targetRect && step.highlightStyle === 'pulse' && (
        <div
          className="onboarding-pulse-highlight"
          style={{
            position: 'fixed',
            top: targetRect.top + targetRect.height / 2,
            left: targetRect.left + targetRect.width / 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: '#3182ce',
            transform: 'translate(-50%, -50%)',
            animation: 'pulse-ring 1.5s infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <div ref={tooltipRef} className="onboarding-tooltip" style={getTooltipStyle()}>
        <div className="onboarding-tooltip__header">
          <h2 id="tour-step-title" className="onboarding-tooltip__title">
            {step.title}
          </h2>
          <button className="onboarding-tooltip__close" onClick={onClose} aria-label="Close tour">
            ✕
          </button>
        </div>

        {step.image && (
          <img
            src={step.image}
            alt=""
            className="onboarding-tooltip__image"
            style={{ width: '100%', borderRadius: 8, marginBottom: 12 }}
          />
        )}

        <p className="onboarding-tooltip__content">{step.content}</p>

        <div className="onboarding-tooltip__progress">
          <span>
            Step {currentStep + 1} of {tour.steps.length}
          </span>
          <div className="onboarding-tooltip__dots">
            {tour.steps.map((_, idx) => (
              <span
                key={idx}
                className={`onboarding-tooltip__dot ${
                  idx === currentStep ? 'onboarding-tooltip__dot--active' : ''
                } ${idx < currentStep ? 'onboarding-tooltip__dot--completed' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="onboarding-tooltip__actions">
          {!isFirstStep && (
            <button
              className="onboarding-tooltip__btn onboarding-tooltip__btn--secondary"
              onClick={onPrev}
            >
              ← Back
            </button>
          )}
          {!step.required && !isLastStep && (
            <button
              className="onboarding-tooltip__btn onboarding-tooltip__btn--skip"
              onClick={onSkip}
            >
              Skip
            </button>
          )}
          <button
            className="onboarding-tooltip__btn onboarding-tooltip__btn--primary"
            onClick={step.onAction || onNext}
          >
            {step.actionText || (isLastStep ? 'Finish' : 'Next →')}
          </button>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
        }

        .onboarding-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .onboarding-tooltip {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          z-index: 10001;
          max-height: 90vh;
          overflow-y: auto;
        }

        .onboarding-tooltip__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .onboarding-tooltip__title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0;
        }

        .onboarding-tooltip__close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #666;
          padding: 4px;
        }

        .onboarding-tooltip__close:hover {
          color: #333;
        }

        .onboarding-tooltip__content {
          font-size: 14px;
          line-height: 1.6;
          color: #4a5568;
          margin: 0 0 16px;
        }

        .onboarding-tooltip__progress {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-size: 12px;
          color: #718096;
        }

        .onboarding-tooltip__dots {
          display: flex;
          gap: 6px;
        }

        .onboarding-tooltip__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e2e8f0;
        }

        .onboarding-tooltip__dot--active {
          background: #3182ce;
        }

        .onboarding-tooltip__dot--completed {
          background: #38a169;
        }

        .onboarding-tooltip__actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .onboarding-tooltip__btn {
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .onboarding-tooltip__btn--primary {
          background: #3182ce;
          color: white;
          border: none;
        }

        .onboarding-tooltip__btn--primary:hover {
          background: #2c5282;
        }

        .onboarding-tooltip__btn--secondary {
          background: #edf2f7;
          color: #4a5568;
          border: none;
        }

        .onboarding-tooltip__btn--secondary:hover {
          background: #e2e8f0;
        }

        .onboarding-tooltip__btn--skip {
          background: transparent;
          color: #718096;
          border: none;
        }

        .onboarding-tooltip__btn--skip:hover {
          color: #4a5568;
        }

        @keyframes pulse-border {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Trigger Components
// ============================================================================

interface TourTriggerProps {
  tourId: string;
  children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
}

export const TourTrigger: React.FC<TourTriggerProps> = ({ tourId, children }) => {
  const { startTour, state } = useOnboarding();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startTour(tourId);
  };

  // Don't show trigger if tour already completed
  if (state.completedTours.includes(tourId)) {
    return null;
  }

  return React.cloneElement(children, {
    onClick: handleClick,
  });
};

interface TourButtonProps {
  tourId: string;
  className?: string;
  children?: React.ReactNode;
}

export const TourButton: React.FC<TourButtonProps> = ({
  tourId,
  className = '',
  children = 'Take the Tour',
}) => {
  const { startTour, state } = useOnboarding();
  const tour = ONBOARDING_TOURS.find((t) => t.id === tourId);

  if (!tour) {
    return null;
  }

  const isCompleted = state.completedTours.includes(tourId);

  return (
    <button
      className={`tour-button ${className}`}
      onClick={() => startTour(tourId)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: isCompleted ? '#edf2f7' : '#3182ce',
        color: isCompleted ? '#4a5568' : 'white',
        border: 'none',
        borderRadius: 6,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {isCompleted ? '✓ ' : '▶ '}
      {children}
    </button>
  );
};

// ============================================================================
// Tour List Component
// ============================================================================

export const TourList: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { startTour, state, resetTour } = useOnboarding();

  return (
    <div className={`tour-list ${className}`}>
      <h3 style={{ marginBottom: 16 }}>Interactive Tours</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ONBOARDING_TOURS.map((tour) => {
          const isCompleted = state.completedTours.includes(tour.id);
          const isDismissed = state.dismissedTours.includes(tour.id);

          return (
            <div
              key={tour.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                background: '#f7fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: 16 }}>
                  {isCompleted && '✓ '}
                  {tour.name}
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#718096' }}>
                  {tour.description} • {tour.steps.length} steps
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(isCompleted || isDismissed) && (
                  <button
                    onClick={() => resetTour(tour.id)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      border: '1px solid #cbd5e0',
                      borderRadius: 4,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => startTour(tour.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {isCompleted ? 'Replay' : 'Start'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProvider;
