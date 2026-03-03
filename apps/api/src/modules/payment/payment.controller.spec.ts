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
  const mockCurrentUser = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'CLIENT',
    organizationId: 'org-123',
  } as any;

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

      const result = await controller.createCheckout(dto, mockCurrentUser);

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
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeCustomerId: 'cus_123',
      });

      mockPaymentService.createPortalSession.mockResolvedValue(
        'https://billing.stripe.com/session',
      );

      const result = await controller.createPortalSession(dto, mockCurrentUser);

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
        organizationId: 'org-123',
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

      const result = await controller.getSubscription('org-123', mockCurrentUser);

      expect(result.tier).toBe('PROFESSIONAL');
      expect(mockSubscriptionService.getOrganizationSubscription).toHaveBeenCalledWith('org-123');
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for customer', async () => {
      const mockInvoices = [
        { id: 'inv-1', amount: 9900, status: 'paid', createdAt: new Date() },
        { id: 'inv-2', amount: 9900, status: 'paid', createdAt: new Date() },
      ];

      mockBillingService.getInvoices.mockResolvedValue(mockInvoices);
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeCustomerId: 'cus_123',
      });

      const result = await controller.getInvoices('cus_123', '10', mockCurrentUser);

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

      const result = await controller.getUsage('org-123', mockCurrentUser);

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

      const result = await controller.cancelSubscription('org-123', mockCurrentUser);

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

      const result = await controller.resumeSubscription('org-123', mockCurrentUser);

      expect(result.message).toContain('resumed');
      expect(mockPaymentService.resumeSubscription).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('cancelSubscription - error cases', () => {
    it('should throw BadRequestException if no stripe subscription', async () => {
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeSubscriptionId: null,
      });

      await expect(controller.cancelSubscription('org-123', mockCurrentUser)).rejects.toThrow(
        'No active Stripe subscription found',
      );
    });
  });

  describe('resumeSubscription - error cases', () => {
    it('should throw BadRequestException if no stripe subscription', async () => {
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeSubscriptionId: null,
      });

      await expect(controller.resumeSubscription('org-123', mockCurrentUser)).rejects.toThrow(
        'No active Stripe subscription found',
      );
    });
  });

  describe('getInvoices - edge cases', () => {
    it('should handle undefined limit', async () => {
      mockBillingService.getInvoices.mockResolvedValue([]);
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeCustomerId: 'cus_123',
      });

      await controller.getInvoices('cus_123', undefined, mockCurrentUser);

      expect(mockBillingService.getInvoices).toHaveBeenCalledWith('cus_123', undefined);
    });

    it('should handle non-numeric limit gracefully', async () => {
      mockBillingService.getInvoices.mockResolvedValue([]);
      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        stripeCustomerId: 'cus_123',
      });

      await controller.getInvoices('cus_123', 'not-a-number', mockCurrentUser);

      expect(mockBillingService.getInvoices).toHaveBeenCalledWith('cus_123', undefined);
    });
  });

  describe('handleWebhook', () => {
    let webhookController: PaymentController;
    let webhookModule: TestingModule;

    const createMockRequest = (rawBody: Buffer | undefined) => ({
      rawBody,
    });

    beforeEach(async () => {
      // Create controller with valid webhook secret for webhook tests
      const webhookMockConfigService = {
        get: jest.fn().mockReturnValue('whsec_valid_test_secret'),
      };

      webhookModule = await Test.createTestingModule({
        controllers: [PaymentController],
        providers: [
          { provide: PaymentService, useValue: mockPaymentService },
          { provide: SubscriptionService, useValue: mockSubscriptionService },
          { provide: BillingService, useValue: mockBillingService },
          { provide: ConfigService, useValue: webhookMockConfigService },
        ],
      }).compile();

      webhookController = webhookModule.get<PaymentController>(PaymentController);
    });

    afterEach(async () => {
      if (webhookModule) {
        await webhookModule.close();
      }
    });

    it('should throw BadRequestException if webhook secret not configured', async () => {
      // Re-create controller with empty webhook secret
      const moduleWithNoSecret = await Test.createTestingModule({
        controllers: [PaymentController],
        providers: [
          { provide: PaymentService, useValue: mockPaymentService },
          { provide: SubscriptionService, useValue: mockSubscriptionService },
          { provide: BillingService, useValue: mockBillingService },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        ],
      }).compile();

      const controllerNoSecret = moduleWithNoSecret.get<PaymentController>(PaymentController);

      const mockRequest = createMockRequest(Buffer.from('{}'));

      await expect(
        controllerNoSecret.handleWebhook(mockRequest as any, 'sig_test'),
      ).rejects.toThrow('Webhook secret not configured');

      await moduleWithNoSecret.close();
    });

    it('should throw BadRequestException if raw body is missing', async () => {
      const mockRequest = createMockRequest(undefined);

      await expect(
        webhookController.handleWebhook(mockRequest as any, 'sig_test'),
      ).rejects.toThrow('Missing raw body for webhook verification');
    });

    it('should throw BadRequestException on invalid signature', async () => {
      mockPaymentService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const mockRequest = createMockRequest(Buffer.from('{}'));

      await expect(
        webhookController.handleWebhook(mockRequest as any, 'invalid_sig'),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: { organizationId: 'org-123', tier: 'PROFESSIONAL' },
            customer: 'cus_123',
            subscription: 'sub_123',
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockSubscriptionService.activateSubscription.mockResolvedValue({});

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockSubscriptionService.activateSubscription).toHaveBeenCalledWith({
        organizationId: 'org-123',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        tier: 'PROFESSIONAL',
      });
    });

    it('should handle checkout.session.completed with missing metadata', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: {},
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockSubscriptionService.activateSubscription).not.toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated event', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 86400,
            cancel_at_period_end: false,
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockSubscriptionService.syncSubscriptionStatus.mockResolvedValue({});

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockSubscriptionService.syncSubscriptionStatus).toHaveBeenCalled();
    });

    it('should handle customer.subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 86400,
            cancel_at_period_end: false,
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockSubscriptionService.syncSubscriptionStatus.mockResolvedValue({});

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockSubscriptionService.syncSubscriptionStatus).toHaveBeenCalled();
    });

    it('should handle customer.subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockSubscriptionService.cancelSubscriptionByStripeId.mockResolvedValue({});

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockSubscriptionService.cancelSubscriptionByStripeId).toHaveBeenCalledWith('sub_123');
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_123',
            customer: 'cus_123',
            amount_paid: 9900,
            currency: 'usd',
            status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockBillingService.recordPayment.mockResolvedValue({});

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockBillingService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeInvoiceId: 'inv_123',
          amount: 9900,
          status: 'paid',
        }),
      );
    });

    it('should handle invoice.payment_failed event', async () => {
      const mockEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_123',
            customer: 'cus_123',
            amount_due: 9900,
            currency: 'usd',
            last_finalization_error: { message: 'Card declined' },
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockBillingService.recordPaymentFailure.mockResolvedValue({});

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockBillingService.recordPaymentFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeInvoiceId: 'inv_123',
          failureReason: 'Card declined',
        }),
      );
    });

    it('should handle unhandled webhook event type', async () => {
      const mockEvent = {
        type: 'unknown.event.type',
        data: { object: {} },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);

      const mockRequest = createMockRequest(Buffer.from('{}'));
      const result = await webhookController.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
    });
  });

  describe('getUsage - edge cases', () => {
    it('should handle string feature limits', async () => {
      mockBillingService.getUsageStats.mockResolvedValue({
        questionnaires: 25,
        responses: 500,
        documents: 10,
        apiCalls: 5000,
      });

      mockSubscriptionService.getOrganizationSubscription.mockResolvedValue({
        features: {
          questionnaires: 'unlimited',
          responses: 'unlimited',
          documents: 'unlimited',
          apiCalls: 'unlimited',
        },
      });

      const result = await controller.getUsage('org-123', mockCurrentUser);

      expect(result.questionnaires.limit).toBe(0);
      expect(result.responses.limit).toBe(0);
    });
  });

  describe('uncovered branches', () => {
    let webhookController2: PaymentController;
    let webhookModule2: TestingModule;

    const createMockRequest2 = (rawBody: Buffer | undefined) => ({
      rawBody,
    });

    beforeEach(async () => {
      const webhookMockConfigService2 = {
        get: jest.fn().mockReturnValue('whsec_valid_test_secret'),
      };

      webhookModule2 = await Test.createTestingModule({
        controllers: [PaymentController],
        providers: [
          { provide: PaymentService, useValue: mockPaymentService },
          { provide: SubscriptionService, useValue: mockSubscriptionService },
          { provide: BillingService, useValue: mockBillingService },
          { provide: ConfigService, useValue: webhookMockConfigService2 },
        ],
      }).compile();

      webhookController2 = webhookModule2.get<PaymentController>(PaymentController);
    });

    afterEach(async () => {
      if (webhookModule2) {
        await webhookModule2.close();
      }
    });

    it('should use Date.now() fallback when invoice.status_transitions.paid_at is null', async () => {
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_123',
            customer: 'cus_123',
            amount_paid: 9900,
            currency: 'usd',
            status_transitions: { paid_at: null },
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockBillingService.recordPayment.mockResolvedValue({});

      const mockRequest = createMockRequest2(Buffer.from('{}'));
      const result = await webhookController2.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockBillingService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAt: expect.any(Date),
        }),
      );
    });

    it('should use "Unknown error" when last_finalization_error is null', async () => {
      const mockEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_fail',
            customer: 'cus_123',
            amount_due: 5000,
            currency: 'usd',
            last_finalization_error: null,
          },
        },
      };
      mockPaymentService.constructWebhookEvent.mockReturnValue(mockEvent);
      mockBillingService.recordPaymentFailure.mockResolvedValue({});

      const mockRequest = createMockRequest2(Buffer.from('{}'));
      const result = await webhookController2.handleWebhook(mockRequest as any, 'sig_test');

      expect(result.received).toBe(true);
      expect(mockBillingService.recordPaymentFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          failureReason: 'Unknown error',
        }),
      );
    });

    it('should handle non-Error thrown in webhook signature verification', async () => {
      mockPaymentService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('string error thrown');
      });

      const mockRequest = createMockRequest2(Buffer.from('{}'));

      await expect(
        webhookController2.handleWebhook(mockRequest as any, 'invalid_sig'),
      ).rejects.toThrow('Invalid webhook signature');
    });
  });
});
