/**
 * Pricing Calculator Service
 * Implements quality-based pricing: price = basePrice × (1 + qualityLevel)
 * Quality levels: 0=Basic(1x), 1=Standard(2x), 2=Enhanced(3x), 3=Premium(4x), 4=Enterprise(5x)
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import {
  PriceCalculationDto,
  PriceCalculationResponseDto,
  AvailableDocumentDto,
  ProjectDocumentsDto,
} from '../dto/document-commerce.dto';

/** Quality level features for each tier */
const QUALITY_FEATURES: Record<number, string[]> = {
  0: ['Basic content', 'Standard formatting', '~5-10 pages'],
  1: ['Expanded content', 'Professional formatting', 'Basic citations', '~10-15 pages'],
  2: ['Comprehensive content', 'Enhanced formatting', 'Full citations', 'Charts', '~15-25 pages'],
  3: ['Premium content', 'Executive formatting', 'Full citations', 'Charts', 'SWOT', '~25-40 pages'],
  4: ['Enterprise content', 'Board-ready formatting', 'Full citations', 'All visuals', 'Appendices', '~40-60 pages'],
};

/** Quality level names */
const QUALITY_NAMES: Record<number, string> = {
  0: 'Basic',
  1: 'Standard',
  2: 'Enhanced',
  3: 'Premium',
  4: 'Enterprise',
};

/** Base page estimates per quality level */
const BASE_PAGES: Record<number, number> = {
  0: 8,
  1: 12,
  2: 20,
  3: 32,
  4: 50,
};

@Injectable()
export class PricingCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate price for a document at a given quality level
   * Formula: price = basePrice × (1 + qualityLevel)
   */
  async calculatePrice(dto: PriceCalculationDto): Promise<PriceCalculationResponseDto> {
    // Validate project exists and belongs to user (auth handled in controller)
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: { projectType: true },
    });

    if (!project) {
      throw new NotFoundException(`Project ${dto.projectId} not found`);
    }

    // Get document type with base price
    const documentType = await this.prisma.documentType.findUnique({
      where: { slug: dto.documentTypeSlug },
    });

    if (!documentType) {
      throw new NotFoundException(`Document type ${dto.documentTypeSlug} not found`);
    }

    // Validate quality level
    if (dto.qualityLevel < 0 || dto.qualityLevel > 4) {
      throw new BadRequestException('Quality level must be between 0 and 4');
    }

    // Calculate multiplier and final price
    const qualityMultiplier = 1 + dto.qualityLevel;
    const basePrice = documentType.basePrice?.toNumber() ?? 49.99;
    const finalPrice = Math.round(basePrice * qualityMultiplier * 100) / 100;

    return {
      projectId: dto.projectId,
      documentTypeSlug: dto.documentTypeSlug,
      documentTypeName: documentType.name,
      basePrice,
      qualityLevel: dto.qualityLevel,
      qualityMultiplier,
      finalPrice,
      currency: 'USD',
      estimatedPages: BASE_PAGES[dto.qualityLevel] ?? 10,
      features: QUALITY_FEATURES[dto.qualityLevel] ?? [],
    };
  }

  /**
   * Get all available documents for a project with pricing info
   */
  async getProjectDocuments(projectId: string, userId: string): Promise<ProjectDocumentsDto> {
    // Get project with facts count
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        projectType: true,
        _count: { select: { extractedFacts: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Get all document types
    const documentTypes = await this.prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Get purchased documents for this project
    const purchases = await this.prisma.documentPurchase.findMany({
      where: { projectId },
      include: { documentType: true, generatedDocument: true },
    });

    // Calculate quality score from project
    const qualityScore = project.qualityScore?.toNumber() ?? 0;
    const factCount = project._count.extractedFacts;

    // Build available documents list
    const availableDocuments: AvailableDocumentDto[] = documentTypes.map((dt) => {
      const requiredFacts = this.getRequiredFactCount(dt.slug);
      const isAvailable = factCount >= requiredFacts;

      return {
        slug: dt.slug,
        name: dt.name,
        description: dt.description ?? '',
        category: dt.category ?? 'general',
        basePrice: dt.basePrice?.toNumber() ?? 49.99,
        currency: 'USD',
        estimatedPagesBase: BASE_PAGES[0] ?? 8,
        requiredFactCount: requiredFacts,
        currentFactCount: factCount,
        isAvailable,
        unavailableReason: isAvailable 
          ? undefined 
          : `Need ${requiredFacts - factCount} more facts from chat`,
      };
    });

    // Build purchased documents list
    const purchasedDocuments = purchases.map((p) => ({
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

    return {
      projectId,
      projectName: project.name,
      qualityScore,
      availableDocuments,
      purchasedDocuments,
    };
  }

  /**
   * Get required fact count for document type
   * Different documents need different amounts of data
   */
  private getRequiredFactCount(documentTypeSlug: string): number {
    const requirements: Record<string, number> = {
      'executive-summary': 5,
      'business-plan': 15,
      'financial-projections': 10,
      'market-analysis': 8,
      'pitch-deck': 12,
      'operations-manual': 10,
      'marketing-strategy': 8,
      'tech-assessment': 10,
      'grant-application': 12,
      'investor-memo': 10,
    };
    return requirements[documentTypeSlug] ?? 10;
  }

  /**
   * Get quality level name
   */
  getQualityLevelName(level: number): string {
    return QUALITY_NAMES[level] ?? 'Basic';
  }

  /**
   * Get features for quality level
   */
  getQualityFeatures(level: number): string[] {
    return QUALITY_FEATURES[level] ?? QUALITY_FEATURES[0];
  }
}
