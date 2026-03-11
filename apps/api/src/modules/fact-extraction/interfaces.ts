/**
 * Fact Extraction Interfaces
 *
 * Types for the fact extraction system that analyzes chat conversations
 * to extract structured business facts for document generation.
 */

/**
 * Extraction category
 */
export type ExtractionCategory =
  | 'business_overview'
  | 'market_analysis'
  | 'financial_data'
  | 'team_and_operations'
  | 'product_service'
  | 'strategy'
  | 'risk_assessment'
  | 'technology'
  | 'legal_compliance';

/**
 * Confidence level for extracted facts
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Extracted fact from conversation
 */
export interface ExtractedFactData {
  category: ExtractionCategory;
  key: string;
  value: string;
  confidence: ConfidenceLevel;
  sourceMessageId?: string;
  relatedQuestionIds?: string[];
}

/**
 * Fact extraction request
 */
export interface FactExtractionRequest {
  projectId: string;
  conversationContent: string;
  projectTypeSlug: string;
  existingFacts?: ExtractedFactData[];
}

/**
 * Fact extraction response from AI
 */
export interface FactExtractionResponse {
  facts: ExtractedFactData[];
  processingTimeMs: number;
  tokensUsed: number;
}

/**
 * Schema field definition for extraction
 */
export interface SchemaField {
  key: string;
  description: string;
  category: ExtractionCategory;
  required: boolean;
  examples?: string[];
}

/**
 * Extraction schema for a project type
 */
export interface ExtractionSchema {
  projectTypeSlug: string;
  projectTypeName: string;
  fields: SchemaField[];
  systemPromptAddition: string;
}

/**
 * Fact validation result
 */
export interface FactValidationResult {
  isValid: boolean;
  missingRequired: string[];
  lowConfidenceFacts: string[];
  completenessScore: number;
}
