// ---------------------------------------------------------------------------
// Logger Tests — verify logging API and structure
// ---------------------------------------------------------------------------

import { createLogger, LogMeta, ILogger } from '../logger';

describe('createLogger', () => {
  let logger: ILogger;

  beforeEach(() => {
    // Suppress actual log output during tests
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create a logger with default info level', () => {
    logger = createLogger('test-module');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should accept all valid log levels', () => {
    // Verify logger can be created with each valid level
    expect(() => createLogger('test', 'debug')).not.toThrow();
    expect(() => createLogger('test', 'info')).not.toThrow();
    expect(() => createLogger('test', 'warn')).not.toThrow();
    expect(() => createLogger('test', 'error')).not.toThrow();
  });

  it('should not throw when logging at each level', () => {
    logger = createLogger('test-module', 'debug');

    expect(() => logger.debug('debug message')).not.toThrow();
    expect(() => logger.info('info message')).not.toThrow();
    expect(() => logger.warn('warn message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
  });

  it('should accept metadata in log calls', () => {
    logger = createLogger('test-module', 'info');
    const meta: LogMeta = {
      taskId: 123,
      agentId: 'agent-abc',
      tokens: 500,
      customField: 'custom-value',
    };

    // All log methods should accept optional metadata
    expect(() => logger.info('message with metadata', meta)).not.toThrow();
    expect(() => logger.warn('warning with metadata', meta)).not.toThrow();
    expect(() => logger.error('error with metadata', meta)).not.toThrow();
    expect(() => logger.debug('debug with metadata', meta)).not.toThrow();
  });

  it('should handle logs without metadata', () => {
    logger = createLogger('test-module', 'info');

    // All log methods should work without metadata
    expect(() => logger.info('simple message')).not.toThrow();
    expect(() => logger.warn('simple warning')).not.toThrow();
    expect(() => logger.error('simple error')).not.toThrow();
    expect(() => logger.debug('simple debug')).not.toThrow();
  });

  it('should handle empty module name', () => {
    expect(() => createLogger('')).not.toThrow();
    const emptyLogger = createLogger('');
    expect(() => emptyLogger.info('test')).not.toThrow();
  });

  it('should handle complex metadata objects', () => {
    logger = createLogger('test-module', 'info');
    const complexMeta: LogMeta = {
      nested: { deep: { value: 'nested-value' } },
      array: [1, 2, 3],
      date: new Date().toISOString(),
      unicode: '日本語テスト',
    };

    expect(() => logger.info('complex metadata test', complexMeta)).not.toThrow();
  });

  it('should handle special characters in messages', () => {
    logger = createLogger('test-module', 'info');

    expect(() => logger.info('Message with "quotes" and \'apostrophes\'')).not.toThrow();
    expect(() => logger.info('Message with\nnewlines\tand\ttabs')).not.toThrow();
    expect(() => logger.info('Message with émojis 🎉 and üñicode')).not.toThrow();
  });

  it('should be idempotent - multiple loggers can coexist', () => {
    const logger1 = createLogger('module-1', 'info');
    const logger2 = createLogger('module-2', 'debug');
    const logger3 = createLogger('module-3', 'error');

    // All loggers should function independently
    expect(() => {
      logger1.info('logger1 message');
      logger2.debug('logger2 message');
      logger3.error('logger3 message');
    }).not.toThrow();
  });
});
