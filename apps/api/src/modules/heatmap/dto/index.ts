import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

/**
 * Severity bucket classification for heatmap cells.
 */
export enum SeverityBucket {
  LOW = 'Low', // 0.0 - 0.25
  MEDIUM = 'Medium', // 0.25 - 0.50
  HIGH = 'High', // 0.50 - 0.75
  CRITICAL = 'Critical', // 0.75 - 1.0
}

/**
 * Color codes for heatmap cells based on residual risk.
 */
export enum HeatmapColor {
  GREEN = '#28A745', // Residual <= 0.05
  AMBER = '#FFC107', // Residual 0.05 - 0.15
  RED = '#DC3545', // Residual > 0.15
}

/**
 * Utility functions for severity and color classification.
 */
export const SeverityBuckets = {
  getBucket(severity: number): SeverityBucket {
    if (severity < 0.25) {
      return SeverityBucket.LOW;
    }
    if (severity < 0.5) {
      return SeverityBucket.MEDIUM;
    }
    if (severity < 0.75) {
      return SeverityBucket.HIGH;
    }
    return SeverityBucket.CRITICAL;
  },
  order: [SeverityBucket.LOW, SeverityBucket.MEDIUM, SeverityBucket.HIGH, SeverityBucket.CRITICAL],
};

export const HeatmapColors = {
  getColor(residual: number): HeatmapColor {
    if (residual <= 0.05) {
      return HeatmapColor.GREEN;
    }
    if (residual <= 0.15) {
      return HeatmapColor.AMBER;
    }
    return HeatmapColor.RED;
  },
};

/**
 * Request DTO for generating heatmap.
 */
export class GenerateHeatmapDto {
  @ApiProperty({ description: 'Session ID to generate heatmap for' })
  @IsUUID()
  sessionId: string;
}

/**
 * Query params for filtering heatmap cells.
 */
export class HeatmapCellsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by dimension key' })
  @IsOptional()
  @IsString()
  dimension?: string;

  @ApiPropertyOptional({ description: 'Filter by severity bucket' })
  @IsOptional()
  @IsString()
  severity?: string;
}

/**
 * Individual heatmap cell representing dimension × severity intersection.
 */
export class HeatmapCellDto {
  @ApiProperty({ description: 'Dimension ID' })
  dimensionId: string;

  @ApiProperty({ description: 'Dimension key' })
  dimensionKey: string;

  @ApiProperty({ description: 'Severity bucket (Low, Medium, High, Critical)' })
  severityBucket: SeverityBucket;

  @ApiProperty({ description: 'Cell value: Sum(Severity × (1 - Coverage))' })
  cellValue: number;

  @ApiProperty({ description: 'Color code based on residual risk' })
  colorCode: HeatmapColor;

  @ApiProperty({ description: 'Number of questions in this cell' })
  questionCount: number;

  constructor(data: Partial<HeatmapCellDto>) {
    Object.assign(this, data);
  }
}

/**
 * Heatmap summary statistics.
 */
export class HeatmapSummaryDto {
  @ApiProperty({ description: 'Total number of cells in heatmap' })
  totalCells: number;

  @ApiProperty({ description: 'Count of green cells (low risk)' })
  greenCells: number;

  @ApiProperty({ description: 'Count of amber cells (moderate risk)' })
  amberCells: number;

  @ApiProperty({ description: 'Count of red cells (high risk)' })
  redCells: number;

  @ApiProperty({ description: 'Count of critical severity gaps with red color' })
  criticalGapCount: number;

  @ApiProperty({ description: 'Overall risk score (sum of all cell values)' })
  overallRiskScore: number;
}

/**
 * Complete heatmap result with cells, dimensions, and summary.
 */
export class HeatmapResultDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ type: [HeatmapCellDto], description: 'Heatmap cells' })
  cells: HeatmapCellDto[];

  @ApiProperty({ type: [String], description: 'List of dimension names' })
  dimensions: string[];

  @ApiProperty({ type: [String], description: 'Severity bucket order' })
  severityBuckets: string[];

  @ApiProperty({ type: HeatmapSummaryDto, description: 'Summary statistics' })
  summary: HeatmapSummaryDto;

  @ApiProperty({ description: 'Timestamp when heatmap was generated' })
  generatedAt: Date;
}

/**
 * Drilldown result showing questions contributing to a specific cell.
 */
export class HeatmapDrilldownDto {
  @ApiProperty({ description: 'Dimension key' })
  dimensionKey: string;

  @ApiProperty({ description: 'Dimension display name' })
  dimensionName: string;

  @ApiProperty({ description: 'Severity bucket (Low, Medium, High, Critical)' })
  severityBucket: SeverityBucket | string;

  @ApiProperty({ description: 'Cell value: Sum(Severity × (1 - Coverage))' })
  cellValue: number;

  @ApiProperty({ description: 'Color code based on residual risk' })
  colorCode: HeatmapColor;

  @ApiProperty({ description: 'Number of questions in this cell' })
  questionCount: number;

  @ApiProperty({ description: 'Questions contributing to this cell' })
  questions: Array<{
    questionId: string;
    questionText: string;
    severity: number;
    coverage: number;
    residualRisk: number;
    responseValue?: string;
  }>;

  @ApiPropertyOptional({
    type: HeatmapCellDto,
    description: 'The cell being drilled into (optional)',
  })
  cell?: HeatmapCellDto;

  @ApiPropertyOptional({ description: 'Potential improvement if all questions fully covered' })
  potentialImprovement?: number;
}
