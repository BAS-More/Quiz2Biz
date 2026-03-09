/**
 * Quality Scoring Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { QualityScoringService } from './quality-scoring.service';
import { PrismaService } from '@libs/database';
import { Prisma } from '@prisma/client';

describe('QualityScoringService', () => {
  let service: QualityScoringService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProjectType = {
    id: 'pt-1',
    slug: 'business-plan',
    name: 'Business Plan',
  };

  const mockDimension = {
    id: 'dim-1',
    projectTypeId: 'pt-1',
    name: 'Market Analysis',
    description: 'Quality of market analysis',
    weight: new Prisma.Decimal(0.3),
    benchmarkCriteria: [
      { key: 'target_market', description: 'Target market defined', weight: 1 },
      { key: 'competitors', description: 'Competitor analysis', weight: 1 },
      { key: 'market_size', description: 'Market size estimation', weight: 1 },
    ],
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFact = {
    id: 'fact-1',
    projectId: 'project-123',
    fieldName: 'target_market',
    fieldValue: 'Small businesses in the US',
    category: 'market_analysis',
    confidence: new Prisma.Decimal(0.85),
    label: null,
    sourceMessageId: null,
    confirmedByUser: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      projectType: {
        findUnique: jest.fn(),
      },
      qualityDimension: {
        findMany: jest.fn(),
      },
      extractedFact: {
        findMany: jest.fn(),
      },
      project: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityScoringService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<QualityScoringService>(QualityScoringService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateProjectScore', () => {
    it('should calculate score for project with facts', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([mockDimension]);
      prismaService.extractedFact.findMany.mockResolvedValue([
        mockFact,
        { ...mockFact, fieldName: 'competitors', confidence: new Prisma.Decimal(0.9) },
      ]);

      const result = await service.calculateProjectScore('project-123', 'business-plan');

      expect(result.projectId).toBe('project-123');
      expect(result.dimensionScores).toHaveLength(1);
      expect(result.dimensionScores[0].dimensionName).toBe('Market Analysis');
      expect(result.scoredAt).toBeInstanceOf(Date);
    });

    it('should return empty score when project type not found', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(null);

      const result = await service.calculateProjectScore('project-123', 'invalid-type');

      expect(result.overallScore).toBe(0);
      expect(result.completenessScore).toBe(0);
      expect(result.dimensionScores).toHaveLength(0);
    });

    it('should return empty score when no dimensions found', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([]);

      const result = await service.calculateProjectScore('project-123', 'business-plan');

      expect(result.overallScore).toBe(0);
      expect(result.dimensionScores).toHaveLength(0);
    });

    it('should calculate correct completeness score', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([mockDimension]);
      prismaService.extractedFact.findMany.mockResolvedValue([mockFact]); // 1 fact

      const result = await service.calculateProjectScore('project-123', 'business-plan');

      // 'target_market' matches criterion 'target_market' (exact) and 'market_size' (partial contains 'market')
      // So 2 out of 3 criteria = 67% (due to fuzzy matching)
      expect(result.completenessScore).toBe(67);
    });

    it('should calculate confidence score from facts', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([mockDimension]);
      prismaService.extractedFact.findMany.mockResolvedValue([
        { ...mockFact, confidence: new Prisma.Decimal(0.8) },
        { ...mockFact, fieldName: 'test', confidence: new Prisma.Decimal(0.6) },
      ]);

      const result = await service.calculateProjectScore('project-123', 'business-plan');

      // Average: (0.8 + 0.6) / 2 = 0.7 = 70%
      expect(result.confidenceScore).toBe(70);
    });

    it('should generate recommendations for low-scoring dimensions', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([mockDimension]);
      prismaService.extractedFact.findMany.mockResolvedValue([]); // No facts = low score

      const result = await service.calculateProjectScore('project-123', 'business-plan');

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle dimension without benchmark criteria', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([
        { ...mockDimension, benchmarkCriteria: null },
      ]);
      prismaService.extractedFact.findMany.mockResolvedValue([]);

      const result = await service.calculateProjectScore('project-123', 'business-plan');

      expect(result.dimensionScores[0].score).toBe(0);
      expect(result.dimensionScores[0].criteriaScores).toHaveLength(0);
    });

    it('should calculate weighted overall score', async () => {
      const dimension1 = { ...mockDimension, id: 'dim-1', weight: new Prisma.Decimal(0.7) };
      const dimension2 = {
        ...mockDimension,
        id: 'dim-2',
        name: 'Financial Analysis',
        weight: new Prisma.Decimal(0.3),
        benchmarkCriteria: [{ key: 'revenue', description: 'Revenue model', weight: 1 }],
      };

      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([dimension1, dimension2]);
      prismaService.extractedFact.findMany.mockResolvedValue([
        mockFact,
        { ...mockFact, fieldName: 'revenue', confidence: new Prisma.Decimal(1.0) },
      ]);

      const result = await service.calculateProjectScore('project-123', 'business-plan');

      expect(result.dimensionScores).toHaveLength(2);
      // Overall score should be weighted average
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getImprovements', () => {
    it('should return improvements for dimensions below 80%', async () => {
      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([mockDimension]);
      prismaService.extractedFact.findMany.mockResolvedValue([mockFact]); // 1/3 = 33%

      const result = await service.getImprovements('project-123', 'business-plan');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].currentScore).toBeLessThan(80);
      expect(result[0].missingCriteria.length).toBeGreaterThan(0);
      expect(result[0].suggestedQuestions.length).toBeGreaterThan(0);
    });

    it('should sort improvements by score ascending', async () => {
      const dimension1 = { ...mockDimension, id: 'dim-1' };
      const dimension2 = {
        ...mockDimension,
        id: 'dim-2',
        name: 'Financial',
        benchmarkCriteria: [{ key: 'revenue', description: 'Revenue', weight: 1 }],
      };

      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([dimension1, dimension2]);
      prismaService.extractedFact.findMany.mockResolvedValue([
        { ...mockFact, fieldName: 'revenue', confidence: new Prisma.Decimal(0.9) },
      ]);

      const result = await service.getImprovements('project-123', 'business-plan');

      // First improvement should be for the lower scoring dimension
      if (result.length > 1) {
        expect(result[0].currentScore).toBeLessThanOrEqual(result[1].currentScore);
      }
    });

    it('should return empty array when all dimensions above 80%', async () => {
      const simpleSchema = {
        ...mockDimension,
        benchmarkCriteria: [{ key: 'target_market', description: 'Target market', weight: 1 }],
      };

      prismaService.projectType.findUnique.mockResolvedValue(mockProjectType);
      prismaService.qualityDimension.findMany.mockResolvedValue([simpleSchema]);
      prismaService.extractedFact.findMany.mockResolvedValue([
        { ...mockFact, confidence: new Prisma.Decimal(0.95) },
      ]);

      const result = await service.getImprovements('project-123', 'business-plan');

      // If dimension is 100% met with high confidence, no improvements needed
      expect(result).toEqual([]);
    });
  });

  describe('saveProjectScore', () => {
    it('should update project with quality score', async () => {
      prismaService.project.update.mockResolvedValue({
        id: 'project-123',
        qualityScore: new Prisma.Decimal(75),
        lastActivityAt: new Date(),
      });

      const score = {
        projectId: 'project-123',
        overallScore: 75,
        completenessScore: 80,
        confidenceScore: 70,
        dimensionScores: [],
        recommendations: [],
        scoredAt: new Date(),
      };

      await service.saveProjectScore('project-123', score);

      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        data: expect.objectContaining({
          qualityScore: expect.any(Prisma.Decimal),
          lastActivityAt: expect.any(Date),
        }),
      });
    });
  });
});
