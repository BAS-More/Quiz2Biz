/**
 * Social OAuth login buttons component
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Loader2 } from 'lucide-react';

// OAuth API endpoints
const OAUTH_ENDPOINTS = {
  google: '/api/auth/oauth/google',
  microsoft: '/api/auth/oauth/microsoft',
};

// OAuth provider config
const PROVIDERS = {
  google: {
    name: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    bgColor: 'bg-white hover:bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
  microsoft: {
    name: 'Microsoft',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    ),
    bgColor: 'bg-white hover:bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
};

interface OAuthButtonsProps {
  mode: 'login' | 'register';
  onError?: (error: string) => void;
}

export function OAuthButtons({ mode, onError }: OAuthButtonsProps) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Initialize Google OAuth
  const handleGoogleLogin = async () => {
    setLoadingProvider('google');

    try {
      // Load Google Identity Services
      // @ts-expect-error - Google Identity Services global
      if (!window.google?.accounts) {
        // Dynamically load the Google Identity Services script
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google SDK'));
          document.head.appendChild(script);
        });
      }

      // @ts-expect-error - Google Identity Services global
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (response: { access_token?: string; error?: string }) => {
          if (response.error) {
            onError?.(response.error);
            setLoadingProvider(null);
            return;
          }

          try {
            // Exchange token with backend
            const res = await fetch(OAUTH_ENDPOINTS.google, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: response.access_token }),
            });

            if (!res.ok) {
              throw new Error('Authentication failed');
            }

            const data = await res.json();
            login(data.accessToken, data.refreshToken, data.user);
            void navigate('/dashboard');
          } catch {
            onError?.('Failed to authenticate with Google');
          } finally {
            setLoadingProvider(null);
          }
        },
      });

      client.requestAccessToken();
    } catch {
      onError?.('Failed to initialize Google login');
      setLoadingProvider(null);
    }
  };

  // Initialize Microsoft OAuth
  const handleMicrosoftLogin = async () => {
    setLoadingProvider('microsoft');

    try {
      // Microsoft OAuth using popup
      const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback/microsoft`);
      const scope = encodeURIComponent('openid profile email User.Read');

      const authUrl =
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `response_mode=fragment`;

      // Open popup for Microsoft login
      const popup = window.open(authUrl, 'microsoft-login', 'width=500,height=600');

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for the callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data?.type === 'microsoft-oauth-callback') {
          window.removeEventListener('message', handleMessage);

          if (event.data.error) {
            onError?.(event.data.error);
            setLoadingProvider(null);
            return;
          }

          try {
            // Exchange token with backend
            const res = await fetch(OAUTH_ENDPOINTS.microsoft, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: event.data.accessToken }),
            });

            if (!res.ok) {
              throw new Error('Authentication failed');
            }

            const data = await res.json();
            login(data.accessToken, data.refreshToken, data.user);
            void navigate('/dashboard');
          } catch {
            onError?.('Failed to authenticate with Microsoft');
          } finally {
            setLoadingProvider(null);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout if popup doesn't respond
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (loadingProvider === 'microsoft') {
          setLoadingProvider(null);
        }
      }, 120000); // 2 minute timeout
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to initialize Microsoft login');
      setLoadingProvider(null);
    }
  };

  const handleOAuthClick = (provider: 'google' | 'microsoft') => {
    if (loadingProvider) {
      return;
    }

    if (provider === 'google') {
      void handleGoogleLogin();
    } else if (provider === 'microsoft') {
      void handleMicrosoftLogin();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            Or {mode === 'login' ? 'sign in' : 'sign up'} with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(PROVIDERS) as Array<keyof typeof PROVIDERS>).map((provider) => {
          const config = PROVIDERS[provider];
          const isLoading = loadingProvider === provider;

          return (
            <button
              key={provider}
              type="button"
              onClick={() => handleOAuthClick(provider)}
              disabled={loadingProvider !== null}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-md shadow-sm text-sm font-medium transition-colors ${config.bgColor} ${config.textColor} ${config.borderColor} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : config.icon}
              <span>{config.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default OAuthButtons;
