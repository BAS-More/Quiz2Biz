import { Test, TestingModule } from '@nestjs/testing';
import { PromptTemplateService } from './prompt-template.service';
import { EvidenceType } from '../types';

describe('PromptTemplateService', () => {
  let service: PromptTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptTemplateService],
    }).compile();

    service = module.get<PromptTemplateService>(PromptTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor initialization', () => {
    it('should initialize with default templates', async () => {
      const templates = await service.getAllTemplates();
      expect(templates.length).toBe(11); // 11 readiness dimensions
    });
  });

  describe('getTemplateForDimension', () => {
    it('should return template for arch_sec dimension', async () => {
      const template = await service.getTemplateForDimension('arch_sec');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('arch_sec');
      expect(template?.id).toBe('tpl-arch-sec');
      expect(template?.version).toBe('1.0.0');
      expect(template?.evidenceType).toBe(EvidenceType.ARCHITECTURE_DIAGRAM);
      expect(template?.baseEffortHours).toBe(16);
    });

    it('should return template for devops_iac dimension', async () => {
      const template = await service.getTemplateForDimension('devops_iac');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('devops_iac');
      expect(template?.id).toBe('tpl-devops-iac');
      expect(template?.evidenceType).toBe(EvidenceType.CONFIG);
      expect(template?.baseEffortHours).toBe(12);
    });

    it('should return template for quality_test dimension', async () => {
      const template = await service.getTemplateForDimension('quality_test');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('quality_test');
      expect(template?.evidenceType).toBe(EvidenceType.TEST_REPORT);
      expect(template?.baseEffortHours).toBe(10);
    });

    it('should return template for finance dimension', async () => {
      const template = await service.getTemplateForDimension('finance');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('finance');
      expect(template?.evidenceType).toBe(EvidenceType.DOCUMENT);
      expect(template?.baseEffortHours).toBe(8);
    });

    it('should return template for strategy dimension', async () => {
      const template = await service.getTemplateForDimension('strategy');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('strategy');
      expect(template?.baseEffortHours).toBe(6);
    });

    it('should return template for requirements dimension', async () => {
      const template = await service.getTemplateForDimension('requirements');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('requirements');
      expect(template?.baseEffortHours).toBe(6);
    });

    it('should return template for data_ai dimension', async () => {
      const template = await service.getTemplateForDimension('data_ai');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('data_ai');
      expect(template?.evidenceType).toBe(EvidenceType.POLICY);
      expect(template?.baseEffortHours).toBe(8);
    });

    it('should return template for privacy_legal dimension', async () => {
      const template = await service.getTemplateForDimension('privacy_legal');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('privacy_legal');
      expect(template?.evidenceType).toBe(EvidenceType.POLICY);
      expect(template?.baseEffortHours).toBe(8);
    });

    it('should return template for service_ops dimension', async () => {
      const template = await service.getTemplateForDimension('service_ops');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('service_ops');
      expect(template?.baseEffortHours).toBe(6);
    });

    it('should return template for compliance_policy dimension', async () => {
      const template = await service.getTemplateForDimension('compliance_policy');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('compliance_policy');
      expect(template?.evidenceType).toBe(EvidenceType.AUDIT_LOG);
      expect(template?.baseEffortHours).toBe(8);
    });

    it('should return template for people_change dimension', async () => {
      const template = await service.getTemplateForDimension('people_change');

      expect(template).toBeDefined();
      expect(template?.dimensionKey).toBe('people_change');
      expect(template?.evidenceType).toBe(EvidenceType.DOCUMENT);
      expect(template?.baseEffortHours).toBe(4);
    });

    it('should return null for non-existent dimension', async () => {
      const template = await service.getTemplateForDimension('non_existent');
      expect(template).toBeNull();
    });

    it('should return null for empty dimension key', async () => {
      const template = await service.getTemplateForDimension('');
      expect(template).toBeNull();
    });
  });

  describe('getAllTemplates', () => {
    it('should return all 11 templates', async () => {
      const templates = await service.getAllTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBe(11);
    });

    it('should return templates with all required properties', async () => {
      const templates = await service.getAllTemplates();

      for (const template of templates) {
        expect(template.id).toBeDefined();
        expect(template.dimensionKey).toBeDefined();
        expect(template.version).toBeDefined();
        expect(template.goalTemplate).toBeDefined();
        expect(template.taskTemplates).toBeDefined();
        expect(template.defaultAcceptanceCriteria).toBeDefined();
        expect(template.defaultConstraints).toBeDefined();
        expect(template.defaultDeliverables).toBeDefined();
        expect(template.evidenceType).toBeDefined();
        expect(template.baseEffortHours).toBeDefined();
      }
    });

    it('should return templates with valid task templates structure', async () => {
      const templates = await service.getAllTemplates();

      for (const template of templates) {
        expect(template.taskTemplates).toBeInstanceOf(Array);
        expect(template.taskTemplates.length).toBeGreaterThan(0);

        for (const task of template.taskTemplates) {
          expect(task.order).toBeDefined();
          expect(typeof task.order).toBe('number');
          expect(task.template).toBeDefined();
          expect(typeof task.template).toBe('string');
        }
      }
    });

    it('should return templates with unique dimension keys', async () => {
      const templates = await service.getAllTemplates();
      const dimensionKeys = templates.map((t) => t.dimensionKey);
      const uniqueKeys = new Set(dimensionKeys);

      expect(uniqueKeys.size).toBe(templates.length);
    });

    it('should return templates with unique IDs', async () => {
      const templates = await service.getAllTemplates();
      const ids = templates.map((t) => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(templates.length);
    });
  });

  describe('template content validation', () => {
    it('should have goal templates with placeholder syntax', async () => {
      const templates = await service.getAllTemplates();

      for (const template of templates) {
        // Goal templates should contain placeholders like {{bestPractice}}
        expect(template.goalTemplate).toMatch(/\{\{[a-zA-Z]+\}\}/);
      }
    });

    it('should have acceptance criteria as array of strings', async () => {
      const templates = await service.getAllTemplates();

      for (const template of templates) {
        expect(template.defaultAcceptanceCriteria).toBeInstanceOf(Array);
        expect(template.defaultAcceptanceCriteria.length).toBeGreaterThan(0);

        for (const criteria of template.defaultAcceptanceCriteria) {
          expect(typeof criteria).toBe('string');
        }
      }
    });

    it('should have constraints as array of strings', async () => {
      const templates = await service.getAllTemplates();

      for (const template of templates) {
        expect(template.defaultConstraints).toBeInstanceOf(Array);
        expect(template.defaultConstraints.length).toBeGreaterThan(0);

        for (const constraint of template.defaultConstraints) {
          expect(typeof constraint).toBe('string');
        }
      }
    });

    it('should have deliverables as array of strings', async () => {
      const templates = await service.getAllTemplates();

      for (const template of templates) {
        expect(template.defaultDeliverables).toBeInstanceOf(Array);
        expect(template.defaultDeliverables.length).toBeGreaterThan(0);

        for (const deliverable of template.defaultDeliverables) {
          expect(typeof deliverable).toBe('string');
        }
      }
    });

    it('should have positive base effort hours', async () => {
      const templates = await service.getAllTemplates();

      for (const template of templates) {
        expect(template.baseEffortHours).toBeGreaterThan(0);
      }
    });

    it('should have valid evidence types', async () => {
      const templates = await service.getAllTemplates();
      const validEvidenceTypes = Object.values(EvidenceType);

      for (const template of templates) {
        expect(validEvidenceTypes).toContain(template.evidenceType);
      }
    });

    it('should have version in semver format', async () => {
      const templates = await service.getAllTemplates();
      const semverRegex = /^\d+\.\d+\.\d+$/;

      for (const template of templates) {
        expect(template.version).toMatch(semverRegex);
      }
    });
  });

  describe('specific dimension template details', () => {
    it('arch_sec template should reference OWASP', async () => {
      const template = await service.getTemplateForDimension('arch_sec');

      const criteria = template?.defaultAcceptanceCriteria || [];
      const hasOwaspReference = criteria.some((c) => c.includes('OWASP'));

      expect(hasOwaspReference).toBe(true);
    });

    it('devops_iac template should reference CI/CD', async () => {
      const template = await service.getTemplateForDimension('devops_iac');

      const criteria = template?.defaultAcceptanceCriteria || [];
      const hasCiCdReference = criteria.some((c) => c.includes('CI/CD'));

      expect(hasCiCdReference).toBe(true);
    });

    it('quality_test template should reference code coverage', async () => {
      const template = await service.getTemplateForDimension('quality_test');

      const criteria = template?.defaultAcceptanceCriteria || [];
      const hasCoverageReference = criteria.some((c) => c.includes('coverage'));

      expect(hasCoverageReference).toBe(true);
    });

    it('privacy_legal template should reference GDPR/CCPA', async () => {
      const template = await service.getTemplateForDimension('privacy_legal');

      const constraints = template?.defaultConstraints || [];
      const hasGdprReference = constraints.some((c) => c.includes('GDPR') || c.includes('CCPA'));

      expect(hasGdprReference).toBe(true);
    });

    it('people_change template should include RACI matrix', async () => {
      const template = await service.getTemplateForDimension('people_change');

      const criteria = template?.defaultAcceptanceCriteria || [];
      const hasRaciReference = criteria.some((c) => c.includes('RACI'));

      expect(hasRaciReference).toBe(true);
    });
  });
});
