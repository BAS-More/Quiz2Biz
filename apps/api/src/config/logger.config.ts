import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';

/**
 * Build Pino logger configuration for NestJS.
 * JSON output in production; pino-pretty for local development.
 * Supports correlation IDs via X-Request-Id header.
 */
export function buildLoggerConfig(configService: ConfigService): Params {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const logLevel = configService.get<string>('LOG_LEVEL', nodeEnv === 'production' ? 'info' : 'debug');
  const isProduction = nodeEnv === 'production';

  return {
    pinoHttp: {
      level: logLevel,

      // Use X-Request-Id as correlation ID when present
      genReqId: (req) => {
        const existing = req.headers['x-request-id'];
        return (Array.isArray(existing) ? existing[0] : existing) ?? crypto.randomUUID();
      },

      // Redact sensitive fields from logs
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[REDACTED]',
      },

      // Serializers for structured output
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          query: req.query,
          remoteAddress: req.remoteAddress,
          requestId: req.id,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },

      // Pretty-print in development, JSON in production
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
    },
  };
}
