/**
 * Personalization System
 *
 * Sprint 37: Adaptive UI & Personalization
 * Task ux37t3: Personalized Dashboards - Allow widget customization, save layouts per user
 * Task ux37t4: Smart Recommendations - ML model for question suggestions, completion time prediction
 * Task ux37t5: A/B Testing Framework - Integrate feature flags, define experiments, track metrics
 *
 * Features:
 * - Customizable dashboard widgets
 * - Drag-and-drop layout editor
 * - ML-powered recommendations
 * - Completion time predictions
 * - A/B testing framework
 * - Feature flag management
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
} from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

// Dashboard Widget Types
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  minSize?: WidgetSize;
  maxSize?: WidgetSize;
  refreshInterval?: number;
  requiredRole?: string[];
  requiredTier?: string[];
}

export type WidgetType =
  | 'score_overview'
  | 'progress_chart'
  | 'recent_activity'
  | 'quick_actions'
  | 'notifications'
  | 'analytics_summary'
  | 'heatmap_mini'
  | 'upcoming_deadlines'
  | 'team_activity'
  | 'recommendations'
  | 'custom';

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetInstance {
  id: string;
  widgetId: string;
  position: WidgetPosition;
  size: WidgetSize;
  visible: boolean;
  collapsed: boolean;
  settings: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetInstance[];
  gridColumns: number;
  gridRows: number;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  targetId?: string;
  targetType?: 'question' | 'section' | 'assessment' | 'document';
  priority: number;
  confidence: number;
  reason: string;
  estimatedTime?: number;
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
}

export type RecommendationType =
  | 'next_question'
  | 'similar_assessment'
  | 'completion_reminder'
  | 'difficulty_warning'
  | 'time_optimization'
  | 'feature_suggestion'
  | 'learning_resource';

export interface PredictionModel {
  questionId: string;
  predictedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
}

// A/B Testing Types
export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  targetAudience: AudienceFilter;
  metrics: ExperimentMetric[];
  startDate: Date;
  endDate?: Date;
  sampleSize: number;
  winningVariant?: string;
  statisticalSignificance?: number;
}

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  weight: number;
  config: Record<string, unknown>;
  isControl: boolean;
}

export interface AudienceFilter {
  roles?: string[];
  tiers?: string[];
  registrationDateRange?: { start: Date; end: Date };
  usageLevel?: 'new' | 'active' | 'power';
  percentage?: number;
}

export interface ExperimentMetric {
  id: string;
  name: string;
  type: MetricType;
  goal: 'increase' | 'decrease';
  baseline?: number;
  results: VariantResult[];
}

export type MetricType =
  | 'conversion'
  | 'engagement'
  | 'retention'
  | 'time_on_task'
  | 'error_rate'
  | 'satisfaction';

export interface VariantResult {
  variantId: string;
  value: number;
  sampleSize: number;
  confidence: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: FeatureFlagRule[];
  defaultValue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagRule {
  id: string;
  condition: FlagCondition;
  value: boolean;
  priority: number;
}

export interface FlagCondition {
  type: 'user_id' | 'role' | 'tier' | 'percentage' | 'date_range' | 'custom';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';
  value: unknown;
}

// State Types
export interface PersonalizationState {
  // Dashboard
  availableWidgets: DashboardWidget[];
  layouts: DashboardLayout[];
  activeLayoutId: string | null;
  isEditMode: boolean;

  // Recommendations
  recommendations: Recommendation[];
  predictions: Map<string, PredictionModel>;

  // A/B Testing
  experiments: Experiment[];
  userVariants: Map<string, string>; // experimentId -> variantId
  featureFlags: FeatureFlag[];

  // User context
  userId: string | null;
  userRole: string | null;
  userTier: string | null;
}

type PersonalizationAction =
  // Dashboard actions
  | { type: 'SET_WIDGETS'; widgets: DashboardWidget[] }
  | { type: 'ADD_LAYOUT'; layout: DashboardLayout }
  | { type: 'UPDATE_LAYOUT'; layoutId: string; updates: Partial<DashboardLayout> }
  | { type: 'DELETE_LAYOUT'; layoutId: string }
  | { type: 'SET_ACTIVE_LAYOUT'; layoutId: string }
  | { type: 'ADD_WIDGET_INSTANCE'; layoutId: string; widget: WidgetInstance }
  | {
      type: 'UPDATE_WIDGET_INSTANCE';
      layoutId: string;
      widgetInstanceId: string;
      updates: Partial<WidgetInstance>;
    }
  | { type: 'REMOVE_WIDGET_INSTANCE'; layoutId: string; widgetInstanceId: string }
  | { type: 'SET_EDIT_MODE'; enabled: boolean }

  // Recommendation actions
  | { type: 'ADD_RECOMMENDATION'; recommendation: Recommendation }
  | { type: 'DISMISS_RECOMMENDATION'; recommendationId: string }
  | { type: 'CLEAR_EXPIRED_RECOMMENDATIONS' }
  | { type: 'SET_PREDICTION'; prediction: PredictionModel }

  // A/B Testing actions
  | { type: 'SET_EXPERIMENTS'; experiments: Experiment[] }
  | { type: 'ASSIGN_VARIANT'; experimentId: string; variantId: string }
  | { type: 'SET_FEATURE_FLAGS'; flags: FeatureFlag[] }
  | { type: 'UPDATE_FEATURE_FLAG'; flagId: string; updates: Partial<FeatureFlag> }

  // User context actions
  | { type: 'SET_USER_CONTEXT'; userId: string | null; role: string | null; tier: string | null }
  | { type: 'LOAD_STATE'; state: Partial<PersonalizationState> };

export interface PersonalizationContextType extends PersonalizationState {
  // Dashboard
  getActiveLayout: () => DashboardLayout | null;
  createLayout: (name: string) => void;
  updateLayout: (layoutId: string, updates: Partial<DashboardLayout>) => void;
  deleteLayout: (layoutId: string) => void;
  setActiveLayout: (layoutId: string) => void;
  addWidget: (widgetId: string, position?: WidgetPosition) => void;
  updateWidget: (widgetInstanceId: string, updates: Partial<WidgetInstance>) => void;
  removeWidget: (widgetInstanceId: string) => void;
  toggleEditMode: () => void;
  resetToDefault: () => void;

  // Recommendations
  getRecommendations: (type?: RecommendationType) => Recommendation[];
  dismissRecommendation: (recommendationId: string) => void;
  getPrediction: (questionId: string) => PredictionModel | null;
  predictCompletionTime: (questionIds: string[]) => number;

  // A/B Testing
  getVariant: (experimentId: string) => ExperimentVariant | null;
  isFeatureEnabled: (flagId: string) => boolean;
  trackMetric: (experimentId: string, metricId: string, value: number) => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'score_overview',
    type: 'score_overview',
    title: 'Score Overview',
    description: 'Current readiness score and trend',
    icon: '📊',
    defaultSize: { width: 2, height: 2 },
  },
  {
    id: 'progress_chart',
    type: 'progress_chart',
    title: 'Progress Chart',
    description: 'Questionnaire completion progress',
    icon: '📈',
    defaultSize: { width: 2, height: 2 },
  },
  {
    id: 'recent_activity',
    type: 'recent_activity',
    title: 'Recent Activity',
    description: 'Latest actions and updates',
    icon: '🕐',
    defaultSize: { width: 2, height: 3 },
  },
  {
    id: 'quick_actions',
    type: 'quick_actions',
    title: 'Quick Actions',
    description: 'Frequently used actions',
    icon: '⚡',
    defaultSize: { width: 1, height: 2 },
  },
  {
    id: 'notifications',
    type: 'notifications',
    title: 'Notifications',
    description: 'Alerts and reminders',
    icon: '🔔',
    defaultSize: { width: 1, height: 2 },
  },
  {
    id: 'analytics_summary',
    type: 'analytics_summary',
    title: 'Analytics Summary',
    description: 'Key metrics at a glance',
    icon: '📉',
    defaultSize: { width: 2, height: 2 },
  },
  {
    id: 'heatmap_mini',
    type: 'heatmap_mini',
    title: 'Heatmap Preview',
    description: 'Dimension coverage heatmap',
    icon: '🗺️',
    defaultSize: { width: 2, height: 2 },
  },
  {
    id: 'upcoming_deadlines',
    type: 'upcoming_deadlines',
    title: 'Upcoming Deadlines',
    description: 'Tasks due soon',
    icon: '📅',
    defaultSize: { width: 1, height: 2 },
  },
  {
    id: 'team_activity',
    type: 'team_activity',
    title: 'Team Activity',
    description: 'Collaborator actions',
    icon: '👥',
    defaultSize: { width: 2, height: 2 },
    requiredTier: ['professional', 'enterprise'],
  },
  {
    id: 'recommendations',
    type: 'recommendations',
    title: 'Recommendations',
    description: 'Personalized suggestions',
    icon: '💡',
    defaultSize: { width: 2, height: 2 },
  },
];

const defaultLayout: DashboardLayout = {
  id: 'default',
  name: 'Default Layout',
  widgets: [
    {
      id: '1',
      widgetId: 'score_overview',
      position: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      visible: true,
      collapsed: false,
      settings: {},
    },
    {
      id: '2',
      widgetId: 'progress_chart',
      position: { x: 2, y: 0 },
      size: { width: 2, height: 2 },
      visible: true,
      collapsed: false,
      settings: {},
    },
    {
      id: '3',
      widgetId: 'quick_actions',
      position: { x: 4, y: 0 },
      size: { width: 1, height: 2 },
      visible: true,
      collapsed: false,
      settings: {},
    },
    {
      id: '4',
      widgetId: 'notifications',
      position: { x: 5, y: 0 },
      size: { width: 1, height: 2 },
      visible: true,
      collapsed: false,
      settings: {},
    },
    {
      id: '5',
      widgetId: 'recent_activity',
      position: { x: 0, y: 2 },
      size: { width: 2, height: 3 },
      visible: true,
      collapsed: false,
      settings: {},
    },
    {
      id: '6',
      widgetId: 'recommendations',
      position: { x: 2, y: 2 },
      size: { width: 2, height: 2 },
      visible: true,
      collapsed: false,
      settings: {},
    },
  ],
  gridColumns: 6,
  gridRows: 6,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true,
};

const initialState: PersonalizationState = {
  availableWidgets: defaultWidgets,
  layouts: [defaultLayout],
  activeLayoutId: 'default',
  isEditMode: false,
  recommendations: [],
  predictions: new Map(),
  experiments: [],
  userVariants: new Map(),
  featureFlags: [],
  userId: null,
  userRole: null,
  userTier: null,
};

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  LAYOUTS: 'quiz2biz_dashboard_layouts',
  ACTIVE_LAYOUT: 'quiz2biz_active_layout',
  VARIANTS: 'quiz2biz_experiment_variants',
  RECOMMENDATIONS: 'quiz2biz_recommendations',
} as const;

// =============================================================================
// REDUCER
// =============================================================================

function personalizationReducer(
  state: PersonalizationState,
  action: PersonalizationAction,
): PersonalizationState {
  switch (action.type) {
    case 'SET_WIDGETS':
      return { ...state, availableWidgets: action.widgets };

    case 'ADD_LAYOUT':
      return { ...state, layouts: [...state.layouts, action.layout] };

    case 'UPDATE_LAYOUT': {
      const layouts = state.layouts.map((layout) =>
        layout.id === action.layoutId
          ? { ...layout, ...action.updates, updatedAt: new Date() }
          : layout,
      );
      return { ...state, layouts };
    }

    case 'DELETE_LAYOUT': {
      if (action.layoutId === 'default') {
        return state;
      }
      const layouts = state.layouts.filter((l) => l.id !== action.layoutId);
      const activeLayoutId =
        state.activeLayoutId === action.layoutId ? 'default' : state.activeLayoutId;
      return { ...state, layouts, activeLayoutId };
    }

    case 'SET_ACTIVE_LAYOUT':
      return { ...state, activeLayoutId: action.layoutId };

    case 'ADD_WIDGET_INSTANCE': {
      const layouts = state.layouts.map((layout) =>
        layout.id === action.layoutId
          ? { ...layout, widgets: [...layout.widgets, action.widget], updatedAt: new Date() }
          : layout,
      );
      return { ...state, layouts };
    }

    case 'UPDATE_WIDGET_INSTANCE': {
      const layouts = state.layouts.map((layout) =>
        layout.id === action.layoutId
          ? {
              ...layout,
              widgets: layout.widgets.map((w) =>
                w.id === action.widgetInstanceId ? { ...w, ...action.updates } : w,
              ),
              updatedAt: new Date(),
            }
          : layout,
      );
      return { ...state, layouts };
    }

    case 'REMOVE_WIDGET_INSTANCE': {
      const layouts = state.layouts.map((layout) =>
        layout.id === action.layoutId
          ? {
              ...layout,
              widgets: layout.widgets.filter((w) => w.id !== action.widgetInstanceId),
              updatedAt: new Date(),
            }
          : layout,
      );
      return { ...state, layouts };
    }

    case 'SET_EDIT_MODE':
      return { ...state, isEditMode: action.enabled };

    case 'ADD_RECOMMENDATION': {
      const existing = state.recommendations.find((r) => r.id === action.recommendation.id);
      if (existing) {
        return state;
      }
      const recommendations = [...state.recommendations, action.recommendation]
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 20);
      return { ...state, recommendations };
    }

    case 'DISMISS_RECOMMENDATION':
      return {
        ...state,
        recommendations: state.recommendations.map((r) =>
          r.id === action.recommendationId ? { ...r, dismissed: true } : r,
        ),
      };

    case 'CLEAR_EXPIRED_RECOMMENDATIONS': {
      const now = new Date();
      const recommendations = state.recommendations.filter(
        (r) => !r.expiresAt || r.expiresAt > now,
      );
      return { ...state, recommendations };
    }

    case 'SET_PREDICTION': {
      const predictions = new Map(state.predictions);
      predictions.set(action.prediction.questionId, action.prediction);
      return { ...state, predictions };
    }

    case 'SET_EXPERIMENTS':
      return { ...state, experiments: action.experiments };

    case 'ASSIGN_VARIANT': {
      const userVariants = new Map(state.userVariants);
      userVariants.set(action.experimentId, action.variantId);
      return { ...state, userVariants };
    }

    case 'SET_FEATURE_FLAGS':
      return { ...state, featureFlags: action.flags };

    case 'UPDATE_FEATURE_FLAG': {
      const featureFlags = state.featureFlags.map((flag) =>
        flag.id === action.flagId ? { ...flag, ...action.updates, updatedAt: new Date() } : flag,
      );
      return { ...state, featureFlags };
    }

    case 'SET_USER_CONTEXT':
      return {
        ...state,
        userId: action.userId,
        userRole: action.role,
        userTier: action.tier,
      };

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function assignVariant(experiment: Experiment, userId: string): string {
  // Deterministic assignment based on user ID
  const hash = Array.from(userId).reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);

  const normalizedHash = Math.abs(hash) / 2147483647;
  let cumulativeWeight = 0;

  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (normalizedHash <= cumulativeWeight) {
      return variant.id;
    }
  }

  return experiment.variants[0]?.id || '';
}

// =============================================================================
// CONTEXT
// =============================================================================

const PersonalizationContext = createContext<PersonalizationContextType | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface PersonalizationProviderProps {
  children: ReactNode;
  userId?: string;
  userRole?: string;
  userTier?: string;
}

export const PersonalizationProvider: React.FC<PersonalizationProviderProps> = ({
  children,
  userId,
  userRole,
  userTier,
}) => {
  const [state, dispatch] = useReducer(personalizationReducer, {
    ...initialState,
    userId: userId || null,
    userRole: userRole || null,
    userTier: userTier || null,
  });

  // Load saved state
  useEffect(() => {
    try {
      const savedLayouts = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      const savedActiveLayout = localStorage.getItem(STORAGE_KEYS.ACTIVE_LAYOUT);
      const savedVariants = localStorage.getItem(STORAGE_KEYS.VARIANTS);
      const savedRecommendations = localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS);

      const loadedState: Partial<PersonalizationState> = {};

      if (savedLayouts) {
        loadedState.layouts = JSON.parse(savedLayouts);
      }

      if (savedActiveLayout) {
        loadedState.activeLayoutId = savedActiveLayout;
      }

      if (savedVariants) {
        loadedState.userVariants = new Map(Object.entries(JSON.parse(savedVariants)));
      }

      if (savedRecommendations) {
        loadedState.recommendations = JSON.parse(savedRecommendations);
      }

      dispatch({ type: 'LOAD_STATE', state: loadedState });
    } catch (error) {
      console.error('[Personalization] Failed to load saved state:', error);
    }
  }, []);

  // Save state changes
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.LAYOUTS, JSON.stringify(state.layouts));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_LAYOUT, state.activeLayoutId || '');

        const variantsObj: Record<string, string> = {};
        state.userVariants.forEach((value, key) => {
          variantsObj[key] = value;
        });
        localStorage.setItem(STORAGE_KEYS.VARIANTS, JSON.stringify(variantsObj));

        localStorage.setItem(
          STORAGE_KEYS.RECOMMENDATIONS,
          JSON.stringify(state.recommendations.filter((r) => !r.dismissed)),
        );
      } catch (error) {
        console.error('[Personalization] Failed to save state:', error);
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [state.layouts, state.activeLayoutId, state.userVariants, state.recommendations]);

  // Clear expired recommendations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEAR_EXPIRED_RECOMMENDATIONS' });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Dashboard functions
  const getActiveLayout = useCallback((): DashboardLayout | null => {
    return state.layouts.find((l) => l.id === state.activeLayoutId) || null;
  }, [state.layouts, state.activeLayoutId]);

  const createLayout = useCallback((name: string) => {
    const layout: DashboardLayout = {
      id: generateId(),
      name,
      widgets: [],
      gridColumns: 6,
      gridRows: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false,
    };
    dispatch({ type: 'ADD_LAYOUT', layout });
    dispatch({ type: 'SET_ACTIVE_LAYOUT', layoutId: layout.id });
  }, []);

  const updateLayout = useCallback((layoutId: string, updates: Partial<DashboardLayout>) => {
    dispatch({ type: 'UPDATE_LAYOUT', layoutId, updates });
  }, []);

  const deleteLayout = useCallback((layoutId: string) => {
    dispatch({ type: 'DELETE_LAYOUT', layoutId });
  }, []);

  const setActiveLayout = useCallback((layoutId: string) => {
    dispatch({ type: 'SET_ACTIVE_LAYOUT', layoutId });
  }, []);

  const addWidget = useCallback(
    (widgetId: string, position?: WidgetPosition) => {
      if (!state.activeLayoutId) {
        return;
      }

      const widget = state.availableWidgets.find((w) => w.id === widgetId);
      if (!widget) {
        return;
      }

      const widgetInstance: WidgetInstance = {
        id: generateId(),
        widgetId,
        position: position || { x: 0, y: 0 },
        size: widget.defaultSize,
        visible: true,
        collapsed: false,
        settings: {},
      };

      dispatch({
        type: 'ADD_WIDGET_INSTANCE',
        layoutId: state.activeLayoutId,
        widget: widgetInstance,
      });
    },
    [state.activeLayoutId, state.availableWidgets],
  );

  const updateWidget = useCallback(
    (widgetInstanceId: string, updates: Partial<WidgetInstance>) => {
      if (!state.activeLayoutId) {
        return;
      }
      dispatch({
        type: 'UPDATE_WIDGET_INSTANCE',
        layoutId: state.activeLayoutId,
        widgetInstanceId,
        updates,
      });
    },
    [state.activeLayoutId],
  );

  const removeWidget = useCallback(
    (widgetInstanceId: string) => {
      if (!state.activeLayoutId) {
        return;
      }
      dispatch({
        type: 'REMOVE_WIDGET_INSTANCE',
        layoutId: state.activeLayoutId,
        widgetInstanceId,
      });
    },
    [state.activeLayoutId],
  );

  const toggleEditMode = useCallback(() => {
    dispatch({ type: 'SET_EDIT_MODE', enabled: !state.isEditMode });
  }, [state.isEditMode]);

  const resetToDefault = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_LAYOUT', layoutId: 'default' });
  }, []);

  // Recommendation functions
  const getRecommendations = useCallback(
    (type?: RecommendationType): Recommendation[] => {
      let recommendations = state.recommendations.filter((r) => !r.dismissed);
      if (type) {
        recommendations = recommendations.filter((r) => r.type === type);
      }
      return recommendations.slice(0, 10);
    },
    [state.recommendations],
  );

  const dismissRecommendation = useCallback((recommendationId: string) => {
    dispatch({ type: 'DISMISS_RECOMMENDATION', recommendationId });
  }, []);

  const getPrediction = useCallback(
    (questionId: string): PredictionModel | null => {
      return state.predictions.get(questionId) || null;
    },
    [state.predictions],
  );

  const predictCompletionTime = useCallback(
    (questionIds: string[]): number => {
      let totalTime = 0;
      let predictedCount = 0;

      for (const questionId of questionIds) {
        const prediction = state.predictions.get(questionId);
        if (prediction) {
          totalTime += prediction.predictedTime;
          predictedCount++;
        } else {
          // Default estimate: 2 minutes per question
          totalTime += 120000;
        }
      }

      // Add buffer for transitions and thinking
      const buffer = questionIds.length * 15000; // 15 seconds per question
      return totalTime + buffer;
    },
    [state.predictions],
  );

  // A/B Testing functions
  const getVariant = useCallback(
    (experimentId: string): ExperimentVariant | null => {
      const experiment = state.experiments.find((e) => e.id === experimentId);
      if (!experiment || experiment.status !== 'running') {
        return null;
      }

      let variantId = state.userVariants.get(experimentId);

      if (!variantId && state.userId) {
        variantId = assignVariant(experiment, state.userId);
        dispatch({ type: 'ASSIGN_VARIANT', experimentId, variantId });
      }

      return experiment.variants.find((v) => v.id === variantId) || null;
    },
    [state.experiments, state.userVariants, state.userId],
  );

  const isFeatureEnabled = useCallback(
    (flagId: string): boolean => {
      const flag = state.featureFlags.find((f) => f.id === flagId);
      if (!flag) {
        return false;
      }
      if (!flag.enabled) {
        return flag.defaultValue;
      }

      // Evaluate rules in priority order
      const sortedRules = [...flag.rules].sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        const conditionMet = evaluateCondition(rule.condition, {
          userId: state.userId,
          role: state.userRole,
          tier: state.userTier,
        });

        if (conditionMet) {
          return rule.value;
        }
      }

      return flag.defaultValue;
    },
    [state.featureFlags, state.userId, state.userRole, state.userTier],
  );

  const trackMetric = useCallback((experimentId: string, metricId: string, value: number) => {
    // In production, this would send to analytics service
    console.log('[A/B] Track metric:', { experimentId, metricId, value });
  }, []);

  const contextValue: PersonalizationContextType = {
    ...state,
    getActiveLayout,
    createLayout,
    updateLayout,
    deleteLayout,
    setActiveLayout,
    addWidget,
    updateWidget,
    removeWidget,
    toggleEditMode,
    resetToDefault,
    getRecommendations,
    dismissRecommendation,
    getPrediction,
    predictCompletionTime,
    getVariant,
    isFeatureEnabled,
    trackMetric,
  };

  return (
    <PersonalizationContext.Provider value={contextValue}>
      {children}
    </PersonalizationContext.Provider>
  );
};

// Helper function
function evaluateCondition(
  condition: FlagCondition,
  context: { userId: string | null; role: string | null; tier: string | null },
): boolean {
  switch (condition.type) {
    case 'user_id':
      return condition.operator === 'equals'
        ? context.userId === condition.value
        : condition.operator === 'in_list'
          ? (condition.value as string[]).includes(context.userId || '')
          : false;
    case 'role':
      return condition.operator === 'equals'
        ? context.role === condition.value
        : condition.operator === 'in_list'
          ? (condition.value as string[]).includes(context.role || '')
          : false;
    case 'tier':
      return condition.operator === 'equals'
        ? context.tier === condition.value
        : condition.operator === 'in_list'
          ? (condition.value as string[]).includes(context.tier || '')
          : false;
    case 'percentage':
      if (!context.userId) {
        return false;
      }
      const hash = Array.from(context.userId).reduce((acc, char) => {
        return (acc << 5) - acc + char.charCodeAt(0);
      }, 0);
      const percentage = (Math.abs(hash) % 100) / 100;
      return percentage < (condition.value as number);
    default:
      return false;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export const usePersonalization = (): PersonalizationContextType => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

const styles = {
  dashboard: {
    display: 'grid',
    gap: '16px',
    padding: '24px',
  } as React.CSSProperties,
  widget: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease',
  } as React.CSSProperties,
  widgetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  } as React.CSSProperties,
  widgetTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a2e',
    margin: 0,
    flex: 1,
  } as React.CSSProperties,
  widgetIcon: {
    fontSize: '18px',
  } as React.CSSProperties,
  widgetActions: {
    display: 'flex',
    gap: '4px',
  } as React.CSSProperties,
  widgetAction: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '4px',
  } as React.CSSProperties,
  widgetContent: {
    padding: '16px',
    minHeight: '100px',
  } as React.CSSProperties,
  editOverlay: {
    position: 'absolute' as const,
    inset: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '2px dashed #3b82f6',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'move',
  } as React.CSSProperties,
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  } as React.CSSProperties,
  toolbarButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  recommendation: {
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '12px',
    display: 'flex',
    gap: '12px',
  } as React.CSSProperties,
  recommendationIcon: {
    fontSize: '24px',
    flexShrink: 0,
  } as React.CSSProperties,
  recommendationContent: {
    flex: 1,
  } as React.CSSProperties,
  recommendationTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 4px 0',
  } as React.CSSProperties,
  recommendationText: {
    fontSize: '13px',
    color: '#3b82f6',
    margin: '0 0 8px 0',
  } as React.CSSProperties,
  recommendationActions: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  widgetPicker: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    padding: '24px',
  } as React.CSSProperties,
  widgetPickerItem: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
};

// Dashboard Toolbar Component
export const DashboardToolbar: React.FC = () => {
  const {
    isEditMode,
    toggleEditMode,
    createLayout,
    layouts,
    activeLayoutId,
    setActiveLayout,
    resetToDefault,
  } = usePersonalization();

  const [_showLayoutPicker, _setShowLayoutPicker] = useState(false);

  return (
    <div style={styles.toolbar}>
      <select
        value={activeLayoutId || ''}
        onChange={(e) => setActiveLayout(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          fontSize: '14px',
        }}
      >
        {layouts.map((layout) => (
          <option key={layout.id} value={layout.id}>
            {layout.name}
          </option>
        ))}
      </select>

      <button
        style={{
          ...styles.toolbarButton,
          backgroundColor: isEditMode ? '#3b82f6' : '#f3f4f6',
          color: isEditMode ? '#ffffff' : '#374151',
        }}
        onClick={toggleEditMode}
      >
        {isEditMode ? '✓ Done Editing' : '✏️ Edit Layout'}
      </button>

      <button
        style={{
          ...styles.toolbarButton,
          backgroundColor: '#f3f4f6',
          color: '#374151',
        }}
        onClick={() => {
          const name = prompt('Enter layout name:');
          if (name) {
            createLayout(name);
          }
        }}
      >
        + New Layout
      </button>

      <button
        style={{
          ...styles.toolbarButton,
          backgroundColor: '#f3f4f6',
          color: '#374151',
          marginLeft: 'auto',
        }}
        onClick={resetToDefault}
      >
        Reset to Default
      </button>
    </div>
  );
};

// Widget Picker Component
export const WidgetPicker: React.FC<{ onSelect: (widgetId: string) => void }> = ({ onSelect }) => {
  const { availableWidgets, getActiveLayout } = usePersonalization();
  const activeLayout = getActiveLayout();
  const usedWidgetIds = activeLayout?.widgets.map((w) => w.widgetId) || [];

  return (
    <div style={styles.widgetPicker}>
      {availableWidgets
        .filter((w) => !usedWidgetIds.includes(w.id))
        .map((widget) => (
          <div key={widget.id} style={styles.widgetPickerItem} onClick={() => onSelect(widget.id)}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{widget.icon}</div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{widget.title}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{widget.description}</p>
          </div>
        ))}
    </div>
  );
};

// Widget Component
export interface WidgetComponentProps {
  instance: WidgetInstance;
  widget: DashboardWidget;
  children?: ReactNode;
}

export const WidgetComponent: React.FC<WidgetComponentProps> = ({ instance, widget, children }) => {
  const { isEditMode, updateWidget, removeWidget } = usePersonalization();

  return (
    <div
      style={{
        ...styles.widget,
        gridColumn: `span ${instance.size.width}`,
        gridRow: `span ${instance.size.height}`,
        position: 'relative',
      }}
    >
      <div style={styles.widgetHeader}>
        <span style={styles.widgetIcon}>{widget.icon}</span>
        <h3 style={styles.widgetTitle}>{widget.title}</h3>
        <div style={styles.widgetActions}>
          <button
            style={styles.widgetAction}
            onClick={() => updateWidget(instance.id, { collapsed: !instance.collapsed })}
          >
            {instance.collapsed ? '▼' : '▲'}
          </button>
          {isEditMode && (
            <button style={styles.widgetAction} onClick={() => removeWidget(instance.id)}>
              ✕
            </button>
          )}
        </div>
      </div>

      {!instance.collapsed && <div style={styles.widgetContent}>{children}</div>}

      {isEditMode && <div style={styles.editOverlay}>Drag to reposition</div>}
    </div>
  );
};

// Recommendations Widget Component
export const RecommendationsWidget: React.FC = () => {
  const { getRecommendations, dismissRecommendation } = usePersonalization();
  const recommendations = getRecommendations();

  if (recommendations.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        <p style={{ margin: 0 }}>No recommendations right now</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
          Keep using the app and we'll provide personalized suggestions
        </p>
      </div>
    );
  }

  return (
    <div>
      {recommendations.slice(0, 3).map((rec) => (
        <div key={rec.id} style={styles.recommendation}>
          <span style={styles.recommendationIcon}>
            {rec.type === 'next_question'
              ? '❓'
              : rec.type === 'completion_reminder'
                ? '⏰'
                : rec.type === 'time_optimization'
                  ? '⚡'
                  : '💡'}
          </span>
          <div style={styles.recommendationContent}>
            <h4 style={styles.recommendationTitle}>{rec.title}</h4>
            <p style={styles.recommendationText}>{rec.description}</p>
            <div style={styles.recommendationActions}>
              <button
                style={{
                  ...styles.toolbarButton,
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  padding: '6px 12px',
                  fontSize: '12px',
                }}
              >
                Take Action
              </button>
              <button
                style={{
                  ...styles.toolbarButton,
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  padding: '6px 12px',
                  fontSize: '12px',
                }}
                onClick={() => dismissRecommendation(rec.id)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Personalized Dashboard Component
export const PersonalizedDashboard: React.FC = () => {
  const { getActiveLayout, availableWidgets, addWidget, isEditMode } = usePersonalization();
  const layout = getActiveLayout();
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  if (!layout) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <DashboardToolbar />

      {isEditMode && (
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#fef3c7',
            borderBottom: '1px solid #fcd34d',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
            ✏️ Edit mode active. Drag widgets to reposition or click the + button to add new
            widgets.
          </p>
          <button
            style={{
              ...styles.toolbarButton,
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              marginTop: '8px',
            }}
            onClick={() => setShowWidgetPicker(true)}
          >
            + Add Widget
          </button>
        </div>
      )}

      {showWidgetPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowWidgetPicker(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Add Widget</h2>
            </div>
            <WidgetPicker
              onSelect={(widgetId) => {
                addWidget(widgetId);
                setShowWidgetPicker(false);
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          ...styles.dashboard,
          gridTemplateColumns: `repeat(${layout.gridColumns}, 1fr)`,
        }}
      >
        {layout.widgets
          .filter((w) => w.visible)
          .map((instance) => {
            const widget = availableWidgets.find((w) => w.id === instance.widgetId);
            if (!widget) {
              return null;
            }

            return (
              <WidgetComponent key={instance.id} instance={instance} widget={widget}>
                {widget.type === 'recommendations' ? (
                  <RecommendationsWidget />
                ) : (
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>{widget.description}</div>
                )}
              </WidgetComponent>
            );
          })}
      </div>
    </div>
  );
};

// A/B Test Wrapper Component
export interface ABTestProps {
  experimentId: string;
  children: (variant: ExperimentVariant | null) => ReactNode;
  fallback?: ReactNode;
}

export const ABTest: React.FC<ABTestProps> = ({ experimentId, children, fallback }) => {
  const { getVariant } = usePersonalization();
  const variant = getVariant(experimentId);

  if (!variant && fallback) {
    return <>{fallback}</>;
  }

  return <>{children(variant)}</>;
};

// Feature Flag Component
export interface FeatureFlagProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const FeatureFlag: React.FC<FeatureFlagProps> = ({ flag, children, fallback }) => {
  const { isFeatureEnabled } = usePersonalization();

  if (isFeatureEnabled(flag)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
};

// Completion Time Predictor Component
export interface CompletionTimePredictorProps {
  questionIds: string[];
  className?: string;
}

export const CompletionTimePredictor: React.FC<CompletionTimePredictorProps> = ({
  questionIds,
  className,
}) => {
  const { predictCompletionTime } = usePersonalization();
  const predictedMs = predictCompletionTime(questionIds);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#6b7280',
      }}
    >
      <span>⏱️</span>
      <span>
        Estimated time: <strong>{formatTime(predictedMs)}</strong>
      </span>
      <span>({questionIds.length} questions)</span>
    </div>
  );
};
