import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Document, DocumentType, DocumentStatus, SessionStatus } from '@prisma/client';
import { TemplateEngineService } from './template-engine.service';
import { DocumentBuilderService } from './document-builder.service';
import { StorageService } from './storage.service';
import { NotificationService } from '../../notifications/notification.service';
import { AiDocumentContentService, SessionAnswer } from './ai-document-content.service';
import { getDocumentTemplate } from '../templates/document-templates';

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
    private readonly aiContentService: AiDocumentContentService,
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

      const answeredIds = new Set(
        answeredQuestions.map((r: { questionId: string }) => r.questionId),
      );
      const missingQuestions = documentType.requiredQuestions.filter(
        (id: string) => !answeredIds.has(id),
      );

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
   * Process document generation — uses AI content service when available,
   * falls back to template-based generation.
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

    let buffer: Buffer;
    let generationMethod = 'template';

    // Try AI-powered generation first
    const template = getDocumentTemplate(documentType.slug);
    if (template) {
      const sessionAnswers = await this.loadSessionAnswers(document.sessionId);
      const projectTypeName = await this.getProjectTypeName(document.sessionId);

      const aiContent = await this.aiContentService.generateDocumentContent({
        projectTypeName,
        documentTypeName: documentType.name,
        sessionAnswers,
        documentTemplateSections: template.sections,
      });

      buffer = await this.documentBuilder.buildDocumentFromAiContent(aiContent, {
        name: documentType.name,
        slug: documentType.slug,
        category: documentType.category,
      });
      generationMethod = 'ai';
    } else {
      // Fallback: legacy template-based generation
      const templateData = await this.templateEngine.assembleTemplateData(
        document.sessionId,
        documentType.slug,
      );
      buffer = await this.documentBuilder.buildDocument(templateData, {
        name: documentType.name,
        slug: documentType.slug,
        category: documentType.category,
      });
    }

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
          generationMethod,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Document ${documentId} generated successfully (method: ${generationMethod})`);

    // Notify user that document is ready (fire-and-forget)
    this.notifyDocumentOwner(document.sessionId, [uploadResult.fileName], 'ready').catch((err) =>
      this.logger.warn('Failed to send documents-ready notification', err),
    );
  }

  /**
   * Load all session answers formatted for AI document generation.
   */
  private async loadSessionAnswers(sessionId: string): Promise<SessionAnswer[]> {
    const responses = await this.prisma.response.findMany({
      where: { sessionId, isValid: true },
      include: {
        question: {
          select: { text: true, dimensionKey: true },
        },
      },
    });

    return responses
      .filter((r: { question: { text: string; dimensionKey: string | null } | null }) => r.question)
      .map((r: { question: { text: string; dimensionKey: string | null }; value: unknown }) => {
        const value = r.value as Record<string, unknown>;
        const answerText =
          typeof value === 'string' ? value : ((value?.text as string) ?? JSON.stringify(value));
        return {
          question: r.question.text,
          answer: answerText,
          dimensionKey: r.question.dimensionKey ?? 'general',
        };
      });
  }

  /**
   * Get the project type name for a session.
   */
  private async getProjectTypeName(sessionId: string): Promise<string> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { projectType: { select: { name: true } } },
    });
    return session?.projectType?.name ?? 'Business Project';
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
   * Get document version history
   * Returns all versions of documents of the same type for the same session
   */
  async getDocumentVersionHistory(documentId: string, userId: string): Promise<DocumentWithType[]> {
    const document = await this.getDocument(documentId, userId);

    // Get all documents of the same type for the same session (versions)
    const versions = await this.prisma.document.findMany({
      where: {
        sessionId: document.sessionId,
        documentTypeId: document.documentTypeId,
      },
      include: { documentType: true },
      orderBy: { version: 'desc' },
    });

    return versions;
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
   * List document types scoped to a project type
   */
  private async listDocumentTypesByProjectType(projectTypeId: string): Promise<DocumentType[]> {
    return this.prisma.documentType.findMany({
      where: { isActive: true, projectTypeId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get document types available for a specific session.
   * Falls back to all active doc types if session has no project type.
   */
  async getDocumentTypesForSession(sessionId: string): Promise<DocumentType[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { projectTypeId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.projectTypeId) {
      return this.listDocumentTypesByProjectType(session.projectTypeId);
    }

    return this.listDocumentTypes();
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
    this.notifyDocumentOwner(
      document.sessionId,
      [document.fileName || 'Document'],
      'approved',
    ).catch((err) => this.logger.warn('Failed to send approval notification', err));

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
   * Batch approve multiple documents
   */
  async batchApproveDocuments(
    documentIds: string[],
    adminUserId: string,
    _notes?: string,
  ): Promise<{ approved: string[]; failed: { id: string; error: string }[] }> {
    const approved: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const docId of documentIds) {
      try {
        await this.approveDocument(docId, adminUserId);
        approved.push(docId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ id: docId, error: message });
        this.logger.warn(`Failed to batch approve document ${docId}: ${message}`);
      }
    }

    this.logger.log(
      `Batch approve: ${approved.length} approved, ${failed.length} failed out of ${documentIds.length}`,
    );

    return { approved, failed };
  }

  /**
   * Batch reject multiple documents
   */
  async batchRejectDocuments(
    documentIds: string[],
    adminUserId: string,
    reason: string,
  ): Promise<{ rejected: string[]; failed: { id: string; error: string }[] }> {
    const rejected: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const docId of documentIds) {
      try {
        await this.rejectDocument(docId, adminUserId, reason);
        rejected.push(docId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ id: docId, error: message });
        this.logger.warn(`Failed to batch reject document ${docId}: ${message}`);
      }
    }

    this.logger.log(
      `Batch reject: ${rejected.length} rejected, ${failed.length} failed out of ${documentIds.length}`,
    );

    return { rejected, failed };
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

    if (!session?.user) {
      return;
    }

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
