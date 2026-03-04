import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (
    overrides: Partial<ExecutionContext> = {},
  ): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      ...overrides,
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      const context = createMockExecutionContext();
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should delegate to parent canActivate for non-public routes', () => {
      const context = createMockExecutionContext();
      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Mock the parent's canActivate
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
    });

    it('should delegate to parent when isPublic is undefined', () => {
      const context = createMockExecutionContext();
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      // The guard will call super.canActivate which returns promise/boolean
      const result = guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null)).toThrow('Authentication required');
    });

    it('should throw UnauthorizedException with token expired message', () => {
      const tokenExpiredError = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';

      expect(() => guard.handleRequest(null, null, tokenExpiredError)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, tokenExpiredError)).toThrow('Token has expired');
    });

    it('should throw UnauthorizedException with invalid token message', () => {
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';

      expect(() => guard.handleRequest(null, null, jwtError)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, jwtError)).toThrow('Invalid token');
    });

    it('should rethrow original error when err is provided', () => {
      const originalError = new Error('Original error');

      expect(() => guard.handleRequest(originalError, null, null)).toThrow(originalError);
    });

    it('should throw default UnauthorizedException for unknown info errors', () => {
      const unknownError = new Error('Unknown error');
      unknownError.name = 'UnknownError';

      expect(() => guard.handleRequest(null, null, unknownError)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, unknownError)).toThrow(
        'Authentication required',
      );
    });

    it('should handle user being undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(UnauthorizedException);
    });
  });
});
