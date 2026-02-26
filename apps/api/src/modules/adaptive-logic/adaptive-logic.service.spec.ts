import { Test, TestingModule } from '@nestjs/testing';
import { AdaptiveLogicService } from './adaptive-logic.service';
import { ConditionEvaluator } from './evaluators/condition.evaluator';
import { PrismaService } from '@libs/database';
import { QuestionType, VisibilityAction } from '@prisma/client';

describe('AdaptiveLogicService', () => {
  let service: AdaptiveLogicService;
  let prismaService: any; // Use any for mocked service
  let module: TestingModule;

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

    module = await Test.createTestingModule({
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

  afterAll(async () => {
    if (module) {
      await module.close();
    }
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

    it('should return empty arrays when no changes occur', async () => {
      const sameQuestions = [
        { ...mockQuestion, id: 'q-001', visibilityRules: [], section: { orderIndex: 1 } },
        { ...mockQuestion, id: 'q-002', visibilityRules: [], section: { orderIndex: 1 } },
      ];
      (prismaService.question.findMany as jest.Mock)
        .mockResolvedValueOnce(sameQuestions)
        .mockResolvedValueOnce(sameQuestions);

      const changes = await service.calculateAdaptiveChanges(
        'quest-001',
        new Map(),
        new Map(),
      );

      expect(changes.added).toEqual([]);
      expect(changes.removed).toEqual([]);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — evaluateQuestionState: UNREQUIRE action
  // =====================================================================
  describe('evaluateQuestionState - UNREQUIRE action', () => {
    it('should make question not required when UNREQUIRE rule condition is met', () => {
      const question = {
        ...mockQuestion,
        isRequired: true,
        visibilityRules: [
          {
            id: 'vr-001',
            questionId: 'q-000',
            condition: { field: 'q-000', operator: 'equals', value: 'skip' },
            action: VisibilityAction.UNREQUIRE,
            targetQuestionIds: ['q-001'],
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'skip']]);

      const state = service.evaluateQuestionState(question as any, responses);

      expect(state.required).toBe(false);
    });

    it('should keep required state when UNREQUIRE condition is not met', () => {
      const question = {
        ...mockQuestion,
        isRequired: true,
        visibilityRules: [
          {
            id: 'vr-001',
            questionId: 'q-000',
            condition: { field: 'q-000', operator: 'equals', value: 'skip' },
            action: VisibilityAction.UNREQUIRE,
            targetQuestionIds: ['q-001'],
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'not_skip']]);

      const state = service.evaluateQuestionState(question as any, responses);

      // Condition not met, so required stays as original isRequired
      expect(state.required).toBe(true);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — evaluateQuestionState: resolution priority
  // =====================================================================
  describe('evaluateQuestionState - resolution and priority branches', () => {
    it('should not override visibility once resolved by higher priority rule', () => {
      const question = {
        ...mockQuestion,
        visibilityRules: [
          {
            id: 'vr-001',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.HIDE,
            priority: 20,
            isActive: true,
          },
          {
            id: 'vr-002',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.SHOW,
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'test']]);

      const state = service.evaluateQuestionState(question as any, responses);

      // vr-001 (priority 20) HIDE takes precedence, vr-002 (priority 10) SHOW skipped
      expect(state.visible).toBe(false);
    });

    it('should not override required once resolved by higher priority rule', () => {
      const question = {
        ...mockQuestion,
        isRequired: false,
        visibilityRules: [
          {
            id: 'vr-001',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.REQUIRE,
            priority: 20,
            isActive: true,
          },
          {
            id: 'vr-002',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.UNREQUIRE,
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'test']]);

      const state = service.evaluateQuestionState(question as any, responses);

      // vr-001 (priority 20) REQUIRE takes precedence, vr-002 (priority 10) UNREQUIRE skipped
      expect(state.required).toBe(true);
    });

    it('should break early when both visibility and required are resolved', () => {
      const question = {
        ...mockQuestion,
        visibilityRules: [
          {
            id: 'vr-001',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.SHOW,
            priority: 30,
            isActive: true,
          },
          {
            id: 'vr-002',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.REQUIRE,
            priority: 20,
            isActive: true,
          },
          {
            id: 'vr-003',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.HIDE,
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'test']]);

      const state = service.evaluateQuestionState(question as any, responses);

      // vr-001 resolves visibility (SHOW), vr-002 resolves required (REQUIRE)
      // vr-003 should not execute (early break)
      expect(state.visible).toBe(true);
      expect(state.required).toBe(true);
    });

    it('should handle rules with null priority', () => {
      const question = {
        ...mockQuestion,
        visibilityRules: [
          {
            id: 'vr-001',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.HIDE,
            priority: null,
            isActive: true,
          },
          {
            id: 'vr-002',
            condition: { field: 'q-000', operator: 'equals', value: 'test' },
            action: VisibilityAction.SHOW,
            priority: null,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'test']]);

      const state = service.evaluateQuestionState(question as any, responses);

      // Both have null priority → sort by (0 - 0) = stable order, first one wins
      expect(state.visible).toBe(false);
    });

    it('should skip rules when condition evaluates to false', () => {
      const question = {
        ...mockQuestion,
        visibilityRules: [
          {
            id: 'vr-001',
            condition: { field: 'q-000', operator: 'equals', value: 'mismatch' },
            action: VisibilityAction.HIDE,
            priority: 10,
            isActive: true,
          },
        ],
      };
      const responses = new Map([['q-000', 'test']]);

      const state = service.evaluateQuestionState(question as any, responses);

      // Condition 'test' === 'mismatch' is false, so rule is not applied
      expect(state.visible).toBe(true); // default
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — evaluateQuestionState: undefined visibilityRules
  // =====================================================================
  describe('evaluateQuestionState - undefined visibilityRules', () => {
    it('should return default state when visibilityRules is undefined', () => {
      const question = { ...mockQuestion, isRequired: false };
      // No visibilityRules property at all
      const responses = new Map<string, unknown>();

      const state = service.evaluateQuestionState(question as any, responses);

      expect(state).toEqual({
        visible: true,
        required: false,
        disabled: false,
      });
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — getVisibleQuestions: persona filtering
  // =====================================================================
  describe('getVisibleQuestions - persona filtering', () => {
    it('should pass persona filter to prisma query when provided', async () => {
      (prismaService.question.findMany as jest.Mock).mockResolvedValue([]);

      await service.getVisibleQuestions('quest-001', new Map(), 'CTO');

      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            persona: 'CTO',
          }),
        }),
      );
    });

    it('should not include persona filter when not provided', async () => {
      (prismaService.question.findMany as jest.Mock).mockResolvedValue([]);

      await service.getVisibleQuestions('quest-001', new Map());

      const callArgs = (prismaService.question.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('persona');
    });

    it('should not include persona filter when undefined', async () => {
      (prismaService.question.findMany as jest.Mock).mockResolvedValue([]);

      await service.getVisibleQuestions('quest-001', new Map(), undefined);

      const callArgs = (prismaService.question.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('persona');
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — getNextQuestion
  // =====================================================================
  describe('getNextQuestion', () => {
    it('should return null when current question is not found', async () => {
      (prismaService.question.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getNextQuestion('non-existent', new Map());

      expect(result).toBeNull();
    });

    it('should return the next visible question in order', async () => {
      const currentQuestion = {
        ...mockQuestion,
        id: 'q-001',
        section: {
          questionnaireId: 'quest-001',
          questionnaire: { id: 'quest-001' },
          orderIndex: 1,
        },
        visibilityRules: [],
      };
      (prismaService.question.findUnique as jest.Mock).mockResolvedValue(currentQuestion);

      const visibleQuestions = [
        { ...mockQuestion, id: 'q-001', visibilityRules: [], section: { orderIndex: 1 } },
        { ...mockQuestion, id: 'q-002', visibilityRules: [], section: { orderIndex: 1 } },
        { ...mockQuestion, id: 'q-003', visibilityRules: [], section: { orderIndex: 1 } },
      ];
      (prismaService.question.findMany as jest.Mock).mockResolvedValue(visibleQuestions);

      const result = await service.getNextQuestion('q-001', new Map());

      expect(result).not.toBeNull();
      expect(result!.id).toBe('q-002');
    });

    it('should return null when current question is the last visible one', async () => {
      const currentQuestion = {
        ...mockQuestion,
        id: 'q-003',
        section: {
          questionnaireId: 'quest-001',
          questionnaire: { id: 'quest-001' },
          orderIndex: 1,
        },
        visibilityRules: [],
      };
      (prismaService.question.findUnique as jest.Mock).mockResolvedValue(currentQuestion);

      const visibleQuestions = [
        { ...mockQuestion, id: 'q-001', visibilityRules: [], section: { orderIndex: 1 } },
        { ...mockQuestion, id: 'q-002', visibilityRules: [], section: { orderIndex: 1 } },
        { ...mockQuestion, id: 'q-003', visibilityRules: [], section: { orderIndex: 1 } },
      ];
      (prismaService.question.findMany as jest.Mock).mockResolvedValue(visibleQuestions);

      const result = await service.getNextQuestion('q-003', new Map());

      expect(result).toBeNull();
    });

    it('should return null when current question is not in visible list', async () => {
      const currentQuestion = {
        ...mockQuestion,
        id: 'q-hidden',
        section: {
          questionnaireId: 'quest-001',
          questionnaire: { id: 'quest-001' },
          orderIndex: 1,
        },
        visibilityRules: [],
      };
      (prismaService.question.findUnique as jest.Mock).mockResolvedValue(currentQuestion);

      const visibleQuestions = [
        { ...mockQuestion, id: 'q-001', visibilityRules: [], section: { orderIndex: 1 } },
        { ...mockQuestion, id: 'q-002', visibilityRules: [], section: { orderIndex: 1 } },
      ];
      (prismaService.question.findMany as jest.Mock).mockResolvedValue(visibleQuestions);

      const result = await service.getNextQuestion('q-hidden', new Map());

      // currentIndex = -1 → returns null
      expect(result).toBeNull();
    });

    it('should pass persona to getVisibleQuestions', async () => {
      const currentQuestion = {
        ...mockQuestion,
        id: 'q-001',
        section: {
          questionnaireId: 'quest-001',
          questionnaire: { id: 'quest-001' },
          orderIndex: 1,
        },
        visibilityRules: [],
      };
      (prismaService.question.findUnique as jest.Mock).mockResolvedValue(currentQuestion);
      (prismaService.question.findMany as jest.Mock).mockResolvedValue([
        { ...mockQuestion, id: 'q-001', visibilityRules: [], section: { orderIndex: 1 } },
        { ...mockQuestion, id: 'q-002', visibilityRules: [], section: { orderIndex: 1 } },
      ]);

      await service.getNextQuestion('q-001', new Map(), 'CTO');

      // The findMany call (from getVisibleQuestions) should include persona
      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            persona: 'CTO',
          }),
        }),
      );
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — evaluateConditions: OR with all failing
  // =====================================================================
  describe('evaluateConditions - OR all failing', () => {
    it('should return false when all OR conditions fail', () => {
      const conditions = [
        { field: 'q1', operator: 'equals' as const, value: 'yes' },
        { field: 'q2', operator: 'equals' as const, value: 'yes' },
      ];
      const responses = new Map<string, unknown>([
        ['q1', 'no'],
        ['q2', 'no'],
      ]);

      expect(service.evaluateConditions(conditions, 'OR', responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — getRulesForQuestion
  // =====================================================================
  describe('getRulesForQuestion', () => {
    it('should query for rules targeting the specified question', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          questionId: 'q-001',
          condition: { field: 'q-000', operator: 'equals', value: 'test' },
          action: VisibilityAction.SHOW,
          targetQuestionIds: ['q-001'],
          priority: 10,
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.getRulesForQuestion('q-001');

      expect(result).toEqual(mockRules);
      expect(prismaService.visibilityRule.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ questionId: 'q-001' }, { targetQuestionIds: { has: 'q-001' } }],
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
    });

    it('should return empty array when no rules match', async () => {
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRulesForQuestion('q-no-rules');

      expect(result).toEqual([]);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — buildDependencyGraph
  // =====================================================================
  describe('buildDependencyGraph', () => {
    it('should build a graph mapping source questions to target questions', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          questionId: 'q-001',
          condition: { field: 'q-source-1', operator: 'equals', value: 'yes' },
          targetQuestionIds: ['q-target-1', 'q-target-2'],
          isActive: true,
        },
        {
          id: 'vr-002',
          questionId: 'q-002',
          condition: { field: 'q-source-1', operator: 'gt', value: 5 },
          targetQuestionIds: ['q-target-3'],
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const graph = await service.buildDependencyGraph('quest-001');

      // q-source-1 → {q-target-1, q-target-2, q-target-3}
      expect(graph.has('q-source-1')).toBe(true);
      const targets = graph.get('q-source-1')!;
      expect(targets.has('q-target-1')).toBe(true);
      expect(targets.has('q-target-2')).toBe(true);
      expect(targets.has('q-target-3')).toBe(true);
    });

    it('should handle rules with nested conditions (extracting field from first nested)', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          questionId: 'q-001',
          condition: {
            logicalOp: 'AND',
            nested: [
              { field: 'q-nested-source', operator: 'equals', value: 'yes' },
              { field: 'q-other', operator: 'gt', value: 3 },
            ],
          },
          targetQuestionIds: ['q-target-1'],
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const graph = await service.buildDependencyGraph('quest-001');

      expect(graph.has('q-nested-source')).toBe(true);
      expect(graph.get('q-nested-source')!.has('q-target-1')).toBe(true);
    });

    it('should skip rules where condition has no field and no nested conditions', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          questionId: 'q-001',
          condition: { operator: 'is_empty' }, // no field, no nested
          targetQuestionIds: ['q-target-1'],
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const graph = await service.buildDependencyGraph('quest-001');

      // No source question could be extracted, so graph should be empty
      expect(graph.size).toBe(0);
    });

    it('should return empty graph when no rules exist', async () => {
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue([]);

      const graph = await service.buildDependencyGraph('quest-001');

      expect(graph.size).toBe(0);
    });

    it('should handle multiple rules from different source questions', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          condition: { field: 'q-source-a', operator: 'equals', value: 'x' },
          targetQuestionIds: ['q-target-1'],
          isActive: true,
        },
        {
          id: 'vr-002',
          condition: { field: 'q-source-b', operator: 'equals', value: 'y' },
          targetQuestionIds: ['q-target-2'],
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const graph = await service.buildDependencyGraph('quest-001');

      expect(graph.size).toBe(2);
      expect(graph.has('q-source-a')).toBe(true);
      expect(graph.has('q-source-b')).toBe(true);
    });

    it('should merge targets when same source appears in multiple rules', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          condition: { field: 'q-source', operator: 'equals', value: 'x' },
          targetQuestionIds: ['q-target-1'],
          isActive: true,
        },
        {
          id: 'vr-002',
          condition: { field: 'q-source', operator: 'gt', value: 5 },
          targetQuestionIds: ['q-target-2'],
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const graph = await service.buildDependencyGraph('quest-001');

      expect(graph.size).toBe(1);
      const targets = graph.get('q-source')!;
      expect(targets.size).toBe(2);
      expect(targets.has('q-target-1')).toBe(true);
      expect(targets.has('q-target-2')).toBe(true);
    });

    it('should handle deeply nested conditions by extracting first nested field recursively', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          condition: {
            logicalOp: 'OR',
            nested: [
              {
                logicalOp: 'AND',
                nested: [
                  { field: 'q-deep-source', operator: 'equals', value: 'yes' },
                ],
              },
            ],
          },
          targetQuestionIds: ['q-target-1'],
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const graph = await service.buildDependencyGraph('quest-001');

      expect(graph.has('q-deep-source')).toBe(true);
    });

    it('should handle nested condition with empty nested array', async () => {
      const mockRules = [
        {
          id: 'vr-001',
          condition: {
            logicalOp: 'AND',
            nested: [],
          },
          targetQuestionIds: ['q-target-1'],
          isActive: true,
        },
      ];
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue(mockRules);

      const graph = await service.buildDependencyGraph('quest-001');

      // Empty nested → extractQuestionIdFromCondition returns null → skip
      expect(graph.size).toBe(0);
    });

    it('should query with correct where clause for questionnaire', async () => {
      (prismaService.visibilityRule.findMany as jest.Mock).mockResolvedValue([]);

      await service.buildDependencyGraph('quest-123');

      expect(prismaService.visibilityRule.findMany).toHaveBeenCalledWith({
        where: {
          question: {
            section: {
              questionnaireId: 'quest-123',
            },
          },
          isActive: true,
        },
      });
    });
  });
});
