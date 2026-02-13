import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../../modules/payment/subscription.service';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '../../modules/payment/payment.service';

// Metadata keys
export const REQUIRED_TIER_KEY = 'requiredTier';
export const FEATURE_CHECK_KEY = 'featureCheck';

// Types for feature checking
export type FeatureName = keyof typeof SUBSCRIPTION_TIERS.FREE.features;

export interface FeatureCheckConfig {
  feature: FeatureName;
  getUsage?: (request: Request) => Promise<number> | number;
}

// Decorators for route-level feature gating
export const RequireTier = (...tiers: SubscriptionTier[]) => SetMetadata(REQUIRED_TIER_KEY, tiers);

export const RequireFeature = (config: FeatureCheckConfig) =>
  SetMetadata(FEATURE_CHECK_KEY, config);

/**
 * SubscriptionGuard - Enforces subscription tier access at the route level
 *
 * Usage:
 * @RequireTier('PROFESSIONAL', 'ENTERPRISE')
 * @Get('premium-feature')
 * async getPremiumFeature() { ... }
 *
 * @RequireFeature({ feature: 'questionnaires', getUsage: async (req) => getCurrentCount(req) })
 * @Post('questionnaire')
 * async createQuestionnaire() { ... }
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(SubscriptionService)
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = this.extractOrganizationId(request);

    if (!organizationId) {
      throw new ForbiddenException('Organization context required for this operation');
    }

    // Check tier-based access
    const requiredTiers = this.reflector.getAllAndOverride<SubscriptionTier[]>(REQUIRED_TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredTiers && requiredTiers.length > 0) {
      await this.checkTierAccess(organizationId, requiredTiers);
    }

    // Check feature-based access
    const featureCheck = this.reflector.getAllAndOverride<FeatureCheckConfig>(FEATURE_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (featureCheck) {
      await this.checkFeatureAccess(organizationId, featureCheck, request);
    }

    return true;
  }

  /**
   * Extract organization ID from request
   * Supports: JWT token, query param, header, body
   */
  private extractOrganizationId(request: any): string | null {
    // From JWT user context (set by auth guard)
    if (request.user?.organizationId) {
      return request.user.organizationId;
    }

    // From query parameter
    if (request.query?.organizationId) {
      return request.query.organizationId;
    }

    // From header
    if (request.headers['x-organization-id']) {
      return request.headers['x-organization-id'];
    }

    // From request body
    if (request.body?.organizationId) {
      return request.body.organizationId;
    }

    return null;
  }

  /**
   * Check if organization has one of the required tiers
   */
  private async checkTierAccess(
    organizationId: string,
    requiredTiers: SubscriptionTier[],
  ): Promise<void> {
    const subscription = await this.subscriptionService.getOrganizationSubscription(organizationId);
    const currentTier = subscription.tier as SubscriptionTier;

    if (!requiredTiers.includes(currentTier)) {
      throw new ForbiddenException({
        error: 'TIER_ACCESS_DENIED',
        message: `This feature requires ${requiredTiers.join(' or ')} tier`,
        currentTier,
        requiredTiers,
        upgradeUrl: '/billing/upgrade',
      });
    }
  }

  /**
   * Check if organization has feature capacity
   */
  private async checkFeatureAccess(
    organizationId: string,
    config: FeatureCheckConfig,
    request: any,
  ): Promise<void> {
    const currentUsage = config.getUsage ? await config.getUsage(request) : 0;

    const access = await this.subscriptionService.hasFeatureAccess(
      organizationId,
      config.feature,
      currentUsage,
    );

    if (!access.allowed) {
      throw new ForbiddenException({
        error: 'FEATURE_LIMIT_EXCEEDED',
        message: `You have reached your ${config.feature} limit`,
        feature: config.feature,
        limit: access.limit,
        currentUsage,
        remaining: access.remaining,
        upgradeUrl: '/billing/upgrade',
      });
    }
  }
}

/**
 * FeatureGatingMiddleware - Global middleware for tracking feature usage
 * Use for analytics and soft limits (warnings instead of blocks)
 */
@Injectable()
export class FeatureUsageMiddleware {
  constructor(
    @Inject(SubscriptionService)
    private subscriptionService: SubscriptionService,
  ) {}

  async use(request: any, response: any, next: () => void): Promise<void> {
    const organizationId =
      request.user?.organizationId ||
      request.query?.organizationId ||
      request.headers['x-organization-id'];

    if (organizationId) {
      try {
        const subscription =
          await this.subscriptionService.getOrganizationSubscription(organizationId);

        // Attach subscription info to request for downstream use
        request.subscription = subscription;

        // Add usage headers for client awareness
        response.setHeader('X-Subscription-Tier', subscription.tier);
        if (subscription.features.apiCalls !== -1) {
          response.setHeader('X-API-Limit', subscription.features.apiCalls);
        }
      } catch {
        // Don't block request on subscription lookup failure
      }
    }

    next();
  }
}

/**
 * API Rate limiting by tier
 */
export const TIER_RATE_LIMITS: Record<SubscriptionTier, { windowMs: number; max: number }> = {
  FREE: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
  },
  PROFESSIONAL: {
    windowMs: 60 * 1000,
    max: 300, // 300 requests per minute
  },
  ENTERPRISE: {
    windowMs: 60 * 1000,
    max: 1000, // 1000 requests per minute
  },
};

/**
 * Feature-specific limits by tier
 */
export const FEATURE_TIER_MATRIX = {
  questionnaires: { FREE: 1, PROFESSIONAL: 10, ENTERPRISE: -1 },
  responses: { FREE: 100, PROFESSIONAL: 5000, ENTERPRISE: -1 },
  documents: { FREE: 3, PROFESSIONAL: 50, ENTERPRISE: -1 },
  apiCalls: { FREE: 1000, PROFESSIONAL: 50000, ENTERPRISE: -1 },
  teamMembers: { FREE: 2, PROFESSIONAL: 10, ENTERPRISE: -1 },
  dimensions: { FREE: 3, PROFESSIONAL: 11, ENTERPRISE: 11 },
  exportFormats: {
    FREE: ['PDF'],
    PROFESSIONAL: ['PDF', 'DOCX'],
    ENTERPRISE: ['PDF', 'DOCX', 'JSON', 'XML'],
  },
  customBranding: { FREE: false, PROFESSIONAL: false, ENTERPRISE: true },
  ssoIntegration: { FREE: false, PROFESSIONAL: false, ENTERPRISE: true },
  prioritySupport: { FREE: false, PROFESSIONAL: true, ENTERPRISE: true },
  auditLogs: { FREE: false, PROFESSIONAL: true, ENTERPRISE: true },
  apiAccess: { FREE: false, PROFESSIONAL: true, ENTERPRISE: true },
} as const;

/**
 * Helper to check if a feature is available for a tier
 */
export function isFeatureAvailable(
  tier: SubscriptionTier,
  feature: keyof typeof FEATURE_TIER_MATRIX,
): boolean {
  const featureConfig = FEATURE_TIER_MATRIX[feature];
  const value = featureConfig[tier] as number | boolean | readonly string[];

  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value > 0 || value === -1;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

/**
 * Helper to get feature limit for a tier
 */
export function getFeatureLimit(
  tier: SubscriptionTier,
  feature: keyof typeof FEATURE_TIER_MATRIX,
): number | boolean | readonly string[] {
  return FEATURE_TIER_MATRIX[feature][tier];
}
