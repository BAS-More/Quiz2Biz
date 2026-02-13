/**
 * Graceful Degradation Configuration
 *
 * Implements resilience patterns including:
 * - Circuit Breakers (with Hystrix-like patterns)
 * - Fallback Mechanisms
 * - Retry with Exponential Backoff
 * - Bulkhead Isolation
 * - Rate Limiting
 */

// =============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// =============================================================================

export interface CircuitBreakerConfig {
  name: string;
  enabled: boolean;
  thresholds: CircuitBreakerThresholds;
  timeouts: CircuitBreakerTimeouts;
  fallback?: FallbackConfig;
  monitoring: CircuitBreakerMonitoring;
}

export interface CircuitBreakerThresholds {
  failureRateThreshold: number; // Percentage (0-100)
  slowCallRateThreshold: number; // Percentage (0-100)
  slowCallDurationMs: number; // Calls slower than this are considered slow
  minimumNumberOfCalls: number; // Minimum calls before calculating failure rate
  permittedNumberOfCallsInHalfOpen: number; // Calls allowed in half-open state
}

export interface CircuitBreakerTimeouts {
  waitDurationInOpenStateMs: number; // How long to stay open before trying half-open
  recordingDurationMs: number; // Sliding window duration for recording metrics
}

export interface CircuitBreakerMonitoring {
  metricsEnabled: boolean;
  alertOnOpen: boolean;
  alertOnHalfOpen: boolean;
  notificationChannels: string[];
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  failureRate: number;
  slowCallRate: number;
  numberOfBufferedCalls: number;
  lastStateChangeTime: Date;
  lastFailureTime?: Date;
}

// =============================================================================
// DEFAULT CIRCUIT BREAKER CONFIGURATIONS
// =============================================================================

