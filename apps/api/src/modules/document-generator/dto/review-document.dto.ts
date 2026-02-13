import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectDocumentDto {
  @ApiProperty({
    example: 'Document contains inaccurate financial projections',
    description: 'Reason for rejecting the document',
  })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class ApproveDocumentDto {
  @ApiPropertyOptional({
    example: 'Reviewed and approved',
    description: 'Optional notes about the approval',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
