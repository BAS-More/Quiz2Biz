import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ClaudeAdapter, OpenAIAdapter } from './adapters';
import { CostTrackerService } from './services/cost-tracker.service';
import {
  AiAdapter,
  AiGatewayRequest,
  AiGatewayResponse,
  AiStreamChunk,
  AiProviderType,
  ProviderConfig,
  GatewayHealth,
} from './interfaces';

/**
 * AI Gateway Service
 *
 * Central routing service for AI requests. Manages provider selection,
 * fallback logic, streaming, and cost tracking.
 */
@Injectable()
export class AiGatewayService implements OnModuleInit {
  private readonly logger = new Logger(AiGatewayService.name);
  private adapters: Map<AiProviderType, AiAdapter> = new Map();
  private providerConfigs: Map<AiProviderType, ProviderConfig> = new Map();
  private defaultProvider: AiProviderType = 'claude';

  constructor(
    private readonly prisma: PrismaService,
    private readonly claudeAdapter: ClaudeAdapter,
    private readonly openAIAdapter: OpenAIAdapter,
    private readonly costTracker: CostTrackerService,
  ) {
    // Register adapters
    this.adapters.set('claude', this.claudeAdapter);
    this.adapters.set('openai', this.openAIAdapter);
  }

  /**
   * Load provider configurations from database
   */
  async onModuleInit(): Promise<void> {
    await this.loadProviderConfigs();
  }

  /**
   * Load provider configurations from database
   */
  async loadProviderConfigs(): Promise<void> {
    try {
      const providers = await this.prisma.aiProvider.findMany({
        where: { isActive: true },
      });

      for (const provider of providers) {
        const config: ProviderConfig = {
          id: provider.id,
          slug: provider.slug,
          name: provider.name,
          apiEndpoint: provider.apiEndpoint || '',
          modelMap: provider.modelMap as Record<string, string>,
          isActive: provider.isActive,
          isDefault: provider.isDefault,
          config: provider.config as ProviderConfig['config'],
        };

        this.providerConfigs.set(provider.slug as AiProviderType, config);

        // Set config on adapter
        const adapter = this.adapters.get(provider.slug as AiProviderType);
        if (adapter && 'setConfig' in adapter) {
          (adapter as ClaudeAdapter | OpenAIAdapter).setConfig(config);
        }

        // Track default provider
        if (provider.isDefault) {
          this.defaultProvider = provider.slug as AiProviderType;
        }
      }

      this.logger.log(
        `Loaded ${providers.length} provider configs, default: ${this.defaultProvider}`,
      );
    } catch (error) {
      this.logger.error(`Failed to load provider configs: ${error}`);
    }
  }

  /**
   * Get the fallback provider order
   */
  private getFallbackOrder(preferredProvider?: AiProviderType): AiProviderType[] {
    const order: AiProviderType[] = [];

    // Add preferred provider first
    if (preferredProvider) {
      order.push(preferredProvider);
    }

    // Add default provider
    if (!order.includes(this.defaultProvider)) {
      order.push(this.defaultProvider);
    }

    // Add remaining active providers
    for (const [slug] of this.providerConfigs) {
      if (!order.includes(slug) && this.providerConfigs.get(slug)?.isActive) {
        order.push(slug);
      }
    }

    return order;
  }

  /**
   * Get available adapter for a provider
   */
  private getAdapter(provider: AiProviderType): AiAdapter | null {
    const adapter = this.adapters.get(provider);
    if (adapter && adapter.isAvailable()) {
      return adapter;
    }
    return null;
  }

