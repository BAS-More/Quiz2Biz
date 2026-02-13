import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { BillingService } from './billing.service';
import { PrismaModule } from '@libs/database';
import { ConfigModule } from '@nestjs/config';

/**
 * Payment Module - Stripe integration for subscriptions and billing
 *
 * Features:
 * - Stripe checkout session creation
 * - Webhook handling for subscription events
 * - Subscription tier management (Free/Professional/Enterprise)
 * - Billing history and invoice retrieval
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentController],
  providers: [PaymentService, SubscriptionService, BillingService],
  exports: [PaymentService, SubscriptionService, BillingService],
})
export class PaymentModule {}
