import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';

describe('QuestionnaireController', () => {
  let controller: QuestionnaireController;
  let module: TestingModule;

  const mockQuestionnaireService = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [QuestionnaireController],
      providers: [{ provide: QuestionnaireService, useValue: mockQuestionnaireService }],
    }).compile();

    controller = module.get<QuestionnaireController>(QuestionnaireController);
    module.get<QuestionnaireService>(QuestionnaireService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('findAll', () => {
    it('should list all questionnaires with pagination', async () => {
      const pagination = { page: 1, limit: 10, skip: 0 } as any;
      const mockQuestionnaires = [
        { id: 'q-1', title: 'Security Assessment', industry: 'technology' },
        { id: 'q-2', title: 'HIPAA Compliance', industry: 'healthcare' },
      ];

      mockQuestionnaireService.findAll.mockResolvedValue({
        items: mockQuestionnaires,
        total: 2,
      });

      const result = await controller.findAll(pagination);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(mockQuestionnaireService.findAll).toHaveBeenCalledWith(pagination, undefined);
    });

    it('should filter questionnaires by industry', async () => {
      const pagination = { page: 1, limit: 10, skip: 0 } as any;
      const industry = 'healthcare';

      mockQuestionnaireService.findAll.mockResolvedValue({
        items: [{ id: 'q-1', title: 'HIPAA Compliance', industry: 'healthcare' }],
        total: 1,
      });

      const result = await controller.findAll(pagination, industry);

      expect(result.items).toHaveLength(1);
      expect(mockQuestionnaireService.findAll).toHaveBeenCalledWith(pagination, 'healthcare');
    });

    it('should handle empty results', async () => {
      const pagination = { page: 1, limit: 10, skip: 0 } as any;

      mockQuestionnaireService.findAll.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await controller.findAll(pagination);

      expect(result.items).toHaveLength(0);
      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('findById', () => {
    it('should get questionnaire with all sections and questions', async () => {
      const mockQuestionnaire = {
        id: 'questionnaire-123',
        title: 'Security Assessment',
        description: 'Comprehensive security evaluation',
        sections: [
          {
            id: 'section-1',
            title: 'Architecture',
            questions: [
              { id: 'q-1', text: 'Do you use MFA?' },
              { id: 'q-2', text: 'Is encryption enabled?' },
            ],
          },
        ],
        totalQuestions: 50,
      };

      mockQuestionnaireService.findById.mockResolvedValue(mockQuestionnaire);

      const result = await controller.findById('questionnaire-123');

      expect(result.id).toBe('questionnaire-123');
      expect(result.sections).toHaveLength(1);
      expect(mockQuestionnaireService.findById).toHaveBeenCalledWith('questionnaire-123');
    });
  });

  describe('uncovered branches', () => {
    it('should default page to 1 and limit to 20 when undefined', async () => {
      const pagination = { skip: 0 } as any;
      mockQuestionnaireService.findAll.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await controller.findAll(pagination);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should correctly calculate totalPages with undefined limit', async () => {
      const pagination = { skip: 0 } as any;
      mockQuestionnaireService.findAll.mockResolvedValue({
        items: [{ id: '1' }],
        total: 50,
      });

      const result = await controller.findAll(pagination);

      // 50 / 20 = 2.5, ceil = 3
      expect(result.pagination.totalPages).toBe(3);
    });
  });
});
