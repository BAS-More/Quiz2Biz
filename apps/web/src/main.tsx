import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initializeSentry, SentryErrorBoundary } from './config/sentry.config';

// Initialize Sentry before rendering
initializeSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <SentryErrorBoundary fallback={<div>An error occurred. Please refresh the page.</div>}>
      <App />
    </SentryErrorBoundary>
  </StrictMode>,
);
