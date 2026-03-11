/**
 * DeliverablesCompilerService — Orchestrator (thin facade).
 *
 * Delegates document compilation to section builders under ./section-builders/.
 * Implements Quiz2Biz document generation (Section 15).
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { SessionStatus } from '@prisma/client';

// Re-export types so existing consumers keep working
export {
  DeliverableCategory,
  DeliverablePack,
  CompiledDocument,
  DocumentSection,
  PackSummary,
  PackMetadata,
  CompilerOptions,
} from './compiler-types';

import {
  MAX_WORDS_PER_SECTION,
  DeliverablePack,
  CompiledDocument,
  PackMetadata,
  CompilerOptions,
} from './compiler-types';
import { buildPackSummary } from './compiler-utils';
import {
  compileArchitectureDossier,
  compileSDLCPlaybook,
  compileTestStrategy,
  compileDevSecOpsDocument,
  compilePrivacyDocument,
  compileObservabilityDocument,
  compileFinanceDocument,
  compilePolicyDocument,
  compileDecisionLog,
  compileReadinessReport,
} from './section-builders';

@Injectable()
export class DeliverablesCompilerService {
  private readonly logger = new Logger(DeliverablesCompilerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compile complete deliverables pack for a session
   */
  async compileDeliverablesPack(
    sessionId: string,
    userId: string,
    options: CompilerOptions = {},
  ): Promise<DeliverablePack> {
    const {
      includeDecisionLog = true,
      includeReadinessReport = true,
      includePolicyPack = true,
      autoSection = true,
      maxWordsPerSection = MAX_WORDS_PER_SECTION,
    } = options;

    const session = await this.validateSession(sessionId, userId);

    const [responses, dimensions, decisions, evidenceItems] = await Promise.all([
      this.getSessionResponses(sessionId),
      this.getDimensionScores(sessionId),
      includeDecisionLog ? this.getDecisions(sessionId) : Promise.resolve([]),
      this.getEvidenceItems(sessionId),
    ]);

    const documents: CompiledDocument[] = [];

    // Core documents (always included)
    documents.push(
      compileArchitectureDossier(session, responses, dimensions, autoSection, maxWordsPerSection),
    );
    documents.push(
      compileSDLCPlaybook(session, responses, dimensions, autoSection, maxWordsPerSection),
    );
    documents.push(
      compileTestStrategy(session, responses, dimensions, autoSection, maxWordsPerSection),
    );
    documents.push(
      compileDevSecOpsDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
    );
    documents.push(
      compilePrivacyDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
    );
    documents.push(
      compileObservabilityDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
    );
    documents.push(
      compileFinanceDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
    );

    // Optional documents
    if (includePolicyPack) {
      documents.push(
        compilePolicyDocument(session, responses, dimensions, autoSection, maxWordsPerSection),
      );
    }
    if (includeDecisionLog && decisions.length > 0) {
      documents.push(compileDecisionLog(session, decisions, autoSection, maxWordsPerSection));
    }
    if (includeReadinessReport) {
      documents.push(
        compileReadinessReport(session, dimensions, evidenceItems, autoSection, maxWordsPerSection),
      );
    }

    const readinessScore = session.readinessScore ? Number(session.readinessScore) : 0;
    const summary = buildPackSummary(documents);
    const generatedAt = new Date();

    const metadata: PackMetadata = {
      sessionId,
      userId,
      questionnaireVersion: session.questionnaireVersion,
      industry: session.industry ?? undefined,
      readinessScore,
      dimensionScores: dimensions,
      generationTimestamp: generatedAt.toISOString(),
    };

    this.logger.log(
      `Compiled deliverables pack for session ${sessionId}: ${documents.length} documents, ${summary.totalWordCount} words`,
    );

    return { sessionId, generatedAt, documents, summary, readinessScore, metadata };
  }

  // === Data-fetching helpers (require PrismaService) ===

  private async validateSession(sessionId: string, userId: string): Promise<any> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { questionnaire: { select: { name: true, version: true } } },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    if (session.userId !== userId) {
      throw new BadRequestException('Access denied to this session');
    }
    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException(
        `Session must be completed before compiling deliverables. Current status: ${session.status}`,
      );
    }

    return session;
  }

  private async getSessionResponses(sessionId: string): Promise<any[]> {
    return this.prisma.response.findMany({
      where: { sessionId, isValid: true },
      include: { question: { include: { section: true, dimension: true } } },
    });
  }

  private async getDimensionScores(sessionId: string): Promise<Record<string, number>> {
    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      include: { question: { include: { dimension: true } } },
    });

    const dimensionScores: Record<string, { total: number; count: number }> = {};

    for (const response of responses) {
      const dimensionKey = response.question.dimension?.key;
      if (dimensionKey) {
        if (!dimensionScores[dimensionKey]) {
          dimensionScores[dimensionKey] = { total: 0, count: 0 };
        }
        const coverage = response.coverage ? Number(response.coverage) : 0;
        dimensionScores[dimensionKey].total += coverage;
        dimensionScores[dimensionKey].count += 1;
      }
    }

    const result: Record<string, number> = {};
    for (const [key, { total, count }] of Object.entries(dimensionScores)) {
      result[key] = count > 0 ? Math.round((total / count) * 100) : 0;
    }
    return result;
  }

  private async getDecisions(sessionId: string): Promise<any[]> {
    return this.prisma.decisionLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getEvidenceItems(sessionId: string): Promise<any[]> {
    return this.prisma.evidenceRegistry.findMany({
      where: { sessionId },
      include: { question: true },
    });
  }
}
