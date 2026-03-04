import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (user: any = null): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      const context = createMockExecutionContext();
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when required roles is empty array', () => {
      const context = createMockExecutionContext();
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      const user = { id: 'user-1', email: 'test@example.com', role: UserRole.ADMIN };
      const context = createMockExecutionContext(user);
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true when user has one of multiple required roles', () => {
      const user = { id: 'user-1', email: 'test@example.com', role: UserRole.DEVELOPER };
      const context = createMockExecutionContext(user);
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.DEVELOPER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when no user in request', () => {
      const context = createMockExecutionContext(null);
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('No user found in request');
    });

    it('should throw ForbiddenException when user lacks required role', () => {
      const user = { id: 'user-1', email: 'test@example.com', role: UserRole.CLIENT };
      const context = createMockExecutionContext(user);
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Access denied. Required roles: ADMIN');
    });

    it('should throw ForbiddenException with multiple required roles in message', () => {
      const user = { id: 'user-1', email: 'test@example.com', role: UserRole.CLIENT };
      const context = createMockExecutionContext(user);
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN, SUPER_ADMIN',
      );
    });

    it('should return true for SUPER_ADMIN when ADMIN is required', () => {
      const user = { id: 'user-1', email: 'test@example.com', role: UserRole.SUPER_ADMIN };
      const context = createMockExecutionContext(user);
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle all UserRole types', () => {
      const roles = [UserRole.CLIENT, UserRole.DEVELOPER, UserRole.ADMIN, UserRole.SUPER_ADMIN];

      for (const role of roles) {
        const user = { id: 'user-1', email: 'test@example.com', role };
        const context = createMockExecutionContext(user);
        mockReflector.getAllAndOverride.mockReturnValue([role]);

        const result = guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should throw when user object exists but has no role property', () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      const context = createMockExecutionContext(user);
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
