import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTOs for Deliverables Pack Compiler
 * Implements Quiz2Biz document generation requirements
 */

export class CompileDeliverablesDto {
  @ApiProperty({ description: 'Session ID to compile deliverables for' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Include decision log in pack', default: true })
  @IsOptional()
  @IsBoolean()
  includeDecisionLog?: boolean;

  @ApiPropertyOptional({ description: 'Include readiness report in pack', default: true })
  @IsOptional()
  @IsBoolean()
  includeReadinessReport?: boolean;

  @ApiPropertyOptional({ description: 'Include policy/standard/procedure pack', default: true })
  @IsOptional()
  @IsBoolean()
  includePolicyPack?: boolean;

  @ApiPropertyOptional({
    description: 'Enable auto-sectioning (≤1000 words per section)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoSection?: boolean;

  @ApiPropertyOptional({ description: 'Maximum words per section (100-2000)', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(2000)
  @Type(() => Number)
  maxWordsPerSection?: number;
}

export class DocumentSectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  wordCount: number;

  @ApiPropertyOptional({ type: () => [DocumentSectionDto] })
  subSections?: DocumentSectionDto[];

  @ApiProperty()
  order: number;
}

export class CompiledDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({
    enum: [
      'ARCHITECTURE',
      'SDLC',
      'TESTING',
      'DEVSECOPS',
      'PRIVACY',
      'OBSERVABILITY',
      'FINANCE',
      'GOVERNANCE',
      'READINESS',
    ],
  })
  category: string;

  @ApiProperty({ type: [DocumentSectionDto] })
  sections: DocumentSectionDto[];

  @ApiProperty()
  wordCount: number;

  @ApiProperty()
  subSectionCount: number;

  @ApiProperty()
  generatedAt: Date;
}

export class PackSummaryDto {
  @ApiProperty()
  totalDocuments: number;

  @ApiProperty()
  totalSections: number;

  @ApiProperty()
  totalWordCount: number;

  @ApiProperty({ description: 'Document count per category' })
  categories: Record<string, number>;

  @ApiProperty({ description: 'Overall completeness score (0-100)' })
  completenessScore: number;
}

export class PackMetadataDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  questionnaireVersion: number;

  @ApiPropertyOptional()
  industry?: string;

  @ApiProperty()
  readinessScore: number;

  @ApiProperty({ description: 'Scores per dimension' })
  dimensionScores: Record<string, number>;

  @ApiProperty()
  generationTimestamp: string;
}

export class DeliverablePackResponseDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty({ type: [CompiledDocumentDto] })
  documents: CompiledDocumentDto[];

  @ApiProperty({ type: PackSummaryDto })
  summary: PackSummaryDto;

  @ApiProperty()
  readinessScore: number;

  @ApiProperty({ type: PackMetadataDto })
  metadata: PackMetadataDto;
}

export class ExportFormatDto {
  @ApiProperty({ enum: ['json', 'pdf', 'docx', 'zip'] })
  format: 'json' | 'pdf' | 'docx' | 'zip';
}

export class ExportUrlResponseDto {
  @ApiProperty({ description: 'Secure download URL for exported pack' })
  url: string;

  @ApiProperty({ description: 'URL expiration timestamp' })
  expiresAt: Date;

  @ApiProperty({ description: 'Export format' })
  format: string;

  @ApiProperty({ description: 'Estimated file size in bytes' })
  estimatedSize: number;
}
