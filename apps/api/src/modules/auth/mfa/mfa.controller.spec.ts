import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

// Mock otplib/qrcode before importing controller (transitive dep via MfaService)
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));

import { MfaController } from './mfa.controller';
import { MfaService } from './mfa.service';

const mockMfaService = {
  getMfaStatus: jest.fn(),
  generateMfaSetup: jest.fn(),
  verifyAndEnableMfa: jest.fn(),
  disableMfa: jest.fn(),
  regenerateBackupCodes: jest.fn(),
};

const mockUser = { id: 'user-1', email: 'test@example.com' };

describe('MfaController', () => {
  let controller: MfaController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MfaController],
      providers: [{ provide: MfaService, useValue: mockMfaService }],
    }).compile();

    controller = module.get<MfaController>(MfaController);
  });

  describe('getMfaStatus', () => {
    it('should return MFA status', async () => {
      mockMfaService.getMfaStatus.mockResolvedValue({ enabled: true, backupCodesCount: 5 });

      const result = await controller.getMfaStatus(mockUser);

      expect(result).toEqual({ enabled: true, backupCodesCount: 5 });
      expect(mockMfaService.getMfaStatus).toHaveBeenCalledWith('user-1');
    });

    it('should return disabled status', async () => {
      mockMfaService.getMfaStatus.mockResolvedValue({ enabled: false, backupCodesCount: 0 });

      const result = await controller.getMfaStatus(mockUser);

      expect(result).toEqual({ enabled: false, backupCodesCount: 0 });
    });
  });

  describe('setupMfa', () => {
    it('should return setup data with QR code', async () => {
      const setupResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        manualEntryKey: 'JBSW Y3DP EHPK 3PXP',
      };
      mockMfaService.generateMfaSetup.mockResolvedValue(setupResponse);

      const result = await controller.setupMfa(mockUser);

      expect(result).toEqual(setupResponse);
      expect(mockMfaService.generateMfaSetup).toHaveBeenCalledWith('user-1', 'test@example.com');
    });

    it('should propagate BadRequestException when MFA already enabled', async () => {
      mockMfaService.generateMfaSetup.mockRejectedValue(
        new BadRequestException('MFA is already enabled'),
      );

      await expect(controller.setupMfa(mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyMfaSetup', () => {
    it('should return backup codes on successful verification', async () => {
      const backupResponse = { backupCodes: ['ABC12345', 'DEF67890'] };
      mockMfaService.verifyAndEnableMfa.mockResolvedValue(backupResponse);

      const result = await controller.verifyMfaSetup(mockUser, { code: '123456' });

      expect(result).toEqual(backupResponse);
      expect(mockMfaService.verifyAndEnableMfa).toHaveBeenCalledWith('user-1', '123456');
    });

    it('should propagate BadRequestException on invalid code', async () => {
      mockMfaService.verifyAndEnableMfa.mockRejectedValue(
        new BadRequestException('Invalid verification code'),
      );

      await expect(controller.verifyMfaSetup(mockUser, { code: 'wrong' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('disableMfa', () => {
    it('should return success message when MFA disabled', async () => {
      mockMfaService.disableMfa.mockResolvedValue(undefined);

      const result = await controller.disableMfa(mockUser, { code: '123456' });

      expect(result).toEqual({ message: 'MFA has been disabled' });
      expect(mockMfaService.disableMfa).toHaveBeenCalledWith('user-1', '123456');
    });

    it('should propagate ForbiddenException on invalid code', async () => {
      mockMfaService.disableMfa.mockRejectedValue(
        new ForbiddenException('Invalid verification code'),
      );

      await expect(controller.disableMfa(mockUser, { code: 'wrong' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should propagate BadRequestException when MFA not enabled', async () => {
      mockMfaService.disableMfa.mockRejectedValue(new BadRequestException('MFA is not enabled'));

      await expect(controller.disableMfa(mockUser, { code: '123456' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should return new backup codes', async () => {
      const backupResponse = { backupCodes: ['NEW11111', 'NEW22222'] };
      mockMfaService.regenerateBackupCodes.mockResolvedValue(backupResponse);

      const result = await controller.regenerateBackupCodes(mockUser, { code: '123456' });

      expect(result).toEqual(backupResponse);
      expect(mockMfaService.regenerateBackupCodes).toHaveBeenCalledWith('user-1', '123456');
    });

    it('should propagate ForbiddenException on invalid code', async () => {
      mockMfaService.regenerateBackupCodes.mockRejectedValue(
        new ForbiddenException('Invalid verification code'),
      );

      await expect(controller.regenerateBackupCodes(mockUser, { code: 'wrong' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
