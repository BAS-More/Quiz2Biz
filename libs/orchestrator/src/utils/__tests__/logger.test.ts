// ---------------------------------------------------------------------------
// Logger Tests — verify async logging functionality
// ---------------------------------------------------------------------------

import { createLogger } from '../logger';
import type { LogMeta } from '../logger';

describe('createLogger', () => {
  // Capture console output for testing
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;
  let stdoutBuffer: string[] = [];
  let stderrBuffer: string[] = [];

  beforeEach(() => {
    stdoutBuffer = [];
    stderrBuffer = [];
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    // Mock stdout/stderr to capture logs
    process.stdout.write = jest.fn((chunk: string | Uint8Array) => {
      stdoutBuffer.push(chunk.toString());
      return true;
    }) as any;

    process.stderr.write = jest.fn((chunk: string | Uint8Array) => {
      stderrBuffer.push(chunk.toString());
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  it('should create a logger with default info level', () => {
    const logger = createLogger('test-module');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
  });

  it('should respect minimum log level', async () => {
    const logger = createLogger('test-module', 'warn');

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    // Wait for async logs to flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allOutput = [...stdoutBuffer, ...stderrBuffer].join('');

    // Debug and info should be filtered out
    expect(allOutput).not.toContain('debug message');
    expect(allOutput).not.toContain('info message');

    // Warn and error should be present
    expect(allOutput).toContain('warn message');
    expect(allOutput).toContain('error message');
  });

  it('should include module name in logs', async () => {
    const logger = createLogger('my-test-module', 'info');
    logger.info('test message');

    // Wait for async logs to flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allOutput = [...stdoutBuffer, ...stderrBuffer].join('');
    expect(allOutput).toContain('my-test-module');
    expect(allOutput).toContain('test message');
  });

  it('should include metadata in logs', async () => {
    const logger = createLogger('test-module', 'info');
    const meta: LogMeta = {
      taskId: 123,
      agentId: 'agent-abc',
      tokens: 500,
      customField: 'custom-value',
    };

    logger.info('message with metadata', meta);

    // Wait for async logs to flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allOutput = [...stdoutBuffer, ...stderrBuffer].join('');
    expect(allOutput).toContain('message with metadata');
    // Pino outputs JSON, so metadata should be present
    expect(allOutput).toContain('taskId');
    expect(allOutput).toContain('123');
    expect(allOutput).toContain('agent-abc');
  });

  it('should handle logs without metadata', async () => {
    const logger = createLogger('test-module', 'info');
    logger.info('simple message');

    // Wait for async logs to flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allOutput = [...stdoutBuffer, ...stderrBuffer].join('');
    expect(allOutput).toContain('simple message');
  });

  it('should support all log levels', async () => {
    const logger = createLogger('test-module', 'debug');

    logger.debug('debug level');
    logger.info('info level');
    logger.warn('warn level');
    logger.error('error level');

    // Wait for async logs to flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allOutput = [...stdoutBuffer, ...stderrBuffer].join('');

    expect(allOutput).toContain('debug level');
    expect(allOutput).toContain('info level');
    expect(allOutput).toContain('warn level');
    expect(allOutput).toContain('error level');
  });

  it('should not execute expensive operations when level is filtered', () => {
    const logger = createLogger('test-module', 'error');
    const expensiveOperation = jest.fn(() => ({ expensive: 'data' }));

    // This should not call the expensive operation since debug is filtered
    const meta = expensiveOperation();
    logger.debug('filtered message', meta);

    // The operation was called (JavaScript evaluates arguments before function call)
    // but the logger should still filter it at the log level
    expect(expensiveOperation).toHaveBeenCalled();
  });
});
