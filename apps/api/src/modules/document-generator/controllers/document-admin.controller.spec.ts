/**
 * @fileoverview Tests for DocumentAdminController
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentAdminController } from './document-admin.controller';
import { DocumentGeneratorService } from '../services/document-generator.service';
import { PrismaService } from '@libs/database';
import { DocumentCategory, DocumentStatus } from '@prisma/client';

describe('DocumentAdminController', () => {
  let controller: DocumentAdminController;
  let prismaService: any;
  let documentGeneratorService: any;

  const mockUser = { id: 'user-1', email: 'admin@example.com', role: 'ADMIN' };

  const mockDocumentType = {
    id: 'doc-type-1',
    name: 'Business Requirements',
    slug: 'business-requirements',
    description: 'Business requirements document',
    category: DocumentCategory.BA,
    templatePath: '/templates/business-req.hbs',
    requiredQuestions: [],
    outputFormats: ['DOCX', 'PDF'],
    estimatedPages: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocument = {
    id: 'doc-1',
    sessionId: 'session-1',
    documentTypeId: 'doc-type-1',
    status: DocumentStatus.PENDING_REVIEW,
    format: 'PDF',
    fileName: 'document.pdf',
    fileSize: 1024n,
    version: 1,
    generatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
    rejectionReason: null,
    documentType: mockDocumentType,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      documentType: {
        findMany: jest.fn().mockResolvedValue([mockDocumentType]),
        findUnique: jest.fn().mockResolvedValue(mockDocumentType),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockDocumentType),
        update: jest.fn().mockResolvedValue(mockDocumentType),
      },
    };

    const mockDocumentGeneratorService = {
      getPendingReviewDocuments: jest.fn().mockResolvedValue([mockDocument]),
      approveDocument: jest.fn().mockResolvedValue({
        ...mockDocument,
        status: DocumentStatus.APPROVED,
        approvedAt: new Date(),
      }),
      rejectDocument: jest.fn().mockResolvedValue({
        ...mockDocument,
        status: DocumentStatus.REJECTED,
        rejectionReason: 'Not complete',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentAdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DocumentGeneratorService, useValue: mockDocumentGeneratorService },
      ],
    }).compile();

    controller = module.get<DocumentAdminController>(DocumentAdminController);
    prismaService = module.get(PrismaService);
    documentGeneratorService = module.get(DocumentGeneratorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listDocumentTypes', () => {
    it('should return paginated document types', async () => {
      const pagination = { page: 1, limit: 20, skip: 0 };
      const result = await controller.listDocumentTypes(pagination);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(prismaService.documentType.findMany).toHaveBeenCalled();
    });
  });

  describe('getDocumentType', () => {
    it('should return document type details', async () => {
      const result = await controller.getDocumentType('doc-type-1');

      expect(result).toEqual(mockDocumentType);
      expect(prismaService.documentType.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-type-1' },
        include: expect.any(Object),
      });
    });

    it('should throw error if document type not found', async () => {
      prismaService.documentType.findUnique.mockResolvedValue(null);

      await expect(controller.getDocumentType('invalid-id')).rejects.toThrow(
        'Document type with ID invalid-id not found',
      );
    });
  });

  describe('createDocumentType', () => {
    it('should create document type', async () => {
      const dto = {
        name: 'New Document',
        slug: 'new-document',
        description: 'New doc description',
        category: DocumentCategory.CTO,
        templatePath: '/templates/new.hbs',
        outputFormats: ['PDF'],
        estimatedPages: 5,
        isActive: true,
      };

      const result = await controller.createDocumentType(dto);

      expect(prismaService.documentType.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('updateDocumentType', () => {
    it('should update document type', async () => {
      const dto = {
        name: 'Updated Name',
        isActive: false,
      };

      const result = await controller.updateDocumentType('doc-type-1', dto);

      expect(prismaService.documentType.update).toHaveBeenCalledWith({
        where: { id: 'doc-type-1' },
        data: expect.objectContaining({ name: 'Updated Name' }),
      });
      expect(result).toBeDefined();
    });
  });

  describe('getPendingReviewDocuments', () => {
    it('should return documents pending review', async () => {
      const result = await controller.getPendingReviewDocuments();

      expect(documentGeneratorService.getPendingReviewDocuments).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DocumentStatus.PENDING_REVIEW);
    });
  });

  describe('approveDocument', () => {
    it('should approve document', async () => {
      const result = await controller.approveDocument('doc-1', mockUser as any);

      expect(documentGeneratorService.approveDocument).toHaveBeenCalledWith('doc-1', 'user-1');
      expect(result.message).toBe('Document approved successfully');
      expect(result.document.status).toBe(DocumentStatus.APPROVED);
    });
  });

  describe('rejectDocument', () => {
    it('should reject document with reason', async () => {
      const dto = { reason: 'Not complete' };
      const result = await controller.rejectDocument('doc-1', dto, mockUser as any);

      expect(documentGeneratorService.rejectDocument).toHaveBeenCalledWith(
        'doc-1',
        'user-1',
        'Not complete',
      );
      expect(result.message).toBe('Document rejected');
      expect(result.document.rejectionReason).toBe('Not complete');
    });
  });
});
