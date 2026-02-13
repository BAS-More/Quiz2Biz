import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StandardsService } from './standards.service';
import { PrismaService } from '@libs/database';
import { StandardCategory } from '@prisma/client';

describe('StandardsService', () => {
  let service: StandardsService;
  let prismaService: any; // Use any for mocked service

  const mockStandard = {
    id: 'standard-1',
    category: 'MODERN_ARCHITECTURE' as StandardCategory,
    title: 'Modern Architecture & Design',
    description: 'Architectural principles for building scalable systems.',
    principles: [
      {
        title: 'Modular Monoliths',
        description: 'Favor right-sized services determined by business boundaries.',
      },
      {
        title: 'Cloud-Native Foundations',
        description: 'Use IaC and containers for reproducible environments.',
      },
    ],
    version: '2026',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocumentType = {
    id: 'doc-type-1',
    name: 'Product Architecture',
    slug: 'product-architecture',
    category: 'CTO',
    standardMappings: [
      {
        id: 'mapping-1',
        documentTypeId: 'doc-type-1',
        standardId: 'standard-1',
        priority: 0,
        sectionTitle: null,
        standard: mockStandard,
      },
    ],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      engineeringStandard: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      documentType: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StandardsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<StandardsService>(StandardsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all active standards', async () => {
      prismaService.engineeringStandard.findMany.mockResolvedValue([mockStandard]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('MODERN_ARCHITECTURE');
      expect(prismaService.engineeringStandard.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { category: 'asc' },
      });
    });

    it('should return empty array when no standards exist', async () => {
      prismaService.engineeringStandard.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findByCategory', () => {
    it('should return standard for valid category', async () => {
      prismaService.engineeringStandard.findUnique.mockResolvedValue(mockStandard);

      const result = await service.findByCategory('MODERN_ARCHITECTURE' as StandardCategory);

      expect(result.id).toBe('standard-1');
      expect(result.title).toBe('Modern Architecture & Design');
      expect(result.principles).toHaveLength(2);
    });

    it('should throw NotFoundException for invalid category', async () => {
      prismaService.engineeringStandard.findUnique.mockResolvedValue(null);

      await expect(service.findByCategory('INVALID_CATEGORY' as StandardCategory)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findWithMappings', () => {
    it('should return standard with document type mappings', async () => {
      const standardWithMappings = {
        ...mockStandard,
        documentMappings: [
          {
            id: 'mapping-1',
            priority: 0,
            sectionTitle: 'Architecture Standards',
            documentType: {
              id: 'doc-type-1',
              name: 'Product Architecture',
              slug: 'product-architecture',
            },
          },
        ],
      };
      prismaService.engineeringStandard.findUnique.mockResolvedValue(standardWithMappings as any);

      const result = await service.findWithMappings('MODERN_ARCHITECTURE' as StandardCategory);

      expect(result.documentTypes).toHaveLength(1);
      expect(result.documentTypes[0].slug).toBe('product-architecture');
      expect(result.documentTypes[0].sectionTitle).toBe('Architecture Standards');
    });

    it('should handle null sectionTitle', async () => {
      const standardWithMappings = {
        ...mockStandard,
        documentMappings: [
          {
            id: 'mapping-1',
            priority: 0,
            sectionTitle: null,
            documentType: {
              id: 'doc-type-1',
              name: 'Product Architecture',
              slug: 'product-architecture',
            },
          },
        ],
      };
      prismaService.engineeringStandard.findUnique.mockResolvedValue(standardWithMappings as any);

      const result = await service.findWithMappings('MODERN_ARCHITECTURE' as StandardCategory);

      expect(result.documentTypes[0].sectionTitle).toBeUndefined();
    });
  });

  describe('getStandardsForDocument', () => {
    it('should return standards mapped to document type by ID', async () => {
      prismaService.documentType.findFirst.mockResolvedValue(mockDocumentType as any);

      const result = await service.getStandardsForDocument('doc-type-1');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('MODERN_ARCHITECTURE');
    });

    it('should return standards mapped to document type by slug', async () => {
      prismaService.documentType.findFirst.mockResolvedValue(mockDocumentType as any);

      const result = await service.getStandardsForDocument('product-architecture');

      expect(result).toHaveLength(1);
      expect(prismaService.documentType.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ id: 'product-architecture' }, { slug: 'product-architecture' }],
          },
        }),
      );
    });

    it('should throw NotFoundException for invalid document type', async () => {
      prismaService.documentType.findFirst.mockResolvedValue(null);

      await expect(service.getStandardsForDocument('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array when document has no standards', async () => {
      const docTypeNoStandards = {
        ...mockDocumentType,
        standardMappings: [],
      };
      prismaService.documentType.findFirst.mockResolvedValue(docTypeNoStandards as any);

      const result = await service.getStandardsForDocument('doc-type-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('generateStandardsSection', () => {
    it('should generate markdown section for document type', async () => {
      prismaService.documentType.findFirst.mockResolvedValue(mockDocumentType as any);

      const result = await service.generateStandardsSection('product-architecture');

      expect(result.markdown).toContain('## Engineering Standards Applied');
      expect(result.markdown).toContain('Modern Architecture & Design');
      expect(result.markdown).toContain('**Modular Monoliths**');
      expect(result.standards).toHaveLength(1);
    });

    it('should return empty markdown when no standards are mapped', async () => {
      const docTypeNoStandards = {
        ...mockDocumentType,
        standardMappings: [],
      };
      prismaService.documentType.findFirst.mockResolvedValue(docTypeNoStandards as any);

      const result = await service.generateStandardsSection('doc-type-1');

      expect(result.markdown).toBe('');
      expect(result.standards).toHaveLength(0);
    });

    it('should use custom section title when provided', async () => {
      const docTypeWithCustomTitle = {
        ...mockDocumentType,
        standardMappings: [
          {
            ...mockDocumentType.standardMappings[0],
            sectionTitle: 'Custom Architecture Guidelines',
          },
        ],
      };
      prismaService.documentType.findFirst.mockResolvedValue(docTypeWithCustomTitle as any);

      const result = await service.generateStandardsSection('doc-type-1');

      expect(result.markdown).toContain('Custom Architecture Guidelines');
      expect(result.standards[0].title).toBe('Custom Architecture Guidelines');
    });

    it('should throw NotFoundException for invalid document type', async () => {
      prismaService.documentType.findFirst.mockResolvedValue(null);

      await expect(service.generateStandardsSection('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include version in markdown output', async () => {
      prismaService.documentType.findFirst.mockResolvedValue(mockDocumentType as any);

      const result = await service.generateStandardsSection('product-architecture');

      expect(result.markdown).toContain('Standards Version: 2026');
    });

    it('should format multiple principles correctly', async () => {
      prismaService.documentType.findFirst.mockResolvedValue(mockDocumentType as any);

      const result = await service.generateStandardsSection('product-architecture');

      // Check both principles are included
      expect(result.markdown).toContain('Modular Monoliths');
      expect(result.markdown).toContain('Cloud-Native Foundations');
    });
  });

  describe('mapToResponse', () => {
    it('should correctly map standard entity to response', async () => {
      prismaService.engineeringStandard.findUnique.mockResolvedValue(mockStandard);

      const result = await service.findByCategory('MODERN_ARCHITECTURE' as StandardCategory);

      expect(result).toEqual({
        id: 'standard-1',
        category: 'MODERN_ARCHITECTURE',
        title: 'Modern Architecture & Design',
        description: 'Architectural principles for building scalable systems.',
        principles: [
          {
            title: 'Modular Monoliths',
            description: 'Favor right-sized services determined by business boundaries.',
          },
          {
            title: 'Cloud-Native Foundations',
            description: 'Use IaC and containers for reproducible environments.',
          },
        ],
        version: '2026',
        isActive: true,
      });
    });
  });
});
