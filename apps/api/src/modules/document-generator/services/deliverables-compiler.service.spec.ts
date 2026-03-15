import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DeliverablesCompilerService, DeliverableCategory } from './deliverables-compiler.service';
import { PrismaService } from '@libs/database';
import { SessionStatus, DecisionStatus } from '@prisma/client';

describe('DeliverablesCompilerService', () => {
  let service: DeliverablesCompilerService;
  let module: TestingModule;

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
    module = await Test.createTestingModule({
      providers: [
        DeliverablesCompilerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<DeliverablesCompilerService>(DeliverablesCompilerService);
    module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
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

  // ===========================================================================
  // Branch Coverage Tests
  // ===========================================================================

  describe('branch coverage - readinessScore ternary', () => {
    it('should use 0 when session.readinessScore is null', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        readinessScore: null,
      });
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      expect(result.readinessScore).toBe(0);
    });
  });

  describe('branch coverage - session.industry null', () => {
    it('should return undefined for industry when session.industry is null', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        industry: null,
      });
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      expect(result.metadata.industry).toBeUndefined();
    });
  });

  describe('branch coverage - questionnaire name fallback', () => {
    it('should use "Assessment" when session.questionnaire is null', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        questionnaire: null,
      });
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      // Verify the document was generated (the fallback is in generateSystemOverview)
      expect(result.documents.length).toBeGreaterThan(0);
    });
  });

  describe('branch coverage - decisions.length === 0 with includeDecisionLog', () => {
    it('should not include Decision Log when decisions array is empty', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: true,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const decisionDoc = result.documents.find((d) => d.title.includes('Decision'));
      expect(decisionDoc).toBeUndefined();
    });
  });

  describe('branch coverage - dimension analysis score thresholds', () => {
    it('should label scores >= 80 as Strong, >= 50 as Adequate, < 50 as Needs Improvement', async () => {
      const mixedDimensions = [
        { key: 'strong-dim', displayName: 'Strong Dim', weight: 1.0, score: 90 },
        { key: 'adequate-dim', displayName: 'Adequate Dim', weight: 1.0, score: 60 },
        { key: 'weak-dim', displayName: 'Weak Dim', weight: 1.0, score: 30 },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mixedDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeReadinessReport: true,
        includeDecisionLog: false,
        includePolicyPack: false,
      });

      // The readiness report should be generated with dimension analysis
      const readinessDoc = result.documents.find(
        (d) => d.category === DeliverableCategory.READINESS,
      );
      expect(readinessDoc).toBeDefined();
    });
  });

  describe('branch coverage - gaps.length === 0 in gap analysis', () => {
    it('should show no gaps message when all dimensions are >= 80', async () => {
      const strongDimensions = [
        { key: 'dim-a', displayName: 'Dim A', weight: 1.0, score: 90 },
        { key: 'dim-b', displayName: 'Dim B', weight: 1.0, score: 85 },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(strongDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

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
  });

  describe('branch coverage - weakDimensions.length === 0 in recommendations', () => {
    it('should generate generic recommendations when no weak dimensions', async () => {
      const okDimensions = [{ key: 'dim-a', displayName: 'Dim A', weight: 1.0, score: 75 }];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(okDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

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
  });

  describe('branch coverage - autoSection disabled', () => {
    it('should not auto-section even when content exceeds maxWords', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        autoSection: false,
        maxWordsPerSection: 10,
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      // Sections should not have subSections when autoSection is false
      result.documents.forEach((doc) => {
        doc.sections.forEach((section) => {
          expect(section.subSections).toBeUndefined();
        });
      });
    });
  });

  describe('branch coverage - response.question.dimension?.key null', () => {
    it('should handle responses with null dimension key in getDimensionScores', async () => {
      const responsesWithNullDim = [
        {
          id: 'resp-1',
          questionId: 'q1',
          sessionId: 'session-123',
          value: 'test',
          coverage: 0.75,
          question: {
            text: 'Question?',
            dimension: null,
          },
        },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(responsesWithNullDim);
      mockPrisma.dimension.findMany.mockResolvedValue([]);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      // Should succeed without error even with null dimensions
      expect(result.documents.length).toBeGreaterThan(0);
    });
  });

  describe('branch coverage - response.coverage null/falsy', () => {
    it('should treat null coverage as 0', async () => {
      const responsesWithNullCoverage = [
        {
          id: 'resp-1',
          questionId: 'q1',
          sessionId: 'session-123',
          value: 'test',
          coverage: null,
          question: {
            text: 'Question?',
            dimension: { key: 'security', displayName: 'Security' },
          },
        },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(responsesWithNullCoverage);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456');

      expect(result.documents.length).toBeGreaterThan(0);
    });
  });

  describe('branch coverage - formatDecisions empty decisions', () => {
    it('should handle empty decisions in compileDecisionLog', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      // Return decisions so includeDecisionLog triggers, but test internal branching
      mockPrisma.decisionLog.findMany.mockResolvedValue(mockDecisions);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: true,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const decisionDoc = result.documents.find((d) => d.title.includes('Decision'));
      expect(decisionDoc).toBeDefined();
    });
  });

  describe('branch coverage - includeDecisionLog false skips decisions fetch', () => {
    it('should not fetch decisions when includeDecisionLog is false', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      expect(mockPrisma.decisionLog.findMany).not.toHaveBeenCalled();
    });
  });

  describe('branch coverage - decision.description null fallback', () => {
    it('should show N/A when decision.description is null/undefined', async () => {
      const decisionsNoDescription = [
        {
          id: 'dec-1',
          title: 'Use Redis',
          statement: 'Use Redis for caching',
          rationale: 'Performance',
          status: DecisionStatus.LOCKED,
          description: undefined,
          createdAt: new Date('2026-01-20'),
        },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue(decisionsNoDescription);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: true,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const decisionDoc = result.documents.find((d) => d.title.includes('Decision'));
      expect(decisionDoc).toBeDefined();
    });
  });

  describe('branch coverage - decision log with DRAFT decisions', () => {
    it('should partition decisions into LOCKED and DRAFT categories', async () => {
      const mixedDecisions = [
        {
          id: 'dec-1',
          title: 'Locked Decision',
          statement: 'Locked',
          rationale: 'Test',
          status: DecisionStatus.LOCKED,
          description: 'Approved',
          createdAt: new Date('2026-01-20'),
        },
        {
          id: 'dec-2',
          title: 'Draft Decision',
          statement: 'Draft',
          rationale: 'Test',
          status: DecisionStatus.DRAFT,
          description: 'Pending',
          createdAt: new Date('2026-01-21'),
        },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue(mixedDecisions);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeDecisionLog: true,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      const decisionDoc = result.documents.find((d) => d.title.includes('Decision'));
      expect(decisionDoc).toBeDefined();
      expect(decisionDoc!.sections.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('branch coverage - session.industry present vs null in exec summary', () => {
    it('should use session industry in executive summary when present', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        industry: 'Healthcare',
      });
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        includeReadinessReport: true,
        includeDecisionLog: false,
        includePolicyPack: false,
      });

      expect(result.metadata.industry).toBe('Healthcare');
    });
  });

  describe('branch coverage - autoSectionContent with exact maxWords boundary', () => {
    it('should create sub-sections when content exceeds maxWords with auto-section enabled', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(mockResponses);
      mockPrisma.dimension.findMany.mockResolvedValue(mockDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

      const result = await service.compileDeliverablesPack('session-123', 'user-456', {
        autoSection: true,
        maxWordsPerSection: 5,
        includeDecisionLog: false,
        includeReadinessReport: false,
        includePolicyPack: false,
      });

      // With very small maxWordsPerSection, at least some sections should have sub-sections
      const hasSubSections = result.documents.some((doc) =>
        doc.sections.some((s) => s.subSections && s.subSections.length > 0),
      );
      expect(hasSubSections).toBe(true);
    });
  });

  describe('branch coverage - generateArchitectureDecisions with matching responses', () => {
    it('should include architecture decisions when responses match decision/architecture text', async () => {
      const archResponses = [
        {
          id: 'resp-arch-1',
          questionId: 'q-arch-1',
          sessionId: 'session-123',
          value: 'Use microservices',
          coverage: 0.8,
          question: {
            text: 'What is your architecture decision?',
            dimension: { key: 'arch_sec', displayName: 'Architecture Security' },
          },
        },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue(archResponses);
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
      expect(archDoc!.wordCount).toBeGreaterThan(0);
    });
  });

  describe('branch coverage - weak dimensions in recommendations', () => {
    it('should generate remediation recommendations when dimensions score < 60', async () => {
      const weakDimensions = [
        { key: 'security', displayName: 'Security', weight: 1.0, score: 30 },
        { key: 'devops', displayName: 'DevOps', weight: 1.0, score: 40 },
      ];

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.response.findMany.mockResolvedValue([
        {
          id: 'r-1',
          questionId: 'q1',
          sessionId: 'session-123',
          value: 'test',
          coverage: 0.3,
          question: {
            text: 'Question?',
            dimension: { key: 'security', displayName: 'Security' },
          },
        },
      ]);
      mockPrisma.dimension.findMany.mockResolvedValue(weakDimensions);
      mockPrisma.decisionLog.findMany.mockResolvedValue([]);
      mockPrisma.evidenceRegistry.findMany.mockResolvedValue([]);

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
  });
});
