/**
 * Document Purchase Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentPurchaseService } from './document-purchase.service';
import { PricingCalculatorService } from './pricing-calculator.service';
import { PrismaService } from '@libs/database';
import { Prisma } from '@prisma/client';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
      }),
    },
  }));
});

describe('DocumentPurchaseService', () => {
  let service: DocumentPurchaseService;
  let prismaService: jest.Mocked<PrismaService>;
  let pricingCalculator: jest.Mocked<PricingCalculatorService>;

  const mockPriceInfo = {
    projectId: 'project-1',
    documentTypeSlug: 'business-plan',
    documentTypeName: 'Business Plan',
    basePrice: 49.99,
    qualityLevel: 2,
    qualityMultiplier: 3,
    finalPrice: 149.97,
    currency: 'USD',
    estimatedPages: 20,
    features: ['Comprehensive content'],
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    userId: 'user-1',
  };

  const mockDocumentType = {
    id: 'dt-1',
    slug: 'business-plan',
    name: 'Business Plan',
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    stripeCustomerId: null,
  };

  const mockPurchase = {
    id: 'purchase-1',
    projectId: 'project-1',
    documentTypeId: 'dt-1',
    userId: 'user-1',
    qualityLevel: 2,
    amount: new Prisma.Decimal(149.97),
    currency: 'USD',
    stripePaymentIntentId: 'pi_test123',
    status: 'pending',
    createdAt: new Date(),
    documentType: mockDocumentType,
    generatedDocument: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      project: {
        findFirst: jest.fn(),
      },
      documentType: {
        findUnique: jest.fn(),
      },
      documentPurchase: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockPricingCalc = {
      calculatePrice: jest.fn(),
      getQualityLevelName: jest.fn().mockReturnValue('Enhanced'),
    };

    const mockConfig = {
      get: jest.fn().mockReturnValue('sk_test_fake'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentPurchaseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PricingCalculatorService, useValue: mockPricingCalc },
      ],
    }).compile();

    service = module.get<DocumentPurchaseService>(DocumentPurchaseService);
    prismaService = module.get(PrismaService);
    pricingCalculator = module.get(PricingCalculatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPurchase', () => {
    it('should create purchase with PaymentIntent', async () => {
      pricingCalculator.calculatePrice.mockResolvedValue(mockPriceInfo);
      prismaService.project.findFirst.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);
      prismaService.documentPurchase.findFirst.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(mockUser as never);
      prismaService.user.update.mockResolvedValue({ ...mockUser, stripeCustomerId: 'cus_test123' } as never);
      prismaService.documentPurchase.create.mockResolvedValue(mockPurchase as never);

      const result = await service.createPurchase(
        { projectId: 'project-1', documentTypeSlug: 'business-plan', qualityLevel: 2 },
        'user-1',
      );

      expect(result.purchaseId).toBe('purchase-1');
      expect(result.amount).toBe(149.97);
      expect(result.clientSecret).toBe('pi_test123_secret');
      expect(result.status).toBe('pending');
    });

    it('should throw NotFoundException when project not found', async () => {
      pricingCalculator.calculatePrice.mockResolvedValue(mockPriceInfo);
      prismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.createPurchase(
          { projectId: 'missing', documentTypeSlug: 'business-plan', qualityLevel: 2 },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when document type not found', async () => {
      pricingCalculator.calculatePrice.mockResolvedValue(mockPriceInfo);
      prismaService.project.findFirst.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(null);

      await expect(
        service.createPurchase(
          { projectId: 'project-1', documentTypeSlug: 'unknown', qualityLevel: 2 },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already purchased at same quality', async () => {
      pricingCalculator.calculatePrice.mockResolvedValue(mockPriceInfo);
      prismaService.project.findFirst.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);
      prismaService.documentPurchase.findFirst.mockResolvedValue(mockPurchase as never);

      await expect(
        service.createPurchase(
          { projectId: 'project-1', documentTypeSlug: 'business-plan', qualityLevel: 2 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reuse existing Stripe customer ID', async () => {
      const userWithStripe = { ...mockUser, stripeCustomerId: 'cus_existing' };
      pricingCalculator.calculatePrice.mockResolvedValue(mockPriceInfo);
      prismaService.project.findFirst.mockResolvedValue(mockProject as never);
      prismaService.documentType.findUnique.mockResolvedValue(mockDocumentType as never);
      prismaService.documentPurchase.findFirst.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(userWithStripe as never);
      prismaService.documentPurchase.create.mockResolvedValue(mockPurchase as never);

      await service.createPurchase(
        { projectId: 'project-1', documentTypeSlug: 'business-plan', qualityLevel: 2 },
        'user-1',
      );

      // Should not call user.update since customer already exists
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getPurchaseStatus', () => {
    it('should return purchase status', async () => {
      prismaService.documentPurchase.findFirst.mockResolvedValue(mockPurchase as never);

      const result = await service.getPurchaseStatus('purchase-1', 'user-1');

      expect(result.purchaseId).toBe('purchase-1');
      expect(result.status).toBe('pending');
    });

    it('should throw NotFoundException when purchase not found', async () => {
      prismaService.documentPurchase.findFirst.mockResolvedValue(null);

      await expect(
        service.getPurchaseStatus('missing', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should update purchase status to processing', async () => {
      prismaService.documentPurchase.findFirst.mockResolvedValue(mockPurchase as never);
      prismaService.documentPurchase.update.mockResolvedValue({
        ...mockPurchase,
        status: 'processing',
      } as never);

      await service.handlePaymentSuccess('pi_test123');

      expect(prismaService.documentPurchase.update).toHaveBeenCalledWith({
        where: { id: 'purchase-1' },
        data: { status: 'processing' },
      });
    });

    it('should handle missing purchase gracefully', async () => {
      prismaService.documentPurchase.findFirst.mockResolvedValue(null);

      // Should not throw
      await expect(service.handlePaymentSuccess('pi_missing')).resolves.not.toThrow();
    });
  });

  describe('handlePaymentFailure', () => {
    it('should update purchase status to failed', async () => {
      prismaService.documentPurchase.findFirst.mockResolvedValue(mockPurchase as never);
      prismaService.documentPurchase.update.mockResolvedValue({
        ...mockPurchase,
        status: 'failed',
      } as never);

      await service.handlePaymentFailure('pi_test123');

      expect(prismaService.documentPurchase.update).toHaveBeenCalledWith({
        where: { id: 'purchase-1' },
        data: { status: 'failed' },
      });
    });

    it('should handle missing purchase gracefully', async () => {
      prismaService.documentPurchase.findFirst.mockResolvedValue(null);

      await expect(service.handlePaymentFailure('pi_missing')).resolves.not.toThrow();
    });
  });

  describe('getUserPurchases', () => {
    it('should return all purchases for a user', async () => {
      prismaService.documentPurchase.findMany.mockResolvedValue([mockPurchase] as never);

      const result = await service.getUserPurchases('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].purchaseId).toBe('purchase-1');
    });

    it('should return empty array when no purchases', async () => {
      prismaService.documentPurchase.findMany.mockResolvedValue([]);

      const result = await service.getUserPurchases('user-1');

      expect(result).toHaveLength(0);
    });
  });
});
