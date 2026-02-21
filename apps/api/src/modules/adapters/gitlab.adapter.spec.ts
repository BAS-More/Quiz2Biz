import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { GitLabAdapter } from './gitlab.adapter';
import { PrismaService } from '@libs/database';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GitLabAdapter', () => {
  let adapter: GitLabAdapter;
  let configService: ConfigService;

  const mockConfig = {
    token: 'test-token',
    projectId: '123',
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitLabAdapter,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    adapter = module.get<GitLabAdapter>(GitLabAdapter);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('fetchPipelines', () => {
    const mockPipelines = [
      {
        id: 1,
        iid: 100,
        project_id: 123,
        sha: 'abc123',
        ref: 'main',
        status: 'success',
        source: 'push',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        web_url: 'https://gitlab.com/project/-/pipelines/1',
        before_sha: 'def456',
        tag: false,
        yaml_errors: null,
        user: { id: 1, username: 'testuser', name: 'Test User' },
        started_at: '2025-01-01T00:01:00Z',
        finished_at: '2025-01-01T00:10:00Z',
        duration: 540,
        queued_duration: 5,
        coverage: '85.5',
      },
    ];

    it('should fetch pipelines and convert to evidence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPipelines,
      });

      const results = await adapter.fetchPipelines(mockConfig);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pipeline');
      expect(results[0].data.status).toBe('success');
      expect(results[0].metadata.provider).toBe('gitlab');
    });

    it('should throw HttpException on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(adapter.fetchPipelines(mockConfig)).rejects.toThrow(HttpException);
    });
  });

  describe('fetchMergeRequests', () => {
    const mockMergeRequests = [
      {
        id: 1,
        iid: 50,
        project_id: 123,
        title: 'Test MR',
        description: 'Test description',
        state: 'merged',
        merged_by: { id: 1, username: 'reviewer', name: 'Reviewer' },
        merged_at: '2025-01-02T00:00:00Z',
        closed_by: null,
        closed_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        target_branch: 'main',
        source_branch: 'feature',
        author: { id: 2, username: 'developer', name: 'Developer' },
        assignees: [],
        reviewers: [],
        source_project_id: 123,
        target_project_id: 123,
        labels: ['bug', 'urgent'],
        draft: false,
        merge_status: 'can_be_merged',
        sha: 'abc123',
        merge_commit_sha: 'merged123',
        squash_commit_sha: null,
        web_url: 'https://gitlab.com/project/-/merge_requests/50',
        changes_count: '5',
        has_conflicts: false,
      },
    ];

    it('should fetch merge requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMergeRequests,
      });

      const results = await adapter.fetchMergeRequests(mockConfig);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('merge_request');
      expect(results[0].data.title).toBe('Test MR');
    });
  });

  describe('fetchPipelineJobs', () => {
    const mockJobs = [
      {
        id: 1001,
        name: 'build',
        stage: 'build',
        status: 'success',
        ref: 'main',
        tag: false,
        created_at: '2025-01-01T00:00:00Z',
        started_at: '2025-01-01T00:01:00Z',
        finished_at: '2025-01-01T00:05:00Z',
        duration: 240,
        queued_duration: 10,
        user: { id: 1, username: 'ci', name: 'CI' },
        commit: { id: 'abc123', short_id: 'abc123', title: 'Commit' },
        pipeline: { id: 1, project_id: 123, ref: 'main', sha: 'abc123', status: 'success' },
        web_url: 'https://gitlab.com/project/-/jobs/1001',
        artifacts: [],
        runner: { id: 1, description: 'runner', active: true },
        artifacts_expire_at: null,
        coverage: 85.5,
        allow_failure: false,
        failure_reason: null,
      },
    ];

    it('should fetch jobs for a pipeline', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobs,
      });

      const results = await adapter.fetchPipelineJobs(mockConfig, 1);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('job');
      expect(results[0].data.name).toBe('build');
    });
  });

  describe('fetchReleases', () => {
    const mockReleases = [
      {
        tag_name: 'v1.0.0',
        description: 'Release notes',
        name: 'Version 1.0.0',
        created_at: '2025-01-01T00:00:00Z',
        released_at: '2025-01-01T00:00:00Z',
        author: { id: 1, username: 'releaser', name: 'Releaser' },
        commit: { id: 'abc123', short_id: 'abc123', title: 'Release commit' },
        assets: { count: 2, sources: [], links: [] },
        _links: { self: 'https://gitlab.com/api/releases/v1.0.0' },
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

  describe('fetchVulnerabilities', () => {
    const mockVulnerabilities = [
      {
        id: 1,
        title: 'SQL Injection',
        description: 'Potential SQL injection vulnerability',
        state: 'detected',
        severity: 'high',
        confidence: 'medium',
        report_type: 'sast',
        project: { id: 123, name: 'test', full_path: 'group/test' },
        scanner: { external_id: 'semgrep', name: 'Semgrep', vendor: 'Semgrep' },
        identifiers: [],
        location: {},
        solution: null,
        links: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        detected_at: '2025-01-01T00:00:00Z',
        dismissed_at: null,
        resolved_at: null,
      },
    ];

    it('should fetch vulnerabilities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVulnerabilities,
      });

      const results = await adapter.fetchVulnerabilities(mockConfig);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('vulnerability');
      expect(results[0].data.severity).toBe('high');
    });
  });

  describe('API configuration', () => {
    it('should throw when API URL does not match trusted config', async () => {
      const customConfig = {
        ...mockConfig,
        apiUrl: 'https://gitlab.example.com/api/v4',
      };

      await expect(adapter.fetchPipelines(customConfig)).rejects.toThrow(
        'Configured GitLab API URL does not match trusted server configuration',
      );
    });

    it('should set PRIVATE-TOKEN header', async () => {
      mockConfigService.get.mockReturnValue('https://gitlab.com/api/v4');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await adapter.fetchPipelines(mockConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'PRIVATE-TOKEN': 'test-token',
          }),
        }),
      );
    });
  });
});
