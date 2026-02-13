import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/database';
import { EvidenceType, CoverageLevel, Prisma } from '@prisma/client';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import * as crypto from 'crypto';

// Type definition for Multer file
interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Coverage Level mapping to decimal values
 * Provides 5-level discrete scale for evidence assessment
 */
export const COVERAGE_LEVEL_VALUES: Record<CoverageLevel, number> = {
  NONE: 0.0,
  PARTIAL: 0.25,
  HALF: 0.5,
  SUBSTANTIAL: 0.75,
  FULL: 1.0,
};

/**
 * Valid coverage level transitions
 * Enforces that coverage can only increase, never decrease
 */
export const VALID_COVERAGE_TRANSITIONS: Record<CoverageLevel, CoverageLevel[]> = {
  NONE: ['NONE', 'PARTIAL', 'HALF', 'SUBSTANTIAL', 'FULL'],
  PARTIAL: ['PARTIAL', 'HALF', 'SUBSTANTIAL', 'FULL'],
  HALF: ['HALF', 'SUBSTANTIAL', 'FULL'],
  SUBSTANTIAL: ['SUBSTANTIAL', 'FULL'],
  FULL: ['FULL'],
};

/**
 * Convert CoverageLevel enum to decimal value
 */
export function coverageLevelToDecimal(level: CoverageLevel | null): number {
  if (!level) {
    return 0;
  }
  return COVERAGE_LEVEL_VALUES[level] ?? 0;
}

/**
 * Convert decimal value to nearest CoverageLevel
 * Uses nearest-neighbor rounding to closest 0.25 increment
 */
export function decimalToCoverageLevel(value: number | null): CoverageLevel {
  if (value === null || value < 0.125) {
    return 'NONE';
  }
  if (value < 0.375) {
    return 'PARTIAL';
  }
  if (value < 0.625) {
    return 'HALF';
  }
  if (value < 0.875) {
    return 'SUBSTANTIAL';
  }
  return 'FULL';
}

/**
 * Validate coverage level transition
 * Returns true if transition from current to target is valid
 */
export function isValidCoverageTransition(current: CoverageLevel, target: CoverageLevel): boolean {
  return VALID_COVERAGE_TRANSITIONS[current].includes(target);
}

import { UploadEvidenceDto, VerifyEvidenceDto, EvidenceItemResponse, ListEvidenceDto } from './dto';

/**
 * Evidence Registry Service
 *
 * Manages evidence artifacts for Quiz2Biz readiness assessment:
 * - File uploads to Azure Blob Storage
 * - SHA-256 hash computation for integrity verification
 * - Verification workflow with coverage updates
 * - Evidence linking to questions and sessions
 */
@Injectable()
export class EvidenceRegistryService {
  private readonly logger = new Logger(EvidenceRegistryService.name);
  private containerClient: ContainerClient | null = null;

  /** Allowed MIME types for evidence uploads */
  private readonly ALLOWED_MIME_TYPES = new Set([
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'application/json',
    // Images
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    // Logs and data
    'text/csv',
    'application/xml',
    'text/xml',
    // SBOM formats
    'application/vnd.cyclonedx+json',
    'application/spdx+json',
  ]);

