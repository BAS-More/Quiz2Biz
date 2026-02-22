/**
 * @fileoverview Tests for Logging Interceptor
 */
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  const createMockContext = (overrides: Partial<{
    method: string;
    url: string;
    ip: string;
    userAgent: string;
    requestId: string;
    statusCode: number;
  }> = {}): ExecutionContext => {
    const userAgent = overrides.userAgent !== undefined ? overrides.userAgent : 'jest-test';
    const mockRequest = {
      method: overrides.method || 'GET',
      url: overrides.url || '/api/test',
      ip: overrides.ip || '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'user-agent') {return userAgent;}
        return '';
      }),
      headers: {
        'x-request-id': overrides.requestId || 'test-request-id',
      },
    };

    const mockResponse = {
      statusCode: overrides.statusCode || 200,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (result: unknown, shouldError = false): CallHandler => ({
    handle: () => (shouldError
      ? throwError(() => new Error('Test error'))
      : of(result)) as any,
  });

  describe('intercept', () => {
    it('should log successful request', (done) => {
      const logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation();
      const context = createMockContext();
      const callHandler = createMockCallHandler({ data: 'success' });

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalled();
          const logCall = logSpy.mock.calls[0][0];
          const logData = JSON.parse(logCall);
          expect(logData.method).toBe('GET');
          expect(logData.url).toBe('/api/test');
          expect(logData.statusCode).toBe(200);
          done();
        },
      });
    });

    it('should log error request', (done) => {
      const errorSpy = jest.spyOn(interceptor['logger'], 'error').mockImplementation();
      const context = createMockContext();
      const callHandler = createMockCallHandler(null, true);

      interceptor.intercept(context, callHandler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalled();
          const logCall = errorSpy.mock.calls[0][0];
          const logData = JSON.parse(logCall);
          expect(logData.method).toBe('GET');
          expect(logData.url).toBe('/api/test');
          expect(logData.error).toBe('Test error');
          done();
        },
      });
    });

    it('should include request duration', (done) => {
      const logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation();
      const context = createMockContext();
      const callHandler = createMockCallHandler({ data: 'success' });

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = logSpy.mock.calls[0][0];
          const logData = JSON.parse(logCall);
          expect(logData.duration).toMatch(/\d+ms/);
          done();
        },
      });
    });

    it('should include request ID', (done) => {
      const logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation();
      const context = createMockContext({ requestId: 'unique-id-123' });
      const callHandler = createMockCallHandler({ data: 'success' });

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = logSpy.mock.calls[0][0];
          const logData = JSON.parse(logCall);
          expect(logData.requestId).toBe('unique-id-123');
          done();
        },
      });
    });

    it('should handle missing user-agent', (done) => {
      const logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation();
      const context = createMockContext({ userAgent: '' });
      const callHandler = createMockCallHandler({ data: 'success' });

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = logSpy.mock.calls[0][0];
          const logData = JSON.parse(logCall);
          expect(logData.userAgent).toBe('');
          done();
        },
      });
    });

    it('should log different HTTP methods', (done) => {
      const logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation();
      const context = createMockContext({ method: 'POST', url: '/api/users' });
      const callHandler = createMockCallHandler({ data: 'created' });

      interceptor.intercept(context, callHandler).subscribe({
        next: () => {
          const logCall = logSpy.mock.calls[0][0];
          const logData = JSON.parse(logCall);
          expect(logData.method).toBe('POST');
          expect(logData.url).toBe('/api/users');
          done();
        },
      });
    });
  });
});
