import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 *
 * Features:
 * - Respects @Public() decorator for public endpoints
 * - Logs authentication failures for debugging 401 issues
 * - Provides specific error messages for expired/invalid tokens
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: Error | null,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      // Get request details for debugging
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;
      const hasAuthHeader = !!authHeader;
      const tokenPreview = hasAuthHeader ? `${authHeader.substring(0, 20)}...` : 'none';

      // Log authentication failure with context
      this.logger.warn(
        `Auth failed: ${info?.name || 'NoUser'} | Path: ${request.method} ${request.path} | HasAuth: ${hasAuthHeader} | Token: ${tokenPreview}`,
      );

      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
