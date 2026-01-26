import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService, UserProfile } from './users.service';
import { PrismaService } from '@libs/database';
import { UserRole } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    emailVerified: true,
    passwordHash: 'hashed',
    role: UserRole.CLIENT,
    organizationId: 'org-123',
    profile: { name: 'Test User', phone: '+1234567890', timezone: 'UTC' },
    preferences: { notifications: { email: true, push: false }, theme: 'dark' },
    mfaEnabled: false,
    mfaSecret: null,
    lastLoginAt: new Date('2026-01-01'),
    lastLoginIp: '127.0.0.1',
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    organization: { id: 'org-123', name: 'Test Organization' },
    _count: { sessions: 5 },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    document: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('findById', () => {
    it('should return user profile with statistics', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.document.count.mockResolvedValue(10);

      const result = await service.findById('user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.CLIENT,
        profile: {
          name: 'Test User',
          phone: '+1234567890',
          timezone: 'UTC',
          language: undefined,
          avatarUrl: undefined,
        },
        preferences: {
          notifications: { email: true, push: false },
          theme: 'dark',
        },
        organization: { id: 'org-123', name: 'Test Organization' },
        statistics: {
          completedSessions: 5,
          documentsGenerated: 10,
          lastActiveAt: mockUser.lastLoginAt,
        },
        createdAt: mockUser.createdAt,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123', deletedAt: null },
        include: {
          organization: true,
          sessions: {
            where: { status: 'COMPLETED' },
            select: { id: true },
          },
          _count: {
            select: {
              sessions: { where: { status: 'COMPLETED' } },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle user without organization', async () => {
      const userWithoutOrg = { ...mockUser, organization: null, organizationId: null };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutOrg);
      mockPrismaService.document.count.mockResolvedValue(0);

      const result = await service.findById('user-123');

      expect(result.organization).toBeUndefined();
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      name: 'Updated Name',
      phone: '+9876543210',
      timezone: 'America/New_York',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = {
        ...mockUser,
        profile: { ...mockUser.profile, ...updateDto },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockPrismaService.document.count.mockResolvedValue(10);

      const result = await service.update('user-123', updateDto, 'user-123');

      expect(result.profile.name).toBe('Updated Name');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when updating another user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update('user-123', updateDto, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update own profile', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.user.update.mockResolvedValue(adminUser);
      mockPrismaService.document.count.mockResolvedValue(0);

      const result = await service.update('user-123', updateDto, 'user-123');

      expect(result).toBeDefined();
    });

    it('should update preferences', async () => {
      const prefsDto: UpdateUserDto = {
        preferences: { theme: 'light' },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        preferences: { ...mockUser.preferences, theme: 'light' },
      });
      mockPrismaService.document.count.mockResolvedValue(0);

      const result = await service.update('user-123', prefsDto, 'user-123');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preferences: expect.objectContaining({ theme: 'light' }),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-456', email: 'test2@example.com' }];
      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.document.count.mockResolvedValue(5);

      const result = await service.findAll({ page: 1, limit: 10, skip: 0 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { organization: true },
      });
    });

    it('should filter by role', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.document.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: 1, limit: 10, skip: 0 },
        UserRole.CLIENT,
      );

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, role: UserRole.CLIENT },
        }),
      );
    });

    it('should return empty list when no users found', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 10, skip: 0 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
