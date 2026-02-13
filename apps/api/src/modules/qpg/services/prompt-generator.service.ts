/**
 * Prompt Generator Service
 * Generates Quest-Mode prompts from gap context and templates
 */
import { Injectable, Logger } from '@nestjs/common';
import { GapContext, PromptTemplate, QuestModePrompt, PromptTask, TaskCondition } from '../types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PromptGeneratorService {
  private readonly logger = new Logger(PromptGeneratorService.name);

  /**
   * Generate a Quest-Mode prompt from gap context and template
   */
  async generate(gap: GapContext, template: PromptTemplate): Promise<QuestModePrompt> {
    this.logger.debug(`Generating prompt for gap: ${gap.questionId}`);

    // Build context variables for template interpolation
    const context = this.buildTemplateContext(gap);

    // Generate goal
    const goal = this.interpolate(template.goalTemplate, context);

    // Generate tasks
    const tasks = this.generateTasks(template.taskTemplates, context, gap);

    // Generate acceptance criteria
    const acceptanceCriteria = template.defaultAcceptanceCriteria.map((ac) =>
      this.interpolate(ac, context),
    );

    // Generate constraints
    const constraints = template.defaultConstraints.map((c) => this.interpolate(c, context));

    // Generate deliverables
    const deliverables = template.defaultDeliverables.map((d) => this.interpolate(d, context));

    // Calculate priority (1-5 based on residual risk)
    const priority = this.calculatePriority(gap.residualRisk);

    // Calculate effort estimate (base * severity factor)
    const effortMultiplier = gap.severity > 0.7 ? 1.5 : gap.severity > 0.4 ? 1.2 : 1.0;
    const estimatedEffort = Math.round(template.baseEffortHours * effortMultiplier);

    // Generate tags
    const tags = this.generateTags(gap, template);

    const prompt: QuestModePrompt = {
      id: `prompt-${uuidv4()}`,
      dimensionKey: gap.dimensionKey,
      questionId: gap.questionId,
      goal,
      tasks,
      acceptanceCriteria,
      constraints,
      deliverables,
      priority,
      estimatedEffort,
      evidenceType: template.evidenceType,
      tags,
      generatedAt: new Date(),
    };

    return prompt;
  }

  /**
   * Build context variables for template interpolation
   */
  private buildTemplateContext(gap: GapContext): Record<string, string> {
    return {
      dimensionKey: gap.dimensionKey,
      dimensionName: gap.dimensionName,
      questionId: gap.questionId,
      questionText: gap.questionText,
      currentCoverage: `${Math.round(gap.currentCoverage * 100)}%`,
      severity: gap.severity.toFixed(2),
      residualRisk: gap.residualRisk.toFixed(3),
      bestPractice: gap.bestPractice,
      practicalExplainer: gap.practicalExplainer,
      standardRefs: gap.standardRefs.join(', ') || 'industry best practices',
      userAnswer: gap.userAnswer || 'Not provided',
      userNotes: gap.userNotes || 'None',
    };
  }

  /**
   * Interpolate template string with context variables
   */
  private interpolate(template: string, context: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] || match;
    });
  }

  /**
   * Generate tasks from templates, applying conditions
   */
  private generateTasks(
    taskTemplates: PromptTemplate['taskTemplates'],
    context: Record<string, string>,
    gap: GapContext,
  ): PromptTask[] {
    const tasks: PromptTask[] = [];

    for (const tt of taskTemplates) {
      // Check condition if present
      if (tt.condition && !this.evaluateCondition(tt.condition, gap)) {
        continue;
      }

      tasks.push({
        order: tt.order,
        description: this.interpolate(tt.template, context),
      });
    }

    return tasks;
  }

  /**
   * Evaluate task condition
   */
  private evaluateCondition(condition: TaskCondition, gap: GapContext): boolean {
    const value = (gap as any)[condition.field];
    if (value === undefined) {
      return false;
    }

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return typeof value === 'number' && value > (condition.value as number);
      case 'lt':
        return typeof value === 'number' && value < (condition.value as number);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      default:
        return false;
    }
  }

  /**
   * Calculate priority from residual risk (1-5, 1 = highest)
   */
  private calculatePriority(residualRisk: number): number {
    if (residualRisk > 0.2) {
      return 1;
    } // Critical
    if (residualRisk > 0.15) {
      return 2;
    } // High
    if (residualRisk > 0.1) {
      return 3;
    } // Medium
    if (residualRisk > 0.05) {
      return 4;
    } // Low
    return 5; // Minimal
  }

  /**
   * Generate tags for the prompt
   */
  private generateTags(gap: GapContext, template: PromptTemplate): string[] {
    const tags: string[] = [gap.dimensionKey, template.evidenceType.toLowerCase()];

    // Add priority tag
    const priority = this.calculatePriority(gap.residualRisk);
    if (priority === 1) {
      tags.push('critical');
    } else if (priority === 2) {
      tags.push('high-priority');
    }

    // Add standard refs as tags
    for (const ref of gap.standardRefs.slice(0, 3)) {
      const cleanRef = ref.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      if (cleanRef) {
        tags.push(cleanRef);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Format prompt as markdown for display/export
   */
  formatAsMarkdown(prompt: QuestModePrompt): string {
    const lines: string[] = [
      `# ${prompt.goal}`,
      '',
      '## Goal',
      prompt.goal,
      '',
      '## Tasks',
      ...prompt.tasks.map((t) => `${t.order}. ${t.description}`),
      '',
      '## Acceptance Criteria',
      ...prompt.acceptanceCriteria.map((ac) => `- [ ] ${ac}`),
      '',
      '## Constraints',
      ...prompt.constraints.map((c) => `- ${c}`),
      '',
      '## Deliverables',
      ...prompt.deliverables.map((d) => `- ${d}`),
      '',
      '---',
      `**Priority:** P${prompt.priority}`,
      `**Estimated Effort:** ${prompt.estimatedEffort}h`,
      `**Evidence Required:** ${prompt.evidenceType}`,
      `**Tags:** ${prompt.tags.join(', ')}`,
    ];

    return lines.join('\n');
  }
}
