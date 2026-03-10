/**
 * Fact Extraction Service
 * 
 * Analyzes chat conversations to extract structured business facts
 * for use in document generation. Uses AI Gateway for extraction.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Prisma, ExtractedFact } from '@prisma/client';
import { AiGatewayService } from '../../ai-gateway/ai-gateway.service';
import {
  ExtractedFactData,
  FactExtractionRequest,
  FactExtractionResponse,
  FactValidationResult,
  ExtractionCategory,
  ConfidenceLevel,
  ExtractionSchema,
  SchemaField,
} from '../interfaces';
import { getSchemaForProjectType } from '../schemas/extraction-schemas';

@Injectable()
export class FactExtractionService {
  private readonly logger = new Logger(FactExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
  ) {}

  /**
   * Extract facts from a conversation
   */
  async extractFacts(request: FactExtractionRequest): Promise<FactExtractionResponse> {
    const startTime = Date.now();
    this.logger.log(`Extracting facts for project ${request.projectId}`);

    const schema = getSchemaForProjectType(request.projectTypeSlug);
    if (!schema) {
      this.logger.warn(`No schema found for project type: ${request.projectTypeSlug}`);
      return { facts: [], processingTimeMs: Date.now() - startTime, tokensUsed: 0 };
    }

    const systemPrompt = this.buildExtractionPrompt(schema, request.existingFacts);
    const userPrompt = this.buildUserPrompt(request.conversationContent, schema);

    try {
      const response = await this.aiGateway.generate({
        taskType: 'extract',
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        provider: 'claude',
        temperature: 0.1,
        maxTokens: 4000,
        jsonMode: true,
        projectId: request.projectId,
      });

      const facts = this.parseExtractionResponse(response.content);
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(`Extracted ${facts.length} facts in ${processingTimeMs}ms`);

      return {
        facts,
        processingTimeMs,
        tokensUsed: response.usage.totalTokens,
      };
    } catch (error) {
      this.logger.error(`Fact extraction failed: ${error}`);
      return { facts: [], processingTimeMs: Date.now() - startTime, tokensUsed: 0 };
    }
  }

  /**
   * Trigger extraction after a chat message
   */
  async triggerExtractionAfterMessage(
    projectId: string,
    messageId: string,
  ): Promise<ExtractedFactData[]> {
    this.logger.log(`Triggering extraction after message ${messageId}`);

    // Get project and its type
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectType: true,
      },
    });

    if (!project?.projectType) {
      this.logger.warn(`Project ${projectId} not found or has no type`);
      return [];
    }

    // Get recent conversation (last 10 messages for context)
    const messages = await this.prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const conversationContent = messages
      .reverse()
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    // Get existing facts to avoid duplicates
    const existingFactRecords = await this.prisma.extractedFact.findMany({
      where: { projectId },
      take: 1000,
      orderBy: { createdAt: 'asc' },
    });

    const existingFacts: ExtractedFactData[] = existingFactRecords.map((f: ExtractedFact) => ({
      category: (f.category || 'business_overview') as ExtractionCategory,
      key: f.fieldName,
      value: f.fieldValue,
      confidence: this.decimalToConfidence(f.confidence),
    }));

    // Extract new facts
    const result = await this.extractFacts({
      projectId,
      conversationContent,
      projectTypeSlug: project.projectType.slug,
      existingFacts,
    });

    // Save new facts to database
    const savedFacts = await this.saveFacts(projectId, result.facts, messageId);

    return savedFacts;
  }

  /**
   * Save extracted facts to database
   */
  async saveFacts(
    projectId: string,
    facts: ExtractedFactData[],
    sourceMessageId?: string,
  ): Promise<ExtractedFactData[]> {
    const savedFacts: ExtractedFactData[] = [];

    for (const fact of facts) {
      try {
        // Upsert fact (update if same field exists)
        await this.prisma.extractedFact.upsert({
          where: {
            projectId_fieldName: {
              projectId,
              fieldName: fact.key,
            },
          },
          create: {
            projectId,
            fieldName: fact.key,
            fieldValue: fact.value,
            category: fact.category,
            confidence: this.confidenceToDecimal(fact.confidence),
            sourceMessageId: sourceMessageId || null,
          },
          update: {
            fieldValue: fact.value,
            confidence: this.confidenceToDecimal(fact.confidence),
            sourceMessageId: sourceMessageId || null,
            updatedAt: new Date(),
          },
        });

        savedFacts.push(fact);
      } catch (error) {
        this.logger.error(`Failed to save fact ${fact.key}: ${error}`);
      }
    }

    this.logger.log(`Saved ${savedFacts.length} facts for project ${projectId}`);
    return savedFacts;
  }

  /**
   * Get all facts for a project
   */
  async getProjectFacts(projectId: string): Promise<ExtractedFactData[]> {
    const facts = await this.prisma.extractedFact.findMany({
      where: { projectId },
      orderBy: [{ category: 'asc' }, { fieldName: 'asc' }],
      take: 1000,
    });

    return facts.map((f: ExtractedFact) => ({
      category: (f.category || 'business_overview') as ExtractionCategory,
      key: f.fieldName,
      value: f.fieldValue,
      confidence: this.decimalToConfidence(f.confidence),
      sourceMessageId: f.sourceMessageId || undefined,
    }));
  }

  /**
   * Validate facts against schema requirements
   */
  async validateFacts(
    projectId: string,
    projectTypeSlug: string,
  ): Promise<FactValidationResult> {
    const schema = getSchemaForProjectType(projectTypeSlug);
    if (!schema) {
      return {
        isValid: false,
        missingRequired: [],
        lowConfidenceFacts: [],
        completenessScore: 0,
      };
    }

    const facts = await this.getProjectFacts(projectId);
    const factKeys = new Set(facts.map((f) => f.key));

    // Find missing required fields
    const requiredFields = schema.fields.filter((f) => f.required);
    const missingRequired = requiredFields
      .filter((f) => !factKeys.has(f.key))
      .map((f) => f.key);

    // Find low confidence facts
    const lowConfidenceFacts = facts
      .filter((f) => f.confidence === 'low')
      .map((f) => f.key);

    // Calculate completeness score
    const totalFields = schema.fields.length;
    const filledFields = facts.length;
    const completenessScore = Math.round((filledFields / totalFields) * 100);

    return {
      isValid: missingRequired.length === 0,
      missingRequired,
      lowConfidenceFacts,
      completenessScore,
    };
  }

  /**
   * Delete a fact
   */
  async deleteFact(projectId: string, fieldName: string): Promise<void> {
    try {
      await this.prisma.extractedFact.delete({
        where: {
          projectId_fieldName: {
            projectId,
            fieldName,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to delete fact ${fieldName} for project ${projectId}: ${error}`);
      throw error;
    }
  }

  /**
   * Update a fact value manually
   */
  async updateFact(
    projectId: string,
    fieldName: string,
    newValue: string,
  ): Promise<ExtractedFactData | null> {
    const updated = await this.prisma.extractedFact.update({
      where: {
        projectId_fieldName: {
          projectId,
          fieldName,
        },
      },
      data: {
        fieldValue: newValue,
        confidence: new Prisma.Decimal(0.95), // Manual updates are high confidence
        confirmedByUser: true,
        updatedAt: new Date(),
      },
    });

    return {
      category: (updated.category || 'business_overview') as ExtractionCategory,
      key: updated.fieldName,
      value: updated.fieldValue,
      confidence: this.decimalToConfidence(updated.confidence),
    };
  }

  /**
   * Convert Decimal confidence to string level
   */
  private decimalToConfidence(decimal: Prisma.Decimal): ConfidenceLevel {
    const value = decimal.toNumber();
    if (value >= 0.8) {return 'high';}
    if (value >= 0.5) {return 'medium';}
    return 'low';
  }

  /**
   * Convert confidence level to Decimal
   */
  private confidenceToDecimal(confidence: ConfidenceLevel): Prisma.Decimal {
    switch (confidence) {
      case 'high': return new Prisma.Decimal(0.9);
      case 'medium': return new Prisma.Decimal(0.6);
      case 'low': return new Prisma.Decimal(0.3);
      default: return new Prisma.Decimal(0.5);
    }
  }

  /**
   * Build system prompt for extraction
   */
  private buildExtractionPrompt(
    schema: ExtractionSchema,
    existingFacts?: ExtractedFactData[],
  ): string {
    const fieldsList = schema.fields
      .map((f: SchemaField) => `- ${f.key}: ${f.description} (${f.required ? 'REQUIRED' : 'optional'})`)
      .join('\n');

    const existingList = existingFacts?.length
      ? `\n\nAlready extracted facts (do not duplicate):\n${existingFacts.map((f) => `- ${f.key}: ${f.value}`).join('\n')}`
      : '';

    return `You are an expert fact extraction system for ${schema.projectTypeName} documents.

Your task is to extract structured business facts from the conversation.

FIELDS TO EXTRACT:
${fieldsList}

${schema.systemPromptAddition}

RULES:
1. Extract only facts explicitly stated or clearly implied in the conversation
2. For each fact, assess confidence: "high" (explicitly stated), "medium" (clearly implied), "low" (inferred with uncertainty)
3. Do not invent or assume information not present in the conversation
4. Return facts in valid JSON format
5. Skip fields where no relevant information is found
${existingList}

OUTPUT FORMAT (JSON):
{
  "facts": [
    {
      "key": "field_key",
      "value": "extracted value",
      "category": "category_name",
      "confidence": "high|medium|low"
    }
  ]
}`;
  }

  /**
   * Build user prompt with conversation content
   */
  private buildUserPrompt(
    conversationContent: string,
    schema: ExtractionSchema,
  ): string {
    return `Extract ${schema.projectTypeName} facts from this conversation:

---CONVERSATION START---
${conversationContent}
---CONVERSATION END---

Return ONLY a valid JSON object with the extracted facts.`;
  }

  /**
   * Parse AI response to extract facts
   */
  private parseExtractionResponse(content: string): ExtractedFactData[] {
    try {
      // Clean response (remove markdown code blocks if present)
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleaned);
      
      if (!parsed.facts || !Array.isArray(parsed.facts)) {
        this.logger.warn('Invalid extraction response structure');
        return [];
      }

      return parsed.facts.map((f: { category: string; key: string; value: string; confidence?: string }) => ({
        category: f.category as ExtractionCategory,
        key: f.key,
        value: f.value,
        confidence: (f.confidence || 'medium') as ConfidenceLevel,
      }));
    } catch (error) {
      this.logger.error(`Failed to parse extraction response: ${error}`);
      return [];
    }
  }
}
