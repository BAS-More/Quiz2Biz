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

export const authApi = {
  /**
   * Register a new user
   */
  register: async (payload: RegisterPayload): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/register', payload);
    return data;
  },

  /**
   * Login with email and password
   */
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
    return data;
  },

  /**
   * Logout and invalidate refresh token
   */
  logout: async (refreshToken: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>('/auth/logout', { refreshToken });
    return data;
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    const { data } = await apiClient.post<VerifyEmailResponse>('/auth/verify-email', { token });
    return data;
  },

  /**
   * Resend verification email
   */
  resendVerification: async (email: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>('/auth/resend-verification', { email });
    return data;
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>('/auth/forgot-password', { email });
    return data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (payload: PasswordResetPayload): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>('/auth/reset-password', payload);
    return data;
  },

  /**
   * Get current user profile
   */
  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
};

export default authApi;
