// ---------------------------------------------------------------------------
// Structured Logger — Async logging with Pino for high-throughput scenarios
// ---------------------------------------------------------------------------

import pino from 'pino';
import type { LogLevel } from '../config/interfaces';

/** Map LogLevel to Pino's log levels. */
const PINO_LEVEL_MAP: Record<LogLevel, string> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

/** Optional structured metadata attached to a log entry. */
export interface LogMeta {
  /** Task ID if logging within a task context. */
  taskId?: number;
  /** Agent ID if logging within an agent context. */
  agentId?: string;
  /** Tokens consumed so far. */
  tokens?: number;
  /** Arbitrary additional key-value pairs. */
  [key: string]: unknown;
}

/** A module-scoped structured logger instance. */
export interface ILogger {
  /** Log at debug level. */
  debug(message: string, meta?: LogMeta): void;
  /** Log at info level. */
  info(message: string, meta?: LogMeta): void;
  /** Log at warn level. */
  warn(message: string, meta?: LogMeta): void;
  /** Log at error level. */
  error(message: string, meta?: LogMeta): void;
}

/**
 * Create a module-scoped logger using Pino for async, non-blocking I/O.
 *
 * Benefits:
 * - Async I/O prevents blocking the event loop in high-throughput scenarios
 * - Built-in buffering and batching for optimal performance
 * - Structured logging with JSON output
 * - Configurable transports and log levels
 *
 * @param module - Module name shown in log context (e.g. "coordinator", "tier1").
 * @param minLevel - Minimum severity to output. Defaults to 'info'.
 * @returns A structured logger instance.
 */
export function createLogger(module: string, minLevel: LogLevel = 'info'): ILogger {
  // Determine if we should use pretty printing based on environment
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Create Pino instance with async destination and module context
  const logger = pino(
    {
      level: PINO_LEVEL_MAP[minLevel],
      // Base context that will be included in every log
      base: {
        module,
        pid: process.pid,
      },
      // Timestamp in ISO format
      timestamp: pino.stdTimeFunctions.isoTime,
      // Redact sensitive fields if present
      redact: {
        paths: ['password', 'apiKey', 'token', 'secret', 'authorization'],
        remove: true,
      },
    },
    // Use pino-pretty in development for colored, human-readable output
    // In production, use fast async destination to stdout/stderr
    isDevelopment
      ? pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
            messageFormat: '[{module}] {msg}',
          },
        })
      : pino.destination({ sync: false }), // Async destination for production
  );

  // Helper to filter metadata before logging to avoid expensive JSON operations
  const shouldLog = (level: LogLevel): boolean => {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minIdx = levels.indexOf(minLevel);
    const currentIdx = levels.indexOf(level);
    return currentIdx >= minIdx;
  };

  return {
    debug: (message: string, meta?: LogMeta): void => {
      // Early return before any expensive operations
      if (!shouldLog('debug')) {return;}
      logger.debug(meta || {}, message);
    },

    info: (message: string, meta?: LogMeta): void => {
      if (!shouldLog('info')) {return;}
      logger.info(meta || {}, message);
    },

    warn: (message: string, meta?: LogMeta): void => {
      if (!shouldLog('warn')) {return;}
      logger.warn(meta || {}, message);
    },

    error: (message: string, meta?: LogMeta): void => {
      if (!shouldLog('error')) {return;}
      logger.error(meta || {}, message);
    },
  };
}
