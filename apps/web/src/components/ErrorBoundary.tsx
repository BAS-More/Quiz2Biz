import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
          <div style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginBottom: '12px' }}>Something went wrong</h1>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
