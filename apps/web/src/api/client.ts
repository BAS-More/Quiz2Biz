/**
 * Axios API client with interceptors for auth token management and CSRF protection
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'csrf-token';

// CSRF token storage
let csrfToken: string | null = null;

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
    console.error('Failed to fetch CSRF token:', error);
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

// Request interceptor to add auth token and CSRF token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = useAuthStore.getState().accessToken;
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
          console.warn('Could not fetch CSRF token, request may fail');
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
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _csrfRetry?: boolean;
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
        console.error('Failed to refresh CSRF token:', csrfError);
        return Promise.reject(error);
      }
    }

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          // Try to refresh token
          const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          // Update tokens in store
          useAuthStore.getState().setAccessToken(data.accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          window.location.href = '/auth/login';
          return Promise.reject(refreshError);
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
