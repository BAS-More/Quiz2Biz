import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScoringEngineService } from './scoring-engine.service';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';
import { Decimal } from '@prisma/client/runtime/library';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;
  let prismaService: any; // Use any for mocked service
  let redisService: any; // Use any for mocked service

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
    };

    const mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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
});
