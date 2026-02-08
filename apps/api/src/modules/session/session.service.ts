import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Session, SessionStatus, Question, Prisma, Persona } from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { QuestionnaireService, QuestionResponse } from '../questionnaire/questionnaire.service';
import { AdaptiveLogicService } from '../adaptive-logic/adaptive-logic.service';
import { ScoringEngineService } from '../scoring-engine/scoring-engine.service';
import { PaginationDto } from '@libs/shared';

/** Quiz2Biz readiness score threshold for session completion */
const READINESS_SCORE_THRESHOLD = 95.0;

export interface ProgressInfo {
  percentage: number;
  answeredQuestions: number;
  totalQuestions: number;
  estimatedTimeRemaining?: number;
  // Quiz2Biz document counters: "Sections left: n | Questions left: m | This section: x/y"
  sectionsLeft: number;
  questionsLeft: number;
  totalSections: number;
  completedSections: number;
}

export interface SessionResponse {
  id: string;
  questionnaireId: string;
  userId: string;
  status: SessionStatus;
  persona?: Persona;
  industry?: string;
  readinessScore?: number;
  progress: ProgressInfo;
  currentSection?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  lastActivityAt: Date;
}

export interface NextQuestionResponse {
  questions: QuestionResponse[];
  section: {
    id: string;
    name: string;
    progress: number;
  };
  overallProgress: ProgressInfo;
}

export interface SubmitResponseResult {
  responseId: string;
  questionId: string;
  value: unknown;
  validationResult: {
    isValid: boolean;
    errors?: string[];
  };
  adaptiveChanges?: {
    questionsAdded: string[];
    questionsRemoved: string[];
    newEstimatedTotal: number;
  };
  readinessScore?: number;
  nextQuestionByNQS?: {
    questionId: string;
    text: string;
    dimensionKey: string;
    expectedScoreLift: number;
  };
  progress: ProgressInfo;
  createdAt: Date;
}

