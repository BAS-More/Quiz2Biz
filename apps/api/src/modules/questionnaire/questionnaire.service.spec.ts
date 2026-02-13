import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { PrismaService } from '@libs/database';
import { QuestionType } from '@prisma/client';

describe('QuestionnaireService', () => {
  let service: QuestionnaireService;
  let prismaService: any; // Use any for mocked service

  const mockQuestionnaire = {
    id: 'questionnaire-1',
    name: 'Test Questionnaire',
    description: 'A test questionnaire',
    industry: 'tech',
    version: 1,
    isActive: true,
    isDefault: false,
    estimatedTime: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: null,
    sections: [
      {
        id: 'section-1',
        name: 'Section 1',
        description: 'First section',
        orderIndex: 0,
        icon: 'icon-1',
        estimatedTime: 10,
        questionnaireId: 'questionnaire-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
          {
            id: 'q1',
            text: 'Question 1',
            type: QuestionType.TEXT,
            isRequired: true,
            helpText: 'Help text',
            explanation: null,
            placeholder: 'Enter here',
            options: null,
            validationRules: { maxLength: 500 },
            orderIndex: 0,
            sectionId: 'section-1',
            visibilityRules: [],
          },
          {
            id: 'q2',
            text: 'Question 2',
            type: QuestionType.SINGLE_CHOICE,
            isRequired: false,
            helpText: null,
            explanation: 'Explanation',
            placeholder: null,
            options: [
              { id: 'opt1', label: 'Option 1' },
              { id: 'opt2', label: 'Option 2' },
            ],
            validationRules: null,
            orderIndex: 1,
            sectionId: 'section-1',
            visibilityRules: [],
          },
        ],
        _count: { questions: 2 },
      },
    ],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      questionnaire: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      question: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionnaireService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<QuestionnaireService>(QuestionnaireService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated questionnaires', async () => {
      prismaService.questionnaire.findMany.mockResolvedValue([mockQuestionnaire] as any);
      prismaService.questionnaire.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, skip: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('questionnaire-1');
      expect(result.items[0].totalQuestions).toBe(2);
    });

    it('should filter by industry when provided', async () => {
      prismaService.questionnaire.findMany.mockResolvedValue([]);
      prismaService.questionnaire.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, skip: 0 }, 'healthcare');

      expect(prismaService.questionnaire.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, industry: 'healthcare' },
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      prismaService.questionnaire.findMany.mockResolvedValue([]);
      prismaService.questionnaire.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 5, skip: 5 });

      expect(prismaService.questionnaire.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should calculate total questions across sections', async () => {
      const multiSectionQuestionnaire = {
        ...mockQuestionnaire,
        sections: [
          { ...mockQuestionnaire.sections[0], _count: { questions: 3 } },
          { id: 'section-2', name: 'Section 2', _count: { questions: 5 } },
        ],
      };
      prismaService.questionnaire.findMany.mockResolvedValue([multiSectionQuestionnaire] as any);
      prismaService.questionnaire.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, skip: 0 });

      expect(result.items[0].totalQuestions).toBe(8);
    });
  });

  describe('findById', () => {
    it('should return questionnaire detail with sections and questions', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire as any);

      const result = await service.findById('questionnaire-1');

      expect(result.id).toBe('questionnaire-1');
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].questions).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent questionnaire', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should map question options correctly', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire as any);

      const result = await service.findById('questionnaire-1');

      const choiceQuestion = result.sections[0].questions?.find(
        (q) => q.type === QuestionType.SINGLE_CHOICE,
      );
      expect(choiceQuestion?.options).toHaveLength(2);
      expect(choiceQuestion?.options?.[0].label).toBe('Option 1');
    });

    it('should map validation rules correctly', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire as any);

      const result = await service.findById('questionnaire-1');

      const textQuestion = result.sections[0].questions?.find((q) => q.type === QuestionType.TEXT);
      expect(textQuestion?.validation).toEqual({ maxLength: 500 });
    });
  });

  describe('getDefaultQuestionnaire', () => {
    it('should return default questionnaire when exists', async () => {
      const defaultQuestionnaire = { ...mockQuestionnaire, isDefault: true };
      prismaService.questionnaire.findFirst.mockResolvedValue(defaultQuestionnaire as any);

      const result = await service.getDefaultQuestionnaire();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('questionnaire-1');
      expect(prismaService.questionnaire.findFirst).toHaveBeenCalledWith({
        where: { isDefault: true, isActive: true },
        include: expect.any(Object),
      });
    });

    it('should return null when no default questionnaire exists', async () => {
      prismaService.questionnaire.findFirst.mockResolvedValue(null);

      const result = await service.getDefaultQuestionnaire();

      expect(result).toBeNull();
    });
  });

  describe('getQuestionById', () => {
    const mockQuestion = {
      id: 'q1',
      text: 'Question 1',
      type: QuestionType.TEXT,
      sectionId: 'section-1',
      visibilityRules: [],
      section: {
        id: 'section-1',
        questionnaire: mockQuestionnaire,
      },
    };

    it('should return question with visibility rules', async () => {
      prismaService.question.findUnique.mockResolvedValue(mockQuestion as any);

      const result = await service.getQuestionById('q1');

      expect(result?.id).toBe('q1');
      expect(prismaService.question.findUnique).toHaveBeenCalledWith({
        where: { id: 'q1' },
        include: {
          visibilityRules: true,
          section: {
            include: {
              questionnaire: true,
            },
          },
        },
      });
    });

    it('should return null for non-existent question', async () => {
      prismaService.question.findUnique.mockResolvedValue(null);

      const result = await service.getQuestionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getQuestionsBySection', () => {
    it('should return questions ordered by index', async () => {
      const questions = [
        { id: 'q1', orderIndex: 0 },
        { id: 'q2', orderIndex: 1 },
      ];
      prismaService.question.findMany.mockResolvedValue(questions as any);

      const result = await service.getQuestionsBySection('section-1');

      expect(result).toHaveLength(2);
      expect(prismaService.question.findMany).toHaveBeenCalledWith({
        where: { sectionId: 'section-1' },
        orderBy: { orderIndex: 'asc' },
        include: { visibilityRules: true },
      });
    });

    it('should return empty array for section with no questions', async () => {
      prismaService.question.findMany.mockResolvedValue([]);

      const result = await service.getQuestionsBySection('empty-section');

      expect(result).toHaveLength(0);
    });
  });

  describe('getTotalQuestionCount', () => {
    it('should return total question count for questionnaire', async () => {
      prismaService.question.count.mockResolvedValue(15);

      const result = await service.getTotalQuestionCount('questionnaire-1');

      expect(result).toBe(15);
      expect(prismaService.question.count).toHaveBeenCalledWith({
        where: {
          section: {
            questionnaireId: 'questionnaire-1',
          },
        },
      });
    });

    it('should return 0 for questionnaire with no questions', async () => {
      prismaService.question.count.mockResolvedValue(0);

      const result = await service.getTotalQuestionCount('empty-questionnaire');

      expect(result).toBe(0);
    });
  });

  describe('mapToListItem', () => {
    it('should handle null description', async () => {
      const questionnaireWithNulls = {
        ...mockQuestionnaire,
        description: null,
        industry: null,
        estimatedTime: null,
      };
      prismaService.questionnaire.findMany.mockResolvedValue([questionnaireWithNulls] as any);
      prismaService.questionnaire.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, skip: 0 });

      expect(result.items[0].description).toBeUndefined();
      expect(result.items[0].industry).toBeUndefined();
      expect(result.items[0].estimatedTime).toBeUndefined();
    });
  });

  describe('mapToDetail', () => {
    it('should map all section properties', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire as any);

      const result = await service.findById('questionnaire-1');

      expect(result.sections[0].name).toBe('Section 1');
      expect(result.sections[0].description).toBe('First section');
      expect(result.sections[0].order).toBe(0);
      expect(result.sections[0].icon).toBe('icon-1');
      expect(result.sections[0].estimatedTime).toBe(10);
      expect(result.sections[0].questionCount).toBe(2);
    });

    it('should handle sections with null optional fields', async () => {
      const sectionWithNulls = {
        ...mockQuestionnaire,
        sections: [
          {
            ...mockQuestionnaire.sections[0],
            description: null,
            icon: null,
            estimatedTime: null,
          },
        ],
      };
      prismaService.questionnaire.findUnique.mockResolvedValue(sectionWithNulls as any);

      const result = await service.findById('questionnaire-1');

      expect(result.sections[0].description).toBeUndefined();
      expect(result.sections[0].icon).toBeUndefined();
      expect(result.sections[0].estimatedTime).toBeUndefined();
    });
  });

  describe('mapQuestion', () => {
    it('should map all question properties', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire as any);

      const result = await service.findById('questionnaire-1');
      const question = result.sections[0].questions?.[0];

      expect(question?.id).toBe('q1');
      expect(question?.text).toBe('Question 1');
      expect(question?.type).toBe(QuestionType.TEXT);
      expect(question?.required).toBe(true);
      expect(question?.helpText).toBe('Help text');
      expect(question?.placeholder).toBe('Enter here');
    });

    it('should handle null optional question fields', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire as any);

      const result = await service.findById('questionnaire-1');
      const question = result.sections[0].questions?.[0];

      // explanation is null in mock
      expect(question?.explanation).toBeUndefined();
    });
  });
});
