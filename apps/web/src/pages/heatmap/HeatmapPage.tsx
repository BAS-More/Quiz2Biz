import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { questionnaireApi, type HeatmapResult } from '../../api/questionnaire';

export function HeatmapPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [heatmap, setHeatmap] = useState<HeatmapResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<any | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setIsLoading(true);
    questionnaireApi.getHeatmap(sessionId)
      .then(setHeatmap)
      .catch((err) => setError(err?.response?.data?.message ?? err.message))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  const handleCellClick = async (dimensionKey: string, severityBucket: string) => {
    if (!sessionId) return;
    try {
      const data = await questionnaireApi.getHeatmapDrilldown(sessionId, dimensionKey, severityBucket);
      setDrilldown(data);
    } catch (err: any) {
      console.error('Drilldown failed:', err);
    }
  };

  const colorMap: Record<string, string> = {
    GREEN: '#22c55e',
    AMBER: '#f59e0b',
    RED: '#ef4444',
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading heatmap...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', color: '#dc2626' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!heatmap) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
          &larr; Back to Dashboard
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>Gap Heatmap</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Dimension x Severity matrix. Cell value = Sum(Severity x (1 - Coverage)). Click a cell for details.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Cells', value: heatmap.summary.totalCells, bg: '#f3f4f6' },
          { label: 'Green', value: heatmap.summary.greenCells, bg: '#dcfce7' },
          { label: 'Amber', value: heatmap.summary.amberCells, bg: '#fef3c7' },
          { label: 'Red', value: heatmap.summary.redCells, bg: '#fee2e2' },
          { label: 'Critical Gaps', value: heatmap.summary.criticalGapCount, bg: '#fecaca' },
        ].map((card) => (
          <div key={card.label} style={{ background: card.bg, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
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
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>Dimension</th>
              {heatmap.severityBuckets.map((bucket) => (
                <th key={bucket} style={{ textAlign: 'center', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>{bucket}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.dimensions.map((dimName, dimIdx) => {
              const dimCells = heatmap.cells.filter((_, i) => Math.floor(i / heatmap.severityBuckets.length) === dimIdx);
              return (
                <tr key={dimName}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 500 }}>{dimName}</td>
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
        <div style={{ marginTop: '24px', background: '#f9fafb', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              {drilldown.dimensionName} - {drilldown.severityBucket}
            </h3>
            <button onClick={() => setDrilldown(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280' }}>
              &times;
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
            {drilldown.questionCount} questions | Cell value: {drilldown.cellValue?.toFixed(4)} | Potential improvement: {drilldown.potentialImprovement?.toFixed(4)}
          </p>
          <div>
            {drilldown.questions?.map((q: any) => (
              <div key={q.questionId} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{q.questionText}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Severity: {q.severity?.toFixed(2)} | Coverage: {(q.coverage * 100).toFixed(0)}% | Residual: {q.residualRisk?.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Risk */}
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
        Overall Risk Score: <strong style={{ color: heatmap.summary.overallRiskScore > 5 ? '#ef4444' : '#22c55e' }}>
          {heatmap.summary.overallRiskScore.toFixed(2)}
        </strong>
      </div>
    </div>
  );
}
