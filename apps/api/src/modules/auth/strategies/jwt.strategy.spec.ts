/**
 * @fileoverview Tests for JwtStrategy
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.secret') {return 'test-jwt-secret';}
        return null;
      }),
    };

    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return authenticated user for valid payload', async () => {
      authService.validateUser.mockResolvedValue(mockUser as any);

      const payload = { sub: 'user-1', email: 'test@example.com', role: UserRole.CLIENT };
      const result = await strategy.validate(payload);

      expect(authService.validateUser).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      authService.validateUser.mockResolvedValue(null as any);

      const payload = { sub: 'invalid-user', email: 'test@example.com', role: UserRole.CLIENT };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not set', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(null),
      };

      const mockAuthService = {
        validateUser: jest.fn(),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            { provide: ConfigService, useValue: mockConfigService },
            { provide: AuthService, useValue: mockAuthService },
          ],
        }).compile(),
      ).rejects.toThrow('JWT_SECRET environment variable is required');
    });
  });
});
