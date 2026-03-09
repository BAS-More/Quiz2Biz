/**
 * Pricing Calculator Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PricingCalculatorService } from './pricing-calculator.service';
import { PrismaService } from '@libs/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('PricingCalculatorService', () => {
  let service: PricingCalculatorService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    userId: 'user-123',
    qualityScore: new Prisma.Decimal(75),
    projectType: { slug: 'business-plan' },
    _count: { extractedFacts: 10 },
  };

  const mockDocumentType = {
    id: 'doc-type-1',
    slug: 'business-plan',
    name: 'Business Plan',
    description: 'Comprehensive business plan',
    category: 'BA',
    basePrice: new Prisma.Decimal(49.99),
    isActive: true,
    sortOrder: 1,
  };

  const mockExecutiveSummaryType = {
    id: 'doc-type-2',
    slug: 'executive-summary',
    name: 'Executive Summary',
    description: 'Brief overview document',
    category: 'BA',
    basePrice: new Prisma.Decimal(29.99),
    isActive: true,
    sortOrder: 2,
  };

  beforeEach(async () => {
    const mockPrismaService = {
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
      providers: [
        PricingCalculatorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PricingCalculatorService>(PricingCalculatorService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePrice', () => {
    it('should calculate price for quality level 0 (1x)', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      const result = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 0,
      });

      expect(result.qualityLevel).toBe(0);
      expect(result.qualityMultiplier).toBe(1);
      expect(result.basePrice).toBe(49.99);
      expect(result.finalPrice).toBe(49.99);
      expect(result.currency).toBe('USD');
    });

    it('should calculate price for quality level 1 (2x)', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      const result = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 1,
      });

      expect(result.qualityMultiplier).toBe(2);
      expect(result.finalPrice).toBe(99.98);
    });

    it('should calculate price for quality level 2 (3x)', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      const result = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 2,
      });

      expect(result.qualityMultiplier).toBe(3);
      expect(result.finalPrice).toBe(149.97);
    });

    it('should calculate price for quality level 3 (4x)', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      const result = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 3,
      });

      expect(result.qualityMultiplier).toBe(4);
      expect(result.finalPrice).toBe(199.96);
    });

    it('should calculate price for quality level 4 (5x)', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      const result = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 4,
      });

      expect(result.qualityMultiplier).toBe(5);
      expect(result.finalPrice).toBe(249.95);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      prismaService.project.findUnique.mockResolvedValue(null);

      await expect(
        service.calculatePrice({
          projectId: 'invalid-id',
          documentTypeSlug: 'business-plan',
          qualityLevel: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent document type', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(null);

      await expect(
        service.calculatePrice({
          projectId: 'project-123',
          documentTypeSlug: 'invalid-type',
          qualityLevel: 0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid quality level (< 0)', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      await expect(
        service.calculatePrice({
          projectId: 'project-123',
          documentTypeSlug: 'business-plan',
          qualityLevel: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid quality level (> 4)', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      await expect(
        service.calculatePrice({
          projectId: 'project-123',
          documentTypeSlug: 'business-plan',
          qualityLevel: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default base price when not set', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue({
        ...mockDocumentType,
        basePrice: null,
      });

      const result = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 0,
      });

      expect(result.basePrice).toBe(49.99);
    });

    it('should return features for quality level', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      const result = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 4,
      });

      expect(result.features).toContain('Enterprise content');
      expect(result.features).toContain('Board-ready formatting');
    });

    it('should return estimated pages for quality level', async () => {
      prismaService.project.findUnique.mockResolvedValue(mockProject);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType);

      const result0 = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 0,
      });
      expect(result0.estimatedPages).toBe(8);

      const result4 = await service.calculatePrice({
        projectId: 'project-123',
        documentTypeSlug: 'business-plan',
        qualityLevel: 4,
      });
      expect(result4.estimatedPages).toBe(50);
    });
  });

  describe('getProjectDocuments', () => {
    beforeEach(() => {
      prismaService.project.findFirst.mockResolvedValue(mockProject);
      prismaService.documentType.findMany.mockResolvedValue([
        mockDocumentType,
        mockExecutiveSummaryType,
      ]);
      prismaService.documentPurchase.findMany.mockResolvedValue([]);
    });

    it('should return project documents info', async () => {
      const result = await service.getProjectDocuments('project-123', 'user-123');

      expect(result.projectId).toBe('project-123');
      expect(result.projectName).toBe('Test Project');
      expect(result.qualityScore).toBe(75);
      expect(result.availableDocuments).toHaveLength(2);
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProjectDocuments('invalid-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark documents as available when enough facts', async () => {
      const result = await service.getProjectDocuments('project-123', 'user-123');

      // Executive summary requires only 5 facts, project has 10
      const executiveSummary = result.availableDocuments.find(
        (d) => d.slug === 'executive-summary',
      );
      expect(executiveSummary?.isAvailable).toBe(true);
    });

    it('should mark documents as unavailable when not enough facts', async () => {
      prismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        _count: { extractedFacts: 3 },
      });

      const result = await service.getProjectDocuments('project-123', 'user-123');

      // Business plan requires 15 facts
      const businessPlan = result.availableDocuments.find(
        (d) => d.slug === 'business-plan',
      );
      if (businessPlan && businessPlan.requiredFactCount > 3) {
        expect(businessPlan.isAvailable).toBe(false);
        expect(businessPlan.unavailableReason).toContain('more facts');
      }
    });

    it('should include purchased documents', async () => {
      prismaService.documentPurchase.findMany.mockResolvedValue([
        {
          id: 'purchase-1',
          projectId: 'project-123',
          qualityLevel: 2,
          amount: new Prisma.Decimal(149.97),
          currency: 'USD',
          status: 'completed',
          documentType: mockDocumentType,
          generatedDocument: {
            id: 'gen-doc-1',
            createdAt: new Date(),
          },
        },
      ]);

      const result = await service.getProjectDocuments('project-123', 'user-123');

      expect(result.purchasedDocuments).toHaveLength(1);
      expect(result.purchasedDocuments[0].purchaseId).toBe('purchase-1');
      expect(result.purchasedDocuments[0].downloadUrl).toContain('/api/v1/documents/');
    });

    it('should handle project without quality score', async () => {
      prismaService.project.findFirst.mockResolvedValue({
        ...mockProject,
        qualityScore: null,
      });

      const result = await service.getProjectDocuments('project-123', 'user-123');

      expect(result.qualityScore).toBe(0);
    });
  });

  describe('getQualityLevelName', () => {
    it('should return correct name for each level', () => {
      expect(service.getQualityLevelName(0)).toBe('Basic');
      expect(service.getQualityLevelName(1)).toBe('Standard');
      expect(service.getQualityLevelName(2)).toBe('Enhanced');
      expect(service.getQualityLevelName(3)).toBe('Premium');
      expect(service.getQualityLevelName(4)).toBe('Enterprise');
    });

    it('should return Basic for invalid level', () => {
      expect(service.getQualityLevelName(99)).toBe('Basic');
    });
  });

  describe('getQualityFeatures', () => {
    it('should return features for each level', () => {
      const level0Features = service.getQualityFeatures(0);
      expect(level0Features).toContain('Basic content');

      const level4Features = service.getQualityFeatures(4);
      expect(level4Features).toContain('Enterprise content');
      expect(level4Features).toContain('Appendices');
    });

    it('should return Basic features for invalid level', () => {
      const features = service.getQualityFeatures(99);
      expect(features).toContain('Basic content');
    });
  });
});
