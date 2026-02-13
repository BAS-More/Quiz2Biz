import { Test, TestingModule } from '@nestjs/testing';
import { AdaptiveLogicService } from './adaptive-logic.service';
import { ConditionEvaluator } from './evaluators/condition.evaluator';
import { PrismaService } from '@libs/database';
import { QuestionType, VisibilityAction } from '@prisma/client';

describe('AdaptiveLogicService', () => {
  let service: AdaptiveLogicService;
  let prismaService: any; // Use any for mocked service

  const mockQuestion = {
    id: 'q-001',
    sectionId: 'sec-001',
    text: 'Test question',
    type: QuestionType.TEXT,
    isRequired: false,
    orderIndex: 1,
    visibilityRules: [],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      question: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      visibilityRule: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdaptiveLogicService,
        ConditionEvaluator,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdaptiveLogicService>(AdaptiveLogicService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateQuestionState', () => {
    it('should return default state when no visibility rules', () => {
      const question = { ...mockQuestion, isRequired: true, visibilityRules: [] };
      const responses = new Map<string, unknown>();

      const state = service.evaluateQuestionState(question as any, responses);

      expect(state).toEqual({
        visible: true,
        required: true,
        disabled: false,
      });
    });

    it('should hide question when HIDE rule condition is met', () => {
      const question = {
        ...mockQuestion,
        visibilityRules: [
          {
            id: 'vr-001',
            questionId: 'q-000',
            condition: { field: 'q-000', operator: 'equals', value: 'other' },
            action: VisibilityAction.HIDE,
            targetQuestionIds: ['q-001'],
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'other']]);

      const state = service.evaluateQuestionState(question as any, responses);

      expect(state.visible).toBe(false);
    });

    it('should show question when SHOW rule condition is met', () => {
      const question = {
        ...mockQuestion,
        visibilityRules: [
          {
            id: 'vr-001',
            questionId: 'q-000',
            condition: { field: 'q-000', operator: 'equals', value: 'specific' },
            action: VisibilityAction.SHOW,
            targetQuestionIds: ['q-001'],
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'specific']]);

      const state = service.evaluateQuestionState(question as any, responses);

      expect(state.visible).toBe(true);
    });

    it('should make question required when REQUIRE rule condition is met', () => {
      const question = {
        ...mockQuestion,
        isRequired: false,
        visibilityRules: [
          {
            id: 'vr-001',
            questionId: 'q-000',
            condition: { field: 'q-000', operator: 'includes', value: 'phi' },
            action: VisibilityAction.REQUIRE,
            targetQuestionIds: ['q-001'],
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', { selectedOptionIds: ['phi', 'pii'] }]]);

      const state = service.evaluateQuestionState(question as any, responses);

      expect(state.required).toBe(true);
    });

    it('should apply rules in priority order', () => {
      const question = {
        ...mockQuestion,
        visibilityRules: [
          {
            id: 'vr-001',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.SHOW,
            priority: 10,
            isActive: true,
          },
          {
            id: 'vr-002',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.HIDE,
            priority: 5,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'test']]);

      const state = service.evaluateQuestionState(question as any, responses);

      // Higher priority (10) wins, so SHOW
      expect(state.visible).toBe(true);
    });
  });

  describe('getVisibleQuestions', () => {
    it('should return all questions when no visibility rules', async () => {
      const mockQuestions = [
        {
          ...mockQuestion,
          id: 'q-001',
          orderIndex: 1,
          visibilityRules: [],
          section: { orderIndex: 1 },
        },
        {
          ...mockQuestion,
          id: 'q-002',
          orderIndex: 2,
          visibilityRules: [],
          section: { orderIndex: 1 },
        },
        {
          ...mockQuestion,
          id: 'q-003',
          orderIndex: 3,
          visibilityRules: [],
          section: { orderIndex: 1 },
        },
      ];

      (prismaService.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const responses = new Map<string, unknown>();
      const visible = await service.getVisibleQuestions('quest-001', responses);

      expect(visible).toHaveLength(3);
      expect(visible.map((q) => q.id)).toEqual(['q-001', 'q-002', 'q-003']);
    });

    it('should filter out hidden questions', async () => {
      const mockQuestions = [
        {
          ...mockQuestion,
          id: 'q-001',
          orderIndex: 1,
          visibilityRules: [],
          section: { orderIndex: 1 },
        },
        {
          ...mockQuestion,
          id: 'q-002',
          orderIndex: 2,
          section: { orderIndex: 1 },
          visibilityRules: [
            {
              id: 'vr-001',
              condition: { field: 'q-001', operator: 'ne', value: 'other' },
              action: VisibilityAction.HIDE,
              priority: 10,
              isActive: true,
            },
          ],
        },
        {
          ...mockQuestion,
          id: 'q-003',
          orderIndex: 3,
          visibilityRules: [],
          section: { orderIndex: 1 },
        },
      ];

      (prismaService.question.findMany as jest.Mock).mockResolvedValue(mockQuestions);

      const responses = new Map([['q-001', 'something_else']]);
      const visible = await service.getVisibleQuestions('quest-001', responses);

      expect(visible).toHaveLength(2);
      expect(visible.map((q) => q.id)).toEqual(['q-001', 'q-003']);
    });
  });

  describe('evaluateCondition', () => {
    it('should delegate to ConditionEvaluator', () => {
      const condition = { field: 'q1', operator: 'equals' as const, value: 'test' };
      const responses = new Map([['q1', 'test']]);

      const result = service.evaluateCondition(condition, responses);

      expect(result).toBe(true);
    });
  });

  describe('evaluateConditions', () => {
    it('should return true when all AND conditions pass', () => {
      const conditions = [
        { field: 'q1', operator: 'equals' as const, value: 'yes' },
        { field: 'q2', operator: 'equals' as const, value: 'no' },
      ];
      const responses = new Map<string, unknown>([
        ['q1', 'yes'],
        ['q2', 'no'],
      ]);

      expect(service.evaluateConditions(conditions, 'AND', responses)).toBe(true);
    });

    it('should return false when any AND condition fails', () => {
      const conditions = [
        { field: 'q1', operator: 'equals' as const, value: 'yes' },
        { field: 'q2', operator: 'equals' as const, value: 'no' },
      ];
      const responses = new Map<string, unknown>([
        ['q1', 'yes'],
        ['q2', 'yes'],
      ]);

      expect(service.evaluateConditions(conditions, 'AND', responses)).toBe(false);
    });

    it('should return true when any OR condition passes', () => {
      const conditions = [
        { field: 'q1', operator: 'equals' as const, value: 'yes' },
        { field: 'q2', operator: 'equals' as const, value: 'no' },
      ];
      const responses = new Map<string, unknown>([
        ['q1', 'no'],
        ['q2', 'no'],
      ]);

      expect(service.evaluateConditions(conditions, 'OR', responses)).toBe(true);
    });

    it('should return true for empty conditions array', () => {
      const responses = new Map<string, unknown>();

      expect(service.evaluateConditions([], 'AND', responses)).toBe(true);
      expect(service.evaluateConditions([], 'OR', responses)).toBe(true);
    });
  });

  describe('calculateAdaptiveChanges', () => {
    it('should identify added and removed questions', async () => {
      // First call - initial visible questions
      (prismaService.question.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { ...mockQuestion, id: 'q-001', visibilityRules: [], section: { orderIndex: 1 } },
          { ...mockQuestion, id: 'q-002', visibilityRules: [], section: { orderIndex: 1 } },
        ])
        // Second call - after response changes
        .mockResolvedValueOnce([
          { ...mockQuestion, id: 'q-001', visibilityRules: [], section: { orderIndex: 1 } },
          { ...mockQuestion, id: 'q-003', visibilityRules: [], section: { orderIndex: 1 } },
        ]);

      const previousResponses = new Map<string, unknown>();
      const currentResponses = new Map([['q-001', 'other']]);

      const changes = await service.calculateAdaptiveChanges(
        'quest-001',
        previousResponses,
        currentResponses,
      );

      expect(changes.added).toContain('q-003');
      expect(changes.removed).toContain('q-002');
    });
  });
});
