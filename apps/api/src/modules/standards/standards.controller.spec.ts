import { Test, TestingModule } from '@nestjs/testing';
import { StandardsController } from './standards.controller';
import { StandardsService } from './standards.service';
import { StandardCategory } from '@prisma/client';

describe('StandardsController', () => {
  let controller: StandardsController;

  const mockStandardsService = {
    findAll: jest.fn(),
    findWithMappings: jest.fn(),
    getStandardsForDocument: jest.fn(),
    generateStandardsSection: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StandardsController],
      providers: [{ provide: StandardsService, useValue: mockStandardsService }],
    }).compile();

    controller = module.get<StandardsController>(StandardsController);
    module.get(StandardsService);
  });

  describe('findAll', () => {
    it('should return all standards', async () => {
      const mockStandards = [
        { id: '1', name: 'ISO 27001', category: 'SECURITY' },
        { id: '2', name: 'GDPR', category: 'PRIVACY' },
      ];
      mockStandardsService.findAll.mockResolvedValue(mockStandards);

      const result = await controller.findAll();

      expect(result).toEqual(mockStandards);
      expect(mockStandardsService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no standards exist', async () => {
      mockStandardsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByCategory', () => {
    it('should return standard by category', async () => {
      const mockStandard = {
        id: '1',
        name: 'ISO 27001',
        category: 'SECURITY',
        mappings: [],
      };
      mockStandardsService.findWithMappings.mockResolvedValue(mockStandard);

      const result = await controller.findByCategory(StandardCategory.SECURITY_DEVSECOPS);

      expect(result).toEqual(mockStandard);
      expect(mockStandardsService.findWithMappings).toHaveBeenCalledWith(
        StandardCategory.SECURITY_DEVSECOPS,
      );
    });

    it('should handle category not found', async () => {
      mockStandardsService.findWithMappings.mockRejectedValue(new Error('Not found'));

      await expect(controller.findByCategory(StandardCategory.MODERN_ARCHITECTURE)).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('getStandardsForDocument', () => {
    it('should return standards for document type', async () => {
      const mockStandards = [{ id: '1', name: 'ISO 27001', category: 'SECURITY' }];
      mockStandardsService.getStandardsForDocument.mockResolvedValue(mockStandards);

      const result = await controller.getStandardsForDocument('doc-123');

      expect(result).toEqual(mockStandards);
      expect(mockStandardsService.getStandardsForDocument).toHaveBeenCalledWith('doc-123');
    });

    it('should handle document type not found', async () => {
      mockStandardsService.getStandardsForDocument.mockRejectedValue(
        new Error('Document type not found'),
      );

      await expect(controller.getStandardsForDocument('invalid-doc')).rejects.toThrow(
        'Document type not found',
      );
    });
  });

  describe('generateStandardsSection', () => {
    it('should generate standards section for document', async () => {
      const mockSection = {
        markdown: '## Standards Section\n\n- ISO 27001',
        standards: [{ id: '1', name: 'ISO 27001' }],
      };
      mockStandardsService.generateStandardsSection.mockResolvedValue(mockSection);

      const result = await controller.generateStandardsSection('doc-123');

      expect(result).toEqual(mockSection);
      expect(mockStandardsService.generateStandardsSection).toHaveBeenCalledWith('doc-123');
    });

    it('should handle document type not found', async () => {
      mockStandardsService.generateStandardsSection.mockRejectedValue(
        new Error('Document type not found'),
      );

      await expect(controller.generateStandardsSection('invalid-doc')).rejects.toThrow(
        'Document type not found',
      );
    });
  });
});
