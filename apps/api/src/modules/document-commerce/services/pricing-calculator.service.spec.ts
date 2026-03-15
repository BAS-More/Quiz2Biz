/**
 * Pricing Calculator Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PricingCalculatorService } from './pricing-calculator.service';
import { PrismaService } from '@libs/database';
import { Prisma } from '@prisma/client';

describe('PricingCalculatorService', () => {
  let service: PricingCalculatorService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    projectType: { id: 'pt-1', slug: 'business-plan', name: 'Business Plan' },
    qualityScore: new Prisma.Decimal(75),
    _count: { extractedFacts: 12 },
  };

  const mockDocumentType = {
    id: 'dt-1',
    slug: 'business-plan',
    name: 'Business Plan',
    description: 'Complete business plan document',
    category: 'CTO',
    basePrice: new Prisma.Decimal(49.99),
    isActive: true,
    sortOrder: 1,
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      documentType: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      documentPurchase: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingCalculatorService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PricingCalculatorService>(PricingCalculatorService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePrice', () => {
    it('should calculate Basic (1x) price at quality level 0', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);

      const result = await service.calculatePrice({
        projectId: 'project-1',
        documentTypeSlug: 'business-plan',
        qualityLevel: 0,
      });

      expect(result.basePrice).toBe(49.99);
      expect(result.qualityMultiplier).toBe(1);
      expect(result.finalPrice).toBe(49.99);
      expect(result.currency).toBe('USD');
      expect(result.estimatedPages).toBe(8);
    });

    it('should calculate Standard (2x) price at quality level 1', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);

      const result = await service.calculatePrice({
        projectId: 'project-1',
        documentTypeSlug: 'business-plan',
        qualityLevel: 1,
      });

      expect(result.qualityMultiplier).toBe(2);
      expect(result.finalPrice).toBe(99.98);
      expect(result.estimatedPages).toBe(12);
    });

    it('should calculate Enterprise (5x) price at quality level 4', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);

      const result = await service.calculatePrice({
        projectId: 'project-1',
        documentTypeSlug: 'business-plan',
        qualityLevel: 4,
      });

      expect(result.qualityMultiplier).toBe(5);
      expect(result.finalPrice).toBe(249.95);
      expect(result.estimatedPages).toBe(50);
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.calculatePrice({
          projectId: 'missing',
          documentTypeSlug: 'business-plan',
          qualityLevel: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when document type not found', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(null);

      await expect(
        service.calculatePrice({
          projectId: 'project-1',
          documentTypeSlug: 'unknown-doc',
          qualityLevel: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid quality level', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);

      await expect(
        service.calculatePrice({
          projectId: 'project-1',
          documentTypeSlug: 'business-plan',
          qualityLevel: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative quality level', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);

      await expect(
        service.calculatePrice({
          projectId: 'project-1',
          documentTypeSlug: 'business-plan',
          qualityLevel: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default base price when document type has null basePrice', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue({
        ...mockDocumentType,
        basePrice: null,
      } as never);

      const result = await service.calculatePrice({
        projectId: 'project-1',
        documentTypeSlug: 'business-plan',
        qualityLevel: 0,
      });

      expect(result.basePrice).toBe(49.99);
    });

    it('should include quality features in response', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);

      const result = await service.calculatePrice({
        projectId: 'project-1',
        documentTypeSlug: 'business-plan',
        qualityLevel: 3,
      });

      expect(result.features).toContain('Premium content');
      expect(result.features.length).toBeGreaterThan(0);
    });
  });

  describe('getQualityLevelName', () => {
    it('should return correct names for all levels', () => {
      expect(service.getQualityLevelName(0)).toBe('Basic');
      expect(service.getQualityLevelName(1)).toBe('Standard');
      expect(service.getQualityLevelName(2)).toBe('Enhanced');
      expect(service.getQualityLevelName(3)).toBe('Premium');
      expect(service.getQualityLevelName(4)).toBe('Enterprise');
    });

    it('should return Basic for unknown level', () => {
      expect(service.getQualityLevelName(99)).toBe('Basic');
    });
  });

  describe('getQualityFeatures', () => {
    it('should return features for each level', () => {
      expect(service.getQualityFeatures(0)).toContain('Basic content');
      expect(service.getQualityFeatures(4)).toContain('Enterprise content');
    });

    it('should return Basic features for unknown level', () => {
      expect(service.getQualityFeatures(99)).toContain('Basic content');
    });
  });
});
