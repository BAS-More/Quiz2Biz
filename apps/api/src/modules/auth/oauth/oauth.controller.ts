import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OAuthService, OAuthProvider } from './oauth.service';

/**
 * DTOs for OAuth operations
 */
class GoogleAuthDto {
  idToken: string;
}

class MicrosoftAuthDto {
  accessToken: string;
}

class LinkAccountDto {
  provider: OAuthProvider;
  idToken?: string;
  accessToken?: string;
}

/**
 * OAuthController - Handles OAuth authentication endpoints
 *
 * Routes:
 * POST /auth/oauth/google - Authenticate with Google
 * POST /auth/oauth/microsoft - Authenticate with Microsoft
 * GET /auth/oauth/accounts - Get linked OAuth accounts (authenticated)
 * POST /auth/oauth/link - Link new OAuth account (authenticated)
 * DELETE /auth/oauth/unlink/:provider - Unlink OAuth account (authenticated)
 */
@Controller('auth/oauth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  /**
   * Authenticate with Google ID token
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.oauthService.authenticateWithGoogle(dto.idToken);
  }

  /**
   * Authenticate with Microsoft access token
   */
  @Post('microsoft')
  @HttpCode(HttpStatus.OK)
  async microsoftAuth(@Body() dto: MicrosoftAuthDto) {
    return this.oauthService.authenticateWithMicrosoft(dto.accessToken);
  }

  /**
   * Get linked OAuth accounts for authenticated user
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getLinkedAccounts(@Req() req: any) {
    return this.oauthService.getLinkedAccounts(req.user.sub);
  }

  /**
   * Link new OAuth account to authenticated user
   */
  @Post('link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkAccount(@Req() req: any, @Body() dto: LinkAccountDto) {
    // First verify the token with the provider
    let profile;

    if (dto.provider === 'google' && dto.idToken) {
      // Verify Google token and extract profile
      const result = await this.oauthService.authenticateWithGoogle(dto.idToken);
      profile = {
        provider: 'google' as OAuthProvider,
        providerId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        picture: result.user.picture,
        emailVerified: true,
      };
    } else if (dto.provider === 'microsoft' && dto.accessToken) {
      // Verify Microsoft token and extract profile
      const result = await this.oauthService.authenticateWithMicrosoft(dto.accessToken);
      profile = {
        provider: 'microsoft' as OAuthProvider,
        providerId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        picture: result.user.picture,
        emailVerified: true,
      };
    } else {
      throw new Error('Invalid provider or missing token');
    }

    // Link the account
    await this.oauthService.linkOAuthAccount(req.user.sub, profile);

    return { success: true, provider: dto.provider };
  }

  /**
   * Unlink OAuth account from authenticated user
   */
  @Delete('unlink/:provider')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkAccount(@Req() req: any, @Param('provider') provider: OAuthProvider) {
    await this.oauthService.unlinkOAuthAccount(req.user.sub, provider);
    return { success: true, provider };
  }
}
