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
  getSchemaForProjectType: jest.fn(),
}));

import { getSchemaForProjectType } from '../schemas/extraction-schemas';

describe('FactExtractionService', () => {
  let service: FactExtractionService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;

  const mockSchema = {
    projectTypeName: 'Business Plan',
    systemPromptAddition: 'Focus on business metrics',
    fields: [
      { key: 'company_name', description: 'Company name', required: true },
      { key: 'target_market', description: 'Target market', required: true },
      { key: 'revenue_model', description: 'Revenue model', required: false },
    ],
  };

  const mockExtractedFact = {
    id: 'fact-1',
    projectId: 'project-123',
    fieldName: 'company_name',
    fieldValue: 'Acme Corp',
    category: 'business_overview',
    confidence: new Prisma.Decimal(0.9),
    sourceMessageId: 'msg-123',
    confirmedByUser: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
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
    };

    const mockAiGatewayService = {
      generate: jest.fn(),
    };

    (getSchemaForProjectType as jest.Mock).mockReturnValue(mockSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FactExtractionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiGatewayService, useValue: mockAiGatewayService },
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
    const mockRequest = {
      projectId: 'project-123',
      conversationContent: 'USER: My company is Acme Corp\nASSISTANT: Great!',
      projectTypeSlug: 'business-plan',
      existingFacts: [],
    };

    it('should extract facts from conversation', async () => {
      aiGatewayService.generate.mockResolvedValue({
        content: JSON.stringify({
          facts: [
            { key: 'company_name', value: 'Acme Corp', category: 'business_overview', confidence: 'high' },
          ],
        }),
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
        latencyMs: 500,
        finishReason: 'stop',
      });

      const result = await service.extractFacts(mockRequest);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0].key).toBe('company_name');
      expect(result.facts[0].value).toBe('Acme Corp');
      expect(result.tokensUsed).toBe(150);
    });

    it('should return empty array when no schema found', async () => {
      (getSchemaForProjectType as jest.Mock).mockReturnValue(null);

      const result = await service.extractFacts(mockRequest);

      expect(result.facts).toHaveLength(0);
      expect(aiGatewayService.generate).not.toHaveBeenCalled();
    });

    it('should handle AI extraction failure gracefully', async () => {
      aiGatewayService.generate.mockRejectedValue(new Error('AI failed'));

      const result = await service.extractFacts(mockRequest);

      expect(result.facts).toHaveLength(0);
      expect(result.tokensUsed).toBe(0);
    });

    it('should handle markdown-wrapped JSON response', async () => {
      aiGatewayService.generate.mockResolvedValue({
        content: '```json\n{"facts": [{"key": "test", "value": "value", "category": "test", "confidence": "medium"}]}\n```',
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
        latencyMs: 500,
        finishReason: 'stop',
      });

      const result = await service.extractFacts(mockRequest);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0].key).toBe('test');
    });

    it('should handle invalid JSON response', async () => {
      aiGatewayService.generate.mockResolvedValue({
        content: 'Invalid JSON',
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
        latencyMs: 500,
        finishReason: 'stop',
      });

      const result = await service.extractFacts(mockRequest);

      expect(result.facts).toHaveLength(0);
    });
  });

  describe('triggerExtractionAfterMessage', () => {
    const mockProject = {
      id: 'project-123',
      projectType: { slug: 'business-plan' },
    };

    beforeEach(() => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.chatMessage.findMany.mockResolvedValue([
        { role: 'user', content: 'My company is Acme', createdAt: new Date() },
      ]);
      prismaService.extractedFact.findMany.mockResolvedValue([]);
    });

    it('should trigger extraction after message', async () => {
      aiGatewayService.generate.mockResolvedValue({
        content: JSON.stringify({ facts: [] }),
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
        latencyMs: 500,
        finishReason: 'stop',
      });

      const result = await service.triggerExtractionAfterMessage('project-123', 'msg-123');

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        include: { projectType: true },
      });
      expect(result).toEqual([]);
    });

    it('should return empty array if project not found', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      const result = await service.triggerExtractionAfterMessage('invalid-id', 'msg-123');

      expect(result).toEqual([]);
    });

    it('should return empty array if project has no type', async () => {
      prismaService.project.findUnique.mockResolvedValue({
        id: 'project-123',
        projectType: null,
      });

      const result = await service.triggerExtractionAfterMessage('project-123', 'msg-123');

      expect(result).toEqual([]);
    });
  });

  describe('saveFacts', () => {
    it('should save facts to database', async () => {
      prismaService.extractedFact.upsert.mockResolvedValue(mockExtractedFact);

      const facts = [
        { category: 'business_overview' as const, key: 'company_name', value: 'Acme', confidence: 'high' as const },
      ];

      const result = await service.saveFacts('project-123', facts, 'msg-123');

      expect(result).toHaveLength(1);
      expect(prismaService.extractedFact.upsert).toHaveBeenCalledWith({
        where: {
          projectId_fieldName: {
            projectId: 'project-123',
            fieldName: 'company_name',
          },
        },
        create: expect.objectContaining({
          projectId: 'project-123',
          fieldName: 'company_name',
          fieldValue: 'Acme',
        }),
        update: expect.objectContaining({
          fieldValue: 'Acme',
        }),
      });
    });

    it('should handle save errors gracefully', async () => {
      prismaService.extractedFact.upsert.mockRejectedValue(new Error('DB error'));

      const facts = [
        { category: 'business_overview' as const, key: 'company_name', value: 'Acme', confidence: 'high' as const },
      ];

      const result = await service.saveFacts('project-123', facts);

      expect(result).toHaveLength(0);
    });
  });

  describe('getProjectFacts', () => {
    it('should return all facts for project', async () => {
      prismaService.extractedFact.findMany.mockResolvedValue([mockExtractedFact]);

      const result = await service.getProjectFacts('project-123');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('company_name');
      expect(result[0].confidence).toBe('high');
    });

    it('should return empty array when no facts', async () => {
      prismaService.extractedFact.findMany.mockResolvedValue([]);

      const result = await service.getProjectFacts('project-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('validateFacts', () => {
    beforeEach(() => {
      (getSchemaForProjectType as jest.Mock).mockReturnValue(mockSchema);
    });

    it('should return valid when all required facts present', async () => {
      prismaService.extractedFact.findMany.mockResolvedValue([
        { ...mockExtractedFact, fieldName: 'company_name' },
        { ...mockExtractedFact, fieldName: 'target_market' },
      ]);

      const result = await service.validateFacts('project-123', 'business-plan');

      expect(result.isValid).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });

    it('should return invalid when required facts missing', async () => {
      prismaService.extractedFact.findMany.mockResolvedValue([
        { ...mockExtractedFact, fieldName: 'company_name' },
      ]);

      const result = await service.validateFacts('project-123', 'business-plan');

      expect(result.isValid).toBe(false);
      expect(result.missingRequired).toContain('target_market');
    });

    it('should identify low confidence facts', async () => {
      prismaService.extractedFact.findMany.mockResolvedValue([
        { ...mockExtractedFact, confidence: new Prisma.Decimal(0.2) },
      ]);

      const result = await service.validateFacts('project-123', 'business-plan');

      expect(result.lowConfidenceFacts).toContain('company_name');
    });

    it('should handle missing schema', async () => {
      (getSchemaForProjectType as jest.Mock).mockReturnValue(null);

      const result = await service.validateFacts('project-123', 'invalid-type');

      expect(result.isValid).toBe(false);
      expect(result.completenessScore).toBe(0);
    });
  });

  describe('deleteFact', () => {
    it('should delete fact from database', async () => {
      prismaService.extractedFact.delete.mockResolvedValue(mockExtractedFact);

      await service.deleteFact('project-123', 'company_name');

      expect(prismaService.extractedFact.delete).toHaveBeenCalledWith({
        where: {
          projectId_fieldName: {
            projectId: 'project-123',
            fieldName: 'company_name',
          },
        },
      });
    });
  });

  describe('updateFact', () => {
    it('should update fact value', async () => {
      prismaService.extractedFact.update.mockResolvedValue({
        ...mockExtractedFact,
        fieldValue: 'Updated Value',
        confidence: new Prisma.Decimal(0.95),
        confirmedByUser: true,
      });

      const result = await service.updateFact('project-123', 'company_name', 'Updated Value');

      expect(result).not.toBeNull();
      expect(result?.value).toBe('Updated Value');
      expect(result?.confidence).toBe('high');
      expect(prismaService.extractedFact.update).toHaveBeenCalledWith({
        where: {
          projectId_fieldName: {
            projectId: 'project-123',
            fieldName: 'company_name',
          },
        },
        data: expect.objectContaining({
          fieldValue: 'Updated Value',
          confirmedByUser: true,
        }),
      });
    });
  });
});
