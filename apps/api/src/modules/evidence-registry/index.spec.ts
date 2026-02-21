/**
 * @fileoverview Tests for modules/evidence-registry barrel exports
 */
import * as evidenceRegistry from './index';

describe('modules/evidence-registry index', () => {
  it('should export EvidenceRegistryModule', () => {
    expect(evidenceRegistry.EvidenceRegistryModule).toBeDefined();
  });

  it('should export EvidenceRegistryService', () => {
    expect(evidenceRegistry.EvidenceRegistryService).toBeDefined();
  });

  it('should export EvidenceRegistryController', () => {
    expect(evidenceRegistry.EvidenceRegistryController).toBeDefined();
  });

  it('should export EvidenceIntegrityService', () => {
    expect(evidenceRegistry.EvidenceIntegrityService).toBeDefined();
  });

  it('should export CIArtifactIngestionService', () => {
    expect(evidenceRegistry.CIArtifactIngestionService).toBeDefined();
  });
});
