/**
 * Google Analytics GA4 Configuration
 *
 * Provides user analytics tracking including page views, custom events,
 * user properties, and conversion goals.
 */
import ReactGA from 'react-ga4';

// =============================================================================
// Configuration
// =============================================================================

export interface AnalyticsConfig {
  measurementId: string;
  debugMode: boolean;
  sendPageViews: boolean;
  anonymizeIp: boolean;
  cookieFlags: string;
}

const getAnalyticsConfig = (): AnalyticsConfig => {
  const isProd = import.meta.env.PROD;

  return {
    measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
    debugMode: !isProd,
    sendPageViews: true,
    anonymizeIp: true,
    cookieFlags: 'SameSite=None; Secure',
  };
};

// =============================================================================
// Initialization
// =============================================================================

let isInitialized = false;

/**
 * Initialize Google Analytics GA4
 * Call this early in app initialization
 */
export function initializeAnalytics(): void {
  const config = getAnalyticsConfig();

  if (isInitialized) {
    console.log('[Analytics] Already initialized');
    return;
  }

  if (!config.measurementId) {
    console.log('[Analytics] No measurement ID configured, skipping initialization');
    return;
  }

  try {
    ReactGA.initialize(config.measurementId, {
      gaOptions: {
        anonymize_ip: config.anonymizeIp,
        send_page_view: config.sendPageViews,
      },
      gtagOptions: {
        debug_mode: config.debugMode,
      },
    });

    isInitialized = true;
    console.log(`[Analytics] Initialized with measurement ID: ${config.measurementId}`);
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Check if analytics is initialized and enabled
 */
export function isAnalyticsEnabled(): boolean {
  return isInitialized;
}

// =============================================================================
// Page View Tracking
// =============================================================================

/**
 * Track a page view
 * @param path - The page path (e.g., '/dashboard', '/questionnaire/123')
 * @param title - Optional page title
 */
export function trackPageView(path: string, title?: string): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.send({
    hitType: 'pageview',
    page: path,
    title: title || document.title,
  });
}

/**
 * React Router integration - track page views on route change
 * Use this with useEffect in your root component or router
 */
export function trackRouteChange(location: { pathname: string; search: string }): void {
  trackPageView(location.pathname + location.search);
}

// =============================================================================
// Event Tracking
// =============================================================================

export interface EventParams {
  category: string;
  action: string;
  label?: string;
  value?: number;
  nonInteraction?: boolean;
  transport?: 'beacon' | 'xhr' | 'image';
}

/**
 * Track a custom event
 */
export function trackEvent(params: EventParams): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.event({
    category: params.category,
    action: params.action,
    label: params.label,
    value: params.value,
    nonInteraction: params.nonInteraction,
    transport: params.transport,
  });
}

/**
 * Track GA4 event with custom parameters
 */
export function trackGA4Event(eventName: string, params?: Record<string, unknown>): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.event(eventName, params);
}

// =============================================================================
// User Identity & Properties
// =============================================================================

/**
 * Set the user ID for cross-device tracking
 * Call this after user authentication
 */
export function setUserId(userId: string): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.set({ userId });
}

/**
 * Clear user ID on logout
 */
export function clearUserId(): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.set({ userId: undefined });
}

/**
 * Set user properties (dimensions)
 */
export function setUserProperties(properties: Record<string, string | number | boolean>): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.gtag('set', 'user_properties', properties);
}

// =============================================================================
// Quiz2Build Specific Events
// =============================================================================

// Authentication Events
export const AuthEvents = {
  login: (method: string = 'email') => {
    trackGA4Event('login', { method });
  },

  logout: () => {
    trackGA4Event('logout');
    clearUserId();
  },

  signUp: (method: string = 'email') => {
    trackGA4Event('sign_up', { method });
  },

  passwordReset: () => {
    trackGA4Event('password_reset');
  },
};

