import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  CsrfGuard,
  CsrfService,
  CSRF_TOKEN_HEADER,
  CSRF_TOKEN_COOKIE,
  CSRF_SKIP_KEY,
} from './csrf.guard';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let configService: jest.Mocked<ConfigService>;
  let reflector: jest.Mocked<Reflector>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
      if (key === 'CSRF_DISABLED') {return 'false';}
      return defaultValue;
    }),
  };

  const mockReflector = {
    get: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfGuard,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<CsrfGuard>(CsrfGuard);
    configService = module.get(ConfigService);
    reflector = module.get(Reflector);
  });

  const createMockContext = (
    method: string,
    headers: Record<string, string> = {},
    cookies: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method,
          path: '/test',
          headers,
          cookies,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow safe methods without CSRF token', () => {
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

      safeMethods.forEach((method) => {
        const context = createMockContext(method);
        expect(guard.canActivate(context)).toBe(true);
      });
    });

    it('should allow POST when CSRF is disabled via environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CSRF_DISABLED') {return 'true';}
        if (key === 'CSRF_SECRET') {return 'test-secret';}
        return undefined;
      });

      const context = createMockContext('POST');
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow when @SkipCsrf decorator is present', () => {
      mockReflector.get.mockReturnValue(true);
      const context = createMockContext('POST');
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when header token is missing', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      const validToken = CsrfGuard.generateToken('test-csrf-secret');
      const context = createMockContext('POST', {}, { [CSRF_TOKEN_COOKIE]: validToken });
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when cookie token is missing', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      const validToken = CsrfGuard.generateToken('test-csrf-secret');
      const context = createMockContext('POST', { [CSRF_TOKEN_HEADER]: validToken }, {});
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when token lengths do not match', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: 'short' },
        { [CSRF_TOKEN_COOKIE]: 'much_longer_token' },
      );
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when tokens do not match (same length)', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: 'aaaaaaaaaa' },
        { [CSRF_TOKEN_COOKIE]: 'bbbbbbbbbb' },
      );
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for invalid token format', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      // Invalid token - not proper base64 with valid HMAC
      const invalidToken = Buffer.from('invalid.format').toString('base64');
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: invalidToken },
        { [CSRF_TOKEN_COOKIE]: invalidToken },
      );
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for token with wrong HMAC', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      // Token generated with different secret
      const wrongSecretToken = CsrfGuard.generateToken('wrong-secret');
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: wrongSecretToken },
        { [CSRF_TOKEN_COOKIE]: wrongSecretToken },
      );
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw for DELETE method without valid CSRF', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      const context = createMockContext('DELETE', {}, {});
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw for PUT method without valid CSRF', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      const context = createMockContext('PUT', {}, {});
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw for PATCH method without valid CSRF', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);
      
      const context = createMockContext('PATCH', {}, {});
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should validate correctly formatted matching tokens', () => {
      const validToken = CsrfGuard.generateToken('test-csrf-secret');
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: validToken },
        { [CSRF_TOKEN_COOKIE]: validToken },
      );
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should generate base64 encoded token', () => {
      const token = CsrfGuard.generateToken('test-secret');
      expect(Buffer.from(token, 'base64').toString('base64')).toBe(token);
    });

    it('should generate unique tokens each time', () => {
      const token1 = CsrfGuard.generateToken('test-secret');
      const token2 = CsrfGuard.generateToken('test-secret');
      expect(token1).not.toBe(token2);
    });

    it('should include timestamp.random.hmac format', () => {
      const token = CsrfGuard.generateToken('test-secret');
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parts = decoded.split('.');
      expect(parts.length).toBe(3);
    });
  });

  describe('canActivate - additional edge cases', () => {
    it('should handle CSRF_DISABLED with mixed case "TRUE"', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CSRF_DISABLED') {return 'TRUE';}
        if (key === 'CSRF_SECRET') {return 'test-secret';}
        return undefined;
      });

      const context = createMockContext('POST');
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should not disable CSRF when CSRF_DISABLED is "false"', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_DISABLED') {return 'false';}
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);

      const context = createMockContext('POST', {}, {});
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle token with null cookies gracefully', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);

      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            path: '/test',
            headers: { [CSRF_TOKEN_HEADER]: 'some-token' },
            cookies: undefined,
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject token with HMAC length mismatch (truncated HMAC)', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);

      // Create a 3-part token but with a short HMAC
      const fakeToken = Buffer.from('12345.abcdef.shrt').toString('base64');
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: fakeToken },
        { [CSRF_TOKEN_COOKIE]: fakeToken },
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle malformed base64 that throws during validation', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
        if (key === 'CSRF_DISABLED') {return 'false';}
        return defaultValue;
      });
      mockReflector.get.mockReturnValue(false);

      // Use a string with null bytes that could cause issues in crypto operations
      const problematicToken = Buffer.from('a.b.\x00\x00').toString('base64');
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: problematicToken },
        { [CSRF_TOKEN_COOKIE]: problematicToken },
      );

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

describe('SkipCsrf decorator', () => {
  it('should set metadata on method descriptor', () => {
    const { SkipCsrf } = require('./csrf.guard');

    class TestController {
      @SkipCsrf()
      someMethod() {}
    }

    const instance = new TestController();
    const metadata = Reflect.getMetadata(CSRF_SKIP_KEY, instance.someMethod);
    expect(metadata).toBe(true);
  });

  it('should set metadata on class target when no descriptor', () => {
    const { SkipCsrf } = require('./csrf.guard');

    @SkipCsrf()
    class TestClass {}

    const metadata = Reflect.getMetadata(CSRF_SKIP_KEY, TestClass);
    expect(metadata).toBe(true);
  });
});

describe('CsrfService', () => {
  let service: CsrfService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'CSRF_SECRET') {return 'test-csrf-secret';}
      if (key === 'CSRF_TOKEN_MAX_AGE') {return 86400000;}
      if (key === 'NODE_ENV') {return 'development';}
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CsrfService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<CsrfService>(CsrfService);
    configService = module.get(ConfigService);
  });

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const token = service.generateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('getCookieOptions', () => {
    it('should return correct options for development', () => {
      const options = service.getCookieOptions();

      expect(options.httpOnly).toBe(false);
      expect(options.secure).toBe(false);
      expect(options.sameSite).toBe('strict');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(86400000);
    });

    it('should return secure option in production', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') {return 'production';}
        if (key === 'CSRF_TOKEN_MAX_AGE') {return 86400000;}
        return defaultValue;
      });

      const options = service.getCookieOptions();
      expect(options.secure).toBe(true);
    });
  });
});
