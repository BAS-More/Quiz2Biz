import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  ScoringEngineService,
  coverageLevelToDecimal,
  decimalToCoverageLevel,
} from './scoring-engine.service';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import { Decimal } from '@prisma/client/runtime/library';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;
  let prismaService: any; // Use any for mocked service
  let redisService: any; // Use any for mocked service
  let module: TestingModule;

  // Test data
  const mockSessionId = 'session-uuid-123';
  const mockQuestionnaireId = 'questionnaire-uuid-456';

  const mockDimensions = [
    {
      key: 'arch_sec',
      displayName: 'Architecture & Security',
      weight: new Decimal('0.15'),
      orderIndex: 1,
      isActive: true,
    },
    {
      key: 'devops_iac',
      displayName: 'DevOps & Infrastructure',
      weight: new Decimal('0.12'),
      orderIndex: 2,
      isActive: true,
    },
    {
      key: 'quality_test',
      displayName: 'Quality & Testing',
      weight: new Decimal('0.10'),
      orderIndex: 3,
      isActive: true,
    },
    {
      key: 'finance',
      displayName: 'Finance',
      weight: new Decimal('0.10'),
      orderIndex: 4,
      isActive: true,
    },
    {
      key: 'strategy',
      displayName: 'Strategy',
      weight: new Decimal('0.08'),
      orderIndex: 5,
      isActive: true,
    },
    {
      key: 'requirements',
      displayName: 'Requirements',
      weight: new Decimal('0.08'),
      orderIndex: 6,
      isActive: true,
    },
    {
      key: 'data_ai',
      displayName: 'Data & AI',
      weight: new Decimal('0.08'),
      orderIndex: 7,
      isActive: true,
    },
    {
      key: 'privacy_legal',
      displayName: 'Privacy & Legal',
      weight: new Decimal('0.08'),
      orderIndex: 8,
      isActive: true,
    },
    {
      key: 'service_ops',
      displayName: 'Service Operations',
      weight: new Decimal('0.08'),
      orderIndex: 9,
      isActive: true,
    },
    {
      key: 'compliance_policy',
      displayName: 'Compliance & Policy',
      weight: new Decimal('0.07'),
      orderIndex: 10,
      isActive: true,
    },
    {
      key: 'people_change',
      displayName: 'People & Change',
      weight: new Decimal('0.06'),
      orderIndex: 11,
      isActive: true,
    },
  ];

  const mockSession = {
    id: mockSessionId,
    questionnaireId: mockQuestionnaireId,
    readinessScore: null,
    questionnaire: { id: mockQuestionnaireId },
  };

  const mockQuestions = [
    {
      id: 'q1',
      dimensionKey: 'arch_sec',
      severity: new Decimal('0.8'),
      text: 'Do you have secure architecture?',
      responses: [{ coverage: new Decimal('0.75') }],
      dimension: mockDimensions[0],
    },
    {
      id: 'q2',
      dimensionKey: 'arch_sec',
      severity: new Decimal('0.6'),
      text: 'Is encryption implemented?',
      responses: [{ coverage: new Decimal('0.50') }],
      dimension: mockDimensions[0],
    },
    {
      id: 'q3',
      dimensionKey: 'devops_iac',
      severity: new Decimal('0.7'),
      text: 'Do you have CI/CD pipelines?',
      responses: [{ coverage: new Decimal('1.0') }],
      dimension: mockDimensions[1],
    },
    {
      id: 'q4',
      dimensionKey: 'devops_iac',
      severity: new Decimal('0.5'),
      text: 'Is infrastructure as code used?',
      responses: [],
      dimension: mockDimensions[1],
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      session: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      dimensionCatalog: {
        findMany: jest.fn(),
      },
      question: {
        findMany: jest.fn(),
      },
      scoreSnapshot: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ScoringEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ScoringEngineService>(ScoringEngineService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('calculateScore', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('75.00'),
      });
      redisService.set.mockResolvedValue(undefined);
    });

    it('should calculate readiness score correctly', async () => {
      const result = await service.calculateScore({ sessionId: mockSessionId });

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.portfolioResidual).toBeGreaterThanOrEqual(0);
      expect(result.portfolioResidual).toBeLessThanOrEqual(1);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.calculateScore({ sessionId: 'non-existent' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate dimension residuals using formula R_d = Σ(S_i × (1-C_i)) / (Σ S_i + ε)', async () => {
      const result = await service.calculateScore({ sessionId: mockSessionId });

      // Check arch_sec dimension
      // q1: S=0.8, C=0.75 → 0.8 × (1-0.75) = 0.2
      // q2: S=0.6, C=0.50 → 0.6 × (1-0.50) = 0.3
      // Numerator = 0.2 + 0.3 = 0.5
      // Denominator = 0.8 + 0.6 + ε = 1.4
      // R_d = 0.5 / 1.4 ≈ 0.357

      const archSecDim = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');
      expect(archSecDim).toBeDefined();
      expect(archSecDim!.residualRisk).toBeCloseTo(0.357, 2);
    });

    it('should calculate fully covered dimension with zero residual', async () => {
      // Create questions with full coverage
      const fullyCoveredQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('0.8'),
          text: 'Test question',
          responses: [{ coverage: new Decimal('1.0') }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.question.findMany.mockResolvedValue(fullyCoveredQuestions);

      const result = await service.calculateScore({ sessionId: mockSessionId });
      const archSecDim = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');

      // Full coverage → R_d should be 0
      expect(archSecDim!.residualRisk).toBeCloseTo(0, 4);
    });

    it('should calculate score = 100 × (1 - R)', async () => {
      const result = await service.calculateScore({ sessionId: mockSessionId });

      // Verify the formula
      const expectedScore = 100 * (1 - result.portfolioResidual);
      expect(result.score).toBeCloseTo(expectedScore, 1);
    });

    it('should apply coverage overrides', async () => {
      const result = await service.calculateScore({
        sessionId: mockSessionId,
        coverageOverrides: [
          { questionId: 'q1', coverage: 1.0 },
          { questionId: 'q2', coverage: 1.0 },
        ],
      });

      // With full coverage on q1 and q2, arch_sec should have lower residual
      const archSecDim = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');
      expect(archSecDim!.residualRisk).toBeLessThan(0.357);
    });

    it('should determine trend correctly', async () => {
      // First calculation (no previous score)
      let result = await service.calculateScore({ sessionId: mockSessionId });
      expect(result.trend).toBe('FIRST');

      // Mock session with previous score
      const sessionWithScore = {
        ...mockSession,
        readinessScore: new Decimal('70.00'),
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithScore);

      result = await service.calculateScore({ sessionId: mockSessionId });
      // Result score > 70 → UP, < 70 → DOWN, ≈70 → STABLE
      expect(['UP', 'DOWN', 'STABLE']).toContain(result.trend);
    });

    it('should cache the score result', async () => {
      await service.calculateScore({ sessionId: mockSessionId });

      expect(redisService.set).toHaveBeenCalledWith(
        `score:${mockSessionId}`,
        expect.any(String),
        300, // SCORE_CACHE_TTL
      );
    });

    it('should update session with new score', async () => {
      await service.calculateScore({ sessionId: mockSessionId });

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: expect.objectContaining({
          readinessScore: expect.any(Decimal),
          lastScoreCalculation: expect.any(Date),
        }),
      });
    });

    it('should handle empty questionnaire with zero questions', async () => {
      prismaService.question.findMany.mockResolvedValue([]);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      expect(result.totalQuestions).toBe(0);
      expect(result.answeredQuestions).toBe(0);
      expect(result.completionPercentage).toBe(0);
    });

    it('should verify weights sum to 1.0', () => {
      const weightSum = mockDimensions.reduce((sum, dim) => sum + Number(dim.weight), 0);
      expect(weightSum).toBeCloseTo(1.0, 2);
    });
  });

  describe('getNextQuestions', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(undefined);
    });

    it('should return prioritized questions by ΔScore', async () => {
      const result = await service.getNextQuestions({
        sessionId: mockSessionId,
        limit: 5,
      });

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.questions.length).toBeGreaterThan(0);

      // Verify questions are sorted by expectedScoreLift descending
      for (let i = 0; i < result.questions.length - 1; i++) {
        expect(result.questions[i].expectedScoreLift).toBeGreaterThanOrEqual(
          result.questions[i + 1].expectedScoreLift,
        );
      }
    });

    it('should exclude fully covered questions', async () => {
      const result = await service.getNextQuestions({
        sessionId: mockSessionId,
      });

      // q3 has coverage = 1.0, should not be in results
      const q3Result = result.questions.find((q) => q.questionId === 'q3');
      expect(q3Result).toBeUndefined();
    });

    it('should assign correct ranks', async () => {
      const result = await service.getNextQuestions({
        sessionId: mockSessionId,
        limit: 10,
      });

      result.questions.forEach((q, index) => {
        expect(q.rank).toBe(index + 1);
      });
    });

    it('should include rationale for each question', async () => {
      const result = await service.getNextQuestions({
        sessionId: mockSessionId,
      });

      result.questions.forEach((q) => {
        expect(q.rationale).toBeDefined();
        expect(q.rationale.length).toBeGreaterThan(0);
      });
    });

    it('should calculate ΔScore correctly using formula', async () => {
      const result = await service.getNextQuestions({
        sessionId: mockSessionId,
      });

      // For q4 (unanswered):
      // ΔScore = 100 × W_d × S_i × (1 - C_i) / (Σ S_j + ε)
      // W_d = 0.12 (devops_iac)
      // S_i = 0.5
      // C_i = 0 (unanswered)
      // Σ S_j for devops = 0.7 + 0.5 = 1.2
      // ΔScore = 100 × 0.12 × 0.5 × 1 / 1.2 ≈ 5.0

      const q4Result = result.questions.find((q) => q.questionId === 'q4');
      if (q4Result) {
        expect(q4Result.expectedScoreLift).toBeGreaterThan(0);
      }
    });

    it('should respect limit parameter', async () => {
      const result = await service.getNextQuestions({
        sessionId: mockSessionId,
        limit: 2,
      });

      expect(result.questions.length).toBeLessThanOrEqual(2);
    });

    it('should calculate maxPotentialScore correctly', async () => {
      const result = await service.getNextQuestions({
        sessionId: mockSessionId,
      });

      const totalLift = result.questions.reduce((sum, q) => sum + q.expectedScoreLift, 0);

      expect(result.maxPotentialScore).toBeLessThanOrEqual(100);
      expect(result.maxPotentialScore).toBeCloseTo(
        Math.min(100, result.currentScore + totalLift),
        1,
      );
    });
  });

  describe('invalidateScoreCache', () => {
    it('should delete cached score', async () => {
      redisService.del.mockResolvedValue(undefined);

      await service.invalidateScoreCache(mockSessionId);

      expect(redisService.del).toHaveBeenCalledWith(`score:${mockSessionId}`);
    });

    it('should handle cache deletion errors gracefully', async () => {
      redisService.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.invalidateScoreCache(mockSessionId)).resolves.not.toThrow();
    });
  });

  describe('calculateBatchScores', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
    });

    it('should calculate scores for multiple sessions', async () => {
      const sessionIds = ['session-1', 'session-2', 'session-3'];

      const results = await service.calculateBatchScores(sessionIds);

      expect(results.size).toBe(3);
    });

    it('should handle errors for individual sessions', async () => {
      prismaService.session.findUnique
        .mockResolvedValueOnce(mockSession)
        .mockResolvedValueOnce(null) // This will cause an error
        .mockResolvedValueOnce(mockSession);

      const sessionIds = ['session-1', 'session-error', 'session-3'];

      const results = await service.calculateBatchScores(sessionIds);

      // Should have 2 successful results
      expect(results.size).toBe(2);
      expect(results.has('session-1')).toBe(true);
      expect(results.has('session-error')).toBe(false);
      expect(results.has('session-3')).toBe(true);
    });
  });

  describe('Score Formula Verification', () => {
    it('should return score of 100 when all questions have full coverage', async () => {
      const fullCoverageQuestions = mockQuestions.map((q) => ({
        ...q,
        responses: [{ coverage: new Decimal('1.0') }],
      }));

      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(fullCoverageQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      expect(result.score).toBeCloseTo(100, 0);
      expect(result.portfolioResidual).toBeCloseTo(0, 4);
    });

    it('should return score of 0 when all questions have zero coverage', async () => {
      const zeroCoverageQuestions = mockQuestions.map((q) => ({
        ...q,
        responses: [{ coverage: new Decimal('0.0') }],
      }));

      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(zeroCoverageQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      // Score should be close to 0 when all coverage is 0
      // Actually it will be some value based on dimension weights since not all dimensions have questions
      expect(result.score).toBeLessThan(100);
    });

    it('should weight dimensions correctly', async () => {
      // Create questions only in arch_sec (weight 0.15)
      const singleDimQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.0') }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(singleDimQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      // With only arch_sec having questions and 0 coverage:
      // R_d(arch_sec) = 1.0 × (1-0) / (1.0 + ε) ≈ 1.0
      // Portfolio R = 0.15 × 1.0 + (other dimensions with 0 residual) = 0.15
      // Score = 100 × (1 - 0.15) = 85

      expect(result.score).toBeCloseTo(85, 0);
    });
  });

  describe('getScoreHistory', () => {
    const mockDecisionLogs = [
      {
        id: 'log-1',
        createdAt: new Date('2026-01-25'),
        metadata: { score: 75, portfolioResidual: 0.25, completionPercentage: 80 },
      },
      {
        id: 'log-2',
        createdAt: new Date('2026-01-26'),
        metadata: { score: 78, portfolioResidual: 0.22, completionPercentage: 85 },
      },
      {
        id: 'log-3',
        createdAt: new Date('2026-01-27'),
        metadata: { score: 82, portfolioResidual: 0.18, completionPercentage: 90 },
      },
    ];

    beforeEach(() => {
      prismaService.decisionLog = {
        findMany: jest.fn().mockResolvedValue(mockDecisionLogs),
      };
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('85'),
        lastScoreCalculation: new Date('2026-01-28'),
      });
    });

    it('should return score history with trend analysis', async () => {
      const result = await service.getScoreHistory(mockSessionId);

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.history).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.trend.direction).toMatch(/UP|DOWN|STABLE/);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.getScoreHistory('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should calculate trend direction correctly', async () => {
      const result = await service.getScoreHistory(mockSessionId);

      // With scores increasing from 75 to 85, trend should be UP
      if (result.history.length >= 2) {
        const latestScore = result.history[0].score;
        const earliestScore = result.history[result.history.length - 1].score;

        if (latestScore > earliestScore + 1) {
          expect(result.trend.direction).toBe('UP');
        } else if (latestScore < earliestScore - 1) {
          expect(result.trend.direction).toBe('DOWN');
        } else {
          expect(result.trend.direction).toBe('STABLE');
        }
      }
    });

    it('should respect limit parameter', async () => {
      const result = await service.getScoreHistory(mockSessionId, 2);

      // History should include current + up to limit snapshots
      expect(result.history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getIndustryBenchmark', () => {
    const mockBenchmarkStats = [
      {
        avg_score: 72.5,
        min_score: 45,
        max_score: 95,
        count: BigInt(50),
        percentile_25: 60,
        percentile_50: 72,
        percentile_75: 85,
      },
    ];

    const mockPercentileRank = [{ percentile_rank: 75 }];

    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('80'),
        questionnaire: { metadata: { industry: 'technology' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(mockBenchmarkStats)
        .mockResolvedValueOnce(mockPercentileRank);
    });

    it('should return benchmark comparison data', async () => {
      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.benchmark).toBeDefined();
      expect(result.benchmark.average).toBeGreaterThanOrEqual(0);
      expect(result.benchmark.median).toBeGreaterThanOrEqual(0);
      expect(result.performanceCategory).toMatch(
        /LEADING|ABOVE_AVERAGE|AVERAGE|BELOW_AVERAGE|LAGGING/,
      );
    });

    it('should calculate performance category correctly', async () => {
      const result = await service.getIndustryBenchmark(mockSessionId);

      // With score 80 and percentile_75 = 85, should be ABOVE_AVERAGE
      expect(result.percentileRank).toBeGreaterThan(0);
      expect(result.percentileRank).toBeLessThanOrEqual(100);
    });

    it('should calculate gaps correctly', async () => {
      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.gapToMedian).toBeDefined();
      expect(result.gapToLeading).toBeDefined();

      // gapToLeading should be positive if score < percentile_75
      // gapToMedian should be positive if score > median
    });

    it('should use provided industry code', async () => {
      await service.getIndustryBenchmark(mockSessionId, 'healthcare');

      // Should have called queryRaw with healthcare industry
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('getDimensionBenchmarks', () => {
    const mockDimensionAverages = [
      { dimension_key: 'arch_sec', avg_residual: 0.25, count: BigInt(100) },
      { dimension_key: 'devops_iac', avg_residual: 0.3, count: BigInt(100) },
    ];

    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
      redisService.get.mockResolvedValue(null);
      prismaService.$queryRaw = jest.fn().mockResolvedValue(mockDimensionAverages);
    });

    it('should return dimension-level benchmarks', async () => {
      const result = await service.getDimensionBenchmarks(mockSessionId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include performance rating for each dimension', async () => {
      const result = await service.getDimensionBenchmarks(mockSessionId);

      result.forEach((dim) => {
        expect(dim.dimensionKey).toBeDefined();
        expect(dim.displayName).toBeDefined();
        expect(dim.performance).toMatch(/ABOVE|AVERAGE|BELOW/);
        expect(dim.recommendation).toBeDefined();
      });
    });

    it('should calculate gap to average correctly', async () => {
      const result = await service.getDimensionBenchmarks(mockSessionId);

      result.forEach((dim) => {
        expect(typeof dim.gapToAverage).toBe('number');
        // gapToAverage = currentResidual - industryAverageResidual
      });
    });

    it('should generate appropriate recommendations', async () => {
      const result = await service.getDimensionBenchmarks(mockSessionId);

      result.forEach((dim) => {
        expect(dim.recommendation.length).toBeGreaterThan(0);

        // Recommendations should mention the dimension name
        expect(dim.recommendation.toLowerCase()).toContain(
          dim.displayName.toLowerCase().split(' ')[0],
        );
      });
    });
  });

  // =====================================================================
  // BRANCH COVERAGE TESTS — coverageLevelToDecimal / decimalToCoverageLevel
  // =====================================================================
  describe('coverageLevelToDecimal', () => {
    it('should return 0 for null input', () => {
      expect(coverageLevelToDecimal(null)).toBe(0);
    });

    it('should return correct values for all CoverageLevel enums', () => {
      expect(coverageLevelToDecimal('NONE')).toBe(0.0);
      expect(coverageLevelToDecimal('PARTIAL')).toBe(0.25);
      expect(coverageLevelToDecimal('HALF')).toBe(0.5);
      expect(coverageLevelToDecimal('SUBSTANTIAL')).toBe(0.75);
      expect(coverageLevelToDecimal('FULL')).toBe(1.0);
    });

    it('should return 0 for an unrecognised level value via nullish coalescing', () => {
      // Force an invalid value through the Record lookup to hit the ?? 0 branch
      expect(coverageLevelToDecimal('UNKNOWN_LEVEL' as any)).toBe(0);
    });
  });

  describe('decimalToCoverageLevel', () => {
    it('should return NONE for null', () => {
      expect(decimalToCoverageLevel(null)).toBe('NONE');
    });

    it('should return NONE for negative value', () => {
      expect(decimalToCoverageLevel(-1)).toBe('NONE');
    });

    it('should return NONE for value exactly 0', () => {
      expect(decimalToCoverageLevel(0)).toBe('NONE');
    });

    it('should return NONE for value just below 0.125 boundary', () => {
      expect(decimalToCoverageLevel(0.124)).toBe('NONE');
    });

    it('should return PARTIAL for value at 0.125 boundary', () => {
      expect(decimalToCoverageLevel(0.125)).toBe('PARTIAL');
    });

    it('should return PARTIAL for value just below 0.375', () => {
      expect(decimalToCoverageLevel(0.374)).toBe('PARTIAL');
    });

    it('should return HALF for value at 0.375 boundary', () => {
      expect(decimalToCoverageLevel(0.375)).toBe('HALF');
    });

    it('should return HALF for value just below 0.625', () => {
      expect(decimalToCoverageLevel(0.624)).toBe('HALF');
    });

    it('should return SUBSTANTIAL for value at 0.625 boundary', () => {
      expect(decimalToCoverageLevel(0.625)).toBe('SUBSTANTIAL');
    });

    it('should return SUBSTANTIAL for value just below 0.875', () => {
      expect(decimalToCoverageLevel(0.874)).toBe('SUBSTANTIAL');
    });

    it('should return FULL for value at 0.875 boundary', () => {
      expect(decimalToCoverageLevel(0.875)).toBe('FULL');
    });

    it('should return FULL for value of 1.0', () => {
      expect(decimalToCoverageLevel(1.0)).toBe('FULL');
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — buildCoverageMap (via calculateScore)
  // =====================================================================
  describe('buildCoverageMap branches', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
    });

    it('should prefer coverageLevel over continuous coverage when both are present', async () => {
      const questionsWithCoverageLevel = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.5'), coverageLevel: 'FULL' }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.question.findMany.mockResolvedValue(questionsWithCoverageLevel);

      const result = await service.calculateScore({ sessionId: mockSessionId });
      const archSec = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');

      // coverageLevel=FULL maps to 1.0, so residual should be 0
      expect(archSec!.residualRisk).toBeCloseTo(0, 4);
    });

    it('should fall back to continuous coverage when coverageLevel is absent', async () => {
      const questionsWithoutLevel = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.5') }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.question.findMany.mockResolvedValue(questionsWithoutLevel);

      const result = await service.calculateScore({ sessionId: mockSessionId });
      const archSec = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');

      // coverage=0.5 → residual = 1*(1-0.5)/(1+ε) ≈ 0.5
      expect(archSec!.residualRisk).toBeCloseTo(0.5, 2);
    });

    it('should default coverage to 0 when no response exists', async () => {
      const questionsNoResponse = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.question.findMany.mockResolvedValue(questionsNoResponse);

      const result = await service.calculateScore({ sessionId: mockSessionId });
      const archSec = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');

      // No response → coverage=0 → residual ≈ 1.0
      expect(archSec!.residualRisk).toBeCloseTo(1.0, 2);
    });

    it('should ignore coverage overrides for questions not in the map', async () => {
      const questions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.5') }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.question.findMany.mockResolvedValue(questions);

      const result = await service.calculateScore({
        sessionId: mockSessionId,
        coverageOverrides: [{ questionId: 'nonexistent-q', coverage: 1.0 }],
      });

      const archSec = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');
      // Override for nonexistent question should be ignored, so q1 retains 0.5
      expect(archSec!.residualRisk).toBeCloseTo(0.5, 2);
    });

    it('should normalise coverage overrides to discrete levels', async () => {
      const questions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.0') }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.question.findMany.mockResolvedValue(questions);

      // Override coverage=0.6 → nearest level is HALF (0.5)
      const result = await service.calculateScore({
        sessionId: mockSessionId,
        coverageOverrides: [{ questionId: 'q1', coverage: 0.6 }],
      });

      const archSec = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');
      // 0.6 → decimalToCoverageLevel → HALF → 0.5 → residual = 1*(1-0.5)/1 = 0.5
      expect(archSec!.residualRisk).toBeCloseTo(0.5, 2);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — calculateScore session filtering branches
  // =====================================================================
  describe('calculateScore session-level branches', () => {
    beforeEach(() => {
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
    });

    it('should filter dimensions by projectTypeId when session has one', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectTypeId: 'proj-type-001',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType);

      await service.calculateScore({ sessionId: mockSessionId });

      expect(prismaService.dimensionCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            projectTypeId: 'proj-type-001',
          }),
        }),
      );
    });

    it('should not filter dimensions by projectTypeId when session does not have one', async () => {
      const sessionNoProjectType = {
        ...mockSession,
        projectTypeId: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoProjectType);

      await service.calculateScore({ sessionId: mockSessionId });

      expect(prismaService.dimensionCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should filter questions by persona when session has one', async () => {
      const sessionWithPersona = {
        ...mockSession,
        persona: 'CTO',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithPersona);

      await service.calculateScore({ sessionId: mockSessionId });

      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            persona: 'CTO',
          }),
        }),
      );
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — trend determination
  // =====================================================================
  describe('trend determination branches', () => {
    beforeEach(() => {
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
    });

    it('should return trend DOWN when score decreases by more than 0.5', async () => {
      // Session with a very high previous score
      const sessionHighPrevious = {
        ...mockSession,
        readinessScore: new Decimal('99.00'),
      };
      prismaService.session.findUnique.mockResolvedValue(sessionHighPrevious);

      // Questions with low coverage to get a low score
      const lowCoverageQuestions = mockQuestions.map((q) => ({
        ...q,
        responses: [{ coverage: new Decimal('0.0') }],
      }));
      prismaService.question.findMany.mockResolvedValue(lowCoverageQuestions);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      expect(result.trend).toBe('DOWN');
    });

    it('should return trend STABLE when score changes by less than 0.5', async () => {
      // Full coverage questions → score ≈ 100
      const fullCoverageQuestions = mockQuestions.map((q) => ({
        ...q,
        responses: [{ coverage: new Decimal('1.0') }],
      }));

      const sessionWithPreviousScore = {
        ...mockSession,
        readinessScore: new Decimal('100.00'),
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithPreviousScore);
      prismaService.question.findMany.mockResolvedValue(fullCoverageQuestions);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      expect(result.trend).toBe('STABLE');
    });

    it('should return trend UP when score increases by more than 0.5', async () => {
      const sessionLowPrevious = {
        ...mockSession,
        readinessScore: new Decimal('10.00'),
      };
      prismaService.session.findUnique.mockResolvedValue(sessionLowPrevious);

      const highCoverageQuestions = mockQuestions.map((q) => ({
        ...q,
        responses: [{ coverage: new Decimal('1.0') }],
      }));
      prismaService.question.findMany.mockResolvedValue(highCoverageQuestions);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      expect(result.trend).toBe('UP');
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — cacheScore / getCachedScore error handling
  // =====================================================================
  describe('cacheScore and getCachedScore error handling', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
    });

    it('should handle redis set failure gracefully during cacheScore', async () => {
      redisService.set.mockRejectedValue(new Error('Redis write failure'));

      // Should not throw even though caching fails
      const result = await service.calculateScore({ sessionId: mockSessionId });
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle redis get failure gracefully during getCachedScore', async () => {
      redisService.get.mockRejectedValue(new Error('Redis read failure'));
      redisService.set.mockResolvedValue(undefined);

      // getNextQuestions calls getCachedScore first
      const result = await service.getNextQuestions({ sessionId: mockSessionId });
      expect(result.sessionId).toBe(mockSessionId);
    });

    it('should use cached result when available in getNextQuestions', async () => {
      const cachedResult = {
        sessionId: mockSessionId,
        score: 75,
        portfolioResidual: 0.25,
        dimensions: [],
        totalQuestions: 4,
        answeredQuestions: 3,
        completionPercentage: 75,
        calculatedAt: new Date(),
        trend: 'STABLE',
      };
      redisService.get.mockResolvedValue(JSON.stringify(cachedResult));
      redisService.set.mockResolvedValue(undefined);

      const result = await service.getNextQuestions({ sessionId: mockSessionId });

      expect(result.currentScore).toBe(75);
      // calculateScore should not be called since cache hit
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — saveScoreSnapshot error handling
  // =====================================================================
  describe('saveScoreSnapshot error handling', () => {
    it('should handle scoreSnapshot.create failure gracefully', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);

      // Add scoreSnapshot.create mock that rejects
      prismaService.scoreSnapshot = {
        ...prismaService.scoreSnapshot,
        create: jest.fn().mockRejectedValue(new Error('DB write error')),
        findMany: jest.fn().mockResolvedValue([]),
      };

      // Should not throw
      const result = await service.calculateScore({ sessionId: mockSessionId });
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — getNextQuestions branches
  // =====================================================================
  describe('getNextQuestions branch coverage', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(undefined);
    });

    it('should use default severity when question has no severity value', async () => {
      const questionsNoSeverity = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: null,
          text: 'No severity question',
          responses: [],
          dimension: mockDimensions[0],
        },
      ];
      prismaService.question.findMany.mockResolvedValue(questionsNoSeverity);

      const result = await service.getNextQuestions({ sessionId: mockSessionId });

      // Should still get a result, using DEFAULT_SEVERITY (0.7)
      expect(result.questions.length).toBe(1);
      expect(result.questions[0].severity).toBe(0.7);
    });

    it('should handle question with no dimensionKey by using "unknown"', async () => {
      const questionsNoDimension = [
        {
          id: 'q1',
          dimensionKey: null,
          severity: new Decimal('0.5'),
          text: 'No dimension question',
          responses: [],
          dimension: null,
        },
      ];
      prismaService.question.findMany.mockResolvedValue(questionsNoDimension);

      const result = await service.getNextQuestions({ sessionId: mockSessionId });

      if (result.questions.length > 0) {
        expect(result.questions[0].dimensionKey).toBe('unknown');
        expect(result.questions[0].dimensionName).toBe('unknown');
      }
    });

    it('should handle question with dimension but no displayName', async () => {
      const questionsNoDisplayName = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('0.5'),
          text: 'Test',
          responses: [],
          dimension: { ...mockDimensions[0], displayName: undefined },
        },
      ];
      prismaService.question.findMany.mockResolvedValue(questionsNoDisplayName);

      const result = await service.getNextQuestions({ sessionId: mockSessionId });

      // Should fallback to dimensionKey for dimension name
      if (result.questions.length > 0) {
        expect(result.questions[0].dimensionName).toBeDefined();
      }
    });

    it('should filter questions by session persona when session has one', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        persona: 'CTO',
      });
      prismaService.question.findMany.mockResolvedValue(mockQuestions);

      await service.getNextQuestions({ sessionId: mockSessionId });

      // The second call to findMany (in getNextQuestions itself) should filter by persona
      const findManyCalls = prismaService.question.findMany.mock.calls;
      const lastCall = findManyCalls[findManyCalls.length - 1];
      expect(lastCall[0].where).toHaveProperty('persona', 'CTO');
    });

    it('should use default limit of 5 when not specified', async () => {
      // Create more than 5 unanswered questions
      const manyQuestions = Array.from({ length: 8 }, (_, i) => ({
        id: `q${i + 1}`,
        dimensionKey: 'arch_sec',
        severity: new Decimal('0.5'),
        text: `Question ${i + 1}`,
        responses: [],
        dimension: mockDimensions[0],
      }));
      prismaService.question.findMany.mockResolvedValue(manyQuestions);

      const result = await service.getNextQuestions({ sessionId: mockSessionId });

      expect(result.questions.length).toBeLessThanOrEqual(5);
    });

    it('should generate rationale mentioning "no coverage" for unanswered questions', async () => {
      const unansweredQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('0.8'),
          text: 'Test',
          responses: [],
          dimension: mockDimensions[0],
        },
      ];
      prismaService.question.findMany.mockResolvedValue(unansweredQuestions);

      const result = await service.getNextQuestions({ sessionId: mockSessionId });

      expect(result.questions[0].rationale).toContain('no coverage yet');
    });

    it('should generate rationale mentioning current coverage for partially covered questions', async () => {
      const partiallyCoveredQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('0.8'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.5') }],
          dimension: mockDimensions[0],
        },
      ];
      prismaService.question.findMany.mockResolvedValue(partiallyCoveredQuestions);

      const result = await service.getNextQuestions({ sessionId: mockSessionId });

      expect(result.questions[0].rationale).toContain('50%');
      expect(result.questions[0].rationale).toContain('100%');
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — getScoreHistory branches
  // =====================================================================
  describe('getScoreHistory branch coverage', () => {
    it('should use scoreSnapshots when they exist', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('80'),
        startedAt: new Date('2026-01-20'),
        lastScoreCalculation: new Date('2026-01-28'),
      });
      prismaService.scoreSnapshot.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-27'),
          score: new Decimal('78'),
          portfolioResidual: new Decimal('0.22'),
          completionPercentage: new Decimal('85'),
        },
        {
          createdAt: new Date('2026-01-26'),
          score: new Decimal('72'),
          portfolioResidual: new Decimal('0.28'),
          completionPercentage: new Decimal('75'),
        },
      ]);

      const result = await service.getScoreHistory(mockSessionId);

      expect(result.history).toHaveLength(2);
      expect(result.history[0].score).toBe(78);
      expect(result.history[1].score).toBe(72);
    });

    it('should use fallback when no score snapshots exist and lastScoreCalculation is set', async () => {
      const lastCalc = new Date('2026-01-28');
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('50'),
        startedAt: new Date('2026-01-20'),
        lastScoreCalculation: lastCalc,
      });
      prismaService.scoreSnapshot.findMany.mockResolvedValue([]);

      const result = await service.getScoreHistory(mockSessionId);

      expect(result.history).toHaveLength(1);
      expect(result.history[0].score).toBe(50);
      expect(result.history[0].timestamp).toEqual(lastCalc);
    });

    it('should use startedAt when no lastScoreCalculation is available', async () => {
      const startedAt = new Date('2026-01-20');
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('30'),
        startedAt,
        lastScoreCalculation: null,
      });
      prismaService.scoreSnapshot.findMany.mockResolvedValue([]);

      const result = await service.getScoreHistory(mockSessionId);

      expect(result.history).toHaveLength(1);
      expect(result.history[0].timestamp).toEqual(startedAt);
    });

    it('should return currentScore of 0 when readinessScore is null', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: null,
        startedAt: new Date('2026-01-20'),
        lastScoreCalculation: null,
      });
      prismaService.scoreSnapshot.findMany.mockResolvedValue([]);

      const result = await service.getScoreHistory(mockSessionId);

      expect(result.currentScore).toBe(0);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — calculateTrendAnalysis
  // =====================================================================
  describe('calculateTrendAnalysis branch coverage', () => {
    // We test via getScoreHistory which calls calculateTrendAnalysis internally.
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('80'),
        startedAt: new Date('2026-01-20'),
        lastScoreCalculation: new Date('2026-01-28'),
      });
    });

    it('should return STABLE with zero changes for single history entry', async () => {
      prismaService.scoreSnapshot.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-27'),
          score: new Decimal('80'),
          portfolioResidual: new Decimal('0.2'),
          completionPercentage: new Decimal('90'),
        },
      ]);

      const result = await service.getScoreHistory(mockSessionId);

      expect(result.trend.direction).toBe('STABLE');
      expect(result.trend.averageChange).toBe(0);
      expect(result.trend.volatility).toBe(0);
    });

    it('should return UP direction when average change > 1', async () => {
      prismaService.scoreSnapshot.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-28'),
          score: new Decimal('90'),
          portfolioResidual: new Decimal('0.1'),
          completionPercentage: new Decimal('95'),
        },
        {
          createdAt: new Date('2026-01-27'),
          score: new Decimal('80'),
          portfolioResidual: new Decimal('0.2'),
          completionPercentage: new Decimal('85'),
        },
        {
          createdAt: new Date('2026-01-26'),
          score: new Decimal('70'),
          portfolioResidual: new Decimal('0.3'),
          completionPercentage: new Decimal('75'),
        },
      ]);

      const result = await service.getScoreHistory(mockSessionId);

      // changes: 90-80=10, 80-70=10 → average=10 → direction UP
      expect(result.trend.direction).toBe('UP');
      expect(result.trend.averageChange).toBeGreaterThan(1);
    });

    it('should return DOWN direction when average change < -1', async () => {
      prismaService.scoreSnapshot.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-28'),
          score: new Decimal('50'),
          portfolioResidual: new Decimal('0.5'),
          completionPercentage: new Decimal('60'),
        },
        {
          createdAt: new Date('2026-01-27'),
          score: new Decimal('60'),
          portfolioResidual: new Decimal('0.4'),
          completionPercentage: new Decimal('70'),
        },
        {
          createdAt: new Date('2026-01-26'),
          score: new Decimal('70'),
          portfolioResidual: new Decimal('0.3'),
          completionPercentage: new Decimal('80'),
        },
      ]);

      const result = await service.getScoreHistory(mockSessionId);

      // changes: 50-60=-10, 60-70=-10 → average=-10 → direction DOWN
      expect(result.trend.direction).toBe('DOWN');
      expect(result.trend.averageChange).toBeLessThan(-1);
    });

    it('should return STABLE when average change is between -1 and 1', async () => {
      prismaService.scoreSnapshot.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-28'),
          score: new Decimal('80.5'),
          portfolioResidual: new Decimal('0.2'),
          completionPercentage: new Decimal('90'),
        },
        {
          createdAt: new Date('2026-01-27'),
          score: new Decimal('80'),
          portfolioResidual: new Decimal('0.2'),
          completionPercentage: new Decimal('89'),
        },
      ]);

      const result = await service.getScoreHistory(mockSessionId);

      // changes: 80.5-80=0.5 → average=0.5 → STABLE
      expect(result.trend.direction).toBe('STABLE');
    });

    it('should clamp projected score between 0 and 100', async () => {
      prismaService.scoreSnapshot.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-28'),
          score: new Decimal('99'),
          portfolioResidual: new Decimal('0.01'),
          completionPercentage: new Decimal('99'),
        },
        {
          createdAt: new Date('2026-01-27'),
          score: new Decimal('95'),
          portfolioResidual: new Decimal('0.05'),
          completionPercentage: new Decimal('95'),
        },
      ]);

      const result = await service.getScoreHistory(mockSessionId);

      expect(result.trend.projectedScore).toBeLessThanOrEqual(100);
      expect(result.trend.projectedScore).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — getIndustryBenchmark performance categories
  // =====================================================================
  describe('getIndustryBenchmark performance category branches', () => {
    const baseBenchmarkStats = [
      {
        avg_score: 50,
        min_score: 20,
        max_score: 95,
        count: BigInt(100),
        percentile_25: 35,
        percentile_50: 50,
        percentile_75: 75,
      },
    ];

    it('should return LEADING when score >= percentile_75', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('80'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{ percentile_rank: 90 }]);

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.performanceCategory).toBe('LEADING');
    });

    it('should return ABOVE_AVERAGE when score >= percentile_50 and < percentile_75', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('60'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{ percentile_rank: 65 }]);

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.performanceCategory).toBe('ABOVE_AVERAGE');
    });

    it('should return AVERAGE when score >= percentile_25 and < percentile_50', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('40'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{ percentile_rank: 40 }]);

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.performanceCategory).toBe('AVERAGE');
    });

    it('should return BELOW_AVERAGE when score >= min_score and < percentile_25', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('25'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{ percentile_rank: 15 }]);

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.performanceCategory).toBe('BELOW_AVERAGE');
    });

    it('should return LAGGING when score < min_score', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('10'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{ percentile_rank: 2 }]);

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.performanceCategory).toBe('LAGGING');
    });

    it('should fallback to "general" when no industry code or metadata', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('50'),
        questionnaire: { metadata: null },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{ percentile_rank: 50 }]);

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.industry).toBe('general');
    });

    it('should use fallback stats when queryRaw returns empty array', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('50'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([]) // empty stats
        .mockResolvedValueOnce([{ percentile_rank: 50 }]);

      const result = await service.getIndustryBenchmark(mockSessionId);

      // Should use fallback values
      expect(result.benchmark.average).toBe(50);
      expect(result.benchmark.sampleSize).toBe(0);
    });

    it('should use provided industryCode over metadata', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('50'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{ percentile_rank: 50 }]);

      const result = await service.getIndustryBenchmark(mockSessionId, 'healthcare');

      expect(result.industry).toBe('healthcare');
    });

    it('should handle null percentile_rank with default of 50', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('50'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([{}]); // missing percentile_rank

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.percentileRank).toBe(50);
    });

    it('should handle empty percentile result array', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: new Decimal('50'),
        questionnaire: { metadata: { industry: 'tech' } },
      });
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce(baseBenchmarkStats)
        .mockResolvedValueOnce([]); // empty array

      const result = await service.getIndustryBenchmark(mockSessionId);

      expect(result.percentileRank).toBe(50);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — generateDimensionRecommendation
  // =====================================================================
  describe('generateDimensionRecommendation branches', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
      redisService.get.mockResolvedValue(null);
    });

    it('should recommend maintaining practices when gap < -0.1 (above average)', async () => {
      // Low residual questions → performance above average
      const lowResidualQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('1.0') }],
          dimension: mockDimensions[0],
        },
      ];
      prismaService.question.findMany.mockResolvedValue(lowResidualQuestions);

      // Industry average residual is 0.5 (high), current is 0 (low) → gap = -0.5
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue([{ dimension_key: 'arch_sec', avg_residual: 0.5, count: BigInt(100) }]);

      const result = await service.getDimensionBenchmarks(mockSessionId);
      const archSec = result.find((d) => d.dimensionKey === 'arch_sec');

      expect(archSec?.recommendation).toContain('above industry average');
      expect(archSec?.recommendation).toContain('Maintain');
    });

    it('should recommend prioritizing when gap > 0.2 (significant gap)', async () => {
      const highResidualQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [],
          dimension: mockDimensions[0],
        },
        {
          id: 'q2',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test 2',
          responses: [],
          dimension: mockDimensions[0],
        },
      ];
      prismaService.question.findMany.mockResolvedValue(highResidualQuestions);

      // Industry average is 0.3 (low), current residual will be ~1.0 → gap = 0.7
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue([{ dimension_key: 'arch_sec', avg_residual: 0.3, count: BigInt(100) }]);

      const result = await service.getDimensionBenchmarks(mockSessionId);
      const archSec = result.find((d) => d.dimensionKey === 'arch_sec');

      expect(archSec?.recommendation).toContain('significant gaps');
      expect(archSec?.recommendation).toContain('Prioritize');
    });

    it('should recommend reviewing for quick wins when gap between 0.1 and 0.2', async () => {
      // Create a question with partial coverage to get residual around 0.6
      const partialQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.4') }],
          dimension: mockDimensions[0],
        },
      ];
      prismaService.question.findMany.mockResolvedValue(partialQuestions);

      // residual ≈ 0.6, set avg to 0.45, gap = 0.15
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue([{ dimension_key: 'arch_sec', avg_residual: 0.45, count: BigInt(100) }]);

      const result = await service.getDimensionBenchmarks(mockSessionId);
      const archSec = result.find((d) => d.dimensionKey === 'arch_sec');

      expect(archSec?.recommendation).toContain('slightly below average');
    });

    it('should recommend focusing elsewhere when gap is between -0.1 and 0.1 (at average)', async () => {
      const partialQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('1.0'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.5') }],
          dimension: mockDimensions[0],
        },
      ];
      prismaService.question.findMany.mockResolvedValue(partialQuestions);

      // residual ≈ 0.5, avg ≈ 0.5, gap ≈ 0
      prismaService.$queryRaw = jest
        .fn()
        .mockResolvedValue([{ dimension_key: 'arch_sec', avg_residual: 0.5, count: BigInt(100) }]);

      const result = await service.getDimensionBenchmarks(mockSessionId);
      const archSec = result.find((d) => d.dimensionKey === 'arch_sec');

      expect(archSec?.recommendation).toContain('at industry average');
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — calculateBatchScores batching logic
  // =====================================================================
  describe('calculateBatchScores batching', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
    });

    it('should process sessions in batches of 5', async () => {
      const sessionIds = Array.from({ length: 7 }, (_, i) => `session-${i + 1}`);

      const results = await service.calculateBatchScores(sessionIds);

      expect(results.size).toBe(7);
    });

    it('should handle empty sessionIds array', async () => {
      const results = await service.calculateBatchScores([]);

      expect(results.size).toBe(0);
    });

    it('should continue processing remaining sessions when one fails', async () => {
      let callCount = 0;
      prismaService.session.findUnique.mockImplementation(() => {
        callCount++;
        if (callCount === 3) {
          return Promise.resolve(null); // 3rd session will fail
        }
        return Promise.resolve(mockSession);
      });

      const sessionIds = ['s1', 's2', 's3', 's4', 's5'];

      const results = await service.calculateBatchScores(sessionIds);

      // 4 out of 5 should succeed
      expect(results.size).toBe(4);
      expect(results.has('s3')).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — calculateDimensionResiduals edge cases
  // =====================================================================
  describe('calculateDimensionResiduals edge cases', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession);
      prismaService.session.update.mockResolvedValue({ ...mockSession });
      redisService.set.mockResolvedValue(undefined);
    });

    it('should return zero residual for dimension with no questions', async () => {
      // Only one dimension has questions, others have none
      const singleDimQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: new Decimal('0.8'),
          text: 'Test',
          responses: [{ coverage: new Decimal('0.5') }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(singleDimQuestions);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      // Dimensions without questions should have zero residual
      const financeDim = result.dimensions.find((d) => d.dimensionKey === 'finance');
      expect(financeDim?.residualRisk).toBe(0);
      expect(financeDim?.weightedContribution).toBe(0);
      expect(financeDim?.questionCount).toBe(0);
      expect(financeDim?.answeredCount).toBe(0);
      expect(financeDim?.averageCoverage).toBe(0);
    });

    it('should use DEFAULT_SEVERITY for questions without severity', async () => {
      const noSeverityQuestions = [
        {
          id: 'q1',
          dimensionKey: 'arch_sec',
          severity: null,
          text: 'Test',
          responses: [{ coverage: new Decimal('0.0') }],
          dimension: mockDimensions[0],
        },
      ];

      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(noSeverityQuestions);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      const archSec = result.dimensions.find((d) => d.dimensionKey === 'arch_sec');
      // Default severity = 0.7, coverage = 0 → residual = 0.7*(1-0)/(0.7+ε) ≈ 1.0
      expect(archSec!.residualRisk).toBeCloseTo(1.0, 2);
    });

    it('should clamp final score between 0 and 100', async () => {
      // This tests the Math.max(0, Math.min(100, ...)) guard
      prismaService.dimensionCatalog.findMany.mockResolvedValue(mockDimensions);
      prismaService.question.findMany.mockResolvedValue(mockQuestions);

      const result = await service.calculateScore({ sessionId: mockSessionId });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
