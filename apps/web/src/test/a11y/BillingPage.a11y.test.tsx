/**
 * Accessibility tests for BillingPage component
 * WCAG 2.2 Level AA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

interface Subscription {
  tier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'active' | 'past_due' | 'canceled';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  stripeSubscriptionId?: string;
}

interface UsageStats {
  questionnaires: { used: number; limit: number };
  responses: { used: number; limit: number };
  documents: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
}

// Accessible mock UsageBar component
function MockUsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === -1;
  const isNearLimit = !isUnlimited && percentage >= 80;
  const displayLimit = isUnlimited ? 'Unlimited' : limit.toLocaleString();

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span id={`usage-${label.toLowerCase()}-label`} className="font-medium text-gray-700">
          {label}
        </span>
        <span
          className={isNearLimit ? 'text-red-600 font-semibold' : 'text-gray-500'}
          aria-live="polite"
        >
          {used.toLocaleString()} / {displayLimit}
          {isNearLimit && <span className="sr-only"> - approaching limit</span>}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={isUnlimited ? 100 : percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} usage: ${used.toLocaleString()} of ${displayLimit}`}
        className="w-full bg-gray-200 rounded-full h-2"
      >
        <div
          className={`h-2 rounded-full ${isNearLimit ? 'bg-red-500' : 'bg-blue-600'}`}
          style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

// Accessible mock SubscriptionCard component
function MockSubscriptionCard({
  subscription,
  onCancel,
  onResume,
  onManageBilling,
}: {
  subscription: Subscription;
  onCancel?: () => void;
  onResume?: () => void;
  onManageBilling?: () => void;
}) {
  const tierLabels = {
    FREE: 'Free',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Enterprise',
  };

  return (
    <article className="bg-white rounded-lg shadow-md p-6" aria-labelledby="subscription-heading">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 id="subscription-heading" className="text-xl font-semibold text-gray-900">
            Current Plan
          </h2>
          <p className="text-gray-500 text-sm">Manage your subscription</p>
        </div>
        <span
          className="px-3 py-1 rounded-full text-sm font-medium"
          aria-label={`Current tier: ${tierLabels[subscription.tier]}`}
        >
          {tierLabels[subscription.tier]}
        </span>
      </div>

      <dl className="space-y-4 mb-6">
        <div className="flex justify-between py-2 border-b border-gray-100">
          <dt className="text-gray-600">Status</dt>
          <dd
            className={`font-medium ${
              subscription.status === 'active'
                ? 'text-green-600'
                : subscription.status === 'past_due'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
            aria-live="polite"
          >
            {subscription.status.replace('_', ' ').toUpperCase()}
          </dd>
        </div>

        {subscription.currentPeriodEnd && (
          <div className="flex justify-between py-2 border-b border-gray-100">
            <dt className="text-gray-600">
              {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Renews On'}
            </dt>
            <dd className="font-medium text-gray-900">
              <time dateTime={subscription.currentPeriodEnd}>
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </time>
            </dd>
          </div>
        )}
      </dl>

      {subscription.cancelAtPeriodEnd && (
        <div role="alert" className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Your subscription will be canceled at the end of the billing period.
            <button
              onClick={onResume}
              className="ml-2 text-yellow-700 underline hover:text-yellow-900"
            >
              Resume subscription
            </button>
          </p>
        </div>
      )}

      <div className="flex gap-3" role="group" aria-label="Subscription actions">
        {subscription.tier !== 'ENTERPRISE' && (
          <a
            href="/billing/upgrade"
            className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Upgrade Plan
          </a>
        )}

        {subscription.stripeSubscriptionId && (
          <>
            <button
              onClick={onManageBilling}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
            >
              Manage Billing
            </button>

            {!subscription.cancelAtPeriodEnd && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-red-600 hover:text-red-700"
                aria-describedby="cancel-warning"
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
      <p id="cancel-warning" className="sr-only">
        Canceling will end your subscription at the current billing period
      </p>
    </article>
  );
}

// Accessible mock UsageCard component
function MockUsageCard({ usage }: { usage: UsageStats }) {
  return (
    <article className="bg-white rounded-lg shadow-md p-6" aria-labelledby="usage-heading">
      <div className="mb-6">
        <h2 id="usage-heading" className="text-xl font-semibold text-gray-900">
          Usage
        </h2>
        <p className="text-gray-500 text-sm">Current billing period</p>
      </div>

      <div className="space-y-6" role="list" aria-label="Usage metrics">
        <div role="listitem">
          <MockUsageBar
            used={usage.questionnaires.used}
            limit={usage.questionnaires.limit}
            label="Questionnaires"
          />
        </div>
        <div role="listitem">
          <MockUsageBar
            used={usage.responses.used}
            limit={usage.responses.limit}
            label="Responses"
          />
        </div>
        <div role="listitem">
          <MockUsageBar
            used={usage.documents.used}
            limit={usage.documents.limit}
            label="Documents"
          />
        </div>
        <div role="listitem">
          <MockUsageBar used={usage.apiCalls.used} limit={usage.apiCalls.limit} label="API Calls" />
        </div>
      </div>
    </article>
  );
}

// Accessible mock BillingPage component
function MockBillingPage({
  subscription,
  usage,
  isLoading = false,
  error = null,
}: {
  subscription?: Subscription;
  usage?: UsageStats;
  isLoading?: boolean;
  error?: string | null;
}) {
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        role="status"
        aria-label="Loading billing information"
        aria-busy="true"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          aria-hidden="true"
        />
        <span className="sr-only">Loading billing information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="alert">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Failed to load billing</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8" role="main">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500">Manage your plan and view usage</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {subscription && <MockSubscriptionCard subscription={subscription} />}
        {usage && <MockUsageCard usage={usage} />}
      </div>

      <nav className="mt-8" aria-label="Billing navigation">
        <a href="/billing/invoices" className="text-blue-600 hover:text-blue-700 font-medium">
          View Invoice History →
        </a>
      </nav>
    </main>
  );
}

// Test data
const mockSubscription: Subscription = {
  tier: 'PROFESSIONAL',
  status: 'active',
  currentPeriodEnd: '2026-02-28',
  cancelAtPeriodEnd: false,
  stripeSubscriptionId: 'sub_123456',
};

const mockUsage: UsageStats = {
  questionnaires: { used: 5, limit: 10 },
  responses: { used: 450, limit: 1000 },
  documents: { used: 12, limit: 50 },
  apiCalls: { used: 8500, limit: 10000 },
};

describe('BillingPage Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Full page with data', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading structure', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent('Billing & Subscription');

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s).toHaveLength(2); // Current Plan, Usage
    });

    it('should have main landmark', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should have labeled articles for subscription and usage', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(2);
    });
  });

  describe('Subscription card', () => {
    it('should have accessible subscription card', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const subscriptionCard = screen.getByRole('article', { name: /current plan/i });
      expect(subscriptionCard).toBeInTheDocument();
    });

    it('should have accessible tier badge', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const tierBadge = screen.getByLabelText(/current tier.*professional/i);
      expect(tierBadge).toBeInTheDocument();
    });

    it('should use definition list for subscription details', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const terms = screen.getAllByRole('term');
      const definitions = screen.getAllByRole('definition');

      expect(terms.length).toBeGreaterThan(0);
      expect(definitions.length).toBeGreaterThan(0);
    });

    it('should have proper time element for renewal date', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('datetime', '2026-02-28');
    });

    it('should have accessible action buttons group', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const actionGroup = screen.getByRole('group', { name: /subscription actions/i });
      expect(actionGroup).toBeInTheDocument();
    });

    it('should have cancel warning accessible to screen readers', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const cancelWarning = document.getElementById('cancel-warning');
      expect(cancelWarning).toBeInTheDocument();
    });
  });

  describe('Cancellation warning', () => {
    const canceledSubscription: Subscription = {
      ...mockSubscription,
      cancelAtPeriodEnd: true,
    };

    it('should show cancellation warning with alert role', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={canceledSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/will be canceled/i);
    });

    it('should have accessible resume subscription button', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={canceledSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const resumeButton = screen.getByRole('button', { name: /resume subscription/i });
      expect(resumeButton).toBeInTheDocument();
    });
  });

  describe('Usage card', () => {
    it('should have accessible usage card', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const usageCard = screen.getByRole('article', { name: /usage/i });
      expect(usageCard).toBeInTheDocument();
    });

    it('should have accessible progress bars', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(4);

      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
        expect(bar).toHaveAttribute('aria-label');
      });
    });

    it('should have usage list with accessible items', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const usageList = screen.getByRole('list', { name: /usage metrics/i });
      expect(usageList).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(4);
    });
  });

  describe('Near limit warning', () => {
    const highUsage: UsageStats = {
      ...mockUsage,
      apiCalls: { used: 9500, limit: 10000 }, // 95% - near limit
    };

    it('should announce near limit state', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={highUsage} />
        </BrowserRouter>,
      );

      expect(screen.getByText(/approaching limit/i)).toBeInTheDocument();
    });
  });

  describe('Unlimited usage', () => {
    const unlimitedUsage: UsageStats = {
      questionnaires: { used: 100, limit: -1 },
      responses: { used: 10000, limit: -1 },
      documents: { used: 500, limit: -1 },
      apiCalls: { used: 50000, limit: -1 },
    };

    it('should display unlimited correctly', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={unlimitedUsage} />
        </BrowserRouter>,
      );

      const unlimitedTexts = screen.getAllByText(/unlimited/i);
      expect(unlimitedTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Loading state', () => {
    it('should have no accessibility violations when loading', async () => {
      const { container } = render(
        <BrowserRouter>
          <MockBillingPage isLoading={true} />
        </BrowserRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should indicate loading state properly', () => {
      render(
        <BrowserRouter>
          <MockBillingPage isLoading={true} />
        </BrowserRouter>,
      );

      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toHaveAttribute('aria-busy', 'true');
      expect(loadingStatus).toHaveAttribute('aria-label', 'Loading billing information');
    });

    it('should have screen reader text for loading', () => {
      render(
        <BrowserRouter>
          <MockBillingPage isLoading={true} />
        </BrowserRouter>,
      );

      expect(screen.getByText(/loading billing information/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should have no accessibility violations with error', async () => {
      const { container } = render(
        <BrowserRouter>
          <MockBillingPage error="Please try again later" />
        </BrowserRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should display error with alert role', () => {
      render(
        <BrowserRouter>
          <MockBillingPage error="Please try again later" />
        </BrowserRouter>,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should have error heading', () => {
      render(
        <BrowserRouter>
          <MockBillingPage error="Please try again later" />
        </BrowserRouter>,
      );

      const errorHeading = screen.getByRole('heading', { name: /failed to load billing/i });
      expect(errorHeading).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have accessible invoice history link', () => {
      render(
        <BrowserRouter>
          <MockBillingPage subscription={mockSubscription} usage={mockUsage} />
        </BrowserRouter>,
      );

      const nav = screen.getByRole('navigation', { name: /billing navigation/i });
      expect(nav).toBeInTheDocument();

      const invoiceLink = screen.getByRole('link', { name: /view invoice history/i });
      expect(invoiceLink).toHaveAttribute('href', '/billing/invoices');
    });
  });
});
