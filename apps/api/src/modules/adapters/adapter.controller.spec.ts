import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdapterController } from './adapter.controller';
import { GitHubAdapter } from './github.adapter';
import { GitLabAdapter } from './gitlab.adapter';
import { JiraConfluenceAdapter } from './jira-confluence.adapter';
import { AdapterConfigService, AdapterType, AdapterConfig } from './adapter-config.service';

const mockGitHubAdapter = {
  fetchPullRequests: jest.fn(),
  ingestAllEvidence: jest.fn(),
};

const mockGitLabAdapter = {
  fetchPipelines: jest.fn(),
  ingestAllEvidence: jest.fn(),
};

const mockJiraConfluenceAdapter = {
  fetchProject: jest.fn(),
  searchPages: jest.fn(),
  ingestAllEvidence: jest.fn(),
};

const mockAdapterConfigService = {
  getSupportedAdapterTypes: jest.fn(),
  getAdapterTypeInfo: jest.fn(),
  getAdapterConfigs: jest.fn(),
  getAdapterConfig: jest.fn(),
  validateConfig: jest.fn(),
  upsertAdapterConfig: jest.fn(),
  deleteAdapterConfig: jest.fn(),
  updateSyncStatus: jest.fn(),
  getEnabledAdapters: jest.fn(),
};

