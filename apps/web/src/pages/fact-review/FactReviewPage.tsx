/**
 * Fact Review Page
 * Allows users to review, edit, and verify extracted facts before document generation
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import factsApi from '../../api/facts';
import type { FactsResponse, ExtractedFact } from '../../api/facts';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Shield,
  Loader,
  X,
  Save,
  FileText,
} from 'lucide-react';
import { Card } from '../../components/ui';
import { clsx } from 'clsx';

/** Confidence badge component */
function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-success-50 text-success-700 border-success-200',
    medium: 'bg-warning-50 text-warning-700 border-warning-200',
    low: 'bg-danger-50 text-danger-700 border-danger-200',
  };

  const labels = {
    high: 'High Confidence',
    medium: 'Medium',
    low: 'Low',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        styles[level],
      )}
    >
      {labels[level]}
    </span>
  );
}

/** Editable fact card */
function FactCard({
  fact,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  fact: ExtractedFact;
  onUpdate: (id: string, updates: { fieldValue?: string; isVerified?: boolean }) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fact.fieldValue);

  const handleSave = () => {
    if (editValue.trim() !== fact.fieldValue) {
      onUpdate(fact.id, { fieldValue: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(fact.fieldValue);
    setIsEditing(false);
  };

  const handleVerify = () => {
    onUpdate(fact.id, { isVerified: !fact.isVerified });
  };

  const formatFieldName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div
      className={clsx(
        'p-4 rounded-xl border transition-all',
        fact.isVerified
          ? 'bg-success-50/50 border-success-200'
          : 'bg-white border-surface-200 hover:border-surface-300',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Field name */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-surface-700">
              {formatFieldName(fact.fieldName)}
            </span>
            <ConfidenceBadge level={fact.confidence} />
            {fact.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-100 text-success-700 rounded-full text-xs">
                <Shield className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>

          {/* Value - editable or display */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 text-surface-600 rounded-lg text-xs font-medium hover:bg-surface-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-surface-900 whitespace-pre-wrap">{fact.fieldValue}</p>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleVerify}
              disabled={isUpdating}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                fact.isVerified
                  ? 'bg-success-100 text-success-600 hover:bg-success-200'
                  : 'bg-surface-100 text-surface-500 hover:bg-surface-200',
              )}
              title={fact.isVerified ? 'Unverify' : 'Verify'}
            >
              <CheckCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
              className="p-2 rounded-lg bg-surface-100 text-surface-500 hover:bg-surface-200 transition-colors"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(fact.id)}
              disabled={isUpdating}
              className="p-2 rounded-lg bg-surface-100 text-danger-500 hover:bg-danger-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Category section */
function CategorySection({
  category,
  facts,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  category: string;
  facts: ExtractedFact[];
  onUpdate: (id: string, updates: { fieldValue?: string; isVerified?: boolean }) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}) {
  const verifiedCount = facts.filter((f) => f.isVerified).length;

  const formatCategory = (cat: string) => {
    return cat
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">{formatCategory(category)}</h3>
        <span className="text-xs text-surface-500">
          {verifiedCount}/{facts.length} verified
        </span>
      </div>
      <div className="space-y-2">
        {facts.map((fact) => (
          <FactCard
            key={fact.id}
            fact={fact}
            onUpdate={onUpdate}
            onDelete={onDelete}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  );
}

export function FactReviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<FactsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFacts = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await factsApi.getProjectFacts(projectId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load facts');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadFacts();
  }, [loadFacts]);

  const handleUpdate = async (
    factId: string,
    updates: { fieldValue?: string; isVerified?: boolean },
  ) => {
    if (!data) return;
    setIsUpdating(true);
    try {
      const updatedFact = await factsApi.updateFact(factId, updates);
      // Update local state
      setData({
        ...data,
        facts: data.facts.map((f) => (f.id === factId ? updatedFact : f)),
        factsByCategory: Object.fromEntries(
          Object.entries(data.factsByCategory).map(([cat, facts]) => [
            cat,
            facts.map((f) => (f.id === factId ? updatedFact : f)),
          ]),
        ),
        verifiedCount: data.facts.filter((f) =>
          f.id === factId ? updatedFact.isVerified : f.isVerified,
        ).length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fact');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (factId: string) => {
    if (!data || !confirm('Are you sure you want to delete this fact?')) return;
    setIsUpdating(true);
    try {
      await factsApi.deleteFact(factId);
      // Update local state
      const newFacts = data.facts.filter((f) => f.id !== factId);
      setData({
        ...data,
        facts: newFacts,
        factsByCategory: Object.fromEntries(
          Object.entries(data.factsByCategory).map(([cat, facts]) => [
            cat,
            facts.filter((f) => f.id !== factId),
          ]),
        ),
        totalFacts: newFacts.length,
        verifiedCount: newFacts.filter((f) => f.isVerified).length,
        highConfidenceCount: newFacts.filter((f) => f.confidence === 'high').length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fact');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyAll = async () => {
    if (!projectId || !data) return;
    setIsUpdating(true);
    try {
      await factsApi.verifyAllFacts(projectId);
      await loadFacts(); // Reload to get updated state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify all facts');
    } finally {
      setIsUpdating(false);
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

  const categories = Object.entries(data.factsByCategory).filter(([, facts]) => facts.length > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-surface-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-surface-900">Review Extracted Facts</h1>
            <p className="text-sm text-surface-500">{data.projectName}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/project/${projectId}/documents`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Generate Documents
        </button>
      </div>

      {/* Stats */}
      <Card className="bg-gradient-to-r from-surface-50 to-brand-50">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-900">{data.totalFacts}</p>
            <p className="text-sm text-surface-500">Total Facts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success-600">{data.verifiedCount}</p>
            <p className="text-sm text-surface-500">Verified</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-600">{data.highConfidenceCount}</p>
            <p className="text-sm text-surface-500">High Confidence</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      {data.verifiedCount < data.totalFacts && (
        <div className="flex items-center justify-between p-4 bg-warning-50 border border-warning-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
            <div>
              <p className="text-sm font-medium text-warning-800">
                {data.totalFacts - data.verifiedCount} facts need verification
              </p>
              <p className="text-xs text-warning-600">
                Review and verify facts to ensure document accuracy
              </p>
            </div>
          </div>
          <button
            onClick={handleVerifyAll}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-warning-600 text-white rounded-lg text-sm font-medium hover:bg-warning-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            Verify All
          </button>
        </div>
      )}

      {/* Facts by category */}
      {categories.length === 0 ? (
        <Card className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-surface-400" />
          </div>
          <p className="text-sm font-medium text-surface-700">No facts extracted yet</p>
          <p className="text-sm text-surface-500 mt-1">
            Continue chatting to extract more information for your documents
          </p>
          <button
            onClick={() => navigate(`/chat/${projectId}`)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Continue Chat
          </button>
        </Card>
      ) : (
        <div className="space-y-8">
          {categories.map(([category, facts]) => (
            <CategorySection
              key={category}
              category={category}
              facts={facts}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
