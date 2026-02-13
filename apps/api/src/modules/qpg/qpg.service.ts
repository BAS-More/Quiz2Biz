/**
 * QPG Service - Main orchestration service for prompt generation
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { PromptTemplateService } from './services/prompt-template.service';
import { ContextBuilderService } from './services/context-builder.service';
import { PromptGeneratorService } from './services/prompt-generator.service';
import { GapContext, PromptBatch, QuestModePrompt } from './types';

@Injectable()
export class QpgService {
  private readonly logger = new Logger(QpgService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: PromptTemplateService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly promptGenerator: PromptGeneratorService,
  ) {}

  /**
   * Generate prompts for all gaps in a session
   * @param sessionId - The questionnaire session ID
   * @returns PromptBatch with all generated prompts
   */
  async generatePromptsForSession(sessionId: string): Promise<PromptBatch> {
    this.logger.log(`Generating prompts for session: ${sessionId}`);

    // Build context from session gaps
    const gaps = await this.contextBuilder.buildGapContexts(sessionId);
    this.logger.log(`Found ${gaps.length} gaps to address`);

    // Generate prompts for each gap
    const prompts: QuestModePrompt[] = [];
    for (const gap of gaps) {
      const template = await this.templateService.getTemplateForDimension(gap.dimensionKey);
      if (template) {
        const prompt = await this.promptGenerator.generate(gap, template);
        prompts.push(prompt);
      } else {
        this.logger.warn(`No template found for dimension: ${gap.dimensionKey}`);
      }
    }

    // Sort prompts by priority (highest residual risk first)
    prompts.sort((a, b) => a.priority - b.priority);

    // Calculate totals
    const totalEffortHours = prompts.reduce((sum, p) => sum + p.estimatedEffort, 0);
    const dimensionsCovered = [...new Set(prompts.map((p) => p.dimensionKey))];

    // Get current score
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    const scoreAtGeneration = session?.readinessScore
      ? typeof session.readinessScore === 'number'
        ? session.readinessScore
        : ((session.readinessScore as any).toNumber?.() ?? Number(session.readinessScore))
      : 0;

    const batch: PromptBatch = {
      id: `batch-${Date.now()}`,
      sessionId,
      prompts,
      totalEffortHours,
      dimensionsCovered,
      generatedAt: new Date(),
      scoreAtGeneration,
    };

    this.logger.log(`Generated ${prompts.length} prompts, total effort: ${totalEffortHours}h`);

    return batch;
  }

  /**
   * Generate a single prompt for a specific gap
   */
  async generatePromptForGap(gap: GapContext): Promise<QuestModePrompt | null> {
    const template = await this.templateService.getTemplateForDimension(gap.dimensionKey);
    if (!template) {
      this.logger.warn(`No template found for dimension: ${gap.dimensionKey}`);
      return null;
    }
    return this.promptGenerator.generate(gap, template);
  }

  /**
   * Get all available templates
   */
  async getAvailableTemplates() {
    return this.templateService.getAllTemplates();
  }

  /**
   * Get gaps for a session that need prompts
   */
  async getSessionGaps(sessionId: string): Promise<GapContext[]> {
    return this.contextBuilder.buildGapContexts(sessionId);
  }
}
