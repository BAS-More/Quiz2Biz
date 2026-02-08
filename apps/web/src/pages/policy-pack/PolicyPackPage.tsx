import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { questionnaireApi } from '../../api/questionnaire';

export function PolicyPackPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [bundle, setBundle] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await questionnaireApi.generatePolicyPack(sessionId);
      setBundle(result);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <Link to="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
        &larr; Back to Dashboard
      </Link>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', marginBottom: '8px' }}>
        Policy Pack Generator
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
        Generate OPA policies, Terraform rules, and governance documents from your session gaps.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', color: '#dc2626', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!bundle ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            style={{
              padding: '12px 32px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 600,
            }}
          >
            {isLoading ? 'Generating...' : 'Generate Policy Pack'}
          </button>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>
            This will analyze session gaps and produce policy documents, OPA rules, and Terraform configs.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#dbeafe', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{bundle.policies?.length ?? 0}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Policies</div>
            </div>
            <div style={{ background: '#f3e8ff', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{bundle.opaPolicies?.length ?? 0}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>OPA Rules</div>
            </div>
            <div style={{ background: '#dcfce7', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700 }}>{bundle.dimensionsCovered?.length ?? 0}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Dimensions</div>
            </div>
          </div>

          {bundle.policies?.map((p: any, idx: number) => (
            <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{p.title || `Policy ${idx + 1}`}</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{p.description || p.content?.substring(0, 200)}</p>
            </div>
          ))}

          {bundle.terraformRules && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Terraform Rules</h3>
              <pre style={{ background: '#1f2937', color: '#e5e7eb', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '12px', maxHeight: '300px' }}>
                {bundle.terraformRules}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
