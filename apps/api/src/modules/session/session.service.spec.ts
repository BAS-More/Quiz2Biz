import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SessionService } from './session.service';
import { PrismaService } from '@libs/database';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { AdaptiveLogicService } from '../adaptive-logic/adaptive-logic.service';
import { SessionStatus, QuestionType } from '@prisma/client';

describe('SessionService', () => {
  let service: SessionService;
  let prismaService: any; // Use any for mocked service
  let questionnaireService: jest.Mocked<QuestionnaireService>;
  let adaptiveLogicService: jest.Mocked<AdaptiveLogicService>;

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
      },
      response: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      section: {
        findUnique: jest.fn(),
      },
    };

    const mockQuestionnaireService = {
      findById: jest.fn(),
      getTotalQuestionCount: jest.fn(),
      getQuestionById: jest.fn(),
    };

    const mockAdaptiveLogicService = {
      getVisibleQuestions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QuestionnaireService, useValue: mockQuestionnaireService },
        { provide: AdaptiveLogicService, useValue: mockAdaptiveLogicService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prismaService = module.get(PrismaService);
    questionnaireService = module.get(QuestionnaireService);
    adaptiveLogicService = module.get(AdaptiveLogicService);
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
        include: { currentSection: true },
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
  });
});
