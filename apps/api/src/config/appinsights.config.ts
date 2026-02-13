/**
 * Azure Application Insights Configuration
 *
 * Provides Application Performance Monitoring (APM) for production environments.
 * Tracks requests, dependencies, exceptions, and custom metrics.
 */
import * as appInsights from 'applicationinsights';

// =============================================================================
// Configuration Interface
// =============================================================================

export interface AppInsightsConfig {
  connectionString: string;
  instrumentationKey?: string;
  cloudRole: string;
  cloudRoleInstance: string;
  samplingPercentage: number;
  enableAutoCollect: {
    requests: boolean;
    performance: boolean;
    exceptions: boolean;
    dependencies: boolean;
    console: boolean;
  };
}

// =============================================================================
// Configuration Factory
// =============================================================================

export function getAppInsightsConfig(): AppInsightsConfig {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '',
    instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY || '',
    cloudRole: process.env.AZURE_CLOUD_ROLE || 'quiz-to-build-api',
    cloudRoleInstance: process.env.HOSTNAME || 'local-dev',
    samplingPercentage: isProd ? 100 : 50, // Sample all requests in prod
    enableAutoCollect: {
      requests: true,
      performance: true,
      exceptions: true,
      dependencies: true,
      console: !isProd, // Only collect console logs in dev
    },
  };
}

// =============================================================================
// Initialization
// =============================================================================

let isInitialized = false;
let client: appInsights.TelemetryClient | null = null;

/**
 * Initialize Azure Application Insights
 * Must be called before any other imports to properly instrument the app
 */
export function initializeAppInsights(): void {
  const config = getAppInsightsConfig();

  // Skip if already initialized or no connection string
  if (isInitialized) {
    console.log('Application Insights already initialized');
    return;
  }

  if (!config.connectionString && !config.instrumentationKey) {
    console.log(
      'Application Insights not configured (no connection string or instrumentation key)',
    );
    return;
  }

  try {
    // Initialize with connection string (preferred) or instrumentation key
    if (config.connectionString) {
      appInsights.setup(config.connectionString);
    } else if (config.instrumentationKey) {
      appInsights.setup(config.instrumentationKey);
    }

    // Configure auto-collection
    appInsights.defaultClient.config.samplingPercentage = config.samplingPercentage;

    // Set cloud role for application map
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] =
      config.cloudRole;
    appInsights.defaultClient.context.tags[
      appInsights.defaultClient.context.keys.cloudRoleInstance
    ] = config.cloudRoleInstance;

    // Configure auto-collection features
    appInsights.defaultClient.config.samplingPercentage = config.samplingPercentage;

    // Start the SDK
    appInsights.start();

    client = appInsights.defaultClient;
    isInitialized = true;

    console.log(
      `Application Insights initialized: role=${config.cloudRole}, instance=${config.cloudRoleInstance}`,
    );
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error);
  }
}

/**
 * Get the Application Insights telemetry client
 */
export function getClient(): appInsights.TelemetryClient | null {
  return client;
}

// =============================================================================
// Custom Metrics
// =============================================================================

export interface CustomMetricOptions {
  name: string;
  value: number;
  properties?: Record<string, string>;
  count?: number;
  min?: number;
  max?: number;
  stdDev?: number;
}

/**
 * Track a custom metric
 */
export function trackMetric(options: CustomMetricOptions): void {
  if (!client) {
    return;
  }

  client.trackMetric({
    name: options.name,
    value: options.value,
    properties: options.properties,
    count: options.count,
    min: options.min,
    max: options.max,
    stdDev: options.stdDev,
  });
}

/**
 * Track response time for an operation
 */
export function trackResponseTime(
  operationName: string,
  durationMs: number,
  success: boolean,
  properties?: Record<string, string>,
): void {
  trackMetric({
    name: `${operationName}_response_time`,
    value: durationMs,
    properties: {
      success: success.toString(),
      ...properties,
    },
  });
}

/**
 * Track questionnaire completion metrics
 */
