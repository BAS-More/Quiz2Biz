import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '@libs/database';
import { PaymentService } from './payment.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaService;
  let paymentService: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            organization: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            questionnaire: {
              count: jest.fn(),
            },
            session: {
              count: jest.fn(),
            },
          },
        },
        {
          provide: PaymentService,
          useValue: {
            getInvoices: jest.fn(),
            getUpcomingInvoice: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaService>(PrismaService);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  describe('getInvoices', () => {
    it('retrieves and formats invoices from Stripe', async () => {
      const mockStripeInvoices = [
        {
          id: 'in_123',
          amount_paid: 4900,
          currency: 'usd',
          status: 'paid',
          status_transitions: {
            paid_at: 1640000000,
          },
          created: 1639900000,
          hosted_invoice_url: 'https://invoice.stripe.com/in_123',
          invoice_pdf: 'https://invoice.stripe.com/in_123/pdf',
        },
        {
          id: 'in_124',
          amount_paid: 4900,
          currency: 'usd',
          status: 'paid',
          status_transitions: {
            paid_at: 1641000000,
          },
          created: 1640900000,
          hosted_invoice_url: 'https://invoice.stripe.com/in_124',
          invoice_pdf: 'https://invoice.stripe.com/in_124/pdf',
        },
      ];

      jest.spyOn(paymentService, 'getInvoices').mockResolvedValue(mockStripeInvoices as any);

      const result = await service.getInvoices('cus_123', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'in_123',
        stripeInvoiceId: 'in_123',
        amount: 49,
        currency: 'USD',
        status: 'paid',
        paidAt: new Date(1640000000 * 1000),
        createdAt: new Date(1639900000 * 1000),
        invoiceUrl: 'https://invoice.stripe.com/in_123',
        invoicePdfUrl: 'https://invoice.stripe.com/in_123/pdf',
      });
    });

    it('handles invoices without paid_at timestamp', async () => {
      const mockStripeInvoices = [
        {
          id: 'in_123',
          amount_paid: 4900,
          currency: 'usd',
          status: 'open',
          status_transitions: {},
          created: 1639900000,
          hosted_invoice_url: null,
          invoice_pdf: null,
        },
      ];

      jest.spyOn(paymentService, 'getInvoices').mockResolvedValue(mockStripeInvoices as any);

      const result = await service.getInvoices('cus_123');

      expect(result[0].paidAt).toBeUndefined();
      expect(result[0].invoiceUrl).toBeUndefined();
      expect(result[0].invoicePdfUrl).toBeUndefined();
    });
  });

  describe('getUpcomingInvoice', () => {
    it('retrieves and formats upcoming invoice', async () => {
      const mockUpcoming = {
        amount_due: 4900,
        currency: 'usd',
        next_payment_attempt: 1640000000,
        lines: {
          data: [
            { description: 'Professional Plan', amount: 4900 },
            { description: 'Overage charges', amount: 500 },
          ],
        },
      };

      jest.spyOn(paymentService, 'getUpcomingInvoice').mockResolvedValue(mockUpcoming as any);

      const result = await service.getUpcomingInvoice('cus_123');

      expect(result).toEqual({
        amount: 49,
        currency: 'USD',
        dueDate: new Date(1640000000 * 1000),
        lineItems: [
          { description: 'Professional Plan', amount: 49 },
          { description: 'Overage charges', amount: 5 },
        ],
      });
    });

    it('returns null when no upcoming invoice', async () => {
      jest.spyOn(paymentService, 'getUpcomingInvoice').mockResolvedValue(null);

      const result = await service.getUpcomingInvoice('cus_123');

      expect(result).toBeNull();
    });

    it('handles upcoming invoice with empty lines', async () => {
      const mockUpcoming = {
        amount_due: 4900,
        currency: 'usd',
        next_payment_attempt: 1640000000,
        lines: { data: [] },
      };

      jest.spyOn(paymentService, 'getUpcomingInvoice').mockResolvedValue(mockUpcoming as any);

      const result = await service.getUpcomingInvoice('cus_123');

      expect(result?.lineItems).toEqual([]);
    });
  });

  describe('recordPayment', () => {
    it('records successful payment in billing history', async () => {
      const mockOrgs = [
        {
          id: 'org-123',
          settings: {
            billingHistory: [{ invoiceId: 'in_100', amount: 49, status: 'paid' }],
          },
        },
      ];

      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue(mockOrgs as any);
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({} as any);

      await service.recordPayment({
        stripeInvoiceId: 'in_123',
        stripeCustomerId: 'cus_123',
        amount: 4900,
        currency: 'USD',
        status: 'paid',
        paidAt: new Date('2026-01-28'),
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          settings: expect.objectContaining({
            billingHistory: expect.arrayContaining([
              expect.objectContaining({
                invoiceId: 'in_123',
                amount: 49,
                currency: 'USD',
                status: 'paid',
              }),
            ]),
            lastPayment: expect.objectContaining({
              invoiceId: 'in_123',
              amount: 49,
            }),
          }),
        },
      });
    });

    it('trims billing history to last 50 records', async () => {
      const existingHistory = Array.from({ length: 50 }, (_, i) => ({
        invoiceId: `in_${i}`,
        amount: 49,
      }));

      const mockOrgs = [
        {
          id: 'org-123',
          settings: {
            billingHistory: existingHistory,
          },
        },
      ];

      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue(mockOrgs as any);
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({} as any);

      await service.recordPayment({
        stripeInvoiceId: 'in_new',
        stripeCustomerId: 'cus_123',
        amount: 4900,
        currency: 'USD',
        status: 'paid',
        paidAt: new Date('2026-01-28'),
      });

      const updateCall = (prisma.organization.update as jest.Mock).mock.calls[0][0];
      const updatedHistory = updateCall.data.settings.billingHistory;

      expect(updatedHistory).toHaveLength(50);
      expect(updatedHistory[49].invoiceId).toBe('in_new');
      expect(updatedHistory[0].invoiceId).not.toBe('in_0');
    });
  });

  describe('recordPaymentFailure', () => {
    it('records payment failure', async () => {
      const mockOrgs = [
        {
          id: 'org-123',
          settings: {
            paymentFailures: [],
          },
        },
      ];

      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue(mockOrgs as any);
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({} as any);

      await service.recordPaymentFailure({
        stripeInvoiceId: 'in_123',
        stripeCustomerId: 'cus_123',
        amount: 4900,
        currency: 'USD',
        failureReason: 'Insufficient funds',
      });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        data: {
          settings: expect.objectContaining({
            paymentFailures: expect.arrayContaining([
              expect.objectContaining({
                invoiceId: 'in_123',
                amount: 49,
                failureReason: 'Insufficient funds',
              }),
            ]),
            lastPaymentFailure: expect.objectContaining({
              failureReason: 'Insufficient funds',
            }),
          }),
        },
      });
    });

    it('trims payment failures to last 20 records', async () => {
      const existingFailures = Array.from({ length: 20 }, (_, i) => ({
        invoiceId: `in_${i}`,
        amount: 49,
        failureReason: 'Test failure',
      }));

      const mockOrgs = [
        {
          id: 'org-123',
          settings: {
            paymentFailures: existingFailures,
          },
        },
      ];

      jest.spyOn(prisma.organization, 'findMany').mockResolvedValue(mockOrgs as any);
      jest.spyOn(prisma.organization, 'update').mockResolvedValue({} as any);

      await service.recordPaymentFailure({
        stripeInvoiceId: 'in_new',
        stripeCustomerId: 'cus_123',
        amount: 4900,
        currency: 'USD',
        failureReason: 'New failure',
      });

      const updateCall = (prisma.organization.update as jest.Mock).mock.calls[0][0];
      const updatedFailures = updateCall.data.settings.paymentFailures;

      expect(updatedFailures).toHaveLength(20);
      expect(updatedFailures[19].invoiceId).toBe('in_new');
    });
  });

  describe('getBillingSummary', () => {
    it('returns billing summary for organization', async () => {
      const mockOrg = {
        id: 'org-123',
        settings: {
          billingHistory: [
            { amount: 49, paidAt: '2026-01-01' },
            { amount: 49, paidAt: '2026-01-15' },
            { amount: 49, paidAt: '2026-01-28' },
          ],
          lastPayment: {
            amount: 49,
            paidAt: '2026-01-28T10:00:00Z',
          },
          lastPaymentFailure: {
            failureReason: 'Insufficient funds',
            failedAt: '2025-12-15T10:00:00Z',
          },
        },
      };

      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(mockOrg as any);

      const result = await service.getBillingSummary('org-123');

      expect(result).toEqual({
        totalPaid: 147,
        lastPayment: {
          amount: 49,
          date: new Date('2026-01-28T10:00:00Z'),
        },
        hasPaymentFailure: true,
        lastFailure: {
          reason: 'Insufficient funds',
          date: new Date('2025-12-15T10:00:00Z'),
        },
      });
    });

    it('returns empty summary for non-existent organization', async () => {
      jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue(null);

      const result = await service.getBillingSummary('non-existent');

      expect(result).toEqual({
        totalPaid: 0,
        lastPayment: null,
        hasPaymentFailure: false,
        lastFailure: null,
      });
    });
  });

  describe('getUsageStats', () => {
    it('returns usage statistics', async () => {
      jest.spyOn(prisma.questionnaire, 'count').mockResolvedValue(5);
      jest.spyOn(prisma.session, 'count').mockResolvedValue(120);

      const result = await service.getUsageStats('org-123');

      expect(result).toEqual({
        questionnaires: 5,
        responses: 120,
        documents: 0,
        apiCalls: 0,
      });

      expect(prisma.session.count).toHaveBeenCalledWith({
        where: {
          user: {
            organizationId: 'org-123',
          },
        },
      });
    });
  });
});
