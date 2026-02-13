/**
 * UpgradePage - Pricing tiers and upgrade flow
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { billingApi } from '../../api/billing';

const TIER_FEATURES = {
  FREE: [
    '1 Questionnaire',
    '100 Responses',
    '3 Document exports',
    '1,000 API calls/month',
    'Community support',
    '3 Dimensions',
  ],
  PROFESSIONAL: [
    '10 Questionnaires',
    '5,000 Responses',
    '50 Document exports',
    '50,000 API calls/month',
    'Email support',
    'All 11 Dimensions',
    'PDF & DOCX exports',
    'Audit logs',
    'API access',
  ],
  ENTERPRISE: [
    'Unlimited Questionnaires',
    'Unlimited Responses',
    'Unlimited Documents',
    'Unlimited API calls',
    'Priority support',
    'All 11 Dimensions',
    'All export formats',
    'Audit logs',
    'Full API access',
    'SSO Integration',
    'Custom branding',
    'Dedicated account manager',
  ],
};

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface PricingCardProps {
  tier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
  name: string;
  price: number;
  features: string[];
  currentTier: string;
  isPopular?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

function PricingCard({
  tier,
  name,
  price,
  features,
  currentTier,
  isPopular,
  onSelect,
  isLoading,
}: PricingCardProps) {
  const isCurrent = currentTier === tier;
  const isDowngrade =
    currentTier === 'ENTERPRISE' || (currentTier === 'PROFESSIONAL' && tier === 'FREE');

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-lg ${
        isPopular ? 'ring-2 ring-blue-600 scale-105' : 'ring-1 ring-gray-200'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-8">
        <h3 className="text-xl font-semibold text-gray-900">{name}</h3>

        <div className="mt-4 flex items-baseline">
          <span className="text-4xl font-bold text-gray-900">${price}</span>
          {price > 0 && <span className="ml-1 text-gray-500">/month</span>}
        </div>

        <ul className="mt-8 space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckIcon />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onSelect}
          disabled={isCurrent || isLoading}
          className={`mt-8 w-full py-3 px-6 rounded-lg font-medium transition-colors ${
            isCurrent
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : isPopular
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : isCurrent ? (
            'Current Plan'
          ) : isDowngrade ? (
            'Contact Sales'
          ) : (
            'Upgrade'
          )}
        </button>
      </div>
    </div>
  );
}

export function UpgradePage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: billingApi.getSubscription,
  });

  const checkoutMutation = useMutation({
    mutationFn: (tier: string) => billingApi.createCheckoutSession(tier),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const handleSelectTier = (tier: string) => {
    if (tier === 'FREE') {
      // Can't downgrade to free via checkout
      return;
    }
    if (tier === 'ENTERPRISE') {
      // Enterprise requires sales contact
      window.location.href = 'mailto:sales@quiz2biz.com?subject=Enterprise Plan Inquiry';
      return;
    }
    setSelectedTier(tier);
    checkoutMutation.mutate(tier);
  };

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const currentTier = subscription?.tier || 'FREE';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="mt-4 text-xl text-gray-600">Select the plan that best fits your needs</p>
          <a href="/billing" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            ← Back to Billing
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          <PricingCard
            tier="FREE"
            name="Free"
            price={0}
            features={TIER_FEATURES.FREE}
            currentTier={currentTier}
            onSelect={() => handleSelectTier('FREE')}
            isLoading={checkoutMutation.isPending && selectedTier === 'FREE'}
          />

          <PricingCard
            tier="PROFESSIONAL"
            name="Professional"
            price={49}
            features={TIER_FEATURES.PROFESSIONAL}
            currentTier={currentTier}
            isPopular
            onSelect={() => handleSelectTier('PROFESSIONAL')}
            isLoading={checkoutMutation.isPending && selectedTier === 'PROFESSIONAL'}
          />

          <PricingCard
            tier="ENTERPRISE"
            name="Enterprise"
            price={199}
            features={TIER_FEATURES.ENTERPRISE}
            currentTier={currentTier}
            onSelect={() => handleSelectTier('ENTERPRISE')}
            isLoading={checkoutMutation.isPending && selectedTier === 'ENTERPRISE'}
          />
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto grid gap-6 text-left">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-medium text-gray-900">Can I change plans anytime?</h3>
              <p className="mt-2 text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect
                immediately, while downgrades apply at the end of your current billing period.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-medium text-gray-900">What payment methods do you accept?</h3>
              <p className="mt-2 text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) through our
                secure payment processor Stripe.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-medium text-gray-900">Is there a free trial?</h3>
              <p className="mt-2 text-gray-600">
                The Free tier allows you to try Quiz2Biz with limited features. You can upgrade when
                you're ready to access more capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradePage;
