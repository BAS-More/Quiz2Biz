/**
 * Quality Scoring DTOs
 */

import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriteriaScoreDto {
  @ApiProperty({ description: 'Criterion key' })
  criterionKey!: string;

  @ApiProperty({ description: 'Criterion description' })
  criterionDescription!: string;

  @ApiProperty({ description: 'Whether criterion is met' })
  met!: boolean;

  @ApiProperty({ description: 'Confidence level (0-1)' })
  confidence!: number;

  @ApiPropertyOptional({ description: 'Source fact key' })
  sourceFactKey?: string;
}

export class DimensionScoreDto {
  @ApiProperty({ description: 'Dimension ID' })
  dimensionId!: string;

  @ApiProperty({ description: 'Dimension name' })
  dimensionName!: string;

  @ApiProperty({ description: 'Dimension weight' })
  weight!: number;

  @ApiProperty({ description: 'Dimension score (0-100)' })
  score!: number;

  @ApiProperty({ description: 'Completeness (0-1)' })
  completeness!: number;

  @ApiProperty({ description: 'Criteria scores', type: [CriteriaScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaScoreDto)
  criteriaScores!: CriteriaScoreDto[];
}

export class ProjectQualityScoreDto {
  @ApiProperty({ description: 'Project ID' })
  projectId!: string;

  @ApiProperty({ description: 'Overall quality score (0-100)' })
  overallScore!: number;

  @ApiProperty({ description: 'Completeness score (0-100)' })
  completenessScore!: number;

  @ApiProperty({ description: 'Confidence score (0-100)' })
  confidenceScore!: number;

  @ApiProperty({ description: 'Dimension scores', type: [DimensionScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionScoreDto)
  dimensionScores!: DimensionScoreDto[];

  @ApiProperty({ description: 'Improvement recommendations' })
  @IsArray()
  @IsString({ each: true })
  recommendations!: string[];

  @ApiProperty({ description: 'Score calculation timestamp' })
  scoredAt!: Date;
}

export class QualityImprovementDto {
  @ApiProperty({ description: 'Dimension ID' })
  dimensionId!: string;

  @ApiProperty({ description: 'Dimension name' })
  dimensionName!: string;

  @ApiProperty({ description: 'Current score (0-100)' })
  currentScore!: number;

  @ApiProperty({ description: 'Potential score after improvement' })
  potentialScore!: number;

  @ApiProperty({ description: 'Missing criteria descriptions' })
  @IsArray()
  @IsString({ each: true })
  missingCriteria!: string[];

  @ApiProperty({ description: 'Suggested follow-up questions' })
  @IsArray()
  @IsString({ each: true })
  suggestedQuestions!: string[];
}
