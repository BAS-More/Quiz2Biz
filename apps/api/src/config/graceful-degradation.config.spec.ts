/**
 * @fileoverview Tests for graceful-degradation.config.ts
 */
import {
  getCircuitBreakerConfigs,
  getRetryConfigs,
  getBulkheadConfigs,
  getRateLimiterConfigs,
  CircuitBreaker,
  CircuitBreakerConfig,
} from './graceful-degradation.config';

describe('getCircuitBreakerConfigs', () => {
  it('should return circuit breaker configs object', () => {
    const configs = getCircuitBreakerConfigs();
    expect(configs).toBeDefined();
    expect(typeof configs).toBe('object');
  });

  it('should have database circuit breaker', () => {
    const configs = getCircuitBreakerConfigs();
    const dbConfig = configs.database;

    expect(dbConfig).toBeDefined();
    expect(dbConfig.enabled).toBe(true);
    expect(dbConfig.name).toBe('database-circuit-breaker');
  });

  it('should have payment circuit breaker with sensitive thresholds', () => {
    const configs = getCircuitBreakerConfigs();
    const paymentConfig = configs.payment;

    expect(paymentConfig).toBeDefined();
    expect(paymentConfig.thresholds.failureRateThreshold).toBe(25); // More sensitive
    expect(paymentConfig.thresholds.minimumNumberOfCalls).toBe(5);
  });

  it('should have email circuit breaker with tolerant thresholds', () => {
    const configs = getCircuitBreakerConfigs();
    const emailConfig = configs.email;

    expect(emailConfig).toBeDefined();
    expect(emailConfig.thresholds.failureRateThreshold).toBe(70); // More tolerant
  });

  it('should have storage circuit breaker', () => {
    const configs = getCircuitBreakerConfigs();
    const storageConfig = configs.storage;

    expect(storageConfig).toBeDefined();
    expect(storageConfig.thresholds.slowCallDurationMs).toBe(30000); // Large file support
  });

  it('should have oauth circuit breaker with alternative fallback', () => {
    const configs = getCircuitBreakerConfigs();
    const oauthConfig = configs.oauth;

    expect(oauthConfig).toBeDefined();
    expect(oauthConfig.fallback?.type).toBe('alternative');
  });

  it('should have monitoring enabled for all configs', () => {
    const configs = getCircuitBreakerConfigs();

    Object.values(configs).forEach((config: CircuitBreakerConfig) => {
      expect(config.monitoring.metricsEnabled).toBe(true);
      expect(config.monitoring.alertOnOpen).toBe(true);
    });
  });

  it('should have notification channels configured', () => {
    const configs = getCircuitBreakerConfigs();

    Object.values(configs).forEach((config: CircuitBreakerConfig) => {
      expect(config.monitoring.notificationChannels.length).toBeGreaterThan(0);
    });
  });
});

describe('getRetryConfigs', () => {
  it('should return retry configs', () => {
    const configs = getRetryConfigs();
    expect(configs).toBeDefined();
  });

  it('should have database retry config', () => {
    const configs = getRetryConfigs();
    const dbRetry = configs.database;

    expect(dbRetry).toBeDefined();
    expect(dbRetry.maxRetries).toBeGreaterThan(0);
    expect(dbRetry.backoffMultiplier).toBeGreaterThan(0);
  });

  it('should have payment retry config', () => {
    const configs = getRetryConfigs();
    const paymentRetry = configs.payment;

    expect(paymentRetry).toBeDefined();
    expect(paymentRetry.maxRetries).toBeGreaterThan(0);
  });

  it('should have email retry config', () => {
    const configs = getRetryConfigs();
    const emailRetry = configs.email;

    expect(emailRetry).toBeDefined();
    expect(emailRetry.maxRetries).toBeGreaterThanOrEqual(3);
  });

  it('should have exponential backoff configured', () => {
    const configs = getRetryConfigs();

    Object.values(configs).forEach((config: any) => {
      expect(config.initialDelayMs).toBeGreaterThan(0);
      expect(config.maxDelayMs).toBeGreaterThan(config.initialDelayMs);
    });
  });
});

