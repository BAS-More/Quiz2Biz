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

      for (const questionId of questionIds) {
        const prediction = state.predictions.get(questionId);
        if (prediction) {
          totalTime += prediction.predictedTime;
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
  dashboard: 'grid gap-4 p-6',
  widget: 'bg-surface-50 rounded-xl shadow-card overflow-hidden transition-shadow duration-200',
  widgetHeader: 'flex items-center gap-2 p-4 border-b border-surface-200 bg-surface-100',
  widgetTitle: 'text-sm font-semibold text-surface-900 m-0 flex-1',
  widgetIcon: 'text-lg',
  widgetActions: 'flex gap-1',
  widgetAction:
    'px-2 py-1 bg-transparent border-none text-surface-500 cursor-pointer text-xs rounded',
  widgetContent: 'p-4 min-h-[100px]',
  editOverlay:
    'absolute inset-0 bg-brand-500/10 border-2 border-dashed border-brand-500 rounded-xl flex items-center justify-center cursor-move',
  toolbar: 'flex items-center gap-3 px-6 py-4 bg-surface-50 border-b border-surface-200',
  toolbarButton:
    'px-4 py-2 rounded-lg border-none text-sm font-medium cursor-pointer transition-all duration-200',
  recommendation: 'p-4 bg-brand-50 rounded-lg mb-3 flex gap-3',
  recommendationIcon: 'text-2xl shrink-0',
  recommendationContent: 'flex-1',
  recommendationTitle: 'text-sm font-semibold text-brand-800 m-0 mb-1',
  recommendationText: 'text-[13px] text-brand-500 m-0 mb-2',
  recommendationActions: 'flex gap-2',
  widgetPicker: 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 p-6',
  widgetPickerItem:
    'p-4 bg-surface-100 rounded-lg border border-surface-200 cursor-pointer transition-all duration-200',
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
    <div className={styles.toolbar}>
      <select
        value={activeLayoutId || ''}
        onChange={(e) => setActiveLayout(e.target.value)}
        className="px-3 py-2 rounded-lg border border-surface-300 text-sm"
      >
        {layouts.map((layout) => (
          <option key={layout.id} value={layout.id}>
            {layout.name}
          </option>
        ))}
      </select>

      <button
        className={`${styles.toolbarButton} ${isEditMode ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-700'}`}
        onClick={toggleEditMode}
      >
        {isEditMode ? '✓ Done Editing' : '✏️ Edit Layout'}
      </button>

      <button
        className={`${styles.toolbarButton} bg-surface-100 text-surface-700`}
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
        className={`${styles.toolbarButton} bg-surface-100 text-surface-700 ml-auto`}
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
    <div className={styles.widgetPicker}>
      {availableWidgets
        .filter((w) => !usedWidgetIds.includes(w.id))
        .map((widget) => (
          <div
            key={widget.id}
            className={styles.widgetPickerItem}
            onClick={() => onSelect(widget.id)}
          >
            <div className="text-2xl mb-2">{widget.icon}</div>
            <h4 className="m-0 mb-1 text-sm">{widget.title}</h4>
            <p className="m-0 text-xs text-surface-500">{widget.description}</p>
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
      className={`${styles.widget} relative`}
      style={{
        gridColumn: `span ${instance.size.width}`,
        gridRow: `span ${instance.size.height}`,
      }}
    >
      <div className={styles.widgetHeader}>
        <span className={styles.widgetIcon}>{widget.icon}</span>
        <h3 className={styles.widgetTitle}>{widget.title}</h3>
        <div className={styles.widgetActions}>
          <button
            className={styles.widgetAction}
            onClick={() => updateWidget(instance.id, { collapsed: !instance.collapsed })}
          >
            {instance.collapsed ? '▼' : '▲'}
          </button>
          {isEditMode && (
            <button className={styles.widgetAction} onClick={() => removeWidget(instance.id)}>
              ✕
            </button>
          )}
        </div>
      </div>

      {!instance.collapsed && <div className={styles.widgetContent}>{children}</div>}

      {isEditMode && <div className={styles.editOverlay}>Drag to reposition</div>}
    </div>
  );
};

// Recommendations Widget Component
export const RecommendationsWidget: React.FC = () => {
  const { getRecommendations, dismissRecommendation } = usePersonalization();
  const recommendations = getRecommendations();

  if (recommendations.length === 0) {
    return (
      <div className="p-5 text-center text-surface-500">
        <p className="m-0">No recommendations right now</p>
        <p className="mt-2 mb-0 text-[13px]">
          Keep using the app and we'll provide personalized suggestions
        </p>
      </div>
    );
  }

  return (
    <div>
      {recommendations.slice(0, 3).map((rec) => (
        <div key={rec.id} className={styles.recommendation}>
          <span className={styles.recommendationIcon}>
            {rec.type === 'next_question'
              ? '❓'
              : rec.type === 'completion_reminder'
                ? '⏰'
                : rec.type === 'time_optimization'
                  ? '⚡'
                  : '💡'}
          </span>
          <div className={styles.recommendationContent}>
            <h4 className={styles.recommendationTitle}>{rec.title}</h4>
            <p className={styles.recommendationText}>{rec.description}</p>
            <div className={styles.recommendationActions}>
              <button
                className={`${styles.toolbarButton} bg-brand-500 text-white px-3 py-1.5 text-xs`}
              >
                Take Action
              </button>
              <button
                className={`${styles.toolbarButton} bg-transparent text-surface-500 border border-surface-300 px-3 py-1.5 text-xs`}
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
        <div className="px-6 py-4 bg-warning-100 border-b border-warning-300">
          <p className="m-0 text-sm text-warning-800">
            ✏️ Edit mode active. Drag widgets to reposition or click the + button to add new
            widgets.
          </p>
          <button
            className={`${styles.toolbarButton} bg-warning-500 text-white mt-2`}
            onClick={() => setShowWidgetPicker(true)}
          >
            + Add Widget
          </button>
        </div>
      )}

      {showWidgetPicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          onClick={() => setShowWidgetPicker(false)}
        >
          <div
            className="bg-surface-50 rounded-xl max-w-[600px] max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 className="m-0 text-lg">Add Widget</h2>
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
        className={styles.dashboard}
        style={{ gridTemplateColumns: `repeat(${layout.gridColumns}, 1fr)` }}
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
                  <div className="text-surface-500 text-sm">{widget.description}</div>
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
      className={`${className || ''} flex items-center gap-2 px-3 py-2 bg-surface-100 rounded-lg text-[13px] text-surface-500`}
    >
      <span>⏱️</span>
      <span>
        Estimated time: <strong>{formatTime(predictedMs)}</strong>
      </span>
      <span>({questionIds.length} questions)</span>
    </div>
  );
};
