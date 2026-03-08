/**
 * Quality Calibrator Service
 * Adjusts document generation parameters based on quality level
 * 
 * Quality Levels:
 * 0 = Basic (1x): Essential content, minimal formatting
 * 1 = Standard (2x): Expanded content, professional formatting
 * 2 = Enhanced (3x): Comprehensive content, charts, citations
 * 3 = Premium (4x): Executive-ready, SWOT, market analysis
 * 4 = Enterprise (5x): Board-ready, appendices, full analysis
 */

import { Injectable, Logger } from '@nestjs/common';
import type { ExtractedFact } from '@prisma/client';

/** Generation parameters for a quality level */
export interface QualityParameters {
  /** Quality level (0-4) */
  level: number;
  /** Quality level name */
  name: string;
  /** Maximum tokens for generation */
  maxTokens: number;
  /** Temperature for AI generation */
  temperature: number;
  /** Target page count */
  targetPages: number;
  /** Sections to include */
  sections: string[];
  /** Features to include */
  features: QualityFeature[];
  /** Prompt modifiers */
  promptModifiers: string[];
  /** Output format */
  format: 'basic' | 'professional' | 'executive';
}

/** Feature flags for quality levels */
export interface QualityFeature {
  name: string;
  enabled: boolean;
  description: string;
}

/** Available features */
const FEATURES = {
  citations: { name: 'citations', description: 'Source citations and references' },
  charts: { name: 'charts', description: 'Data visualizations and charts' },
  swot: { name: 'swot', description: 'SWOT analysis section' },
  competitors: { name: 'competitors', description: 'Competitive analysis' },
  financials: { name: 'financials', description: 'Financial projections' },
  appendices: { name: 'appendices', description: 'Supporting appendices' },
  executiveSummary: { name: 'executiveSummary', description: 'Executive summary' },
  riskAnalysis: { name: 'riskAnalysis', description: 'Risk analysis section' },
  marketResearch: { name: 'marketResearch', description: 'Market research data' },
  implementation: { name: 'implementation', description: 'Implementation timeline' },
};

/** Quality level configurations */
const QUALITY_CONFIGS: Record<number, Omit<QualityParameters, 'level'>> = {
  0: {
    name: 'Basic',
    maxTokens: 2000,
    temperature: 0.7,
    targetPages: 8,
    sections: ['overview', 'description', 'next_steps'],
    features: [
      { ...FEATURES.executiveSummary, enabled: true },
    ],
    promptModifiers: [
      'Keep content concise and focused on essentials',
      'Use simple formatting',
      'Focus on key points only',
    ],
    format: 'basic',
  },
  1: {
    name: 'Standard',
    maxTokens: 4000,
    temperature: 0.6,
    targetPages: 12,
    sections: ['executive_summary', 'overview', 'description', 'analysis', 'next_steps'],
    features: [
      { ...FEATURES.executiveSummary, enabled: true },
      { ...FEATURES.citations, enabled: true },
    ],
    promptModifiers: [
      'Provide professional formatting',
      'Include basic citations where relevant',
      'Expand on key concepts',
    ],
    format: 'professional',
  },
  2: {
    name: 'Enhanced',
    maxTokens: 8000,
    temperature: 0.5,
    targetPages: 20,
    sections: [
      'executive_summary', 'overview', 'market_analysis', 
      'description', 'analysis', 'financial_overview', 'next_steps',
    ],
    features: [
      { ...FEATURES.executiveSummary, enabled: true },
      { ...FEATURES.citations, enabled: true },
      { ...FEATURES.charts, enabled: true },
      { ...FEATURES.financials, enabled: true },
    ],
    promptModifiers: [
      'Provide comprehensive analysis',
      'Include data visualizations',
      'Add financial projections',
      'Use professional executive formatting',
    ],
    format: 'professional',
  },
  3: {
    name: 'Premium',
    maxTokens: 12000,
    temperature: 0.4,
    targetPages: 32,
    sections: [
      'executive_summary', 'overview', 'market_analysis',
      'competitive_landscape', 'swot_analysis', 'description',
      'analysis', 'financial_projections', 'risk_assessment', 'next_steps',
    ],
    features: [
      { ...FEATURES.executiveSummary, enabled: true },
      { ...FEATURES.citations, enabled: true },
      { ...FEATURES.charts, enabled: true },
      { ...FEATURES.financials, enabled: true },
      { ...FEATURES.swot, enabled: true },
      { ...FEATURES.competitors, enabled: true },
      { ...FEATURES.riskAnalysis, enabled: true },
    ],
    promptModifiers: [
      'Create executive-ready document',
      'Include SWOT analysis',
      'Add competitive landscape',
      'Provide detailed financial projections',
      'Include risk assessment',
    ],
    format: 'executive',
  },
  4: {
    name: 'Enterprise',
    maxTokens: 16000,
    temperature: 0.3,
    targetPages: 50,
    sections: [
      'executive_summary', 'overview', 'market_analysis',
      'competitive_landscape', 'swot_analysis', 'description',
      'analysis', 'financial_projections', 'risk_assessment',
      'implementation_plan', 'appendices', 'references', 'next_steps',
    ],
    features: [
      { ...FEATURES.executiveSummary, enabled: true },
      { ...FEATURES.citations, enabled: true },
      { ...FEATURES.charts, enabled: true },
      { ...FEATURES.financials, enabled: true },
      { ...FEATURES.swot, enabled: true },
      { ...FEATURES.competitors, enabled: true },
      { ...FEATURES.riskAnalysis, enabled: true },
      { ...FEATURES.marketResearch, enabled: true },
      { ...FEATURES.implementation, enabled: true },
      { ...FEATURES.appendices, enabled: true },
    ],
    promptModifiers: [
      'Create board-ready document',
      'Include comprehensive market research',
      'Add implementation timeline',
      'Include supporting appendices',
      'Provide full reference list',
      'Use executive presentation format',
    ],
    format: 'executive',
  },
};

