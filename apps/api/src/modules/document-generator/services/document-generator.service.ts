import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Document, DocumentType, DocumentStatus, SessionStatus } from '@prisma/client';
import { TemplateEngineService } from './template-engine.service';
import { DocumentBuilderService } from './document-builder.service';
import { StorageService } from './storage.service';
import { NotificationService } from '../../notifications/notification.service';

export interface GenerateDocumentParams {
  sessionId: string;
  documentTypeId: string;
  userId: string;
}

export interface DocumentWithType extends Document {
  documentType: DocumentType;
}

@Injectable()
export class DocumentGeneratorService {
  private readonly logger = new Logger(DocumentGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
    private readonly documentBuilder: DocumentBuilderService,
    private readonly storage: StorageService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Generate a document for a completed session
   */
  async generateDocument(params: GenerateDocumentParams): Promise<Document> {
    const { sessionId, documentTypeId, userId } = params;

    // 1. Validate session exists and is completed
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true } },
        questionnaire: { select: { name: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException(
        `Session must be completed before generating documents. Current status: ${session.status}`,
      );
    }

    // Verify user owns the session or is admin
    if (session.userId !== userId) {
      throw new BadRequestException('You can only generate documents for your own sessions');
    }

    // 2. Validate document type exists
    const documentType = await this.prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });

    if (!documentType) {
      throw new NotFoundException(`Document type with ID ${documentTypeId} not found`);
    }

    if (!documentType.isActive) {
      throw new BadRequestException('This document type is not currently available');
    }

    // 3. Check if required questions are answered
    if (documentType.requiredQuestions.length > 0) {
      const answeredQuestions = await this.prisma.response.findMany({
        where: {
          sessionId,
          questionId: { in: documentType.requiredQuestions },
          isValid: true,
        },
        select: { questionId: true },
      });

      const answeredIds = new Set(answeredQuestions.map((r) => r.questionId));
      const missingQuestions = documentType.requiredQuestions.filter((id) => !answeredIds.has(id));

      if (missingQuestions.length > 0) {
        throw new BadRequestException(
          `Missing required questions for this document type: ${missingQuestions.length} questions not answered`,
        );
      }
    }

    // 4. Create document record with PENDING status
    const document = await this.prisma.document.create({
      data: {
        sessionId,
        documentTypeId,
        status: DocumentStatus.PENDING,
        format: 'DOCX',
        version: 1,
      },
    });

    // 5. Generate document asynchronously (for now, synchronously)
    try {
      await this.processDocumentGeneration(document.id, documentType);
    } catch (error) {
      // Mark as failed if generation fails
      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.FAILED,
          generationMetadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString(),
          },
        },
      });
      throw error;
    }

    // Return updated document
    return this.prisma.document.findUnique({
      where: { id: document.id },
      include: { documentType: true },
    }) as Promise<Document>;
  }

  /**
   * Process document generation
   */
  private async processDocumentGeneration(
    documentId: string,
    documentType: DocumentType,
  ): Promise<void> {
    // Update status to GENERATING
    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.GENERATING },
    });

    this.logger.log(`Generating document ${documentId} of type ${documentType.name}`);

    // Assemble template data
    const templateData = await this.templateEngine.assembleTemplateData(
      document.sessionId,
      documentType.slug,
    );

    // Build DOCX
    const buffer = await this.documentBuilder.buildDocument(templateData, {
      name: documentType.name,
      slug: documentType.slug,
      category: documentType.category,
    });

    // Upload to storage
    const fileName = `${documentType.slug}-${documentId}.docx`;
    const uploadResult = await this.storage.upload(
      buffer,
      fileName,
      documentType.category.toLowerCase(),
    );

    // Update document with results
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.GENERATED,
        storageUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: BigInt(uploadResult.fileSize),
        generatedAt: new Date(),
        generationMetadata: {
          templateVersion: templateData.metadata.version,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Document ${documentId} generated successfully`);

    // Notify user that document is ready (fire-and-forget)
    this.notifyDocumentOwner(document.sessionId, [uploadResult.fileName], 'ready').catch((err) =>
      this.logger.warn('Failed to send documents-ready notification', err),
    );
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string, userId: string): Promise<DocumentWithType> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        documentType: true,
        session: { select: { userId: true } },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Verify access (user owns the session)
    if (document.session.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    return document;
  }

  /**
   * Get all documents for a session
   */
  async getSessionDocuments(sessionId: string, userId: string): Promise<DocumentWithType[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    return this.prisma.document.findMany({
      where: { sessionId },
      include: { documentType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get download URL for a document
   */
  async getDownloadUrl(id: string, userId: string, expiresInMinutes: number = 60): Promise<string> {
    const document = await this.getDocument(id, userId);

    if (
      document.status !== DocumentStatus.GENERATED &&
      document.status !== DocumentStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Document is not available for download. Status: ${document.status}`,
      );
    }

    if (!document.storageUrl) {
      throw new BadRequestException('Document file not found');
    }

    return this.storage.getDownloadUrl(document.storageUrl, expiresInMinutes);
  }

  /**
   * List all document types
   */
  async listDocumentTypes(): Promise<DocumentType[]> {
    return this.prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get documents pending review (admin)
   */
  async getPendingReviewDocuments(): Promise<DocumentWithType[]> {
    return this.prisma.document.findMany({
      where: { status: DocumentStatus.PENDING_REVIEW },
      include: { documentType: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve a document (admin)
   */
  async approveDocument(id: string, adminUserId: string): Promise<Document> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (document.status !== DocumentStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Only documents with PENDING_REVIEW status can be approved. Current: ${document.status}`,
      );
    }

    const approved = await this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.APPROVED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        reviewStatus: {
          approvedBy: adminUserId,
          approvedAt: new Date().toISOString(),
        },
      },
    });

    // Notify document owner (fire-and-forget)
    this.notifyDocumentOwner(document.sessionId, [document.fileName || 'Document'], 'approved').catch(
      (err) => this.logger.warn('Failed to send approval notification', err),
    );

    return approved;
  }

  /**
   * Reject a document (admin)
   */
  async rejectDocument(id: string, adminUserId: string, reason: string): Promise<Document> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (document.status !== DocumentStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Only documents with PENDING_REVIEW status can be rejected. Current: ${document.status}`,
      );
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.REJECTED,
        rejectionReason: reason,
        reviewStatus: {
          rejectedBy: adminUserId,
          rejectedAt: new Date().toISOString(),
          reason,
        },
      },
    });
  }

  /**
   * Helper to notify the session owner about document status changes
   */
  private async notifyDocumentOwner(
    sessionId: string,
    documentNames: string[],
    action: 'approved' | 'ready',
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!session?.user) return;

    const userName = session.user.name || session.user.email.split('@')[0];

    if (action === 'approved') {
      await this.notificationService.sendDocumentsApprovedEmail(
        session.user.email,
        userName,
        sessionId,
        documentNames,
      );
    } else {
      await this.notificationService.sendDocumentsReadyEmail(
        session.user.email,
        userName,
        sessionId,
        documentNames,
      );
    }
  }
}
