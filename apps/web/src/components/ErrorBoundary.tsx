import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../lib/logger';

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
    logger.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface-50)',
          }}
        >
          <div style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
            <h1
              style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-surface-800)', marginBottom: '12px' }}
            >
              Something went wrong
            </h1>
            <p style={{ color: 'var(--color-surface-500)', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              style={{
                padding: '10px 24px',
                background: 'var(--color-brand-500)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
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
