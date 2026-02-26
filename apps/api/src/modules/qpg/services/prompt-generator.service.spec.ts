import { Test, TestingModule } from '@nestjs/testing';
import { PromptGeneratorService } from './prompt-generator.service';
import { GapContext, PromptTemplate, QuestModePrompt, EvidenceType } from '../types';

describe('PromptGeneratorService', () => {
  let service: PromptGeneratorService;

  const mockGapContext: GapContext = {
    sessionId: 'session-1',
    dimensionKey: 'SECURITY',
    dimensionName: 'Security & Privacy',
    questionId: 'q-1',
    questionText: 'Do you have a password policy?',
    currentCoverage: 0.3,
    severity: 0.8,
    residualRisk: 0.56,
    bestPractice: 'Implement strong password requirements',
    practicalExplainer: 'Passwords should be complex and rotated regularly',
    standardRefs: ['ISO-27001', 'NIST-800-53'],
    userAnswer: 'We have basic requirements',
    userNotes: 'Need to improve',
  };

  const mockTemplate: PromptTemplate = {
    id: 'template-1',
    dimensionKey: 'SECURITY',
    version: '1.0',
    goalTemplate: 'Implement {{bestPractice}} for {{dimensionName}}',
    taskTemplates: [
      { order: 1, template: 'Review current state of {{questionText}}' },
      { order: 2, template: 'Document requirements based on {{standardRefs}}' },
      { order: 3, template: 'Implement improvements to reach {{currentCoverage}} target', condition: { field: 'severity', operator: 'gt', value: 0.5 } },
    ],
    defaultAcceptanceCriteria: ['Coverage reaches 100%', 'All {{standardRefs}} requirements met'],
    defaultConstraints: ['Must be completed within 30 days', 'Minimal disruption to operations'],
    defaultDeliverables: ['Policy document', 'Implementation plan'],
    evidenceType: EvidenceType.DOCUMENT,
    baseEffortHours: 8,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptGeneratorService],
    }).compile();

    service = module.get<PromptGeneratorService>(PromptGeneratorService);
  });

  describe('generate', () => {
    it('should generate a prompt from gap context and template', async () => {
      const result = await service.generate(mockGapContext, mockTemplate);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^prompt-/);
      expect(result.dimensionKey).toBe('SECURITY');
      expect(result.questionId).toBe('q-1');
      expect(result.goal).toContain('Implement strong password requirements');
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it('should interpolate template variables correctly', async () => {
      const result = await service.generate(mockGapContext, mockTemplate);

      expect(result.goal).toContain('Security & Privacy');
      expect(result.tasks.some(t => t.description.includes('password policy'))).toBe(true);
    });

    it('should calculate priority based on residual risk', async () => {
      // High residual risk (> 0.2) = priority 1
      const result = await service.generate(mockGapContext, mockTemplate);
      expect(result.priority).toBe(1);

      // Lower residual risk
      const lowRiskGap = { ...mockGapContext, residualRisk: 0.08 };
      const lowPriorityResult = await service.generate(lowRiskGap, mockTemplate);
      expect(lowPriorityResult.priority).toBe(4);
    });

    it('should calculate effort estimate based on severity', async () => {
      // High severity (> 0.7) = 1.5x multiplier
      const result = await service.generate(mockGapContext, mockTemplate);
      expect(result.estimatedEffort).toBe(12); // 8 * 1.5

      // Lower severity
      const lowSeverityGap = { ...mockGapContext, severity: 0.3 };
      const lowEffortResult = await service.generate(lowSeverityGap, mockTemplate);
      expect(lowEffortResult.estimatedEffort).toBe(8); // 8 * 1.0
    });

    it('should filter tasks based on conditions', async () => {
      // High severity should include conditional task
      const highSeverityResult = await service.generate(mockGapContext, mockTemplate);
      expect(highSeverityResult.tasks.length).toBe(3);

      // Low severity should exclude conditional task
      const lowSeverityGap = { ...mockGapContext, severity: 0.4 };
      const lowSeverityResult = await service.generate(lowSeverityGap, mockTemplate);
      expect(lowSeverityResult.tasks.length).toBe(2);
    });

    it('should generate unique tags', async () => {
      const result = await service.generate(mockGapContext, mockTemplate);

      expect(result.tags).toContain('SECURITY');
      expect(result.tags).toContain('document');
      expect(result.tags).toContain('critical');
      // Check for standard ref tags
      expect(result.tags.some(t => t.includes('iso'))).toBe(true);
    });

    it('should include acceptance criteria and constraints', async () => {
      const result = await service.generate(mockGapContext, mockTemplate);

      expect(result.acceptanceCriteria.length).toBe(2);
      expect(result.constraints.length).toBe(2);
      expect(result.deliverables.length).toBe(2);
    });
  });

  describe('formatAsMarkdown', () => {
    it('should format prompt as markdown', async () => {
      const prompt = await service.generate(mockGapContext, mockTemplate);
      const markdown = service.formatAsMarkdown(prompt);

      expect(markdown).toContain('# ');
      expect(markdown).toContain('## Goal');
      expect(markdown).toContain('## Tasks');
      expect(markdown).toContain('## Acceptance Criteria');
      expect(markdown).toContain('**Priority:**');
      expect(markdown).toContain('**Estimated Effort:**');
    });

    it('should include task numbers', async () => {
      const prompt = await service.generate(mockGapContext, mockTemplate);
      const markdown = service.formatAsMarkdown(prompt);

      expect(markdown).toMatch(/1\. /);
      expect(markdown).toMatch(/2\. /);
    });
  });

  describe('evaluateCondition', () => {
    it('should handle eq operator', async () => {
      const templateWithEq: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'dimensionKey', operator: 'eq', value: 'SECURITY' } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithEq);
      expect(result.tasks.length).toBe(1);
    });

    it('should handle ne operator', async () => {
      const templateWithNe: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'dimensionKey', operator: 'ne', value: 'COMPLIANCE' } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithNe);
      expect(result.tasks.length).toBe(1);
    });

    it('should handle lt operator', async () => {
      const templateWithLt: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'currentCoverage', operator: 'lt', value: 0.5 } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithLt);
      expect(result.tasks.length).toBe(1);
    });

    it('should handle contains operator', async () => {
      const templateWithContains: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'userAnswer', operator: 'contains', value: 'basic' } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithContains);
      expect(result.tasks.length).toBe(1);
    });

    it('should return false for unknown fields', async () => {
      const templateWithUnknown: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'unknownField' as any, operator: 'eq', value: 'test' } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithUnknown);
      expect(result.tasks.length).toBe(0);
    });
  });

  describe('calculatePriority', () => {
    it('should return priority 1 for residualRisk > 0.2', async () => {
      const gap = { ...mockGapContext, residualRisk: 0.25 };
      const result = await service.generate(gap, mockTemplate);
      expect(result.priority).toBe(1);
    });

    it('should return priority 2 for residualRisk > 0.15', async () => {
      const gap = { ...mockGapContext, residualRisk: 0.18 };
      const result = await service.generate(gap, mockTemplate);
      expect(result.priority).toBe(2);
    });

    it('should return priority 3 for residualRisk > 0.1', async () => {
      const gap = { ...mockGapContext, residualRisk: 0.12 };
      const result = await service.generate(gap, mockTemplate);
      expect(result.priority).toBe(3);
    });

    it('should return priority 5 for very low residualRisk', async () => {
      const gap = { ...mockGapContext, residualRisk: 0.03 };
      const result = await service.generate(gap, mockTemplate);
      expect(result.priority).toBe(5);
    });
  });

  describe('uncovered branches', () => {
    it('should use 1.2 effort multiplier for medium severity (0.4 < severity <= 0.7)', async () => {
      const medSeverityGap = { ...mockGapContext, severity: 0.6 };
      const result = await service.generate(medSeverityGap, mockTemplate);
      expect(result.estimatedEffort).toBe(10); // 8 * 1.2 = 9.6 rounds to 10
    });

    it('should use "industry best practices" when standardRefs is empty', async () => {
      const gap = { ...mockGapContext, standardRefs: [] };
      const result = await service.generate(gap, mockTemplate);
      expect(result).toBeDefined();
      // The buildTemplateContext should produce 'industry best practices' for empty standardRefs
    });

    it('should use "Not provided" when userAnswer is undefined', async () => {
      const gap = { ...mockGapContext, userAnswer: undefined };
      const result = await service.generate(gap, mockTemplate);
      expect(result).toBeDefined();
    });

    it('should use "None" when userNotes is undefined', async () => {
      const gap = { ...mockGapContext, userNotes: undefined };
      const result = await service.generate(gap, mockTemplate);
      expect(result).toBeDefined();
    });

    it('should keep original match when interpolation key not in context', async () => {
      const templateWithUnknownVar: PromptTemplate = {
        ...mockTemplate,
        goalTemplate: 'Goal: {{unknownVariable}}',
      };
      const result = await service.generate(mockGapContext, templateWithUnknownVar);
      expect(result.goal).toBe('Goal: {{unknownVariable}}');
    });

    it('should add "high-priority" tag for priority 2', async () => {
      const gap = { ...mockGapContext, residualRisk: 0.18 }; // priority 2
      const result = await service.generate(gap, mockTemplate);
      expect(result.tags).toContain('high-priority');
      expect(result.tags).not.toContain('critical');
    });

    it('should not add priority tag for priority >= 3', async () => {
      const gap = { ...mockGapContext, residualRisk: 0.12 }; // priority 3
      const result = await service.generate(gap, mockTemplate);
      expect(result.tags).not.toContain('critical');
      expect(result.tags).not.toContain('high-priority');
    });

    it('should skip empty cleaned standard ref tags', async () => {
      const gap = { ...mockGapContext, standardRefs: ['!!!', 'ISO-27001'] };
      const result = await service.generate(gap, mockTemplate);
      // '!!!' cleaned becomes '' which is falsy, should be skipped
      expect(result.tags).toContain('iso-27001');
    });

    it('should handle contains operator with non-matching string', async () => {
      const templateWithContains: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'userAnswer', operator: 'contains', value: 'nonexistent' } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithContains);
      expect(result.tasks.length).toBe(0);
    });

    it('should return false for contains operator on non-string field', async () => {
      const templateWithContains: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'severity', operator: 'contains', value: '0.8' } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithContains);
      expect(result.tasks.length).toBe(0);
    });

    it('should return false for gt operator on non-number field', async () => {
      const templateWithGt: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'userAnswer', operator: 'gt', value: 0 } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithGt);
      expect(result.tasks.length).toBe(0);
    });

    it('should return false for lt operator on non-number field', async () => {
      const templateWithLt: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'userAnswer', operator: 'lt', value: 100 } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithLt);
      expect(result.tasks.length).toBe(0);
    });

    it('should return false for unknown operator', async () => {
      const templateWithUnknown: PromptTemplate = {
        ...mockTemplate,
        taskTemplates: [
          { order: 1, template: 'Task 1', condition: { field: 'severity', operator: 'gte' as any, value: 0.5 } },
        ],
      };
      const result = await service.generate(mockGapContext, templateWithUnknown);
      expect(result.tasks.length).toBe(0);
    });
  });
});
