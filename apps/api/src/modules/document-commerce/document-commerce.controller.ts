/**
 * Document Commerce Controller
 * REST endpoints for document pricing and purchasing
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { PricingCalculatorService } from './services/pricing-calculator.service';
import { DocumentPurchaseService } from './services/document-purchase.service';
import {
  PriceCalculationDto,
  PriceCalculationResponseDto,
  CreatePurchaseDto,
  PurchaseResponseDto,
  DocumentPurchaseStatusDto,
  ProjectDocumentsDto,
} from './dto/document-commerce.dto';

interface JwtUser {
  id: string;
  email: string;
}

@Controller('api/v1/documents')
@UseGuards(JwtAuthGuard)
export class DocumentCommerceController {
  constructor(
    private readonly pricingCalculator: PricingCalculatorService,
    private readonly purchaseService: DocumentPurchaseService,
  ) {}

  /**
   * Calculate price for a document at a given quality level
   * POST /api/v1/documents/price
   */
  @Post('price')
  @HttpCode(HttpStatus.OK)
  async calculatePrice(@Body() dto: PriceCalculationDto): Promise<PriceCalculationResponseDto> {
    return this.pricingCalculator.calculatePrice(dto);
  }

  /**
   * Get all documents available for a project
   * GET /api/v1/documents/project/:projectId
   */
  @Get('project/:projectId')
  async getProjectDocuments(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<ProjectDocumentsDto> {
    return this.pricingCalculator.getProjectDocuments(projectId, user.id);
  }

  /**
   * Create a new document purchase
   * POST /api/v1/documents/purchase
   */
  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  async createPurchase(
    @Body() dto: CreatePurchaseDto,
    @CurrentUser() user: JwtUser,
  ): Promise<PurchaseResponseDto> {
    return this.purchaseService.createPurchase(dto, user.id);
  }

  /**
   * Get purchase status
   * GET /api/v1/documents/purchase/:purchaseId
   */
  @Get('purchase/:purchaseId')
  async getPurchaseStatus(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<DocumentPurchaseStatusDto> {
    return this.purchaseService.getPurchaseStatus(purchaseId, user.id);
  }

  /**
   * Get all purchases for current user
   * GET /api/v1/documents/purchases
   */
  @Get('purchases')
  async getUserPurchases(@CurrentUser() user: JwtUser): Promise<DocumentPurchaseStatusDto[]> {
    return this.purchaseService.getUserPurchases(user.id);
  }
}
