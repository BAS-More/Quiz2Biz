import { Test, TestingModule } from '@nestjs/testing';
import { PolicyPackController } from './policy-pack.controller';
import { PolicyPackService } from './policy-pack.service';
import { ContextBuilderService } from '../qpg/services/context-builder.service';

describe('PolicyPackController', () => {
  let controller: PolicyPackController;
  let policyPackService: PolicyPackService;
  let contextBuilder: ContextBuilderService;
  let module: TestingModule;

  const mockPolicyPackService = {
    generatePolicyPack: jest.fn(),
    getExportStructure: jest.fn(),
    getControlMappings: jest.fn(),
    getAllOpaPolicies: jest.fn(),
    getAllTerraformRules: jest.fn(),
  };

  const mockContextBuilder = {
    buildGapContexts: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [PolicyPackController],
      providers: [
        { provide: PolicyPackService, useValue: mockPolicyPackService },
        { provide: ContextBuilderService, useValue: mockContextBuilder },
      ],
    }).compile();

    controller = module.get<PolicyPackController>(PolicyPackController);
    policyPackService = module.get<PolicyPackService>(PolicyPackService);
    contextBuilder = module.get<ContextBuilderService>(ContextBuilderService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('generatePolicyPack', () => {
    it('should generate policy pack for session', async () => {
      const mockGaps = [
        { dimensionKey: 'arch_sec', questionId: 'q-1', coverage: 0.3 },
        { dimensionKey: 'devops', questionId: 'q-2', coverage: 0.5 },
      ];

      const mockBundle = {
        id: 'bundle-123',
        name: 'Policy Pack v1',
        version: '1.0.0',
        generatedAt: new Date(),
        policies: [
          { id: 'pol-1', dimensionKey: 'arch_sec', title: 'Security Policy' },
          { id: 'pol-2', dimensionKey: 'devops', title: 'DevOps Policy' },
        ],
        opaPolicies: [{ name: 'require_encryption' }],
        terraformRules: [{ name: 'enforce_tags' }],
        scoreAtGeneration: 72,
      };

      mockContextBuilder.buildGapContexts.mockResolvedValue(mockGaps);
      mockPolicyPackService.generatePolicyPack.mockResolvedValue(mockBundle);

      const result = await controller.generatePolicyPack('session-123');

      expect(result.id).toBe('bundle-123');
      expect(result.policiesCount).toBe(2);
      expect(result.opaPoliciesCount).toBe(1);
      expect(result.hasTerraformRules).toBe(true);
      expect(mockContextBuilder.buildGapContexts).toHaveBeenCalledWith('session-123');
    });
  });

  describe('getControlMappings', () => {
    it('should return control mappings for dimension', async () => {
      const mockMappings = [
        { controlId: 'A.5.1', standard: 'ISO27001', title: 'Policies for information security' },
        { controlId: 'PR.AC-1', standard: 'NIST CSF', title: 'Identities and credentials' },
      ];

      mockPolicyPackService.getControlMappings.mockReturnValue(mockMappings);

      const result = await controller.getControlMappings('arch_sec');

      expect(result.dimensionKey).toBe('arch_sec');
      expect(result.mappingsCount).toBe(2);
      expect(result.mappings).toHaveLength(2);
    });
  });

  describe('getOpaPolicies', () => {
    it('should return all OPA policies', async () => {
      const mockPolicies = [
        {
          name: 'require_encryption',
          description: 'Require encryption at rest',
          severity: 'HIGH',
          resourceTypes: ['aws_s3_bucket', 'azurerm_storage_account'],
        },
        {
          name: 'require_mfa',
          description: 'Require MFA for IAM users',
          severity: 'CRITICAL',
          resourceTypes: ['aws_iam_user'],
        },
      ];

      mockPolicyPackService.getAllOpaPolicies.mockReturnValue(mockPolicies);

      const result = await controller.getOpaPolicies();

      expect(result.count).toBe(2);
      expect(result.policies[0].name).toBe('require_encryption');
    });
  });

  describe('getTerraformRules', () => {
    it('should return all Terraform compliance rules', async () => {
      const mockRules = [
        {
          name: 'enforce_tags',
          description: 'Enforce required resource tags',
          dimensionKey: 'devops_iac',
          resourceTypes: ['aws_*', 'azurerm_*'],
        },
        {
          name: 'deny_public_access',
          description: 'Deny public access to storage',
          dimensionKey: 'arch_sec',
          resourceTypes: ['aws_s3_bucket'],
        },
      ];

      mockPolicyPackService.getAllTerraformRules.mockReturnValue(mockRules);

      const result = await controller.getTerraformRules();

      expect(result.count).toBe(2);
      expect(result.rules[0].name).toBe('enforce_tags');
    });
  });
});
