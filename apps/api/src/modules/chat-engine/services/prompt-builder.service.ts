import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';

/**
 * Prompt Builder Service
 *
 * Builds context-aware system prompts for Chat Engine based on:
 * - Project type (Business Plan, Tech Assessment, Marketing Strategy, etc.)
 * - Quality dimensions and their criteria
 * - Current extracted facts
 * - Chat history context
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build the system prompt for a project chat session
   */
  async buildSystemPrompt(projectId: string): Promise<string> {
    // Get project with type and dimensions
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectType: {
          include: {
            qualityDimensions: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        extractedFacts: {
          where: { confirmedByUser: true },
        },
      },
    });

    if (!project) {
      return this.getDefaultSystemPrompt();
    }

    const projectType = project.projectType;
    const dimensions = projectType?.qualityDimensions || [];
    const facts = project.extractedFacts || [];

    // Build prompt parts
    const parts: string[] = [];

    // 1. Role and context
    parts.push(this.buildRoleContext(projectType?.name || 'General'));

    // 2. Project context
    parts.push(this.buildProjectContext(project.name, project.description));

    // 3. Quality dimensions (what information to gather)
    if (dimensions.length > 0) {
      parts.push(this.buildDimensionsGuidance(dimensions));
    }

    // 4. Already gathered facts
    if (facts.length > 0) {
      parts.push(this.buildFactsContext(facts));
    }

    // 5. Conversation guidelines
    parts.push(this.buildConversationGuidelines());

    return parts.join('\n\n');
  }

  /**
   * Build role context for the assistant
   */
  private buildRoleContext(projectTypeName: string): string {
    return `You are Quiz2Biz, an expert business consultant AI assistant helping users create comprehensive ${projectTypeName} documents.

Your role is to have a natural conversation to gather all the information needed to produce high-quality business documents. You are knowledgeable, professional, and friendly.`;
  }

  /**
   * Build project context section
   */
  private buildProjectContext(name: string, description: string | null): string {
    let context = `## Current Project
**Name:** ${name}`;

    if (description) {
      context += `\n**Description:** ${description}`;
    }

    return context;
  }

  /**
   * Build dimensions guidance
   */
  private buildDimensionsGuidance(
    dimensions: Array<{
      name: string;
      description: string | null;
      weight: number | { toNumber: () => number };
      benchmarkCriteria: unknown;
    }>,
  ): string {
    const lines = ['## Information to Gather', 'Focus on gathering information for these key areas:', ''];

    for (const dim of dimensions) {
      const weight = typeof dim.weight === 'object' && 'toNumber' in dim.weight 
        ? dim.weight.toNumber() 
        : dim.weight;
      const priority = weight > 0.15 ? '⭐ High priority' : weight > 0.10 ? 'Medium priority' : 'Lower priority';
      
      lines.push(`### ${dim.name} (${priority})`);
      if (dim.description) {
        lines.push(dim.description);
      }

      // Add benchmark criteria as hints
      const criteria = dim.benchmarkCriteria as Array<{ criterion: string }> | null;
      if (criteria && Array.isArray(criteria) && criteria.length > 0) {
        lines.push('Key questions to explore:');
        for (const c of criteria.slice(0, 3)) {
          lines.push(`- ${c.criterion}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Build context from already gathered facts
   */
  private buildFactsContext(
    facts: Array<{
      fieldName: string;
      fieldValue: string;
      category: string | null;
      label: string | null;
    }>,
  ): string {
    const lines = ['## Information Already Gathered', 'The following facts have been confirmed:', ''];

    // Group facts by category
    const byCategory = new Map<string, typeof facts>();
    for (const fact of facts) {
      const category = fact.category || 'General';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(fact);
    }

    for (const [category, categoryFacts] of byCategory) {
      lines.push(`### ${category}`);
      for (const fact of categoryFacts) {
        const label = fact.label || fact.fieldName.replace(/_/g, ' ');
        lines.push(`- **${label}:** ${fact.fieldValue}`);
      }
      lines.push('');
    }

    lines.push('Do not re-ask for information that has already been gathered unless clarification is needed.');

    return lines.join('\n');
  }

  /**
   * Build conversation guidelines
   */
  private buildConversationGuidelines(): string {
    return `## Conversation Guidelines

1. **Be conversational**: Ask one or two questions at a time, not overwhelming lists
2. **Be adaptive**: Follow up on interesting or unclear answers
3. **Be helpful**: Offer examples and suggestions when users seem stuck
4. **Be encouraging**: Acknowledge good answers and progress
5. **Stay focused**: Guide the conversation toward gathering needed information
6. **Extract facts**: When you receive concrete information, mentally note it for later extraction
7. **Quality check**: Gently probe for specifics when answers are vague

Remember: The goal is to gather enough detailed information to generate professional business documents. The quality of the documents depends on the quality of information gathered in this conversation.`;
  }

  /**
   * Get default system prompt when no project context available
   */
  private getDefaultSystemPrompt(): string {
    return `You are Quiz2Biz, an expert business consultant AI assistant helping users create comprehensive business documents.

Your role is to have a natural conversation to gather all the information needed to produce high-quality business documents. Be conversational, ask follow-up questions, and help users articulate their business ideas clearly.

Focus on understanding:
- The business concept and value proposition
- Target market and customers
- Revenue model and financial projections
- Team and operations
- Technology requirements (if applicable)

Be helpful, encouraging, and professional.`;
  }

  /**
   * Build a follow-up prompt when chat limit is approaching
   */
  buildLimitApproachingPrompt(remaining: number): string {
    return `\n\n---\n**Note:** You have ${remaining} messages remaining in this conversation. Consider wrapping up with any final important questions or details.`;
  }

  /**
   * Build a prompt for when limit is reached
   */
  buildLimitReachedPrompt(): string {
    return `Thank you for this productive conversation! We've reached the message limit for this project.

You can now proceed to the Documents section to review the facts we've gathered and generate your business documents. If you need to continue the conversation, you can create a new project or upgrade your plan.`;
  }
}
