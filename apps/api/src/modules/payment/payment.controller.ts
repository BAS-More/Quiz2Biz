import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PaymentService, SubscriptionTier, SUBSCRIPTION_TIERS } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { BillingService } from './billing.service';
import {
  CreateCheckoutDto,
  CreatePortalSessionDto,
  SubscriptionResponseDto,
  InvoiceResponseDto,
} from './dto/payment.dto';
import Stripe from 'stripe';

/**
 * PaymentController - API endpoints for payment and subscription management
 */
@ApiTags('payment')
@Controller('api/payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private readonly webhookSecret: string;

  constructor(
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService,
    private billingService: BillingService,
    private configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  /**
   * Get available subscription tiers
   */
  @Get('tiers')
  getTiers(): Record<string, object> {
    return SUBSCRIPTION_TIERS;
  }

  /**
   * Create checkout session for subscription
   */
  @Post('checkout')
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
  ): Promise<{ sessionId: string; url: string }> {
    return this.paymentService.createCheckoutSession({
      organizationId: dto.organizationId,
      tier: dto.tier as SubscriptionTier,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      customerId: dto.customerId,
    });
  }

  /**
   * Create customer portal session
   */
  @Post('portal')
  async createPortalSession(@Body() dto: CreatePortalSessionDto): Promise<{ url: string }> {
    const url = await this.paymentService.createPortalSession(dto.customerId, dto.returnUrl);
    return { url };
  }

  /**
   * Get subscription status for an organization
   */
  @Get('subscription/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getSubscription(
    @Req() req: Request & { params: { organizationId: string } },
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionService.getOrganizationSubscription(
      req.params.organizationId,
    );
    return subscription;
  }

  /**
   * Get billing history (invoices)
   */
  @Get('invoices/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getInvoices(
    @Req() req: Request & { params: { customerId: string } },
  ): Promise<InvoiceResponseDto[]> {
    return this.billingService.getInvoices(req.params.customerId);
  }

  /**
   * Stripe webhook handler
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!this.webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    let event: Stripe.Event;

    try {
      event = this.paymentService.constructWebhookEvent(req.rawBody, signature, this.webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook signature verification failed: ${errorMessage}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  }

  // ==========================================
  // Webhook Event Handlers
  // ==========================================

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId = session.metadata?.organizationId;
    const tier = session.metadata?.tier;

    if (!organizationId || !tier) {
      this.logger.warn(`Checkout completed but missing metadata: ${session.id}`);
      return;
    }

    this.logger.log(`Checkout completed for org ${organizationId}, tier ${tier}`);

    await this.subscriptionService.activateSubscription({
      organizationId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      tier: tier as SubscriptionTier,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);

    const customerId = subscription.customer as string;

    await this.subscriptionService.syncSubscriptionStatus({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status,
      currentPeriodEnd: new Date(
        (subscription as { current_period_end?: number }).current_period_end! * 1000,
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription deleted: ${subscription.id}`);

    await this.subscriptionService.cancelSubscriptionByStripeId(subscription.id);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);

    await this.billingService.recordPayment({
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      paidAt: new Date((invoice.status_transitions.paid_at || Date.now() / 1000) * 1000),
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.warn(`Invoice payment failed: ${invoice.id}`);

    await this.billingService.recordPaymentFailure({
      stripeInvoiceId: invoice.id,
      stripeCustomerId: invoice.customer as string,
      amount: invoice.amount_due,
      currency: invoice.currency,
      failureReason: invoice.last_finalization_error?.message || 'Unknown error',
    });
  }
}
