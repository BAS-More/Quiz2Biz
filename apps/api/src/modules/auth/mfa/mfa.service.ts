/**
 * MFA Service
 * Handles TOTP-based multi-factor authentication setup and verification
 */

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export interface MfaSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

export interface BackupCodesResponse {
  backupCodes: string[];
}

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate MFA setup data (secret and QR code)
   */
  async generateMfaSetup(userId: string, userEmail: string): Promise<MfaSetupResponse> {
    // Check if MFA is already enabled
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (user?.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled for this account');
    }

    // Generate a new secret
    const secret = generateSecret();

    // Generate QR code for authenticator apps
    const issuer = 'Quiz2Biz';
    const otpauthUrl = generateURI({ issuer, label: userEmail, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store the secret temporarily (pending verification)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaEnabled: false, // Not enabled until verified
      },
    });

    return {
      secret,
      qrCodeDataUrl,
      manualEntryKey: this.formatSecretForManualEntry(secret),
    };
  }

  /**
   * Verify MFA code and enable MFA for the user
   */
  async verifyAndEnableMfa(userId: string, code: string): Promise<BackupCodesResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user?.mfaSecret) {
      throw new BadRequestException('MFA setup has not been initiated');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Verify the code
    const result = verifySync({ token: code, secret: user.mfaSecret });
    const isValid = result.valid;

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Enable MFA and store backup codes
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: JSON.stringify(backupCodes),
      },
    });

    return { backupCodes };
  }

  /**
   * Verify MFA code during login
   */
  async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    // First check if it's a TOTP code
    const totpResult = verifySync({ token: code, secret: user.mfaSecret });
    const isValidTotp = totpResult.valid;

    if (isValidTotp) {
      return true;
    }

    // Check if it's a backup code
    const backupCodes: string[] = user.mfaBackupCodes
      ? (JSON.parse(user.mfaBackupCodes) as string[])
      : [];

    const codeIndex = backupCodes.indexOf(code.toUpperCase());
    if (codeIndex !== -1) {
      // Remove the used backup code
      backupCodes.splice(codeIndex, 1);
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: JSON.stringify(backupCodes) },
      });
      return true;
    }

    return false;
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user?.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify the code before disabling
    const isValid = await this.verifyMfaCode(userId, code);
    if (!isValid) {
      throw new ForbiddenException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
      },
    });
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<BackupCodesResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (!user?.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify current code
    const isValid = await this.verifyMfaCode(userId, code);
    if (!isValid) {
      throw new ForbiddenException('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: JSON.stringify(backupCodes) },
    });

    return { backupCodes };
  }

  /**
   * Get MFA status for a user
   */
  async getMfaStatus(userId: string): Promise<{ enabled: boolean; backupCodesCount: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaBackupCodes: true },
    });

    const backupCodes: string[] = user?.mfaBackupCodes
      ? (JSON.parse(user.mfaBackupCodes) as string[])
      : [];

    return {
      enabled: user?.mfaEnabled ?? false,
      backupCodesCount: backupCodes.length,
    };
  }

  /**
   * Check if user has MFA enabled (for login flow)
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    return user?.mfaEnabled ?? false;
  }

  /**
   * Generate random backup codes
   */
  private generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
      codes.push(code);
    }
    return codes;
  }

  /**
   * Format secret for manual entry in authenticator apps
   */
  private formatSecretForManualEntry(secret: string): string {
    // Add spaces every 4 characters for readability
    return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
  }
}