export function getCircuitBreakerConfigs(): Record<string, CircuitBreakerConfig> {
  return {
    // Database Circuit Breaker
    database: {
      name: 'database-circuit-breaker',
      enabled: true,
      thresholds: {
        failureRateThreshold: 50, // Open when 50% of calls fail
        slowCallRateThreshold: 80, // Open when 80% of calls are slow
        slowCallDurationMs: 5000, // 5 seconds is considered slow
        minimumNumberOfCalls: 10, // Need at least 10 calls to evaluate
        permittedNumberOfCallsInHalfOpen: 3, // Allow 3 test calls
      },
      timeouts: {
        waitDurationInOpenStateMs: 30000, // 30 seconds in open state
        recordingDurationMs: 60000, // 1 minute sliding window
      },
      fallback: {
        type: 'cache',
        cacheKey: 'database-fallback',
        ttlSeconds: 300,
        staleWhileRevalidate: true,
      },
      monitoring: {
        metricsEnabled: true,
        alertOnOpen: true,
        alertOnHalfOpen: true,
        notificationChannels: ['slack-alerts', 'pagerduty'],
      },
    },

    // External Payment API (Stripe)
    payment: {
      name: 'payment-circuit-breaker',
      enabled: true,
      thresholds: {
        failureRateThreshold: 25, // More sensitive for payments
        slowCallRateThreshold: 50,
        slowCallDurationMs: 10000, // 10 seconds timeout for payment APIs
        minimumNumberOfCalls: 5,
        permittedNumberOfCallsInHalfOpen: 2,
      },
      timeouts: {
        waitDurationInOpenStateMs: 60000, // 1 minute before retry
        recordingDurationMs: 120000, // 2 minute window
      },
      fallback: {
        type: 'queue',
        queueName: 'payment-retry-queue',
        maxRetries: 3,
        retryDelayMs: 30000,
      },
      monitoring: {
        metricsEnabled: true,
        alertOnOpen: true,
        alertOnHalfOpen: true,
        notificationChannels: ['slack-alerts', 'pagerduty', 'email-billing-team'],
      },
    },

    // Email Service (SendGrid)
    email: {
      name: 'email-circuit-breaker',
      enabled: true,
      thresholds: {
        failureRateThreshold: 70, // More tolerant for non-critical
        slowCallRateThreshold: 90,
        slowCallDurationMs: 15000,
        minimumNumberOfCalls: 10,
        permittedNumberOfCallsInHalfOpen: 5,
      },
      timeouts: {
        waitDurationInOpenStateMs: 120000, // 2 minutes
        recordingDurationMs: 300000, // 5 minute window
      },
      fallback: {
        type: 'queue',
        queueName: 'email-queue',
        maxRetries: 5,
        retryDelayMs: 60000,
      },
      monitoring: {
        metricsEnabled: true,
        alertOnOpen: true,
        alertOnHalfOpen: false,
        notificationChannels: ['slack-alerts'],
      },
    },

    // Storage Service (Azure Blob)
    storage: {
      name: 'storage-circuit-breaker',
      enabled: true,
      thresholds: {
        failureRateThreshold: 40,
        slowCallRateThreshold: 60,
        slowCallDurationMs: 30000, // 30 seconds for large files
        minimumNumberOfCalls: 5,
        permittedNumberOfCallsInHalfOpen: 2,
      },
      timeouts: {
        waitDurationInOpenStateMs: 45000,
        recordingDurationMs: 120000,
      },
      fallback: {
        type: 'local-cache',
        localPath: '/tmp/storage-fallback',
        maxSizeBytes: 104857600, // 100MB
      },
      monitoring: {
        metricsEnabled: true,
        alertOnOpen: true,
        alertOnHalfOpen: true,
        notificationChannels: ['slack-alerts'],
      },
    },

    // OAuth Providers
    oauth: {
      name: 'oauth-circuit-breaker',
      enabled: true,
      thresholds: {
        failureRateThreshold: 60,
        slowCallRateThreshold: 80,
        slowCallDurationMs: 10000,
        minimumNumberOfCalls: 5,
        permittedNumberOfCallsInHalfOpen: 3,
      },
      timeouts: {
        waitDurationInOpenStateMs: 60000,
        recordingDurationMs: 180000,
      },
      fallback: {
        type: 'alternative',
        alternativeEndpoint: 'email-password-login',
        message: 'Social login temporarily unavailable. Please use email/password.',
      },
      monitoring: {
        metricsEnabled: true,
        alertOnOpen: true,
        alertOnHalfOpen: false,
        notificationChannels: ['slack-alerts'],
      },
    },
  };
}

// =============================================================================
// FALLBACK CONFIGURATION
// =============================================================================

export interface FallbackConfig {
  type: 'cache' | 'queue' | 'default-value' | 'alternative' | 'local-cache';
  cacheKey?: string;
  ttlSeconds?: number;
  staleWhileRevalidate?: boolean;
  queueName?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  defaultValue?: unknown;
  alternativeEndpoint?: string;
  message?: string;
  localPath?: string;
  maxSizeBytes?: number;
}

export interface FallbackResult {
  success: boolean;
  source: 'cache' | 'queue' | 'default' | 'alternative' | 'local';
  data?: unknown;
  message?: string;
  expiresAt?: Date;
}

export class FallbackHandler {
  private cacheStore: Map<string, { data: unknown; expiresAt: Date }> = new Map();

  async executeFallback(config: FallbackConfig): Promise<FallbackResult> {
    switch (config.type) {
      case 'cache':
        return this.cacheRetrieval(config);
      case 'queue':
        return this.queueForRetry(config);
      case 'default-value':
        return this.defaultValue(config);
      case 'alternative':
        return this.alternativeService(config);
      case 'local-cache':
        return this.localCache(config);
      default:
        return { success: false, source: 'default', message: 'Unknown fallback type' };
    }
  }

