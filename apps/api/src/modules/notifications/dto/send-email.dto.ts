import { IsEmail, IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmailType {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  SESSION_REMINDER = 'session_reminder',
  DOCUMENTS_READY = 'documents_ready',
  DOCUMENTS_APPROVED = 'documents_approved',
  REVIEW_PENDING = 'review_pending',
  CUSTOM = 'custom',
}

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  to: string;

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ enum: EmailType, description: 'Type of email template to use' })
  @IsEnum(EmailType)
  type: EmailType;

  @ApiPropertyOptional({ description: 'Dynamic data to populate the template' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Plain text content (for custom emails)' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'HTML content (for custom emails)' })
  @IsOptional()
  @IsString()
  htmlContent?: string;
}

export class BulkSendEmailDto {
  @ApiProperty({ type: [SendEmailDto], description: 'Array of emails to send' })
  emails: SendEmailDto[];
}

export class EmailResponseDto {
  @ApiProperty({ description: 'Whether the email was sent successfully' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Message ID from email provider' })
  messageId?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiProperty({ description: 'Recipient email address' })
  to: string;

  @ApiProperty({ description: 'Timestamp when email was sent/attempted' })
  timestamp: Date;
}
