import { Test, TestingModule } from '@nestjs/testing';
import { OpaPolicyService } from './opa-policy.service';
import { PolicySeverity } from '../types';

describe('OpaPolicyService', () => {
  let service: OpaPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpaPolicyService],
    }).compile();

    service = module.get<OpaPolicyService>(OpaPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPoliciesForDimension', () => {
    it('should return policies for arch_sec dimension', () => {
      const policies = service.getPoliciesForDimension('arch_sec');

      expect(policies.length).toBeGreaterThan(0);
      expect(policies[0].name).toBe('require_https');
      expect(policies[0].packageName).toBe('quiz2biz.security');
    });

    it('should return policies for devops_iac dimension', () => {
      const policies = service.getPoliciesForDimension('devops_iac');

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some((p) => p.name === 'require_tags')).toBe(true);
    });

    it('should return policies for compliance_policy dimension', () => {
      const policies = service.getPoliciesForDimension('compliance_policy');

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some((p) => p.name === 'audit_logging_enabled')).toBe(true);
    });

    it('should return empty array for unknown dimension', () => {
      const policies = service.getPoliciesForDimension('unknown_dimension');

      expect(policies).toEqual([]);
    });
  });

  describe('getAllPolicies', () => {
    it('should return all policies from all dimensions', () => {
      const policies = service.getAllPolicies();

      expect(policies.length).toBeGreaterThan(0);

      // Should contain policies from multiple dimensions
      const archSecPolicies = policies.filter((p) => p.packageName.includes('security'));
      const govPolicies = policies.filter((p) => p.packageName.includes('governance'));
      const compliancePolicies = policies.filter((p) => p.packageName.includes('compliance'));

      expect(archSecPolicies.length).toBeGreaterThan(0);
      expect(govPolicies.length).toBeGreaterThan(0);
      expect(compliancePolicies.length).toBeGreaterThan(0);
    });

    it('should return policies with all required properties', () => {
      const policies = service.getAllPolicies();

      for (const policy of policies) {
        expect(policy.name).toBeDefined();
        expect(policy.packageName).toBeDefined();
        expect(policy.description).toBeDefined();
        expect(policy.severity).toBeDefined();
        expect(policy.resourceTypes).toBeDefined();
        expect(policy.regoCode).toBeDefined();
      }
    });
  });

  describe('generateCombinedRegoFile', () => {
    it('should generate combined file with header', () => {
      const policies = service.getPoliciesForDimension('arch_sec');
      const combined = service.generateCombinedRegoFile(policies);

      expect(combined).toContain('# Quiz2Biz Auto-Generated OPA Policies');
      expect(combined).toContain('# Generated at:');
    });

    it('should include all policies with metadata', () => {
      const policies = service.getPoliciesForDimension('arch_sec');
      const combined = service.generateCombinedRegoFile(policies);

      for (const policy of policies) {
        expect(combined).toContain(`# Policy: ${policy.name}`);
        expect(combined).toContain(`# Description: ${policy.description}`);
        expect(combined).toContain(`# Severity: ${policy.severity}`);
        expect(combined).toContain(policy.regoCode);
      }
    });

    it('should separate policies with dividers', () => {
      const policies = service.getPoliciesForDimension('arch_sec');
      const combined = service.generateCombinedRegoFile(policies);

      const dividerCount = (combined.match(/---/g) || []).length;
      expect(dividerCount).toBe(policies.length);
    });

    it('should handle empty policy list', () => {
      const combined = service.generateCombinedRegoFile([]);

      expect(combined).toContain('# Quiz2Biz Auto-Generated OPA Policies');
      expect(combined.trim().split('\n').length).toBeLessThanOrEqual(4);
    });
  });

  describe('validateRegoSyntax', () => {
    it('should validate correct Rego syntax', () => {
      const validRego = `
package quiz2biz.test

deny[msg] {
  input.valid == false
  msg := "Invalid input"
}
`;
      const result = service.validateRegoSyntax(validRego);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing package declaration', () => {
      const invalidRego = `
deny[msg] {
  input.valid == false
  msg := "Invalid input"
}
`;
      const result = service.validateRegoSyntax(invalidRego);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing package declaration');
    });

    it('should detect missing rule definition', () => {
      const invalidRego = `
package quiz2biz.test

some_variable := "value"
`;
      const result = service.validateRegoSyntax(invalidRego);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No deny, allow, or violation rule found');
    });

    it('should accept allow rules', () => {
      const validRego = `
package quiz2biz.test

allow[msg] {
  input.valid == true
  msg := "Valid input"
}
`;
      const result = service.validateRegoSyntax(validRego);

      expect(result.valid).toBe(true);
    });

    it('should accept violation rules', () => {
      const validRego = `
package quiz2biz.test

violation[msg] {
  input.compliant == false
  msg := "Non-compliant"
}
`;
      const result = service.validateRegoSyntax(validRego);

      expect(result.valid).toBe(true);
    });
  });

  describe('policy templates', () => {
    it('should have correct severity levels', () => {
      const policies = service.getAllPolicies();

      const severities = new Set(policies.map((p) => p.severity));
      expect(severities.has(PolicySeverity.CRITICAL)).toBe(true);
      expect(severities.has(PolicySeverity.HIGH)).toBe(true);
      expect(severities.has(PolicySeverity.MEDIUM)).toBe(true);
    });

    it('should have tests defined for critical policies', () => {
      const policies = service.getAllPolicies();
      const criticalPolicies = policies.filter(
        (p) => p.severity === PolicySeverity.CRITICAL || p.severity === PolicySeverity.HIGH,
      );

      // At least some critical/high policies should have tests
      const withTests = criticalPolicies.filter((p) => p.tests && p.tests.length > 0);
      expect(withTests.length).toBeGreaterThan(0);
    });

    it('should have valid resource types', () => {
      const policies = service.getAllPolicies();

      for (const policy of policies) {
        expect(Array.isArray(policy.resourceTypes)).toBe(true);
        expect(policy.resourceTypes.length).toBeGreaterThan(0);
      }
    });
  });
});
