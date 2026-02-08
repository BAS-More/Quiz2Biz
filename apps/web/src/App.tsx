/**
 * Main application component with routing and providers
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout, AuthLayout } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './stores/auth';
import type { ReactNode } from 'react';

// Lazy-loaded page components for code-splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const QuestionnairePage = lazy(() => import('./pages/questionnaire/QuestionnairePage').then(m => ({ default: m.QuestionnairePage })));
const HeatmapPage = lazy(() => import('./pages/heatmap/HeatmapPage').then(m => ({ default: m.HeatmapPage })));
const EvidencePage = lazy(() => import('./pages/evidence/EvidencePage').then(m => ({ default: m.EvidencePage })));
const DecisionsPage = lazy(() => import('./pages/decisions/DecisionsPage').then(m => ({ default: m.DecisionsPage })));
const PolicyPackPage = lazy(() => import('./pages/policy-pack/PolicyPackPage').then(m => ({ default: m.PolicyPackPage })));
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const BillingPage = lazy(() => import('./pages/billing/BillingPage').then(m => ({ default: m.BillingPage })));
const InvoicesPage = lazy(() => import('./pages/billing/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const UpgradePage = lazy(() => import('./pages/billing/UpgradePage').then(m => ({ default: m.UpgradePage })));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const HelpPage = lazy(() => import('./pages/help/HelpPage').then(m => ({ default: m.HelpPage })));

// Loading fallback for lazy-loaded routes
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public auth routes */}
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <AuthLayout />
              </PublicRoute>
            }
          >
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Protected app routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="questionnaire/:action?" element={<QuestionnairePage />} />
            <Route path="heatmap/:sessionId" element={<HeatmapPage />} />
            <Route path="evidence/:sessionId" element={<EvidencePage />} />
            <Route path="decisions/:sessionId" element={<DecisionsPage />} />
            <Route path="policy-pack/:sessionId" element={<PolicyPackPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="billing/invoices" element={<InvoicesPage />} />
            <Route path="billing/upgrade" element={<UpgradePage />} />
            {/* Add more protected routes here */}
          </Route>

          {/* Public legal and help pages */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/help" element={<HelpPage />} />

          {/* Fallback - redirect to login */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
