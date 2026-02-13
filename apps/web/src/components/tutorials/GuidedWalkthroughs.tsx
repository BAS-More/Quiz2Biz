/**
 * Guided Walkthroughs & Usability Testing Component
 * Sprint 39: Interactive Guides, A/B Testing, UX Monitoring
 *
 * Features:
 * - Interactive step-by-step walkthroughs
 * - Automated usability testing integration
 * - A/B experiment execution and analysis
 * - Continuous UX monitoring dashboard
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// GUIDED WALKTHROUGH TYPES
// =============================================================================

export interface WalkthroughStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightPadding?: number;
  nextButtonText?: string;
  prevButtonText?: string;
  showProgress?: boolean;
  action?: WalkthroughAction;
  waitForClick?: boolean;
  waitForInput?: boolean;
  validationFn?: () => boolean;
}

export interface WalkthroughAction {
  type: 'click' | 'input' | 'navigate' | 'scroll' | 'custom';
  value?: string;
  handler?: () => void;
}

export interface Walkthrough {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WalkthroughStep[];
  triggerConditions?: WalkthroughTrigger[];
  completionReward?: string;
  estimatedTime: number; // minutes
}

export interface WalkthroughTrigger {
  type: 'page' | 'action' | 'time' | 'condition';
  value: string;
}

export interface WalkthroughProgress {
  walkthroughId: string;
  currentStep: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
  skippedSteps: string[];
}

// =============================================================================
// USABILITY TESTING TYPES
// =============================================================================

export interface UsabilityTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  scenarios: UsabilityScenario[];
  targetParticipants: number;
  actualParticipants: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UsabilityScenario {
  id: string;
  title: string;
  description: string;
  tasks: UsabilityTask[];
  successCriteria: string;
}

export interface UsabilityTask {
  id: string;
  instruction: string;
  expectedPath: string[];
  successMetric: string;
  timeLimit?: number; // seconds
}

export interface UsabilityResult {
  testId: string;
  participantId: string;
  scenarioId: string;
  taskId: string;
  completed: boolean;
  timeSpent: number;
  clickPath: string[];
  errors: string[];
  feedback?: string;
  rating?: number;
}

// =============================================================================
// A/B EXPERIMENT TYPES
// =============================================================================

export interface ABExperiment {
  id: string;
  name: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  metrics: ABMetric[];
  trafficAllocation: number; // percentage
  startDate?: Date;
  endDate?: Date;
  minimumSampleSize: number;
  statisticalSignificance: number;
  winner?: string;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  allocation: number; // percentage
  isControl: boolean;
  changes: VariantChange[];
}

export interface VariantChange {
  type: 'text' | 'color' | 'layout' | 'behavior';
  selector: string;
  originalValue: string;
  newValue: string;
}

export interface ABMetric {
  id: string;
  name: string;
  type: 'conversion' | 'engagement' | 'retention' | 'revenue';
  definition: string;
  isPrimary: boolean;
}

export interface ABResult {
  experimentId: string;
  variantId: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  uplift: number; // percentage vs control
  isSignificant: boolean;
}

// =============================================================================
// UX MONITORING TYPES
// =============================================================================

export interface UXMetricDefinition {
  id: string;
  name: string;
  description: string;
  calculation: string;
  threshold: { good: number; warning: number; bad: number };
  unit: string;
}

export interface UXMetricValue {
  metricId: string;
  value: number;
  timestamp: Date;
  segment?: string;
}

export interface NPSSurvey {
  id: string;
  userId: string;
  score: number; // 0-10
  feedback?: string;
  submittedAt: Date;
  touchpoint: string;
}

export interface SUSScore {
  userId: string;
  scores: number[]; // 10 questions, each 1-5
  totalScore: number; // 0-100
  submittedAt: Date;
}

// =============================================================================
// WALKTHROUGH CATALOG
// =============================================================================

export const WALKTHROUGH_CATALOG: Walkthrough[] = [
  {
    id: 'getting-started',
    name: 'Getting Started Tour',
    description: 'Learn the basics of Quiz2Biz in 5 minutes',
    category: 'onboarding',
    estimatedTime: 5,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Quiz2Biz!',
        content: "This quick tour will show you the main features. Let's get started!",
        targetSelector: 'body',
        position: 'center',
        nextButtonText: 'Start Tour',
      },
      {
        id: 'dashboard',
        title: 'Your Dashboard',
        content:
          'This is your main dashboard where you can see your readiness score and recent activity.',
        targetSelector: '[data-tour="dashboard"]',
        position: 'bottom',
        highlightPadding: 10,
      },
      {
        id: 'questionnaires',
        title: 'Questionnaires',
        content: 'Click here to access your business readiness questionnaires.',
        targetSelector: '[data-tour="questionnaires-nav"]',
        position: 'right',
        waitForClick: true,
      },
      {
        id: 'create-new',
        title: 'Create New Assessment',
        content: 'Start a new assessment by clicking this button.',
        targetSelector: '[data-tour="create-questionnaire"]',
        position: 'bottom',
      },
      {
        id: 'score-card',
        title: 'Readiness Score',
        content: 'Your overall readiness score appears here. Click to see detailed analysis.',
        targetSelector: '[data-tour="score-card"]',
        position: 'left',
      },
      {
        id: 'help',
        title: 'Need Help?',
        content: 'Access help articles, video tutorials, and contact support here.',
        targetSelector: '[data-tour="help-menu"]',
        position: 'left',
      },
      {
        id: 'complete',
        title: "You're Ready!",
        content: "You've completed the tour. Start by creating your first assessment!",
        targetSelector: 'body',
        position: 'center',
        nextButtonText: 'Finish',
      },
    ],
  },
  {
    id: 'questionnaire-flow',
    name: 'Completing a Questionnaire',
    description: 'Learn how to answer questions and track your progress',
    category: 'questionnaires',
    estimatedTime: 7,
    steps: [
      {
        id: 'intro',
        title: 'Questionnaire Overview',
        content:
          "Each questionnaire contains sections with multiple questions. Let's walk through the process.",
        targetSelector: 'body',
        position: 'center',
      },
      {
        id: 'progress',
        title: 'Track Your Progress',
        content: 'See how many sections and questions remain. Your answers are auto-saved.',
        targetSelector: '[data-tour="progress-bar"]',
        position: 'bottom',
      },
      {
        id: 'question-types',
        title: 'Question Types',
        content:
          'Questions come in different formats: multiple choice, text, file upload, and more.',
        targetSelector: '[data-tour="question-area"]',
        position: 'right',
      },
      {
        id: 'evidence',
        title: 'Upload Evidence',
        content: 'For some questions, you can upload supporting documents as evidence.',
        targetSelector: '[data-tour="evidence-upload"]',
        position: 'top',
      },
      {
        id: 'navigation',
        title: 'Navigate Questions',
        content: 'Use these buttons to move between questions, or click on the progress bar.',
        targetSelector: '[data-tour="question-nav"]',
        position: 'top',
      },
      {
        id: 'submit',
        title: 'Submit Your Answers',
        content: "When you're done, click Submit to finalize your assessment.",
        targetSelector: '[data-tour="submit-btn"]',
        position: 'top',
      },
    ],
  },
  {
    id: 'interpreting-scores',
    name: 'Understanding Your Scores',
    description: 'Learn how to read and act on your readiness scores',
    category: 'scoring',
    estimatedTime: 6,
    steps: [
      {
        id: 'overall-score',
        title: 'Overall Readiness Score',
        content: 'Your overall score shows how prepared your business is across all dimensions.',
        targetSelector: '[data-tour="overall-score"]',
        position: 'bottom',
      },
      {
        id: 'heatmap',
        title: 'The Heatmap',
        content:
          'Green means good coverage, yellow needs attention, red is critical. Click any cell for details.',
        targetSelector: '[data-tour="heatmap"]',
        position: 'right',
      },
      {
        id: 'dimensions',
        title: 'Business Dimensions',
        content:
          'Scores are broken down by 11 key business dimensions like Security, Finance, and Operations.',
        targetSelector: '[data-tour="dimension-list"]',
        position: 'right',
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        content:
          'Based on your scores, we provide specific recommendations to improve your readiness.',
        targetSelector: '[data-tour="recommendations"]',
        position: 'left',
      },
      {
        id: 'export',
        title: 'Export Reports',
        content: 'Download your scores as PDF or generate detailed business documents.',
        targetSelector: '[data-tour="export-btn"]',
        position: 'left',
      },
    ],
  },
];

// =============================================================================
// GUIDED WALKTHROUGH CONTEXT
// =============================================================================

interface WalkthroughState {
  activeWalkthrough: Walkthrough | null;
  currentStepIndex: number;
  progress: Map<string, WalkthroughProgress>;
  isVisible: boolean;
}

interface WalkthroughContextType extends WalkthroughState {
  startWalkthrough: (walkthroughId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  endWalkthrough: () => void;
  getProgress: (walkthroughId: string) => WalkthroughProgress | null;
  getCompletedWalkthroughs: () => string[];
  isWalkthroughCompleted: (walkthroughId: string) => boolean;
}

const WalkthroughContext = createContext<WalkthroughContextType | null>(null);

export const WalkthroughProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalkthroughState>({
    activeWalkthrough: null,
    currentStepIndex: 0,
    progress: new Map(),
    isVisible: false,
  });

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quiz2biz_walkthrough_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState((prev) => ({ ...prev, progress: new Map(Object.entries(parsed)) }));
      } catch (e) {
        console.error('Failed to load walkthrough progress:', e);
      }
    }
  }, []);

  const saveProgress = useCallback((progress: Map<string, WalkthroughProgress>) => {
    localStorage.setItem(
      'quiz2biz_walkthrough_progress',
      JSON.stringify(Object.fromEntries(progress)),
    );
  }, []);

  const startWalkthrough = useCallback(
    (walkthroughId: string) => {
      const walkthrough = WALKTHROUGH_CATALOG.find((w) => w.id === walkthroughId);
      if (walkthrough) {
        setState((prev) => {
          const newProgress = new Map(prev.progress);
          if (!newProgress.has(walkthroughId)) {
            newProgress.set(walkthroughId, {
              walkthroughId,
              currentStep: 0,
              completed: false,
              startedAt: new Date(),
              skippedSteps: [],
            });
          }
          saveProgress(newProgress);
          return {
            ...prev,
            activeWalkthrough: walkthrough,
            currentStepIndex: 0,
            progress: newProgress,
            isVisible: true,
          };
        });
      }
    },
    [saveProgress],
  );

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (!prev.activeWalkthrough) {
        return prev;
      }

      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.activeWalkthrough.steps.length) {
        // Walkthrough completed
        const newProgress = new Map(prev.progress);
        const progress = newProgress.get(prev.activeWalkthrough.id);
        if (progress) {
          progress.completed = true;
          progress.completedAt = new Date();
          newProgress.set(prev.activeWalkthrough.id, progress);
        }
        saveProgress(newProgress);
        return {
          ...prev,
          activeWalkthrough: null,
          currentStepIndex: 0,
          progress: newProgress,
          isVisible: false,
        };
      }

      return { ...prev, currentStepIndex: nextIndex };
    });
  }, [saveProgress]);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  const skipStep = useCallback(() => {
    setState((prev) => {
      if (!prev.activeWalkthrough) {
        return prev;
      }

      const currentStep = prev.activeWalkthrough.steps[prev.currentStepIndex];
      const newProgress = new Map(prev.progress);
      const progress = newProgress.get(prev.activeWalkthrough.id);
      if (progress && currentStep) {
        progress.skippedSteps.push(currentStep.id);
        newProgress.set(prev.activeWalkthrough.id, progress);
      }
      saveProgress(newProgress);

      return { ...prev, progress: newProgress };
    });
    nextStep();
  }, [nextStep, saveProgress]);

  const endWalkthrough = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeWalkthrough: null,
      currentStepIndex: 0,
      isVisible: false,
    }));
  }, []);

  const getProgress = useCallback(
    (walkthroughId: string): WalkthroughProgress | null => {
      return state.progress.get(walkthroughId) || null;
    },
    [state.progress],
  );

  const getCompletedWalkthroughs = useCallback((): string[] => {
    return Array.from(state.progress.entries())
      .filter(([_, p]) => p.completed)
      .map(([id]) => id);
  }, [state.progress]);

  const isWalkthroughCompleted = useCallback(
    (walkthroughId: string): boolean => {
      const progress = state.progress.get(walkthroughId);
      return progress?.completed ?? false;
    },
    [state.progress],
  );

  const contextValue = useMemo(
    () => ({
      ...state,
      startWalkthrough,
      nextStep,
      prevStep,
      skipStep,
      endWalkthrough,
      getProgress,
      getCompletedWalkthroughs,
      isWalkthroughCompleted,
    }),
    [
      state,
      startWalkthrough,
      nextStep,
      prevStep,
      skipStep,
      endWalkthrough,
      getProgress,
      getCompletedWalkthroughs,
      isWalkthroughCompleted,
    ],
  );

  return (
    <WalkthroughContext.Provider value={contextValue}>
      {children}
      {state.isVisible && state.activeWalkthrough && (
        <WalkthroughOverlay
          walkthrough={state.activeWalkthrough}
          currentStepIndex={state.currentStepIndex}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipStep}
          onEnd={endWalkthrough}
        />
      )}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within WalkthroughProvider');
  }
  return context;
};

// =============================================================================
// WALKTHROUGH OVERLAY COMPONENT
// =============================================================================

interface WalkthroughOverlayProps {
  walkthrough: Walkthrough;
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onEnd: () => void;
}

const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  walkthrough,
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  onEnd,
}) => {
  const currentStep = walkthrough.steps[currentStepIndex];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (currentStep.targetSelector === 'body') {
      setTargetRect(null);
      return;
    }

    const target = document.querySelector(currentStep.targetSelector);
    if (target) {
      setTargetRect(target.getBoundingClientRect());
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep]);

  const getTooltipPosition = () => {
    if (!targetRect || currentStep.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = currentStep.highlightPadding || 10;
    const positions: Record<string, React.CSSProperties> = {
      top: {
        bottom: `${window.innerHeight - targetRect.top + padding}px`,
        left: `${targetRect.left + targetRect.width / 2}px`,
        transform: 'translateX(-50%)',
      },
      bottom: {
        top: `${targetRect.bottom + padding}px`,
        left: `${targetRect.left + targetRect.width / 2}px`,
        transform: 'translateX(-50%)',
      },
      left: {
        top: `${targetRect.top + targetRect.height / 2}px`,
        right: `${window.innerWidth - targetRect.left + padding}px`,
        transform: 'translateY(-50%)',
      },
      right: {
        top: `${targetRect.top + targetRect.height / 2}px`,
        left: `${targetRect.right + padding}px`,
        transform: 'translateY(-50%)',
      },
    };

    return positions[currentStep.position] || positions.bottom;
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with cutout */}
      <div className="absolute inset-0 bg-black/50" onClick={onEnd} />

      {/* Highlight area */}
      {targetRect && (
        <div
          className="absolute bg-transparent border-2 border-blue-500 rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - (currentStep.highlightPadding || 10),
            left: targetRect.left - (currentStep.highlightPadding || 10),
            width: targetRect.width + (currentStep.highlightPadding || 10) * 2,
            height: targetRect.height + (currentStep.highlightPadding || 10) * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-lg shadow-xl p-6 max-w-md z-10"
        style={getTooltipPosition()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">{currentStep.title}</h3>
          <button
            onClick={onEnd}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close tour"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-600 mb-6">{currentStep.content}</p>

        {/* Progress indicator */}
        <div className="flex items-center gap-1 mb-4">
          {walkthrough.steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded ${
                index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="text-xs text-gray-500 mb-4">
          Step {currentStepIndex + 1} of {walkthrough.steps.length}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <div>
            {currentStepIndex > 0 && (
              <button onClick={onPrev} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                {currentStep.prevButtonText || '← Back'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onSkip} className="px-4 py-2 text-gray-500 hover:text-gray-700">
              Skip
            </button>
            <button
              onClick={onNext}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {currentStep.nextButtonText || 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// UX MONITORING DASHBOARD
// =============================================================================

interface UXMonitoringState {
  npsScores: NPSSurvey[];
  susScores: SUSScore[];
  activeExperiments: ABExperiment[];
  usabilityTests: UsabilityTest[];
  metrics: UXMetricValue[];
}

export const UXMonitoringDashboard: React.FC = () => {
  const [state, setState] = useState<UXMonitoringState>({
    npsScores: [],
    susScores: [],
    activeExperiments: [],
    usabilityTests: [],
    metrics: [],
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'nps' | 'experiments' | 'usability'>(
    'overview',
  );

  // Calculate NPS
  const calculateNPS = useMemo(() => {
    if (state.npsScores.length === 0) {
      return { score: 0, promoters: 0, passives: 0, detractors: 0 };
    }

    const promoters = state.npsScores.filter((s) => s.score >= 9).length;
    const passives = state.npsScores.filter((s) => s.score >= 7 && s.score <= 8).length;
    const detractors = state.npsScores.filter((s) => s.score <= 6).length;
    const total = state.npsScores.length;

    return {
      score: Math.round(((promoters - detractors) / total) * 100),
      promoters: Math.round((promoters / total) * 100),
      passives: Math.round((passives / total) * 100),
      detractors: Math.round((detractors / total) * 100),
    };
  }, [state.npsScores]);

  // Calculate average SUS
  const averageSUS = useMemo(() => {
    if (state.susScores.length === 0) {
      return 0;
    }
    return Math.round(
      state.susScores.reduce((sum, s) => sum + s.totalScore, 0) / state.susScores.length,
    );
  }, [state.susScores]);

  // Mock data for demo
  useEffect(() => {
    setState({
      npsScores: Array.from({ length: 100 }, (_, i) => ({
        id: `nps-${i}`,
        userId: `user-${i}`,
        score: Math.floor(Math.random() * 11),
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        touchpoint: 'dashboard',
      })),
      susScores: Array.from({ length: 50 }, (_, i) => ({
        userId: `user-${i}`,
        scores: Array.from({ length: 10 }, () => Math.floor(Math.random() * 5) + 1),
        totalScore: Math.floor(Math.random() * 40) + 60,
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      })),
      activeExperiments: [
        {
          id: 'exp-1',
          name: 'CTA Button Color',
          hypothesis: 'Green CTA buttons will increase conversion by 10%',
          status: 'running',
          variants: [
            {
              id: 'control',
              name: 'Blue (Control)',
              description: 'Current blue button',
              allocation: 50,
              isControl: true,
              changes: [],
            },
            {
              id: 'variant-a',
              name: 'Green',
              description: 'Green button variant',
              allocation: 50,
              isControl: false,
              changes: [],
            },
          ],
          metrics: [
            {
              id: 'm1',
              name: 'Conversion Rate',
              type: 'conversion',
              definition: 'Questionnaire starts / page views',
              isPrimary: true,
            },
          ],
          trafficAllocation: 100,
          startDate: new Date('2026-01-20'),
          minimumSampleSize: 1000,
          statisticalSignificance: 95,
        },
        {
          id: 'exp-2',
          name: 'Onboarding Flow',
          hypothesis: 'Shorter onboarding will improve completion rate',
          status: 'running',
          variants: [
            {
              id: 'control',
              name: '7 Steps (Control)',
              description: 'Current 7-step flow',
              allocation: 50,
              isControl: true,
              changes: [],
            },
            {
              id: 'variant-a',
              name: '4 Steps',
              description: 'Condensed 4-step flow',
              allocation: 50,
              isControl: false,
              changes: [],
            },
          ],
          metrics: [
            {
              id: 'm1',
              name: 'Completion Rate',
              type: 'conversion',
              definition: 'Onboarding completed / started',
              isPrimary: true,
            },
          ],
          trafficAllocation: 50,
          startDate: new Date('2026-01-22'),
          minimumSampleSize: 500,
          statisticalSignificance: 95,
        },
      ],
      usabilityTests: [
        {
          id: 'ut-1',
          name: 'Questionnaire Completion',
          description: 'Test user ability to complete a full questionnaire',
          status: 'active',
          scenarios: [],
          targetParticipants: 20,
          actualParticipants: 15,
          createdAt: new Date('2026-01-15'),
          startedAt: new Date('2026-01-18'),
        },
      ],
      metrics: [],
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">UX Monitoring Dashboard</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {(['overview', 'nps', 'experiments', 'usability'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'nps' ? 'NPS & SUS' : tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">NPS Score</div>
            <div
              className={`text-3xl font-bold ${
                calculateNPS.score >= 50
                  ? 'text-green-600'
                  : calculateNPS.score >= 0
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {calculateNPS.score}
            </div>
            <div className="text-xs text-gray-400 mt-1">Target: 50+</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">SUS Score</div>
            <div
              className={`text-3xl font-bold ${
                averageSUS >= 80
                  ? 'text-green-600'
                  : averageSUS >= 68
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {averageSUS}
            </div>
            <div className="text-xs text-gray-400 mt-1">Target: 85+</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">Active Experiments</div>
            <div className="text-3xl font-bold text-blue-600">
              {state.activeExperiments.filter((e) => e.status === 'running').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">Usability Tests</div>
            <div className="text-3xl font-bold text-purple-600">
              {state.usabilityTests.filter((t) => t.status === 'active').length}
            </div>
          </div>
        </div>
      )}

      {/* NPS & SUS Tab */}
      {activeTab === 'nps' && (
        <div className="space-y-6">
          {/* NPS Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Net Promoter Score</h2>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold">{calculateNPS.score}</div>
                <div className="text-sm text-gray-500">NPS Score</div>
              </div>
              <div className="flex-1">
                <div className="flex h-8 rounded overflow-hidden">
                  <div
                    className="bg-green-500"
                    style={{ width: `${calculateNPS.promoters}%` }}
                    title={`Promoters: ${calculateNPS.promoters}%`}
                  />
                  <div
                    className="bg-yellow-500"
                    style={{ width: `${calculateNPS.passives}%` }}
                    title={`Passives: ${calculateNPS.passives}%`}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${calculateNPS.detractors}%` }}
                    title={`Detractors: ${calculateNPS.detractors}%`}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-green-600">Promoters: {calculateNPS.promoters}%</span>
                  <span className="text-yellow-600">Passives: {calculateNPS.passives}%</span>
                  <span className="text-red-600">Detractors: {calculateNPS.detractors}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* SUS Score */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">System Usability Scale (SUS)</h2>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold">{averageSUS}</div>
                <div className="text-sm text-gray-500">Average Score</div>
              </div>
              <div className="flex-1">
                <div className="relative h-4 bg-gray-200 rounded">
                  <div
                    className={`absolute h-full rounded ${
                      averageSUS >= 80
                        ? 'bg-green-500'
                        : averageSUS >= 68
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${averageSUS}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1 text-gray-500">
                  <span>0</span>
                  <span className="text-red-500">51 Poor</span>
                  <span className="text-yellow-500">68 OK</span>
                  <span className="text-green-500">80 Good</span>
                  <span>100</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Based on {state.susScores.length} responses in the last 30 days
            </div>
          </div>
        </div>
      )}

      {/* Experiments Tab */}
      {activeTab === 'experiments' && (
        <div className="space-y-4">
          {state.activeExperiments.map((exp) => (
            <div key={exp.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold">{exp.name}</h3>
                  <p className="text-sm text-gray-600">{exp.hypothesis}</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm rounded ${
                    exp.status === 'running'
                      ? 'bg-green-100 text-green-800'
                      : exp.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {exp.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {exp.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`p-4 rounded border ${variant.isControl ? 'border-gray-300' : 'border-blue-300'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-sm text-gray-500">{variant.allocation}%</span>
                    </div>
                    <div className="text-sm text-gray-600">{variant.description}</div>
                    {/* Mock results */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-2xl font-bold">
                        {(Math.random() * 5 + (variant.isControl ? 10 : 12)).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Conversion Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usability Tab */}
      {activeTab === 'usability' && (
        <div className="space-y-4">
          {state.usabilityTests.map((test) => (
            <div key={test.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold">{test.name}</h3>
                  <p className="text-sm text-gray-600">{test.description}</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm rounded ${
                    test.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : test.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {test.status}
                </span>
              </div>

              <div className="flex items-center gap-8">
                <div>
                  <div className="text-2xl font-bold">
                    {test.actualParticipants}/{test.targetParticipants}
                  </div>
                  <div className="text-sm text-gray-500">Participants</div>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded">
                    <div
                      className="h-full bg-blue-500 rounded"
                      style={{
                        width: `${(test.actualParticipants / test.targetParticipants) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  WalkthroughProvider,
  useWalkthrough,
  UXMonitoringDashboard,
  WALKTHROUGH_CATALOG,
};
