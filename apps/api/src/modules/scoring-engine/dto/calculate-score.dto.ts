import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Valid coverage levels for the 5-level evidence scale
 * Maps to discrete values: NONE=0.0, PARTIAL=0.25, HALF=0.5, SUBSTANTIAL=0.75, FULL=1.0
 */
export enum CoverageLevelDto {
  NONE = 'NONE', // 0.00 - No evidence
  PARTIAL = 'PARTIAL', // 0.25 - Some evidence exists
  HALF = 'HALF', // 0.50 - Moderate coverage
  SUBSTANTIAL = 'SUBSTANTIAL', // 0.75 - Most requirements met
  FULL = 'FULL', // 1.00 - Complete coverage
}

/**
 * Mapping of CoverageLevelDto to decimal values
 */
export const COVERAGE_LEVEL_VALUES: Record<CoverageLevelDto, number> = {
  [CoverageLevelDto.NONE]: 0.0,
  [CoverageLevelDto.PARTIAL]: 0.25,
  [CoverageLevelDto.HALF]: 0.5,
  [CoverageLevelDto.SUBSTANTIAL]: 0.75,
  [CoverageLevelDto.FULL]: 1.0,
};

/**
 * Convert decimal to nearest coverage level
 */
export function decimalToCoverageLevel(value: number): CoverageLevelDto {
  if (value < 0.125) {
    return CoverageLevelDto.NONE;
  }
  if (value < 0.375) {
    return CoverageLevelDto.PARTIAL;
  }
  if (value < 0.625) {
    return CoverageLevelDto.HALF;
  }
  if (value < 0.875) {
    return CoverageLevelDto.SUBSTANTIAL;
  }
  return CoverageLevelDto.FULL;
}

/**
 * Response coverage input for a single question
 * Supports both discrete level (preferred) and decimal value
 */
export class QuestionCoverageInput {
  @ApiProperty({ description: 'Question ID' })
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({
    description: 'Coverage level (5-level discrete scale) - PREFERRED over numeric coverage',
    enum: CoverageLevelDto,
    example: 'SUBSTANTIAL',
  })
  @IsOptional()
  @IsEnum(CoverageLevelDto, {
    message: 'coverageLevel must be one of: NONE, PARTIAL, HALF, SUBSTANTIAL, FULL',
  })
  coverageLevel?: CoverageLevelDto;

  @ApiPropertyOptional({
    description: 'Coverage value C_i ∈ [0,1] - will be normalized to nearest discrete level',
    minimum: 0,
    maximum: 1,
    example: 0.75,
  })
  @ValidateIf((o: QuestionCoverageInput) => o.coverageLevel === undefined)
  @IsNumber()
  @Min(0, { message: 'coverage must be at least 0' })
  @Max(1, { message: 'coverage must be at most 1' })
  @Transform(({ value, obj }: { value: number; obj: QuestionCoverageInput }) => {
    // If coverageLevel is provided, use its value instead
    if (obj.coverageLevel) {
      return COVERAGE_LEVEL_VALUES[obj.coverageLevel as CoverageLevelDto];
    }
    // Otherwise normalize the decimal to nearest level
    return COVERAGE_LEVEL_VALUES[decimalToCoverageLevel(value)];
  })
  coverage: number;
}

/**
 * Request to calculate readiness score for a session
 */
export class CalculateScoreDto {
  @ApiProperty({ description: 'Session ID to calculate score for' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Optional override of coverage values (for simulations)',
    type: [QuestionCoverageInput],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionCoverageInput)
  coverageOverrides?: QuestionCoverageInput[];
}

/**
 * Per-dimension residual risk breakdown
 */
export class DimensionResidual {
  @ApiProperty({ description: 'Dimension key', example: 'arch_sec' })
  dimensionKey: string;

  @ApiProperty({ description: 'Dimension display name', example: 'Architecture & Security' })
  displayName: string;

  @ApiProperty({
    description: 'Dimension weight W_d',
    example: 0.15,
  })
  weight: number;

  @ApiProperty({
    description: 'Residual risk R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)',
    minimum: 0,
    maximum: 1,
    example: 0.234,
  })
  residualRisk: number;

  @ApiProperty({
    description: 'Weighted contribution to portfolio risk: W_d × R_d',
    example: 0.0351,
  })
  weightedContribution: number;

  @ApiProperty({ description: 'Number of questions in this dimension' })
  questionCount: number;

  @ApiProperty({ description: 'Number of answered questions' })
  answeredCount: number;

  @ApiProperty({ description: 'Average coverage across dimension' })
  averageCoverage: number;
}

/**
 * Complete readiness score result
 */
export class ReadinessScoreResult {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({
    description: 'Overall readiness score: 100 × (1 - R)',
    minimum: 0,
    maximum: 100,
    example: 78.5,
  })
  score: number;

  @ApiProperty({
    description: 'Portfolio residual risk R = Σ(W_d × R_d)',
    minimum: 0,
    maximum: 1,
    example: 0.215,
  })
  portfolioResidual: number;

  @ApiProperty({
    description: 'Per-dimension breakdown',
    type: [DimensionResidual],
  })
  dimensions: DimensionResidual[];

  @ApiProperty({ description: 'Total questions in questionnaire' })
  totalQuestions: number;

  @ApiProperty({ description: 'Total answered questions' })
  answeredQuestions: number;

  @ApiProperty({ description: 'Overall completion percentage' })
  completionPercentage: number;

  @ApiProperty({ description: 'Timestamp when score was calculated' })
  calculatedAt: Date;

  @ApiProperty({
    description: 'Score trend compared to previous calculation',
    enum: ['UP', 'DOWN', 'STABLE', 'FIRST'],
    example: 'UP',
  })
  trend: 'UP' | 'DOWN' | 'STABLE' | 'FIRST';
}

/**
 * Request to get next priority questions
 */
export class NextQuestionsDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Maximum number of questions to return',
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  limit?: number;
}

/**
 * Single prioritized question with score impact
 */
export class PrioritizedQuestion {
  @ApiProperty({ description: 'Question ID' })
  questionId: string;

  @ApiProperty({ description: 'Question text' })
  text: string;

  @ApiProperty({ description: 'Dimension key' })
  dimensionKey: string;

  @ApiProperty({ description: 'Dimension display name' })
  dimensionName: string;

  @ApiProperty({
    description: 'Severity S_i of this question',
    minimum: 0,
    maximum: 1,
  })
  severity: number;

  @ApiProperty({
    description: 'Current coverage C_i (decimal)',
    minimum: 0,
    maximum: 1,
  })
  currentCoverage: number;

  @ApiProperty({
    description: 'Current coverage level (5-level discrete scale)',
    enum: CoverageLevelDto,
  })
  currentCoverageLevel: CoverageLevelDto;

  @ApiProperty({
    description: 'Expected score improvement if C_i reaches 1.0 (ΔScore)',
    example: 2.5,
  })
  expectedScoreLift: number;

  @ApiProperty({
    description: 'Human-readable rationale for prioritization',
  })
  rationale: string;

  @ApiProperty({
    description: 'Priority rank (1 = highest priority)',
  })
  rank: number;
}

/**
 * Response for next priority questions
 */
export class NextQuestionsResult {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Current readiness score' })
  currentScore: number;

  @ApiProperty({
    description: 'Prioritized questions by score impact',
    type: [PrioritizedQuestion],
  })
  questions: PrioritizedQuestion[];

  @ApiProperty({
    description: 'Maximum possible score if all returned questions reach full coverage',
  })
  maxPotentialScore: number;
}
