import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import { Decimal } from '@prisma/client/runtime/library';
import { CoverageLevel } from '@prisma/client';
import {
  CalculateScoreDto,
  ReadinessScoreResult,
  DimensionResidual,
  NextQuestionsDto,
  NextQuestionsResult,
  PrioritizedQuestion,
  QuestionCoverageInput,
  CoverageLevelDto,
} from './dto';

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

/**
 * Convert CoverageLevel enum to decimal value
 */
export function coverageLevelToDecimal(level: CoverageLevel | null): number {
  if (!level) {
    return 0;
  }
  return COVERAGE_LEVEL_VALUES[level] ?? 0;
}

/**
 * Convert decimal value to nearest CoverageLevel
 * Uses nearest-neighbor rounding to closest 0.25 increment
 */
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

/**
 * Scoring Engine Service
 *
 * Implements Quiz2Biz risk-weighted readiness scoring with explicit formulas:
 *
 * Coverage (per question): C_i ∈ [0,1]
 *   - 0 = no evidence/coverage
 *   - 1 = fully verified/covered
 *
 * Dimension Residual Risk: R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
 *   - S_i = severity weight of question i
 *   - C_i = coverage of question i
 *   - ε = small epsilon to avoid division by zero (1e-10)
 *
 * Portfolio Residual Risk: R = Σ(W_d × R_d)
 *   - W_d = weight of dimension d (from DimensionCatalog)
 *   - All weights sum to 1.0
 *
 * Readiness Score: Score = 100 × (1 - R)
 *   - Range: 0-100
 *   - 100 = perfect readiness (no residual risk)
 *   - 0 = no readiness (maximum residual risk)
 *
 * Next Question Selector (NQS) uses ΔScore:
 *   ΔScore_i = 100 × W_d(i) × S_i / (Σ S_j + ε)
 *   - Ranks unanswered/under-covered questions by expected score lift
 */
@Injectable()
export class ScoringEngineService {
  private readonly logger = new Logger(ScoringEngineService.name);

  /** Small epsilon to avoid division by zero */
  private readonly EPSILON = 1e-10;

  /** Default severity for questions without a severity value (§16 risk control) */
  private readonly DEFAULT_SEVERITY = 0.7;

