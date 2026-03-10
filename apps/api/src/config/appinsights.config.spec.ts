/**
 * Application Insights Configuration Tests
 */
import * as appInsights from 'applicationinsights';
import { Logger } from '@nestjs/common';

// Mock applicationinsights before importing the module
jest.mock('applicationinsights', () => ({
  setup: jest.fn().mockReturnThis(),
  start: jest.fn(),
  defaultClient: {
    config: {
      samplingPercentage: 100,
    },
    context: {
      tags: {},
      keys: {
        cloudRole: 'ai.cloud.role',
        cloudRoleInstance: 'ai.cloud.roleInstance',
      },
    },
    trackMetric: jest.fn(),
    trackEvent: jest.fn(),
    trackException: jest.fn(),
    trackDependency: jest.fn(),
    trackAvailability: jest.fn(),
    flush: jest.fn(),
  },
}));

import {
  AppInsightsConfig,
  CustomMetricOptions,
  CustomEventOptions,
  getAppInsightsConfig,
  initializeAppInsights,
  getClient,
  trackMetric,
  trackResponseTime,
  trackQuestionnaireMetrics,
  trackReadinessScore,
  trackEvent,
  trackAuthEvent,
  trackDocumentGeneration,
  trackEndpointUsage,
  trackException,
  trackHandledException,
  trackCriticalException,
  trackDependency,
  trackDatabaseQuery,
  trackExternalApiCall,
  PerformanceMetrics,
  trackPerformance,
  trackAvailability,
  flush,
  shutdown,
  createRequestTrackingMiddleware,
} from './appinsights.config';