  private async cacheRetrieval(config: FallbackConfig): Promise<FallbackResult> {
    const cached = this.cacheStore.get(config.cacheKey || '');
    if (cached && cached.expiresAt > new Date()) {
      return {
        success: true,
        source: 'cache',
        data: cached.data,
        expiresAt: cached.expiresAt,
      };
    }

    if (config.staleWhileRevalidate && cached) {
      // Return stale data but mark for revalidation
      return {
        success: true,
        source: 'cache',
        data: cached.data,
        message: 'Stale data returned, revalidation pending',
      };
    }

    return { success: false, source: 'cache', message: 'No cached data available' };
  }

  private async queueForRetry(config: FallbackConfig): Promise<FallbackResult> {
    // In real implementation, this would add to a message queue
    console.log(`Queuing request to ${config.queueName} for retry`);
    return {
      success: true,
      source: 'queue',
      message: `Request queued for retry. Max retries: ${config.maxRetries}`,
    };
  }

  private async defaultValue(config: FallbackConfig): Promise<FallbackResult> {
    return {
      success: true,
      source: 'default',
      data: config.defaultValue,
      message: 'Returning default value due to service unavailability',
    };
  }

  private async alternativeService(config: FallbackConfig): Promise<FallbackResult> {
    return {
      success: true,
      source: 'alternative',
      data: { endpoint: config.alternativeEndpoint },
      message: config.message || 'Redirecting to alternative service',
    };
  }

  private async localCache(config: FallbackConfig): Promise<FallbackResult> {
    // In real implementation, this would read from local filesystem
    console.log(`Reading from local cache at ${config.localPath}`);
    return {
      success: false,
      source: 'local',
      message: 'Local cache miss',
    };
  }

  setCache(key: string, data: unknown, ttlSeconds: number): void {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    this.cacheStore.set(key, { data, expiresAt });
  }
}

// =============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// =============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to prevent thundering herd
  retryableErrors: string[]; // Error types that should be retried
  nonRetryableErrors: string[]; // Error types that should NOT be retried
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
  lastAttemptTime: Date;
}

export function getRetryConfigs(): Record<string, RetryConfig> {
  return {
    // Database retry configuration
    database: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterFactor: 0.2,
      retryableErrors: [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        'P1001', // Prisma can't reach database
        'P1002', // Database server timed out
        'P1008', // Operations timed out
        'P1017', // Server has closed the connection
      ],
      nonRetryableErrors: [
        'P2002', // Unique constraint violation
        'P2003', // Foreign key constraint violation
        'P2025', // Record not found
      ],
    },

    // External API retry configuration
    externalApi: {
      maxRetries: 5,
      initialDelayMs: 500,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.3,
      retryableErrors: [
        '408', // Request Timeout
        '429', // Too Many Requests
        '500', // Internal Server Error
        '502', // Bad Gateway
        '503', // Service Unavailable
        '504', // Gateway Timeout
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
      ],
      nonRetryableErrors: [
        '400', // Bad Request
        '401', // Unauthorized
        '403', // Forbidden
        '404', // Not Found
        '422', // Unprocessable Entity
      ],
    },

    // Email sending retry configuration
    email: {
      maxRetries: 10,
      initialDelayMs: 5000,
      maxDelayMs: 300000, // 5 minutes max
      backoffMultiplier: 2,
      jitterFactor: 0.5,
      retryableErrors: [
        '429', // Rate limited
        '500',
        '502',
        '503',
        'ECONNREFUSED',
        'ETIMEDOUT',
      ],
      nonRetryableErrors: [
        '400', // Invalid request
        '401', // API key invalid
        '403', // Forbidden
      ],
    },

    // File upload retry configuration
    fileUpload: {
      maxRetries: 3,
      initialDelayMs: 2000,
      maxDelayMs: 20000,
      backoffMultiplier: 2,
      jitterFactor: 0.2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', '500', '502', '503'],
      nonRetryableErrors: [
        '413', // Payload too large
        '415', // Unsupported media type
      ],
    },
  };
}

