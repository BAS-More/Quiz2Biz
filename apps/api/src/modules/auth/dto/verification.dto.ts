import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ description: 'Email address to send reset link' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 12 })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  newPassword: string;
}

export class ResendVerificationDto {
  @ApiProperty({ description: 'Email address to resend verification' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
