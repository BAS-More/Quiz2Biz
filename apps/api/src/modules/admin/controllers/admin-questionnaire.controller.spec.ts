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
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [],
  };

  const mockSection = {
    id: 'section-1',
    questionnaireId: 'q-1',
    title: 'Test Section',
    order: 1,
    questions: [],
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

      const result = await controller.listQuestionnaires({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      service.findAllQuestionnaires.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await controller.listQuestionnaires({});

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

      const dto = { title: 'Test Section', order: 1 };

      const result = await controller.createSection('q-1', dto, mockUser as any);

      expect(result.title).toBe('Test Section');
      expect(service.createSection).toHaveBeenCalledWith('q-1', dto, 'user-1');
    });
  });

  describe('updateSection', () => {
    it('should update section', async () => {
      const updated = { ...mockSection, title: 'Updated Section' };
      service.updateSection.mockResolvedValue(updated);

      const dto = { title: 'Updated Section' };

      const result = await controller.updateSection('section-1', dto, mockUser as any);

      expect(result.title).toBe('Updated Section');
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
});
