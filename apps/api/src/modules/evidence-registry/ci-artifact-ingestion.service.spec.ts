import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { CIArtifactIngestionService } from './ci-artifact-ingestion.service';

describe('CIArtifactIngestionService', () => {
  let service: CIArtifactIngestionService;

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    createdAt: new Date(),
  };

  const mockEvidence = {
    id: 'evidence-123',
    sessionId: 'session-123',
    questionId: 'question-123',
    artifactUrl: 'ci://github/build-456/jest',
    artifactType: 'TEST_REPORT',
    fileName: 'jest-build-456',
    fileSize: BigInt(1024),
    mimeType: 'application/json',
    hashSignature: 'abc123hash',
    verified: false,
    metadata: {
      ciProvider: 'github',
      buildId: 'build-456',
      artifactType: 'jest',
      status: 'INGESTED',
    },
    createdAt: new Date(),
  };

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
    },
    evidenceRegistry: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
    },
    response: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CIArtifactIngestionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<CIArtifactIngestionService>(CIArtifactIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestArtifact', () => {
    const baseDto = {
      sessionId: 'session-123',
      questionId: 'question-123',
      ciProvider: 'github',
      buildId: 'build-456',
      artifactType: 'jest',
      content: JSON.stringify({
        numTotalTests: 100,
        numPassedTests: 95,
        numFailedTests: 5,
        numPendingTests: 0,
        numTotalTestSuites: 10,
        testResults: [{ duration: 1000 }],
      }),
    };

    it('should ingest a Jest test report artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact(baseDto);

      expect(result.status).toBe('SUCCESS');
      expect(result.evidenceType).toBe('TEST_REPORT');
      expect(result.parsedData.type).toBe('jest');
      expect(mockPrismaService.evidenceRegistry.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.ingestArtifact(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unknown artifact type', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.ingestArtifact({ ...baseDto, artifactType: 'unknown' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should ingest JUnit XML artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const junitContent = `
        <testsuite tests="10" time="5.5">
          <testcase name="test1"/>
          <testcase name="test2"><failure>error</failure></testcase>
          <testcase name="test3"><error>error</error></testcase>
          <testcase name="test4"><skipped/></testcase>
        </testsuite>
      `;

      const result = await service.ingestArtifact({
        ...baseDto,
        artifactType: 'junit',
        content: junitContent,
      });

      expect(result.parsedData.type).toBe('junit');
      expect(result.parsedData.summary).toBeDefined();
    });

    it('should ingest lcov coverage artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const lcovContent = `
SF:src/file.ts
LF:100
LH:80
FNF:10
FNH:8
BRF:20
BRH:15
end_of_record
      `;

      const result = await service.ingestArtifact({
        ...baseDto,
        artifactType: 'lcov',
        content: lcovContent,
      });

      expect(result.parsedData.type).toBe('lcov');
      expect(result.evidenceType).toBe('CODE_COVERAGE');
    });

    it('should ingest Cobertura coverage artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const coberturaContent = `
        <coverage line-rate="0.85" branch-rate="0.70" lines-valid="100" lines-covered="85">
        </coverage>
      `;

      const result = await service.ingestArtifact({
        ...baseDto,
        artifactType: 'cobertura',
        content: coberturaContent,
      });

      expect(result.parsedData.type).toBe('cobertura');
      expect(result.parsedData.summary).toBeDefined();
    });

    it('should ingest CycloneDX SBOM artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const cyclonedxContent = JSON.stringify({
        specVersion: '1.4',
        serialNumber: 'urn:uuid:123',
        components: [
          { type: 'library', licenses: [{ license: { id: 'MIT' } }] },
          { type: 'framework', licenses: [{ license: { name: 'Apache-2.0' } }] },
        ],
      });

      const result = await service.ingestArtifact({
        ...baseDto,
        artifactType: 'cyclonedx',
        content: cyclonedxContent,
      });

      expect(result.parsedData.type).toBe('cyclonedx');
      expect(result.evidenceType).toBe('SBOM');
    });

    it('should ingest SPDX SBOM artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const spdxContent = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
        name: 'Test SBOM',
        creationInfo: { created: '2024-01-01T00:00:00Z' },
        packages: [
          { licenseConcluded: 'MIT', licenseDeclared: 'MIT' },
          { licenseConcluded: 'Apache-2.0' },
        ],
      });

      const result = await service.ingestArtifact({
        ...baseDto,
        artifactType: 'spdx',
        content: spdxContent,
      });

      expect(result.parsedData.type).toBe('spdx');
    });

    it('should ingest Trivy security scan artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const trivyContent = JSON.stringify({
        ArtifactName: 'test-image',
        Results: [
          {
            Vulnerabilities: [
              { VulnerabilityID: 'CVE-2024-001', Severity: 'CRITICAL', PkgName: 'pkg1' },
              { VulnerabilityID: 'CVE-2024-002', Severity: 'HIGH', PkgName: 'pkg2' },
              { VulnerabilityID: 'CVE-2024-003', Severity: 'MEDIUM', PkgName: 'pkg3' },
              { VulnerabilityID: 'CVE-2024-004', Severity: 'LOW', PkgName: 'pkg4' },
              { VulnerabilityID: 'CVE-2024-005', Severity: 'UNKNOWN', PkgName: 'pkg5' },
            ],
          },
        ],
      });

      const result = await service.ingestArtifact({
        ...baseDto,
        artifactType: 'trivy',
        content: trivyContent,
      });

      expect(result.parsedData.type).toBe('trivy');
      expect(result.evidenceType).toBe('SECURITY_SCAN');
    });

    it('should ingest OWASP dependency check artifact', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const owaspContent = JSON.stringify({
        projectInfo: { reportDate: '2024-01-01' },
        dependencies: [
          {
            fileName: 'pkg1.jar',
            vulnerabilities: [{ name: 'CVE-2024-001', severity: 'CRITICAL' }],
          },
          {
            fileName: 'pkg2.jar',
            vulnerabilities: [{ name: 'CVE-2024-002', cvssv3: { baseSeverity: 'HIGH' } }],
          },
          {
            fileName: 'pkg3.jar',
            vulnerabilities: [{ name: 'CVE-2024-003', severity: 'MEDIUM' }],
          },
          {
            fileName: 'pkg4.jar',
            vulnerabilities: [{ name: 'CVE-2024-004', severity: 'LOW' }],
          },
        ],
      });

      const result = await service.ingestArtifact({
        ...baseDto,
        artifactType: 'owasp',
        content: owaspContent,
      });

      expect(result.parsedData.type).toBe('owasp');
    });

    it('should handle invalid Jest JSON gracefully', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        ...baseDto,
        content: 'invalid json',
      });

      expect(result.parsedData.error).toBeDefined();
    });

    it('should find matching question when questionId not provided', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.question.findFirst.mockResolvedValue({ id: 'found-question' } as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      await service.ingestArtifact({
        ...baseDto,
        questionId: undefined,
      });

      expect(mockPrismaService.question.findFirst).toHaveBeenCalled();
    });

    it('should fallback to unanswered question when no tag match', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.question.findFirst.mockResolvedValue(null);
      mockPrismaService.response.findFirst.mockResolvedValue({ questionId: 'fallback-q' } as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      await service.ingestArtifact({
        ...baseDto,
        questionId: undefined,
      });

      expect(mockPrismaService.response.findFirst).toHaveBeenCalled();
    });

    it('should throw when no matching question found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.question.findFirst.mockResolvedValue(null);
      mockPrismaService.response.findFirst.mockResolvedValue(null);

      await expect(service.ingestArtifact({ ...baseDto, questionId: undefined })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('bulkIngestArtifacts', () => {
    it('should ingest multiple artifacts successfully', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.bulkIngestArtifacts({
        sessionId: 'session-123',
        ciProvider: 'github',
        buildId: 'build-456',
        artifacts: [
          {
            artifactType: 'jest',
            content: JSON.stringify({ numTotalTests: 10 }),
            questionId: 'q1',
          },
          { artifactType: 'lcov', content: 'LF:100\nLH:80', questionId: 'q2' },
        ],
      });

      expect(result.totalArtifacts).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
    });

    it('should handle partial failures in bulk ingest', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create
        .mockResolvedValueOnce(mockEvidence as any)
        .mockRejectedValueOnce(new Error('DB error'));

      const result = await service.bulkIngestArtifacts({
        sessionId: 'session-123',
        ciProvider: 'github',
        buildId: 'build-456',
        artifacts: [
          { artifactType: 'jest', content: '{}', questionId: 'q1' },
          { artifactType: 'jest', content: '{}', questionId: 'q2' },
        ],
      });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toBe('DB error');
    });
  });

  describe('getSessionArtifacts', () => {
    it('should return CI artifacts for a session', async () => {
      const ciEvidence = {
        id: 'ev-1',
        artifactType: 'TEST_REPORT',
        verified: true,
        fileName: 'test.json',
        createdAt: new Date(),
        metadata: {
          ciProvider: 'github',
          buildId: 'build-1',
          buildNumber: '42',
          pipelineName: 'CI',
          artifactType: 'jest',
          branch: 'main',
          commitSha: 'abc123',
          status: 'INGESTED',
        },
      };

      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([ciEvidence] as any);

      const result = await service.getSessionArtifacts('session-123');

      expect(result).toHaveLength(1);
      expect(result[0].ciProvider).toBe('github');
      expect(result[0].buildId).toBe('build-1');
    });

    it('should filter out non-CI artifacts', async () => {
      const regularEvidence = {
        id: 'ev-2',
        artifactType: 'DOCUMENT',
        verified: false,
        metadata: {},
        createdAt: new Date(),
      };

      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([regularEvidence] as any);

      const result = await service.getSessionArtifacts('session-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getBuildSummary', () => {
    it('should return build summary with aggregated metrics', async () => {
      const artifacts = [
        {
          id: 'ev-1',
          artifactType: 'TEST_REPORT',
          verified: true,
          createdAt: new Date(),
          metadata: {
            ciProvider: 'github',
            buildId: 'build-1',
            buildNumber: '42',
            pipelineName: 'CI',
            branch: 'main',
            commitSha: 'abc123',
            artifactType: 'jest',
            parsedData: { summary: { totalTests: 100 } },
          },
        },
        {
          id: 'ev-2',
          artifactType: 'CODE_COVERAGE',
          verified: false,
          createdAt: new Date(),
          metadata: {
            ciProvider: 'github',
            buildId: 'build-1',
            artifactType: 'lcov',
            parsedData: { summary: { overallPercentage: 85 } },
          },
        },
      ];

      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue(artifacts as any);

      const result = await service.getBuildSummary('session-123', 'build-1');

      expect(result.buildId).toBe('build-1');
      expect(result.totalArtifacts).toBe(2);
      expect(result.verifiedArtifacts).toBe(1);
      expect(result.metrics).toHaveProperty('jest');
      expect(result.metrics).toHaveProperty('lcov');
    });

    it('should throw NotFoundException when no artifacts for build', async () => {
      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([]);

      await expect(service.getBuildSummary('session-123', 'build-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =====================================================================
  // BRANCH COVERAGE TESTS
  // =====================================================================

  describe('branch coverage: ingestArtifact optional DTO fields', () => {
    it('should use fallback values when optional DTO fields are undefined', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.question.findFirst.mockResolvedValue({ id: 'q-found' } as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        ciProvider: 'github',
        buildId: 'build-456',
        artifactType: 'jest',
        content: JSON.stringify({ numTotalTests: 5, numPassedTests: 5 }),
        // All optional fields omitted: questionId, buildNumber, pipelineName,
        // branch, commitSha, fileName, mimeType, artifactUrl, autoVerify
      });

      expect(result.status).toBe('SUCCESS');
      // Verify the create call used fallback values
      const createCall = mockPrismaService.evidenceRegistry.create.mock.calls[0][0];
      expect(createCall.data.artifactUrl).toBe('ci://github/build-456/jest');
      expect(createCall.data.fileName).toBe('jest-build-456');
      expect(createCall.data.mimeType).toBe('application/json');
      expect(createCall.data.verified).toBe(false);
    });

    it('should use provided values when optional DTO fields are present', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q-explicit',
        ciProvider: 'azure',
        buildId: 'build-789',
        buildNumber: '42',
        pipelineName: 'My Pipeline',
        artifactType: 'jest',
        content: '{}',
        fileName: 'custom-file.json',
        mimeType: 'text/plain',
        artifactUrl: 'https://custom.url/artifact',
        branch: 'develop',
        commitSha: 'abc123',
        autoVerify: true,
      });

      const createCall = mockPrismaService.evidenceRegistry.create.mock.calls[0][0];
      expect(createCall.data.questionId).toBe('q-explicit');
      expect(createCall.data.artifactUrl).toBe('https://custom.url/artifact');
      expect(createCall.data.fileName).toBe('custom-file.json');
      expect(createCall.data.mimeType).toBe('text/plain');
      expect(createCall.data.verified).toBe(true);
    });
  });

  describe('branch coverage: parseJUnit edge cases', () => {
    it('should handle content with no testcase/failure/error/skipped matches', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'junit',
        content: '<testsuite></testsuite>', // No testcase matches
      });

      expect(result.parsedData.type).toBe('junit');
      // passRate branch: tests === 0 -> passRate = 0
      expect((result.parsedData.summary as any).passRate).toBe(0);
      expect((result.parsedData.summary as any).totalTests).toBe(0);
    });

    it('should handle content with no time attribute', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'junit',
        content: '<testsuite><testcase name="t1"/></testsuite>', // no time attr
      });

      // timeMatch branch: null -> time = 0
      expect((result.parsedData.summary as any).duration).toBe(0);
    });
  });

  describe('branch coverage: parseJest edge cases', () => {
    it('should handle Jest report with zero total tests (passRate === 0)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'jest',
        content: JSON.stringify({
          numTotalTests: 0,
          numPassedTests: 0,
          numFailedTests: 0,
        }),
      });

      expect((result.parsedData.summary as any).passRate).toBe(0);
    });

    it('should handle Jest report with missing optional fields (|| 0 fallbacks)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'jest',
        content: JSON.stringify({}), // All fields missing
      });

      const summary = result.parsedData.summary as any;
      expect(summary.totalTests).toBe(0);
      expect(summary.passed).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.pending).toBe(0);
      expect(summary.duration).toBe(0);
      expect(summary.testSuites).toBe(0);
    });

    it('should handle Jest report with testResults missing duration (|| 0)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'jest',
        content: JSON.stringify({
          numTotalTests: 5,
          numPassedTests: 5,
          testResults: [{ name: 'suite1' }, { duration: 500 }], // first has no duration
        }),
      });

      expect((result.parsedData.summary as any).duration).toBe(500);
    });

    it('should handle Jest report with null testResults (|| 0 for reduce)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'jest',
        content: JSON.stringify({
          numTotalTests: 5,
          numPassedTests: 5,
          testResults: null, // null testResults
        }),
      });

      expect((result.parsedData.summary as any).duration).toBe(0);
    });
  });

  describe('branch coverage: parseLcov zero-division ternaries', () => {
    it('should return 0 percentages when totals are zero', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'lcov',
        content: 'SF:src/file.ts\nLF:0\nLH:0\nFNF:0\nFNH:0\nBRF:0\nBRH:0\nend_of_record',
      });

      const summary = result.parsedData.summary as any;
      expect(summary.lines.percentage).toBe(0);
      expect(summary.functions.percentage).toBe(0);
      expect(summary.branches.percentage).toBe(0);
      expect(summary.overallPercentage).toBe(0);
    });

    it('should handle parseInt returning NaN (|| 0 fallback)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'lcov',
        content:
          'SF:src/file.ts\nLF:abc\nLH:xyz\nFNF:def\nFNH:ghi\nBRF:jkl\nBRH:mno\nend_of_record',
      });

      const summary = result.parsedData.summary as any;
      expect(summary.lines.total).toBe(0);
      expect(summary.lines.covered).toBe(0);
    });
  });

  describe('branch coverage: parseCobertura no-match ternaries', () => {
    it('should return 0 values when no XML attributes match', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'cobertura',
        content: '<coverage></coverage>', // No attributes
      });

      const summary = result.parsedData.summary as any;
      expect(summary.lineRate).toBe(0);
      expect(summary.branchRate).toBe(0);
      expect(summary.linesValid).toBe(0);
      expect(summary.linesCovered).toBe(0);
    });
  });

  describe('branch coverage: parseCycloneDX edge cases', () => {
    it('should handle invalid JSON (catch branch)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'cyclonedx',
        content: 'not valid json',
      });

      expect(result.parsedData.error).toBe('Failed to parse CycloneDX SBOM');
    });

    it('should handle components without licenses', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'cyclonedx',
        content: JSON.stringify({
          components: [{ type: 'library', name: 'no-license-pkg' }],
        }),
      });

      expect((result.parsedData.summary as any).uniqueLicenses).toEqual([]);
    });

    it('should handle licenses with id but no name', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'cyclonedx',
        content: JSON.stringify({
          components: [
            { type: 'library', licenses: [{ license: { id: 'MIT' } }] },
            { type: 'library', licenses: [{ license: {} }] }, // no id, no name
            { type: 'library', licenses: [{}] }, // no license property
          ],
        }),
      });

      expect((result.parsedData.summary as any).uniqueLicenses).toContain('MIT');
    });
  });

  describe('branch coverage: parseSPDX edge cases', () => {
    it('should handle invalid JSON (catch branch)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'spdx',
        content: 'not valid json',
      });

      expect(result.parsedData.error).toBe('Failed to parse SPDX SBOM');
    });

    it('should handle packages without licenseConcluded or licenseDeclared', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'spdx',
        content: JSON.stringify({
          packages: [{ name: 'pkg-no-license' }], // no licenseConcluded, no licenseDeclared
        }),
      });

      expect((result.parsedData.summary as any).uniqueLicenses).toEqual([]);
    });

    it('should handle packages with only licenseDeclared (no licenseConcluded)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'spdx',
        content: JSON.stringify({
          packages: [{ licenseDeclared: 'Apache-2.0' }],
        }),
      });

      expect((result.parsedData.summary as any).uniqueLicenses).toContain('Apache-2.0');
    });
  });

  describe('branch coverage: parseTrivy edge cases', () => {
    it('should handle invalid JSON (catch branch)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'trivy',
        content: '{invalid',
      });

      expect(result.parsedData.error).toBe('Failed to parse Trivy report');
    });

    it('should handle results without Vulnerabilities array', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'trivy',
        content: JSON.stringify({ Results: [{}] }), // No Vulnerabilities
      });

      expect((result.parsedData.summary as any).totalVulnerabilities).toBe(0);
    });

    it('should handle vulnerability with null Severity (default/unknown branch)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'trivy',
        content: JSON.stringify({
          Results: [
            {
              Vulnerabilities: [
                { VulnerabilityID: 'CVE-1', Severity: null, PkgName: 'pkg' },
                { VulnerabilityID: 'CVE-2', PkgName: 'pkg2' }, // undefined Severity
              ],
            },
          ],
        }),
      });

      expect((result.parsedData.summary as any).bySeverity.unknown).toBe(2);
    });

    it('should handle MEDIUM and LOW severity branches', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'trivy',
        content: JSON.stringify({
          Results: [
            {
              Vulnerabilities: [
                { VulnerabilityID: 'CVE-1', Severity: 'MEDIUM', PkgName: 'pkg1' },
                { VulnerabilityID: 'CVE-2', Severity: 'LOW', PkgName: 'pkg2' },
              ],
            },
          ],
        }),
      });

      const summary = result.parsedData.summary as any;
      expect(summary.bySeverity.medium).toBe(1);
      expect(summary.bySeverity.low).toBe(1);
      // MEDIUM and LOW should NOT be in criticalAndHigh
      expect(summary.criticalAndHigh).toHaveLength(0);
    });
  });

  describe('branch coverage: parseOWASP edge cases', () => {
    it('should handle invalid JSON (catch branch)', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'owasp',
        content: 'invalid json',
      });

      expect(result.parsedData.error).toBe('Failed to parse OWASP report');
    });

    it('should use cvssv3.baseSeverity as fallback when severity is missing', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'owasp',
        content: JSON.stringify({
          dependencies: [
            {
              fileName: 'lib.jar',
              vulnerabilities: [
                { name: 'CVE-1', cvssv3: { baseSeverity: 'MEDIUM' } }, // No severity, use cvssv3 fallback
              ],
            },
          ],
        }),
      });

      expect((result.parsedData.summary as any).bySeverity.medium).toBe(1);
    });

    it('should fall back to UNKNOWN when neither severity nor cvssv3 is present', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'owasp',
        content: JSON.stringify({
          dependencies: [
            {
              fileName: 'lib.jar',
              vulnerabilities: [
                { name: 'CVE-1' }, // No severity, no cvssv3
              ],
            },
          ],
        }),
      });

      // UNKNOWN doesn't match any switch case, so none of the counters increment
      const summary = result.parsedData.summary as any;
      expect(summary.bySeverity.critical).toBe(0);
      expect(summary.bySeverity.high).toBe(0);
      expect(summary.bySeverity.medium).toBe(0);
      expect(summary.bySeverity.low).toBe(0);
    });

    it('should handle dependencies without vulnerabilities array', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      mockPrismaService.evidenceRegistry.create.mockResolvedValue(mockEvidence as any);

      const result = await service.ingestArtifact({
        sessionId: 'session-123',
        questionId: 'q1',
        ciProvider: 'github',
        buildId: 'build-1',
        artifactType: 'owasp',
        content: JSON.stringify({
          dependencies: [{ fileName: 'lib.jar' }], // no vulnerabilities
        }),
      });

      expect((result.parsedData.summary as any).totalVulnerabilities).toBe(0);
    });
  });

  describe('branch coverage: getSessionArtifacts edge cases', () => {
    it('should filter out evidence with null metadata', async () => {
      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          artifactType: 'DOCUMENT',
          verified: false,
          metadata: null,
          createdAt: new Date(),
        },
      ] as any);

      const result = await service.getSessionArtifacts('session-123');
      expect(result).toHaveLength(0);
    });

    it('should filter out metadata without ciProvider', async () => {
      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          artifactType: 'TEST_REPORT',
          verified: false,
          metadata: { buildId: 'build-1' }, // missing ciProvider
          createdAt: new Date(),
        },
      ] as any);

      const result = await service.getSessionArtifacts('session-123');
      expect(result).toHaveLength(0);
    });

    it('should filter out metadata without buildId', async () => {
      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          artifactType: 'TEST_REPORT',
          verified: false,
          metadata: { ciProvider: 'github' }, // missing buildId
          createdAt: new Date(),
        },
      ] as any);

      const result = await service.getSessionArtifacts('session-123');
      expect(result).toHaveLength(0);
    });

    it('should use fallback values for optional metadata fields', async () => {
      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          artifactType: 'TEST_REPORT',
          verified: false,
          fileName: null,
          metadata: {
            ciProvider: 'github',
            buildId: 'build-1',
            // All optional fields missing: buildNumber, pipelineName, artifactType, branch, commitSha, status
          },
          createdAt: new Date(),
        },
      ] as any);

      const result = await service.getSessionArtifacts('session-123');
      expect(result).toHaveLength(1);
      expect(result[0].buildNumber).toBeNull();
      expect(result[0].pipelineName).toBeNull();
      expect(result[0].artifactType).toBe('TEST_REPORT'); // Falls back to evidence.artifactType
      expect(result[0].branch).toBeNull();
      expect(result[0].commitSha).toBeNull();
      expect(result[0].status).toBe('INGESTED');
      expect(result[0].fileName).toBeNull();
    });
  });

  describe('branch coverage: getBuildSummary edge cases', () => {
    it('should handle artifact without parsedData.summary', async () => {
      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          artifactType: 'TEST_REPORT',
          verified: false,
          createdAt: new Date(),
          metadata: {
            ciProvider: 'github',
            buildId: 'build-1',
            buildNumber: null,
            pipelineName: null,
            branch: null,
            commitSha: null,
            // no parsedData
          },
        },
      ] as any);

      const result = await service.getBuildSummary('session-123', 'build-1');
      expect(result.metrics).toEqual({});
      expect(result.buildNumber).toBeNull();
      expect(result.pipelineName).toBeNull();
      expect(result.branch).toBeNull();
      expect(result.commitSha).toBeNull();
    });

    it('should use artifact.artifactType when meta.artifactType is missing', async () => {
      mockPrismaService.evidenceRegistry.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          artifactType: 'SECURITY_SCAN',
          verified: false,
          createdAt: new Date(),
          metadata: {
            ciProvider: 'github',
            buildId: 'build-1',
            // no artifactType in metadata
            parsedData: { summary: { totalVulns: 5 } },
          },
        },
      ] as any);

      const result = await service.getBuildSummary('session-123', 'build-1');
      expect(result.metrics).toHaveProperty('SECURITY_SCAN');
      expect(result.artifactTypes).toContain('SECURITY_SCAN');
    });
  });

  describe('branch coverage: bulkIngestArtifacts non-Error thrown', () => {
    it('should handle non-Error thrown objects in catch block', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession as any);
      // First call succeeds, second throws a non-Error
      mockPrismaService.evidenceRegistry.create
        .mockResolvedValueOnce(mockEvidence as any)
        .mockImplementationOnce(() => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'string error';
        });

      const result = await service.bulkIngestArtifacts({
        sessionId: 'session-123',
        ciProvider: 'github',
        buildId: 'build-456',
        artifacts: [
          { artifactType: 'jest', content: '{}', questionId: 'q1' },
          { artifactType: 'jest', content: '{}', questionId: 'q2' },
        ],
      });

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toBe('Unknown error');
    });
  });
});