describe('AdapterController', () => {
  let controller: AdapterController;

  const mockConfig: AdapterConfig = {
    id: 'adapter-1',
    type: 'github' as AdapterType,
    name: 'GitHub Production',
    enabled: true,
    config: {
      token: 'ghp_secret123',
      owner: 'acme',
      repo: 'app',
    },
    syncStatus: 'idle',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdapterController],
      providers: [
        { provide: GitHubAdapter, useValue: mockGitHubAdapter },
        { provide: GitLabAdapter, useValue: mockGitLabAdapter },
        { provide: JiraConfluenceAdapter, useValue: mockJiraConfluenceAdapter },
        { provide: AdapterConfigService, useValue: mockAdapterConfigService },
      ],
    }).compile();

    controller = module.get<AdapterController>(AdapterController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSupportedTypes', () => {
    it('should return supported adapter types', () => {
      const types = ['github', 'gitlab', 'jira', 'confluence', 'azure_devops'];
      mockAdapterConfigService.getSupportedAdapterTypes.mockReturnValue(types);

      const result = controller.getSupportedTypes();

      expect(result.types).toEqual(types);
      expect(mockAdapterConfigService.getSupportedAdapterTypes).toHaveBeenCalled();
    });
  });

  describe('getTypeInfo', () => {
    it('should return adapter type information', () => {
      const typeInfo = {
        type: 'github',
        name: 'GitHub',
        description: 'GitHub integration',
        requiredFields: ['token', 'owner', 'repo'],
      };
      mockAdapterConfigService.getAdapterTypeInfo.mockReturnValue(typeInfo);

      const result = controller.getTypeInfo('github' as AdapterType);

      expect(result).toEqual(typeInfo);
      expect(mockAdapterConfigService.getAdapterTypeInfo).toHaveBeenCalledWith('github');
    });
  });

  describe('listConfigs', () => {
    it('should return all configs for a tenant', async () => {
      const configs = [mockConfig];
      mockAdapterConfigService.getAdapterConfigs.mockResolvedValue(configs);

      const result = await controller.listConfigs('tenant-1');

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].config.token).toBe('***REDACTED***');
    });

    it('should filter by type when provided', async () => {
      const configs = [
        mockConfig,
        { ...mockConfig, id: 'adapter-2', type: 'gitlab' as AdapterType },
      ];
      mockAdapterConfigService.getAdapterConfigs.mockResolvedValue(configs);

      const result = await controller.listConfigs('tenant-1', 'github' as AdapterType);

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].type).toBe('github');
    });

    it('should filter by enabled status when provided', async () => {
      const configs = [mockConfig, { ...mockConfig, id: 'adapter-2', enabled: false }];
      mockAdapterConfigService.getAdapterConfigs.mockResolvedValue(configs);

      const result = await controller.listConfigs('tenant-1', undefined, true);

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].enabled).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return config by ID with redacted sensitive fields', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(mockConfig);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.id).toBe('adapter-1');
      expect(result.config.token).toBe('***REDACTED***');
    });

    it('should throw NotFoundException if config not found', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(null);

      await expect(controller.getConfig('non-existent', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createConfig', () => {
    it('should create a new adapter config', async () => {
      const dto = {
        type: 'github' as AdapterType,
        name: 'New GitHub',
        enabled: true,
        config: { token: 'token123', owner: 'acme', repo: 'app' },
      };
      mockAdapterConfigService.validateConfig.mockReturnValue({ valid: true, errors: [] });
      mockAdapterConfigService.upsertAdapterConfig.mockResolvedValue({ ...mockConfig, ...dto });

      const result = await controller.createConfig('tenant-1', dto);

      expect(result.name).toBe('New GitHub');
      expect(mockAdapterConfigService.validateConfig).toHaveBeenCalledWith('github', dto.config);
    });

    it('should throw BadRequestException for invalid config', async () => {
      const dto = {
        type: 'github' as AdapterType,
        name: 'Invalid',
        enabled: true,
        config: {},
      };
      mockAdapterConfigService.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Missing token', 'Missing owner'],
      });

      await expect(controller.createConfig('tenant-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateConfig', () => {
    it('should update an existing config', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(mockConfig);
      mockAdapterConfigService.validateConfig.mockReturnValue({ valid: true, errors: [] });
      mockAdapterConfigService.upsertAdapterConfig.mockResolvedValue({
        ...mockConfig,
        name: 'Updated Name',
      });

      const result = await controller.updateConfig('adapter-1', 'tenant-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if config not found', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(null);

      await expect(
        controller.updateConfig('non-existent', 'tenant-1', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate config changes', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(mockConfig);
      mockAdapterConfigService.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Invalid token format'],
      });

      await expect(
        controller.updateConfig('adapter-1', 'tenant-1', {
          config: { token: 'invalid' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteConfig', () => {
    it('should delete an adapter config', async () => {
      mockAdapterConfigService.deleteAdapterConfig.mockResolvedValue(undefined);

      await controller.deleteConfig('adapter-1', 'tenant-1');

      expect(mockAdapterConfigService.deleteAdapterConfig).toHaveBeenCalledWith(
        'tenant-1',
        'adapter-1',
      );
    });
  });

  describe('testConnection', () => {
    it('should test GitHub connection successfully', async () => {
      mockGitHubAdapter.fetchPullRequests.mockResolvedValue([]);

      const result = await controller.testConnection({
        type: 'github' as AdapterType,
        config: { token: 'token123', owner: 'acme', repo: 'app' },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('GitHub connection successful');
    });

    it('should test GitLab connection successfully', async () => {
      mockGitLabAdapter.fetchPipelines.mockResolvedValue([]);

      const result = await controller.testConnection({
        type: 'gitlab' as AdapterType,
        config: { token: 'token123', projectId: 123 },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('GitLab connection successful');
    });

    it('should test Jira connection successfully', async () => {
      mockJiraConfluenceAdapter.fetchProject.mockResolvedValue({ key: 'PROJ' });

      const result = await controller.testConnection({
        type: 'jira' as AdapterType,
        config: {
          domain: 'acme.atlassian.net',
          email: 'user@example.com',
          apiToken: 'token',
          projectKey: 'PROJ',
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Jira connection successful');
    });

    it('should test Confluence connection successfully', async () => {
      mockJiraConfluenceAdapter.searchPages.mockResolvedValue([]);

      const result = await controller.testConnection({
        type: 'confluence' as AdapterType,
        config: {
          domain: 'acme.atlassian.net',
          email: 'user@example.com',
          apiToken: 'token',
          spaceKey: 'SPACE',
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Confluence connection successful');
    });

    it('should return failure for unsupported adapter type', async () => {
      const result = await controller.testConnection({
        type: 'azure_devops' as AdapterType,
        config: {},
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unsupported adapter type');
    });

    it('should return failure on connection error', async () => {
      mockGitHubAdapter.fetchPullRequests.mockRejectedValue(new Error('Auth failed'));

      const result = await controller.testConnection({
        type: 'github' as AdapterType,
        config: { token: 'invalid', owner: 'acme', repo: 'app' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth failed');
    });
  });

  describe('syncAdapter', () => {
    it('should sync GitHub adapter successfully', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(mockConfig);
      mockAdapterConfigService.updateSyncStatus.mockResolvedValue(undefined);
      mockGitHubAdapter.ingestAllEvidence.mockResolvedValue({
        ingested: 10,
        errors: [],
        results: { pull_requests: 5, commits: 5 },
      });

      const result = await controller.syncAdapter('adapter-1', 'tenant-1', {
        sessionId: 'session-1',
      });

      expect(result.adapterId).toBe('adapter-1');
      expect(result.ingested).toBe(10);
      expect(mockAdapterConfigService.updateSyncStatus).toHaveBeenCalledWith(
        'tenant-1',
        'adapter-1',
        'syncing',
      );
    });

    it('should sync GitLab adapter successfully', async () => {
      const gitlabConfig = {
        ...mockConfig,
        type: 'gitlab' as AdapterType,
        config: { token: 'token', projectId: 123 },
      };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(gitlabConfig);
      mockAdapterConfigService.updateSyncStatus.mockResolvedValue(undefined);
      mockGitLabAdapter.ingestAllEvidence.mockResolvedValue({
        ingested: 5,
        errors: [],
        results: { pipelines: 5 },
      });

      const result = await controller.syncAdapter('adapter-1', 'tenant-1', {
        sessionId: 'session-1',
      });

      expect(result.adapterType).toBe('gitlab');
      expect(result.ingested).toBe(5);
    });

    it('should sync Jira adapter successfully', async () => {
      const jiraConfig = {
        ...mockConfig,
        type: 'jira' as AdapterType,
        config: {
          domain: 'acme.atlassian.net',
          email: 'user@example.com',
          apiToken: 'token',
          projectKey: 'PROJ',
        },
      };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(jiraConfig);
      mockAdapterConfigService.updateSyncStatus.mockResolvedValue(undefined);
      mockJiraConfluenceAdapter.ingestAllEvidence.mockResolvedValue({
        ingested: 15,
        errors: [],
        results: { issues: 15 },
      });

      const result = await controller.syncAdapter('adapter-1', 'tenant-1', {
        sessionId: 'session-1',
      });

      expect(result.adapterType).toBe('jira');
    });

    it('should throw NotFoundException if adapter not found', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(null);

      await expect(
        controller.syncAdapter('non-existent', 'tenant-1', { sessionId: 'session-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if adapter is disabled', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue({
        ...mockConfig,
        enabled: false,
      });

      await expect(
        controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'session-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update sync status to error on failure', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(mockConfig);
      mockAdapterConfigService.updateSyncStatus.mockResolvedValue(undefined);
      mockGitHubAdapter.ingestAllEvidence.mockRejectedValue(new Error('API error'));

      await expect(
        controller.syncAdapter('adapter-1', 'tenant-1', { sessionId: 'session-1' }),
      ).rejects.toThrow('API error');

      expect(mockAdapterConfigService.updateSyncStatus).toHaveBeenCalledWith(
        'tenant-1',
        'adapter-1',
        'error',
        'API error',
      );
    });
  });

  describe('syncAllAdapters', () => {
    it('should sync all enabled adapters', async () => {
      mockAdapterConfigService.getEnabledAdapters.mockResolvedValue([
        mockConfig,
        {
          ...mockConfig,
          id: 'adapter-2',
          type: 'gitlab' as AdapterType,
          config: { token: 'token', projectId: 123 },
        },
      ]);
      mockAdapterConfigService.getAdapterConfig.mockImplementation((_tenantId, adapterId) => {
        if (adapterId === 'adapter-1') {
          return Promise.resolve(mockConfig);
        }
        return Promise.resolve({
          ...mockConfig,
          id: 'adapter-2',
          type: 'gitlab' as AdapterType,
          config: { token: 'token', projectId: 123 },
        });
      });
      mockAdapterConfigService.updateSyncStatus.mockResolvedValue(undefined);
      mockGitHubAdapter.ingestAllEvidence.mockResolvedValue({
        ingested: 5,
        errors: [],
        results: {},
      });
      mockGitLabAdapter.ingestAllEvidence.mockResolvedValue({
        ingested: 3,
        errors: [],
        results: {},
      });

      const result = await controller.syncAllAdapters('tenant-1', { sessionId: 'session-1' });

      expect(result.totalAdapters).toBe(2);
      expect(result.successfulSyncs).toBe(2);
      expect(result.totalIngested).toBe(8);
    });

    it('should handle partial failures', async () => {
      mockAdapterConfigService.getEnabledAdapters.mockResolvedValue([mockConfig]);
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(mockConfig);
      mockAdapterConfigService.updateSyncStatus.mockResolvedValue(undefined);
      mockGitHubAdapter.ingestAllEvidence.mockRejectedValue(new Error('GitHub API error'));

      const result = await controller.syncAllAdapters('tenant-1', { sessionId: 'session-1' });

      expect(result.failedSyncs).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('GitHub API error');
    });
  });

  describe('handleGitHubWebhook', () => {
    it('should process valid webhook', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(mockConfig);

      const result = await controller.handleGitHubWebhook(
        { action: 'opened', pull_request: {} },
        '',
        'adapter-1',
        'tenant-1',
      );

      expect(result.status).toBe('received');
      expect(result.event).toBe('opened');
    });

    it('should ignore webhook if adapter not found', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(null);

      const result = await controller.handleGitHubWebhook({}, '', 'adapter-1', 'tenant-1');

      expect(result.status).toBe('ignored');
      expect(result.reason).toContain('not found');
    });

    it('should ignore webhook if adapter disabled', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue({
        ...mockConfig,
        enabled: false,
      });

      const result = await controller.handleGitHubWebhook({}, '', 'adapter-1', 'tenant-1');

      expect(result.status).toBe('ignored');
    });
  });

  describe('handleGitLabWebhook', () => {
    it('should process valid webhook', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue({
        ...mockConfig,
        type: 'gitlab' as AdapterType,
      });

      const result = await controller.handleGitLabWebhook(
        { object_kind: 'pipeline' },
        '',
        'adapter-1',
        'tenant-1',
      );

      expect(result.status).toBe('received');
      expect(result.event).toBe('pipeline');
    });

    it('should ignore webhook if adapter not found or disabled', async () => {
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(null);

      const result = await controller.handleGitLabWebhook({}, '', 'adapter-1', 'tenant-1');

      expect(result.status).toBe('ignored');
    });
  });

  describe('redactSensitiveFields', () => {
    it('should redact token field', async () => {
      const configWithToken = { ...mockConfig, config: { token: 'secret123' } };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(configWithToken);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.config.token).toBe('***REDACTED***');
    });

    it('should redact apiToken field', async () => {
      const configWithApiToken = { ...mockConfig, config: { apiToken: 'secret456' } };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(configWithApiToken);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.config.apiToken).toBe('***REDACTED***');
    });

    it('should redact personalAccessToken field', async () => {
      const configWithPAT = { ...mockConfig, config: { personalAccessToken: 'pat_secret' } };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(configWithPAT);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.config.personalAccessToken).toBe('***REDACTED***');
    });

    it('should redact webhookSecret field', async () => {
      const configWithSecret = { ...mockConfig, config: { webhookSecret: 'webhook_secret' } };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(configWithSecret);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.config.webhookSecret).toBe('***REDACTED***');
    });

    it('should redact webhookToken field', async () => {
      const configWithToken = { ...mockConfig, config: { webhookToken: 'token123' } };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(configWithToken);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.config.webhookToken).toBe('***REDACTED***');
    });

    it('should not modify non-sensitive fields', async () => {
      const configWithNonSensitive = { ...mockConfig, config: { owner: 'acme', repo: 'app' } };
      mockAdapterConfigService.getAdapterConfig.mockResolvedValue(configWithNonSensitive);

      const result = await controller.getConfig('adapter-1', 'tenant-1');

      expect(result.config.owner).toBe('acme');
      expect(result.config.repo).toBe('app');
    });
  });
});
