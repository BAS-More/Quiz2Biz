/**
 * QPG Controller
 * API endpoints for the Qoder Prompt Generator
 */
import { Controller, Get, Post, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QpgService } from './qpg.service';
import { GeneratePromptsDto } from './dto';
import { PromptGeneratorService } from './services/prompt-generator.service';

@ApiTags('QPG - Qoder Prompt Generator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/qpg')
export class QpgController {
  private readonly logger = new Logger(QpgController.name);

  constructor(
    private readonly qpgService: QpgService,
    private readonly promptGenerator: PromptGeneratorService,
  ) {}

  /**
   * Generate prompts for all gaps in a session
   */
  @Post('generate')
  @ApiOperation({
    summary: 'Generate Quest-Mode prompts for session gaps',
    description:
      'Analyzes gaps in the questionnaire session and generates structured prompts for remediation',
  })
  @ApiResponse({
    status: 201,
    description: 'Prompts generated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async generatePrompts(@Body() dto: GeneratePromptsDto) {
    this.logger.log(`Generating prompts for session: ${dto.sessionId}`);

    const batch = await this.qpgService.generatePromptsForSession(dto.sessionId);

    // Apply filters if specified
    let prompts = batch.prompts;

    if (dto.dimensions?.length) {
      prompts = prompts.filter((p) => dto.dimensions!.includes(p.dimensionKey));
    }

    if (dto.minResidualRisk !== undefined) {
      const gaps = await this.qpgService.getSessionGaps(dto.sessionId);
      const gapMap = new Map(gaps.map((g) => [g.questionId, g]));
      prompts = prompts.filter((p) => {
        const gap = gapMap.get(p.questionId);
        return gap && gap.residualRisk >= dto.minResidualRisk!;
      });
    }

    if (dto.maxPrompts) {
      prompts = prompts.slice(0, dto.maxPrompts);
    }

    return {
      ...batch,
      prompts,
      filteredCount: prompts.length,
    };
  }

  /**
   * Get available prompt templates
   */
  @Get('templates')
  @ApiOperation({
    summary: 'Get all available prompt templates',
    description: 'Returns templates for all 11 readiness dimensions',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  async getTemplates() {
    const templates = await this.qpgService.getAvailableTemplates();
    return {
      count: templates.length,
      templates: templates.map((t) => ({
        id: t.id,
        dimensionKey: t.dimensionKey,
        version: t.version,
        evidenceType: t.evidenceType,
        baseEffortHours: t.baseEffortHours,
      })),
    };
  }

  /**
   * Get gaps for a session
   */
  @Get('gaps/:sessionId')
  @ApiOperation({
    summary: 'Get identified gaps for a session',
    description: 'Returns all questions with coverage < 1.0',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Questionnaire session ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Gaps retrieved successfully',
  })
  async getSessionGaps(@Param('sessionId') sessionId: string) {
    const gaps = await this.qpgService.getSessionGaps(sessionId);
    return {
      sessionId,
      count: gaps.length,
      gaps: gaps.map((g) => ({
        dimensionKey: g.dimensionKey,
        dimensionName: g.dimensionName,
        questionId: g.questionId,
        currentCoverage: g.currentCoverage,
        severity: g.severity,
        residualRisk: g.residualRisk,
        bestPractice: g.bestPractice,
      })),
    };
  }

  /**
   * Export prompts as markdown
   */
  @Get('export/:sessionId')
  @ApiOperation({
    summary: 'Export prompts as markdown',
    description: 'Returns formatted markdown for all prompts in a session',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Questionnaire session ID',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['markdown', 'json'],
    description: 'Export format (default: markdown)',
  })
  @ApiResponse({
    status: 200,
    description: 'Export generated successfully',
  })
  async exportPrompts(
    @Param('sessionId') sessionId: string,
    @Query('format') format: 'markdown' | 'json' = 'markdown',
  ) {
    const batch = await this.qpgService.generatePromptsForSession(sessionId);

    if (format === 'json') {
      return batch;
    }

    // Generate markdown
    const sections: string[] = [
      '# Quiz2Biz Remediation Prompts',
      '',
      `**Session:** ${sessionId}`,
      `**Generated:** ${batch.generatedAt.toISOString()}`,
      `**Score at Generation:** ${batch.scoreAtGeneration}%`,
      `**Total Effort:** ${batch.totalEffortHours} hours`,
      `**Dimensions Covered:** ${batch.dimensionsCovered.join(', ')}`,
      '',
      '---',
      '',
    ];

    for (const prompt of batch.prompts) {
      sections.push(this.promptGenerator.formatAsMarkdown(prompt));
      sections.push('');
      sections.push('---');
      sections.push('');
    }

    return {
      format: 'markdown',
      content: sections.join('\n'),
    };
  }
}
