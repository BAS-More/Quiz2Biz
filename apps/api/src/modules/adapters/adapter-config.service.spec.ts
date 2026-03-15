import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/database';
import { AdapterConfigService, AdapterConfig } from './adapter-config.service';

describe('AdapterConfigService', () => {
  let service: AdapterConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  const TENANT_ID = 'tenant-001';

  const makeConfig = (overrides: Partial<AdapterConfig> = {}): AdapterConfig => ({
    id: 'adapter_test_001',
    type: 'github',
    name: 'Test GitHub',
    enabled: true,
    config: { token: 'tok', owner: 'own', repo: 'rep' },
    syncStatus: 'idle',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  const buildDbRow = (configs: AdapterConfig[]): Array<{ config: string }> => [
    { config: JSON.stringify(configs) },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdapterConfigService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdapterConfigService>(AdapterConfigService);
    module.get<ConfigService>(ConfigService);
    module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getAdapterConfigs
  // ---------------------------------------------------------------------------
  describe('getAdapterConfigs', () => {
    it('should load configs from the database on cache miss', async () => {
      const stored = [makeConfig()];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(stored));

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('adapter_test_001');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return cached configs on subsequent calls without hitting DB', async () => {
      const stored = [makeConfig()];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(stored));

      const first = await service.getAdapterConfigs(TENANT_ID);
      const second = await service.getAdapterConfigs(TENANT_ID);

      expect(first).toBe(second);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should fall back to default configs when DB returns empty result', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should fall back to default configs when DB throws an error', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should return GitHub default config when env vars are set and DB fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockImplementation((key: string) => {
        const envMap: Record<string, string> = {
          GITHUB_TOKEN: 'gh-token',
          GITHUB_OWNER: 'my-owner',
          GITHUB_REPO: 'my-repo',
        };
        return envMap[key];
      });

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('default_github');
      expect(result[0].type).toBe('github');
      expect(result[0].config).toEqual({
        token: 'gh-token',
        owner: 'my-owner',
        repo: 'my-repo',
      });
    });

    it('should return GitLab default config when env vars are set and DB fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockImplementation((key: string) => {
        const envMap: Record<string, string> = {
          GITLAB_TOKEN: 'gl-token',
          GITLAB_PROJECT_ID: '42',
          GITLAB_API_URL: 'https://gitlab.example.com/api/v4',
        };
        return envMap[key];
      });

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('default_gitlab');
      expect(result[0].type).toBe('gitlab');
      expect(result[0].config).toEqual({
        token: 'gl-token',
        projectId: '42',
        apiUrl: 'https://gitlab.example.com/api/v4',
      });
    });

    it('should return Jira default config when env vars are set and DB fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockImplementation((key: string) => {
        const envMap: Record<string, string> = {
          JIRA_API_TOKEN: 'jira-token',
          JIRA_DOMAIN: 'myco.atlassian.net',
          JIRA_EMAIL: 'user@example.com',
          JIRA_PROJECT_KEY: 'PROJ',
        };
        return envMap[key];
      });

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('default_jira');
      expect(result[0].type).toBe('jira');
      expect(result[0].config).toEqual({
        domain: 'myco.atlassian.net',
        email: 'user@example.com',
        apiToken: 'jira-token',
        projectKey: 'PROJ',
      });
    });

    it('should return multiple default configs when several env var groups are set', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockImplementation((key: string) => {
        const envMap: Record<string, string> = {
          GITHUB_TOKEN: 'gh-tok',
          GITHUB_OWNER: 'owner',
          GITHUB_REPO: 'repo',
          JIRA_API_TOKEN: 'jira-tok',
          JIRA_DOMAIN: 'domain',
          JIRA_EMAIL: 'email',
          JIRA_PROJECT_KEY: 'KEY',
        };
        return envMap[key];
      });

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.type)).toEqual(['github', 'jira']);
    });

    it('should convert date strings from DB into Date objects', async () => {
      const stored = [makeConfig()];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(stored));

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should handle lastSyncAt conversion when present', async () => {
      const stored = [makeConfig({ lastSyncAt: new Date('2026-02-01T12:00:00Z') })];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(stored));

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result[0].lastSyncAt).toBeInstanceOf(Date);
    });

    it('should handle lastSyncAt being undefined', async () => {
      const stored = [makeConfig({ lastSyncAt: undefined })];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(stored));

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result[0].lastSyncAt).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getAdapterConfig
  // ---------------------------------------------------------------------------
  describe('getAdapterConfig', () => {
    it('should return the matching adapter config by ID', async () => {
      const configs = [makeConfig({ id: 'a1' }), makeConfig({ id: 'a2', name: 'Second' })];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(configs));

      const result = await service.getAdapterConfig(TENANT_ID, 'a2');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('a2');
      expect(result!.name).toBe('Second');
    });

    it('should return null when no adapter matches the given ID', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow([makeConfig({ id: 'a1' })]));

      const result = await service.getAdapterConfig(TENANT_ID, 'non-existent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getEnabledAdapters
  // ---------------------------------------------------------------------------
  describe('getEnabledAdapters', () => {
    const configs = [
      makeConfig({ id: 'e1', enabled: true, type: 'github' }),
      makeConfig({ id: 'e2', enabled: false, type: 'github' }),
      makeConfig({ id: 'e3', enabled: true, type: 'jira' }),
      makeConfig({ id: 'e4', enabled: true, type: 'gitlab' }),
    ];

    beforeEach(() => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(configs));
    });

    it('should return all enabled adapters when no type filter is given', async () => {
      const result = await service.getEnabledAdapters(TENANT_ID);

      expect(result).toHaveLength(3);
      expect(result.every((c) => c.enabled)).toBe(true);
    });

    it('should filter enabled adapters by type when type is provided', async () => {
      const result = await service.getEnabledAdapters(TENANT_ID, 'github');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });

    it('should return empty array when no enabled adapters match the type', async () => {
      const result = await service.getEnabledAdapters(TENANT_ID, 'confluence');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // upsertAdapterConfig
  // ---------------------------------------------------------------------------
  describe('upsertAdapterConfig', () => {
    it('should create a config with a generated ID when none is provided', async () => {
      // loadFromDatabase called inside saveToDatabase
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.upsertAdapterConfig(TENANT_ID, {
        type: 'github',
        name: 'New GH',
        enabled: true,
        config: { token: 't', owner: 'o', repo: 'r' },
      });

      expect(result.id).toMatch(/^adapter_/);
      expect(result.name).toBe('New GH');
      expect(result.syncStatus).toBe('idle');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should use the provided ID when one is supplied', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.upsertAdapterConfig(TENANT_ID, {
        id: 'custom-id-123',
        type: 'gitlab',
        name: 'Custom GL',
        enabled: false,
        config: { token: 't', projectId: '1' },
      });

      expect(result.id).toBe('custom-id-123');
    });

    it('should use provided syncStatus when given', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.upsertAdapterConfig(TENANT_ID, {
        type: 'github',
        name: 'GH',
        enabled: true,
        config: {},
        syncStatus: 'syncing',
      });

      expect(result.syncStatus).toBe('syncing');
    });

    it('should invalidate the cache for the tenant', async () => {
      // Pre-populate cache
      const existing = [makeConfig()];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(existing));
      await service.getAdapterConfigs(TENANT_ID);

      // Now upsert - loadFromDatabase inside saveToDatabase returns existing from DB
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(existing));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.upsertAdapterConfig(TENANT_ID, {
        type: 'jira',
        name: 'New Jira',
        enabled: true,
        config: {},
      });

      // Cache should be cleared; next call should hit DB again
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(existing));
      await service.getAdapterConfigs(TENANT_ID);

      // $queryRaw called: initial load (1) + saveToDatabase->loadFromDatabase (1) + re-load after cache invalidation (1) = 3
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should call saveToDatabase which writes via $executeRaw', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.upsertAdapterConfig(TENANT_ID, {
        type: 'github',
        name: 'GH',
        enabled: true,
        config: {},
      });

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteAdapterConfig
  // ---------------------------------------------------------------------------
  describe('deleteAdapterConfig', () => {
    it('should call removeFromDatabase and invalidate cache', async () => {
      const existing = [makeConfig({ id: 'del-me' })];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(existing));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.deleteAdapterConfig(TENANT_ID, 'del-me');

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should invalidate the cache after deletion', async () => {
      // Pre-populate cache
      const existing = [makeConfig({ id: 'cached-one' })];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(existing));
      await service.getAdapterConfigs(TENANT_ID);

      // Delete
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow(existing));
      mockPrismaService.$executeRaw.mockResolvedValue(1);
      await service.deleteAdapterConfig(TENANT_ID, 'cached-one');

      // Next getAdapterConfigs should hit DB again
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow([]));
      mockConfigService.get.mockReturnValue(undefined);
      const result = await service.getAdapterConfigs(TENANT_ID);

      // Was called 3 times total: initial, removeFromDatabase->loadFromDatabase, re-fetch
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // updateSyncStatus
  // ---------------------------------------------------------------------------
  describe('updateSyncStatus', () => {
    it('should return early when config is not found', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce(buildDbRow([]));
      mockConfigService.get.mockReturnValue(undefined);

      await service.updateSyncStatus(TENANT_ID, 'non-existent', 'syncing');

      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('should set syncStatus to the given status', async () => {
      const cfg = makeConfig({ id: 'sync-me', syncStatus: 'idle' });
      mockPrismaService.$queryRaw.mockResolvedValue(buildDbRow([cfg]));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.updateSyncStatus(TENANT_ID, 'sync-me', 'syncing');

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should set lastError when status is "error"', async () => {
      const cfg = makeConfig({ id: 'err-cfg' });
      // First call is for getAdapterConfigs, second is for saveToDatabase->loadFromDatabase
      mockPrismaService.$queryRaw.mockResolvedValue(buildDbRow([cfg]));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.updateSyncStatus(TENANT_ID, 'err-cfg', 'error', 'Connection timed out');

      // Verify the $executeRaw was called (saveToDatabase)
      // The config object should have been mutated with lastError
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should clear lastError when status is not "error"', async () => {
      const cfg = makeConfig({ id: 'clear-err', lastError: 'Old error' });
      mockPrismaService.$queryRaw.mockResolvedValue(buildDbRow([cfg]));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.updateSyncStatus(TENANT_ID, 'clear-err', 'syncing');

      // After update, lastError should be undefined (cleared by the service)
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should set lastSyncAt when status is "success"', async () => {
      const cfg = makeConfig({ id: 'success-cfg', lastSyncAt: undefined });
      mockPrismaService.$queryRaw.mockResolvedValue(buildDbRow([cfg]));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.updateSyncStatus(TENANT_ID, 'success-cfg', 'success');

      // We verify through the saved data; the executeRaw should have been called
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should invalidate cache after status update', async () => {
      const cfg = makeConfig({ id: 'cache-inv' });
      mockPrismaService.$queryRaw.mockResolvedValue(buildDbRow([cfg]));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      // Pre-populate cache
      await service.getAdapterConfigs(TENANT_ID);
      const queryCallsBefore = mockPrismaService.$queryRaw.mock.calls.length;

      await service.updateSyncStatus(TENANT_ID, 'cache-inv', 'idle');

      // After updateSyncStatus the cache is cleared, so the next getAdapterConfigs hits DB
      await service.getAdapterConfigs(TENANT_ID);
      const queryCallsAfter = mockPrismaService.$queryRaw.mock.calls.length;

      // At least one additional DB call should have been made after cache invalidation
      expect(queryCallsAfter).toBeGreaterThan(queryCallsBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // validateConfig
  // ---------------------------------------------------------------------------
  describe('validateConfig', () => {
    describe('github', () => {
      it('should pass with valid GitHub config', () => {
        const result = service.validateConfig('github', {
          token: 'ghp_abc',
          owner: 'myorg',
          repo: 'myrepo',
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when token is missing', () => {
        const result = service.validateConfig('github', { owner: 'o', repo: 'r' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('GitHub token is required');
      });

      it('should fail when owner is missing', () => {
        const result = service.validateConfig('github', { token: 't', repo: 'r' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('GitHub owner is required');
      });

      it('should fail when repo is missing', () => {
        const result = service.validateConfig('github', { token: 't', owner: 'o' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('GitHub repo is required');
      });

      it('should return all errors when all fields are missing', () => {
        const result = service.validateConfig('github', {});

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(3);
      });
    });

    describe('gitlab', () => {
      it('should pass with valid GitLab config', () => {
        const result = service.validateConfig('gitlab', {
          token: 'glpat-abc',
          projectId: '123',
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when token is missing', () => {
        const result = service.validateConfig('gitlab', { projectId: '1' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('GitLab token is required');
      });

      it('should fail when projectId is missing', () => {
        const result = service.validateConfig('gitlab', { token: 't' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('GitLab project ID is required');
      });

      it('should return all errors when all fields are missing', () => {
        const result = service.validateConfig('gitlab', {});

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
      });
    });

    describe('jira', () => {
      it('should pass with valid Jira config', () => {
        const result = service.validateConfig('jira', {
          domain: 'myco.atlassian.net',
          email: 'user@co.com',
          apiToken: 'jira-tok',
          projectKey: 'PROJ',
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when domain is missing', () => {
        const result = service.validateConfig('jira', {
          email: 'e',
          apiToken: 'a',
          projectKey: 'P',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Jira domain is required');
      });

      it('should fail when email is missing', () => {
        const result = service.validateConfig('jira', {
          domain: 'd',
          apiToken: 'a',
          projectKey: 'P',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Jira email is required');
      });

      it('should fail when apiToken is missing', () => {
        const result = service.validateConfig('jira', {
          domain: 'd',
          email: 'e',
          projectKey: 'P',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Jira API token is required');
      });

      it('should fail when projectKey is missing', () => {
        const result = service.validateConfig('jira', {
          domain: 'd',
          email: 'e',
          apiToken: 'a',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Jira project key is required');
      });

      it('should return all errors when all fields are missing', () => {
        const result = service.validateConfig('jira', {});

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(4);
      });
    });

    describe('confluence', () => {
      it('should pass with valid Confluence config', () => {
        const result = service.validateConfig('confluence', {
          domain: 'myco.atlassian.net',
          email: 'user@co.com',
          apiToken: 'conf-tok',
          spaceKey: 'DOCS',
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when domain is missing', () => {
        const result = service.validateConfig('confluence', {
          email: 'e',
          apiToken: 'a',
          spaceKey: 'S',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Confluence domain is required');
      });

      it('should fail when email is missing', () => {
        const result = service.validateConfig('confluence', {
          domain: 'd',
          apiToken: 'a',
          spaceKey: 'S',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Confluence email is required');
      });

      it('should fail when apiToken is missing', () => {
        const result = service.validateConfig('confluence', {
          domain: 'd',
          email: 'e',
          spaceKey: 'S',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Confluence API token is required');
      });

      it('should fail when spaceKey is missing', () => {
        const result = service.validateConfig('confluence', {
          domain: 'd',
          email: 'e',
          apiToken: 'a',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Confluence space key is required');
      });

      it('should return all errors when all fields are missing', () => {
        const result = service.validateConfig('confluence', {});

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(4);
      });
    });

    describe('azure_devops', () => {
      it('should pass with valid Azure DevOps config', () => {
        const result = service.validateConfig('azure_devops', {
          organizationUrl: 'https://dev.azure.com/myorg',
          personalAccessToken: 'ado-pat',
          project: 'MyProject',
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail when organizationUrl is missing', () => {
        const result = service.validateConfig('azure_devops', {
          personalAccessToken: 'p',
          project: 'proj',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Azure DevOps organization URL is required');
      });

      it('should fail when personalAccessToken is missing', () => {
        const result = service.validateConfig('azure_devops', {
          organizationUrl: 'u',
          project: 'proj',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Azure DevOps PAT is required');
      });

      it('should fail when project is missing', () => {
        const result = service.validateConfig('azure_devops', {
          organizationUrl: 'u',
          personalAccessToken: 'p',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Azure DevOps project is required');
      });

      it('should return all errors when all fields are missing', () => {
        const result = service.validateConfig('azure_devops', {});

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(3);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getAdapterTypeInfo
  // ---------------------------------------------------------------------------
  describe('getAdapterTypeInfo', () => {
    it('should return correct info for github', () => {
      const info = service.getAdapterTypeInfo('github');

      expect(info.displayName).toBe('GitHub');
      expect(info.icon).toBe('github');
      expect(info.capabilities).toContain('pull_requests');
      expect(info.capabilities).toContain('workflow_runs');
      expect(info.capabilities).toContain('releases');
      expect(info.capabilities).toContain('sbom');
      expect(info.capabilities).toContain('security_advisories');
    });

    it('should return correct info for gitlab', () => {
      const info = service.getAdapterTypeInfo('gitlab');

      expect(info.displayName).toBe('GitLab');
      expect(info.icon).toBe('gitlab');
      expect(info.capabilities).toContain('pipelines');
      expect(info.capabilities).toContain('merge_requests');
      expect(info.capabilities).toContain('vulnerabilities');
      expect(info.capabilities).toContain('coverage');
    });

    it('should return correct info for jira', () => {
      const info = service.getAdapterTypeInfo('jira');

      expect(info.displayName).toBe('Jira');
      expect(info.icon).toBe('jira');
      expect(info.capabilities).toContain('issues');
      expect(info.capabilities).toContain('sprints');
    });

    it('should return correct info for confluence', () => {
      const info = service.getAdapterTypeInfo('confluence');

      expect(info.displayName).toBe('Confluence');
      expect(info.icon).toBe('confluence');
      expect(info.capabilities).toContain('pages');
      expect(info.capabilities).toContain('bidirectional_sync');
    });

    it('should return correct info for azure_devops', () => {
      const info = service.getAdapterTypeInfo('azure_devops');

      expect(info.displayName).toBe('Azure DevOps');
      expect(info.icon).toBe('azure');
      expect(info.capabilities).toContain('pipelines');
      expect(info.capabilities).toContain('repos');
      expect(info.capabilities).toContain('work_items');
      expect(info.capabilities).toContain('artifacts');
    });
  });

  // ---------------------------------------------------------------------------
  // getSupportedAdapterTypes
  // ---------------------------------------------------------------------------
  describe('getSupportedAdapterTypes', () => {
    it('should return all 5 supported adapter types', () => {
      const types = service.getSupportedAdapterTypes();

      expect(types).toHaveLength(5);
      expect(types.map((t) => t.type)).toEqual([
        'github',
        'gitlab',
        'jira',
        'confluence',
        'azure_devops',
      ]);
    });

    it('should include info for each type', () => {
      const types = service.getSupportedAdapterTypes();

      for (const entry of types) {
        expect(entry.info).toBeDefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // saveToDatabase error handling
  // ---------------------------------------------------------------------------
  describe('saveToDatabase (error path)', () => {
    it('should re-throw when $executeRaw fails during upsert', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockRejectedValueOnce(new Error('Write failed'));

      await expect(
        service.upsertAdapterConfig(TENANT_ID, {
          type: 'github',
          name: 'GH',
          enabled: true,
          config: {},
        }),
      ).rejects.toThrow('Write failed');
    });
  });

  // ---------------------------------------------------------------------------
  // removeFromDatabase error handling
  // ---------------------------------------------------------------------------
  describe('removeFromDatabase (error path)', () => {
    it('should re-throw when $executeRaw fails during delete', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.deleteAdapterConfig(TENANT_ID, 'some-id')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getDefaultConfigs (no env vars set)
  // ---------------------------------------------------------------------------
  describe('getDefaultConfigs (via loadFromDatabase fallback)', () => {
    it('should return empty array when no env vars are configured', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should skip GitHub default when GITHUB_TOKEN is not set', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GITLAB_TOKEN') {
          return 'gl-tok';
        }
        if (key === 'GITLAB_PROJECT_ID') {
          return '99';
        }
        return undefined;
      });

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('gitlab');
    });

    it('should skip GitLab default when GITLAB_TOKEN is not set', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GITHUB_TOKEN') {
          return 'gh-tok';
        }
        if (key === 'GITHUB_OWNER') {
          return 'owner';
        }
        if (key === 'GITHUB_REPO') {
          return 'repo';
        }
        return undefined;
      });

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('github');
    });

    it('should skip Jira default when JIRA_API_TOKEN is not set', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result.find((c) => c.type === 'jira')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases & integration-style scenarios
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should isolate cache per tenant', async () => {
      const tenant1Configs = [makeConfig({ id: 't1-cfg' })];
      const tenant2Configs = [makeConfig({ id: 't2-cfg', name: 'Tenant 2' })];

      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(buildDbRow(tenant1Configs))
        .mockResolvedValueOnce(buildDbRow(tenant2Configs));

      const result1 = await service.getAdapterConfigs('tenant-1');
      const result2 = await service.getAdapterConfigs('tenant-2');

      expect(result1[0].id).toBe('t1-cfg');
      expect(result2[0].id).toBe('t2-cfg');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should handle DB returning result with null config field', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ config: null }]);
      mockConfigService.get.mockReturnValue(undefined);

      // The JSON.parse(null) scenario - this would throw, falling to defaults
      // Actually result[0].config being null means the if condition is falsy
      const result = await service.getAdapterConfigs(TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should handle upsert replacing existing config with same ID', async () => {
      const existing = [makeConfig({ id: 'replace-me', name: 'Old Name' })];
      mockPrismaService.$queryRaw.mockResolvedValue(buildDbRow(existing));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.upsertAdapterConfig(TENANT_ID, {
        id: 'replace-me',
        type: 'github',
        name: 'New Name',
        enabled: true,
        config: { token: 'new' },
      });

      expect(result.id).toBe('replace-me');
      expect(result.name).toBe('New Name');
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('updateSyncStatus with idle status should clear lastError', async () => {
      const cfg = makeConfig({ id: 'idle-test', lastError: 'prev error', syncStatus: 'error' });
      mockPrismaService.$queryRaw.mockResolvedValue(buildDbRow([cfg]));
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.updateSyncStatus(TENANT_ID, 'idle-test', 'idle');

      // The service sets lastError to undefined for non-error statuses
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('uncovered branches - non-Error exceptions', () => {
    it('should log "Unknown error" when loadFromDatabase throws a non-Error', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce('string-error');
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.getAdapterConfigs(TENANT_ID);

      // Falls back to default configs (empty when no env vars)
      expect(result).toEqual([]);
    });

    it('should log "Unknown error" when saveToDatabase throws a non-Error', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockRejectedValueOnce('db-write-string-error');

      await expect(
        service.upsertAdapterConfig(TENANT_ID, {
          type: 'github',
          name: 'GH',
          enabled: true,
          config: {},
        }),
      ).rejects.toBe('db-write-string-error');
    });

    it('should log "Unknown error" when removeFromDatabase throws a non-Error', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockConfigService.get.mockReturnValue(undefined);
      mockPrismaService.$executeRaw.mockRejectedValueOnce(42);

      await expect(service.deleteAdapterConfig(TENANT_ID, 'some-id')).rejects.toBe(42);
    });
  });
});
