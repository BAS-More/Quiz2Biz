import { Test, TestingModule } from '@nestjs/testing';
import { QpgService } from './qpg.service';
import { PrismaService } from '@libs/database';
import { PromptTemplateService } from './services/prompt-template.service';
import { ContextBuilderService } from './services/context-builder.service';
import { PromptGeneratorService } from './services/prompt-generator.service';
import { GapContext, QuestModePrompt, EvidenceType } from './types';

describe('QpgService', () => {
  let service: QpgService;
  let templateService: PromptTemplateService;
  let contextBuilder: ContextBuilderService;
  let promptGenerator: PromptGeneratorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QpgService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: PromptTemplateService,
          useValue: {
            getTemplateForDimension: jest.fn(),
            getAllTemplates: jest.fn(),
          },
        },
        {
          provide: ContextBuilderService,
          useValue: {
            buildGapContexts: jest.fn(),
          },
        },
        {
          provide: PromptGeneratorService,
          useValue: {
            generate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QpgService>(QpgService);
    templateService = module.get<PromptTemplateService>(PromptTemplateService);
    contextBuilder = module.get<ContextBuilderService>(ContextBuilderService);
    promptGenerator = module.get<PromptGeneratorService>(PromptGeneratorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generatePromptsForSession', () => {
    it('generates prompts for all gaps', async () => {
      const gaps: GapContext[] = [
        {
          sessionId: 'session-123',
          dimensionKey: 'security',
          dimensionName: 'Security',
          questionId: 'q1',
          questionText: 'Do you have MFA?',
          currentCoverage: 0.25,
          severity: 0.8,
          residualRisk: 0.6,
          bestPractice: '',
          practicalExplainer: '',
          standardRefs: [],
          userAnswer: 'No',
        } as GapContext,
        {
          sessionId: 'session-123',
          dimensionKey: 'architecture',
          dimensionName: 'Architecture',
          questionId: 'q2',
          questionText: 'Do you have microservices?',
          currentCoverage: 0.5,
          severity: 0.7,
          residualRisk: 0.35,
          bestPractice: '',
          practicalExplainer: '',
          standardRefs: [],
          userAnswer: 'No',
        } as GapContext,
      ];

      const mockPrompts: QuestModePrompt[] = [
        {
          id: 'prompt-1',
          dimensionKey: 'security',
          questionId: 'q1',
          goal: 'Add MFA to application',
          tasks: [
            { order: 1, description: 'Setup MFA provider' },
            { order: 2, description: 'Integrate with auth system' },
          ],
          acceptanceCriteria: ['Users can enable MFA'],
          constraints: ['Use open source solution'],
          deliverables: ['MFA module', 'Documentation'],
          priority: 1,
          estimatedEffort: 16,
          evidenceType: EvidenceType.DOCUMENT,
          tags: ['security'],
          generatedAt: new Date(),
        } as QuestModePrompt,
        {
          id: 'prompt-2',
          dimensionKey: 'architecture',
          questionId: 'q2',
          goal: 'Split monolith',
          tasks: [{ order: 1, description: 'Identify boundaries' }],
          acceptanceCriteria: ['Services deployed independently'],
          constraints: ['Maintain data consistency'],
          deliverables: ['Microservices architecture'],
          priority: 2,
          estimatedEffort: 40,
          evidenceType: EvidenceType.DOCUMENT,
          tags: ['architecture'],
          generatedAt: new Date(),
        } as QuestModePrompt,
      ];

      jest.spyOn(contextBuilder, 'buildGapContexts').mockResolvedValue(gaps);
      jest
        .spyOn(templateService, 'getTemplateForDimension')
        .mockResolvedValue({ id: 'template-1' } as any);
      jest
        .spyOn(promptGenerator, 'generate')
        .mockResolvedValueOnce(mockPrompts[0])
        .mockResolvedValueOnce(mockPrompts[1]);
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-123',
        readinessScore: 75.5,
      } as any);

      const result = await service.generatePromptsForSession('session-123');

      expect(result).toMatchObject({
        sessionId: 'session-123',
        prompts: expect.arrayContaining([
          expect.objectContaining({ id: 'prompt-1' }),
          expect.objectContaining({ id: 'prompt-2' }),
        ]),
        totalEffortHours: 56,
        dimensionsCovered: expect.arrayContaining(['security', 'architecture']),
        scoreAtGeneration: 75.5,
      });
    });

    it('handles missing templates gracefully', async () => {
      const gaps: GapContext[] = [
        {
          sessionId: 'session-123',
          dimensionKey: 'unknown',
          dimensionName: 'Unknown',
          questionId: 'q1',
          questionText: 'Unknown dimension question',
          currentCoverage: 0.25,
          severity: 0.8,
          residualRisk: 0.6,
          bestPractice: '',
          practicalExplainer: '',
          standardRefs: [],
          userAnswer: 'No',
        } as GapContext,
      ];

      jest.spyOn(contextBuilder, 'buildGapContexts').mockResolvedValue(gaps);
      jest.spyOn(templateService, 'getTemplateForDimension').mockResolvedValue(null);
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-123',
        readinessScore: 75.5,
      } as any);

      const result = await service.generatePromptsForSession('session-123');

      expect(result.prompts).toHaveLength(0);
    });

    it('sorts prompts by priority', async () => {
      const gaps: GapContext[] = [
        {
          sessionId: 'session-123',
          dimensionKey: 'security',
          dimensionName: 'Security',
          questionId: 'q1',
          questionText: '',
          currentCoverage: 0,
          severity: 0,
          residualRisk: 0.3,
          bestPractice: '',
          practicalExplainer: '',
          standardRefs: [],
        } as GapContext,
        {
          sessionId: 'session-123',
          dimensionKey: 'architecture',
          dimensionName: 'Architecture',
          questionId: 'q2',
          questionText: '',
          currentCoverage: 0,
          severity: 0,
          residualRisk: 0.6,
          bestPractice: '',
          practicalExplainer: '',
          standardRefs: [],
        } as GapContext,
      ];

      const mockPrompts: QuestModePrompt[] = [
        {
          id: 'prompt-1',
          dimensionKey: 'security',
          questionId: 'q1',
          goal: 'Goal 1',
          tasks: [],
          acceptanceCriteria: [],
          constraints: [],
          deliverables: [],
          priority: 2,
          estimatedEffort: 10,
          evidenceType: EvidenceType.DOCUMENT,
          tags: [],
          generatedAt: new Date(),
        } as QuestModePrompt,
        {
          id: 'prompt-2',
          dimensionKey: 'architecture',
          questionId: 'q2',
          goal: 'Goal 2',
          tasks: [],
          acceptanceCriteria: [],
          constraints: [],
          deliverables: [],
          priority: 1,
          estimatedEffort: 20,
          evidenceType: EvidenceType.DOCUMENT,
          tags: [],
          generatedAt: new Date(),
        } as QuestModePrompt,
      ];

      jest.spyOn(contextBuilder, 'buildGapContexts').mockResolvedValue(gaps);
      jest
        .spyOn(templateService, 'getTemplateForDimension')
        .mockResolvedValue({ id: 'template-1' } as any);
      jest
        .spyOn(promptGenerator, 'generate')
        .mockResolvedValueOnce(mockPrompts[0])
        .mockResolvedValueOnce(mockPrompts[1]);
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-123',
        readinessScore: 75.5,
      } as any);

      const result = await service.generatePromptsForSession('session-123');

      expect(result.prompts[0].priority).toBe(1);
      expect(result.prompts[1].priority).toBe(2);
    });
  });

  describe('generatePromptForGap', () => {
    it('generates prompt for specific gap', async () => {
      const gap: GapContext = {
        sessionId: 'session-123',
        dimensionKey: 'security',
        dimensionName: 'Security',
        questionId: 'q1',
        questionText: 'Do you have MFA?',
        currentCoverage: 0.25,
        severity: 0.8,
        residualRisk: 0.6,
        bestPractice: '',
        practicalExplainer: '',
        standardRefs: [],
        userAnswer: 'No',
      } as GapContext;

      const mockPrompt: QuestModePrompt = {
        id: 'prompt-1',
        dimensionKey: 'security',
        questionId: 'q1',
        goal: 'Implement MFA',
        tasks: [],
        acceptanceCriteria: [],
        constraints: [],
        deliverables: [],
        priority: 1,
        estimatedEffort: 8,
        evidenceType: EvidenceType.DOCUMENT,
        tags: [],
        generatedAt: new Date(),
      } as QuestModePrompt;

      jest
        .spyOn(templateService, 'getTemplateForDimension')
        .mockResolvedValue({ id: 'template-1' } as any);
      jest.spyOn(promptGenerator, 'generate').mockResolvedValue(mockPrompt);

      const result = await service.generatePromptForGap(gap);

      expect(result).toEqual(mockPrompt);
    });

    it('returns null when template not found', async () => {
      const gap: GapContext = {
        sessionId: 'session-123',
        dimensionKey: 'unknown',
        dimensionName: 'Unknown',
        questionId: 'q1',
        questionText: '',
        currentCoverage: 0,
        severity: 0,
        residualRisk: 0.5,
        bestPractice: '',
        practicalExplainer: '',
        standardRefs: [],
      } as GapContext;

      jest.spyOn(templateService, 'getTemplateForDimension').mockResolvedValue(null);

      const result = await service.generatePromptForGap(gap);

      expect(result).toBeNull();
    });
  });

  describe('getAvailableTemplates', () => {
    it('retrieves all templates', async () => {
      const mockTemplates = [
        { id: 'template-1', dimension: 'security' },
        { id: 'template-2', dimension: 'architecture' },
      ];

      jest.spyOn(templateService, 'getAllTemplates').mockResolvedValue(mockTemplates as any);

      const result = await service.getAvailableTemplates();

      expect(result).toEqual(mockTemplates);
    });
  });

  describe('getSessionGaps', () => {
    it('retrieves session gaps', async () => {
      const mockGaps: GapContext[] = [
        {
          sessionId: 'session-123',
          dimensionKey: 'security',
          dimensionName: 'Security',
          questionId: 'q1',
          questionText: '',
          currentCoverage: 0,
          severity: 0,
          residualRisk: 0.3,
          bestPractice: '',
          practicalExplainer: '',
          standardRefs: [],
        } as GapContext,
        {
          sessionId: 'session-123',
          dimensionKey: 'architecture',
          dimensionName: 'Architecture',
          questionId: 'q2',
          questionText: '',
          currentCoverage: 0,
          severity: 0,
          residualRisk: 0.4,
          bestPractice: '',
          practicalExplainer: '',
          standardRefs: [],
        } as GapContext,
      ];

      jest.spyOn(contextBuilder, 'buildGapContexts').mockResolvedValue(mockGaps);

      const result = await service.getSessionGaps('session-123');

      expect(result).toEqual(mockGaps);
      expect(contextBuilder.buildGapContexts).toHaveBeenCalledWith('session-123');
    });
  });
});
