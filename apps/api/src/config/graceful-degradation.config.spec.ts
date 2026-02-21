/**
 * @fileoverview Tests for graceful-degradation.config.ts
 */
import {
  getCircuitBreakerConfigs,
  getRetryConfigs,
  getBulkheadConfigs,
  getRateLimiterConfigs,
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

  it('should have externalApi retry config', () => {
    const configs = getRetryConfigs();
    const apiRetry = configs.externalApi;

    expect(apiRetry).toBeDefined();
    expect(apiRetry.maxRetries).toBeGreaterThan(0);
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

  it('should have file processing bulkhead', () => {
    const configs = getBulkheadConfigs();
    const fileBulkhead = configs.fileProcessing;

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