  /** Cache TTL for score calculations (5 minutes) */
  private readonly SCORE_CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Calculate the complete readiness score for a session
   * Uses parameterized queries throughout for security
   */
  async calculateScore(dto: CalculateScoreDto): Promise<ReadinessScoreResult> {
    const startTime = Date.now();
    const { sessionId, coverageOverrides } = dto;

    // Validate session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        questionnaire: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    // Get previous score for trend calculation
    const previousScore = session.readinessScore ? Number(session.readinessScore) : null;

    // Fetch all dimensions with their weights
    const dimensions = await this.prisma.dimensionCatalog.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    // Fetch questions for this questionnaire filtered by session persona
    const questions = await this.prisma.question.findMany({
      where: {
        section: {
          questionnaireId: session.questionnaireId,
        },
        ...(session.persona && { persona: session.persona }),
      },
      include: {
        responses: {
          where: { sessionId },
          take: 1,
        },
        dimension: true,
      },
    });

    // Build coverage map (apply overrides if provided)
    const coverageMap = this.buildCoverageMap(questions, coverageOverrides);

    // Calculate per-dimension residuals
    const dimensionResults = this.calculateDimensionResiduals(dimensions, questions, coverageMap);

    // Calculate portfolio residual: R = Σ(W_d × R_d)
    const portfolioResidual = dimensionResults.reduce(
      (sum, dim) => sum + dim.weightedContribution,
      0,
    );

    // Calculate final score: Score = 100 × (1 - R)
    const score = Math.max(0, Math.min(100, 100 * (1 - portfolioResidual)));

    // Calculate statistics
    const totalQuestions = questions.length;
    const answeredQuestions = questions.filter((q) => q.responses.length > 0).length;
    const completionPercentage =
      totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    // Determine trend
    let trend: 'UP' | 'DOWN' | 'STABLE' | 'FIRST';
    if (previousScore === null) {
      trend = 'FIRST';
    } else if (score > previousScore + 0.5) {
      trend = 'UP';
    } else if (score < previousScore - 0.5) {
      trend = 'DOWN';
    } else {
      trend = 'STABLE';
    }

    // Update session with new score using parameterized query
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        readinessScore: new Decimal(score.toFixed(2)),
        lastScoreCalculation: new Date(),
      },
    });

    const result: ReadinessScoreResult = {
      sessionId,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      portfolioResidual: Math.round(portfolioResidual * 10000) / 10000,
      dimensions: dimensionResults,
      totalQuestions,
      answeredQuestions,
      completionPercentage: Math.round(completionPercentage * 10) / 10,
      calculatedAt: new Date(),
      trend,
    };

    // Save score snapshot for history tracking
    await this.saveScoreSnapshot(sessionId, result);

    // Cache the result
    await this.cacheScore(sessionId, result);

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `Score calculated for session ${sessionId}: ${score.toFixed(2)} in ${elapsed}ms`,
    );

    return result;
  }

  /**
   * Get prioritized next questions using NQS algorithm
   *
   * ΔScore_i = 100 × W_d(i) × S_i / (Σ S_j + ε)
   *
   * Returns questions ranked by their potential score improvement
   */
  async getNextQuestions(dto: NextQuestionsDto): Promise<NextQuestionsResult> {
    const { sessionId, limit = 5 } = dto;

    // Get current score or calculate it
    let currentResult = await this.getCachedScore(sessionId);
    if (!currentResult) {
      currentResult = await this.calculateScore({ sessionId });
    }

    // Look up session persona for filtering
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { persona: true },
    });

    // Fetch questions filtered by session persona
    const questions = await this.prisma.question.findMany({
      where: {
        section: {
          questionnaire: {
            sessions: {
              some: { id: sessionId },
            },
          },
        },
        dimensionKey: { not: null },
        ...(session?.persona && { persona: session.persona }),
      },
      include: {
        responses: {
          where: { sessionId },
          take: 1,
        },
        dimension: true,
      },
    });

    // Get all dimensions for weight lookup
    const dimensions = await this.prisma.dimensionCatalog.findMany({
      where: { isActive: true },
    });
    const dimensionWeightMap = new Map(dimensions.map((d) => [d.key, Number(d.weight)]));

    // Calculate total severity per dimension for normalization
    const dimensionSeveritySum = new Map<string, number>();
    questions.forEach((q) => {
      if (q.dimensionKey) {
        const current = dimensionSeveritySum.get(q.dimensionKey) || 0;
        dimensionSeveritySum.set(q.dimensionKey, current + (q.severity ? Number(q.severity) : this.DEFAULT_SEVERITY));
      }
    });

    // Calculate ΔScore for each question
    const prioritizedQuestions: PrioritizedQuestion[] = [];

    for (const question of questions) {
      const response = question.responses[0];
      const currentCoverage: number = response?.coverage ? Number(response.coverage) : 0;

      // Skip fully covered questions
      if (currentCoverage >= 1.0) {
        continue;
      }

      const severity: number = question.severity ? Number(question.severity) : this.DEFAULT_SEVERITY;
      const dimensionKey: string = question.dimensionKey || 'unknown';
      const dimensionWeight: number = Number(dimensionWeightMap.get(dimensionKey) ?? 0);
      const severitySum: number = Number(dimensionSeveritySum.get(dimensionKey) ?? 1);

      // ΔScore = 100 × W_d × S_i × (1 - C_i) / (Σ S_j + ε)
      // This represents the score gain if C_i goes from current to 1.0
      const deltaScore: number =
        (100 * dimensionWeight * severity * (1 - currentCoverage)) / (severitySum + this.EPSILON);

      prioritizedQuestions.push({
        questionId: question.id,
        text: question.text,
        dimensionKey,
        dimensionName: question.dimension?.displayName || dimensionKey,
        severity,
        currentCoverage,
        currentCoverageLevel: decimalToCoverageLevel(currentCoverage) as CoverageLevelDto,
        expectedScoreLift: Math.round(deltaScore * 100) / 100,
        rationale: this.generateRationale(
          deltaScore,
          dimensionKey,
          question.dimension?.displayName || dimensionKey,
          currentCoverage,
        ),
        rank: 0, // Will be set after sorting
      });
    }

    // Sort by expected score lift (descending)
    prioritizedQuestions.sort((a, b) => b.expectedScoreLift - a.expectedScoreLift);

    // Assign ranks and limit results
    const topQuestions = prioritizedQuestions.slice(0, limit).map((q, i) => ({
      ...q,
      rank: i + 1,
    }));

    // Calculate max potential score
    const totalPotentialLift = topQuestions.reduce((sum, q) => sum + q.expectedScoreLift, 0);
    const maxPotentialScore = Math.min(100, currentResult.score + totalPotentialLift);

    return {
      sessionId,
      currentScore: currentResult.score,
      questions: topQuestions,
      maxPotentialScore: Math.round(maxPotentialScore * 100) / 100,
    };
  }

  /**
   * Build coverage map from responses with optional overrides
   * Prefers coverageLevel (discrete) over coverage (continuous) when available
   */
  private buildCoverageMap(
    questions: Array<{
      id: string;
      responses: Array<{
        coverage: Decimal | null;
        coverageLevel?: CoverageLevel | null;
      }>;
    }>,
    overrides?: QuestionCoverageInput[],
  ): Map<string, number> {
    const coverageMap = new Map<string, number>();

    // Initialize from actual responses
    // Prefer coverageLevel (discrete) over coverage (continuous) for consistency
    questions.forEach((q) => {
      const response = q.responses[0];
      let coverage: number;

      if (response?.coverageLevel) {
        // Use discrete coverage level (preferred)
        coverage = coverageLevelToDecimal(response.coverageLevel);
      } else if (response?.coverage) {
        // Fall back to continuous coverage
        coverage = Number(response.coverage);
      } else {
        coverage = 0;
      }

      coverageMap.set(q.id, coverage);
    });

    // Apply overrides (validated to discrete levels)
    if (overrides) {
      overrides.forEach((override) => {
        if (coverageMap.has(override.questionId)) {
          // Normalize override to discrete level
          const level = decimalToCoverageLevel(override.coverage);
          coverageMap.set(override.questionId, coverageLevelToDecimal(level));
        }
      });
    }

    return coverageMap;
  }

  /**
   * Calculate residual risk for each dimension
   *
   * R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
   */
  private calculateDimensionResiduals(
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
      // Get questions in this dimension
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

      // Calculate numerator: Σ(S_i × (1-C_i))
      let numerator = 0;
      let severitySum = 0;
      let totalCoverage = 0;
      let answeredCount = 0;

      dimQuestions.forEach((q) => {
        const severity = q.severity ? Number(q.severity) : this.DEFAULT_SEVERITY;
        const coverage = coverageMap.get(q.id) || 0;

        numerator += severity * (1 - coverage);
        severitySum += severity;
        totalCoverage += coverage;

        if (q.responses.length > 0) {
          answeredCount++;
        }
      });

      // Calculate R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
      const residualRisk = numerator / (severitySum + this.EPSILON);
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

  /**
   * Generate human-readable rationale for question prioritization
   */
  private generateRationale(
    deltaScore: number,
    dimensionKey: string,
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

  /**
   * Cache score result for faster retrieval
   */
  private async cacheScore(sessionId: string, result: ReadinessScoreResult): Promise<void> {
    try {
      const cacheKey = `score:${sessionId}`;
      await this.redis.set(cacheKey, JSON.stringify(result), this.SCORE_CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache score for session ${sessionId}`, error);
    }
  }

  /**
   * Get cached score result
   */
  private async getCachedScore(sessionId: string): Promise<ReadinessScoreResult | null> {
    try {
      const cacheKey = `score:${sessionId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as ReadinessScoreResult;
      }
    } catch (error) {
      this.logger.warn(`Failed to retrieve cached score for session ${sessionId}`, error);
    }
    return null;
  }

  /**
   * Save a score snapshot for history tracking
   */
  private async saveScoreSnapshot(sessionId: string, result: ReadinessScoreResult): Promise<void> {
    try {
      await this.prisma.scoreSnapshot.create({
        data: {
          sessionId,
          score: new Decimal(result.score.toFixed(2)),
          portfolioResidual: new Decimal(result.portfolioResidual.toFixed(6)),
          completionPercentage: new Decimal(result.completionPercentage.toFixed(2)),
          dimensionBreakdown: result.dimensions.map((d) => ({
            dimensionKey: d.dimensionKey,
            residualRisk: d.residualRisk,
            weight: d.weight,
            answeredCount: d.answeredCount,
            questionCount: d.questionCount,
          })),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to save score snapshot for session ${sessionId}`, error);
    }
  }

  /**
   * Invalidate cached score for a session
   */
  async invalidateScoreCache(sessionId: string): Promise<void> {
    try {
      const cacheKey = `score:${sessionId}`;
      await this.redis.del(cacheKey);
    } catch (error) {
      this.logger.warn(`Failed to invalidate score cache for session ${sessionId}`, error);
    }
  }

  /**
   * Calculate score for multiple sessions (batch operation)
   */
  async calculateBatchScores(sessionIds: string[]): Promise<Map<string, ReadinessScoreResult>> {
    const results = new Map<string, ReadinessScoreResult>();

    // Process in parallel with controlled concurrency
    const batchSize = 5;
    for (let i = 0; i < sessionIds.length; i += batchSize) {
      const batch = sessionIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((id) =>
          this.calculateScore({ sessionId: id }).catch((error) => {
            this.logger.error(`Failed to calculate score for ${id}`, error);
            return null;
          }),
        ),
      );

      batchResults.forEach((result, index) => {
        if (result) {
          results.set(batch[index], result);
        }
      });
    }

    return results;
  }

  /**
   * Get score history for a session
   * Returns historical score snapshots for trend analysis
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

    // Load actual score snapshots from ScoreSnapshot table
    const snapshots = await this.prisma.scoreSnapshot.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const history: ScoreSnapshot[] = snapshots.length > 0
      ? snapshots.map((s) => ({
          timestamp: s.createdAt,
          score: Number(s.score),
          portfolioResidual: Number(s.portfolioResidual),
          completionPercentage: Number(s.completionPercentage),
        }))
      : [{
          timestamp: session.lastScoreCalculation || session.startedAt,
          score: currentScore,
          portfolioResidual: 0,
          completionPercentage: 0,
        }];

    // Calculate trend metrics
    const trendAnalysis = this.calculateTrendAnalysis(history);

    return {
      sessionId,
      currentScore,
      history,
      trend: trendAnalysis,
    };
  }

  /**
   * Get industry benchmark comparison
   * Compares session score against industry averages
   */
  async getIndustryBenchmark(sessionId: string, industryCode?: string): Promise<BenchmarkResult> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        questionnaire: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const currentScore = session.readinessScore ? Number(session.readinessScore) : 0;

    // Get industry from session or use provided code
    const industry =
      industryCode ||
      ((session.questionnaire?.metadata as Record<string, unknown>)?.industry as string) ||
      'general';

    // Calculate aggregate statistics from all sessions in same industry
    // Using parameterized query for security
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

    // Calculate percentile rank
    const percentileRank = await this.calculatePercentileRank(currentScore, industry);

    // Determine performance category
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
   * Calculate percentile rank for a score within an industry
   */
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

  /**
   * Calculate trend analysis from score history
   */
  private calculateTrendAnalysis(history: ScoreSnapshot[]): TrendAnalysis {
    if (history.length < 2) {
      return {
        direction: 'STABLE',
        averageChange: 0,
        volatility: 0,
        projectedScore: history[0]?.score ?? 0,
      };
    }

    // Calculate changes between consecutive scores
    const changes: number[] = [];
    for (let i = 0; i < history.length - 1; i++) {
      changes.push(history[i].score - history[i + 1].score);
    }

    const averageChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;

    // Calculate volatility (standard deviation of changes)
    const squaredDiffs = changes.map((c) => Math.pow(c - averageChange, 2));
    const volatility = Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / changes.length);

    // Determine direction
    let direction: 'UP' | 'DOWN' | 'STABLE';
    if (averageChange > 1) {
      direction = 'UP';
    } else if (averageChange < -1) {
      direction = 'DOWN';
    } else {
      direction = 'STABLE';
    }

    // Project future score (simple linear projection)
    const projectedScore = Math.max(0, Math.min(100, history[0].score + averageChange));

    return {
      direction,
      averageChange: Math.round(averageChange * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      projectedScore: Math.round(projectedScore * 100) / 100,
    };
  }

  /**
   * Get dimension-level benchmark comparison
   */
  async getDimensionBenchmarks(sessionId: string): Promise<DimensionBenchmarkResult[]> {
    // First calculate current score to get dimension residuals
    const currentResult = await this.calculateScore({ sessionId });

    // Get industry averages per dimension from completed sessions' response data
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
                    CASE WHEN SUM(COALESCE(severity, ${this.DEFAULT_SEVERITY})) > 0
                        THEN SUM(COALESCE(severity, ${this.DEFAULT_SEVERITY}) * (1 - COALESCE(coverage, 0)))
                             / SUM(COALESCE(severity, ${this.DEFAULT_SEVERITY}))
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

    return currentResult.dimensions.map((dim) => {
      const industryAvgResidual = Number(benchmarkMap.get(dim.dimensionKey) ?? 0.5);
      const gapToAverage = dim.residualRisk - industryAvgResidual;

      return {
        dimensionKey: dim.dimensionKey,
        displayName: dim.displayName,
        currentResidual: dim.residualRisk,
        industryAverageResidual: Math.round(industryAvgResidual * 10000) / 10000,
        gapToAverage: Math.round(gapToAverage * 10000) / 10000,
        performance: gapToAverage < -0.1 ? 'ABOVE' : gapToAverage > 0.1 ? 'BELOW' : 'AVERAGE',
        recommendation: this.generateDimensionRecommendation(dim, gapToAverage),
      };
    });
  }

  /**
   * Generate recommendation for dimension improvement
   */
  private generateDimensionRecommendation(dim: DimensionResidual, gapToAverage: number): string {
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
}

/**
 * Score history snapshot
 */
export interface ScoreSnapshot {
  timestamp: Date;
  score: number;
  portfolioResidual: number;
  completionPercentage: number;
}

/**
 * Score history result
 */
export interface ScoreHistoryResult {
  sessionId: string;
  currentScore: number;
  history: ScoreSnapshot[];
  trend: TrendAnalysis;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  direction: 'UP' | 'DOWN' | 'STABLE';
  averageChange: number;
  volatility: number;
  projectedScore: number;
}

/**
 * Industry benchmark result
 */
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

/**
 * Dimension benchmark comparison result
 */
export interface DimensionBenchmarkResult {
  dimensionKey: string;
  displayName: string;
  currentResidual: number;
  industryAverageResidual: number;
  gapToAverage: number;
  performance: 'ABOVE' | 'AVERAGE' | 'BELOW';
  recommendation: string;
}
