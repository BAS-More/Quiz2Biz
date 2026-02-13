import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = request.headers['x-request-id'] as string | undefined;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (): void => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            JSON.stringify({
              method,
              url,
              statusCode,
              duration: `${duration}ms`,
              ip,
              userAgent,
              requestId,
            }),
          );
        },
        error: (error: Error): void => {
          const duration = Date.now() - startTime;

          this.logger.error(
            JSON.stringify({
              method,
              url,
              error: error.message,
              duration: `${duration}ms`,
              ip,
              userAgent,
              requestId,
            }),
          );
        },
      }),
    );
  }
}