export interface ContinueSessionResponse {
  session: SessionResponse;
  nextQuestions: QuestionResponse[];
  currentSection: {
    id: string;
    name: string;
    description?: string;
    progress: number;
    questionsInSection: number;
    answeredInSection: number;
  };
  overallProgress: ProgressInfo;
  readinessScore?: number;
  adaptiveState: {
    visibleQuestionCount: number;
    skippedQuestionCount: number;
    appliedRules: string[];
  };
  isComplete: boolean;
  canComplete: boolean;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionnaireService: QuestionnaireService,
    @Inject(forwardRef(() => AdaptiveLogicService))
    private readonly adaptiveLogicService: AdaptiveLogicService,
    private readonly scoringEngineService: ScoringEngineService,
  ) {}

  async create(userId: string, dto: CreateSessionDto): Promise<SessionResponse> {
    // Get questionnaire
    const questionnaire = await this.questionnaireService.findById(dto.questionnaireId);

    // Get persona-filtered questions to determine count and first question
    const personaQuestions = dto.persona
      ? await this.questionnaireService.getQuestionsForPersona(dto.questionnaireId, dto.persona)
      : null;

    const totalQuestions = personaQuestions
      ? personaQuestions.length
      : await this.questionnaireService.getTotalQuestionCount(dto.questionnaireId);

    // Use persona-filtered first question if available, otherwise first from questionnaire
    const firstPersonaQuestion = personaQuestions?.[0];
    const firstSection = questionnaire.sections[0];
    const firstQuestion = firstSection?.questions?.[0];

    const initialQuestionId = firstPersonaQuestion?.id ?? firstQuestion?.id;
    const initialSectionId = firstPersonaQuestion?.sectionId ?? firstSection?.id;

    // Create session with persona
    const session = await this.prisma.session.create({
      data: {
        userId,
        questionnaireId: dto.questionnaireId,
        questionnaireVersion: questionnaire.version,
        persona: dto.persona,
        industry: dto.industry,
        status: SessionStatus.IN_PROGRESS,
        progress: {
          percentage: 0,
          answered: 0,
          total: totalQuestions,
        },
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
      },
    });

    return this.mapToSessionResponse(session, totalQuestions);
  }

  async findById(sessionId: string, userId: string): Promise<SessionResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        currentSection: true,
        questionnaire: true,
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

    return this.mapToSessionResponse(session, totalQuestions);
  }

  async findAllByUser(
    userId: string,
    pagination: PaginationDto,
    status?: SessionStatus,
  ): Promise<{ items: SessionResponse[]; total: number }> {
    const where = {
      userId,
      ...(status && { status }),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { startedAt: 'desc' },
        include: {
          currentSection: true,
          questionnaire: true,
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
        return this.mapToSessionResponse(session, totalQuestions);
      }),
    );

    return { items, total };
  }

  async getNextQuestion(
    sessionId: string,
    userId: string,
    count: number = 1,
  ): Promise<NextQuestionResponse> {
    const session = await this.getSessionWithValidation(sessionId, userId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }

    // Get all responses for this session
    const responses = await this.prisma.response.findMany({
      where: { sessionId },
    });

    const responseMap = new Map(responses.map((r) => [r.questionId, r.value]));

    // Get current question and evaluate visibility
    if (!session.currentQuestionId) {
      throw new NotFoundException('No current question set for this session');
    }
    const currentQuestion = await this.questionnaireService.getQuestionById(
      session.currentQuestionId,
    );

    if (!currentQuestion) {
      throw new NotFoundException('Current question not found');
    }

    // Evaluate adaptive logic to get visible questions
    const visibleQuestions = await this.adaptiveLogicService.getVisibleQuestions(
      session.questionnaireId,
      responseMap,
    );

    // Get the next N visible questions starting from current position
    const nextQuestions: QuestionResponse[] = [];
    const currentIndex = visibleQuestions.findIndex((q) => q.id === session.currentQuestionId);

    for (let i = currentIndex; i < visibleQuestions.length && nextQuestions.length < count; i++) {
      const question = visibleQuestions[i];
      // Skip already answered questions
      if (question && !responseMap.has(question.id)) {
        nextQuestions.push(this.mapQuestionToResponse(question));
      }
    }

    // Calculate progress
    const answeredCount = responses.length;
    const totalVisible = visibleQuestions.length;
    const progress = this.calculateProgress(answeredCount, totalVisible);

    // Get section info
    const section = await this.prisma.section.findUnique({
      where: { id: currentQuestion.sectionId },
    });

    const sectionQuestions = visibleQuestions.filter(
      (q) => q.sectionId === currentQuestion.sectionId,
    );
    const sectionAnswered = sectionQuestions.filter((q) => responseMap.has(q.id)).length;
    const sectionProgress = sectionQuestions.length > 0
      ? Math.round((sectionAnswered / sectionQuestions.length) * 100)
      : 0;

    return {
      questions: nextQuestions,
      section: {
        id: section!.id,
        name: section!.name,
        progress: sectionProgress,
      },
      overallProgress: progress,
    };
  }

  async submitResponse(
    sessionId: string,
    userId: string,
    dto: SubmitResponseDto,
  ): Promise<SubmitResponseResult> {
    const session = await this.getSessionWithValidation(sessionId, userId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }

    // Validate question exists
    const question = await this.questionnaireService.getQuestionById(dto.questionId);
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Validate response value
    const validation = this.validateResponse(question, dto.value);

    // Upsert response
    const response = await this.prisma.response.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: dto.questionId,
        },
      },
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

    // Get all responses to evaluate adaptive logic
    const allResponses = await this.prisma.response.findMany({
      where: { sessionId },
    });
    const responseMap = new Map(allResponses.map((r) => [r.questionId, r.value]));

    // Evaluate adaptive changes
    const visibleQuestions = await this.adaptiveLogicService.getVisibleQuestions(
      session.questionnaireId,
      responseMap,
    );

    // --- Quiz2Biz Adaptive Loop: Recalculate score after every response ---
    await this.scoringEngineService.invalidateScoreCache(sessionId);
    const scoreResult = await this.scoringEngineService.calculateScore({ sessionId });

    // --- NQS: Use scoring engine to pick the next highest-impact question ---
    let nqsNext: { questionId: string; text: string; dimensionKey: string; expectedScoreLift: number } | undefined;
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

    // Determine next question: prefer NQS pick, fallback to sequential
    const nqsQuestion = nqsNext
      ? visibleQuestions.find((q) => q.id === nqsNext!.questionId)
      : null;
    const nextQuestion = nqsQuestion ?? this.findNextUnansweredQuestion(
      visibleQuestions,
      dto.questionId,
      responseMap,
    );

    // Update session with score + next question
    const progress = this.calculateProgress(allResponses.length, visibleQuestions.length);

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
    const session = await this.getSessionWithValidation(sessionId, userId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }

    // Quiz2Biz: Enforce readiness score >= 95% before allowing completion
    const scoreResult = await this.scoringEngineService.calculateScore({ sessionId });
    if (scoreResult.score < READINESS_SCORE_THRESHOLD) {
      throw new BadRequestException(
        `Readiness score is ${scoreResult.score.toFixed(1)}%. ` +
        `A minimum score of ${READINESS_SCORE_THRESHOLD}% is required to complete the session. ` +
        `Please continue answering questions to improve coverage.`,
      );
    }

    // Update session status
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        currentSection: true,
        questionnaire: true,
      },
    });

    const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );

    return this.mapToSessionResponse(updatedSession, totalQuestions);
  }

  async continueSession(
    sessionId: string,
    userId: string,
    questionCount: number = 1,
  ): Promise<ContinueSessionResponse> {
    // Get session with full context
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        currentSection: true,
        questionnaire: {
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    // Check if already completed
    const isComplete = session.status === SessionStatus.COMPLETED;

    // Get all responses for this session
    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      orderBy: { answeredAt: 'desc' },
    });

    const responseMap = new Map(responses.map((r) => [r.questionId, r.value]));

    // Evaluate adaptive logic to get visible questions
    const visibleQuestions = await this.adaptiveLogicService.getVisibleQuestions(
      session.questionnaireId,
      responseMap,
    );

    // Get adaptive state info
    const adaptiveState = session.adaptiveState as {
      skippedQuestionIds?: string[];
      branchHistory?: string[];
    };

    // Calculate total questions and skipped (persona-aware)
    const totalQuestionsInQuestionnaire = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );
    const skippedCount = totalQuestionsInQuestionnaire - visibleQuestions.length;

    // Find next unanswered questions
    const nextQuestions: QuestionResponse[] = [];

    if (!isComplete && session.currentQuestionId) {
      const currentIndex = visibleQuestions.findIndex((q) => q.id === session.currentQuestionId);

      // Start from current question and find unanswered ones
      for (
        let i = Math.max(0, currentIndex);
        i < visibleQuestions.length && nextQuestions.length < questionCount;
        i++
      ) {
        const question = visibleQuestions[i];
        if (!responseMap.has(question.id)) {
          nextQuestions.push(this.mapQuestionToResponse(question));
        }
      }

      // If we didn't find enough, check from the beginning
      if (nextQuestions.length < questionCount) {
        for (let i = 0; i < currentIndex && nextQuestions.length < questionCount; i++) {
          const question = visibleQuestions[i];
          if (!responseMap.has(question.id)) {
            nextQuestions.push(this.mapQuestionToResponse(question));
          }
        }
      }
    }

    // Calculate progress
    const answeredCount = responses.length;

    // Calculate section completion info for Quiz2Biz progress counters
    const allSections = session.questionnaire.sections;
    const sectionCompletionStatus = allSections.map((section) => {
      const sectionQuestions = visibleQuestions.filter((q) => q.sectionId === section.id);
      const sectionAnswered = sectionQuestions.filter((q) => responseMap.has(q.id)).length;
      return {
        sectionId: section.id,
        total: sectionQuestions.length,
        answered: sectionAnswered,
        isComplete: sectionQuestions.length > 0 && sectionAnswered === sectionQuestions.length,
      };
    });
    const completedSectionsCount = sectionCompletionStatus.filter((s) => s.isComplete).length;

    const progress = this.calculateProgress(answeredCount, visibleQuestions.length, {
      totalSections: allSections.length,
      completedSections: completedSectionsCount,
    });

    // Get current section details
    let currentSectionInfo = {
      id: '',
      name: '',
      description: undefined as string | undefined,
      progress: 0,
      questionsInSection: 0,
      answeredInSection: 0,
    };

    if (session.currentSection) {
      const sectionQuestions = visibleQuestions.filter(
        (q) => q.sectionId === session.currentSection!.id,
      );
      const sectionAnswered = sectionQuestions.filter((q) => responseMap.has(q.id)).length;

      currentSectionInfo = {
        id: session.currentSection.id,
        name: session.currentSection.name,
        description: (session.currentSection as any).description ?? undefined,
        progress:
          sectionQuestions.length > 0
            ? Math.round((sectionAnswered / sectionQuestions.length) * 100)
            : 0,
        questionsInSection: sectionQuestions.length,
        answeredInSection: sectionAnswered,
      };
    }

    // Quiz2Biz: Calculate readiness score to determine canComplete
    let readinessScore: number | undefined;
    if (answeredCount > 0) {
      try {
        const scoreResult = await this.scoringEngineService.calculateScore({ sessionId });
        readinessScore = scoreResult.score;
      } catch {
        // Score calculation may fail if no dimensions mapped; fallback gracefully
      }
    }

    // Determine if session can be completed:
    // 1. All required questions answered AND
    // 2. Readiness score >= 95% (Quiz2Biz threshold)
    const unansweredRequired = visibleQuestions.filter(
      (q) => q.isRequired && !responseMap.has(q.id),
    );
    const canComplete =
      unansweredRequired.length === 0 &&
      answeredCount > 0 &&
      (readinessScore ?? 0) >= READINESS_SCORE_THRESHOLD;

    // Build session response
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

    // Update last activity timestamp
    if (!isComplete) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() },
      });
    }

    return {
      session: sessionResponse,
      nextQuestions,
      currentSection: currentSectionInfo,
      overallProgress: progress,
      readinessScore,
      adaptiveState: {
        visibleQuestionCount: visibleQuestions.length,
        skippedQuestionCount: skippedCount,
        appliedRules: adaptiveState.branchHistory || [],
      },
      isComplete,
      canComplete,
    };
  }

  private async getSessionWithValidation(sessionId: string, userId: string): Promise<Session> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    return session;
  }

  private mapToSessionResponse(
    session: Session & { currentSection?: { id: string; name: string } | null },
    totalQuestions: number,
    sectionInfo?: { totalSections: number; completedSections: number },
  ): SessionResponse {
    const progress = session.progress as { percentage: number; answered: number; total: number };
    const questionsLeft = (progress.total || totalQuestions) - progress.answered;
    const sectionsLeft = (sectionInfo?.totalSections ?? 0) - (sectionInfo?.completedSections ?? 0);

    return {
      id: session.id,
      questionnaireId: session.questionnaireId,
      userId: session.userId,
      status: session.status,
      persona: session.persona ?? undefined,
      industry: session.industry ?? undefined,
      readinessScore: session.readinessScore ? Number(session.readinessScore) : undefined,
      progress: {
        percentage: progress.percentage,
        answeredQuestions: progress.answered,
        totalQuestions: progress.total || totalQuestions,
        sectionsLeft,
        questionsLeft,
        totalSections: sectionInfo?.totalSections ?? 0,
        completedSections: sectionInfo?.completedSections ?? 0,
      },
      currentSection: session.currentSection
        ? { id: session.currentSection.id, name: session.currentSection.name }
        : undefined,
      createdAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  private mapQuestionToResponse(question: Question): QuestionResponse {
    const options = question.options as
      | { id: string; label: string; description?: string }[]
      | null;
    const validation = question.validationRules as Record<string, unknown> | null;

    return {
      id: question.id,
      text: question.text,
      type: question.type,
      required: question.isRequired,
      helpText: question.helpText ?? undefined,
      explanation: question.explanation ?? undefined,
      placeholder: question.placeholder ?? undefined,
      options: options ?? undefined,
      validation: validation ?? undefined,
    };
  }

  private calculateProgress(
    answered: number,
    total: number,
    sectionInfo?: {
      totalSections: number;
      completedSections: number;
    },
  ): ProgressInfo {
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
    const avgTimePerQuestion = 1.5; // minutes
    const estimatedTimeRemaining = Math.ceil((total - answered) * avgTimePerQuestion);
    const questionsLeft = total - answered;
    const sectionsLeft = (sectionInfo?.totalSections ?? 0) - (sectionInfo?.completedSections ?? 0);

    return {
      percentage,
      answeredQuestions: answered,
      totalQuestions: total,
      estimatedTimeRemaining,
      // Quiz2Biz progress counters
      sectionsLeft,
      questionsLeft,
      totalSections: sectionInfo?.totalSections ?? 0,
      completedSections: sectionInfo?.completedSections ?? 0,
    };
  }

  private validateResponse(
    question: Question,
    value: unknown,
  ): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const validation = question.validationRules as Record<string, unknown> | null;

    // Check required
    if (question.isRequired && (value === null || value === undefined || value === '')) {
      errors.push('This field is required');
    }

    // Type-specific validation
    if (value !== null && value !== undefined && validation) {
      // Narrow validation rule types once up front
      const minLength = typeof validation.minLength === 'number' ? validation.minLength : undefined;
      const maxLength = typeof validation.maxLength === 'number' ? validation.maxLength : undefined;
      const min = typeof validation.min === 'number' ? validation.min : undefined;
      const max = typeof validation.max === 'number' ? validation.max : undefined;

      // Min/max length for text
      if (typeof value === 'string') {
        if (minLength !== undefined && value.length < minLength) {
          errors.push(`Minimum length is ${minLength} characters`);
        }
        if (maxLength !== undefined && value.length > maxLength) {
          errors.push(`Maximum length is ${maxLength} characters`);
        }
      }

      // Min/max for numbers
      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          errors.push(`Minimum value is ${min}`);
        }
        if (max !== undefined && value > max) {
          errors.push(`Maximum value is ${max}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private findNextUnansweredQuestion(
    visibleQuestions: Question[],
    currentQuestionId: string,
    responseMap: Map<string, unknown>,
  ): Question | null {
    const currentIndex = visibleQuestions.findIndex((q) => q.id === currentQuestionId);

    for (let i = currentIndex + 1; i < visibleQuestions.length; i++) {
      if (!responseMap.has(visibleQuestions[i].id)) {
        return visibleQuestions[i];
      }
    }

    // Check if there are any unanswered questions before current
    for (let i = 0; i < currentIndex; i++) {
      if (!responseMap.has(visibleQuestions[i].id)) {
        return visibleQuestions[i];
      }
    }

    return null;
  }

  /**
   * Clone a session (for retaking assessments)
   * Creates a new session with same questionnaire but no responses
   */
  async cloneSession(
    sourceSessionId: string,
    userId: string,
    options?: { copyResponses?: boolean; industry?: string },
  ): Promise<SessionResponse> {
    const sourceSession = await this.getSessionWithValidation(sourceSessionId, userId);

    const dto: CreateSessionDto = {
      questionnaireId: sourceSession.questionnaireId,
      persona: sourceSession.persona ?? undefined,
      industry: options?.industry ?? sourceSession.industry ?? undefined,
    };

    const newSession = await this.create(userId, dto);

    // Optionally copy responses
    if (options?.copyResponses) {
      const responses = await this.prisma.response.findMany({
        where: { sessionId: sourceSessionId },
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

      // Recalculate progress (persona-aware)
      const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
        sourceSession.questionnaireId,
        sourceSession.persona ?? undefined,
      );
      const progress = this.calculateProgress(responses.length, totalQuestions);

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

    return this.findById(newSession.id, userId);
  }

  /**
   * Archive a session (soft delete)
   */
  async archiveSession(sessionId: string, userId: string): Promise<void> {
    await this.getSessionWithValidation(sessionId, userId);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ABANDONED },
    });
  }

  /**
   * Restore an archived session
   */
  async restoreSession(sessionId: string, userId: string): Promise<SessionResponse> {
    const session = await this.getSessionWithValidation(sessionId, userId);

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

    return this.mapToSessionResponse(updatedSession, totalQuestions);
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(sessionId: string, userId: string): Promise<SessionAnalytics> {
    const session = await this.getSessionWithValidation(sessionId, userId);

    const responses = await this.prisma.response.findMany({
      where: { sessionId },
      include: {
        question: {
          include: {
            section: true,
            dimension: true,
          },
        },
      },
    });

    // Calculate time statistics
    const timesSpent = responses
      .filter((r) => r.timeSpentSeconds !== null)
      .map((r) => Number(r.timeSpentSeconds));
    const totalTimeSpent = timesSpent.reduce((sum, t) => sum + t, 0);
    const avgTimePerQuestion = timesSpent.length > 0 ? totalTimeSpent / timesSpent.length : 0;

    // Get total question counts per section
    const sections = await this.prisma.section.findMany({
      where: { questionnaireId: session.questionnaireId },
      include: { _count: { select: { questions: true } } },
    });
    const sectionQuestionCounts = new Map(
      sections.map((s) => [s.name, s._count.questions]),
    );

    // Group by section
    const bySection: Record<string, { answered: number; total: number; avgTime: number }> = {};
    const sectionTimes: Record<string, number[]> = {};

    responses.forEach((r) => {
      const sectionName = r.question.section?.name || 'Unknown';

      if (!bySection[sectionName]) {
        bySection[sectionName] = { answered: 0, total: sectionQuestionCounts.get(sectionName) ?? 0, avgTime: 0 };
        sectionTimes[sectionName] = [];
      }
      bySection[sectionName].answered++;
      if (r.timeSpentSeconds) {
        sectionTimes[sectionName].push(Number(r.timeSpentSeconds));
      }
    });

    // Ensure sections with no responses are still represented
    for (const s of sections) {
      if (!bySection[s.name]) {
        bySection[s.name] = { answered: 0, total: s._count.questions, avgTime: 0 };
      }
    }

    // Calculate avg time per section
    Object.keys(bySection).forEach((section) => {
      const times = sectionTimes[section] || [];
      bySection[section].avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    });

    // Group by dimension
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

    // Calculate avg coverage per dimension
    Object.keys(byDimension).forEach((dim) => {
      if (byDimension[dim].answered > 0) {
        byDimension[dim].coverage /= byDimension[dim].answered;
      }
    });

    // Validation statistics
    const validResponses = responses.filter((r) => r.isValid).length;
    const invalidResponses = responses.length - validResponses;

    // Calculate real completion rate
    const totalQuestions = await this.questionnaireService.getTotalQuestionCount(
      session.questionnaireId,
      session.persona ?? undefined,
    );
    const completionRate = totalQuestions > 0
      ? Math.round((responses.length / totalQuestions) * 100)
      : 0;

    return {
      sessionId,
      totalResponses: responses.length,
      validResponses,
      invalidResponses,
      totalTimeSpent,
      averageTimePerQuestion: Math.round(avgTimePerQuestion),
      bySection,
      byDimension,
      completionRate,
      analyzedAt: new Date(),
    };
  }

  /**
   * Get aggregate statistics across all sessions for a user
   */
  async getUserSessionStats(userId: string): Promise<UserSessionStats> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
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

    // Calculate completion times
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

  /**
   * Export session data (for backup/migration)
   */
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

  /**
   * Bulk delete sessions (for cleanup)
   */
  async bulkDeleteSessions(
    userId: string,
    sessionIds: string[],
  ): Promise<{ deleted: number; failed: string[] }> {
    const result = { deleted: 0, failed: [] as string[] };

    for (const sessionId of sessionIds) {
      try {
        await this.getSessionWithValidation(sessionId, userId);

        // Delete responses first
        await this.prisma.response.deleteMany({
          where: { sessionId },
        });

        // Delete session
        await this.prisma.session.delete({
          where: { id: sessionId },
        });

        result.deleted++;
      } catch {
        result.failed.push(sessionId);
      }
    }

    return result;
  }
}

/**
 * Session analytics result
 */
export interface SessionAnalytics {
  sessionId: string;
  totalResponses: number;
  validResponses: number;
  invalidResponses: number;
  totalTimeSpent: number;
  averageTimePerQuestion: number;
  bySection: Record<string, { answered: number; total: number; avgTime: number }>;
  byDimension: Record<string, { answered: number; coverage: number }>;
  completionRate: number;
  analyzedAt: Date;
}

/**
 * User session statistics
 */
export interface UserSessionStats {
  userId: string;
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  archivedSessions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageCompletionTimeMs: number;
  scoreImprovement: number;
  analyzedAt: Date;
}

/**
 * Session export format
 */
export interface SessionExport {
  exportVersion: string;
  exportedAt: Date;
  session: {
    id: string;
    questionnaireId: string;
    questionnaireName: string;
    questionnaireVersion: number;
    status: SessionStatus;
    industry: string | null;
    startedAt: Date;
    completedAt: Date | null;
    readinessScore: number | null;
    progress: Record<string, unknown>;
  };
  responses: Array<{
    questionId: string;
    value: unknown;
    coverage: number | null;
    isValid: boolean;
    answeredAt: Date;
    timeSpentSeconds: number | null;
  }>;
}
