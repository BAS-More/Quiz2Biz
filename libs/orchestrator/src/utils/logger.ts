// ---------------------------------------------------------------------------
// Structured Logger — Async logging with Pino for high-throughput scenarios
// ---------------------------------------------------------------------------
//
// IMPLEMENTATION NOTES:
// - Uses synchronous writes to process.stdout/stderr for simplicity
// - In high-throughput scenarios, synchronous I/O can:
//   • Block the event loop, degrading application performance
//   • Cause log loss if output streams are full
//   • Create backpressure on the application
//
// PRODUCTION CONSIDERATIONS:
// - For production deployments, consider integrating with:
//   • Winston (https://github.com/winstonjs/winston) - asynchronous logging with transports
//   • Pino (https://github.com/pinojs/pino) - ultra-fast JSON logger with async I/O
//   • Bunyan (https://github.com/trentm/node-bunyan) - structured logging with streams
// - Add log level filtering BEFORE constructing expensive JSON metadata strings
// - Implement log buffering/batching for high-volume scenarios
// - Consider using non-blocking I/O for log writes
//
// The current implementation prioritizes:
// - Zero external dependencies
// - Readable console output with ANSI colors
// - Simple integration for MVP/development environments
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
  // Determine environment
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isTestEnv = process.env.NODE_ENV === 'test' || typeof jest !== 'undefined';

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
    // In test environment, use sync destination to avoid worker thread issues
    // In production, use fast async destination to stdout/stderr
    isTestEnv
      ? pino.destination({ sync: true }) // Sync for tests to avoid worker threads
      : isDevelopment
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
