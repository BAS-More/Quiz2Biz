import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let module: TestingModule;

  const mockUsersService = {
    findById: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.ADMIN,
    organizationId: 'org-456',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-456',
      } as any;

      mockUsersService.findById.mockResolvedValue(mockProfile);

      const result = await controller.getMe(mockUser as any);

      expect(result).toEqual(mockProfile);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateMe', () => {
    it('should update current user profile', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.CLIENT,
      } as any;

      mockUsersService.update.mockResolvedValue(updatedProfile);

      await controller.updateMe(mockUser as any, updateDto);

      expect(mockUsersService.update).toHaveBeenCalledWith('user-123', updateDto, 'user-123');
    });
  });

  describe('findAll', () => {
    it('should list all users with pagination (Admin only)', async () => {
      const pagination = { page: 1, limit: 10, skip: 0 } as any;
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', role: UserRole.CLIENT },
        { id: 'user-2', email: 'user2@example.com', role: UserRole.ADMIN },
      ];

      mockUsersService.findAll.mockResolvedValue({
        items: mockUsers,
        total: 2,
      });

      const result = await controller.findAll(pagination);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(mockUsersService.findAll).toHaveBeenCalledWith(pagination, undefined);
    });

    it('should filter users by role', async () => {
      const pagination = { page: 1, limit: 10, skip: 0 } as any;
      const role = UserRole.ADMIN;

      mockUsersService.findAll.mockResolvedValue({
        items: [{ id: 'user-1', role: UserRole.ADMIN }],
        total: 1,
      });

      const result = await controller.findAll(pagination, role);

      expect(result.items).toHaveLength(1);
      expect(mockUsersService.findAll).toHaveBeenCalledWith(pagination, UserRole.ADMIN);
    });
  });

  describe('findById', () => {
    it('should get user by ID (Admin only)', async () => {
      const mockProfile = {
        id: 'user-456',
        email: 'other@example.com',
        role: UserRole.CLIENT,
      } as any;

      mockUsersService.findById.mockResolvedValue(mockProfile);

      const result = await controller.findById('user-456');

      expect(result.id).toBe('user-456');
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-456');
    });
  });

  describe('uncovered branches', () => {
    it('should default page to 1 and limit to 20 when undefined', async () => {
      const pagination = { skip: 0 } as any;
      mockUsersService.findAll.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await controller.findAll(pagination);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should correctly calculate totalPages with undefined limit', async () => {
      const pagination = { skip: 0 } as any;
      mockUsersService.findAll.mockResolvedValue({
        items: [{ id: '1' }],
        total: 45,
      });

      const result = await controller.findAll(pagination);

      // 45 / 20 = 2.25, ceil = 3
      expect(result.pagination.totalPages).toBe(3);
    });
  });
});