  /** Maximum file size in bytes (50MB) */
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initializeBlobClient();
  }

  /**
   * Initialize Azure Blob Storage client
   */
  private initializeBlobClient(): void {
    try {
      const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
      const containerName = this.configService.get<string>(
        'AZURE_STORAGE_CONTAINER_NAME',
        'evidence',
      );

      if (connectionString) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.containerClient = blobServiceClient.getContainerClient(containerName);
        this.logger.log(`Azure Blob Storage initialized for container: ${containerName}`);
      } else {
        this.logger.warn('Azure Blob Storage not configured - file uploads will fail');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Azure Blob Storage', error);
    }
  }

  /**
   * Upload evidence file
   *
   * @param file - The file buffer to upload
   * @param dto - Upload metadata
   * @param userId - ID of uploading user
   */
  async uploadEvidence(
    file: MulterFile,
    dto: UploadEvidenceDto,
    _userId: string,
  ): Promise<EvidenceItemResponse> {
    // Validate file
    this.validateFile(file);

    // Verify session and question exist
    await this.validateSessionAndQuestion(dto.sessionId, dto.questionId);

    // Compute SHA-256 hash
    const hashSignature = this.computeSHA256(file.buffer);

    // Generate unique blob name
    const blobName = this.generateBlobName(dto.sessionId, dto.questionId, file.originalname);

    // Upload to Azure Blob Storage
    const artifactUrl = await this.uploadToBlob(file, blobName);

    // Create evidence record using parameterized query via Prisma
    const evidence = await this.prisma.evidenceRegistry.create({
      data: {
        sessionId: dto.sessionId,
        questionId: dto.questionId,
        artifactUrl,
        artifactType: dto.artifactType,
        fileName: dto.fileName || file.originalname,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        hashSignature,
        verified: false,
      },
    });

    // Update evidence count on response
    await this.updateResponseEvidenceCount(dto.sessionId, dto.questionId);

    this.logger.log(
      `Evidence uploaded: ${evidence.id} for session ${dto.sessionId}, question ${dto.questionId}`,
    );

    return this.mapToResponse(evidence);
  }

  /**
   * Verify evidence and optionally update coverage
   *
   * @param dto - Verification details
   * @param verifierId - ID of user performing verification
   */
  async verifyEvidence(dto: VerifyEvidenceDto, verifierId: string): Promise<EvidenceItemResponse> {
    const evidence = await this.prisma.evidenceRegistry.findUnique({
      where: { id: dto.evidenceId },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence not found: ${dto.evidenceId}`);
    }

    // Update evidence verification status
    const updatedEvidence = await this.prisma.evidenceRegistry.update({
      where: { id: dto.evidenceId },
      data: {
        verified: dto.verified,
        verifierId: dto.verified ? verifierId : null,
        verifiedAt: dto.verified ? new Date() : null,
      },
    });

    // Update coverage on response if provided
    if (dto.coverageValue !== undefined && dto.verified) {
      await this.updateResponseCoverage(evidence.sessionId, evidence.questionId, dto.coverageValue);
    }

    this.logger.log(
      `Evidence ${dto.verified ? 'verified' : 'unverified'}: ${dto.evidenceId} by ${verifierId}`,
    );

    return this.mapToResponse(updatedEvidence);
  }

  /**
   * Get evidence by ID
   */
  async getEvidence(evidenceId: string): Promise<EvidenceItemResponse> {
    const evidence = await this.prisma.evidenceRegistry.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence not found: ${evidenceId}`);
    }

    return this.mapToResponse(evidence);
  }

  /**
   * List evidence with filters
   */
  async listEvidence(filters: ListEvidenceDto): Promise<EvidenceItemResponse[]> {
    const where: Prisma.EvidenceRegistryWhereInput = {};

    if (filters.sessionId) {
      where.sessionId = filters.sessionId;
    }
    if (filters.questionId) {
      where.questionId = filters.questionId;
    }
    if (filters.artifactType) {
      where.artifactType = filters.artifactType;
    }
    if (filters.verified !== undefined) {
      where.verified = filters.verified;
    }

    const evidenceList = await this.prisma.evidenceRegistry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return evidenceList.map((e) => this.mapToResponse(e));
  }

  /**
   * Get evidence statistics for a session
   */
  async getEvidenceStats(sessionId: string): Promise<{
    total: number;
    verified: number;
    pending: number;
    byType: Record<string, number>;
  }> {
    const evidence = await this.prisma.evidenceRegistry.findMany({
      where: { sessionId },
      select: { verified: true, artifactType: true },
    });

    const byType: Record<string, number> = {};
    let verified = 0;
    let pending = 0;

    evidence.forEach((e) => {
      if (e.verified) {
        verified++;
      } else {
        pending++;
      }
      byType[e.artifactType] = (byType[e.artifactType] || 0) + 1;
    });

    return {
      total: evidence.length,
      verified,
      pending,
      byType,
    };
  }

  /**
   * Delete evidence (soft delete or hard delete based on configuration)
   */
  async deleteEvidence(evidenceId: string, userId: string): Promise<void> {
    const evidence = await this.prisma.evidenceRegistry.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence not found: ${evidenceId}`);
    }

    // Only allow deletion of unverified evidence
    if (evidence.verified) {
      throw new ForbiddenException('Cannot delete verified evidence');
    }

    // Delete from blob storage
    await this.deleteFromBlob(evidence.artifactUrl);

    // Delete database record
    await this.prisma.evidenceRegistry.delete({
      where: { id: evidenceId },
    });

    // Update evidence count on response
    await this.updateResponseEvidenceCount(evidence.sessionId, evidence.questionId);

    this.logger.log(`Evidence deleted: ${evidenceId} by ${userId}`);
  }

  /**
   * Compute SHA-256 hash of file content
   */
  private computeSHA256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate unique blob name with path structure
   */
  private generateBlobName(sessionId: string, questionId: string, originalName: string): string {
    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `sessions/${sessionId}/questions/${questionId}/${timestamp}-${sanitizedName}`;
  }

  /**
   * Upload file to Azure Blob Storage
   */
  private async uploadToBlob(file: MulterFile, blobName: string): Promise<string> {
    if (!this.containerClient) {
      throw new BadRequestException('File storage not configured');
    }

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });

      return blockBlobClient.url;
    } catch (error) {
      this.logger.error(`Failed to upload blob: ${blobName}`, error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Delete blob from Azure Storage
   */
  private async deleteFromBlob(artifactUrl: string): Promise<void> {
    if (!this.containerClient) {
      return;
    }

    try {
      // Extract blob name from URL
      const url = new URL(artifactUrl);
      const blobName = url.pathname.split('/').slice(2).join('/');

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      this.logger.warn(`Failed to delete blob: ${artifactUrl}`, error);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: MulterFile): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      );
    }

    if (!this.ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    }
  }

  /**
   * Validate session and question exist
   */
  private async validateSessionAndQuestion(sessionId: string, questionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question not found: ${questionId}`);
    }
  }

  /**
   * Update evidence count on response record
   */
  private async updateResponseEvidenceCount(sessionId: string, questionId: string): Promise<void> {
    const count = await this.prisma.evidenceRegistry.count({
      where: { sessionId, questionId },
    });

    await this.prisma.response.updateMany({
      where: { sessionId, questionId },
      data: { evidenceCount: count },
    });
  }

  /**
   * Update coverage level on response
   * Validates coverage level transition and updates both level and decimal
   */
  private async updateResponseCoverage(
    sessionId: string,
    questionId: string,
    coverage: number,
  ): Promise<void> {
    // Get current response to check existing coverage level
    const existingResponse = await this.prisma.response.findFirst({
      where: { sessionId, questionId },
      select: { coverageLevel: true },
    });

    // Convert decimal to coverage level
    const targetLevel = decimalToCoverageLevel(coverage);
    const currentLevel = existingResponse?.coverageLevel ?? 'NONE';

    // Validate transition (coverage can only increase)
    if (!isValidCoverageTransition(currentLevel as CoverageLevel, targetLevel)) {
      throw new BadRequestException(
        `Invalid coverage transition from ${currentLevel} to ${targetLevel}. ` +
          `Coverage can only increase.`,
      );
    }

    // Update both coverage (decimal) and coverageLevel (enum)
    await this.prisma.response.updateMany({
      where: { sessionId, questionId },
      data: {
        coverage: coverageLevelToDecimal(targetLevel),
        coverageLevel: targetLevel,
      },
    });

    this.logger.log(
      `Coverage updated for session ${sessionId}, question ${questionId}: ${currentLevel} → ${targetLevel}`,
    );
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponse(evidence: {
    id: string;
    sessionId: string;
    questionId: string;
    artifactUrl: string;
    artifactType: EvidenceType;
    fileName: string | null;
    fileSize: bigint | null;
    mimeType: string | null;
    hashSignature: string | null;
    verified: boolean;
    verifierId: string | null;
    verifiedAt: Date | null;
    createdAt: Date;
  }): EvidenceItemResponse {
    return {
      id: evidence.id,
      sessionId: evidence.sessionId,
      questionId: evidence.questionId,
      artifactUrl: evidence.artifactUrl,
      artifactType: evidence.artifactType,
      fileName: evidence.fileName,
      fileSize: evidence.fileSize,
      mimeType: evidence.mimeType,
      hashSignature: evidence.hashSignature,
      verified: evidence.verified,
      verifierId: evidence.verifierId,
      verifiedAt: evidence.verifiedAt,
      createdAt: evidence.createdAt,
    };
  }

  /**
   * Bulk verify multiple evidence items
   * Useful for batch processing verification workflows
   */
  async bulkVerifyEvidence(
    evidenceIds: string[],
    verifierId: string,
    coverageValue?: number,
  ): Promise<BulkVerificationResult> {
    const results: BulkVerificationResult = {
      successful: [],
      failed: [],
      totalProcessed: evidenceIds.length,
    };

    for (const evidenceId of evidenceIds) {
      try {
        const result = await this.verifyEvidence(
          { evidenceId, verified: true, coverageValue },
          verifierId,
        );
        results.successful.push(result.id);
      } catch (error) {
        results.failed.push({
          evidenceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Bulk verification completed: ${results.successful.length} successful, ${results.failed.length} failed`,
    );

    return results;
  }

  /**
   * Get evidence audit trail
   * Returns the verification history for an evidence item
   */
  async getEvidenceAuditTrail(evidenceId: string): Promise<EvidenceAuditEntry[]> {
    const evidence = await this.prisma.evidenceRegistry.findUnique({
      where: { id: evidenceId },
      include: {
        verifier: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence not found: ${evidenceId}`);
    }

    // Get related decision logs for this evidence (via session)
    const auditLogs = await this.prisma.decisionLog.findMany({
      where: {
        sessionId: evidence.sessionId,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        statement: true,
        createdAt: true,
        status: true,
      },
    });

    const auditTrail: EvidenceAuditEntry[] = [
      {
        action: 'UPLOADED',
        timestamp: evidence.createdAt,
        userId: null,
        details: {
          fileName: evidence.fileName,
          fileSize: Number(evidence.fileSize),
          mimeType: evidence.mimeType,
          hashSignature: evidence.hashSignature,
        },
      },
    ];

    // Add verification event if verified
    if (evidence.verified && evidence.verifiedAt) {
      auditTrail.push({
        action: 'VERIFIED',
        timestamp: evidence.verifiedAt,
        userId: evidence.verifierId,
        userName: evidence.verifier?.name || null,
        details: {},
      });
    }

    // Add any logged decisions (filter to relevant ones)
    auditLogs.forEach((log) => {
      auditTrail.push({
        action: log.status as string,
        timestamp: log.createdAt,
        userId: null,
        details: { statement: log.statement },
      });
    });

    // Sort by timestamp
    auditTrail.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return auditTrail;
  }

  /**
   * Check evidence integrity by re-computing hash
   * Verifies the stored file matches the original hash
   */
  async verifyEvidenceIntegrity(evidenceId: string): Promise<IntegrityCheckResult> {
    const evidence = await this.prisma.evidenceRegistry.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence not found: ${evidenceId}`);
    }

    if (!this.containerClient) {
      throw new BadRequestException('File storage not configured');
    }

    try {
      // Download the file from blob storage
      const url = new URL(evidence.artifactUrl);
      const blobName = url.pathname.split('/').slice(2).join('/');
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const downloadResponse = await blockBlobClient.download();
      const chunks: Buffer[] = [];

      if (downloadResponse.readableStreamBody) {
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(Buffer.from(chunk));
        }
      }

      const fileBuffer = Buffer.concat(chunks);
      const computedHash = this.computeSHA256(fileBuffer);

      const isValid = computedHash === evidence.hashSignature;

      return {
        evidenceId,
        storedHash: evidence.hashSignature || '',
        computedHash,
        isValid,
        checkedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to verify integrity for ${evidenceId}`, error);
      throw new BadRequestException('Failed to verify file integrity');
    }
  }

  /**
   * Get evidence coverage summary for a session
   * Shows how much evidence supports each dimension
   */
  async getEvidenceCoverageSummary(sessionId: string): Promise<EvidenceCoverageSummary> {
    const evidence = await this.prisma.evidenceRegistry.findMany({
      where: { sessionId },
      include: {
        question: {
          include: {
            dimension: true,
          },
        },
      },
    });

    const byDimension = new Map<string, DimensionEvidenceSummary>();
    const byQuestion = new Map<string, QuestionEvidenceSummary>();

    for (const e of evidence) {
      const dimensionKey = e.question?.dimension?.key || 'unknown';
      const dimensionName = e.question?.dimension?.displayName || dimensionKey;

      // Update dimension summary
      if (!byDimension.has(dimensionKey)) {
        byDimension.set(dimensionKey, {
          dimensionKey,
          dimensionName,
          totalEvidence: 0,
          verifiedEvidence: 0,
          questionsCovered: new Set(),
        });
      }
      const dimSummary = byDimension.get(dimensionKey)!;
      dimSummary.totalEvidence++;
      if (e.verified) {
        dimSummary.verifiedEvidence++;
      }
      dimSummary.questionsCovered.add(e.questionId);

      // Update question summary
      if (!byQuestion.has(e.questionId)) {
        byQuestion.set(e.questionId, {
          questionId: e.questionId,
          questionText: e.question?.text || '',
          totalEvidence: 0,
          verifiedEvidence: 0,
          evidenceTypes: new Set(),
        });
      }
      const qSummary = byQuestion.get(e.questionId)!;
      qSummary.totalEvidence++;
      if (e.verified) {
        qSummary.verifiedEvidence++;
      }
      qSummary.evidenceTypes.add(e.artifactType);
    }

    return {
      sessionId,
      totalEvidence: evidence.length,
      verifiedEvidence: evidence.filter((e) => e.verified).length,
      dimensionCoverage: Array.from(byDimension.values()).map((d) => ({
        ...d,
        questionsCovered: d.questionsCovered.size,
      })),
      questionCoverage: Array.from(byQuestion.values()).map((q) => ({
        ...q,
        evidenceTypes: Array.from(q.evidenceTypes),
      })),
    };
  }

  /**
   * Generate signed URL for secure evidence download
   * URL expires after specified duration
   */
  async generateSignedUrl(
    evidenceId: string,
    expirationMinutes: number = 15,
  ): Promise<SignedUrlResult> {
    const evidence = await this.prisma.evidenceRegistry.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence not found: ${evidenceId}`);
    }

    if (!this.containerClient) {
      throw new BadRequestException('File storage not configured');
    }

    try {
      const url = new URL(evidence.artifactUrl);
      const blobName = url.pathname.split('/').slice(2).join('/');
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      // Generate SAS token with read-only access
      const expiresOn = new Date();
      expiresOn.setMinutes(expiresOn.getMinutes() + expirationMinutes);

      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: { read: true } as unknown as import('@azure/storage-blob').BlobSASPermissions,
        expiresOn,
      });

      return {
        evidenceId,
        signedUrl: sasUrl,
        expiresAt: expiresOn,
        fileName: evidence.fileName || 'download',
      };
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${evidenceId}`, error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }
}

