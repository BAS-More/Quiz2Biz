/**
 * SessionService — thin facade that delegates to SessionQueryService
 * and SessionMutationService. Preserves the original public API so
 * existing consumers (controller, specs) need no changes.
 */
import {
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '@libs/database';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { AdaptiveLogicService } from '../adaptive-logic/adaptive-logic.service';
import { ScoringEngineService } from '../scoring-engine/scoring-engine.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { PaginationDto } from '@libs/shared';
import { SessionQueryService } from './services/session-query.service';
import { SessionMutationService } from './services/session-mutation.service';

// Re-export all types so existing imports stay valid
export {
  ProgressInfo,
  SessionResponse,
  NextQuestionResponse,
  SubmitResponseResult,
  ContinueSessionResponse,
  SessionAnalytics,
  UserSessionStats,
  SessionExport,
} from './session-types';

@Injectable()
export class SessionService {
  private readonly queries: SessionQueryService;
  private readonly mutations: SessionMutationService;

  constructor(
    prisma: PrismaService,
    questionnaireService: QuestionnaireService,
    @Inject(forwardRef(() => AdaptiveLogicService))
    adaptiveLogicService: AdaptiveLogicService,
    scoringEngineService: ScoringEngineService,
  ) {
    this.queries = new SessionQueryService(
      prisma, questionnaireService, adaptiveLogicService,
    );
    this.mutations = new SessionMutationService(
      prisma, questionnaireService, adaptiveLogicService, scoringEngineService,
    );
    this.mutations.setQueryService(this.queries);
  }

  // --- Query delegates ---

  async findById(sessionId: string, userId: string) {
    return this.queries.findById(sessionId, userId);
  }

  async findAllByUser(userId: string, pagination: PaginationDto, status?: SessionStatus) {
    return this.queries.findAllByUser(userId, pagination, status);
  }

  async getNextQuestion(sessionId: string, userId: string, count: number = 1) {
    return this.queries.getNextQuestion(sessionId, userId, count);
  }

  async getSessionAnalytics(sessionId: string, userId: string) {
    return this.queries.getSessionAnalytics(sessionId, userId);
  }

  async getUserSessionStats(userId: string) {
    return this.queries.getUserSessionStats(userId);
  }

  async exportSession(sessionId: string, userId: string) {
    return this.queries.exportSession(sessionId, userId);
  }

  // --- Mutation delegates ---

  async create(userId: string, dto: CreateSessionDto) {
    return this.mutations.create(userId, dto);
  }

  async submitResponse(sessionId: string, userId: string, dto: SubmitResponseDto) {
    return this.mutations.submitResponse(sessionId, userId, dto);
  }

  async completeSession(sessionId: string, userId: string) {
    return this.mutations.completeSession(sessionId, userId);
  }

  async continueSession(sessionId: string, userId: string, questionCount: number = 1) {
    return this.mutations.continueSession(sessionId, userId, questionCount);
  }

  async cloneSession(
    sourceSessionId: string,
    userId: string,
    options?: { copyResponses?: boolean; industry?: string },
  ) {
    return this.mutations.cloneSession(sourceSessionId, userId, options);
  }

  async archiveSession(sessionId: string, userId: string) {
    return this.mutations.archiveSession(sessionId, userId);
  }

  async restoreSession(sessionId: string, userId: string) {
    return this.mutations.restoreSession(sessionId, userId);
  }

  async bulkDeleteSessions(userId: string, sessionIds: string[]) {
    return this.mutations.bulkDeleteSessions(userId, sessionIds);
  }
}
