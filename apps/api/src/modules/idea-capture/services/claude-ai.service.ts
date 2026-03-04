import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface IdeaAnalysisResult {
  themes: string[];
  gaps: string[];
  strengths: string[];
  recommendedProjectType: {
    slug: string;
    confidence: number;
    reasoning: string;
  };
  alternativeProjectTypes: Array<{
    slug: string;
    confidence: number;
    reasoning: string;
  }>;
  summary: string;
}

export interface ConversationFollowUp {
  shouldFollowUp: boolean;
  followUpQuestion?: string;
  completenessScore: number;
  missingAreas: string[];
}

@Injectable()
export class ClaudeAiService implements OnModuleInit {
  private readonly logger = new Logger(ClaudeAiService.name);
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
      this.logger.log(`Claude AI service initialized (model: ${this.model})`);
    } else {
      this.logger.warn(
        'ANTHROPIC_API_KEY not configured. Claude AI features will use fallback analysis.',
      );
    }
  }

  async analyzeIdea(
    rawInput: string,
    availableProjectTypes: Array<{ slug: string; name: string; description: string }>,
  ): Promise<IdeaAnalysisResult> {
    if (!this.client) {
      return this.fallbackAnalysis(rawInput, availableProjectTypes);
    }

    const projectTypeList = availableProjectTypes
      .map((pt) => `- ${pt.slug}: ${pt.name} — ${pt.description}`)
      .join('\n');

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        thinking: { type: 'enabled', budget_tokens: 2048 },
        system: `You are a business analysis AI for Quiz2Biz, a platform that helps entrepreneurs and professionals develop their ideas into structured business documents.

Your task is to analyze a user's free-form idea description and extract:
1. Key themes and topics
2. Gaps or areas that need further exploration
3. Strengths of the idea
4. The best matching project type from the available options
5. A brief summary with actionable next steps

Available project types:
${projectTypeList}

Respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "themes": ["theme1", "theme2"],
  "gaps": ["gap1", "gap2"],
  "strengths": ["strength1", "strength2"],
  "recommendedProjectType": {
    "slug": "project-type-slug",
    "confidence": 0.85,
    "reasoning": "Why this type fits"
  },
  "alternativeProjectTypes": [
    {
      "slug": "alternative-slug",
      "confidence": 0.6,
      "reasoning": "Why this could also work"
    }
  ],
  "summary": "Brief analysis summary with recommended next steps"
}`,
        messages: [
          {
            role: 'user',
            content: `Analyze this business idea and recommend the best project type:\n\n${rawInput}`,
          },
        ],
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );

      if (!textBlock?.text) {
        this.logger.warn('Claude returned empty response, using fallback');
        return this.fallbackAnalysis(rawInput, availableProjectTypes);
      }

      const parsed = JSON.parse(textBlock.text) as IdeaAnalysisResult;
      this.logger.log(
        `Idea analyzed: ${parsed.themes.length} themes, recommended: ${parsed.recommendedProjectType.slug}`,
      );
      return parsed;
    } catch (error) {
      this.logger.error(
        `Claude API error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.fallbackAnalysis(rawInput, availableProjectTypes);
    }
  }

  async evaluateAnswerCompleteness(
    questionText: string,
    answerText: string,
    dimensionContext: string,
  ): Promise<ConversationFollowUp> {
    if (!this.client) {
      return {
        shouldFollowUp: false,
        completenessScore: 0.7,
        missingAreas: [],
      };
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: `You are a business questionnaire assistant. Evaluate if the user's answer is complete and identify any follow-up questions that would improve the quality of their business document.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "shouldFollowUp": true/false,
  "followUpQuestion": "Optional clarifying question",
  "completenessScore": 0.0-1.0,
  "missingAreas": ["area1", "area2"]
}`,
        messages: [
          {
            role: 'user',
            content: `Context: ${dimensionContext}\nQuestion: ${questionText}\nAnswer: ${answerText}\n\nEvaluate this answer's completeness for generating a professional business document.`,
          },
        ],
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );

      if (!textBlock?.text) {
        return { shouldFollowUp: false, completenessScore: 0.7, missingAreas: [] };
      }

      return JSON.parse(textBlock.text) as ConversationFollowUp;
    } catch (error) {
      this.logger.error(
        `Completeness evaluation error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { shouldFollowUp: false, completenessScore: 0.7, missingAreas: [] };
    }
  }

  private fallbackAnalysis(
    rawInput: string,
    availableProjectTypes: Array<{ slug: string; name: string; description: string }>,
  ): IdeaAnalysisResult {
    this.logger.log('Using fallback analysis (no Claude API key)');

    const words = rawInput.toLowerCase().split(/\s+/);
    const themes = this.extractBasicThemes(words);

    const businessKeywords = [
      'business',
      'startup',
      'company',
      'venture',
      'plan',
      'launch',
      'product',
      'service',
    ];
    const marketingKeywords = [
      'marketing',
      'brand',
      'audience',
      'channel',
      'campaign',
      'social',
      'content',
      'seo',
    ];
    const financeKeywords = [
      'financial',
      'revenue',
      'profit',
      'investment',
      'funding',
      'budget',
      'cash',
      'cost',
    ];
    const techKeywords = [
      'technology',
      'software',
      'architecture',
      'security',
      'devops',
      'compliance',
      'infrastructure',
    ];

    const scores: Record<string, number> = {
      'business-plan': words.filter((w) => businessKeywords.includes(w)).length,
      'marketing-strategy': words.filter((w) => marketingKeywords.includes(w)).length,
      'financial-projections': words.filter((w) => financeKeywords.includes(w)).length,
      'tech-assessment': words.filter((w) => techKeywords.includes(w)).length,
    };

    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const bestSlug = sorted[0]?.[0] || 'business-plan';
    const bestType =
      availableProjectTypes.find((pt) => pt.slug === bestSlug) || availableProjectTypes[0];

    return {
      themes,
      gaps: [
        'AI analysis unavailable — detailed gap analysis will be available once the Claude API key is configured.',
      ],
      strengths:
        themes.length > 2 ? ['Multiple themes identified in your idea'] : ['Focused concept'],
      recommendedProjectType: {
        slug: bestType?.slug || 'business-plan',
        confidence: 0.5,
        reasoning: `Based on keyword matching. For more accurate analysis, configure the ANTHROPIC_API_KEY.`,
      },
      alternativeProjectTypes: sorted.slice(1, 3).map(([slug]) => {
        const pt = availableProjectTypes.find((p) => p.slug === slug);
        return {
          slug,
          confidence: 0.3,
          reasoning: pt?.description || 'Alternative project type',
        };
      }),
      summary: `Your idea touches on ${themes.join(', ')}. We recommend starting with a ${bestType?.name || 'Business Plan'} to structure your thinking.`,
    };
  }

  private extractBasicThemes(words: string[]): string[] {
    const themeKeywords: Record<string, string> = {
      app: 'mobile/web application',
      saas: 'SaaS platform',
      ecommerce: 'e-commerce',
      marketplace: 'marketplace',
      subscription: 'subscription model',
      ai: 'artificial intelligence',
      data: 'data-driven',
      health: 'healthcare',
      fintech: 'financial technology',
      education: 'education technology',
      social: 'social platform',
      b2b: 'B2B services',
      consulting: 'consulting',
      retail: 'retail',
      food: 'food & beverage',
    };

    const found = new Set<string>();
    for (const word of words) {
      const theme = themeKeywords[word];
      if (theme) {
        found.add(theme);
      }
    }

    return found.size > 0 ? Array.from(found) : ['general business idea'];
  }
}
