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
    description: 'Market research quality',
    weight: new Prisma.Decimal(0.3),
    sortOrder: 1,
    benchmarkCriteria: [
      { key: 'target_market', description: 'Target market defined', weight: 1 },
      { key: 'market_size', description: 'Market size estimated', weight: 1 },
      { key: 'competitors', description: 'Competitor analysis', weight: 0.5 },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDimension2 = {
    id: 'dim-2',
    projectTypeId: 'pt-1',
    name: 'Financial Viability',
    description: 'Financial planning quality',
    weight: new Prisma.Decimal(0.7),
    sortOrder: 2,
    benchmarkCriteria: [
      { key: 'revenue_model', description: 'Revenue model defined', weight: 1 },
      { key: 'projections', description: 'Financial projections', weight: 1 },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFact = (fieldName: string, confidence = 0.8) => ({
    id: `fact-${fieldName}`,
    projectId: 'project-1',
    fieldName,
    fieldValue: `Value for ${fieldName}`,
    category: 'business_overview',
    label: null,
    confidence: new Prisma.Decimal(confidence),
    confirmedByUser: false,
    sourceMessageId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockPrisma = {
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
      providers: [QualityScoringService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<QualityScoringService>(QualityScoringService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateProjectScore', () => {
    it('should calculate weighted score across dimensions', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([
        mockDimension,
        mockDimension2,
      ] as never);
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([
        mockFact('target_market', 0.9),
        mockFact('market_size', 0.7),
        mockFact('revenue_model', 0.8),
      ] as never);

      const result = await service.calculateProjectScore('project-1', 'business-plan');

      expect(result.projectId).toBe('project-1');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.dimensionScores).toHaveLength(2);
      expect(result.scoredAt).toBeInstanceOf(Date);
    });

    it('should return empty score when project type not found', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.calculateProjectScore('project-1', 'unknown-type');

      expect(result.overallScore).toBe(0);
      expect(result.dimensionScores).toHaveLength(0);
      expect(result.recommendations).toContain(
        'Start a conversation to begin building your project profile',
      );
    });

    it('should return empty score when no dimensions exist', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.calculateProjectScore('project-1', 'business-plan');

      expect(result.overallScore).toBe(0);
      expect(result.dimensionScores).toHaveLength(0);
    });

    it('should handle empty criteria in dimensions', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockDimension,
          benchmarkCriteria: [],
        },
      ] as never);
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.calculateProjectScore('project-1', 'business-plan');

      expect(result.dimensionScores[0].score).toBe(0);
      expect(result.dimensionScores[0].completeness).toBe(0);
    });

    it('should score zero when no facts match criteria', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([mockDimension] as never);
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.calculateProjectScore('project-1', 'business-plan');

      expect(result.overallScore).toBe(0);
      expect(result.completenessScore).toBe(0);
    });

    it('should calculate completeness based on matched criteria', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([mockDimension] as never);
      // Provide facts matching 2 of 3 criteria
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([
        mockFact('target_market', 0.9),
        mockFact('market_size', 0.8),
      ] as never);

      const result = await service.calculateProjectScore('project-1', 'business-plan');

      expect(result.completenessScore).toBeGreaterThan(0);
      expect(result.completenessScore).toBeLessThanOrEqual(100);
    });

    it('should calculate confidence score from fact confidence values', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([mockDimension] as never);
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([
        mockFact('target_market', 0.9),
        mockFact('market_size', 0.5),
      ] as never);

      const result = await service.calculateProjectScore('project-1', 'business-plan');

      // Average of 0.9 and 0.5 = 0.7 → 70%
      expect(result.confidenceScore).toBe(70);
    });
  });

  describe('getImprovements', () => {
    it('should return improvements for low-scoring dimensions', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([
        mockDimension,
        mockDimension2,
      ] as never);
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getImprovements('project-1', 'business-plan');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('dimensionName');
      expect(result[0]).toHaveProperty('missingCriteria');
      expect(result[0]).toHaveProperty('suggestedQuestions');
    });

    it('should sort improvements by lowest score first', async () => {
      (prismaService.projectType.findUnique as jest.Mock).mockResolvedValue(mockProjectType as never);
      (prismaService.qualityDimension.findMany as jest.Mock).mockResolvedValue([
        mockDimension,
        mockDimension2,
      ] as never);
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([
        mockFact('target_market', 0.9),
        mockFact('market_size', 0.8),
      ] as never);

      const result = await service.getImprovements('project-1', 'business-plan');

      if (result.length >= 2) {
        expect(result[0].currentScore).toBeLessThanOrEqual(result[1].currentScore);
      }
    });
  });

  describe('saveProjectScore', () => {
    it('should save score to project record', async () => {
      (prismaService.project.update as jest.Mock).mockResolvedValue({} as never);

      const score = {
        projectId: 'project-1',
        overallScore: 75,
        completenessScore: 80,
        confidenceScore: 70,
        dimensionScores: [],
        recommendations: [],
        scoredAt: new Date(),
      };

      await service.saveProjectScore('project-1', score);

      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          qualityScore: new Prisma.Decimal(75),
        }),
      });
    });
  });
});
