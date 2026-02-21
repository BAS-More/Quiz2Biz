/**
 * Application Insights Configuration Tests
 */
import * as appInsights from 'applicationinsights';

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

    it('should set 100% sampling in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getAppInsightsConfig();
      expect(config.samplingPercentage).toBe(100);
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
  });
});
