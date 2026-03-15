import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GdprService } from './gdpr.service';
import { GdprController } from './gdpr.controller';
import { PrismaService } from '@libs/database';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'USER',
  profile: { name: 'Test' },
  preferences: { theme: 'dark' },
  createdAt: new Date('2025-01-01'),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  session: { findMany: jest.fn() },
  document: { findMany: jest.fn() },
  auditLog: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  refreshToken: { deleteMany: jest.fn() },
};

describe('GdprService', () => {
  let service: GdprService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [GdprService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<GdprService>(GdprService);
  });

  describe('exportUserData', () => {
    it('should return full data export for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.findMany.mockResolvedValue([
        { id: 's1', status: 'COMPLETED', startedAt: new Date(), completedAt: new Date() },
      ]);
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 'd1', status: 'GENERATED', fileName: 'doc.pdf', createdAt: new Date() },
      ]);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'a1', action: 'LOGIN', createdAt: new Date() },
      ]);

      const result = await service.exportUserData('user-1');

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@example.com');
      expect(result.sessions).toHaveLength(1);
      expect(result.documents).toHaveLength(1);
      expect(result.auditLogs).toHaveLength(1);
      expect(result.exportedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException for missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUserData', () => {
    it('should anonymise PII and soft-delete user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.auditLog.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      const result = await service.deleteUserData('user-1');

      expect(result.deletedAt).toBeInstanceOf(Date);
      // 3 audit logs + 2 tokens + 1 user = 6
      expect(result.itemsRemoved).toBe(6);

      // Verify user was anonymised
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'deleted-user-1@gdpr-removed.local',
            name: null,
            passwordHash: '',
            profile: {},
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException for missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUserData('missing')).rejects.toThrow(NotFoundException);
    });

    it('should propagate database errors with logging', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.auditLog.updateMany.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteUserData('user-1')).rejects.toThrow('DB error');
    });
  });
});

describe('GdprController', () => {
  let controller: GdprController;
  let gdprService: jest.Mocked<GdprService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [
        {
          provide: GdprService,
          useValue: {
            exportUserData: jest.fn(),
            deleteUserData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GdprController>(GdprController);
    gdprService = module.get(GdprService);
  });

  it('exportData delegates to GdprService.exportUserData', async () => {
    const mockExport = {
      exportedAt: new Date(),
      user: mockUser,
      sessions: [],
      documents: [],
      auditLogs: [],
    };
    gdprService.exportUserData.mockResolvedValue(mockExport as any);

    const result = await controller.exportData({
      id: 'user-1',
      email: 'a@b.com',
      role: 'USER',
    } as any);

    expect(gdprService.exportUserData).toHaveBeenCalledWith('user-1');
    expect(result.user.id).toBe('user-1');
  });

  it('deleteData delegates to GdprService.deleteUserData', async () => {
    const mockResult = { deletedAt: new Date(), itemsRemoved: 5 };
    gdprService.deleteUserData.mockResolvedValue(mockResult);

    const result = await controller.deleteData({
      id: 'user-1',
      email: 'a@b.com',
      role: 'USER',
    } as any);

    expect(gdprService.deleteUserData).toHaveBeenCalledWith('user-1');
    expect(result.itemsRemoved).toBe(5);
  });
});
