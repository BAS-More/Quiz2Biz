/**
 * Fact Extraction DTOs
 */

import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExtractedFactDto {
  @ApiProperty({ description: 'Fact key/identifier' })
  @IsString()
  key!: string;

  @ApiProperty({ description: 'Extracted fact value' })
  @IsString()
  value!: string;

  @ApiProperty({ 
    description: 'Fact category',
    enum: ['business_overview', 'market_analysis', 'financial_data', 'team_and_operations', 
           'product_service', 'strategy', 'risk_assessment', 'technology', 'legal_compliance'],
  })
  @IsString()
  category!: string;

  @ApiProperty({ 
    description: 'Confidence level',
    enum: ['high', 'medium', 'low'],
  })
  @IsString()
  confidence!: string;

  @ApiPropertyOptional({ description: 'Source message ID' })
  @IsOptional()
  @IsString()
  sourceMessageId?: string;
}

export class TriggerExtractionDto {
  @ApiPropertyOptional({ description: 'Message ID that triggered extraction' })
  @IsOptional()
  @IsString()
  messageId?: string;
}

export class UpdateFactDto {
  @ApiProperty({ description: 'New fact value' })
  @IsString()
  value!: string;
}

export class FactValidationResultDto {
  @ApiProperty({ description: 'Whether all required facts are present' })
  isValid!: boolean;

  @ApiProperty({ description: 'List of missing required fact keys' })
  @IsArray()
  @IsString({ each: true })
  missingRequired!: string[];

  @ApiProperty({ description: 'List of low confidence fact keys' })
  @IsArray()
  @IsString({ each: true })
  lowConfidenceFacts!: string[];

  @ApiProperty({ description: 'Completeness score (0-100)' })
  completenessScore!: number;
}

export class ExtractFactsResponseDto {
  @ApiProperty({ description: 'Extracted facts', type: [ExtractedFactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedFactDto)
  facts!: ExtractedFactDto[];

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs!: number;

  @ApiProperty({ description: 'Tokens used for extraction' })
  tokensUsed!: number;
}
