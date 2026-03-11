// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — WIP module: references Prisma models/fields not yet in schema
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ConfigService } from '@nestjs/config';
import * as archiver from 'archiver';
import { PassThrough } from 'stream';

interface _DocumentInfo {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface BulkDownloadResult {
  filename: string;
  stream: PassThrough;
  totalDocuments: number;
  totalSizeEstimate: number;
}

@Injectable()
export class BulkDownloadService {
  private readonly logger = new Logger(BulkDownloadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a ZIP archive containing all documents for a session
   */
  async createSessionDocumentsZip(
    sessionId: string,
    userId: string,
  ): Promise<BulkDownloadResult> {
    // Verify session ownership
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        questionnaire: { select: { name: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get all documents for this session
    const documents = await this.prisma.generatedDocument.findMany({
      where: {
        sessionId,
        status: 'COMPLETED',
      },
      select: {
        id: true,
        documentType: true,
        title: true,
        fileUrl: true,
        fileSize: true,
        format: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (documents.length === 0) {
      throw new BadRequestException('No documents available for download');
    }

    // Create ZIP filename
    const sanitizedName = (session.questionnaire?.name || 'session')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedName}_documents_${timestamp}.zip`;

    // Create the archive stream
    const passThrough = new PassThrough();
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Balanced compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      this.logger.error('Archive error', err);
      passThrough.destroy(err);
    });

    // Pipe archive to the pass-through stream
    archive.pipe(passThrough);

    // Add documents to archive
    let totalSize = 0;
    for (const doc of documents) {
      try {
        const content = await this.fetchDocumentContent(doc.fileUrl);
        if (content) {
          const docFilename = this.generateDocumentFilename(doc);
          archive.append(content, { name: docFilename });
          totalSize += Number(doc.fileSize || 0);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch document ${doc.id}`, error);
        // Continue with other documents
      }
    }

    // Finalize the archive
    archive.finalize();

    return {
      filename,
      stream: passThrough,
      totalDocuments: documents.length,
      totalSizeEstimate: totalSize,
    };
  }

  /**
   * Create a ZIP archive containing selected documents
   */
  async createSelectedDocumentsZip(
    documentIds: string[],
    userId: string,
  ): Promise<BulkDownloadResult> {
    if (documentIds.length === 0) {
      throw new BadRequestException('No documents selected');
    }

    if (documentIds.length > 50) {
      throw new BadRequestException('Maximum 50 documents per download');
    }

    // Get documents and verify ownership
    const documents = await this.prisma.generatedDocument.findMany({
      where: {
        id: { in: documentIds },
        status: 'COMPLETED',
        session: { userId },
      },
      select: {
        id: true,
        documentType: true,
        title: true,
        fileUrl: true,
        fileSize: true,
        format: true,
        createdAt: true,
      },
    });

    if (documents.length === 0) {
      throw new NotFoundException('No documents found');
    }

    // Create ZIP filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `documents_${timestamp}.zip`;

    // Create the archive
    const passThrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', (err) => {
      this.logger.error('Archive error', err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    let totalSize = 0;
    for (const doc of documents) {
      try {
        const content = await this.fetchDocumentContent(doc.fileUrl);
        if (content) {
          const docFilename = this.generateDocumentFilename(doc);
          archive.append(content, { name: docFilename });
          totalSize += Number(doc.fileSize || 0);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch document ${doc.id}`, error);
      }
    }

    archive.finalize();

    return {
      filename,
      stream: passThrough,
      totalDocuments: documents.length,
      totalSizeEstimate: totalSize,
    };
  }

  /**
   * Fetch document content from storage URL
   */
  private async fetchDocumentContent(url: string): Promise<Buffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Failed to fetch ${url}`, error);
      return null;
    }
  }

  /**
   * Generate a unique filename for a document in the ZIP
   */
  private generateDocumentFilename(doc: {
    title: string;
    documentType: string;
    format: string;
    id: string;
  }): string {
    // Sanitize title
    const sanitizedTitle = doc.title
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);

    // Determine extension
    const extension = doc.format?.toLowerCase() || 'pdf';

    // Include short ID to ensure uniqueness
    const shortId = doc.id.substring(0, 8);

    return `${sanitizedTitle}_${shortId}.${extension}`;
  }

  /**
   * Get download statistics for a user
   */
  async getDownloadStats(userId: string): Promise<{
    totalDownloads: number;
    totalSize: number;
    documentsByType: Record<string, number>;
  }> {
    const documents = await this.prisma.generatedDocument.findMany({
      where: {
        session: { userId },
        status: 'COMPLETED',
      },
      select: {
        documentType: true,
        fileSize: true,
      },
    });

    const byType: Record<string, number> = {};
    let totalSize = 0;

    for (const doc of documents) {
      byType[doc.documentType] = (byType[doc.documentType] || 0) + 1;
      totalSize += Number(doc.fileSize || 0);
    }

    return {
      totalDownloads: documents.length,
      totalSize,
      documentsByType: byType,
    };
  }
}
