import { Test, TestingModule } from '@nestjs/testing';
import { PolicyGeneratorService } from './policy-generator.service';
import { ControlMappingService } from './control-mapping.service';
import { GapContext } from '../../qpg/types';
import { PolicyType, DocumentStatus, RequirementLevel } from '../types';

describe('PolicyGeneratorService', () => {
  let service: PolicyGeneratorService;
  let controlMappingService: jest.Mocked<ControlMappingService>;

  const mockControlMappingService = {
    getMappingsForDimension: jest.fn(),
  };

  const mockGapContext: GapContext = {
    sessionId: 'session-1',
    dimensionKey: 'arch_sec',
    dimensionName: 'Security Architecture',
    questionId: 'q-1',
    questionText: 'Do you have security architecture?',
    currentCoverage: 0.3,
    severity: 0.8,
    residualRisk: 0.56,
    bestPractice: 'Implement defense-in-depth security',
    practicalExplainer: 'Security is essential for protection',
    standardRefs: ['ISO-27001', 'NIST-800-53'],
    userAnswer: 'We have basic security',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockControlMappingService.getMappingsForDimension.mockReturnValue([
      { frameworkId: 'ISO27001', controlId: 'A.9.1.1', description: 'Access control policy' },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyGeneratorService,
        { provide: ControlMappingService, useValue: mockControlMappingService },
      ],
    }).compile();

    service = module.get<PolicyGeneratorService>(PolicyGeneratorService);
    controlMappingService = module.get(ControlMappingService);
  });

  describe('generatePolicyForGap', () => {
    it('should generate policy for arch_sec dimension', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^pol-/);
      expect(result.title).toBe('Information Security Policy');
      expect(result.type).toBe(PolicyType.SECURITY);
      expect(result.dimensionKey).toBe('arch_sec');
      expect(result.status).toBe(DocumentStatus.DRAFT);
      expect(result.generatedFromGap).toBe(true);
      expect(result.sourceSessionId).toBe('session-1');
    });

    it('should include statements with requirement levels', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      expect(result.statements.length).toBeGreaterThan(0);
      const shallStatements = result.statements.filter(
        (s) => s.requirement === RequirementLevel.SHALL,
      );
      expect(shallStatements.length).toBeGreaterThan(0);
      expect(shallStatements[0].evidenceRequired).toBe(true);
    });

    it('should include standards with requirements', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      expect(result.standards).toBeDefined();
      expect(result.standards.length).toBe(1);
      expect(result.standards[0].requirements.length).toBeGreaterThan(0);
    });

    it('should include procedures with steps', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      const standard = result.standards[0];
      expect(standard.procedures).toBeDefined();
      expect(standard.procedures.length).toBe(1);
      expect(standard.procedures[0].steps.length).toBeGreaterThan(0);
    });

    it('should include control mappings', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      expect(mockControlMappingService.getMappingsForDimension).toHaveBeenCalledWith('arch_sec');
      expect(result.controlMappings).toBeDefined();
    });

    it('should set review date to 1 year from now', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      expect(result.reviewDate.getFullYear()).toBe(oneYearFromNow.getFullYear());
    });

    it('should include dimension-specific tags', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      expect(result.tags).toContain('arch_sec');
      expect(result.tags).toContain('security');
    });
  });

  describe('generatePolicyForGap - DevOps dimension', () => {
    const devopsGap: GapContext = {
      ...mockGapContext,
      dimensionKey: 'devops_iac',
      dimensionName: 'DevOps & Infrastructure',
    };

    it('should generate DevOps policy', async () => {
      const result = await service.generatePolicyForGap(devopsGap);

      expect(result.title).toBe('DevOps and Infrastructure Policy');
      expect(result.type).toBe(PolicyType.OPERATIONAL);
    });
  });

  describe('generatePolicyForGap - Privacy dimension', () => {
    const privacyGap: GapContext = {
      ...mockGapContext,
      dimensionKey: 'privacy_legal',
      dimensionName: 'Privacy & Legal',
    };

    it('should generate Privacy policy', async () => {
      const result = await service.generatePolicyForGap(privacyGap);

      expect(result.title).toBe('Data Privacy and Protection Policy');
      expect(result.type).toBe(PolicyType.PRIVACY);
    });
  });

  describe('generatePolicyForGap - Unknown dimension', () => {
    const unknownGap: GapContext = {
      ...mockGapContext,
      dimensionKey: 'unknown_dimension',
      dimensionName: 'Unknown Dimension',
    };

    it('should generate generic policy for unknown dimensions', async () => {
      const result = await service.generatePolicyForGap(unknownGap);

      expect(result.title).toBe('Unknown Dimension Policy');
      expect(result.type).toBe(PolicyType.OPERATIONAL);
      expect(result.statements.length).toBe(1);
      expect(result.standards).toEqual([]);
    });

    it('should use bestPractice in generic policy statement', async () => {
      const result = await service.generatePolicyForGap(unknownGap);

      expect(result.statements[0].text).toBe(unknownGap.bestPractice);
      expect(result.statements[0].requirement).toBe(RequirementLevel.SHALL);
    });
  });

  describe('interpolate', () => {
    it('should interpolate dimensionName in objective', async () => {
      const result = await service.generatePolicyForGap(mockGapContext);

      expect(result.objective).not.toContain('{{dimensionName}}');
    });
  });
});
