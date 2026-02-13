import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentGeneratorService } from './document-generator.service';
import { PrismaService } from '@libs/database';
import { TemplateEngineService } from './template-engine.service';
import { DocumentBuilderService } from './document-builder.service';
import { StorageService } from './storage.service';
import { SessionStatus, DocumentStatus } from '@prisma/client';

describe('DocumentGeneratorService', () => {
  let service: DocumentGeneratorService;
  let prisma: PrismaService;
  let templateEngine: TemplateEngineService;
  let documentBuilder: DocumentBuilderService;
  let storage: StorageService;

  const mockPrisma = {
    session: {
      findUnique: jest.fn(),
    },
    documentType: {
      findUnique: jest.fn(),
    },
    response: {
      findMany: jest.fn(),
    },
    document: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockTemplateEngine = {
    assembleTemplateData: jest.fn(),
  };

  const mockDocumentBuilder = {
    buildDocument: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
  };

  const mockSession = {
    id: 'session-123',
    userId: 'user-456',
    status: SessionStatus.COMPLETED,
    readinessScore: 85.5,
    user: { id: 'user-456' },
    questionnaire: { name: 'Business Incubator Assessment' },
  };

  const mockDocumentType = {
    id: 'doc-type-789',
    name: 'Technology Roadmap',
    slug: 'tech-roadmap',
    category: 'ARCHITECTURE',
    isActive: true,
    requiredQuestions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentGeneratorService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: TemplateEngineService,
          useValue: mockTemplateEngine,
        },
        {
          provide: DocumentBuilderService,
          useValue: mockDocumentBuilder,
        },
        {
          provide: StorageService,
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<DocumentGeneratorService>(DocumentGeneratorService);
    prisma = module.get<PrismaService>(PrismaService);
    templateEngine = module.get<TemplateEngineService>(TemplateEngineService);
    documentBuilder = module.get<DocumentBuilderService>(DocumentBuilderService);
    storage = module.get<StorageService>(StorageService);

    jest.clearAllMocks();
  });

  describe('generateDocument', () => {
    it('generates document for completed session', async () => {
      const mockDocument = {
        id: 'doc-123',
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        status: DocumentStatus.PENDING,
        format: 'DOCX',
        version: 1,
      };

      const mockGeneratedDoc = {
        ...mockDocument,
        status: DocumentStatus.GENERATED,
        storageUrl: 'https://storage.blob/documents/tech-roadmap-doc-123.docx',
        fileName: 'tech-roadmap-doc-123.docx',
        fileSize: BigInt(1024000),
        generatedAt: new Date(),
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue(mockGeneratedDoc);
      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockGeneratedDoc,
        documentType: mockDocumentType,
      });

      mockTemplateEngine.assembleTemplateData.mockResolvedValue({
        metadata: { version: '1.0' },
      });
      mockDocumentBuilder.buildDocument.mockResolvedValue(Buffer.from('docx content'));
      mockStorage.upload.mockResolvedValue({
        url: 'https://storage.blob/documents/tech-roadmap-doc-123.docx',
        fileName: 'tech-roadmap-doc-123.docx',
        fileSize: 1024000,
      });

      const result = await service.generateDocument({
        sessionId: 'session-123',
        documentTypeId: 'doc-type-789',
        userId: 'user-456',
      });

      expect(result.status).toBe(DocumentStatus.GENERATED);
      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          status: DocumentStatus.PENDING,
          format: 'DOCX',
          version: 1,
        },
      });
      expect(mockTemplateEngine.assembleTemplateData).toHaveBeenCalled();
      expect(mockDocumentBuilder.buildDocument).toHaveBeenCalled();
      expect(mockStorage.upload).toHaveBeenCalled();
    });

    it('throws NotFoundException for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDocument({
          sessionId: 'non-existent',
          documentTypeId: 'doc-type-789',
          userId: 'user-456',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-completed session', async () => {
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

    it('throws BadRequestException when user does not own session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'doc-type-789',
          userId: 'different-user',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for non-existent document type', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDocument({
          sessionId: 'session-123',
          documentTypeId: 'non-existent',
          userId: 'user-456',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for inactive document type', async () => {
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

    it('validates required questions are answered', async () => {
      const docTypeWithRequiredQuestions = {
        ...mockDocumentType,
        requiredQuestions: ['q1', 'q2', 'q3'],
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(docTypeWithRequiredQuestions);
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

    it('marks document as FAILED when generation fails', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.documentType.findUnique.mockResolvedValue(mockDocumentType);
      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-123',
        status: DocumentStatus.PENDING,
      });
      mockPrisma.document.update.mockResolvedValue({
        id: 'doc-123',
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
        where: { id: 'doc-123' },
        data: expect.objectContaining({
          status: DocumentStatus.FAILED,
          generationMetadata: expect.objectContaining({
            error: 'Template assembly failed',
          }),
        }),
      });
    });
  });

  describe('getDocument', () => {
    it('retrieves document by ID', async () => {
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

    it('throws NotFoundException for non-existent document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getDocument('non-existent', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when user does not own document', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        session: { userId: 'different-user' },
      });

      await expect(service.getDocument('doc-123', 'user-456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSessionDocuments', () => {
    it('lists documents for a session', async () => {
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

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.document.findMany.mockResolvedValue(mockDocs);

      const result = await service.getSessionDocuments('session-123', 'user-456');

      expect(result).toEqual(mockDocs);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        include: { documentType: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
