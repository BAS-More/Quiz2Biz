/**
 * Fact Extraction Controller
 *
 * REST endpoints for managing extracted facts from project conversations.
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FactExtractionService } from './services';
import {
  ExtractedFactDto,
  TriggerExtractionDto,
  UpdateFactDto,
  FactValidationResultDto,
  ExtractFactsResponseDto,
} from './dto';

@ApiTags('Fact Extraction')
@Controller('facts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FactExtractionController {
  private readonly logger = new Logger(FactExtractionController.name);

  constructor(private readonly factExtraction: FactExtractionService) {}

  /**
   * Get all extracted facts for a project
   */
  @Get(':projectId')
  @ApiOperation({ summary: 'Get all extracted facts for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: [ExtractedFactDto] })
  async getProjectFacts(@Param('projectId') projectId: string): Promise<ExtractedFactDto[]> {
    this.logger.log(`Getting facts for project ${projectId}`);
    const facts = await this.factExtraction.getProjectFacts(projectId);
    return facts.map((f) => ({
      key: f.key,
      value: f.value,
      category: f.category,
      confidence: f.confidence,
      sourceMessageId: f.sourceMessageId,
    }));
  }

  /**
   * Trigger fact extraction for a project
   */
  @Post(':projectId/extract')
  @ApiOperation({ summary: 'Trigger fact extraction from recent conversation' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: ExtractFactsResponseDto })
  async triggerExtraction(
    @Param('projectId') projectId: string,
    @Body() dto: TriggerExtractionDto,
  ): Promise<ExtractFactsResponseDto> {
    this.logger.log(`Triggering extraction for project ${projectId}`);

    const facts = await this.factExtraction.triggerExtractionAfterMessage(
      projectId,
      dto.messageId || '',
    );

    return {
      facts: facts.map((f) => ({
        key: f.key,
        value: f.value,
        category: f.category,
        confidence: f.confidence,
        sourceMessageId: f.sourceMessageId,
      })),
      processingTimeMs: 0,
      tokensUsed: 0,
    };
  }

  /**
   * Validate project facts against schema
   */
  @Get(':projectId/validate')
  @ApiOperation({ summary: 'Validate facts against project type schema' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: FactValidationResultDto })
  async validateFacts(@Param('projectId') projectId: string): Promise<FactValidationResultDto> {
    this.logger.log(`Validating facts for project ${projectId}`);

    // Get project type from project
    // For now, return a basic validation
    const validation = await this.factExtraction.validateFacts(projectId, 'business-plan');
    return validation;
  }

  /**
   * Update a specific fact
   */
  @Put(':projectId/:factKey')
  @ApiOperation({ summary: 'Update a specific fact value' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'factKey', description: 'Fact key to update' })
  @ApiResponse({ status: 200, type: ExtractedFactDto })
  async updateFact(
    @Param('projectId') projectId: string,
    @Param('factKey') factKey: string,
    @Body() dto: UpdateFactDto,
  ): Promise<ExtractedFactDto | null> {
    this.logger.log(`Updating fact ${factKey} for project ${projectId}`);

    const updated = await this.factExtraction.updateFact(projectId, factKey, dto.value);

    if (!updated) {
      return null;
    }

    return {
      key: updated.key,
      value: updated.value,
      category: updated.category,
      confidence: updated.confidence,
      sourceMessageId: updated.sourceMessageId,
    };
  }

  /**
   * Delete a specific fact
   */
  @Delete(':projectId/:factKey')
  @ApiOperation({ summary: 'Delete a specific fact' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'factKey', description: 'Fact key to delete' })
  @ApiResponse({ status: 200 })
  async deleteFact(
    @Param('projectId') projectId: string,
    @Param('factKey') factKey: string,
  ): Promise<{ deleted: boolean }> {
    this.logger.log(`Deleting fact ${factKey} for project ${projectId}`);

    await this.factExtraction.deleteFact(projectId, factKey);
    return { deleted: true };
  }
}