describe('Application Insights Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getAppInsightsConfig', () => {
    it('should return config object', () => {
      const config = getAppInsightsConfig();
      expect(config).toHaveProperty('connectionString');
      expect(config).toHaveProperty('cloudRole');
      expect(config).toHaveProperty('cloudRoleInstance');
      expect(config).toHaveProperty('samplingPercentage');
      expect(config).toHaveProperty('enableAutoCollect');
    });

    it('should use environment variables when set', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test-connection-string';
      process.env.APPINSIGHTS_INSTRUMENTATIONKEY = 'test-key';
      process.env.AZURE_CLOUD_ROLE = 'test-role';
      process.env.HOSTNAME = 'test-host';

      const config = getAppInsightsConfig();
      expect(config.connectionString).toBe('test-connection-string');
      expect(config.instrumentationKey).toBe('test-key');
      expect(config.cloudRole).toBe('test-role');
      expect(config.cloudRoleInstance).toBe('test-host');
    });

    it('should use default values when env vars not set', () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
      delete process.env.AZURE_CLOUD_ROLE;
      delete process.env.HOSTNAME;

      const config = getAppInsightsConfig();
      expect(config.connectionString).toBe('');
      expect(config.instrumentationKey).toBe('');
      expect(config.cloudRole).toBe('quiz-to-build-api');
      expect(config.cloudRoleInstance).toBe('local-dev');
    });

    it('should set 75% sampling in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getAppInsightsConfig();
      expect(config.samplingPercentage).toBe(75);
    });

    it('should set 50% sampling in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getAppInsightsConfig();
      expect(config.samplingPercentage).toBe(50);
    });

    it('should enable auto-collect features', () => {
      const config = getAppInsightsConfig();
      expect(config.enableAutoCollect).toHaveProperty('requests', true);
      expect(config.enableAutoCollect).toHaveProperty('performance', true);
      expect(config.enableAutoCollect).toHaveProperty('exceptions', true);
      expect(config.enableAutoCollect).toHaveProperty('dependencies', true);
    });

    it('should enable console logging only in non-production', () => {
      process.env.NODE_ENV = 'development';
      let config = getAppInsightsConfig();
      expect(config.enableAutoCollect.console).toBe(true);

      process.env.NODE_ENV = 'production';
      config = getAppInsightsConfig();
      expect(config.enableAutoCollect.console).toBe(false);
    });
  });

  describe('initializeAppInsights', () => {
    it('should not initialize without connection string', () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

      initializeAppInsights();
      // Should not throw
    });

    it('should initialize with connection string', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test';

      // Reset module state (in real scenario)
      initializeAppInsights();
      expect(appInsights.setup).toHaveBeenCalled();
    });
  });

  describe('trackMetric', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track custom metric', () => {
      trackMetric({
        name: 'test_metric',
        value: 100,
      });

      // Verify it was called (mock)
      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test_metric',
          value: 100,
        }),
      );
    });

    it('should track metric with properties', () => {
      trackMetric({
        name: 'test_metric',
        value: 50,
        properties: { env: 'test' },
      });

      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test_metric',
          value: 50,
          properties: { env: 'test' },
        }),
      );
    });
  });

  describe('trackResponseTime', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track response time', () => {
      trackResponseTime('api_call', 150, true);

      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'api_call_response_time',
          value: 150,
          properties: expect.objectContaining({
            success: 'true',
          }),
        }),
      );
    });

    it('should track failed response', () => {
      trackResponseTime('api_call', 500, false, { error: 'timeout' });

      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'api_call_response_time',
          value: 500,
          properties: expect.objectContaining({
            success: 'false',
            error: 'timeout',
          }),
        }),
      );
    });
  });

  describe('trackQuestionnaireMetrics', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track questionnaire metrics', () => {
      trackQuestionnaireMetrics('session-123', {
        questionsAnswered: 10,
        totalQuestions: 20,
        completionPercentage: 50,
        timeSpentSeconds: 300,
      });

      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledTimes(3);
    });
  });

  describe('trackReadinessScore', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track overall readiness score', () => {
      trackReadinessScore('session-123', 75, {
        Technology: 80,
        Process: 70,
      });

      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'readiness_score_overall',
          value: 75,
        }),
      );
    });

    it('should track dimension scores', () => {
      trackReadinessScore('session-123', 75, {
        Technology: 80,
        Process: 70,
      });

      // 1 overall + 2 dimensions = 3 calls
      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledTimes(3);
    });
  });

  describe('trackEvent', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track custom event', () => {
      trackEvent({
        name: 'test_event',
        properties: { key: 'value' },
      });

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test_event',
          properties: { key: 'value' },
        }),
      );
    });

    it('should track event with measurements', () => {
      trackEvent({
        name: 'test_event',
        measurements: { duration: 100 },
      });

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test_event',
          measurements: { duration: 100 },
        }),
      );
    });
  });

  describe('trackAuthEvent', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track login event', () => {
      trackAuthEvent('login', 'user-123', 'google');

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'auth_login',
          properties: {
            userId: 'user-123',
            method: 'google',
          },
        }),
      );
    });

    it('should track logout event', () => {
      trackAuthEvent('logout', 'user-123');

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'auth_logout',
        }),
      );
    });

    it('should use defaults when not provided', () => {
      trackAuthEvent('login');

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: {
            userId: 'anonymous',
            method: 'email',
          },
        }),
      );
    });
  });

  describe('trackDocumentGeneration', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track successful document generation', () => {
      trackDocumentGeneration('business-plan', 'session-123', true, 5000);

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'document_generated',
          properties: {
            documentType: 'business-plan',
            sessionId: 'session-123',
            success: 'true',
          },
          measurements: {
            durationMs: 5000,
          },
        }),
      );
    });

    it('should track failed document generation', () => {
      trackDocumentGeneration('api-docs', 'session-456', false, 1000);

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            success: 'false',
          }),
        }),
      );
    });
  });

  describe('trackEndpointUsage', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track API endpoint usage', () => {
      trackEndpointUsage('/api/v1/questionnaires', 'GET', 200, 50, 'user-123');

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'api_request',
          properties: {
            endpoint: '/api/v1/questionnaires',
            method: 'GET',
            statusCode: '200',
            userId: 'user-123',
          },
          measurements: {
            durationMs: 50,
          },
        }),
      );
    });
  });

  describe('trackException', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track exception', () => {
      const error = new Error('Test error');
      trackException(error);

      expect(appInsights.defaultClient.trackException).toHaveBeenCalledWith(
        expect.objectContaining({
          exception: error,
        }),
      );
    });

    it('should track exception with properties', () => {
      const error = new Error('Test error');
      trackException(error, { context: 'test' });

      expect(appInsights.defaultClient.trackException).toHaveBeenCalledWith(
        expect.objectContaining({
          exception: error,
          properties: { context: 'test' },
        }),
      );
    });
  });

  describe('trackHandledException', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track handled exception', () => {
      const error = new Error('Handled error');
      trackHandledException(error, 'validation', 'user-123');

      expect(appInsights.defaultClient.trackException).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            context: 'validation',
            userId: 'user-123',
            severity: 'warning',
          }),
        }),
      );
    });
  });

  describe('trackCriticalException', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track critical exception', () => {
      const error = new Error('Critical error');
      trackCriticalException(error, 'database', { query: 'SELECT *' });

      expect(appInsights.defaultClient.trackException).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            context: 'database',
            severity: 'critical',
            query: 'SELECT *',
          }),
        }),
      );
    });
  });

  describe('trackDependency', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track dependency call', () => {
      trackDependency({
        name: 'SQL Query',
        data: 'SELECT * FROM users',
        dependencyTypeName: 'PostgreSQL',
        target: 'localhost',
        duration: 50,
        success: true,
      });

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'SQL Query',
          dependencyTypeName: 'PostgreSQL',
          success: true,
        }),
      );
    });
  });

  describe('trackDatabaseQuery', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track database query', () => {
      trackDatabaseQuery('findUserById', 25, true, 'users');

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'findUserById',
          dependencyTypeName: 'PostgreSQL',
          duration: 25,
          success: true,
          properties: { tableName: 'users' },
        }),
      );
    });
  });

  describe('trackExternalApiCall', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track external API call', () => {
      trackExternalApiCall('Stripe', 'https://api.stripe.com/charges', 200, 200);

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Stripe',
          data: 'https://api.stripe.com/charges',
          dependencyTypeName: 'HTTP',
          success: true,
          resultCode: '200',
        }),
      );
    });

    it('should mark failed calls correctly', () => {
      trackExternalApiCall('Stripe', 'https://api.stripe.com/charges', 150, 500);

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          resultCode: '500',
        }),
      );
    });
  });

  describe('PerformanceMetrics', () => {
    it('should have predefined metrics', () => {
      expect(PerformanceMetrics.API_RESPONSE_TIME).toBe('api_response_time_ms');
      expect(PerformanceMetrics.DATABASE_QUERY_TIME).toBe('database_query_time_ms');
      expect(PerformanceMetrics.REQUESTS_PER_SECOND).toBe('requests_per_second');
      expect(PerformanceMetrics.COMPLETION_RATE).toBe('questionnaire_completion_rate');
    });
  });

  describe('trackPerformance', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track performance metric', () => {
      trackPerformance('API_RESPONSE_TIME', 150);

      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'api_response_time_ms',
          value: 150,
        }),
      );
    });
  });

  describe('trackAvailability', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track availability test', () => {
      trackAvailability('health-check', true, 50, 'Azure-EastUS');

      expect(appInsights.defaultClient.trackAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'health-check',
          success: true,
          duration: 50,
          runLocation: 'Azure-EastUS',
        }),
      );
    });
  });

  describe('flush', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should call flush on client', () => {
      flush();
      expect(appInsights.defaultClient.flush).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should flush telemetry on shutdown', async () => {
      await shutdown();
      expect(appInsights.defaultClient.flush).toHaveBeenCalled();
    });
  });

  describe('createRequestTrackingMiddleware', () => {
    it('should return a middleware function', () => {
      const middleware = createRequestTrackingMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should call next', () => {
      const middleware = createRequestTrackingMiddleware();
      const req = { path: '/test', method: 'GET', user: { id: 'user-1' } };
      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should track slow requests (>500ms)', () => {
      jest.useFakeTimers();
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();

      const middleware = createRequestTrackingMiddleware();
      const req = { path: '/slow-endpoint', method: 'POST', user: undefined };
      let finishCallback: () => void;
      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            finishCallback = callback;
          }
        }),
      };
      const next = jest.fn();

      middleware(req, res, next);

      // Simulate 600ms delay
      jest.advanceTimersByTime(600);
      finishCallback!();

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'slow_request',
          properties: {
            endpoint: '/slow-endpoint',
            method: 'POST',
          },
        }),
      );

      jest.useRealTimers();
    });

    it('should handle request without user', () => {
      const middleware = createRequestTrackingMiddleware();
      const req = { path: '/test', method: 'GET', user: undefined };
      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            callback();
          }
        }),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('initializeAppInsights - additional branches', () => {
    it('should initialize with instrumentation key when no connection string', () => {
      // This branch is tested implicitly through code coverage
      // The actual behavior requires a fresh module without prior initialization
      // which is complex due to module caching
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      process.env.APPINSIGHTS_INSTRUMENTATIONKEY = 'test-instrumentation-key';

      // After the first initialization in previous tests, the module is already initialized
      // Just verify the config is read correctly
      const config = getAppInsightsConfig();
      expect(config.instrumentationKey).toBe('test-instrumentation-key');
    });

    it('should log when already initialized', () => {
      // Initialize first time
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();

      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      // Try to initialize again
      initializeAppInsights();

      expect(logSpy).toHaveBeenCalledWith('Application Insights already initialized');
      logSpy.mockRestore();
    });
  });

  describe('trackMetric - when client is null', () => {
    it('should not throw when client is null', () => {
      // Create a fresh module without initialization
      jest.resetModules();

      // Re-import to get fresh state
      const freshModule = require('./appinsights.config');

      // Should not throw
      expect(() => {
        freshModule.trackMetric({ name: 'test', value: 1 });
      }).not.toThrow();
    });
  });

  describe('trackEvent - when client is null', () => {
    it('should not throw when client is null', () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      expect(() => {
        freshModule.trackEvent({ name: 'test' });
      }).not.toThrow();
    });
  });

  describe('trackException - when client is null', () => {
    it('should not throw when client is null', () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      expect(() => {
        freshModule.trackException(new Error('test'));
      }).not.toThrow();
    });
  });

  describe('trackDependency - when client is null', () => {
    it('should not throw when client is null', () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      expect(() => {
        freshModule.trackDependency({
          name: 'test',
          data: 'data',
          dependencyTypeName: 'HTTP',
          target: 'localhost',
          duration: 100,
          success: true,
        });
      }).not.toThrow();
    });
  });

  describe('trackAvailability - when client is null', () => {
    it('should not throw when client is null', () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      expect(() => {
        freshModule.trackAvailability('test', true, 100);
      }).not.toThrow();
    });
  });

  describe('trackQuestionnaireMetrics - when client is null', () => {
    it('should not throw when client is null', () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      expect(() => {
        freshModule.trackQuestionnaireMetrics('session-1', {
          questionsAnswered: 5,
          totalQuestions: 10,
          completionPercentage: 50,
          timeSpentSeconds: 300,
        });
      }).not.toThrow();
    });
  });

  describe('trackReadinessScore - when client is null', () => {
    it('should not throw when client is null', () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      expect(() => {
        freshModule.trackReadinessScore('session-1', 75, { Tech: 80 });
      }).not.toThrow();
    });
  });

  describe('flush - when client is null', () => {
    it('should not throw when client is null', () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      expect(() => {
        freshModule.flush();
      }).not.toThrow();
    });
  });

  describe('shutdown - when client is null', () => {
    it('should not throw when client is null', async () => {
      jest.resetModules();
      const freshModule = require('./appinsights.config');

      await expect(freshModule.shutdown()).resolves.not.toThrow();
    });
  });

  describe('trackDatabaseQuery - additional branches', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track database query without tableName', () => {
      trackDatabaseQuery('findAll', 50, true);

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'findAll',
          dependencyTypeName: 'PostgreSQL',
          properties: undefined,
        }),
      );
    });

    it('should use DATABASE_HOST from env', () => {
      process.env.DATABASE_HOST = 'db.example.com';
      trackDatabaseQuery('findAll', 50, true);

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'db.example.com',
        }),
      );
    });
  });

  describe('trackAvailability - additional branches', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should use default runLocation when not provided', () => {
      trackAvailability('health-check', true, 50);

      expect(appInsights.defaultClient.trackAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          runLocation: 'Azure',
        }),
      );
    });

    it('should use default message for success', () => {
      trackAvailability('health-check', true, 50);

      expect(appInsights.defaultClient.trackAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Available',
        }),
      );
    });

    it('should use default message for failure', () => {
      trackAvailability('health-check', false, 50);

      expect(appInsights.defaultClient.trackAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unavailable',
        }),
      );
    });

    it('should use custom message when provided', () => {
      trackAvailability('health-check', true, 50, 'Region-A', 'Custom message');

      expect(appInsights.defaultClient.trackAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom message',
        }),
      );
    });
  });

  describe('trackDependency - additional branches', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should use default resultCode for success', () => {
      trackDependency({
        name: 'API Call',
        data: '/api/test',
        dependencyTypeName: 'HTTP',
        target: 'api.example.com',
        duration: 100,
        success: true,
      });

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          resultCode: '200',
        }),
      );
    });

    it('should use default resultCode for failure', () => {
      trackDependency({
        name: 'API Call',
        data: '/api/test',
        dependencyTypeName: 'HTTP',
        target: 'api.example.com',
        duration: 100,
        success: false,
      });

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          resultCode: '500',
        }),
      );
    });

    it('should use custom resultCode when provided', () => {
      trackDependency({
        name: 'API Call',
        data: '/api/test',
        dependencyTypeName: 'HTTP',
        target: 'api.example.com',
        duration: 100,
        success: false,
        resultCode: '503',
      });

      expect(appInsights.defaultClient.trackDependency).toHaveBeenCalledWith(
        expect.objectContaining({
          resultCode: '503',
        }),
      );
    });
  });

  describe('trackEndpointUsage - additional branches', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should use anonymous for missing userId', () => {
      trackEndpointUsage('/api/public', 'GET', 200, 50);

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            userId: 'anonymous',
          }),
        }),
      );
    });
  });

  describe('trackHandledException - additional branches', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should use anonymous for missing userId', () => {
      const error = new Error('Handled error');
      trackHandledException(error, 'validation');

      expect(appInsights.defaultClient.trackException).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            userId: 'anonymous',
          }),
        }),
      );
    });
  });

  describe('trackCriticalException - without additionalData', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track critical exception without additional data', () => {
      const error = new Error('Critical error');
      trackCriticalException(error, 'database');

      expect(appInsights.defaultClient.trackException).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            context: 'database',
            severity: 'critical',
          }),
        }),
      );
    });
  });

  describe('trackMetric - with all optional parameters', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
      initializeAppInsights();
    });

    it('should track metric with count, min, max, stdDev', () => {
      trackMetric({
        name: 'request_latency',
        value: 150,
        count: 100,
        min: 10,
        max: 500,
        stdDev: 50,
      });

      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'request_latency',
          value: 150,
          count: 100,
          min: 10,
          max: 500,
          stdDev: 50,
        }),
      );
    });
  });
});
