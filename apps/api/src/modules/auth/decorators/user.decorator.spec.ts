import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './user.decorator';

describe('CurrentUser Decorator', () => {
  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;
  };

  function getParamDecoratorFactory<T>(decorator: ParameterDecorator) {
    class TestClass {
      public testMethod(@decorator value: T) {
        return value;
      }
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'testMethod');
    return args[Object.keys(args)[0]].factory;
  }

  describe('decorator factory', () => {
    it('should create a param decorator', () => {
      class TestController {
        test(@CurrentUser() user: unknown) {
          return user;
        }
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
      expect(metadata).toBeDefined();
      expect(Object.keys(metadata)).toHaveLength(1);
    });

    it('should create a param decorator with key', () => {
      class TestController {
        test(@CurrentUser('id') userId: unknown) {
          return userId;
        }
      }

      const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
      expect(metadata).toBeDefined();
    });
  });

  describe('without data parameter', () => {
    it('should return the full user object', () => {
      const factory = getParamDecoratorFactory(CurrentUser());
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
      };

      const ctx = createMockExecutionContext(mockUser);
      const result = factory(undefined, ctx);

      expect(result).toEqual(mockUser);
    });

    it('should return undefined when no user in request', () => {
      const factory = getParamDecoratorFactory(CurrentUser());
      const ctx = createMockExecutionContext(undefined);
      const result = factory(undefined, ctx);

      expect(result).toBeUndefined();
    });

    it('should return null when user is null', () => {
      const factory = getParamDecoratorFactory(CurrentUser());
      const ctx = createMockExecutionContext(null);
      const result = factory(undefined, ctx);

      expect(result).toBeNull();
    });
  });

  describe('with data parameter (key extraction)', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
    };

    it('should return user id when data is "id"', () => {
      const factory = getParamDecoratorFactory(CurrentUser('id'));
      const ctx = createMockExecutionContext(mockUser);
      const result = factory('id', ctx);

      expect(result).toBe('user-123');
    });

    it('should return user email when data is "email"', () => {
      const factory = getParamDecoratorFactory(CurrentUser('email'));
      const ctx = createMockExecutionContext(mockUser);
      const result = factory('email', ctx);

      expect(result).toBe('test@example.com');
    });

    it('should return user name when data is "name"', () => {
      const factory = getParamDecoratorFactory(CurrentUser('name'));
      const ctx = createMockExecutionContext(mockUser);
      const result = factory('name', ctx);

      expect(result).toBe('Test User');
    });

    it('should return user role when data is "role"', () => {
      const factory = getParamDecoratorFactory(CurrentUser('role'));
      const ctx = createMockExecutionContext(mockUser);
      const result = factory('role', ctx);

      expect(result).toBe('ADMIN');
    });
  });

  describe('edge cases', () => {
    it('should handle empty user object', () => {
      const factory = getParamDecoratorFactory(CurrentUser());
      const ctx = createMockExecutionContext({});
      const result = factory(undefined, ctx);

      expect(result).toEqual({});
    });

    it('should handle user with minimal properties', () => {
      const factory = getParamDecoratorFactory(CurrentUser('id'));
      const minimalUser = { id: 'user-1' };
      const ctx = createMockExecutionContext(minimalUser);
      const result = factory('id', ctx);

      expect(result).toBe('user-1');
    });

    it('should handle user property with null value', () => {
      const factory = getParamDecoratorFactory(CurrentUser('name'));
      const userWithNullProp = { id: 'user-1', name: null };
      const ctx = createMockExecutionContext(userWithNullProp);
      const result = factory('name', ctx);

      expect(result).toBeNull();
    });

    it('should handle user property with empty string', () => {
      const factory = getParamDecoratorFactory(CurrentUser('name'));
      const userWithEmptyProp = { id: 'user-1', name: '' };
      const ctx = createMockExecutionContext(userWithEmptyProp);
      const result = factory('name', ctx);

      expect(result).toBe('');
    });
  });
});
