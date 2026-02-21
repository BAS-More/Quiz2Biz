import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GitHubAdapter } from './github.adapter';
import { PrismaService } from '@libs/database';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  let configService: ConfigService;
  let prismaService: PrismaService;

  const mockConfig = {
    token: 'test-token',
    owner: 'test-owner',
    repo: 'test-repo',
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubAdapter,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    adapter = module.get<GitHubAdapter>(GitHubAdapter);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('fetchPullRequests', () => {
    const mockPullRequests = [
      {
        id: 1,
        number: 123,
        title: 'Test PR',
        state: 'open',
        merged: false,
        merged_at: null,
        user: { login: 'testuser' },
        base: { ref: 'main' },
        head: { ref: 'feature-branch', sha: 'abc123' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/pull/123',
        additions: 100,
        deletions: 50,
        changed_files: 5,
        mergeable: true,
        review_comments: 3,
        commits: 2,
      },
    ];

    it('should fetch and convert pull requests to evidence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPullRequests,
      });

      const results = await adapter.fetchPullRequests(mockConfig);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pull_request');
      expect(results[0].sourceId).toBe('github-pr-123');
      expect(results[0].data.title).toBe('Test PR');
      expect(results[0].data.author).toBe('testuser');
      expect(results[0].metadata.provider).toBe('github');
    });

    it('should use custom pagination options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await adapter.fetchPullRequests(mockConfig, { state: 'closed', perPage: 50, page: 2 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=closed'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
        expect.any(Object),
      );
    });

    it('should throw HttpException on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(adapter.fetchPullRequests(mockConfig)).rejects.toThrow(HttpException);
    });

    it('should throw SERVICE_UNAVAILABLE on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.fetchPullRequests(mockConfig)).rejects.toThrow(HttpException);
    });
  });

  describe('fetchCheckRuns', () => {
    const mockCheckRuns = {
      check_runs: [
        {
          id: 456,
          name: 'CI Build',
          status: 'completed',
          conclusion: 'success',
          started_at: '2025-01-01T00:00:00Z',
          completed_at: '2025-01-01T00:10:00Z',
          html_url: 'https://github.com/test-owner/test-repo/runs/456',
          output: {
            title: 'Build passed',
            summary: 'All tests passed',
            annotations_count: 0,
          },
        },
      ],
    };

    it('should fetch check runs for a commit SHA', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCheckRuns,
      });

      const results = await adapter.fetchCheckRuns(mockConfig, 'abc123');

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('check_run');
      expect(results[0].sourceId).toBe('github-check-456');
      expect(results[0].data.name).toBe('CI Build');
      expect(results[0].data.conclusion).toBe('success');
    });

    it('should include commit SHA in metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCheckRuns,
      });

      const results = await adapter.fetchCheckRuns(mockConfig, 'def456');

      expect(results[0].metadata.commitSha).toBe('def456');
    });
  });

  describe('fetchWorkflowRuns', () => {
    const mockWorkflowRuns = {
      workflow_runs: [
        {
          id: 789,
          name: 'CI Pipeline',
          status: 'completed',
          conclusion: 'success',
          workflow_id: 1,
          run_number: 42,
          event: 'push',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:15:00Z',
          html_url: 'https://github.com/test-owner/test-repo/actions/runs/789',
          head_sha: 'abc123',
          head_branch: 'main',
        },
      ],
    };

    it('should fetch workflow runs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkflowRuns,
      });

      const results = await adapter.fetchWorkflowRuns(mockConfig);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('workflow_run');
      expect(results[0].sourceId).toBe('github-workflow-789');
      expect(results[0].data.name).toBe('CI Pipeline');
    });

    it('should support status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkflowRuns,
      });

      await adapter.fetchWorkflowRuns(mockConfig, { status: 'completed' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=completed'),
        expect.any(Object),
      );
    });
  });

  describe('fetchReleases', () => {
    const mockReleases = [
      {
        id: 101,
        tag_name: 'v1.0.0',
        name: 'Version 1.0.0',
        body: 'Release notes',
        draft: false,
        prerelease: false,
        created_at: '2025-01-01T00:00:00Z',
        published_at: '2025-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/releases/tag/v1.0.0',
        assets: [],
      },
    ];

    it('should fetch releases', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReleases,
      });

      const results = await adapter.fetchReleases(mockConfig);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('release');
      expect(results[0].data.tagName).toBe('v1.0.0');
    });
  });

  describe('fetchSecurityAdvisories', () => {
    const mockAdvisories = [
      {
        number: 1,
        state: 'open',
        dependency: {
          package: { name: 'vulnerable-package', ecosystem: 'npm' },
          manifest_path: 'package.json',
        },
        security_advisory: {
          ghsa_id: 'GHSA-1234-abcd-5678',
          cve_id: 'CVE-2025-0001',
          summary: 'Test vulnerability',
          severity: 'high',
        },
        security_vulnerability: {
          severity: 'high',
          vulnerable_version_range: '< 2.0.0',
        },
        created_at: '2025-01-01T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/security/dependabot/1',
      },
    ];

    it('should fetch security advisories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdvisories,
      });

      const results = await adapter.fetchSecurityAdvisories(mockConfig);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('security_advisory');
      expect(results[0].data.package).toBe('vulnerable-package');
    });
  });

  describe('API configuration', () => {
    it('should use custom API URL when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const customConfig = {
        ...mockConfig,
        apiUrl: 'https://github.example.com/api/v3',
      };

      await adapter.fetchPullRequests(customConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://github.example.com/api/v3'),
        expect.any(Object),
      );
    });

    it('should set correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await adapter.fetchPullRequests(mockConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            Accept: 'application/vnd.github+json',
          }),
        }),
      );
    });
  });
});
