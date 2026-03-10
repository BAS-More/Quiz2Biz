/**
 * Scoring Analytics — benchmark comparisons, score history, and trend analysis.
 * Instantiated internally by ScoringEngineService (not via DI).
 */
import { Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { DimensionResidual, ReadinessScoreResult } from '../dto';
import {
  DEFAULT_SEVERITY,
  ScoreSnapshot,
  ScoreHistoryResult,
  BenchmarkResult,
  DimensionBenchmarkResult,
} from '../scoring-types';
import { calculateTrendAnalysis, generateDimensionRecommendation } from '../scoring-calculator';

export class ScoringAnalyticsService {
  private readonly logger = new Logger(ScoringAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get score history for a session.
   * Returns historical score snapshots for trend analysis.
   */
  async getScoreHistory(sessionId: string, limit: number = 10): Promise<ScoreHistoryResult> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        readinessScore: true,
        startedAt: true,
        lastScoreCalculation: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const currentScore = session.readinessScore ? Number(session.readinessScore) : 0;

    const snapshots = await this.prisma.scoreSnapshot.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const history: ScoreSnapshot[] =
      snapshots.length > 0
        ? snapshots.map((s) => ({
            timestamp: s.createdAt,
            score: Number(s.score),
            portfolioResidual: Number(s.portfolioResidual),
            completionPercentage: Number(s.completionPercentage),
          }))
        : [
            {
              timestamp: session.lastScoreCalculation || session.startedAt,
              score: currentScore,
              portfolioResidual: 0,
              completionPercentage: 0,
            },
          ];

    const trend = calculateTrendAnalysis(history);

    return { sessionId, currentScore, history, trend };
  }

  /**
   * Get industry benchmark comparison.
   * Compares session score against industry averages.
   */
  async getIndustryBenchmark(sessionId: string, industryCode?: string): Promise<BenchmarkResult> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { questionnaire: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const currentScore = session.readinessScore ? Number(session.readinessScore) : 0;
    const industry =
      industryCode ||
      ((session.questionnaire?.metadata as Record<string, unknown>)?.industry as string) ||
      'general';

    const stats = await this.prisma.$queryRaw<
      Array<{
        avg_score: number;
        min_score: number;
        max_score: number;
        count: bigint;
        percentile_25: number;
        percentile_50: number;
        percentile_75: number;
      }>
    >`
      WITH industry_sessions AS (
          SELECT s.readiness_score
          FROM sessions s
          JOIN questionnaires q ON s.questionnaire_id = q.id
          WHERE s.readiness_score IS NOT NULL
          AND s.status = 'COMPLETED'
          AND (
              q.metadata->>'industry' = ${industry}
              OR ${industry} = 'general'
          )
      )
      SELECT 
          COALESCE(AVG(readiness_score), 0) as avg_score,
          COALESCE(MIN(readiness_score), 0) as min_score,
          COALESCE(MAX(readiness_score), 0) as max_score,
          COUNT(*) as count,
          COALESCE(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY readiness_score), 0) as percentile_25,
          COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY readiness_score), 0) as percentile_50,
          COALESCE(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY readiness_score), 0) as percentile_75
      FROM industry_sessions
    `;

    const benchmarkStats = stats[0] || {
      avg_score: 50,
      min_score: 0,
      max_score: 100,
      count: BigInt(0),
      percentile_25: 25,
      percentile_50: 50,
      percentile_75: 75,
    };

    const percentileRank = await this.calculatePercentileRank(currentScore, industry);

    let performanceCategory: 'LEADING' | 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE' | 'LAGGING';
    if (currentScore >= Number(benchmarkStats.percentile_75)) {
      performanceCategory = 'LEADING';
    } else if (currentScore >= Number(benchmarkStats.percentile_50)) {
      performanceCategory = 'ABOVE_AVERAGE';
    } else if (currentScore >= Number(benchmarkStats.percentile_25)) {
      performanceCategory = 'AVERAGE';
    } else if (currentScore >= Number(benchmarkStats.min_score)) {
      performanceCategory = 'BELOW_AVERAGE';
    } else {
      performanceCategory = 'LAGGING';
    }

    return {
      sessionId,
      currentScore,
      industry,
      benchmark: {
        average: Math.round(Number(benchmarkStats.avg_score) * 100) / 100,
        median: Math.round(Number(benchmarkStats.percentile_50) * 100) / 100,
        min: Math.round(Number(benchmarkStats.min_score) * 100) / 100,
        max: Math.round(Number(benchmarkStats.max_score) * 100) / 100,
        percentile25: Math.round(Number(benchmarkStats.percentile_25) * 100) / 100,
        percentile75: Math.round(Number(benchmarkStats.percentile_75) * 100) / 100,
        sampleSize: Number(benchmarkStats.count),
      },
      percentileRank,
      performanceCategory,
      gapToMedian: Math.round((currentScore - Number(benchmarkStats.percentile_50)) * 100) / 100,
      gapToLeading: Math.round((Number(benchmarkStats.percentile_75) - currentScore) * 100) / 100,
    };
  }

  /**
   * Get dimension-level benchmark comparison.
   * Caller must provide current scoring result (avoids circular dependency).
   */
  async getDimensionBenchmarks(currentResult: ReadinessScoreResult): Promise<DimensionBenchmarkResult[]> {
    const dimensionAverages = await this.prisma.$queryRaw<
      Array<{
        dimension_key: string;
        avg_residual: number;
        count: bigint;
      }>
    >`
      WITH completed_responses AS (
          SELECT
              q.dimension_key,
              q.severity,
              r.coverage,
              r.session_id
          FROM responses r
          JOIN questions q ON r.question_id = q.id
          JOIN sessions s ON r.session_id = s.id
          WHERE s.status = 'COMPLETED'
          AND s.readiness_score IS NOT NULL
          AND q.dimension_key IS NOT NULL
      ),
      dimension_residuals AS (
          SELECT
              dimension_key,
              session_id,
              CASE WHEN SUM(COALESCE(severity, ${DEFAULT_SEVERITY})) > 0
                  THEN SUM(COALESCE(severity, ${DEFAULT_SEVERITY}) * (1 - COALESCE(coverage, 0)))
                       / SUM(COALESCE(severity, ${DEFAULT_SEVERITY}))
                  ELSE 0
              END as residual_risk
          FROM completed_responses
          GROUP BY dimension_key, session_id
      )
      SELECT
          dimension_key,
          AVG(residual_risk) as avg_residual,
          COUNT(DISTINCT session_id) as count
      FROM dimension_residuals
      GROUP BY dimension_key
    `;

    const benchmarkMap = new Map<string, number>(
      dimensionAverages.map((d: { dimension_key: string; avg_residual: number }) => [
        d.dimension_key,
        Number(d.avg_residual),
      ]),
    );

    return currentResult.dimensions.map((dim: DimensionResidual) => {
      const industryAvgResidual = Number(benchmarkMap.get(dim.dimensionKey) ?? 0.5);
      const gapToAverage = dim.residualRisk - industryAvgResidual;

      return {
        dimensionKey: dim.dimensionKey,
        displayName: dim.displayName,
        currentResidual: dim.residualRisk,
        industryAverageResidual: Math.round(industryAvgResidual * 10000) / 10000,
        gapToAverage: Math.round(gapToAverage * 10000) / 10000,
        performance: gapToAverage < -0.1 ? ('ABOVE' as const) : gapToAverage > 0.1 ? ('BELOW' as const) : ('AVERAGE' as const),
        recommendation: generateDimensionRecommendation(dim, gapToAverage),
      };
    });
  }

  /** Calculate percentile rank for a score within an industry */
  private async calculatePercentileRank(score: number, industry: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ percentile_rank: number }>>`
      WITH industry_sessions AS (
          SELECT s.readiness_score
          FROM sessions s
          JOIN questionnaires q ON s.questionnaire_id = q.id
          WHERE s.readiness_score IS NOT NULL
          AND s.status = 'COMPLETED'
          AND (
              q.metadata->>'industry' = ${industry}
              OR ${industry} = 'general'
          )
      )
      SELECT 
          COALESCE(
              (COUNT(*) FILTER (WHERE readiness_score <= ${score})::float / 
              NULLIF(COUNT(*), 0) * 100),
              50
          ) as percentile_rank
      FROM industry_sessions
    `;

    return Math.round((result[0]?.percentile_rank ?? 50) * 10) / 10;
  }
}
