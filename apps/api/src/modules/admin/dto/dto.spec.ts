/**
 * Admin Module DTO Tests
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QuestionType, VisibilityAction } from '@prisma/client';

import { CreateQuestionnaireDto } from './create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './update-questionnaire.dto';
import { CreateSectionDto } from './create-section.dto';
import { UpdateSectionDto } from './update-section.dto';
import { ReorderSectionsDto } from './reorder-sections.dto';
import { CreateQuestionDto, QuestionOptionDto } from './create-question.dto';
import { UpdateQuestionDto } from './update-question.dto';
import { ReorderQuestionsDto } from './reorder-questions.dto';
import { CreateVisibilityRuleDto } from './create-visibility-rule.dto';
import { UpdateVisibilityRuleDto } from './update-visibility-rule.dto';

describe('Admin Module DTOs', () => {
  describe('CreateQuestionnaireDto', () => {
    it('should validate valid DTO', async () => {
      const dto = plainToInstance(CreateQuestionnaireDto, {
        name: 'Test Questionnaire',
        description: 'A test questionnaire',
        industry: 'technology',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation without name', async () => {
      const dto = plainToInstance(CreateQuestionnaireDto, {
        description: 'A test questionnaire',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should accept optional fields', async () => {
      const dto = plainToInstance(CreateQuestionnaireDto, {
        name: 'Test Questionnaire',
        description: 'Description',
        industry: 'healthcare',
        isDefault: true,
        estimatedTime: 45,
        metadata: { custom: 'data' },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateQuestionnaireDto', () => {
    it('should validate valid partial update', async () => {
      const dto = plainToInstance(UpdateQuestionnaireDto, {
        name: 'Updated Name',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow updating all fields', async () => {
      const dto = plainToInstance(UpdateQuestionnaireDto, {
        name: 'Updated Name',
        description: 'Updated description',
        industry: 'finance',
        isDefault: false,
        isActive: true,
        estimatedTime: 60,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty object', async () => {
      const dto = plainToInstance(UpdateQuestionnaireDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CreateSectionDto', () => {
    it('should validate valid DTO', async () => {
      const dto = plainToInstance(CreateSectionDto, {
        name: 'Test Section',
        description: 'Section description',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation without name', async () => {
      const dto = plainToInstance(CreateSectionDto, {
        description: 'Section description',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept optional fields', async () => {
      const dto = plainToInstance(CreateSectionDto, {
        name: 'Test Section',
        description: 'Description',
        icon: 'business',
        estimatedTime: 15,
        orderIndex: 0,
        metadata: { key: 'value' },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateSectionDto', () => {
    it('should validate valid partial update', async () => {
      const dto = plainToInstance(UpdateSectionDto, {
        name: 'Updated Section',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty object', async () => {
      const dto = plainToInstance(UpdateSectionDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ReorderSectionsDto', () => {
    it('should validate valid reorder DTO', async () => {
      const dto = plainToInstance(ReorderSectionsDto, {
        items: [
          { id: '123e4567-e89b-12d3-a456-426614174000', orderIndex: 0 },
          { id: '123e4567-e89b-12d3-a456-426614174001', orderIndex: 1 },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation without items', async () => {
      const dto = plainToInstance(ReorderSectionsDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid UUID', async () => {
      const dto = plainToInstance(ReorderSectionsDto, {
        items: [{ id: 'invalid-uuid', orderIndex: 0 }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateQuestionDto', () => {
    it('should validate valid DTO', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        text: 'What is your company name?',
        type: QuestionType.TEXT,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation without text', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        type: QuestionType.TEXT,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation without type', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        text: 'What is your company name?',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept all optional fields', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        text: 'What is your company name?',
        type: QuestionType.TEXT,
        helpText: 'Enter the legal name',
        explanation: 'This will be used in documents',
        placeholder: 'e.g., Acme Corp',
        isRequired: true,
        validationRules: { minLength: 2, maxLength: 200 },
        defaultValue: null,
        suggestedAnswer: 'Acme Corporation',
        industryTags: ['technology', 'saas'],
        documentMappings: { field: 'company_name' },
        orderIndex: 0,
        metadata: { weight: 1 },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept options for choice questions', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        text: 'Select your industry',
        type: QuestionType.SINGLE_CHOICE,
        options: [
          { value: 'tech', label: 'Technology' },
          { value: 'healthcare', label: 'Healthcare' },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with text exceeding max length', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        text: 'x'.repeat(1001),
        type: QuestionType.TEXT,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with negative orderIndex', async () => {
      const dto = plainToInstance(CreateQuestionDto, {
        text: 'Question?',
        type: QuestionType.TEXT,
        orderIndex: -1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('QuestionOptionDto', () => {
    it('should validate valid option', async () => {
      const dto = plainToInstance(QuestionOptionDto, {
        value: 'option_1',
        label: 'Option 1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept optional description', async () => {
      const dto = plainToInstance(QuestionOptionDto, {
        value: 'option_1',
        label: 'Option 1',
        description: 'Additional info',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail without value', async () => {
      const dto = plainToInstance(QuestionOptionDto, {
        label: 'Option 1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail without label', async () => {
      const dto = plainToInstance(QuestionOptionDto, {
        value: 'option_1',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateQuestionDto', () => {
    it('should validate valid partial update', async () => {
      const dto = plainToInstance(UpdateQuestionDto, {
        text: 'Updated question text?',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty object', async () => {
      const dto = plainToInstance(UpdateQuestionDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept all updatable fields', async () => {
      const dto = plainToInstance(UpdateQuestionDto, {
        text: 'Updated question?',
        helpText: 'Updated help',
        isRequired: false,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ReorderQuestionsDto', () => {
    it('should validate valid reorder DTO', async () => {
      const dto = plainToInstance(ReorderQuestionsDto, {
        items: [
          { id: '123e4567-e89b-12d3-a456-426614174000', orderIndex: 0 },
          { id: '123e4567-e89b-12d3-a456-426614174001', orderIndex: 1 },
          { id: '123e4567-e89b-12d3-a456-426614174002', orderIndex: 2 },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation without items', async () => {
      const dto = plainToInstance(ReorderQuestionsDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateVisibilityRuleDto', () => {
    it('should have correct structure', () => {
      const dto = new CreateVisibilityRuleDto();
      dto.condition = { type: 'equals', field: 'industry', value: 'technology' };
      dto.action = VisibilityAction.SHOW;
      dto.targetQuestionIds = ['123e4567-e89b-12d3-a456-426614174000'];
      
      expect(dto.condition).toBeDefined();
      expect(dto.action).toBe(VisibilityAction.SHOW);
      expect(dto.targetQuestionIds).toHaveLength(1);
    });

    it('should fail validation without condition', async () => {
      const dto = plainToInstance(CreateVisibilityRuleDto, {
        action: VisibilityAction.SHOW,
        targetQuestionIds: ['123e4567-e89b-12d3-a456-426614174000'],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation without action', async () => {
      const dto = plainToInstance(CreateVisibilityRuleDto, {
        condition: { type: 'equals', value: 'yes' },
        targetQuestionIds: ['123e4567-e89b-12d3-a456-426614174000'],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should have optional fields', () => {
      const dto = new CreateVisibilityRuleDto();
      dto.condition = { type: 'equals', value: 'yes' };
      dto.action = VisibilityAction.HIDE;
      dto.targetQuestionIds = ['123e4567-e89b-12d3-a456-426614174000'];
      dto.priority = 10;
      dto.isActive = false;
      
      expect(dto.priority).toBe(10);
      expect(dto.isActive).toBe(false);
    });
  });

  describe('UpdateVisibilityRuleDto', () => {
    it('should validate valid partial update', async () => {
      const dto = plainToInstance(UpdateVisibilityRuleDto, {
        priority: 5,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow empty object', async () => {
      const dto = plainToInstance(UpdateVisibilityRuleDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept updating condition', async () => {
      const dto = plainToInstance(UpdateVisibilityRuleDto, {
        condition: { type: 'not_equals', value: 'no' },
        isActive: true,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
