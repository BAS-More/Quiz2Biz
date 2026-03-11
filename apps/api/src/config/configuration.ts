/**
 * Fail-fast validation for production environment.
 * Ensures critical secrets are set and strong enough.
 */
function validateProductionEnvironment(): void {
  const required: Record<string, string | undefined> = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables in production: ${missing.join(', ')}`,
    );
  }

  validateJwtSecrets();

  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
    throw new Error(
      'FATAL: CORS_ORIGIN must be set to an explicit allowlist in production (not "*")',
    );
  }
}

/**
 * Validate JWT secrets are strong enough for production use.
 */
function validateJwtSecrets(): void {
  const jwtSecret = process.env.JWT_SECRET || '';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';
  if (jwtSecret.includes('change-in-production') || jwtSecret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET must be a strong random value (>=32 chars) in production',
    );
  }
  if (jwtRefreshSecret.includes('change-in-production') || jwtRefreshSecret.length < 32) {
    throw new Error(
      'FATAL: JWT_REFRESH_SECRET must be a strong random value (>=32 chars) in production',
    );
  }
}

function buildRedisConfig(): Record<string, unknown> {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

function buildJwtConfig(): Record<string, unknown> {
  return {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
}

function buildThrottleConfig(): Record<string, unknown> {
  return {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    loginLimit: parseInt(process.env.THROTTLE_LOGIN_LIMIT || '5', 10),
  };
}

function buildEmailConfig(): Record<string, unknown> {
  return {
    brevoApiKey: process.env.BREVO_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@quiz2biz.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Quiz2Biz',
  };
}

function buildClaudeConfig(): Record<string, unknown> {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10),
  };
}

export default (): Record<string, unknown> => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    validateProductionEnvironment();
  }

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    database: { url: process.env.DATABASE_URL },
    redis: buildRedisConfig(),
    jwt: buildJwtConfig(),
    bcrypt: { rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10) },
    throttle: buildThrottleConfig(),
    cors: { origin: process.env.CORS_ORIGIN || '*' },
    logging: { level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug') },
    email: buildEmailConfig(),
    claude: buildClaudeConfig(),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    tokens: {
      verificationExpiry: process.env.VERIFICATION_TOKEN_EXPIRY || '24h',
      passwordResetExpiry: process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1h',
    },
  };
};
