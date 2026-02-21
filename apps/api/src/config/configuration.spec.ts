import configuration from './configuration';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('default values', () => {
    it('should return default port 3000', () => {
      delete process.env.PORT;
      const config = configuration();
      expect(config.port).toBe(3000);
    });

    it('should return default nodeEnv as development', () => {
      delete process.env.NODE_ENV;
      const config = configuration();
      expect(config.nodeEnv).toBe('development');
    });

    it('should return default apiPrefix', () => {
      delete process.env.API_PREFIX;
      const config = configuration();
      expect(config.apiPrefix).toBe('api/v1');
    });

    it('should return default redis host', () => {
      delete process.env.REDIS_HOST;
      const config = configuration();
      expect((config.redis as any).host).toBe('localhost');
    });

    it('should return default redis port', () => {
      delete process.env.REDIS_PORT;
      const config = configuration();
      expect((config.redis as any).port).toBe(6379);
    });

    it('should return default JWT expiry', () => {
      delete process.env.JWT_EXPIRES_IN;
      const config = configuration();
      expect((config.jwt as any).expiresIn).toBe('15m');
    });

    it('should return default refresh token expiry', () => {
      delete process.env.JWT_REFRESH_EXPIRES_IN;
      const config = configuration();
      expect((config.jwt as any).refreshExpiresIn).toBe('7d');
    });

    it('should return default bcrypt rounds', () => {
      delete process.env.BCRYPT_ROUNDS;
      const config = configuration();
      expect((config.bcrypt as any).rounds).toBe(12);
    });

    it('should return default throttle settings', () => {
      delete process.env.THROTTLE_TTL;
      delete process.env.THROTTLE_LIMIT;
      delete process.env.THROTTLE_LOGIN_LIMIT;
      const config = configuration();
      expect((config.throttle as any).ttl).toBe(60000);
      expect((config.throttle as any).limit).toBe(100);
      expect((config.throttle as any).loginLimit).toBe(5);
    });

    it('should return default CORS origin', () => {
      delete process.env.CORS_ORIGIN;
      const config = configuration();
      expect((config.cors as any).origin).toBe('*');
    });

    it('should return default log level', () => {
      delete process.env.LOG_LEVEL;
      const config = configuration();
      expect((config.logging as any).level).toBe('debug');
    });

    it('should return default email settings', () => {
      delete process.env.EMAIL_FROM;
      delete process.env.EMAIL_FROM_NAME;
      const config = configuration();
      expect((config.email as any).from).toBe('noreply@quiz2biz.com');
      expect((config.email as any).fromName).toBe('Quiz2Biz');
    });

    it('should return default Claude model', () => {
      delete process.env.CLAUDE_MODEL;
      const config = configuration();
      expect((config.claude as any).model).toBe('claude-sonnet-4-6');
    });

    it('should return default Claude max tokens', () => {
      delete process.env.CLAUDE_MAX_TOKENS;
      const config = configuration();
      expect((config.claude as any).maxTokens).toBe(4096);
    });

    it('should return default frontend URL', () => {
      delete process.env.FRONTEND_URL;
      const config = configuration();
      expect(config.frontendUrl).toBe('http://localhost:3001');
    });

    it('should return default token expiry settings', () => {
      delete process.env.VERIFICATION_TOKEN_EXPIRY;
      delete process.env.PASSWORD_RESET_TOKEN_EXPIRY;
      const config = configuration();
      expect((config.tokens as any).verificationExpiry).toBe('24h');
      expect((config.tokens as any).passwordResetExpiry).toBe('1h');
    });
  });

  describe('environment variable overrides', () => {
    it('should use PORT from environment', () => {
      process.env.PORT = '4000';
      const config = configuration();
      expect(config.port).toBe(4000);
    });

    it('should use NODE_ENV from environment', () => {
      process.env.NODE_ENV = 'production';
      const config = configuration();
      expect(config.nodeEnv).toBe('production');
    });

    it('should use DATABASE_URL from environment', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      const config = configuration();
      expect((config.database as any).url).toBe('postgresql://user:pass@localhost:5432/db');
    });

    it('should use REDIS_HOST from environment', () => {
      process.env.REDIS_HOST = 'redis.example.com';
      const config = configuration();
      expect((config.redis as any).host).toBe('redis.example.com');
    });

    it('should use REDIS_PORT from environment', () => {
      process.env.REDIS_PORT = '6380';
      const config = configuration();
      expect((config.redis as any).port).toBe(6380);
    });

    it('should use REDIS_PASSWORD from environment', () => {
      process.env.REDIS_PASSWORD = 'secretpassword';
      const config = configuration();
      expect((config.redis as any).password).toBe('secretpassword');
    });

    it('should use JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'my-super-secret';
      const config = configuration();
      expect((config.jwt as any).secret).toBe('my-super-secret');
    });

    it('should use JWT_REFRESH_SECRET from environment', () => {
      process.env.JWT_REFRESH_SECRET = 'my-refresh-secret';
      const config = configuration();
      expect((config.jwt as any).refreshSecret).toBe('my-refresh-secret');
    });

    it('should use BCRYPT_ROUNDS from environment', () => {
      process.env.BCRYPT_ROUNDS = '14';
      const config = configuration();
      expect((config.bcrypt as any).rounds).toBe(14);
    });

    it('should use THROTTLE settings from environment', () => {
      process.env.THROTTLE_TTL = '30000';
      process.env.THROTTLE_LIMIT = '50';
      process.env.THROTTLE_LOGIN_LIMIT = '3';
      const config = configuration();
      expect((config.throttle as any).ttl).toBe(30000);
      expect((config.throttle as any).limit).toBe(50);
      expect((config.throttle as any).loginLimit).toBe(3);
    });

    it('should use CORS_ORIGIN from environment', () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const config = configuration();
      expect((config.cors as any).origin).toBe('https://example.com');
    });

    it('should use BREVO_API_KEY from environment', () => {
      process.env.BREVO_API_KEY = 'brevo-key-123';
      const config = configuration();
      expect((config.email as any).brevoApiKey).toBe('brevo-key-123');
    });

    it('should use ANTHROPIC_API_KEY from environment', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-123';
      const config = configuration();
      expect((config.claude as any).apiKey).toBe('sk-ant-123');
    });

    it('should use FRONTEND_URL from environment', () => {
      process.env.FRONTEND_URL = 'https://app.quiz2biz.com';
      const config = configuration();
      expect(config.frontendUrl).toBe('https://app.quiz2biz.com');
    });
  });

  describe('type coercion', () => {
    it('should parse PORT as integer', () => {
      process.env.PORT = '3001';
      const config = configuration();
      expect(typeof config.port).toBe('number');
      expect(config.port).toBe(3001);
    });

    it('should parse REDIS_PORT as integer', () => {
      process.env.REDIS_PORT = '6380';
      const config = configuration();
      expect(typeof (config.redis as any).port).toBe('number');
    });

    it('should parse BCRYPT_ROUNDS as integer', () => {
      process.env.BCRYPT_ROUNDS = '15';
      const config = configuration();
      expect(typeof (config.bcrypt as any).rounds).toBe('number');
    });

    it('should parse CLAUDE_MAX_TOKENS as integer', () => {
      process.env.CLAUDE_MAX_TOKENS = '8192';
      const config = configuration();
      expect(typeof (config.claude as any).maxTokens).toBe('number');
      expect((config.claude as any).maxTokens).toBe(8192);
    });
  });
});
