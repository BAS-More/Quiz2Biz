/**
 * @fileoverview Tests for modules/adapters barrel exports
 */
import * as adapters from './index';

describe('modules/adapters index', () => {
  it('should export AdaptersModule', () => {
    expect(adapters.AdaptersModule).toBeDefined();
  });

  it('should export GitHubAdapter', () => {
    expect(adapters.GitHubAdapter).toBeDefined();
  });

  it('should export GitLabAdapter', () => {
    expect(adapters.GitLabAdapter).toBeDefined();
  });

  it('should export JiraConfluenceAdapter', () => {
    expect(adapters.JiraConfluenceAdapter).toBeDefined();
  });

  it('should export AdapterConfigService', () => {
    expect(adapters.AdapterConfigService).toBeDefined();
  });

  it('should export AdapterController', () => {
    expect(adapters.AdapterController).toBeDefined();
  });
});
