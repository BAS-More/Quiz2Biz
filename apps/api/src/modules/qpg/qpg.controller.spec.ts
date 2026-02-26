import { Test, TestingModule } from '@nestjs/testing';
import { QpgController } from './qpg.controller';
import { QpgService } from './qpg.service';
import { PromptGeneratorService } from './services/prompt-generator.service';

describe('QpgController', () => {
  let controller: QpgController;
  let qpgService: QpgService;
  let promptGenerator: PromptGeneratorService;
  let module: TestingModule;

  const mockQpgService = {
    generatePromptsForSession: jest.fn(),
    getAvailableTemplates: jest.fn(),
    getSessionGaps: jest.fn(),
  };

  const mockPromptGenerator = {
    formatAsMarkdown: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [QpgController],
      providers: [
        { provide: QpgService, useValue: mockQpgService },
        { provide: PromptGeneratorService, useValue: mockPromptGenerator },
      ],
    }).compile();

    controller = module.get<QpgController>(QpgController);
    qpgService = module.get<QpgService>(QpgService);
    promptGenerator = module.get<PromptGeneratorService>(PromptGeneratorService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('generatePrompts', () => {
    it('should generate prompts for session gaps', async () => {
      const dto = { sessionId: 'session-123' };

      const mockBatch = {
        sessionId: 'session-123',
        generatedAt: new Date(),
        scoreAtGeneration: 72,
        totalEffortHours: 80,
        dimensionsCovered: ['arch_sec', 'devops'],
        prompts: [
          { id: 'p-1', questionId: 'q-1', dimensionKey: 'arch_sec', title: 'Security Prompt' },
          { id: 'p-2', questionId: 'q-2', dimensionKey: 'devops', title: 'DevOps Prompt' },
        ],
      };

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);

      const result = await controller.generatePrompts(dto);

      expect(result.sessionId).toBe('session-123');
      expect(result.prompts).toHaveLength(2);
      expect(result.filteredCount).toBe(2);
    });

    it('should filter prompts by dimensions', async () => {
      const dto = {
        sessionId: 'session-123',
        dimensions: ['arch_sec'],
      };

      const mockBatch = {
        sessionId: 'session-123',
        prompts: [
          { id: 'p-1', questionId: 'q-1', dimensionKey: 'arch_sec', title: 'Security Prompt' },
          { id: 'p-2', questionId: 'q-2', dimensionKey: 'devops', title: 'DevOps Prompt' },
        ],
      };

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);

      const result = await controller.generatePrompts(dto);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].dimensionKey).toBe('arch_sec');
    });

    it('should limit number of prompts', async () => {
      const dto = {
        sessionId: 'session-123',
        maxPrompts: 1,
      };

      const mockBatch = {
        sessionId: 'session-123',
        prompts: [
          { id: 'p-1', dimensionKey: 'arch_sec' },
          { id: 'p-2', dimensionKey: 'devops' },
          { id: 'p-3', dimensionKey: 'quality' },
        ],
      };

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);

      const result = await controller.generatePrompts(dto);

      expect(result.prompts).toHaveLength(1);
    });

    it('should filter prompts by minResidualRisk', async () => {
      const dto = {
        sessionId: 'session-123',
        minResidualRisk: 0.4,
      };

      const mockBatch = {
        sessionId: 'session-123',
        prompts: [
          { id: 'p-1', questionId: 'q-1', dimensionKey: 'arch_sec', title: 'Security Prompt' },
          { id: 'p-2', questionId: 'q-2', dimensionKey: 'devops', title: 'DevOps Prompt' },
          { id: 'p-3', questionId: 'q-3', dimensionKey: 'quality', title: 'Quality Prompt' },
        ],
      };

      const mockGaps = [
        { questionId: 'q-1', residualRisk: 0.6 },
        { questionId: 'q-2', residualRisk: 0.2 },
        { questionId: 'q-3', residualRisk: 0.5 },
      ];

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);
      mockQpgService.getSessionGaps.mockResolvedValue(mockGaps);

      const result = await controller.generatePrompts(dto);

      expect(result.prompts).toHaveLength(2);
      expect(result.prompts.map((p: any) => p.id)).toEqual(['p-1', 'p-3']);
      expect(result.filteredCount).toBe(2);
    });

    it('should apply all filters together (dimensions + minResidualRisk + maxPrompts)', async () => {
      const dto = {
        sessionId: 'session-123',
        dimensions: ['arch_sec', 'quality'],
        minResidualRisk: 0.3,
        maxPrompts: 1,
      };

      const mockBatch = {
        sessionId: 'session-123',
        prompts: [
          { id: 'p-1', questionId: 'q-1', dimensionKey: 'arch_sec' },
          { id: 'p-2', questionId: 'q-2', dimensionKey: 'devops' },
          { id: 'p-3', questionId: 'q-3', dimensionKey: 'quality' },
        ],
      };

      const mockGaps = [
        { questionId: 'q-1', residualRisk: 0.5 },
        { questionId: 'q-3', residualRisk: 0.4 },
      ];

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);
      mockQpgService.getSessionGaps.mockResolvedValue(mockGaps);

      const result = await controller.generatePrompts(dto);

      expect(result.prompts).toHaveLength(1);
      expect(result.filteredCount).toBe(1);
    });
  });

  describe('getSessionPrompts', () => {
    it('should return prompts for a session', async () => {
      const mockBatch = {
        sessionId: 'session-123',
        generatedAt: new Date(),
        prompts: [
          { id: 'p-1', dimensionKey: 'arch_sec' },
        ],
      };

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);

      const result = await controller.getSessionPrompts('session-123');

      expect(result.sessionId).toBe('session-123');
      expect(mockQpgService.generatePromptsForSession).toHaveBeenCalledWith('session-123');
    });
  });

  describe('getTemplates', () => {
    it('should return available prompt templates', async () => {
      const mockTemplates = [
        { id: 't-1', dimensionKey: 'arch_sec', version: '1.0', evidenceType: 'CODE', baseEffortHours: 8 },
        { id: 't-2', dimensionKey: 'devops', version: '1.0', evidenceType: 'CONFIG', baseEffortHours: 4 },
      ];

      mockQpgService.getAvailableTemplates.mockResolvedValue(mockTemplates);

      const result = await controller.getTemplates();

      expect(result.count).toBe(2);
      expect(result.templates[0].dimensionKey).toBe('arch_sec');
    });
  });

  describe('getSessionGaps', () => {
    it('should return gaps for a session', async () => {
      const mockGaps = [
        {
          dimensionKey: 'arch_sec',
          dimensionName: 'Architecture & Security',
          questionId: 'q-1',
          currentCoverage: 0.3,
          severity: 0.8,
          residualRisk: 0.56,
          bestPractice: 'Implement encryption at rest',
        },
        {
          dimensionKey: 'devops',
          dimensionName: 'DevOps',
          questionId: 'q-2',
          currentCoverage: 0.5,
          severity: 0.6,
          residualRisk: 0.3,
          bestPractice: 'Set up CI/CD pipelines',
        },
      ];

      mockQpgService.getSessionGaps.mockResolvedValue(mockGaps);

      const result = await controller.getSessionGaps('session-123');

      expect(result.sessionId).toBe('session-123');
      expect(result.count).toBe(2);
      expect(result.gaps[0].residualRisk).toBe(0.56);
    });
  });

  describe('exportPrompts', () => {
    it('should export prompts as JSON', async () => {
      const mockBatch = {
        sessionId: 'session-123',
        generatedAt: new Date(),
        prompts: [{ id: 'p-1' }],
      };

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);

      const result = await controller.exportPrompts('session-123', 'json') as any;

      expect(result.sessionId).toBe('session-123');
      expect(result.prompts).toHaveLength(1);
    });

    it('should export prompts as markdown', async () => {
      const mockBatch = {
        sessionId: 'session-123',
        generatedAt: new Date(),
        scoreAtGeneration: 72,
        totalEffortHours: 80,
        dimensionsCovered: ['arch_sec'],
        prompts: [{ id: 'p-1', title: 'Security Prompt' }],
      };

      mockQpgService.generatePromptsForSession.mockResolvedValue(mockBatch);
      mockPromptGenerator.formatAsMarkdown.mockReturnValue('# Security Prompt\n...');

      const result = await controller.exportPrompts('session-123', 'markdown') as any;

      expect(result.format).toBe('markdown');
      expect(result.content).toContain('Quiz2Biz');
    });
  });
});
