import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService, SUBSCRIPTION_TIERS } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { BillingService } from './billing.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: PaymentService;
  let subscriptionService: SubscriptionService;
  let billingService: BillingService;
  let module: TestingModule;

  const mockPaymentService = {
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
    cancelSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    constructWebhookEvent: jest.fn(),
  };

  const mockSubscriptionService = {
    getOrganizationSubscription: jest.fn(),
    activateSubscription: jest.fn(),
    syncSubscriptionStatus: jest.fn(),
    cancelSubscriptionByStripeId: jest.fn(),
  };

  const mockBillingService = {
    getInvoices: jest.fn(),
    getUsageStats: jest.fn(),
    recordPayment: jest.fn(),
    recordPaymentFailure: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('whsec_test_secret'),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get<PaymentService>(PaymentService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
    billingService = module.get<BillingService>(BillingService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('getTiers', () => {
    it('should return subscription tiers', () => {
      const result = controller.getTiers();

      expect(result).toEqual(SUBSCRIPTION_TIERS);
      expect(result).toHaveProperty('FREE');
      expect(result).toHaveProperty('PROFESSIONAL');
      expect(result).toHaveProperty('ENTERPRISE');
    });
  });

  describe('createCheckout', () => {
    it('should create checkout session', async () => {
      const dto = {
        organizationId: 'org-123',
        tier: 'PROFESSIONAL' as const,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerId: 'cus_123',
      } as any;

      mockPaymentService.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/session',
      });

      const result = await controller.createCheckout(dto);

      expect(result.sessionId).toBe('cs_123');
      expect(result.url).toContain('stripe.com');
      expect(mockPaymentService.createCheckoutSession).toHaveBeenCalledWith({
        organizationId: 'org-123',
        tier: 'PROFESSIONAL',
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
        customerId: 'cus_123',
      });
    });
  });

  describe('createPortalSession', () => {
    it('should create customer portal session', async () => {
      const dto = {
        customerId: 'cus_123',
        returnUrl: 'https://example.com/dashboard',
      };

      mockPaymentService.createPortalSession.mockResolvedValue(
        'https://billing.stripe.com/session',
      );

      const result = await controller.createPortalSession(dto);

      expect(result.url).toContain('stripe.com');
      expect(mockPaymentService.createPortalSession).toHaveBeenCalledWith(
        'cus_123',
        'https://example.com/dashboard',
      );
    });
  });

  describe('getSubscription', () => {
    it('should return subscription for organization', async () => {
      const mockSubscription = {
        id: 'sub-123',
        organizationId: 'org-456',
        tier: 'PROFESSIONAL',
        status: 'active',
        features: {
          questionnaires: 100,
          responses: 10000,
          documents: 500,
          apiCalls: 100000,
        },
      };

      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue(mockSubscription);

      const mockRequest = { params: { organizationId: 'org-456' } };
      const result = await controller.getSubscription(mockRequest as any);

      expect(result.tier).toBe('PROFESSIONAL');
      expect(mockSubscriptionService.getOrganizationSubscription).toHaveBeenCalledWith('org-456');
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for customer', async () => {
      const mockInvoices = [
        { id: 'inv-1', amount: 9900, status: 'paid', createdAt: new Date() },
        { id: 'inv-2', amount: 9900, status: 'paid', createdAt: new Date() },
      ];

      mockBillingService.getInvoices.mockResolvedValue(mockInvoices);

      const mockRequest = { params: { customerId: 'cus_123' } };
      const result = await controller.getInvoices(mockRequest as any, '10');

      expect(result).toHaveLength(2);
      expect(mockBillingService.getInvoices).toHaveBeenCalledWith('cus_123', 10);
    });
  });

  describe('getUsage', () => {
    it('should return usage stats with limits', async () => {
      mockBillingService.getUsageStats.mockResolvedValue({
        questionnaires: 25,
        responses: 500,
        documents: 10,
        apiCalls: 5000,
      });

      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        features: {
          questionnaires: 100,
          responses: 10000,
          documents: 500,
          apiCalls: 100000,
        },
      });

      const mockRequest = { params: { organizationId: 'org-123' } };
      const result = await controller.getUsage(mockRequest as any);

      expect(result.questionnaires.used).toBe(25);
      expect(result.questionnaires.limit).toBe(100);
      expect(result.responses.used).toBe(500);
    });
  });

  describe('cancelSubscription', () => {
    it('should schedule subscription cancellation', async () => {
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeSubscriptionId: 'sub_123',
      });
      mockPaymentService.cancelSubscription.mockResolvedValue(undefined);

      const mockRequest = { params: { organizationId: 'org-123' } };
      const result = await controller.cancelSubscription(mockRequest as any);

      expect(result.message).toContain('cancellation scheduled');
      expect(mockPaymentService.cancelSubscription).toHaveBeenCalledWith('sub_123', true);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume cancelled subscription', async () => {
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeSubscriptionId: 'sub_123',
      });
      mockPaymentService.resumeSubscription.mockResolvedValue(undefined);

      const mockRequest = { params: { organizationId: 'org-123' } };
      const result = await controller.resumeSubscription(mockRequest as any);

      expect(result.message).toContain('resumed');
      expect(mockPaymentService.resumeSubscription).toHaveBeenCalledWith('sub_123');
    });
  });
});
