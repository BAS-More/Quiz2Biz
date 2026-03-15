/**
 * Types, interfaces, and constants for the Scoring Engine.
 */
import { CoverageLevel } from '@prisma/client';

// === Constants ===

/** Small epsilon to avoid division by zero */
export const EPSILON = 1e-10;

/** Default severity for questions without a severity value (§16 risk control) */
export const DEFAULT_SEVERITY = 0.7;

/** Cache TTL for score calculations (5 minutes) */
export const SCORE_CACHE_TTL = 300;

/**
 * Coverage Level mapping to decimal values
 * Provides 5-level discrete scale for evidence assessment
 */
export const COVERAGE_LEVEL_VALUES: Record<CoverageLevel, number> = {
  NONE: 0.0,
  PARTIAL: 0.25,
  HALF: 0.5,
  SUBSTANTIAL: 0.75,
  FULL: 1.0,
};

/** Convert CoverageLevel enum to decimal value */
export function coverageLevelToDecimal(level: CoverageLevel | null): number {
  if (!level) {
    return 0;
  }
  return COVERAGE_LEVEL_VALUES[level] ?? 0;
}

/** Convert decimal value to nearest CoverageLevel (nearest-neighbor rounding to 0.25) */
export function decimalToCoverageLevel(value: number | null): CoverageLevel {
  if (value === null || value < 0.125) {
    return 'NONE';
  }
  if (value < 0.375) {
    return 'PARTIAL';
  }
  if (value < 0.625) {
    return 'HALF';
  }
  if (value < 0.875) {
    return 'SUBSTANTIAL';
  }
  return 'FULL';
}

// === Interfaces ===

/** Score history snapshot */
export interface ScoreSnapshot {
  timestamp: Date;
  score: number;
  portfolioResidual: number;
  completionPercentage: number;
}

/** Score history result */
export interface ScoreHistoryResult {
  sessionId: string;
  currentScore: number;
  history: ScoreSnapshot[];
  trend: TrendAnalysis;
}

/** Trend analysis result */
export interface TrendAnalysis {
  direction: 'UP' | 'DOWN' | 'STABLE';
  averageChange: number;
  volatility: number;
  projectedScore: number;
}

/** Industry benchmark result */
export interface BenchmarkResult {
  sessionId: string;
  currentScore: number;
  industry: string;
  benchmark: {
    average: number;
    median: number;
    min: number;
    max: number;
    percentile25: number;
    percentile75: number;
    sampleSize: number;
  };
  percentileRank: number;
  performanceCategory: 'LEADING' | 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE' | 'LAGGING';
  gapToMedian: number;
  gapToLeading: number;
}

/** Dimension benchmark comparison result */
export interface DimensionBenchmarkResult {
  dimensionKey: string;
  displayName: string;
  currentResidual: number;
  industryAverageResidual: number;
  gapToAverage: number;
  performance: 'ABOVE' | 'AVERAGE' | 'BELOW';
  recommendation: string;
}
