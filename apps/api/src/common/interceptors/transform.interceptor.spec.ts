import { TransformInterceptor, ApiResponse } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockRequest = {
      headers: {
        'x-request-id': 'test-request-id-123',
      },
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  });

  describe('intercept', () => {
    it('should transform response data to ApiResponse format', (done) => {
      const testData = { id: 1, name: 'Test' };
      mockCallHandler = {
        handle: () => of(testData) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result: ApiResponse<typeof testData>) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(testData);
          expect(result.meta).toBeDefined();
          expect(result.meta?.timestamp).toBeDefined();
          expect(result.meta?.requestId).toBe('test-request-id-123');
          done();
        },
      });
    });

    it('should include valid ISO timestamp in meta', (done) => {
      mockCallHandler = {
        handle: () => of({ test: true }) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          const timestamp = result.meta?.timestamp;
          expect(timestamp).toBeDefined();
          expect(new Date(timestamp!).toISOString()).toBe(timestamp);
          done();
        },
      });
    });

    it('should handle undefined request-id header', (done) => {
      mockRequest.headers = {};
      mockCallHandler = {
        handle: () => of({ test: true }) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.meta?.requestId).toBeUndefined();
          done();
        },
      });
    });

    it('should handle array data', (done) => {
      const testData = [{ id: 1 }, { id: 2 }];
      mockCallHandler = {
        handle: () => of(testData) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(testData);
          expect(Array.isArray(result.data)).toBe(true);
          done();
        },
      });
    });

    it('should handle null data', (done) => {
      mockCallHandler = {
        handle: () => of(null) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBeNull();
          done();
        },
      });
    });

    it('should handle primitive data types', (done) => {
      mockCallHandler = {
        handle: () => of('string data') as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe('string data');
          done();
        },
      });
    });

    it('should handle number data', (done) => {
      mockCallHandler = {
        handle: () => of(42) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe(42);
          done();
        },
      });
    });

    it('should handle boolean data', (done) => {
      mockCallHandler = {
        handle: () => of(true) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe(true);
          done();
        },
      });
    });

    it('should handle nested objects', (done) => {
      const nestedData = {
        user: {
          profile: {
            settings: {
              theme: 'dark',
            },
          },
        },
      };
      mockCallHandler = {
        handle: () => of(nestedData) as any,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(nestedData);
          done();
        },
      });
    });
  });
});
