import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../../auth/auth.service';
import { DeliverablesCompilerService } from '../services/deliverables-compiler.service';
import { CompileDeliverablesDto, DeliverablePackResponseDto, CompiledDocumentDto } from '../dto';

/**
 * DeliverablesCompilerController
 *
 * Endpoints for Quiz2Biz Deliverables Pack compilation and export.
 * Implements Section 15 requirements for document generation.
 */
@ApiTags('deliverables')
@Controller('deliverables')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DeliverablesCompilerController {
  constructor(private readonly compilerService: DeliverablesCompilerService) {}

  /**
   * Compile complete deliverables pack for a session
   */
  @Post('compile')
  @ApiOperation({
    summary: 'Compile deliverables pack for a session',
    description:
      'Generates all Quiz2Biz deliverables including Architecture Dossier, SDLC Playbook, Test Strategy, DevSecOps, Privacy, Observability, Finance documents, Policy pack, Decision Log, and Readiness Report.',
  })
  @ApiResponse({
    status: 201,
    description: 'Deliverables pack compiled successfully',
    type: DeliverablePackResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Session not completed or invalid options' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async compileDeliverables(
    @Body() dto: CompileDeliverablesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeliverablePackResponseDto> {
    return this.compilerService.compileDeliverablesPack(dto.sessionId, user.id, {
      includeDecisionLog: dto.includeDecisionLog,
      includeReadinessReport: dto.includeReadinessReport,
      includePolicyPack: dto.includePolicyPack,
      autoSection: dto.autoSection,
      maxWordsPerSection: dto.maxWordsPerSection,
    });
  }

  /**
   * Get a specific document from a compiled pack by category
   */
  @Get('session/:sessionId/document/:category')
  @ApiOperation({
    summary: 'Get specific document by category',
    description: 'Retrieve a single document from the deliverables pack by its category.',
  })
  @ApiQuery({
    name: 'category',
    enum: [
      'ARCHITECTURE',
      'SDLC',
      'TESTING',
      'DEVSECOPS',
      'PRIVACY',
      'OBSERVABILITY',
      'FINANCE',
      'GOVERNANCE',
      'READINESS',
    ],
    description: 'Document category to retrieve',
  })
  @ApiResponse({ status: 200, description: 'Document retrieved', type: CompiledDocumentDto })
  @ApiResponse({ status: 404, description: 'Session or document category not found' })
  async getDocumentByCategory(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('category') category: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompiledDocumentDto> {
    const pack = await this.compilerService.compileDeliverablesPack(sessionId, user.id, {
      autoSection: true,
    });

    const document = pack.documents.find((doc) => String(doc.category) === category);
    if (!document) {
      throw new Error(`Document category '${category}' not found in pack`);
    }

    return document;
  }

  /**
   * Export deliverables pack as JSON
   */
  @Get('session/:sessionId/export/json')
  @ApiOperation({
    summary: 'Export deliverables pack as JSON',
    description: 'Download the complete deliverables pack in JSON format.',
  })
  @ApiResponse({ status: 200, description: 'JSON file download' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async exportAsJson(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pack = await this.compilerService.compileDeliverablesPack(sessionId, user.id, {
      includeDecisionLog: true,
      includeReadinessReport: true,
      includePolicyPack: true,
      autoSection: true,
    });

    const jsonContent = JSON.stringify(pack, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="deliverables-pack-${sessionId}.json"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }

  /**
   * Get pack summary without full content
   */
  @Get('session/:sessionId/summary')
  @ApiOperation({
    summary: 'Get deliverables pack summary',
    description:
      'Retrieve summary information about the deliverables pack without full document content.',
  })
  @ApiResponse({ status: 200, description: 'Pack summary' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getPackSummary(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    summary: DeliverablePackResponseDto['summary'];
    metadata: DeliverablePackResponseDto['metadata'];
    readinessScore: number;
    documentTitles: string[];
  }> {
    const pack = await this.compilerService.compileDeliverablesPack(sessionId, user.id, {
      autoSection: true,
    });

    return {
      summary: pack.summary,
      metadata: pack.metadata,
      readinessScore: pack.readinessScore,
      documentTitles: pack.documents.map((doc) => doc.title),
    };
  }

  /**
   * List available document categories
   */
  @Get('categories')
  @ApiOperation({
    summary: 'List available document categories',
    description: 'Get list of all document categories available in the deliverables pack.',
  })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async listCategories(): Promise<{ categories: string[]; descriptions: Record<string, string> }> {
    return {
      categories: [
        'ARCHITECTURE',
        'SDLC',
        'TESTING',
        'DEVSECOPS',
        'PRIVACY',
        'OBSERVABILITY',
        'FINANCE',
        'GOVERNANCE',
        'READINESS',
      ],
      descriptions: {
        ARCHITECTURE: 'Architecture Dossier - System design, components, and technical decisions',
        SDLC: 'SDLC Playbook - Software development lifecycle processes and workflows',
        TESTING: 'Test Strategy - Testing approaches, coverage, and quality gates',
        DEVSECOPS: 'DevSecOps Guide - Security practices, CI/CD, and automation',
        PRIVACY: 'Privacy & Data Protection - GDPR, data handling, and compliance',
        OBSERVABILITY: 'Observability Guide - Monitoring, logging, and alerting',
        FINANCE: 'Finance & Economics - Cost analysis, ROI, and business metrics',
        GOVERNANCE: 'Policy & Governance Pack - Policies, standards, and procedures',
        READINESS: 'Readiness Report - Overall readiness assessment and recommendations',
      },
    };
  }

  /**
   * Get decision log export
   */
  @Get('session/:sessionId/decision-log')
  @ApiOperation({
    summary: 'Export decision log',
    description: 'Get the decision log document from the deliverables pack.',
  })
  @ApiResponse({ status: 200, description: 'Decision log document', type: CompiledDocumentDto })
  @ApiResponse({ status: 404, description: 'Session not found or no decisions recorded' })
  async getDecisionLog(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompiledDocumentDto | null> {
    const pack = await this.compilerService.compileDeliverablesPack(sessionId, user.id, {
      includeDecisionLog: true,
      autoSection: true,
    });

    const decisionLog = pack.documents.find((doc) =>
      doc.title.toLowerCase().includes('decision log'),
    );

    return decisionLog ?? null;
  }

  /**
   * Get readiness report
   */
  @Get('session/:sessionId/readiness-report')
  @ApiOperation({
    summary: 'Get readiness report',
    description: 'Get the readiness report document with scores and recommendations.',
  })
  @ApiResponse({ status: 200, description: 'Readiness report document', type: CompiledDocumentDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getReadinessReport(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompiledDocumentDto | null> {
    const pack = await this.compilerService.compileDeliverablesPack(sessionId, user.id, {
      includeReadinessReport: true,
      autoSection: true,
    });

    const readinessReport = pack.documents.find((doc) => String(doc.category) === 'READINESS');

    return readinessReport ?? null;
  }
}
