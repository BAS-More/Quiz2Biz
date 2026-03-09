/**
 * MFA Controller
 * Handles MFA setup, verification, and management endpoints
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { MfaService } from './mfa.service';
import {
  VerifyMfaCodeDto,
  MfaSetupResponseDto,
  BackupCodesResponseDto,
  MfaStatusResponseDto,
} from './mfa.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MFA status for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA status retrieved',
    type: MfaStatusResponseDto,
  })
  async getMfaStatus(@CurrentUser() user: AuthenticatedUser): Promise<MfaStatusResponseDto> {
    return this.mfaService.getMfaStatus(user.id);
  }

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate MFA setup, returns QR code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA setup initiated',
    type: MfaSetupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'MFA already enabled',
  })
  async setupMfa(@CurrentUser() user: AuthenticatedUser): Promise<MfaSetupResponseDto> {
    return this.mfaService.generateMfaSetup(user.id, user.email);
  }

  @Post('verify-setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify MFA setup with TOTP code and enable MFA' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA enabled, returns backup codes',
    type: BackupCodesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid verification code or MFA not initiated',
  })
  async verifyMfaSetup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyMfaCodeDto,
  ): Promise<BackupCodesResponseDto> {
    return this.mfaService.verifyAndEnableMfa(user.id, dto.code);
  }

  @Delete('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MFA disabled',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Invalid verification code',
  })
  async disableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyMfaCodeDto,
  ): Promise<{ message: string }> {
    await this.mfaService.disableMfa(user.id, dto.code);
    return { message: 'MFA has been disabled' };
  }

  @Post('backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New backup codes generated',
    type: BackupCodesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Invalid verification code',
  })
  async regenerateBackupCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyMfaCodeDto,
  ): Promise<BackupCodesResponseDto> {
    return this.mfaService.regenerateBackupCodes(user.id, dto.code);
  }
}