describe('getBulkheadConfigs', () => {
  it('should return bulkhead configs', () => {
    const configs = getBulkheadConfigs();
    expect(configs).toBeDefined();
  });

  it('should have database bulkhead', () => {
    const configs = getBulkheadConfigs();
    const dbBulkhead = configs.database;

    expect(dbBulkhead).toBeDefined();
    expect(dbBulkhead.maxConcurrentCalls).toBeGreaterThan(0);
    expect(dbBulkhead.maxWaitDurationMs).toBeGreaterThan(0);
  });

  it('should have external API bulkhead', () => {
    const configs = getBulkheadConfigs();
    const apiBulkhead = configs.externalApi;

    expect(apiBulkhead).toBeDefined();
  });

  it('should have file operations bulkhead', () => {
    const configs = getBulkheadConfigs();
    const fileBulkhead = configs.fileOperations;

    expect(fileBulkhead).toBeDefined();
    expect(fileBulkhead.maxConcurrentCalls).toBeGreaterThan(0);
  });
});

describe('getRateLimiterConfigs', () => {
  it('should return rate limit configs', () => {
    const configs = getRateLimiterConfigs();
    expect(configs).toBeDefined();
  });

  it('should have apiPerUser rate limit', () => {
    const configs = getRateLimiterConfigs();
    const apiPerUser = configs.apiPerUser;

    expect(apiPerUser).toBeDefined();
    expect(apiPerUser.limitForPeriod).toBeGreaterThan(0);
  });

  it('should have apiGlobal rate limit', () => {
    const configs = getRateLimiterConfigs();
    const apiGlobal = configs.apiGlobal;

    expect(apiGlobal).toBeDefined();
    expect(apiGlobal.limitForPeriod).toBeGreaterThan(configs.apiPerUser.limitForPeriod);
  });

  it('should have login rate limit', () => {
    const configs = getRateLimiterConfigs();
    const login = configs.login;

    expect(login).toBeDefined();
    expect(login.limitForPeriod).toBeLessThanOrEqual(10);
  });

  it('should have limitRefreshPeriodMs configured', () => {
    const configs = getRateLimiterConfigs();

    Object.values(configs).forEach((config: any) => {
      expect(config.limitRefreshPeriodMs).toBeDefined();
      expect(config.limitRefreshPeriodMs).toBeGreaterThan(0);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  const testConfig: CircuitBreakerConfig = {
    name: 'test-breaker',
    enabled: true,
    thresholds: {
      failureRateThreshold: 50,
      slowCallRateThreshold: 80,
      slowCallDurationMs: 1000,
      minimumNumberOfCalls: 5,
      permittedNumberOfCallsInHalfOpen: 2,
    },
    timeouts: {
      waitDurationInOpenStateMs: 5000,
      recordingDurationMs: 10000,
    },
    monitoring: {
      metricsEnabled: true,
      alertOnOpen: true,
      alertOnHalfOpen: true,
      notificationChannels: ['test'],
    },
  };

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(testConfig);
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should execute function when closed', async () => {
    const result = await circuitBreaker.execute(() => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  it('should record success', async () => {
    await circuitBreaker.execute(() => Promise.resolve('success'));
    const metrics = circuitBreaker.getMetrics();
    expect(metrics.successCount).toBe(1);
  });

  it('should record failure', async () => {
    try {
      await circuitBreaker.execute(() => Promise.reject(new Error('fail')));
    } catch {
      // Expected
    }
    const metrics = circuitBreaker.getMetrics();
    expect(metrics.failureCount).toBe(1);
  });

  it('should open after threshold failures', async () => {
    // Trigger enough failures to open the circuit
    for (let i = 0; i < 10; i++) {
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe('OPEN');
  });

  it('should reject calls when open', async () => {
    // Force open state
    for (let i = 0; i < 10; i++) {
      try {
        await circuitBreaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }
    }

    await expect(
      circuitBreaker.execute(() => Promise.resolve('success')),
    ).rejects.toThrow('Circuit breaker is open');
  });

  it('should use fallback when configured', async () => {
    const configWithFallback = {
      ...testConfig,
      fallback: {
        type: 'static' as const,
        value: 'fallback-value',
      },
    };

    const breakerWithFallback = new CircuitBreaker(configWithFallback);

    // Force open state
    for (let i = 0; i < 10; i++) {
      try {
        await breakerWithFallback.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }
    }

    const result = await breakerWithFallback.execute(() => Promise.resolve('success'));
    expect(result).toBe('fallback-value');
  });

  it('should reset metrics', () => {
    circuitBreaker.reset();
    const metrics = circuitBreaker.getMetrics();

    expect(metrics.failureCount).toBe(0);
    expect(metrics.successCount).toBe(0);
    expect(metrics.state).toBe('CLOSED');
  });
});
