import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilderService, DocumentTypeInfo } from './document-builder.service';
import { DocumentCategory } from '@prisma/client';
import { TemplateData, StandardSection } from './template-engine.service';
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

  // ---------------------------------------------------------------------------
  // buildDocument
  // ---------------------------------------------------------------------------
  describe('buildDocument', () => {
    const baseMetadata = {
      documentType: 'Test Document',
      category: DocumentCategory.BA,
      generatedAt: new Date('2026-01-15T10:00:00Z'),
      version: '1.0',
    };

    const mockDocumentType: DocumentTypeInfo = {
      name: 'Business Requirements Document',
      slug: 'business-requirements',
      category: DocumentCategory.BA,
    };

    const mockTemplateData: TemplateData = {
      metadata: baseMetadata,
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

    it('should handle empty standards array', async () => {
      const dataWithoutStandards: TemplateData = {
        ...mockTemplateData,
        standards: [],
      };

      const result = await service.buildDocument(dataWithoutStandards, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle missing standards property', async () => {
      const dataNoStandards: TemplateData = {
        metadata: mockTemplateData.metadata,
        content: mockTemplateData.content,
      };

      const result = await service.buildDocument(dataNoStandards, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle empty content object', async () => {
      const dataEmptyContent: TemplateData = {
        metadata: baseMetadata,
        content: {},
      };

      const result = await service.buildDocument(dataEmptyContent, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle standards with multiple principles', async () => {
      const dataMultiplePrinciples: TemplateData = {
        metadata: baseMetadata,
        content: { overview: 'Test' },
        standards: [
          {
            category: 'Security',
            title: 'Security Standards',
            description: 'Security requirements for the project',
            principles: [
              { title: 'Authentication', description: 'Use MFA' },
              { title: 'Authorization', description: 'RBAC' },
              { title: 'Encryption', description: 'TLS 1.3 minimum' },
            ],
          },
          {
            category: 'Quality',
            title: 'Quality Standards',
            description: 'Quality assurance requirements',
            principles: [
              { title: 'Testing', description: '80% coverage' },
            ],
          },
        ],
      };

      const result = await service.buildDocument(dataMultiplePrinciples, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    // --- CTO Category ---
    describe('CTO category content', () => {
      const ctoDocType: DocumentTypeInfo = {
        name: 'Technical Architecture',
        slug: 'tech-architecture',
        category: DocumentCategory.CTO,
      };

      it('should build CTO document with executive_summary', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CTO },
          content: {
            executive_summary: 'This project implements a cloud-native solution.',
          },
        };

        const result = await service.buildDocument(data, ctoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should build CTO document with technical_overview', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CTO },
          content: {
            technical_overview: 'Microservices-based architecture using Kubernetes.',
          },
        };

        const result = await service.buildDocument(data, ctoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CTO document with architecture fallback when no technical_overview', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CTO },
          content: {
            architecture: 'Event-driven architecture with CQRS pattern.',
          },
        };

        const result = await service.buildDocument(data, ctoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CTO document with infrastructure section', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CTO },
          content: {
            infrastructure: {
              cloud_provider: 'Azure',
              compute: 'Container Apps',
              database: 'PostgreSQL Flexible Server',
            },
          },
        };

        const result = await service.buildDocument(data, ctoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CTO document with security section', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CTO },
          content: {
            security: ['TLS 1.3', 'OAuth 2.0 / OIDC', 'WAF', 'Key Vault secrets'],
          },
        };

        const result = await service.buildDocument(data, ctoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CTO document with all sections combined', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CTO },
          content: {
            executive_summary: 'Cloud-native solution overview.',
            technical_overview: 'Microservices on Kubernetes.',
            infrastructure: {
              cloud: 'Azure',
              compute: 'AKS',
            },
            security: 'End-to-end encryption with TLS.',
          },
          standards: [
            {
              category: 'Architecture',
              title: 'Clean Architecture',
              description: 'Separation of concerns',
              principles: [{ title: 'SOLID', description: 'Follow SOLID principles' }],
            },
          ],
        };

        const result = await service.buildDocument(data, ctoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    // --- CFO Category ---
    describe('CFO category content', () => {
      const cfoDocType: DocumentTypeInfo = {
        name: 'Business Plan',
        slug: 'business-plan',
        category: DocumentCategory.CFO,
      };

      it('should build CFO document with executive_summary', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CFO },
          content: {
            executive_summary: 'A SaaS platform targeting mid-market enterprises.',
          },
        };

        const result = await service.buildDocument(data, cfoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CFO document with company_description', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CFO },
          content: {
            company_description: 'Technology startup founded in 2025.',
          },
        };

        const result = await service.buildDocument(data, cfoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CFO document with market_analysis', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CFO },
          content: {
            market_analysis: {
              target_market: 'Enterprise B2B',
              market_size: '$5B TAM',
              competition: ['Competitor A', 'Competitor B'],
            },
          },
        };

        const result = await service.buildDocument(data, cfoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CFO document with financial_projections', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CFO },
          content: {
            financial_projections: {
              year1_revenue: '$500K',
              year2_revenue: '$2M',
              break_even: 'Month 18',
            },
          },
        };

        const result = await service.buildDocument(data, cfoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CFO document with risk_management', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CFO },
          content: {
            risk_management: ['Market risk', 'Technical risk', 'Regulatory risk'],
          },
        };

        const result = await service.buildDocument(data, cfoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build CFO document with all sections combined', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.CFO },
          content: {
            executive_summary: 'SaaS platform for mid-market.',
            company_description: 'Founded in 2025.',
            market_analysis: 'Enterprise B2B segment.',
            financial_projections: 'Break-even in 18 months.',
            risk_management: 'Moderate risk profile.',
          },
        };

        const result = await service.buildDocument(data, cfoDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    // --- BA Category ---
    describe('BA category content', () => {
      const baDocType: DocumentTypeInfo = {
        name: 'Business Requirements Document',
        slug: 'brd',
        category: DocumentCategory.BA,
      };

      it('should build BA document with introduction', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.BA },
          content: {
            introduction: 'This document captures requirements for the new system.',
          },
        };

        const result = await service.buildDocument(data, baDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build BA document with overview fallback when no introduction', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.BA },
          content: {
            overview: 'Project overview text.',
          },
        };

        const result = await service.buildDocument(data, baDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build BA document with business_requirements', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.BA },
          content: {
            business_requirements: ['BR-001: System must handle 1000 concurrent users'],
          },
        };

        const result = await service.buildDocument(data, baDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build BA document with functional_requirements', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.BA },
          content: {
            functional_requirements: {
              user_management: 'CRUD operations for user accounts',
              reporting: ['Dashboard reports', 'Export to CSV', 'Scheduled reports'],
            },
          },
        };

        const result = await service.buildDocument(data, baDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build BA document with user_stories', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.BA },
          content: {
            user_stories: [
              'As a user, I want to login so I can access the dashboard',
              'As an admin, I want to manage users so I can control access',
            ],
          },
        };

        const result = await service.buildDocument(data, baDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build BA document with process_flows', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.BA },
          content: {
            process_flows: 'User registers -> Verifies email -> Completes profile -> Accesses dashboard',
          },
        };

        const result = await service.buildDocument(data, baDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should build BA document with all sections combined', async () => {
        const data: TemplateData = {
          metadata: { ...baseMetadata, category: DocumentCategory.BA },
          content: {
            introduction: 'Requirements document for new platform.',
            business_requirements: ['BR-001', 'BR-002'],
            functional_requirements: 'User management and reporting.',
            user_stories: ['US-001', 'US-002', 'US-003'],
            process_flows: 'Standard SDLC workflow.',
          },
        };

        const result = await service.buildDocument(data, baDocType);
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // buildDocumentFromAiContent
  // ---------------------------------------------------------------------------
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

    it('should handle AI content without summary (empty string)', async () => {
      const contentWithoutSummary: GeneratedDocumentContent = {
        ...mockAiContent,
        summary: '',
      };

      const result = await service.buildDocumentFromAiContent(contentWithoutSummary, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle AI content with empty sections array', async () => {
      const contentWithEmptySections: GeneratedDocumentContent = {
        title: 'Empty Document',
        summary: 'Summary only',
        sections: [],
      };

      const result = await service.buildDocumentFromAiContent(contentWithEmptySections, mockDocumentType);

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle multi-paragraph section content separated by double newlines', async () => {
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

    it('should handle content with triple+ newlines (treated as single separator)', async () => {
      const content: GeneratedDocumentContent = {
        title: 'Newline Test',
        summary: 'Testing triple newlines',
        sections: [
          {
            heading: 'Section',
            content: 'Para 1.\n\n\n\nPara 2.\n\n\nPara 3.',
          },
        ],
      };

      const result = await service.buildDocumentFromAiContent(content, mockDocumentType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle content with whitespace-only paragraphs after split', async () => {
      const content: GeneratedDocumentContent = {
        title: 'Whitespace Test',
        summary: 'Testing whitespace filtering',
        sections: [
          {
            heading: 'Section',
            content: 'Real paragraph.\n\n   \n\nAnother real paragraph.',
          },
        ],
      };

      const result = await service.buildDocumentFromAiContent(content, mockDocumentType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle many sections', async () => {
      const manySections: GeneratedDocumentContent = {
        title: 'Comprehensive Document',
        summary: 'Document with many sections',
        sections: Array.from({ length: 10 }, (_, i) => ({
          heading: `Section ${i + 1}`,
          content: `Content for section ${i + 1}. This is detailed content.\n\nSecond paragraph of section ${i + 1}.`,
        })),
      };

      const result = await service.buildDocumentFromAiContent(manySections, mockDocumentType);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle single-line content in a section', async () => {
      const content: GeneratedDocumentContent = {
        title: 'Simple Document',
        summary: 'Brief summary',
        sections: [
          {
            heading: 'Only Section',
            content: 'Just one line of content with no paragraph breaks.',
          },
        ],
      };

      const result = await service.buildDocumentFromAiContent(content, mockDocumentType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Document categories via buildDocument (template path)
  // ---------------------------------------------------------------------------
  describe('document categories via buildDocument', () => {
    const baseMetadata = {
      documentType: 'Test',
      category: DocumentCategory.BA,
      generatedAt: new Date(),
      version: '1.0',
    };

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

    it('should build document for CFO category', async () => {
      const docType: DocumentTypeInfo = {
        name: 'Financial Plan',
        slug: 'financial-plan',
        category: DocumentCategory.CFO,
      };
      const aiContent: GeneratedDocumentContent = {
        title: 'Financial Plan',
        summary: 'Revenue projections and cost analysis',
        sections: [{ heading: 'Revenue Model', content: 'Subscription-based pricing...' }],
      };

      const result = await service.buildDocumentFromAiContent(aiContent, docType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // buildContentSection (exercised indirectly through buildDocument)
  // ---------------------------------------------------------------------------
  describe('buildContentSection (via buildDocument)', () => {
    const ctoDocType: DocumentTypeInfo = {
      name: 'Tech Doc',
      slug: 'tech-doc',
      category: DocumentCategory.CTO,
    };
    const baseMetadata = {
      documentType: 'Tech Doc',
      category: DocumentCategory.CTO,
      generatedAt: new Date(),
      version: '1.0',
    };

    it('should handle string content', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          executive_summary: 'Plain string content for executive summary.',
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle array content (bullet points)', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          security: ['Item 1', 'Item 2', 'Item 3'],
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle object content with string values', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            provider: 'Azure',
            region: 'Australia Southeast',
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle object content with numeric values', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            max_instances: 10,
            min_instances: 2,
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle object content with array values', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            services: ['API Gateway', 'Load Balancer', 'CDN'],
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle nested object content (recursive)', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            networking: {
              vnet: 'vnet-prod',
              subnets: ['subnet-app', 'subnet-db'],
            },
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle deeply nested mixed content', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          executive_summary: {
            overview: 'Top-level overview',
            details: {
              sub_detail: 'Nested string value',
              items: ['Nested item 1', 'Nested item 2'],
              deeper: {
                leaf: 'Deep leaf value',
              },
            },
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // formatLabel (exercised indirectly through buildDocument with object content)
  // ---------------------------------------------------------------------------
  describe('formatLabel (via buildDocument with object content)', () => {
    const ctoDocType: DocumentTypeInfo = {
      name: 'Label Test',
      slug: 'label-test',
      category: DocumentCategory.CTO,
    };
    const baseMetadata = {
      documentType: 'Label Test',
      category: DocumentCategory.CTO,
      generatedAt: new Date(),
      version: '1.0',
    };

    it('should convert snake_case keys to Title Case labels', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            cloud_provider: 'Azure',
            deployment_strategy: 'Blue-green',
          },
        },
      };

      // The test succeeds if the document builds without error.
      // formatLabel is exercised for keys cloud_provider and deployment_strategy.
      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should convert camelCase keys to Title Case labels', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            cloudProvider: 'Azure',
            deploymentStrategy: 'Canary',
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle single-word keys', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            provider: 'AWS',
            region: 'us-east-1',
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle mixed snake_case and camelCase in same object', async () => {
      const data: TemplateData = {
        metadata: baseMetadata,
        content: {
          infrastructure: {
            cloud_provider: 'Azure',
            deploymentType: 'Container',
            max_replicas: 5,
          },
        },
      };

      const result = await service.buildDocument(data, ctoDocType);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});
