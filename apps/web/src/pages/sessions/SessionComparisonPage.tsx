/**
 * SessionComparisonPage.tsx
 * Compare answers between two questionnaire sessions
 * Shows side-by-side diff of responses
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  GitCompare,
  CheckCircle,
  XCircle,
  Minus,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { useQuestionnaireStore } from '../../stores/questionnaire';
import clsx from 'clsx';

// Types
interface SessionSummary {
  id: string;
  projectTypeName?: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  readinessScore?: number;
  questionnaireName?: string;
}

interface ResponseDiff {
  questionId: string;
  questionText: string;
  sectionName: string;
  session1Value: unknown;
  session2Value: unknown;
  changeType: 'added' | 'removed' | 'changed' | 'unchanged';
}

// Mock function to fetch comparison data
async function fetchSessionComparison(
  _session1Id: string,
  _session2Id: string,
): Promise<ResponseDiff[]> {
  // In production, this would call the API
  // For now, generate mock data
  const sections = ['Business Overview', 'Market Analysis', 'Financial Plan'];
  const diffs: ResponseDiff[] = [];

  sections.forEach((section, sectionIdx) => {
    for (let q = 0; q < 5; q++) {
      const changeTypes: ResponseDiff['changeType'][] = [
        'unchanged',
        'changed',
        'added',
        'removed',
      ];
      const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];

      diffs.push({
        questionId: `q-${sectionIdx}-${q}`,
        questionText: `Sample question ${q + 1} in ${section}?`,
        sectionName: section,
        session1Value:
          changeType === 'added' ? null : `Answer from session 1 for question ${q + 1}`,
        session2Value:
          changeType === 'removed'
            ? null
            : `Answer from session 2 for question ${q + 1}${changeType === 'changed' ? ' (modified)' : ''}`,
        changeType,
      });
    }
  });

  return diffs;
}

// Diff badge component
function DiffBadge({ type }: { type: ResponseDiff['changeType'] }) {
  const config = {
    added: { icon: CheckCircle, label: 'Added', variant: 'success' as const },
    removed: { icon: XCircle, label: 'Removed', variant: 'danger' as const },
    changed: { icon: ArrowRight, label: 'Changed', variant: 'warning' as const },
    unchanged: { icon: Minus, label: 'Same', variant: 'secondary' as const },
  };

  const { icon: Icon, label, variant } = config[type];

  return (
    <Badge variant={variant} size="sm">
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

// Session selector
interface SessionSelectorProps {
  sessions: SessionSummary[];
  selectedId: string | null;
  onChange: (id: string) => void;
  label: string;
  disabled?: string; // ID to disable
}

function SessionSelector({
  sessions,
  selectedId,
  onChange,
  label,
  disabled,
}: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedSession = sessions.find((s) => s.id === selectedId);

  return (
    <div className="relative">
      <label className="text-sm font-medium text-surface-500 mb-2 block">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-surface-200 rounded-lg text-left hover:border-brand-300 transition-colors"
      >
        {selectedSession ? (
          <div>
            <p className="font-medium text-surface-900">
              {selectedSession.projectTypeName || 'Untitled Session'}
            </p>
            <p className="text-sm text-surface-500">
              {new Date(selectedSession.createdAt).toLocaleDateString()}
              {selectedSession.readinessScore && ` • Score: ${selectedSession.readinessScore}%`}
            </p>
          </div>
        ) : (
          <span className="text-surface-400">Select a session...</span>
        )}
        <ChevronDown
          className={clsx(
            'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {sessions.map((session) => {
            const isDisabled = session.id === disabled;
            const isSelected = session.id === selectedId;

            return (
              <button
                key={session.id}
                onClick={() => {
                  if (!isDisabled) {
                    onChange(session.id);
                    setIsOpen(false);
                  }
                }}
                disabled={isDisabled}
                className={clsx(
                  'w-full p-3 text-left transition-colors',
                  isSelected && 'bg-brand-50',
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-50',
                )}
              >
                <p className="font-medium text-surface-900">
                  {session.projectTypeName || 'Untitled Session'}
                </p>
                <p className="text-sm text-surface-500">
                  {new Date(session.createdAt).toLocaleDateString()}
                  {session.readinessScore && ` • Score: ${session.readinessScore}%`}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Comparison row component
interface ComparisonRowProps {
  diff: ResponseDiff;
  isExpanded: boolean;
  onToggle: () => void;
}

function ComparisonRow({ diff, isExpanded, onToggle }: ComparisonRowProps) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="border border-surface-100 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <DiffBadge type={diff.changeType} />
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-surface-900 truncate">{diff.questionText}</p>
            <p className="text-xs text-surface-400">{diff.sectionName}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-surface-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-surface-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-4 p-4 pt-0">
          <div
            className={clsx(
              'p-3 rounded-lg text-sm',
              diff.changeType === 'removed' ? 'bg-danger-50' : 'bg-surface-50',
            )}
          >
            <p className="text-xs font-medium text-surface-500 mb-1">Session 1</p>
            <p
              className={clsx(
                diff.session1Value === null ? 'text-surface-300 italic' : 'text-surface-700',
              )}
            >
              {formatValue(diff.session1Value)}
            </p>
          </div>
          <div
            className={clsx(
              'p-3 rounded-lg text-sm',
              diff.changeType === 'added' ? 'bg-success-50' : 'bg-surface-50',
            )}
          >
            <p className="text-xs font-medium text-surface-500 mb-1">Session 2</p>
            <p
              className={clsx(
                diff.session2Value === null ? 'text-surface-300 italic' : 'text-surface-700',
              )}
            >
              {formatValue(diff.session2Value)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component
export function SessionComparisonPage() {
  const navigate = useNavigate();
  const { sessions, loadSessions: _loadSessions } = useQuestionnaireStore();
  const [session1Id, setSession1Id] = useState<string | null>(null);
  const [session2Id, setSession2Id] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<ResponseDiff['changeType'] | 'all'>('all');

  // Load sessions
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'COMPLETED'),
    [sessions],
  );

  // Fetch comparison data
  const {
    data: diffs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['session-comparison', session1Id, session2Id],
    queryFn: () => fetchSessionComparison(session1Id!, session2Id!),
    enabled: !!session1Id && !!session2Id && session1Id !== session2Id,
  });

  // Filter diffs
  const filteredDiffs = useMemo(() => {
    if (!diffs) return [];
    if (filterType === 'all') return diffs;
    return diffs.filter((d) => d.changeType === filterType);
  }, [diffs, filterType]);

  // Group by section
  const groupedDiffs = useMemo(() => {
    const groups: Record<string, ResponseDiff[]> = {};
    filteredDiffs.forEach((diff) => {
      if (!groups[diff.sectionName]) {
        groups[diff.sectionName] = [];
      }
      groups[diff.sectionName].push(diff);
    });
    return groups;
  }, [filteredDiffs]);

  // Summary stats
  const stats = useMemo(() => {
    if (!diffs) return null;
    return {
      total: diffs.length,
      changed: diffs.filter((d) => d.changeType === 'changed').length,
      added: diffs.filter((d) => d.changeType === 'added').length,
      removed: diffs.filter((d) => d.changeType === 'removed').length,
      unchanged: diffs.filter((d) => d.changeType === 'unchanged').length,
    };
  }, [diffs]);

  const toggleRow = useCallback((questionId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedRows(new Set(filteredDiffs.map((d) => d.questionId)));
  }, [filteredDiffs]);

  const collapseAll = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
              <GitCompare className="h-6 w-6 text-brand-600" />
              Session Comparison
            </h1>
            <p className="text-surface-500 mt-1">
              Compare answers between two questionnaire sessions
            </p>
          </div>
        </div>
      </div>

      {/* Session Selectors */}
      <Card>
        <h3 className="font-semibold text-surface-900 mb-4">Select Sessions to Compare</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SessionSelector
            sessions={completedSessions}
            selectedId={session1Id}
            onChange={setSession1Id}
            label="Session 1 (Base)"
            disabled={session2Id || undefined}
          />
          <SessionSelector
            sessions={completedSessions}
            selectedId={session2Id}
            onChange={setSession2Id}
            label="Session 2 (Compare)"
            disabled={session1Id || undefined}
          />
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600 mr-2" />
          <span className="text-surface-500">Loading comparison...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-danger-50 border-danger-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-danger-500" />
            <p className="text-danger-700">Failed to load comparison. Please try again.</p>
          </div>
        </Card>
      )}

      {/* Comparison Results */}
      {diffs && stats && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card
              className={clsx(
                'cursor-pointer transition-all',
                filterType === 'all' && 'ring-2 ring-brand-500',
              )}
              onClick={() => setFilterType('all')}
            >
              <p className="text-2xl font-bold text-surface-900">{stats.total}</p>
              <p className="text-sm text-surface-500">Total Questions</p>
            </Card>
            <Card
              className={clsx(
                'cursor-pointer transition-all',
                filterType === 'changed' && 'ring-2 ring-warning-500',
              )}
              onClick={() => setFilterType('changed')}
            >
              <p className="text-2xl font-bold text-warning-600">{stats.changed}</p>
              <p className="text-sm text-surface-500">Changed</p>
            </Card>
            <Card
              className={clsx(
                'cursor-pointer transition-all',
                filterType === 'added' && 'ring-2 ring-success-500',
              )}
              onClick={() => setFilterType('added')}
            >
              <p className="text-2xl font-bold text-success-600">{stats.added}</p>
              <p className="text-sm text-surface-500">Added</p>
            </Card>
            <Card
              className={clsx(
                'cursor-pointer transition-all',
                filterType === 'removed' && 'ring-2 ring-danger-500',
              )}
              onClick={() => setFilterType('removed')}
            >
              <p className="text-2xl font-bold text-danger-600">{stats.removed}</p>
              <p className="text-sm text-surface-500">Removed</p>
            </Card>
            <Card
              className={clsx(
                'cursor-pointer transition-all',
                filterType === 'unchanged' && 'ring-2 ring-surface-500',
              )}
              onClick={() => setFilterType('unchanged')}
            >
              <p className="text-2xl font-bold text-surface-500">{stats.unchanged}</p>
              <p className="text-sm text-surface-500">Unchanged</p>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Showing {filteredDiffs.length} of {stats.total} questions
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>

          {/* Diff List */}
          {Object.entries(groupedDiffs).map(([section, sectionDiffs]) => (
            <div key={section}>
              <h3 className="font-semibold text-surface-700 mb-3">{section}</h3>
              <div className="space-y-3">
                {sectionDiffs.map((diff) => (
                  <ComparisonRow
                    key={diff.questionId}
                    diff={diff}
                    isExpanded={expandedRows.has(diff.questionId)}
                    onToggle={() => toggleRow(diff.questionId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Empty State */}
      {!session1Id || !session2Id ? (
        <Card className="py-12">
          <div className="text-center">
            <GitCompare className="h-12 w-12 text-surface-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-900">Select Two Sessions</h3>
            <p className="text-surface-500 mt-2">
              Choose two completed sessions above to see a side-by-side comparison of answers.
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default SessionComparisonPage;