// Questionnaire Events
export const QuestionnaireEvents = {
  started: (questionnaireId: string, questionnaireName: string) => {
    trackGA4Event('questionnaire_started', {
      questionnaire_id: questionnaireId,
      questionnaire_name: questionnaireName,
    });
  },

  completed: (
    questionnaireId: string,
    questionnaireName: string,
    completionTimeSeconds: number,
  ) => {
    trackGA4Event('questionnaire_completed', {
      questionnaire_id: questionnaireId,
      questionnaire_name: questionnaireName,
      completion_time_seconds: completionTimeSeconds,
    });
  },

  abandoned: (questionnaireId: string, progress: number) => {
    trackGA4Event('questionnaire_abandoned', {
      questionnaire_id: questionnaireId,
      progress_percentage: progress,
    });
  },

  questionAnswered: (questionId: string, questionType: string, dimensionName: string) => {
    trackGA4Event('question_answered', {
      question_id: questionId,
      question_type: questionType,
      dimension_name: dimensionName,
    });
  },

  sectionCompleted: (sectionName: string, questionsInSection: number) => {
    trackGA4Event('section_completed', {
      section_name: sectionName,
      questions_count: questionsInSection,
    });
  },
};

// Score Events
export const ScoreEvents = {
  viewed: (score: number) => {
    trackGA4Event('score_viewed', {
      readiness_score: score,
    });
  },

  heatmapViewed: (dimensionsCount: number) => {
    trackGA4Event('heatmap_viewed', {
      dimensions_count: dimensionsCount,
    });
  },

  dimensionDrilldown: (dimensionName: string) => {
    trackGA4Event('dimension_drilldown', {
      dimension_name: dimensionName,
    });
  },
};

// Document Events
export const DocumentEvents = {
  generated: (documentType: string, format: string) => {
    trackGA4Event('document_generated', {
      document_type: documentType,
      format: format,
    });
  },

  downloaded: (documentType: string, format: string) => {
    trackGA4Event('document_downloaded', {
      document_type: documentType,
      format: format,
    });
  },

  deliverablesPackDownloaded: (documentsIncluded: number) => {
    trackGA4Event('deliverables_pack_downloaded', {
      documents_included: documentsIncluded,
    });
  },
};

// Payment Events
export const PaymentEvents = {
  viewedPricing: () => {
    trackGA4Event('view_item_list', {
      item_list_name: 'Subscription Tiers',
    });
  },

  selectTier: (tierName: string, price: number) => {
    trackGA4Event('select_item', {
      item_name: tierName,
      price: price,
      currency: 'USD',
    });
  },

  beginCheckout: (tierName: string, price: number) => {
    trackGA4Event('begin_checkout', {
      value: price,
      currency: 'USD',
      items: [{ item_name: tierName, price }],
    });
  },

  purchase: (tierName: string, transactionId: string, price: number) => {
    trackGA4Event('purchase', {
      transaction_id: transactionId,
      value: price,
      currency: 'USD',
      items: [{ item_name: tierName, price }],
    });
  },

  subscriptionCancelled: (tierName: string) => {
    trackGA4Event('subscription_cancelled', {
      tier_name: tierName,
    });
  },
};

// Evidence Events
export const EvidenceEvents = {
  uploaded: (fileType: string, fileSizeKB: number) => {
    trackGA4Event('evidence_uploaded', {
      file_type: fileType,
      file_size_kb: fileSizeKB,
    });
  },

  verified: (evidenceId: string, result: 'approved' | 'rejected') => {
    trackGA4Event('evidence_verified', {
      evidence_id: evidenceId,
      verification_result: result,
    });
  },
};

// Navigation & UI Events
export const UIEvents = {
  navigationClick: (navItem: string) => {
    trackGA4Event('navigation_click', {
      nav_item: navItem,
    });
  },

  searchPerformed: (searchTerm: string) => {
    trackGA4Event('search', {
      search_term: searchTerm,
    });
  },

  helpOpened: (helpSection?: string) => {
    trackGA4Event('help_opened', {
      help_section: helpSection || 'general',
    });
  },

  errorDisplayed: (errorCode: string, errorMessage: string) => {
    trackGA4Event('error_displayed', {
      error_code: errorCode,
      error_message: errorMessage.substring(0, 100),
    });
  },
};

