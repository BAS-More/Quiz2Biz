import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminQuestionnaireService } from '../services/admin-questionnaire.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { PrismaService } from '@libs/database';
import { QuestionType } from '@prisma/client';

describe('AdminQuestionnaireService', () => {
  let service: AdminQuestionnaireService;
  let prismaService: any; // Use any for mocked Prisma service
  let auditService: jest.Mocked<AdminAuditService>;

  const mockUserId = 'user-123';

  const mockQuestionnaire = {
    id: 'questionnaire-1',
    name: 'Test Questionnaire',
    description: 'A test questionnaire',
    industry: 'technology',
    version: 1,
    isActive: true,
    isDefault: false,
    estimatedTime: 30,
    metadata: {},
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
  };

  const mockSection = {
    id: 'section-1',
    questionnaireId: 'questionnaire-1',
    name: 'Test Section',
    description: 'A test section',
    orderIndex: 0,
    icon: 'briefcase',
    estimatedTime: 10,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuestion = {
    id: 'question-1',
    sectionId: 'section-1',
    text: 'What is your company name?',
    type: QuestionType.TEXT,
    helpText: 'Enter the legal name',
    explanation: null,
    placeholder: 'e.g., Acme Corp',
    orderIndex: 0,
    isRequired: true,
    options: null,
    validationRules: null,
    defaultValue: null,
    suggestedAnswer: null,
    industryTags: [],
    documentMappings: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      questionnaire: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      section: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      question: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      visibilityRule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminQuestionnaireService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdminAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AdminQuestionnaireService>(AdminQuestionnaireService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AdminAuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // QUESTIONNAIRE TESTS
  // ==========================================================================

  describe('findAllQuestionnaires', () => {
    it('should return paginated questionnaires', async () => {
      prismaService.questionnaire.findMany.mockResolvedValue([mockQuestionnaire]);
      prismaService.questionnaire.count.mockResolvedValue(1);

      const result = await service.findAllQuestionnaires({ page: 1, limit: 20, skip: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaService.questionnaire.findMany).toHaveBeenCalled();
    });
  });

  describe('findQuestionnaireById', () => {
    it('should return questionnaire with details', async () => {
      const questionnaireWithDetails = {
        ...mockQuestionnaire,
        sections: [
          {
            ...mockSection,
            questions: [{ ...mockQuestion, visibilityRules: [] }],
          },
        ],
        _count: { sessions: 5 },
      };
      prismaService.questionnaire.findUnique.mockResolvedValue(questionnaireWithDetails);

      const result = await service.findQuestionnaireById('questionnaire-1');

      expect(result.id).toBe('questionnaire-1');
      expect(result.sections).toHaveLength(1);
      expect(result._count.sessions).toBe(5);
    });

    it('should throw NotFoundException when questionnaire not found', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(null);

      await expect(service.findQuestionnaireById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createQuestionnaire', () => {
    it('should create questionnaire and log audit', async () => {
      prismaService.questionnaire.create.mockResolvedValue(mockQuestionnaire);

      const dto = {
        name: 'Test Questionnaire',
        description: 'A test questionnaire',
        industry: 'technology',
      };
      const result = await service.createQuestionnaire(dto, mockUserId);

      expect(result.name).toBe('Test Questionnaire');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'CREATE_QUESTIONNAIRE',
          resourceType: 'Questionnaire',
        }),
      );
    });
  });

  describe('updateQuestionnaire', () => {
    it('should update questionnaire and log audit', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire);
      prismaService.questionnaire.update.mockResolvedValue({
        ...mockQuestionnaire,
        name: 'Updated Name',
      });

      const result = await service.updateQuestionnaire(
        'questionnaire-1',
        { name: 'Updated Name' },
        mockUserId,
      );

      expect(result.name).toBe('Updated Name');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_QUESTIONNAIRE',
          changes: expect.objectContaining({ before: mockQuestionnaire }),
        }),
      );
    });

    it('should throw NotFoundException when questionnaire not found', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(null);

      await expect(
        service.updateQuestionnaire('invalid-id', { name: 'Test' }, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // SECTION TESTS
  // ==========================================================================

  describe('createSection', () => {
    it('should create section with auto-calculated orderIndex', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue({
        ...mockQuestionnaire,
        sections: [{ orderIndex: 0 }, { orderIndex: 1 }],
      });
      prismaService.section.create.mockResolvedValue({
        ...mockSection,
        orderIndex: 2,
      });

      const dto = { name: 'New Section' };
      const result = await service.createSection('questionnaire-1', dto, mockUserId);

      expect(result.orderIndex).toBe(2);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when questionnaire not found', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(null);

      await expect(
        service.createSection('invalid-id', { name: 'Test' }, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSection', () => {
    it('should delete section with no questions', async () => {
      prismaService.section.findUnique.mockResolvedValue({
        ...mockSection,
        _count: { questions: 0 },
      });
      prismaService.section.delete.mockResolvedValue(mockSection);

      await service.deleteSection('section-1', mockUserId);

      expect(prismaService.section.delete).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException when section has questions', async () => {
      prismaService.section.findUnique.mockResolvedValue({
        ...mockSection,
        _count: { questions: 5 },
      });

      await expect(service.deleteSection('section-1', mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // QUESTION TESTS
  // ==========================================================================

  describe('createQuestion', () => {
    it('should create question with auto-calculated orderIndex', async () => {
      prismaService.section.findUnique.mockResolvedValue({
        ...mockSection,
        questions: [{ orderIndex: 0 }],
      });
      prismaService.question.create.mockResolvedValue({
        ...mockQuestion,
        orderIndex: 1,
      });

      const dto = {
        text: 'New question?',
        type: QuestionType.TEXT,
      };
      const result = await service.createQuestion('section-1', dto, mockUserId);

      expect(result.orderIndex).toBe(1);
      expect(auditService.log).toHaveBeenCalled();
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question with no responses', async () => {
      prismaService.question.findUnique.mockResolvedValue({
        ...mockQuestion,
        _count: { responses: 0 },
      });
      prismaService.question.delete.mockResolvedValue(mockQuestion);

      await service.deleteQuestion('question-1', mockUserId);

      expect(prismaService.question.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException when question has responses', async () => {
      prismaService.question.findUnique.mockResolvedValue({
        ...mockQuestion,
        _count: { responses: 10 },
      });

      await expect(service.deleteQuestion('question-1', mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // REORDER TESTS
  // ==========================================================================

  describe('reorderSections', () => {
    it('should reorder sections using transaction', async () => {
      prismaService.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire);
      prismaService.section.update.mockResolvedValue(mockSection);

      const dto = {
        items: [
          { id: 'section-1', orderIndex: 1 },
          { id: 'section-2', orderIndex: 0 },
        ],
      };
      await service.reorderSections('questionnaire-1', dto, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REORDER_SECTIONS' }),
      );
    });
  });

  describe('reorderQuestions', () => {
    it('should reorder questions using transaction', async () => {
      prismaService.section.findUnique.mockResolvedValue(mockSection);
      prismaService.question.update.mockResolvedValue(mockQuestion);

      const dto = {
        items: [
          { id: 'question-1', orderIndex: 2 },
          { id: 'question-2', orderIndex: 0 },
        ],
      };
      await service.reorderQuestions('section-1', dto, mockUserId);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REORDER_QUESTIONS' }),
      );
    });
  });
});
