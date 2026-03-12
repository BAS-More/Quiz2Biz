/**
 * @fileoverview Tests for adapters module
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdapterController } from './adapter.controller';
import { GitHubAdapter } from './github.adapter';
import { GitLabAdapter } from './gitlab.adapter';
import { JiraConfluenceAdapter } from './jira-confluence.adapter';
import { AdapterConfigService, AdapterType } from './adapter-config.service';
import { PrismaService } from '@libs/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdapterController', () => {
  let controller: AdapterController;
  let adapterConfigService: jest.Mocked<AdapterConfigService>;

  const mockAdapterConfig = {
    id: 'adapter-1',
    tenantId: 'tenant-1',
    type: 'github' as AdapterType,
    name: 'Test GitHub',
    enabled: true,
    config: {
      token: 'secret-token',
      owner: 'test-owner',
      repo: 'test-repo',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdapterController],
      providers: [
        {
          provide: GitHubAdapter,
          useValue: {
            getPullRequests: jest.fn(),
            getCheckRuns: jest.fn(),
            getReleases: jest.fn(),
            getWorkflowRuns: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: GitLabAdapter,
          useValue: {
            getMergeRequests: jest.fn(),
            getPipelines: jest.fn(),
            getReleases: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: JiraConfluenceAdapter,
          useValue: {
            getIssues: jest.fn(),
            getPages: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: AdapterConfigService,
          useValue: {
            getSupportedAdapterTypes: jest
              .fn()
              .mockReturnValue(['github', 'gitlab', 'jira', 'confluence', 'azure_devops']),
            getAdapterTypeInfo: jest.fn(),
            getAdapterConfigs: jest.fn(),
            getAdapterConfig: jest.fn(),
            upsertAdapterConfig: jest.fn(),
            deleteAdapterConfig: jest.fn(),
            validateConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdapterController>(AdapterController);
    adapterConfigService = module.get(AdapterConfigService);
    module.get(GitHubAdapter);
    module.get(GitLabAdapter);
    module.get(JiraConfluenceAdapter);
  });

  describe('getSupportedTypes', () => {
    it('should return supported adapter types', () => {
      const result = controller.getSupportedTypes();

      expect(result.types).toContain('github');
      expect(result.types).toContain('gitlab');
      expect(result.types).toContain('jira');
    });
  });

  describe('getTypeInfo', () => {
    it('should return adapter type information', () => {
      const typeInfo = {
        displayName: 'GitHub',
        description: 'GitHub integration',
        icon: 'github',
        capabilities: ['pull_requests', 'workflow_runs'],
      };
      adapterConfigService.getAdapterTypeInfo.mockReturnValue(typeInfo);

      const result = controller.getTypeInfo('github');

      expect(result).toEqual(typeInfo);
      expect(adapterConfigService.getAdapterTypeInfo).toHaveBeenCalledWith('github');
    });
  });

  describe('listConfigs', () => {
    it('should return list of adapter configs', async () => {
      adapterConfigService.getAdapterConfigs.mockResolvedValue([mockAdapterConfig]);

      const result = await controller.listConfigs('tenant-1');

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].name).toBe('Test GitHub');
      // Token should be redacted
      expect(result.configs[0].config.token).not.toBe('secret-token');
    });

    it('should filter by type', async () => {
      adapterConfigService.getAdapterConfigs.mockResolvedValue([
        mockAdapterConfig,
        { ...mockAdapterConfig, id: 'adapter-2', type: 'gitlab' as AdapterType },
      ]);

      const result = await controller.listConfigs('tenant-1', 'github');

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].type).toBe('github');
    });

    it('should filter by enabled status', async () => {
      adapterConfigService.getAdapterConfigs.mockResolvedValue([
        mockAdapterConfig,
        { ...mockAdapterConfig, id: 'adapter-2', enabled: false },
      ]);

      const result = await controller.listConfigs('tenant-1', undefined, true);

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].enabled).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return adapter config by ID', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.id).toBe('adapter-1');
      expect(adapterConfigService.getAdapterConfig).toHaveBeenCalledWith('tenant-1', 'adapter-1');
    });

    it('should throw NotFoundException when adapter not found', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(null);

      await expect(controller.getConfig('nonexistent', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createConfig', () => {
    it('should create adapter config', async () => {
      adapterConfigService.validateConfig.mockReturnValue({ valid: true, errors: [] });
      adapterConfigService.upsertAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const dto = {
        type: 'github' as AdapterType,
        name: 'Test GitHub',
        enabled: true,
        config: { token: 'secret', owner: 'owner', repo: 'repo' },
      };

      const result = await controller.createConfig('tenant-1', dto);

      expect(result.name).toBe('Test GitHub');
      expect(adapterConfigService.upsertAdapterConfig).toHaveBeenCalledWith('tenant-1', dto);
    });

    it('should throw BadRequestException for invalid config', async () => {
      adapterConfigService.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Token is required'],
      });

      const dto = {
        type: 'github' as AdapterType,
        name: 'Test',
        enabled: true,
        config: {},
      };

      await expect(controller.createConfig('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });
  });
});

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            evidence: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    adapter = module.get<GitHubAdapter>(GitHubAdapter);
  });

  // Note: These tests would need proper mocking of fetch
  // For now, testing the adapter structure
  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });
});

describe('GitLabAdapter', () => {
  let adapter: GitLabAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitLabAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            evidence: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    adapter = module.get<GitLabAdapter>(GitLabAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });
});

describe('JiraConfluenceAdapter', () => {
  let adapter: JiraConfluenceAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraConfluenceAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            evidence: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    adapter = module.get<JiraConfluenceAdapter>(JiraConfluenceAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });
});

// ===========================================================================
// BRANCH COVERAGE TESTS FOR AdapterController
// ===========================================================================
describe('AdapterController - Branch Coverage', () => {
  let controller: AdapterController;
  let adapterConfigService: jest.Mocked<AdapterConfigService>;
  let githubAdapter: jest.Mocked<GitHubAdapter>;
  let gitlabAdapter: jest.Mocked<GitLabAdapter>;
  let jiraAdapter: jest.Mocked<JiraConfluenceAdapter>;

  const mockAdapterConfig = {
    id: 'adapter-1',
    tenantId: 'tenant-1',
    type: 'github' as AdapterType,
    name: 'Test GitHub',
    enabled: true,
    config: {
      token: 'secret-token',
      owner: 'test-owner',
      repo: 'test-repo',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdapterController],
      providers: [
        {
          provide: GitHubAdapter,
          useValue: {
            fetchPullRequests: jest.fn(),
            fetchPipelines: jest.fn(),
            ingestAllEvidence: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: GitLabAdapter,
          useValue: {
            fetchPipelines: jest.fn(),
            ingestAllEvidence: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: JiraConfluenceAdapter,
          useValue: {
            fetchProject: jest.fn(),
            searchPages: jest.fn(),
            ingestAllEvidence: jest.fn(),
            testConnection: jest.fn(),
          },
        },
        {
          provide: AdapterConfigService,
          useValue: {
            getSupportedAdapterTypes: jest
              .fn()
              .mockReturnValue(['github', 'gitlab', 'jira', 'confluence', 'azure_devops']),
            getAdapterTypeInfo: jest.fn(),
            getAdapterConfigs: jest.fn(),
            getAdapterConfig: jest.fn(),
            upsertAdapterConfig: jest.fn(),
            deleteAdapterConfig: jest.fn(),
            validateConfig: jest.fn(),
            getEnabledAdapters: jest.fn(),
            updateSyncStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdapterController>(AdapterController);
    adapterConfigService = module.get(AdapterConfigService);
    module.get(GitHubAdapter);
    module.get(GitLabAdapter);
    module.get(JiraConfluenceAdapter);
  });

  describe('updateConfig - branch: dto.config present vs absent', () => {
    it('should skip validation when dto.config is not provided', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);
      adapterConfigService.upsertAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const dto = { name: 'Updated Name' };
      await controller.updateConfig('adapter-1', 'tenant-1', dto);

      expect(adapterConfigService.validateConfig).not.toHaveBeenCalled();
    });

    it('should validate when dto.config is provided', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);
      adapterConfigService.validateConfig.mockReturnValue({ valid: true, errors: [] });
      adapterConfigService.upsertAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const dto = { config: { token: 'new-token' } };
      await controller.updateConfig('adapter-1', 'tenant-1', dto);

      expect(adapterConfigService.validateConfig).toHaveBeenCalled();
    });

    it('should throw BadRequestException when config validation fails on update', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);
      adapterConfigService.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Token invalid'],
      });

      const dto = { config: { token: '' } };
      await expect(controller.updateConfig('adapter-1', 'tenant-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when adapter not found on update', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(null);

      await expect(
        controller.updateConfig('nonexistent', 'tenant-1', { name: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('testConnection - all adapter type branches', () => {
    it('should test gitlab connection', async () => {
      gitlabAdapter.fetchPipelines.mockResolvedValue([]);

      const result = await controller.testConnection({
        type: 'gitlab',
        config: { token: 'tok', projectId: 'p1', apiUrl: 'https://gitlab.com' },
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('GitLab');
    });

    it('should test jira connection', async () => {
      jiraAdapter.fetchProject.mockResolvedValue({} as any);

      const result = await controller.testConnection({
        type: 'jira',
        config: {
          domain: 'test.atlassian.net',
          email: 'e@e.com',
          apiToken: 'tok',
          projectKey: 'PK',
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Jira');
    });

    it('should test confluence connection', async () => {
      jiraAdapter.searchPages.mockResolvedValue([] as any);

      const result = await controller.testConnection({
        type: 'confluence',
        config: { domain: 'test.atlassian.net', email: 'e@e.com', apiToken: 'tok', spaceKey: 'SK' },
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Confluence');
    });

    it('should return failure for unsupported adapter type', async () => {
      const result = await controller.testConnection({
        type: 'azure_devops' as AdapterType,
        config: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported');
    });

    it('should return failure when connection throws an Error', async () => {
      githubAdapter.fetchPullRequests.mockRejectedValue(new Error('Network error'));

      const result = await controller.testConnection({
        type: 'github',
        config: { token: 'tok', owner: 'o', repo: 'r' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should return "Unknown error" for non-Error exceptions', async () => {
      githubAdapter.fetchPullRequests.mockRejectedValue('string-error');

      const result = await controller.testConnection({
        type: 'github',
        config: { token: 'tok', owner: 'o', repo: 'r' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('syncAdapter - all adapter type branches', () => {
    it('should sync github adapter', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);
      githubAdapter.ingestAllEvidence.mockResolvedValue({ ingested: 5, errors: [], results: {} });
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      const result = await controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' });

      expect(result.ingested).toBe(5);
      expect(result.adapterType).toBe('github');
    });

    it('should sync gitlab adapter', async () => {
      const gitlabConfig = {
        ...mockAdapterConfig,
        type: 'gitlab' as AdapterType,
        config: { token: 't', projectId: 'p', apiUrl: 'u' },
      };
      adapterConfigService.getAdapterConfig.mockResolvedValue(gitlabConfig);
      gitlabAdapter.ingestAllEvidence.mockResolvedValue({ ingested: 3, errors: [], results: {} });
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      const result = await controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' });

      expect(result.ingested).toBe(3);
    });

    it('should sync jira adapter (without spaceKey)', async () => {
      const jiraConfig = {
        ...mockAdapterConfig,
        type: 'jira' as AdapterType,
        config: { domain: 'd', email: 'e', apiToken: 't', projectKey: 'PK' },
      };
      adapterConfigService.getAdapterConfig.mockResolvedValue(jiraConfig);
      jiraAdapter.ingestAllEvidence.mockResolvedValue({ ingested: 2, errors: [], results: {} });
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      const result = await controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' });

      expect(result.ingested).toBe(2);
    });

    it('should sync confluence adapter (with spaceKey)', async () => {
      const confluenceConfig = {
        ...mockAdapterConfig,
        type: 'confluence' as AdapterType,
        config: { domain: 'd', email: 'e', apiToken: 't', spaceKey: 'SK', projectKey: 'PK' },
      };
      adapterConfigService.getAdapterConfig.mockResolvedValue(confluenceConfig);
      jiraAdapter.ingestAllEvidence.mockResolvedValue({ ingested: 1, errors: [], results: {} });
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      const result = await controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' });

      expect(result.ingested).toBe(1);
    });

    it('should throw BadRequestException for unsupported sync type', async () => {
      const unsupportedConfig = { ...mockAdapterConfig, type: 'azure_devops' as AdapterType };
      adapterConfigService.getAdapterConfig.mockResolvedValue(unsupportedConfig);
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      await expect(
        controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when adapter not found for sync', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(null);

      await expect(
        controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when adapter is disabled', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue({
        ...mockAdapterConfig,
        enabled: false,
      });

      await expect(
        controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update sync status to error on failure', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);
      githubAdapter.ingestAllEvidence.mockRejectedValue(new Error('Sync failed'));
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      await expect(
        controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'sess-1' }),
      ).rejects.toThrow('Sync failed');

      expect(adapterConfigService.updateSyncStatus).toHaveBeenCalledWith(
        'tenant-1',
        'adapter-1',
        'error',
        'Sync failed',
      );
    });
  });

  describe('handleGitHubWebhook - config null/disabled branch', () => {
    it('should return ignored when config is null', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(null);

      const result = await controller.handleGitHubWebhook(
        { action: 'opened' },
        'adapter-1',
        'tenant-1',
      );

      expect(result.status).toBe('ignored');
    });

    it('should return ignored when config is disabled', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue({
        ...mockAdapterConfig,
        enabled: false,
      });

      const result = await controller.handleGitHubWebhook(
        { action: 'opened' },
        'adapter-1',
        'tenant-1',
      );

      expect(result.status).toBe('ignored');
    });

    it('should return received when config exists and is enabled', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const result = await controller.handleGitHubWebhook(
        { action: 'opened' },
        'adapter-1',
        'tenant-1',
      );

      expect(result.status).toBe('received');
      expect(result.event).toBe('opened');
    });

    it('should use "unknown" when payload.action is falsy', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const result = await controller.handleGitHubWebhook({}, 'adapter-1', 'tenant-1');

      expect(result.event).toBe('unknown');
    });
  });

  describe('handleGitLabWebhook - config null/disabled branch', () => {
    it('should return ignored when config is null', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(null);

      const result = await controller.handleGitLabWebhook(
        { object_kind: 'push' },
        'adapter-1',
        'tenant-1',
      );

      expect(result.status).toBe('ignored');
    });

    it('should return received with object_kind when config is valid', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const result = await controller.handleGitLabWebhook(
        { object_kind: 'push' },
        'adapter-1',
        'tenant-1',
      );

      expect(result.status).toBe('received');
      expect(result.event).toBe('push');
    });

    it('should use "unknown" when payload.object_kind is falsy', async () => {
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);

      const result = await controller.handleGitLabWebhook({}, 'adapter-1', 'tenant-1');

      expect(result.event).toBe('unknown');
    });
  });

  describe('syncAllAdapters - success/failure branches', () => {
    it('should aggregate results from all enabled adapters', async () => {
      adapterConfigService.getEnabledAdapters.mockResolvedValue([
        mockAdapterConfig,
        {
          ...mockAdapterConfig,
          id: 'adapter-2',
          type: 'gitlab' as AdapterType,
          config: { token: 't', projectId: 'p', apiUrl: 'u' },
        },
      ]);
      adapterConfigService.getAdapterConfig
        .mockResolvedValueOnce(mockAdapterConfig)
        .mockResolvedValueOnce({
          ...mockAdapterConfig,
          id: 'adapter-2',
          type: 'gitlab' as AdapterType,
          config: { token: 't', projectId: 'p', apiUrl: 'u' },
        });
      githubAdapter.ingestAllEvidence.mockResolvedValue({ ingested: 3, errors: [], results: {} });
      gitlabAdapter.ingestAllEvidence.mockResolvedValue({ ingested: 2, errors: [], results: {} });
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      const result = await controller.syncAllAdapters('tenant-1', { sessionId: 'sess-1' });

      expect(result.totalAdapters).toBe(2);
      expect(result.successfulSyncs).toBe(2);
      expect(result.totalIngested).toBe(5);
    });

    it('should capture errors for failed adapters in syncAll', async () => {
      adapterConfigService.getEnabledAdapters.mockResolvedValue([mockAdapterConfig]);
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);
      githubAdapter.ingestAllEvidence.mockRejectedValue(new Error('Sync error'));
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      const result = await controller.syncAllAdapters('tenant-1', { sessionId: 'sess-1' });

      expect(result.failedSyncs).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Sync error');
    });

    it('should handle non-Error exceptions in syncAll', async () => {
      adapterConfigService.getEnabledAdapters.mockResolvedValue([mockAdapterConfig]);
      adapterConfigService.getAdapterConfig.mockResolvedValue(mockAdapterConfig);
      githubAdapter.ingestAllEvidence.mockRejectedValue('string-error');
      adapterConfigService.updateSyncStatus.mockResolvedValue(undefined);

      const result = await controller.syncAllAdapters('tenant-1', { sessionId: 'sess-1' });

      expect(result.results[0].error).toBe('Unknown error');
    });
  });

  describe('redactSensitiveFields - branches for each sensitive field', () => {
    it('should redact apiToken field', async () => {
      const configWithApiToken = {
        ...mockAdapterConfig,
        config: { apiToken: 'secret-api-token', owner: 'o' },
      };
      adapterConfigService.getAdapterConfigs.mockResolvedValue([configWithApiToken]);

      const result = await controller.listConfigs('tenant-1');

      expect(result.configs[0].config.apiToken).toBe('***REDACTED***');
      expect(result.configs[0].config.owner).toBe('o');
    });

    it('should redact personalAccessToken and webhookSecret fields', async () => {
      const configWithPat = {
        ...mockAdapterConfig,
        config: { personalAccessToken: 'pat-xxx', webhookSecret: 'secret', webhookToken: 'tok' },
      };
      adapterConfigService.getAdapterConfigs.mockResolvedValue([configWithPat]);

      const result = await controller.listConfigs('tenant-1');

      expect(result.configs[0].config.personalAccessToken).toBe('***REDACTED***');
      expect(result.configs[0].config.webhookSecret).toBe('***REDACTED***');
      expect(result.configs[0].config.webhookToken).toBe('***REDACTED***');
    });

    it('should not redact non-sensitive fields', async () => {
      const configNonSensitive = {
        ...mockAdapterConfig,
        config: { owner: 'my-org', repo: 'my-repo' },
      };
      adapterConfigService.getAdapterConfigs.mockResolvedValue([configNonSensitive]);

      const result = await controller.listConfigs('tenant-1');

      expect(result.configs[0].config.owner).toBe('my-org');
      expect(result.configs[0].config.repo).toBe('my-repo');
    });
  });
});
