/**
 * Provider Comparison Service
 * Compares document generation outputs from different AI providers
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';

export interface ProviderComparison {
  providerId: string;
  providerName: string;
  responseTime: number;
  tokenCount: number;
  estimatedCost: number;
  qualityScore: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ComparisonResult {
  projectId: string;
  documentTypeSlug: string;
  qualityLevel: number;
  comparisons: ProviderComparison[];
  recommendation: string;
  recommendedProvider: string;
  timestamp: Date;
}

@Injectable()
export class ProviderComparisonService {
  private readonly logger = new Logger(ProviderComparisonService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compare generation results from multiple providers
   */
  async compareProviders(
    projectId: string,
    documentTypeSlug: string,
    qualityLevel: number,
  ): Promise<ComparisonResult> {
    this.logger.log(`Comparing providers for project ${projectId}`);

    // Get available providers
    const providers = await this.prisma.aiProvider.findMany({
      where: { isActive: true },
    });

    // Generate comparison metrics for each provider
    const comparisons: ProviderComparison[] = providers.map((provider) => {
      const metrics = this.getProviderMetrics(provider.slug, qualityLevel);
      return {
        providerId: provider.id,
        providerName: provider.name,
        ...metrics,
      };
    });

    // Sort by quality/cost ratio
    comparisons.sort((a, b) => {
      const ratioA = a.qualityScore / (a.estimatedCost || 1);
      const ratioB = b.qualityScore / (b.estimatedCost || 1);
      return ratioB - ratioA;
    });

    // Generate recommendation
    const recommended = comparisons[0];
    const recommendation = this.generateRecommendation(recommended, comparisons);

    return {
      projectId,
      documentTypeSlug,
      qualityLevel,
      comparisons,
      recommendation,
      recommendedProvider: recommended.providerName,
      timestamp: new Date(),
    };
  }

  /**
   * Get metrics for a specific provider
   */
  private getProviderMetrics(
    providerSlug: string,
    qualityLevel: number,
  ): Omit<ProviderComparison, 'providerId' | 'providerName'> {
    // Baseline metrics per quality level
    const baseTokens = [2000, 4000, 8000, 12000, 16000][qualityLevel] ?? 4000;
    const baseTime = [3, 5, 8, 12, 18][qualityLevel] ?? 5;

    // Provider-specific adjustments
    const providerConfigs: Record<string, {
      speedMultiplier: number;
      costPer1kTokens: number;
      qualityBonus: number;
      strengths: string[];
      weaknesses: string[];
    }> = {
      claude: {
        speedMultiplier: 1.0,
        costPer1kTokens: 0.015,
        qualityBonus: 5,
        strengths: [
          'Excellent reasoning and analysis',
          'Natural conversational tone',
          'Strong at complex documents',
          'Good at maintaining context',
        ],
        weaknesses: [
          'Slightly higher latency',
          'May be verbose',
        ],
      },
      openai: {
        speedMultiplier: 0.8,
        costPer1kTokens: 0.01,
        qualityBonus: 0,
        strengths: [
          'Fast response times',
          'Cost effective',
          'Consistent output format',
          'Wide knowledge base',
        ],
        weaknesses: [
          'May need more guidance',
          'Less nuanced analysis',
        ],
      },
      'gpt-4': {
        speedMultiplier: 1.2,
        costPer1kTokens: 0.03,
        qualityBonus: 8,
        strengths: [
          'Highest quality output',
          'Excellent at complex reasoning',
          'Best for premium documents',
          'Strong accuracy',
        ],
        weaknesses: [
          'Higher cost',
          'Slower response time',
        ],
      },
    };

    const config = providerConfigs[providerSlug] ?? {
      speedMultiplier: 1.0,
      costPer1kTokens: 0.01,
      qualityBonus: 0,
      strengths: ['General purpose'],
      weaknesses: ['Limited customization'],
    };

    // Calculate metrics
    const responseTime = Math.round(baseTime * config.speedMultiplier);
    const tokenCount = baseTokens;
    const estimatedCost = (tokenCount / 1000) * config.costPer1kTokens;
    
    // Quality score: base 70 + quality level bonus + provider bonus
    const qualityScore = 70 + (qualityLevel * 5) + config.qualityBonus;

    return {
      responseTime,
      tokenCount,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      qualityScore: Math.min(100, qualityScore),
      strengths: config.strengths,
      weaknesses: config.weaknesses,
    };
  }

  /**
   * Generate recommendation text
   */
  private generateRecommendation(
    recommended: ProviderComparison,
    all: ProviderComparison[],
  ): string {
    const costDiff = all.length > 1 
      ? `${Math.round(((all[1].estimatedCost - recommended.estimatedCost) / recommended.estimatedCost) * 100)}% savings compared to alternatives`
      : '';

    return `${recommended.providerName} is recommended for this document. ` +
      `It offers a quality score of ${recommended.qualityScore}% ` +
      `with an estimated cost of $${recommended.estimatedCost.toFixed(2)}. ` +
      (costDiff ? costDiff : 'It provides the best balance of quality and cost.');
  }

  /**
   * Get provider recommendation for a specific use case
   */
  async getRecommendedProvider(
    documentType: string,
    qualityLevel: number,
    prioritize: 'quality' | 'speed' | 'cost' = 'quality',
  ): Promise<{ providerId: string; providerName: string; reason: string }> {
    const providers = await this.prisma.aiProvider.findMany({
      where: { isActive: true },
    });

    // Score each provider based on priority
    const scored = providers.map((provider) => {
      const metrics = this.getProviderMetrics(provider.slug, qualityLevel);
      let score: number;

      switch (prioritize) {
        case 'quality':
          score = metrics.qualityScore;
          break;
        case 'speed':
          score = 100 - metrics.responseTime * 5;
          break;
        case 'cost':
          score = 100 - metrics.estimatedCost * 10;
          break;
        default:
          score = metrics.qualityScore;
      }

      return { provider, metrics, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    return {
      providerId: best.provider.id,
      providerName: best.provider.name,
      reason: `Best option for ${prioritize} with score ${best.score.toFixed(0)}`,
    };
  }
}
