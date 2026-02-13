import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { PaymentService } from './payment.service';
import { InvoiceResponseDto } from './dto/payment.dto';
import { Prisma } from '@prisma/client';

interface RecordPaymentParams {
  stripeInvoiceId: string;
  stripeCustomerId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: Date;
}

interface RecordPaymentFailureParams {
  stripeInvoiceId: string;
  stripeCustomerId: string;
  amount: number;
  currency: string;
  failureReason: string;
}

interface LineItem {
  description?: string | null;
  amount?: number | null;
}

/**
 * BillingService - Manages billing history and invoice retrieval
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  /**
   * Get invoices for a customer from Stripe
   */
  async getInvoices(customerId: string, limit: number = 10): Promise<InvoiceResponseDto[]> {
    const stripeInvoices = await this.paymentService.getInvoices(customerId, limit);

    return stripeInvoices.map((invoice) => ({
      id: invoice.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || 'unknown',
      paidAt: invoice.status_transitions.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : undefined,
      createdAt: new Date(invoice.created * 1000),
      invoiceUrl: invoice.hosted_invoice_url || undefined,
      invoicePdfUrl: invoice.invoice_pdf || undefined,
    }));
  }

  /**
   * Get upcoming invoice (for billing preview)
   */
  async getUpcomingInvoice(customerId: string): Promise<{
    amount: number;
    currency: string;
    dueDate: Date;
    lineItems: Array<{ description: string; amount: number }>;
  } | null> {
    const upcoming = await this.paymentService.getUpcomingInvoice(customerId);

    if (!upcoming) {
      return null;
    }

    return {
      amount: (upcoming.amount_due || 0) / 100,
      currency: (upcoming.currency || 'usd').toUpperCase(),
      dueDate: new Date((upcoming.next_payment_attempt || Date.now() / 1000) * 1000),
      lineItems: ((upcoming.lines?.data || []) as LineItem[]).map((line: LineItem) => ({
        description: line.description || 'Subscription',
        amount: (line.amount || 0) / 100,
      })),
    };
  }

  /**
   * Record successful payment (called from webhook)
   */
  async recordPayment(params: RecordPaymentParams): Promise<void> {
    this.logger.log(`Recording payment for invoice ${params.stripeInvoiceId}`);

    // Find organization by Stripe customer ID
    const orgs = await this.prisma.organization.findMany({
      where: {
        subscription: {
          path: ['stripeCustomerId'],
          equals: params.stripeCustomerId,
        },
      },
    });

    for (const org of orgs) {
      // Get existing billing history or create new array
      const existingSettings = (org.settings as Record<string, unknown>) || {};
      const billingHistory =
        (existingSettings.billingHistory as Array<Record<string, unknown>>) || [];

      // Add new payment record
      billingHistory.push({
        invoiceId: params.stripeInvoiceId,
        amount: params.amount / 100, // Convert from cents
        currency: params.currency.toUpperCase(),
        status: params.status,
        paidAt: params.paidAt.toISOString(),
        recordedAt: new Date().toISOString(),
      });

      // Keep only last 50 records
      const trimmedHistory = billingHistory.slice(-50);

      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          settings: {
            ...existingSettings,
            billingHistory: trimmedHistory,
            lastPayment: {
              invoiceId: params.stripeInvoiceId,
              amount: params.amount / 100,
              currency: params.currency.toUpperCase(),
              paidAt: params.paidAt.toISOString(),
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  /**
   * Record payment failure (called from webhook)
   */
  async recordPaymentFailure(params: RecordPaymentFailureParams): Promise<void> {
    this.logger.warn(`Recording payment failure for invoice ${params.stripeInvoiceId}`);

    const orgs = await this.prisma.organization.findMany({
      where: {
        subscription: {
          path: ['stripeCustomerId'],
          equals: params.stripeCustomerId,
        },
      },
    });

    for (const org of orgs) {
      const existingSettings = (org.settings as Record<string, unknown>) || {};
      const paymentFailures =
        (existingSettings.paymentFailures as Array<Record<string, unknown>>) || [];

      paymentFailures.push({
        invoiceId: params.stripeInvoiceId,
        amount: params.amount / 100,
        currency: params.currency.toUpperCase(),
        failureReason: params.failureReason,
        failedAt: new Date().toISOString(),
      });

      // Keep only last 20 failures
      const trimmedFailures = paymentFailures.slice(-20);

      await this.prisma.organization.update({
        where: { id: org.id },
        data: {
          settings: {
            ...existingSettings,
            paymentFailures: trimmedFailures,
            lastPaymentFailure: {
              invoiceId: params.stripeInvoiceId,
              amount: params.amount / 100,
              failureReason: params.failureReason,
              failedAt: new Date().toISOString(),
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  /**
   * Get billing summary for an organization
   */
  async getBillingSummary(organizationId: string): Promise<{
    totalPaid: number;
    lastPayment: { amount: number; date: Date } | null;
    hasPaymentFailure: boolean;
    lastFailure: { reason: string; date: Date } | null;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return {
        totalPaid: 0,
        lastPayment: null,
        hasPaymentFailure: false,
        lastFailure: null,
      };
    }

    const settings = (org.settings as Record<string, unknown>) || {};
    const billingHistory = (settings.billingHistory as Array<{ amount: number }>) || [];
    const lastPayment = settings.lastPayment as { amount: number; paidAt: string } | null;
    const lastFailure = settings.lastPaymentFailure as {
      failureReason: string;
      failedAt: string;
    } | null;

    const totalPaid = billingHistory.reduce((sum, record) => sum + (record.amount || 0), 0);

    return {
      totalPaid,
      lastPayment: lastPayment
        ? { amount: lastPayment.amount, date: new Date(lastPayment.paidAt) }
        : null,
      hasPaymentFailure: !!lastFailure,
      lastFailure: lastFailure
        ? { reason: lastFailure.failureReason, date: new Date(lastFailure.failedAt) }
        : null,
    };
  }

  /**
   * Get usage statistics for billing
   */
  async getUsageStats(organizationId: string): Promise<{
    questionnaires: number;
    responses: number;
    documents: number;
    apiCalls: number;
  }> {
    // Count questionnaires
    const questionnaireCount = await this.prisma.questionnaire.count({
      where: {
        // Assuming questionnaires can be linked to organization
        // This would depend on your schema
      },
    });

    // Count sessions (responses) - query through user's organization
    const responseCount = await this.prisma.session.count({
      where: {
        user: {
          organizationId: organizationId,
        },
      },
    });

    return {
      questionnaires: questionnaireCount,
      responses: responseCount,
      documents: 0, // Would need document tracking
      apiCalls: 0, // Would need API call tracking
    };
  }
}
