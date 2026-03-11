/**
 * Document Purchase Service
 * Handles per-document purchases with Stripe PaymentIntents
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/database';
import Stripe from 'stripe';
import { PricingCalculatorService } from './pricing-calculator.service';
import {
  CreatePurchaseDto,
  PurchaseResponseDto,
  DocumentPurchaseStatusDto,
} from '../dto/document-commerce.dto';

@Injectable()
export class DocumentPurchaseService {
  private readonly logger = new Logger(DocumentPurchaseService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly pricingCalculator: PricingCalculatorService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - payments disabled');
    }
    this.stripe = new Stripe(stripeSecretKey ?? 'not-configured', {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }

  /**
   * Create a new document purchase with PaymentIntent
   */
  async createPurchase(dto: CreatePurchaseDto, userId: string): Promise<PurchaseResponseDto> {
    // Calculate price first
    const priceInfo = await this.pricingCalculator.calculatePrice({
      projectId: dto.projectId,
      documentTypeSlug: dto.documentTypeSlug,
      qualityLevel: dto.qualityLevel,
    });

    // Verify project belongs to user
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get document type
    const documentType = await this.prisma.documentType.findUnique({
      where: { slug: dto.documentTypeSlug },
    });

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    // Check if same document already purchased at same or higher quality
    const existingPurchase = await this.prisma.documentPurchase.findFirst({
      where: {
        projectId: dto.projectId,
        documentTypeId: documentType.id,
        qualityLevel: { gte: dto.qualityLevel },
        status: { in: ['completed', 'processing'] },
      },
    });

    if (existingPurchase) {
      throw new BadRequestException('Document already purchased at this or higher quality level');
    }

    // Get user for Stripe customer
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.name ?? undefined,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;

        // Update user with Stripe customer ID
        await this.prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId },
        });
      } catch (error) {
        this.logger.error('Failed to create Stripe customer', error);
        throw new BadRequestException('Payment service unavailable');
      }
    }

    // Create PaymentIntent
    const amountInCents = Math.round(priceInfo.finalPrice * 100);
    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: stripeCustomerId,
        metadata: {
          projectId: dto.projectId,
          documentTypeSlug: dto.documentTypeSlug,
          qualityLevel: dto.qualityLevel.toString(),
          userId,
        },
        description: `${priceInfo.documentTypeName} - ${this.pricingCalculator.getQualityLevelName(dto.qualityLevel)} Quality`,
        automatic_payment_methods: { enabled: true },
      });
    } catch (error) {
      this.logger.error('Failed to create PaymentIntent', error);
      throw new BadRequestException('Payment initialization failed');
    }

    // Create purchase record
    const purchase = await this.prisma.documentPurchase.create({
      data: {
        projectId: dto.projectId,
        documentTypeId: documentType.id,
        userId,
        qualityLevel: dto.qualityLevel,
        amount: priceInfo.finalPrice,
        currency: 'USD',
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
      },
    });

    this.logger.log(
      `Created purchase ${purchase.id} for document ${dto.documentTypeSlug} at quality ${dto.qualityLevel}`,
    );

    return {
      purchaseId: purchase.id,
      projectId: dto.projectId,
      documentTypeSlug: dto.documentTypeSlug,
      qualityLevel: dto.qualityLevel,
      amount: priceInfo.finalPrice,
      currency: 'USD',
      clientSecret: paymentIntent.client_secret!,
      status: 'pending',
    };
  }

  /**
   * Get purchase status
   */
  async getPurchaseStatus(purchaseId: string, userId: string): Promise<DocumentPurchaseStatusDto> {
    const purchase = await this.prisma.documentPurchase.findFirst({
      where: { id: purchaseId, userId },
      include: {
        documentType: true,
        generatedDocument: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    return {
      purchaseId: purchase.id,
      projectId: purchase.projectId,
      documentTypeSlug: purchase.documentType.slug,
      documentTypeName: purchase.documentType.name,
      qualityLevel: purchase.qualityLevel,
      amount: purchase.amount.toNumber(),
      currency: purchase.currency,
      status: purchase.status as 'pending' | 'processing' | 'completed' | 'failed',
      documentId: purchase.generatedDocument?.id,
      generatedAt: purchase.generatedDocument?.createdAt,
      downloadUrl: purchase.generatedDocument
        ? `/api/v1/documents/${purchase.generatedDocument.id}/download`
        : undefined,
    };
  }

  /**
   * Get all purchases for a user
   */
  async getUserPurchases(userId: string): Promise<DocumentPurchaseStatusDto[]> {
    const purchases = await this.prisma.documentPurchase.findMany({
      where: { userId },
      include: {
        documentType: true,
        generatedDocument: true,
        project: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return purchases.map((p) => ({
      purchaseId: p.id,
      projectId: p.projectId,
      documentTypeSlug: p.documentType.slug,
      documentTypeName: p.documentType.name,
      qualityLevel: p.qualityLevel,
      amount: p.amount.toNumber(),
      currency: p.currency,
      status: p.status as 'pending' | 'processing' | 'completed' | 'failed',
      documentId: p.generatedDocument?.id,
      generatedAt: p.generatedDocument?.createdAt,
      downloadUrl: p.generatedDocument
        ? `/api/v1/documents/${p.generatedDocument.id}/download`
        : undefined,
    }));
  }

  /**
   * Handle Stripe webhook for payment completion
   */
  async handlePaymentSuccess(paymentIntentId: string): Promise<void> {
    const purchase = await this.prisma.documentPurchase.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!purchase) {
      this.logger.warn(`No purchase found for PaymentIntent ${paymentIntentId}`);
      return;
    }

    // Update status to processing (document generation will happen)
    await this.prisma.documentPurchase.update({
      where: { id: purchase.id },
      data: { status: 'processing' },
    });

    this.logger.log(`Payment successful for purchase ${purchase.id}, starting generation`);

    // Document generation will be triggered by the document-generation module
    // listening to this status change
  }

  /**
   * Handle Stripe webhook for payment failure
   */
  async handlePaymentFailure(paymentIntentId: string): Promise<void> {
    const purchase = await this.prisma.documentPurchase.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!purchase) {
      this.logger.warn(`No purchase found for PaymentIntent ${paymentIntentId}`);
      return;
    }

    await this.prisma.documentPurchase.update({
      where: { id: purchase.id },
      data: { status: 'failed' },
    });

    this.logger.log(`Payment failed for purchase ${purchase.id}`);
  }
}
