import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionStatus } from '@prisma/client';

describe('SessionController', () => {
  let controller: SessionController;
  let module: TestingModule;

  const mockSessionService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findById: jest.fn(),
    continueSession: jest.fn(),
    getNextQuestion: jest.fn(),
    submitResponse: jest.fn(),
    completeSession: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
    organizationId: 'org-456',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    sessionService = module.get<SessionService>(SessionService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('create', () => {
    it('should create a new session', async () => {
      const createDto = { questionnaireId: 'questionnaire-123' };
      const mockSession = {
        id: 'session-456',
        userId: 'user-123',
        questionnaireId: 'questionnaire-123',
        status: SessionStatus.IN_PROGRESS,
        progress: { totalQuestions: 50, answeredQuestions: 0 },
      };

      mockSessionService.create.mockResolvedValue(mockSession);

      const result = await controller.create(mockUser as any, createDto);

      expect(result).toEqual(mockSession);
      expect(mockSessionService.create).toHaveBeenCalledWith('user-123', createDto);
    });
  });

  describe('findAll', () => {
    it('should list user sessions with pagination', async () => {
      const pagination = { page: 1, limit: 10, skip: 0 } as any;
      const mockSessions = [
        { id: 'session-1', status: SessionStatus.IN_PROGRESS },
        { id: 'session-2', status: SessionStatus.COMPLETED },
      ];

      mockSessionService.findAllByUser.mockResolvedValue({
        items: mockSessions,
        total: 2,
      });

      const result = await controller.findAll(mockUser as any, pagination);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
      expect(mockSessionService.findAllByUser).toHaveBeenCalledWith(
        'user-123',
        pagination,
        undefined,
      );
    });

    it('should filter sessions by status', async () => {
      const pagination = { page: 1, limit: 10, skip: 0 } as any;
      const status = SessionStatus.IN_PROGRESS;

      mockSessionService.findAllByUser.mockResolvedValue({
        items: [{ id: 'session-1', status }],
        total: 1,
      });

      const result = await controller.findAll(mockUser as any, pagination, status);

      expect(result.items).toHaveLength(1);
      expect(mockSessionService.findAllByUser).toHaveBeenCalledWith('user-123', pagination, status);
    });
  });

  describe('findById', () => {
    it('should get session by ID', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        status: SessionStatus.IN_PROGRESS,
      };

      mockSessionService.findById.mockResolvedValue(mockSession);

      const result = await controller.findById(mockUser as any, 'session-123');

      expect(result).toEqual(mockSession);
      expect(mockSessionService.findById).toHaveBeenCalledWith('session-123', 'user-123');
    });
  });

  describe('continueSession', () => {
    it('should continue session with next questions', async () => {
      const mockResponse = {
        session: { id: 'session-123', status: SessionStatus.IN_PROGRESS },
        nextQuestions: [{ id: 'q-1', text: 'Question 1' }],
        progress: { totalQuestions: 50, answeredQuestions: 10, percentage: 20 },
      };

      mockSessionService.continueSession.mockResolvedValue(mockResponse);

      const result = await controller.continueSession(mockUser as any, 'session-123', {
        questionCount: 1,
      });

      expect(result.nextQuestions).toHaveLength(1);
      expect(mockSessionService.continueSession).toHaveBeenCalledWith('session-123', 'user-123', 1);
    });

    it('should cap question count at 5', async () => {
      mockSessionService.continueSession.mockResolvedValue({
        session: {},
        nextQuestions: [],
        progress: {},
      });

      await controller.continueSession(mockUser as any, 'session-123', { questionCount: 10 });

      expect(mockSessionService.continueSession).toHaveBeenCalledWith('session-123', 'user-123', 5);
    });
  });

  describe('getNextQuestion', () => {
    it('should get next questions based on adaptive logic', async () => {
      const mockQuestions = {
        questions: [
          { id: 'q-1', text: 'Question 1', priority: 1 },
          { id: 'q-2', text: 'Question 2', priority: 2 },
        ],
        sessionProgress: { percentage: 30 },
      };

      mockSessionService.getNextQuestion.mockResolvedValue(mockQuestions);

      const result = await controller.getNextQuestion(mockUser as any, 'session-123', 2);

      expect(result.questions).toHaveLength(2);
      expect(mockSessionService.getNextQuestion).toHaveBeenCalledWith('session-123', 'user-123', 2);
    });
  });

  describe('submitResponse', () => {
    it('should submit response to a question', async () => {
      const submitDto = {
        questionId: 'question-123',
        selectedOptionIds: ['opt-1', 'opt-2'],
        textResponse: 'Test response',
        value: 'test value',
      } as any;

      const mockResult = {
        responseId: 'response-789',
        progress: { percentage: 25 },
        adaptiveChanges: { added: [], removed: [] },
      };

      mockSessionService.submitResponse.mockResolvedValue(mockResult);

      const result = await controller.submitResponse(mockUser as any, 'session-123', submitDto);

      expect(result.responseId).toBe('response-789');
      expect(mockSessionService.submitResponse).toHaveBeenCalledWith(
        'session-123',
        'user-123',
        submitDto,
      );
    });
  });

  describe('updateResponse', () => {
    it('should update an existing response', async () => {
      const updateDto = {
        selectedOptionIds: ['opt-3'],
        textResponse: 'Updated response',
        value: 'updated value',
      } as any;

      const mockResult = {
        responseId: 'response-789',
        progress: { percentage: 25 },
      };

      mockSessionService.submitResponse.mockResolvedValue(mockResult);

      const result = await controller.updateResponse(
        mockUser as any,
        'session-123',
        'question-456',
        updateDto,
      );

      expect(result.responseId).toBe('response-789');
      expect(mockSessionService.submitResponse).toHaveBeenCalledWith('session-123', 'user-123', {
        ...updateDto,
        questionId: 'question-456',
      });
    });
  });

  describe('complete', () => {
    it('should mark session as complete', async () => {
      const mockCompletedSession = {
        id: 'session-123',
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      };

      mockSessionService.completeSession.mockResolvedValue(mockCompletedSession);

      const result = await controller.complete(mockUser as any, 'session-123');

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(mockSessionService.completeSession).toHaveBeenCalledWith('session-123', 'user-123');
    });
  });

  describe('uncovered branches', () => {
    it('should default page to 1 and limit to 20 when undefined', async () => {
      const pagination = { skip: 0 } as any; // page and limit are undefined
      mockSessionService.findAllByUser.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await controller.findAll(mockUser as any, pagination);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should default questionCount to 1 when dto.questionCount is 0/falsy in continueSession', async () => {
      mockSessionService.continueSession.mockResolvedValue({
        session: {},
        nextQuestions: [],
        progress: {},
      });

      await controller.continueSession(mockUser as any, 'session-123', { questionCount: 0 });

      expect(mockSessionService.continueSession).toHaveBeenCalledWith('session-123', 'user-123', 1);
    });

    it('should default questionCount to 1 when dto.questionCount is undefined in continueSession', async () => {
      mockSessionService.continueSession.mockResolvedValue({
        session: {},
        nextQuestions: [],
        progress: {},
      });

      await controller.continueSession(mockUser as any, 'session-123', {} as any);

      expect(mockSessionService.continueSession).toHaveBeenCalledWith('session-123', 'user-123', 1);
    });

    it('should default count to 1 when undefined in getNextQuestion', async () => {
      mockSessionService.getNextQuestion.mockResolvedValue({
        questions: [],
        sessionProgress: {},
      });

      await controller.getNextQuestion(mockUser as any, 'session-123', undefined);

      expect(mockSessionService.getNextQuestion).toHaveBeenCalledWith('session-123', 'user-123', 1);
    });

    it('should cap count at 5 in getNextQuestion', async () => {
      mockSessionService.getNextQuestion.mockResolvedValue({
        questions: [],
        sessionProgress: {},
      });

      await controller.getNextQuestion(mockUser as any, 'session-123', 10);

      expect(mockSessionService.getNextQuestion).toHaveBeenCalledWith('session-123', 'user-123', 5);
    });

    it('should correctly calculate totalPages with undefined limit', async () => {
      const pagination = { skip: 0 } as any;
      mockSessionService.findAllByUser.mockResolvedValue({
        items: [{ id: '1' }],
        total: 50,
      });

      const result = await controller.findAll(mockUser as any, pagination);

      // 50 / 20 = 2.5, ceil = 3
      expect(result.pagination.totalPages).toBe(3);
    });
  });
});
