import { Controller, Get, Param, Query, Res, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { HeatmapService } from './heatmap.service';
import {
  HeatmapResultDto,
  HeatmapSummaryDto,
  HeatmapCellDto,
  HeatmapDrilldownDto,
  HeatmapCellsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Gap Heatmap Controller
 *
 * Provides endpoints for heatmap visualization and export:
 * - Generate heatmap for a session
 * - Get summary statistics
 * - Export to CSV/Markdown
 * - Drilldown into specific cells
 */
@ApiTags('Heatmap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('heatmap')
export class HeatmapController {
  constructor(private readonly heatmapService: HeatmapService) {}

  /**
   * Generate gap heatmap for a session.
   */
  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get gap heatmap for a session',
    description: 'Generates a dimension × severity matrix showing readiness gaps.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Heatmap generated successfully',
    type: HeatmapResultDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getHeatmap(@Param('sessionId') sessionId: string): Promise<HeatmapResultDto> {
    return this.heatmapService.generateHeatmap(sessionId);
  }

  /**
   * Get heatmap summary statistics.
   */
  @Get(':sessionId/summary')
  @ApiOperation({
    summary: 'Get heatmap summary statistics',
    description: 'Returns count of green/amber/red cells, critical gaps, and overall risk.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Summary retrieved successfully',
    type: HeatmapSummaryDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSummary(@Param('sessionId') sessionId: string): Promise<HeatmapSummaryDto> {
    return this.heatmapService.getSummary(sessionId);
  }

  /**
   * Export heatmap to CSV format.
   */
  @Get(':sessionId/export/csv')
  @ApiOperation({
    summary: 'Export heatmap to CSV format',
    description: 'Downloads the heatmap as a CSV file.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'CSV file generated' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async exportToCsv(@Param('sessionId') sessionId: string, @Res() res: Response): Promise<void> {
    const csv = await this.heatmapService.exportToCsv(sessionId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="heatmap-${sessionId}.csv"`);
    res.status(HttpStatus.OK).send(csv);
  }

  /**
   * Export heatmap to Markdown format.
   */
  @Get(':sessionId/export/markdown')
  @ApiOperation({
    summary: 'Export heatmap to Markdown format',
    description: 'Downloads the heatmap as a Markdown file.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Markdown file generated' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async exportToMarkdown(
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const markdown = await this.heatmapService.exportToMarkdown(sessionId);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="heatmap-${sessionId}.md"`);
    res.status(HttpStatus.OK).send(markdown);
  }

  /**
   * Get filtered heatmap cells.
   */
  @Get(':sessionId/cells')
  @ApiOperation({
    summary: 'Get individual heatmap cells',
    description: 'Returns heatmap cells with optional filtering by dimension or severity.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiQuery({ name: 'dimension', required: false, description: 'Filter by dimension key' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity bucket' })
  @ApiResponse({
    status: 200,
    description: 'Cells retrieved successfully',
    type: [HeatmapCellDto],
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getCells(
    @Param('sessionId') sessionId: string,
    @Query() query: HeatmapCellsQueryDto,
  ): Promise<HeatmapCellDto[]> {
    return this.heatmapService.getCells(sessionId, query.dimension, query.severity);
  }

  /**
   * Drilldown into a specific heatmap cell.
   */
  @Get(':sessionId/drilldown/:dimensionKey/:severityBucket')
  @ApiOperation({
    summary: 'Drilldown into a specific heatmap cell',
    description: 'Returns questions contributing to a specific dimension × severity cell.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiParam({ name: 'dimensionKey', description: 'Dimension key (e.g., MODERN_ARCH)' })
  @ApiParam({
    name: 'severityBucket',
    description: 'Severity bucket (Low, Medium, High, Critical)',
  })
  @ApiResponse({
    status: 200,
    description: 'Drilldown data retrieved successfully',
    type: HeatmapDrilldownDto,
  })
  @ApiResponse({ status: 404, description: 'Session or cell not found' })
  async drilldown(
    @Param('sessionId') sessionId: string,
    @Param('dimensionKey') dimensionKey: string,
    @Param('severityBucket') severityBucket: string,
  ): Promise<HeatmapDrilldownDto> {
    return this.heatmapService.drilldown(sessionId, dimensionKey, severityBucket);
  }
}
