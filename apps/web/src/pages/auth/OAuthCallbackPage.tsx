/**
 * OAuth callback page that handles the redirect from OAuth providers.
 * This page runs in a popup window, extracts the token from the URL,
 * sends it to the parent window, and closes itself.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = () => {
      try {
        // Get the hash fragment (contains the token for implicit flow)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        // Check for errors from the OAuth provider
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || error);

          // Send error to parent window
          if (window.opener) {
            window.opener.postMessage(
              {
                type: `${provider}-oauth-callback`,
                error: errorDescription || error,
              },
              window.location.origin
            );
          }

          // Close popup after a short delay to show the error
          setTimeout(() => {
            window.close();
          }, 2000);
          return;
        }

        // Extract access token from implicit flow response
        const accessToken = params.get('access_token');

        if (!accessToken) {
          setStatus('error');
          setErrorMessage('No access token received');

          if (window.opener) {
            window.opener.postMessage(
              {
                type: `${provider}-oauth-callback`,
                error: 'No access token received from provider',
              },
              window.location.origin
            );
          }

          setTimeout(() => {
            window.close();
          }, 2000);
          return;
        }

        // Successfully got the token
        setStatus('success');

        // Send token to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: `${provider}-oauth-callback`,
              accessToken,
            },
            window.location.origin
          );

          // Close popup
          setTimeout(() => {
            window.close();
          }, 500);
        } else {
          // If no opener (direct navigation), redirect to login with the token
          // This shouldn't happen in normal flow but handle it gracefully
          setErrorMessage('This page should be opened in a popup window');
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to process authentication');

        if (window.opener) {
          window.opener.postMessage(
            {
              type: `${provider}-oauth-callback`,
              error: 'Failed to process authentication response',
            },
            window.location.origin
          );
        }

        setTimeout(() => {
          window.close();
        }, 2000);
      }
    };

    handleCallback();
  }, [provider]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <div className="relative mx-auto mb-4 w-12 h-12">
              <div className="h-12 w-12 rounded-full border-2 border-brand-200" />
              <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900">
              Completing sign in...
            </h2>
            <p className="text-surface-500 mt-2">
              Please wait while we verify your credentials.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900">
              Sign in successful!
            </h2>
            <p className="text-surface-500 mt-2">
              This window will close automatically.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-surface-900">
              Sign in failed
            </h2>
            <p className="text-red-600 mt-2">
              {errorMessage}
            </p>
            <p className="text-surface-500 mt-2 text-sm">
              This window will close automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default OAuthCallbackPage;
