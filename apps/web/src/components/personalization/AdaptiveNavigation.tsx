/**
 * Adaptive Navigation System
 *
 * Sprint 37: Adaptive UI & Personalization
 * Task ux37t2: Reorder menu items based on usage frequency, suggest next action based on past behavior
 *
 * Features:
 * - Dynamic menu reordering based on usage frequency
 * - Smart next action suggestions
 * - Predictive navigation
 * - Quick access favorites
 * - Contextual menu adaptation
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  children?: NavItem[];
  badge?: string | number;
  isNew?: boolean;
  requiredRole?: string[];
}

export interface NavItemUsage {
  itemId: string;
  usageCount: number;
  lastUsed: Date;
  avgTimeSpent: number;
  conversionRate: number;
  contextUsage: Map<string, number>; // context -> count
}

export interface NavigationSuggestion {
  id: string;
  type: SuggestionType;
  targetItem: NavItem;
  reason: string;
  confidence: number;
  context?: string;
  timestamp: Date;
}

export type SuggestionType =
  | 'frequent_next'
  | 'time_based'
  | 'workflow_continuation'
  | 'recently_used'
  | 'popular'
  | 'contextual';

export interface QuickAccessItem {
  navItem: NavItem;
  order: number;
  pinned: boolean;
  addedAt: Date;
}

export interface NavigationHistory {
  path: string;
  timestamp: Date;
  duration: number;
  context?: string;
}

export interface AdaptiveNavState {
  items: NavItem[];
  itemUsage: Map<string, NavItemUsage>;
  suggestions: NavigationSuggestion[];
  quickAccess: QuickAccessItem[];
  history: NavigationHistory[];
  currentPath: string;
  reorderedItems: NavItem[];
  isAdaptive: boolean;
}

type AdaptiveNavAction =
  | { type: 'SET_ITEMS'; items: NavItem[] }
  | { type: 'TRACK_NAVIGATION'; path: string; duration?: number }
  | { type: 'UPDATE_USAGE'; itemId: string; usage: Partial<NavItemUsage> }
  | { type: 'ADD_SUGGESTION'; suggestion: NavigationSuggestion }
  | { type: 'DISMISS_SUGGESTION'; suggestionId: string }
  | { type: 'ADD_TO_QUICK_ACCESS'; item: NavItem; pinned?: boolean }
  | { type: 'REMOVE_FROM_QUICK_ACCESS'; itemId: string }
  | { type: 'REORDER_QUICK_ACCESS'; fromIndex: number; toIndex: number }
  | { type: 'SET_ADAPTIVE'; enabled: boolean }
  | { type: 'REORDER_ITEMS' }
  | { type: 'LOAD_STATE'; state: Partial<AdaptiveNavState> };

export interface AdaptiveNavContextType extends AdaptiveNavState {
  // Navigation
  navigateTo: (path: string) => void;
  trackNavigation: (path: string, duration?: number) => void;

  // Suggestions
  getSuggestions: (limit?: number) => NavigationSuggestion[];
  dismissSuggestion: (suggestionId: string) => void;
  generateSuggestions: () => void;

  // Quick Access
  addToQuickAccess: (item: NavItem, pinned?: boolean) => void;
  removeFromQuickAccess: (itemId: string) => void;
  reorderQuickAccess: (fromIndex: number, toIndex: number) => void;
  getQuickAccessItems: () => QuickAccessItem[];

  // Menu
  getReorderedItems: () => NavItem[];
  getItemUsage: (itemId: string) => NavItemUsage | undefined;
  setAdaptive: (enabled: boolean) => void;

  // Predictions
  predictNextAction: () => NavItem | null;
  getFrequentItems: (limit?: number) => NavItem[];
  getRecentItems: (limit?: number) => NavItem[];
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  USAGE: 'quiz2biz_nav_usage',
  QUICK_ACCESS: 'quiz2biz_quick_access',
  HISTORY: 'quiz2biz_nav_history',
  SETTINGS: 'quiz2biz_nav_settings',
} as const;

// =============================================================================
// DEFAULT NAV ITEMS
// =============================================================================

const defaultNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
  { id: 'questionnaires', label: 'Questionnaires', icon: '📝', path: '/questionnaires' },
  { id: 'assessments', label: 'Assessments', icon: '✅', path: '/assessments' },
  { id: 'documents', label: 'Documents', icon: '📄', path: '/documents' },
  { id: 'analytics', label: 'Analytics', icon: '📈', path: '/analytics' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
  { id: 'help', label: 'Help Center', icon: '❓', path: '/help' },
];

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: AdaptiveNavState = {
  items: defaultNavItems,
  itemUsage: new Map(),
  suggestions: [],
  quickAccess: [],
  history: [],
  currentPath: '/',
  reorderedItems: defaultNavItems,
  isAdaptive: true,
};

// =============================================================================
// REDUCER
// =============================================================================

function adaptiveNavReducer(state: AdaptiveNavState, action: AdaptiveNavAction): AdaptiveNavState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.items, reorderedItems: action.items };

    case 'TRACK_NAVIGATION': {
      const history = [
        {
          path: action.path,
          timestamp: new Date(),
          duration: action.duration || 0,
        },
        ...state.history,
      ].slice(0, 100);

      // Update usage for the item
      const item = findItemByPath(state.items, action.path);
      if (item) {
        const existing = state.itemUsage.get(item.id) || {
          itemId: item.id,
          usageCount: 0,
          lastUsed: new Date(),
          avgTimeSpent: 0,
          conversionRate: 0,
          contextUsage: new Map(),
        };

        const newUsage = new Map(state.itemUsage);
        newUsage.set(item.id, {
          ...existing,
          usageCount: existing.usageCount + 1,
          lastUsed: new Date(),
        });

        return {
          ...state,
          history,
          currentPath: action.path,
          itemUsage: newUsage,
        };
      }

      return { ...state, history, currentPath: action.path };
    }

    case 'UPDATE_USAGE': {
      const newUsage = new Map(state.itemUsage);
      const existing = newUsage.get(action.itemId) || {
        itemId: action.itemId,
        usageCount: 0,
        lastUsed: new Date(),
        avgTimeSpent: 0,
        conversionRate: 0,
        contextUsage: new Map(),
      };
      newUsage.set(action.itemId, { ...existing, ...action.usage });
      return { ...state, itemUsage: newUsage };
    }

    case 'ADD_SUGGESTION': {
      const existing = state.suggestions.find((s) => s.id === action.suggestion.id);
      if (existing) {
        return state;
      }

      const suggestions = [...state.suggestions, action.suggestion]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);
      return { ...state, suggestions };
    }

    case 'DISMISS_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.filter((s) => s.id !== action.suggestionId),
      };

    case 'ADD_TO_QUICK_ACCESS': {
      const exists = state.quickAccess.some((qa) => qa.navItem.id === action.item.id);
      if (exists) {
        return state;
      }

      const quickAccess = [
        ...state.quickAccess,
        {
          navItem: action.item,
          order: state.quickAccess.length,
          pinned: action.pinned || false,
          addedAt: new Date(),
        },
      ];
      return { ...state, quickAccess };
    }

    case 'REMOVE_FROM_QUICK_ACCESS':
      return {
        ...state,
        quickAccess: state.quickAccess.filter((qa) => qa.navItem.id !== action.itemId),
      };

    case 'REORDER_QUICK_ACCESS': {
      const items = [...state.quickAccess];
      const [removed] = items.splice(action.fromIndex, 1);
      items.splice(action.toIndex, 0, removed);
      return { ...state, quickAccess: items.map((item, i) => ({ ...item, order: i })) };
    }

    case 'SET_ADAPTIVE':
      return { ...state, isAdaptive: action.enabled };

    case 'REORDER_ITEMS': {
      if (!state.isAdaptive) {
        return { ...state, reorderedItems: state.items };
      }

      const itemsWithUsage = state.items.map((item) => ({
        item,
        usage: state.itemUsage.get(item.id),
      }));

      const sorted = [...itemsWithUsage].sort((a, b) => {
        const aCount = a.usage?.usageCount || 0;
        const bCount = b.usage?.usageCount || 0;

        // Give bonus to recently used items
        const aRecency = a.usage?.lastUsed
          ? (Date.now() - a.usage.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        const bRecency = b.usage?.lastUsed
          ? (Date.now() - b.usage.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
          : 999;

        const aScore = aCount * 10 - aRecency;
        const bScore = bCount * 10 - bRecency;

        return bScore - aScore;
      });

      return { ...state, reorderedItems: sorted.map((s) => s.item) };
    }

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function findItemByPath(items: NavItem[], path: string): NavItem | null {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }
    if (item.children) {
      const found = findItemByPath(item.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AdaptiveNavContext = createContext<AdaptiveNavContextType | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface AdaptiveNavProviderProps {
  children: ReactNode;
  navItems?: NavItem[];
  onNavigate?: (path: string) => void;
}

export const AdaptiveNavProvider: React.FC<AdaptiveNavProviderProps> = ({
  children,
  navItems,
  onNavigate,
}) => {
  const [state, dispatch] = useReducer(adaptiveNavReducer, {
    ...initialState,
    items: navItems || defaultNavItems,
    reorderedItems: navItems || defaultNavItems,
  });

  // Load saved state
  useEffect(() => {
    try {
      const savedUsage = localStorage.getItem(STORAGE_KEYS.USAGE);
      const savedQuickAccess = localStorage.getItem(STORAGE_KEYS.QUICK_ACCESS);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

      const loadedState: Partial<AdaptiveNavState> = {};

      if (savedUsage) {
        const usage = JSON.parse(savedUsage);
        loadedState.itemUsage = new Map(Object.entries(usage));
      }

      if (savedQuickAccess) {
        loadedState.quickAccess = JSON.parse(savedQuickAccess);
      }

      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        loadedState.history = history.map((h: NavigationHistory) => ({
          ...h,
          timestamp: new Date(h.timestamp),
        }));
      }

      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        loadedState.isAdaptive = settings.isAdaptive ?? true;
      }

      dispatch({ type: 'LOAD_STATE', state: loadedState });
    } catch (error) {
      console.error('[AdaptiveNav] Failed to load saved state:', error);
    }
  }, []);

  // Save state changes
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      try {
        const usageObj: Record<string, NavItemUsage> = {};
        state.itemUsage.forEach((value, key) => {
          usageObj[key] = value;
        });
        localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(usageObj));
        localStorage.setItem(STORAGE_KEYS.QUICK_ACCESS, JSON.stringify(state.quickAccess));
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history.slice(0, 50)));
        localStorage.setItem(
          STORAGE_KEYS.SETTINGS,
          JSON.stringify({ isAdaptive: state.isAdaptive }),
        );
      } catch (error) {
        console.error('[AdaptiveNav] Failed to save state:', error);
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [state.itemUsage, state.quickAccess, state.history, state.isAdaptive]);

  // Reorder items when usage changes
  useEffect(() => {
    dispatch({ type: 'REORDER_ITEMS' });
  }, [state.itemUsage, state.isAdaptive]);

  // Generate suggestions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      generateSuggestions();
    }, 30000);

    return () => clearInterval(interval);
  }, [state.history, state.itemUsage]);

  // Track navigation
  const trackNavigation = useCallback((path: string, duration?: number) => {
    dispatch({ type: 'TRACK_NAVIGATION', path, duration });
  }, []);

  // Navigate to path
  const navigateTo = useCallback(
    (path: string) => {
      trackNavigation(path);
      onNavigate?.(path);
    },
    [trackNavigation, onNavigate],
  );

  // Get suggestions
  const getSuggestions = useCallback(
    (limit: number = 5): NavigationSuggestion[] => {
      return state.suggestions.slice(0, limit);
    },
    [state.suggestions],
  );

  // Dismiss suggestion
  const dismissSuggestion = useCallback((suggestionId: string) => {
    dispatch({ type: 'DISMISS_SUGGESTION', suggestionId });
  }, []);

  // Generate suggestions based on patterns
  const generateSuggestions = useCallback(() => {
    // Clear old suggestions
    state.suggestions.forEach((s) => {
      if (Date.now() - s.timestamp.getTime() > 5 * 60 * 1000) {
        dispatch({ type: 'DISMISS_SUGGESTION', suggestionId: s.id });
      }
    });

    // Suggest based on frequent navigation patterns
    const recentHistory = state.history.slice(0, 10);
    if (recentHistory.length >= 2) {
      const currentPath = state.currentPath;

      // Find common next paths from current location
      const nextPaths = new Map<string, number>();
      for (let i = 0; i < state.history.length - 1; i++) {
        if (state.history[i].path === currentPath) {
          const nextPath = state.history[i + 1]?.path;
          if (nextPath && nextPath !== currentPath) {
            nextPaths.set(nextPath, (nextPaths.get(nextPath) || 0) + 1);
          }
        }
      }

      // Create suggestions for frequent next paths
      nextPaths.forEach((count, path) => {
        if (count >= 2) {
          const item = findItemByPath(state.items, path);
          if (item) {
            dispatch({
              type: 'ADD_SUGGESTION',
              suggestion: {
                id: generateId(),
                type: 'frequent_next',
                targetItem: item,
                reason: `You often go to ${item.label} from here`,
                confidence: Math.min(count / 5, 1),
                timestamp: new Date(),
              },
            });
          }
        }
      });
    }

    // Suggest based on time of day patterns
    const hour = new Date().getHours();
    const timeBasedItems = Array.from(state.itemUsage.entries())
      .filter(([, usage]) => {
        const usageHour = usage.lastUsed.getHours();
        return Math.abs(usageHour - hour) <= 1;
      })
      .sort((a, b) => b[1].usageCount - a[1].usageCount)
      .slice(0, 2);

    timeBasedItems.forEach(([itemId]) => {
      const item = state.items.find((i) => i.id === itemId);
      if (item && item.path !== state.currentPath) {
        dispatch({
          type: 'ADD_SUGGESTION',
          suggestion: {
            id: generateId(),
            type: 'time_based',
            targetItem: item,
            reason: `You usually use ${item.label} around this time`,
            confidence: 0.6,
            timestamp: new Date(),
          },
        });
      }
    });
  }, [state.history, state.currentPath, state.items, state.itemUsage, state.suggestions]);

  // Add to quick access
  const addToQuickAccess = useCallback((item: NavItem, pinned?: boolean) => {
    dispatch({ type: 'ADD_TO_QUICK_ACCESS', item, pinned });
  }, []);

  // Remove from quick access
  const removeFromQuickAccess = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_FROM_QUICK_ACCESS', itemId });
  }, []);

  // Reorder quick access
  const reorderQuickAccess = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_QUICK_ACCESS', fromIndex, toIndex });
  }, []);

  // Get quick access items
  const getQuickAccessItems = useCallback((): QuickAccessItem[] => {
    return [...state.quickAccess].sort((a, b) => {
      // Pinned items first, then by order
      if (a.pinned && !b.pinned) {
        return -1;
      }
      if (!a.pinned && b.pinned) {
        return 1;
      }
      return a.order - b.order;
    });
  }, [state.quickAccess]);

  // Get reordered items
  const getReorderedItems = useCallback((): NavItem[] => {
    return state.reorderedItems;
  }, [state.reorderedItems]);

  // Get item usage
  const getItemUsage = useCallback(
    (itemId: string): NavItemUsage | undefined => {
      return state.itemUsage.get(itemId);
    },
    [state.itemUsage],
  );

  // Set adaptive mode
  const setAdaptive = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_ADAPTIVE', enabled });
  }, []);

  // Predict next action
  const predictNextAction = useCallback((): NavItem | null => {
    if (state.history.length < 2) {
      return null;
    }

    const currentPath = state.currentPath;
    const nextPaths = new Map<string, number>();

    for (let i = 0; i < state.history.length - 1; i++) {
      if (state.history[i].path === currentPath) {
        const nextPath = state.history[i + 1]?.path;
        if (nextPath && nextPath !== currentPath) {
          nextPaths.set(nextPath, (nextPaths.get(nextPath) || 0) + 1);
        }
      }
    }

    let maxCount = 0;
    let predictedPath = '';

    nextPaths.forEach((count, path) => {
      if (count > maxCount) {
        maxCount = count;
        predictedPath = path;
      }
    });

    if (predictedPath && maxCount >= 2) {
      return findItemByPath(state.items, predictedPath);
    }

    return null;
  }, [state.history, state.currentPath, state.items]);

  // Get frequent items
  const getFrequentItems = useCallback(
    (limit: number = 5): NavItem[] => {
      const sorted = Array.from(state.itemUsage.entries())
        .sort((a, b) => b[1].usageCount - a[1].usageCount)
        .slice(0, limit);

      return sorted
        .map(([itemId]) => state.items.find((i) => i.id === itemId))
        .filter((item): item is NavItem => item !== undefined);
    },
    [state.itemUsage, state.items],
  );

  // Get recent items
  const getRecentItems = useCallback(
    (limit: number = 5): NavItem[] => {
      const uniquePaths = new Set<string>();
      const recentItems: NavItem[] = [];

      for (const entry of state.history) {
        if (!uniquePaths.has(entry.path)) {
          uniquePaths.add(entry.path);
          const item = findItemByPath(state.items, entry.path);
          if (item) {
            recentItems.push(item);
            if (recentItems.length >= limit) {
              break;
            }
          }
        }
      }

      return recentItems;
    },
    [state.history, state.items],
  );

  const contextValue: AdaptiveNavContextType = {
    ...state,
    navigateTo,
    trackNavigation,
    getSuggestions,
    dismissSuggestion,
    generateSuggestions,
    addToQuickAccess,
    removeFromQuickAccess,
    reorderQuickAccess,
    getQuickAccessItems,
    getReorderedItems,
    getItemUsage,
    setAdaptive,
    predictNextAction,
    getFrequentItems,
    getRecentItems,
  };

  return <AdaptiveNavContext.Provider value={contextValue}>{children}</AdaptiveNavContext.Provider>;
};

// =============================================================================
// HOOK
// =============================================================================

export const useAdaptiveNav = (): AdaptiveNavContextType => {
  const context = useContext(AdaptiveNavContext);
  if (!context) {
    throw new Error('useAdaptiveNav must be used within an AdaptiveNavProvider');
  }
  return context;
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

const styles = {
  sidebar: {
    width: '260px',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  } as React.CSSProperties,
  logo: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  } as React.CSSProperties,
  navSection: {
    padding: '12px 0',
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    padding: '8px 20px',
    margin: 0,
  } as React.CSSProperties,
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  navItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    borderRight: '3px solid #3b82f6',
  } as React.CSSProperties,
  navItemHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
  } as React.CSSProperties,
  navIcon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  badge: {
    marginLeft: 'auto',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '10px',
  } as React.CSSProperties,
  newBadge: {
    marginLeft: 'auto',
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
  } as React.CSSProperties,
  suggestionBox: {
    margin: '12px',
    padding: '16px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  } as React.CSSProperties,
  suggestionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
  suggestionText: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  } as React.CSSProperties,
  suggestionButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    marginRight: '8px',
  } as React.CSSProperties,
  suggestionDismiss: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  } as React.CSSProperties,
  quickAccessItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    marginBottom: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  } as React.CSSProperties,
  removeButton: {
    marginLeft: 'auto',
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.4)',
    cursor: 'pointer',
    fontSize: '12px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  } as React.CSSProperties,
  footer: {
    marginTop: 'auto',
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  } as React.CSSProperties,
  adaptiveToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
  } as React.CSSProperties,
};

// Navigation Item Component
interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

const NavItemComponent: React.FC<NavItemComponentProps> = ({ item, isActive, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      style={{
        ...styles.navItem,
        ...(isActive ? styles.navItemActive : {}),
        ...(isHovered && !isActive ? styles.navItemHover : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={styles.navIcon}>{item.icon}</span>
      <span>{item.label}</span>
      {item.badge && <span style={styles.badge}>{item.badge}</span>}
      {item.isNew && <span style={styles.newBadge}>NEW</span>}
    </button>
  );
};

// Suggestion Box Component
interface SuggestionBoxProps {
  suggestion: NavigationSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

const SuggestionBox: React.FC<SuggestionBoxProps> = ({ suggestion, onAccept, onDismiss }) => (
  <div style={styles.suggestionBox}>
    <p style={styles.suggestionTitle}>
      <span aria-hidden="true">💡</span>
      Suggestion
    </p>
    <p style={styles.suggestionText}>{suggestion.reason}</p>
    <div>
      <button style={styles.suggestionButton} onClick={onAccept}>
        Go to {suggestion.targetItem.label}
      </button>
      <button style={styles.suggestionDismiss} onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  </div>
);

// Adaptive Sidebar Component
export interface AdaptiveSidebarProps {
  className?: string;
  style?: React.CSSProperties;
  showSuggestions?: boolean;
  showQuickAccess?: boolean;
}

export const AdaptiveSidebar: React.FC<AdaptiveSidebarProps> = ({
  className,
  style,
  showSuggestions = true,
  showQuickAccess = true,
}) => {
  const {
    currentPath,
    isAdaptive,
    navigateTo,
    getSuggestions,
    dismissSuggestion,
    getQuickAccessItems,
    removeFromQuickAccess,
    getReorderedItems,
    setAdaptive,
    getFrequentItems,
    getRecentItems,
  } = useAdaptiveNav();

  const suggestions = getSuggestions(1);
  const quickAccess = getQuickAccessItems();
  const menuItems = isAdaptive ? getReorderedItems() : defaultNavItems;
  const frequentItems = getFrequentItems(3);
  const recentItems = getRecentItems(3);

  return (
    <nav className={className} style={{ ...styles.sidebar, ...style }}>
      <div style={styles.sidebarHeader}>
        <h1 style={styles.logo}>Quiz2Biz</h1>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <SuggestionBox
          suggestion={suggestions[0]}
          onAccept={() => navigateTo(suggestions[0].targetItem.path)}
          onDismiss={() => dismissSuggestion(suggestions[0].id)}
        />
      )}

      {showQuickAccess && quickAccess.length > 0 && (
        <div style={styles.navSection}>
          <p style={styles.sectionLabel}>Quick Access</p>
          {quickAccess.map((qa) => (
            <div
              key={qa.navItem.id}
              style={styles.quickAccessItem}
              onClick={() => navigateTo(qa.navItem.path)}
            >
              <span>{qa.navItem.icon}</span>
              <span>{qa.navItem.label}</span>
              {qa.pinned && (
                <span style={{ fontSize: '10px' }} aria-hidden="true">
                  📌
                </span>
              )}
              <button
                style={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromQuickAccess(qa.navItem.id);
                }}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {frequentItems.length > 0 && isAdaptive && (
        <div style={styles.navSection}>
          <p style={styles.sectionLabel}>Frequently Used</p>
          {frequentItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              isActive={currentPath === item.path}
              onClick={() => navigateTo(item.path)}
            />
          ))}
        </div>
      )}

      <div style={styles.navSection}>
        <p style={styles.sectionLabel}>Navigation</p>
        {menuItems.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isActive={currentPath === item.path}
            onClick={() => navigateTo(item.path)}
          />
        ))}
      </div>

      {recentItems.length > 0 && (
        <div style={styles.navSection}>
          <p style={styles.sectionLabel}>Recent</p>
          {recentItems.map((item) => (
            <NavItemComponent
              key={`recent-${item.id}`}
              item={item}
              isActive={currentPath === item.path}
              onClick={() => navigateTo(item.path)}
            />
          ))}
        </div>
      )}

      <div style={styles.footer}>
        <label style={styles.adaptiveToggle}>
          <input
            type="checkbox"
            checked={isAdaptive}
            onChange={(e) => setAdaptive(e.target.checked)}
          />
          Adaptive Navigation
        </label>
      </div>
    </nav>
  );
};

// Next Action Suggestion Component
export const NextActionSuggestion: React.FC = () => {
  const { predictNextAction, navigateTo } = useAdaptiveNav();
  const predictedItem = predictNextAction();

  if (!predictedItem) {
    return null;
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
      }}
      onClick={() => navigateTo(predictedItem.path)}
    >
      <span style={{ fontSize: '20px' }}>{predictedItem.icon}</span>
      <div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Suggested next</p>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e40af', margin: 0 }}>
          {predictedItem.label}
        </p>
      </div>
      <span style={{ marginLeft: 'auto', color: '#3b82f6' }}>→</span>
    </div>
  );
};

// Breadcrumb Component with Adaptive Suggestions
export interface AdaptiveBreadcrumbProps {
  items: { label: string; path: string }[];
  className?: string;
}

export const AdaptiveBreadcrumb: React.FC<AdaptiveBreadcrumbProps> = ({ items, className }) => {
  const { navigateTo, getFrequentItems } = useAdaptiveNav();
  const frequentItems = getFrequentItems(3);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 0',
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && <span style={{ color: '#9ca3af' }}>/</span>}
          <button
            onClick={() => navigateTo(item.path)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: index === items.length - 1 ? '#1a1a2e' : '#6b7280',
              fontWeight: index === items.length - 1 ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}

      {frequentItems.length > 0 && (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {frequentItems.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.path)}
              style={{
                padding: '4px 12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
