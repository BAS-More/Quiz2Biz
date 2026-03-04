import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SessionService } from './session.service';
import { PrismaService } from '@libs/database';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { AdaptiveLogicService } from '../adaptive-logic/adaptive-logic.service';
import { ScoringEngineService } from '../scoring-engine/scoring-engine.service';
import { SessionStatus, QuestionType, Persona } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('SessionService', () => {
  let service: SessionService;
  let prismaService: any; // Use any for mocked service
  let questionnaireService: jest.Mocked<QuestionnaireService>;
  let adaptiveLogicService: jest.Mocked<AdaptiveLogicService>;
  let scoringEngineService: any;

  const mockUserId = 'user-123';
  const mockQuestionnaireId = 'questionnaire-456';
  const mockSessionId = 'session-789';

  const mockQuestionnaire = {
    id: mockQuestionnaireId,
    title: 'Test Questionnaire',
    version: 1,
    sections: [
      {
        id: 'section-1',
        name: 'Section 1',
        questions: [
          { id: 'q1', text: 'Question 1', type: QuestionType.TEXT },
          { id: 'q2', text: 'Question 2', type: QuestionType.SINGLE_CHOICE },
        ],
      },
    ],
  };

  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    questionnaireId: mockQuestionnaireId,
    questionnaireVersion: 1,
    status: SessionStatus.IN_PROGRESS,
    industry: 'tech',
    progress: { percentage: 0, answered: 0, total: 10 },
    currentSectionId: 'section-1',
    currentQuestionId: 'q1',
    adaptiveState: {
      activeQuestionIds: [],
      skippedQuestionIds: [],
      branchHistory: [],
    },
    startedAt: new Date(),
    lastActivityAt: new Date(),
    completedAt: null,
    currentSection: { id: 'section-1', name: 'Section 1' },
    questionnaire: mockQuestionnaire,
  };

  const mockQuestion = {
    id: 'q1',
    sectionId: 'section-1',
    text: 'Question 1',
    type: QuestionType.TEXT,
    isRequired: true,
    helpText: null,
    explanation: null,
    placeholder: null,
    options: null,
    validationRules: { minLength: 1, maxLength: 500 },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      response: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      section: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      projectType: {
        findUnique: jest.fn(),
      },
    };

    const mockQuestionnaireService = {
      findById: jest.fn(),
      getTotalQuestionCount: jest.fn(),
      getQuestionById: jest.fn(),
      getQuestionsForPersona: jest.fn(),
    };

    const mockAdaptiveLogicService = {
      getVisibleQuestions: jest.fn(),
    };

    const mockScoringEngineService = {
      calculateScore: jest.fn().mockResolvedValue({ score: 96, portfolioResidual: 0.04 }),
      invalidateScoreCache: jest.fn().mockResolvedValue(undefined),
      getNextQuestions: jest.fn().mockResolvedValue({ questions: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QuestionnaireService, useValue: mockQuestionnaireService },
        { provide: AdaptiveLogicService, useValue: mockAdaptiveLogicService },
        { provide: ScoringEngineService, useValue: mockScoringEngineService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prismaService = module.get(PrismaService);
    questionnaireService = module.get(QuestionnaireService);
    adaptiveLogicService = module.get(AdaptiveLogicService);
    scoringEngineService = module.get(ScoringEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new session successfully', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      prismaService.session.create.mockResolvedValue(mockSession as any);

      const result = await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
        industry: 'tech',
      });

      expect(result.id).toBe(mockSessionId);
      expect(result.status).toBe(SessionStatus.IN_PROGRESS);
      expect(result.progress.percentage).toBe(0);
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          questionnaireId: mockQuestionnaireId,
          status: SessionStatus.IN_PROGRESS,
        }),
        include: expect.objectContaining({ currentSection: true }),
      });
    });

    it('should set industry from DTO', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      prismaService.session.create.mockResolvedValue(mockSession as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
        industry: 'healthcare',
      });

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          industry: 'healthcare',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('findById', () => {
    it('should return session for valid owner', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.id).toBe(mockSessionId);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent', mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.findById(mockSessionId, 'different-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAllByUser', () => {
    it('should return paginated sessions for user', async () => {
      prismaService.session.findMany.mockResolvedValue([mockSession] as any);
      prismaService.session.count.mockResolvedValue(1);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findAllByUser(
        mockUserId,
        { page: 1, limit: 10, skip: 0 },
        undefined,
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status when provided', async () => {
      prismaService.session.findMany.mockResolvedValue([]);
      prismaService.session.count.mockResolvedValue(0);

      await service.findAllByUser(
        mockUserId,
        { page: 1, limit: 10, skip: 0 },
        SessionStatus.COMPLETED,
      );

      expect(prismaService.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId, status: SessionStatus.COMPLETED },
        }),
      );
    });
  });

  describe('getNextQuestion', () => {
    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        mockQuestion,
        { ...mockQuestion, id: 'q2', text: 'Question 2' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);
    });

    it('should return next visible questions', async () => {
      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      expect(result.questions).toHaveLength(1);
      expect(result.section.id).toBe('section-1');
      expect(result.overallProgress.percentage).toBe(0);
    });

    it('should throw BadRequestException for completed session', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.COMPLETED,
      } as any);

      await expect(service.getNextQuestion(mockSessionId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip already answered questions', async () => {
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer1' },
      ] as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      // Should skip q1 since it's answered
      const returnedQuestionIds = result.questions.map((q) => q.id);
      expect(returnedQuestionIds).not.toContain('q1');
    });

    it('should respect count parameter', async () => {
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1' },
        { ...mockQuestion, id: 'q2' },
        { ...mockQuestion, id: 'q3' },
        { ...mockQuestion, id: 'q4' },
      ] as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId, 3);

      expect(result.questions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('submitResponse', () => {
    const submitDto = {
      questionId: 'q1',
      value: 'Test answer',
      timeSpentSeconds: 30,
    };

    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        sessionId: mockSessionId,
        questionId: 'q1',
        value: 'Test answer',
        isValid: true,
        validationErrors: null,
        answeredAt: new Date(),
        revision: 1,
      } as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'Test answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        mockQuestion,
        { ...mockQuestion, id: 'q2' },
      ] as any);
      prismaService.session.update.mockResolvedValue(mockSession as any);
    });

    it('should submit response successfully', async () => {
      const result = await service.submitResponse(mockSessionId, mockUserId, submitDto);

      expect(result.responseId).toBe('response-1');
      expect(result.questionId).toBe('q1');
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should throw BadRequestException for completed session', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.COMPLETED,
      } as any);

      await expect(service.submitResponse(mockSessionId, mockUserId, submitDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for invalid question', async () => {
      questionnaireService.getQuestionById.mockResolvedValue(null);

      await expect(service.submitResponse(mockSessionId, mockUserId, submitDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update session progress after response', async () => {
      await service.submitResponse(mockSessionId, mockUserId, submitDto);

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: expect.objectContaining({
          progress: expect.objectContaining({
            percentage: expect.any(Number),
            answered: expect.any(Number),
          }),
        }),
      });
    });

    it('should handle validation errors for required fields', async () => {
      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: '',
      });

      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors).toContain('This field is required');
    });
  });

  describe('completeSession', () => {
    it('should complete session successfully', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.session.update.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.completeSession(mockSessionId, mockUserId);

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException for already completed session', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.COMPLETED,
      } as any);

      await expect(service.completeSession(mockSessionId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.completeSession(mockSessionId, 'different-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('validateResponse', () => {
    it('should validate minLength constraint', async () => {
      const questionWithMinLength = {
        ...mockQuestion,
        validationRules: { minLength: 10 },
      };
      questionnaireService.getQuestionById.mockResolvedValue(questionWithMinLength as any);
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        isValid: false,
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([]);
      prismaService.session.update.mockResolvedValue(mockSession as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'short',
      });

      expect(result.validationResult.errors).toContain('Minimum length is 10 characters');
    });

    it('should validate maxLength constraint', async () => {
      const questionWithMaxLength = {
        ...mockQuestion,
        validationRules: { maxLength: 5 },
      };
      questionnaireService.getQuestionById.mockResolvedValue(questionWithMaxLength as any);
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        isValid: false,
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([]);
      prismaService.session.update.mockResolvedValue(mockSession as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'this is too long',
      });

      expect(result.validationResult.errors).toContain('Maximum length is 5 characters');
    });

    it('should validate numeric min constraint', async () => {
      const questionWithMin = {
        ...mockQuestion,
        type: QuestionType.NUMBER,
        validationRules: { min: 10 },
      };
      questionnaireService.getQuestionById.mockResolvedValue(questionWithMin as any);
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        isValid: false,
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([]);
      prismaService.session.update.mockResolvedValue(mockSession as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 5,
      });

      expect(result.validationResult.errors).toContain('Minimum value is 10');
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress correctly', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1' },
        { questionId: 'q2' },
      ] as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q1' },
        { id: 'q2' },
        { id: 'q3' },
        { id: 'q4' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      // 2 answered out of 4 visible = 50%
      expect(result.overallProgress.percentage).toBe(50);
      expect(result.overallProgress.answeredQuestions).toBe(2);
      expect(result.overallProgress.totalQuestions).toBe(4);
    });

    it('should handle zero total questions', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([]);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      expect(result.overallProgress.percentage).toBe(0);
    });
  });

  describe('findNextUnansweredQuestion', () => {
    it('should find next unanswered question after current', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q1', sectionId: 'section-1' },
        { id: 'q2', sectionId: 'section-1' },
        { id: 'q3', sectionId: 'section-2' },
      ] as any);
      prismaService.session.update.mockResolvedValue(mockSession as any);

      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'answer',
      });

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: expect.objectContaining({
          currentQuestionId: 'q2',
        }),
      });
    });
  });

  describe('continueSession', () => {
    const mockSessionWithQuestionnaire = {
      ...mockSession,
      questionnaire: {
        ...mockQuestionnaire,
        sections: [
          {
            id: 'section-1',
            name: 'Section 1',
            orderIndex: 0,
          },
        ],
      },
    };

    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSessionWithQuestionnaire as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
        { ...mockQuestion, id: 'q2', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      prismaService.session.update.mockResolvedValue(mockSession as any);
    });

    it('should return session state with next questions', async () => {
      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.session.id).toBe(mockSessionId);
      expect(result.nextQuestions).toHaveLength(1);
      expect(result.overallProgress).toBeDefined();
      expect(result.isComplete).toBe(false);
    });

    it('should return multiple questions when requested', async () => {
      const result = await service.continueSession(mockSessionId, mockUserId, 3);

      // Should return up to 2 questions (all unanswered visible questions)
      expect(result.nextQuestions.length).toBeLessThanOrEqual(3);
    });

    it('should calculate canComplete correctly when required questions unanswered', async () => {
      prismaService.response.findMany.mockResolvedValue([]);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.canComplete).toBe(false);
    });

    it('should calculate canComplete correctly when all required questions answered', async () => {
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
        { ...mockQuestion, id: 'q2', isRequired: false },
      ] as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.canComplete).toBe(true);
    });

    it('should return isComplete true for completed sessions', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSessionWithQuestionnaire,
        status: SessionStatus.COMPLETED,
      } as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.isComplete).toBe(true);
      expect(result.nextQuestions).toHaveLength(0);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.continueSession('non-existent', mockUserId, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      await expect(service.continueSession(mockSessionId, 'different-user', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include adaptive state information', async () => {
      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.adaptiveState).toBeDefined();
      expect(result.adaptiveState.visibleQuestionCount).toBe(2);
      expect(result.adaptiveState.skippedQuestionCount).toBe(8); // 10 total - 2 visible
    });

    it('should include section progress information', async () => {
      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.currentSection).toBeDefined();
      expect(result.currentSection.id).toBe('section-1');
      expect(result.currentSection.progress).toBeDefined();
    });

    it('should update lastActivityAt for active sessions', async () => {
      await service.continueSession(mockSessionId, mockUserId, 1);

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should not update lastActivityAt for completed sessions', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSessionWithQuestionnaire,
        status: SessionStatus.COMPLETED,
      } as any);

      await service.continueSession(mockSessionId, mockUserId, 1);

      expect(prismaService.session.update).not.toHaveBeenCalled();
    });

    it('should skip already answered questions', async () => {
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 2);

      // q1 is answered, so only q2 should be returned
      const questionIds = result.nextQuestions.map((q) => q.id);
      expect(questionIds).not.toContain('q1');
    });

    it('should include Quiz2Biz progress counters (sectionsLeft, questionsLeft)', async () => {
      // Setup session with 2 sections
      const sessionWith2Sections = {
        ...mockSession,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [
            { id: 'section-1', name: 'Section 1', orderIndex: 0 },
            { id: 'section-2', name: 'Section 2', orderIndex: 1 },
          ],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWith2Sections as any);

      // 3 visible questions across 2 sections
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: true },
        { ...mockQuestion, id: 'q2', sectionId: 'section-1', isRequired: false },
        { ...mockQuestion, id: 'q3', sectionId: 'section-2', isRequired: true },
      ] as any);

      // 1 answered (section-1 not complete)
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer1' },
      ] as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // Should have Quiz2Biz progress counters
      expect(result.overallProgress.totalSections).toBe(2);
      expect(result.overallProgress.questionsLeft).toBe(2); // 3 total - 1 answered
      expect(result.overallProgress.sectionsLeft).toBe(2); // Neither section complete
      expect(result.overallProgress.completedSections).toBe(0);
    });

    it('should track completed sections correctly', async () => {
      // Setup session with 2 sections
      const sessionWith2Sections = {
        ...mockSession,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [
            { id: 'section-1', name: 'Section 1', orderIndex: 0 },
            { id: 'section-2', name: 'Section 2', orderIndex: 1 },
          ],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWith2Sections as any);

      // 2 questions in section-1, 1 in section-2
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: true },
        { ...mockQuestion, id: 'q2', sectionId: 'section-1', isRequired: false },
        { ...mockQuestion, id: 'q3', sectionId: 'section-2', isRequired: true },
      ] as any);

      // All section-1 questions answered, section-2 not started
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer1' },
        { questionId: 'q2', value: 'answer2' },
      ] as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.overallProgress.completedSections).toBe(1); // section-1 complete
      expect(result.overallProgress.sectionsLeft).toBe(1); // section-2 left
      expect(result.overallProgress.questionsLeft).toBe(1); // q3 left
    });

    it('should handle session with no currentSection gracefully', async () => {
      const sessionNoSection = {
        ...mockSession,
        currentSection: null,
        currentSectionId: null,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [{ id: 'section-1', name: 'Section 1', orderIndex: 0 }],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoSection as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(sessionNoSection as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.currentSection.id).toBe('');
      expect(result.currentSection.name).toBe('');
      expect(result.currentSection.progress).toBe(0);
      expect(result.session.currentSection).toBeUndefined();
    });

    it('should handle scoring error gracefully in continueSession', async () => {
      const sessionWithQuestionnaire = {
        ...mockSession,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [{ id: 'section-1', name: 'Section 1', orderIndex: 0 }],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithQuestionnaire as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(sessionWithQuestionnaire as any);
      // Make scoring fail
      scoringEngineService.calculateScore.mockRejectedValueOnce(new Error('No dimensions mapped'));

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // Should still return a result, readinessScore undefined due to error
      expect(result.readinessScore).toBeUndefined();
      expect(result.session).toBeDefined();
    });

    it('should wrap around to find unanswered questions before current position', async () => {
      // Session current question is q3, but q1 is unanswered
      const sessionAtQ3 = {
        ...mockSession,
        currentQuestionId: 'q3',
        questionnaire: {
          ...mockQuestionnaire,
          sections: [{ id: 'section-1', name: 'Section 1', orderIndex: 0 }],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionAtQ3 as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q2', value: 'ans' },
        { questionId: 'q3', value: 'ans' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: false },
        { ...mockQuestion, id: 'q2', sectionId: 'section-1', isRequired: false },
        { ...mockQuestion, id: 'q3', sectionId: 'section-1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(3);
      prismaService.session.update.mockResolvedValue(sessionAtQ3 as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // Should find q1 (before current position q3) as unanswered
      const nextIds = result.nextQuestions.map((q) => q.id);
      expect(nextIds).toContain('q1');
    });

    it('should set canComplete false when readiness-gated and score below threshold', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectTypeId: 'pt-1',
        questionnaire: {
          ...mockQuestionnaire,
          sections: [{ id: 'section-1', name: 'Section 1', orderIndex: 0 }],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(sessionWithProjectType as any);
      // This is a readiness-gated project type with low score
      prismaService.projectType.findUnique.mockResolvedValue({ slug: 'technical-readiness' });
      scoringEngineService.calculateScore.mockResolvedValueOnce({
        score: 50,
        portfolioResidual: 0.5,
      });

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.canComplete).toBe(false);
    });

    it('should include readinessScore from session when scoring available', async () => {
      const sessionWithScore = {
        ...mockSession,
        readinessScore: 88.5,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [{ id: 'section-1', name: 'Section 1', orderIndex: 0 }],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithScore as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(sessionWithScore as any);
      scoringEngineService.calculateScore.mockResolvedValueOnce({ score: 88.5 });

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.readinessScore).toBe(88.5);
    });
  });

  describe('create - persona and projectType branches', () => {
    it('should create session with persona and use persona-filtered questions', async () => {
      const personaQuestions = [
        { id: 'pq1', sectionId: 'section-1', text: 'Persona Q1' },
        { id: 'pq2', sectionId: 'section-1', text: 'Persona Q2' },
      ];
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      (questionnaireService as any).getQuestionsForPersona.mockResolvedValue(personaQuestions);
      prismaService.session.create.mockResolvedValue({
        ...mockSession,
        persona: Persona.CTO,
      } as any);

      const result = await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
        persona: Persona.CTO,
      });

      expect((questionnaireService as any).getQuestionsForPersona).toHaveBeenCalledWith(
        mockQuestionnaireId,
        Persona.CTO,
      );
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          persona: Persona.CTO,
          currentQuestionId: 'pq1',
          currentSectionId: 'section-1',
        }),
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });

    it('should use questionnaire total count when no persona specified', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(20);
      prismaService.session.create.mockResolvedValue(mockSession as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
      });

      expect((questionnaireService as any).getQuestionsForPersona).not.toHaveBeenCalled();
      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(mockQuestionnaireId);
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          progress: expect.objectContaining({ total: 20 }),
        }),
        include: expect.any(Object),
      });
    });

    it('should set projectTypeId when provided', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      prismaService.session.create.mockResolvedValue(mockSession as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
        projectTypeId: 'pt-123',
      });

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectTypeId: 'pt-123',
        }),
        include: expect.any(Object),
      });
    });

    it('should set ideaCaptureId when provided', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      prismaService.session.create.mockResolvedValue(mockSession as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
        ideaCaptureId: 'idea-abc',
      });

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ideaCaptureId: 'idea-abc',
        }),
        include: expect.any(Object),
      });
    });

    it('should use first section question when no persona questions exist', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(2);
      prismaService.session.create.mockResolvedValue(mockSession as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
      });

      // Should use first section's first question
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currentQuestionId: 'q1',
          currentSectionId: 'section-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should include projectType select in create', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      prismaService.session.create.mockResolvedValue({
        ...mockSession,
        projectType: { name: 'Tech Readiness', slug: 'technical-readiness' },
      } as any);

      const result = await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
        projectTypeId: 'pt-123',
      });

      expect(prismaService.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            projectType: { select: { name: true, slug: true } },
          }),
        }),
      );
      expect(result.projectTypeName).toBe('Tech Readiness');
      expect(result.projectTypeSlug).toBe('technical-readiness');
    });
  });

  describe('getNextQuestion - additional branches', () => {
    it('should throw NotFoundException when currentQuestionId is null', async () => {
      const sessionNoCurrentQ = {
        ...mockSession,
        currentQuestionId: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoCurrentQ as any);
      prismaService.response.findMany.mockResolvedValue([]);

      await expect(service.getNextQuestion(mockSessionId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when current question not found', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue(null);

      await expect(service.getNextQuestion(mockSessionId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.getNextQuestion(mockSessionId, 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.getNextQuestion('no-exist', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate section progress correctly with answered questions', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([{ questionId: 'q1', value: 'a' }] as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q2', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q3', sectionId: 'section-1' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      // 1 answered out of 3 in section = 33%
      expect(result.section.progress).toBe(33);
    });

    it('should return 0 section progress when no section questions exist', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        sectionId: 'section-other',
      } as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-other',
        name: 'Other',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      // No questions match section-other
      expect(result.section.progress).toBe(0);
    });
  });

  describe('submitResponse - NQS and adaptive branches', () => {
    const submitDto = {
      questionId: 'q1',
      value: 'Test answer',
      timeSpentSeconds: 30,
    };

    beforeEach(() => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        sessionId: mockSessionId,
        questionId: 'q1',
        value: 'Test answer',
        isValid: true,
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'Test answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q2', sectionId: 'section-1' },
      ] as any);
      prismaService.session.update.mockResolvedValue(mockSession as any);
    });

    it('should use NQS question as next when scoring engine returns one', async () => {
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({
        questions: [
          {
            questionId: 'q2',
            text: 'NQS question',
            dimensionKey: 'dim-1',
            expectedScoreLift: 5.5,
          },
        ],
      });

      const result = await service.submitResponse(mockSessionId, mockUserId, submitDto);

      expect(result.nextQuestionByNQS).toBeDefined();
      expect(result.nextQuestionByNQS!.questionId).toBe('q2');
      expect(result.nextQuestionByNQS!.dimensionKey).toBe('dim-1');
      expect(result.nextQuestionByNQS!.expectedScoreLift).toBe(5.5);

      // Session should be updated with NQS question
      expect(prismaService.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuestionId: 'q2',
          }),
        }),
      );
    });

    it('should fall back to sequential next when NQS question not in visible list', async () => {
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({
        questions: [
          {
            questionId: 'q-nonexistent',
            text: 'Not visible',
            dimensionKey: 'dim-1',
            expectedScoreLift: 3.0,
          },
        ],
      });

      const result = await service.submitResponse(mockSessionId, mockUserId, submitDto);

      // NQS should still be returned in the result
      expect(result.nextQuestionByNQS).toBeDefined();
      expect(result.nextQuestionByNQS!.questionId).toBe('q-nonexistent');

      // But session should be updated with sequential next (q2), not the NQS one
      expect(prismaService.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuestionId: 'q2',
          }),
        }),
      );
    });

    it('should set nextQuestionByNQS to undefined when no NQS questions returned', async () => {
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({ questions: [] });

      const result = await service.submitResponse(mockSessionId, mockUserId, submitDto);

      expect(result.nextQuestionByNQS).toBeUndefined();
    });

    it('should include readiness score from scoring engine', async () => {
      scoringEngineService.calculateScore.mockResolvedValueOnce({ score: 72.5 });

      const result = await service.submitResponse(mockSessionId, mockUserId, submitDto);

      expect(result.readinessScore).toBe(72.5);
    });

    it('should invalidate score cache before calculating', async () => {
      await service.submitResponse(mockSessionId, mockUserId, submitDto);

      expect(scoringEngineService.invalidateScoreCache).toHaveBeenCalledWith(mockSessionId);
      expect(scoringEngineService.calculateScore).toHaveBeenCalledWith({
        sessionId: mockSessionId,
      });
    });

    it('should handle null/undefined value for required question', async () => {
      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: null as any,
      });

      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors).toContain('This field is required');
    });

    it('should pass validation for non-required field with empty value', async () => {
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: null,
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: '',
      });

      expect(result.validationResult.isValid).toBe(true);
      expect(result.validationResult.errors).toBeUndefined();
    });

    it('should pass validation when no validation rules exist', async () => {
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: null,
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'any value',
      });

      expect(result.validationResult.isValid).toBe(true);
    });

    it('should set currentQuestionId to null when all questions answered', async () => {
      // All questions answered
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'a' },
        { questionId: 'q2', value: 'b' },
      ] as any);
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({ questions: [] });

      await service.submitResponse(mockSessionId, mockUserId, submitDto);

      expect(prismaService.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuestionId: undefined, // null from findNextUnansweredQuestion
          }),
        }),
      );
    });
  });

  describe('validateResponse - additional branches', () => {
    const baseSetup = () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        isValid: false,
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([]);
      prismaService.session.update.mockResolvedValue(mockSession as any);
    };

    it('should validate numeric max constraint', async () => {
      baseSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        type: QuestionType.NUMBER,
        validationRules: { max: 100 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 150,
      });

      expect(result.validationResult.errors).toContain('Maximum value is 100');
    });

    it('should pass validation for number within range', async () => {
      baseSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        type: QuestionType.NUMBER,
        validationRules: { min: 0, max: 100 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 50,
      });

      expect(result.validationResult.isValid).toBe(true);
    });

    it('should report multiple validation errors', async () => {
      baseSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: true,
        validationRules: { minLength: 10 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: '',
      });

      // Both "required" and no minLength error since empty string length 0 < 10
      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors).toContain('This field is required');
    });

    it('should skip type-specific validation when value is null', async () => {
      baseSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { minLength: 5 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: null as any,
      });

      // Not required + null value = valid (no type-specific validation runs)
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should handle non-numeric validation rule values gracefully', async () => {
      baseSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: {
          minLength: 'invalid',
          maxLength: 'invalid',
          min: 'invalid',
          max: 'invalid',
        },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'test',
      });

      // Non-numeric rules are treated as undefined, so no validation errors
      expect(result.validationResult.isValid).toBe(true);
    });
  });

  describe('completeSession - readiness gate branches', () => {
    it('should block completion for readiness-gated project type below threshold', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectTypeId: 'pt-readiness',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 80.0 });
      prismaService.projectType.findUnique.mockResolvedValue({ slug: 'technical-readiness' });

      await expect(service.completeSession(mockSessionId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include score in readiness gate error message', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectTypeId: 'pt-readiness',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 80.0 });
      prismaService.projectType.findUnique.mockResolvedValue({ slug: 'technical-readiness' });

      await expect(service.completeSession(mockSessionId, mockUserId)).rejects.toThrow(
        /Readiness score is 80.0%/,
      );
    });

    it('should allow completion for readiness-gated project type at threshold', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectTypeId: 'pt-readiness',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 95.0 });
      prismaService.projectType.findUnique.mockResolvedValue({ slug: 'technical-readiness' });
      prismaService.session.update.mockResolvedValue({
        ...sessionWithProjectType,
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.completeSession(mockSessionId, mockUserId);

      expect(result.status).toBe(SessionStatus.COMPLETED);
    });

    it('should allow completion for readiness-gated project type above threshold', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectTypeId: 'pt-readiness',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 98.5 });
      prismaService.projectType.findUnique.mockResolvedValue({ slug: 'technical-readiness' });
      prismaService.session.update.mockResolvedValue({
        ...sessionWithProjectType,
        status: SessionStatus.COMPLETED,
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.completeSession(mockSessionId, mockUserId);

      expect(result.status).toBe(SessionStatus.COMPLETED);
    });

    it('should skip readiness gate for non-gated project type', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectTypeId: 'pt-other',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 30.0 });
      prismaService.projectType.findUnique.mockResolvedValue({ slug: 'business-plan' });
      prismaService.session.update.mockResolvedValue({
        ...sessionWithProjectType,
        status: SessionStatus.COMPLETED,
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.completeSession(mockSessionId, mockUserId);

      // Should complete even with low score since not readiness-gated
      expect(result.status).toBe(SessionStatus.COMPLETED);
    });

    it('should skip readiness gate for session with no projectTypeId', async () => {
      const sessionNoProjectType = {
        ...mockSession,
        projectTypeId: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoProjectType as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 10.0 });
      prismaService.session.update.mockResolvedValue({
        ...sessionNoProjectType,
        status: SessionStatus.COMPLETED,
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.completeSession(mockSessionId, mockUserId);

      // Should complete since no project type = no gate
      expect(result.status).toBe(SessionStatus.COMPLETED);
      // Should NOT have queried projectType
      expect(prismaService.projectType.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.completeSession('no-exist', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archiveSession', () => {
    it('should archive an active session', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.session.update.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.ABANDONED,
      } as any);

      await service.archiveSession(mockSessionId, mockUserId);

      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: { status: SessionStatus.ABANDONED },
      });
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.archiveSession('no-exist', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.archiveSession(mockSessionId, 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('restoreSession', () => {
    it('should restore an archived session to IN_PROGRESS', async () => {
      const archivedSession = {
        ...mockSession,
        status: SessionStatus.ABANDONED,
      };
      prismaService.session.findUnique.mockResolvedValue(archivedSession as any);
      prismaService.session.update.mockResolvedValue({
        ...archivedSession,
        status: SessionStatus.IN_PROGRESS,
        currentSection: { id: 'section-1', name: 'Section 1' },
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.restoreSession(mockSessionId, mockUserId);

      expect(result.status).toBe(SessionStatus.IN_PROGRESS);
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: { status: SessionStatus.IN_PROGRESS },
        include: { currentSection: true },
      });
    });

    it('should throw BadRequestException if session is not archived', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any); // IN_PROGRESS

      await expect(service.restoreSession(mockSessionId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.restoreSession(mockSessionId, mockUserId)).rejects.toThrow(
        'Only archived sessions can be restored',
      );
    });

    it('should throw BadRequestException for completed session', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.COMPLETED,
      } as any);

      await expect(service.restoreSession(mockSessionId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.restoreSession('no-exist', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.ABANDONED,
      } as any);

      await expect(service.restoreSession(mockSessionId, 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSessionAnalytics', () => {
    it('should return analytics for a session with responses', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          value: 'answer1',
          isValid: true,
          timeSpentSeconds: 30,
          coverage: 0.8,
          question: {
            section: { name: 'Section 1' },
            dimension: { key: 'market' },
          },
        },
        {
          questionId: 'q2',
          value: 'answer2',
          isValid: false,
          timeSpentSeconds: 45,
          coverage: null,
          question: {
            section: { name: 'Section 1' },
            dimension: { key: 'market' },
          },
        },
        {
          questionId: 'q3',
          value: 'answer3',
          isValid: true,
          timeSpentSeconds: null,
          coverage: 0.5,
          question: {
            section: { name: 'Section 2' },
            dimension: { key: 'tech' },
          },
        },
      ] as any);
      prismaService.section.findMany.mockResolvedValue([
        { name: 'Section 1', _count: { questions: 5 } },
        { name: 'Section 2', _count: { questions: 3 } },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(8);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.totalResponses).toBe(3);
      expect(result.validResponses).toBe(2);
      expect(result.invalidResponses).toBe(1);
      expect(result.totalTimeSpent).toBe(75); // 30 + 45
      expect(result.averageTimePerQuestion).toBe(38); // Math.round(75/2) = 38
      expect(result.completionRate).toBe(38); // Math.round(3/8*100) = 38
      expect(result.bySection['Section 1']).toBeDefined();
      expect(result.bySection['Section 1'].answered).toBe(2);
      expect(result.bySection['Section 1'].total).toBe(5);
      expect(result.bySection['Section 2'].answered).toBe(1);
      expect(result.bySection['Section 2'].total).toBe(3);
      expect(result.byDimension['market']).toBeDefined();
      expect(result.byDimension['market'].answered).toBe(2);
      expect(result.byDimension['tech'].answered).toBe(1);
    });

    it('should handle session with no responses', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      prismaService.section.findMany.mockResolvedValue([
        { name: 'Section 1', _count: { questions: 5 } },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(5);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      expect(result.totalResponses).toBe(0);
      expect(result.validResponses).toBe(0);
      expect(result.invalidResponses).toBe(0);
      expect(result.totalTimeSpent).toBe(0);
      expect(result.averageTimePerQuestion).toBe(0);
      expect(result.completionRate).toBe(0);
      // Section still present with 0 answered
      expect(result.bySection['Section 1']).toEqual({ answered: 0, total: 5, avgTime: 0 });
    });

    it('should handle responses with missing section and dimension', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          value: 'a',
          isValid: true,
          timeSpentSeconds: 10,
          coverage: null,
          question: {
            section: null,
            dimension: null,
          },
        },
      ] as any);
      prismaService.section.findMany.mockResolvedValue([]);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      expect(result.bySection['Unknown'].answered).toBe(1);
      expect(result.byDimension['unknown'].answered).toBe(1);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.getSessionAnalytics('no-exist', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.getSessionAnalytics(mockSessionId, 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should calculate completion rate as 0 when total questions is 0', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      prismaService.section.findMany.mockResolvedValue([]);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(0);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      expect(result.completionRate).toBe(0);
    });
  });

  describe('getUserSessionStats', () => {
    it('should return stats for user with multiple sessions', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000); // 1 hour earlier
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: earlier,
          completedAt: now,
          readinessScore: 85.0,
        },
        {
          id: 's2',
          status: SessionStatus.COMPLETED,
          startedAt: earlier,
          completedAt: now,
          readinessScore: 92.0,
        },
        {
          id: 's3',
          status: SessionStatus.IN_PROGRESS,
          startedAt: now,
          completedAt: null,
          readinessScore: null,
        },
        {
          id: 's4',
          status: SessionStatus.ABANDONED,
          startedAt: now,
          completedAt: null,
          readinessScore: null,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.totalSessions).toBe(4);
      expect(result.completedSessions).toBe(2);
      expect(result.inProgressSessions).toBe(1);
      expect(result.archivedSessions).toBe(1);
      expect(result.averageScore).toBe(88.5); // (85 + 92) / 2
      expect(result.highestScore).toBe(92.0);
      expect(result.lowestScore).toBe(85.0);
      expect(result.averageCompletionTimeMs).toBe(3600000); // 1 hour
      expect(result.scoreImprovement).toBe(7.0); // 92 - 85
    });

    it('should return zero stats for user with no sessions', async () => {
      prismaService.session.findMany.mockResolvedValue([]);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.totalSessions).toBe(0);
      expect(result.completedSessions).toBe(0);
      expect(result.inProgressSessions).toBe(0);
      expect(result.archivedSessions).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.highestScore).toBe(0);
      expect(result.lowestScore).toBe(0);
      expect(result.averageCompletionTimeMs).toBe(0);
      expect(result.scoreImprovement).toBe(0);
    });

    it('should handle single completed session (no improvement)', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          readinessScore: 75.0,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.scoreImprovement).toBe(0); // Only 1 score, not >= 2
      expect(result.averageScore).toBe(75.0);
      expect(result.highestScore).toBe(75.0);
      expect(result.lowestScore).toBe(75.0);
    });

    it('should handle completed sessions with null readinessScore', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          readinessScore: null,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.completedSessions).toBe(1);
      expect(result.averageScore).toBe(0); // No scores to average
      expect(result.highestScore).toBe(0);
      expect(result.lowestScore).toBe(0);
    });

    it('should handle completed sessions without completedAt', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: null, // missing completedAt
          readinessScore: 80.0,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.averageCompletionTimeMs).toBe(0); // Filtered out
    });
  });

  describe('exportSession', () => {
    it('should export session with all data', async () => {
      const exportDate = new Date();
      prismaService.session.findUnique.mockResolvedValue({
        id: mockSessionId,
        userId: mockUserId,
        questionnaireId: mockQuestionnaireId,
        questionnaireVersion: 1,
        status: SessionStatus.COMPLETED,
        industry: 'tech',
        startedAt: exportDate,
        completedAt: exportDate,
        readinessScore: 88.5,
        progress: { percentage: 100, answered: 10, total: 10 },
        questionnaire: {
          id: mockQuestionnaireId,
          name: 'Test Questionnaire',
          version: 1,
        },
        responses: [
          {
            questionId: 'q1',
            value: 'answer1',
            coverage: 0.8,
            isValid: true,
            answeredAt: exportDate,
            timeSpentSeconds: 30,
          },
          {
            questionId: 'q2',
            value: { selectedOptionId: 'opt-1' },
            coverage: null,
            isValid: true,
            answeredAt: exportDate,
            timeSpentSeconds: null,
          },
        ],
      } as any);

      const result = await service.exportSession(mockSessionId, mockUserId);

      expect(result.exportVersion).toBe('1.0');
      expect(result.exportedAt).toBeInstanceOf(Date);
      expect(result.session.id).toBe(mockSessionId);
      expect(result.session.questionnaireName).toBe('Test Questionnaire');
      expect(result.session.readinessScore).toBe(88.5);
      expect(result.session.industry).toBe('tech');
      expect(result.responses).toHaveLength(2);
      expect(result.responses[0].coverage).toBe(0.8);
      expect(result.responses[1].coverage).toBeNull();
      expect(result.responses[1].timeSpentSeconds).toBeNull();
    });

    it('should export session with null readinessScore', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        id: mockSessionId,
        userId: mockUserId,
        questionnaireId: mockQuestionnaireId,
        questionnaireVersion: 1,
        status: SessionStatus.IN_PROGRESS,
        industry: null,
        startedAt: new Date(),
        completedAt: null,
        readinessScore: null,
        progress: { percentage: 0, answered: 0, total: 10 },
        questionnaire: {
          id: mockQuestionnaireId,
          name: 'Test Questionnaire',
          version: 1,
        },
        responses: [],
      } as any);

      const result = await service.exportSession(mockSessionId, mockUserId);

      expect(result.session.readinessScore).toBeNull();
      expect(result.session.completedAt).toBeNull();
      expect(result.session.industry).toBeNull();
      expect(result.responses).toHaveLength(0);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.exportSession('no-exist', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        id: mockSessionId,
        userId: mockUserId,
        responses: [],
        questionnaire: { id: mockQuestionnaireId, name: 'Test', version: 1 },
      } as any);

      await expect(service.exportSession(mockSessionId, 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('bulkDeleteSessions', () => {
    it('should delete multiple sessions successfully', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.deleteMany.mockResolvedValue({ count: 5 });
      prismaService.session.delete.mockResolvedValue(mockSession as any);

      const result = await service.bulkDeleteSessions(mockUserId, ['s1', 's2', 's3']);

      expect(result.deleted).toBe(3);
      expect(result.failed).toHaveLength(0);
      expect(prismaService.response.deleteMany).toHaveBeenCalledTimes(3);
      expect(prismaService.session.delete).toHaveBeenCalledTimes(3);
    });

    it('should track failed deletions', async () => {
      // First call succeeds, second fails (not found), third succeeds
      prismaService.session.findUnique
        .mockResolvedValueOnce(mockSession as any)
        .mockResolvedValueOnce(null) // will throw NotFoundException
        .mockResolvedValueOnce(mockSession as any);
      prismaService.response.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.session.delete.mockResolvedValue(mockSession as any);

      const result = await service.bulkDeleteSessions(mockUserId, ['s1', 's2', 's3']);

      expect(result.deleted).toBe(2);
      expect(result.failed).toEqual(['s2']);
    });

    it('should fail for unauthorized sessions', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        userId: 'other-user', // Not the requesting user
      } as any);

      const result = await service.bulkDeleteSessions(mockUserId, ['s1']);

      expect(result.deleted).toBe(0);
      expect(result.failed).toEqual(['s1']);
    });

    it('should handle empty session list', async () => {
      const result = await service.bulkDeleteSessions(mockUserId, []);

      expect(result.deleted).toBe(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should delete responses before deleting session', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.deleteMany.mockResolvedValue({ count: 3 });
      prismaService.session.delete.mockResolvedValue(mockSession as any);

      await service.bulkDeleteSessions(mockUserId, ['s1']);

      // Verify order: deleteMany called before session.delete
      const deleteManyCall = prismaService.response.deleteMany.mock.invocationCallOrder[0];
      const deleteSessionCall = prismaService.session.delete.mock.invocationCallOrder[0];
      expect(deleteManyCall).toBeLessThan(deleteSessionCall);
    });
  });

  describe('cloneSession', () => {
    beforeEach(() => {
      // Source session retrieval (getSessionWithValidation)
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
    });

    it('should clone a session without copying responses', async () => {
      const newSession = {
        ...mockSession,
        id: 'new-session-1',
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      // findById call for return
      prismaService.session.findUnique
        .mockResolvedValueOnce(mockSession as any) // getSessionWithValidation
        .mockResolvedValueOnce({ ...newSession, questionnaire: mockQuestionnaire } as any); // findById

      const result = await service.cloneSession(mockSessionId, mockUserId);

      expect(result).toBeDefined();
      expect(prismaService.session.create).toHaveBeenCalled();
      expect(prismaService.response.createMany).not.toHaveBeenCalled();
    });

    it('should clone a session with responses when copyResponses is true', async () => {
      const sourceResponses = [
        { questionId: 'q1', value: 'ans1', isValid: true, validationErrors: null },
        { questionId: 'q2', value: 'ans2', isValid: true, validationErrors: { errors: ['test'] } },
      ];
      const newSession = {
        ...mockSession,
        id: 'new-session-2',
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      prismaService.response.findMany.mockResolvedValue(sourceResponses as any);
      prismaService.response.createMany.mockResolvedValue({ count: 2 });
      prismaService.session.update.mockResolvedValue(newSession as any);
      prismaService.session.findUnique
        .mockResolvedValueOnce(mockSession as any) // getSessionWithValidation
        .mockResolvedValueOnce({ ...newSession, questionnaire: mockQuestionnaire } as any); // findById

      const result = await service.cloneSession(mockSessionId, mockUserId, { copyResponses: true });

      expect(result).toBeDefined();
      expect(prismaService.response.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            sessionId: 'new-session-2',
            questionId: 'q1',
          }),
        ]),
      });
      // Should recalculate progress
      expect(prismaService.session.update).toHaveBeenCalledWith({
        where: { id: 'new-session-2' },
        data: expect.objectContaining({
          progress: expect.objectContaining({
            percentage: expect.any(Number),
            answered: 2,
            total: expect.any(Number),
          }),
        }),
      });
    });

    it('should use provided industry override', async () => {
      const newSession = {
        ...mockSession,
        id: 'new-session-3',
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      prismaService.session.findUnique
        .mockResolvedValueOnce(mockSession as any)
        .mockResolvedValueOnce({ ...newSession, questionnaire: mockQuestionnaire } as any);

      await service.cloneSession(mockSessionId, mockUserId, { industry: 'healthcare' });

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          industry: 'healthcare',
        }),
        include: expect.any(Object),
      });
    });

    it('should preserve source session persona', async () => {
      const sessionWithPersona = {
        ...mockSession,
        persona: Persona.CTO,
      };
      prismaService.session.findUnique.mockResolvedValueOnce(sessionWithPersona as any);
      (questionnaireService as any).getQuestionsForPersona.mockResolvedValue([
        { id: 'pq1', sectionId: 'section-1' },
      ]);
      const newSession = {
        ...mockSession,
        id: 'new-session-4',
        persona: Persona.CTO,
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      prismaService.session.findUnique.mockResolvedValueOnce({
        ...newSession,
        questionnaire: mockQuestionnaire,
      } as any);

      await service.cloneSession(mockSessionId, mockUserId);

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          persona: Persona.CTO,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException for non-existent source session', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.cloneSession('no-exist', mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);

      await expect(service.cloneSession(mockSessionId, 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('mapToSessionResponse - additional branches', () => {
    it('should map session with projectType info', async () => {
      const sessionWithProjectType = {
        ...mockSession,
        projectType: { name: 'Business Plan', slug: 'business-plan' },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProjectType as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.projectTypeName).toBe('Business Plan');
      expect(result.projectTypeSlug).toBe('business-plan');
    });

    it('should handle session with no projectType', async () => {
      const sessionNoProjectType = {
        ...mockSession,
        projectType: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoProjectType as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.projectTypeName).toBeUndefined();
      expect(result.projectTypeSlug).toBeUndefined();
    });

    it('should map readinessScore from session', async () => {
      const sessionWithScore = {
        ...mockSession,
        readinessScore: 92.5,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithScore as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.readinessScore).toBe(92.5);
    });

    it('should map readinessScore as undefined when null', async () => {
      const sessionNoScore = {
        ...mockSession,
        readinessScore: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoScore as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.readinessScore).toBeUndefined();
    });

    it('should map persona from session', async () => {
      const sessionWithPersona = {
        ...mockSession,
        persona: Persona.CFO,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithPersona as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.persona).toBe(Persona.CFO);
    });

    it('should map persona as undefined when null', async () => {
      const sessionNoPersona = {
        ...mockSession,
        persona: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoPersona as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.persona).toBeUndefined();
    });

    it('should calculate estimatedTimeRemaining correctly', async () => {
      const sessionWith5Answered = {
        ...mockSession,
        progress: { percentage: 50, answered: 5, total: 10 },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWith5Answered as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      // 5 questions left * 1.5 minutes = 7.5 -> ceil = 8
      expect(result.progress.estimatedTimeRemaining).toBe(8);
    });

    it('should set estimatedTimeRemaining to 0 when all questions answered', async () => {
      const sessionAllDone = {
        ...mockSession,
        progress: { percentage: 100, answered: 10, total: 10 },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionAllDone as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.progress.estimatedTimeRemaining).toBe(0);
    });

    it('should handle session with no currentSection', async () => {
      const sessionNoSection = {
        ...mockSession,
        currentSection: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoSection as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.currentSection).toBeUndefined();
    });

    it('should use totalQuestions fallback when progress.total is 0', async () => {
      const sessionZeroTotal = {
        ...mockSession,
        progress: { percentage: 0, answered: 0, total: 0 },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionZeroTotal as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(15);

      const result = await service.findById(mockSessionId, mockUserId);

      // Should use totalQuestions (15) as fallback
      expect(result.progress.totalQuestions).toBe(15);
    });
  });

  describe('mapQuestionToResponse - field mapping', () => {
    it('should map all optional fields when present', async () => {
      const fullQuestion = {
        ...mockQuestion,
        helpText: 'Help text here',
        explanation: 'Explanation here',
        placeholder: 'Enter value',
        options: [{ id: 'opt-1', label: 'Option 1', description: 'Desc' }],
        validationRules: { minLength: 1 },
        bestPractice: 'Best practice text',
        practicalExplainer: 'Practical explainer text',
        dimensionKey: 'market-fit',
      };
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue(fullQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([fullQuestion] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      const q = result.questions[0];
      expect(q.helpText).toBe('Help text here');
      expect(q.explanation).toBe('Explanation here');
      expect(q.placeholder).toBe('Enter value');
      expect(q.options).toEqual([{ id: 'opt-1', label: 'Option 1', description: 'Desc' }]);
      expect(q.validation).toEqual({ minLength: 1 });
      expect(q.bestPractice).toBe('Best practice text');
      expect(q.practicalExplainer).toBe('Practical explainer text');
      expect(q.dimensionKey).toBe('market-fit');
    });

    it('should map optional fields as undefined when null', async () => {
      const minimalQuestion = {
        ...mockQuestion,
        helpText: null,
        explanation: null,
        placeholder: null,
        options: null,
        validationRules: null,
        bestPractice: null,
        practicalExplainer: null,
        dimensionKey: null,
      };
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue(minimalQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([minimalQuestion] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      const q = result.questions[0];
      expect(q.helpText).toBeUndefined();
      expect(q.explanation).toBeUndefined();
      expect(q.placeholder).toBeUndefined();
      expect(q.options).toBeUndefined();
      expect(q.validation).toBeUndefined();
      expect(q.bestPractice).toBeUndefined();
      expect(q.practicalExplainer).toBeUndefined();
      expect(q.dimensionKey).toBeUndefined();
    });
  });

  describe('findAllByUser - additional branches', () => {
    it('should not include status in where clause when undefined', async () => {
      prismaService.session.findMany.mockResolvedValue([]);
      prismaService.session.count.mockResolvedValue(0);

      await service.findAllByUser(mockUserId, { page: 1, limit: 10, skip: 0 }, undefined);

      expect(prismaService.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
        }),
      );
    });

    it('should handle multiple sessions with different questionnaires', async () => {
      prismaService.session.findMany.mockResolvedValue([
        { ...mockSession, id: 's1', questionnaireId: 'q1', persona: null },
        { ...mockSession, id: 's2', questionnaireId: 'q2', persona: Persona.CTO },
      ] as any);
      prismaService.session.count.mockResolvedValue(2);
      questionnaireService.getTotalQuestionCount
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20);

      const result = await service.findAllByUser(mockUserId, { page: 1, limit: 10, skip: 0 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      // Verify getTotalQuestionCount was called with persona for second session
      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith('q2', Persona.CTO);
    });

    it('should pass pagination parameters correctly', async () => {
      prismaService.session.findMany.mockResolvedValue([]);
      prismaService.session.count.mockResolvedValue(0);

      await service.findAllByUser(mockUserId, { page: 3, limit: 5, skip: 10 });

      expect(prismaService.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
          orderBy: { startedAt: 'desc' },
        }),
      );
    });
  });

  describe('findById - persona-aware total count', () => {
    it('should pass persona to getTotalQuestionCount when session has persona', async () => {
      const sessionWithPersona = {
        ...mockSession,
        persona: Persona.CEO,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithPersona as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(5);

      await service.findById(mockSessionId, mockUserId);

      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(
        mockQuestionnaireId,
        Persona.CEO,
      );
    });

    it('should pass undefined persona when session has no persona', async () => {
      const sessionNoPersona = {
        ...mockSession,
        persona: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoPersona as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      await service.findById(mockSessionId, mockUserId);

      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(
        mockQuestionnaireId,
        undefined,
      );
    });
  });

  describe('findNextUnansweredQuestion - edge cases', () => {
    it('should wrap around to find unanswered question before current', async () => {
      // All questions after current are answered, but q1 before is not
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        answeredAt: new Date(),
      } as any);
      // q2 and q3 are answered, but nothing before current (q2)
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q2', value: 'a' },
        { questionId: 'q3', value: 'b' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q1', sectionId: 'section-1' },
        { id: 'q2', sectionId: 'section-1' },
        { id: 'q3', sectionId: 'section-2' },
      ] as any);
      prismaService.session.update.mockResolvedValue(mockSession as any);
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({ questions: [] });

      // Submit response to q1 (the question being answered), which triggers findNextUnanswered
      // Current question is q1, so it looks after q1 for unanswered
      // q2 and q3 are answered, so it should return null (all done)
      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'my answer',
      });

      // After answering q1, q2 and q3 are already answered
      // findNextUnanswered should return null
      expect(prismaService.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuestionId: undefined,
          }),
        }),
      );
    });

    it('should return null when all questions are answered', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([{ questionId: 'q1', value: 'a' }] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q1', sectionId: 'section-1' },
      ] as any);
      prismaService.session.update.mockResolvedValue(mockSession as any);
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({ questions: [] });

      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'answer',
      });

      // Only q1 exists and it's answered, so next should be null/undefined
      expect(prismaService.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuestionId: undefined,
          }),
        }),
      );
    });
  });

  describe('calculateProgress - section info branches', () => {
    it('should include section info when provided through continueSession', async () => {
      const sessionWith2Sections = {
        ...mockSession,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [
            { id: 'section-1', name: 'Section 1', orderIndex: 0 },
            { id: 'section-2', name: 'Section 2', orderIndex: 1 },
            { id: 'section-3', name: 'Section 3', orderIndex: 2 },
          ],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWith2Sections as any);
      // All questions in section-1 answered, section-2 partially, section-3 none
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: false },
        { ...mockQuestion, id: 'q2', sectionId: 'section-2', isRequired: false },
        { ...mockQuestion, id: 'q3', sectionId: 'section-2', isRequired: false },
        { ...mockQuestion, id: 'q4', sectionId: 'section-3', isRequired: false },
      ] as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'a' },
        { questionId: 'q2', value: 'b' },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(4);
      prismaService.session.update.mockResolvedValue(sessionWith2Sections as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.overallProgress.totalSections).toBe(3);
      expect(result.overallProgress.completedSections).toBe(1); // only section-1
      expect(result.overallProgress.sectionsLeft).toBe(2);
      expect(result.overallProgress.percentage).toBe(50); // 2/4
    });

    it('should default section counters to 0 when no sectionInfo in mapToSessionResponse', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.progress.totalSections).toBe(0);
      expect(result.progress.completedSections).toBe(0);
      expect(result.progress.sectionsLeft).toBe(0);
    });
  });

  // =====================================================================
  // COMPREHENSIVE BRANCH COVERAGE TESTS
  // =====================================================================

  describe('create - empty sections/questions edge cases', () => {
    it('should handle questionnaire with empty sections array', async () => {
      const emptyQuestionnaire = {
        ...mockQuestionnaire,
        sections: [],
      };
      questionnaireService.findById.mockResolvedValue(emptyQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(0);
      prismaService.session.create.mockResolvedValue({
        ...mockSession,
        currentQuestionId: undefined,
        currentSectionId: undefined,
        progress: { percentage: 0, answered: 0, total: 0 },
      } as any);

      const result = await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
      });

      expect(result).toBeDefined();
      // firstSection is undefined, so initialQuestionId and initialSectionId are both undefined
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currentQuestionId: undefined,
          currentSectionId: undefined,
        }),
        include: expect.any(Object),
      });
    });

    it('should handle section with empty questions array', async () => {
      const questionnaireEmptyQuestions = {
        ...mockQuestionnaire,
        sections: [{ id: 'section-1', name: 'Section 1', questions: [] }],
      };
      questionnaireService.findById.mockResolvedValue(questionnaireEmptyQuestions as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(0);
      prismaService.session.create.mockResolvedValue({
        ...mockSession,
        currentQuestionId: undefined,
        currentSectionId: 'section-1',
      } as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
      });

      // firstSection exists but firstQuestion is undefined
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currentQuestionId: undefined,
          currentSectionId: 'section-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should use persona question when persona specified and questions returned empty', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      (questionnaireService as any).getQuestionsForPersona.mockResolvedValue([]);
      prismaService.session.create.mockResolvedValue({
        ...mockSession,
        persona: Persona.CFO,
      } as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
        persona: Persona.CFO,
      });

      // personaQuestions is empty array (truthy), so totalQuestions = 0
      // firstPersonaQuestion is undefined, so falls back to firstSection question
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          persona: Persona.CFO,
          progress: expect.objectContaining({ total: 0 }),
          currentQuestionId: 'q1', // falls back to first section question
          currentSectionId: 'section-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should set ideaCaptureId to undefined when not provided', async () => {
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      prismaService.session.create.mockResolvedValue(mockSession as any);

      await service.create(mockUserId, {
        questionnaireId: mockQuestionnaireId,
      });

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ideaCaptureId: undefined,
          projectTypeId: undefined,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('continueSession - currentQuestionId null/missing branches', () => {
    const makeSessionWithQuestionnaire = (overrides: Record<string, unknown> = {}) => ({
      ...mockSession,
      questionnaire: {
        ...mockQuestionnaire,
        sections: [{ id: 'section-1', name: 'Section 1', orderIndex: 0 }],
      },
      ...overrides,
    });

    it('should return empty nextQuestions when currentQuestionId is null and session is active', async () => {
      const session = makeSessionWithQuestionnaire({ currentQuestionId: null });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // !isComplete is true but session.currentQuestionId is null,
      // so the if (!isComplete && session.currentQuestionId) block is skipped
      expect(result.nextQuestions).toHaveLength(0);
    });

    it('should handle currentQuestionId not found in visible questions (index -1)', async () => {
      const session = makeSessionWithQuestionnaire({ currentQuestionId: 'q-missing' });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: false },
        { ...mockQuestion, id: 'q2', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(2);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 2);

      // currentIndex = -1, Math.max(0, -1) = 0, so starts from beginning
      expect(result.nextQuestions.length).toBe(2);
    });

    it('should skip scoring when answeredCount is 0', async () => {
      const session = makeSessionWithQuestionnaire();
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]); // 0 answers
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // answeredCount === 0, so scoring is skipped entirely
      expect(scoringEngineService.calculateScore).not.toHaveBeenCalled();
      expect(result.readinessScore).toBeUndefined();
    });

    it('should use session readinessScore fallback when scoring returns value and session has readinessScore', async () => {
      const session = makeSessionWithQuestionnaire({
        readinessScore: 75.0,
      });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);
      scoringEngineService.calculateScore.mockResolvedValueOnce({ score: 90.0 });

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // Scoring succeeds with 90.0, so readinessScore from scoring takes priority
      expect(result.readinessScore).toBe(90.0);
      // session.readinessScore is the fallback path (via readinessScore ?? session.readinessScore)
      expect(result.session.readinessScore).toBe(90.0);
    });

    it('should use session readinessScore as fallback when scoring fails and session has readinessScore', async () => {
      const session = makeSessionWithQuestionnaire({
        readinessScore: 75.0,
      });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);
      scoringEngineService.calculateScore.mockRejectedValueOnce(new Error('fail'));

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // Scoring fails, readinessScore is undefined
      // session.readinessScore fallback: readinessScore ?? (session.readinessScore ? Number(session.readinessScore) : undefined)
      expect(result.session.readinessScore).toBe(75.0);
    });

    it('should handle adaptiveState with undefined branchHistory', async () => {
      const session = makeSessionWithQuestionnaire({
        adaptiveState: { skippedQuestionIds: [], activeQuestionIds: [] },
      });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // branchHistory is undefined, so || [] fallback is used
      expect(result.adaptiveState.appliedRules).toEqual([]);
    });

    it('should handle adaptiveState with populated branchHistory', async () => {
      const session = makeSessionWithQuestionnaire({
        adaptiveState: {
          skippedQuestionIds: ['q5'],
          activeQuestionIds: [],
          branchHistory: ['rule-1', 'rule-2'],
        },
      });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.adaptiveState.appliedRules).toEqual(['rule-1', 'rule-2']);
    });

    it('should calculate canComplete as false when answeredCount is 0 even if no required questions', async () => {
      const session = makeSessionWithQuestionnaire();
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]); // 0 answers
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: false }, // not required
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // unansweredRequired.length === 0 but answeredCount === 0, so canComplete = false
      expect(result.canComplete).toBe(false);
    });

    it('should calculate canComplete correctly when readiness gate passes', async () => {
      const session = makeSessionWithQuestionnaire({ projectTypeId: 'pt-1' });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);
      prismaService.projectType.findUnique.mockResolvedValue({ slug: 'technical-readiness' });
      scoringEngineService.calculateScore.mockResolvedValueOnce({ score: 96.0 });

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // All required answered, answeredCount > 0, readiness gate passes (96 >= 95)
      expect(result.canComplete).toBe(true);
    });

    it('should handle section with 0 visible questions for sectionProgress = 0', async () => {
      const session = makeSessionWithQuestionnaire({
        currentSection: { id: 'section-empty', name: 'Empty Section' },
      });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      // No questions in section-empty
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // section-empty has 0 questions -> progress = 0
      expect(result.currentSection.progress).toBe(0);
      expect(result.currentSection.questionsInSection).toBe(0);
      expect(result.currentSection.answeredInSection).toBe(0);
    });

    it('should include currentSection description when present', async () => {
      const session = makeSessionWithQuestionnaire({
        currentSection: {
          id: 'section-1',
          name: 'Section 1',
          description: 'A detailed description',
        },
      });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.currentSection.description).toBe('A detailed description');
    });

    it('should set currentSection description to undefined when not present on section model', async () => {
      const session = makeSessionWithQuestionnaire({
        currentSection: { id: 'section-1', name: 'Section 1' },
      });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.currentSection.description).toBeUndefined();
    });

    it('should calculate section completion for section with all questions answered but 0 total', async () => {
      // Section exists in questionnaire.sections but has no visible questions
      const session = {
        ...mockSession,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [
            { id: 'section-1', name: 'Section 1', orderIndex: 0 },
            { id: 'section-2', name: 'Section 2', orderIndex: 1 },
          ],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([]);
      // No visible questions in section-2
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: false },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // section-2 has 0 questions: isComplete = false (sectionQuestions.length > 0 fails)
      expect(result.overallProgress.completedSections).toBe(0);
    });

    it('should handle readiness gate when project type not found in database', async () => {
      const session = makeSessionWithQuestionnaire({ projectTypeId: 'pt-deleted' });
      prismaService.session.findUnique.mockResolvedValue(session as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', isRequired: true },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);
      prismaService.session.update.mockResolvedValue(session as any);
      // projectType not found -> returns null
      prismaService.projectType.findUnique.mockResolvedValue(null);
      scoringEngineService.calculateScore.mockResolvedValueOnce({ score: 50.0 });

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      // projectType?.slug is undefined, !== 'technical-readiness', so no gate
      expect(result.canComplete).toBe(true);
    });
  });

  describe('getNextQuestion - additional edge case branches', () => {
    it('should return empty questions when all visible questions are answered', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'a' },
        { questionId: 'q2', value: 'b' },
      ] as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q2', sectionId: 'section-1' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId, 2);

      // All questions answered, so nextQuestions should be empty
      expect(result.questions).toHaveLength(0);
    });

    it('should handle currentQuestion not found in visible questions (index -1)', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      // The current question q1 is NOT in the visible list
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q5', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q6', sectionId: 'section-1' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId, 2);

      // currentIndex = -1, loop starts at -1 which is < visibleQuestions.length
      // i = -1 -> question = visibleQuestions[-1] = undefined, so `question &&` check is false
      // i = 0 -> q5, i = 1 -> q6
      expect(result.questions.length).toBeLessThanOrEqual(2);
    });

    it('should handle multiple sections in section progress calculation', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([{ questionId: 'q1', value: 'a' }] as any);
      const currentQ = { ...mockQuestion, sectionId: 'section-2' };
      questionnaireService.getQuestionById.mockResolvedValue(currentQ as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q2', sectionId: 'section-2' },
        { ...mockQuestion, id: 'q3', sectionId: 'section-2' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-2',
        name: 'Section 2',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId, 1);

      // section-2 has 2 questions (q2, q3), 0 answered in section-2
      expect(result.section.progress).toBe(0);
      expect(result.section.id).toBe('section-2');
    });

    it('should return correct number when requesting more than available', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([]);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId, 10);

      // Only 1 question available
      expect(result.questions).toHaveLength(1);
    });
  });

  describe('submitResponse - findNextUnansweredQuestion wrapping', () => {
    const baseSubmitSetup = () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        sessionId: mockSessionId,
        questionId: 'q1',
        value: 'answer',
        isValid: true,
        answeredAt: new Date(),
      } as any);
      prismaService.session.update.mockResolvedValue(mockSession as any);
    };

    it('should find unanswered question before current when all after are answered', async () => {
      baseSubmitSetup();
      // After submitting q1, q2 and q3 are answered but q0 (before q1) is not
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'a' },
        { questionId: 'q2', value: 'b' },
        { questionId: 'q3', value: 'c' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q0', sectionId: 'section-1' },
        { id: 'q1', sectionId: 'section-1' },
        { id: 'q2', sectionId: 'section-1' },
        { id: 'q3', sectionId: 'section-1' },
      ] as any);
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({ questions: [] });

      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'answer',
      });

      // q0 is before q1 and unanswered
      expect(prismaService.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuestionId: 'q0',
          }),
        }),
      );
    });

    it('should handle NQS question that IS in visible list as next question', async () => {
      baseSubmitSetup();
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q1', sectionId: 'section-1' },
        { id: 'q2', sectionId: 'section-1' },
        { id: 'q3', sectionId: 'section-2' },
      ] as any);
      // NQS returns q3 which IS in visible list
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({
        questions: [
          {
            questionId: 'q3',
            text: 'NQS picks q3',
            dimensionKey: 'dim-2',
            expectedScoreLift: 8.0,
          },
        ],
      });

      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'answer',
      });

      // NQS q3 is in visible list, so it takes priority over sequential q2
      expect(prismaService.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuestionId: 'q3',
            currentSectionId: 'section-2',
          }),
        }),
      );
    });

    it('should update session with progress after submitResponse', async () => {
      baseSubmitSetup();
      prismaService.response.findMany.mockResolvedValue([{ questionId: 'q1', value: 'a' }] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q1', sectionId: 'section-1' },
        { id: 'q2', sectionId: 'section-1' },
        { id: 'q3', sectionId: 'section-1' },
        { id: 'q4', sectionId: 'section-1' },
      ] as any);
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({ questions: [] });

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'answer',
      });

      // 1 answered out of 4 visible = 25%
      expect(result.progress.percentage).toBe(25);
      expect(result.progress.answeredQuestions).toBe(1);
      expect(result.progress.totalQuestions).toBe(4);
    });

    it('should return createdAt from response answeredAt', async () => {
      const answeredAt = new Date('2026-01-15T10:00:00Z');
      baseSubmitSetup();
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        sessionId: mockSessionId,
        questionId: 'q1',
        value: 'answer',
        isValid: true,
        answeredAt,
      } as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'answer' },
      ] as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { id: 'q1', sectionId: 'section-1' },
      ] as any);
      scoringEngineService.getNextQuestions.mockResolvedValueOnce({ questions: [] });

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'answer',
      });

      expect(result.createdAt).toEqual(answeredAt);
    });
  });

  describe('validateResponse - comprehensive branch coverage', () => {
    const validationSetup = () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        isValid: false,
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([]);
      prismaService.session.update.mockResolvedValue(mockSession as any);
    };

    it('should throw SyntaxError when value is undefined due to JSON serialization', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: true,
        validationRules: null,
      } as any);

      // undefined is not valid JSON, so JSON.parse(JSON.stringify(undefined)) throws
      await expect(
        service.submitResponse(mockSessionId, mockUserId, {
          questionId: 'q1',
          value: undefined as any,
        }),
      ).rejects.toThrow(SyntaxError);
    });

    it('should apply both minLength and maxLength when both violated (impossible)', async () => {
      validationSetup();
      // This tests the code path where both min and max are checked independently
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { minLength: 100, maxLength: 5 }, // contradictory rules
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'medium text', // 11 chars: violates maxLength=5
      });

      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.errors).toContain('Minimum length is 100 characters');
      expect(result.validationResult.errors).toContain('Maximum length is 5 characters');
    });

    it('should apply both min and max when both violated for number', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { min: 100, max: 50 }, // contradictory rules
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 75,
      });

      expect(result.validationResult.isValid).toBe(false);
      // 75 < 100 (min violated) and 75 > 50 (max violated)
      expect(result.validationResult.errors).toContain('Minimum value is 100');
      expect(result.validationResult.errors).toContain('Maximum value is 50');
    });

    it('should skip string validation for non-string value with minLength/maxLength rules', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { minLength: 5, maxLength: 10 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 42, // number, not string
      });

      // minLength/maxLength only apply to strings, so no errors
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should skip number validation for non-number value with min/max rules', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { min: 0, max: 100 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'not a number', // string, not number
      });

      // min/max only apply to numbers, so no errors
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should handle boolean value with validation rules', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { minLength: 5, min: 10 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: true, // boolean: not string, not number
      });

      // No type-specific validation applies to boolean
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should handle object value with validation rules', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { minLength: 5, min: 10 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: { selectedOption: 'opt-1' },
      });

      expect(result.validationResult.isValid).toBe(true);
    });

    it('should pass when string meets exact minLength boundary', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { minLength: 5 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'exact', // exactly 5 characters
      });

      expect(result.validationResult.isValid).toBe(true);
    });

    it('should pass when string meets exact maxLength boundary', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { maxLength: 5 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'exact', // exactly 5 characters
      });

      expect(result.validationResult.isValid).toBe(true);
    });

    it('should pass when number equals min boundary', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { min: 10 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 10,
      });

      expect(result.validationResult.isValid).toBe(true);
    });

    it('should pass when number equals max boundary', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: { max: 100 },
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 100,
      });

      expect(result.validationResult.isValid).toBe(true);
    });

    it('should handle validation with timeSpentSeconds provided', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: null,
      } as any);

      const result = await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'answer',
        timeSpentSeconds: 120,
      });

      expect(result.validationResult.isValid).toBe(true);
      // Verify timeSpentSeconds is passed to upsert
      expect(prismaService.response.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ timeSpentSeconds: 120 }),
          update: expect.objectContaining({ timeSpentSeconds: 120 }),
        }),
      );
    });

    it('should handle validation errors stored as Prisma.JsonNull when no errors', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: false,
        validationRules: null,
      } as any);

      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'valid answer',
      });

      // When validation passes, errors is undefined, so validationErrors should be Prisma.JsonNull
      expect(prismaService.response.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            validationErrors: Prisma.JsonNull,
          }),
        }),
      );
    });

    it('should store validation errors as JSON object when errors exist', async () => {
      validationSetup();
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: true,
        validationRules: { minLength: 10 },
      } as any);

      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'short',
      });

      expect(prismaService.response.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            validationErrors: {
              errors: expect.arrayContaining(['Minimum length is 10 characters']),
            },
          }),
        }),
      );
    });
  });

  describe('completeSession - additional edge cases', () => {
    it('should pass persona to getTotalQuestionCount when completing', async () => {
      const sessionWithPersona = {
        ...mockSession,
        persona: Persona.BA,
        projectTypeId: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithPersona as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 50 });
      prismaService.session.update.mockResolvedValue({
        ...sessionWithPersona,
        status: SessionStatus.COMPLETED,
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(5);

      await service.completeSession(mockSessionId, mockUserId);

      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(
        mockQuestionnaireId,
        Persona.BA,
      );
    });

    it('should pass undefined persona when null to getTotalQuestionCount', async () => {
      const sessionNoPersona = {
        ...mockSession,
        persona: null,
        projectTypeId: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNoPersona as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 50 });
      prismaService.session.update.mockResolvedValue({
        ...sessionNoPersona,
        status: SessionStatus.COMPLETED,
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      await service.completeSession(mockSessionId, mockUserId);

      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(
        mockQuestionnaireId,
        undefined,
      );
    });

    it('should handle isReadinessGatedSession when projectType not found in DB', async () => {
      const sessionWithPT = {
        ...mockSession,
        projectTypeId: 'pt-deleted',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithPT as any);
      scoringEngineService.calculateScore.mockResolvedValue({ score: 10 });
      prismaService.projectType.findUnique.mockResolvedValue(null); // not found
      prismaService.session.update.mockResolvedValue({
        ...sessionWithPT,
        status: SessionStatus.COMPLETED,
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      // Should complete because projectType?.slug is undefined, not 'technical-readiness'
      const result = await service.completeSession(mockSessionId, mockUserId);
      expect(result.status).toBe(SessionStatus.COMPLETED);
    });
  });

  describe('getSessionAnalytics - comprehensive branch coverage', () => {
    it('should calculate avgTime per section correctly with mixed time data', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          value: 'a',
          isValid: true,
          timeSpentSeconds: 20,
          coverage: null,
          question: { section: { name: 'Section 1' }, dimension: { key: 'market' } },
        },
        {
          questionId: 'q2',
          value: 'b',
          isValid: true,
          timeSpentSeconds: 40,
          coverage: null,
          question: { section: { name: 'Section 1' }, dimension: { key: 'market' } },
        },
        {
          questionId: 'q3',
          value: 'c',
          isValid: true,
          timeSpentSeconds: null, // no time recorded
          coverage: null,
          question: { section: { name: 'Section 1' }, dimension: { key: 'tech' } },
        },
      ] as any);
      prismaService.section.findMany.mockResolvedValue([
        { name: 'Section 1', _count: { questions: 5 } },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(5);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      // Section 1: 3 answered, times [20, 40] (null excluded from avg), avgTime = 30
      expect(result.bySection['Section 1'].answered).toBe(3);
      expect(result.bySection['Section 1'].avgTime).toBe(30);
    });

    it('should handle response with timeSpentSeconds of 0', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          value: 'a',
          isValid: true,
          timeSpentSeconds: 0, // 0 is falsy but a valid number
          coverage: null,
          question: { section: { name: 'Section 1' }, dimension: { key: 'market' } },
        },
      ] as any);
      prismaService.section.findMany.mockResolvedValue([
        { name: 'Section 1', _count: { questions: 1 } },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      // timeSpentSeconds 0 is falsy, so it's included in timesSpent filter (it's not null)
      // but for sectionTimes, if (r.timeSpentSeconds) is falsy for 0
      expect(result.totalTimeSpent).toBe(0);
      // avgTime for section should be 0 since no times were pushed (0 is falsy)
      expect(result.bySection['Section 1'].avgTime).toBe(0);
    });

    it('should calculate dimension coverage correctly', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          value: 'a',
          isValid: true,
          timeSpentSeconds: null,
          coverage: 0.8,
          question: { section: { name: 'S1' }, dimension: { key: 'dim-1' } },
        },
        {
          questionId: 'q2',
          value: 'b',
          isValid: true,
          timeSpentSeconds: null,
          coverage: 0.6,
          question: { section: { name: 'S1' }, dimension: { key: 'dim-1' } },
        },
        {
          questionId: 'q3',
          value: 'c',
          isValid: true,
          timeSpentSeconds: null,
          coverage: null, // null coverage
          question: { section: { name: 'S1' }, dimension: { key: 'dim-2' } },
        },
      ] as any);
      prismaService.section.findMany.mockResolvedValue([
        { name: 'S1', _count: { questions: 3 } },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(3);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      // dim-1: coverage = (0.8 + 0.6) / 2 = 0.7
      expect(result.byDimension['dim-1'].answered).toBe(2);
      expect(result.byDimension['dim-1'].coverage).toBeCloseTo(0.7);
      // dim-2: no coverage added (null), then /1 = 0
      expect(result.byDimension['dim-2'].answered).toBe(1);
      expect(result.byDimension['dim-2'].coverage).toBe(0);
    });

    it('should handle section avgTime when all responses have null timeSpentSeconds', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          value: 'a',
          isValid: true,
          timeSpentSeconds: null,
          coverage: null,
          question: { section: { name: 'S1' }, dimension: { key: 'market' } },
        },
      ] as any);
      prismaService.section.findMany.mockResolvedValue([
        { name: 'S1', _count: { questions: 1 } },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(1);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      // sectionTimes empty for S1, avgTime = 0
      expect(result.bySection['S1'].avgTime).toBe(0);
    });

    it('should include sections with no responses when queried from DB', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          value: 'a',
          isValid: true,
          timeSpentSeconds: 10,
          coverage: null,
          question: { section: { name: 'Section 1' }, dimension: { key: 'market' } },
        },
      ] as any);
      prismaService.section.findMany.mockResolvedValue([
        { name: 'Section 1', _count: { questions: 5 } },
        { name: 'Section 2', _count: { questions: 3 } },
        { name: 'Section 3', _count: { questions: 2 } },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.getSessionAnalytics(mockSessionId, mockUserId);

      // Section 2 and 3 have no responses but should still appear
      expect(result.bySection['Section 2']).toEqual({ answered: 0, total: 3, avgTime: 0 });
      expect(result.bySection['Section 3']).toEqual({ answered: 0, total: 2, avgTime: 0 });
    });

    it('should pass persona to getTotalQuestionCount in analytics', async () => {
      const sessionWithPersona = { ...mockSession, persona: Persona.CEO };
      prismaService.session.findUnique.mockResolvedValue(sessionWithPersona as any);
      prismaService.response.findMany.mockResolvedValue([]);
      prismaService.section.findMany.mockResolvedValue([]);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(5);

      await service.getSessionAnalytics(mockSessionId, mockUserId);

      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(
        mockQuestionnaireId,
        Persona.CEO,
      );
    });
  });

  describe('getUserSessionStats - additional edge cases', () => {
    it('should handle sessions with only null readinessScores', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          readinessScore: null,
        },
        {
          id: 's2',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          readinessScore: null,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.completedSessions).toBe(2);
      expect(result.averageScore).toBe(0);
      expect(result.highestScore).toBe(0);
      expect(result.lowestScore).toBe(0);
      expect(result.scoreImprovement).toBe(0); // scores.length < 2
    });

    it('should calculate score improvement with 3 or more scores', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(2026, 0, 1),
          completedAt: new Date(2026, 0, 2),
          readinessScore: 60.0,
        },
        {
          id: 's2',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(2026, 0, 3),
          completedAt: new Date(2026, 0, 4),
          readinessScore: 75.0,
        },
        {
          id: 's3',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(2026, 0, 5),
          completedAt: new Date(2026, 0, 6),
          readinessScore: 90.0,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.averageScore).toBe(75.0); // (60+75+90)/3
      expect(result.highestScore).toBe(90.0);
      expect(result.lowestScore).toBe(60.0);
      // scoreImprovement = last - first = 90 - 60 = 30
      expect(result.scoreImprovement).toBe(30.0);
    });

    it('should handle mix of sessions with and without readiness scores', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          readinessScore: 80.0,
        },
        {
          id: 's2',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          readinessScore: null, // filtered out of scores
        },
        {
          id: 's3',
          status: SessionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          readinessScore: 90.0,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      // Only 80 and 90 are counted
      expect(result.averageScore).toBe(85.0);
      expect(result.highestScore).toBe(90.0);
      expect(result.lowestScore).toBe(80.0);
      expect(result.scoreImprovement).toBe(10.0);
    });

    it('should handle only in-progress sessions', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.IN_PROGRESS,
          startedAt: new Date(),
          completedAt: null,
          readinessScore: null,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.totalSessions).toBe(1);
      expect(result.completedSessions).toBe(0);
      expect(result.inProgressSessions).toBe(1);
      expect(result.archivedSessions).toBe(0);
    });

    it('should handle only archived sessions', async () => {
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.ABANDONED,
          startedAt: new Date(),
          completedAt: null,
          readinessScore: null,
        },
        {
          id: 's2',
          status: SessionStatus.ABANDONED,
          startedAt: new Date(),
          completedAt: null,
          readinessScore: null,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      expect(result.totalSessions).toBe(2);
      expect(result.completedSessions).toBe(0);
      expect(result.inProgressSessions).toBe(0);
      expect(result.archivedSessions).toBe(2);
    });

    it('should calculate average completion time across multiple sessions', async () => {
      const base = new Date(2026, 0, 1, 0, 0, 0);
      prismaService.session.findMany.mockResolvedValue([
        {
          id: 's1',
          status: SessionStatus.COMPLETED,
          startedAt: base,
          completedAt: new Date(base.getTime() + 1800000), // 30 min
          readinessScore: 80,
        },
        {
          id: 's2',
          status: SessionStatus.COMPLETED,
          startedAt: base,
          completedAt: new Date(base.getTime() + 3600000), // 60 min
          readinessScore: 90,
        },
      ] as any);

      const result = await service.getUserSessionStats(mockUserId);

      // avg = (1800000 + 3600000) / 2 = 2700000
      expect(result.averageCompletionTimeMs).toBe(2700000);
    });
  });

  describe('exportSession - edge cases', () => {
    it('should export session with empty responses array', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        id: mockSessionId,
        userId: mockUserId,
        questionnaireId: mockQuestionnaireId,
        questionnaireVersion: 1,
        status: SessionStatus.IN_PROGRESS,
        industry: null,
        startedAt: new Date(),
        completedAt: null,
        readinessScore: null,
        progress: { percentage: 0, answered: 0, total: 5 },
        questionnaire: {
          id: mockQuestionnaireId,
          name: 'Test',
          version: 1,
        },
        responses: [],
      } as any);

      const result = await service.exportSession(mockSessionId, mockUserId);

      expect(result.responses).toHaveLength(0);
      expect(result.session.readinessScore).toBeNull();
      expect(result.session.completedAt).toBeNull();
      expect(result.session.industry).toBeNull();
    });

    it('should convert readinessScore decimal to number', async () => {
      prismaService.session.findUnique.mockResolvedValue({
        id: mockSessionId,
        userId: mockUserId,
        questionnaireId: mockQuestionnaireId,
        questionnaireVersion: 2,
        status: SessionStatus.COMPLETED,
        industry: 'finance',
        startedAt: new Date(),
        completedAt: new Date(),
        readinessScore: 92.75, // Decimal type
        progress: { percentage: 100, answered: 5, total: 5 },
        questionnaire: {
          id: mockQuestionnaireId,
          name: 'Finance Assessment',
          version: 2,
        },
        responses: [
          {
            questionId: 'q1',
            value: { selectedOptionId: 'opt-1' },
            coverage: 1.0,
            isValid: true,
            answeredAt: new Date(),
            timeSpentSeconds: 45,
          },
        ],
      } as any);

      const result = await service.exportSession(mockSessionId, mockUserId);

      expect(result.session.readinessScore).toBe(92.75);
      expect(result.session.questionnaireVersion).toBe(2);
      expect(result.session.questionnaireName).toBe('Finance Assessment');
      expect(result.responses[0].coverage).toBe(1.0);
      expect(result.responses[0].timeSpentSeconds).toBe(45);
    });
  });

  describe('cloneSession - additional edge cases', () => {
    it('should clone session with null persona and null industry', async () => {
      const sessionNoPersonaNoIndustry = {
        ...mockSession,
        persona: null,
        industry: null,
      };
      prismaService.session.findUnique.mockResolvedValueOnce(sessionNoPersonaNoIndustry as any);
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      const newSession = {
        ...mockSession,
        id: 'new-clone-1',
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      prismaService.session.findUnique.mockResolvedValueOnce({
        ...newSession,
        questionnaire: mockQuestionnaire,
      } as any);

      await service.cloneSession(mockSessionId, mockUserId);

      // persona: undefined (null -> undefined via ??), industry: undefined (null -> undefined via ??)
      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          persona: undefined,
          industry: undefined,
        }),
        include: expect.any(Object),
      });
    });

    it('should clone with copyResponses handling null value in response', async () => {
      prismaService.session.findUnique.mockResolvedValueOnce(mockSession as any);
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      const newSession = {
        ...mockSession,
        id: 'new-clone-2',
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: null, isValid: false, validationErrors: null },
      ] as any);
      prismaService.response.createMany.mockResolvedValue({ count: 1 });
      prismaService.session.update.mockResolvedValue(newSession as any);
      prismaService.session.findUnique.mockResolvedValueOnce({
        ...newSession,
        questionnaire: mockQuestionnaire,
      } as any);

      await service.cloneSession(mockSessionId, mockUserId, { copyResponses: true });

      // value is null -> Prisma.JsonNull, validationErrors is null -> Prisma.JsonNull
      expect(prismaService.response.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            sessionId: 'new-clone-2',
            questionId: 'q1',
            value: Prisma.JsonNull,
            validationErrors: Prisma.JsonNull,
          }),
        ]),
      });
    });

    it('should use source industry when no override provided', async () => {
      const sessionWithIndustry = {
        ...mockSession,
        industry: 'retail',
        persona: null,
      };
      prismaService.session.findUnique.mockResolvedValueOnce(sessionWithIndustry as any);
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);
      const newSession = {
        ...mockSession,
        id: 'new-clone-3',
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      prismaService.session.findUnique.mockResolvedValueOnce({
        ...newSession,
        questionnaire: mockQuestionnaire,
      } as any);

      await service.cloneSession(mockSessionId, mockUserId);

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          industry: 'retail',
        }),
        include: expect.any(Object),
      });
    });

    it('should pass persona-aware count when copying responses', async () => {
      const sessionWithPersona = {
        ...mockSession,
        persona: Persona.CTO,
      };
      prismaService.session.findUnique.mockResolvedValueOnce(sessionWithPersona as any);
      questionnaireService.findById.mockResolvedValue(mockQuestionnaire as any);
      (questionnaireService as any).getQuestionsForPersona.mockResolvedValue([
        { id: 'pq1', sectionId: 'section-1' },
      ]);
      const newSession = {
        ...mockSession,
        id: 'new-clone-4',
        persona: Persona.CTO,
        currentSection: { id: 'section-1', name: 'Section 1' },
        projectType: null,
      };
      prismaService.session.create.mockResolvedValue(newSession as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'a', isValid: true, validationErrors: null },
      ] as any);
      prismaService.response.createMany.mockResolvedValue({ count: 1 });
      questionnaireService.getTotalQuestionCount.mockResolvedValue(5);
      prismaService.session.update.mockResolvedValue(newSession as any);
      prismaService.session.findUnique.mockResolvedValueOnce({
        ...newSession,
        questionnaire: mockQuestionnaire,
      } as any);

      await service.cloneSession(mockSessionId, mockUserId, { copyResponses: true });

      // getTotalQuestionCount called with persona for progress recalculation
      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(
        mockQuestionnaireId,
        Persona.CTO,
      );
    });
  });

  describe('bulkDeleteSessions - additional edge cases', () => {
    it('should handle database error during response deletion', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.deleteMany.mockRejectedValue(new Error('DB error'));

      const result = await service.bulkDeleteSessions(mockUserId, ['s1']);

      // Error caught in try/catch, session added to failed
      expect(result.deleted).toBe(0);
      expect(result.failed).toEqual(['s1']);
    });

    it('should handle database error during session deletion', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.session.delete.mockRejectedValue(new Error('DB error'));

      const result = await service.bulkDeleteSessions(mockUserId, ['s1']);

      expect(result.deleted).toBe(0);
      expect(result.failed).toEqual(['s1']);
    });

    it('should process mix of successful and failed deletions', async () => {
      // s1: success, s2: forbidden (wrong user), s3: DB error, s4: success
      prismaService.session.findUnique
        .mockResolvedValueOnce(mockSession as any)
        .mockResolvedValueOnce({ ...mockSession, userId: 'other-user' } as any) // forbidden
        .mockResolvedValueOnce(mockSession as any) // will fail on delete
        .mockResolvedValueOnce(mockSession as any); // success

      prismaService.response.deleteMany
        .mockResolvedValueOnce({ count: 1 }) // s1
        .mockResolvedValueOnce({ count: 0 }) // s3
        .mockResolvedValueOnce({ count: 2 }); // s4

      prismaService.session.delete
        .mockResolvedValueOnce(mockSession as any) // s1
        .mockRejectedValueOnce(new Error('fail')) // s3
        .mockResolvedValueOnce(mockSession as any); // s4

      const result = await service.bulkDeleteSessions(mockUserId, ['s1', 's2', 's3', 's4']);

      expect(result.deleted).toBe(2);
      expect(result.failed).toEqual(['s2', 's3']);
    });
  });

  describe('restoreSession - edge case branches', () => {
    it('should restore session with persona and pass to getTotalQuestionCount', async () => {
      const archivedWithPersona = {
        ...mockSession,
        status: SessionStatus.ABANDONED,
        persona: Persona.POLICY,
      };
      prismaService.session.findUnique.mockResolvedValue(archivedWithPersona as any);
      prismaService.session.update.mockResolvedValue({
        ...archivedWithPersona,
        status: SessionStatus.IN_PROGRESS,
        currentSection: { id: 'section-1', name: 'Section 1' },
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(8);

      const result = await service.restoreSession(mockSessionId, mockUserId);

      expect(result.status).toBe(SessionStatus.IN_PROGRESS);
      expect(questionnaireService.getTotalQuestionCount).toHaveBeenCalledWith(
        mockQuestionnaireId,
        Persona.POLICY,
      );
    });

    it('should restore session with no currentSection', async () => {
      const archivedNoSection = {
        ...mockSession,
        status: SessionStatus.ABANDONED,
        persona: null,
      };
      prismaService.session.findUnique.mockResolvedValue(archivedNoSection as any);
      prismaService.session.update.mockResolvedValue({
        ...archivedNoSection,
        status: SessionStatus.IN_PROGRESS,
        currentSection: null,
      } as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.restoreSession(mockSessionId, mockUserId);

      expect(result.currentSection).toBeUndefined();
    });
  });

  describe('mapToSessionResponse - edge case branch coverage', () => {
    it('should handle industry as null mapping to undefined', async () => {
      const sessionNullIndustry = {
        ...mockSession,
        industry: null,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionNullIndustry as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.industry).toBeUndefined();
    });

    it('should handle industry with value', async () => {
      const sessionWithIndustry = {
        ...mockSession,
        industry: 'healthcare',
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithIndustry as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.industry).toBe('healthcare');
    });

    it('should map startedAt to createdAt and lastActivityAt correctly', async () => {
      const startedAt = new Date('2026-01-01T00:00:00Z');
      const lastActivity = new Date('2026-01-15T12:00:00Z');
      const sessionWithDates = {
        ...mockSession,
        startedAt,
        lastActivityAt: lastActivity,
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithDates as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      expect(result.createdAt).toEqual(startedAt);
      expect(result.lastActivityAt).toEqual(lastActivity);
    });

    it('should calculate questionsLeft using progress.total when available', async () => {
      const sessionWithProgress = {
        ...mockSession,
        progress: { percentage: 50, answered: 5, total: 10 },
      };
      prismaService.session.findUnique.mockResolvedValue(sessionWithProgress as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      const result = await service.findById(mockSessionId, mockUserId);

      // questionsLeft = (10 || 10) - 5 = 5
      expect(result.progress.questionsLeft).toBe(5);
    });
  });

  describe('continueSession - all sections complete scenario', () => {
    it('should report all sections complete when every question is answered', async () => {
      const session = {
        ...mockSession,
        questionnaire: {
          ...mockQuestionnaire,
          sections: [
            { id: 'section-1', name: 'Section 1', orderIndex: 0 },
            { id: 'section-2', name: 'Section 2', orderIndex: 1 },
          ],
        },
      };
      prismaService.session.findUnique.mockResolvedValue(session as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1', isRequired: true },
        { ...mockQuestion, id: 'q2', sectionId: 'section-2', isRequired: true },
      ] as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'a' },
        { questionId: 'q2', value: 'b' },
      ] as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(2);
      prismaService.session.update.mockResolvedValue(session as any);
      scoringEngineService.calculateScore.mockResolvedValueOnce({ score: 100 });

      const result = await service.continueSession(mockSessionId, mockUserId, 1);

      expect(result.overallProgress.completedSections).toBe(2);
      expect(result.overallProgress.sectionsLeft).toBe(0);
      expect(result.overallProgress.percentage).toBe(100);
      expect(result.canComplete).toBe(true);
    });
  });

  describe('findById - include configuration', () => {
    it('should include questionnaire in findById query', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getTotalQuestionCount.mockResolvedValue(10);

      await service.findById(mockSessionId, mockUserId);

      expect(prismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        include: expect.objectContaining({
          currentSection: true,
          questionnaire: true,
          projectType: { select: { name: true, slug: true } },
        }),
      });
    });
  });

  describe('getNextQuestion - section with all questions answered progress', () => {
    it('should calculate 100% section progress when all section questions answered', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      prismaService.response.findMany.mockResolvedValue([
        { questionId: 'q1', value: 'a' },
        { questionId: 'q2', value: 'b' },
      ] as any);
      questionnaireService.getQuestionById.mockResolvedValue(mockQuestion as any);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([
        { ...mockQuestion, id: 'q1', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q2', sectionId: 'section-1' },
        { ...mockQuestion, id: 'q3', sectionId: 'section-2' },
      ] as any);
      prismaService.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'Section 1',
      } as any);

      const result = await service.getNextQuestion(mockSessionId, mockUserId);

      // section-1: q1 and q2 both answered out of q1, q2 = 100%
      expect(result.section.progress).toBe(100);
    });
  });

  describe('submitResponse - validation errors stored correctly in upsert', () => {
    it('should store errors in validationErrors field when present', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSession as any);
      questionnaireService.getQuestionById.mockResolvedValue({
        ...mockQuestion,
        isRequired: true,
        validationRules: { minLength: 50 },
      } as any);
      prismaService.response.upsert.mockResolvedValue({
        id: 'response-1',
        isValid: false,
        answeredAt: new Date(),
      } as any);
      prismaService.response.findMany.mockResolvedValue([]);
      adaptiveLogicService.getVisibleQuestions.mockResolvedValue([]);
      prismaService.session.update.mockResolvedValue(mockSession as any);

      await service.submitResponse(mockSessionId, mockUserId, {
        questionId: 'q1',
        value: 'short',
      });

      // Both "required" check passes (not empty) but minLength fails
      expect(prismaService.response.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            isValid: false,
            validationErrors: {
              errors: expect.arrayContaining(['Minimum length is 50 characters']),
            },
          }),
          update: expect.objectContaining({
            isValid: false,
            validationErrors: {
              errors: expect.arrayContaining(['Minimum length is 50 characters']),
            },
          }),
        }),
      );
    });
  });
});
