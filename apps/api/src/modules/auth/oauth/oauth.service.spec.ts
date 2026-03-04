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
      const mockAccounts = [{ provider: 'google', email: 'test@gmail.com', createdAt: new Date() }];
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

    it('should allow unlinking when user has multiple OAuth accounts and no password', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
        oauthAccounts: [{ provider: 'google' }, { provider: 'microsoft' }],
      } as any);
      prismaService.oAuthAccount.deleteMany.mockResolvedValue({ count: 1 });

      await service.unlinkOAuthAccount('user-1', 'google');

      expect(prismaService.oAuthAccount.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', provider: 'google' },
      });
    });

    it('should allow unlinking when user has password and only one OAuth account', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed-password',
        oauthAccounts: [{ provider: 'google' }],
      } as any);
      prismaService.oAuthAccount.deleteMany.mockResolvedValue({ count: 1 });

      await service.unlinkOAuthAccount('user-1', 'google');

      expect(prismaService.oAuthAccount.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', provider: 'google' },
      });
    });
  });

  describe('authenticateWithGoogle', () => {
    let mockVerifyIdToken: jest.Mock;

    beforeEach(() => {
      // Access the mock instance created during service construction
      const { OAuth2Client } = require('google-auth-library');
      // Get the most recent mock instance (created in current beforeEach)
      const lastCallIndex = OAuth2Client.mock.results.length - 1;
      mockVerifyIdToken = OAuth2Client.mock.results[lastCallIndex].value.verifyIdToken;
    });

    it('should authenticate with valid Google ID token for new user', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-user-id-123',
          email: 'google@example.com',
          email_verified: true,
          name: 'Google User',
          given_name: 'Google',
          family_name: 'User',
          picture: 'https://example.com/photo.jpg',
          locale: 'en',
        }),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: 'google@example.com',
        name: 'Google User',
      });
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticateWithGoogle('valid-google-id-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('google@example.com');
    });

    it('should throw UnauthorizedException when Google token payload is null', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      await expect(service.authenticateWithGoogle('token-with-null-payload')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when Google token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      await expect(service.authenticateWithGoogle('expired-google-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle email_verified=false from Google', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-user-id-456',
          email: 'unverified@example.com',
          email_verified: false,
          name: 'Unverified User',
        }),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: 'unverified@example.com',
        name: 'Unverified User',
      });
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticateWithGoogle('valid-token');

      expect(result.isNewUser).toBe(true);
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: false,
          }),
        }),
      );
    });
  });

  describe('authenticateWithMicrosoft - additional branches', () => {
    it('should link to existing user when email already exists', async () => {
      const mockMsProfile = {
        id: 'ms-user-id',
        mail: 'test@example.com',
        displayName: 'Test User',
        givenName: 'Test',
        surname: 'User',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMsProfile),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.oAuthAccount.create.mockResolvedValue({} as any);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticateWithMicrosoft('ms-access-token');

      expect(result.isNewUser).toBe(false);
      expect(prismaService.oAuthAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: 'microsoft',
            providerId: 'ms-user-id',
            userId: mockUser.id,
          }),
        }),
      );
    });

    it('should update existing OAuth account on login', async () => {
      const mockMsProfile = {
        id: 'ms-user-id',
        mail: 'test@example.com',
        displayName: 'Test User',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMsProfile),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth-account-1',
        provider: 'microsoft',
        providerId: 'ms-user-id',
        user: mockUser,
      });
      prismaService.oAuthAccount.update.mockResolvedValue({} as any);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticateWithMicrosoft('ms-access-token');

      expect(result.isNewUser).toBe(false);
      expect(prismaService.oAuthAccount.update).toHaveBeenCalledWith({
        where: { id: 'oauth-account-1' },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      });
    });

    it('should use userPrincipalName when mail is not provided', async () => {
      const mockMsProfile = {
        id: 'ms-user-id',
        userPrincipalName: 'upn@example.com',
        displayName: 'UPN User',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMsProfile),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: 'upn@example.com',
        name: 'UPN User',
      });
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticateWithMicrosoft('ms-access-token');

      expect(result.user.email).toBe('upn@example.com');
      expect(result.isNewUser).toBe(true);
    });

    it('should handle fetch network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.authenticateWithMicrosoft('ms-access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('handleOAuthLogin - user name fallback', () => {
    it('should use email prefix as name when profile name is undefined', async () => {
      const mockMsProfile = {
        id: 'ms-user-id',
        mail: 'noname@example.com',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMsProfile),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'noname@example.com',
        name: 'noname',
        avatar: undefined,
      });
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticateWithMicrosoft('ms-access-token');

      expect(result.isNewUser).toBe(true);
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'noname',
          }),
        }),
      );
    });
  });

  describe('getLinkedAccounts - additional cases', () => {
    it('should return empty array when no accounts are linked', async () => {
      prismaService.oAuthAccount.findMany.mockResolvedValue([]);

      const result = await service.getLinkedAccounts('user-1');

      expect(result).toEqual([]);
    });

    it('should handle null email in accounts', async () => {
      prismaService.oAuthAccount.findMany.mockResolvedValue([
        { provider: 'microsoft', email: null, createdAt: new Date('2025-01-01') },
      ]);

      const result = await service.getLinkedAccounts('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('');
    });

    it('should return multiple accounts with correct mapping', async () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-06-15');
      prismaService.oAuthAccount.findMany.mockResolvedValue([
        { provider: 'google', email: 'user@gmail.com', createdAt: date1 },
        { provider: 'microsoft', email: 'user@outlook.com', createdAt: date2 },
      ]);

      const result = await service.getLinkedAccounts('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ provider: 'google', email: 'user@gmail.com', linkedAt: date1 });
      expect(result[1]).toEqual({
        provider: 'microsoft',
        email: 'user@outlook.com',
        linkedAt: date2,
      });
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', async () => {
      // Test indirectly via authenticateWithMicrosoft which calls generateTokens
      const mockMsProfile = {
        id: 'ms-user-id',
        mail: 'test@example.com',
        displayName: 'Test User',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMsProfile),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth-1',
        user: { ...mockUser, role: undefined },
      });
      prismaService.oAuthAccount.update.mockResolvedValue({} as any);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-value')
        .mockResolvedValueOnce('refresh-token-value');

      const result = await service.authenticateWithMicrosoft('ms-access-token');

      expect(result.accessToken).toBe('access-token-value');
      expect(result.refreshToken).toBe('refresh-token-value');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should default role to "user" when user has no role', async () => {
      const mockMsProfile = {
        id: 'ms-user-id',
        mail: 'test@example.com',
        displayName: 'Test User',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMsProfile),
      });

      prismaService.oAuthAccount.findUnique.mockResolvedValue({
        id: 'oauth-1',
        user: { id: 'user-1', email: 'test@example.com', name: 'Test', avatar: null },
      });
      prismaService.oAuthAccount.update.mockResolvedValue({} as any);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      await service.authenticateWithMicrosoft('ms-access-token');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' }),
        expect.any(Object),
      );
    });
  });
});
