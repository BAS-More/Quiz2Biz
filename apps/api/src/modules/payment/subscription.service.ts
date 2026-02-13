import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from './payment.service';
import {
  SubscriptionResponseDto,
  SubscriptionTierDto,
  SubscriptionStatusDto,
} from './dto/payment.dto';

interface ActivateSubscriptionParams {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  tier: SubscriptionTier;
}

interface SyncSubscriptionParams {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * SubscriptionService - Manages subscription tier logic and database sync
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get subscription for an organization
   */
  async getOrganizationSubscription(organizationId: string): Promise<SubscriptionResponseDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    const subscription = org.subscription as {
      plan?: string;
      status?: string;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      currentPeriodEnd?: string;
      cancelAtPeriodEnd?: boolean;
    } | null;

    const tier = (subscription?.plan?.toUpperCase() || 'FREE') as SubscriptionTier;
    const tierConfig = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.FREE;

    return {
      organizationId,
      tier: tier as SubscriptionTierDto,
      status: (subscription?.status || 'active') as SubscriptionStatusDto,
      stripeCustomerId: subscription?.stripeCustomerId,
      stripeSubscriptionId: subscription?.stripeSubscriptionId,
      currentPeriodEnd: subscription?.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd)
        : undefined,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      features: tierConfig.features,
    };
  }

  /**
   * Activate a subscription after successful checkout
   */
  async activateSubscription(params: ActivateSubscriptionParams): Promise<void> {
    this.logger.log(
      `Activating subscription for org ${params.organizationId}, tier ${params.tier}`,
    );

    await this.prisma.organization.update({
      where: { id: params.organizationId },
      data: {
        subscription: {
          plan: params.tier,
          status: 'active',
          stripeCustomerId: params.stripeCustomerId,
          stripeSubscriptionId: params.stripeSubscriptionId,
          activatedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Sync subscription status from Stripe webhook
   */
  async syncSubscriptionStatus(params: SyncSubscriptionParams): Promise<void> {
    this.logger.log(`Syncing subscription ${params.stripeSubscriptionId}, status ${params.status}`);

    // Find organization by Stripe customer ID
    const orgs = await this.prisma.organization.findMany({
      where: {
        subscription: {
          path: ['stripeCustomerId'],
          equals: params.stripeCustomerId,
        },
      },
    });

    if (orgs.length === 0) {
      this.logger.warn(`No organization found for Stripe customer ${params.stripeCustomerId}`);
      return;
    }

    for (const org of orgs) {
      const currentSubscription = org.subscription as Record<string, unknown>;

      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          subscription: {
            ...currentSubscription,
            status: params.status,
            currentPeriodEnd: params.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: params.cancelAtPeriodEnd,
            syncedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  /**
   * Cancel subscription by Stripe ID
   */
  async cancelSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void> {
    this.logger.log(`Canceling subscription ${stripeSubscriptionId}`);

    const orgs = await this.prisma.organization.findMany({
      where: {
        subscription: {
          path: ['stripeSubscriptionId'],
          equals: stripeSubscriptionId,
        },
      },
    });

    for (const org of orgs) {
      const currentSubscription = org.subscription as Record<string, unknown>;

      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          subscription: {
            ...currentSubscription,
            plan: 'FREE',
            status: 'canceled',
            canceledAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  /**
   * Check if organization has access to a feature
   */
  async hasFeatureAccess(
    organizationId: string,
    feature: keyof typeof SUBSCRIPTION_TIERS.FREE.features,
    currentUsage: number = 0,
  ): Promise<{ allowed: boolean; limit: number; remaining: number }> {
    const subscription = await this.getOrganizationSubscription(organizationId);
    const limit = subscription.features[feature] as number;

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, limit: -1, remaining: -1 };
    }

    const remaining = limit - currentUsage;
    return {
      allowed: remaining > 0,
      limit: limit,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Get all organizations by tier
   */
  async getOrganizationsByTier(tier: SubscriptionTier): Promise<string[]> {
    const orgs = await this.prisma.organization.findMany({
      where: {
        subscription: {
          path: ['plan'],
          equals: tier,
        },
      },
      select: { id: true },
    });

    return orgs.map((o: { id: string }) => o.id);
  }

  /**
   * Get tier features
   */
  getTierFeatures(tier: SubscriptionTier): Record<string, number | string> {
    const features = SUBSCRIPTION_TIERS[tier]?.features || SUBSCRIPTION_TIERS.FREE.features;
    return features as Record<string, number | string>;
  }

  /**
   * Compare tiers to determine if upgrade or downgrade
   */
  compareTiers(
    currentTier: SubscriptionTier,
    newTier: SubscriptionTier,
  ): 'upgrade' | 'downgrade' | 'same' {
    const tierOrder: SubscriptionTier[] = ['FREE', 'PROFESSIONAL', 'ENTERPRISE'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const newIndex = tierOrder.indexOf(newTier);

    if (newIndex > currentIndex) {
      return 'upgrade';
    }
    if (newIndex < currentIndex) {
      return 'downgrade';
    }
    return 'same';
  }
}
