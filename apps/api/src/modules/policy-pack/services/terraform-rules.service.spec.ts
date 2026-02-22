import { Test, TestingModule } from '@nestjs/testing';
import { TerraformRulesService, TerraformRule } from './terraform-rules.service';

describe('TerraformRulesService', () => {
  let service: TerraformRulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TerraformRulesService],
    }).compile();

    service = module.get<TerraformRulesService>(TerraformRulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRulesForDimension', () => {
    it('should return rules for arch_sec dimension', () => {
      const rules = service.getRulesForDimension('arch_sec');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every(r => r.dimensionKey === 'arch_sec')).toBe(true);
    });

    it('should return rules for devops_iac dimension', () => {
      const rules = service.getRulesForDimension('devops_iac');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.name === 'resource_tagging')).toBe(true);
    });

    it('should return rules for compliance_policy dimension', () => {
      const rules = service.getRulesForDimension('compliance_policy');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.name === 'audit_retention')).toBe(true);
    });

    it('should return rules for privacy_legal dimension', () => {
      const rules = service.getRulesForDimension('privacy_legal');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.name === 'data_residency')).toBe(true);
    });

    it('should return empty array for unknown dimension', () => {
      const rules = service.getRulesForDimension('unknown_dimension');

      expect(rules).toEqual([]);
    });
  });

  describe('getAllRules', () => {
    it('should return all rules', () => {
      const rules = service.getAllRules();

      expect(rules.length).toBeGreaterThan(0);
    });

    it('should return rules with all required properties', () => {
      const rules = service.getAllRules();

      for (const rule of rules) {
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.dimensionKey).toBeDefined();
        expect(rule.resourceTypes).toBeDefined();
        expect(rule.ruleCode).toBeDefined();
      }
    });

    it('should include rules from multiple dimensions', () => {
      const rules = service.getAllRules();
      const dimensions = new Set(rules.map(r => r.dimensionKey));

      expect(dimensions.size).toBeGreaterThanOrEqual(3);
      expect(dimensions.has('arch_sec')).toBe(true);
      expect(dimensions.has('devops_iac')).toBe(true);
    });
  });

  describe('generateFeatureFile', () => {
    it('should generate feature file with header', () => {
      const rules = service.getRulesForDimension('arch_sec');
      const featureFile = service.generateFeatureFile(rules);

      expect(featureFile).toContain('# Quiz2Biz Auto-Generated Terraform Compliance Rules');
      expect(featureFile).toContain('# Generated at:');
      expect(featureFile).toContain('terraform-compliance');
    });

    it('should include rule metadata as comments', () => {
      const rules = service.getRulesForDimension('arch_sec');
      const featureFile = service.generateFeatureFile(rules);

      for (const rule of rules) {
        expect(featureFile).toContain(`# Rule: ${rule.name}`);
        expect(featureFile).toContain(`# Description: ${rule.description}`);
        expect(featureFile).toContain(`# Dimension: ${rule.dimensionKey}`);
      }
    });

    it('should include rule code', () => {
      const rules = service.getRulesForDimension('arch_sec');
      const featureFile = service.generateFeatureFile(rules);

      for (const rule of rules) {
        expect(featureFile).toContain(rule.ruleCode);
      }
    });

    it('should handle empty rules list', () => {
      const featureFile = service.generateFeatureFile([]);

      expect(featureFile).toContain('# Quiz2Biz Auto-Generated');
      expect(featureFile.split('\n').filter(l => l.includes('# Rule:')).length).toBe(0);
    });
  });

  describe('generateConfig', () => {
    it('should generate terraform-compliance config', () => {
      const config = service.generateConfig();

      expect(config).toContain('# terraform-compliance configuration');
      expect(config).toContain('.terraform-compliance.yml');
    });

    it('should include format and log level', () => {
      const config = service.generateConfig();

      expect(config).toContain('format: json');
      expect(config).toContain('log_level: info');
    });

    it('should include exit on failure setting', () => {
      const config = service.generateConfig();

      expect(config).toContain('exit_on_failure: true');
    });

    it('should include features directory', () => {
      const config = service.generateConfig();

      expect(config).toContain('features:');
      expect(config).toContain('quiz2biz');
    });
  });

  describe('rule content validation', () => {
    it('should have Feature keyword in all rules', () => {
      const rules = service.getAllRules();

      for (const rule of rules) {
        expect(rule.ruleCode).toContain('Feature:');
      }
    });

    it('should have Scenario or Scenario Outline in all rules', () => {
      const rules = service.getAllRules();

      for (const rule of rules) {
        const hasScenario = rule.ruleCode.includes('Scenario:') ||
                          rule.ruleCode.includes('Scenario Outline:');
        expect(hasScenario).toBe(true);
      }
    });

    it('should have valid Gherkin Given-Then structure', () => {
      const rules = service.getAllRules();

      for (const rule of rules) {
        expect(rule.ruleCode).toContain('Given');
        expect(rule.ruleCode).toContain('Then');
      }
    });

    it('should reference Azure resource types', () => {
      const rules = service.getAllRules();
      const azureRules = rules.filter(r =>
        r.resourceTypes.some(rt => rt.startsWith('azurerm_') || rt === '*')
      );

      expect(azureRules.length).toBeGreaterThan(0);
    });
  });

  describe('specific rules', () => {
    it('ensure_https_only rule should validate HTTPS settings', () => {
      const rules = service.getAllRules();
      const httpsRule = rules.find(r => r.name === 'ensure_https_only');

      expect(httpsRule).toBeDefined();
      expect(httpsRule?.ruleCode).toContain('https_only');
      expect(httpsRule?.ruleCode).toContain('HTTPS');
    });

    it('encryption_at_rest rule should validate encryption', () => {
      const rules = service.getAllRules();
      const encRule = rules.find(r => r.name === 'encryption_at_rest');

      expect(encRule).toBeDefined();
      expect(encRule?.ruleCode).toContain('TLS1_2');
      expect(encRule?.ruleCode).toContain('transparent_data_encryption');
    });

    it('resource_tagging rule should check required tags', () => {
      const rules = service.getAllRules();
      const tagRule = rules.find(r => r.name === 'resource_tagging');

      expect(tagRule).toBeDefined();
      expect(tagRule?.ruleCode).toContain('environment');
      expect(tagRule?.ruleCode).toContain('owner');
      expect(tagRule?.ruleCode).toContain('cost-center');
    });

    it('data_residency rule should check regions', () => {
      const rules = service.getAllRules();
      const residencyRule = rules.find(r => r.name === 'data_residency');

      expect(residencyRule).toBeDefined();
      expect(residencyRule?.ruleCode).toContain('location');
      expect(residencyRule?.ruleCode).toContain('regex');
    });
  });
});
