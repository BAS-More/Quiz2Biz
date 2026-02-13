import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceRegistryController } from './evidence-registry.controller';
import { EvidenceRegistryService } from './evidence-registry.service';
import { EvidenceIntegrityService } from './evidence-integrity.service';
import { CIArtifactIngestionService } from './ci-artifact-ingestion.service';
import { EvidenceType } from '@prisma/client';

describe('EvidenceRegistryController', () => {
  let controller: EvidenceRegistryController;
  let evidenceService: EvidenceRegistryService;
  let integrityService: EvidenceIntegrityService;
  let ciIngestionService: CIArtifactIngestionService;

  const mockEvidenceService = {
    uploadEvidence: jest.fn(),
    verifyEvidence: jest.fn(),
    getEvidence: jest.fn(),
    listEvidence: jest.fn(),
    getEvidenceStats: jest.fn(),
    deleteEvidence: jest.fn(),
  };

  const mockIntegrityService = {
    chainEvidence: jest.fn(),
    getEvidenceChain: jest.fn(),
    verifyChain: jest.fn(),
    verifyEvidenceIntegrity: jest.fn(),
    generateIntegrityReport: jest.fn(),
  };

  const mockCIIngestionService = {
    ingestArtifact: jest.fn(),
    bulkIngestArtifacts: jest.fn(),
    getSessionArtifacts: jest.fn(),
    getBuildSummary: jest.fn(),
  };

  const mockRequest = {
    user: { userId: 'user-123' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidenceRegistryController],
      providers: [
        {
          provide: EvidenceRegistryService,
          useValue: mockEvidenceService,
        },
        {
          provide: EvidenceIntegrityService,
          useValue: mockIntegrityService,
        },
        {
          provide: CIArtifactIngestionService,
          useValue: mockCIIngestionService,
        },
      ],
    }).compile();

    controller = module.get<EvidenceRegistryController>(EvidenceRegistryController);
    evidenceService = module.get<EvidenceRegistryService>(EvidenceRegistryService);
    integrityService = module.get<EvidenceIntegrityService>(EvidenceIntegrityService);
    ciIngestionService = module.get<CIArtifactIngestionService>(CIArtifactIngestionService);

    jest.clearAllMocks();
  });

  describe('uploadEvidence', () => {
    it('uploads file and returns evidence response', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content'),
      };

      const dto = {
        sessionId: 'session-123',
        questionId: 'question-456',
        artifactType: 'FILE' as EvidenceType,
      };

      const mockResponse = {
        id: 'evidence-789',
        sessionId: 'session-123',
        questionId: 'question-456',
        artifactUrl: 'https://storage.blob/file.pdf',
        artifactType: 'FILE' as EvidenceType,
        fileName: 'test.pdf',
        fileSize: BigInt(1024),
        mimeType: 'application/pdf',
        hashSignature: 'abc123',
        verified: false,
        verifierId: null,
        verifiedAt: null,
        createdAt: new Date(),
      };

      mockEvidenceService.uploadEvidence.mockResolvedValue(mockResponse);

      const result = await controller.uploadEvidence(mockFile, dto, mockRequest as any);

      expect(result).toEqual(mockResponse);
      expect(mockEvidenceService.uploadEvidence).toHaveBeenCalledWith(mockFile, dto, 'user-123');
    });
  });

  describe('verifyEvidence', () => {
    it('verifies evidence with coverage update', async () => {
      const dto = {
        evidenceId: 'evidence-123',
        verified: true,
        coverageValue: 0.75,
      };

      const mockResponse = {
        id: 'evidence-123',
        verified: true,
        verifierId: 'user-123',
        verifiedAt: new Date(),
      } as any;

      mockEvidenceService.verifyEvidence.mockResolvedValue(mockResponse);

      const result = await controller.verifyEvidence(dto, mockRequest as any);

      expect(result.verified).toBe(true);
      expect(mockEvidenceService.verifyEvidence).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('getEvidence', () => {
    it('retrieves evidence by ID', async () => {
      const mockEvidence = {
        id: 'evidence-123',
        sessionId: 'session-456',
        questionId: 'question-789',
        artifactType: 'FILE' as EvidenceType,
      } as any;

      mockEvidenceService.getEvidence.mockResolvedValue(mockEvidence);

      const result = await controller.getEvidence('evidence-123');

      expect(result).toEqual(mockEvidence);
      expect(mockEvidenceService.getEvidence).toHaveBeenCalledWith('evidence-123');
    });
  });

  describe('listEvidence', () => {
    it('lists evidence with filters', async () => {
      const filters = {
        sessionId: 'session-123',
        verified: true,
      };

      const mockList = [
        { id: 'evidence-1', verified: true } as any,
        { id: 'evidence-2', verified: true } as any,
      ];

      mockEvidenceService.listEvidence.mockResolvedValue(mockList);

      const result = await controller.listEvidence(filters);

      expect(result).toEqual(mockList);
      expect(mockEvidenceService.listEvidence).toHaveBeenCalledWith(filters);
    });
  });

  describe('getEvidenceStats', () => {
    it('returns evidence statistics for session', async () => {
      const mockStats = {
        total: 10,
        verified: 7,
        pending: 3,
        byType: {
          FILE: 5,
          IMAGE: 3,
          SBOM: 2,
        },
      };

      mockEvidenceService.getEvidenceStats.mockResolvedValue(mockStats);

      const result = await controller.getEvidenceStats('session-123');

      expect(result).toEqual(mockStats);
      expect(mockEvidenceService.getEvidenceStats).toHaveBeenCalledWith('session-123');
    });
  });

  describe('deleteEvidence', () => {
    it('deletes evidence', async () => {
      mockEvidenceService.deleteEvidence.mockResolvedValue(undefined);

      await controller.deleteEvidence('evidence-123', mockRequest as any);

      expect(mockEvidenceService.deleteEvidence).toHaveBeenCalledWith('evidence-123', 'user-123');
    });
  });

  describe('chainEvidence', () => {
    it('adds evidence to integrity chain', async () => {
      const mockChainEntry = {
        id: 'chain-123',
        evidenceId: 'evidence-456',
        sessionId: 'session-789',
        sequenceNumber: 5,
        previousHash: 'prev-hash',
        chainHash: 'new-chain-hash',
        evidenceHash: 'evidence-hash',
        timestampToken: 'token-xyz',
        tsaUrl: 'https://freetsa.org/tsr',
        createdAt: new Date(),
      };

      mockIntegrityService.chainEvidence.mockResolvedValue(mockChainEntry);

      const result = await controller.chainEvidence('evidence-456', { sessionId: 'session-789' });

      expect(result).toEqual(mockChainEntry);
      expect(mockIntegrityService.chainEvidence).toHaveBeenCalledWith(
        'evidence-456',
        'session-789',
      );
    });
  });

  describe('getEvidenceChain', () => {
    it('retrieves full evidence chain for session', async () => {
      const mockChain = [
        {
          id: 'chain-1',
          sequenceNumber: 0,
          chainHash: 'hash-1',
        } as any,
        {
          id: 'chain-2',
          sequenceNumber: 1,
          chainHash: 'hash-2',
        } as any,
      ];

      mockIntegrityService.getEvidenceChain.mockResolvedValue(mockChain);

      const result = await controller.getEvidenceChain('session-123');

      expect(result).toEqual(mockChain);
      expect(mockIntegrityService.getEvidenceChain).toHaveBeenCalledWith('session-123');
    });
  });

  describe('verifyChain', () => {
    it('verifies evidence chain integrity', async () => {
      const mockVerification = {
        sessionId: 'session-123',
        isValid: true,
        totalEntries: 5,
        validEntries: 5,
        invalidEntries: [],
        verifiedAt: new Date(),
      };

      mockIntegrityService.verifyChain.mockResolvedValue(mockVerification);

      const result = await controller.verifyChain('session-123');

      expect(result).toEqual(mockVerification);
      expect(result.isValid).toBe(true);
      expect(mockIntegrityService.verifyChain).toHaveBeenCalledWith('session-123');
    });
  });

  describe('verifyEvidenceIntegrity', () => {
    it('performs comprehensive integrity check', async () => {
      const mockIntegrityResult = {
        evidenceId: 'evidence-123',
        fileName: 'test.pdf',
        originalHash: 'abc123',
        checks: {
          hashStored: true,
          chainLinked: true,
          timestamped: true,
        },
        chainPosition: {
          sequenceNumber: 10,
          chainHash: 'chain-hash',
          linkedAt: new Date(),
        },
        timestamp: {
          token: 'token-xyz...',
          tsaUrl: 'https://freetsa.org/tsr',
        },
        overallStatus: 'FULLY_VERIFIED' as const,
        verifiedAt: new Date(),
      };

      mockIntegrityService.verifyEvidenceIntegrity.mockResolvedValue(mockIntegrityResult);

      const result = await controller.verifyEvidenceIntegrity('evidence-123');

      expect(result.overallStatus).toBe('FULLY_VERIFIED');
      expect(result.checks.hashStored).toBe(true);
      expect(mockIntegrityService.verifyEvidenceIntegrity).toHaveBeenCalledWith('evidence-123');
    });
  });

  describe('generateIntegrityReport', () => {
    it('generates comprehensive session integrity report', async () => {
      const mockReport = {
        sessionId: 'session-123',
        generatedAt: new Date(),
        summary: {
          totalEvidence: 10,
          chainedEvidence: 8,
          timestampedEvidence: 6,
          chainIntegrity: 'VALID' as const,
          chainErrors: 0,
        },
        chainVerification: {
          sessionId: 'session-123',
          isValid: true,
          totalEntries: 8,
          validEntries: 8,
          invalidEntries: [],
          verifiedAt: new Date(),
        },
        evidenceItems: [
          {
            evidenceId: 'evidence-1',
            fileName: 'file1.pdf',
            hash: 'hash-1',
            hasChainEntry: true,
            hasTimestamp: true,
            sequenceNumber: 0,
            status: 'FULLY_VERIFIED' as const,
          },
        ],
      };

      mockIntegrityService.generateIntegrityReport.mockResolvedValue(mockReport);

      const result = await controller.generateIntegrityReport('session-123');

      expect(result.summary.totalEvidence).toBe(10);
      expect(result.summary.chainIntegrity).toBe('VALID');
      expect(mockIntegrityService.generateIntegrityReport).toHaveBeenCalledWith('session-123');
    });
  });

  describe('ingestCIArtifact', () => {
    it('ingests CI artifact as evidence', async () => {
      const dto = {
        sessionId: 'session-123',
        questionId: 'question-456',
        ciProvider: 'azure-devops' as const,
        buildId: 'build-789',
        buildNumber: '42',
        pipelineName: 'CI Pipeline',
        artifactType: 'junit' as const,
        content: '<testsuite tests="10" failures="0"></testsuite>',
        branch: 'main',
        commitSha: 'abc123',
        autoVerify: true,
      };

      const mockResult = {
        evidenceId: 'evidence-ci-123',
        artifactType: 'junit',
        parsedMetrics: {
          tests: 10,
          failures: 0,
          passRate: 100,
        },
        autoVerified: true,
      };

      mockCIIngestionService.ingestArtifact.mockResolvedValue(mockResult);

      const result = await controller.ingestCIArtifact(dto);

      expect(result).toEqual(mockResult);
      expect(mockCIIngestionService.ingestArtifact).toHaveBeenCalledWith(dto);
    });
  });

  describe('bulkIngestCIArtifacts', () => {
    it('ingests multiple CI artifacts', async () => {
      const dto = {
        sessionId: 'session-123',
        ciProvider: 'github-actions' as const,
        buildId: 'build-456',
        artifacts: [
          {
            artifactType: 'junit' as const,
            content: '<testsuite tests="5"></testsuite>',
          },
          {
            artifactType: 'lcov' as const,
            content: 'TN:\nSF:file.ts\nend_of_record',
          },
        ],
      };

      const mockResult = {
        totalArtifacts: 2,
        successCount: 2,
        errorCount: 0,
        results: [],
        errors: [],
      };

      mockCIIngestionService.bulkIngestArtifacts.mockResolvedValue(mockResult);

      const result = await controller.bulkIngestCIArtifacts(dto);

      expect(result.totalArtifacts).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(mockCIIngestionService.bulkIngestArtifacts).toHaveBeenCalledWith(dto);
    });
  });

  describe('getSessionCIArtifacts', () => {
    it('retrieves all CI artifacts for session', async () => {
      const mockArtifacts = [
        {
          id: 'artifact-1',
          buildId: 'build-123',
          artifactType: 'junit',
          metrics: { tests: 10 },
        },
        {
          id: 'artifact-2',
          buildId: 'build-123',
          artifactType: 'lcov',
          metrics: { coverage: 85 },
        },
      ];

      mockCIIngestionService.getSessionArtifacts.mockResolvedValue(mockArtifacts);

      const result = await controller.getSessionCIArtifacts('session-123');

      expect(result).toEqual(mockArtifacts);
      expect(mockCIIngestionService.getSessionArtifacts).toHaveBeenCalledWith('session-123');
    });
  });

  describe('getCIBuildSummary', () => {
    it('retrieves build summary with aggregated metrics', async () => {
      const mockSummary = {
        buildId: 'build-456',
        buildNumber: '42',
        pipelineName: 'CI Pipeline',
        branch: 'main',
        commitSha: 'abc123',
        ciProvider: 'azure-devops',
        totalArtifacts: 2,
        verifiedArtifacts: 2,
        artifactTypes: ['junit', 'lcov'],
        metrics: {
          totalTests: 100,
          testPassRate: 100,
          codeCoverage: 85,
        },
        createdAt: new Date(),
      };

      mockCIIngestionService.getBuildSummary.mockResolvedValue(mockSummary);

      const result = await controller.getCIBuildSummary('session-123', 'build-456');

      expect(result.buildId).toBe('build-456');
      expect((result.metrics as any).totalTests).toBe(100);
      expect(mockCIIngestionService.getBuildSummary).toHaveBeenCalledWith(
        'session-123',
        'build-456',
      );
    });
  });
});
