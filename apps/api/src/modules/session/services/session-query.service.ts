/**
 * SessionQueryService — read-only session operations.
 * Extracted from SessionService to reduce file size.
 */
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '@libs/database';
import { QuestionnaireService, QuestionResponse } from '../../questionnaire/questionnaire.service';
import { AdaptiveLogicService } from '../../adaptive-logic/adaptive-logic.service';
import { PaginationDto } from '@libs/shared';
import {
  SessionResponse,
  NextQuestionResponse,
  SessionAnalytics,
  UserSessionStats,
  SessionExport,
} from '../session-types';
import {
  getSessionWithValidation,
  mapToSessionResponse,
  mapQuestionToResponse,
  calculateProgress,
} from '../session-helpers';

export class SessionQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionnaireService: QuestionnaireService,
    private readonly adaptiveLogicService: AdaptiveLogicService,
  ) {}

  async findById(sessionId: string, userId: string): Promise<SessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        currentSection: true,
        questionnaire: true,
        projectType: { select: { name: true, slug: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }
    const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );
    return mapToSessionResponse(session, totalQuestions);
  }

  async findAllByUser(
    userId: string,
    pagination: PaginationDto,
    status?: SessionStatus,
  ): Promise<{ items: SessionResponse[]; total: number }> {
    const where = { userId, ...(status && { status }) };
    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { startedAt: 'desc' },
        include: {
          currentSection: true,
          questionnaire: true,
          projectType: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.session.count({ where }),
    ]);
    const items = await Promise.all(
      sessions.map(async (session) => {
        const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
          session.questionnaireId,
          session.persona ?? undefined,
        );
        return mapToSessionResponse(session, totalQuestions);
      }),
    );
    return { items, total };
  }

  async getNextQuestion(
    sessionId: string,
    userId: string,
    count: number = 1,
  ): Promise<NextQuestionResponse> {
    const session = await getSessionWithValidation(this.prisma, sessionId, userId);
    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }

    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      take: 1000,
    });
    const responseMap = new Map(responses.map((r) => [r.questionId, r.value]));

    if (!session.currentQuestionId) {
      throw new NotFoundException('No current question set for this session');
    }
    const currentQuestion = await this.questionnaireService.getQuestionById(
      session.currentQuestionId,
    );
    if (!currentQuestion) {
      throw new NotFoundException('Current question not found');
    }

    const visibleQuestions = await this.adaptiveLogicService.getVisibleQuestions(
      session.questionnaireId,
      responseMap,
    );

    const nextQuestions: QuestionResponse[] = [];
    const currentIndex = visibleQuestions.findIndex((q) => q.id === session.currentQuestionId);
    for (let i = currentIndex; i < visibleQuestions.length && nextQuestions.length < count; i++) {
      const question = visibleQuestions[i];
      if (question && !responseMap.has(question.id)) {
        nextQuestions.push(mapQuestionToResponse(question));
      }
    }

    const progress = calculateProgress(responses.length, visibleQuestions.length);
    const section = await this.prisma.section.findUnique({
      where: { id: currentQuestion.sectionId },
    });
    const sectionQuestions = visibleQuestions.filter(
      (q) => q.sectionId === currentQuestion.sectionId,
    );
    const sectionAnswered = sectionQuestions.filter((q) => responseMap.has(q.id)).length;
    const sectionProgress =
      sectionQuestions.length > 0
        ? Math.round((sectionAnswered / sectionQuestions.length) * 100)
        : 0;

    return {
      questions: nextQuestions,
      section: { id: section!.id, name: section!.name, progress: sectionProgress },
      overallProgress: progress,
    };
  }

  async getSessionAnalytics(sessionId: string, userId: string): Promise<SessionAnalytics> {
    const session = await getSessionWithValidation(this.prisma, sessionId, userId);
    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      take: 1000,
      include: {
        question: { include: { section: true, dimension: true } },
      },
    });

    // Time statistics
    const timesSpent = responses
      .filter((r) => r.timeSpentSeconds !== null)
      .map((r) => Number(r.timeSpentSeconds));
    const totalTimeSpent = timesSpent.reduce((sum, t) => sum + t, 0);
    const avgTimePerQuestion = timesSpent.length > 0 ? totalTimeSpent / timesSpent.length : 0;

    // Section data
    const sections = await this.prisma.section.findMany({
      where: { questionnaireId: session.questionnaireId },
      take: 1000,
      include: { _count: { select: { questions: true } } },
    });
    const sectionQuestionCounts = new Map(sections.map((s) => [s.name, s._count.questions]));

    const bySection: Record<string, { answered: number; total: number; avgTime: number }> = {};
    const sectionTimes: Record<string, number[]> = {};
    responses.forEach((r) => {
      const sectionName = r.question.section?.name || 'Unknown';
      if (!bySection[sectionName]) {
        bySection[sectionName] = {
          answered: 0,
          total: sectionQuestionCounts.get(sectionName) ?? 0,
          avgTime: 0,
        };
        sectionTimes[sectionName] = [];
      }
      bySection[sectionName].answered++;
      if (r.timeSpentSeconds) {
        sectionTimes[sectionName].push(Number(r.timeSpentSeconds));
      }
    });
    for (const s of sections) {
      if (!bySection[s.name]) {
        bySection[s.name] = { answered: 0, total: s._count.questions, avgTime: 0 };
      }
    }
    Object.keys(bySection).forEach((section) => {
      const times = sectionTimes[section] || [];
      bySection[section].avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    });

    // Dimension data
    const byDimension: Record<string, { answered: number; coverage: number }> = {};
    responses.forEach((r) => {
      const dimKey = r.question.dimension?.key || 'unknown';
      if (!byDimension[dimKey]) {
        byDimension[dimKey] = { answered: 0, coverage: 0 };
      }
      byDimension[dimKey].answered++;
      if (r.coverage) {
        byDimension[dimKey].coverage += Number(r.coverage);
      }
    });
    Object.keys(byDimension).forEach((dim) => {
      if (byDimension[dim].answered > 0) {
        byDimension[dim].coverage /= byDimension[dim].answered;
      }
    });

    const validResponses = responses.filter((r) => r.isValid).length;
    const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );
    const completionRate =
      totalQuestions > 0 ? Math.round((responses.length / totalQuestions) * 100) : 0;

    return {
      sessionId,
      totalResponses: responses.length,
      validResponses,
      invalidResponses: responses.length - validResponses,
      totalTimeSpent,
      averageTimePerQuestion: Math.round(avgTimePerQuestion),
      bySection,
      byDimension,
      completionRate,
      analyzedAt: new Date(),
    };
  }

  async getUserSessionStats(userId: string): Promise<UserSessionStats> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      take: 1000,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        readinessScore: true,
      },
    });
    const completed = sessions.filter((s) => s.status === SessionStatus.COMPLETED);
    const inProgress = sessions.filter(
      (s) => String(s.status) === String(SessionStatus.IN_PROGRESS),
    );
    const archived = sessions.filter((s) => String(s.status) === String(SessionStatus.ABANDONED));
    const scores = completed
      .filter((s) => s.readinessScore !== null)
      .map((s) => Number(s.readinessScore));
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const completionTimes = completed
      .filter((s) => s.completedAt && s.startedAt)
      .map((s) => s.completedAt!.getTime() - s.startedAt.getTime());
    const avgCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    return {
      userId,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      inProgressSessions: inProgress.length,
      archivedSessions: archived.length,
      averageScore: Math.round(avgScore * 100) / 100,
      highestScore: Math.round(highestScore * 100) / 100,
      lowestScore: Math.round(lowestScore * 100) / 100,
      averageCompletionTimeMs: Math.round(avgCompletionTime),
      scoreImprovement:
        scores.length >= 2 ? Math.round((scores[scores.length - 1] - scores[0]) * 100) / 100 : 0,
      analyzedAt: new Date(),
    };
  }

  async exportSession(sessionId: string, userId: string): Promise<SessionExport> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        questionnaire: { select: { id: true, name: true, version: true } },
        responses: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return {
      exportVersion: '1.0',
      exportedAt: new Date(),
      session: {
        id: session.id,
        questionnaireId: session.questionnaireId,
        questionnaireName: session.questionnaire.name,
        questionnaireVersion: session.questionnaireVersion,
        status: session.status,
        industry: session.industry,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        readinessScore: session.readinessScore ? Number(session.readinessScore) : null,
        progress: session.progress as Record<string, unknown>,
      },
      responses: session.responses.map((r) => ({
        questionId: r.questionId,
        value: r.value,
        coverage: r.coverage ? Number(r.coverage) : null,
        isValid: r.isValid,
        answeredAt: r.answeredAt,
        timeSpentSeconds: r.timeSpentSeconds,
      })),
    };
  }
}
