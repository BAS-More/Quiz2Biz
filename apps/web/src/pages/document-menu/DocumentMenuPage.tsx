/**
 * Document Menu Page
 * Shows available documents with quality slider for pricing
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import documentCommerceApi, {
  QUALITY_LEVELS,
} from '../../api/documentCommerce';
import type {
  ProjectDocuments,
  AvailableDocument,
  PriceCalculation,
  DocumentPurchaseStatus,
} from '../../api/documentCommerce';
import {
  FileText,
  ArrowLeft,
  Check,
  Lock,
  Sparkles,
  Download,
  Clock,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { Card } from '../../components/ui';
import { clsx } from 'clsx';

/** Quality Slider Component */
function QualitySlider({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const level = QUALITY_LEVELS[value];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-700">Quality Level</span>
        <span className="text-sm font-semibold text-brand-600">{level?.name}</span>
      </div>
      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={clsx(
          'w-full h-2 rounded-full appearance-none cursor-pointer',
          'bg-gradient-to-r from-surface-200 via-brand-300 to-accent-500',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500',
          '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5',
          '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white',
          '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-500',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
      <div className="flex justify-between text-xs text-surface-400">
        {QUALITY_LEVELS.map((l) => (
          <span
            key={l.level}
            className={clsx(
              'transition-colors',
              l.level === value && 'text-brand-600 font-medium',
            )}
          >
            {l.name}
          </span>
        ))}
      </div>
      <p className="text-xs text-surface-500 text-center">{level?.description}</p>
    </div>
  );
}

/** Document Card Component */
function DocumentCard({
  document,
  projectId,
  onPurchase,
  isPurchasing,
}: {
  document: AvailableDocument;
  projectId: string;
  onPurchase: (slug: string, qualityLevel: number) => void;
  isPurchasing: boolean;
}) {
  const [qualityLevel, setQualityLevel] = useState(2);
  const [pricing, setPricing] = useState<PriceCalculation | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Load price when quality changes
  useEffect(() => {
    if (!document.isAvailable) return;

    const loadPrice = async () => {
      setLoadingPrice(true);
      try {
        const price = await documentCommerceApi.calculatePrice(
          projectId,
          document.slug,
          qualityLevel,
        );
        setPricing(price);
      } catch {
        // Fallback calculation
        const multiplier = 1 + qualityLevel;
        setPricing({
          projectId,
          documentTypeSlug: document.slug,
          documentTypeName: document.name,
          basePrice: document.basePrice,
          qualityLevel,
          qualityMultiplier: multiplier,
          finalPrice: document.basePrice * multiplier,
          currency: 'USD',
          estimatedPages: [8, 12, 20, 32, 50][qualityLevel] ?? 20,
          features: QUALITY_LEVELS[qualityLevel]?.description.split(', ') ?? [],
        });
      } finally {
        setLoadingPrice(false);
      }
    };

    loadPrice();
  }, [projectId, document.slug, document.basePrice, document.name, document.isAvailable, qualityLevel]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                document.isAvailable
                  ? 'bg-brand-50 text-brand-600'
                  : 'bg-surface-100 text-surface-400',
              )}
            >
              {document.isAvailable ? (
                <FileText className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-900">{document.name}</h3>
              <p className="text-xs text-surface-500">{document.category}</p>
            </div>
          </div>
          {document.isAvailable && pricing && (
            <div className="text-right">
              <p className="text-lg font-bold text-surface-900">
                {loadingPrice ? '...' : formatPrice(pricing.finalPrice)}
              </p>
              <p className="text-xs text-surface-400">
                ~{pricing.estimatedPages} pages
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-surface-600 mb-4">{document.description}</p>

        {/* Availability or Quality Slider */}
        {document.isAvailable ? (
          <>
            <div className="mb-4 p-3 bg-surface-50 rounded-lg">
              <QualitySlider
                value={qualityLevel}
                onChange={setQualityLevel}
                disabled={isPurchasing}
              />
            </div>

            {/* Features */}
            {pricing && pricing.features.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-surface-500 mb-2">Includes:</p>
                <div className="flex flex-wrap gap-1.5">
                  {pricing.features.map((feature, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-50 text-success-700 rounded text-xs"
                    >
                      <Check className="h-3 w-3" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Button */}
            <button
              onClick={() => onPurchase(document.slug, qualityLevel)}
              disabled={isPurchasing || loadingPrice}
              className={clsx(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                'text-sm font-medium transition-all',
                isPurchasing || loadingPrice
                  ? 'bg-surface-100 text-surface-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700 shadow-xs hover:shadow-elevated',
              )}
            >
              {isPurchasing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Document
                </>
              )}
            </button>
          </>
        ) : (
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-800">More information needed</p>
                <p className="text-xs text-warning-600 mt-1">{document.unavailableReason}</p>
                <p className="text-xs text-warning-500 mt-2">
                  Progress: {document.currentFactCount} / {document.requiredFactCount} facts
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Purchased Document Card */
function PurchasedDocumentCard({ purchase }: { purchase: DocumentPurchaseStatus }) {
  const statusColors = {
    pending: 'bg-warning-50 text-warning-700',
    processing: 'bg-brand-50 text-brand-700',
    completed: 'bg-success-50 text-success-700',
    failed: 'bg-danger-50 text-danger-700',
  };

  const statusIcons = {
    pending: Clock,
    processing: Loader,
    completed: Check,
    failed: AlertCircle,
  };

  const StatusIcon = statusIcons[purchase.status];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center text-success-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900">
              {purchase.documentTypeName}
            </h3>
            <p className="text-xs text-surface-500">
              {QUALITY_LEVELS[purchase.qualityLevel]?.name} Quality
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              statusColors[purchase.status],
            )}
          >
            <StatusIcon
              className={clsx('h-3.5 w-3.5', purchase.status === 'processing' && 'animate-spin')}
            />
            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
          </span>

          {purchase.downloadUrl && purchase.status === 'completed' && (
            <a
              href={purchase.downloadUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export function DocumentMenuPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProjectDocuments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await documentCommerceApi.getProjectDocuments(projectId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handlePurchase = async (documentSlug: string, qualityLevel: number) => {
    if (!projectId) return;
    setPurchasingSlug(documentSlug);
    try {
      const purchase = await documentCommerceApi.createPurchase(
        projectId,
        documentSlug,
        qualityLevel,
      );
      // In a real app, this would open Stripe checkout with purchase.clientSecret
      // For now, navigate to a payment page
      navigate(`/payment?clientSecret=${purchase.clientSecret}&purchaseId=${purchase.purchaseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchasingSlug(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-8 w-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data || !projectId) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-surface-500">Project not found</p>
        </div>
      </div>
    );
  }

  const availableDocs = data.availableDocuments.filter((d) => d.isAvailable);
  const lockedDocs = data.availableDocuments.filter((d) => !d.isAvailable);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-surface-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-surface-900">Generate Documents</h1>
          <p className="text-sm text-surface-500">{data.projectName}</p>
        </div>
      </div>

      {/* Quality Score */}
      <Card className="bg-gradient-to-r from-brand-50 to-accent-50 border-brand-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Sparkles className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-surface-600">Project Quality Score</p>
              <p className="text-2xl font-bold text-surface-900">{data.qualityScore.toFixed(0)}%</p>
            </div>
          </div>
          <p className="text-sm text-surface-500 max-w-xs text-right">
            Higher quality chat conversations unlock better documents
          </p>
        </div>
      </Card>

      {/* Purchased Documents */}
      {data.purchasedDocuments.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-surface-900 mb-3">Your Documents</h2>
          <div className="space-y-3">
            {data.purchasedDocuments.map((purchase) => (
              <PurchasedDocumentCard key={purchase.purchaseId} purchase={purchase} />
            ))}
          </div>
        </div>
      )}

      {/* Available Documents */}
      {availableDocs.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-surface-900 mb-3">
            Ready to Generate ({availableDocs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableDocs.map((doc) => (
              <DocumentCard
                key={doc.slug}
                document={doc}
                projectId={projectId}
                onPurchase={handlePurchase}
                isPurchasing={purchasingSlug === doc.slug}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked Documents */}
      {lockedDocs.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-surface-900 mb-3">
            Need More Chat ({lockedDocs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lockedDocs.map((doc) => (
              <DocumentCard
                key={doc.slug}
                document={doc}
                projectId={projectId}
                onPurchase={handlePurchase}
                isPurchasing={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
