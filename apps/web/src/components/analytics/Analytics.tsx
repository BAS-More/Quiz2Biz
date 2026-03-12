/**
 * Analytics.tsx - Usage Heatmaps, Analytics Dashboard, Session Replay
 * Sprint 36 Tasks 3-5: Complete analytics and session replay system
 *
 * Nielsen Heuristics Addressed:
 * - #1 Visibility: Show user behavior patterns
 * - #4 Consistency: Standard analytics patterns
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * User interaction event
 */
export interface InteractionEvent {
  id: string;
  type:
  | 'click'
  | 'scroll'
  | 'hover'
  | 'input'
  | 'navigation'
  | 'form_start'
  | 'form_complete'
  | 'form_abandon';
  timestamp: Date;
  sessionId: string;
  userId?: string;
  page: string;
  element?: {
    selector: string;
    text?: string;
    type?: string;
  };
  position?: { x: number; y: number };
  scrollDepth?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Page view event
 */
export interface PageViewEvent {
  id: string;
  sessionId: string;
  userId?: string;
  page: string;
  entryTime: Date;
  exitTime?: Date;
  duration?: number;
  referrer?: string;
  scrollDepthMax: number;
}

/**
 * User session
 */
export interface UserSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pages: PageViewEvent[];
  events: InteractionEvent[];
  device: DeviceInfo;
  isRecording: boolean;
}

/**
 * Device information
 */
export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  platform: string;
  language: string;
}

/**
 * Heatmap data point
 */
export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  element?: string;
}

/**
 * Heatmap configuration
 */
export interface HeatmapConfig {
  page: string;
  type: 'click' | 'scroll' | 'hover' | 'attention';
  radius: number;
  maxIntensity: number;
  minOpacity: number;
  gradient: Record<number, string>;
}

/**
 * Funnel step
 */
export interface FunnelStep {
  name: string;
  page?: string;
  eventType?: InteractionEvent['type'];
  count: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeOnStep: number;
}

/**
 * User journey
 */
export interface UserJourney {
  sessionId: string;
  userId?: string;
  steps: JourneyStep[];
  completed: boolean;
  duration: number;
}

/**
 * Journey step
 */
export interface JourneyStep {
  page: string;
  action?: string;
  timestamp: Date;
  duration: number;
}

/**
 * Analytics metrics
 */
export interface AnalyticsMetrics {
  totalSessions: number;
  totalPageViews: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  pagesPerSession: number;
  topPages: { page: string; views: number }[];
  topActions: { action: string; count: number }[];
  conversionRate: number;
}

/**
 * Session replay frame
 */
export interface ReplayFrame {
  timestamp: number;
  type: 'dom' | 'scroll' | 'click' | 'input' | 'resize';
  data: unknown;
}

/**
 * Analytics context value
 */
export interface AnalyticsContextValue {
  sessions: UserSession[];
  currentSession: UserSession | null;
  metrics: AnalyticsMetrics | null;
  isRecording: boolean;

  // Actions
  startSession: (userId?: string) => void;
  endSession: () => void;
  trackPageView: (page: string) => void;
  trackEvent: (event: Omit<InteractionEvent, 'id' | 'timestamp' | 'sessionId'>) => void;
  trackClick: (element: Element, x: number, y: number) => void;
  trackScroll: (depth: number) => void;
  trackFormStart: (formId: string) => void;
  trackFormComplete: (formId: string) => void;
  trackFormAbandon: (formId: string) => void;
  getHeatmapData: (page: string, type: HeatmapConfig['type']) => HeatmapPoint[];
  getFunnelData: (steps: string[]) => FunnelStep[];
  getUserJourneys: () => UserJourney[];
  getSessionReplay: (sessionId: string) => ReplayFrame[];
  calculateMetrics: () => AnalyticsMetrics;
  setRecording: (enabled: boolean) => void;
  exportData: () => string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  SESSIONS: 'quiz2biz_analytics_sessions',
  CURRENT_SESSION: 'quiz2biz_current_session',
};
let fallbackIdCounter = 0;

