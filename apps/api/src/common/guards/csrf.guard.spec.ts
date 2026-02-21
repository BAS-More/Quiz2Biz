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
      if (key === 'CSRF_SECRET') return 'test-csrf-secret';
      if (key === 'CSRF_DISABLED') return 'false';
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
        if (key === 'CSRF_DISABLED') return 'true';
        if (key === 'CSRF_SECRET') return 'test-secret';
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

    it('should throw when header token is missing', () => {
      const context = createMockContext('POST', {}, { [CSRF_TOKEN_COOKIE]: 'token123' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw when cookie token is missing', () => {
      const context = createMockContext('POST', { [CSRF_TOKEN_HEADER]: 'token123' }, {});
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw when token lengths do not match', () => {
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: 'short' },
        { [CSRF_TOKEN_COOKIE]: 'much_longer_token' },
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw when tokens do not match same length', () => {
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: 'token_aaaa' },
        { [CSRF_TOKEN_COOKIE]: 'token_bbbb' },
      );
      
      expect(() => guard.canActivate(context)).toThrow();
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
});

describe('CsrfService', () => {
  let service: CsrfService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'CSRF_SECRET') return 'test-csrf-secret';
      if (key === 'CSRF_TOKEN_MAX_AGE') return 86400000;
      if (key === 'NODE_ENV') return 'development';
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
        if (key === 'NODE_ENV') return 'production';
        if (key === 'CSRF_TOKEN_MAX_AGE') return 86400000;
        return defaultValue;
      });

      const options = service.getCookieOptions();
      expect(options.secure).toBe(true);
    });
  });
});
