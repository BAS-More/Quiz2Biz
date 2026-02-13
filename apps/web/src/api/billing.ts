/**
 * Billing API Client
 * Handles all billing-related API calls
 */

import { apiClient } from './client';

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
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  invoicePdf?: string;
  hostedUrl?: string;
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

// Billing API functions
export const billingApi = {
  /**
   * Get current subscription
   */
  async getSubscription(): Promise<Subscription> {
    const response = await apiClient.get<Subscription>('/payment/subscription');
    return response.data;
  },

  /**
   * Get available tiers
   */
  async getTiers(): Promise<SubscriptionTier[]> {
    const response = await apiClient.get<SubscriptionTier[]>('/payment/tiers');
    return response.data;
  },

  /**
   * Get billing history / invoices
   */
  async getInvoices(limit = 10): Promise<Invoice[]> {
    const response = await apiClient.get<Invoice[]>(`/payment/invoices?limit=${limit}`);
    return response.data;
  },

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const response = await apiClient.get<UsageStats>('/payment/usage');
    return response.data;
  },

  /**
   * Create checkout session for upgrade
   */
  async createCheckoutSession(tier: string): Promise<CheckoutSession> {
    const response = await apiClient.post<CheckoutSession>('/payment/checkout', { tier });
    return response.data;
  },

  /**
   * Create customer portal session for managing subscription
   */
  async createPortalSession(): Promise<{ url: string }> {
    const response = await apiClient.post<{ url: string }>('/payment/portal');
    return response.data;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<void> {
    await apiClient.post('/payment/cancel');
  },

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(): Promise<void> {
    await apiClient.post('/payment/resume');
  },
};

export default billingApi;
