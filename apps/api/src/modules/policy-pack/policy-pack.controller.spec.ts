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

  describe('downloadPolicyPack', () => {
    it('should create ZIP archive and pipe to response', async () => {
      const mockGaps = [
        { dimensionKey: 'arch_sec', questionId: 'q-1', coverage: 0.3 },
      ];

      const mockBundle = {
        id: 'bundle-123',
        name: 'Policy Pack v1',
        version: '1.0.0',
        generatedAt: new Date(),
        policies: [{ id: 'pol-1', dimensionKey: 'arch_sec', title: 'Security Policy' }],
        opaPolicies: [],
        terraformRules: null,
        scoreAtGeneration: 72,
      };

      const mockFiles = [
        { path: 'policies/security.md', content: '# Security Policy' },
        { path: 'README.md', content: '# Policy Pack' },
      ];

      mockContextBuilder.buildGapContexts.mockResolvedValue(mockGaps);
      mockPolicyPackService.generatePolicyPack.mockResolvedValue(mockBundle);
      mockPolicyPackService.getExportStructure.mockReturnValue(mockFiles);

      // Mock response as a writable stream so archiver.pipe(res) works
      const mockRes = {
        set: jest.fn(),
        on: jest.fn().mockReturnThis(),
        once: jest.fn().mockReturnThis(),
        emit: jest.fn().mockReturnValue(true),
        write: jest.fn().mockReturnValue(true),
        end: jest.fn(),
        removeListener: jest.fn().mockReturnThis(),
        writable: true,
      };

      // Verify the service calls are made correctly
      expect(mockContextBuilder.buildGapContexts).not.toHaveBeenCalled();

      // Call the controller method - archiver will pipe to the mock response
      await controller.downloadPolicyPack('session-123', mockRes as any);

      expect(mockContextBuilder.buildGapContexts).toHaveBeenCalledWith('session-123');
      expect(mockPolicyPackService.generatePolicyPack).toHaveBeenCalledWith('session-123', mockGaps);
      expect(mockPolicyPackService.getExportStructure).toHaveBeenCalledWith(mockBundle);
    });
  });

  describe('generatePolicyPack - edge cases', () => {
    it('should handle bundle with no terraform rules', async () => {
      const mockGaps = [{ dimensionKey: 'arch_sec', questionId: 'q-1', coverage: 0.3 }];

      const mockBundle = {
        id: 'bundle-456',
        name: 'Policy Pack v2',
        version: '2.0.0',
        generatedAt: new Date(),
        policies: [{ id: 'pol-1', dimensionKey: 'arch_sec', title: 'Security Policy' }],
        opaPolicies: [],
        terraformRules: null,
        scoreAtGeneration: 65,
      };

      mockContextBuilder.buildGapContexts.mockResolvedValue(mockGaps);
      mockPolicyPackService.generatePolicyPack.mockResolvedValue(mockBundle);

      const result = await controller.generatePolicyPack('session-456');

      expect(result.hasTerraformRules).toBe(false);
      expect(result.opaPoliciesCount).toBe(0);
    });

    it('should return unique dimensions from policies', async () => {
      const mockGaps = [{ dimensionKey: 'arch_sec', questionId: 'q-1', coverage: 0.3 }];

      const mockBundle = {
        id: 'bundle-789',
        name: 'Policy Pack v3',
        version: '3.0.0',
        generatedAt: new Date(),
        policies: [
          { id: 'pol-1', dimensionKey: 'arch_sec', title: 'Policy 1' },
          { id: 'pol-2', dimensionKey: 'arch_sec', title: 'Policy 2' },
          { id: 'pol-3', dimensionKey: 'devops', title: 'Policy 3' },
        ],
        opaPolicies: [],
        terraformRules: null,
        scoreAtGeneration: 70,
      };

      mockContextBuilder.buildGapContexts.mockResolvedValue(mockGaps);
      mockPolicyPackService.generatePolicyPack.mockResolvedValue(mockBundle);

      const result = await controller.generatePolicyPack('session-789');

      expect(result.dimensions).toEqual(['arch_sec', 'devops']);
      expect(result.policiesCount).toBe(3);
    });
  });
});
