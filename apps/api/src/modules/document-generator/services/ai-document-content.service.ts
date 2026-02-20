import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Represents a single question-answer pair from a completed session,
 * including the dimension context for document generation.
 */
export interface SessionAnswer {
  question: string;
  answer: string;
  dimensionKey: string;
}

/**
 * Defines a section within a document template
 * that the AI should populate with content.
 */
export interface DocumentTemplateSection {
  heading: string;
  description: string;
  requiredFields?: string[];
}

/**
 * Parameters required to generate AI-powered document content.
 */
export interface GenerateDocumentContentParams {
  projectTypeName: string;
  documentTypeName: string;
  sessionAnswers: SessionAnswer[];
  documentTemplateSections: DocumentTemplateSection[];
}

/**
 * A single section of generated document content.
 */
export interface GeneratedSection {
  heading: string;
  content: string;
}

/**
 * The structured output from AI document content generation.
 */
export interface GeneratedDocumentContent {
  title: string;
  sections: GeneratedSection[];
  summary: string;
}

/**
 * AiDocumentContentService generates structured document content
 * using the Claude API based on questionnaire session answers
 * and document template definitions.
 *
 * Falls back to placeholder content when ANTHROPIC_API_KEY is not configured.
 */
@Injectable()
export class AiDocumentContentService implements OnModuleInit {
  private readonly logger = new Logger(AiDocumentContentService.name);
  private client: Anthropic | null = null;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.model = this.configService.get<string>('claude.model', 'claude-sonnet-4-6');
    this.maxTokens = this.configService.get<number>('claude.maxTokens', 4096);
  }

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('claude.apiKey');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log(`AI document content service initialized (model: ${this.model})`);
    } else {
      this.logger.warn(
        'ANTHROPIC_API_KEY not configured. Document generation will use placeholder content.',
      );
    }
  }

  /**
   * Generate structured document content using Claude AI.
   *
   * Uses streaming to handle long document generation and avoid HTTP timeouts.
   * Falls back to placeholder content if the API key is not configured
   * or if the API call fails.
   *
   * @param params - Generation parameters including project context,
   *                 session answers, and template sections
   * @returns Structured document content with title, sections, and summary
   */
  async generateDocumentContent(
    params: GenerateDocumentContentParams,
  ): Promise<GeneratedDocumentContent> {
    if (!this.client) {
      this.logger.log('No Claude client available, returning placeholder content');
      return this.buildPlaceholderContent(params);
    }

    try {
      return await this.callClaudeApi(params);
    } catch (error) {
      this.logger.error(
        `AI document generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.buildPlaceholderContent(params);
    }
  }

  /**
   * Call the Claude API with streaming to generate document content.
   * Uses extended thinking for higher quality output.
   */
  private async callClaudeApi(
    params: GenerateDocumentContentParams,
  ): Promise<GeneratedDocumentContent> {
    const { projectTypeName, documentTypeName, sessionAnswers, documentTemplateSections } = params;

    const systemPrompt = this.buildSystemPrompt(projectTypeName, documentTypeName);
    const userMessage = this.buildUserMessage(sessionAnswers, documentTemplateSections);

    this.logger.log(
      `Generating AI content for "${documentTypeName}" (${documentTemplateSections.length} sections)`,
    );

    const stream = this.client!.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      thinking: { type: 'enabled', budget_tokens: 2048 },
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const finalMessage = await stream.finalMessage();

    const textBlock = finalMessage.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );

    if (!textBlock?.text) {
      this.logger.warn('Claude returned empty response, falling back to placeholder');
      return this.buildPlaceholderContent(params);
    }

    return this.parseGeneratedContent(textBlock.text, params);
  }

  /**
   * Build the system prompt that instructs Claude on how to generate
   * professional document content.
   */
  private buildSystemPrompt(projectTypeName: string, documentTypeName: string): string {
    return `You are an expert business document writer for Quiz2Biz, a platform that generates professional business documents from questionnaire responses.

Your task is to generate high-quality, professional content for a "${documentTypeName}" document, based on a "${projectTypeName}" project assessment.

Requirements:
1. Write in a professional, authoritative tone appropriate for business documentation.
2. Use specific details from the provided questionnaire answers — do not fabricate data.
3. Where answers are insufficient, note assumptions and recommend follow-up actions.
4. Each section should be substantive (200-500 words) with actionable insights.
5. Include concrete recommendations where appropriate.
6. Structure content with clear paragraphs — no markdown formatting.

Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "title": "Document title",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Section content as plain text paragraphs"
    }
  ],
  "summary": "Executive summary of the document (2-3 sentences)"
}`;
  }

  /**
   * Build the user message containing session answers and template structure.
   */
  private buildUserMessage(
    sessionAnswers: SessionAnswer[],
    documentTemplateSections: DocumentTemplateSection[],
  ): string {
    const answersBlock = this.formatSessionAnswers(sessionAnswers);
    const sectionsBlock = this.formatTemplateSections(documentTemplateSections);

    return `Generate document content based on the following questionnaire responses and document structure.

