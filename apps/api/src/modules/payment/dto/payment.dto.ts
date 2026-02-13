import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum SubscriptionTierDto {
  FREE = 'FREE',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatusDto {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing',
}

/**
 * DTO for creating a checkout session
 */
export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsEnum(SubscriptionTierDto)
  tier: SubscriptionTierDto;

  @IsString()
  @IsNotEmpty()
  successUrl: string;

  @IsString()
  @IsNotEmpty()
  cancelUrl: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}

/**
 * DTO for creating a customer portal session
 */
export class CreatePortalSessionDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  returnUrl: string;
}

/**
 * Response DTO for subscription status
 */
export class SubscriptionResponseDto {
  organizationId: string;
  tier: SubscriptionTierDto;
  status: SubscriptionStatusDto;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  features: {
    questionnaires: number;
    responses: number;
    documents: number;
    apiCalls: number;
    support: string;
  };
}

/**
 * Response DTO for invoice
 */
export class InvoiceResponseDto {
  id: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: Date;
  createdAt: Date;
  invoiceUrl?: string;
  invoicePdfUrl?: string;
}

/**
 * DTO for upgrading/downgrading subscription
 */
export class UpdateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @IsEnum(SubscriptionTierDto)
  newTier: SubscriptionTierDto;
}

/**
 * DTO for canceling subscription
 */
export class CancelSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @IsOptional()
  cancelImmediately?: boolean;
}
