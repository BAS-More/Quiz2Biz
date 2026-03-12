import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AiAdapter,
  AiGatewayRequest,
  AiGatewayResponse,
  AiStreamChunk,
  TokenUsage,
  CostInfo,
  ProviderConfig,
} from '../interfaces';

/**
 * OpenAI Adapter for OpenAI's GPT API
 *
 * Secondary AI provider for Quiz2Biz.
 * Supports streaming, JSON mode, and cost tracking.
 */
@Injectable()
export class OpenAIAdapter implements AiAdapter {
  private readonly logger = new Logger(OpenAIAdapter.name);
  private client: OpenAI | null = null;
  private config: ProviderConfig | null = null;

  readonly provider = 'openai' as const;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI adapter initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not set, OpenAI adapter unavailable');
    }
  }

  /**
   * Set provider configuration from database
   */
  setConfig(config: ProviderConfig): void {
    this.config = config;
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get the model to use for a task type
   */
  private getModel(taskType: string): string {
    if (this.config?.modelMap?.[taskType]) {
      return this.config.modelMap[taskType];
    }
    // Default models
    const defaults: Record<string, string> = {
      chat: 'gpt-4o',
      extract: 'gpt-4o-mini',
      generate: 'gpt-4o',
    };
    return defaults[taskType] || 'gpt-4o';
  }

  /**
   * Get max tokens for a task type
   */
  private getMaxTokens(taskType: string, requested?: number): number {
    if (requested) {
      return requested;
    }
    if (this.config?.config?.maxTokens?.[taskType as keyof typeof this.config.config.maxTokens]) {
      return this.config.config.maxTokens[taskType as keyof typeof this.config.config.maxTokens];
    }
    // Default max tokens
    const defaults: Record<string, number> = {
      chat: 4096,
      extract: 2048,
      generate: 16384,
    };
    return defaults[taskType] || 4096;
  }

  /**
   * Get temperature for a task type
   */
  private getTemperature(taskType: string, requested?: number): number {
    if (requested !== undefined) {
      return requested;
    }
    if (
      this.config?.config?.temperature?.[taskType as keyof typeof this.config.config.temperature]
    ) {
      return this.config.config.temperature[
        taskType as keyof typeof this.config.config.temperature
      ];
    }
    // Default temperatures
    const defaults: Record<string, number> = {
      chat: 0.7,
      extract: 0.1,
      generate: 0.5,
    };
    return defaults[taskType] || 0.7;
  }

  private normalizeFinishReason(
    reason: string | undefined | null,
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    const map: Record<string, 'stop' | 'length' | 'content_filter' | 'error'> = {
      stop: 'stop',
      length: 'length',
      content_filter: 'content_filter',
      // Known additional OpenAI finish reasons that we do not model explicitly
      // are treated as 'error' instead of being silently coerced to 'stop'.
      tool_calls: 'error',
      function_call: 'error',
    };
    return map[reason ?? ''] ?? 'error';
  }

  /**
   * Generate a non-streaming response
   */
  async generate(request: AiGatewayRequest): Promise<AiGatewayResponse> {
    if (!this.client) {
      throw new Error('OpenAI adapter not available');
    }

    const startTime = Date.now();
    const model = this.getModel(request.taskType);
    const maxTokens = this.getMaxTokens(request.taskType, request.maxTokens);
    const temperature = this.getTemperature(request.taskType, request.temperature);

    try {
      // Build messages array with system prompt
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      ];

      const completionParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages,
      };

      // Enable JSON mode if requested
      if (request.jsonMode) {
        completionParams.response_format = { type: 'json_object' };
      }

      const response = await this.client.chat.completions.create(completionParams);

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';

      const usage: TokenUsage = {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      const cost = this.calculateCost(usage);

      this.logger.debug(
        `OpenAI response: ${usage.totalTokens} tokens, ${latencyMs}ms, $${cost.totalCost.toFixed(4)}`,
      );

      const finishReason = response.choices[0]?.finish_reason;
      const normalizedFinishReason = this.normalizeFinishReason(finishReason);

      return {
        content,
        provider: 'openai',
        model,
        usage,
        cost,
        latencyMs,
        finishReason: normalizedFinishReason,
        usedFallback: false,
      };
    } catch (error) {
      this.logger.error(
        `OpenAI generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Generate a streaming response
   */
  async *generateStream(request: AiGatewayRequest): AsyncGenerator<AiStreamChunk, void, unknown> {
    if (!this.client) {
      throw new Error('OpenAI adapter not available');
    }

    const model = this.getModel(request.taskType);
    const maxTokens = this.getMaxTokens(request.taskType, request.maxTokens);
    const temperature = this.getTemperature(request.taskType, request.temperature);

    try {
      // Build messages array with system prompt
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      ];

      const stream = await this.client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages,
        stream: true,
        stream_options: { include_usage: true },
      });

      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield {
            content,
            done: false,
            provider: 'openai',
          };
        }

        // Capture usage from final chunk
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
          totalTokens = chunk.usage.total_tokens;
        }
      }

      // Final chunk with usage info
      const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens,
      };

      yield {
        content: '',
        done: true,
        provider: 'openai',
        usage,
        cost: this.calculateCost(usage),
      };
    } catch (error) {
      this.logger.error(
        `OpenAI stream failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      yield {
        content: '',
        done: true,
        provider: 'openai',
        error: error instanceof Error ? error.message : 'Stream failed',
      };
    }
  }

  /**
   * Estimate token count for text
   * Uses a rough approximation (4 characters per token)
   */
  estimateTokens(text: string): number {
    // GPT typically uses ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(usage: TokenUsage): CostInfo {
    // Default GPT-4o pricing (as of 2025)
    const inputPer1k = this.config?.config?.pricing?.inputPer1kTokens ?? 0.0025;
    const outputPer1k = this.config?.config?.pricing?.outputPer1kTokens ?? 0.01;
    const currency = this.config?.config?.pricing?.currency ?? 'USD';

    const inputCost = (usage.inputTokens / 1000) * inputPer1k;
    const outputCost = (usage.outputTokens / 1000) * outputPer1k;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency,
    };
  }
}
