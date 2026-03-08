/**
 * Project Document Generation Service
 * Generates documents using extracted facts and quality calibration
 * 
 * This service integrates:
 * - Extracted facts from chat conversations
 * - Quality calibrator for tier-based generation
 * - Markdown renderer for output formatting
 * - AI gateway for content generation
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ConfigService } from '@nestjs/config';
import { QualityCalibratorService } from './quality-calibrator.service';
import { MarkdownRendererService } from './markdown-renderer.service';
import type { DocumentSection, MarkdownDocument } from './markdown-renderer.service';
import type { ExtractedFact } from '@prisma/client';

export interface GenerationRequest {
  projectId: string;
  documentTypeSlug: string;
  qualityLevel: number;
  userId: string;
}

export interface GenerationResult {
  documentId: string;
  projectId: string;
  documentTypeSlug: string;
  qualityLevel: number;
  title: string;
  content: string;
  markdown: string;
  wordCount: number;
  pageEstimate: number;
  generatedAt: Date;
}

@Injectable()
export class ProjectDocumentGenerationService {
  private readonly logger = new Logger(ProjectDocumentGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly qualityCalibrator: QualityCalibratorService,
    private readonly markdownRenderer: MarkdownRendererService,
  ) {}

  /**
   * Generate a document for a project using facts and quality settings
   */
  async generateDocument(request: GenerationRequest): Promise<GenerationResult> {
    this.logger.log(`Generating ${request.documentTypeSlug} for project ${request.projectId}`);

    // 1. Validate project and ownership
    const project = await this.prisma.project.findFirst({
      where: { id: request.projectId, userId: request.userId },
      include: { projectType: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 2. Get document type
    const documentType = await this.prisma.documentType.findUnique({
      where: { slug: request.documentTypeSlug },
    });

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    // 3. Get extracted facts for project
    const facts = await this.prisma.extractedFact.findMany({
      where: { projectId: request.projectId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });

    // 4. Get quality parameters
    const qualityParams = this.qualityCalibrator.getParameters(request.qualityLevel);

    // 5. Build generation prompt
    const prompt = this.qualityCalibrator.buildPrompt(
      this.getBasePrompt(documentType.slug, documentType.name),
      facts,
      request.qualityLevel,
      documentType.name,
    );

    const systemPrompt = this.qualityCalibrator.getSystemPrompt(request.qualityLevel);

    // 6. Generate content (placeholder - would use AI gateway in real implementation)
    const generatedContent = await this.generateContent(
      systemPrompt,
      prompt,
      qualityParams.maxTokens,
      qualityParams.temperature,
      facts,
      documentType.name,
    );

    // 7. Parse and format as Markdown document
    const sections = this.markdownRenderer.parseAiOutput(generatedContent);
    const markdownDoc = this.buildMarkdownDocument(
      project.name,
      documentType.name,
      qualityParams.name,
      sections,
    );
    const markdown = this.markdownRenderer.renderDocument(markdownDoc);

    // 8. Calculate stats
    const wordCount = this.countWords(generatedContent);
    const pageEstimate = Math.ceil(wordCount / 300); // ~300 words per page

    // 9. Save generated document
    const document = await this.prisma.generatedDocument.create({
      data: {
        projectId: request.projectId,
        documentTypeId: documentType.id,
        userId: request.userId,
        title: `${project.name} - ${documentType.name}`,
        content: generatedContent,
        markdownContent: markdown,
        qualityLevel: request.qualityLevel,
        wordCount,
        pageCount: pageEstimate,
        status: 'completed',
        metadata: {
          factsUsed: facts.length,
          qualityLevel: qualityParams.name,
          sections: sections.map((s) => s.title),
        },
      },
    });

    this.logger.log(`Document ${document.id} generated successfully`);

    return {
      documentId: document.id,
      projectId: request.projectId,
      documentTypeSlug: documentType.slug,
      qualityLevel: request.qualityLevel,
      title: document.title,
      content: generatedContent,
      markdown,
      wordCount,
      pageEstimate,
      generatedAt: document.createdAt,
    };
  }

  /**
   * Get base prompt for document type
   */
  private getBasePrompt(slug: string, name: string): string {
    const prompts: Record<string, string> = {
      'business-plan': `Generate a comprehensive business plan document. Include market analysis, business model, financial projections, and implementation strategy.`,
      'executive-summary': `Generate an executive summary that provides a concise overview of the business opportunity, key metrics, and strategic recommendations.`,
      'pitch-deck': `Generate content for an investor pitch deck. Focus on the problem, solution, market size, business model, traction, and team.`,
      'financial-projections': `Generate detailed financial projections including revenue forecasts, cost analysis, cash flow projections, and break-even analysis.`,
      'market-analysis': `Generate a market analysis report covering market size, trends, competitive landscape, and target customer segments.`,
      'operations-manual': `Generate an operations manual covering processes, procedures, quality standards, and operational guidelines.`,
      'marketing-strategy': `Generate a marketing strategy document covering target audience, positioning, channels, campaigns, and KPIs.`,
      'tech-assessment': `Generate a technology assessment covering current infrastructure, requirements, recommendations, and implementation roadmap.`,
      'grant-application': `Generate content for a grant application including project overview, objectives, methodology, budget, and expected outcomes.`,
    };

    return prompts[slug] ?? `Generate a professional ${name} document based on the provided information.`;
  }

  /**
   * Generate content using AI (placeholder implementation)
   * In production, this would use the AI gateway
   */
  private async generateContent(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    temperature: number,
    facts: ExtractedFact[],
    documentType: string,
  ): Promise<string> {
    // For now, generate structured content based on facts
    // In production, this would call the AI gateway
    
    const sections: string[] = [];
    
    // Executive Summary
    sections.push(`# ${documentType}\n`);
    sections.push(`## Executive Summary\n`);
    sections.push(`This document presents a comprehensive ${documentType.toLowerCase()} based on the information gathered through detailed consultation.\n`);

    // Group facts by category
    const factsByCategory: Record<string, ExtractedFact[]> = {};
    for (const fact of facts) {
      const category = fact.category ?? 'General';
      if (!factsByCategory[category]) {
        factsByCategory[category] = [];
      }
      factsByCategory[category].push(fact);
    }

    // Generate sections for each category
    for (const [category, categoryFacts] of Object.entries(factsByCategory)) {
      const sectionTitle = this.formatCategoryTitle(category);
      sections.push(`## ${sectionTitle}\n`);
      
      for (const fact of categoryFacts) {
        const fieldName = this.formatFieldName(fact.fieldName);
        sections.push(`**${fieldName}:** ${fact.fieldValue}\n`);
      }
      sections.push('');
    }

    // Add next steps section
    sections.push(`## Next Steps\n`);
    sections.push(`Based on this analysis, the recommended next steps are:\n`);
    sections.push(`1. Review and validate the information presented\n`);
    sections.push(`2. Identify areas requiring additional detail\n`);
    sections.push(`3. Proceed with implementation planning\n`);

    this.logger.debug(`Generated content with ${facts.length} facts, max ${maxTokens} tokens, temp ${temperature}`);
    this.logger.debug(`System: ${systemPrompt.slice(0, 100)}...`);

    return sections.join('\n');
  }

  /**
   * Build Markdown document structure
   */
  private buildMarkdownDocument(
    projectName: string,
    documentTypeName: string,
    qualityLevel: string,
    sections: DocumentSection[],
  ): MarkdownDocument {
    return {
      title: `${projectName} - ${documentTypeName}`,
      subtitle: `Generated with ${qualityLevel} quality`,
      metadata: {
        'Project': projectName,
        'Document Type': documentTypeName,
        'Quality Level': qualityLevel,
        'Generated': new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
      sections,
      footer: 'Generated by Quiz2Biz Document Generation System',
    };
  }

  /**
   * Format category name for display
   */
  private formatCategoryTitle(category: string): string {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format field name for display
   */
  private formatFieldName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content
      .replace(/[#*_\[\]()]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }
}
