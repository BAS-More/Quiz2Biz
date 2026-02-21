/**
 * @fileoverview Tests for modules/qpg/services barrel exports
 */
import * as services from './index';

describe('modules/qpg/services index', () => {
  it('should export PromptTemplateService', () => {
    expect(services.PromptTemplateService).toBeDefined();
  });

  it('should export ContextBuilderService', () => {
    expect(services.ContextBuilderService).toBeDefined();
  });

  it('should export PromptGeneratorService', () => {
    expect(services.PromptGeneratorService).toBeDefined();
  });
});
