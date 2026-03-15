/**
 * User Preferences Learning System
 *
 * Sprint 37: Adaptive UI & Personalization
 * Task ux37t1: Track UI interaction patterns (sidebar usage, shortcut usage, question skip patterns)
 *
 * Features:
 * - Interaction pattern tracking (clicks, navigation, shortcuts)
 * - Learning algorithm for user preferences
 * - Preference storage and retrieval
 * - Usage analytics and insights
 * - Privacy-compliant data collection
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

const SECURE_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
let fallbackIdCounter = 0;

function generateSecureIdSegment(length: number): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);

    let result = '';
    for (const byte of bytes) {
      result += SECURE_ID_ALPHABET[byte % SECURE_ID_ALPHABET.length];
    }
    return result;
  }

  fallbackIdCounter += 1;
  const fallback = `${Date.now().toString(36)}${fallbackIdCounter.toString(36)}`;
  return fallback.padEnd(length, '0').slice(0, length);
}

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface InteractionEvent {
  id: string;
  type: InteractionType;
  target: string;
  timestamp: Date;
  context: InteractionContext;
  metadata?: Record<string, unknown>;
}

export type InteractionType =
  | 'click'
  | 'navigation'
  | 'shortcut'
  | 'scroll'
  | 'hover'
  | 'focus'
  | 'form_interaction'
  | 'feature_usage'
  | 'search'
  | 'question_skip'
  | 'question_answer';

export interface InteractionContext {
  page: string;
  section?: string;
  component?: string;
  sessionId: string;
  timeOnPage: number;
}

export interface UsagePattern {
  id: string;
  pattern: string;
  frequency: number;
  lastUsed: Date;
  firstUsed: Date;
  avgDuration?: number;
  confidence: number;
}

export interface FeatureUsage {
  featureId: string;
  usageCount: number;
  lastUsed: Date;
  avgSessionUsage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface NavigationPattern {
  from: string;
  to: string;
  count: number;
  avgTimeOnSource: number;
  conversions: number;
}

export interface ShortcutUsage {
  shortcut: string;
  usageCount: number;
  lastUsed: Date;
  successRate: number;
}

export interface QuestionBehavior {
  questionId: string;
  timesViewed: number;
  timesAnswered: number;
  timesSkipped: number;
  avgTimeToAnswer: number;
  editCount: number;
}

export interface UserPreferences {
  // UI Preferences
  sidebarCollapsed: boolean;
  sidebarPinned: boolean;
  preferredView: 'grid' | 'list' | 'compact';
  dashboardLayout: DashboardWidgetConfig[];
  colorTheme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  animationsEnabled: boolean;

  // Behavior Preferences
  autoSaveEnabled: boolean;
  autoAdvanceQuestions: boolean;
  showTooltips: boolean;
  showHelpHints: boolean;
  notificationPreferences: NotificationPreference[];

  // Learned Preferences
  preferredShortcuts: string[];
  frequentPages: string[];
  preferredFeatures: string[];
  workingHours: TimeRange[];

  // Session Preferences
  sessionDuration: number;
  breakReminders: boolean;
  focusMode: boolean;
}

export interface DashboardWidgetConfig {
  widgetId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  visible: boolean;
  collapsed: boolean;
}

export interface NotificationPreference {
  type: string;
  enabled: boolean;
  channels: ('email' | 'push' | 'inApp')[];
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string;
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface LearnedInsight {
  id: string;
  type: InsightType;
  description: string;
  confidence: number;
  actionable: boolean;
  suggestedAction?: string;
  createdAt: Date;
}

export type InsightType =
  | 'navigation_shortcut'
  | 'feature_discovery'
  | 'workflow_optimization'
  | 'time_optimization'
  | 'accessibility_suggestion'
  | 'personalization';

export interface UserPreferencesState {
  preferences: UserPreferences;
  interactions: InteractionEvent[];
  usagePatterns: UsagePattern[];
  featureUsage: FeatureUsage[];
  navigationPatterns: NavigationPattern[];
  shortcutUsage: ShortcutUsage[];
  questionBehavior: Map<string, QuestionBehavior>;
  insights: LearnedInsight[];
  isLearning: boolean;
  lastSync: Date | null;
  sessionStartTime: Date;
}

type UserPreferencesAction =
  | { type: 'TRACK_INTERACTION'; event: InteractionEvent }
  | { type: 'UPDATE_PREFERENCE'; key: keyof UserPreferences; value: unknown }
  | { type: 'UPDATE_PREFERENCES'; preferences: Partial<UserPreferences> }
  | { type: 'ADD_USAGE_PATTERN'; pattern: UsagePattern }
  | { type: 'UPDATE_FEATURE_USAGE'; feature: FeatureUsage }
  | { type: 'ADD_NAVIGATION_PATTERN'; pattern: NavigationPattern }
  | { type: 'UPDATE_SHORTCUT_USAGE'; usage: ShortcutUsage }
  | { type: 'UPDATE_QUESTION_BEHAVIOR'; behavior: QuestionBehavior }
  | { type: 'ADD_INSIGHT'; insight: LearnedInsight }
  | { type: 'DISMISS_INSIGHT'; insightId: string }
  | { type: 'SET_LEARNING'; isLearning: boolean }
  | { type: 'SYNC_COMPLETE'; timestamp: Date }
  | { type: 'LOAD_STATE'; state: Partial<UserPreferencesState> }
  | { type: 'RESET' };

export interface UserPreferencesContextType extends UserPreferencesState {
  // Interaction tracking
  trackInteraction: (event: Omit<InteractionEvent, 'id' | 'timestamp' | 'context'>) => void;
  trackClick: (target: string, metadata?: Record<string, unknown>) => void;
  trackNavigation: (from: string, to: string) => void;
  trackShortcut: (shortcut: string, success: boolean) => void;
  trackFeatureUsage: (featureId: string) => void;
  trackQuestionBehavior: (
    questionId: string,
    action: 'view' | 'answer' | 'skip' | 'edit',
    duration?: number,
  ) => void;

  // Preference management
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  resetPreferences: () => void;

  // Insights
  getInsights: () => LearnedInsight[];
  dismissInsight: (insightId: string) => void;

  // Analytics
  getTopFeatures: (limit?: number) => FeatureUsage[];
  getFrequentPaths: (limit?: number) => NavigationPattern[];
  getPreferredShortcuts: () => ShortcutUsage[];
  getQuestionDifficulties: () => { easy: string[]; medium: string[]; hard: string[] };

  // Learning
  startLearning: () => void;
  stopLearning: () => void;
  analyzePatterns: () => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultPreferences: UserPreferences = {
  sidebarCollapsed: false,
  sidebarPinned: true,
  preferredView: 'list',
  dashboardLayout: [],
  colorTheme: 'system',
  fontSize: 'medium',
  animationsEnabled: true,
  autoSaveEnabled: true,
  autoAdvanceQuestions: false,
  showTooltips: true,
  showHelpHints: true,
  notificationPreferences: [],
  preferredShortcuts: [],
  frequentPages: [],
  preferredFeatures: [],
  workingHours: [],
  sessionDuration: 0,
  breakReminders: true,
  focusMode: false,
};

const initialState: UserPreferencesState = {
  preferences: defaultPreferences,
  interactions: [],
  usagePatterns: [],
  featureUsage: [],
  navigationPatterns: [],
  shortcutUsage: [],
  questionBehavior: new Map(),
  insights: [],
  isLearning: true,
  lastSync: null,
  sessionStartTime: new Date(),
};

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  PREFERENCES: 'quiz2biz_user_preferences',
  INTERACTIONS: 'quiz2biz_interactions',
  PATTERNS: 'quiz2biz_patterns',
  INSIGHTS: 'quiz2biz_insights',
} as const;

// =============================================================================
// REDUCER
// =============================================================================

function userPreferencesReducer(
  state: UserPreferencesState,
  action: UserPreferencesAction,
): UserPreferencesState {
  switch (action.type) {
    case 'TRACK_INTERACTION': {
      const interactions = [...state.interactions, action.event].slice(-1000);
      return { ...state, interactions };
    }

    case 'UPDATE_PREFERENCE':
      return {
        ...state,
        preferences: { ...state.preferences, [action.key]: action.value },
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.preferences },
      };

    case 'ADD_USAGE_PATTERN': {
      const patterns = state.usagePatterns.filter((p) => p.id !== action.pattern.id);
      return { ...state, usagePatterns: [...patterns, action.pattern] };
    }

    case 'UPDATE_FEATURE_USAGE': {
      const features = state.featureUsage.filter((f) => f.featureId !== action.feature.featureId);
      return { ...state, featureUsage: [...features, action.feature] };
    }

    case 'ADD_NAVIGATION_PATTERN': {
      const existing = state.navigationPatterns.find(
        (p) => p.from === action.pattern.from && p.to === action.pattern.to,
      );
      if (existing) {
        const updated = state.navigationPatterns.map((p) =>
          p.from === action.pattern.from && p.to === action.pattern.to
            ? { ...p, count: p.count + 1 }
            : p,
        );
        return { ...state, navigationPatterns: updated };
      }
      return { ...state, navigationPatterns: [...state.navigationPatterns, action.pattern] };
    }

    case 'UPDATE_SHORTCUT_USAGE': {
      const shortcuts = state.shortcutUsage.filter((s) => s.shortcut !== action.usage.shortcut);
      return { ...state, shortcutUsage: [...shortcuts, action.usage] };
    }

    case 'UPDATE_QUESTION_BEHAVIOR': {
      const newBehavior = new Map(state.questionBehavior);
      newBehavior.set(action.behavior.questionId, action.behavior);
      return { ...state, questionBehavior: newBehavior };
    }

    case 'ADD_INSIGHT':
      return { ...state, insights: [...state.insights, action.insight] };

    case 'DISMISS_INSIGHT':
      return {
        ...state,
        insights: state.insights.filter((i) => i.id !== action.insightId),
      };

    case 'SET_LEARNING':
      return { ...state, isLearning: action.isLearning };

    case 'SYNC_COMPLETE':
      return { ...state, lastSync: action.timestamp };

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    case 'RESET':
      return { ...initialState, sessionStartTime: new Date() };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface UserPreferencesProviderProps {
  children: ReactNode;
  userId?: string;
  enablePersistence?: boolean;
  enableLearning?: boolean;
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({
  children,
  userId: _userId,
  enablePersistence = true,
  enableLearning = true,
}) => {
  const [state, dispatch] = useReducer(userPreferencesReducer, initialState);
  const sessionIdRef = useRef<string>(generateSessionId());
  const currentPageRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const pageStartTimeRef = useRef<Date>(new Date());

  // Load saved state on mount
  useEffect(() => {
    if (!enablePersistence) {
      return;
    }

    try {
      const savedPreferences = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      const savedPatterns = localStorage.getItem(STORAGE_KEYS.PATTERNS);
      const savedInsights = localStorage.getItem(STORAGE_KEYS.INSIGHTS);

      const loadedState: Partial<UserPreferencesState> = {};

      if (savedPreferences) {
        loadedState.preferences = { ...defaultPreferences, ...JSON.parse(savedPreferences) };
      }

      if (savedPatterns) {
        const patterns = JSON.parse(savedPatterns);
        loadedState.usagePatterns = patterns.usagePatterns || [];
        loadedState.featureUsage = patterns.featureUsage || [];
        loadedState.navigationPatterns = patterns.navigationPatterns || [];
        loadedState.shortcutUsage = patterns.shortcutUsage || [];
      }

      if (savedInsights) {
        loadedState.insights = JSON.parse(savedInsights);
      }

      dispatch({ type: 'LOAD_STATE', state: loadedState });
    } catch (error) {
      console.error('[UserPreferences] Failed to load saved state:', error);
    }
  }, [enablePersistence]);

  // Persist state changes
  useEffect(() => {
    if (!enablePersistence) {
      return;
    }

    const saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(state.preferences));
        localStorage.setItem(
          STORAGE_KEYS.PATTERNS,
          JSON.stringify({
            usagePatterns: state.usagePatterns,
            featureUsage: state.featureUsage,
            navigationPatterns: state.navigationPatterns,
            shortcutUsage: state.shortcutUsage,
          }),
        );
        localStorage.setItem(STORAGE_KEYS.INSIGHTS, JSON.stringify(state.insights));
        dispatch({ type: 'SYNC_COMPLETE', timestamp: new Date() });
      } catch (error) {
        console.error('[UserPreferences] Failed to save state:', error);
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [
    state.preferences,
    state.usagePatterns,
    state.featureUsage,
    state.navigationPatterns,
    state.shortcutUsage,
    state.insights,
    enablePersistence,
  ]);

  // Track page navigation
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePopState = () => {
      const newPage = window.location.pathname;
      if (newPage !== currentPageRef.current) {
        trackNavigation(currentPageRef.current, newPage);
        currentPageRef.current = newPage;
        pageStartTimeRef.current = new Date();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Analyze patterns periodically
  useEffect(() => {
    if (!enableLearning) {
      return;
    }

    const analysisInterval = setInterval(() => {
      analyzePatterns();
    }, 60000); // Every minute

    return () => clearInterval(analysisInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableLearning, state.interactions]);

  // Helper functions
  function generateSessionId(): string {
    return `session_${Date.now()}_${generateSecureIdSegment(9)}`;
  }

  function generateId(): string {
    return `${Date.now()}_${generateSecureIdSegment(9)}`;
  }

  function getInteractionContext(): InteractionContext {
    return {
      page: currentPageRef.current,
      sessionId: sessionIdRef.current,
      timeOnPage: Date.now() - pageStartTimeRef.current.getTime(),
    };
  }

  // Track interaction
  const trackInteraction = useCallback(
    (event: Omit<InteractionEvent, 'id' | 'timestamp' | 'context'>) => {
      if (!state.isLearning) {
        return;
      }

      const fullEvent: InteractionEvent = {
        ...event,
        id: generateId(),
        timestamp: new Date(),
        context: getInteractionContext(),
      };

      dispatch({ type: 'TRACK_INTERACTION', event: fullEvent });
    },
    [state.isLearning],
  );

  // Track click
  const trackClick = useCallback(
    (target: string, metadata?: Record<string, unknown>) => {
      trackInteraction({
        type: 'click',
        target,
        metadata,
      });
    },
    [trackInteraction],
  );

  // Track navigation
  const trackNavigation = useCallback(
    (from: string, to: string) => {
      trackInteraction({
        type: 'navigation',
        target: to,
        metadata: { from },
      });

      dispatch({
        type: 'ADD_NAVIGATION_PATTERN',
        pattern: {
          from,
          to,
          count: 1,
          avgTimeOnSource: Date.now() - pageStartTimeRef.current.getTime(),
          conversions: 0,
        },
      });
    },
    [trackInteraction],
  );

  // Track shortcut usage
  const trackShortcut = useCallback(
    (shortcut: string, success: boolean) => {
      trackInteraction({
        type: 'shortcut',
        target: shortcut,
        metadata: { success },
      });

      const existing = state.shortcutUsage.find((s) => s.shortcut === shortcut);
      const successCount = existing ? existing.successRate * existing.usageCount : 0;

      dispatch({
        type: 'UPDATE_SHORTCUT_USAGE',
        usage: {
          shortcut,
          usageCount: (existing?.usageCount || 0) + 1,
          lastUsed: new Date(),
          successRate: (successCount + (success ? 1 : 0)) / ((existing?.usageCount || 0) + 1),
        },
      });
    },
    [trackInteraction, state.shortcutUsage],
  );

  // Track feature usage
  const trackFeatureUsage = useCallback(
    (featureId: string) => {
      trackInteraction({
        type: 'feature_usage',
        target: featureId,
      });

      const existing = state.featureUsage.find((f) => f.featureId === featureId);
      const newCount = (existing?.usageCount || 0) + 1;

      dispatch({
        type: 'UPDATE_FEATURE_USAGE',
        feature: {
          featureId,
          usageCount: newCount,
          lastUsed: new Date(),
          avgSessionUsage: newCount, // Simplified calculation
          trend: newCount > (existing?.usageCount || 0) ? 'increasing' : 'stable',
        },
      });
    },
    [trackInteraction, state.featureUsage],
  );

  // Track question behavior
  const trackQuestionBehavior = useCallback(
    (questionId: string, action: 'view' | 'answer' | 'skip' | 'edit', duration?: number) => {
      trackInteraction({
        type: action === 'skip' ? 'question_skip' : 'question_answer',
        target: questionId,
        metadata: { action, duration },
      });

      const existing = state.questionBehavior.get(questionId) || {
        questionId,
        timesViewed: 0,
        timesAnswered: 0,
        timesSkipped: 0,
        avgTimeToAnswer: 0,
        editCount: 0,
      };

      const updated: QuestionBehavior = { ...existing };

      switch (action) {
        case 'view':
          updated.timesViewed++;
          break;
        case 'answer':
          updated.timesAnswered++;
          if (duration) {
            updated.avgTimeToAnswer =
              (updated.avgTimeToAnswer * (updated.timesAnswered - 1) + duration) /
              updated.timesAnswered;
          }
          break;
        case 'skip':
          updated.timesSkipped++;
          break;
        case 'edit':
          updated.editCount++;
          break;
      }

      dispatch({ type: 'UPDATE_QUESTION_BEHAVIOR', behavior: updated });
    },
    [trackInteraction, state.questionBehavior],
  );

  // Update preference
  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      dispatch({ type: 'UPDATE_PREFERENCE', key, value });
    },
    [],
  );

  // Update multiple preferences
  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', preferences });
  }, []);

  // Reset preferences
  const resetPreferences = useCallback(() => {
    dispatch({ type: 'RESET' });
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  }, []);

  // Get insights
  const getInsights = useCallback((): LearnedInsight[] => {
    return state.insights.filter((i) => !i.actionable || i.confidence > 0.7);
  }, [state.insights]);

  // Dismiss insight
  const dismissInsight = useCallback((insightId: string) => {
    dispatch({ type: 'DISMISS_INSIGHT', insightId });
  }, []);

  // Get top features
  const getTopFeatures = useCallback(
    (limit: number = 5): FeatureUsage[] => {
      return [...state.featureUsage].sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
    },
    [state.featureUsage],
  );

  // Get frequent paths
  const getFrequentPaths = useCallback(
    (limit: number = 5): NavigationPattern[] => {
      return [...state.navigationPatterns].sort((a, b) => b.count - a.count).slice(0, limit);
    },
    [state.navigationPatterns],
  );

  // Get preferred shortcuts
  const getPreferredShortcuts = useCallback((): ShortcutUsage[] => {
    return [...state.shortcutUsage]
      .filter((s) => s.usageCount >= 3 && s.successRate > 0.8)
      .sort((a, b) => b.usageCount - a.usageCount);
  }, [state.shortcutUsage]);

  // Get question difficulties
  const getQuestionDifficulties = useCallback(() => {
    const easy: string[] = [];
    const medium: string[] = [];
    const hard: string[] = [];

    state.questionBehavior.forEach((behavior, questionId) => {
      const skipRate = behavior.timesSkipped / (behavior.timesViewed || 1);
      const avgTime = behavior.avgTimeToAnswer;

      if (skipRate < 0.1 && avgTime < 30000) {
        easy.push(questionId);
      } else if (skipRate > 0.3 || avgTime > 120000) {
        hard.push(questionId);
      } else {
        medium.push(questionId);
      }
    });

    return { easy, medium, hard };
  }, [state.questionBehavior]);

  // Start learning
  const startLearning = useCallback(() => {
    dispatch({ type: 'SET_LEARNING', isLearning: true });
  }, []);

  // Stop learning
  const stopLearning = useCallback(() => {
    dispatch({ type: 'SET_LEARNING', isLearning: false });
  }, []);

  // Analyze patterns
  const analyzePatterns = useCallback(() => {
    if (!enableLearning || state.interactions.length < 10) {
      return;
    }

    // Analyze navigation patterns for shortcuts
    const frequentPaths = getFrequentPaths(3);
    frequentPaths.forEach((path) => {
      if (path.count >= 5) {
        const existingInsight = state.insights.find(
          (i) => i.type === 'navigation_shortcut' && i.description.includes(path.to),
        );

        if (!existingInsight) {
          dispatch({
            type: 'ADD_INSIGHT',
            insight: {
              id: generateId(),
              type: 'navigation_shortcut',
              description: `You frequently navigate to ${path.to}. Would you like to add it to quick access?`,
              confidence: Math.min(path.count / 10, 1),
              actionable: true,
              suggestedAction: `Add ${path.to} to sidebar favorites`,
              createdAt: new Date(),
            },
          });
        }
      }
    });

    // Analyze feature usage for personalization
    getTopFeatures(3);
    const underusedFeatures = state.featureUsage.filter((f) => f.usageCount === 1);

    underusedFeatures.forEach((feature) => {
      if (feature.lastUsed.getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) {
        dispatch({
          type: 'ADD_INSIGHT',
          insight: {
            id: generateId(),
            type: 'feature_discovery',
            description: `You haven't used ${feature.featureId} recently. Would you like a quick tour?`,
            confidence: 0.6,
            actionable: true,
            suggestedAction: `Show ${feature.featureId} tutorial`,
            createdAt: new Date(),
          },
        });
      }
    });

    // Analyze question behavior for time optimization
    const { hard } = getQuestionDifficulties();
    if (hard.length > 3) {
      dispatch({
        type: 'ADD_INSIGHT',
        insight: {
          id: generateId(),
          type: 'workflow_optimization',
          description: `Some questions seem to take longer. Would you like help with ${hard.slice(0, 3).join(', ')}?`,
          confidence: 0.8,
          actionable: true,
          suggestedAction: 'Show help for difficult questions',
          createdAt: new Date(),
        },
      });
    }
  }, [
    enableLearning,
    state.interactions,
    state.insights,
    state.featureUsage,
    getFrequentPaths,
    getTopFeatures,
    getQuestionDifficulties,
  ]);

  const contextValue: UserPreferencesContextType = {
    ...state,
    trackInteraction,
    trackClick,
    trackNavigation,
    trackShortcut,
    trackFeatureUsage,
    trackQuestionBehavior,
    updatePreference,
    updatePreferences,
    resetPreferences,
    getInsights,
    dismissInsight,
    getTopFeatures,
    getFrequentPaths,
    getPreferredShortcuts,
    getQuestionDifficulties,
    startLearning,
    stopLearning,
    analyzePatterns,
  };

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useUserPreferences = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

const styles = {
  panel: 'bg-surface-50 rounded-xl shadow-card p-6',
  title: 'text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2',
  section: 'mb-6',
  sectionTitle: 'text-sm font-semibold text-surface-500 mb-3 uppercase tracking-wide',
  toggle: 'flex justify-between items-center py-3 border-b border-surface-200',
  toggleLabel: 'text-sm text-surface-700',
  toggleSwitch: 'w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 relative',
  toggleKnob:
    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-[left] duration-200 shadow-sm',
  select:
    'px-3 py-2 rounded-lg border border-surface-300 text-sm bg-surface-50 cursor-pointer min-w-[120px]',
  insight: 'p-4 bg-brand-50 rounded-lg mb-3 flex justify-between items-start gap-3',
  insightIcon: 'text-xl shrink-0',
  insightContent: 'flex-1',
  insightText: 'text-sm text-brand-800 m-0 mb-2',
  insightAction:
    'px-3 py-1.5 bg-brand-500 text-white border-none rounded-md text-xs font-medium cursor-pointer mr-2',
  dismissButton:
    'px-3 py-1.5 bg-transparent text-surface-500 border border-surface-300 rounded-md text-xs cursor-pointer',
  stat: 'flex justify-between items-center py-2',
  statLabel: 'text-sm text-surface-500',
  statValue: 'text-sm font-semibold text-surface-900',
};

// Toggle Switch Component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <div className={styles.toggle}>
    <span className={styles.toggleLabel}>{label}</span>
    <div
      className={`${styles.toggleSwitch} ${checked ? 'bg-brand-500' : 'bg-surface-300'}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onChange(!checked)}
    >
      <div className={styles.toggleKnob} style={{ left: checked ? '22px' : '2px' }} />
    </div>
  </div>
);

// Preferences Panel Component
export const PreferencesPanel: React.FC = () => {
  const { preferences, updatePreference } = useUserPreferences();

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        <span>⚙️</span>
        Preferences
      </h2>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Display</h3>

        <div className={styles.toggle}>
          <span className={styles.toggleLabel}>Theme</span>
          <select
            className={styles.select}
            value={preferences.colorTheme}
            onChange={(e) =>
              updatePreference('colorTheme', e.target.value as 'light' | 'dark' | 'system')
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className={styles.toggle}>
          <span className={styles.toggleLabel}>Font Size</span>
          <select
            className={styles.select}
            value={preferences.fontSize}
            onChange={(e) =>
              updatePreference('fontSize', e.target.value as 'small' | 'medium' | 'large')
            }
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className={styles.toggle}>
          <span className={styles.toggleLabel}>View Mode</span>
          <select
            className={styles.select}
            value={preferences.preferredView}
            onChange={(e) =>
              updatePreference('preferredView', e.target.value as 'grid' | 'list' | 'compact')
            }
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
            <option value="compact">Compact</option>
          </select>
        </div>

        <ToggleSwitch
          label="Enable Animations"
          checked={preferences.animationsEnabled}
          onChange={(v) => updatePreference('animationsEnabled', v)}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Behavior</h3>

        <ToggleSwitch
          label="Auto-save Responses"
          checked={preferences.autoSaveEnabled}
          onChange={(v) => updatePreference('autoSaveEnabled', v)}
        />

        <ToggleSwitch
          label="Auto-advance Questions"
          checked={preferences.autoAdvanceQuestions}
          onChange={(v) => updatePreference('autoAdvanceQuestions', v)}
        />

        <ToggleSwitch
          label="Show Tooltips"
          checked={preferences.showTooltips}
          onChange={(v) => updatePreference('showTooltips', v)}
        />

        <ToggleSwitch
          label="Show Help Hints"
          checked={preferences.showHelpHints}
          onChange={(v) => updatePreference('showHelpHints', v)}
        />

        <ToggleSwitch
          label="Break Reminders"
          checked={preferences.breakReminders}
          onChange={(v) => updatePreference('breakReminders', v)}
        />

        <ToggleSwitch
          label="Focus Mode"
          checked={preferences.focusMode}
          onChange={(v) => updatePreference('focusMode', v)}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Sidebar</h3>

        <ToggleSwitch
          label="Collapse Sidebar"
          checked={preferences.sidebarCollapsed}
          onChange={(v) => updatePreference('sidebarCollapsed', v)}
        />

        <ToggleSwitch
          label="Pin Sidebar"
          checked={preferences.sidebarPinned}
          onChange={(v) => updatePreference('sidebarPinned', v)}
        />
      </div>
    </div>
  );
};

// Insights Panel Component
export const InsightsPanel: React.FC = () => {
  const { getInsights, dismissInsight } = useUserPreferences();
  const insights = getInsights();

  if (insights.length === 0) {
    return (
      <div className={styles.panel}>
        <h2 className={styles.title}>
          <span aria-hidden="true">💡</span>
          Personalized Insights
        </h2>
        <p className="text-surface-500 text-sm">
          Keep using the app and we'll learn your preferences to provide personalized suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        <span aria-hidden="true">💡</span>
        Personalized Insights
      </h2>

      {insights.map((insight) => (
        <div key={insight.id} className={styles.insight}>
          <span className={styles.insightIcon}>
            {insight.type === 'navigation_shortcut'
              ? '🚀'
              : insight.type === 'feature_discovery'
                ? '🔍'
                : insight.type === 'workflow_optimization'
                  ? '⚡'
                  : '💡'}
          </span>
          <div className={styles.insightContent}>
            <p className={styles.insightText}>{insight.description}</p>
            <div>
              {insight.suggestedAction && (
                <button className={styles.insightAction}>{insight.suggestedAction}</button>
              )}
              <button className={styles.dismissButton} onClick={() => dismissInsight(insight.id)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Usage Stats Panel Component
export const UsageStatsPanel: React.FC = () => {
  const { getTopFeatures, getFrequentPaths, getPreferredShortcuts, interactions } =
    useUserPreferences();

  const topFeatures = getTopFeatures(5);
  const frequentPaths = getFrequentPaths(5);
  const shortcuts = getPreferredShortcuts();

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>
        <span aria-hidden="true">📊</span>
        Usage Statistics
      </h2>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Session Stats</h3>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Interactions</span>
          <span className={styles.statValue}>{interactions.length}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Top Features</h3>
        {topFeatures.length === 0 ? (
          <p className="text-surface-500 text-sm">No data yet</p>
        ) : (
          topFeatures.map((feature) => (
            <div key={feature.featureId} className={styles.stat}>
              <span className={styles.statLabel}>{feature.featureId}</span>
              <span className={styles.statValue}>{feature.usageCount} uses</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Frequent Paths</h3>
        {frequentPaths.length === 0 ? (
          <p className="text-surface-500 text-sm">No data yet</p>
        ) : (
          frequentPaths.map((path, i) => (
            <div key={i} className={styles.stat}>
              <span className={styles.statLabel}>
                {path.from} → {path.to}
              </span>
              <span className={styles.statValue}>{path.count}x</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Preferred Shortcuts</h3>
        {shortcuts.length === 0 ? (
          <p className="text-surface-500 text-sm">No shortcuts used yet</p>
        ) : (
          shortcuts.map((shortcut) => (
            <div key={shortcut.shortcut} className={styles.stat}>
              <span className={styles.statLabel}>{shortcut.shortcut}</span>
              <span className={styles.statValue}>
                {shortcut.usageCount}x ({Math.round(shortcut.successRate * 100)}%)
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TRACKING HOOKS
// =============================================================================

/**
 * Hook to track component interactions
 */
