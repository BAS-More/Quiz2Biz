import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IdeaCaptureService } from './idea-capture.service';
import { ClaudeAiService } from './claude-ai.service';
import { PrismaService } from '@libs/database';

describe('IdeaCaptureService', () => {
  let service: IdeaCaptureService;
  let prismaService: jest.Mocked<PrismaService>;
  let claudeAiService: jest.Mocked<ClaudeAiService>;

  const mockPrismaService = {
    projectType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    ideaCapture: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    questionnaire: {
      findFirst: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
  };

  const mockClaudeAiService = {
    analyzeIdea: jest.fn(),
    evaluateAnswerCompleteness: jest.fn(),
  };

  const mockProjectTypes = [
    { id: 'pt-1', slug: 'business-plan', name: 'Business Plan', description: 'Business planning' },
    { id: 'pt-2', slug: 'marketing-strategy', name: 'Marketing Strategy', description: 'Marketing' },
  ];

  const mockAnalysisResult = {
    themes: ['SaaS', 'technology'],
    gaps: ['market research needed'],
    strengths: ['clear value proposition'],
    recommendedProjectType: { slug: 'business-plan', confidence: 0.85, reasoning: 'Best fit' },
    alternativeProjectTypes: [{ slug: 'marketing-strategy', confidence: 0.6, reasoning: 'Also viable' }],
    summary: 'Great idea for a business plan',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdeaCaptureService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClaudeAiService, useValue: mockClaudeAiService },
      ],
    }).compile();

    service = module.get<IdeaCaptureService>(IdeaCaptureService);
    prismaService = module.get(PrismaService);
    claudeAiService = module.get(ClaudeAiService);
  });

  describe('captureAndAnalyze', () => {
    it('should capture and analyze an idea successfully', async () => {
      mockPrismaService.projectType.findMany.mockResolvedValue(mockProjectTypes);
      mockClaudeAiService.analyzeIdea.mockResolvedValue(mockAnalysisResult);
      mockPrismaService.ideaCapture.create.mockResolvedValue({
        id: 'idea-1',
        title: 'My Startup',
        rawInput: 'Build a SaaS app',
        analysis: mockAnalysisResult,
        status: 'ANALYZED',
        projectTypeId: 'pt-1',
        createdAt: new Date(),
        projectType: { id: 'pt-1', slug: 'business-plan', name: 'Business Plan' },
      });

      const result = await service.captureAndAnalyze({
        rawInput: 'Build a SaaS app',
        title: 'My Startup',
      }, 'user-1');

      expect(result.id).toBe('idea-1');
      expect(result.analysis.themes).toEqual(['SaaS', 'technology']);
      expect(mockClaudeAiService.analyzeIdea).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no project types available', async () => {
      mockPrismaService.projectType.findMany.mockResolvedValue([]);

      await expect(
        service.captureAndAnalyze({ rawInput: 'Test idea' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use provided projectTypeId over recommended', async () => {
      mockPrismaService.projectType.findMany.mockResolvedValue(mockProjectTypes);
      mockClaudeAiService.analyzeIdea.mockResolvedValue(mockAnalysisResult);
      mockPrismaService.ideaCapture.create.mockResolvedValue({
        id: 'idea-1',
        title: null,
        rawInput: 'Test',
        analysis: mockAnalysisResult,
        status: 'ANALYZED',
        projectTypeId: 'pt-2',
        createdAt: new Date(),
        projectType: { id: 'pt-2', slug: 'marketing-strategy', name: 'Marketing Strategy' },
      });

      await service.captureAndAnalyze({
        rawInput: 'Test',
        projectTypeId: 'pt-2',
      }, 'user-1');

      expect(mockPrismaService.ideaCapture.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectTypeId: 'pt-2',
          }),
        }),
      );
    });

    it('should work without userId (anonymous)', async () => {
      mockPrismaService.projectType.findMany.mockResolvedValue(mockProjectTypes);
      mockClaudeAiService.analyzeIdea.mockResolvedValue(mockAnalysisResult);
      mockPrismaService.ideaCapture.create.mockResolvedValue({
        id: 'idea-1',
        title: null,
        rawInput: 'Anonymous idea',
        analysis: mockAnalysisResult,
        status: 'ANALYZED',
        projectTypeId: 'pt-1',
        createdAt: new Date(),
        projectType: { id: 'pt-1', slug: 'business-plan', name: 'Business Plan' },
      });

      const result = await service.captureAndAnalyze({ rawInput: 'Anonymous idea' });

      expect(result).toBeDefined();
      expect(mockPrismaService.ideaCapture.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null,
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return idea capture by ID', async () => {
      mockPrismaService.ideaCapture.findUnique.mockResolvedValue({
        id: 'idea-1',
        title: 'Test Idea',
        rawInput: 'Some input',
        analysis: mockAnalysisResult,
        status: 'ANALYZED',
        projectTypeId: 'pt-1',
        createdAt: new Date(),
        projectType: { id: 'pt-1', slug: 'business-plan', name: 'Business Plan' },
      });
      mockPrismaService.projectType.findMany.mockResolvedValue(mockProjectTypes);

      const result = await service.getById('idea-1');

      expect(result.id).toBe('idea-1');
      expect(result.analysis).toBeDefined();
    });

    it('should throw NotFoundException when idea not found', async () => {
      mockPrismaService.ideaCapture.findUnique.mockResolvedValue(null);

      await expect(service.getById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmProjectType', () => {
    it('should confirm project type selection', async () => {
      mockPrismaService.projectType.findUnique.mockResolvedValue(mockProjectTypes[1]);
      mockPrismaService.ideaCapture.update.mockResolvedValue({
        id: 'idea-1',
        title: 'Test',
        rawInput: 'Input',
        analysis: mockAnalysisResult,
        status: 'CONFIRMED',
        projectTypeId: 'pt-2',
        createdAt: new Date(),
        projectType: { id: 'pt-2', slug: 'marketing-strategy', name: 'Marketing Strategy' },
      });
      mockPrismaService.ideaCapture.findUnique.mockResolvedValue({
        id: 'idea-1',
        title: 'Test',
        rawInput: 'Input',
        analysis: mockAnalysisResult,
        status: 'CONFIRMED',
        projectTypeId: 'pt-2',
        createdAt: new Date(),
        projectType: { id: 'pt-2', slug: 'marketing-strategy', name: 'Marketing Strategy' },
      });
      mockPrismaService.projectType.findMany.mockResolvedValue(mockProjectTypes);

      const result = await service.confirmProjectType('idea-1', 'pt-2');

      expect(result.projectTypeId).toBe('pt-2');
    });

    it('should throw NotFoundException when project type not found', async () => {
      mockPrismaService.projectType.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmProjectType('idea-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSessionFromIdea', () => {
    const mockIdeaCapture = {
      id: 'idea-1',
      title: 'My Idea',
      rawInput: 'Input',
      analysis: { themes: ['tech'] },
      status: 'CONFIRMED',
      projectTypeId: 'pt-1',
      projectType: { id: 'pt-1', slug: 'business-plan', name: 'Business Plan' },
    };

    const mockQuestionnaire = {
      id: 'q-1',
      version: 1,
      projectTypeId: 'pt-1',
      isActive: true,
      isDefault: true,
    };

    it('should create session from confirmed idea', async () => {
      mockPrismaService.ideaCapture.findUnique.mockResolvedValue(mockIdeaCapture);
      mockPrismaService.questionnaire.findFirst.mockResolvedValue(mockQuestionnaire);
      mockPrismaService.session.create.mockResolvedValue({ id: 'session-1' });

      const result = await service.createSessionFromIdea('idea-1', 'user-1');

      expect(result.sessionId).toBe('session-1');
      expect(mockPrismaService.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            questionnaireId: 'q-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when idea not found', async () => {
      mockPrismaService.ideaCapture.findUnique.mockResolvedValue(null);

      await expect(
        service.createSessionFromIdea('non-existent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when project type not confirmed', async () => {
      mockPrismaService.ideaCapture.findUnique.mockResolvedValue({
        ...mockIdeaCapture,
        projectTypeId: null,
      });

      await expect(
        service.createSessionFromIdea('idea-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no questionnaire available', async () => {
      mockPrismaService.ideaCapture.findUnique.mockResolvedValue(mockIdeaCapture);
      mockPrismaService.questionnaire.findFirst.mockResolvedValue(null);

      await expect(
        service.createSessionFromIdea('idea-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
