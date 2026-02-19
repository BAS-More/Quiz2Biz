/**
 * Billing API Client
 * Handles all billing-related API calls
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1';
const PAYMENT_PREFIX = `${API_PREFIX}/api/payment`;

interface CurrentUserProfile {
  organization?: {
    id: string;
    name: string;
  };
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  priceId?: string;
  features: {
    questionnaires: number;
    responses: number;
    documents: number;
    apiCalls: number;
    support: string;
  };
}

export interface Subscription {
  organizationId: string;
  tier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  features: Record<string, number | string>;
}

export interface Invoice {
  id: string;
  stripeInvoiceId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' | 'unknown';
  amount: number;
  currency: string;
  paidAt?: string;
  createdAt: string;
  invoicePdfUrl?: string;
  invoiceUrl?: string;
}

export interface UsageStats {
  questionnaires: { used: number; limit: number };
  responses: { used: number; limit: number };
  documents: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

async function getOrganizationId(): Promise<string> {
  const response = await apiClient.get<CurrentUserProfile>(`${API_PREFIX}/users/me`);
  const organizationId = response.data.organization?.id;

  if (!organizationId) {
    throw new Error('Organization is required for billing operations');
  }

  return organizationId;
}

function toUsageStatsWithLimits(
  subscription: Subscription,
  used?: Partial<Record<keyof UsageStats, number>>,
): UsageStats {
  const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);
  return {
    questionnaires: {
      used: used?.questionnaires ?? 0,
      limit: asNumber(subscription.features.questionnaires),
    },
    responses: {
      used: used?.responses ?? 0,
      limit: asNumber(subscription.features.responses),
    },
    documents: {
      used: used?.documents ?? 0,
      limit: asNumber(subscription.features.documents),
    },
    apiCalls: {
      used: used?.apiCalls ?? 0,
      limit: asNumber(subscription.features.apiCalls),
    },
  };
}

// Billing API functions
export const billingApi = {
  /**
   * Get current subscription
   */
  async getSubscription(): Promise<Subscription> {
    const organizationId = await getOrganizationId();
    const response = await apiClient.get<Subscription>(
      `${PAYMENT_PREFIX}/subscription/${organizationId}`,
    );
    return response.data;
  },

  /**
   * Get available tiers
   */
  async getTiers(): Promise<SubscriptionTier[]> {
    const response = await apiClient.get<Record<string, SubscriptionTier>>(`${PAYMENT_PREFIX}/tiers`);
    return Object.values(response.data);
  },

  /**
   * Get billing history / invoices
   */
  async getInvoices(limit = 10): Promise<Invoice[]> {
    const subscription = await this.getSubscription();
    if (!subscription.stripeCustomerId) {
      return [];
    }

    const response = await apiClient.get<Invoice[]>(
      `${PAYMENT_PREFIX}/invoices/${subscription.stripeCustomerId}?limit=${limit}`,
    );
    return response.data;
  },

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const subscription = await this.getSubscription();
    const organizationId = subscription.organizationId;

    try {
      const response = await apiClient.get<
        | UsageStats
        | {
            questionnaires: number;
            responses: number;
            documents: number;
            apiCalls: number;
          }
      >(`${PAYMENT_PREFIX}/usage/${organizationId}`);

      // Preferred backend shape: { metric: { used, limit } }
      if (
        typeof response.data === 'object' &&
        response.data !== null &&
        'questionnaires' in response.data &&
        typeof (response.data as UsageStats).questionnaires === 'object'
      ) {
        return response.data as UsageStats;
      }

      // Backward-compatible shape: { metric: usedNumber }
      return toUsageStatsWithLimits(
        subscription,
        response.data as {
          questionnaires: number;
          responses: number;
          documents: number;
          apiCalls: number;
        },
      );
    } catch {
      // Fallback if usage endpoint is unavailable: still return tier limits
      return toUsageStatsWithLimits(subscription);
    }
  },

  /**
   * Create checkout session for upgrade
   */
  async createCheckoutSession(tier: string): Promise<CheckoutSession> {
    const organizationId = await getOrganizationId();
    const origin = window.location.origin;
    const response = await apiClient.post<CheckoutSession>(`${PAYMENT_PREFIX}/checkout`, {
      organizationId,
      tier,
      successUrl: `${origin}/billing?checkout=success`,
      cancelUrl: `${origin}/billing/upgrade?checkout=cancel`,
    });
    return response.data;
  },

  /**
   * Create customer portal session for managing subscription
   */
  async createPortalSession(): Promise<{ url: string }> {
    const subscription = await this.getSubscription();
    if (!subscription.stripeCustomerId) {
      throw new Error('No Stripe customer found for this subscription');
    }

    const response = await apiClient.post<{ url: string }>(`${PAYMENT_PREFIX}/portal`, {
      customerId: subscription.stripeCustomerId,
      returnUrl: `${window.location.origin}/billing`,
    });
    return response.data;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<void> {
    const organizationId = await getOrganizationId();
    await apiClient.post(`${PAYMENT_PREFIX}/cancel/${organizationId}`);
  },

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(): Promise<void> {
    const organizationId = await getOrganizationId();
    await apiClient.post(`${PAYMENT_PREFIX}/resume/${organizationId}`);
  },
};

export default billingApi;
