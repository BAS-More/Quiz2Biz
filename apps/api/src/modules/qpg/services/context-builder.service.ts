/**
 * Context Builder Service
 * Builds gap context from questionnaire session data
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { GapContext } from '../types';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build gap contexts for a session
   * Identifies questions with coverage < 1.0 (gaps)
   */
  async buildGapContexts(sessionId: string): Promise<GapContext[]> {
    this.logger.log(`Building gap contexts for session: ${sessionId}`);

    // Get session with responses and questions
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        responses: {
          include: {
            question: {
              include: {
                dimension: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      return [];
    }

    const gaps: GapContext[] = [];

    for (const response of session.responses) {
      // Only include responses with coverage < 1.0 (gaps)
      const coverage = response.coverage?.toNumber() ?? 0;
      if (coverage < 1.0) {
        const question = response.question;
        const dimension = question.dimension;

        // Calculate residual risk for this gap
        const severity = question.severity?.toNumber() ?? 0.5;
        const residualRisk = severity * (1 - coverage);

        gaps.push({
          sessionId,
          dimensionKey: dimension?.key ?? 'unknown',
          dimensionName: dimension?.displayName ?? 'Unknown',
          questionId: question.id,
          questionText: question.text,
          currentCoverage: coverage,
          severity,
          residualRisk,
          bestPractice: question.bestPractice ?? '',
          practicalExplainer: question.practicalExplainer ?? '',
          standardRefs: this.parseStandardRefs(question.standardRefs),
          userAnswer: response.value as string | undefined,
          userNotes: response.rationale ?? undefined,
        });
      }
    }

    // Sort by residual risk (highest first)
    gaps.sort((a, b) => b.residualRisk - a.residualRisk);

    this.logger.log(`Found ${gaps.length} gaps for session ${sessionId}`);
    return gaps;
  }

  /**
   * Parse standard references from JSON or comma-separated string
   */
  private parseStandardRefs(refs: string | null | undefined): string[] {
    if (!refs) {
      return [];
    }

    try {
      // Try JSON parse first
      const parsed = JSON.parse(refs);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fall back to comma-separated
      return refs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Get gap summary for a session
   */
  async getGapSummary(sessionId: string): Promise<{
    totalGaps: number;
    byDimension: Record<string, number>;
    highPriorityCount: number;
    totalResidualRisk: number;
  }> {
    const gaps = await this.buildGapContexts(sessionId);

    const byDimension: Record<string, number> = {};
    let highPriorityCount = 0;
    let totalResidualRisk = 0;

    for (const gap of gaps) {
      byDimension[gap.dimensionKey] = (byDimension[gap.dimensionKey] || 0) + 1;
      totalResidualRisk += gap.residualRisk;
      if (gap.residualRisk > 0.15) {
        highPriorityCount++;
      }
    }

    return {
      totalGaps: gaps.length,
      byDimension,
      highPriorityCount,
      totalResidualRisk,
    };
  }
}
