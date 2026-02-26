import { Test, TestingModule } from '@nestjs/testing';
import { PolicyExportService } from './policy-export.service';
import {
  PolicyPackBundle,
  PolicyDocument,
  PolicyType,
  DocumentStatus,
  OpaPolicy,
  PolicySeverity,
  RequirementLevel,
  ComplianceFramework,
  MappingStrength,
} from '../types';

describe('PolicyExportService', () => {
  let service: PolicyExportService;

  const mockPolicyDocument: PolicyDocument = {
    id: 'policy-1',
    title: 'Security Policy',
    version: '1.0.0',
    type: PolicyType.SECURITY,
    status: DocumentStatus.APPROVED,
    owner: 'Security Team',
    effectiveDate: new Date('2024-01-01'),
    reviewDate: new Date('2025-01-01'),
    dimensionKey: 'arch_sec',
    objective: 'Ensure security best practices',
    scope: 'All applications',
    tags: ['security', 'mandatory'],
    statements: [
      { id: 'stmt-1', requirement: RequirementLevel.SHALL, text: 'Use HTTPS', evidenceRequired: true },
      { id: 'stmt-2', requirement: RequirementLevel.SHOULD, text: 'Implement MFA', evidenceRequired: false },
      { id: 'stmt-3', requirement: RequirementLevel.MAY, text: 'Use biometrics', evidenceRequired: false },
    ],
    standards: [
      {
        id: 'std-1',
        policyId: 'policy-1',
        title: 'Authentication Standard',
        version: '1.0.0',
        requirements: [
          {
            id: 'AUTH-001',
            description: 'Require strong passwords',
            specification: 'Min 12 chars',
            verificationMethod: 'Automated testing',
          },
        ],
        procedures: [
          {
            id: 'proc-1',
            standardId: 'std-1',
            title: 'Password Reset',
            version: '1.0.0',
            roles: ['User', 'Admin'],
            toolsRequired: ['Identity Management System'],
            frequency: 'On demand',
            steps: [
              { order: 1, description: 'Submit reset request', responsibleRole: 'User' },
              { order: 2, description: 'Verify identity', responsibleRole: 'Admin' },
            ],
          },
        ],
        controlMappings: [],
      },
    ],
    controlMappings: [
      { framework: ComplianceFramework.ISO_27001, controlId: 'A.9.2', controlDescription: 'User access management', mappingStrength: MappingStrength.FULL },
      { framework: ComplianceFramework.NIST_CSF, controlId: 'PR.AC-1', controlDescription: 'Identities managed', mappingStrength: MappingStrength.FULL },
    ],
  };

  const mockOpaPolicy: OpaPolicy = {
    name: 'require_https',
    packageName: 'quiz2biz.security',
    description: 'Require HTTPS',
    severity: PolicySeverity.HIGH,
    resourceTypes: ['kubernetes_ingress'],
    regoCode: 'package quiz2biz.security\ndeny[msg] { true }',
    tests: [],
  };

  const mockBundle: PolicyPackBundle = {
    id: 'bundle-1',
    name: 'Test Policy Pack',
    version: '1.0.0',
    generatedAt: new Date('2024-06-01T12:00:00Z'),
    sourceSessionId: 'session-123',
    scoreAtGeneration: 85,
    policies: [mockPolicyDocument],
    opaPolicies: [mockOpaPolicy],
    terraformRules: 'Feature: Test\n  Scenario: Test scenario',
    readmeContent: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyExportService],
    }).compile();

    service = module.get<PolicyExportService>(PolicyExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateReadme', () => {
    it('should generate README with bundle name and version', () => {
      const readme = service.generateReadme(mockBundle);

      expect(readme).toContain('# Test Policy Pack');
      expect(readme).toContain('Version: 1.0.0');
    });

    it('should include policy list', () => {
      const readme = service.generateReadme(mockBundle);

      expect(readme).toContain('**Security Policy**');
      expect(readme).toContain('Dimension: arch_sec');
    });

    it('should include OPA policies section', () => {
      const readme = service.generateReadme(mockBundle);

      expect(readme).toContain('### OPA/Rego Policies');
      expect(readme).toContain('require_https');
    });

    it('should include usage instructions', () => {
      const readme = service.generateReadme(mockBundle);

      expect(readme).toContain('## Usage');
      expect(readme).toContain('opa eval');
      expect(readme).toContain('terraform-compliance');
    });

    it('should include control mapping summary', () => {
      const readme = service.generateReadme(mockBundle);

      expect(readme).toContain('## Control Mappings');
      expect(readme).toContain('ISO_27001');
      expect(readme).toContain('NIST_CSF');
    });

    it('should include session info when available', () => {
      const readme = service.generateReadme(mockBundle);

      expect(readme).toContain('session-123');
      expect(readme).toContain('85%');
    });

    it('should handle bundle without session info', () => {
      const bundleNoSession = { ...mockBundle, sourceSessionId: undefined };
      const readme = service.generateReadme(bundleNoSession);

      expect(readme).not.toContain('Generated from Quiz2Biz Session');
    });
  });

  describe('generatePolicyMarkdown', () => {
    it('should generate policy title and metadata', () => {
      const markdown = service.generatePolicyMarkdown(mockPolicyDocument);

      expect(markdown).toContain('# Security Policy');
      expect(markdown).toContain('**Version:** 1.0.0');
      expect(markdown).toContain('**Type:** SECURITY');
      expect(markdown).toContain('**Owner:** Security Team');
    });

    it('should include objective and scope', () => {
      const markdown = service.generatePolicyMarkdown(mockPolicyDocument);

      expect(markdown).toContain('## Objective');
      expect(markdown).toContain('Ensure security best practices');
      expect(markdown).toContain('## Scope');
      expect(markdown).toContain('All applications');
    });

    it('should format policy statements with icons', () => {
      const markdown = service.generatePolicyMarkdown(mockPolicyDocument);

      expect(markdown).toContain('🔴 **SHALL:** Use HTTPS');
      expect(markdown).toContain('🟡 **SHOULD:** Implement MFA');
      expect(markdown).toContain('🟢 **MAY:** Use biometrics');
    });

    it('should mark evidence required statements', () => {
      const markdown = service.generatePolicyMarkdown(mockPolicyDocument);

      expect(markdown).toContain('*Evidence required*');
    });

    it('should include standards section', () => {
      const markdown = service.generatePolicyMarkdown(mockPolicyDocument);

      expect(markdown).toContain('## Standards');
      expect(markdown).toContain('### Authentication Standard');
      expect(markdown).toContain('AUTH-001');
    });

    it('should include procedures', () => {
      const markdown = service.generatePolicyMarkdown(mockPolicyDocument);

      expect(markdown).toContain('#### Procedures');
      expect(markdown).toContain('Password Reset');
      expect(markdown).toContain('**Roles:** User, Admin');
    });

    it('should include control mappings table', () => {
      const markdown = service.generatePolicyMarkdown(mockPolicyDocument);

      expect(markdown).toContain('## Control Mappings');
      expect(markdown).toContain('| Framework | Control ID | Description |');
      expect(markdown).toContain('| ISO_27001 | A.9.2 |');
    });

    it('should handle policy without standards', () => {
      const policyNoStandards = { ...mockPolicyDocument, standards: [] };
      const markdown = service.generatePolicyMarkdown(policyNoStandards);

      expect(markdown).not.toContain('## Standards');
    });

    it('should handle policy without control mappings', () => {
      const policyNoMappings = { ...mockPolicyDocument, controlMappings: [] };
      const markdown = service.generatePolicyMarkdown(policyNoMappings);

      expect(markdown).not.toContain('## Control Mappings');
    });

    it('should handle standard without procedures', () => {
      const policyEmptyProcs = {
        ...mockPolicyDocument,
        standards: [{ ...mockPolicyDocument.standards[0], procedures: [] }],
      };
      const markdown = service.generatePolicyMarkdown(policyEmptyProcs);

      expect(markdown).not.toContain('#### Procedures');
    });
  });

  describe('generateManifest', () => {
    it('should generate valid JSON manifest', () => {
      const manifest = service.generateManifest(mockBundle);
      const parsed = JSON.parse(manifest);

      expect(parsed.id).toBe('bundle-1');
      expect(parsed.name).toBe('Test Policy Pack');
      expect(parsed.version).toBe('1.0.0');
    });

    it('should include contents summary', () => {
      const manifest = service.generateManifest(mockBundle);
      const parsed = JSON.parse(manifest);

      expect(parsed.contents.policies).toHaveLength(1);
      expect(parsed.contents.policies[0].title).toBe('Security Policy');
      expect(parsed.contents.opaPolicies).toHaveLength(1);
      expect(parsed.contents.hasTerraformRules).toBe(true);
    });

    it('should handle bundle without terraform rules', () => {
      const bundleNoTf = { ...mockBundle, terraformRules: '' } as PolicyPackBundle;
      const manifest = service.generateManifest(bundleNoTf);
      const parsed = JSON.parse(manifest);

      expect(parsed.contents.hasTerraformRules).toBe(false);
    });
  });

  describe('getExportStructure', () => {
    it('should include README and manifest', () => {
      const files = service.getExportStructure(mockBundle);

      expect(files.find(f => f.path === 'README.md')).toBeDefined();
      expect(files.find(f => f.path === 'manifest.json')).toBeDefined();
    });

    it('should include policy files in correct directories', () => {
      const files = service.getExportStructure(mockBundle);

      const policyMd = files.find(f => f.path.includes('policies/arch_sec/policy-1.md'));
      const policyJson = files.find(f => f.path.includes('policies/arch_sec/policy-1.json'));

      expect(policyMd).toBeDefined();
      expect(policyJson).toBeDefined();
    });

    it('should include OPA policy files', () => {
      const files = service.getExportStructure(mockBundle);

      const opaFile = files.find(f => f.path === 'opa-policies/require_https.rego');
      expect(opaFile).toBeDefined();
      expect(opaFile?.content).toContain('package quiz2biz.security');
    });

    it('should include combined OPA policy file', () => {
      const files = service.getExportStructure(mockBundle);

      const combinedOpa = files.find(f => f.path === 'opa-policies/combined.rego');
      expect(combinedOpa).toBeDefined();
    });

    it('should include terraform rules when present', () => {
      const files = service.getExportStructure(mockBundle);

      const tfFile = files.find(f => f.path === 'terraform/features/quiz2biz.feature');
      expect(tfFile).toBeDefined();
      expect(tfFile?.content).toContain('Feature: Test');
    });

    it('should not include terraform files when rules absent', () => {
      const bundleNoTf = { ...mockBundle, terraformRules: '' } as PolicyPackBundle;
      const files = service.getExportStructure(bundleNoTf);

      const tfFile = files.find(f => f.path.includes('terraform/'));
      expect(tfFile).toBeUndefined();
    });

    it('should not include combined OPA when no policies', () => {
      const bundleNoOpa = { ...mockBundle, opaPolicies: [] };
      const files = service.getExportStructure(bundleNoOpa);

      const combinedOpa = files.find(f => f.path === 'opa-policies/combined.rego');
      expect(combinedOpa).toBeUndefined();
    });
  });

  describe('uncovered branches', () => {
    it('should output "N/A" when scoreAtGeneration is null', () => {
      const bundleNullScore = {
        ...mockBundle,
        scoreAtGeneration: null,
      } as unknown as PolicyPackBundle;

      const markdown = service.generateReadme(bundleNullScore);

      expect(markdown).toContain('Score at Generation: N/A%');
    });

    it('should output "As needed" when procedure frequency is null', () => {
      const policyWithNullFreq = {
        ...mockPolicyDocument,
        standards: [
          {
            ...mockPolicyDocument.standards[0],
            procedures: [
              {
                ...mockPolicyDocument.standards[0].procedures[0],
                frequency: null,
              },
            ],
          },
        ],
      };

      const markdown = service.generatePolicyMarkdown(policyWithNullFreq as any);

      expect(markdown).toContain('**Frequency:** As needed');
    });
  });
});
