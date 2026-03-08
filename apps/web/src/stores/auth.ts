/**
 * Auth store using Zustand with localStorage persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import type { User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      login: async (accessToken, refreshToken, user) => {
        // Set state synchronously - Zustand's set() updates in-memory state immediately
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Force localStorage write to complete synchronously
        // This ensures the token is available even if there's a module boundary issue
        try {
          const currentState = {
            state: {
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
            },
            version: 0,
          };
          localStorage.setItem('auth-storage', JSON.stringify(currentState));
        } catch {
          // Ignore localStorage errors, the persist middleware will handle it
        }

        // Verify the token is accessible via getState() - fail fast if not
        const storedToken = useAuthStore.getState().accessToken;
        if (storedToken !== accessToken) {
          console.error('Auth state verification failed - token mismatch');
          // Force a small delay to allow state to propagate
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
        }
      },

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => async (state, error) => {
        if (error) {
          console.error('Auth rehydration error:', error);
        }

        // After rehydration, check if we need to refresh the access token
        if (state) {
          // If we have a refresh token but no access token, refresh proactively
          if (state.refreshToken && !state.accessToken) {
            try {
              const { data } = await axios.post(
                `${API_BASE_URL}/api/v1/auth/refresh`,
                { refreshToken: state.refreshToken },
                { withCredentials: true },
              );
              state.setAccessToken(data.accessToken);
            } catch (refreshError) {
              // Refresh failed - clear auth state and redirect to login
              console.error('Token refresh failed on rehydration:', refreshError);
              state.logout();
            }
          }
          state.setLoading(false);
        }
      },
    },
  ),
);
