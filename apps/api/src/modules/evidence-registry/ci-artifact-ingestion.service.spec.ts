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

      await expect(
        service.ingestArtifact({ ...baseDto, artifactType: 'unknown' }),
      ).rejects.toThrow(BadRequestException);
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

      await expect(
        service.ingestArtifact({ ...baseDto, questionId: undefined }),
      ).rejects.toThrow(BadRequestException);
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
          { artifactType: 'jest', content: JSON.stringify({ numTotalTests: 10 }), questionId: 'q1' },
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
});
