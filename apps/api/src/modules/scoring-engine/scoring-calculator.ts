/**
 * Pure calculation helpers for the Scoring Engine.
 * No service dependencies — all functions are stateless.
 */
import { Decimal } from '@prisma/client/runtime/library';
import { CoverageLevel } from '@prisma/client';
import { DimensionResidual } from './dto';
import {
  EPSILON,
  DEFAULT_SEVERITY,
  ScoreSnapshot,
  TrendAnalysis,
  coverageLevelToDecimal,
} from './scoring-types';

// Re-export for convenience
export { coverageLevelToDecimal } from './scoring-types';

/**
 * Build coverage map from responses with optional overrides.
 * Prefers coverageLevel (discrete) over coverage (continuous).
 */
export function buildCoverageMap(
  questions: Array<{
    id: string;
    responses: Array<{
      coverage: Decimal | null;
      coverageLevel?: CoverageLevel | null;
    }>;
  }>,
  overrides?: Array<{ questionId: string; coverage: number }>,
): Map<string, number> {
  const coverageMap = new Map<string, number>();

  questions.forEach((q) => {
    const response = q.responses[0];
    let coverage: number;

    if (response?.coverageLevel) {
      coverage = coverageLevelToDecimal(response.coverageLevel);
    } else if (response?.coverage) {
      coverage = Number(response.coverage);
    } else {
      coverage = 0;
    }

    coverageMap.set(q.id, coverage);
  });

  if (overrides) {
    const { decimalToCoverageLevel } = require('./scoring-types');
    overrides.forEach((override) => {
      if (coverageMap.has(override.questionId)) {
        const level = decimalToCoverageLevel(override.coverage);
        coverageMap.set(override.questionId, coverageLevelToDecimal(level));
      }
    });
  }

  return coverageMap;
}

/**
 * Calculate residual risk for each dimension.
 * R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
 */
export function calculateDimensionResiduals(
  dimensions: Array<{
    key: string;
    displayName: string;
    weight: Decimal;
  }>,
  questions: Array<{
    id: string;
    dimensionKey: string | null;
    severity: Decimal | null;
    responses: Array<{ coverage: Decimal | null }>;
  }>,
  coverageMap: Map<string, number>,
): DimensionResidual[] {
  return dimensions.map((dim) => {
    const dimQuestions = questions.filter((q) => q.dimensionKey === dim.key);

    if (dimQuestions.length === 0) {
      return {
        dimensionKey: dim.key,
        displayName: dim.displayName,
        weight: Number(dim.weight),
        residualRisk: 0,
        weightedContribution: 0,
        questionCount: 0,
        answeredCount: 0,
        averageCoverage: 0,
      };
    }

    let numerator = 0;
    let severitySum = 0;
    let totalCoverage = 0;
    let answeredCount = 0;

    dimQuestions.forEach((q) => {
      const severity = q.severity ? Number(q.severity) : DEFAULT_SEVERITY;
      const coverage = coverageMap.get(q.id) || 0;

      numerator += severity * (1 - coverage);
      severitySum += severity;
      totalCoverage += coverage;

      if (q.responses.length > 0) {
        answeredCount++;
      }
    });

    const residualRisk = numerator / (severitySum + EPSILON);
    const weight = Number(dim.weight);
    const weightedContribution = weight * residualRisk;

    return {
      dimensionKey: dim.key,
      displayName: dim.displayName,
      weight,
      residualRisk: Math.round(residualRisk * 10000) / 10000,
      weightedContribution: Math.round(weightedContribution * 10000) / 10000,
      questionCount: dimQuestions.length,
      answeredCount,
      averageCoverage: Math.round((totalCoverage / dimQuestions.length) * 100) / 100,
    };
  });
}

/** Generate human-readable rationale for question prioritization */
export function generateRationale(
  deltaScore: number,
  _dimensionKey: string,
  dimensionName: string,
  currentCoverage: number,
): string {
  const scoreGain = deltaScore.toFixed(1);
  const coveragePercent = (currentCoverage * 100).toFixed(0);

  if (currentCoverage === 0) {
    return `Answering this ${dimensionName} question could improve your score by up to ${scoreGain} points. This question has no coverage yet.`;
  }

  return `Improving coverage on this ${dimensionName} question from ${coveragePercent}% to 100% could add ${scoreGain} points to your readiness score.`;
}

/** Calculate trend analysis from score history */
export function calculateTrendAnalysis(history: ScoreSnapshot[]): TrendAnalysis {
  if (history.length < 2) {
    return {
      direction: 'STABLE',
      averageChange: 0,
      volatility: 0,
      projectedScore: history[0]?.score ?? 0,
    };
  }

  const changes: number[] = [];
  for (let i = 0; i < history.length - 1; i++) {
    changes.push(history[i].score - history[i + 1].score);
  }

  const averageChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;

  const squaredDiffs = changes.map((c) => Math.pow(c - averageChange, 2));
  const volatility = Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / changes.length);

  let direction: 'UP' | 'DOWN' | 'STABLE';
  if (averageChange > 1) {
    direction = 'UP';
  } else if (averageChange < -1) {
    direction = 'DOWN';
  } else {
    direction = 'STABLE';
  }

  const projectedScore = Math.max(0, Math.min(100, history[0].score + averageChange));

  return {
    direction,
    averageChange: Math.round(averageChange * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    projectedScore: Math.round(projectedScore * 100) / 100,
  };
}

/** Generate recommendation for dimension improvement */
export function generateDimensionRecommendation(dim: DimensionResidual, gapToAverage: number): string {
  if (gapToAverage < -0.1) {
    return `${dim.displayName} is performing above industry average. Maintain current practices.`;
  }

  if (gapToAverage > 0.2) {
    return `${dim.displayName} has significant gaps. Prioritize ${dim.questionCount - dim.answeredCount} unanswered questions to improve by ${Math.round(gapToAverage * 100)}%.`;
  }

  if (gapToAverage > 0.1) {
    return `${dim.displayName} is slightly below average. Review ${dim.questionCount - dim.answeredCount} remaining questions for quick wins.`;
  }

  return `${dim.displayName} is performing at industry average. Focus on other dimensions for maximum impact.`;
}
