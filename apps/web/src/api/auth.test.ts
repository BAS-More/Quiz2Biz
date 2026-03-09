import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API client
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('./client', () => {
  const client = {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: {
      headers: { common: {} },
    },
  };
  return { apiClient: client, default: client };
});

import { authApi } from './auth';

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('posts to /api/v1/auth/register and returns token data', async () => {
      const payload = { email: 'test@example.com', password: 'Password1!', name: 'Test' };
      const tokenResp = { accessToken: 'at', refreshToken: 'rt', user: { id: '1' } };
      mockPost.mockResolvedValueOnce({ data: { success: true, data: tokenResp } });

      const result = await authApi.register(payload);

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/register', payload);
      expect(result).toEqual(tokenResp);
    });

    it('propagates errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Registration failed'));

      await expect(
        authApi.register({ email: 'a@b.com', password: 'x', name: 'N' }),
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('posts to /api/v1/auth/login and returns token data', async () => {
      const payload = { email: 'user@example.com', password: 'secret' };
      const tokenResp = { accessToken: 'at', refreshToken: 'rt', user: { id: '1' } };
      mockPost.mockResolvedValueOnce({ data: { success: true, data: tokenResp } });

      const result = await authApi.login(payload);

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', payload);
      expect(result).toEqual(tokenResp);
    });
  });

  describe('logout', () => {
    it('posts to /api/v1/auth/logout with refresh token', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Logged out' } });

      const result = await authApi.logout('rt-123');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/logout', {
        refreshToken: 'rt-123',
      });
      expect(result).toEqual({ message: 'Logged out' });
    });
  });

  describe('verifyEmail', () => {
    it('posts verification token', async () => {
      mockPost.mockResolvedValueOnce({ data: { verified: true } });

      const result = await authApi.verifyEmail('verify-token');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/verify-email', {
        token: 'verify-token',
      });
      expect(result).toEqual({ verified: true });
    });
  });

  describe('resendVerification', () => {
    it('posts email for re-verification', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Sent' } });

      const result = await authApi.resendVerification('user@example.com');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/resend-verification', {
        email: 'user@example.com',
      });
      expect(result).toEqual({ message: 'Sent' });
    });
  });

  describe('forgotPassword', () => {
    it('posts email for password reset', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Email sent' } });

      const result = await authApi.forgotPassword('user@example.com');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
        email: 'user@example.com',
      });
      expect(result).toEqual({ message: 'Email sent' });
    });
  });

  describe('resetPassword', () => {
    it('posts reset payload', async () => {
      const payload = { token: 'reset-tok', password: 'NewPass1!' };
      mockPost.mockResolvedValueOnce({ data: { message: 'Password reset' } });

      const result = await authApi.resetPassword(payload);

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/reset-password', payload);
      expect(result).toEqual({ message: 'Password reset' });
    });
  });

  describe('getMe', () => {
    it('gets current user profile', async () => {
      const profile = { id: '1', email: 'user@example.com', name: 'Test' };
      mockGet.mockResolvedValueOnce({ data: profile });

      const result = await authApi.getMe();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/me');
      expect(result).toEqual(profile);
    });

    it('propagates errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(authApi.getMe()).rejects.toThrow('Unauthorized');
    });
  });
});
