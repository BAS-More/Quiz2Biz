/**
 * Auth types matching backend DTOs
 */

export interface User {
  id: string;
  email: string;
  role: 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN';
  name?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PasswordResetPayload {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

export interface VerifyEmailResponse {
  message: string;
  verified: boolean;
}
