import { Test, TestingModule } from '@nestjs/testing';
import { ScoringEngineController } from './scoring-engine.controller';
import { ScoringEngineService } from './scoring-engine.service';

describe('ScoringEngineController', () => {
  let controller: ScoringEngineController;
  let scoringService: ScoringEngineService;
  let module: TestingModule;

  const mockScoringService = {
    calculateScore: jest.fn(),
    getNextQuestions: jest.fn(),
    invalidateScoreCache: jest.fn(),
    getScoreHistory: jest.fn(),
    getIndustryBenchmark: jest.fn(),
    getDimensionBenchmarks: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ScoringEngineController],
      providers: [{ provide: ScoringEngineService, useValue: mockScoringService }],
    }).compile();

    controller = module.get<ScoringEngineController>(ScoringEngineController);
    scoringService = module.get<ScoringEngineService>(ScoringEngineService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('calculateScore', () => {
    it('should calculate readiness score for a session', async () => {
      const dto = { sessionId: 'session-123' };
      const mockResult = {
        sessionId: 'session-123',
        score: 75.5,
        portfolioResidual: 0.245,
        dimensions: [
          {
            dimensionKey: 'arch_sec',
            displayName: 'Architecture',
            residualRisk: 0.2,
            weight: 0.15,
          },
          { dimensionKey: 'devops', displayName: 'DevOps', residualRisk: 0.3, weight: 0.12 },
        ],
        totalQuestions: 50,
        answeredQuestions: 40,
        completionPercentage: 80,
        trend: 'UP',
        calculatedAt: new Date(),
      };

      mockScoringService.calculateScore.mockResolvedValue(mockResult);

      const result = await controller.calculateScore(dto);

      expect(result.score).toBe(75.5);
      expect(result.portfolioResidual).toBeCloseTo(0.245, 3);
      expect(mockScoringService.calculateScore).toHaveBeenCalledWith(dto);
    });

    it('should support coverage overrides', async () => {
      const dto = {
        sessionId: 'session-123',
        coverageOverrides: [{ questionId: 'q-1', coverage: 1.0 }],
      };

      mockScoringService.calculateScore.mockResolvedValue({
        sessionId: 'session-123',
        score: 85,
      });

      const result = await controller.calculateScore(dto);

      expect(result.score).toBe(85);
      expect(mockScoringService.calculateScore).toHaveBeenCalledWith(dto);
    });
  });

  describe('getNextQuestions', () => {
    it('should return priority questions with score lift', async () => {
      const dto = { sessionId: 'session-123', limit: 5 };
      const mockResult = {
        sessionId: 'session-123',
        currentScore: 70,
        questions: [
          { questionId: 'q-1', rank: 1, expectedScoreLift: 5.2, rationale: 'High impact' },
          { questionId: 'q-2', rank: 2, expectedScoreLift: 3.8, rationale: 'Medium impact' },
        ],
        maxPotentialScore: 79,
      };

      mockScoringService.getNextQuestions.mockResolvedValue(mockResult);

      const result = await controller.getNextQuestions(dto);

      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].rank).toBe(1);
      expect(result.maxPotentialScore).toBe(79);
      expect(mockScoringService.getNextQuestions).toHaveBeenCalledWith(dto);
    });
  });

  describe('getScore', () => {
    it('should get score for a session', async () => {
      const mockResult = {
        sessionId: 'session-123',
        score: 82,
        trend: 'STABLE',
      };

      mockScoringService.calculateScore.mockResolvedValue(mockResult);

      const result = await controller.getScore('session-123');

      expect(result.score).toBe(82);
      expect(mockScoringService.calculateScore).toHaveBeenCalledWith({ sessionId: 'session-123' });
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate score cache', async () => {
      mockScoringService.invalidateScoreCache.mockResolvedValue(undefined);

      await controller.invalidateCache('session-123');

      expect(mockScoringService.invalidateScoreCache).toHaveBeenCalledWith('session-123');
    });
  });

  describe('getScoreHistory', () => {
    it('should return score history for trend analysis', async () => {
      const mockHistory = {
        sessionId: 'session-123',
        history: [
          { score: 75, calculatedAt: new Date('2026-01-01') },
          { score: 78, calculatedAt: new Date('2026-01-02') },
          { score: 82, calculatedAt: new Date('2026-01-03') },
        ],
        trend: { direction: 'UP', change: 7, period: '3 days' },
      };

      mockScoringService.getScoreHistory.mockResolvedValue(mockHistory);

      const result = await controller.getScoreHistory('session-123', 10);

      expect(result.history).toHaveLength(3);
      expect(result.trend.direction).toBe('UP');
      expect(mockScoringService.getScoreHistory).toHaveBeenCalledWith('session-123', 10);
    });
  });

  describe('getIndustryBenchmark', () => {
    it('should return industry benchmark comparison', async () => {
      const mockBenchmark = {
        sessionId: 'session-123',
        currentScore: 80,
        benchmark: {
          average: 72,
          median: 70,
          min: 45,
          max: 95,
          sampleSize: 150,
        },
        percentileRank: 75,
        performanceCategory: 'ABOVE_AVERAGE',
        gapToMedian: 10,
        gapToLeading: 15,
      };

      mockScoringService.getIndustryBenchmark.mockResolvedValue(mockBenchmark);

      const result = await controller.getIndustryBenchmark('session-123', 'technology');

      expect(result.currentScore).toBe(80);
      expect(result.performanceCategory).toBe('ABOVE_AVERAGE');
      expect(mockScoringService.getIndustryBenchmark).toHaveBeenCalledWith(
        'session-123',
        'technology',
      );
    });
  });

  describe('getDimensionBenchmarks', () => {
    it('should return per-dimension benchmark comparisons', async () => {
      const mockDimBenchmarks = [
        {
          dimensionKey: 'arch_sec',
          displayName: 'Architecture & Security',
          currentResidual: 0.2,
          industryAverage: 0.25,
          gapToAverage: -0.05,
          performance: 'ABOVE',
          recommendation: 'Maintain current practices',
        },
        {
          dimensionKey: 'devops',
          displayName: 'DevOps',
          currentResidual: 0.35,
          industryAverage: 0.28,
          gapToAverage: 0.07,
          performance: 'BELOW',
          recommendation: 'Improve CI/CD pipelines',
        },
      ];

      mockScoringService.getDimensionBenchmarks.mockResolvedValue(mockDimBenchmarks);

      const result = await controller.getDimensionBenchmarks('session-123');

      expect(result).toHaveLength(2);
      expect(result[0].performance).toBe('ABOVE');
      expect(result[1].performance).toBe('BELOW');
      expect(mockScoringService.getDimensionBenchmarks).toHaveBeenCalledWith('session-123');
    });
  });
});
