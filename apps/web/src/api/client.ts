/**
 * Axios API client with interceptors for auth token management and CSRF protection
 *
 * API URL Resolution Strategy:
 * - Production: Uses empty string (relative URLs) - nginx proxies /api/ to backend
 * - Development: Falls back to localhost:3000
 * - Explicit VITE_API_URL: Always used if set
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth';
import { logger } from '../lib/logger';

/**
 * Resolve API base URL based on environment
 * - If VITE_API_URL is explicitly set, use it
 * - In production, use relative URL (nginx proxies /api/ to backend)
 * - In development, fall back to localhost
 */
const API_BASE_URL = (() => {
  // If VITE_API_URL is explicitly set and non-empty, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production, use relative URL (nginx handles proxy to backend)
  if (import.meta.env.PROD) {
    return ''; // Empty string = relative URL
  }
  // Development fallback
  return 'http://localhost:3000';
})();

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'csrf-token';

// CSRF token storage
let csrfToken: string | null = null;

// Token refresh state to prevent race conditions
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Get CSRF token from cookie
 */
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_TOKEN_COOKIE) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Fetch a new CSRF token from the server
 */
export async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/auth/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = response.data.csrfToken;
    return csrfToken!;
  } catch (error) {
    logger.error('Failed to fetch CSRF token:', error);
    // Fallback to cookie if direct fetch fails
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      return csrfToken;
    }
    throw error;
  }
}

/**
 * Initialize CSRF token on app start
 * Called automatically but can be called manually if needed
 */
export async function initializeCsrfToken(): Promise<void> {
  // First check if we have a token in the cookie
  const cookieToken = getCsrfTokenFromCookie();
  if (cookieToken) {
    csrfToken = cookieToken;
    return;
  }

  // Otherwise fetch a new one
  await fetchCsrfToken();
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // Required for CSRF cookies
});

/**
 * Get auth token from store or localStorage fallback
 * This handles race conditions during state synchronization
 */
function getAuthToken(): string | null {
  // First try Zustand in-memory state
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) {
    return storeToken;
  }

  // Fallback: check localStorage directly
  // This handles cases where in-memory state hasn't synchronized yet
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const localToken = parsed.state?.accessToken;
      if (localToken) {
        // Sync the token back to in-memory state
        useAuthStore.getState().setAccessToken(localToken);
        return localToken;
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return null;
}

/**
 * Wait for auth store to finish hydration
 * Prevents race condition where requests fire before localStorage is loaded
 */
async function waitForAuthHydration(): Promise<void> {
  const authState = useAuthStore.getState();
  if (!authState.isLoading) {
    return; // Already hydrated
  }

  return new Promise<void>((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.isLoading) {
        unsubscribe();
        resolve();
      }
    });
    // Timeout after 2 seconds to prevent blocking forever
    setTimeout(() => {
      unsubscribe();
      resolve();
    }, 2000);
  });
}

// Request interceptor to add auth token and CSRF token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Wait for auth store hydration before checking for tokens
    // This prevents 401 errors on initial page load
    await waitForAuthHydration();

    // Add auth token if available (with localStorage fallback)
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests
    const methodsRequiringCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (config.method && methodsRequiringCsrf.includes(config.method.toUpperCase())) {
      // Get token from memory or cookie
      if (!csrfToken) {
        csrfToken = getCsrfTokenFromCookie();
      }

      // If still no token, fetch one (but don't block the request if it fails)
      if (!csrfToken) {
        try {
          await fetchCsrfToken();
        } catch {
          logger.warn('Could not fetch CSRF token, request may fail');
        }
      }

      if (csrfToken) {
        config.headers[CSRF_TOKEN_HEADER] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for token refresh and CSRF handling
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap API response wrapper { success, data, meta } -> data
    // This normalizes backend responses to what frontend expects
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _csrfRetry?: boolean;
      _authRetry?: boolean;
    };

    // Handle CSRF token errors (403 with CSRF_TOKEN_* codes)
    const errorData = error.response?.data as { code?: string } | undefined;
    if (
      error.response?.status === 403 &&
      errorData?.code?.startsWith('CSRF_TOKEN_') &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;

      // Fetch new CSRF token and retry
      try {
        await fetchCsrfToken();
        if (csrfToken) {
          originalRequest.headers[CSRF_TOKEN_HEADER] = csrfToken;
        }
        return apiClient(originalRequest);
      } catch (csrfError) {
        logger.error('Failed to refresh CSRF token:', csrfError);
        return Promise.reject(error);
      }
    }

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      // First, check if this is a timing issue where the token wasn't attached
      // This can happen immediately after login due to state synchronization
      if (!originalRequest._authRetry) {
        originalRequest._authRetry = true;
        
        // Try to get token from localStorage directly
        const token = getAuthToken();
        if (token && !originalRequest.headers.Authorization) {
          // Token exists but wasn't in the original request - retry with token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      }

      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        // If already refreshing, wait for the refresh to complete
        if (isRefreshing) {
          return new Promise((resolve) => {
            refreshSubscribers.push((newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            });
          });
        }

        isRefreshing = true;

        try {
          // Try to refresh token
          const { data } = await axios.post(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            {
              refreshToken,
            },
            { withCredentials: true },
          );

          // API returns wrapped response { success, data: { accessToken }, meta }
          const tokenData = data?.data ?? data;
          const newAccessToken = tokenData?.accessToken;

          if (!newAccessToken) {
            throw new Error('No access token in refresh response');
          }

          // Update tokens in store
          useAuthStore.getState().setAccessToken(newAccessToken);

          // Notify all waiting requests
          refreshSubscribers.forEach((callback) => callback(newAccessToken));
          refreshSubscribers = [];

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          refreshSubscribers = [];
          useAuthStore.getState().logout();
          window.location.href = '/auth/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, logout user
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
