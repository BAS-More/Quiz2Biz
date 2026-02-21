/**
 * @fileoverview Tests for OAuthService
 */
import { Test, TestingModule } from '@nestjs/testing';
import { OAuthService } from './oauth.service';
import { PrismaService } from '@libs/database';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('OAuthService', () => {
  let service: OAuthService;
  let prismaService: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/pic.jpg',
    passwordHash: 'hashed-password',
    role: 'USER',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      oAuthAccount: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'google-client-id',
          GOOGLE_CLIENT_SECRET: 'google-client-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshExpiresIn': '7d',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticateWithMicrosoft', () => {
    it('should authenticate with valid Microsoft token', async () => {
      const mockMsProfile = {
        id: 'ms-user-id',
        mail: 'test@microsoft.com',
        displayName: 'Test User',
        givenName: 'Test',
        surname: 'User',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMsProfile),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticateWithMicrosoft('ms-access-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.isNewUser).toBe(true);
    });

    it('should throw UnauthorizedException on Microsoft API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(service.authenticateWithMicrosoft('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return linked accounts for user', async () => {
      const mockAccounts = [
        { provider: 'google', email: 'test@gmail.com', createdAt: new Date() },
      ];
      prismaService.oAuthAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getLinkedAccounts('user-1');

      expect(prismaService.oAuthAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { provider: true, email: true, createdAt: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('google');
    });
  });

  describe('linkOAuthAccount', () => {
    const mockProfile = {
      provider: 'google' as const,
      providerId: 'google-user-id',
      email: 'test@gmail.com',
      emailVerified: true,
      name: 'Test User',
    };

    it('should link new OAuth account', async () => {
      prismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      prismaService.oAuthAccount.create.mockResolvedValue({} as any);

      await service.linkOAuthAccount('user-1', mockProfile);

      expect(prismaService.oAuthAccount.create).toHaveBeenCalled();
    });

    it('should not create duplicate link for same user', async () => {
      prismaService.oAuthAccount.findUnique.mockResolvedValue({
        userId: 'user-1',
      } as any);

      await service.linkOAuthAccount('user-1', mockProfile);

      expect(prismaService.oAuthAccount.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if account linked to another user', async () => {
      prismaService.oAuthAccount.findUnique.mockResolvedValue({
        userId: 'other-user',
      } as any);

      await expect(service.linkOAuthAccount('user-1', mockProfile)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth account when user has password', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        oauthAccounts: [{ provider: 'google' }],
      } as any);
      prismaService.oAuthAccount.deleteMany.mockResolvedValue({ count: 1 });

      await service.unlinkOAuthAccount('user-1', 'google');

      expect(prismaService.oAuthAccount.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', provider: 'google' },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.unlinkOAuthAccount('user-1', 'google')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ConflictException if unlinking only auth method', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
        oauthAccounts: [{ provider: 'google' }],
      } as any);

      await expect(service.unlinkOAuthAccount('user-1', 'google')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
