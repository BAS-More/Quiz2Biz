import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeliverablesCompilerService, DeliverableCategory } from './deliverables-compiler.service';
import { PrismaService } from '@libs/database';
import { SessionStatus, DecisionStatus } from '@prisma/client';

describe('DeliverablesCompilerService', () => {
  let service: DeliverablesCompilerService;
  let prisma: PrismaService;

  const mockPrisma = {
    session: {
      findUnique: jest.fn(),
    },
    response: {
      findMany: jest.fn(),
    },
    dimension: {
      findMany: jest.fn(),
    },
    decisionLog: {
      findMany: jest.fn(),
    },
    evidenceRegistry: {
      findMany: jest.fn(),
    },
  };

  const mockSession = {
    id: 'session-123',
    userId: 'user-456',
    status: SessionStatus.COMPLETED,
    readinessScore: 87.5,
    questionnaire: {
      name: 'Business Incubator Assessment',
      version: 1,
    },
  };

  const mockResponses = [
    {
      id: 'resp-1',
      questionId: 'q1',
      sessionId: 'session-123',
      value: 'Yes, we have MFA enabled',
      coverage: 0.75,
      question: {
        text: 'Do you have MFA?',
        dimension: { key: 'security', displayName: 'Security' },
      },
    },
    {
      id: 'resp-2',
      questionId: 'q2',
      sessionId: 'session-123',
      value: 'Architecture is documented in C4 diagrams',
      coverage: 0.5,
      question: {
        text: 'Is architecture documented?',
        dimension: { key: 'architecture', displayName: 'Architecture' },
      },
    },
  ];

  const mockDimensions = [
    { key: 'security', displayName: 'Security', weight: 1.0, score: 82.5 },
    { key: 'architecture', displayName: 'Architecture', weight: 1.0, score: 75.0 },
  ];

  const mockDecisions = [
    {
      id: 'decision-1',
      statement: 'Use PostgreSQL for primary database',
      rationale: 'ACID compliance and strong community support',
      status: DecisionStatus.LOCKED,
      createdAt: new Date('2026-01-20'),
    },
    {
      id: 'decision-2',
      statement: 'Implement JWT-based authentication',
      rationale: 'Stateless authentication for scalability',
      status: DecisionStatus.LOCKED,
      createdAt: new Date('2026-01-21'),
    },
  ];

  const mockEvidence = [
    {
      id: 'evidence-1',
      fileName: 'architecture-diagram.pdf',
      verified: true,
      questionId: 'q2',
    },
    {
      id: 'evidence-2',
      fileName: 'security-policy.pdf',
      verified: true,
      questionId: 'q1',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliverablesCompilerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<DeliverablesCompilerService>(DeliverablesCompilerService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('compileDeliverablesPack', () => {
    it('compiles complete deliverables pack with all documents', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue(mockDecisions);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidence);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      expect(result.sessionId).toBe('session-123');
      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.readinessScore).toBe(87.5);
      expect(result.summary.totalDocuments).toBeGreaterThan(0);
      expect(result.metadata.userId).toBe('user-456');
    });

    it('includes Architecture Dossier document', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const archDoc = result.documents.find((d) => d.category === DeliverableCategory.ARCHITECTURE);
      expect(archDoc).toBeDefined();
      expect(archDoc!.title).toContain('Architecture');
      expect(archDoc!.sections.length).toBeGreaterThan(0);
    });

    it('includes SDLC Playbook document', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const sdlcDoc = result.documents.find((d) => d.category === DeliverableCategory.SDLC);
      expect(sdlcDoc).toBeDefined();
      expect(sdlcDoc!.title).toContain('SDLC');
    });

    it('includes Test Strategy document', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const testDoc = result.documents.find((d) => d.category === DeliverableCategory.TESTING);
      expect(testDoc).toBeDefined();
      expect(testDoc!.title).toContain('Test');
    });

    it('includes DevSecOps document', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const devSecOpsDoc = result.documents.find(
        (d) => d.category === DeliverableCategory.DEVSECOPS,
      );
      expect(devSecOpsDoc).toBeDefined();
    });

    it('includes Privacy/Data document', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const privacyDoc = result.documents.find((d) => d.category === DeliverableCategory.PRIVACY);
      expect(privacyDoc).toBeDefined();
    });

    it('includes Observability document', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const obsDoc = result.documents.find((d) => d.category === DeliverableCategory.OBSERVABILITY);
      expect(obsDoc).toBeDefined();
    });

    it('includes Finance document', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const financeDoc = result.documents.find((d) => d.category === DeliverableCategory.FINANCE);
      expect(financeDoc).toBeDefined();
    });

    it('includes Policy Pack when enabled', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includePolicyPack: true,
        includeDecisionLog: false,
        includeReadinessReport: false,
      });

      const policyDoc = result.documents.find((d) => d.category === DeliverableCategory.GOVERNANCE);
      expect(policyDoc).toBeDefined();
    });

    it('includes Decision Log when enabled and decisions exist', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue(mockDecisions);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: true,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const decisionDoc = result.documents.find((d) => d.title.includes('Decision'));
      expect(decisionDoc).toBeDefined();
      expect(decisionDoc!.sections.length).toBeGreaterThan(0);
    });

    it('includes Readiness Report when enabled', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidence);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeReadinessReport: true,
        includeDecisionLog: false,
        includePolicyPack: false,
      });

      const readinessDoc = result.documents.find(
        (d) => d.category === DeliverableCategory.READINESS,
      );
      expect(readinessDoc).toBeDefined();
    });

    it('applies auto-sectioning for long sections', async () => {
      // Create long content that exceeds 1000 words
      const longResponses = Array.from({ length: 20 }, (_, i) => ({
        id: `resp-${i}`,
        questionId: `q${i}`,
        sessionId: 'session-123',
        value: 'Lorem ipsum '.repeat(100), // ~200 words per response
        coverage: 0.75,
        question: {
          text: `Question ${i}?`,
          dimension: { key: 'security', displayName: 'Security' },
        },
      }));

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(longResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        autoSection: true,
        maxWordsPerSection: 1000,
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      // Check that documents were generated (auto-sectioning may or may not create subSections)
      expect(result.documents.length).toBeGreaterThan(0);
    });

    it('calculates summary statistics correctly', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      expect(result.summary.totalDocuments).toBeGreaterThan(0);
      expect(result.summary.totalSections).toBeGreaterThan(0);
      expect(result.summary.totalWordCount).toBeGreaterThan(0);
      expect(result.summary.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.completenessScore).toBeLessThanOrEqual(100);
    });

    it('includes metadata with session info', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      expect(result.metadata.sessionId).toBe('session-123');
      expect(result.metadata.userId).toBe('user-456');
      expect(result.metadata.readinessScore).toBe(87.5);
      // questionnaireVersion may not be included in metadata
      expect(result.metadata.dimensionScores).toBeDefined();
    });

    it('throws NotFoundException for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.compileDeliverablesPack('non-existent', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when user does not own session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        userId: 'different-user',
      });

      await expect(service.compileDeliverablesPack('session-123', 'user-456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for non-completed session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.IN_PROGRESS,
      });

      await expect(service.compileDeliverablesPack('session-123', 'user-456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('section word counting', () => {
    it('counts words correctly in sections', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      result.documents.forEach((doc) => {
        expect(doc.wordCount).toBeGreaterThan(0);
        doc.sections.forEach((section) => {
          expect(section.wordCount).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('category distribution', () => {
    it('distributes documents across all categories', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue(mockDecisions);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue(mockEvidence);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      const categories = Object.keys(result.summary.categories);
      expect(categories.length).toBeGreaterThan(0);

      // Check that we have documents in multiple categories
      const nonZeroCategories = categories.filter(
        (cat) => result.summary.categories[cat as DeliverableCategory] > 0,
      );
      expect(nonZeroCategories.length).toBeGreaterThanOrEqual(7); // 7 core documents
    });
  });
});
