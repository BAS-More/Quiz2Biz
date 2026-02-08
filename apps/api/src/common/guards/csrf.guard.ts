import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

export const CSRF_TOKEN_HEADER = 'x-csrf-token';
export const CSRF_TOKEN_COOKIE = 'csrf-token';
export const CSRF_SKIP_KEY = 'skipCsrf';

/**
 * Decorator to skip CSRF validation for specific routes
 * Use sparingly - only for webhooks or public endpoints
 */
export const SkipCsrf = () => {
  return (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(CSRF_SKIP_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(CSRF_SKIP_KEY, true, target);
    }
    return descriptor;
  };
};

/**
 * CSRF Guard implementing Double Submit Cookie pattern
 *
 * Protection mechanism:
 * 1. Server sets a CSRF token in a cookie (HttpOnly: false so JS can read it)
 * 2. Client must send the same token in the X-CSRF-Token header
 * 3. Guard validates that cookie value matches header value
 *
 * This works because:
 * - Attackers can trigger requests that include cookies automatically
 * - But they cannot read cookie values due to Same-Origin Policy
 * - So they cannot set the matching header value
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly csrfSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.csrfSecret = this.configService.get<string>(
      'CSRF_SECRET',
      'quiz2biz-csrf-secret-change-in-production',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(request.method)) {
      return true;
    }

    // Check for @SkipCsrf decorator
    const skipCsrf = this.reflector.get<boolean>(CSRF_SKIP_KEY, context.getHandler());
    if (skipCsrf) {
      this.logger.debug(`CSRF check skipped for ${request.method} ${request.path}`);
      return true;
    }

    // Get token from header and cookie
    const headerToken = request.headers[CSRF_TOKEN_HEADER] as string;
    const cookieToken = request.cookies?.[CSRF_TOKEN_COOKIE] as string;

    // Validate presence of both tokens
    if (!headerToken || !cookieToken) {
      this.logger.warn(
        `CSRF validation failed: Missing token - Header: ${!!headerToken}, Cookie: ${!!cookieToken}`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        message: 'CSRF token validation failed',
        error: 'Forbidden',
        code: 'CSRF_TOKEN_MISSING',
        hint: 'Include X-CSRF-Token header with the value from csrf-token cookie',
      });
    }

    // Validate tokens match (constant-time comparison to prevent timing attacks)
    // Check lengths first to avoid timingSafeEqual throwing on different lengths
    if (headerToken.length !== cookieToken.length) {
      this.logger.warn(`CSRF validation failed: Token length mismatch for ${request.path}`);
      throw new ForbiddenException({
        statusCode: 403,
        message: 'CSRF token validation failed',
        error: 'Forbidden',
        code: 'CSRF_TOKEN_MISMATCH',
      });
    }
    const tokensMatch = crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));

    if (!tokensMatch) {
      this.logger.warn(`CSRF validation failed: Token mismatch for ${request.path}`);
      throw new ForbiddenException({
        statusCode: 403,
        message: 'CSRF token validation failed',
        error: 'Forbidden',
        code: 'CSRF_TOKEN_MISMATCH',
      });
    }

    // Validate token format/integrity (optional but adds defense in depth)
    if (!this.validateTokenFormat(cookieToken)) {
      this.logger.warn(`CSRF validation failed: Invalid token format`);
      throw new ForbiddenException({
        statusCode: 403,
        message: 'CSRF token validation failed',
        error: 'Forbidden',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    return true;
  }

  /**
   * Generate a new CSRF token
   * Token format: base64(timestamp.randomBytes.hmac)
   */
  static generateToken(secret: string): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const data = `${timestamp}.${randomBytes}`;
    const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return Buffer.from(`${data}.${hmac}`).toString('base64');
  }

  /**
   * Validate token format and integrity
   */
  private validateTokenFormat(token: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parts = decoded.split('.');

      if (parts.length !== 3) {
        return false;
      }

      const [timestamp, randomBytes, providedHmac] = parts;

      // Verify HMAC
      const data = `${timestamp}.${randomBytes}`;
      const expectedHmac = crypto.createHmac('sha256', this.csrfSecret).update(data).digest('hex');

      // Constant-time comparison
      if (providedHmac.length !== expectedHmac.length) {
        return false;
      }

      return crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac));
    } catch (error) {
      return false;
    }
  }
}

/**
 * Service for generating CSRF tokens
 * Can be used in controllers to provide tokens to clients
 */
@Injectable()
export class CsrfService {
  private readonly csrfSecret: string;
  private readonly tokenMaxAge: number;

  constructor(private readonly configService: ConfigService) {
    this.csrfSecret = this.configService.get<string>(
      'CSRF_SECRET',
      'quiz2biz-csrf-secret-change-in-production',
    );
    // Token valid for 24 hours by default
    this.tokenMaxAge = this.configService.get<number>('CSRF_TOKEN_MAX_AGE', 86400000);
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(): string {
    return CsrfGuard.generateToken(this.csrfSecret);
  }

  /**
   * Get cookie options for CSRF token
   */
  getCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  } {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    return {
      httpOnly: false, // Must be false so JS can read the cookie
      secure: nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: this.tokenMaxAge,
      path: '/',
    };
  }
}