// ============================================================================
// Context
// ============================================================================

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export const useAnalytics = (): AnalyticsContextValue => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface AnalyticsProviderProps {
  children: React.ReactNode;
  autoTrack?: boolean;
  recordSessions?: boolean;
  privacyMode?: boolean;
  onEvent?: (event: InteractionEvent) => void;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  autoTrack = true,
  recordSessions = false,
  privacyMode = false,
  onEvent,
}) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [isRecording, setRecording] = useState(recordSessions);
  const replayFramesRef = useRef<Map<string, ReplayFrame[]>>(new Map());

  // Generate unique ID
  const generateId = (): string => {
    const cryptoObj = (typeof window !== 'undefined' && window.crypto) || undefined;

    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }

    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `${Date.now()}_${hex}`;
    }

    fallbackIdCounter += 1;
    const monotonicPart =
      typeof performance !== 'undefined'
        ? Math.floor(performance.now()).toString(36)
        : Date.now().toString(36);
    return `${Date.now()}_${monotonicPart}_${fallbackIdCounter.toString(36)}`;
  };

  // Get device info
  const getDeviceInfo = (): DeviceInfo => ({
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    platform: navigator.platform,
    language: navigator.language,
  });

  // Load sessions from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessions(parsed.slice(-100)); // Keep last 100 sessions
      }

      const savedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (savedCurrent) {
        const parsed = JSON.parse(savedCurrent);
        // Resume session if less than 30 minutes old
        const lastActivity = new Date(
          parsed.pages[parsed.pages.length - 1]?.exitTime || parsed.startTime,
        );
        if (Date.now() - lastActivity.getTime() < 30 * 60 * 1000) {
          setCurrentSession(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load analytics sessions:', error);
    }
  }, []);

  // Save sessions to storage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save current session
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(currentSession));
    }
  }, [currentSession]);

  // Start new session
  const startSession = useCallback(
    (userId?: string) => {
      const session: UserSession = {
        id: generateId(),
        userId: privacyMode ? undefined : userId,
        startTime: new Date(),
        pages: [],
        events: [],
        device: getDeviceInfo(),
        isRecording,
      };
      setCurrentSession(session);

      if (isRecording) {
        replayFramesRef.current.set(session.id, []);
      }
    },
    [isRecording, privacyMode],
  );

  // End session
  const endSession = useCallback(() => {
    if (currentSession) {
      const endedSession: UserSession = {
        ...currentSession,
        endTime: new Date(),
        duration: Date.now() - new Date(currentSession.startTime).getTime(),
      };
      setSessions((prev) => [...prev, endedSession]);
      setCurrentSession(null);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    }
  }, [currentSession]);

  // Track page view
  const trackPageView = useCallback(
    (page: string) => {
      if (!currentSession) {
        return;
      }

      // End previous page view
      const updatedPages = currentSession.pages.map((p, index) => {
        if (index === currentSession.pages.length - 1 && !p.exitTime) {
          return {
            ...p,
            exitTime: new Date(),
            duration: Date.now() - new Date(p.entryTime).getTime(),
          };
        }
        return p;
      });

      // Start new page view
      const pageView: PageViewEvent = {
        id: generateId(),
        sessionId: currentSession.id,
        userId: currentSession.userId,
        page,
        entryTime: new Date(),
        referrer: document.referrer,
        scrollDepthMax: 0,
      };

      setCurrentSession((prev) =>
        prev
          ? {
            ...prev,
            pages: [...updatedPages, pageView],
          }
          : null,
      );

      // Record replay frame
      if (isRecording && currentSession) {
        const frames = replayFramesRef.current.get(currentSession.id) || [];
        frames.push({
          timestamp: Date.now(),
          type: 'dom',
          data: { page, action: 'navigation' },
        });
      }
    },
    [currentSession, isRecording],
  );

  // Track generic event
  const trackEvent = useCallback(
    (event: Omit<InteractionEvent, 'id' | 'timestamp' | 'sessionId'>) => {
      if (!currentSession) {
        return;
      }

      const fullEvent: InteractionEvent = {
        ...event,
        id: generateId(),
        timestamp: new Date(),
        sessionId: currentSession.id,
      };

      setCurrentSession((prev) =>
        prev
          ? {
            ...prev,
            events: [...prev.events, fullEvent],
          }
          : null,
      );

      onEvent?.(fullEvent);
    },
    [currentSession, onEvent],
  );

  // Get element selector - define before trackClick
  const getElementSelector = (element: Element): string => {
    if (element.id) {
      return `#${element.id}`;
    }

    const classes = Array.from(element.classList).slice(0, 3).join('.');
    if (classes) {
      return `${element.tagName.toLowerCase()}.${classes}`;
    }

    return element.tagName.toLowerCase();
  };

  // Track click
  const trackClick = useCallback(
    (element: Element, x: number, y: number) => {
      const selector = getElementSelector(element);
      trackEvent({
        type: 'click',
        page: window.location.pathname,
        element: {
          selector,
          text: element.textContent?.slice(0, 50) || undefined,
          type: element.tagName.toLowerCase(),
        },
        position: { x, y },
      });
    },
    [trackEvent],
  );

  // Track scroll
  const trackScroll = useCallback(
    (depth: number) => {
      if (!currentSession) {
        return;
      }

      // Update max scroll depth for current page
      setCurrentSession((prev) => {
        if (!prev || prev.pages.length === 0) {
          return prev;
        }

        const pages = [...prev.pages];
        const lastPage = pages[pages.length - 1];
        if (depth > lastPage.scrollDepthMax) {
          pages[pages.length - 1] = { ...lastPage, scrollDepthMax: depth };
        }

        return { ...prev, pages };
      });

      trackEvent({
        type: 'scroll',
        page: window.location.pathname,
        scrollDepth: depth,
      });
    },
    [currentSession, trackEvent],
  );

  // Track form events
  const trackFormStart = useCallback(
    (formId: string) => {
      trackEvent({
        type: 'form_start',
        page: window.location.pathname,
        metadata: { formId },
      });
    },
    [trackEvent],
  );

  const trackFormComplete = useCallback(
    (formId: string) => {
      trackEvent({
        type: 'form_complete',
        page: window.location.pathname,
        metadata: { formId },
      });
    },
    [trackEvent],
  );

  const trackFormAbandon = useCallback(
    (formId: string) => {
      trackEvent({
        type: 'form_abandon',
        page: window.location.pathname,
        metadata: { formId },
      });
    },
    [trackEvent],
  );

  // Auto-track setup
  useEffect(() => {
    if (!autoTrack) {
      return;
    }

    // Auto-start session
    if (!currentSession) {
      startSession();
    }

    // Track initial page view
    trackPageView(window.location.pathname);

    // Click tracking
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target) {
        trackClick(target, e.clientX, e.clientY);
      }
    };

    // Scroll tracking (throttled)
    let lastScrollTime = 0;
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime < 500) {
        return;
      }
      lastScrollTime = now;

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const depth = scrollHeight > 0 ? Math.round((window.scrollY / scrollHeight) * 100) : 0;
      trackScroll(depth);
    };

    // Page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left page
        trackEvent({
          type: 'navigation',
          page: window.location.pathname,
          metadata: { action: 'blur' },
        });
      } else {
        // User returned
        trackEvent({
          type: 'navigation',
          page: window.location.pathname,
          metadata: { action: 'focus' },
        });
      }
    };

    // Unload tracking
    const handleUnload = () => {
      endSession();
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [
    autoTrack,
    currentSession,
    startSession,
    trackPageView,
    trackClick,
    trackScroll,
    trackEvent,
    endSession,
  ]);

  // Get heatmap data
  const getHeatmapData = useCallback(
    (page: string, type: HeatmapConfig['type']): HeatmapPoint[] => {
      const points: Map<string, HeatmapPoint> = new Map();

      const allEvents = [...sessions.flatMap((s) => s.events), ...(currentSession?.events || [])];

      allEvents
        .filter((e) => e.page === page && (type === 'click' ? e.type === 'click' : true))
        .forEach((event) => {
          if (event.position) {
            const key = `${Math.round(event.position.x / 10) * 10}_${Math.round(event.position.y / 10) * 10}`;
            const existing = points.get(key);
            if (existing) {
              existing.value++;
            } else {
              points.set(key, {
                x: event.position.x,
                y: event.position.y,
                value: 1,
                element: event.element?.selector,
              });
            }
          }
        });

      return Array.from(points.values());
    },
    [sessions, currentSession],
  );

  // Get funnel data
  const getFunnelData = useCallback(
    (steps: string[]): FunnelStep[] => {
      const allSessions = [...sessions, currentSession].filter(Boolean) as UserSession[];

      return steps.map((step, index) => {
        const sessionsAtStep = allSessions.filter((session) =>
          session.pages.some((p) => p.page === step),
        );

        const count = sessionsAtStep.length;
        const prevCount =
          index === 0
            ? allSessions.length
            : allSessions.filter((s) => s.pages.some((p) => p.page === steps[index - 1])).length;

        const conversionRate = prevCount > 0 ? count / prevCount : 0;
        const dropOffRate = 1 - conversionRate;

        const avgTime =
          sessionsAtStep.reduce((sum, session) => {
            const pageView = session.pages.find((p) => p.page === step);
            return sum + (pageView?.duration || 0);
          }, 0) / (count || 1);

        return {
          name: step,
          page: step,
          count,
          conversionRate,
          dropOffRate,
          avgTimeOnStep: avgTime,
        };
      });
    },
    [sessions, currentSession],
  );

  // Get user journeys
  const getUserJourneys = useCallback((): UserJourney[] => {
    const allSessions = [...sessions, currentSession].filter(Boolean) as UserSession[];

    return allSessions.map((session) => ({
      sessionId: session.id,
      userId: session.userId,
      steps: session.pages.map((p) => ({
        page: p.page,
        timestamp: new Date(p.entryTime),
        duration: p.duration || 0,
      })),
      completed: session.endTime !== undefined,
      duration: session.duration || Date.now() - new Date(session.startTime).getTime(),
    }));
  }, [sessions, currentSession]);

  // Get session replay
  const getSessionReplay = useCallback((sessionId: string): ReplayFrame[] => {
    return replayFramesRef.current.get(sessionId) || [];
  }, []);

  // Calculate metrics
  const calculateMetrics = useCallback((): AnalyticsMetrics => {
    const allSessions = [...sessions, currentSession].filter(Boolean) as UserSession[];

    const totalSessions = allSessions.length;
    const totalPageViews = allSessions.reduce((sum, s) => sum + s.pages.length, 0);
    const uniqueUsers = new Set(allSessions.map((s) => s.userId).filter(Boolean)).size;

    const avgSessionDuration =
      allSessions.reduce(
        (sum, s) => sum + (s.duration || Date.now() - new Date(s.startTime).getTime()),
        0,
      ) / (totalSessions || 1);

    const bouncedSessions = allSessions.filter((s) => s.pages.length === 1).length;
    const bounceRate = totalSessions > 0 ? bouncedSessions / totalSessions : 0;

    const pagesPerSession = totalSessions > 0 ? totalPageViews / totalSessions : 0;

    // Top pages
    const pageCounts: Record<string, number> = {};
    allSessions.forEach((s) => {
      s.pages.forEach((p) => {
        pageCounts[p.page] = (pageCounts[p.page] || 0) + 1;
      });
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    // Top actions
    const actionCounts: Record<string, number> = {};
    allSessions.forEach((s) => {
      s.events.forEach((e) => {
        if (e.element?.selector) {
          actionCounts[e.element.selector] = (actionCounts[e.element.selector] || 0) + 1;
        }
      });
    });
    const topActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // Conversion rate (sessions that reached a goal page)
    const goalPages = ['/complete', '/success', '/thank-you'];
    const completedSessions = allSessions.filter((s) =>
      s.pages.some((p) => goalPages.some((g) => p.page.includes(g))),
    ).length;
    const conversionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

    return {
      totalSessions,
      totalPageViews,
      uniqueUsers,
      avgSessionDuration,
      bounceRate,
      pagesPerSession,
      topPages,
      topActions,
      conversionRate,
    };
  }, [sessions, currentSession]);

  // Export data
  const exportData = useCallback((): string => {
    return JSON.stringify(
      {
        sessions: [...sessions, currentSession].filter(Boolean),
        metrics: calculateMetrics(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }, [sessions, currentSession, calculateMetrics]);

  const metrics = useMemo(() => calculateMetrics(), [calculateMetrics]);

  const value: AnalyticsContextValue = {
    sessions,
    currentSession,
    metrics,
    isRecording,
    startSession,
    endSession,
    trackPageView,
    trackEvent,
    trackClick,
    trackScroll,
    trackFormStart,
    trackFormComplete,
    trackFormAbandon,
    getHeatmapData,
    getFunnelData,
    getUserJourneys,
    getSessionReplay,
    calculateMetrics,
    setRecording,
    exportData,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  dashboard: 'p-6 bg-surface-100 min-h-screen',
  dashboardHeader: 'mb-6',
  dashboardTitle: 'text-2xl font-bold text-surface-800 m-0',
  metricsGrid: 'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6',
  metricCard: 'bg-surface-50 p-5 rounded-xl shadow-card',
  metricValue: 'text-[32px] font-bold text-surface-800 mb-1',
  metricLabel: 'text-sm text-surface-500',
  metricChange: 'text-xs mt-2',
  metricChangePositive: 'text-success-500',
  metricChangeNegative: 'text-danger-500',
  section: 'bg-surface-50 rounded-xl p-5 mb-6 shadow-card',
  sectionTitle: 'text-lg font-semibold text-surface-800 mb-4',
  tableContainer: 'overflow-x-auto',
  table: 'w-full border-collapse',
  tableHeader: 'text-left p-3 border-b-2 border-surface-200 text-xs font-semibold text-surface-500 uppercase',
  tableCell: 'p-3 border-b border-surface-200 text-sm text-surface-800',
  funnelContainer: 'flex items-end justify-around h-[200px] py-5',
  funnelStep: 'flex flex-col items-center flex-1',
  funnelBar: 'w-4/5 bg-brand-500 rounded-t transition-[height] duration-300 ease-in-out',
  funnelLabel: 'mt-2 text-xs text-surface-500 text-center',
  funnelValue: 'text-base font-semibold text-surface-800',
  funnelDropoff: 'text-[11px] text-danger-500 mt-1',
  heatmapContainer: 'relative w-full h-[400px] bg-surface-200 rounded-lg overflow-hidden',
  heatmapCanvas: 'absolute top-0 left-0 w-full h-full',
  heatmapControls: 'flex gap-2 mb-3',
  heatmapButton: 'px-4 py-2 text-[13px] border border-surface-200 rounded-md bg-surface-50 cursor-pointer transition-all duration-200',
  heatmapButtonActive: 'bg-brand-500 text-white border-brand-500',
  journeyList: 'flex flex-col gap-3 max-h-[400px] overflow-y-auto',
  journeyItem: 'flex items-center gap-2 p-3 bg-surface-100 rounded-lg',
  journeyStep: 'flex items-center gap-1 text-xs text-surface-500',
  journeyArrow: 'text-surface-400',
  journeyPage: 'px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-[11px] font-medium',
  replayContainer: 'relative bg-surface-900 rounded-lg overflow-hidden',
  replayControls: 'flex items-center gap-3 p-3 bg-surface-800',
  replayButton: 'px-4 py-2 text-sm bg-brand-500 text-white border-none rounded-md cursor-pointer',
  replayProgress: 'flex-1 h-1 bg-surface-700 rounded-sm overflow-hidden',
  replayProgressBar: 'h-full bg-brand-500 transition-[width] duration-100 ease-linear',
  replayTime: 'text-xs text-surface-400 font-mono',
  exportButton: 'px-5 py-2.5 text-sm bg-surface-50 text-surface-800 border border-surface-200 rounded-lg cursor-pointer font-medium',
};

// ============================================================================
// UI Components
// ============================================================================

/**
 * Metric Card Component
 */
interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  format?: 'number' | 'percent' | 'duration';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  format = 'number',
}) => {
  const formatValue = () => {
    if (format === 'percent') {
      return `${(Number(value) * 100).toFixed(1)}%`;
    }
    if (format === 'duration') {
      const seconds = Math.round(Number(value) / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    return typeof value === 'number' ? value.toLocaleString() : value;
  };

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricValue}>{formatValue()}</div>
      <div className={styles.metricLabel}>{label}</div>
      {change !== undefined && (
        <div
          className={`${styles.metricChange} ${change >= 0 ? styles.metricChangePositive : styles.metricChangeNegative}`}
        >
          {change >= 0 ? '↑' : '↓'} {Math.abs(change * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

/**
 * Funnel Chart Component
 */
interface FunnelChartProps {
  steps: FunnelStep[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ steps }) => {
  const maxCount = Math.max(...steps.map((s) => s.count));

  return (
    <div className={styles.funnelContainer}>
      {steps.map((step, index) => {
        const height = maxCount > 0 ? (step.count / maxCount) * 160 : 0;
        return (
          <div key={step.name} className={styles.funnelStep}>
            <div className={styles.funnelValue}>{step.count.toLocaleString()}</div>
            <div className={styles.funnelBar} style={{ height: `${height}px` }} />
            <div className={styles.funnelLabel}>{step.name}</div>
            {index > 0 && step.dropOffRate > 0 && (
              <div className={styles.funnelDropoff}>-{(step.dropOffRate * 100).toFixed(1)}% drop</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Top Pages Table
 */
interface TopPagesTableProps {
  pages: { page: string; views: number }[];
}

export const TopPagesTable: React.FC<TopPagesTableProps> = ({ pages }) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHeader}>Page</th>
            <th className={`${styles.tableHeader} text-right`}>Views</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page, index) => (
            <tr key={index}>
              <td className={styles.tableCell}>{page.page}</td>
              <td className={`${styles.tableCell} text-right`}>
                {page.views.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * User Journeys Component
 */
interface UserJourneysProps {
  journeys: UserJourney[];
  limit?: number;
}

export const UserJourneys: React.FC<UserJourneysProps> = ({ journeys, limit = 10 }) => {
  const displayJourneys = journeys.slice(0, limit);

  return (
    <div className={styles.journeyList}>
      {displayJourneys.map((journey) => (
        <div key={journey.sessionId} className={styles.journeyItem}>
          {journey.steps.map((step, index) => (
            <div key={index} className={styles.journeyStep}>
              <span className={styles.journeyPage}>{step.page}</span>
              {index < journey.steps.length - 1 && <span className={styles.journeyArrow}>→</span>}
            </div>
          ))}
          <span className="ml-auto text-[11px] text-surface-400">
            {Math.round(journey.duration / 1000)}s
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Analytics Dashboard Component
 */
export const AnalyticsDashboard: React.FC = () => {
  const { metrics, getFunnelData, getUserJourneys, exportData } = useAnalytics();
  const [funnelSteps] = useState(['/start', '/questionnaire', '/review', '/complete']);

  const funnelData = getFunnelData(funnelSteps);
  const journeys = getUserJourneys();

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!metrics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <div className="flex justify-between items-center">
          <h1 className={styles.dashboardTitle}>Analytics Dashboard</h1>
          <button className={styles.exportButton} onClick={handleExport}>
            Export Data
          </button>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard label="Total Sessions" value={metrics.totalSessions} />
        <MetricCard label="Page Views" value={metrics.totalPageViews} />
        <MetricCard label="Unique Users" value={metrics.uniqueUsers} />
        <MetricCard label="Avg Session" value={metrics.avgSessionDuration} format="duration" />
        <MetricCard label="Bounce Rate" value={metrics.bounceRate} format="percent" />
        <MetricCard label="Conversion Rate" value={metrics.conversionRate} format="percent" />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Conversion Funnel</h2>
        <FunnelChart steps={funnelData} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Top Pages</h2>
          <TopPagesTable pages={metrics.topPages} />
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>User Journeys</h2>
          <UserJourneys journeys={journeys} />
        </div>
      </div>
    </div>
  );
};

/**
 * Heatmap Visualization
 */
interface HeatmapVisualizationProps {
  page: string;
  width?: number;
  height?: number;
}

export const HeatmapVisualization: React.FC<HeatmapVisualizationProps> = ({
  page,
  width = 800,
  height = 600,
}) => {
  const { getHeatmapData } = useAnalytics();
  const [type, setType] = useState<HeatmapConfig['type']>('click');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = getHeatmapData(page, type);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw heatmap points
    data.forEach((point) => {
      const intensity = Math.min(point.value / 10, 1);
      const radius = 20 + intensity * 30;

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);

      gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 0, ${intensity * 0.5})`);
      gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  }, [data, width, height]);

  return (
    <div>
      <div className={styles.heatmapControls}>
        {(['click', 'scroll', 'hover'] as const).map((t) => (
          <button
            key={t}
            className={`${styles.heatmapButton} ${type === t ? styles.heatmapButtonActive : ''}`}
            onClick={() => setType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}s
          </button>
        ))}
      </div>
      <div className={styles.heatmapContainer} style={{ width, height }}>
        <canvas ref={canvasRef} width={width} height={height} className={styles.heatmapCanvas} />
      </div>
    </div>
  );
};

/**
 * Session Replay Player
 */
interface SessionReplayPlayerProps {
  sessionId: string;
}

export const SessionReplayPlayer: React.FC<SessionReplayPlayerProps> = ({ sessionId }) => {
  const { getSessionReplay, sessions } = useAnalytics();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const frames = getSessionReplay(sessionId);
  const session = sessions.find((s) => s.id === sessionId);
  const duration = session?.duration || 0;

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 100;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        setProgress((next / duration) * 100);
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, duration, frames.length]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.replayContainer}>
      <div className="p-[200px] text-center text-white">
        Session Replay View
        <br />
        <small>Frames: {frames.length}</small>
      </div>
      <div className={styles.replayControls}>
        <button className={styles.replayButton} onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <div className={styles.replayProgress}>
          <div className={styles.replayProgressBar} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.replayTime}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for tracking page views
 */
export function usePageTracking() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(window.location.pathname);
  }, [trackPageView]);
}

/**
 * Hook for tracking form interactions
 */
export function useFormTracking(formId: string) {
  const { trackFormStart, trackFormComplete, trackFormAbandon } = useAnalytics();
  const hasStarted = useRef(false);

  const onFormStart = useCallback(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      trackFormStart(formId);
    }
  }, [formId, trackFormStart]);

  const onFormComplete = useCallback(() => {
    trackFormComplete(formId);
    hasStarted.current = false;
  }, [formId, trackFormComplete]);

  // Track abandon on unmount
  useEffect(() => {
    return () => {
      if (hasStarted.current) {
        trackFormAbandon(formId);
      }
    };
  }, [formId, trackFormAbandon]);

  return { onFormStart, onFormComplete };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  AnalyticsProvider,
  useAnalytics,
  AnalyticsDashboard,
  HeatmapVisualization,
  SessionReplayPlayer,
  MetricCard,
  FunnelChart,
  TopPagesTable,
  UserJourneys,
  usePageTracking,
  useFormTracking,
};
