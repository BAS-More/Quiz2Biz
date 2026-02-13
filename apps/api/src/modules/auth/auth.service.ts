import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import { NotificationService } from '../notifications/notification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token.dto';
import { User, UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number;
  private readonly jwtRefreshSecret: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly refreshTokenTtlSeconds: number;
  private readonly verificationTokenExpiry: number;
  private readonly passwordResetTokenExpiry: number;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
  ) {
    this.bcryptRounds = this.configService.get<number>('bcrypt.rounds', 12);
    this.jwtRefreshSecret = this.configService.get<string>('jwt.refreshSecret', 'refresh-secret');
    this.jwtRefreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    this.refreshTokenTtlSeconds = this.parseExpiresInToSeconds(this.jwtRefreshExpiresIn);
    this.verificationTokenExpiry = this.parseExpiresInToSeconds(
      this.configService.get<string>('tokens.verificationExpiry', '24h'),
    );
    this.passwordResetTokenExpiry = this.parseExpiresInToSeconds(
      this.configService.get<string>('tokens.passwordResetExpiry', '1h'),
    );
    this.frontendUrl = this.configService.get<string>('frontendUrl', 'http://localhost:3001');
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    // Create user (emailVerified = false by default)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: UserRole.CLIENT,
        emailVerified: false,
        profile: {
          name: dto.name,
        },
      },
    });

    this.logger.log(`User registered: ${user.id}`);

    // Generate and send verification email (non-blocking - user can request new email later)
    try {
      await this.sendVerificationEmail(user.id, user.email, dto.name);
    } catch (error) {
      this.logger.error(`Failed to send verification email for user ${user.id}:`, error);
      // Don't throw - registration succeeded, user can request new verification email
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: dto.ip,
      },
    });

    this.logger.log(`User logged in: ${user.id}`);

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // Verify refresh token exists in Redis
    const storedUserId = await this.redisService.get(`refresh:${refreshToken}`);

    if (!storedUserId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: storedUserId },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new access token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 900, // 15 minutes
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Remove refresh token from Redis
    await this.redisService.del(`refresh:${refreshToken}`);
    this.logger.log('User logged out');
  }

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        profile: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    const profile = user.profile as Record<string, unknown> | null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: (profile?.name as string) || undefined,
    };
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    // Store refresh token in Redis
    await this.redisService.set(`refresh:${refreshToken}`, user.id, this.refreshTokenTtlSeconds);

    // Also store in database for audit
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + this.refreshTokenTtlSeconds * 1000),
      },
    });

    const profile = user.profile as Record<string, unknown> | null;

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: (profile?.name as string) || undefined,
      },
    };
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const failedAttempts = user.failedLoginAttempts + 1;
    const maxAttempts = 5;
    const lockDurationMinutes = 15;

    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: failedAttempts,
    };

    // Lock account after max attempts
    if (failedAttempts >= maxAttempts) {
      updateData.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
      this.logger.warn(`Account locked due to failed login attempts: ${user.id}`);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });
  }

  private parseExpiresInToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60; // Default: 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }

  // ============ EMAIL VERIFICATION METHODS ============

  /**
   * Sends a verification email to the user
   */
  private async sendVerificationEmail(userId: string, email: string, name?: string): Promise<void> {
    const token = this.generateSecureToken();

    // Store token in Redis with expiry
    await this.redisService.set(`verify:${token}`, userId, this.verificationTokenExpiry);

    const userName = name || email.split('@')[0];

    try {
      await this.notificationService.sendVerificationEmail(email, userName, token);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      // Don't throw - user is still registered, they can request a new verification email
    }
  }

  /**
   * Verifies the user's email with the provided token
   */
  async verifyEmail(token: string): Promise<{ message: string; verified: boolean }> {
    const userId = await this.redisService.get(`verify:${token}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      // Already verified, just remove the token
      await this.redisService.del(`verify:${token}`);
      return { message: 'Email already verified', verified: true };
    }

    // Update user's email verification status
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Remove the token
    await this.redisService.del(`verify:${token}`);

    this.logger.log(`Email verified for user: ${userId}`);

    // Send welcome email (fire-and-forget)
    const userName = user.name || user.email.split('@')[0];
    this.notificationService.sendWelcomeEmail(user.email, userName).catch((err) => {
      this.logger.warn(`Failed to send welcome email to ${user.email}`, err);
    });

    return { message: 'Email verified successfully', verified: true };
  }

  /**
   * Resends a verification email to the user
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If your email is registered, you will receive a verification link' };
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    const profile = user.profile as Record<string, unknown> | null;
    const userName = (profile?.name as string) || email.split('@')[0];

    await this.sendVerificationEmail(user.id, user.email, userName);

    return { message: 'If your email is registered, you will receive a verification link' };
  }

  // ============ PASSWORD RESET METHODS ============

  /**
   * Initiates password reset flow by sending reset email
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success message to prevent email enumeration
    const successMessage = 'If your email is registered, you will receive a password reset link';

    if (!user) {
      return { message: successMessage };
    }

    const token = this.generateSecureToken();

    // Store token in Redis with expiry
    await this.redisService.set(`reset:${token}`, user.id, this.passwordResetTokenExpiry);

    const profile = user.profile as Record<string, unknown> | null;
    const userName = (profile?.name as string) || email.split('@')[0];

    try {
      await this.notificationService.sendPasswordResetEmail(user.email, userName, token);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
    }

    return { message: successMessage };
  }

  /**
   * Resets the user's password with the provided token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const userId = await this.redisService.get(`reset:${token}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Validate password strength (minimum 12 characters)
    if (newPassword.length < 12) {
      throw new BadRequestException('Password must be at least 12 characters long');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

    // Update password and reset failed login attempts
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Remove the reset token
    await this.redisService.del(`reset:${token}`);

    // Invalidate all existing refresh tokens for this user
    await this.invalidateAllUserRefreshTokens(userId);

    this.logger.log(`Password reset for user: ${userId}`);

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Invalidates all refresh tokens for a user (used after password reset)
   */
  private async invalidateAllUserRefreshTokens(userId: string): Promise<void> {
    // Get all refresh tokens for the user
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
      },
    });

    // Remove from Redis and mark as revoked in DB
    for (const tokenRecord of tokens) {
      await this.redisService.del(`refresh:${tokenRecord.token}`);
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Invalidated all refresh tokens for user: ${userId}`);
  }

  /**
   * Generates a cryptographically secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
