import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ConfigService } from '@nestjs/config';
import {
  ProjectDocumentGenerationService,
  GenerationRequest,
} from './project-document-generation.service';
import { QualityCalibratorService } from './quality-calibrator.service';
import { MarkdownRendererService, DocumentSection } from './markdown-renderer.service';

describe('ProjectDocumentGenerationService', () => {
  let service: ProjectDocumentGenerationService;
  let prisma: jest.Mocked<PrismaService>;
  let qualityCalibrator: jest.Mocked<QualityCalibratorService>;
  let markdownRenderer: jest.Mocked<MarkdownRendererService>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Business',
    userId: 'user-123',
    projectType: {
      id: 'pt-1',
      name: 'Business Plan',
      slug: 'business-plan',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocumentType = {
    id: 'dt-1',
    name: 'Business Plan',
    slug: 'business-plan',
    description: 'Comprehensive business plan',
    basePrice: { toNumber: () => 49.99 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFacts = [
    {
      id: 'fact-1',
      projectId: 'project-123',
      category: 'business_overview',
      fieldName: 'company_name',
      fieldValue: 'Acme Corp',
      confidence: { toNumber: () => 0.95 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'fact-2',
      projectId: 'project-123',
      category: 'business_overview',
      fieldName: 'industry',
      fieldValue: 'Technology',
      confidence: { toNumber: () => 0.9 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'fact-3',
      projectId: 'project-123',
      category: 'market_analysis',
      fieldName: 'target_market',
      fieldValue: 'Small businesses',
      confidence: { toNumber: () => 0.85 },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockQualityParams = {
    name: 'Standard',
    maxTokens: 4000,
    temperature: 0.7,
    qualityModifiers: { detail: 'moderate', format: 'standard' },
  };

  const mockSections: DocumentSection[] = [
    { title: 'Executive Summary', content: 'Summary content', level: 1 },
    { title: 'Business Overview', content: 'Overview content', level: 2 },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findFirst: jest.fn(),
      },
      documentType: {
        findUnique: jest.fn(),
      },
      extractedFact: {
        findMany: jest.fn(),
      },
      generatedDocument: {
        create: jest.fn(),
      },
    };

    const mockQualityCalibrator = {
      getParameters: jest.fn(),
      buildPrompt: jest.fn(),
      getSystemPrompt: jest.fn(),
    };

    const mockMarkdownRenderer = {
      parseAiOutput: jest.fn(),
      renderDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectDocumentGenerationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: QualityCalibratorService, useValue: mockQualityCalibrator },
        { provide: MarkdownRendererService, useValue: mockMarkdownRenderer },
      ],
    }).compile();

    service = module.get<ProjectDocumentGenerationService>(ProjectDocumentGenerationService);
    prisma = module.get(PrismaService);
    qualityCalibrator = module.get(QualityCalibratorService);
    markdownRenderer = module.get(MarkdownRendererService);
  });

  describe('generateDocument', () => {
    const validRequest: GenerationRequest = {
      projectId: 'project-123',
      documentTypeSlug: 'business-plan',
      qualityLevel: 2,
      userId: 'user-123',
    };

    beforeEach(() => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.documentType.findUnique.mockResolvedValue(mockDocumentType as any);
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);
      qualityCalibrator.getParameters.mockReturnValue(mockQualityParams);
      qualityCalibrator.buildPrompt.mockReturnValue('Generated prompt');
      qualityCalibrator.getSystemPrompt.mockReturnValue('System prompt');
      markdownRenderer.parseAiOutput.mockReturnValue(mockSections);
      markdownRenderer.renderDocument.mockReturnValue('# Rendered Markdown');
      prisma.generatedDocument.create.mockResolvedValue({
        id: 'doc-123',
        title: 'Test Business - Business Plan',
        content: 'Generated content',
        markdownContent: '# Rendered Markdown',
        createdAt: new Date(),
      } as any);
    });

    it('should generate document successfully', async () => {
      const result = await service.generateDocument(validRequest);

      expect(result.documentId).toBe('doc-123');
      expect(result.projectId).toBe('project-123');
      expect(result.documentTypeSlug).toBe('business-plan');
      expect(result.qualityLevel).toBe(2);
      expect(result.markdown).toBe('# Rendered Markdown');
    });

    it('should validate project ownership', async () => {
      expect(prisma.project.findFirst).not.toHaveBeenCalled();

      await service.generateDocument(validRequest);

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'project-123', userId: 'user-123' },
        include: { projectType: true },
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.generateDocument(validRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if document type not found', async () => {
      prisma.documentType.findUnique.mockResolvedValue(null);

      await expect(service.generateDocument(validRequest)).rejects.toThrow(NotFoundException);
    });

    it('should fetch facts for the project', async () => {
      await service.generateDocument(validRequest);

      expect(prisma.extractedFact.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should get quality parameters for the level', async () => {
      await service.generateDocument(validRequest);

      expect(qualityCalibrator.getParameters).toHaveBeenCalledWith(2);
    });

    it('should build prompt using quality calibrator', async () => {
      await service.generateDocument(validRequest);

      expect(qualityCalibrator.buildPrompt).toHaveBeenCalled();
      expect(qualityCalibrator.getSystemPrompt).toHaveBeenCalledWith(2);
    });

    it('should parse AI output and render markdown', async () => {
      await service.generateDocument(validRequest);

      expect(markdownRenderer.parseAiOutput).toHaveBeenCalled();
      expect(markdownRenderer.renderDocument).toHaveBeenCalled();
    });

    it('should save generated document with correct data', async () => {
      await service.generateDocument(validRequest);

      expect(prisma.generatedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'project-123',
          documentTypeId: 'dt-1',
          userId: 'user-123',
          title: 'Test Business - Business Plan',
          qualityLevel: 2,
          status: 'completed',
        }),
      });
    });

    it('should calculate word count and page estimate', async () => {
      const result = await service.generateDocument(validRequest);

      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.pageEstimate).toBeGreaterThan(0);
    });

    it('should include facts count in metadata', async () => {
      await service.generateDocument(validRequest);

      expect(prisma.generatedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            factsUsed: 3,
          }),
        }),
      });
    });
  });

  describe('quality levels', () => {
    const baseRequest: GenerationRequest = {
      projectId: 'project-123',
      documentTypeSlug: 'business-plan',
      qualityLevel: 0,
      userId: 'user-123',
    };

    beforeEach(() => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.documentType.findUnique.mockResolvedValue(mockDocumentType as any);
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);
      qualityCalibrator.buildPrompt.mockReturnValue('Generated prompt');
      qualityCalibrator.getSystemPrompt.mockReturnValue('System prompt');
      markdownRenderer.parseAiOutput.mockReturnValue(mockSections);
      markdownRenderer.renderDocument.mockReturnValue('# Markdown');
      prisma.generatedDocument.create.mockResolvedValue({
        id: 'doc-123',
        title: 'Test',
        content: 'Content',
        createdAt: new Date(),
      } as any);
    });

    it('should handle quality level 0 (Basic)', async () => {
      qualityCalibrator.getParameters.mockReturnValue({
        name: 'Basic',
        maxTokens: 2000,
        temperature: 0.5,
      });

      await service.generateDocument({ ...baseRequest, qualityLevel: 0 });

      expect(qualityCalibrator.getParameters).toHaveBeenCalledWith(0);
    });

    it('should handle quality level 1 (Standard)', async () => {
      qualityCalibrator.getParameters.mockReturnValue({
        name: 'Standard',
        maxTokens: 4000,
        temperature: 0.7,
      });

      await service.generateDocument({ ...baseRequest, qualityLevel: 1 });

      expect(qualityCalibrator.getParameters).toHaveBeenCalledWith(1);
    });

    it('should handle quality level 2 (Enhanced)', async () => {
      qualityCalibrator.getParameters.mockReturnValue({
        name: 'Enhanced',
        maxTokens: 6000,
        temperature: 0.7,
      });

      await service.generateDocument({ ...baseRequest, qualityLevel: 2 });

      expect(qualityCalibrator.getParameters).toHaveBeenCalledWith(2);
    });

    it('should handle quality level 3 (Premium)', async () => {
      qualityCalibrator.getParameters.mockReturnValue({
        name: 'Premium',
        maxTokens: 8000,
        temperature: 0.8,
      });

      await service.generateDocument({ ...baseRequest, qualityLevel: 3 });

      expect(qualityCalibrator.getParameters).toHaveBeenCalledWith(3);
    });

    it('should handle quality level 4 (Professional)', async () => {
      qualityCalibrator.getParameters.mockReturnValue({
        name: 'Professional',
        maxTokens: 12000,
        temperature: 0.8,
      });

      await service.generateDocument({ ...baseRequest, qualityLevel: 4 });

      expect(qualityCalibrator.getParameters).toHaveBeenCalledWith(4);
    });
  });

  describe('document types', () => {
    beforeEach(() => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);
      qualityCalibrator.getParameters.mockReturnValue(mockQualityParams);
      qualityCalibrator.buildPrompt.mockReturnValue('Generated prompt');
      qualityCalibrator.getSystemPrompt.mockReturnValue('System prompt');
      markdownRenderer.parseAiOutput.mockReturnValue(mockSections);
      markdownRenderer.renderDocument.mockReturnValue('# Markdown');
      prisma.generatedDocument.create.mockResolvedValue({
        id: 'doc-123',
        title: 'Test',
        content: 'Content',
        createdAt: new Date(),
      } as any);
    });

    const testDocumentType = async (slug: string, name: string) => {
      prisma.documentType.findUnique.mockResolvedValue({
        id: `dt-${slug}`,
        slug,
        name,
        description: `${name} document`,
      } as any);

      const result = await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: slug,
        qualityLevel: 2,
        userId: 'user-123',
      });

      expect(result.documentTypeSlug).toBe(slug);
    };

    it('should generate business-plan', async () => {
      await testDocumentType('business-plan', 'Business Plan');
    });

    it('should generate executive-summary', async () => {
      await testDocumentType('executive-summary', 'Executive Summary');
    });

    it('should generate pitch-deck', async () => {
      await testDocumentType('pitch-deck', 'Pitch Deck');
    });

    it('should generate financial-projections', async () => {
      await testDocumentType('financial-projections', 'Financial Projections');
    });

    it('should generate market-analysis', async () => {
      await testDocumentType('market-analysis', 'Market Analysis');
    });

    it('should generate operations-manual', async () => {
      await testDocumentType('operations-manual', 'Operations Manual');
    });

    it('should generate marketing-strategy', async () => {
      await testDocumentType('marketing-strategy', 'Marketing Strategy');
    });

    it('should generate tech-assessment', async () => {
      await testDocumentType('tech-assessment', 'Technology Assessment');
    });

    it('should generate grant-application', async () => {
      await testDocumentType('grant-application', 'Grant Application');
    });

    it('should handle unknown document type with fallback prompt', async () => {
      await testDocumentType('custom-doc', 'Custom Document');
    });
  });

  describe('content generation', () => {
    beforeEach(() => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.documentType.findUnique.mockResolvedValue(mockDocumentType as any);
      qualityCalibrator.getParameters.mockReturnValue(mockQualityParams);
      qualityCalibrator.buildPrompt.mockReturnValue('Generated prompt');
      qualityCalibrator.getSystemPrompt.mockReturnValue('System prompt');
      markdownRenderer.parseAiOutput.mockReturnValue(mockSections);
      markdownRenderer.renderDocument.mockReturnValue('# Markdown');
      prisma.generatedDocument.create.mockResolvedValue({
        id: 'doc-123',
        title: 'Test',
        content: 'Content',
        createdAt: new Date(),
      } as any);
    });

    it('should generate content with facts grouped by category', async () => {
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);

      await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      // Verify content is generated (create is called with content)
      expect(prisma.generatedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: expect.any(String),
        }),
      });
    });

    it('should handle project with no facts', async () => {
      prisma.extractedFact.findMany.mockResolvedValue([]);

      const result = await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      expect(result.wordCount).toBeGreaterThan(0); // Should still have base content
    });

    it('should include next steps section', async () => {
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);

      await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      const createCall = prisma.generatedDocument.create.mock.calls[0][0];
      expect(createCall.data.content).toContain('Next Steps');
    });
  });

  describe('word count and page estimation', () => {
    beforeEach(() => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.documentType.findUnique.mockResolvedValue(mockDocumentType as any);
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);
      qualityCalibrator.getParameters.mockReturnValue(mockQualityParams);
      qualityCalibrator.buildPrompt.mockReturnValue('Generated prompt');
      qualityCalibrator.getSystemPrompt.mockReturnValue('System prompt');
      markdownRenderer.parseAiOutput.mockReturnValue(mockSections);
      markdownRenderer.renderDocument.mockReturnValue('# Markdown');
      prisma.generatedDocument.create.mockResolvedValue({
        id: 'doc-123',
        title: 'Test',
        content: 'Content',
        createdAt: new Date(),
      } as any);
    });

    it('should calculate word count excluding markdown syntax', async () => {
      const result = await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      // Word count should be calculated without # * _ [ ] ( )
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should estimate pages at ~300 words per page', async () => {
      const result = await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      // Page estimate should be ceil(wordCount / 300)
      const expectedPages = Math.ceil(result.wordCount / 300);
      expect(result.pageEstimate).toBe(expectedPages);
    });
  });

  describe('metadata', () => {
    beforeEach(() => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.documentType.findUnique.mockResolvedValue(mockDocumentType as any);
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);
      qualityCalibrator.getParameters.mockReturnValue(mockQualityParams);
      qualityCalibrator.buildPrompt.mockReturnValue('Generated prompt');
      qualityCalibrator.getSystemPrompt.mockReturnValue('System prompt');
      markdownRenderer.parseAiOutput.mockReturnValue(mockSections);
      markdownRenderer.renderDocument.mockReturnValue('# Markdown');
      prisma.generatedDocument.create.mockResolvedValue({
        id: 'doc-123',
        title: 'Test',
        content: 'Content',
        createdAt: new Date(),
      } as any);
    });

    it('should include facts used count', async () => {
      await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      expect(prisma.generatedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            factsUsed: 3,
          }),
        }),
      });
    });

    it('should include quality level name', async () => {
      await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      expect(prisma.generatedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            qualityLevel: 'Standard',
          }),
        }),
      });
    });

    it('should include section titles', async () => {
      await service.generateDocument({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
        userId: 'user-123',
      });

      expect(prisma.generatedDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            sections: ['Executive Summary', 'Business Overview'],
          }),
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should propagate database errors', async () => {
      prisma.project.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateDocument({
          projectId: 'project-123',
          documentTypeSlug: 'business-plan',
          qualityLevel: 2,
          userId: 'user-123',
        }),
      ).rejects.toThrow('Database error');
    });

    it('should handle fact extraction failure', async () => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.documentType.findUnique.mockResolvedValue(mockDocumentType as any);
      prisma.extractedFact.findMany.mockRejectedValue(new Error('Fact error'));

      await expect(
        service.generateDocument({
          projectId: 'project-123',
          documentTypeSlug: 'business-plan',
          qualityLevel: 2,
          userId: 'user-123',
        }),
      ).rejects.toThrow('Fact error');
    });

    it('should handle document save failure', async () => {
      prisma.project.findFirst.mockResolvedValue(mockProject as any);
      prisma.documentType.findUnique.mockResolvedValue(mockDocumentType as any);
      prisma.extractedFact.findMany.mockResolvedValue(mockFacts as any);
      qualityCalibrator.getParameters.mockReturnValue(mockQualityParams);
      qualityCalibrator.buildPrompt.mockReturnValue('Generated prompt');
      qualityCalibrator.getSystemPrompt.mockReturnValue('System prompt');
      markdownRenderer.parseAiOutput.mockReturnValue(mockSections);
      markdownRenderer.renderDocument.mockReturnValue('# Markdown');
      prisma.generatedDocument.create.mockRejectedValue(new Error('Save error'));

      await expect(
        service.generateDocument({
          projectId: 'project-123',
          documentTypeSlug: 'business-plan',
          qualityLevel: 2,
          userId: 'user-123',
        }),
      ).rejects.toThrow('Save error');
    });
  });
});
