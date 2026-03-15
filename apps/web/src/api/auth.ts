/**
 * Auth API service
 */

import apiClient from './client';
import type {
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  MessageResponse,
  VerifyEmailResponse,
  PasswordResetPayload,
} from '../types';

const AUTH_PREFIX = '/api/v1/auth';

export const authApi = {
  /**
   * Register a new user
   */
  register: async (payload: RegisterPayload): Promise<TokenResponse> => {
    const { data } = await apiClient.post<{ success: boolean; data: TokenResponse }>(
      `${AUTH_PREFIX}/register`,
      payload,
    );
    return data.data;
  },

  /**
   * Login with email and password
   */
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await apiClient.post<{ success: boolean; data: TokenResponse }>(
      `${AUTH_PREFIX}/login`,
      payload,
    );
    return data.data;
  },

  /**
   * Logout and invalidate refresh token
   */
  logout: async (refreshToken: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>(`${AUTH_PREFIX}/logout`, {
      refreshToken,
    });
    return data;
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    const { data } = await apiClient.post<VerifyEmailResponse>(`${AUTH_PREFIX}/verify-email`, {
      token,
    });
    return data;
  },

  /**
   * Resend verification email
   */
  resendVerification: async (email: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>(`${AUTH_PREFIX}/resend-verification`, {
      email,
    });
    return data;
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>(`${AUTH_PREFIX}/forgot-password`, {
      email,
    });
    return data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (payload: PasswordResetPayload): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>(
      `${AUTH_PREFIX}/reset-password`,
      payload,
    );
    return data;
  },

  /**
   * Get current user profile
   */
  getMe: async () => {
    const { data } = await apiClient.get(`${AUTH_PREFIX}/me`);
    return data;
  },
};

export default authApi;
