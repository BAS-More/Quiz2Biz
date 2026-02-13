import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/database';
import { EvidenceType, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

/** CI Artifact metadata stored in EvidenceRegistry.metadata JSON field */
interface CIMetadata {
  ciProvider: string;
  buildId: string;
  buildNumber?: string;
  pipelineName?: string;
  branch?: string;
  commitSha?: string;
  artifactType?: string;
  parsedData?: ParsedArtifactData;
  status?: string;
  ingestedAt?: string;
}

/**
 * CI Artifact Ingestion Service
 *
 * Automatically ingests evidence from CI/CD pipelines:
 * - Test reports (JUnit XML, Jest JSON)
 * - Code coverage reports (lcov, cobertura)
 * - SBOM files (CycloneDX, SPDX)
 * - Security scan results (Trivy, OWASP)
 * - Build artifacts and logs
 *
 * Supports multiple CI providers:
 * - Azure DevOps
 * - GitHub Actions
 * - GitLab CI
 */
@Injectable()
export class CIArtifactIngestionService {
  private readonly logger = new Logger(CIArtifactIngestionService.name);

  /** Supported artifact types and their evidence mappings */
  private readonly ARTIFACT_MAPPINGS: Record<string, CIArtifactMapping> = {
    // Test Reports
    junit: {
      evidenceType: 'TEST_REPORT',
      patterns: ['**/junit*.xml', '**/test-results*.xml', '**/TEST-*.xml'],
      parser: 'junit',
    },
    jest: {
      evidenceType: 'TEST_REPORT',
      patterns: ['**/jest-results.json', '**/test-results.json'],
      parser: 'jest',
    },
    // Coverage Reports
    lcov: {
      evidenceType: 'CODE_COVERAGE',
      patterns: ['**/lcov.info', '**/coverage/lcov.info'],
      parser: 'lcov',
    },
    cobertura: {
      evidenceType: 'CODE_COVERAGE',
      patterns: ['**/cobertura.xml', '**/coverage.xml'],
      parser: 'cobertura',
    },
    // SBOM
    cyclonedx: {
      evidenceType: 'SBOM',
      patterns: ['**/sbom.json', '**/bom.json', '**/cyclonedx.json'],
      parser: 'cyclonedx',
    },
    spdx: {
      evidenceType: 'SBOM',
      patterns: ['**/spdx.json', '**/spdx.spdx'],
      parser: 'spdx',
    },
    // Security Scans
    trivy: {
      evidenceType: 'SECURITY_SCAN',
      patterns: ['**/trivy-results.json', '**/trivy-report.json'],
      parser: 'trivy',
    },
    owasp: {
      evidenceType: 'SECURITY_SCAN',
      patterns: ['**/dependency-check-report.json', '**/owasp-report.json'],
      parser: 'owasp',
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Ingest a CI artifact as evidence
   *
   * @param dto - Artifact ingestion details
   */
  async ingestArtifact(dto: IngestArtifactDto): Promise<CIArtifactResult> {
    // Validate session exists
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${dto.sessionId}`);
    }

    // Determine artifact type
    const mapping = this.ARTIFACT_MAPPINGS[dto.artifactType];
    if (!mapping) {
      throw new BadRequestException(`Unknown artifact type: ${dto.artifactType}`);
    }

    // Parse artifact content
    const parsedData = await this.parseArtifact(dto.artifactType, dto.content);

    // Compute hash
    const hashSignature = crypto.createHash('sha256').update(dto.content).digest('hex');

    // Create evidence record with CI metadata embedded
    const ciMetadata = {
      ciProvider: dto.ciProvider,
      buildId: dto.buildId,
      buildNumber: dto.buildNumber,
      pipelineName: dto.pipelineName,
      branch: dto.branch,
      commitSha: dto.commitSha,
      artifactType: dto.artifactType,
      parsedData: parsedData as unknown as Prisma.JsonValue,
      status: 'INGESTED',
      ingestedAt: new Date().toISOString(),
    };

    const evidence = await this.prisma.evidenceRegistry.create({
      data: {
        sessionId: dto.sessionId,
        questionId:
          dto.questionId || (await this.findMatchingQuestion(dto.sessionId, mapping.evidenceType)),
        artifactUrl: dto.artifactUrl || `ci://${dto.ciProvider}/${dto.buildId}/${dto.artifactType}`,
        artifactType: mapping.evidenceType as EvidenceType,
        fileName: dto.fileName || `${dto.artifactType}-${dto.buildId}`,
        fileSize: BigInt(dto.content.length),
        mimeType: dto.mimeType || 'application/json',
        hashSignature,
        verified: dto.autoVerify || false,
        metadata: ciMetadata as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `CI artifact ingested: ${dto.artifactType} from ${dto.ciProvider} build ${dto.buildId}`,
    );

    return {
      evidenceId: evidence.id,
      ciArtifactId: evidence.id, // Use evidence ID as artifact ID (metadata-embedded)
      artifactType: dto.artifactType,
      evidenceType: mapping.evidenceType,
      parsedData,
      hashSignature,
      status: 'SUCCESS',
    };
  }

  /**
   * Bulk ingest multiple artifacts from a CI build
   */
  async bulkIngestArtifacts(dto: BulkIngestDto): Promise<BulkIngestResult> {
    const results: CIArtifactResult[] = [];
    const errors: Array<{ artifactType: string; error: string }> = [];

    for (const artifact of dto.artifacts) {
      try {
        const result = await this.ingestArtifact({
          ...artifact,
          sessionId: dto.sessionId,
          ciProvider: dto.ciProvider,
          buildId: dto.buildId,
          buildNumber: dto.buildNumber,
          pipelineName: dto.pipelineName,
          branch: dto.branch,
          commitSha: dto.commitSha,
        });
        results.push(result);
      } catch (error) {
        errors.push({
          artifactType: artifact.artifactType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      totalArtifacts: dto.artifacts.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors,
    };
  }

  /**
   * Parse artifact content based on type
   */
  private async parseArtifact(artifactType: string, content: string): Promise<ParsedArtifactData> {
    const mapping = this.ARTIFACT_MAPPINGS[artifactType];

    switch (mapping.parser) {
      case 'junit':
        return this.parseJUnit(content);
      case 'jest':
        return this.parseJest(content);
      case 'lcov':
        return this.parseLcov(content);
      case 'cobertura':
        return this.parseCobertura(content);
      case 'cyclonedx':
        return this.parseCycloneDX(content);
      case 'spdx':
        return this.parseSPDX(content);
      case 'trivy':
        return this.parseTrivy(content);
      case 'owasp':
        return this.parseOWASP(content);
      default:
        return { raw: true, contentLength: content.length };
    }
  }

  /**
   * Parse JUnit XML test report
   */
  private parseJUnit(content: string): ParsedArtifactData {
    // Simple XML parsing - in production use proper XML parser
    const tests = (content.match(/<testcase/g) || []).length;
    const failures = (content.match(/failure>/g) || []).length;
    const errors = (content.match(/error>/g) || []).length;
    const skipped = (content.match(/skipped/g) || []).length;

    const timeMatch = content.match(/time="([^"]+)"/);
    const time = timeMatch ? parseFloat(timeMatch[1]) : 0;

    return {
      type: 'junit',
      summary: {
        totalTests: tests,
        passed: tests - failures - errors - skipped,
        failed: failures,
        errors,
        skipped,
        duration: time,
        passRate: tests > 0 ? ((tests - failures - errors) / tests) * 100 : 0,
      },
    };
  }

  /**
   * Parse Jest JSON test report
   */
  private parseJest(content: string): ParsedArtifactData {
    try {
      const report = JSON.parse(content);
      return {
        type: 'jest',
        summary: {
          totalTests: report.numTotalTests || 0,
          passed: report.numPassedTests || 0,
          failed: report.numFailedTests || 0,
          pending: report.numPendingTests || 0,
          duration:
            report.testResults?.reduce(
              (sum: number, r: { duration?: number }) => sum + (r.duration || 0),
              0,
            ) || 0,
          passRate:
            report.numTotalTests > 0 ? (report.numPassedTests / report.numTotalTests) * 100 : 0,
          testSuites: report.numTotalTestSuites || 0,
        },
      };
    } catch {
      return { type: 'jest', error: 'Failed to parse Jest report' };
    }
  }

  /**
   * Parse lcov coverage report
   */
  private parseLcov(content: string): ParsedArtifactData {
    const lines = content.split('\n');
    let totalLines = 0;
    let coveredLines = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const line of lines) {
      if (line.startsWith('LF:')) {
        totalLines += parseInt(line.substring(3)) || 0;
      }
      if (line.startsWith('LH:')) {
        coveredLines += parseInt(line.substring(3)) || 0;
      }
      if (line.startsWith('FNF:')) {
        totalFunctions += parseInt(line.substring(4)) || 0;
      }
      if (line.startsWith('FNH:')) {
        coveredFunctions += parseInt(line.substring(4)) || 0;
      }
      if (line.startsWith('BRF:')) {
        totalBranches += parseInt(line.substring(4)) || 0;
      }
      if (line.startsWith('BRH:')) {
        coveredBranches += parseInt(line.substring(4)) || 0;
      }
    }

    return {
      type: 'lcov',
      summary: {
        lines: {
          total: totalLines,
          covered: coveredLines,
          percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
        },
        functions: {
          total: totalFunctions,
          covered: coveredFunctions,
          percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
        },
        branches: {
          total: totalBranches,
          covered: coveredBranches,
          percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
        },
        overallPercentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      },
    };
  }

  /**
   * Parse Cobertura XML coverage report
   */
  private parseCobertura(content: string): ParsedArtifactData {
    // Extract coverage attributes from XML
    const lineRateMatch = content.match(/line-rate="([^"]+)"/);
    const branchRateMatch = content.match(/branch-rate="([^"]+)"/);
    const linesValidMatch = content.match(/lines-valid="([^"]+)"/);
    const linesCoveredMatch = content.match(/lines-covered="([^"]+)"/);

    return {
      type: 'cobertura',
      summary: {
        lineRate: lineRateMatch ? parseFloat(lineRateMatch[1]) * 100 : 0,
        branchRate: branchRateMatch ? parseFloat(branchRateMatch[1]) * 100 : 0,
        linesValid: linesValidMatch ? parseInt(linesValidMatch[1]) : 0,
        linesCovered: linesCoveredMatch ? parseInt(linesCoveredMatch[1]) : 0,
        overallPercentage: lineRateMatch ? parseFloat(lineRateMatch[1]) * 100 : 0,
      },
    };
  }

  /**
   * Parse CycloneDX SBOM
   */
  private parseCycloneDX(content: string): ParsedArtifactData {
    try {
      const sbom = JSON.parse(content);
      const components = sbom.components || [];

      const byType: Record<string, number> = {};
      const licenses: Set<string> = new Set();

      for (const comp of components) {
        byType[comp.type] = (byType[comp.type] || 0) + 1;
        if (comp.licenses) {
          for (const lic of comp.licenses) {
            if (lic.license?.id) {
              licenses.add(lic.license.id);
            }
            if (lic.license?.name) {
              licenses.add(lic.license.name);
            }
          }
        }
      }

      return {
        type: 'cyclonedx',
        summary: {
          specVersion: sbom.specVersion || 'unknown',
          format: 'CycloneDX',
          totalComponents: components.length,
          componentsByType: byType,
          uniqueLicenses: Array.from(licenses),
          serialNumber: sbom.serialNumber,
        },
      };
    } catch {
      return { type: 'cyclonedx', error: 'Failed to parse CycloneDX SBOM' };
    }
  }

  /**
   * Parse SPDX SBOM
   */
  private parseSPDX(content: string): ParsedArtifactData {
    try {
      const sbom = JSON.parse(content);
      const packages = sbom.packages || [];

      const licenses: Set<string> = new Set();
      for (const pkg of packages) {
        if (pkg.licenseConcluded) {
          licenses.add(pkg.licenseConcluded);
        }
        if (pkg.licenseDeclared) {
          licenses.add(pkg.licenseDeclared);
        }
      }

      return {
        type: 'spdx',
        summary: {
          spdxVersion: sbom.spdxVersion || 'unknown',
          format: 'SPDX',
          totalPackages: packages.length,
          creationInfo: sbom.creationInfo,
          uniqueLicenses: Array.from(licenses),
          documentName: sbom.name,
        },
      };
    } catch {
      return { type: 'spdx', error: 'Failed to parse SPDX SBOM' };
    }
  }

  /**
   * Parse Trivy security scan results
   */
  private parseTrivy(content: string): ParsedArtifactData {
    try {
      const report = JSON.parse(content);
      const results = report.Results || [];

      let critical = 0,
        high = 0,
        medium = 0,
        low = 0,
        unknown = 0;
      const vulnerabilities: Array<{ id: string; severity: string; package: string }> = [];

      for (const result of results) {
        for (const vuln of result.Vulnerabilities || []) {
          switch (vuln.Severity?.toUpperCase()) {
            case 'CRITICAL':
              critical++;
              break;
            case 'HIGH':
              high++;
              break;
            case 'MEDIUM':
              medium++;
              break;
            case 'LOW':
              low++;
              break;
            default:
              unknown++;
          }

          if (vuln.Severity === 'CRITICAL' || vuln.Severity === 'HIGH') {
            vulnerabilities.push({
              id: vuln.VulnerabilityID,
              severity: vuln.Severity,
              package: vuln.PkgName,
            });
          }
        }
      }

      return {
        type: 'trivy',
        summary: {
          scanner: 'Trivy',
          totalVulnerabilities: critical + high + medium + low + unknown,
          bySeverity: { critical, high, medium, low, unknown },
          criticalAndHigh: vulnerabilities.slice(0, 20), // Top 20
          scanTarget: report.ArtifactName,
        },
      };
    } catch {
      return { type: 'trivy', error: 'Failed to parse Trivy report' };
    }
  }

  /**
   * Parse OWASP Dependency-Check results
   */
  private parseOWASP(content: string): ParsedArtifactData {
    try {
      const report = JSON.parse(content);
      const dependencies = report.dependencies || [];

      let critical = 0,
        high = 0,
        medium = 0,
        low = 0;
      const vulnerabilities: Array<{ cve: string; severity: string; package: string }> = [];

      for (const dep of dependencies) {
        for (const vuln of dep.vulnerabilities || []) {
          const severity = vuln.severity || vuln.cvssv3?.baseSeverity || 'UNKNOWN';
          switch (severity.toUpperCase()) {
            case 'CRITICAL':
              critical++;
              break;
            case 'HIGH':
              high++;
              break;
            case 'MEDIUM':
              medium++;
              break;
            case 'LOW':
              low++;
              break;
          }

          if (severity === 'CRITICAL' || severity === 'HIGH') {
            vulnerabilities.push({
              cve: vuln.name,
              severity,
              package: dep.fileName,
            });
          }
        }
      }

      return {
        type: 'owasp',
        summary: {
          scanner: 'OWASP Dependency-Check',
          totalDependencies: dependencies.length,
          totalVulnerabilities: critical + high + medium + low,
          bySeverity: { critical, high, medium, low },
          criticalAndHigh: vulnerabilities.slice(0, 20),
          scanDate: report.projectInfo?.reportDate,
        },
      };
    } catch {
      return { type: 'owasp', error: 'Failed to parse OWASP report' };
    }
  }

  /**
   * Find a matching question for the evidence type
   * Used when questionId is not explicitly provided
   */
  private async findMatchingQuestion(sessionId: string, evidenceType: string): Promise<string> {
    // Map evidence types to question dimensions/tags
    const typeToTags: Record<string, string[]> = {
      TEST_REPORT: ['testing', 'quality', 'qa', 'sdlc'],
      CODE_COVERAGE: ['testing', 'coverage', 'quality'],
      SBOM: ['security', 'supply-chain', 'dependencies'],
      SECURITY_SCAN: ['security', 'vulnerabilities', 'devsecops'],
    };

    const tags = typeToTags[evidenceType] || [];

    // Find a question that matches the tags
    const question = await this.prisma.question.findFirst({
      where: {
        OR: tags.map((tag) => ({
          text: { contains: tag, mode: 'insensitive' as const },
        })),
      },
    });

    if (question) {
      return question.id;
    }

    // Fallback: return first unanswered question in session
    const response = await this.prisma.response.findFirst({
      where: { sessionId, coverage: 0 },
      select: { questionId: true },
    });

    if (response) {
      return response.questionId;
    }

    throw new BadRequestException(
      'Could not find matching question for CI artifact. Please provide questionId explicitly.',
    );
  }

  /**
   * Get CI artifacts for a session
   */
  async getSessionArtifacts(sessionId: string): Promise<CIArtifactSummary[]> {
    // Query evidence records and filter for CI artifacts in application code
    const evidenceItems = await this.prisma.evidenceRegistry.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    // Filter and map evidence items that have CI artifact metadata
    // Type assertion needed since Prisma doesn't type the JSON metadata field
    type EvidenceWithMeta = (typeof evidenceItems)[0] & { metadata?: CIMetadata | null };

    return (evidenceItems as EvidenceWithMeta[])
      .filter((e) => {
        const meta = e.metadata as CIMetadata | null;
        return meta?.ciProvider && meta?.buildId;
      })
      .map((e) => {
        const meta = e.metadata as CIMetadata;
        return {
          id: e.id,
          evidenceId: e.id,
          ciProvider: meta.ciProvider,
          buildId: meta.buildId,
          buildNumber: meta.buildNumber || null,
          pipelineName: meta.pipelineName || null,
          artifactType: meta.artifactType || e.artifactType,
          branch: meta.branch || null,
          commitSha: meta.commitSha || null,
          status: meta.status || 'INGESTED',
          verified: e.verified,
          fileName: e.fileName || null,
          createdAt: e.createdAt,
        };
      });
  }

  /**
   * Get CI build summary for a session
   */
  async getBuildSummary(sessionId: string, buildId: string): Promise<BuildSummary> {
    // Query evidence records and filter by buildId in metadata
    const evidenceItems = await this.prisma.evidenceRegistry.findMany({
      where: { sessionId },
    });

    // Type assertion for metadata access
    type EvidenceWithMeta = (typeof evidenceItems)[0] & { metadata?: CIMetadata | null };

    // Filter to artifacts matching the build
    const artifacts = (evidenceItems as EvidenceWithMeta[]).filter((e) => {
      const meta = e.metadata as CIMetadata | null;
      return meta?.buildId === buildId;
    });

    if (artifacts.length === 0) {
      throw new NotFoundException(`No artifacts found for build: ${buildId}`);
    }

    const firstMeta = artifacts[0].metadata as CIMetadata;

    // Aggregate metrics from parsed data
    const metrics: Record<string, unknown> = {};

    for (const artifact of artifacts) {
      const meta = artifact.metadata as CIMetadata;
      if (meta?.parsedData?.summary) {
        const artifactType = meta.artifactType || artifact.artifactType;
        metrics[artifactType] = meta.parsedData.summary;
      }
    }

    return {
      buildId: firstMeta.buildId,
      buildNumber: firstMeta.buildNumber || null,
      pipelineName: firstMeta.pipelineName || null,
      branch: firstMeta.branch || null,
      commitSha: firstMeta.commitSha || null,
      ciProvider: firstMeta.ciProvider,
      totalArtifacts: artifacts.length,
      verifiedArtifacts: artifacts.filter((a) => a.verified).length,
      artifactTypes: [
        ...new Set(
          artifacts.map((a) => {
            const meta = a.metadata as CIMetadata;
            return meta?.artifactType || a.artifactType;
          }),
        ),
      ],
      metrics,
      createdAt: artifacts[0].createdAt,
    };
  }
}

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface CIArtifactMapping {
  evidenceType: string;
  patterns: string[];
  parser: string;
}

