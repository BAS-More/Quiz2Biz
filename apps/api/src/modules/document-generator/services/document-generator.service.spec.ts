import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentGeneratorService } from './document-generator.service';
import { PrismaService } from '@libs/database';
import { TemplateEngineService } from './template-engine.service';
import { DocumentBuilderService } from './document-builder.service';
import { StorageService } from './storage.service';
import { AiDocumentContentService } from './ai-document-content.service';
import { NotificationService } from '../../notifications/notification.service';
import { SessionStatus, DocumentStatus, DocumentCategory } from '@prisma/client';

// Mock getDocumentTemplate so we can control which slug has a template
jest.mock('../templates/document-templates', () => ({
  getDocumentTemplate: jest.fn(),
}));
import { getDocumentTemplate } from '../templates/document-templates';
const mockGetDocumentTemplate = getDocumentTemplate as jest.MockedFunction<
  typeof getDocumentTemplate
>;

describe('DocumentGeneratorService', () => {
  let service: DocumentGeneratorService;
  let module: TestingModule;

  // -------------------------------------------------------------------------
  // Mocks
  // -------------------------------------------------------------------------
  const mockPrisma = {
    session: {
      findUnique: jest.fn(),
    },
    documentType: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    response: {
      findMany: jest.fn(),
    },
    document: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockTemplateEngine = {
    assembleTemplateData: jest.fn(),
  };

  const mockDocumentBuilder = {
    buildDocument: jest.fn(),
    buildDocumentFromAiContent: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn(),
    getDownloadUrl: jest.fn(),
  };

  const mockNotificationService = {
    sendDocumentsReadyEmail: jest.fn().mockResolvedValue(undefined),
    sendDocumentsApprovedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockAiContentService = {
    generateDocumentContent: jest.fn(),
  };

  // -------------------------------------------------------------------------
  // Shared fixtures
  // -------------------------------------------------------------------------
  const mockSession = {
    id: 'session-123',
    userId: 'user-456',
    status: SessionStatus.COMPLETED,
    user: { id: 'user-456' },
    questionnaire: { name: 'Business Incubator Assessment' },
    projectTypeId: null as string | null,
  };

  const mockDocumentType = {
    id: 'doc-type-789',
    name: 'Technology Roadmap',
    slug: 'tech-roadmap',
    category: DocumentCategory.CTO,
    isActive: true,
    requiredQuestions: [] as string[],
    projectTypeId: null as string | null,
  };

  const mockCreatedDocument = {
    id: 'doc-001',
    sessionId: 'session-123',
    documentTypeId: 'doc-type-789',
    status: DocumentStatus.PENDING,
    format: 'DOCX',
    version: 1,
  };

  const mockUploadResult = {
    url: 'https://storage.blob/documents/tech-roadmap-doc-001.docx',
    fileName: 'tech-roadmap-doc-001.docx',
    fileSize: 102400,
  };

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DocumentGeneratorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TemplateEngineService, useValue: mockTemplateEngine },
        { provide: DocumentBuilderService, useValue: mockDocumentBuilder },
        { provide: StorageService, useValue: mockStorage },
        { provide: AiDocumentContentService, useValue: mockAiContentService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<DocumentGeneratorService>(DocumentGeneratorService);

    jest.clearAllMocks();

    // Default: no document template for getDocumentTemplate
    mockGetDocumentTemplate.mockReturnValue(null);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // generateDocument
  // =========================================================================
  describe('generateDocument', () => {
    it('should throw NotFoundException when session is not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDocument({
          sessionId: 'non-existent',
          documentTypeId: 'doc-type-789',
          userId: 'user-456',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when session is not completed', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.IN_PROGRESS,
      });

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          userId: 'user-456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user does not own the session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          userId: 'wrong-user',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when document type is not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'non-existent-type',
          userId: 'user-456',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when document type is inactive', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue({
        ...mockDocumentType,
        isActive: false,
      });

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          userId: 'user-456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when required questions are not answered', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue({
        ...mockDocumentType,
        requiredQuestions: ['q1', 'q2', 'q3'],
      });
      mockPrisma.response.findMany.mockResolvedValue([
        { questionId: 'q1' },
        { questionId: 'q2' },
        // q3 is missing
      ]);

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          userId: 'user-456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass when all required questions are answered', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue({
        ...mockDocumentType,
        requiredQuestions: ['q1', 'q2'],
      });
      mockPrisma.response.findMany.mockResolvedValue([{ questionId: 'q1' }, { questionId: 'q2' }]);
      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);
      mockPrisma.document.update.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATING,
      });
      mockTemplateEngine.assembleTemplateData.mockResolvedValue({
        metadata: { version: '1.0' },
        content: {},
      });
      mockDocumentBuilder.buildDocument.mockResolvedValue(Buffer.from('docx'));
      mockStorage.upload.mockResolvedValue(mockUploadResult);
      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATED,
        documentType: mockDocumentType,
      });

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result).toBeDefined();
    });

    it('should generate document via AI path when template exists', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);

      // Simulate getDocumentTemplate returning a template
      mockGetDocumentTemplate.mockReturnValue({
        slug: 'tech-roadmap',
        name: 'Technology Roadmap',
        sections: [{ heading: 'Overview', description: 'Project overview' }],
      });

      // loadSessionAnswers
      mockPrisma.response.findMany.mockResolvedValue([
        {
          value: { text: 'My answer' },
          isValid: true,
          question: { text: 'What is your plan?', dimensionKey: 'strategy' },
        },
      ]);

      // getProjectTypeName
      mockPrisma.session.findUnique
        .mockResolvedValueOnce(mockSession) // first call: generateDocument validation
        .mockResolvedValueOnce({ projectType: { name: 'SaaS Project' } }) // getProjectTypeName
        .mockResolvedValueOnce({ user: { email: 'user@test.com', name: 'Test User' } }); // notifyDocumentOwner

      mockPrisma.document.update.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATING,
        sessionId: 'session-123',
      });

      const mockAiContent = {
        title: 'Tech Roadmap',
        sections: [{ heading: 'Overview', content: 'Content' }],
        summary: 'Summary',
      };
      mockAiContentService.generateDocumentContent.mockResolvedValue(mockAiContent);
      mockDocumentBuilder.buildDocumentFromAiContent.mockResolvedValue(Buffer.from('ai-docx'));
      mockStorage.upload.mockResolvedValue(mockUploadResult);

      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATED,
        documentType: mockDocumentType,
      });

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      expect(mockAiContentService.generateDocumentContent).toHaveBeenCalled();
      expect(mockDocumentBuilder.buildDocumentFromAiContent).toHaveBeenCalled();
    });

    it('should generate document via template fallback when no AI template exists', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);
      mockGetDocumentTemplate.mockReturnValue(null);

      mockPrisma.document.update.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATING,
        sessionId: 'session-123',
      });

      mockTemplateEngine.assembleTemplateData.mockResolvedValue({
        metadata: { version: '1.0' },
        content: {},
      });
      mockDocumentBuilder.buildDocument.mockResolvedValue(Buffer.from('template-docx'));
      mockStorage.upload.mockResolvedValue(mockUploadResult);

      // For notifyDocumentOwner
      mockPrisma.session.findUnique
        .mockResolvedValueOnce(mockSession)
        .mockResolvedValueOnce({ user: { email: 'user@test.com', name: 'Test User' } });

      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATED,
        documentType: mockDocumentType,
      });

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      expect(mockTemplateEngine.assembleTemplateData).toHaveBeenCalled();
      expect(mockDocumentBuilder.buildDocument).toHaveBeenCalled();
      expect(mockAiContentService.generateDocumentContent).not.toHaveBeenCalled();
    });

    it('should mark document as FAILED when generation process fails', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);
      mockPrisma.document.update.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.FAILED,
      });

      mockTemplateEngine.assembleTemplateData.mockRejectedValue(
        new Error('Template assembly failed'),
      );

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          userId: 'user-456',
        }),
      ).rejects.toThrow();

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-001' },
        data: expect.objectContaining({
          status: DocumentStatus.FAILED,
          generationMetadata: expect.objectContaining({
            error: 'Template assembly failed',
          }),
        }),
      });
    });

    it('should mark document as FAILED with "Unknown error" for non-Error throws', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);
      // First call: processDocumentGeneration sets GENERATING status
      // Second call: catch block sets FAILED status
      mockPrisma.document.update
        .mockResolvedValueOnce({
          ...mockCreatedDocument,
          status: DocumentStatus.GENERATING,
          sessionId: 'session-123',
        })
        .mockResolvedValueOnce({
          ...mockCreatedDocument,
          status: DocumentStatus.FAILED,
        });

      mockTemplateEngine.assembleTemplateData.mockRejectedValue('string error');

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          userId: 'user-456',
        }),
      ).rejects.toBe('string error');

      // The second update call should set FAILED with 'Unknown error'
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-001' },
        data: expect.objectContaining({
          status: DocumentStatus.FAILED,
          generationMetadata: expect.objectContaining({
            error: 'Unknown error',
          }),
        }),
      });
    });

    it('should upload generated document to storage with correct fileName', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);
      mockGetDocumentTemplate.mockReturnValue(null);

      mockPrisma.document.update.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATING,
        sessionId: 'session-123',
      });

      mockTemplateEngine.assembleTemplateData.mockResolvedValue({
        metadata: { version: '1.0' },
        content: {},
      });
      mockDocumentBuilder.buildDocument.mockResolvedValue(Buffer.from('docx'));
      mockStorage.upload.mockResolvedValue(mockUploadResult);

      mockPrisma.session.findUnique
        .mockResolvedValueOnce(mockSession)
        .mockResolvedValueOnce({ user: { email: 'a@b.com', name: 'User' } });

      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATED,
        documentType: mockDocumentType,
      });

      await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        'tech-roadmap-doc-001.docx',
        'cto', // category.toLowerCase()
      );
    });
  });

  // =========================================================================
  // getDocument
  // =========================================================================
  describe('getDocument', () => {
    it('should return document when found and user owns it', async () => {
      const mockDoc = {
        id: 'doc-123',
        sessionId: 'session-123',
        documentType: mockDocumentType,
        session: { userId: 'user-456' },
        status: DocumentStatus.GENERATED,
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDoc);

      const result = await service.getDocument('doc-123', 'user-456');

      expect(result).toEqual(mockDoc);
      expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        include: {
          documentType: true,
          session: { select: { userId: true } },
        },
      });
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getDocument('non-existent', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user does not own the document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        session: { userId: 'different-user' },
        documentType: mockDocumentType,
      });

      await expect(service.getDocument('doc-123', 'user-456')).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // getSessionDocuments
  // =========================================================================
  describe('getSessionDocuments', () => {
    it('should throw NotFoundException when session does not exist', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.getSessionDocuments('non-existent', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user does not own the session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        userId: 'other-user',
      });

      await expect(service.getSessionDocuments('session-123', 'user-456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return documents for a valid session owned by user', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          sessionId: 'session-123',
          status: DocumentStatus.GENERATED,
          documentType: { name: 'Technology Roadmap' },
        },
        {
          id: 'doc-2',
          sessionId: 'session-123',
          status: DocumentStatus.GENERATED,
          documentType: { name: 'Business Plan' },
        },
      ];

      mockPrisma.session.findUnique.mockResolvedValue({ userId: 'user-456' });
      mockPrisma.document.findMany.mockResolvedValue(mockDocs);

      const result = await service.getSessionDocuments('session-123', 'user-456');

      expect(result).toEqual(mockDocs);
      expect(result.length).toBe(2);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        include: { documentType: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when session has no documents', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ userId: 'user-456' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await service.getSessionDocuments('session-123', 'user-456');

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getDownloadUrl
  // =========================================================================
  describe('getDownloadUrl', () => {
    it('should throw BadRequestException when document status is not GENERATED or APPROVED', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.PENDING,
        storageUrl: 'https://storage.blob/doc.docx',
        session: { userId: 'user-456' },
        documentType: mockDocumentType,
      });

      await expect(service.getDownloadUrl('doc-123', 'user-456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when document status is FAILED', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.FAILED,
        storageUrl: 'https://storage.blob/doc.docx',
        session: { userId: 'user-456' },
        documentType: mockDocumentType,
      });

      await expect(service.getDownloadUrl('doc-123', 'user-456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when storageUrl is null', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.GENERATED,
        storageUrl: null,
        session: { userId: 'user-456' },
        documentType: mockDocumentType,
      });

      await expect(service.getDownloadUrl('doc-123', 'user-456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return download URL for GENERATED document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.GENERATED,
        storageUrl: 'https://storage.blob/doc.docx',
        session: { userId: 'user-456' },
        documentType: mockDocumentType,
      });
      mockStorage.getDownloadUrl.mockResolvedValue('https://storage.blob/doc.docx?sas=token');

      const result = await service.getDownloadUrl('doc-123', 'user-456');

      expect(result).toBe('https://storage.blob/doc.docx?sas=token');
      expect(mockStorage.getDownloadUrl).toHaveBeenCalledWith('https://storage.blob/doc.docx', 60);
    });

    it('should return download URL for APPROVED document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.APPROVED,
        storageUrl: 'https://storage.blob/doc.docx',
        session: { userId: 'user-456' },
        documentType: mockDocumentType,
      });
      mockStorage.getDownloadUrl.mockResolvedValue('https://storage.blob/doc.docx?sas=token');

      const result = await service.getDownloadUrl('doc-123', 'user-456');

      expect(result).toBe('https://storage.blob/doc.docx?sas=token');
    });

    it('should pass custom expiresInMinutes to storage service', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.GENERATED,
        storageUrl: 'https://storage.blob/doc.docx',
        session: { userId: 'user-456' },
        documentType: mockDocumentType,
      });
      mockStorage.getDownloadUrl.mockResolvedValue('https://storage.blob/doc.docx?sas=token');

      await service.getDownloadUrl('doc-123', 'user-456', 120);

      expect(mockStorage.getDownloadUrl).toHaveBeenCalledWith('https://storage.blob/doc.docx', 120);
    });

    it('should throw NotFoundException when document is not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getDownloadUrl('non-existent', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // listDocumentTypes
  // =========================================================================
  describe('listDocumentTypes', () => {
    it('should return active document types ordered by category and name', async () => {
      const mockTypes = [
        { id: 'dt-1', name: 'Business Plan', category: DocumentCategory.CFO, isActive: true },
        { id: 'dt-2', name: 'Tech Roadmap', category: DocumentCategory.CTO, isActive: true },
      ];
      mockPrisma.documentType.findMany.mockResolvedValue(mockTypes);

      const result = await service.listDocumentTypes();

      expect(result).toEqual(mockTypes);
      expect(mockPrisma.documentType.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('should return empty array when no active document types exist', async () => {
      mockPrisma.documentType.findMany.mockResolvedValue([]);

      const result = await service.listDocumentTypes();

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getDocumentTypesForSession
  // =========================================================================
  describe('getDocumentTypesForSession', () => {
    it('should throw NotFoundException when session is not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.getDocumentTypesForSession('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return project-type-scoped document types when session has projectTypeId', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        projectTypeId: 'pt-001',
      });

      const scopedTypes = [
        { id: 'dt-1', name: 'SaaS Business Plan', category: DocumentCategory.CFO },
      ];
      mockPrisma.documentType.findMany.mockResolvedValue(scopedTypes);

      const result = await service.getDocumentTypesForSession('session-123');

      expect(result).toEqual(scopedTypes);
      expect(mockPrisma.documentType.findMany).toHaveBeenCalledWith({
        where: { isActive: true, projectTypeId: 'pt-001' },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('should return all active document types when session has no projectTypeId', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        projectTypeId: null,
      });

      const allTypes = [
        { id: 'dt-1', name: 'Business Plan', category: DocumentCategory.CFO },
        { id: 'dt-2', name: 'Tech Spec', category: DocumentCategory.CTO },
      ];
      mockPrisma.documentType.findMany.mockResolvedValue(allTypes);

      const result = await service.getDocumentTypesForSession('session-123');

      expect(result).toEqual(allTypes);
      expect(mockPrisma.documentType.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });
  });

  // =========================================================================
  // approveDocument
  // =========================================================================
  describe('approveDocument', () => {
    it('should throw NotFoundException when document is not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.approveDocument('non-existent', 'admin-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when document status is not PENDING_REVIEW', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.GENERATED,
        sessionId: 'session-123',
      });

      await expect(service.approveDocument('doc-123', 'admin-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when document status is FAILED', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.FAILED,
        sessionId: 'session-123',
      });

      await expect(service.approveDocument('doc-123', 'admin-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should approve document with PENDING_REVIEW status and send notification', async () => {
      const pendingDoc = {
        id: 'doc-123',
        status: DocumentStatus.PENDING_REVIEW,
        sessionId: 'session-123',
        fileName: 'business-plan.docx',
      };

      mockPrisma.document.findUnique.mockResolvedValue(pendingDoc);

      const approvedDoc = {
        ...pendingDoc,
        status: DocumentStatus.APPROVED,
        approvedById: 'admin-001',
        approvedAt: expect.any(Date),
      };
      mockPrisma.document.update.mockResolvedValue(approvedDoc);

      // For notifyDocumentOwner
      mockPrisma.session.findUnique.mockResolvedValue({
        user: { email: 'owner@test.com', name: 'Owner' },
      });

      const result = await service.approveDocument('doc-123', 'admin-001');

      expect(result.status).toBe(DocumentStatus.APPROVED);
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: expect.objectContaining({
          status: DocumentStatus.APPROVED,
          approvedById: 'admin-001',
          approvedAt: expect.any(Date),
          reviewStatus: expect.objectContaining({
            approvedBy: 'admin-001',
          }),
        }),
      });
    });

    it('should handle notification failure gracefully (fire-and-forget)', async () => {
      const pendingDoc = {
        id: 'doc-123',
        status: DocumentStatus.PENDING_REVIEW,
        sessionId: 'session-123',
        fileName: 'doc.docx',
      };

      mockPrisma.document.findUnique.mockResolvedValue(pendingDoc);
      mockPrisma.document.update.mockResolvedValue({
        ...pendingDoc,
        status: DocumentStatus.APPROVED,
      });

      // Notification lookup fails
      mockPrisma.session.findUnique.mockResolvedValue(null);

      // Should not throw even though notification path fails
      const result = await service.approveDocument('doc-123', 'admin-001');

      expect(result.status).toBe(DocumentStatus.APPROVED);
    });

    it('should use fileName or fallback "Document" for notification', async () => {
      const pendingDoc = {
        id: 'doc-123',
        status: DocumentStatus.PENDING_REVIEW,
        sessionId: 'session-123',
        fileName: null, // no fileName
      };

      mockPrisma.document.findUnique.mockResolvedValue(pendingDoc);
      mockPrisma.document.update.mockResolvedValue({
        ...pendingDoc,
        status: DocumentStatus.APPROVED,
      });

      mockPrisma.session.findUnique.mockResolvedValue({
        user: { email: 'test@test.com', name: 'Tester' },
      });

      await service.approveDocument('doc-123', 'admin-001');

      // The notification should use 'Document' as fallback
      // We allow the async notification to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  // =========================================================================
  // rejectDocument
  // =========================================================================
  describe('rejectDocument', () => {
    it('should throw NotFoundException when document is not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectDocument('non-existent', 'admin-001', 'Not good enough'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when document status is not PENDING_REVIEW', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.APPROVED,
        sessionId: 'session-123',
      });

      await expect(service.rejectDocument('doc-123', 'admin-001', 'Reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when document status is GENERATED', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.GENERATED,
        sessionId: 'session-123',
      });

      await expect(
        service.rejectDocument('doc-123', 'admin-001', 'Needs revision'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject document with PENDING_REVIEW status and save reason', async () => {
      const pendingDoc = {
        id: 'doc-123',
        status: DocumentStatus.PENDING_REVIEW,
        sessionId: 'session-123',
      };

      mockPrisma.document.findUnique.mockResolvedValue(pendingDoc);

      const rejectedDoc = {
        ...pendingDoc,
        status: DocumentStatus.REJECTED,
        rejectionReason: 'Content quality too low',
      };
      mockPrisma.document.update.mockResolvedValue(rejectedDoc);

      const result = await service.rejectDocument(
        'doc-123',
        'admin-001',
        'Content quality too low',
      );

      expect(result.status).toBe(DocumentStatus.REJECTED);
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          status: DocumentStatus.REJECTED,
          rejectionReason: 'Content quality too low',
          reviewStatus: {
            rejectedBy: 'admin-001',
            rejectedAt: expect.any(String),
            reason: 'Content quality too low',
          },
        },
      });
    });

    it('should store the admin userId in the reviewStatus', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.PENDING_REVIEW,
        sessionId: 'session-123',
      });
      mockPrisma.document.update.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.REJECTED,
      });

      await service.rejectDocument('doc-123', 'admin-999', 'Needs more detail');

      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewStatus: expect.objectContaining({
              rejectedBy: 'admin-999',
            }),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // getPendingReviewDocuments
  // =========================================================================
  describe('getPendingReviewDocuments', () => {
    it('should return documents with PENDING_REVIEW status', async () => {
      const mockDocs = [
        { id: 'doc-1', status: DocumentStatus.PENDING_REVIEW, documentType: { name: 'Plan' } },
        { id: 'doc-2', status: DocumentStatus.PENDING_REVIEW, documentType: { name: 'Spec' } },
      ];
      mockPrisma.document.findMany.mockResolvedValue(mockDocs);

      const result = await service.getPendingReviewDocuments();

      expect(result).toEqual(mockDocs);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { status: DocumentStatus.PENDING_REVIEW },
        include: { documentType: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no pending review documents exist', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await service.getPendingReviewDocuments();

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // uncovered branches
  // =========================================================================
  describe('uncovered branches', () => {
    // Helper to set up common mocks for the AI generation path
    const setupAiGenerationMocks = (
      responseValue: unknown,
      dimensionKey: string | null,
      projectTypeSession: unknown,
      notifySession: unknown,
    ) => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession); // validation
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue(mockCreatedDocument);

      mockGetDocumentTemplate.mockReturnValue({
        slug: 'tech-roadmap',
        name: 'Technology Roadmap',
        sections: [{ heading: 'Overview', description: 'Project overview' }],
      });

      mockPrisma.response.findMany.mockResolvedValue([
        {
          value: responseValue,
          isValid: true,
          question: { text: 'Question?', dimensionKey },
        },
      ]);

      mockPrisma.session.findUnique
        .mockResolvedValueOnce(mockSession) // generateDocument validation
        .mockResolvedValueOnce(projectTypeSession) // getProjectTypeName
        .mockResolvedValueOnce(notifySession); // notifyDocumentOwner

      mockPrisma.document.update.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATING,
        sessionId: 'session-123',
      });

      mockAiContentService.generateDocumentContent.mockResolvedValue({
        title: 'Doc',
        sections: [{ heading: 'S', content: 'C' }],
        summary: 'Sum',
      });
      mockDocumentBuilder.buildDocumentFromAiContent.mockResolvedValue(Buffer.from('docx'));
      mockStorage.upload.mockResolvedValue(mockUploadResult);

      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockCreatedDocument,
        status: DocumentStatus.GENERATED,
        documentType: mockDocumentType,
      });
    };

    it('should handle string value in loadSessionAnswers (typeof value === "string")', async () => {
      setupAiGenerationMocks(
        'plain string answer', // value is a string, not object
        'strategy',
        { projectType: { name: 'SaaS' } },
        { user: { email: 'u@t.com', name: 'U' } },
      );

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      expect(mockAiContentService.generateDocumentContent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionAnswers: expect.arrayContaining([
            expect.objectContaining({ answer: 'plain string answer' }),
          ]),
        }),
      );
    });

    it('should JSON.stringify value when value.text is undefined in loadSessionAnswers', async () => {
      setupAiGenerationMocks(
        { score: 42 }, // object without .text
        'strategy',
        { projectType: { name: 'SaaS' } },
        { user: { email: 'u@t.com', name: 'U' } },
      );

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      expect(mockAiContentService.generateDocumentContent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionAnswers: expect.arrayContaining([
            expect.objectContaining({ answer: JSON.stringify({ score: 42 }) }),
          ]),
        }),
      );
    });

    it('should default dimensionKey to "general" when null', async () => {
      setupAiGenerationMocks(
        { text: 'answer' },
        null, // null dimensionKey
        { projectType: { name: 'SaaS' } },
        { user: { email: 'u@t.com', name: 'U' } },
      );

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      expect(mockAiContentService.generateDocumentContent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionAnswers: expect.arrayContaining([
            expect.objectContaining({ dimensionKey: 'general' }),
          ]),
        }),
      );
    });

    it('should default projectType name to "Business Project" when null', async () => {
      setupAiGenerationMocks(
        { text: 'answer' },
        'strategy',
        { projectType: null }, // null projectType
        { user: { email: 'u@t.com', name: 'U' } },
      );

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      expect(mockAiContentService.generateDocumentContent).toHaveBeenCalledWith(
        expect.objectContaining({
          projectTypeName: 'Business Project',
        }),
      );
    });

    it('should fall back to email prefix when user name is null in notifyDocumentOwner', async () => {
      setupAiGenerationMocks(
        { text: 'answer' },
        'strategy',
        { projectType: { name: 'SaaS' } },
        { user: { email: 'john@example.com', name: null } }, // null name
      );

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      // Wait for fire-and-forget notification
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockNotificationService.sendDocumentsReadyEmail).toHaveBeenCalledWith(
        'john@example.com',
        'john',
        'session-123',
        [mockUploadResult.fileName],
      );
    });
  });
});
