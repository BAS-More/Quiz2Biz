import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  ScoringEngineService,
  ScoreHistoryResult,
  BenchmarkResult,
  DimensionBenchmarkResult,
} from './scoring-engine.service';
import {
  CalculateScoreDto,
  ReadinessScoreResult,
  NextQuestionsDto,
  NextQuestionsResult,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Scoring Engine Controller
 *
 * Provides endpoints for Quiz2Biz readiness scoring:
 * - Calculate readiness score for a session
 * - Get next priority questions (NQS algorithm)
 * - Invalidate score cache
 */
@ApiTags('Scoring Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scoring')
export class ScoringEngineController {
  constructor(private readonly scoringService: ScoringEngineService) {}

  /**
   * Calculate readiness score for a session
   *
   * Implements the Quiz2Biz scoring formula:
   * Score = 100 × (1 - R) where R = Σ(W_d × R_d)
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate readiness score',
    description: `
Calculates the risk-weighted readiness score for a session using the Quiz2Biz formula:

**Formulas:**
- Coverage: C_i ∈ [0,1] per question
- Dimension Residual: R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)
- Portfolio Residual: R = Σ(W_d × R_d)
- Readiness Score: Score = 100 × (1 - R)

Returns per-dimension breakdown and score trend.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Score calculated successfully',
    type: ReadinessScoreResult,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async calculateScore(@Body() dto: CalculateScoreDto): Promise<ReadinessScoreResult> {
    return this.scoringService.calculateScore(dto);
  }

  /**
   * Get next priority questions for a session
   *
   * Uses the NQS algorithm to rank questions by expected score improvement:
   * ΔScore_i = 100 × W_d(i) × S_i / (Σ S_j + ε)
   */
  @Post('next-questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get next priority questions',
    description: `
Returns questions ranked by their potential score improvement using the NQS algorithm:

**Formula:**
ΔScore_i = 100 × W_d(i) × S_i × (1 - C_i) / (Σ S_j + ε)

Questions are ranked by expected score lift with rationale explaining the prioritization.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Priority questions retrieved successfully',
    type: NextQuestionsResult,
  })
  async getNextQuestions(@Body() dto: NextQuestionsDto): Promise<NextQuestionsResult> {
    return this.scoringService.getNextQuestions(dto);
  }

  /**
   * Get score for a specific session (from cache or calculate)
   */
  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get session score',
    description: 'Retrieves the current readiness score for a session, calculating if not cached.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Score retrieved successfully',
    type: ReadinessScoreResult,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getScore(@Param('sessionId') sessionId: string): Promise<ReadinessScoreResult> {
    return this.scoringService.calculateScore({ sessionId });
  }

  /**
   * Invalidate score cache for a session
   */
  @Post(':sessionId/invalidate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Invalidate score cache',
    description:
      'Invalidates the cached score for a session, forcing recalculation on next request.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session UUID',
  })
  @ApiResponse({
    status: 204,
    description: 'Cache invalidated successfully',
  })
  async invalidateCache(@Param('sessionId') sessionId: string): Promise<void> {
    await this.scoringService.invalidateScoreCache(sessionId);
  }

  /**
   * Get score history for a session
   */
  @Get(':sessionId/history')
  @ApiOperation({
    summary: 'Get score history',
    description: 'Returns historical score snapshots for trend analysis and progress tracking.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session UUID',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of history entries to return',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Score history retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getScoreHistory(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: number,
  ): Promise<ScoreHistoryResult> {
    return this.scoringService.getScoreHistory(sessionId, limit);
  }

  /**
   * Get industry benchmark comparison
   */
  @Get(':sessionId/benchmark')
  @ApiOperation({
    summary: 'Get industry benchmark',
    description: `
Compares the session score against industry averages and percentiles.

Returns:
- Industry average, median, min, max scores
- Percentile ranking within industry
- Performance category (Leading, Above Average, Average, Below Average, Lagging)
- Gap analysis to median and leading performers
        `,
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session UUID',
  })
  @ApiQuery({
    name: 'industry',
    description: 'Industry code for comparison (defaults to session industry)',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Benchmark data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getIndustryBenchmark(
    @Param('sessionId') sessionId: string,
    @Query('industry') industry?: string,
  ): Promise<BenchmarkResult> {
    return this.scoringService.getIndustryBenchmark(sessionId, industry);
  }

  /**
   * Get dimension-level benchmarks
   */
  @Get(':sessionId/benchmark/dimensions')
  @ApiOperation({
    summary: 'Get dimension benchmarks',
    description: `
Compares each dimension's residual risk against industry averages.

Returns per-dimension:
- Current residual risk
- Industry average residual
- Gap to average
- Performance rating (Above, Average, Below)
- Improvement recommendations
        `,
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Dimension benchmarks retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getDimensionBenchmarks(
    @Param('sessionId') sessionId: string,
  ): Promise<DimensionBenchmarkResult[]> {
    return this.scoringService.getDimensionBenchmarks(sessionId);
  }
}
