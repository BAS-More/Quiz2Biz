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
            getSupportedAdapterTypes: jest.fn().mockReturnValue([
              'github',
              'gitlab',
              'jira',
              'confluence',
              'azure_devops',
            ]),
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
    githubAdapter = module.get(GitHubAdapter);
    gitlabAdapter = module.get(GitLabAdapter);
    jiraAdapter = module.get(JiraConfluenceAdapter);
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
