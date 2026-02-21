import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilderService, DocumentTypeInfo } from './document-builder.service';
import { DocumentCategory } from '@prisma/client';
import { TemplateData } from './template-engine.service';
import { GeneratedDocumentContent } from './ai-document-content.service';

describe('DocumentBuilderService', () => {
  let service: DocumentBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentBuilderService],
    }).compile();

    service = module.get<DocumentBuilderService>(DocumentBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildDocument', () => {
    const mockDocumentType: DocumentTypeInfo = {
      name: 'Business Requirements Document',
      slug: 'business-requirements',
      category: DocumentCategory.BA,
    };

    const mockTemplateData: TemplateData = {
      metadata: {
        documentType: 'Business Requirements',
        category: DocumentCategory.BA,
        generatedAt: new Date(),
        version: '1.0',
      },
      content: {
        projectName: 'Test Project',
        projectType: 'SaaS Application',
        sections: [
          { title: 'Executive Summary', content: 'Overview of the project' },
        ],
      },
      standards: [
        {
          category: 'Core',
          title: 'Introduction',
          description: 'Document introduction',
          principles: [{ title: 'Clarity', description: 'Be clear and concise' }],
        },
      ],
    };

    it('should build a DOCX document buffer', async () => {
      const result = await service.buildDocument(mockTemplateData, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty standards', async () => {
      const dataWithoutStandards: TemplateData = {
        ...mockTemplateData,
        standards: [],
      };

      const result = await service.buildDocument(dataWithoutStandards, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle missing standards', async () => {
      const dataNoStandards: TemplateData = {
        metadata: mockTemplateData.metadata,
        content: mockTemplateData.content,
      };

      const result = await service.buildDocument(dataNoStandards, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe('buildDocumentFromAiContent', () => {
    const mockDocumentType: DocumentTypeInfo = {
      name: 'Technical Specification',
      slug: 'technical-spec',
      category: DocumentCategory.CTO,
    };

    const mockAiContent: GeneratedDocumentContent = {
      title: 'Technical Specification for Test Project',
      summary: 'This document describes the technical architecture and implementation details.',
      sections: [
        {
          heading: 'System Architecture',
          content: 'The system follows a microservices architecture.\n\nEach service is independently deployable.',
        },
        {
          heading: 'Technology Stack',
          content: 'Frontend: React with TypeScript\n\nBackend: Node.js with NestJS',
        },
        {
          heading: 'Security Considerations',
          content: 'All communications are encrypted using TLS 1.3.',
        },
      ],
    };

    it('should build document from AI content', async () => {
      const result = await service.buildDocumentFromAiContent(mockAiContent, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle AI content without summary', async () => {
      const contentWithoutSummary: GeneratedDocumentContent = {
        ...mockAiContent,
        summary: '',
      };

      const result = await service.buildDocumentFromAiContent(contentWithoutSummary, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle AI content with empty sections', async () => {
      const contentWithEmptySections: GeneratedDocumentContent = {
        title: 'Empty Document',
        summary: 'Summary only',
        sections: [],
      };

      const result = await service.buildDocumentFromAiContent(contentWithEmptySections, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle multi-paragraph section content', async () => {
      const contentWithMultiParagraph: GeneratedDocumentContent = {
        title: 'Multi-Paragraph Test',
        summary: 'Testing multiple paragraphs',
        sections: [
          {
            heading: 'Introduction',
            content: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph with more content.',
          },
        ],
      };

      const result = await service.buildDocumentFromAiContent(contentWithMultiParagraph, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe('document categories', () => {
    it('should build document for BA category', async () => {
      const docType: DocumentTypeInfo = {
        name: 'User Stories',
        slug: 'user-stories',
        category: DocumentCategory.BA,
      };
      const aiContent: GeneratedDocumentContent = {
        title: 'User Stories',
        summary: 'Collection of user stories',
        sections: [{ heading: 'Epic 1', content: 'User story content' }],
      };

      const result = await service.buildDocumentFromAiContent(aiContent, docType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should build document for CTO category', async () => {
      const docType: DocumentTypeInfo = {
        name: 'Architecture Decision Record',
        slug: 'adr',
        category: DocumentCategory.CTO,
      };
      const aiContent: GeneratedDocumentContent = {
        title: 'ADR-001: Database Selection',
        summary: 'Decision to use PostgreSQL',
        sections: [{ heading: 'Context', content: 'We need a database...' }],
      };

      const result = await service.buildDocumentFromAiContent(aiContent, docType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should build document for CEO category', async () => {
      const docType: DocumentTypeInfo = {
        name: 'Executive Summary',
        slug: 'executive-summary',
        category: DocumentCategory.CEO,
      };
      const aiContent: GeneratedDocumentContent = {
        title: 'Executive Summary',
        summary: 'High-level project overview',
        sections: [{ heading: 'Key Points', content: 'Main findings...' }],
      };

      const result = await service.buildDocumentFromAiContent(aiContent, docType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});
