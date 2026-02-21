/**
 * @fileoverview Tests for modules/policy-pack barrel exports
 */
import * as policyPack from './index';

describe('modules/policy-pack index', () => {
  it('should export PolicyPackModule', () => {
    expect(policyPack.PolicyPackModule).toBeDefined();
  });

  it('should export PolicyPackService', () => {
    expect(policyPack.PolicyPackService).toBeDefined();
  });

  it('should export PolicyPackController', () => {
    expect(policyPack.PolicyPackController).toBeDefined();
  });

  it('should export services', () => {
    expect(policyPack.PolicyGeneratorService).toBeDefined();
  });

  it('should export types', () => {
    expect(policyPack.PolicyType).toBeDefined();
  });
});
