import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvidenceStore } from '../../stores/evidence';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader2, AlertCircle } from 'lucide-react';

export function EvidencePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { items, stats, isLoading, error, loadEvidence, loadStats } = useEvidenceStore();

  useEffect(() => {
    if (!sessionId) return;
    loadEvidence(sessionId);
    loadStats(sessionId);
  }, [sessionId, loadEvidence, loadStats]);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Link to="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
        &larr; Back to Dashboard
      </Link>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', marginBottom: '16px' }}>
        Evidence Registry
      </h1>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
          </div>
          <div
            style={{
              background: '#dcfce7',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.verified}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Verified</div>
          </div>
          <div
            style={{
              background: '#fef3c7',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.pending}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Pending</div>
          </div>
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 700 }}>
              {Object.keys(stats.byType).length}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Types</div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          type="documents"
          title="No evidence uploaded yet"
          description="Upload evidence files for this session to track verification status."
          size="sm"
        />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>File</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Type</th>
              <th style={{ textAlign: 'center', padding: '10px' }}>Verified</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px' }}>{item.fileName || 'Unnamed'}</td>
                <td style={{ padding: '10px' }}>
                  <span
                    style={{
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '12px',
                    }}
                  >
                    {item.artifactType}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {item.verified ? (
                    <span style={{ color: '#22c55e' }}>Yes</span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>Pending</span>
                  )}
                </td>
                <td style={{ padding: '10px', color: '#6b7280' }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
