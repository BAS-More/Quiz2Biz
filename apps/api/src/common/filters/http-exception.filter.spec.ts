import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'GET',
      url: '/test',
      headers: {
        'x-request-id': 'test-request-123',
      },
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Not found',
            requestId: 'test-request-123',
          }),
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Validation failed', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'Bad Request',
            message: 'Validation failed',
          }),
        }),
      );
    });

    it('should handle HttpException with array message (validation errors)', () => {
      const exception = new HttpException(
        { message: ['field1 is required', 'field2 must be number'], error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            details: ['field1 is required', 'field2 must be number'],
          }),
        }),
      );
    });

    it('should handle generic Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          }),
        }),
      );
    });

    it('should handle unknown error types', () => {
      const exception = 'string error';

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNKNOWN_ERROR',
            message: 'Unknown error occurred',
          }),
        }),
      );
    });

    it('should include timestamp in error response', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should handle missing x-request-id header', () => {
      mockRequest.headers = {};
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: undefined,
          }),
        }),
      );
    });

    it('should map status codes to correct error codes', () => {
      const statusCodes = [
        { status: HttpStatus.BAD_REQUEST, code: 'BAD_REQUEST' },
        { status: HttpStatus.UNAUTHORIZED, code: 'UNAUTHORIZED' },
        { status: HttpStatus.FORBIDDEN, code: 'FORBIDDEN' },
        { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND' },
        { status: HttpStatus.CONFLICT, code: 'CONFLICT' },
        { status: HttpStatus.TOO_MANY_REQUESTS, code: 'RATE_LIMITED' },
        { status: HttpStatus.SERVICE_UNAVAILABLE, code: 'SERVICE_UNAVAILABLE' },
      ];

      statusCodes.forEach(({ status, code }) => {
        const exception = new HttpException('Test', status);
        filter.catch(exception, mockHost);
        
        expect(mockResponse.json).toHaveBeenLastCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code }),
          }),
        );
      });
    });

    it('should handle null exception response', () => {
      const exception = new HttpException(null as any, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });
});
