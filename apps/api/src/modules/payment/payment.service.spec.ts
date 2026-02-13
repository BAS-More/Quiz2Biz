import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PaymentService, SUBSCRIPTION_TIERS } from './payment.service';
import Stripe from 'stripe';

jest.mock('stripe');

describe('PaymentService', () => {
  let service: PaymentService;
  let configService: ConfigService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(async () => {
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
      },
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
      invoices: {
        list: jest.fn(),
        createPreview: jest.fn(),
      },
    } as any;

    (Stripe as any).mockImplementation(() => mockStripe);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STRIPE_SECRET_KEY') {
                return 'sk_test_123';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('isConfigured', () => {
    it('returns true when Stripe is configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when Stripe key is not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = module.get<PaymentService>(PaymentService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe('createCheckoutSession', () => {
    it('creates checkout session for valid tier', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession as any);

      const result = await service.createCheckoutSession({
        organizationId: 'org-123',
        tier: 'PROFESSIONAL',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel',
      });

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: SUBSCRIPTION_TIERS.PROFESSIONAL.priceId,
            quantity: 1,
          },
        ],
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel',
        metadata: {
          organizationId: 'org-123',
          tier: 'PROFESSIONAL',
        },
      });
    });

    it('includes customer ID when provided', async () => {
      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      } as any);

      await service.createCheckoutSession({
        organizationId: 'org-123',
        tier: 'ENTERPRISE',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel',
        customerId: 'cus_123',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
        }),
      );
    });

    it('throws error for FREE tier', async () => {
      await expect(
        service.createCheckoutSession({
          organizationId: 'org-123',
          tier: 'FREE',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws error when service not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = module.get<PaymentService>(PaymentService);

      await expect(
        unconfiguredService.createCheckoutSession({
          organizationId: 'org-123',
          tier: 'PROFESSIONAL',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        }),
      ).rejects.toThrow('Payment service not configured');
    });
  });

  describe('createPortalSession', () => {
    it('creates billing portal session', async () => {
      (mockStripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue({
        url: 'https://billing.stripe.com/session/123',
      } as any);

      const result = await service.createPortalSession('cus_123', 'https://app.com/billing');

      expect(result).toBe('https://billing.stripe.com/session/123');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.com/billing',
      });
    });
  });

  describe('createCustomer', () => {
    it('creates Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'Test Org',
      };

      (mockStripe.customers.create as jest.Mock).mockResolvedValue(mockCustomer as any);

      const result = await service.createCustomer({
        email: 'test@example.com',
        name: 'Test Org',
        organizationId: 'org-123',
      });

      expect(result).toEqual(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test Org',
        metadata: {
          organizationId: 'org-123',
        },
      });
    });
  });

  describe('getSubscription', () => {
    it('retrieves subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        items: {
          data: [{ id: 'si_123', price: { id: 'price_123' } }],
        },
      };

      (mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockSubscription as any);

      const result = await service.getSubscription('sub_123');

      expect(result).toEqual(mockSubscription);
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription at period end', async () => {
      const mockSubscription = { id: 'sub_123', cancel_at_period_end: true };

      (mockStripe.subscriptions.update as jest.Mock).mockResolvedValue(mockSubscription as any);

      const result = await service.cancelSubscription('sub_123', true);

      expect(result).toEqual(mockSubscription);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('cancels subscription immediately', async () => {
      const mockSubscription = { id: 'sub_123', status: 'canceled' };

      (mockStripe.subscriptions.cancel as jest.Mock).mockResolvedValue(mockSubscription as any);

      const result = await service.cancelSubscription('sub_123', false);

      expect(result).toEqual(mockSubscription);
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('updateSubscription', () => {
    it('updates subscription to new tier', async () => {
      const existingSubscription = {
        id: 'sub_123',
        items: {
          data: [{ id: 'si_123' }],
        },
      };

      const updatedSubscription = {
        id: 'sub_123',
        status: 'active',
      };

      (mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(
        existingSubscription as any,
      );
      (mockStripe.subscriptions.update as jest.Mock).mockResolvedValue(updatedSubscription as any);

      const result = await service.updateSubscription('sub_123', 'ENTERPRISE');

      expect(result).toEqual(updatedSubscription);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        items: [
          {
            id: 'si_123',
            price: SUBSCRIPTION_TIERS.ENTERPRISE.priceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
    });

    it('throws error for FREE tier upgrade', async () => {
      await expect(service.updateSubscription('sub_123', 'FREE')).rejects.toThrow(
        'Invalid tier for upgrade',
      );
    });
  });

  describe('constructWebhookEvent', () => {
    it('constructs webhook event', () => {
      const payload = Buffer.from('test payload');
      const signature = 'test_signature';
      const webhookSecret = 'whsec_test';
      const mockEvent = { type: 'checkout.session.completed' };

      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent as any);

      const result = service.constructWebhookEvent(payload, signature, webhookSecret);

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        webhookSecret,
      );
    });
  });

  describe('getInvoices', () => {
    it('retrieves invoices for customer', async () => {
      const mockInvoices = {
        data: [
          { id: 'in_123', amount_paid: 4900, status: 'paid', customer: 'cus_123' },
          { id: 'in_124', amount_paid: 4900, status: 'paid', customer: 'cus_123' },
        ],
      };

      (mockStripe.invoices.list as jest.Mock).mockResolvedValue(mockInvoices as any);

      const result = await service.getInvoices('cus_123', 10);

      expect(result).toEqual(mockInvoices.data);
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 10,
      });
    });
  });

  describe('getUpcomingInvoice', () => {
    it('retrieves upcoming invoice', async () => {
      const mockUpcoming = {
        customer: 'cus_123',
        amount_due: 4900,
        next_payment_attempt: 1640000000,
      };

      (mockStripe.invoices.createPreview as jest.Mock).mockResolvedValue(mockUpcoming as any);

      const result = await service.getUpcomingInvoice('cus_123');

      expect(result).toEqual(mockUpcoming);
    });

    it('returns null when no upcoming invoice', async () => {
      (mockStripe.invoices.createPreview as jest.Mock).mockRejectedValue(
        new Error('No upcoming invoice'),
      );

      const result = await service.getUpcomingInvoice('cus_123');

      expect(result).toBeNull();
    });
  });
});
