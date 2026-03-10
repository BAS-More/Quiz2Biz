/**
 * MFA DTOs
 * Data transfer objects for MFA operations
 */

import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaCodeDto {
  @ApiProperty({
    description: 'TOTP code from authenticator app or backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{6,8}$/i, {
    message: 'Code must be 6 digits (TOTP) or 8 characters (backup code)',
  })
  code: string;
}

export class MfaSetupResponseDto {
  @ApiProperty({ description: 'Base32 encoded TOTP secret' })
  secret: string;

  @ApiProperty({ description: 'QR code as data URL for scanning' })
  qrCodeDataUrl: string;

  @ApiProperty({ description: 'Secret formatted for manual entry' })
  manualEntryKey: string;
}

export class BackupCodesResponseDto {
  @ApiProperty({
    description: 'List of single-use backup codes',
    type: [String],
    example: ['ABC12345', 'DEF67890'],
  })
  backupCodes: string[];
}

export class MfaStatusResponseDto {
  @ApiProperty({ description: 'Whether MFA is enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Number of remaining backup codes' })
  backupCodesCount: number;
}

export class MfaLoginRequiredDto {
  @ApiProperty({ description: 'Temporary token for MFA verification' })
  mfaToken: string;

  @ApiProperty({ description: 'Message indicating MFA is required' })
  message: string;
}
