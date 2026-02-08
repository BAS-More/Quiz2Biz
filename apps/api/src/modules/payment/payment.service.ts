import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Subscription tiers with pricing
 * Note: Price IDs are fallback values. Actual price IDs are retrieved from
 * environment variables at runtime via ConfigService in the methods below.
 */
export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: {
      questionnaires: 1,
      responses: 100,
      documents: 3,
      apiCalls: 1000,
      support: 'community',
    },
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 49,
    priceId: 'price_professional', // Fallback if STRIPE_PRICE_PROFESSIONAL env var not set
    features: {
      questionnaires: 10,
      responses: 5000,
      documents: 50,
      apiCalls: 50000,
      support: 'email',
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceId: 'price_enterprise', // Fallback if STRIPE_PRICE_ENTERPRISE env var not set
    features: {
      questionnaires: -1, // unlimited
      responses: -1,
      documents: -1,
      apiCalls: -1,
      support: 'priority',
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * PaymentService - Core Stripe integration
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - payment features disabled');
      this.stripe = null as unknown as Stripe;
      return;
    }

    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Get the Stripe price ID for a subscription tier
   * Retrieves from environment variable via ConfigService, falls back to tier config default
   */
  private getPriceIdForTier(tier: SubscriptionTier): string {
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    let priceId = 'priceId' in tierConfig ? tierConfig.priceId : undefined;
    
    if (tier === 'PROFESSIONAL') {
      priceId = this.configService.get<string>('STRIPE_PRICE_PROFESSIONAL', priceId);
    } else if (tier === 'ENTERPRISE') {
      priceId = this.configService.get<string>('STRIPE_PRICE_ENTERPRISE', priceId);
    }
    
    if (!priceId) {
      throw new BadRequestException(`Price ID not configured for tier: ${tier}`);
    }
    
    return priceId;
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(params: {
    organizationId: string;
    tier: SubscriptionTier;
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
  }): Promise<{ sessionId: string; url: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    const tierConfig = SUBSCRIPTION_TIERS[params.tier];
    if (!tierConfig || params.tier === 'FREE') {
      throw new BadRequestException('Invalid tier for checkout');
    }

    const priceId = this.getPriceIdForTier(params.tier);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        organizationId: params.organizationId,
        tier: params.tier,
      },
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    this.logger.log(`Created checkout session ${session.id} for org ${params.organizationId}`);

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  /**
   * Create a customer portal session for billing management
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    organizationId: string;
  }): Promise<Stripe.Customer> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        organizationId: params.organizationId,
      },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for org ${params.organizationId}`);

    return customer;
  }

  /**
   * Retrieve a Stripe subscription
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    if (cancelAtPeriodEnd) {
      return this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Update subscription to a different tier
   */
  async updateSubscription(
    subscriptionId: string,
    newTier: SubscriptionTier,
  ): Promise<Stripe.Subscription> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    const tierConfig = SUBSCRIPTION_TIERS[newTier];
    if (!tierConfig || newTier === 'FREE') {
      throw new BadRequestException('Invalid tier for upgrade');
    }

    const priceId = this.getPriceIdForTier(newTier);

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0].id;

    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: itemId,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  /**
   * Verify webhook signature
   */
  constructWebhookEvent(payload: Buffer, signature: string, webhookSecret: string): Stripe.Event {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Retrieve invoices for a customer
   */
  async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Payment service not configured');
    }

    try {
      return await this.stripe.invoices.createPreview({
        customer: customerId,
      });
    } catch (error) {
      // No upcoming invoice
      return null;
    }
  }
}