## Questionnaire Responses

${answersBlock}

## Required Document Sections

${sectionsBlock}

Generate professional content for each section using the questionnaire responses as the primary data source. Ensure all sections are addressed.`;
  }

  /**
   * Format session answers into a readable block for the prompt.
   * Groups answers by dimension for better context.
   */
  private formatSessionAnswers(sessionAnswers: SessionAnswer[]): string {
    if (sessionAnswers.length === 0) {
      return 'No questionnaire responses available. Generate general guidance content.';
    }

    const grouped = new Map<string, SessionAnswer[]>();
    for (const answer of sessionAnswers) {
      const existing = grouped.get(answer.dimensionKey) ?? [];
      existing.push(answer);
      grouped.set(answer.dimensionKey, existing);
    }

    const blocks: string[] = [];
    for (const [dimensionKey, answers] of grouped) {
      const answerLines = answers
        .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
        .join('\n\n');
      blocks.push(`### Dimension: ${dimensionKey}\n\n${answerLines}`);
    }

    return blocks.join('\n\n');
  }

  /**
   * Format template sections into instructions for the AI.
   */
  private formatTemplateSections(sections: DocumentTemplateSection[]): string {
    return sections
      .map((section, index) => {
        const required = section.requiredFields?.length
          ? `\n   Required fields: ${section.requiredFields.join(', ')}`
          : '';
        return `${index + 1}. **${section.heading}**: ${section.description}${required}`;
      })
      .join('\n');
  }

  /**
   * Parse the Claude API response text into structured document content.
   * Falls back to placeholder content if parsing fails.
   */
  private parseGeneratedContent(
    responseText: string,
    params: GenerateDocumentContentParams,
  ): GeneratedDocumentContent {
    try {
      const parsed = JSON.parse(responseText) as GeneratedDocumentContent;

      if (!parsed.title || !Array.isArray(parsed.sections) || !parsed.summary) {
        this.logger.warn('Parsed response missing required fields, using placeholder');
        return this.buildPlaceholderContent(params);
      }

      const validSections = parsed.sections.filter(
        (section): section is GeneratedSection =>
          typeof section.heading === 'string' &&
          typeof section.content === 'string' &&
          section.heading.length > 0 &&
          section.content.length > 0,
      );

      if (validSections.length === 0) {
        this.logger.warn('No valid sections in parsed response, using placeholder');
        return this.buildPlaceholderContent(params);
      }

      this.logger.log(
        `AI content generated: "${parsed.title}" with ${validSections.length} sections`,
      );

      return {
        title: parsed.title,
        sections: validSections,
        summary: parsed.summary,
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.buildPlaceholderContent(params);
    }
  }

  /**
   * Build placeholder content when the Claude API is unavailable.
   * Provides a useful structure so document generation can proceed
   * even without AI-powered content.
   */
  private buildPlaceholderContent(
    params: GenerateDocumentContentParams,
  ): GeneratedDocumentContent {
    const { projectTypeName, documentTypeName, sessionAnswers, documentTemplateSections } = params;

    const sections: GeneratedSection[] = documentTemplateSections.map((template) => ({
      heading: template.heading,
      content: this.buildPlaceholderSectionContent(
        template,
        sessionAnswers,
        projectTypeName,
      ),
    }));

    return {
      title: `${documentTypeName} — ${projectTypeName}`,
      sections,
      summary: `This ${documentTypeName} was generated from ${sessionAnswers.length} questionnaire responses for the ${projectTypeName} project. AI-powered content generation is not currently available. Configure ANTHROPIC_API_KEY for enhanced document content.`,
    };
  }

  /**
   * Build placeholder content for a single section using available
   * session answers that match the section context.
   */
  private buildPlaceholderSectionContent(
    template: DocumentTemplateSection,
    sessionAnswers: SessionAnswer[],
    projectTypeName: string,
  ): string {
    const headingLower = template.heading.toLowerCase();
    const relevantAnswers = sessionAnswers.filter(
      (answer) =>
        headingLower.includes(answer.dimensionKey.toLowerCase()) ||
        answer.question.toLowerCase().includes(headingLower),
    );

    const lines: string[] = [
      `${template.description}`,
      '',
      `This section covers ${template.heading} for the ${projectTypeName} project.`,
    ];

    if (relevantAnswers.length > 0) {
      lines.push('');
      lines.push('Based on questionnaire responses:');
      for (const answer of relevantAnswers.slice(0, 5)) {
        lines.push(`- ${answer.question}: ${answer.answer}`);
      }
    } else {
      lines.push('');
      lines.push(
        'No specific questionnaire responses matched this section. Please review and supplement with additional details.',
      );
    }

    if (template.requiredFields?.length) {
      lines.push('');
      lines.push('Required fields to complete:');
      for (const field of template.requiredFields) {
        lines.push(`- ${field}: [To be completed]`);
      }
    }

    return lines.join('\n');
  }
}
