import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { PrismaService } from '@libs/database';

// Mock otplib
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
  generateURI: jest.fn(
    () => 'otpauth://totp/Quiz2Biz:user@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Quiz2Biz',
  ),
  verifySync: jest.fn(),
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockQRCode')),
}));

import { verifySync } from 'otplib';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MfaService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  describe('generateMfaSetup', () => {
    it('should generate MFA setup data with QR code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.generateMfaSetup('user-1', 'user@test.com');

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCodeDataUrl).toContain('data:image/png;base64');
      expect(result.manualEntryKey).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaSecret: 'JBSWY3DPEHPK3PXP', mfaEnabled: false },
      });
    });

    it('should throw if MFA already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: true });

      await expect(service.generateMfaSetup('user-1', 'user@test.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle user not found (null)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({});

      // null?.mfaEnabled is falsy, so setup proceeds
      const result = await service.generateMfaSetup('user-1', 'user@test.com');
      expect(result.secret).toBeDefined();
    });
  });

  describe('verifyAndEnableMfa', () => {
    it('should enable MFA with valid code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaSecret: 'secret', mfaEnabled: false });
      (verifySync as jest.Mock).mockReturnValue({ valid: true });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.verifyAndEnableMfa('user-1', '123456');

      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ mfaEnabled: true }),
        }),
      );
    });

    it('should throw if MFA not initiated (no secret)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaSecret: null, mfaEnabled: false });

      await expect(service.verifyAndEnableMfa('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if MFA already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaSecret: 'secret', mfaEnabled: true });

      await expect(service.verifyAndEnableMfa('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw on invalid verification code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaSecret: 'secret', mfaEnabled: false });
      (verifySync as jest.Mock).mockReturnValue({ valid: false });

      await expect(service.verifyAndEnableMfa('user-1', 'wrong')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyMfaCode', () => {
    it('should return true for valid TOTP code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'secret',
        mfaEnabled: true,
        mfaBackupCodes: '[]',
      });
      (verifySync as jest.Mock).mockReturnValue({ valid: true });

      const result = await service.verifyMfaCode('user-1', '123456');
      expect(result).toBe(true);
    });

    it('should return true for valid backup code and consume it', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'secret',
        mfaEnabled: true,
        mfaBackupCodes: '["ABCD1234","EFGH5678"]',
      });
      (verifySync as jest.Mock).mockReturnValue({ valid: false });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.verifyMfaCode('user-1', 'ABCD1234');
      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaBackupCodes: '["EFGH5678"]' },
      });
    });

    it('should return false for invalid code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'secret',
        mfaEnabled: true,
        mfaBackupCodes: '[]',
      });
      (verifySync as jest.Mock).mockReturnValue({ valid: false });

      const result = await service.verifyMfaCode('user-1', 'WRONG');
      expect(result).toBe(false);
    });

    it('should throw if MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: null,
        mfaEnabled: false,
        mfaBackupCodes: null,
      });

      await expect(service.verifyMfaCode('user-1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA with valid code', async () => {
      // First call: disableMfa checks mfaEnabled
      // Second call: verifyMfaCode checks mfaSecret
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ mfaSecret: 'secret', mfaEnabled: true })
        .mockResolvedValueOnce({ mfaSecret: 'secret', mfaEnabled: true, mfaBackupCodes: '[]' });
      (verifySync as jest.Mock).mockReturnValue({ valid: true });
      mockPrisma.user.update.mockResolvedValue({});

      await service.disableMfa('user-1', '123456');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: null },
      });
    });

    it('should throw if MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });

      await expect(service.disableMfa('user-1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException on invalid code', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ mfaSecret: 'secret', mfaEnabled: true })
        .mockResolvedValueOnce({ mfaSecret: 'secret', mfaEnabled: true, mfaBackupCodes: '[]' });
      (verifySync as jest.Mock).mockReturnValue({ valid: false });

      await expect(service.disableMfa('user-1', 'wrong')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes with valid code', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ mfaEnabled: true })
        .mockResolvedValueOnce({ mfaSecret: 'secret', mfaEnabled: true, mfaBackupCodes: '[]' });
      (verifySync as jest.Mock).mockReturnValue({ valid: true });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.regenerateBackupCodes('user-1', '123456');
      expect(result.backupCodes).toHaveLength(10);
      result.backupCodes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });

    it('should throw if MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });

      await expect(service.regenerateBackupCodes('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMfaStatus', () => {
    it('should return enabled status with backup code count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaEnabled: true,
        mfaBackupCodes: '["A","B","C"]',
      });

      const result = await service.getMfaStatus('user-1');
      expect(result).toEqual({ enabled: true, backupCodesCount: 3 });
    });

    it('should return disabled status when MFA off', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaBackupCodes: null,
      });

      const result = await service.getMfaStatus('user-1');
      expect(result).toEqual({ enabled: false, backupCodesCount: 0 });
    });

    it('should handle null user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getMfaStatus('user-1');
      expect(result).toEqual({ enabled: false, backupCodesCount: 0 });
    });
  });

  describe('isMfaEnabled', () => {
    it('should return true when MFA enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: true });
      expect(await service.isMfaEnabled('user-1')).toBe(true);
    });

    it('should return false when MFA disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaEnabled: false });
      expect(await service.isMfaEnabled('user-1')).toBe(false);
    });

    it('should return false for null user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.isMfaEnabled('user-1')).toBe(false);
    });
  });
});
