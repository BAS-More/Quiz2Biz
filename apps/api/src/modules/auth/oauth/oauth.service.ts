import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@libs/database';
import { OAuth2Client } from 'google-auth-library';

/**
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'microsoft' | 'github';

/**
 * OAuth user profile from provider
 */
export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
}

/**
 * OAuth tokens response
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

/**
 * Auth response with JWT tokens
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  isNewUser: boolean;
}

/**
 * OAuthService - Handles OAuth authentication for multiple providers
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Initialize Google OAuth client
    this.googleClient = new OAuth2Client({
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    });
  }

  /**
   * Authenticate with Google OAuth
   */
  async authenticateWithGoogle(idToken: string): Promise<AuthResponse> {
    this.logger.log('Authenticating with Google');

    try {
      // Verify the Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const profile: OAuthProfile = {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email!,
        emailVerified: payload.email_verified || false,
        name: payload.name,
        givenName: payload.given_name,
        familyName: payload.family_name,
        picture: payload.picture,
        locale: payload.locale,
      };

      return this.handleOAuthLogin(profile);
    } catch (error) {
      this.logger.error('Google authentication failed', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  /**
   * Authenticate with Microsoft OAuth
   */
  async authenticateWithMicrosoft(accessToken: string): Promise<AuthResponse> {
    this.logger.log('Authenticating with Microsoft');

    try {
      // Fetch user profile from Microsoft Graph API
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch Microsoft profile');
      }

      const msProfile = (await response.json()) as {
        id: string;
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
        givenName?: string;
        surname?: string;
      };

      const profile: OAuthProfile = {
        provider: 'microsoft',
        providerId: msProfile.id,
        email: msProfile.mail || msProfile.userPrincipalName || '',
        emailVerified: true, // Microsoft verifies emails
        name: msProfile.displayName,
        givenName: msProfile.givenName,
        familyName: msProfile.surname,
      };

      return this.handleOAuthLogin(profile);
    } catch (error) {
      this.logger.error('Microsoft authentication failed', error);
      throw new UnauthorizedException('Microsoft authentication failed');
    }
  }

  /**
   * Handle OAuth login/registration flow
   */
  private async handleOAuthLogin(profile: OAuthProfile): Promise<AuthResponse> {
    // Check if OAuth account already exists
    const oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
      include: { user: true },
    });

    let user: any;
    let isNewUser = false;

    if (oauthAccount) {
      // Existing OAuth account - update profile info
      user = oauthAccount.user;

      await this.prisma.oAuthAccount.update({
        where: { id: oauthAccount.id },
        data: {
          accessToken: profile.picture, // Store picture URL
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Check if user with this email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Link OAuth account to existing user
        user = existingUser;

        await this.prisma.oAuthAccount.create({
          data: {
            provider: profile.provider,
            providerId: profile.providerId,
            userId: existingUser.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Create new user and OAuth account
        isNewUser = true;

        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name || profile.email.split('@')[0],
            emailVerified: profile.emailVerified,
            avatar: profile.picture,
            oauthAccounts: {
              create: {
                provider: profile.provider,
                providerId: profile.providerId,
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
                lastLoginAt: new Date(),
              },
            },
          },
        });
      }
    }

    // Generate JWT tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.avatar,
      },
      isNewUser,
    };
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(userId: string, profile: OAuthProfile): Promise<void> {
    // Check if this OAuth account is already linked to another user
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
    });

    if (existingAccount) {
      if (existingAccount.userId !== userId) {
        throw new ConflictException('This social account is already linked to another user');
      }
      return; // Already linked to this user
    }

    // Create new OAuth account link
    await this.prisma.oAuthAccount.create({
      data: {
        provider: profile.provider,
        providerId: profile.providerId,
        userId,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Unlink OAuth account from user
   */
  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
    // Check if user has other login methods
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { oauthAccounts: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const hasPassword = !!user.passwordHash;
    const oauthCount = user.oauthAccounts.length;

    if (!hasPassword && oauthCount <= 1) {
      throw new ConflictException(
        'Cannot unlink the only authentication method. Please set a password first.',
      );
    }

    await this.prisma.oAuthAccount.deleteMany({
      where: {
        userId,
        provider,
      },
    });
  }

  /**
   * Get linked OAuth accounts for user
   */
  async getLinkedAccounts(
    userId: string,
  ): Promise<{ provider: string; email: string; linkedAt: Date }[]> {
    const accounts = await this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: {
        provider: true,
        email: true,
        createdAt: true,
      },
    });

    return accounts.map((a) => ({
      provider: a.provider,
      email: a.email || '',
      linkedAt: a.createdAt,
    }));
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: { id: string; email: string; role?: string }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role || 'user',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('jwt.expiresIn', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
