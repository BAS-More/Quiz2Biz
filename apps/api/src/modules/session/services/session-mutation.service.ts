/**
 * SessionMutationService — write operations for sessions.
 * Extracted from SessionService to reduce file size.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus, Prisma, Question } from '@prisma/client';
import { PrismaService } from '@libs/database';
import { QuestionnaireService, QuestionResponse } from '../../questionnaire/questionnaire.service';
import { AdaptiveLogicService } from '../../adaptive-logic/adaptive-logic.service';
import { ScoringEngineService } from '../../scoring-engine/scoring-engine.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { SubmitResponseDto } from '../dto/submit-response.dto';
import {
  SessionResponse,
  SubmitResponseResult,
  ContinueSessionResponse,
  READINESS_SCORE_THRESHOLD,
} from '../session-types';
import {
  getSessionWithValidation,
  isReadinessGatedSession,
  mapToSessionResponse,
  mapQuestionToResponse,
  calculateProgress,
  validateResponse,
  findNextUnansweredQuestion,
} from '../session-helpers';
import type { SessionQueryService } from './session-query.service';

export class SessionMutationService {
  private queryService!: SessionQueryService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly questionnaireService: QuestionnaireService,
    private readonly adaptiveLogicService: AdaptiveLogicService,
    private readonly scoringEngineService: ScoringEngineService,
  ) {}

  /** Called by SessionService after both sub-services are instantiated */
  setQueryService(qs: SessionQueryService): void {
    this.queryService = qs;
  }

  async create(userId: string, dto: CreateSessionDto): Promise<SessionResponse> {
    const questionnaire = await this.questionnaireService.findById(dto.questionnaireId);
    const personaQuestions = dto.persona
      ? await this.questionnaireService.getQuestionsForPersona(dto.questionnaireId, dto.persona)
      : null;
    const totalQuestions = personaQuestions
      ? personaQuestions.length
      : await this.questionnaireService.getTotalQuestionCount(dto.questionnaireId);

    const firstPersonaQuestion = personaQuestions?.[0];
    const firstSection = questionnaire.sections[0];
    const firstQuestion = firstSection?.questions?.[0];
    const initialQuestionId = firstPersonaQuestion?.id ?? firstQuestion?.id;
    const initialSectionId = firstPersonaQuestion?.sectionId ?? firstSection?.id;

    const session = await this.prisma.session.create({
      data: {
        userId,
        questionnaireId: dto.questionnaireId,
        questionnaireVersion: questionnaire.version,
        projectTypeId: dto.projectTypeId,
        ideaCaptureId: dto.ideaCaptureId,
        persona: dto.persona,
        industry: dto.industry,
        status: SessionStatus.IN_PROGRESS,
        progress: { percentage: 0, answered: 0, total: totalQuestions },
        currentSectionId: initialSectionId,
        currentQuestionId: initialQuestionId,
        adaptiveState: {
          activeQuestionIds: [],
          skippedQuestionIds: [],
          branchHistory: [],
        },
      },
      include: {
        currentSection: true,
        projectType: { select: { name: true, slug: true } },
      },
    });
    return mapToSessionResponse(session, totalQuestions);
  }

  async submitResponse(
    sessionId: string,
    userId: string,
    dto: SubmitResponseDto,
  ): Promise<SubmitResponseResult> {
    const session = await getSessionWithValidation(this.prisma, sessionId, userId);
    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }

    const question = await this.questionnaireService.getQuestionById(dto.questionId);
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    const validation = validateResponse(question, dto.value);

    const response = await this.prisma.response.upsert({
      where: { sessionId_questionId: { sessionId, questionId: dto.questionId } },
      create: {
        sessionId,
        questionId: dto.questionId,
        value: JSON.parse(JSON.stringify(dto.value)),
        isValid: validation.isValid,
        validationErrors: validation.errors ? { errors: validation.errors } : Prisma.JsonNull,
        timeSpentSeconds: dto.timeSpentSeconds,
      },
      update: {
        value: JSON.parse(JSON.stringify(dto.value)),
        isValid: validation.isValid,
        validationErrors: validation.errors ? { errors: validation.errors } : Prisma.JsonNull,
        timeSpentSeconds: dto.timeSpentSeconds,
        revision: { increment: 1 },
      },
    });

    const allResponses = await this.prisma.response.findMany({
      where: { sessionId },
      take: 1000,
    });
    const responseMap = new Map(allResponses.map((r) => [r.questionId, r.value]));
    const visibleQuestions = await this.adaptiveLogicService.getVisibleQuestions(
      session.questionnaireId,
      responseMap,
    );

    // Recalculate score after every response
    await this.scoringEngineService.invalidateScoreCache(sessionId);
    const scoreResult = await this.scoringEngineService.calculateScore({ sessionId });

    // NQS: pick the next highest-impact question
    let nqsNext:
      | { questionId: string; text: string; dimensionKey: string; expectedScoreLift: number }
      | undefined;
    const nqsResult = await this.scoringEngineService.getNextQuestions({ sessionId, limit: 1 });
    if (nqsResult.questions.length > 0) {
      const topQ = nqsResult.questions[0];
      nqsNext = {
        questionId: topQ.questionId,
        text: topQ.text,
        dimensionKey: topQ.dimensionKey,
        expectedScoreLift: topQ.expectedScoreLift,
      };
    }

    const nqsQuestion = nqsNext
      ? visibleQuestions.find((q) => q.id === nqsNext.questionId)
      : null;
    const nextQuestion =
      nqsQuestion ?? findNextUnansweredQuestion(visibleQuestions, dto.questionId, responseMap);
    const progress = calculateProgress(allResponses.length, visibleQuestions.length);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        currentQuestionId: nextQuestion?.id,
        currentSectionId: nextQuestion?.sectionId,
        lastActivityAt: new Date(),
        progress: {
          percentage: progress.percentage,
          answered: progress.answeredQuestions,
          total: progress.totalQuestions,
        },
      },
    });

    return {
      responseId: response.id,
      questionId: dto.questionId,
      value: dto.value,
      validationResult: validation,
      readinessScore: scoreResult.score,
      nextQuestionByNQS: nqsNext,
      progress,
      createdAt: response.answeredAt,
    };
  }

  async completeSession(sessionId: string, userId: string): Promise<SessionResponse> {
    const session = await getSessionWithValidation(this.prisma, sessionId, userId);
    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }
    const scoreResult = await this.scoringEngineService.calculateScore({ sessionId });
    const requiresGate = await isReadinessGatedSession(this.prisma, session);
    if (requiresGate && scoreResult.score < READINESS_SCORE_THRESHOLD) {
      throw new BadRequestException(
        `Readiness score is ${scoreResult.score.toFixed(1)}%. ` +
          `A minimum score of ${READINESS_SCORE_THRESHOLD}% is required to complete this assessment. ` +
          `Please continue answering questions to improve coverage.`,
      );
    }
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.COMPLETED, completedAt: new Date() },
      include: { currentSection: true, questionnaire: true },
    });
    const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );
    return mapToSessionResponse(updatedSession, totalQuestions);
  }

  async continueSession(
    sessionId: string,
    userId: string,
    questionCount: number = 1,
  ): Promise<ContinueSessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        currentSection: true,
        questionnaire: { include: { sections: { orderBy: { orderIndex: 'asc' } } } },
      },
    });
    if (!session) {throw new NotFoundException('Session not found');}
    if (session.userId !== userId) {throw new ForbiddenException('Access denied to this session');}

    const isComplete = session.status === SessionStatus.COMPLETED;
    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      take: 1000,
      orderBy: { answeredAt: 'desc' },
    });
    const responseMap = new Map(responses.map((r) => [r.questionId, r.value]));
    const visibleQuestions = await this.adaptiveLogicService.getVisibleQuestions(
      session.questionnaireId,
      responseMap,
    );
    const adaptiveState = session.adaptiveState as {
      skippedQuestionIds?: string[];
      branchHistory?: string[];
    };
    const totalQuestionsInQuestionnaire = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );
    const skippedCount = totalQuestionsInQuestionnaire - visibleQuestions.length;

    // Find next unanswered questions
    const nextQuestions = this.findNextUnansweredBatch(
      visibleQuestions, session.currentQuestionId, responseMap, isComplete, questionCount,
    );

    // Section completion
    const allSections = session.questionnaire.sections;
    const { completedSectionsCount } =
      this.buildSectionCompletionStatus(allSections, visibleQuestions, responseMap);
    const progress = calculateProgress(responses.length, visibleQuestions.length, {
      totalSections: allSections.length,
      completedSections: completedSectionsCount,
    });

    // Current section info
    const currentSectionInfo = this.buildCurrentSectionInfo(
      session.currentSection, visibleQuestions, responseMap,
    );

    // Readiness score
    let readinessScore: number | undefined;
    if (responses.length > 0) {
      try {
        const scoreResult = await this.scoringEngineService.calculateScore({ sessionId });
        readinessScore = scoreResult.score;
      } catch { /* Score calculation may fail if no dimensions mapped */ }
    }

    const unansweredRequired = visibleQuestions.filter((q) => q.isRequired && !responseMap.has(q.id));
    const requiresGate = await isReadinessGatedSession(this.prisma, session);
    const meetsReadinessGate = !requiresGate || (readinessScore ?? 0) >= READINESS_SCORE_THRESHOLD;
    const canComplete = unansweredRequired.length === 0 && responses.length > 0 && meetsReadinessGate;

    const sessionResponse: SessionResponse = {
      id: session.id,
      questionnaireId: session.questionnaireId,
      userId: session.userId,
      status: session.status,
      persona: session.persona ?? undefined,
      industry: session.industry ?? undefined,
      readinessScore: readinessScore ?? (session.readinessScore ? Number(session.readinessScore) : undefined),
      progress,
      currentSection: session.currentSection
        ? { id: session.currentSection.id, name: session.currentSection.name }
        : undefined,
      createdAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
    };

    if (!isComplete) {
      await this.prisma.session.update({ where: { id: sessionId }, data: { lastActivityAt: new Date() } });
    }

    return {
      session: sessionResponse, nextQuestions, currentSection: currentSectionInfo,
      overallProgress: progress, readinessScore,
      adaptiveState: {
        visibleQuestionCount: visibleQuestions.length,
        skippedQuestionCount: skippedCount,
        appliedRules: adaptiveState.branchHistory || [],
      },
      isComplete, canComplete,
    };
  }

  async cloneSession(
    sourceSessionId: string,
    userId: string,
    options?: { copyResponses?: boolean; industry?: string },
  ): Promise<SessionResponse> {
    const sourceSession = await getSessionWithValidation(this.prisma, sourceSessionId, userId);
    const dto: CreateSessionDto = {
      questionnaireId: sourceSession.questionnaireId,
      persona: sourceSession.persona ?? undefined,
      industry: options?.industry ?? sourceSession.industry ?? undefined,
    };
    const newSession = await this.create(userId, dto);

    if (options?.copyResponses) {
      const responses = await this.prisma.response.findMany({
        where: { sessionId: sourceSessionId },
        take: 1000,
      });
      await this.prisma.response.createMany({
        data: responses.map((r) => ({
          sessionId: newSession.id,
          questionId: r.questionId,
          value: r.value ?? Prisma.JsonNull,
          isValid: r.isValid,
          validationErrors: r.validationErrors ?? Prisma.JsonNull,
        })),
      });
      const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
        sourceSession.questionnaireId,
        sourceSession.persona ?? undefined,
      );
      const progress = calculateProgress(responses.length, totalQuestions);
      await this.prisma.session.update({
        where: { id: newSession.id },
        data: {
          progress: {
            percentage: progress.percentage,
            answered: progress.answeredQuestions,
            total: progress.totalQuestions,
          },
        },
      });
    }
    return this.queryService.findById(newSession.id, userId);
  }

  async archiveSession(sessionId: string, userId: string): Promise<void> {
    await getSessionWithValidation(this.prisma, sessionId, userId);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ABANDONED },
    });
  }

  async restoreSession(sessionId: string, userId: string): Promise<SessionResponse> {
    const session = await getSessionWithValidation(this.prisma, sessionId, userId);
    if (session.status !== SessionStatus.ABANDONED) {
      throw new BadRequestException('Only archived sessions can be restored');
    }
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.IN_PROGRESS },
      include: { currentSection: true },
    });
    const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );
    return mapToSessionResponse(updatedSession, totalQuestions);
  }

  async bulkDeleteSessions(
    userId: string,
    sessionIds: string[],
  ): Promise<{ deleted: number; failed: string[] }> {
    const result = { deleted: 0, failed: [] as string[] };
    for (const sessionId of sessionIds) {
      try {
        await getSessionWithValidation(this.prisma, sessionId, userId);
        await this.prisma.response.deleteMany({ where: { sessionId } });
        await this.prisma.session.delete({ where: { id: sessionId } });
        result.deleted++;
      } catch {
        result.failed.push(sessionId);
      }
    }
    return result;
  }

  /**
   * Find next batch of unanswered questions starting from current position.
   */
  private findNextUnansweredBatch(
    visibleQuestions: Question[],
    currentQuestionId: string | null,
    responseMap: Map<string, unknown>,
    isComplete: boolean,
    questionCount: number,
  ): QuestionResponse[] {
    const result: QuestionResponse[] = [];
    if (isComplete || !currentQuestionId) {
      return result;
    }
    const currentIndex = visibleQuestions.findIndex((q) => q.id === currentQuestionId);
    for (
      let i = Math.max(0, currentIndex);
      i < visibleQuestions.length && result.length < questionCount;
      i++
    ) {
      if (!responseMap.has(visibleQuestions[i].id)) {
        result.push(mapQuestionToResponse(visibleQuestions[i]));
      }
    }
    if (result.length < questionCount) {
      for (let i = 0; i < currentIndex && result.length < questionCount; i++) {
        if (!responseMap.has(visibleQuestions[i].id)) {
          result.push(mapQuestionToResponse(visibleQuestions[i]));
        }
      }
    }
    return result;
  }

  /**
   * Build section completion status for all sections.
   */
  private buildSectionCompletionStatus(
    allSections: { id: string }[],
    visibleQuestions: { id: string; sectionId: string }[],
    responseMap: Map<string, unknown>,
  ): { sectionCompletionStatus: { sectionId: string; total: number; answered: number; isComplete: boolean }[]; completedSectionsCount: number } {
    const sectionCompletionStatus = allSections.map((section) => {
      const sq = visibleQuestions.filter((q) => q.sectionId === section.id);
      const sa = sq.filter((q) => responseMap.has(q.id)).length;
      return { sectionId: section.id, total: sq.length, answered: sa, isComplete: sq.length > 0 && sa === sq.length };
    });
    const completedSectionsCount = sectionCompletionStatus.filter((s) => s.isComplete).length;
    return { sectionCompletionStatus, completedSectionsCount };
  }

  /**
   * Build current section info for the session response.
   */
  private buildCurrentSectionInfo(
    currentSection: { id: string; name: string } | null,
    visibleQuestions: { id: string; sectionId: string }[],
    responseMap: Map<string, unknown>,
  ): { id: string; name: string; description: string | undefined; progress: number; questionsInSection: number; answeredInSection: number } {
    if (!currentSection) {
      return { id: '', name: '', description: undefined, progress: 0, questionsInSection: 0, answeredInSection: 0 };
    }
    const sq = visibleQuestions.filter((q) => q.sectionId === currentSection.id);
    const sa = sq.filter((q) => responseMap.has(q.id)).length;
    return {
      id: currentSection.id,
      name: currentSection.name,
      description: (currentSection as { description?: string | null }).description ?? undefined,
      progress: sq.length > 0 ? Math.round((sa / sq.length) * 100) : 0,
      questionsInSection: sq.length,
      answeredInSection: sa,
    };
  }
}
