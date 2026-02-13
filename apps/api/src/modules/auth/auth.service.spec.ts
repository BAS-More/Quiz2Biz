import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import { NotificationService } from '../notifications/notification.service';
import { UserRole } from '@prisma/client';

jest.mock('bcrypt');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-refresh-token-uuid'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any; // Use any for mocked service to avoid TypeScript mock type conflicts
  let jwtService: jest.Mocked<JwtService>;
  let redisService: any; // Use any for mocked service

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.CLIENT,
    profile: { name: 'Test User' },
    failedLoginAttempts: 0,
    lockedUntil: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    lastLoginIp: null,
    organizationId: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn(() => 'mock-access-token'),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        const config: Record<string, unknown> = {
          'bcrypt.rounds': 12,
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockNotificationService = {
      sendEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendEmailVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        profile: { name: registerDto.name },
      });
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token-uuid',
        expiresIn: 900,
        tokenType: 'Bearer',
        user: {
          id: mockUser.id,
          email: registerDto.email,
          role: UserRole.CLIENT,
          name: registerDto.name,
        },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email.toLowerCase() },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });

    it('should throw ConflictException if user already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should convert email to lowercase', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await service.register({ ...registerDto, email: 'NEW@EXAMPLE.COM' });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
      ip: '127.0.0.1',
    };

    it('should login successfully with valid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.user.update.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token-uuid');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      });
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaService.user.update.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 60000), // locked for 1 minute
      };
      prismaService.user.findUnique.mockResolvedValue(lockedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Account is temporarily locked. Please try again later.'),
      );
    });

    it('should allow login if lock has expired', async () => {
      const expiredLockUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() - 60000), // lock expired 1 minute ago
      };
      prismaService.user.findUnique.mockResolvedValue(expiredLockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.user.update.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException if passwordHash is null', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      redisService.get.mockResolvedValue(mockUser.id);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refresh('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        expiresIn: 900,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      redisService.get.mockResolvedValue(mockUser.id);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      redisService.get.mockResolvedValue(mockUser.id);
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should remove refresh token from Redis', async () => {
      await service.logout('refresh-token');

      expect(redisService.del).toHaveBeenCalledWith('refresh:refresh-token');
    });
  });

  describe('validateUser', () => {
    it('should return authenticated user for valid payload', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        profile: mockUser.profile,
        deletedAt: null,
      } as any);

      const result = await service.validateUser({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        name: 'Test User',
      });
    });

    it('should return null for deleted user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      } as any);

      const result = await service.validateUser({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser({
        sub: 'non-existent',
        email: 'test@example.com',
        role: UserRole.CLIENT,
      });

      expect(result).toBeNull();
    });

    it('should handle user without profile name', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        profile: null,
        deletedAt: null,
      } as any);

      const result = await service.validateUser({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(result?.name).toBeUndefined();
    });
  });

  describe('handleFailedLogin', () => {
    it('should increment failed login attempts', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaService.user.update.mockResolvedValue(mockUser);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { failedLoginAttempts: 1 },
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      const userWith4Attempts = { ...mockUser, failedLoginAttempts: 4 };
      prismaService.user.findUnique.mockResolvedValue(userWith4Attempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaService.user.update.mockResolvedValue(userWith4Attempts);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });
  });

  describe('parseExpiresInToSeconds', () => {
    it('should parse seconds correctly', async () => {
      // Testing via constructor by checking token TTL behavior
      // The parseExpiresInToSeconds is private, but we can test it indirectly
      // through the refresh token TTL in Redis
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await service.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test',
      });

      // The default is 7d which should be 604800 seconds
      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), mockUser.id, 604800);
    });
  });
});
