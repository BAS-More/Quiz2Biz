import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
  let notificationService: any; // Use any for mocked service

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
        findMany: jest.fn(),
        updateMany: jest.fn(),
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
      sendEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
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
    notificationService = module.get(NotificationService);
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

  describe('register - verification email failure', () => {
    it('should succeed even when verification email fails to send', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);
      notificationService.sendVerificationEmail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      const result = await service.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test',
      });

      // Registration should still succeed
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token-uuid');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully for a valid token', async () => {
      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        name: 'Test User',
      });
      prismaService.user.update.mockResolvedValue({ ...mockUser, emailVerified: true });
      redisService.del.mockResolvedValue(undefined);

      const result = await service.verifyEmail('valid-verification-token');

      expect(result).toEqual({ message: 'Email verified successfully', verified: true });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { emailVerified: true },
      });
      expect(redisService.del).toHaveBeenCalledWith('verify:valid-verification-token');
    });

    it('should throw BadRequestException for invalid or expired token', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      redisService.get.mockResolvedValue('non-existent-user');
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('valid-token')).rejects.toThrow(NotFoundException);
    });

    it('should return already verified message if email is already verified', async () => {
      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      const result = await service.verifyEmail('valid-token');

      expect(result).toEqual({ message: 'Email already verified', verified: true });
      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith('verify:valid-token');
    });

    it('should send welcome email after successful verification', async () => {
      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        name: 'Test User',
      });
      prismaService.user.update.mockResolvedValue({ ...mockUser, emailVerified: true });

      await service.verifyEmail('valid-token');

      expect(notificationService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        'Test User',
      );
    });

    it('should use email prefix as name when user.name is falsy', async () => {
      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        name: '',
        email: 'john@example.com',
      });
      prismaService.user.update.mockResolvedValue({ ...mockUser, emailVerified: true });

      await service.verifyEmail('valid-token');

      expect(notificationService.sendWelcomeEmail).toHaveBeenCalledWith('john@example.com', 'john');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should return generic message when user does not exist (prevents enumeration)', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerificationEmail('unknown@example.com');

      expect(result).toEqual({
        message: 'If your email is registered, you will receive a verification link',
      });
    });

    it('should return already verified message when email is already verified', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      const result = await service.resendVerificationEmail('test@example.com');

      expect(result).toEqual({ message: 'Email is already verified' });
    });

    it('should send verification email for unverified user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        profile: { name: 'Test User' },
      });
      redisService.set.mockResolvedValue(undefined);

      const result = await service.resendVerificationEmail('test@example.com');

      expect(result).toEqual({
        message: 'If your email is registered, you will receive a verification link',
      });
      expect(notificationService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should use email prefix as name when profile is null', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        profile: null,
      });
      redisService.set.mockResolvedValue(undefined);

      const result = await service.resendVerificationEmail('test@example.com');

      expect(result).toEqual({
        message: 'If your email is registered, you will receive a verification link',
      });
    });

    it('should convert email to lowercase', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await service.resendVerificationEmail('TEST@EXAMPLE.COM');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should return success message when user does not exist (prevents enumeration)', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset('unknown@example.com');

      expect(result).toEqual({
        message: 'If your email is registered, you will receive a password reset link',
      });
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should store reset token and send email for existing user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        profile: { name: 'Test User' },
      });
      redisService.set.mockResolvedValue(undefined);

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual({
        message: 'If your email is registered, you will receive a password reset link',
      });
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^reset:/),
        mockUser.id,
        expect.any(Number),
      );
      expect(notificationService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should succeed even if notification email fails to send', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        profile: null,
      });
      redisService.set.mockResolvedValue(undefined);
      notificationService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service down'));

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual({
        message: 'If your email is registered, you will receive a password reset link',
      });
    });

    it('should convert email to lowercase', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await service.requestPasswordReset('TEST@EXAMPLE.COM');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should use email prefix as name when profile has no name', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        email: 'john@example.com',
        profile: {},
      });
      redisService.set.mockResolvedValue(undefined);

      await service.requestPasswordReset('john@example.com');

      expect(notificationService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'john@example.com',
        'john',
        expect.any(String),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prismaService.user.update.mockResolvedValue(mockUser);
      redisService.del.mockResolvedValue(undefined);
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.resetPassword('valid-reset-token', 'NewSecurePass123!');

      expect(result).toEqual({ message: 'Password has been reset successfully' });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          passwordHash: 'new-hashed-password',
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      expect(redisService.del).toHaveBeenCalledWith('reset:valid-reset-token');
    });

    it('should throw BadRequestException for invalid or expired token', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.resetPassword('expired-token', 'NewSecurePass123!')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword('expired-token', 'NewSecurePass123!')).rejects.toThrow(
        'Invalid or expired password reset token',
      );
    });

    it('should throw BadRequestException for password shorter than 12 characters', async () => {
      redisService.get.mockResolvedValue('user-123');

      await expect(service.resetPassword('valid-token', 'short')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword('valid-token', 'short')).rejects.toThrow(
        'Password must be at least 12 characters long',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      redisService.get.mockResolvedValue('non-existent-user');
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword('valid-token', 'LongEnoughPass123!')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should invalidate all existing refresh tokens after password reset', async () => {
      const existingTokens = [
        { id: 'rt-1', token: 'refresh-token-1', userId: 'user-123' },
        { id: 'rt-2', token: 'refresh-token-2', userId: 'user-123' },
      ];

      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prismaService.user.update.mockResolvedValue(mockUser);
      prismaService.refreshToken.findMany.mockResolvedValue(existingTokens);
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.resetPassword('valid-token', 'NewSecurePass123!');

      // Should remove each refresh token from Redis
      expect(redisService.del).toHaveBeenCalledWith('refresh:refresh-token-1');
      expect(redisService.del).toHaveBeenCalledWith('refresh:refresh-token-2');

      // Should revoke tokens in the database
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should accept password with exactly 12 characters', async () => {
      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prismaService.user.update.mockResolvedValue(mockUser);
      prismaService.refreshToken.findMany.mockResolvedValue([]);
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.resetPassword('valid-token', '123456789012');

      expect(result).toEqual({ message: 'Password has been reset successfully' });
    });

    it('should reject password with 11 characters', async () => {
      redisService.get.mockResolvedValue('user-123');

      await expect(service.resetPassword('valid-token', '12345678901')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleFailedLogin - lockout thresholds', () => {
    it('should not lock account after fewer than 5 failed attempts', async () => {
      const userWith3Attempts = { ...mockUser, failedLoginAttempts: 3 };
      prismaService.user.findUnique.mockResolvedValue(userWith3Attempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaService.user.update.mockResolvedValue(userWith3Attempts);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { failedLoginAttempts: 4 },
      });
    });

    it('should lock account after exactly 5 failed attempts (already at 4)', async () => {
      const userWith4Attempts = { ...mockUser, failedLoginAttempts: 4 };
      prismaService.user.findUnique.mockResolvedValue(userWith4Attempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaService.user.update.mockResolvedValue(userWith4Attempts);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );

      const updateCall = prismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.failedLoginAttempts).toBe(5);
      expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);
      // Lock should be approximately 15 minutes from now
      const lockDuration = updateCall.data.lockedUntil.getTime() - Date.now();
      expect(lockDuration).toBeGreaterThan(14 * 60 * 1000);
      expect(lockDuration).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    });

    it('should lock account when attempts exceed 5 (already at 6)', async () => {
      const userWith6Attempts = { ...mockUser, failedLoginAttempts: 6 };
      prismaService.user.findUnique.mockResolvedValue(userWith6Attempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaService.user.update.mockResolvedValue(userWith6Attempts);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );

      const updateCall = prismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.failedLoginAttempts).toBe(7);
      expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('login - successful login resets state', () => {
    it('should reset failedLoginAttempts and lockedUntil on successful login', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.user.update.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await service.login({ email: 'test@example.com', password: 'correct', ip: '10.0.0.1' });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
          lastLoginIp: '10.0.0.1',
        },
      });
    });

    it('should store refresh token in both Redis and database', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.user.update.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await service.login({ email: 'test@example.com', password: 'correct' });

      expect(redisService.set).toHaveBeenCalledWith(
        'refresh:mock-refresh-token-uuid',
        mockUser.id,
        604800,
      );
      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          token: 'mock-refresh-token-uuid',
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('validateUser - edge cases', () => {
    it('should handle profile with name property as empty string', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        profile: { name: '' },
        deletedAt: null,
      } as any);

      const result = await service.validateUser({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(result?.name).toBeUndefined();
    });

    it('should handle profile with no name property', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        profile: { otherField: 'value' },
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

  // ===========================================================================
  // BRANCH COVERAGE TESTS
  // ===========================================================================

  describe('branch coverage - sendVerificationEmail internal try/catch', () => {
    it('should handle sendVerificationEmail inner try/catch when notification fails', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);
      // sendVerificationEmail inner try calls notificationService.sendVerificationEmail
      // First call from register's try block succeeds at Redis set but notification fails internally
      notificationService.sendVerificationEmail.mockRejectedValue(new Error('SMTP timeout'));

      const result = await service.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test',
      });

      // Should still succeed because sendVerificationEmail catches errors internally
      expect(result.accessToken).toBe('mock-access-token');
    });
  });

  describe('branch coverage - sendVerificationEmail uses name fallback from email', () => {
    it('should use email prefix when name is not provided to register', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: 'alice@example.com',
        profile: { name: undefined },
      });
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await service.register({
        email: 'alice@example.com',
        password: 'password',
      } as any);

      // sendVerificationEmail should be called with email prefix since name is undefined
      expect(notificationService.sendVerificationEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'alice',
        expect.any(String),
      );
    });
  });

  describe('branch coverage - generateTokens profile null vs present', () => {
    it('should return undefined name when user profile is null in token generation', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        profile: null,
      });
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test',
      });

      expect(result.user.name).toBeUndefined();
    });
  });

  describe('branch coverage - verifyEmail welcome email failure', () => {
    it('should succeed even when welcome email fails to send', async () => {
      redisService.get.mockResolvedValue('user-123');
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        name: 'Test User',
      });
      prismaService.user.update.mockResolvedValue({ ...mockUser, emailVerified: true });
      notificationService.sendWelcomeEmail.mockRejectedValue(new Error('Email failed'));

      const result = await service.verifyEmail('valid-token');

      // Should still succeed because welcome email is fire-and-forget
      expect(result.verified).toBe(true);
    });
  });

  describe('branch coverage - requestPasswordReset notification failure', () => {
    it('should handle password reset email send failure gracefully', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        profile: { name: 'Test User' },
      });
      redisService.set.mockResolvedValue(undefined);
      notificationService.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.requestPasswordReset('test@example.com');

      expect(result.message).toBe(
        'If your email is registered, you will receive a password reset link',
      );
    });
  });

  describe('branch coverage - parseExpiresInToSeconds all units', () => {
    // parseExpiresInToSeconds is tested indirectly through constructor.
    // We can test it by creating new instances with different config values.

    it('should parse "30s" as 30 seconds', async () => {
      // Create a new service with '30s' config
      const customConfigService = {
        get: jest.fn((key: string, defaultValue: unknown) => {
          const config: Record<string, unknown> = {
            'bcrypt.rounds': 12,
            'jwt.refreshSecret': 'test-refresh-secret',
            'jwt.refreshExpiresIn': '30s',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prismaService },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: customConfigService },
          { provide: RedisService, useValue: redisService },
          { provide: NotificationService, useValue: notificationService },
        ],
      }).compile();

      const svc = module.get<AuthService>(AuthService);
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await svc.register({ email: 'x@x.com', password: 'pass', name: 'X' });

      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), mockUser.id, 30);
      await module.close();
    });

    it('should parse "5m" as 300 seconds', async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue: unknown) => {
          const config: Record<string, unknown> = {
            'bcrypt.rounds': 12,
            'jwt.refreshSecret': 'test',
            'jwt.refreshExpiresIn': '5m',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prismaService },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: customConfigService },
          { provide: RedisService, useValue: redisService },
          { provide: NotificationService, useValue: notificationService },
        ],
      }).compile();

      const svc = module.get<AuthService>(AuthService);
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await svc.register({ email: 'x@x.com', password: 'pass', name: 'X' });

      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), mockUser.id, 300);
      await module.close();
    });

    it('should parse "2h" as 7200 seconds', async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue: unknown) => {
          const config: Record<string, unknown> = {
            'bcrypt.rounds': 12,
            'jwt.refreshSecret': 'test',
            'jwt.refreshExpiresIn': '2h',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prismaService },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: customConfigService },
          { provide: RedisService, useValue: redisService },
          { provide: NotificationService, useValue: notificationService },
        ],
      }).compile();

      const svc = module.get<AuthService>(AuthService);
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await svc.register({ email: 'x@x.com', password: 'pass', name: 'X' });

      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), mockUser.id, 7200);
      await module.close();
    });

    it('should fall back to 7 days when expiresIn format is invalid', async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue: unknown) => {
          const config: Record<string, unknown> = {
            'bcrypt.rounds': 12,
            'jwt.refreshSecret': 'test',
            'jwt.refreshExpiresIn': 'invalid-format',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prismaService },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: customConfigService },
          { provide: RedisService, useValue: redisService },
          { provide: NotificationService, useValue: notificationService },
        ],
      }).compile();

      const svc = module.get<AuthService>(AuthService);
      prismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prismaService.user.create.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({} as any);

      await svc.register({ email: 'x@x.com', password: 'pass', name: 'X' });

      // Default 7 days = 604800 seconds
      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), mockUser.id, 604800);
      await module.close();
    });
  });
});