export function trackQuestionnaireMetrics(
  sessionId: string,
  metrics: {
    questionsAnswered: number;
    totalQuestions: number;
    completionPercentage: number;
    timeSpentSeconds: number;
  },
): void {
  if (!client) {
    return;
  }

  trackMetric({
    name: 'questionnaire_completion_percentage',
    value: metrics.completionPercentage,
    properties: { sessionId },
  });

  trackMetric({
    name: 'questionnaire_questions_answered',
    value: metrics.questionsAnswered,
    properties: { sessionId },
  });

  trackMetric({
    name: 'questionnaire_time_spent_seconds',
    value: metrics.timeSpentSeconds,
    properties: { sessionId },
  });
}

/**
 * Track readiness score calculation
 */
export function trackReadinessScore(
  sessionId: string,
  score: number,
  dimensionScores: Record<string, number>,
): void {
  if (!client) {
    return;
  }

  trackMetric({
    name: 'readiness_score_overall',
    value: score,
    properties: { sessionId },
  });

  // Track individual dimension scores
  for (const [dimension, dimensionScore] of Object.entries(dimensionScores)) {
    trackMetric({
      name: `readiness_score_${dimension.toLowerCase().replace(/\s+/g, '_')}`,
      value: dimensionScore,
      properties: { sessionId },
    });
  }
}

// =============================================================================
// Custom Events
// =============================================================================

export interface CustomEventOptions {
  name: string;
  properties?: Record<string, string>;
  measurements?: Record<string, number>;
}

/**
 * Track a custom event
 */
export function trackEvent(options: CustomEventOptions): void {
  if (!client) {
    return;
  }

  client.trackEvent({
    name: options.name,
    properties: options.properties,
    measurements: options.measurements,
  });
}

/**
 * Track user authentication events
 */
export function trackAuthEvent(
  eventType: 'login' | 'logout' | 'register' | 'password_reset',
  userId?: string,
  method?: string,
): void {
  trackEvent({
    name: `auth_${eventType}`,
    properties: {
      userId: userId || 'anonymous',
      method: method || 'email',
    },
  });
}

/**
 * Track document generation events
 */
export function trackDocumentGeneration(
  documentType: string,
  sessionId: string,
  success: boolean,
  durationMs: number,
): void {
  trackEvent({
    name: 'document_generated',
    properties: {
      documentType,
      sessionId,
      success: success.toString(),
    },
    measurements: {
      durationMs,
    },
  });
}

/**
 * Track API endpoint usage
 */
export function trackEndpointUsage(
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number,
  userId?: string,
): void {
  trackEvent({
    name: 'api_request',
    properties: {
      endpoint,
      method,
      statusCode: statusCode.toString(),
      userId: userId || 'anonymous',
    },
    measurements: {
      durationMs,
    },
  });
}

// =============================================================================
// Exception Tracking
// =============================================================================

/**
 * Track an exception
 */
export function trackException(
  error: Error,
  properties?: Record<string, string>,
  measurements?: Record<string, number>,
): void {
  if (!client) {
    return;
  }

  client.trackException({
    exception: error,
    properties,
    measurements,
  });
}

/**
 * Track a handled exception (non-fatal)
 */
export function trackHandledException(error: Error, context: string, userId?: string): void {
  trackException(error, {
    context,
    userId: userId || 'anonymous',
    severity: 'warning',
  });
}

/**
 * Track a critical exception (requires immediate attention)
 */
export function trackCriticalException(
  error: Error,
  context: string,
  additionalData?: Record<string, string>,
): void {
  trackException(error, {
    context,
    severity: 'critical',
    ...additionalData,
  });
}

// =============================================================================
// Dependency Tracking
// =============================================================================

/**
 * Track an external dependency call (database, API, etc.)
 */