export class RetryExecutor {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context?: string,
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let totalDelayMs = 0;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const data = await operation();
        return {
          success: true,
          data,
          attempts: attempt,
          totalDelayMs,
          lastAttemptTime: new Date(),
        };
      } catch (error) {
        lastError = error as Error;
        const errorCode = this.extractErrorCode(error);

        // Check if error is non-retryable
        if (config.nonRetryableErrors.includes(errorCode)) {
          console.log(`[Retry] ${context}: Non-retryable error ${errorCode}, aborting`);
          break;
        }

        // Check if error is retryable
        if (!config.retryableErrors.includes(errorCode)) {
          console.log(`[Retry] ${context}: Unknown error ${errorCode}, aborting`);
          break;
        }

        if (attempt <= config.maxRetries) {
          const delay = this.calculateDelay(attempt, config);
          totalDelayMs += delay;
          console.log(
            `[Retry] ${context}: Attempt ${attempt} failed with ${errorCode}, ` +
              `retrying in ${delay}ms (${config.maxRetries - attempt} retries left)`,
          );
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: config.maxRetries + 1,
      totalDelayMs,
      lastAttemptTime: new Date(),
    };
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff
    const exponentialDelay =
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

    // Apply max cap
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    // Add jitter
    const jitter = cappedDelay * config.jitterFactor * Math.random();

    return Math.floor(cappedDelay + jitter);
  }

  private extractErrorCode(error: unknown): string {
    if (error instanceof Error) {
      // HTTP status code
      if ('status' in error) {
        return String((error as { status: number }).status);
      }
      // Prisma error code
      if ('code' in error) {
        return String((error as { code: string }).code);
      }
      // Node.js error code
      if ('code' in error) {
        return String((error as { code: string }).code);
      }
    }
    return 'UNKNOWN';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// BULKHEAD ISOLATION
// =============================================================================

export interface BulkheadConfig {
  name: string;
  maxConcurrentCalls: number;
  maxWaitDurationMs: number;
  queueSize: number;
  fairCallHandling: boolean;
}

export interface BulkheadMetrics {
  name: string;
  availablePermits: number;
  queueDepth: number;
  rejectedCalls: number;
  completedCalls: number;
  averageWaitTimeMs: number;
}

export function getBulkheadConfigs(): Record<string, BulkheadConfig> {
  return {
    // Database bulkhead
    database: {
      name: 'database-bulkhead',
      maxConcurrentCalls: 50,
      maxWaitDurationMs: 5000,
      queueSize: 100,
      fairCallHandling: true,
    },

    // External API bulkhead
    externalApi: {
      name: 'external-api-bulkhead',
      maxConcurrentCalls: 20,
      maxWaitDurationMs: 10000,
      queueSize: 50,
      fairCallHandling: true,
    },

    // File processing bulkhead
    fileProcessing: {
      name: 'file-processing-bulkhead',
      maxConcurrentCalls: 10,
      maxWaitDurationMs: 30000,
      queueSize: 20,
      fairCallHandling: false,
    },

    // Document generation bulkhead
    documentGeneration: {
      name: 'document-generation-bulkhead',
      maxConcurrentCalls: 5,
      maxWaitDurationMs: 60000,
      queueSize: 10,
      fairCallHandling: true,
    },
  };
}

export class Bulkhead {
  private name: string;
  private maxConcurrent: number;
  private currentConcurrent = 0;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void; enqueuedAt: Date }> =
    [];
  private maxQueueSize: number;
  private maxWaitMs: number;
  private rejectedCount = 0;
  private completedCount = 0;
  private totalWaitTimeMs = 0;

  constructor(config: BulkheadConfig) {
    this.name = config.name;
    this.maxConcurrent = config.maxConcurrentCalls;
    this.maxQueueSize = config.queueSize;
    this.maxWaitMs = config.maxWaitDurationMs;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquirePermit();
    try {
      return await operation();
    } finally {
      this.releasePermit();
    }
  }

  private async acquirePermit(): Promise<void> {
    if (this.currentConcurrent < this.maxConcurrent) {
      this.currentConcurrent++;
      return;
    }

    if (this.queue.length >= this.maxQueueSize) {
      this.rejectedCount++;
      throw new Error(`Bulkhead ${this.name} queue full. Request rejected.`);
    }

    return new Promise<void>((resolve, reject) => {
      const enqueuedAt = new Date();
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex((item) => item.resolve === resolve);
        if (index >= 0) {
          this.queue.splice(index, 1);
          this.rejectedCount++;
          reject(new Error(`Bulkhead ${this.name} wait timeout exceeded`));
        }
      }, this.maxWaitMs);

      this.queue.push({
        resolve: () => {
          clearTimeout(timeout);
          this.totalWaitTimeMs += Date.now() - enqueuedAt.getTime();
          resolve();
        },
        reject,
        enqueuedAt,
      });
    });
  }

  private releasePermit(): void {
    this.completedCount++;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next.resolve();
      }
    } else {
      this.currentConcurrent--;
    }
  }

  getMetrics(): BulkheadMetrics {
    return {
      name: this.name,
      availablePermits: this.maxConcurrent - this.currentConcurrent,
      queueDepth: this.queue.length,
      rejectedCalls: this.rejectedCount,
      completedCalls: this.completedCount,
      averageWaitTimeMs: this.completedCount > 0 ? this.totalWaitTimeMs / this.completedCount : 0,
    };
  }
}

