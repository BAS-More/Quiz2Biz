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

    it('should report empty string as missing field', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {
          company: { name: '' },
        },
      };

      const result = service.validateRequiredFields(data, ['company.name']);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['company.name']);
    });

    it('should report null value as missing field', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {
          company: { name: null },
        },
      };

      const result = service.validateRequiredFields(data, ['company.name']);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['company.name']);
    });
  });

  describe('extractResponseValue - all question types', () => {
    beforeEach(() => {
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);
    });

    it('should extract TEXTAREA value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'Long text content here' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Description',
            type: 'TEXTAREA',
            documentMappings: { 'business-plan': 'description' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ description: 'Long text content here' });
    });

    it('should extract EMAIL value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'test@example.com' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Email',
            type: 'EMAIL',
            documentMappings: { 'business-plan': 'contact.email' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ contact: { email: 'test@example.com' } });
    });

    it('should extract URL value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'https://example.com' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Website',
            type: 'URL',
            documentMappings: { 'business-plan': 'website' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ website: 'https://example.com' });
    });

    it('should extract DATE value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { date: '2024-06-15' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Launch Date',
            type: 'DATE',
            documentMappings: { 'business-plan': 'timeline.launch_date' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ timeline: { launch_date: '2024-06-15' } });
    });

    it('should extract SCALE value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { rating: 4 },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Confidence Level',
            type: 'SCALE',
            documentMappings: { 'business-plan': 'confidence' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ confidence: 4 });
    });

    it('should extract MULTIPLE_CHOICE value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { selectedOptionIds: ['opt-1', 'opt-3'] },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Features',
            type: 'MULTIPLE_CHOICE',
            documentMappings: { 'business-plan': 'features' },
            options: [
              { value: 'opt-1', label: 'Feature A' },
              { value: 'opt-2', label: 'Feature B' },
              { value: 'opt-3', label: 'Feature C' },
            ],
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ features: ['Feature A', 'Feature C'] });
    });

    it('should handle MULTIPLE_CHOICE with missing option labels', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { selectedOptionIds: ['opt-1', 'opt-unknown'] },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Features',
            type: 'MULTIPLE_CHOICE',
            documentMappings: { 'business-plan': 'features' },
            options: [{ value: 'opt-1', label: 'Feature A' }],
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ features: ['Feature A', 'opt-unknown'] });
    });

    it('should handle MULTIPLE_CHOICE with null options', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { selectedOptionIds: ['opt-1'] },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Features',
            type: 'MULTIPLE_CHOICE',
            documentMappings: { 'business-plan': 'features' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ features: ['opt-1'] });
    });

    it('should extract FILE_UPLOAD value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { fileUrl: 'https://storage.example.com/file.pdf' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Upload Document',
            type: 'FILE_UPLOAD',
            documentMappings: { 'business-plan': 'attachments.document' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({
        attachments: { document: 'https://storage.example.com/file.pdf' },
      });
    });

    it('should extract MATRIX value', async () => {
      const matrixValue = {
        row1: { col1: 5, col2: 3 },
        row2: { col1: 4, col2: 4 },
      };
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { matrix: matrixValue },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Assessment Matrix',
            type: 'MATRIX',
            documentMappings: { 'business-plan': 'assessment' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ assessment: matrixValue });
    });

    it('should handle unknown question type (default case)', async () => {
      const customValue = { custom: 'value', data: 123 };
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: customValue,
          isValid: true,
          question: {
            id: 'q1',
            text: 'Custom Field',
            type: 'CUSTOM_TYPE',
            documentMappings: { 'business-plan': 'custom' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ custom: customValue });
    });

    it('should handle missing text value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: {},
          isValid: true,
          question: {
            id: 'q1',
            text: 'Name',
            type: 'TEXT',
            documentMappings: { 'business-plan': 'name' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ name: '' });
    });

    it('should handle missing number value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: {},
          isValid: true,
          question: {
            id: 'q1',
            text: 'Amount',
            type: 'NUMBER',
            documentMappings: { 'business-plan': 'amount' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ amount: 0 });
    });

    it('should handle missing date value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: {},
          isValid: true,
          question: {
            id: 'q1',
            text: 'Date',
            type: 'DATE',
            documentMappings: { 'business-plan': 'date' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ date: null });
    });

    it('should handle missing rating value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: {},
          isValid: true,
          question: {
            id: 'q1',
            text: 'Rating',
            type: 'SCALE',
            documentMappings: { 'business-plan': 'rating' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ rating: 0 });
    });

    it('should handle missing fileUrl value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: {},
          isValid: true,
          question: {
            id: 'q1',
            text: 'File',
            type: 'FILE_UPLOAD',
            documentMappings: { 'business-plan': 'file' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ file: null });
    });

    it('should handle missing matrix value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: {},
          isValid: true,
          question: {
            id: 'q1',
            text: 'Matrix',
            type: 'MATRIX',
            documentMappings: { 'business-plan': 'matrix' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ matrix: {} });
    });

    it('should handle SINGLE_CHOICE with null options', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { selectedOptionId: 'opt-1' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Choice',
            type: 'SINGLE_CHOICE',
            documentMappings: { 'business-plan': 'choice' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ choice: 'opt-1' });
    });

    it('should handle SINGLE_CHOICE with missing option', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { selectedOptionId: 'opt-unknown' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Choice',
            type: 'SINGLE_CHOICE',
            documentMappings: { 'business-plan': 'choice' },
            options: [{ value: 'opt-1', label: 'Option 1' }],
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ choice: 'opt-unknown' });
    });

    it('should handle MULTIPLE_CHOICE with missing selectedOptionIds', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: {},
          isValid: true,
          question: {
            id: 'q1',
            text: 'Features',
            type: 'MULTIPLE_CHOICE',
            documentMappings: { 'business-plan': 'features' },
            options: [{ value: 'opt-1', label: 'Feature A' }],
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ features: [] });
    });
  });

  describe('setNestedValue - path security', () => {
    beforeEach(() => {
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);
    });

    it('should block __proto__ path segment', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'malicious' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: { 'business-plan': '__proto__.polluted' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({});
    });

    it('should block prototype path segment', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'malicious' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: { 'business-plan': 'prototype.polluted' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({});
    });

    it('should block constructor path segment', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'malicious' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: { 'business-plan': 'constructor.polluted' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({});
    });

    it('should block unsafe path in middle of path', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'malicious' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: { 'business-plan': 'safe.__proto__.polluted' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({});
    });

    it('should skip empty path', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'value' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: { 'business-plan': '' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({});
    });

    it('should skip path with only whitespace', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'value' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: { 'business-plan': '   ' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({});
    });

    it('should handle path with whitespace around segments', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'value' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: { 'business-plan': ' section . field ' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({ section: { field: 'value' } });
    });

    it('should overwrite non-object intermediate value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'first' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test1',
            type: 'TEXT',
            documentMappings: { 'business-plan': 'section' },
            options: null,
          },
        },
        {
          id: 'r2',
          sessionId: 'session-1',
          questionId: 'q2',
          value: { text: 'second' },
          isValid: true,
          question: {
            id: 'q2',
            text: 'Test2',
            type: 'TEXT',
            documentMappings: { 'business-plan': 'section.nested' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      // Second mapping should overwrite the first because section needs to be an object
      expect(result.content).toEqual({ section: { nested: 'second' } });
    });

    it('should handle array as intermediate value', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { selectedOptionIds: ['a', 'b'] },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test1',
            type: 'MULTIPLE_CHOICE',
            documentMappings: { 'business-plan': 'items' },
            options: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        },
        {
          id: 'r2',
          sessionId: 'session-1',
          questionId: 'q2',
          value: { text: 'nested' },
          isValid: true,
          question: {
            id: 'q2',
            text: 'Test2',
            type: 'TEXT',
            documentMappings: { 'business-plan': 'items.extra' },
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      // Array should be replaced with object
      expect(result.content).toEqual({ items: { extra: 'nested' } });
    });
  });

  describe('assembleTemplateData - CTO documents with standards', () => {
    it('should include standards for CTO category', async () => {
      const ctoDocumentType = {
        ...mockDocumentType,
        category: DocumentCategory.CTO,
        standardMappings: [
          {
            sectionTitle: 'Security Standards',
            priority: 1,
            standard: {
              category: 'SECURITY',
              title: 'Security Best Practices',
              description: 'Security standards description',
              principles: [
                { title: 'Principle 1', description: 'Description 1' },
                { title: 'Principle 2', description: 'Description 2' },
                { title: 'Principle 3', description: 'Description 3' },
                { title: 'Principle 4', description: 'Description 4' },
                { title: 'Principle 5', description: 'Description 5' },
                { title: 'Principle 6', description: 'Description 6' },
              ],
            },
          },
        ],
      };
      prismaService.documentType.findUnique.mockResolvedValue(ctoDocumentType);
      prismaService.response.findMany.mockResolvedValue([]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');

      expect(result.standards).toBeDefined();
      expect(result.standards).toHaveLength(1);
      expect(result.standards![0].title).toBe('Security Standards');
      expect(result.standards![0].principles).toHaveLength(5); // Limited to 5
    });

    it('should use standard title when sectionTitle is null', async () => {
      const ctoDocumentType = {
        ...mockDocumentType,
        category: DocumentCategory.CTO,
        standardMappings: [
          {
            sectionTitle: null,
            priority: 1,
            standard: {
              category: 'ARCHITECTURE',
              title: 'Architecture Guidelines',
              description: 'Architecture standards',
              principles: [{ title: 'P1', description: 'D1' }],
            },
          },
        ],
      };
      prismaService.documentType.findUnique.mockResolvedValue(ctoDocumentType);
      prismaService.response.findMany.mockResolvedValue([]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');

      expect(result.standards![0].title).toBe('Architecture Guidelines');
    });

    it('should not include standards for non-CTO category', async () => {
      const cfoDocumentType = {
        ...mockDocumentType,
        category: DocumentCategory.CFO,
        standardMappings: [
          {
            sectionTitle: 'Some Standards',
            standard: {
              category: 'FINANCE',
              title: 'Finance Guidelines',
              description: 'Finance standards',
              principles: [],
            },
          },
        ],
      };
      prismaService.documentType.findUnique.mockResolvedValue(cfoDocumentType);
      prismaService.response.findMany.mockResolvedValue([]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');

      expect(result.standards).toBeUndefined();
    });

    it('should not include standards when mappings are empty', async () => {
      const ctoDocumentType = {
        ...mockDocumentType,
        category: DocumentCategory.CTO,
        standardMappings: [],
      };
      prismaService.documentType.findUnique.mockResolvedValue(ctoDocumentType);
      prismaService.response.findMany.mockResolvedValue([]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');

      expect(result.standards).toBeUndefined();
    });
  });

  describe('getValue - edge cases', () => {
    it('should handle null in path traversal', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {
          section: null,
        },
      };

      const result = service.getValue(data, 'section.nested.value');
      expect(result).toBeUndefined();
    });

    it('should handle undefined in path traversal', () => {
      const data = {
        metadata: {
          documentType: 'Test',
          category: DocumentCategory.CFO,
          generatedAt: new Date(),
          version: '1.0',
        },
        content: {
          section: undefined,
        },
      };

      const result = service.getValue(data, 'section.nested.value');
      expect(result).toBeUndefined();
    });
  });

  describe('mapResponsesToContent - edge cases', () => {
    beforeEach(() => {
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);
    });

    it('should skip response with null documentMappings', async () => {
      prismaService.response.findMany.mockResolvedValue([
        {
          id: 'r1',
          sessionId: 'session-1',
          questionId: 'q1',
          value: { text: 'value' },
          isValid: true,
          question: {
            id: 'q1',
            text: 'Test',
            type: 'TEXT',
            documentMappings: null,
            options: null,
          },
        },
      ]);

      const result = await service.assembleTemplateData('session-1', 'business-plan');
      expect(result.content).toEqual({});
    });
  });
});
