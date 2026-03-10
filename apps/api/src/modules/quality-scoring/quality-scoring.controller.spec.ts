import { Test, TestingModule } from '@nestjs/testing';
import { QualityScoringController } from './quality-scoring.controller';
import { QualityScoringService } from './services';
import { PrismaService } from '@libs/database';

describe('QualityScoringController', () => {
  let controller: QualityScoringController;
  let qualityScoringService: any;
  let prismaService: any;

  const mockProject = {
    id: 'project-123',
    projectType: { slug: 'business-plan' },
  };

  const mockScore = {
    projectId: 'project-123',
    overallScore: 75,
    completenessScore: 60,
    confidenceScore: 80,
    dimensionScores: [
      {
        dimensionId: 'dim-1',
        dimensionName: 'Market Analysis',
        weight: 0.3,
        score: 70,
        completeness: 0.6,
        criteriaScores: [
          {
            criterionKey: 'target_market',
            criterionDescription: 'Target market defined',
            met: true,
            confidence: 0.9,
            sourceFactKey: 'target_market',
          },
          {
            criterionKey: 'competitors',
            criterionDescription: 'Competitors identified',
            met: false,
            confidence: 0,
          },
        ],
      },
    ],
    recommendations: ['Add competitor analysis information'],
    scoredAt: new Date(),
  };

  const mockImprovements = [
    {
      dimensionId: 'dim-1',
      dimensionName: 'Market Analysis',
      currentScore: 40,
      potentialScore: 70,
      missingCriteria: ['Competitor analysis', 'Market size'],
      suggestedQuestions: ['Can you tell me more about competitor analysis?'],
    },
  ];

  beforeEach(async () => {
    const mockQualityScoringService = {
      calculateProjectScore: jest.fn(),
      getImprovements: jest.fn(),
      saveProjectScore: jest.fn(),
    };

    const mockPrismaService = {
      project: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QualityScoringController],
      providers: [
        { provide: QualityScoringService, useValue: mockQualityScoringService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<QualityScoringController>(QualityScoringController);
    qualityScoringService = module.get(QualityScoringService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectScore', () => {
    it('should return quality score for a project', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      qualityScoringService.calculateProjectScore.mockResolvedValue(mockScore);

      const result = await controller.getProjectScore('project-123');

      expect(result.projectId).toBe('project-123');
      expect(result.overallScore).toBe(75);
      expect(result.dimensionScores).toHaveLength(1);
      expect(qualityScoringService.calculateProjectScore).toHaveBeenCalledWith(
        'project-123',
        'business-plan',
      );
    });

    it('should return empty score when project not found', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      const result = await controller.getProjectScore('nonexistent');

      expect(result.overallScore).toBe(0);
      expect(result.dimensionScores).toHaveLength(0);
    });

    it('should use business-plan as default project type slug', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project-123',
        projectType: null,
      });
      qualityScoringService.calculateProjectScore.mockResolvedValue(mockScore);

      await controller.getProjectScore('project-123');

      expect(qualityScoringService.calculateProjectScore).toHaveBeenCalledWith(
        'project-123',
        'business-plan',
      );
    });
  });

  describe('getImprovements', () => {
    it('should return improvement suggestions', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      qualityScoringService.getImprovements.mockResolvedValue(mockImprovements);

      const result = await controller.getImprovements('project-123');

      expect(result).toHaveLength(1);
      expect(result[0].dimensionName).toBe('Market Analysis');
      expect(result[0].missingCriteria).toContain('Competitor analysis');
    });

    it('should return empty array when project not found', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      const result = await controller.getImprovements('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('recalculateScore', () => {
    it('should recalculate and save score', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      qualityScoringService.calculateProjectScore.mockResolvedValue(mockScore);
      qualityScoringService.saveProjectScore.mockResolvedValue(undefined);

      const result = await controller.recalculateScore('project-123');

      expect(result.overallScore).toBe(75);
      expect(qualityScoringService.saveProjectScore).toHaveBeenCalledWith(
        'project-123',
        mockScore,
      );
    });

    it('should return empty score when project not found', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      const result = await controller.recalculateScore('nonexistent');

      expect(result.overallScore).toBe(0);
      expect(qualityScoringService.saveProjectScore).not.toHaveBeenCalled();
    });
  });
});
