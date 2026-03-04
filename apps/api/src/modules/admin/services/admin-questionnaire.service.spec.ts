/**
 * Admin Questionnaire Service Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import {
  AdminQuestionnaireService,
  PaginatedResult,
  QuestionnaireWithDetails,
} from './admin-questionnaire.service';
import { AdminAuditService } from './admin-audit.service';
import { QuestionType } from '@prisma/client';

describe('AdminQuestionnaireService', () => {
  let service: AdminQuestionnaireService;
  let prismaService: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AdminAuditService>;

  const mockQuestionnaire = {
    id: 'quest-1',
    name: 'Test Questionnaire',
    description: 'Test description',
    industry: 'technology',
    isDefault: false,
    isActive: true,
    estimatedTime: 30,
    metadata: {},
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSection = {
    id: 'section-1',
    questionnaireId: 'quest-1',
    name: 'Test Section',
    description: 'Section description',
    icon: 'icon',
    estimatedTime: 10,
    orderIndex: 0,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuestion = {
    id: 'question-1',
    sectionId: 'section-1',
    text: 'Test question?',
    type: QuestionType.TEXT,
    helpText: 'Help text',
    explanation: 'Explanation',
    placeholder: 'Enter answer',
    isRequired: true,
    options: null,
    validationRules: null,
    defaultValue: null,
    suggestedAnswer: null,
    industryTags: ['technology'],
    documentMappings: {},
    orderIndex: 0,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVisibilityRule = {
    id: 'rule-1',
    questionId: 'question-1',
    condition: { type: 'equals', value: 'yes' },
    action: 'SHOW',
    targetQuestionIds: ['question-2'],
    priority: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      questionnaire: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
      $transaction: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminQuestionnaireService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AdminAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AdminQuestionnaireService>(AdminQuestionnaireService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AdminAuditService);
  });

  describe('Questionnaire CRUD', () => {
    describe('findAllQuestionnaires', () => {
      it('should return paginated questionnaires', async () => {
        prismaService.questionnaire.findMany = jest.fn().mockResolvedValue([mockQuestionnaire]);
        prismaService.questionnaire.count = jest.fn().mockResolvedValue(1);

        const result = await service.findAllQuestionnaires({ page: 1, limit: 10, skip: 0 });

        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(prismaService.questionnaire.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 10,
          }),
        );
      });

      it('should handle pagination correctly', async () => {
        prismaService.questionnaire.findMany = jest.fn().mockResolvedValue([]);
        prismaService.questionnaire.count = jest.fn().mockResolvedValue(0);

        const result = await service.findAllQuestionnaires({ page: 2, limit: 5, skip: 5 });

        expect(result.items).toHaveLength(0);
        expect(prismaService.questionnaire.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 5,
            take: 5,
          }),
        );
      });
    });

    describe('findQuestionnaireById', () => {
      it('should return questionnaire with details', async () => {
        const detailedQuestionnaire = {
          ...mockQuestionnaire,
          sections: [
            {
              ...mockSection,
              questions: [{ ...mockQuestion, visibilityRules: [] }],
            },
          ],
          _count: { sessions: 5 },
        };

        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(detailedQuestionnaire);

        const result = await service.findQuestionnaireById('quest-1');

        expect(result).toEqual(detailedQuestionnaire);
        expect(prismaService.questionnaire.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'quest-1' },
          }),
        );
      });

      it('should throw NotFoundException when questionnaire not found', async () => {
        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(null);

        await expect(service.findQuestionnaireById('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('createQuestionnaire', () => {
      it('should create questionnaire', async () => {
        prismaService.questionnaire.create = jest.fn().mockResolvedValue(mockQuestionnaire);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.createQuestionnaire(
          {
            name: 'Test Questionnaire',
            description: 'Test description',
            industry: 'technology',
          },
          'user-1',
        );

        expect(result).toEqual(mockQuestionnaire);
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CREATE_QUESTIONNAIRE',
            userId: 'user-1',
          }),
        );
      });
    });

    describe('updateQuestionnaire', () => {
      it('should update questionnaire', async () => {
        const updatedQuestionnaire = { ...mockQuestionnaire, name: 'Updated Name' };
        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(mockQuestionnaire);
        prismaService.questionnaire.update = jest.fn().mockResolvedValue(updatedQuestionnaire);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.updateQuestionnaire(
          'quest-1',
          { name: 'Updated Name' },
          'user-1',
        );

        expect(result.name).toBe('Updated Name');
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'UPDATE_QUESTIONNAIRE',
          }),
        );
      });

      it('should throw NotFoundException when questionnaire not found', async () => {
        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.updateQuestionnaire('non-existent', { name: 'New Name' }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteQuestionnaire', () => {
      it('should soft delete questionnaire', async () => {
        const questionnaireWithCount = { ...mockQuestionnaire, _count: { sessions: 5 } };
        prismaService.questionnaire.findUnique = jest
          .fn()
          .mockResolvedValue(questionnaireWithCount);
        prismaService.questionnaire.update = jest.fn().mockResolvedValue({
          ...mockQuestionnaire,
          isActive: false,
        });
        auditService.log = jest.fn().mockResolvedValue(undefined);

        await service.deleteQuestionnaire('quest-1', 'user-1');

        expect(prismaService.questionnaire.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { isActive: false },
          }),
        );
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'DELETE_QUESTIONNAIRE',
          }),
        );
      });

      it('should throw NotFoundException when questionnaire not found', async () => {
        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(null);

        await expect(service.deleteQuestionnaire('non-existent', 'user-1')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Section CRUD', () => {
    describe('createSection', () => {
      it('should create section with auto-calculated orderIndex', async () => {
        const questionnaireWithSections = {
          ...mockQuestionnaire,
          sections: [{ orderIndex: 0 }, { orderIndex: 1 }],
        };

        prismaService.questionnaire.findUnique = jest
          .fn()
          .mockResolvedValue(questionnaireWithSections);
        prismaService.section.create = jest
          .fn()
          .mockResolvedValue({ ...mockSection, orderIndex: 2 });
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.createSection(
          'quest-1',
          { name: 'New Section', description: 'Desc' },
          'user-1',
        );

        expect(result.orderIndex).toBe(2);
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CREATE_SECTION',
          }),
        );
      });

      it('should throw NotFoundException when questionnaire not found', async () => {
        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.createSection('non-existent', { name: 'Section' }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateSection', () => {
      it('should update section', async () => {
        const updatedSection = { ...mockSection, name: 'Updated Section' };
        prismaService.section.findUnique = jest.fn().mockResolvedValue(mockSection);
        prismaService.section.update = jest.fn().mockResolvedValue(updatedSection);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.updateSection(
          'section-1',
          { name: 'Updated Section' },
          'user-1',
        );

        expect(result.name).toBe('Updated Section');
      });

      it('should throw NotFoundException when section not found', async () => {
        prismaService.section.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.updateSection('non-existent', { name: 'New Name' }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteSection', () => {
      it('should delete section without questions', async () => {
        const sectionWithCount = { ...mockSection, _count: { questions: 0 } };
        prismaService.section.findUnique = jest.fn().mockResolvedValue(sectionWithCount);
        prismaService.section.delete = jest.fn().mockResolvedValue(mockSection);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        await service.deleteSection('section-1', 'user-1');

        expect(prismaService.section.delete).toHaveBeenCalled();
      });

      it('should throw BadRequestException when section has questions', async () => {
        const sectionWithQuestions = { ...mockSection, _count: { questions: 5 } };
        prismaService.section.findUnique = jest.fn().mockResolvedValue(sectionWithQuestions);

        await expect(service.deleteSection('section-1', 'user-1')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException when section not found', async () => {
        prismaService.section.findUnique = jest.fn().mockResolvedValue(null);

        await expect(service.deleteSection('non-existent', 'user-1')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('reorderSections', () => {
      it('should reorder sections', async () => {
        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(mockQuestionnaire);
        prismaService.$transaction = jest.fn().mockResolvedValue([
          { ...mockSection, orderIndex: 1 },
          { ...mockSection, id: 'section-2', orderIndex: 0 },
        ]);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.reorderSections(
          'quest-1',
          {
            items: [
              { id: 'section-1', orderIndex: 1 },
              { id: 'section-2', orderIndex: 0 },
            ],
          },
          'user-1',
        );

        expect(result).toHaveLength(2);
      });

      it('should throw NotFoundException when questionnaire not found', async () => {
        prismaService.questionnaire.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.reorderSections('non-existent', { items: [] }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Question CRUD', () => {
    describe('createQuestion', () => {
      it('should create question', async () => {
        const sectionWithQuestions = {
          ...mockSection,
          questions: [{ orderIndex: 0 }],
        };

        prismaService.section.findUnique = jest.fn().mockResolvedValue(sectionWithQuestions);
        prismaService.question.create = jest.fn().mockResolvedValue(mockQuestion);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.createQuestion(
          'section-1',
          {
            text: 'Test question?',
            type: QuestionType.TEXT,
          },
          'user-1',
        );

        expect(result).toEqual(mockQuestion);
      });

      it('should throw NotFoundException when section not found', async () => {
        prismaService.section.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.createQuestion('non-existent', { text: 'Q', type: QuestionType.TEXT }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateQuestion', () => {
      it('should update question', async () => {
        const updatedQuestion = { ...mockQuestion, text: 'Updated question?' };
        prismaService.question.findUnique = jest.fn().mockResolvedValue(mockQuestion);
        prismaService.question.update = jest.fn().mockResolvedValue(updatedQuestion);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.updateQuestion(
          'question-1',
          { text: 'Updated question?' },
          'user-1',
        );

        expect(result.text).toBe('Updated question?');
      });

      it('should throw NotFoundException when question not found', async () => {
        prismaService.question.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.updateQuestion('non-existent', { text: 'New text' }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteQuestion', () => {
      it('should delete question without responses', async () => {
        const questionWithCount = { ...mockQuestion, _count: { responses: 0 } };
        prismaService.question.findUnique = jest.fn().mockResolvedValue(questionWithCount);
        prismaService.question.delete = jest.fn().mockResolvedValue(mockQuestion);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        await service.deleteQuestion('question-1', 'user-1');

        expect(prismaService.question.delete).toHaveBeenCalled();
      });

      it('should throw BadRequestException when question has responses', async () => {
        const questionWithResponses = { ...mockQuestion, _count: { responses: 10 } };
        prismaService.question.findUnique = jest.fn().mockResolvedValue(questionWithResponses);

        await expect(service.deleteQuestion('question-1', 'user-1')).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('reorderQuestions', () => {
      it('should reorder questions', async () => {
        prismaService.section.findUnique = jest.fn().mockResolvedValue(mockSection);
        prismaService.$transaction = jest.fn().mockResolvedValue([mockQuestion]);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.reorderQuestions(
          'section-1',
          { items: [{ id: 'question-1', orderIndex: 0 }] },
          'user-1',
        );

        expect(result).toHaveLength(1);
      });

      it('should throw NotFoundException when section not found', async () => {
        prismaService.section.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.reorderQuestions('non-existent', { items: [] }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Visibility Rule CRUD', () => {
    describe('findRulesByQuestion', () => {
      it('should return visibility rules for question', async () => {
        prismaService.question.findUnique = jest.fn().mockResolvedValue(mockQuestion);
        prismaService.visibilityRule.findMany = jest.fn().mockResolvedValue([mockVisibilityRule]);

        const result = await service.findRulesByQuestion('question-1');

        expect(result).toHaveLength(1);
      });

      it('should throw NotFoundException when question not found', async () => {
        prismaService.question.findUnique = jest.fn().mockResolvedValue(null);

        await expect(service.findRulesByQuestion('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('createVisibilityRule', () => {
      it('should create visibility rule', async () => {
        prismaService.question.findUnique = jest.fn().mockResolvedValue(mockQuestion);
        prismaService.visibilityRule.create = jest.fn().mockResolvedValue(mockVisibilityRule);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.createVisibilityRule(
          'question-1',
          {
            condition: { type: 'equals', value: 'yes' },
            action: 'SHOW',
            targetQuestionIds: ['question-2'],
          },
          'user-1',
        );

        expect(result).toEqual(mockVisibilityRule);
      });

      it('should throw NotFoundException when question not found', async () => {
        prismaService.question.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.createVisibilityRule(
            'non-existent',
            { condition: {}, action: 'SHOW', targetQuestionIds: [] },
            'user-1',
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateVisibilityRule', () => {
      it('should update visibility rule', async () => {
        const updatedRule = { ...mockVisibilityRule, priority: 2 };
        prismaService.visibilityRule.findUnique = jest.fn().mockResolvedValue(mockVisibilityRule);
        prismaService.visibilityRule.update = jest.fn().mockResolvedValue(updatedRule);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        const result = await service.updateVisibilityRule('rule-1', { priority: 2 }, 'user-1');

        expect(result.priority).toBe(2);
      });

      it('should throw NotFoundException when rule not found', async () => {
        prismaService.visibilityRule.findUnique = jest.fn().mockResolvedValue(null);

        await expect(
          service.updateVisibilityRule('non-existent', { priority: 1 }, 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteVisibilityRule', () => {
      it('should delete visibility rule', async () => {
        prismaService.visibilityRule.findUnique = jest.fn().mockResolvedValue(mockVisibilityRule);
        prismaService.visibilityRule.delete = jest.fn().mockResolvedValue(mockVisibilityRule);
        auditService.log = jest.fn().mockResolvedValue(undefined);

        await service.deleteVisibilityRule('rule-1', 'user-1');

        expect(prismaService.visibilityRule.delete).toHaveBeenCalled();
      });

      it('should throw NotFoundException when rule not found', async () => {
        prismaService.visibilityRule.findUnique = jest.fn().mockResolvedValue(null);

        await expect(service.deleteVisibilityRule('non-existent', 'user-1')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });
});
