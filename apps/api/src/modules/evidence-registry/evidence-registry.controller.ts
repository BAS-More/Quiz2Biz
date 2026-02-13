import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EvidenceRegistryService } from './evidence-registry.service';
import { EvidenceIntegrityService } from './evidence-integrity.service';
import {
  CIArtifactIngestionService,
  IngestArtifactDto,
  BulkIngestDto,
} from './ci-artifact-ingestion.service';
import { UploadEvidenceDto, VerifyEvidenceDto, EvidenceItemResponse, ListEvidenceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** File upload type for multer */
interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Evidence Registry Controller
 *
 * Provides endpoints for Quiz2Biz evidence management:
 * - Upload evidence files with SHA-256 hashing
 * - Verify evidence with coverage updates
 * - List and filter evidence items
 * - Evidence chain integrity verification (Sprint 14)
 * - CI artifact ingestion (Sprint 14)
 */
@ApiTags('Evidence Registry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evidence')
export class EvidenceRegistryController {
  constructor(
    private readonly evidenceService: EvidenceRegistryService,
    private readonly integrityService: EvidenceIntegrityService,
    private readonly ciIngestionService: CIArtifactIngestionService,
  ) {}

  /**
   * Upload evidence file
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload evidence file',
    description: `
Upload a file as evidence for a question response. 
The file will be stored in Azure Blob Storage with a SHA-256 hash computed for integrity verification.

**Allowed file types:** PDF, Word, Excel, images, JSON, CSV, XML, SBOM formats
**Maximum file size:** 50MB
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Evidence file to upload',
        },
        sessionId: {
          type: 'string',
          format: 'uuid',
          description: 'Session ID',
        },
        questionId: {
          type: 'string',
          format: 'uuid',
          description: 'Question ID',
        },
        artifactType: {
          type: 'string',
          enum: [
            'FILE',
            'IMAGE',
            'LINK',
            'LOG',
            'SBOM',
            'REPORT',
            'TEST_RESULT',
            'SCREENSHOT',
            'DOCUMENT',
          ],
          description: 'Type of evidence',
        },
        fileName: {
          type: 'string',
          description: 'Optional custom file name',
        },
      },
      required: ['file', 'sessionId', 'questionId', 'artifactType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Evidence uploaded successfully',
    type: EvidenceItemResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type, size, or missing required fields',
  })
  async uploadEvidence(
    @UploadedFile() file: UploadedFileType,
    @Body() dto: UploadEvidenceDto,
    @Request() req: { user: { userId: string } },
  ): Promise<EvidenceItemResponse> {
    return this.evidenceService.uploadEvidence(file, dto, req.user.userId);
  }

  /**
   * Verify evidence
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify evidence',
    description: `
Mark evidence as verified or unverified. 
Optionally update the coverage value on the associated response.

Only users with Verifier role should be allowed to verify evidence.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Evidence verification status updated',
    type: EvidenceItemResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Evidence not found',
  })
  async verifyEvidence(
    @Body() dto: VerifyEvidenceDto,
    @Request() req: { user: { userId: string } },
  ): Promise<EvidenceItemResponse> {
    return this.evidenceService.verifyEvidence(dto, req.user.userId);
  }

  /**
   * Get evidence by ID
   */
  @Get(':evidenceId')
  @ApiOperation({
    summary: 'Get evidence by ID',
    description: 'Retrieve a single evidence item by its ID.',
  })
  @ApiParam({
    name: 'evidenceId',
    description: 'Evidence UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Evidence item',
    type: EvidenceItemResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Evidence not found',
  })
  async getEvidence(@Param('evidenceId') evidenceId: string): Promise<EvidenceItemResponse> {
    return this.evidenceService.getEvidence(evidenceId);
  }

  /**
   * List evidence with filters
   */
  @Get()
  @ApiOperation({
    summary: 'List evidence',
    description:
      'List evidence items with optional filters for session, question, type, and verification status.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of evidence items',
    type: [EvidenceItemResponse],
  })
  async listEvidence(@Query() filters: ListEvidenceDto): Promise<EvidenceItemResponse[]> {
    return this.evidenceService.listEvidence(filters);
  }

  /**
   * Get evidence statistics for a session
   */
  @Get('stats/:sessionId')
  @ApiOperation({
    summary: 'Get evidence statistics',
    description: 'Get aggregated statistics about evidence for a session.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Evidence statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        verified: { type: 'number' },
        pending: { type: 'number' },
        byType: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  async getEvidenceStats(@Param('sessionId') sessionId: string) {
    return this.evidenceService.getEvidenceStats(sessionId);
  }

  /**
   * Delete evidence
   */
  @Delete(':evidenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete evidence',
    description: 'Delete an unverified evidence item. Verified evidence cannot be deleted.',
  })
  @ApiParam({
    name: 'evidenceId',
    description: 'Evidence UUID',
  })
  @ApiResponse({
    status: 204,
    description: 'Evidence deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete verified evidence',
  })
  @ApiResponse({
    status: 404,
    description: 'Evidence not found',
  })
  async deleteEvidence(
    @Param('evidenceId') evidenceId: string,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    await this.evidenceService.deleteEvidence(evidenceId, req.user.userId);
  }

  // ================================================================
  // EVIDENCE CHAIN INTEGRITY ENDPOINTS (Sprint 14)
  // ================================================================

  /**
   * Chain evidence to the integrity chain
   */
  @Post(':evidenceId/chain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add evidence to integrity chain',
    description: `
Link evidence to the hash chain for cryptographic integrity verification.
Each evidence is linked to the previous entry via SHA-256 hash chain.
Optionally requests a timestamp token from RFC 3161 TSA.
        `,
  })
  @ApiParam({ name: 'evidenceId', description: 'Evidence UUID' })
  @ApiResponse({ status: 200, description: 'Evidence added to chain' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  async chainEvidence(
    @Param('evidenceId') evidenceId: string,
    @Body() body: { sessionId: string },
  ) {
    return this.integrityService.chainEvidence(evidenceId, body.sessionId);
  }

  /**
   * Get evidence chain for a session
   */
  @Get('chain/:sessionId')
  @ApiOperation({
    summary: 'Get evidence chain',
    description: 'Get the full hash chain for all evidence in a session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Evidence chain entries' })
  async getEvidenceChain(@Param('sessionId') sessionId: string) {
    return this.integrityService.getEvidenceChain(sessionId);
  }

  /**
   * Verify evidence chain integrity
   */
  @Get('chain/:sessionId/verify')
  @ApiOperation({
    summary: 'Verify evidence chain integrity',
    description: `
Verify the integrity of the entire evidence chain for a session.
Checks: hash chain links, computed hashes match stored hashes, evidence not modified.
        `,
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Chain verification result' })
  async verifyChain(@Param('sessionId') sessionId: string) {
    return this.integrityService.verifyChain(sessionId);
  }

  /**
   * Verify single evidence integrity
   */
  @Get(':evidenceId/integrity')
  @ApiOperation({
    summary: 'Verify evidence integrity',
    description: 'Comprehensive integrity check: hash, chain position, timestamp status.',
  })
  @ApiParam({ name: 'evidenceId', description: 'Evidence UUID' })
  @ApiResponse({ status: 200, description: 'Integrity verification result' })
  @ApiResponse({ status: 404, description: 'Evidence not found' })
  async verifyEvidenceIntegrity(@Param('evidenceId') evidenceId: string) {
    return this.integrityService.verifyEvidenceIntegrity(evidenceId);
  }

  /**
   * Generate integrity report for a session
   */
  @Get('integrity-report/:sessionId')
  @ApiOperation({
    summary: 'Generate integrity report',
    description: 'Generate a comprehensive integrity report for all evidence in a session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session integrity report' })
  async generateIntegrityReport(@Param('sessionId') sessionId: string) {
    return this.integrityService.generateIntegrityReport(sessionId);
  }

  // ================================================================
  // CI ARTIFACT INGESTION ENDPOINTS (Sprint 14)
  // ================================================================

  /**
   * Ingest CI artifact as evidence
   */
  @Post('ci/ingest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingest CI artifact',
    description: `
Automatically ingest CI/CD artifacts as evidence.
Supports: JUnit XML, Jest JSON, lcov, Cobertura, CycloneDX SBOM, SPDX, Trivy, OWASP DC.
Parses artifacts and extracts relevant metrics.
        `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        questionId: {
          type: 'string',
          format: 'uuid',
          description: 'Optional - auto-detected if not provided',
        },
        ciProvider: { type: 'string', enum: ['azure-devops', 'github-actions', 'gitlab-ci'] },
        buildId: { type: 'string' },
        buildNumber: { type: 'string' },
        pipelineName: { type: 'string' },
        artifactType: {
          type: 'string',
          enum: ['junit', 'jest', 'lcov', 'cobertura', 'cyclonedx', 'spdx', 'trivy', 'owasp'],
        },
        content: { type: 'string', description: 'Artifact content (XML/JSON)' },
        branch: { type: 'string' },
        commitSha: { type: 'string' },
        autoVerify: { type: 'boolean', default: false },
      },
      required: ['sessionId', 'ciProvider', 'buildId', 'artifactType', 'content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Artifact ingested successfully' })
  @ApiResponse({ status: 400, description: 'Invalid artifact format or type' })
  async ingestCIArtifact(@Body() dto: IngestArtifactDto) {
    return this.ciIngestionService.ingestArtifact(dto);
  }

  /**
   * Bulk ingest CI artifacts
   */
  @Post('ci/bulk-ingest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk ingest CI artifacts',
    description: 'Ingest multiple CI artifacts from a single build in one request.',
  })
  @ApiResponse({ status: 201, description: 'Bulk ingestion result' })
  async bulkIngestCIArtifacts(@Body() dto: BulkIngestDto) {
    return this.ciIngestionService.bulkIngestArtifacts(dto);
  }

  /**
   * Get CI artifacts for a session
   */
  @Get('ci/session/:sessionId')
  @ApiOperation({
    summary: 'Get session CI artifacts',
    description: 'Get all CI artifacts ingested for a session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'List of CI artifacts' })
  async getSessionCIArtifacts(@Param('sessionId') sessionId: string) {
    return this.ciIngestionService.getSessionArtifacts(sessionId);
  }

  /**
   * Get CI build summary
   */
  @Get('ci/build/:sessionId/:buildId')
  @ApiOperation({
    summary: 'Get CI build summary',
    description: 'Get aggregated metrics and artifacts for a specific CI build.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiParam({ name: 'buildId', description: 'CI Build ID' })
  @ApiResponse({ status: 200, description: 'Build summary with metrics' })
  @ApiResponse({ status: 404, description: 'Build not found' })
  async getCIBuildSummary(
    @Param('sessionId') sessionId: string,
    @Param('buildId') buildId: string,
  ) {
    return this.ciIngestionService.getBuildSummary(sessionId, buildId);
  }
}
