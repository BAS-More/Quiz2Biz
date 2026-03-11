/**
 * AI Gateway Interfaces
 *
 * Unified interfaces for the AI Gateway module that abstracts
 * multiple AI providers (Claude, OpenAI, Gemini) behind a common interface.
 */

/**
 * Task types supported by the AI Gateway
 */
export type AiTaskType = 'chat' | 'extract' | 'generate';

/**
 * Supported AI providers
 */
export type AiProviderType = 'claude' | 'openai' | 'gemini';

/**
 * Message role for chat conversations
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Chat message structure
 */
export interface AiMessage {
  role: MessageRole;
  content: string;
  name?: string; // Optional name for multi-turn conversations
}

/**
 * Unified request interface for AI Gateway
 */
export interface AiGatewayRequest {
  /** Type of AI task to perform */
  taskType: AiTaskType;

  /** Preferred AI provider (defaults to configured default) */
  provider?: AiProviderType;

  /** Conversation messages */
  messages: AiMessage[];

  /** System prompt for the conversation */
  systemPrompt: string;

  /** Enable JSON mode for structured outputs */
  jsonMode?: boolean;

  /** Enable streaming response */
  stream?: boolean;

  /** Maximum tokens for response */
  maxTokens?: number;

  /** Temperature for response generation (0-1) */
  temperature?: number;

  /** Project ID for context and cost tracking */
  projectId?: string;

  /** User ID for audit logging */
  userId?: string;

  /** Optional metadata for tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Cost calculation result
 */
export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

/**
 * Unified response interface from AI Gateway
 */
export interface AiGatewayResponse {
  /** Generated content */
  content: string;

  /** Provider that generated the response */
  provider: AiProviderType;

  /** Model used for generation */
  model: string;

  /** Token usage statistics */
  usage: TokenUsage;

  /** Cost information */
  cost: CostInfo;

  /** Response latency in milliseconds */
  latencyMs: number;

  /** Finish reason from the provider */
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';

  /** Whether the response was from a fallback provider */
  usedFallback: boolean;

  /** Original provider if fallback was used */
  originalProvider?: AiProviderType;
}

/**
 * Streaming chunk for SSE responses
 */
export interface AiStreamChunk {
  /** Chunk content (partial response) */
  content: string;

  /** Whether this is the final chunk */
  done: boolean;

  /** Provider generating the stream */
  provider: AiProviderType;

  /** Token usage (only in final chunk) */
  usage?: TokenUsage;

  /** Cost info (only in final chunk) */
  cost?: CostInfo;

  /** Error message if stream failed */
  error?: string;
}

/**
 * AI Adapter interface - implemented by each provider adapter
 */
export interface AiAdapter {
  /** Provider identifier */
  readonly provider: AiProviderType;

  /** Check if adapter is available (API key configured) */
  isAvailable(): boolean;

  /** Generate a non-streaming response */
  generate(request: AiGatewayRequest): Promise<AiGatewayResponse>;

  /** Generate a streaming response */
  generateStream(request: AiGatewayRequest): AsyncGenerator<AiStreamChunk, void, unknown>;

  /** Estimate token count for a message */
  estimateTokens(text: string): number;

  /** Calculate cost for token usage */
  calculateCost(usage: TokenUsage): CostInfo;
}

/**
 * Provider configuration from database
 */
export interface ProviderConfig {
  id: string;
  slug: string;
  name: string;
  apiEndpoint: string;
  modelMap: Record<string, string>;
  isActive: boolean;
  isDefault: boolean;
  config: {
    maxTokens?: Record<AiTaskType, number>;
    temperature?: Record<AiTaskType, number>;
    rateLimits?: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
    pricing?: {
      inputPer1kTokens: number;
      outputPer1kTokens: number;
      currency: string;
    };
    features?: {
      streaming?: boolean;
      jsonMode?: boolean;
      vision?: boolean;
      functionCalling?: boolean;
    };
  };
}

/**
 * Gateway health status
 */
export interface GatewayHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: {
    provider: AiProviderType;
    available: boolean;
    latencyMs?: number;
    lastError?: string;
  }[];
  timestamp: Date;
}
