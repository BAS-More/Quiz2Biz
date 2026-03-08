/**
 * Document Commerce Module
 * Handles per-document pricing and purchasing with Stripe PaymentIntents
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@libs/database';
import { DocumentCommerceController } from './document-commerce.controller';
import { PricingCalculatorService } from './services/pricing-calculator.service';
import { DocumentPurchaseService } from './services/document-purchase.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DocumentCommerceController],
  providers: [PricingCalculatorService, DocumentPurchaseService],
  exports: [PricingCalculatorService, DocumentPurchaseService],
})
export class DocumentCommerceModule {}
