import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { questionnaireApi, type HeatmapResult } from '../../api/questionnaire';

interface HeatmapDrilldown {
  dimensionKey: string;
  dimensionName: string;
  severityBucket: string;
  cellValue: number;
  colorCode: string;
  questionCount: number;
  questions: {
    questionId: string;
    questionText: string;
    severity: number;
    coverage: number;
    residualRisk: number;
  }[];
  potentialImprovement: number;
}

export function HeatmapPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [heatmap, setHeatmap] = useState<HeatmapResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<HeatmapDrilldown | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    questionnaireApi
      .getHeatmap(sessionId)
      .then((data) => {
        if (!cancelled) {
          setHeatmap(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            (err as { response?: { data?: { message?: string } }; message?: string })?.response
              ?.data?.message ??
              (err as { message?: string })?.message ??
              'Unknown error',
          );
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleCellClick = async (dimensionKey: string, severityBucket: string) => {
    if (!sessionId) return;
    try {
      const data = await questionnaireApi.getHeatmapDrilldown(
        sessionId,
        dimensionKey,
        severityBucket,
      );
      setDrilldown(data);
    } catch (err: unknown) {
      console.error('Drilldown failed:', err);
    }
  };

  const colorMap: Record<string, string> = {
    // Semantic names (if backend returns enum key)
    GREEN: '#22c55e',
    AMBER: '#f59e0b',
    RED: '#ef4444',
    // Hex codes (backend HeatmapColor enum values)
    '#28A745': '#22c55e',
    '#FFC107': '#f59e0b',
    '#DC3545': '#ef4444',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
          <p className="text-sm text-surface-500">Loading heatmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!heatmap) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <svg
            className="h-8 w-8 text-surface-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-surface-700">No heatmap data available</p>
        <p className="text-sm text-surface-500">Complete a session to generate the gap heatmap.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          to="/dashboard"
          style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}
        >
          &larr; Back to Dashboard
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>Gap Heatmap</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Dimension x Severity matrix. Cell value = Sum(Severity x (1 - Coverage)). Click a cell for
          details.
        </p>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'Total Cells', value: heatmap.summary.totalCells, bg: '#f3f4f6' },
          { label: 'Green', value: heatmap.summary.greenCells, bg: '#dcfce7' },
          { label: 'Amber', value: heatmap.summary.amberCells, bg: '#fef3c7' },
          { label: 'Red', value: heatmap.summary.redCells, bg: '#fee2e2' },
          { label: 'Critical Gaps', value: heatmap.summary.criticalGapCount, bg: '#fecaca' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: card.bg,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderBottom: '2px solid #e5e7eb',
                  fontWeight: 600,
                }}
              >
                Dimension
              </th>
              {heatmap.severityBuckets.map((bucket) => (
                <th
                  key={bucket}
                  style={{
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderBottom: '2px solid #e5e7eb',
                    fontWeight: 600,
                  }}
                >
                  {bucket}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.dimensions.map((dimName, dimIdx) => {
              const dimCells = heatmap.cells.filter(
                (_, i) => Math.floor(i / heatmap.severityBuckets.length) === dimIdx,
              );
              return (
                <tr key={dimName}>
                  <td
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      fontWeight: 500,
                    }}
                  >
                    {dimName}
                  </td>
                  {heatmap.severityBuckets.map((bucket, bucketIdx) => {
                    const cell = dimCells[bucketIdx];
                    if (!cell) return <td key={bucket} />;
                    return (
                      <td
                        key={bucket}
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'center',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleCellClick(cell.dimensionKey, cell.severityBucket)}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            backgroundColor: colorMap[cell.colorCode] + '33',
                            color: colorMap[cell.colorCode],
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: 'none',
                          }}
                          aria-label={`${dimName}, severity ${bucket}: ${cell.questionCount} questions, residual score ${cell.cellValue.toFixed(2)}`}
                          title={`${cell.questionCount} questions, residual: ${cell.cellValue}`}
                        >
                          {cell.cellValue.toFixed(2)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drilldown Panel */}
      {drilldown && (
        <div
          style={{
            marginTop: '24px',
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              {drilldown.dimensionName} - {drilldown.severityBucket}
            </h3>
            <button
              onClick={() => setDrilldown(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#6b7280',
              }}
            >
              &times;
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
            {drilldown.questionCount} questions | Cell value: {drilldown.cellValue?.toFixed(4)} |
            Potential improvement: {drilldown.potentialImprovement?.toFixed(4)}
          </p>
          <div>
            {drilldown.questions?.map((q) => (
              <div
                key={q.questionId}
                style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}
              >
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{q.questionText}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Severity: {q.severity?.toFixed(2)} | Coverage: {(q.coverage * 100).toFixed(0)}% |
                  Residual: {q.residualRisk?.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Risk */}
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
        Overall Risk Score:{' '}
        <strong style={{ color: heatmap.summary.overallRiskScore > 5 ? '#ef4444' : '#22c55e' }}>
          {heatmap.summary.overallRiskScore.toFixed(2)}
        </strong>
      </div>
    </div>
  );
}
