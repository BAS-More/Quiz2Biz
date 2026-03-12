import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Unlock, ArrowLeft } from 'lucide-react';
import { useDecisionsStore } from '../../stores/decisions';
import { EmptyState } from '../../components/ui/EmptyState';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LOCKED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  SUPERSEDED: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300',
  AMENDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export function DecisionsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { decisions, isLoading, error, loadDecisions, createDecision, updateStatus } =
    useDecisionsStore();
  const [statement, setStatement] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    loadDecisions(sessionId);
  }, [sessionId, loadDecisions]);

  const handleCreate = async () => {
    if (!sessionId || !statement.trim()) return;
    await createDecision(sessionId, statement.trim(), assumptions.trim() || undefined);
    setStatement('');
    setAssumptions('');
    setShowForm(false);
  };

  /** Optimistic lock / unlock toggle */
  const handleToggleLock = (id: string, currentStatus: string) => {
    const next = currentStatus === 'DRAFT' ? 'LOCKED' : 'DRAFT';
    updateStatus(id, next);
  };

  if (isLoading && decisions.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <p className="text-base text-gray-500 dark:text-gray-400">Loading decisions…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Decision Log</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'New Decision'}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-5 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Decision Statement
            </label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Describe the decision…"
              className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-300 rounded-md resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Assumptions (optional)
            </label>
            <textarea
              value={assumptions}
              onChange={(e) => setAssumptions(e.target.value)}
              placeholder="Underlying assumptions…"
              className="w-full min-h-[60px] px-3 py-2 text-sm border border-gray-300 rounded-md resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!statement.trim() || isLoading}
            className="px-5 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
          >
            Create Decision
          </button>
        </div>
      )}

      {decisions.length === 0 ? (
        <EmptyState
          type="documents"
          title="No decisions recorded"
          description="Decisions will appear here once you create one."
          size="md"
        />
      ) : (
        decisions.map((d) => (
          <div
            key={d.id}
            className="mb-3 p-4 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase rounded ${STATUS_BADGE[d.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
              >
                {d.status}
              </span>
              <div className="flex items-center gap-2">
                {(d.status === 'DRAFT' || d.status === 'LOCKED') && (
                  <button
                    onClick={() => handleToggleLock(d.id, d.status)}
                    title={d.status === 'DRAFT' ? 'Lock decision' : 'Unlock decision'}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    {d.status === 'DRAFT' ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </button>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(d.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100">{d.statement}</p>
            {d.assumptions && (
              <p className="mt-2 text-[13px] italic text-gray-500 dark:text-gray-400">
                Assumptions: {d.assumptions}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
