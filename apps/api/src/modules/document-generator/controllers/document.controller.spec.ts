import { Test, TestingModule } from '@nestjs/testing';
import { DocumentController } from './document.controller';
import { DocumentGeneratorService } from '../services/document-generator.service';

// Skip full compile test since controller has type issues
// Test the core functionality with mocks
describe('DocumentController', () => {
  let controller: DocumentController;
  let documentService: any;
  let module: TestingModule;

  const mockDocumentService = {
    generateDocument: jest.fn(),
    listDocumentTypes: jest.fn(),
    getSessionDocuments: jest.fn(),
    getDocument: jest.fn(),
    getDownloadUrl: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
    organizationId: 'org-456',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [{ provide: DocumentGeneratorService, useValue: mockDocumentService }],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
    documentService = module.get(DocumentGeneratorService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('generateDocument', () => {
    it('should start document generation', async () => {
      const dto = {
        sessionId: 'session-123',
        documentTypeId: 'doctype-456',
      };

      const mockDocument = {
        id: 'doc-789',
        sessionId: 'session-123',
        documentTypeId: 'doctype-456',
        status: 'PENDING',
        format: 'PDF',
        fileName: null,
        fileSize: null,
        version: 1,
        generatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDocumentService.generateDocument.mockResolvedValue(mockDocument);

      const result = await controller.generateDocument(dto, mockUser as any);

      expect(result.id).toBe('doc-789');
      expect(result.status).toBe('PENDING');
      expect(mockDocumentService.generateDocument).toHaveBeenCalledWith({
        sessionId: 'session-123',
        documentTypeId: 'doctype-456',
        userId: 'user-123',
      });
    });
  });

  describe('getSessionDocuments', () => {
    it('should list documents for a session', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          sessionId: 'session-123',
          documentTypeId: 'type-1',
          status: 'COMPLETED',
          format: 'PDF',
          fileName: 'security-report.pdf',
          fileSize: BigInt(1024000),
          version: 1,
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDocumentService.getSessionDocuments.mockResolvedValue(mockDocuments);

      const result = await controller.getSessionDocuments('session-123', mockUser as any);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('COMPLETED');
      expect(mockDocumentService.getSessionDocuments).toHaveBeenCalledWith('session-123', 'user-123');
    });
  });

  describe('getDocument', () => {
    it('should get document by ID', async () => {
      const mockDocument = {
        id: 'doc-123',
        sessionId: 'session-456',
        documentTypeId: 'type-789',
        status: 'COMPLETED',
        format: 'PDF',
        fileName: 'report.pdf',
        fileSize: BigInt(512000),
        version: 2,
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        documentType: {
          id: 'type-789',
          name: 'Security Report',
          slug: 'security-report',
          description: 'Security evaluation report',
          category: 'COMPLIANCE',
          estimatedPages: 30,
          isActive: true,
        },
      };

      mockDocumentService.getDocument.mockResolvedValue(mockDocument);

      const result = await controller.getDocument('doc-123', mockUser as any);

      expect(result.id).toBe('doc-123');
      expect(result.documentType?.name).toBe('Security Report');
      expect(mockDocumentService.getDocument).toHaveBeenCalledWith('doc-123', 'user-123');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate secure download URL', async () => {
      mockDocumentService.getDownloadUrl.mockResolvedValue(
        'https://storage.blob.core/doc.pdf?token=xyz',
      );

      const result = await controller.getDownloadUrl('doc-123', '30', mockUser as any);

      expect(result.url).toContain('storage.blob');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockDocumentService.getDownloadUrl).toHaveBeenCalledWith('doc-123', 'user-123', 30);
    });
  });
});
