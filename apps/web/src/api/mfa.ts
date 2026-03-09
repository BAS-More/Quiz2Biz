/**
 * MFA API client
 * Handles MFA setup, verification, and management
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1/auth/mfa';

export interface MfaStatus {
  enabled: boolean;
  backupCodesCount: number;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

export interface BackupCodesResponse {
  backupCodes: string[];
}

/**
 * Get current MFA status
 */
export async function getMfaStatus(): Promise<MfaStatus> {
  const { data } = await apiClient.get(`${API_PREFIX}/status`);
  return data;
}

/**
 * Initiate MFA setup (returns QR code)
 */
export async function initiateMfaSetup(): Promise<MfaSetupResponse> {
  const { data } = await apiClient.post(`${API_PREFIX}/setup`);
  return data;
}

/**
 * Verify MFA setup with code and enable MFA
 */
export async function verifyMfaSetup(code: string): Promise<BackupCodesResponse> {
  const { data } = await apiClient.post(`${API_PREFIX}/verify-setup`, { code });
  return data;
}

/**
 * Disable MFA (requires verification code)
 */
export async function disableMfa(code: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete(`${API_PREFIX}/disable`, {
    data: { code },
  });
  return data;
}

/**
 * Regenerate backup codes (requires verification code)
 */
export async function regenerateBackupCodes(code: string): Promise<BackupCodesResponse> {
  const { data } = await apiClient.post(`${API_PREFIX}/backup-codes/regenerate`, { code });
  return data;
}
