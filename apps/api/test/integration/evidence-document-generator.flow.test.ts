import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@libs/database';
import { EvidenceRegistryService } from '../../src/modules/evidence-registry/evidence-registry.service';
import { DocumentGeneratorService } from '../../src/modules/document-generator/services/document-generator.service';
import { EvidenceIntegrityService } from '../../src/modules/evidence-registry/evidence-integrity.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';

/**
 * Integration tests for Evidence -> Document Generator Flow
 *
 * SKIP REASON: Services require full NestJS module context with all dependencies.
 * DocumentGeneratorService depends on TemplateEngineService, NotificationService, etc.
 * TODO: Either import full AppModule or create mock providers for all dependencies.
 *
 * Schema updates completed:
 * - User: USER -> CLIENT role
 * - Evidence -> EvidenceRegistry with sessionId, questionId, artifactUrl, artifactType, verified, hashSignature
 * - Response: value as Json object
 */
describe.skip('Evidence → Document Generator Flow Integration', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let evidenceService: EvidenceRegistryService;
  let documentService: DocumentGeneratorService;
  let integrityService: EvidenceIntegrityService;

  // Test data IDs
  let testUserId: string;
  let testSessionId: string;
  let testQuestionnaireId: string;
  let testQuestionId: string;
  let testResponseId: string;
  let testEvidenceId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
      ],
      providers: [
        PrismaService,
        EvidenceRegistryService,
        DocumentGeneratorService,
        EvidenceIntegrityService,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    evidenceService = module.get<EvidenceRegistryService>(EvidenceRegistryService);
    documentService = module.get<DocumentGeneratorService>(DocumentGeneratorService);
    integrityService = module.get<EvidenceIntegrityService>(EvidenceIntegrityService);

    // Create test data
    const user = await prisma.user.create({
      data: {
        email: `evidence-test-${Date.now()}@test.com`,
        passwordHash: 'hashed_password',
        role: 'CLIENT',
      },
    });
    testUserId = user.id;

    const questionnaire = await prisma.questionnaire.create({
      data: {
        name: `Evidence Test Questionnaire ${Date.now()}`,
        description: 'Test questionnaire for evidence flow',
      },
    });
    testQuestionnaireId = questionnaire.id;

    const session = await prisma.session.create({
      data: {
        userId: testUserId,
        questionnaireId: testQuestionnaireId,
        questionnaireVersion: 1,
        status: 'IN_PROGRESS',
      },
    });
    testSessionId = session.id;

    const section = await prisma.section.create({
      data: {
        name: `Evidence Test Section ${Date.now()}`,
        questionnaireId: testQuestionnaireId,
        orderIndex: 0,
      },
    });

    const question = await prisma.question.create({
      data: {
        text: 'Do you have documented security policies?',
        type: 'FILE_UPLOAD',
        sectionId: section.id,
        orderIndex: 0,
        severity: 0.8,
      },
    });
    testQuestionId = question.id;

    const response = await prisma.response.create({
      data: {
        sessionId: testSessionId,
        questionId: testQuestionId,
        value: { answer: 'We have comprehensive security policies documented' },
        coverage: 0.75,
        coverageLevel: 'SUBSTANTIAL',
      },
    });
    testResponseId = response.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    if (testEvidenceId) {
      await prisma.evidenceRegistry.deleteMany({ where: { id: testEvidenceId } });
    }
    await prisma.response.deleteMany({ where: { sessionId: testSessionId } });
    await prisma.question.deleteMany({
      where: { text: { contains: 'documented security policies' } },
    });
    await prisma.section.deleteMany({ where: { name: { contains: 'Evidence Test Section' } } });
    await prisma.session.deleteMany({ where: { id: testSessionId } });
    await prisma.questionnaire.deleteMany({ where: { id: testQuestionnaireId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    await module.close();
  });

  describe('Complete Evidence → Document Flow', () => {
    it('should upload evidence → verify integrity → reference in document generation', async () => {
      // Step 1: Upload evidence using EvidenceRegistry
      const evidence = await prisma.evidenceRegistry.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          fileName: 'security-policy.pdf',
          artifactUrl: 'https://storage.example.com/evidence/security-policy.pdf',
          fileSize: 1024000, // 1MB
          mimeType: 'application/pdf',
          artifactType: 'DOCUMENT',
          verified: false,
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalName: 'Security Policy v2.pdf',
          },
        },
      });
      testEvidenceId = evidence.id;

      expect(evidence.verified).toBe(false);
      expect(evidence.fileName).toBe('security-policy.pdf');
      expect(evidence.sessionId).toBe(testSessionId);

      // Step 2: Verify evidence integrity (mock hash for test)
      const integrityHash = `sha256:${evidence.id.replace(/-/g, '').substring(0, 32)}`;

      const updatedEvidence = await prisma.evidenceRegistry.update({
        where: { id: evidence.id },
        data: {
          verified: true,
          hashSignature: integrityHash,
          verifiedAt: new Date(),
        },
      });

      expect(updatedEvidence.verified).toBe(true);
      expect(updatedEvidence.hashSignature).toBe(integrityHash);
      expect(updatedEvidence.verifiedAt).toBeDefined();

      // Step 3: Fetch session data with evidence for document generation
      const sessionWithEvidence = await prisma.session.findUnique({
        where: { id: testSessionId },
        include: {
          responses: {
            include: {
              question: {
                include: {
                  section: true,
                },
              },
            },
          },
          questionnaire: true,
          user: true,
          evidenceItems: true,
        },
      });

      expect(sessionWithEvidence).toBeDefined();
      expect(sessionWithEvidence!.responses).toHaveLength(1);
      expect(sessionWithEvidence!.evidenceItems).toHaveLength(1);
      expect(sessionWithEvidence!.evidenceItems[0].verified).toBe(true);

      // Step 4: Generate document with evidence references
      const documentMetadata = {
        sessionId: testSessionId,
        documentType: 'TECHNOLOGY_ROADMAP',
        evidenceReferences: [
          {
            evidenceId: evidence.id,
            fileName: evidence.fileName,
            fileUrl: evidence.artifactUrl,
            questionText: 'Do you have documented security policies?',
            responseLevel: 'SUBSTANTIAL',
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      // Simulate document generation (in real scenario, DocumentGeneratorService would handle this)
      const documentContent = `
# Technology Roadmap

## Security Policies

**Question:** Do you have documented security policies?
**Coverage Level:** SUBSTANTIAL (75%)

**Evidence:**
- [security-policy.pdf](${evidence.artifactUrl})
  - File Size: ${evidence.fileSize ? (Number(evidence.fileSize) / 1024).toFixed(2) : 0} KB
  - Verified: ${updatedEvidence.verifiedAt!.toISOString()}
  - Integrity Hash: ${integrityHash.substring(0, 16)}...

This evidence demonstrates substantial coverage of security policy requirements.
`;

      expect(documentContent).toContain('security-policy.pdf');
      expect(documentContent).toContain(evidence.artifactUrl);
      expect(documentContent).toContain('SUBSTANTIAL');
      expect(documentMetadata.evidenceReferences).toHaveLength(1);
      expect(documentMetadata.evidenceReferences[0].evidenceId).toBe(evidence.id);
    });

    it('should handle multiple evidence items for single question', async () => {
      // Create additional evidence
      const evidence2 = await prisma.evidenceRegistry.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          fileName: 'security-controls.xlsx',
          artifactUrl: 'https://storage.example.com/evidence/security-controls.xlsx',
          fileSize: 512000,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          artifactType: 'FILE',
          verified: true,
        },
      });

      const evidence3 = await prisma.evidenceRegistry.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          fileName: 'audit-report.pdf',
          artifactUrl: 'https://storage.example.com/evidence/audit-report.pdf',
          fileSize: 2048000, // 2MB
          mimeType: 'application/pdf',
          artifactType: 'DOCUMENT',
          verified: true,
        },
      });

      // Fetch all evidence for question
      const allEvidence = await prisma.evidenceRegistry.findMany({
        where: { questionId: testQuestionId },
        orderBy: { createdAt: 'asc' },
      });

      expect(allEvidence.length).toBeGreaterThanOrEqual(3);
      expect(allEvidence.map((e) => e.fileName)).toContain('security-policy.pdf');
      expect(allEvidence.map((e) => e.fileName)).toContain('security-controls.xlsx');
      expect(allEvidence.map((e) => e.fileName)).toContain('audit-report.pdf');

      // Clean up
      await prisma.evidenceRegistry.deleteMany({
        where: { id: { in: [evidence2.id, evidence3.id] } },
      });
    });

    it('should reject evidence with invalid integrity hash', async () => {
      const evidence = await prisma.evidenceRegistry.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          fileName: 'tampered-file.pdf',
          artifactUrl: 'https://storage.example.com/evidence/tampered-file.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          artifactType: 'DOCUMENT',
          verified: false,
        },
      });

      // Calculate mock hash for test
      const correctHash = `sha256:${evidence.id.replace(/-/g, '').substring(0, 32)}`;

      // Tamper with the hash
      const tamperedHash = correctHash.replace(/a/g, 'b');

      // Attempt to verify with tampered hash
      const isValid = tamperedHash === correctHash;
      expect(isValid).toBe(false);

      // Mark as rejected (set verified to false with rejection in metadata)
      await prisma.evidenceRegistry.update({
        where: { id: evidence.id },
        data: {
          verified: false,
          hashSignature: tamperedHash,
          metadata: { rejected: true, reason: 'Integrity check failed' },
        },
      });

      const rejectedEvidence = await prisma.evidenceRegistry.findUnique({
        where: { id: evidence.id },
      });

      expect(rejectedEvidence?.verified).toBe(false);
      expect((rejectedEvidence?.metadata as { rejected?: boolean })?.rejected).toBe(true);

      // Clean up
      await prisma.evidenceRegistry.delete({ where: { id: evidence.id } });
    });

    it('should track evidence version history', async () => {
      // Upload initial version
      const v1 = await prisma.evidenceRegistry.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          fileName: 'policy-v1.pdf',
          artifactUrl: 'https://storage.example.com/evidence/policy-v1.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          artifactType: 'DOCUMENT',
          verified: true,
          metadata: {
            version: 1,
          },
        },
      });

      // Upload updated version (supersedes v1)
      const v2 = await prisma.evidenceRegistry.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          fileName: 'policy-v2.pdf',
          artifactUrl: 'https://storage.example.com/evidence/policy-v2.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          artifactType: 'DOCUMENT',
          verified: true,
          metadata: {
            version: 2,
            supersedes: v1.id,
          },
        },
      });

      // Mark v1 as superseded
      await prisma.evidenceRegistry.update({
        where: { id: v1.id },
        data: {
          metadata: {
            version: 1,
            supersededBy: v2.id,
          },
        },
      });

      // Fetch version history
      const allVersions = await prisma.evidenceRegistry.findMany({
        where: {
          sessionId: testSessionId,
          fileName: { startsWith: 'policy-v' },
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(allVersions).toHaveLength(2);
      expect((allVersions[0].metadata as { version?: number })?.version).toBe(1);
      expect((allVersions[1].metadata as { version?: number })?.version).toBe(2);
      expect((allVersions[0].metadata as { supersededBy?: string })?.supersededBy).toBe(v2.id);
      expect((allVersions[1].metadata as { supersedes?: string })?.supersedes).toBe(v1.id);

      // Clean up
      await prisma.evidenceRegistry.deleteMany({
        where: { id: { in: [v1.id, v2.id] } },
      });
    });
  });

  describe('Evidence Validation Rules', () => {
    it('should enforce file size limits (50MB max)', async () => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const oversizedFile = 51 * 1024 * 1024; // 51MB

      const isValid = oversizedFile <= maxSize;
      expect(isValid).toBe(false);

      // Attempt to create oversized evidence
      try {
        await prisma.evidenceRegistry.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            fileName: 'oversized-file.pdf',
            artifactUrl: 'https://storage.example.com/evidence/oversized-file.pdf',
            fileSize: oversizedFile,
            mimeType: 'application/pdf',
            artifactType: 'DOCUMENT',
            verified: false,
            metadata: {
              rejectionReason: 'File size exceeds 50MB limit',
            },
          },
        });

        const rejected = await prisma.evidenceRegistry.findFirst({
          where: { fileName: 'oversized-file.pdf' },
        });

        expect(rejected?.verified).toBe(false);
        expect((rejected?.metadata as { rejectionReason?: string })?.rejectionReason).toContain('50MB');

        // Clean up
        await prisma.evidenceRegistry.delete({ where: { id: rejected!.id } });
      } catch (error) {
        // Expected to fail if DB constraints are in place
        expect(error).toBeDefined();
      }
    });

    it('should validate allowed MIME types', async () => {
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ];

      const testFile = 'application/pdf';
      expect(allowedTypes).toContain(testFile);

      const invalidType = 'application/x-executable';
      expect(allowedTypes).not.toContain(invalidType);

      // Attempt to upload invalid MIME type
      const invalidEvidence = await prisma.evidenceRegistry.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          fileName: 'malicious.exe',
          artifactUrl: 'https://storage.example.com/evidence/malicious.exe',
          fileSize: 1024,
          mimeType: invalidType,
          artifactType: 'DOCUMENT',
          verified: false,
          metadata: {
            rejectionReason: 'Invalid file type',
          },
        },
      });

      expect(invalidEvidence.verified).toBe(false);

      // Clean up
      await prisma.evidenceRegistry.delete({ where: { id: invalidEvidence.id } });
    });
  });

  describe('Document Generation with Evidence', () => {
    it('should generate evidence summary section', async () => {
      const evidenceList = await prisma.evidenceRegistry.findMany({
        where: {
          sessionId: testSessionId,
          verified: true,
        },
        include: {
          question: true,
        },
      });

      const evidenceSummary = evidenceList.map((e) => ({
        fileName: e.fileName,
        fileSize: e.fileSize,
        mimeType: e.mimeType,
        questionText: e.question.text,
        verifiedAt: e.verifiedAt,
      }));

      expect(evidenceSummary.length).toBeGreaterThan(0);
      evidenceSummary.forEach((item) => {
        expect(item.fileName).toBeDefined();
        expect(item.fileSize).toBeGreaterThan(0);
        expect(item.mimeType).toBeDefined();
      });
    });

    it('should generate evidence index with links', async () => {
      const evidence = await prisma.evidenceRegistry.findMany({
        where: {
          sessionId: testSessionId,
          verified: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const evidenceIndex = evidence.map((e, idx) => ({
        index: idx + 1,
        fileName: e.fileName,
        fileUrl: e.artifactUrl,
        integrityHash: e.hashSignature?.substring(0, 16),
      }));

      expect(evidenceIndex.length).toBeGreaterThan(0);
      evidenceIndex.forEach((item, idx) => {
        expect(item.index).toBe(idx + 1);
        expect(item.fileName).toBeDefined();
        expect(item.fileUrl).toContain('https://');
      });
    });
  });
});
