import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { AiProviderType, TokenUsage, CostInfo, AiTaskType } from '../interfaces';

/**
 * Cost tracking record
 */
export interface CostRecord {
  projectId?: string;
  userId?: string;
  provider: AiProviderType;
  model: string;
  taskType: AiTaskType;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  latencyMs: number;
  timestamp: Date;
}

/**
 * Cost summary for a project
 */
export interface ProjectCostSummary {
  projectId: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  byProvider: Record<AiProviderType, {
    cost: number;
    tokens: number;
    requests: number;
  }>;
  byTaskType: Record<AiTaskType, {
    cost: number;
    tokens: number;
    requests: number;
  }>;
}

/**
 * Cost Tracker Service
 *
 * Tracks AI API costs per project and user for billing and analytics.
 */
@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);

  // In-memory buffer for cost records (flushed periodically)
  private costBuffer: CostRecord[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Record a cost entry
   */
  async trackCost(record: CostRecord): Promise<void> {
    this.costBuffer.push(record);

    // Log for debugging
    this.logger.debug(
      `Cost tracked: ${record.provider}/${record.taskType} - ` +
      `${record.totalTokens} tokens, $${record.totalCost.toFixed(4)} ` +
      `[project: ${record.projectId || 'N/A'}]`,
    );

    // Flush if buffer is large
    if (this.costBuffer.length >= 100) {
      await this.flushCostBuffer();
    }
  }

  /**
   * Flush cost buffer to database
   */
  async flushCostBuffer(): Promise<void> {
    if (this.costBuffer.length === 0) {return;}

    const records = [...this.costBuffer];
    this.costBuffer = [];

    try {
      // Store cost records in metadata of ChatMessage or a separate table
      // For now, we'll aggregate by project and update project metadata
      const projectCosts = new Map<string, { tokens: number; cost: number }>();

      for (const record of records) {
        if (record.projectId) {
          const existing = projectCosts.get(record.projectId) || { tokens: 0, cost: 0 };
          existing.tokens += record.totalTokens;
          existing.cost += record.totalCost;
          projectCosts.set(record.projectId, existing);
        }
      }

      // Update project metadata with accumulated costs
      for (const [projectId, costs] of projectCosts) {
        try {
          const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { metadata: true },
          });

          if (project) {
            const metadata = (project.metadata as Record<string, unknown>) || {};
            const costTracking = (metadata.costTracking as Record<string, number>) || {
              totalTokens: 0,
              totalCostUsd: 0,
              requestCount: 0,
            };

            costTracking.totalTokens = (costTracking.totalTokens || 0) + costs.tokens;
            costTracking.totalCostUsd = (costTracking.totalCostUsd || 0) + costs.cost;
            costTracking.requestCount = (costTracking.requestCount || 0) + 1;

            await this.prisma.project.update({
              where: { id: projectId },
              data: {
                metadata: {
                  ...metadata,
                  costTracking,
                  lastCostUpdate: new Date().toISOString(),
                },
              },
            });
          }
        } catch (error) {
          this.logger.error(`Failed to update project ${projectId} costs: ${error}`);
        }
      }

      this.logger.debug(`Flushed ${records.length} cost records`);
    } catch (error) {
      // Put records back on failure
      this.costBuffer = [...records, ...this.costBuffer];
      this.logger.error(`Failed to flush cost buffer: ${error}`);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    // Flush every 30 seconds
    this.flushInterval = setInterval(() => {
      void this.flushCostBuffer();
    }, 30000);
  }

  /**
   * Stop periodic flush timer
   */
  stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Get cost summary for a project
   */
  async getProjectCostSummary(projectId: string): Promise<ProjectCostSummary | null> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { metadata: true },
      });

      if (!project) {return null;}

      const metadata = (project.metadata as Record<string, unknown>) || {};
      const costTracking = (metadata.costTracking as Record<string, number>) || {};

      return {
        projectId,
        totalCost: costTracking.totalCostUsd || 0,
        totalTokens: costTracking.totalTokens || 0,
        requestCount: costTracking.requestCount || 0,
        byProvider: {
          claude: { cost: 0, tokens: 0, requests: 0 },
          openai: { cost: 0, tokens: 0, requests: 0 },
          gemini: { cost: 0, tokens: 0, requests: 0 },
        },
        byTaskType: {
          chat: { cost: 0, tokens: 0, requests: 0 },
          extract: { cost: 0, tokens: 0, requests: 0 },
          generate: { cost: 0, tokens: 0, requests: 0 },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get project cost summary: ${error}`);
      return null;
    }
  }

  /**
   * Estimate cost for a request before execution
   */
  estimateCost(
    provider: AiProviderType,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
  ): CostInfo {
    // Default pricing (can be overridden by provider config)
    const pricing: Record<AiProviderType, { input: number; output: number }> = {
      claude: { input: 0.003, output: 0.015 },
      openai: { input: 0.0025, output: 0.01 },
      gemini: { input: 0.00025, output: 0.001 },
    };

    const rates = pricing[provider] || pricing.claude;
    const inputCost = (estimatedInputTokens / 1000) * rates.input;
    const outputCost = (estimatedOutputTokens / 1000) * rates.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: 'USD',
    };
  }

  /**
   * Clean up on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.stopPeriodicFlush();
    await this.flushCostBuffer();
  }
}
