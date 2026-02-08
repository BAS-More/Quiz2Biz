import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDecisionsStore } from '../../stores/decisions';

export function DecisionsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { decisions, isLoading, error, loadDecisions, createDecision } = useDecisionsStore();
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

  if (isLoading && decisions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading decisions...</div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    DRAFT: '#3b82f6',
    LOCKED: '#22c55e',
    SUPERSEDED: '#6b7280',
    AMENDED: '#f59e0b',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
        &larr; Back to Dashboard
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Decision Log</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
        >
          {showForm ? 'Cancel' : 'New Decision'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', color: '#dc2626', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {showForm && (
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '20px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Decision Statement</label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Describe the decision..."
              style={{ width: '100%', minHeight: '80px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Assumptions (optional)</label>
            <textarea
              value={assumptions}
              onChange={(e) => setAssumptions(e.target.value)}
              placeholder="Underlying assumptions..."
              style={{ width: '100%', minHeight: '60px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!statement.trim() || isLoading}
            style={{
              padding: '8px 20px',
              background: statement.trim() ? '#22c55e' : '#d1d5db',
              color: '#fff', border: 'none', borderRadius: '6px',
              cursor: statement.trim() ? 'pointer' : 'not-allowed', fontSize: '14px',
            }}
          >
            Create Decision
          </button>
        </div>
      )}

      {decisions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          No decisions recorded yet.
        </div>
      ) : (
        decisions.map((d) => (
          <div key={d.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: statusColors[d.status] || '#6b7280', textTransform: 'uppercase' as const }}>
                {d.status}
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(d.createdAt).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: '14px', margin: 0 }}>{d.statement}</p>
            {d.assumptions && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', fontStyle: 'italic' }}>
                Assumptions: {d.assumptions}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
