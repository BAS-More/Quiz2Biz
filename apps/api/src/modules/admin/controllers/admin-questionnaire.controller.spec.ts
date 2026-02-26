/**
 * @fileoverview Tests for Admin Questionnaire Controller
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminQuestionnaireController } from './admin-questionnaire.controller';
import { AdminQuestionnaireService } from '../services/admin-questionnaire.service';
import { UserRole } from '@prisma/client';

describe('AdminQuestionnaireController', () => {
  let controller: AdminQuestionnaireController;
  let service: jest.Mocked<AdminQuestionnaireService>;

  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    tenantId: 'tenant-1',
  };

  const mockQuestionnaire = {
    id: 'q-1',
    name: 'Test Questionnaire',
    description: 'Test description',
    projectTypeId: null,
    industry: null,
    version: 1,
    isActive: true,
    isDefault: false,
    estimatedTime: null,
    metadata: {},
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    sections: [],
    _count: { sessions: 0 },
  };

  const mockSection = {
    id: 'section-1',
    questionnaireId: 'q-1',
    name: 'Test Section',
    description: null,
    estimatedTime: null,
    metadata: {},
    icon: null,
    orderIndex: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuestion = {
    id: 'question-1',
    sectionId: 'section-1',
    text: 'Test question',
    type: 'SINGLE_CHOICE',
    order: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminQuestionnaireController],
      providers: [
        {
          provide: AdminQuestionnaireService,
          useValue: {
            findAllQuestionnaires: jest.fn(),
            findQuestionnaireById: jest.fn(),
            createQuestionnaire: jest.fn(),
            updateQuestionnaire: jest.fn(),
            deleteQuestionnaire: jest.fn(),
            createSection: jest.fn(),
            updateSection: jest.fn(),
            deleteSection: jest.fn(),
            reorderSections: jest.fn(),
            createQuestion: jest.fn(),
            updateQuestion: jest.fn(),
            deleteQuestion: jest.fn(),
            reorderQuestions: jest.fn(),
            findRulesByQuestion: jest.fn(),
            createVisibilityRule: jest.fn(),
            updateVisibilityRule: jest.fn(),
            deleteVisibilityRule: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminQuestionnaireController>(AdminQuestionnaireController);
    service = module.get(AdminQuestionnaireService);
  });

  describe('listQuestionnaires', () => {
    it('should return paginated list of questionnaires', async () => {
      service.findAllQuestionnaires.mockResolvedValue({
        items: [mockQuestionnaire],
        total: 1,
      });

      const result = await controller.listQuestionnaires({ page: 1, limit: 20, skip: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      service.findAllQuestionnaires.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await controller.listQuestionnaires({ page: 1, limit: 20, skip: 0 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe('getQuestionnaire', () => {
    it('should return questionnaire by ID', async () => {
      service.findQuestionnaireById.mockResolvedValue(mockQuestionnaire);

      const result = await controller.getQuestionnaire('q-1');

      expect(result.id).toBe('q-1');
      expect(service.findQuestionnaireById).toHaveBeenCalledWith('q-1');
    });
  });

  describe('createQuestionnaire', () => {
    it('should create a new questionnaire', async () => {
      service.createQuestionnaire.mockResolvedValue(mockQuestionnaire);

      const dto = {
        name: 'Test Questionnaire',
        description: 'Test description',
      };

      const result = await controller.createQuestionnaire(dto, mockUser as any);

      expect(result.name).toBe('Test Questionnaire');
      expect(service.createQuestionnaire).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('updateQuestionnaire', () => {
    it('should update questionnaire', async () => {
      const updated = { ...mockQuestionnaire, name: 'Updated Name' };
      service.updateQuestionnaire.mockResolvedValue(updated);

      const dto = { name: 'Updated Name' };

      const result = await controller.updateQuestionnaire('q-1', dto, mockUser as any);

      expect(result.name).toBe('Updated Name');
      expect(service.updateQuestionnaire).toHaveBeenCalledWith('q-1', dto, 'user-1');
    });
  });

  describe('deleteQuestionnaire', () => {
    it('should soft-delete questionnaire', async () => {
      service.deleteQuestionnaire.mockResolvedValue(undefined);

      const result = await controller.deleteQuestionnaire('q-1', mockUser as any);

      expect(result.message).toBe('Questionnaire deactivated successfully');
      expect(service.deleteQuestionnaire).toHaveBeenCalledWith('q-1', 'user-1');
    });
  });

  describe('createSection', () => {
    it('should create a new section', async () => {
      service.createSection.mockResolvedValue(mockSection);

      const dto = { name: 'Test Section', orderIndex: 1 };

      const result = await controller.createSection('q-1', dto, mockUser as any);

      expect(result.name).toBe('Test Section');
      expect(service.createSection).toHaveBeenCalledWith('q-1', dto, 'user-1');
    });
  });

  describe('updateSection', () => {
    it('should update section', async () => {
      const updated = { ...mockSection, name: 'Updated Section' };
      service.updateSection.mockResolvedValue(updated);

      const dto = { name: 'Updated Section' };

      const result = await controller.updateSection('section-1', dto, mockUser as any);

      expect(result.name).toBe('Updated Section');
      expect(service.updateSection).toHaveBeenCalledWith('section-1', dto, 'user-1');
    });
  });

  describe('deleteSection', () => {
    it('should delete section', async () => {
      service.deleteSection.mockResolvedValue(undefined);

      const result = await controller.deleteSection('section-1', mockUser as any);

      expect(result.message).toBe('Section deleted successfully');
      expect(service.deleteSection).toHaveBeenCalledWith('section-1', 'user-1');
    });
  });

  describe('reorderSections', () => {
    it('should reorder sections within questionnaire', async () => {
      const reordered = [
        { ...mockSection, orderIndex: 2 },
        { ...mockSection, id: 'section-2', orderIndex: 1 },
      ];
      service.reorderSections.mockResolvedValue(reordered as any);

      const dto = { sectionIds: ['section-2', 'section-1'] };

      const result = await controller.reorderSections('q-1', dto as any, mockUser as any);

      expect(result).toHaveLength(2);
      expect(service.reorderSections).toHaveBeenCalledWith('q-1', dto, 'user-1');
    });
  });

  describe('createQuestion', () => {
    it('should create a new question in a section', async () => {
      service.createQuestion.mockResolvedValue(mockQuestion as any);

      const dto = { text: 'Test question', type: 'SINGLE_CHOICE', order: 1 };

      const result = await controller.createQuestion('section-1', dto as any, mockUser as any);

      expect(result.text).toBe('Test question');
      expect(service.createQuestion).toHaveBeenCalledWith('section-1', dto, 'user-1');
    });
  });

  describe('updateQuestion', () => {
    it('should update a question', async () => {
      const updated = { ...mockQuestion, text: 'Updated question' };
      service.updateQuestion.mockResolvedValue(updated as any);

      const dto = { text: 'Updated question' };

      const result = await controller.updateQuestion('question-1', dto as any, mockUser as any);

      expect(result.text).toBe('Updated question');
      expect(service.updateQuestion).toHaveBeenCalledWith('question-1', dto, 'user-1');
    });
  });

  describe('deleteQuestion', () => {
    it('should delete a question', async () => {
      service.deleteQuestion.mockResolvedValue(undefined);

      const result = await controller.deleteQuestion('question-1', mockUser as any);

      expect(result.message).toBe('Question deleted successfully');
      expect(service.deleteQuestion).toHaveBeenCalledWith('question-1', 'user-1');
    });
  });

  describe('reorderQuestions', () => {
    it('should reorder questions within a section', async () => {
      const reordered = [
        { ...mockQuestion, order: 2 },
        { ...mockQuestion, id: 'question-2', order: 1 },
      ];
      service.reorderQuestions.mockResolvedValue(reordered as any);

      const dto = { questionIds: ['question-2', 'question-1'] };

      const result = await controller.reorderQuestions('section-1', dto as any, mockUser as any);

      expect(result).toHaveLength(2);
      expect(service.reorderQuestions).toHaveBeenCalledWith('section-1', dto, 'user-1');
    });
  });

  describe('listVisibilityRules', () => {
    it('should list visibility rules for a question', async () => {
      const mockRules = [
        { id: 'rule-1', questionId: 'question-1', condition: 'equals', value: 'yes' },
        { id: 'rule-2', questionId: 'question-1', condition: 'contains', value: 'test' },
      ];
      (service as any).findRulesByQuestion.mockResolvedValue(mockRules);

      const result = await controller.listVisibilityRules('question-1');

      expect(result).toHaveLength(2);
      expect((service as any).findRulesByQuestion).toHaveBeenCalledWith('question-1');
    });
  });

  describe('createVisibilityRule', () => {
    it('should create a visibility rule for a question', async () => {
      const mockRule = { id: 'rule-1', questionId: 'question-1', condition: 'equals', value: 'yes' };
      service.createVisibilityRule.mockResolvedValue(mockRule as any);

      const dto = { condition: 'equals', value: 'yes' };

      const result = await controller.createVisibilityRule('question-1', dto as any, mockUser as any);

      expect(result.id).toBe('rule-1');
      expect(service.createVisibilityRule).toHaveBeenCalledWith('question-1', dto, 'user-1');
    });
  });

  describe('updateVisibilityRule', () => {
    it('should update a visibility rule', async () => {
      const mockRule = { id: 'rule-1', questionId: 'question-1', condition: 'contains', value: 'updated' };
      service.updateVisibilityRule.mockResolvedValue(mockRule as any);

      const dto = { condition: 'contains', value: 'updated' };

      const result = await controller.updateVisibilityRule('rule-1', dto as any, mockUser as any);

      expect(result.condition).toBe('contains');
      expect(service.updateVisibilityRule).toHaveBeenCalledWith('rule-1', dto, 'user-1');
    });
  });

  describe('deleteVisibilityRule', () => {
    it('should delete a visibility rule', async () => {
      service.deleteVisibilityRule.mockResolvedValue(undefined);

      const result = await controller.deleteVisibilityRule('rule-1', mockUser as any);

      expect(result.message).toBe('Visibility rule deleted successfully');
      expect(service.deleteVisibilityRule).toHaveBeenCalledWith('rule-1', 'user-1');
    });
  });

  describe('listQuestionnaires - edge cases', () => {
    it('should handle undefined pagination page/limit by using defaults', async () => {
      service.findAllQuestionnaires.mockResolvedValue({
        items: [mockQuestionnaire, mockQuestionnaire],
        total: 50,
      });

      const result = await controller.listQuestionnaires({} as any);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(3);
    });
  });
});
