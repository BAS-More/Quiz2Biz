import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API client
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('./client', () => {
  const client = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: {
      headers: { common: {} },
    },
  };
  return { apiClient: client, default: client };
});

import { billingApi, type Subscription, type SubscriptionTier } from './billing';

const mockSubscription: Subscription = {
  organizationId: 'org-1',
  tier: 'PROFESSIONAL',
  status: 'active',
  stripeCustomerId: 'cus_123',
  stripeSubscriptionId: 'sub_456',
  currentPeriodEnd: '2024-12-31T00:00:00Z',
  cancelAtPeriodEnd: false,
  features: {
    questionnaires: 100,
    responses: 5000,
    documents: 50,
    apiCalls: 10000,
    support: 'priority',
  },
};

describe('billingApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock /users/me to return org ID (used by getOrganizationId)
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/users/me')) {
        return Promise.resolve({
          data: { organization: { id: 'org-1', name: 'Test Org' } },
        });
      }
      return Promise.reject(new Error(`Unmocked GET: ${url}`));
    });
  });

  describe('getSubscription', () => {
    it('fetches subscription for the current org', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: mockSubscription });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      const result = await billingApi.getSubscription();

      expect(result).toEqual(mockSubscription);
    });

    it('throws when user has no organization', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('Not found'));
      });

      await expect(billingApi.getSubscription()).rejects.toThrow(
        'Organization is required for billing operations',
      );
    });
  });

  describe('getTiers', () => {
    it('fetches and returns tiers as array', async () => {
      const tiers: Record<string, SubscriptionTier> = {
        free: {
          id: 'free',
          name: 'Free',
          price: 0,
          features: {
            questionnaires: 1,
            responses: 100,
            documents: 5,
            apiCalls: 500,
            support: 'community',
          },
        },
        pro: {
          id: 'pro',
          name: 'Professional',
          price: 49,
          features: {
            questionnaires: 100,
            responses: 5000,
            documents: 50,
            apiCalls: 10000,
            support: 'priority',
          },
        },
      };

      mockGet.mockImplementation((url: string) => {
        if (url.includes('/payment/tiers')) {
          return Promise.resolve({ data: tiers });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      const result = await billingApi.getTiers();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toContain('free');
      expect(result.map((t) => t.id)).toContain('pro');
    });
  });

  describe('getInvoices', () => {
    it('fetches invoices using stripeCustomerId from subscription', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: mockSubscription });
        }
        if (url.includes('/payment/invoices/cus_123')) {
          return Promise.resolve({
            data: [{ id: 'inv-1', status: 'paid', amount: 4900 }],
          });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      const result = await billingApi.getInvoices(5);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('inv-1');
    });

    it('returns empty array when no stripeCustomerId', async () => {
      const noStripeSub = { ...mockSubscription, stripeCustomerId: undefined };
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: noStripeSub });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      const result = await billingApi.getInvoices();
      expect(result).toEqual([]);
    });
  });

  describe('getUsage', () => {
    it('returns usage stats with proper shape', async () => {
      const usageData = {
        questionnaires: { used: 5, limit: 100 },
        responses: { used: 200, limit: 5000 },
        documents: { used: 3, limit: 50 },
        apiCalls: { used: 1000, limit: 10000 },
      };

      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: mockSubscription });
        }
        if (url.includes('/payment/usage/org-1')) {
          return Promise.resolve({ data: usageData });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      const result = await billingApi.getUsage();
      expect(result.questionnaires.used).toBe(5);
      expect(result.questionnaires.limit).toBe(100);
    });

    it('handles backward-compatible flat usage shape', async () => {
      const flatUsage = { questionnaires: 5, responses: 200, documents: 3, apiCalls: 1000 };

      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: mockSubscription });
        }
        if (url.includes('/payment/usage/org-1')) {
          return Promise.resolve({ data: flatUsage });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      const result = await billingApi.getUsage();
      expect(result.questionnaires.used).toBe(5);
      expect(result.questionnaires.limit).toBe(100); // from subscription features
    });

    it('falls back to zero usage on error', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: mockSubscription });
        }
        if (url.includes('/payment/usage/')) {
          return Promise.reject(new Error('Service unavailable'));
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      const result = await billingApi.getUsage();
      expect(result.questionnaires.used).toBe(0);
      expect(result.questionnaires.limit).toBe(100);
    });
  });

  describe('createCheckoutSession', () => {
    it('posts checkout request with org ID and tier', async () => {
      mockPost.mockResolvedValueOnce({
        data: { sessionId: 'cs_123', url: 'https://stripe.com/checkout' },
      });

      const result = await billingApi.createCheckoutSession('PROFESSIONAL');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/payment/checkout', {
        organizationId: 'org-1',
        tier: 'PROFESSIONAL',
        successUrl: expect.stringContaining('/billing?checkout=success'),
        cancelUrl: expect.stringContaining('/billing/upgrade?checkout=cancel'),
      });
      expect(result.url).toBe('https://stripe.com/checkout');
    });
  });

  describe('createPortalSession', () => {
    it('posts portal request with customerId', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: mockSubscription });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      mockPost.mockResolvedValueOnce({
        data: { url: 'https://stripe.com/portal' },
      });

      const result = await billingApi.createPortalSession();

      expect(mockPost).toHaveBeenCalledWith('/api/v1/payment/portal', {
        customerId: 'cus_123',
        returnUrl: expect.stringContaining('/billing'),
      });
      expect(result.url).toBe('https://stripe.com/portal');
    });

    it('throws when no stripe customer', async () => {
      const noStripeSub = { ...mockSubscription, stripeCustomerId: undefined };
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return Promise.resolve({
            data: { organization: { id: 'org-1', name: 'Test Org' } },
          });
        }
        if (url.includes('/payment/subscription/org-1')) {
          return Promise.resolve({ data: noStripeSub });
        }
        return Promise.reject(new Error(`Unmocked GET: ${url}`));
      });

      await expect(billingApi.createPortalSession()).rejects.toThrow('No Stripe customer found');
    });
  });

  describe('cancelSubscription', () => {
    it('posts cancel request', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await billingApi.cancelSubscription();

      expect(mockPost).toHaveBeenCalledWith('/api/v1/payment/cancel/org-1');
    });
  });

  describe('resumeSubscription', () => {
    it('posts resume request', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      await billingApi.resumeSubscription();

      expect(mockPost).toHaveBeenCalledWith('/api/v1/payment/resume/org-1');
    });
  });
});
