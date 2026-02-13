import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TemplateEngineService } from '../services/template-engine.service';
import { PrismaService } from '@libs/database';
import { DocumentCategory } from '@prisma/client';

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;
  let prismaService: any; // Use any for mocked service

  const mockDocumentType = {
    id: 'doc-type-1',
    name: 'Business Plan',
    slug: 'business-plan',
    category: DocumentCategory.CFO,
    description: 'Business planning document',
    templatePath: null,
    requiredQuestions: [],
    outputFormats: ['DOCX'],
    estimatedPages: 15,
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    standardMappings: [],
  };

  const mockResponses = [
    {
      id: 'response-1',
      sessionId: 'session-1',
      questionId: 'question-1',
      value: { text: 'Acme Corporation' },
      isValid: true,
      question: {
        id: 'question-1',
        text: 'Company Name',
        type: 'TEXT',
        documentMappings: { 'business-plan': 'executive_summary.company_name' },
        options: null,
      },
    },
    {
      id: 'response-2',
      sessionId: 'session-1',
      questionId: 'question-2',
      value: { number: 5000000 },
      isValid: true,
      question: {
        id: 'question-2',
        text: 'Total Addressable Market',
        type: 'NUMBER',
        documentMappings: { 'business-plan': 'market_analysis.tam' },
        options: null,
      },
    },
    {
      id: 'response-3',
      sessionId: 'session-1',
      questionId: 'question-3',
      value: { selectedOptionId: 'opt-1' },
      isValid: true,
      question: {
        id: 'question-3',
        text: 'Industry',
        type: 'SINGLE_CHOICE',
        documentMappings: { 'business-plan': 'company_description.industry' },
        options: [
          { value: 'opt-1', label: 'Technology' },
          { value: 'opt-2', label: 'Healthcare' },
        ],
      },
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      documentType: {
        findUnique: jest.fn(),
      },
      response: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateEngineService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<TemplateEngineService>(TemplateEngineService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assembleTemplateData', () => {
    it('should assemble template data from responses', async () => {
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);
      prismaService.response.findMany.mockResolvedValue(mockResponses);

      const result = await service.assembleTemplateData('session-1', 'business-plan');

      expect(result.metadata.documentType).toBe('Business Plan');
      expect(result.metadata.category).toBe(DocumentCategory.CFO);
      expect(result.content).toEqual({
        executive_summary: {
          company_name: 'Acme Corporation',
        },
        market_analysis: {
          tam: 5000000,
        },
        company_description: {
          industry: 'Technology',
        },
      });
    });

    it('should throw NotFoundException for invalid document type slug', async () => {
      prismaService.documentType.findUnique.mockResolvedValue(null);

      await expect(service.assembleTemplateData('session-1', 'invalid-slug')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty responses', async () => {
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);
      prismaService.response.findMany.mockResolvedValue([]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');

      expect(result.content).toEqual({});
    });

    it('should handle responses without documentMappings for target type', async () => {
      const responseWithoutMapping = {
        ...mockResponses[0],
        question: {
          ...mockResponses[0].question,
          documentMappings: { 'other-document': 'some.path' },
        },
      };
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);
      prismaService.response.findMany.mockResolvedValue([responseWithoutMapping]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');

      expect(result.content).toEqual({});
    });
  });

  describe('getValue', () => {
    it('should get nested value using dot notation', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {
          section: {
            nested: {
              value: 'test',
            },
          },
        },
      };

      const result = service.getValue(data, 'section.nested.value');
      expect(result).toBe('test');
    });

    it('should return undefined for missing path', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {},
      };

      const result = service.getValue(data, 'missing.path');
      expect(result).toBeUndefined();
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate all required fields present', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {
          company: { name: 'Test' },
          market: { size: 1000000 },
        },
      };

      const result = service.validateRequiredFields(data, ['company.name', 'market.size']);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should report missing required fields', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {
          company: { name: 'Test' },
        },
      };

      const result = service.validateRequiredFields(data, [
        'company.name',
        'market.size',
        'financial.revenue',
      ]);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['market.size', 'financial.revenue']);
    });
  });
});