export interface IngestArtifactDto {
  sessionId: string;
  questionId?: string;
  ciProvider: string;
  buildId: string;
  buildNumber?: string;
  pipelineName?: string;
  artifactType: string;
  content: string;
  fileName?: string;
  mimeType?: string;
  artifactUrl?: string;
  branch?: string;
  commitSha?: string;
  autoVerify?: boolean;
}

export interface BulkIngestDto {
  sessionId: string;
  ciProvider: string;
  buildId: string;
  buildNumber?: string;
  pipelineName?: string;
  branch?: string;
  commitSha?: string;
  artifacts: Array<{
    artifactType: string;
    content: string;
    fileName?: string;
    mimeType?: string;
    questionId?: string;
  }>;
}

export interface CIArtifactResult {
  evidenceId: string;
  ciArtifactId: string;
  artifactType: string;
  evidenceType: string;
  parsedData: ParsedArtifactData;
  hashSignature: string;
  status: 'SUCCESS' | 'ERROR';
}

export interface BulkIngestResult {
  totalArtifacts: number;
  successCount: number;
  errorCount: number;
  results: CIArtifactResult[];
  errors: Array<{ artifactType: string; error: string }>;
}

export interface ParsedArtifactData {
  type?: string;
  summary?: Record<string, unknown>;
  error?: string;
  raw?: boolean;
  contentLength?: number;
}

export interface CIArtifactSummary {
  id: string;
  evidenceId: string;
  ciProvider: string;
  buildId: string;
  buildNumber: string | null;
  pipelineName: string | null;
  artifactType: string;
  branch: string | null;
  commitSha: string | null;
  status: string;
  verified: boolean;
  fileName: string | null;
  createdAt: Date;
}

export interface BuildSummary {
  buildId: string;
  buildNumber: string | null;
  pipelineName: string | null;
  branch: string | null;
  commitSha: string | null;
  ciProvider: string;
  totalArtifacts: number;
  verifiedArtifacts: number;
  artifactTypes: string[];
  metrics: Record<string, unknown>;
  createdAt: Date;
}
