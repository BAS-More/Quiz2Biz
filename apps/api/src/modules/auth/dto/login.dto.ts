import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;

  // Populated by controller, not from request body
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  ip?: string;
}