/**
 * Bulk verification result
 */
export interface BulkVerificationResult {
  successful: string[];
  failed: Array<{ evidenceId: string; error: string }>;
  totalProcessed: number;
}

/**
 * Evidence audit trail entry
 */
export interface EvidenceAuditEntry {
  action: string;
  timestamp: Date;
  userId: string | null;
  userName?: string | null;
  details: Record<string, unknown>;
}

/**
 * Integrity check result
 */
export interface IntegrityCheckResult {
  evidenceId: string;
  storedHash: string;
  computedHash: string;
  isValid: boolean;
  checkedAt: Date;
}

/**
 * Evidence coverage summary
 */
export interface EvidenceCoverageSummary {
  sessionId: string;
  totalEvidence: number;
  verifiedEvidence: number;
  dimensionCoverage: Array<{
    dimensionKey: string;
    dimensionName: string;
    totalEvidence: number;
    verifiedEvidence: number;
    questionsCovered: number;
  }>;
  questionCoverage: Array<{
    questionId: string;
    questionText: string;
    totalEvidence: number;
    verifiedEvidence: number;
    evidenceTypes: string[];
  }>;
}

/**
 * Internal dimension evidence summary (with Set)
 */
interface DimensionEvidenceSummary {
  dimensionKey: string;
  dimensionName: string;
  totalEvidence: number;
  verifiedEvidence: number;
  questionsCovered: Set<string>;
}

/**
 * Internal question evidence summary (with Set)
 */
interface QuestionEvidenceSummary {
  questionId: string;
  questionText: string;
  totalEvidence: number;
  verifiedEvidence: number;
  evidenceTypes: Set<EvidenceType>;
}

/**
 * Signed URL result
 */
export interface SignedUrlResult {
  evidenceId: string;
  signedUrl: string;
  expiresAt: Date;
  fileName: string;
}
