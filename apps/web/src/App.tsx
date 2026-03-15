/**
 * Main application component with routing and providers
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout, AuthLayout } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui';
import { useAuthStore } from './stores/auth';
import type { ReactNode } from 'react';
import { featureFlags } from './config/feature-flags.config';
import { NavigationGuardProvider } from './components/ux';
import { ConditionalProvider } from './components/ConditionalProvider';
import { OnboardingProvider } from './components/ux/Onboarding';
import { AccessibilityProvider } from './components/accessibility/Accessibility';
import { I18nProvider } from './components/i18n/Internationalization';
import { PredictiveErrorProvider } from './components/ai/AIPredictiveErrors';
import { SmartSearchProvider } from './components/ai/AISmartSearch';
import { RequireRole } from './components/auth/RequireRole';

// Lazy-loaded page components for code-splitting
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const EmailVerificationPage = lazy(() =>
  import('./pages/auth/EmailVerificationPage').then((m) => ({
    default: m.EmailVerificationPage,
  })),
);
const OAuthCallbackPage = lazy(() =>
  import('./pages/auth/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const QuestionnairePage = lazy(() =>
  import('./pages/questionnaire/QuestionnairePage').then((m) => ({ default: m.QuestionnairePage })),
);
const HeatmapPage = lazy(() =>
  import('./pages/heatmap/HeatmapPage').then((m) => ({ default: m.HeatmapPage })),
);
const EvidencePage = lazy(() =>
  import('./pages/evidence/EvidencePage').then((m) => ({ default: m.EvidencePage })),
);
const DecisionsPage = lazy(() =>
  import('./pages/decisions/DecisionsPage').then((m) => ({ default: m.DecisionsPage })),
);
const PolicyPackPage = lazy(() =>
  import('./pages/policy-pack/PolicyPackPage').then((m) => ({ default: m.PolicyPackPage })),
);
const DocumentsPage = lazy(() =>
  import('./pages/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
);
const BillingPage = lazy(() =>
  import('./pages/billing/BillingPage').then((m) => ({ default: m.BillingPage })),
);
const InvoicesPage = lazy(() =>
  import('./pages/billing/InvoicesPage').then((m) => ({ default: m.InvoicesPage })),
);
const UpgradePage = lazy(() =>
  import('./pages/billing/UpgradePage').then((m) => ({ default: m.UpgradePage })),
);
const PrivacyPage = lazy(() =>
  import('./pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('./pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })),
);
const HelpPage = lazy(() => import('./pages/help/HelpPage').then((m) => ({ default: m.HelpPage })));
const IdeaCapturePage = lazy(() =>
  import('./pages/idea-capture/IdeaCapturePage').then((m) => ({ default: m.IdeaCapturePage })),
);
const ChatPage = lazy(() => import('./pages/chat/ChatPage').then((m) => ({ default: m.ChatPage })));
const DocumentMenuPage = lazy(() =>
  import('./pages/document-menu/DocumentMenuPage').then((m) => ({ default: m.DocumentMenuPage })),
);
const DocumentPreviewPage = lazy(() =>
  import('./pages/documents/DocumentPreviewPage').then((m) => ({ default: m.DocumentPreviewPage })),
);
const FactReviewPage = lazy(() =>
  import('./pages/fact-review/FactReviewPage').then((m) => ({ default: m.FactReviewPage })),
);
const WorkspacePage = lazy(() =>
  import('./pages/workspace/WorkspacePage').then((m) => ({ default: m.WorkspacePage })),
);
const NewProjectFlow = lazy(() =>
  import('./pages/workspace/NewProjectFlow').then((m) => ({ default: m.NewProjectFlow })),
);
const ReviewQueuePage = lazy(() =>
  import('./pages/admin/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage })),
);
const DocumentReviewPage = lazy(() =>
  import('./pages/admin/DocumentReviewPage').then((m) => ({ default: m.DocumentReviewPage })),
);
const MFASetupPage = lazy(() =>
  import('./pages/settings/MFASetupPage').then((m) => ({ default: m.MFASetupPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/settings/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const AnalyticsDashboardPage = lazy(() =>
  import('./pages/analytics/AnalyticsDashboardPage').then((m) => ({
    default: m.AnalyticsDashboardPage,
  })),
);
const SessionComparisonPage = lazy(() =>
  import('./pages/sessions/SessionComparisonPage').then((m) => ({
    default: m.SessionComparisonPage,
  })),
);

// Loading fallback for lazy-loaded routes
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-brand-200" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
        </div>
        <span className="text-sm text-surface-500 font-medium">Loading...</span>
      </div>
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
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();

  // Fallback: if loading takes too long, force it to complete
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 2000); // 2 second max loading time
      return () => clearTimeout(timeout);
    }
  }, [isLoading, setLoading]);

  if (isLoading) {
    return <PageLoader />;
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
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ConditionalProvider flag={featureFlags.accessibility} Provider={AccessibilityProvider}>
        <ConditionalProvider flag={featureFlags.i18n} Provider={I18nProvider}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <BrowserRouter>
                <NavigationGuardProvider>
                  <ConditionalProvider flag={featureFlags.onboarding} Provider={OnboardingProvider}>
                    <ConditionalProvider
                      flag={featureFlags.aiPredictiveErrors}
                      Provider={PredictiveErrorProvider}
                    >
                      <ConditionalProvider
                        flag={featureFlags.aiSmartSearch}
                        Provider={SmartSearchProvider}
                      >
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            {/* OAuth callback routes - MUST be before /auth to ensure proper matching */}
                            <Route
                              path="/auth/callback/:provider"
                              element={<OAuthCallbackPage />}
                            />

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
                              <Route path="reset-password" element={<ResetPasswordPage />} />
                              <Route path="verify-email" element={<EmailVerificationPage />} />
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
                              <Route path="workspace" element={<WorkspacePage />} />
                              <Route path="new-project" element={<NewProjectFlow />} />
                              <Route path="idea" element={<IdeaCapturePage />} />
                              <Route
                                path="questionnaire/:action?"
                                element={<QuestionnairePage />}
                              />
                              <Route path="heatmap/:sessionId" element={<HeatmapPage />} />
                              {featureFlags.legacyModules && (
                                <>
                                  <Route path="evidence/:sessionId" element={<EvidencePage />} />
                                  <Route path="decisions/:sessionId" element={<DecisionsPage />} />
                                  <Route
                                    path="policy-pack/:sessionId"
                                    element={<PolicyPackPage />}
                                  />
                                </>
                              )}
                              <Route path="documents" element={<DocumentsPage />} />
                              <Route
                                path="documents/:documentId"
                                element={<DocumentPreviewPage />}
                              />
                              <Route path="project/:projectId/chat" element={<ChatPage />} />
                              <Route
                                path="project/:projectId/documents"
                                element={<DocumentMenuPage />}
                              />
                              <Route path="project/:projectId/facts" element={<FactReviewPage />} />
                              <Route path="chat/:projectId?" element={<ChatPage />} />
                              <Route
                                path="admin/review"
                                element={
                                  <RequireRole allowed={['ADMIN', 'SUPER_ADMIN']}>
                                    <ReviewQueuePage />
                                  </RequireRole>
                                }
                              />
                              <Route
                                path="admin/review/:documentId"
                                element={
                                  <RequireRole allowed={['ADMIN', 'SUPER_ADMIN']}>
                                    <DocumentReviewPage />
                                  </RequireRole>
                                }
                              />
                              <Route path="settings/mfa" element={<MFASetupPage />} />
                              <Route path="settings/profile" element={<ProfilePage />} />
                              <Route path="sessions/compare" element={<SessionComparisonPage />} />
                              <Route path="analytics" element={<AnalyticsDashboardPage />} />
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
                      </ConditionalProvider>
                    </ConditionalProvider>
                  </ConditionalProvider>
                </NavigationGuardProvider>
              </BrowserRouter>
            </ToastProvider>
          </QueryClientProvider>
        </ConditionalProvider>
      </ConditionalProvider>
    </ErrorBoundary>
  );
}