export const useInteractionTracking = (componentName: string) => {
  const { trackClick, trackFeatureUsage } = useUserPreferences();

  return {
    trackClick: useCallback(
      (target: string, metadata?: Record<string, unknown>) => {
        trackClick(`${componentName}.${target}`, metadata);
      },
      [componentName, trackClick],
    ),

    trackFeature: useCallback(() => {
      trackFeatureUsage(componentName);
    }, [componentName, trackFeatureUsage]),
  };
};

/**
 * Hook to track question interactions
 */
export const useQuestionTracking = (questionId: string) => {
  const { trackQuestionBehavior } = useUserPreferences();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    trackQuestionBehavior(questionId, 'view');
    startTimeRef.current = Date.now();
  }, [questionId, trackQuestionBehavior]);

  return {
    trackAnswer: useCallback(() => {
      const duration = Date.now() - startTimeRef.current;
      trackQuestionBehavior(questionId, 'answer', duration);
    }, [questionId, trackQuestionBehavior]),

    trackSkip: useCallback(() => {
      trackQuestionBehavior(questionId, 'skip');
    }, [questionId, trackQuestionBehavior]),

    trackEdit: useCallback(() => {
      trackQuestionBehavior(questionId, 'edit');
    }, [questionId, trackQuestionBehavior]),
  };
};
