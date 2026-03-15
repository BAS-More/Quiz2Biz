import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

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
    module.get(Reflector);
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
      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
    });

    it('should delegate to parent when isPublic is undefined', () => {
      const context = createMockExecutionContext();
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      // The guard will call super.canActivate which returns promise/boolean
      guard.canActivate(context);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
    });
  });

  describe('handleRequest', () => {
    const createMockContextForHandleRequest = () => {
      return {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: { authorization: 'Bearer test-token-12345' },
            method: 'GET',
            path: '/api/v1/test',
          }),
        }),
      } as unknown as ExecutionContext;
    };

    it('should return user when authentication is successful', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const context = createMockContextForHandleRequest();

      const result = guard.handleRequest(null, mockUser, null, context);

      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when user is null', () => {
      const context = createMockContextForHandleRequest();
      expect(() => guard.handleRequest(null, null, null, context)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null, context)).toThrow(
        'Authentication required',
      );
    });

    it('should throw UnauthorizedException with token expired message', () => {
      const tokenExpiredError = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';
      const context = createMockContextForHandleRequest();

      expect(() => guard.handleRequest(null, null, tokenExpiredError, context)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, tokenExpiredError, context)).toThrow(
        'Token has expired',
      );
    });

    it('should throw UnauthorizedException with invalid token message', () => {
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      const context = createMockContextForHandleRequest();

      expect(() => guard.handleRequest(null, null, jwtError, context)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, jwtError, context)).toThrow('Invalid token');
    });

    it('should rethrow original error when err is provided', () => {
      const originalError = new Error('Original error');
      const context = createMockContextForHandleRequest();

      expect(() => guard.handleRequest(originalError, null, null, context)).toThrow(originalError);
    });

    it('should throw default UnauthorizedException for unknown info errors', () => {
      const unknownError = new Error('Unknown error');
      unknownError.name = 'UnknownError';
      const context = createMockContextForHandleRequest();

      expect(() => guard.handleRequest(null, null, unknownError, context)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, unknownError, context)).toThrow(
        'Authentication required',
      );
    });

    it('should handle user being undefined', () => {
      const context = createMockContextForHandleRequest();
      expect(() => guard.handleRequest(null, undefined, null, context)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
