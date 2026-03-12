/**
 * OAuth callback page that handles the redirect from OAuth providers.
 * This page runs in a popup window, extracts the token from the URL,
 * exchanges it with the backend, and handles the authentication.
 *
 * If window.opener exists (normal popup flow), sends message to parent and closes.
 * If window.opener is null (browser cleared it), completes login and redirects to dashboard.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';

// OAuth API endpoints
const OAUTH_ENDPOINTS: Record<string, string> = {
  google: '/api/auth/oauth/google',
  microsoft: '/api/auth/oauth/microsoft',
};

export function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validate provider against known endpoints using own-property check
  const validProvider =
    provider && Object.prototype.hasOwnProperty.call(OAUTH_ENDPOINTS, provider)
      ? provider
      : null;

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!validProvider) {
          throw new Error('Unknown OAuth provider');
        }

        // Get the hash fragment (contains the token for implicit flow)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        // Check for errors from the OAuth provider
        const oauthError = params.get('error');
        const errorDescription = params.get('error_description');

        if (oauthError) {
          const safeErrorMessage = errorDescription || oauthError;
          setStatus('error');
          setErrorMessage(safeErrorMessage);

          // Send error to parent window if available
          if (window.opener) {
            window.opener.postMessage(
              {
                type: `${validProvider}-oauth-callback`,
                error: safeErrorMessage,
              },
              window.location.origin,
            );
            setTimeout(() => window.close(), 2000);
          }
          return;
        }

        // Extract access token from implicit flow response
        const accessToken = params.get('access_token');

        if (!accessToken) {
          setStatus('error');
          setErrorMessage('No access token received from provider');

          if (window.opener) {
            window.opener.postMessage(
              {
                type: `${validProvider}-oauth-callback`,
                error: 'No access token received from provider',
              },
              window.location.origin,
            );
            setTimeout(() => window.close(), 2000);
          }
          return;
        }

        // Exchange token with backend
        const endpoint = OAUTH_ENDPOINTS[validProvider];

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: validProvider === 'microsoft' ? accessToken : undefined,
            idToken: validProvider === 'google' ? accessToken : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Authentication failed');
        }

        const data = await response.json();

        // Successfully authenticated - store in Zustand (persists to localStorage)
        login(data.accessToken, data.refreshToken, data.user);

        setStatus('success');

        // If we have a parent window (popup flow), notify it and close
        if (window.opener) {
          window.opener.postMessage(
            {
              type: `${validProvider}-oauth-callback`,
              accessToken: data.accessToken,
              success: true,
            },
            window.location.origin,
          );

          // Close popup after brief delay
          setTimeout(() => window.close(), 500);
        } else {
          // No parent window (opener was cleared by browser security)
          // Auth is already stored in localStorage via Zustand
          // Redirect to dashboard in this window
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to process authentication';
        setStatus('error');
        setErrorMessage(errorMsg);

        if (window.opener) {
          window.opener.postMessage(
            {
              type: `${validProvider}-oauth-callback`,
              error: errorMsg,
            },
            window.location.origin,
          );
          setTimeout(() => window.close(), 2000);
        }
      }
    };

    handleCallback();
  }, [validProvider, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <div className="relative mx-auto mb-4 w-12 h-12">
              <div className="h-12 w-12 rounded-full border-2 border-brand-200" />
              <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900">Completing sign in...</h2>
            <p className="text-surface-500 mt-2">Please wait while we verify your credentials.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900">Sign in successful!</h2>
            <p className="text-surface-500 mt-2">
              {window.opener
                ? 'This window will close automatically.'
                : 'Redirecting to dashboard...'}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900">Sign in failed</h2>
            <p className="text-red-600 mt-2">{errorMessage}</p>
            {!window.opener && (
              <button
                onClick={() => navigate('/auth/login', { replace: true })}
                className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
              >
                Return to Login
              </button>
            )}
            {window.opener && (
              <p className="text-surface-500 mt-2 text-sm">This window will close automatically.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OAuthCallbackPage;
