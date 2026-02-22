import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SubscriptionGuard,
  FeatureUsageMiddleware,
  REQUIRED_TIER_KEY,
  FEATURE_CHECK_KEY,
  TIER_RATE_LIMITS,
  FEATURE_TIER_MATRIX,
  isFeatureAvailable,
  getFeatureLimit,
} from './subscription.guard';
import { SubscriptionService } from '../../modules/payment/subscription.service';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let reflector: jest.Mocked<Reflector>;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  const mockSubscriptionService = {
    getOrganizationSubscription: jest.fn(),
    hasFeatureAccess: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    guard = module.get<SubscriptionGuard>(SubscriptionGuard);
    reflector = module.get(Reflector);
    subscriptionService = module.get(SubscriptionService);
  });

  const createMockContext = (request: any = {}): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should throw when organization ID is missing', async () => {
      const context = createMockContext({
        user: null,
        query: {},
        headers: {},
        body: {},
      });
      mockReflector.getAllAndOverride.mockReturnValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should extract organization ID from user context', async () => {
      const context = createMockContext({
        user: { organizationId: 'org-123' },
      });
      mockReflector.getAllAndOverride.mockReturnValue(null);
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        tier: 'PROFESSIONAL',
        features: {},
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should extract organization ID from query param', async () => {
      const context = createMockContext({
        user: null,
        headers: {},
        body: {},
        query: { organizationId: 'org-456' },
      });
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should extract organization ID from header', async () => {
      const context = createMockContext({
        user: null,
        query: {},
        body: {},
        headers: { 'x-organization-id': 'org-789' },
      });
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should extract organization ID from body', async () => {
      const context = createMockContext({
        user: null,
        query: {},
        headers: {},
        body: { organizationId: 'org-body' },
      });
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw when tier access is denied', async () => {
      const context = createMockContext({
        user: { organizationId: 'org-123' },
      });

      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRED_TIER_KEY) {return ['ENTERPRISE'];}
        return null;
      });

      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        tier: 'FREE',
        features: {},
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when tier matches', async () => {
      const context = createMockContext({
        user: { organizationId: 'org-123' },
      });

      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRED_TIER_KEY) {return ['PROFESSIONAL', 'ENTERPRISE'];}
        return null;
      });

      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        tier: 'PROFESSIONAL',
        features: {},
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw when feature limit is exceeded', async () => {
      const context = createMockContext({
        user: { organizationId: 'org-123' },
      });

      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === FEATURE_CHECK_KEY) {
          return { feature: 'questionnaires', getUsage: () => 5 };
        }
        return null;
      });

      mockSubscriptionService.hasFeatureAccess.mockResolvedValue({
        allowed: false,
        limit: 1,
        remaining: 0,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow when feature access is granted', async () => {
      const context = createMockContext({
        user: { organizationId: 'org-123' },
      });

      mockReflector.getAllAndOverride.mockImplementation((key) => {
        if (key === FEATURE_CHECK_KEY) {
          return { feature: 'questionnaires', getUsage: () => 0 };
        }
        return null;
      });

      mockSubscriptionService.hasFeatureAccess.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 10,
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});

describe('FeatureUsageMiddleware', () => {
  let middleware: FeatureUsageMiddleware;
  let subscriptionService: jest.Mocked<SubscriptionService>;

  const mockSubscriptionService = {
    getOrganizationSubscription: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureUsageMiddleware,
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    middleware = module.get<FeatureUsageMiddleware>(FeatureUsageMiddleware);
    subscriptionService = module.get(SubscriptionService);
  });

  describe('use', () => {
    it('should attach subscription info to request', async () => {
      const mockRequest = {
        user: { organizationId: 'org-123' },
      } as any;
      const mockResponse = {
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        tier: 'PROFESSIONAL',
        features: { apiCalls: 50000 },
      });

      await middleware.use(mockRequest, mockResponse, next);

      expect(mockRequest.subscription).toBeDefined();
      expect(mockRequest.subscription.tier).toBe('PROFESSIONAL');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Subscription-Tier', 'PROFESSIONAL');
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing organization ID', async () => {
      const mockRequest = { user: null, query: {}, headers: {} } as any;
      const mockResponse = { setHeader: jest.fn() };
      const next = jest.fn();

      await middleware.use(mockRequest, mockResponse, next);

      expect(mockRequest.subscription).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not block on subscription lookup failure', async () => {
      const mockRequest = {
        user: { organizationId: 'org-123' },
      } as any;
      const mockResponse = { setHeader: jest.fn() };
      const next = jest.fn();

      mockSubscriptionService.getOrganizationSubscription.mockRejectedValue(
        new Error('Lookup failed'),
      );

      await middleware.use(mockRequest, mockResponse, next);

      expect(next).toHaveBeenCalled();
    });

    it('should not set API limit header for unlimited plans', async () => {
      const mockRequest = {
        user: { organizationId: 'org-123' },
      } as any;
      const mockResponse = { setHeader: jest.fn() };
      const next = jest.fn();

      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        tier: 'ENTERPRISE',
        features: { apiCalls: -1 },
      });

      await middleware.use(mockRequest, mockResponse, next);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Subscription-Tier', 'ENTERPRISE');
      expect(mockResponse.setHeader).not.toHaveBeenCalledWith('X-API-Limit', expect.anything());
    });
  });
});

describe('TIER_RATE_LIMITS', () => {
  it('should define rate limits for FREE tier', () => {
    expect(TIER_RATE_LIMITS.FREE).toEqual({
      windowMs: 60000,
      max: 30,
    });
  });

  it('should define rate limits for PROFESSIONAL tier', () => {
    expect(TIER_RATE_LIMITS.PROFESSIONAL).toEqual({
      windowMs: 60000,
      max: 300,
    });
  });

  it('should define rate limits for ENTERPRISE tier', () => {
    expect(TIER_RATE_LIMITS.ENTERPRISE).toEqual({
      windowMs: 60000,
      max: 1000,
    });
  });
});

describe('isFeatureAvailable', () => {
  it('should return true for boolean features that are enabled', () => {
    expect(isFeatureAvailable('ENTERPRISE', 'customBranding')).toBe(true);
  });

  it('should return false for boolean features that are disabled', () => {
    expect(isFeatureAvailable('FREE', 'customBranding')).toBe(false);
  });

  it('should return true for numeric features with positive limits', () => {
    expect(isFeatureAvailable('FREE', 'questionnaires')).toBe(true);
  });

  it('should return true for numeric features with unlimited (-1)', () => {
    expect(isFeatureAvailable('ENTERPRISE', 'questionnaires')).toBe(true);
  });

  it('should return true for array features with items', () => {
    expect(isFeatureAvailable('FREE', 'exportFormats')).toBe(true);
  });
});

describe('getFeatureLimit', () => {
  it('should return correct limit for FREE tier questionnaires', () => {
    expect(getFeatureLimit('FREE', 'questionnaires')).toBe(1);
  });

  it('should return unlimited (-1) for ENTERPRISE tier', () => {
    expect(getFeatureLimit('ENTERPRISE', 'questionnaires')).toBe(-1);
  });

  it('should return array for export formats', () => {
    expect(getFeatureLimit('FREE', 'exportFormats')).toEqual(['PDF']);
    expect(getFeatureLimit('ENTERPRISE', 'exportFormats')).toEqual(['PDF', 'DOCX', 'JSON', 'XML']);
  });

  it('should return boolean for feature flags', () => {
    expect(getFeatureLimit('FREE', 'ssoIntegration')).toBe(false);
    expect(getFeatureLimit('ENTERPRISE', 'ssoIntegration')).toBe(true);
  });
});
