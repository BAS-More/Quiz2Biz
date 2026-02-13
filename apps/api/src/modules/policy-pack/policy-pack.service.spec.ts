import { Test, TestingModule } from '@nestjs/testing';
import { PolicyPackService } from './policy-pack.service';
import { PrismaService } from '@libs/database';
import { PolicyGeneratorService } from './services/policy-generator.service';
import { ControlMappingService } from './services/control-mapping.service';
import { OpaPolicyService } from './services/opa-policy.service';
import { TerraformRulesService } from './services/terraform-rules.service';
import { PolicyExportService } from './services/policy-export.service';
import { GapContext } from '../qpg/types';

describe('PolicyPackService', () => {
  let service: PolicyPackService;
  let policyGenerator: PolicyGeneratorService;
  let opaPolicy: OpaPolicyService;
  let terraformRules: TerraformRulesService;
  let exportService: PolicyExportService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyPackService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: PolicyGeneratorService,
          useValue: {
            generatePolicyForGap: jest.fn(),
          },
        },
        {
          provide: ControlMappingService,
          useValue: {
            getMappingsForDimension: jest.fn(),
          },
        },
        {
          provide: OpaPolicyService,
          useValue: {
            getPoliciesForDimension: jest.fn(),
            getAllPolicies: jest.fn(),
            generateCombinedRegoFile: jest.fn(),
          },
        },
        {
          provide: TerraformRulesService,
          useValue: {
            getRulesForDimension: jest.fn(),
            getAllRules: jest.fn(),
            generateFeatureFile: jest.fn(),
          },
        },
        {
          provide: PolicyExportService,
          useValue: {
            generateReadme: jest.fn(),
            getExportStructure: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PolicyPackService>(PolicyPackService);
    policyGenerator = module.get<PolicyGeneratorService>(PolicyGeneratorService);
    opaPolicy = module.get<OpaPolicyService>(OpaPolicyService);
    terraformRules = module.get<TerraformRulesService>(TerraformRulesService);
    exportService = module.get<PolicyExportService>(PolicyExportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generatePolicyPack', () => {
    it('generates complete policy pack from gaps', async () => {
      const gaps: GapContext[] = [
        {
          sessionId: 'session-123',
          questionId: 'q1',
          dimensionKey: 'security',
          dimensionName: 'Security',
          persona: 'CTO',
          severity: 0.8,
          currentCoverage: 0.25,
          residualRisk: 0.6,
          questionText: 'Do you have MFA?',
          answer: 'No',
          bestPractice: 'Implement MFA for all users',
          practicalExplainer: 'MFA adds a second layer of security',
          standardRefs: ['ISO 27001 A.9.4.2'],
        } as GapContext,
      ];

      const mockPolicy = {
        id: 'policy-1',
        title: 'MFA Policy',
        category: 'security',
        content: 'Implement MFA',
      };

      const mockOpaPolicy = {
        id: 'opa-1',
        name: 'security_mfa',
        rego: 'package security',
      };

      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-123',
        readinessScore: 85.5,
      } as any);

      jest.spyOn(policyGenerator, 'generatePolicyForGap').mockResolvedValue(mockPolicy as any);
      jest.spyOn(opaPolicy, 'getPoliciesForDimension').mockReturnValue([mockOpaPolicy] as any);
      jest.spyOn(terraformRules, 'getRulesForDimension').mockReturnValue([{ id: 'rule-1' }] as any);
      jest.spyOn(terraformRules, 'generateFeatureFile').mockReturnValue('terraform rules content');
      jest.spyOn(exportService, 'generateReadme').mockReturnValue('# Policy Pack README');

      const result = await service.generatePolicyPack('session-123', gaps);

      expect(result).toMatchObject({
        name: expect.stringContaining('Quiz2Biz Policy Pack'),
        version: '1.0.0',
        policies: [mockPolicy],
        opaPolicies: [mockOpaPolicy],
        terraformRules: 'terraform rules content',
        readmeContent: '# Policy Pack README',
        sourceSessionId: 'session-123',
        scoreAtGeneration: 85.5,
      });
    });

    it('handles policy generation failures gracefully', async () => {
      const gaps: GapContext[] = [
        {
          sessionId: 'session-123',
          questionId: 'q1',
          dimensionKey: 'security',
          dimensionName: 'Security',
          persona: 'CTO',
          severity: 0.8,
          currentCoverage: 0.25,
          residualRisk: 0.6,
          questionText: 'Do you have MFA?',
          answer: 'No',
          bestPractice: 'Implement MFA for all users',
          practicalExplainer: 'MFA adds a second layer of security',
          standardRefs: ['ISO 27001 A.9.4.2'],
        } as GapContext,
      ];

      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue({
        id: 'session-123',
        readinessScore: 85.5,
      } as any);

      jest
        .spyOn(policyGenerator, 'generatePolicyForGap')
        .mockRejectedValue(new Error('Generation failed'));
      jest.spyOn(opaPolicy, 'getPoliciesForDimension').mockReturnValue([]);
      jest.spyOn(terraformRules, 'getRulesForDimension').mockReturnValue([]);
      jest.spyOn(terraformRules, 'generateFeatureFile').mockReturnValue('');
      jest.spyOn(exportService, 'generateReadme').mockReturnValue('# README');

      const result = await service.generatePolicyPack('session-123', gaps);

      expect(result.policies).toHaveLength(0);
    });
  });

  describe('getControlMappings', () => {
    it('delegates to control mapping service', () => {
      const mockMappings = [{ standard: 'ISO 27001', controls: ['A.5.1.1'] }];
      jest
        .spyOn(service['controlMapping'], 'getMappingsForDimension')
        .mockReturnValue(mockMappings as any);

      const result = service.getControlMappings('security');

      expect(result).toEqual(mockMappings);
    });
  });

  describe('getAllOpaPolicies', () => {
    it('delegates to OPA policy service', () => {
      const mockPolicies = [{ id: 'opa-1', name: 'test' }];
      jest.spyOn(opaPolicy, 'getAllPolicies').mockReturnValue(mockPolicies as any);

      const result = service.getAllOpaPolicies();

      expect(result).toEqual(mockPolicies);
    });
  });

  describe('getAllTerraformRules', () => {
    it('delegates to Terraform rules service', () => {
      const mockRules = [{ id: 'rule-1', description: 'Test rule' }];
      jest.spyOn(terraformRules, 'getAllRules').mockReturnValue(mockRules as any);

      const result = service.getAllTerraformRules();

      expect(result).toEqual(mockRules);
    });
  });

  describe('generateCombinedOpaFile', () => {
    it('generates combined Rego file', () => {
      const policies = [{ id: 'opa-1', name: 'policy1', rego: 'package policy1' }];

      jest.spyOn(opaPolicy, 'generateCombinedRegoFile').mockReturnValue('combined rego content');

      const result = service.generateCombinedOpaFile(policies as any);

      expect(result).toBe('combined rego content');
    });
  });
});