export function trackDependency(options: {
  name: string;
  data: string;
  dependencyTypeName: string;
  target: string;
  duration: number;
  success: boolean;
  resultCode?: string;
  properties?: Record<string, string>;
}): void {
  if (!client) {
    return;
  }

  client.trackDependency({
    name: options.name,
    data: options.data,
    dependencyTypeName: options.dependencyTypeName,
    target: options.target,
    duration: options.duration,
    success: options.success,
    resultCode: options.resultCode || (options.success ? '200' : '500'),
    properties: options.properties,
  });
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(
  queryName: string,
  durationMs: number,
  success: boolean,
  tableName?: string,
): void {
  trackDependency({
    name: queryName,
    data: queryName,
    dependencyTypeName: 'PostgreSQL',
    target: process.env.DATABASE_HOST || 'localhost',
    duration: durationMs,
    success,
    properties: tableName ? { tableName } : undefined,
  });
}

/**
 * Track external API call
 */
export function trackExternalApiCall(
  apiName: string,
  endpoint: string,
  durationMs: number,
  statusCode: number,
): void {
  trackDependency({
    name: apiName,
    data: endpoint,
    dependencyTypeName: 'HTTP',
    target: apiName,
    duration: durationMs,
    success: statusCode >= 200 && statusCode < 400,
    resultCode: statusCode.toString(),
  });
}

// =============================================================================
// Performance Counters
// =============================================================================

/**
 * Pre-defined performance metrics
 */
export const PerformanceMetrics = {
  // API Latency
  API_RESPONSE_TIME: 'api_response_time_ms',
  DATABASE_QUERY_TIME: 'database_query_time_ms',
  EXTERNAL_API_TIME: 'external_api_time_ms',

  // Throughput
  REQUESTS_PER_SECOND: 'requests_per_second',
  CONCURRENT_USERS: 'concurrent_users',

  // Questionnaire
  QUESTIONS_ANSWERED: 'questions_answered_total',
  SESSIONS_ACTIVE: 'sessions_active',
  COMPLETION_RATE: 'questionnaire_completion_rate',

  // Scoring
  SCORE_CALCULATION_TIME: 'score_calculation_time_ms',
  AVERAGE_READINESS_SCORE: 'average_readiness_score',

  // Document Generation
  DOCUMENT_GENERATION_TIME: 'document_generation_time_ms',
  DOCUMENTS_GENERATED: 'documents_generated_total',
};

/**
 * Track standard performance metric
 */
export function trackPerformance(
  metricName: keyof typeof PerformanceMetrics,
  value: number,
  properties?: Record<string, string>,
): void {
  trackMetric({
    name: PerformanceMetrics[metricName],
    value,
    properties,
  });
}

// =============================================================================
// Availability Tracking
// =============================================================================

/**
 * Track an availability test result (health check)
 */
export function trackAvailability(
  testName: string,
  success: boolean,
  durationMs: number,
  runLocation?: string,
  message?: string,
): void {
  if (!client) {
    return;
  }

  client.trackAvailability({
    id: `${testName}-${Date.now()}`,
    name: testName,
    success,
    duration: durationMs,
    runLocation: runLocation || 'Azure',
    message: message || (success ? 'Available' : 'Unavailable'),
  });
}

// =============================================================================
// Flush & Shutdown
// =============================================================================

/**
 * Flush all pending telemetry
 */
export function flush(): void {
  if (client) {
    client.flush();
  }
}

/**
 * Gracefully shutdown Application Insights
 */
export async function shutdown(): Promise<void> {
  if (client) {
    client.flush();
    // Give time for telemetry to be sent
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Application Insights telemetry flushed');
  }
}

// =============================================================================
// NestJS Middleware Helper
// =============================================================================

/**
 * Create a request tracking middleware for NestJS
 */
export function createRequestTrackingMiddleware() {
  return (req: any, res: any, next: () => void) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const userId = req.user?.id;

      trackEndpointUsage(req.path, req.method, res.statusCode, durationMs, userId);

      // Track slow requests (>500ms)
      if (durationMs > 500) {
        trackEvent({
          name: 'slow_request',
          properties: {
            endpoint: req.path,
            method: req.method,
          },
          measurements: {
            durationMs,
          },
        });
      }
    });

    next();
  };
}
