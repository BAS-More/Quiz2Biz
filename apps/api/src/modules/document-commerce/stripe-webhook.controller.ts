/**
 * Stripe Webhook Controller
 * Handles Stripe webhook events for document purchases
 */

import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DocumentPurchaseService } from './services/document-purchase.service';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/v1/stripe')
@Public()
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly purchaseService: DocumentPurchaseService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - payments disabled');
    }

    this.stripe = new Stripe(stripeSecretKey ?? 'not-configured', {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });

    if (!this.webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET not configured — webhook endpoint will reject all events',
      );
    }
  }

  /**
   * Handle Stripe webhook events
   * POST /api/v1/stripe/webhook
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ): Promise<{ received: boolean }> {
    let event: Stripe.Event;

    try {
      // Get raw body for signature verification
      const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;

      if (!rawBody) {
        throw new BadRequestException('Raw body not available for webhook');
      }

      if (!this.webhookSecret) {
        throw new BadRequestException(
          'STRIPE_WEBHOOK_SECRET not configured — cannot verify webhook signature',
        );
      }

      // Always verify webhook signature — no dev bypass
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle specific event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(event.data.object);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    try {
      await this.purchaseService.handlePaymentSuccess(paymentIntent.id);
    } catch (error) {
      this.logger.error(`Failed to process payment success for ${paymentIntent.id}`, error);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    try {
      await this.purchaseService.handlePaymentFailure(paymentIntent.id);
    } catch (error) {
      this.logger.error(`Failed to process payment failure for ${paymentIntent.id}`, error);
    }
  }

  /**
   * Handle canceled payment
   */
  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment canceled: ${paymentIntent.id}`);

    try {
      await this.purchaseService.handlePaymentFailure(paymentIntent.id);
    } catch (error) {
      this.logger.error(`Failed to process payment cancellation for ${paymentIntent.id}`, error);
    }
  }
}
