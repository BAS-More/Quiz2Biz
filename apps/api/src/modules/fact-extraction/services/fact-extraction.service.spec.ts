/**
 * Fact Extraction Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { FactExtractionService } from './fact-extraction.service';
import { PrismaService } from '@libs/database';
import { AiGatewayService } from '../../ai-gateway/ai-gateway.service';
import { Prisma } from '@prisma/client';

// Mock the schema module
jest.mock('../schemas/extraction-schemas', () => ({
  getSchemaForProjectType: jest.fn((slug: string) => {
    if (slug === 'business-plan') {
      return {
        projectTypeSlug: 'business-plan',
        projectTypeName: 'Business Plan',
        fields: [
          {
            key: 'company_name',
            description: 'Company name',
            category: 'business_overview',
            required: true,
          },
          {
            key: 'target_market',
            description: 'Target market',
            category: 'market_analysis',
            required: true,
          },
          {
            key: 'revenue_model',
            description: 'Revenue model',
            category: 'financial_data',
            required: false,
          },
        ],
        systemPromptAddition: 'Focus on business planning facts.',
      };
    }
    return null;
  }),
}));

describe('FactExtractionService', () => {
  let service: FactExtractionService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    projectType: { id: 'pt-1', slug: 'business-plan', name: 'Business Plan' },
  };

  const mockExtractedFact = {
    id: 'fact-1',
    projectId: 'project-1',
    fieldName: 'company_name',
    fieldValue: 'Acme Corp',
    category: 'business_overview',
    label: null,
    confidence: new Prisma.Decimal(0.9),
    confirmedByUser: false,
    sourceMessageId: 'msg-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = {
    content: JSON.stringify({
      facts: [
        {
          key: 'company_name',
          value: 'Acme Corp',
          category: 'business_overview',
          confidence: 'high',
        },
        { key: 'target_market', value: 'SMBs', category: 'market_analysis', confidence: 'medium' },
      ],
    }),
    provider: 'claude' as const,
    model: 'claude-sonnet-4-20250514',
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
    latencyMs: 200,
    finishReason: 'stop',
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findUnique: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
      },
      extractedFact: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      projectType: {
        findUnique: jest.fn(),
      },
    };

    const mockAiGateway = {
      generate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FactExtractionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockAiGateway },
      ],
    }).compile();

    service = module.get<FactExtractionService>(FactExtractionService);
    prismaService = module.get(PrismaService);
    aiGatewayService = module.get(AiGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractFacts', () => {
    it('should extract facts from conversation', async () => {
      aiGatewayService.generate.mockResolvedValue(mockAiResponse);

      const result = await service.extractFacts({
        projectId: 'project-1',
        conversationContent: 'USER: We are Acme Corp targeting SMBs',
        projectTypeSlug: 'business-plan',
      });

      expect(result.facts).toHaveLength(2);
      expect(result.facts[0].key).toBe('company_name');
      expect(result.facts[0].confidence).toBe('high');
      expect(result.tokensUsed).toBe(150);
    });

    it('should return empty facts for unknown project type', async () => {
      const result = await service.extractFacts({
        projectId: 'project-1',
        conversationContent: 'Some content',
        projectTypeSlug: 'unknown-type',
      });

      expect(result.facts).toHaveLength(0);
      expect(aiGatewayService.generate).not.toHaveBeenCalled();
    });

    it('should handle AI gateway errors gracefully', async () => {
      aiGatewayService.generate.mockRejectedValue(new Error('AI service down'));

      const result = await service.extractFacts({
        projectId: 'project-1',
        conversationContent: 'Some content',
        projectTypeSlug: 'business-plan',
      });

      expect(result.facts).toHaveLength(0);
      expect(result.tokensUsed).toBe(0);
    });

    it('should handle malformed AI response', async () => {
      aiGatewayService.generate.mockResolvedValue({
        ...mockAiResponse,
        content: 'not valid json at all',
      });

      const result = await service.extractFacts({
        projectId: 'project-1',
        conversationContent: 'Some content',
        projectTypeSlug: 'business-plan',
      });

      expect(result.facts).toHaveLength(0);
    });

    it('should handle AI response wrapped in markdown code blocks', async () => {
      aiGatewayService.generate.mockResolvedValue({
        ...mockAiResponse,
        content:
          '```json\n{"facts":[{"key":"company_name","value":"Test","category":"business_overview","confidence":"high"}]}\n```',
      });

      const result = await service.extractFacts({
        projectId: 'project-1',
        conversationContent: 'Some content',
        projectTypeSlug: 'business-plan',
      });

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0].key).toBe('company_name');
    });
  });

  describe('triggerExtractionAfterMessage', () => {
    it('should trigger extraction with correct context', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject as never);
      (prismaService.chatMessage.findMany as jest.Mock).mockResolvedValue([
        { role: 'user', content: 'We are Acme Corp', createdAt: new Date() },
        { role: 'assistant', content: 'Great!', createdAt: new Date() },
      ] as never);
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.extractedFact.upsert as jest.Mock).mockResolvedValue(mockExtractedFact);
      aiGatewayService.generate.mockResolvedValue(mockAiResponse);

      const result = await service.triggerExtractionAfterMessage('project-1', 'msg-1');

      expect(result.length).toBeGreaterThan(0);
      expect(prismaService.extractedFact.upsert).toHaveBeenCalled();
    });

    it('should return empty array when project not found', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.triggerExtractionAfterMessage('missing-project', 'msg-1');

      expect(result).toHaveLength(0);
    });

    it('should return empty array when project has no type', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        projectType: null,
      } as never);

      const result = await service.triggerExtractionAfterMessage('project-1', 'msg-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getProjectFacts', () => {
    it('should return mapped facts for a project', async () => {
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([mockExtractedFact] as never);

      const result = await service.getProjectFacts('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('company_name');
      expect(result[0].value).toBe('Acme Corp');
      expect(result[0].confidence).toBe('high');
    });

    it('should return empty array when no facts exist', async () => {
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getProjectFacts('project-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('validateFacts', () => {
    it('should identify missing required fields', async () => {
      (prismaService.extractedFact.findMany as jest.Mock).mockResolvedValue([mockExtractedFact] as never);

      const result = await service.validateFacts('project-1', 'business-plan');

      expect(result.isValid).toBe(false);
      expect(result.missingRequired).toContain('target_market');
      expect(result.completenessScore).toBeGreaterThan(0);
    });

    it('should return invalid for unknown project type', async () => {
      const result = await service.validateFacts('project-1', 'unknown-type');

      expect(result.isValid).toBe(false);
      expect(result.completenessScore).toBe(0);
    });
  });

  describe('deleteFact', () => {
    it('should delete a fact by project and field name', async () => {
      (prismaService.extractedFact.delete as jest.Mock).mockResolvedValue(mockExtractedFact);

      await service.deleteFact('project-1', 'company_name');

      expect(prismaService.extractedFact.delete).toHaveBeenCalledWith({
        where: {
          projectId_fieldName: {
            projectId: 'project-1',
            fieldName: 'company_name',
          },
        },
      });
    });
  });

  describe('updateFact', () => {
    it('should update fact with high confidence and user confirmation', async () => {
      const updatedFact = { ...mockExtractedFact, fieldValue: 'New Corp', confirmedByUser: true };
      (prismaService.extractedFact.update as jest.Mock).mockResolvedValue(updatedFact);

      const result = await service.updateFact('project-1', 'company_name', 'New Corp');

      expect(result).not.toBeNull();
      expect(result!.value).toBe('New Corp');
      expect(prismaService.extractedFact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldValue: 'New Corp',
            confirmedByUser: true,
          }),
        }),
      );
    });
  });
});
