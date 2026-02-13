/**
 * BillingPage - Main billing dashboard showing subscription status and usage
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, type Subscription, type UsageStats } from '../../api/billing';

// Tier display config
const TIER_CONFIG = {
  FREE: { color: 'gray', label: 'Free', badge: 'bg-gray-100 text-gray-800' },
  PROFESSIONAL: { color: 'blue', label: 'Professional', badge: 'bg-blue-100 text-blue-800' },
  ENTERPRISE: { color: 'purple', label: 'Enterprise', badge: 'bg-purple-100 text-purple-800' },
};

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === -1;
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={isNearLimit ? 'text-red-600 font-semibold' : 'text-gray-500'}>
          {used.toLocaleString()} / {isUnlimited ? 'Unlimited' : limit.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isNearLimit ? 'bg-red-500' : 'bg-blue-600'
          } ${isUnlimited ? 'bg-green-500' : ''}`}
          style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const queryClient = useQueryClient();
  const tierConfig = TIER_CONFIG[subscription.tier];

  const cancelMutation = useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: billingApi.resumeSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });

  const portalMutation = useMutation({
    mutationFn: billingApi.createPortalSession,
    onSuccess: (data) => (window.location.href = data.url),
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
          <p className="text-gray-500 text-sm">Manage your subscription</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierConfig.badge}`}>
          {tierConfig.label}
        </span>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Status</span>
          <span
            className={`font-medium ${
              subscription.status === 'active'
                ? 'text-green-600'
                : subscription.status === 'past_due'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {subscription.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {subscription.currentPeriodEnd && (
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">
              {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Renews On'}
            </span>
            <span className="font-medium text-gray-900">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              Your subscription will be canceled at the end of the billing period.
              <button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="ml-2 text-yellow-700 underline hover:text-yellow-900"
              >
                Resume subscription
              </button>
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {subscription.tier !== 'ENTERPRISE' && (
          <a
            href="/billing/upgrade"
            className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upgrade Plan
          </a>
        )}

        {subscription.stripeSubscriptionId && (
          <>
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Manage Billing
            </button>

            {!subscription.cancelAtPeriodEnd && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to cancel your subscription?')) {
                    cancelMutation.mutate();
                  }
                }}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-red-600 hover:text-red-700"
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UsageCard({ usage }: { usage: UsageStats }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Usage</h2>
        <p className="text-gray-500 text-sm">Current billing period</p>
      </div>

      <div className="space-y-6">
        <UsageBar
          used={usage.questionnaires.used}
          limit={usage.questionnaires.limit}
          label="Questionnaires"
        />
        <UsageBar used={usage.responses.used} limit={usage.responses.limit} label="Responses" />
        <UsageBar used={usage.documents.used} limit={usage.documents.limit} label="Documents" />
        <UsageBar used={usage.apiCalls.used} limit={usage.apiCalls.limit} label="API Calls" />
      </div>
    </div>
  );
}

export function BillingPage() {
  const {
    data: subscription,
    isLoading: subLoading,
    error: subError,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: billingApi.getSubscription,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: billingApi.getUsage,
  });

  if (subLoading || usageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (subError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load billing</h2>
          <p className="text-gray-500">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500">Manage your plan and view usage</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {subscription && <SubscriptionCard subscription={subscription} />}
        {usage && <UsageCard usage={usage} />}
      </div>

      <div className="mt-8">
        <a href="/billing/invoices" className="text-blue-600 hover:text-blue-700 font-medium">
          View Invoice History →
        </a>
      </div>
    </div>
  );
}

export default BillingPage;