// =============================================================================
// Conversion Goals
// =============================================================================

export const ConversionGoals = {
  // Goal: User completes first questionnaire
  firstQuestionnaireComplete: () => {
    trackGA4Event('conversion_first_questionnaire');
  },

  // Goal: User achieves readiness score >= 80%
  highReadinessAchieved: (score: number) => {
    trackGA4Event('conversion_high_readiness', {
      readiness_score: score,
    });
  },

  // Goal: User upgrades from free tier
  tierUpgrade: (fromTier: string, toTier: string) => {
    trackGA4Event('conversion_tier_upgrade', {
      from_tier: fromTier,
      to_tier: toTier,
    });
  },

  // Goal: User generates deliverables pack
  deliverablesGenerated: () => {
    trackGA4Event('conversion_deliverables_generated');
  },

  // Goal: User invites team member
  teamMemberInvited: () => {
    trackGA4Event('conversion_team_invited');
  },
};

// =============================================================================
// User Timing
// =============================================================================

/**
 * Track timing of a specific action
 */
export function trackTiming(
  category: string,
  variable: string,
  valueMs: number,
  label?: string,
): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.gtag('event', 'timing_complete', {
    name: variable,
    value: valueMs,
    event_category: category,
    event_label: label,
  });
}

/**
 * Create a timing tracker helper
 */
export function createTimingTracker(category: string) {
  const startTime = performance.now();

  return {
    stop: (variable: string, label?: string) => {
      const duration = Math.round(performance.now() - startTime);
      trackTiming(category, variable, duration, label);
      return duration;
    },
  };
}

// =============================================================================
// Exception Tracking
// =============================================================================

/**
 * Track an exception/error
 */
export function trackException(description: string, fatal: boolean = false): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.gtag('event', 'exception', {
    description: description.substring(0, 150),
    fatal,
  });
}

// =============================================================================
// Consent Management
// =============================================================================

/**
 * Update consent status (for GDPR compliance)
 */
export function updateConsent(
  analyticsConsent: 'granted' | 'denied',
  adConsent: 'granted' | 'denied' = 'denied',
): void {
  if (!isInitialized) {
    return;
  }

  ReactGA.gtag('consent', 'update', {
    analytics_storage: analyticsConsent,
    ad_storage: adConsent,
  });
}

/**
 * Opt out of analytics tracking
 */
export function optOut(): void {
  if (typeof window !== 'undefined') {
    window[`ga-disable-${getAnalyticsConfig().measurementId}`] = true;
  }
}

/**
 * Opt back into analytics tracking
 */
export function optIn(): void {
  if (typeof window !== 'undefined') {
    window[`ga-disable-${getAnalyticsConfig().measurementId}`] = false;
  }
}

// =============================================================================
// Debug Helpers
// =============================================================================

/**
 * Log analytics event (for debugging)
 */
export function debugLogEvent(eventName: string, params?: Record<string, unknown>): void {
  if (getAnalyticsConfig().debugMode) {
    console.log(`[Analytics Event] ${eventName}`, params);
  }
}

// =============================================================================
// React Hook for Analytics
// =============================================================================

/**
 * Hook to track page views automatically
 * Use this in your root App component with React Router
 *
 * Example:
 * ```tsx
 * import { useAnalyticsPageView } from './analytics.config';
 * import { useLocation } from 'react-router-dom';
 *
 * function App() {
 *   const location = useLocation();
 *   useAnalyticsPageView(location);
 *   return <Routes>...</Routes>;
 * }
 * ```
 */
export function useAnalyticsPageView(location: { pathname: string; search: string }): void {
  // This is a simple implementation - in your actual app,
  // wrap this in useEffect:
  // useEffect(() => { trackRouteChange(location); }, [location]);
  trackRouteChange(location);
}

// Declare the window property for opt-out
declare global {
  interface Window {
    [key: string]: boolean | undefined;
  }
}
