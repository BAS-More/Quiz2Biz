import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
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
 * Claude Adapter for Anthropic's Claude API
 *
 * Primary AI provider for Quiz2Biz chat and document generation.
 * Supports streaming, JSON mode, and cost tracking.
 */
@Injectable()
export class ClaudeAdapter implements AiAdapter {
  private readonly logger = new Logger(ClaudeAdapter.name);
  private client: Anthropic | null = null;
  private config: ProviderConfig | null = null;

  readonly provider = 'claude' as const;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log('Claude adapter initialized');
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not set, Claude adapter unavailable');
    }
  }

  /**
   * Set provider configuration from database
   */
  setConfig(config: ProviderConfig): void {
    this.config = config;
  }

  /**
   * Check if Claude is available
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
      chat: 'claude-sonnet-4-20250514',
      extract: 'claude-sonnet-4-20250514',
      generate: 'claude-sonnet-4-20250514',
    };
    return defaults[taskType] || 'claude-sonnet-4-20250514';
  }

  /**
   * Get max tokens for a task type
   */
  private getMaxTokens(taskType: string, requested?: number): number {
    if (requested) {return requested;}
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
    if (requested !== undefined) {return requested;}
    if (this.config?.config?.temperature?.[taskType as keyof typeof this.config.config.temperature]) {
      return this.config.config.temperature[taskType as keyof typeof this.config.config.temperature];
    }
    // Default temperatures
    const defaults: Record<string, number> = {
      chat: 0.7,
      extract: 0.1,
      generate: 0.5,
    };
    return defaults[taskType] || 0.7;
  }

  /**
   * Generate a non-streaming response
   */
  async generate(request: AiGatewayRequest): Promise<AiGatewayResponse> {
    if (!this.client) {
      throw new Error('Claude adapter not available');
    }

    const startTime = Date.now();
    const model = this.getModel(request.taskType);
    const maxTokens = this.getMaxTokens(request.taskType, request.maxTokens);
    const temperature = this.getTemperature(request.taskType, request.temperature);

    try {
      // Convert messages to Anthropic format
      const messages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: request.systemPrompt,
        messages,
      });

      const latencyMs = Date.now() - startTime;
      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';

      const usage: TokenUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      const cost = this.calculateCost(usage);

      this.logger.debug(
        `Claude response: ${usage.totalTokens} tokens, ${latencyMs}ms, $${cost.totalCost.toFixed(4)}`,
      );

      return {
        content,
        provider: 'claude',
        model,
        usage,
        cost,
        latencyMs,
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
        usedFallback: false,
      };
    } catch (error) {
      this.logger.error(`Claude generation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate a streaming response
   */
  async *generateStream(
    request: AiGatewayRequest,
  ): AsyncGenerator<AiStreamChunk, void, unknown> {
    if (!this.client) {
      throw new Error('Claude adapter not available');
    }

    const model = this.getModel(request.taskType);
    const maxTokens = this.getMaxTokens(request.taskType, request.maxTokens);
    const temperature = this.getTemperature(request.taskType, request.temperature);

    try {
      // Convert messages to Anthropic format
      const messages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const stream = this.client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        system: request.systemPrompt,
        messages,
      });

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string };
          if (delta.type === 'text_delta' && delta.text) {
            yield {
              content: delta.text,
              done: false,
              provider: 'claude',
            };
          }
        } else if (event.type === 'message_delta') {
          const usage = (event as { usage?: { output_tokens: number } }).usage;
          if (usage) {
            totalOutputTokens = usage.output_tokens;
          }
        } else if (event.type === 'message_start') {
          const message = (event as { message?: { usage?: { input_tokens: number } } }).message;
          if (message?.usage) {
            totalInputTokens = message.usage.input_tokens;
          }
        }
      }

      // Final chunk with usage info
      const usage: TokenUsage = {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      };

      yield {
        content: '',
        done: true,
        provider: 'claude',
        usage,
        cost: this.calculateCost(usage),
      };
    } catch (error) {
      this.logger.error(`Claude stream failed: ${error instanceof Error ? error.message : String(error)}`);
      yield {
        content: '',
        done: true,
        provider: 'claude',
        error: error instanceof Error ? error.message : 'Stream failed',
      };
    }
  }

  /**
   * Estimate token count for text
   * Uses a rough approximation (4 characters per token)
   */
  estimateTokens(text: string): number {
    // Claude typically uses ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(usage: TokenUsage): CostInfo {
    // Default Claude pricing (as of 2025)
    const inputPer1k = this.config?.config?.pricing?.inputPer1kTokens ?? 0.003;
    const outputPer1k = this.config?.config?.pricing?.outputPer1kTokens ?? 0.015;
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
