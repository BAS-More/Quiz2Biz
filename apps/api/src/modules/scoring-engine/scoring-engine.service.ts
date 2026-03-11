/**
 * Scoring Engine Service — Orchestrator (thin facade).
 *
 * Implements Quiz2Biz risk-weighted readiness scoring with explicit formulas:
 *   Coverage (per question): C_i ∈ [0,1]
 *   Dimension Residual Risk: R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
 *   Portfolio Residual Risk: R = Σ(W_d × R_d)
 *   Readiness Score: Score = 100 × (1 - R)
 *
 * Delegates calculation helpers to scoring-calculator.ts and
 * benchmark/history analytics to strategies/scoring-analytics.ts.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CalculateScoreDto,
  ReadinessScoreResult,
  NextQuestionsDto,
  NextQuestionsResult,
  PrioritizedQuestion,
  CoverageLevelDto,
} from './dto';

// Re-export types for backward compatibility (spec file imports these from here)
export {
  COVERAGE_LEVEL_VALUES,
  coverageLevelToDecimal,
  decimalToCoverageLevel,
  ScoreSnapshot,
  ScoreHistoryResult,
  TrendAnalysis,
  BenchmarkResult,
  DimensionBenchmarkResult,
} from './scoring-types';

import {
  DEFAULT_SEVERITY,
  EPSILON,
  SCORE_CACHE_TTL,
  ScoreHistoryResult,
  BenchmarkResult,
  DimensionBenchmarkResult,
} from './scoring-types';
import { decimalToCoverageLevel } from './scoring-types';
import {
  buildCoverageMap,
  calculateDimensionResiduals,
  generateRationale,
} from './scoring-calculator';
import { ScoringAnalyticsService } from './strategies/scoring-analytics';

@Injectable()
export class ScoringEngineService {
  private readonly logger = new Logger(ScoringEngineService.name);
  private readonly analytics: ScoringAnalyticsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.analytics = new ScoringAnalyticsService(prisma);
  }

  /**
   * Calculate the complete readiness score for a session.
   * Uses parameterized queries throughout for security.
   */
  async calculateScore(dto: CalculateScoreDto): Promise<ReadinessScoreResult> {
    const startTime = Date.now();
    const { sessionId, coverageOverrides } = dto;

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { questionnaire: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const previousScore = session.readinessScore ? Number(session.readinessScore) : null;

    // Fetch dimensions filtered by session's project type when available
    const dimensionWhere: { isActive: boolean; projectTypeId?: string | null } = { isActive: true };
    if (session.projectTypeId) {
      dimensionWhere.projectTypeId = session.projectTypeId;
    }
    const dimensions = await this.prisma.dimensionCatalog.findMany({
      where: dimensionWhere,
      orderBy: { orderIndex: 'asc' },
      take: 10000,
    });

    // Fetch questions for this questionnaire filtered by session persona
    const questions = await this.prisma.question.findMany({
      where: {
        section: { questionnaireId: session.questionnaireId },
        ...(session.persona && { persona: session.persona }),
      },
      include: {
        responses: { where: { sessionId }, take: 1 },
        dimension: true,
      },
      take: 10000,
    });

    const coverageMap = buildCoverageMap(questions, coverageOverrides);
    const dimensionResults = calculateDimensionResiduals(dimensions, questions, coverageMap);

    const portfolioResidual = dimensionResults.reduce((sum, dim) => sum + dim.weightedContribution, 0);
    const score = Math.max(0, Math.min(100, 100 * (1 - portfolioResidual)));

    const totalQuestions = questions.length;
    const answeredQuestions = questions.filter((q) => q.responses.length > 0).length;
    const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

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

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        readinessScore: new Decimal(score.toFixed(2)),
        lastScoreCalculation: new Date(),
      },
    });

    const result: ReadinessScoreResult = {
      sessionId,
      score: Math.round(score * 100) / 100,
      portfolioResidual: Math.round(portfolioResidual * 10000) / 10000,
      dimensions: dimensionResults,
      totalQuestions,
      answeredQuestions,
      completionPercentage: Math.round(completionPercentage * 10) / 10,
      calculatedAt: new Date(),
      trend,
    };

    await this.saveScoreSnapshot(sessionId, result);
    await this.cacheScore(sessionId, result);

    const elapsed = Date.now() - startTime;
    this.logger.log(`Score calculated for session ${sessionId}: ${score.toFixed(2)} in ${elapsed}ms`);

    return result;
  }

  /**
   * Get prioritized next questions using NQS algorithm.
   * ΔScore_i = 100 × W_d(i) × S_i / (Σ S_j + ε)
   */
  async getNextQuestions(dto: NextQuestionsDto): Promise<NextQuestionsResult> {
    const { sessionId, limit = 5 } = dto;

    let currentResult = await this.getCachedScore(sessionId);
    if (!currentResult) {
      currentResult = await this.calculateScore({ sessionId });
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { persona: true },
    });

    const questions = await this.prisma.question.findMany({
      where: {
        section: { questionnaire: { sessions: { some: { id: sessionId } } } },
        dimensionKey: { not: null },
        ...(session?.persona && { persona: session.persona }),
      },
      include: {
        responses: { where: { sessionId }, take: 1 },
        dimension: true,
      },
      take: 10000,
    });

    const dimensions = await this.prisma.dimensionCatalog.findMany({
      where: { isActive: true },
      take: 10000,
    });
    const dimensionWeightMap = new Map(dimensions.map((d) => [d.key, Number(d.weight)]));

    const dimensionSeveritySum = this.buildDimensionSeverityMap(questions);

    const prioritizedQuestions: PrioritizedQuestion[] = [];

    for (const question of questions) {
      const response = question.responses[0];
      const currentCoverage: number = response?.coverage ? Number(response.coverage) : 0;

      if (currentCoverage >= 1.0) {
        continue;
      }

      const severity: number = question.severity ? Number(question.severity) : DEFAULT_SEVERITY;
      const dimensionKey: string = question.dimensionKey || 'unknown';
      const dimensionWeight: number = Number(dimensionWeightMap.get(dimensionKey) ?? 0);
      const severitySum: number = Number(dimensionSeveritySum.get(dimensionKey) ?? 1);

      const deltaScore: number =
        (100 * dimensionWeight * severity * (1 - currentCoverage)) / (severitySum + EPSILON);

      prioritizedQuestions.push({
        questionId: question.id,
        text: question.text,
        dimensionKey,
        dimensionName: question.dimension?.displayName || dimensionKey,
        severity,
        currentCoverage,
        currentCoverageLevel: decimalToCoverageLevel(currentCoverage) as CoverageLevelDto,
        expectedScoreLift: Math.round(deltaScore * 100) / 100,
        rationale: generateRationale(
          deltaScore,
          dimensionKey,
          question.dimension?.displayName || dimensionKey,
          currentCoverage,
        ),
        rank: 0,
      });
    }

    prioritizedQuestions.sort((a, b) => b.expectedScoreLift - a.expectedScoreLift);
    const topQuestions = prioritizedQuestions.slice(0, limit).map((q, i) => ({ ...q, rank: i + 1 }));

    const totalPotentialLift = topQuestions.reduce((sum, q) => sum + q.expectedScoreLift, 0);
    const maxPotentialScore = Math.min(100, currentResult.score + totalPotentialLift);

    return {
      sessionId,
      currentScore: currentResult.score,
      questions: topQuestions,
      maxPotentialScore: Math.round(maxPotentialScore * 100) / 100,
    };
  }

  /** Build a map of dimensionKey → total severity for NQS calculation */
  private buildDimensionSeverityMap(
    questions: Array<{ dimensionKey: string | null; severity: unknown }>,
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const q of questions) {
      if (q.dimensionKey) {
        const current = map.get(q.dimensionKey) || 0;
        map.set(q.dimensionKey, current + (q.severity ? Number(q.severity) : DEFAULT_SEVERITY));
      }
    }
    return map;
  }

  /** Invalidate cached score for a session */
  async invalidateScoreCache(sessionId: string): Promise<void> {
    try {
      const cacheKey = `score:${sessionId}`;
      await this.redis.del(cacheKey);
    } catch (error) {
      this.logger.warn(`Failed to invalidate score cache for session ${sessionId}`, error);
    }
  }

  /** Calculate score for multiple sessions (batch, controlled concurrency) */
  async calculateBatchScores(sessionIds: string[]): Promise<Map<string, ReadinessScoreResult>> {
    const results = new Map<string, ReadinessScoreResult>();
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

  // === Delegated analytics methods ===

  async getScoreHistory(sessionId: string, limit?: number): Promise<ScoreHistoryResult> {
    return this.analytics.getScoreHistory(sessionId, limit);
  }

  async getIndustryBenchmark(sessionId: string, industryCode?: string): Promise<BenchmarkResult> {
    return this.analytics.getIndustryBenchmark(sessionId, industryCode);
  }

  async getDimensionBenchmarks(sessionId: string): Promise<DimensionBenchmarkResult[]> {
    const currentResult = await this.calculateScore({ sessionId });
    return this.analytics.getDimensionBenchmarks(currentResult);
  }

  // === Cache & persistence helpers ===

  private async cacheScore(sessionId: string, result: ReadinessScoreResult): Promise<void> {
    try {
      const cacheKey = `score:${sessionId}`;
      await this.redis.set(cacheKey, JSON.stringify(result), SCORE_CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache score for session ${sessionId}`, error);
    }
  }

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
}
