/**
 * DTOs for document commerce operations
 * Per-document pricing and purchase flows
 */

import { IsString, IsNumber, IsOptional, Min, Max, IsUUID } from 'class-validator';

/**
 * Quality level range: 0 (basic) to 4 (premium)
 * Maps to multiplier: 1x, 2x, 3x, 4x, 5x
 */
export class PriceCalculationDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  documentTypeSlug!: string;

  @IsNumber()
  @Min(0)
  @Max(4)
  qualityLevel!: number;
}

export class PriceCalculationResponseDto {
  projectId!: string;
  documentTypeSlug!: string;
  documentTypeName!: string;
  basePrice!: number;
  qualityLevel!: number;
  qualityMultiplier!: number;
  finalPrice!: number;
  currency!: string;
  estimatedPages!: number;
  features!: string[];
}

export class CreatePurchaseDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  documentTypeSlug!: string;

  @IsNumber()
  @Min(0)
  @Max(4)
  qualityLevel!: number;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class PurchaseResponseDto {
  purchaseId!: string;
  projectId!: string;
  documentTypeSlug!: string;
  qualityLevel!: number;
  amount!: number;
  currency!: string;
  clientSecret!: string;
  status!: 'pending' | 'processing' | 'completed' | 'failed';
}

export class DocumentPurchaseStatusDto {
  purchaseId!: string;
  projectId!: string;
  documentTypeSlug!: string;
  documentTypeName!: string;
  qualityLevel!: number;
  amount!: number;
  currency!: string;
  status!: 'pending' | 'processing' | 'completed' | 'failed';
  documentId?: string;
  generatedAt?: Date;
  downloadUrl?: string;
}

export class AvailableDocumentDto {
  slug!: string;
  name!: string;
  description!: string;
  category!: string;
  basePrice!: number;
  currency!: string;
  estimatedPagesBase!: number;
  requiredFactCount!: number;
  currentFactCount!: number;
  isAvailable!: boolean;
  unavailableReason?: string;
}

export class ProjectDocumentsDto {
  projectId!: string;
  projectName!: string;
  qualityScore!: number;
  availableDocuments!: AvailableDocumentDto[];
  purchasedDocuments!: DocumentPurchaseStatusDto[];
}
