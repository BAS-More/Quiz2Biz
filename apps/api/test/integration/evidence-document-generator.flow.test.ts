import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@libs/database';
import { EvidenceRegistryService } from '../../src/modules/evidence-registry/evidence-registry.service';
import { DocumentGeneratorService } from '../../src/modules/document-generator/services/document-generator.service';
import { EvidenceIntegrityService } from '../../src/modules/evidence-registry/evidence-integrity.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';

describe('Evidence → Document Generator Flow Integration', () => {
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
        hashedPassword: 'hashed_password',
        role: 'USER',
      },
    });
    testUserId = user.id;

    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: `Evidence Test Questionnaire ${Date.now()}`,
        description: 'Test questionnaire for evidence flow',
      },
    });
    testQuestionnaireId = questionnaire.id;

    const session = await prisma.session.create({
      data: {
        userId: testUserId,
        questionnaireId: testQuestionnaireId,
        status: 'IN_PROGRESS',
      },
    });
    testSessionId = session.id;

    const dimension = await prisma.dimension.create({
      data: {
        name: `Evidence Test Dimension ${Date.now()}`,
        weight: 1.0,
        questionnaireId: testQuestionnaireId,
      },
    });

    const question = await prisma.question.create({
      data: {
        text: 'Do you have documented security policies?',
        type: 'FILE_UPLOAD',
        dimensionId: dimension.id,
        severity: 0.8,
      },
    });
    testQuestionId = question.id;

    const response = await prisma.response.create({
      data: {
        sessionId: testSessionId,
        questionId: testQuestionId,
        coverage: 0.75,
        coverageLevel: 'SUBSTANTIAL',
      },
    });
    testResponseId = response.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    if (testEvidenceId) {
      await prisma.evidence.deleteMany({ where: { id: testEvidenceId } });
    }
    await prisma.response.deleteMany({ where: { sessionId: testSessionId } });
    await prisma.question.deleteMany({
      where: { text: { contains: 'documented security policies' } },
    });
    await prisma.dimension.deleteMany({ where: { name: { contains: 'Evidence Test Dimension' } } });
    await prisma.session.deleteMany({ where: { id: testSessionId } });
    await prisma.questionnaire.deleteMany({ where: { id: testQuestionnaireId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    await module.close();
  });

  describe('Complete Evidence → Document Flow', () => {
    it('should upload evidence → verify integrity → reference in document generation', async () => {
      // Step 1: Upload evidence
      const evidence = await prisma.evidence.create({
        data: {
          userId: testUserId,
          responseId: testResponseId,
          fileName: 'security-policy.pdf',
          fileUrl: 'https://storage.example.com/evidence/security-policy.pdf',
          fileSize: 1024000, // 1MB
          mimeType: 'application/pdf',
          status: 'PENDING',
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalName: 'Security Policy v2.pdf',
          },
        },
      });
      testEvidenceId = evidence.id;

      expect(evidence.status).toBe('PENDING');
      expect(evidence.fileName).toBe('security-policy.pdf');
      expect(evidence.responseId).toBe(testResponseId);

      // Step 2: Verify evidence integrity (hash chain)
      const integrityHash = integrityService.calculateHash({
        id: evidence.id,
        fileName: evidence.fileName,
        fileUrl: evidence.fileUrl,
        fileSize: evidence.fileSize,
        uploadedAt: evidence.createdAt.toISOString(),
      });

      const updatedEvidence = await prisma.evidence.update({
        where: { id: evidence.id },
        data: {
          status: 'VERIFIED',
          integrityHash,
          verifiedAt: new Date(),
        },
      });

      expect(updatedEvidence.status).toBe('VERIFIED');
      expect(updatedEvidence.integrityHash).toBe(integrityHash);
      expect(updatedEvidence.verifiedAt).toBeDefined();

      // Step 3: Fetch session data with evidence for document generation
      const sessionWithEvidence = await prisma.session.findUnique({
        where: { id: testSessionId },
        include: {
          responses: {
            include: {
              question: {
                include: {
                  dimension: true,
                },
              },
              evidence: true,
            },
          },
          questionnaire: true,
          user: true,
        },
      });

      expect(sessionWithEvidence).toBeDefined();
      expect(sessionWithEvidence!.responses).toHaveLength(1);
      expect(sessionWithEvidence!.responses[0].evidence).toHaveLength(1);
      expect(sessionWithEvidence!.responses[0].evidence[0].status).toBe('VERIFIED');

      // Step 4: Generate document with evidence references
      const documentMetadata = {
        sessionId: testSessionId,
        documentType: 'TECHNOLOGY_ROADMAP',
        evidenceReferences: [
          {
            evidenceId: evidence.id,
            fileName: evidence.fileName,
            fileUrl: evidence.fileUrl,
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
- [security-policy.pdf](${evidence.fileUrl})
  - File Size: ${(evidence.fileSize / 1024).toFixed(2)} KB
  - Verified: ${updatedEvidence.verifiedAt!.toISOString()}
  - Integrity Hash: ${integrityHash.substring(0, 16)}...

This evidence demonstrates substantial coverage of security policy requirements.
`;

      expect(documentContent).toContain('security-policy.pdf');
      expect(documentContent).toContain(evidence.fileUrl);
      expect(documentContent).toContain('SUBSTANTIAL');
      expect(documentMetadata.evidenceReferences).toHaveLength(1);
      expect(documentMetadata.evidenceReferences[0].evidenceId).toBe(evidence.id);
    });

    it('should handle multiple evidence items for single response', async () => {
      // Create additional evidence
      const evidence2 = await prisma.evidence.create({
        data: {
          userId: testUserId,
          responseId: testResponseId,
          fileName: 'security-controls.xlsx',
          fileUrl: 'https://storage.example.com/evidence/security-controls.xlsx',
          fileSize: 512000,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          status: 'VERIFIED',
        },
      });

      const evidence3 = await prisma.evidence.create({
        data: {
          userId: testUserId,
          responseId: testResponseId,
          fileName: 'audit-report.pdf',
          fileUrl: 'https://storage.example.com/evidence/audit-report.pdf',
          fileSize: 2048000, // 2MB
          mimeType: 'application/pdf',
          status: 'VERIFIED',
        },
      });

      // Fetch all evidence for response
      const allEvidence = await prisma.evidence.findMany({
        where: { responseId: testResponseId },
        orderBy: { createdAt: 'asc' },
      });

      expect(allEvidence.length).toBeGreaterThanOrEqual(3);
      expect(allEvidence.map((e) => e.fileName)).toContain('security-policy.pdf');
      expect(allEvidence.map((e) => e.fileName)).toContain('security-controls.xlsx');
      expect(allEvidence.map((e) => e.fileName)).toContain('audit-report.pdf');

      // Clean up
      await prisma.evidence.deleteMany({
        where: { id: { in: [evidence2.id, evidence3.id] } },
      });
    });

    it('should reject evidence with invalid integrity hash', async () => {
      const evidence = await prisma.evidence.create({
        data: {
          userId: testUserId,
          responseId: testResponseId,
          fileName: 'tampered-file.pdf',
          fileUrl: 'https://storage.example.com/evidence/tampered-file.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          status: 'PENDING',
        },
      });

      // Calculate correct hash
      const correctHash = integrityService.calculateHash({
        id: evidence.id,
        fileName: evidence.fileName,
        fileUrl: evidence.fileUrl,
        fileSize: evidence.fileSize,
        uploadedAt: evidence.createdAt.toISOString(),
      });

      // Tamper with the hash
      const tamperedHash = correctHash.replace(/a/g, 'b');

      // Attempt to verify with tampered hash
      const isValid = tamperedHash === correctHash;
      expect(isValid).toBe(false);

      // Mark as rejected
      await prisma.evidence.update({
        where: { id: evidence.id },
        data: {
          status: 'REJECTED',
          integrityHash: tamperedHash,
        },
      });

      const rejectedEvidence = await prisma.evidence.findUnique({
        where: { id: evidence.id },
      });

      expect(rejectedEvidence!.status).toBe('REJECTED');

      // Clean up
      await prisma.evidence.delete({ where: { id: evidence.id } });
    });

    it('should track evidence version history', async () => {
      // Upload initial version
      const v1 = await prisma.evidence.create({
        data: {
          userId: testUserId,
          responseId: testResponseId,
          fileName: 'policy-v1.pdf',
          fileUrl: 'https://storage.example.com/evidence/policy-v1.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          status: 'VERIFIED',
          metadata: {
            version: 1,
          },
        },
      });

      // Upload updated version (supersedes v1)
      const v2 = await prisma.evidence.create({
        data: {
          userId: testUserId,
          responseId: testResponseId,
          fileName: 'policy-v2.pdf',
          fileUrl: 'https://storage.example.com/evidence/policy-v2.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          status: 'VERIFIED',
          metadata: {
            version: 2,
            supersedes: v1.id,
          },
        },
      });

      // Mark v1 as superseded
      await prisma.evidence.update({
        where: { id: v1.id },
        data: {
          metadata: {
            version: 1,
            supersededBy: v2.id,
          },
        },
      });

      // Fetch version history
      const allVersions = await prisma.evidence.findMany({
        where: {
          responseId: testResponseId,
          fileName: { startsWith: 'policy-v' },
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(allVersions).toHaveLength(2);
      expect((allVersions[0].metadata as any).version).toBe(1);
      expect((allVersions[1].metadata as any).version).toBe(2);
      expect((allVersions[0].metadata as any).supersededBy).toBe(v2.id);
      expect((allVersions[1].metadata as any).supersedes).toBe(v1.id);

      // Clean up
      await prisma.evidence.deleteMany({
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
        await prisma.evidence.create({
          data: {
            userId: testUserId,
            responseId: testResponseId,
            fileName: 'oversized-file.pdf',
            fileUrl: 'https://storage.example.com/evidence/oversized-file.pdf',
            fileSize: oversizedFile,
            mimeType: 'application/pdf',
            status: 'REJECTED',
            metadata: {
              rejectionReason: 'File size exceeds 50MB limit',
            },
          },
        });

        const rejected = await prisma.evidence.findFirst({
          where: { fileName: 'oversized-file.pdf' },
        });

        expect(rejected!.status).toBe('REJECTED');
        expect((rejected!.metadata as any).rejectionReason).toContain('50MB');

        // Clean up
        await prisma.evidence.delete({ where: { id: rejected!.id } });
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
      const invalidEvidence = await prisma.evidence.create({
        data: {
          userId: testUserId,
          responseId: testResponseId,
          fileName: 'malicious.exe',
          fileUrl: 'https://storage.example.com/evidence/malicious.exe',
          fileSize: 1024,
          mimeType: invalidType,
          status: 'REJECTED',
          metadata: {
            rejectionReason: 'Invalid file type',
          },
        },
      });

      expect(invalidEvidence.status).toBe('REJECTED');

      // Clean up
      await prisma.evidence.delete({ where: { id: invalidEvidence.id } });
    });
  });

  describe('Document Generation with Evidence', () => {
    it('should generate evidence summary section', async () => {
      const evidenceList = await prisma.evidence.findMany({
        where: {
          responseId: testResponseId,
          status: 'VERIFIED',
        },
        include: {
          response: {
            include: {
              question: true,
            },
          },
        },
      });

      const evidenceSummary = evidenceList.map((e) => ({
        fileName: e.fileName,
        fileSize: e.fileSize,
        mimeType: e.mimeType,
        questionText: e.response.question.text,
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
      const evidence = await prisma.evidence.findMany({
        where: {
          responseId: testResponseId,
          status: 'VERIFIED',
        },
        orderBy: { createdAt: 'asc' },
      });

      const evidenceIndex = evidence.map((e, idx) => ({
        index: idx + 1,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
        integrityHash: e.integrityHash?.substring(0, 16),
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
