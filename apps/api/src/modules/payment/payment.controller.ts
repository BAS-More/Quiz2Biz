import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { SkipCsrf } from '../../common/guards/csrf.guard';

/**
 * PaymentController - API endpoints for payment and subscription management
 */
@ApiTags('payment')
@Controller('payment')
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

  private isAdmin(user: AuthenticatedUser): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  }

  private assertOrganizationOwnership(user: AuthenticatedUser, organizationId: string): void {
    if (this.isAdmin(user)) {
      return;
    }
    if (!user.organizationId) {
      throw new ForbiddenException('User does not belong to an organization');
    }
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Forbidden organization access');
    }
  }

  private async assertCustomerOwnership(user: AuthenticatedUser, customerId: string): Promise<void> {
    if (this.isAdmin(user)) {
      return;
    }
    if (!user.organizationId) {
      throw new ForbiddenException('User does not belong to an organization');
    }

    const subscription = await this.subscriptionService.getOrganizationSubscription(user.organizationId);
    if (!subscription.stripeCustomerId || subscription.stripeCustomerId !== customerId) {
      throw new ForbiddenException('Forbidden customer access');
    }
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ sessionId: string; url: string }> {
    this.assertOrganizationOwnership(user, dto.organizationId);

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async createPortalSession(
    @Body() dto: CreatePortalSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ url: string }> {
    await this.assertCustomerOwnership(user, dto.customerId);

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
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionResponseDto> {
    this.assertOrganizationOwnership(user, organizationId);
    const subscription = await this.subscriptionService.getOrganizationSubscription(organizationId);
    return subscription;
  }

  /**
   * Get billing history (invoices)
   */
  @Get('invoices/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getInvoices(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<InvoiceResponseDto[]> {
    if (user) {
      await this.assertCustomerOwnership(user, customerId);
    }
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
    return this.billingService.getInvoices(customerId, safeLimit);
  }

  /**
   * Get usage stats and tier limits for an organization
   */
  @Get('usage/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getUsage(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    questionnaires: { used: number; limit: number };
    responses: { used: number; limit: number };
    documents: { used: number; limit: number };
    apiCalls: { used: number; limit: number };
  }> {
    this.assertOrganizationOwnership(user, organizationId);

    const [usage, subscription] = await Promise.all([
      this.billingService.getUsageStats(organizationId),
      this.subscriptionService.getOrganizationSubscription(organizationId),
    ]);

    const toLimit = (value: number | string): number => (typeof value === 'number' ? value : 0);

    return {
      questionnaires: {
        used: usage.questionnaires,
        limit: toLimit(subscription.features.questionnaires),
      },
      responses: {
        used: usage.responses,
        limit: toLimit(subscription.features.responses),
      },
      documents: {
        used: usage.documents,
        limit: toLimit(subscription.features.documents),
      },
      apiCalls: {
        used: usage.apiCalls,
        limit: toLimit(subscription.features.apiCalls),
      },
    };
  }

  /**
   * Schedule subscription cancellation at period end
   */
  @Post('cancel/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async cancelSubscription(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    this.assertOrganizationOwnership(user, organizationId);
    const subscription = await this.subscriptionService.getOrganizationSubscription(organizationId);

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active Stripe subscription found');
    }

    await this.paymentService.cancelSubscription(subscription.stripeSubscriptionId, true);

    return { message: 'Subscription cancellation scheduled for end of billing period' };
  }

  /**
   * Resume a subscription that is set to cancel at period end
   */
  @Post('resume/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async resumeSubscription(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    this.assertOrganizationOwnership(user, organizationId);
    const subscription = await this.subscriptionService.getOrganizationSubscription(organizationId);

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active Stripe subscription found');
    }

    await this.paymentService.resumeSubscription(subscription.stripeSubscriptionId);

    return { message: 'Subscription resumed successfully' };
  }

  /**
   * Stripe webhook handler
   */
  @Post('webhook')
  @SkipCsrf()
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