// =============================================================================
// RATE LIMITER
// =============================================================================

export interface RateLimiterConfig {
  name: string;
  limitForPeriod: number;
  limitRefreshPeriodMs: number;
  timeoutDurationMs: number;
}

export function getRateLimiterConfigs(): Record<string, RateLimiterConfig> {
  return {
    // API rate limiter per user
    apiPerUser: {
      name: 'api-per-user',
      limitForPeriod: 100,
      limitRefreshPeriodMs: 60000, // 100 requests per minute
      timeoutDurationMs: 5000,
    },

    // API rate limiter global
    apiGlobal: {
      name: 'api-global',
      limitForPeriod: 10000,
      limitRefreshPeriodMs: 60000, // 10000 requests per minute
      timeoutDurationMs: 1000,
    },

    // Login rate limiter
    login: {
      name: 'login-rate-limiter',
      limitForPeriod: 5,
      limitRefreshPeriodMs: 900000, // 5 attempts per 15 minutes
      timeoutDurationMs: 0, // No waiting, reject immediately
    },

    // Email sending rate limiter
    emailSending: {
      name: 'email-sending',
      limitForPeriod: 50,
      limitRefreshPeriodMs: 60000, // 50 emails per minute
      timeoutDurationMs: 10000,
    },

    // File upload rate limiter
    fileUpload: {
      name: 'file-upload',
      limitForPeriod: 10,
      limitRefreshPeriodMs: 60000, // 10 uploads per minute per user
      timeoutDurationMs: 30000,
    },
  };
}

// =============================================================================
// GRACEFUL DEGRADATION SERVICE
// =============================================================================

export interface DegradationLevel {
  level: number; // 0 = normal, 1 = degraded, 2 = severely degraded, 3 = emergency
  name: string;
  description: string;
  actions: string[];
  disabledFeatures: string[];
}

