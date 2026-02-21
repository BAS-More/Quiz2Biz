/**
 * @fileoverview Tests for modules/qpg barrel exports
 */
import * as qpg from './index';

describe('modules/qpg index', () => {
  it('should export QpgModule', () => {
    expect(qpg.QpgModule).toBeDefined();
  });

  it('should export QpgService', () => {
    expect(qpg.QpgService).toBeDefined();
  });

  it('should export QpgController', () => {
    expect(qpg.QpgController).toBeDefined();
  });

  it('should export services', () => {
    expect(qpg.PromptGeneratorService).toBeDefined();
    expect(qpg.ContextBuilderService).toBeDefined();
  });

  it('should export DTOs', () => {
    expect(qpg.GeneratePromptsDto).toBeDefined();
  });
});
