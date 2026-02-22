import { Test, TestingModule } from '@nestjs/testing';
import { ControlMappingService } from './control-mapping.service';
import { ComplianceFramework, MappingStrength } from '../types';

describe('ControlMappingService', () => {
  let service: ControlMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ControlMappingService],
    }).compile();

    service = module.get<ControlMappingService>(ControlMappingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMappingsForDimension', () => {
    it('should return mappings for arch_sec dimension', () => {
      const mappings = service.getMappingsForDimension('arch_sec');

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].framework).toBeDefined();
      expect(mappings[0].controlId).toBeDefined();
      expect(mappings[0].controlDescription).toBeDefined();
    });

    it('should return mappings from multiple frameworks by default', () => {
      const mappings = service.getMappingsForDimension('arch_sec');

      const frameworks = new Set(mappings.map(m => m.framework));
      expect(frameworks.has(ComplianceFramework.ISO_27001)).toBe(true);
      expect(frameworks.has(ComplianceFramework.NIST_CSF)).toBe(true);
      expect(frameworks.has(ComplianceFramework.OWASP_ASVS)).toBe(true);
    });

    it('should filter by specific frameworks when provided', () => {
      const mappings = service.getMappingsForDimension('arch_sec', [ComplianceFramework.ISO_27001]);

      const frameworks = new Set(mappings.map(m => m.framework));
      expect(frameworks.size).toBe(1);
      expect(frameworks.has(ComplianceFramework.ISO_27001)).toBe(true);
    });

    it('should return mappings for devops_iac dimension', () => {
      const mappings = service.getMappingsForDimension('devops_iac');

      expect(mappings.length).toBeGreaterThan(0);
    });

    it('should return mappings for compliance_policy dimension', () => {
      const mappings = service.getMappingsForDimension('compliance_policy');

      expect(mappings.length).toBeGreaterThan(0);
    });

    it('should return mappings for data_ai dimension', () => {
      const mappings = service.getMappingsForDimension('data_ai');

      expect(mappings.length).toBeGreaterThan(0);
    });

    it('should return mappings for people_change dimension', () => {
      const mappings = service.getMappingsForDimension('people_change');

      expect(mappings.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown dimension', () => {
      const mappings = service.getMappingsForDimension('unknown_dimension');

      expect(mappings).toEqual([]);
    });

    it('should set mapping strength to FULL', () => {
      const mappings = service.getMappingsForDimension('arch_sec');

      for (const mapping of mappings) {
        expect(mapping.mappingStrength).toBe(MappingStrength.FULL);
      }
    });
  });

  describe('getFrameworkControls', () => {
    it('should return ISO 27001 controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.ISO_27001);

      expect(controls.length).toBeGreaterThan(0);
      expect(controls.some(c => c.id.startsWith('A.'))).toBe(true);
    });

    it('should return NIST CSF controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.NIST_CSF);

      expect(controls.length).toBeGreaterThan(0);
      // NIST CSF has categories like ID, PR, DE, RS, RC
      const hasNistFormat = controls.some(c =>
        c.id.startsWith('ID.') ||
        c.id.startsWith('PR.') ||
        c.id.startsWith('DE.') ||
        c.id.startsWith('RS.') ||
        c.id.startsWith('RC.')
      );
      expect(hasNistFormat).toBe(true);
    });

    it('should return OWASP ASVS controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.OWASP_ASVS);

      expect(controls.length).toBeGreaterThan(0);
      expect(controls.some(c => c.id.startsWith('V'))).toBe(true);
    });

    it('should return empty array for frameworks without controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.SOC2);

      expect(controls).toEqual([]);
    });

    it('should return controls with dimension keys', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.ISO_27001);

      for (const control of controls) {
        expect(control.id).toBeDefined();
        expect(control.description).toBeDefined();
        expect(Array.isArray(control.dimensionKeys)).toBe(true);
        expect(control.dimensionKeys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getCoverageSummary', () => {
    it('should return coverage counts for each framework', () => {
      const summary = service.getCoverageSummary('arch_sec');

      expect(summary[ComplianceFramework.ISO_27001]).toBeDefined();
      expect(summary[ComplianceFramework.NIST_CSF]).toBeDefined();
      expect(summary[ComplianceFramework.OWASP_ASVS]).toBeDefined();
    });

    it('should return non-zero counts for arch_sec', () => {
      const summary = service.getCoverageSummary('arch_sec');

      expect(summary[ComplianceFramework.ISO_27001]).toBeGreaterThan(0);
      expect(summary[ComplianceFramework.NIST_CSF]).toBeGreaterThan(0);
      expect(summary[ComplianceFramework.OWASP_ASVS]).toBeGreaterThan(0);
    });

    it('should return zero for frameworks without mappings', () => {
      const summary = service.getCoverageSummary('arch_sec');

      expect(summary[ComplianceFramework.SOC2]).toBe(0);
      expect(summary[ComplianceFramework.GDPR]).toBe(0);
    });

    it('should return zeros for unknown dimension', () => {
      const summary = service.getCoverageSummary('unknown_dimension');

      for (const framework of Object.values(ComplianceFramework)) {
        expect(summary[framework]).toBe(0);
      }
    });

    it('should return different counts for different dimensions', () => {
      const archSecSummary = service.getCoverageSummary('arch_sec');
      const devopsSummary = service.getCoverageSummary('devops_iac');

      // These dimensions should have different coverage patterns
      expect(archSecSummary[ComplianceFramework.ISO_27001]).not.toBe(
        devopsSummary[ComplianceFramework.ISO_27001]
      );
    });
  });

  describe('ISO 27001 controls', () => {
    it('should have Annex A controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.ISO_27001);

      // ISO 27001 Annex A has controls A.5 through A.18
      const annexAControls = controls.filter(c =>
        c.id.match(/^A\.\d+\.\d+/)
      );
      expect(annexAControls.length).toBeGreaterThan(20);
    });

    it('should cover access control domain (A.9)', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.ISO_27001);
      const accessControls = controls.filter(c => c.id.startsWith('A.9'));

      expect(accessControls.length).toBeGreaterThan(0);
    });
  });

  describe('NIST CSF controls', () => {
    it('should have Identify (ID) function controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.NIST_CSF);
      const identifyControls = controls.filter(c => c.id.startsWith('ID.'));

      expect(identifyControls.length).toBeGreaterThan(0);
    });

    it('should have Protect (PR) function controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.NIST_CSF);
      const protectControls = controls.filter(c => c.id.startsWith('PR.'));

      expect(protectControls.length).toBeGreaterThan(0);
    });

    it('should have Detect (DE) function controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.NIST_CSF);
      const detectControls = controls.filter(c => c.id.startsWith('DE.'));

      expect(detectControls.length).toBeGreaterThan(0);
    });

    it('should have Respond (RS) function controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.NIST_CSF);
      const respondControls = controls.filter(c => c.id.startsWith('RS.'));

      expect(respondControls.length).toBeGreaterThan(0);
    });

    it('should have Recover (RC) function controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.NIST_CSF);
      const recoverControls = controls.filter(c => c.id.startsWith('RC.'));

      expect(recoverControls.length).toBeGreaterThan(0);
    });
  });

  describe('OWASP ASVS controls', () => {
    it('should have Architecture (V1) controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.OWASP_ASVS);
      const archControls = controls.filter(c => c.id.startsWith('V1.'));

      expect(archControls.length).toBeGreaterThan(0);
    });

    it('should have Authentication (V2) controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.OWASP_ASVS);
      const authControls = controls.filter(c => c.id.startsWith('V2.'));

      expect(authControls.length).toBeGreaterThan(0);
    });

    it('should have Session Management (V3) controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.OWASP_ASVS);
      const sessionControls = controls.filter(c => c.id.startsWith('V3.'));

      expect(sessionControls.length).toBeGreaterThan(0);
    });

    it('should have Data Protection (V8) controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.OWASP_ASVS);
      const dataControls = controls.filter(c => c.id.startsWith('V8.'));

      expect(dataControls.length).toBeGreaterThan(0);
    });

    it('should have API (V13) controls', () => {
      const controls = service.getFrameworkControls(ComplianceFramework.OWASP_ASVS);
      const apiControls = controls.filter(c => c.id.startsWith('V13.'));

      expect(apiControls.length).toBeGreaterThan(0);
    });
  });
});
