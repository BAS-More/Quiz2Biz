/**
 * @fileoverview Tests for modules/policy-pack/services barrel exports
 */
import * as services from './index';

describe('modules/policy-pack/services index', () => {
  it('should export PolicyGeneratorService', () => {
    expect(services.PolicyGeneratorService).toBeDefined();
  });

  it('should export ControlMappingService', () => {
    expect(services.ControlMappingService).toBeDefined();
  });

  it('should export OpaPolicyService', () => {
    expect(services.OpaPolicyService).toBeDefined();
  });

  it('should export TerraformRulesService', () => {
    expect(services.TerraformRulesService).toBeDefined();
  });

  it('should export PolicyExportService', () => {
    expect(services.PolicyExportService).toBeDefined();
  });
});
