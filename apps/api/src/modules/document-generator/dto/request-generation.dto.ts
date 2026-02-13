import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestGenerationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Session ID to generate document from',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Document type ID to generate',
  })
  @IsUUID()
  documentTypeId: string;

  @ApiPropertyOptional({
    example: 'DOCX',
    description: 'Output format (only DOCX supported)',
    default: 'DOCX',
  })
  @IsOptional()
  @IsEnum(['DOCX'])
  format?: 'DOCX' = 'DOCX';
}
