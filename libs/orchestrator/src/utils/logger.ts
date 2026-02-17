// ---------------------------------------------------------------------------
// Structured Logger — debug/info/warn/error levels, module-scoped
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

import type { LogLevel } from '../config/interfaces';

/** Numeric severity for level comparison. */
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** ANSI colour codes for terminal output. */
const COLOURS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

/** ANSI reset code. */
const RESET = '\x1b[0m';

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
 * Create a module-scoped logger.
 *
 * @param module - Module name shown in log prefix (e.g. "coordinator", "tier1").
 * @param minLevel - Minimum severity to output. Defaults to 'info'.
 * @returns A structured logger instance.
 */
export function createLogger(module: string, minLevel: LogLevel = 'info'): ILogger {
  const minSeverity = LEVEL_ORDER[minLevel];

  function log(level: LogLevel, message: string, meta?: LogMeta): void {
    if (LEVEL_ORDER[level] < minSeverity) return;

    const timestamp = new Date().toISOString();
    const colour = COLOURS[level];
    const prefix = `${colour}[${timestamp}] [${level.toUpperCase()}] [${module}]${RESET}`;
    const metaStr = meta && Object.keys(meta).length > 0
      ? ` ${JSON.stringify(meta)}`
      : '';

    const output = `${prefix} ${message}${metaStr}`;

    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  return {
    debug: (message: string, meta?: LogMeta) => log('debug', message, meta),
    info: (message: string, meta?: LogMeta) => log('info', message, meta),
    warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
    error: (message: string, meta?: LogMeta) => log('error', message, meta),
  };
}