@Injectable()
export class QualityCalibratorService {
  private readonly logger = new Logger(QualityCalibratorService.name);

  /**
   * Get quality parameters for a given level
   */
  getParameters(qualityLevel: number): QualityParameters {
    const level = Math.max(0, Math.min(4, qualityLevel));
    const config = QUALITY_CONFIGS[level];
    
    if (!config) {
      this.logger.warn(`Invalid quality level ${qualityLevel}, defaulting to 0`);
      return { level: 0, ...QUALITY_CONFIGS[0] };
    }

    return { level, ...config };
  }

  /**
   * Build generation prompt with quality modifiers
   */
  buildPrompt(
    basePrompt: string,
    facts: ExtractedFact[],
    qualityLevel: number,
    documentType: string,
  ): string {
    const params = this.getParameters(qualityLevel);
    
    // Build facts section
    const factsSection = this.formatFacts(facts);
    
    // Build quality modifiers
    const modifiers = params.promptModifiers.join('\n- ');
    
    // Build sections list
    const sections = params.sections.map((s) => this.formatSectionName(s)).join(', ');
    
    // Build enabled features list
    const features = params.features
      .filter((f) => f.enabled)
      .map((f) => f.description)
      .join(', ');

    return `${basePrompt}

## Quality Level: ${params.name} (${params.level + 1}x)

## Generation Guidelines:
- ${modifiers}

## Required Sections:
${sections}

## Enabled Features:
${features}

## Target Length:
Approximately ${params.targetPages} pages

## Extracted Facts (Use These):
${factsSection}

## Document Type: ${documentType}

Generate a ${params.format} quality ${documentType} document using the facts provided above.
Ensure all required sections are included and features are properly integrated.`;
  }

  /**
   * Get system prompt for quality level
   */
  getSystemPrompt(qualityLevel: number): string {
    const params = this.getParameters(qualityLevel);
    
    const systemPrompts: Record<string, string> = {
      basic: `You are a business document generator. Create clear, concise documents focused on essential information.`,
      professional: `You are a professional business document generator. Create well-structured, comprehensive documents with proper citations and formatting.`,
      executive: `You are an executive business document generator. Create board-ready documents with thorough analysis, visual data representations, and strategic recommendations.`,
    };

    return systemPrompts[params.format];
  }

  /**
   * Format facts for inclusion in prompt
   */
  private formatFacts(facts: ExtractedFact[]): string {
    if (facts.length === 0) {
      return 'No extracted facts available. Generate content based on document type requirements.';
    }

    // Group by category
    const byCategory: Record<string, ExtractedFact[]> = {};
    for (const fact of facts) {
      const category = fact.category ?? 'general';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(fact);
    }

    // Format each category
    const sections: string[] = [];
    for (const [category, categoryFacts] of Object.entries(byCategory)) {
      const factLines = categoryFacts.map(
        (f) => `  - ${this.formatFieldName(f.fieldName)}: ${f.fieldValue}`,
      );
      sections.push(`### ${this.formatSectionName(category)}\n${factLines.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Format field name to readable form
   */
  private formatFieldName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  /**
   * Format section name to readable form
   */
  private formatSectionName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Estimate token count for facts
   */
  estimateFactsTokens(facts: ExtractedFact[]): number {
    const text = facts.map((f) => `${f.fieldName}: ${f.fieldValue}`).join(' ');
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if facts fit within quality level limits
   */
  canGenerateAtQuality(facts: ExtractedFact[], qualityLevel: number): boolean {
    const params = this.getParameters(qualityLevel);
    const factsTokens = this.estimateFactsTokens(facts);
    // Reserve 50% of tokens for generation
    const availableForFacts = params.maxTokens * 0.5;
    return factsTokens <= availableForFacts;
  }
}