  /**
   * Generate a non-streaming response with fallback
   */
  async generate(request: AiGatewayRequest): Promise<AiGatewayResponse> {
    const providers = this.getFallbackOrder(request.provider);
    let lastError: Error | null = null;
    let usedFallback = false;
    let originalProvider: AiProviderType | undefined;

    for (const provider of providers) {
      const adapter = this.getAdapter(provider);
      if (!adapter) {
        this.logger.debug(`Provider ${provider} not available, trying next`);
        continue;
      }

      try {
        const requestWithProvider = { ...request, provider };
        const response = await adapter.generate(requestWithProvider);

        // Track cost
        await this.costTracker.trackCost({
          projectId: request.projectId,
          userId: request.userId,
          provider: response.provider,
          model: response.model,
          taskType: request.taskType,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
          inputCost: response.cost.inputCost,
          outputCost: response.cost.outputCost,
          totalCost: response.cost.totalCost,
          currency: response.cost.currency,
          latencyMs: response.latencyMs,
          timestamp: new Date(),
        });

        // Return with fallback info
        return {
          ...response,
          usedFallback,
          originalProvider,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Provider ${provider} failed: ${lastError.message}`);

        // Track original provider for fallback info
        if (!usedFallback) {
          originalProvider = provider;
          usedFallback = true;
        }
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Generate a streaming response with fallback
   */
  async *generateStream(
    request: AiGatewayRequest,
  ): AsyncGenerator<AiStreamChunk, void, unknown> {
    const providers = this.getFallbackOrder(request.provider);
    let lastError: Error | null = null;

    for (const provider of providers) {
      const adapter = this.getAdapter(provider);
      if (!adapter) {
        this.logger.debug(`Provider ${provider} not available, trying next`);
        continue;
      }

      try {
        const requestWithProvider = { ...request, provider };
        const stream = adapter.generateStream(requestWithProvider);

        let finalChunk: AiStreamChunk | null = null;

        for await (const chunk of stream) {
          if (chunk.done) {
            finalChunk = chunk;
          } else {
            yield chunk;
          }
        }

        // Track cost from final chunk
        if (finalChunk && finalChunk.usage && finalChunk.cost) {
          await this.costTracker.trackCost({
            projectId: request.projectId,
            userId: request.userId,
            provider,
            model: this.getModelForProvider(provider, request.taskType),
            taskType: request.taskType,
            inputTokens: finalChunk.usage.inputTokens,
            outputTokens: finalChunk.usage.outputTokens,
            totalTokens: finalChunk.usage.totalTokens,
            inputCost: finalChunk.cost.inputCost,
            outputCost: finalChunk.cost.outputCost,
            totalCost: finalChunk.cost.totalCost,
            currency: finalChunk.cost.currency,
            latencyMs: 0, // Not tracked for streaming
            timestamp: new Date(),
          });
        }

        // Yield final chunk
        if (finalChunk) {
          yield finalChunk;
        }

        // Stream completed successfully
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Stream provider ${provider} failed: ${lastError.message}`);
      }
    }

    // All providers failed
    yield {
      content: '',
      done: true,
      provider: request.provider || this.defaultProvider,
      error: `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
    };
  }

  /**
   * Get model name for a provider and task type
   */
  private getModelForProvider(provider: AiProviderType, taskType: string): string {
    const config = this.providerConfigs.get(provider);
    if (config?.modelMap?.[taskType]) {
      return config.modelMap[taskType];
    }

    // Defaults
    const defaults: Record<AiProviderType, Record<string, string>> = {
      claude: { chat: 'claude-sonnet-4-20250514', extract: 'claude-sonnet-4-20250514', generate: 'claude-sonnet-4-20250514' },
      openai: { chat: 'gpt-4o', extract: 'gpt-4o-mini', generate: 'gpt-4o' },
      gemini: { chat: 'gemini-2.0-flash', extract: 'gemini-2.0-flash', generate: 'gemini-2.0-flash' },
    };

    return defaults[provider]?.[taskType] || 'unknown';
  }

  /**
   * Get gateway health status
   */
  async getHealth(): Promise<GatewayHealth> {
    const providerStatuses: GatewayHealth['providers'] = [];

    for (const [provider, adapter] of this.adapters) {
      providerStatuses.push({
        provider,
        available: adapter.isAvailable(),
      });
    }

    const availableCount = providerStatuses.filter((p) => p.available).length;
    let status: GatewayHealth['status'] = 'healthy';

    if (availableCount === 0) {
      status = 'unhealthy';
    } else if (availableCount < this.adapters.size) {
      status = 'degraded';
    }

    return {
      status,
      providers: providerStatuses,
      timestamp: new Date(),
    };
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): AiProviderType {
    return this.defaultProvider;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AiProviderType[] {
    return Array.from(this.adapters.entries())
      .filter(([, adapter]) => adapter.isAvailable())
      .map(([provider]) => provider);
  }
}
