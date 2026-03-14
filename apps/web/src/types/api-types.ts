/**
 * Frontend type definitions for backend API responses.
 *
 * These mirror the backend DTOs so that the frontend can deserialise
 * responses in a type-safe way. Keep in sync with the corresponding
 * NestJS DTO files.
 */

// ─── AI Gateway ─────────────────────────────────────────────────────────────

export type AiProvider = 'claude' | 'openai' | 'gemini';
export type AiTaskType = 'chat' | 'extract' | 'generate';
export type AiFinishReason = 'stop' | 'length' | 'content_filter' | 'error';
export type GatewayHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

export interface AiGatewayRequest {
  taskType: AiTaskType;
  provider?: AiProvider;
  messages: AiMessage[];
  systemPrompt: string;
  jsonMode?: boolean;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  projectId?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface AiGatewayResponse {
  content: string;
  provider: AiProvider;
  model: string;
  usage: TokenUsage;
  cost: CostInfo;
  latencyMs: number;
  finishReason: AiFinishReason;
  usedFallback: boolean;
  originalProvider?: AiProvider;
}

export interface ProviderStatus {
  provider: AiProvider;
  available: boolean;
  latencyMs?: number;
  lastError?: string;
}

export interface GatewayHealth {
  status: GatewayHealthStatus;
  providers: ProviderStatus[];
  timestamp: string;
}

// ─── Standards ──────────────────────────────────────────────────────────────

export type StandardCategory =
  | 'MODERN_ARCHITECTURE'
  | 'AI_ASSISTED_DEV'
  | 'CODING_STANDARDS'
  | 'TESTING_QA'
  | 'SECURITY_DEVSECOPS';

export interface StandardPrinciple {
  title: string;
  description: string;
  examples?: string[];
}

export interface StandardResponse {
  id: string;
  category: StandardCategory;
  title: string;
  description: string;
  principles: StandardPrinciple[];
  version: string;
  isActive: boolean;
}

export interface StandardsSectionResponse {
  markdown: string;
  standards: {
    category: StandardCategory;
    title: string;
    principles: { title: string; description: string }[];
  }[];
}

export interface DocumentTypeMapping {
  id: string;
  name: string;
  slug: string;
  sectionTitle?: string;
  priority: number;
}

export interface StandardWithMappings extends StandardResponse {
  documentTypes: DocumentTypeMapping[];
}

// ─── Quality Scoring ────────────────────────────────────────────────────────

export interface CriteriaScore {
  criterionKey: string;
  criterionDescription: string;
  met: boolean;
  confidence: number;
  sourceFactKey?: string;
}

export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  weight: number;
  score: number;
  completeness: number;
  criteriaScores: CriteriaScore[];
}

export interface ProjectQualityScoreDetailed {
  projectId: string;
  overallScore: number;
  completenessScore: number;
  confidenceScore: number;
  dimensionScores: DimensionScore[];
  recommendations: string[];
  scoredAt: string;
}

export interface QualityImprovement {
  dimensionId: string;
  dimensionName: string;
  currentScore: number;
  potentialScore: number;
  missingCriteria: string[];
  suggestedQuestions: string[];
}

// ─── Scoring Engine (next-questions) ────────────────────────────────────────

export interface PrioritizedQuestion {
  questionId: string;
  text: string;
  dimensionKey: string;
  dimensionName: string;
  severity: number;
  currentCoverage: number;
  expectedScoreLift: number;
  rationale: string;
  rank: number;
}

export interface NextQuestionsResult {
  sessionId: string;
  currentScore: number;
  questions: PrioritizedQuestion[];
  maxPotentialScore: number;
}