export function getDegradationLevels(): DegradationLevel[] {
  return [
    {
      level: 0,
      name: 'Normal',
      description: 'All services operating normally',
      actions: [],
      disabledFeatures: [],
    },
    {
      level: 1,
      name: 'Degraded',
      description: 'Non-critical services experiencing issues',
      actions: [
        'Enable aggressive caching',
        'Reduce refresh rates',
        'Queue non-critical operations',
      ],
      disabledFeatures: [
        'real-time-notifications',
        'analytics-tracking',
        'background-jobs-low-priority',
      ],
    },
    {
      level: 2,
      name: 'Severely Degraded',
      description: 'Multiple services affected, prioritizing critical operations',
      actions: [
        'Enable read-only mode for non-essential features',
        'Serve cached data only',
        'Disable file uploads',
        'Queue all emails',
      ],
      disabledFeatures: [
        'real-time-notifications',
        'analytics-tracking',
        'background-jobs-low-priority',
        'file-uploads',
        'document-generation',
        'export-features',
      ],
    },
    {
      level: 3,
      name: 'Emergency',
      description: 'Critical failure, minimum viable service',
      actions: [
        'Static fallback page',
        'Queue all non-critical requests',
        'Emergency alert to on-call',
        'Prepare disaster recovery',
      ],
      disabledFeatures: [
        'all-non-auth-features',
        'new-registrations',
        'payment-processing',
        'document-generation',
        'file-uploads',
        'exports',
        'admin-operations',
      ],
    },
  ];
}

export class GracefulDegradationService {
  private currentLevel = 0;
  private circuitBreakers: Map<string, CircuitBreakerConfig> = new Map();
  private degradationLevels: DegradationLevel[] = getDegradationLevels();

  constructor() {
    const configs = getCircuitBreakerConfigs();
    Object.entries(configs).forEach(([key, config]) => {
      this.circuitBreakers.set(key, config);
    });
  }

  getCurrentDegradationLevel(): DegradationLevel {
    return this.degradationLevels[this.currentLevel];
  }

  setDegradationLevel(level: number): void {
    if (level >= 0 && level < this.degradationLevels.length) {
      const previousLevel = this.currentLevel;
      this.currentLevel = level;
      console.log(
        `[GracefulDegradation] Level changed from ${previousLevel} (${this.degradationLevels[previousLevel].name}) ` +
          `to ${level} (${this.degradationLevels[level].name})`,
      );
    }
  }

  isFeatureEnabled(feature: string): boolean {
    const currentDegradation = this.degradationLevels[this.currentLevel];
    return !currentDegradation.disabledFeatures.includes(feature);
  }

  getActiveActions(): string[] {
    return this.degradationLevels[this.currentLevel].actions;
  }

  evaluateSystemHealth(metrics: {
    errorRate: number;
    avgResponseTimeMs: number;
    cpuUsage: number;
    memoryUsage: number;
    openCircuitBreakers: number;
  }): number {
    let suggestedLevel = 0;

    // Error rate based escalation
    if (metrics.errorRate > 50) {
      suggestedLevel = 3;
    } else if (metrics.errorRate > 20) {
      suggestedLevel = 2;
    } else if (metrics.errorRate > 5) {
      suggestedLevel = 1;
    }

    // Response time based escalation
    if (metrics.avgResponseTimeMs > 10000) {
      suggestedLevel = Math.max(suggestedLevel, 3);
    } else if (metrics.avgResponseTimeMs > 5000) {
      suggestedLevel = Math.max(suggestedLevel, 2);
    } else if (metrics.avgResponseTimeMs > 2000) {
      suggestedLevel = Math.max(suggestedLevel, 1);
    }

    // Resource usage based escalation
    if (metrics.cpuUsage > 95 || metrics.memoryUsage > 95) {
      suggestedLevel = Math.max(suggestedLevel, 2);
    } else if (metrics.cpuUsage > 85 || metrics.memoryUsage > 85) {
      suggestedLevel = Math.max(suggestedLevel, 1);
    }

    // Circuit breaker based escalation
    if (metrics.openCircuitBreakers >= 3) {
      suggestedLevel = Math.max(suggestedLevel, 2);
    } else if (metrics.openCircuitBreakers >= 1) {
      suggestedLevel = Math.max(suggestedLevel, 1);
    }

    return suggestedLevel;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  getCircuitBreakerConfigs,
  getRetryConfigs,
  getBulkheadConfigs,
  getRateLimiterConfigs,
  getDegradationLevels,
  FallbackHandler,
  RetryExecutor,
  Bulkhead,
  GracefulDegradationService,
};
