import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { BillingPage } from './BillingPage';

// Mock billing API
vi.mock('../../api/billing', () => ({
  billingApi: {
    getSubscription: vi.fn(),
    getUsage: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    createPortalSession: vi.fn(),
  },
}));

const mockSubscription = {
  id: 'sub_123',
  tier: 'PROFESSIONAL' as const,
  status: 'active' as const,
  currentPeriodStart: '2026-01-01T00:00:00Z',
  currentPeriodEnd: '2026-02-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  stripeSubscriptionId: 'sub_stripe_123',
  organizationId: 'org_123',
  features: {} as Record<string, string | number>,
};

const mockUsage = {
  questionnaires: { used: 5, limit: 10 },
  responses: { used: 50, limit: 100 },
  documents: { used: 3, limit: 20 },
  apiCalls: { used: 500, limit: 10000 },
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderBillingPage = () => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BillingPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('BillingPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { billingApi } = await import('../../api/billing');
    vi.mocked(billingApi.getSubscription).mockResolvedValue(mockSubscription);
    vi.mocked(billingApi.getUsage).mockResolvedValue(mockUsage);
  });

  it('renders billing page with subscription info', async () => {
    renderBillingPage();

    await waitFor(() => {
      expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    });
  });

  it('displays subscription tier', async () => {
    renderBillingPage();

    await waitFor(() => {
      expect(screen.getByText(/professional/i)).toBeInTheDocument();
    });
  });

  it('displays usage information', async () => {
    renderBillingPage();

    await waitFor(() => {
      expect(screen.getAllByText(/usage/i).length).toBeGreaterThan(0);
    });
  });

  it('shows loading spinner while fetching data', () => {
    renderBillingPage();

    // Initially shows loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
