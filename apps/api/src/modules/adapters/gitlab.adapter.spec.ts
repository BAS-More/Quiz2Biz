import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GitLabAdapter } from './gitlab.adapter';
import { PrismaService } from '@libs/database';
import * as dns from 'dns';

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('dns', () => {
  const actual = jest.requireActual('dns');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      lookup: jest.fn(),
    },
  };
});

const mockDnsLookup = dns.promises.lookup as jest.MockedFunction<typeof dns.promises.lookup>;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const config = { token: 'test-token', projectId: '123' };

const TRUSTED_URL = 'https://gitlab.com/api/v4';

function dnsResolvePublic(): void {
  mockDnsLookup.mockResolvedValue([{ address: '35.231.145.151', family: 4 }] as never);
}

function mockOkFetch(body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  });
}

function mockErrorFetch(status: number, text: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => text,
  });
}

// ---------------------------------------------------------------------------
// Factory helpers for GitLab API response objects
// ---------------------------------------------------------------------------

function makePipeline(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
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
    commit: { id: 'abc123', short_id: 'abc1', title: 'Commit title' },
    pipeline: { id: 1, project_id: 123, ref: 'main', sha: 'abc123', status: 'success' },
    web_url: 'https://gitlab.com/project/-/jobs/1001',
    artifacts: [],
    runner: { id: 1, description: 'shared-runner', active: true },
    artifacts_expire_at: null,
    coverage: 85.5,
    allow_failure: false,
    failure_reason: null,
    ...overrides,
  };
}

function makeMergeRequest(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function makeRelease(overrides: Record<string, unknown> = {}) {
  return {
    tag_name: 'v1.0.0',
    description: 'Release notes',
    name: 'Version 1.0.0',
    created_at: '2025-01-01T00:00:00Z',
    released_at: '2025-01-01T00:00:00Z',
    author: { id: 1, username: 'releaser', name: 'Releaser' },
    commit: { id: 'abc123', short_id: 'abc1', title: 'Release commit' },
    assets: { count: 2, sources: [{ format: 'zip', url: 'https://example.com/zip' }], links: [] },
    _links: { self: 'https://gitlab.com/api/releases/v1.0.0' },
    ...overrides,
  };
}

function makeVulnerability(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'SQL Injection',
    description: 'Potential SQL injection vulnerability',
    state: 'detected',
    severity: 'high',
    confidence: 'medium',
    report_type: 'sast',
    project: { id: 123, name: 'test', full_path: 'group/test' },
    scanner: { external_id: 'semgrep', name: 'Semgrep', vendor: 'Semgrep' },
    identifiers: [
      { external_type: 'cve', external_id: 'CVE-2025-0001', name: 'CVE-2025-0001', url: 'https://cve.org/0001' },
    ],
    location: { file: 'src/app.ts', start_line: 10 },
    solution: null,
    links: [{ url: 'https://cve.org/0001' }],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    detected_at: '2025-01-01T00:00:00Z',
    dismissed_at: null,
    resolved_at: null,
    ...overrides,
  };
}

function makeTestReport(overrides: Record<string, unknown> = {}) {
  return {
    total_time: 120.5,
    total_count: 100,
    success_count: 95,
    failed_count: 3,
    skipped_count: 1,
    error_count: 1,
    test_suites: [
      {
        name: 'unit-tests',
        total_time: 60,
        total_count: 50,
        success_count: 48,
        failed_count: 1,
        skipped_count: 1,
        error_count: 0,
        suite_error: null,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitLabAdapter', () => {
  let adapter: GitLabAdapter;

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

    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(TRUSTED_URL);
    dnsResolvePublic();
  });

  // -----------------------------------------------------------------------
  // Basic instantiation
  // -----------------------------------------------------------------------

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // isPrivateIp  (private method accessed via any-cast)
  // -----------------------------------------------------------------------

  describe('isPrivateIp', () => {
    const isPrivateIp = (ip: string): boolean =>
      (adapter as unknown as Record<string, (ip: string) => boolean>).isPrivateIp(ip);

    it.each([
      ['10.0.0.1', true],
      ['10.255.255.255', true],
      ['172.16.0.1', true],
      ['172.31.255.255', true],
      ['192.168.0.1', true],
      ['192.168.255.255', true],
      ['127.0.0.1', true],
      ['127.255.255.255', true],
      ['169.254.1.1', true],
    ])('should return true for private IP %s', (ip, expected) => {
      expect(isPrivateIp(ip)).toBe(expected);
    });

    it.each([
      ['8.8.8.8', false],
      ['35.231.145.151', false],
      ['1.1.1.1', false],
      ['203.0.113.50', false],
    ])('should return false for public IP %s', (ip, expected) => {
      expect(isPrivateIp(ip)).toBe(expected);
    });

    it('should return false for non-IP strings', () => {
      expect(isPrivateIp('not-an-ip')).toBe(false);
      expect(isPrivateIp('')).toBe(false);
      expect(isPrivateIp('abc.def.ghi.jkl')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // sanitizeEndpoint  (private method)
  // -----------------------------------------------------------------------

  describe('sanitizeEndpoint', () => {
    const sanitize = (ep: string): string =>
      (adapter as unknown as Record<string, (ep: string) => string>).sanitizeEndpoint(ep);

    it('should strip leading slash', () => {
      expect(sanitize('/projects/123/pipelines')).toBe('projects/123/pipelines');
    });

    it('should keep endpoint without leading slash', () => {
      expect(sanitize('projects/123/pipelines')).toBe('projects/123/pipelines');
    });

    it('should throw on empty endpoint', () => {
      expect(() => sanitize('')).toThrow(HttpException);
      expect(() => sanitize('   ')).toThrow(HttpException);
    });

    it('should throw on path traversal (../)', () => {
      expect(() => sanitize('../etc/passwd')).toThrow('Invalid GitLab API endpoint format');
      expect(() => sanitize('projects/../secrets')).toThrow('Invalid GitLab API endpoint format');
      expect(() => sanitize('projects/123/../../admin')).toThrow('Invalid GitLab API endpoint format');
    });

    it('should throw on protocol injection', () => {
      expect(() => sanitize('https://evil.com/api')).toThrow('Invalid GitLab API endpoint format');
      expect(() => sanitize('http://evil.com/api')).toThrow('Invalid GitLab API endpoint format');
    });

    it('should throw on double-slash prefix', () => {
      expect(() => sanitize('//evil.com/api')).toThrow('Invalid GitLab API endpoint format');
    });

    it('should throw on backslashes', () => {
      expect(() => sanitize('projects\\123\\pipelines')).toThrow('Invalid GitLab API endpoint format');
    });

    it('should throw on @ symbol (credential injection)', () => {
      expect(() => sanitize('user:pass@evil.com/api')).toThrow('Invalid GitLab API endpoint format');
    });
  });

  // -----------------------------------------------------------------------
  // encodeProjectId  (private method)
  // -----------------------------------------------------------------------

  describe('encodeProjectId', () => {
    const encode = (id: string | number): string =>
      (adapter as unknown as Record<string, (id: string | number) => string>).encodeProjectId(id);

    it('should encode string project ID with URI encoding', () => {
      expect(encode('group/project')).toBe('group%2Fproject');
    });

    it('should convert numeric project ID to string', () => {
      expect(encode(123)).toBe('123');
    });

    it('should encode special characters in string IDs', () => {
      expect(encode('my group/my project')).toBe('my%20group%2Fmy%20project');
    });
  });

  // -----------------------------------------------------------------------
  // validateAndGetBaseUrl  (private async method, tested via public calls)
  // -----------------------------------------------------------------------

  describe('validateAndGetBaseUrl', () => {
    it('should reject when provided apiUrl does not match trusted URL', async () => {
      const badConfig = { ...config, apiUrl: 'https://gitlab.evil.com/api/v4' };

      await expect(adapter.fetchPipelines(badConfig)).rejects.toThrow(
        'Configured GitLab API URL does not match trusted server configuration',
      );
    });

    it('should accept when provided apiUrl matches trusted URL', async () => {
      const goodConfig = { ...config, apiUrl: TRUSTED_URL };
      mockOkFetch([]);

      const results = await adapter.fetchPipelines(goodConfig);

      expect(results).toEqual([]);
    });

    it('should reject HTTP (non-HTTPS) URL', async () => {
      mockConfigService.get.mockReturnValue('http://gitlab.com/api/v4');

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'GitLab API URL must use HTTPS',
      );
    });

    it('should reject URL with credentials embedded', async () => {
      mockConfigService.get.mockReturnValue('https://user:pass@gitlab.com/api/v4');

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'GitLab API URL must not contain credentials',
      );
    });

    it('should reject localhost URL', async () => {
      mockConfigService.get.mockReturnValue('https://localhost/api/v4');

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'GitLab API URL must not point to localhost',
      );
    });

    it('should reject 127.0.0.1 URL', async () => {
      mockConfigService.get.mockReturnValue('https://127.0.0.1/api/v4');

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'GitLab API URL must not point to localhost',
      );
    });

    it('should reject when DNS resolves to a private IP', async () => {
      mockDnsLookup.mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }] as never);

      // The inner HttpException ("must not point to a private or loopback address")
      // is caught by the outer catch, which re-throws the generic DNS resolution error.
      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'Unable to resolve GitLab API host',
      );
    });

    it('should reject when DNS resolves to loopback', async () => {
      mockDnsLookup.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as never);

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'Unable to resolve GitLab API host',
      );
    });

    it('should reject when DNS lookup fails', async () => {
      mockDnsLookup.mockRejectedValueOnce(new Error('ENOTFOUND'));

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'Unable to resolve GitLab API host',
      );
    });

    it('should reject invalid URL', async () => {
      mockConfigService.get.mockReturnValue('not-a-valid-url');

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'Invalid GitLab API URL',
      );
    });

    it('should strip trailing slash from base URL', async () => {
      mockConfigService.get.mockReturnValue('https://gitlab.com/api/v4/');
      mockOkFetch([]);

      await adapter.fetchPipelines(config);

      const fetchedUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchedUrl).not.toMatch(/\/api\/v4\/\//);
    });
  });

  // -----------------------------------------------------------------------
  // makeRequest  (private, tested through public methods)
  // -----------------------------------------------------------------------

  describe('makeRequest (via public methods)', () => {
    it('should set PRIVATE-TOKEN header', async () => {
      mockOkFetch([]);

      await adapter.fetchPipelines(config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'PRIVATE-TOKEN': 'test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should throw HttpException with status from non-ok response', async () => {
      mockErrorFetch(403, 'Forbidden');

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(HttpException);
      try {
        mockDnsLookup.mockResolvedValueOnce([{ address: '35.231.145.151', family: 4 }] as never);
        mockErrorFetch(403, 'Forbidden');
        await adapter.fetchPipelines(config);
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(403);
      }
    });

    it('should throw SERVICE_UNAVAILABLE on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(
        'Failed to connect to GitLab API',
      );
    });

    it('should re-throw HttpException from validation without wrapping', async () => {
      const badConfig = { ...config, apiUrl: 'https://evil.com/api/v4' };

      try {
        await adapter.fetchPipelines(badConfig);
        fail('Expected HttpException');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  // -----------------------------------------------------------------------
  // fetchPipelines
  // -----------------------------------------------------------------------

  describe('fetchPipelines', () => {
    it('should fetch pipelines and convert to evidence results', async () => {
      const pipelines = [makePipeline()];
      mockOkFetch(pipelines);

      const results = await adapter.fetchPipelines(config);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pipeline');
      expect(results[0].sourceId).toBe('gitlab-pipeline-1');
      expect(results[0].sourceUrl).toBe('https://gitlab.com/project/-/pipelines/1');
      expect(results[0].data.status).toBe('success');
      expect(results[0].data.ref).toBe('main');
      expect(results[0].data.user).toBe('testuser');
      expect(results[0].data.duration).toBe(540);
      expect(results[0].data.coverage).toBe('85.5');
      expect(results[0].hash).toBeDefined();
      expect(results[0].timestamp).toEqual(new Date('2025-01-02T00:00:00Z'));
      expect(results[0].metadata).toEqual({
        provider: 'gitlab',
        projectId: '123',
        resourceType: 'pipeline',
      });
    });

    it('should use default pagination (perPage=20, page=1)', async () => {
      mockOkFetch([]);

      await adapter.fetchPipelines(config);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=20');
      expect(url).toContain('page=1');
    });

    it('should append status filter when provided', async () => {
      mockOkFetch([]);

      await adapter.fetchPipelines(config, { status: 'success' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('status=success');
    });

    it('should append ref filter when provided', async () => {
      mockOkFetch([]);

      await adapter.fetchPipelines(config, { ref: 'develop' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('ref=develop');
    });

    it('should apply custom pagination', async () => {
      mockOkFetch([]);

      await adapter.fetchPipelines(config, { perPage: 50, page: 3 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=50');
      expect(url).toContain('page=3');
    });

    it('should handle multiple pipelines', async () => {
      const pipelines = [
        makePipeline({ id: 1, status: 'success' }),
        makePipeline({ id: 2, status: 'failed', iid: 101 }),
      ];
      mockOkFetch(pipelines);

      const results = await adapter.fetchPipelines(config);

      expect(results).toHaveLength(2);
      expect(results[0].sourceId).toBe('gitlab-pipeline-1');
      expect(results[1].sourceId).toBe('gitlab-pipeline-2');
    });

    it('should throw HttpException on API error', async () => {
      mockErrorFetch(401, 'Unauthorized');

      await expect(adapter.fetchPipelines(config)).rejects.toThrow(HttpException);
    });
  });

  // -----------------------------------------------------------------------
  // fetchPipelineJobs
  // -----------------------------------------------------------------------

  describe('fetchPipelineJobs', () => {
    it('should fetch jobs and convert to evidence results', async () => {
      const jobs = [makeJob()];
      mockOkFetch(jobs);

      const results = await adapter.fetchPipelineJobs(config, 1);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('job');
      expect(results[0].sourceId).toBe('gitlab-job-1001');
      expect(results[0].data.name).toBe('build');
      expect(results[0].data.stage).toBe('build');
      expect(results[0].data.status).toBe('success');
      expect(results[0].data.user).toBe('ci');
      expect(results[0].data.commitId).toBe('abc123');
      expect(results[0].data.commitTitle).toBe('Commit title');
      expect(results[0].data.duration).toBe(240);
      expect(results[0].data.coverage).toBe(85.5);
      expect(results[0].data.allowFailure).toBe(false);
      expect(results[0].data.failureReason).toBeNull();
      expect(results[0].data.hasArtifacts).toBe(false);
      expect(results[0].data.artifactTypes).toEqual([]);
      expect(results[0].data.runner).toBe('shared-runner');
      expect(results[0].metadata.pipelineId).toBe(1);
    });

    it('should include artifact info when artifacts exist', async () => {
      const jobWithArtifacts = makeJob({
        artifacts: [
          { file_type: 'archive', size: 1024, filename: 'artifacts.zip', file_format: 'zip' },
          { file_type: 'junit', size: 256, filename: 'report.xml', file_format: 'gzip' },
        ],
      });
      mockOkFetch([jobWithArtifacts]);

      const results = await adapter.fetchPipelineJobs(config, 1);

      expect(results[0].data.hasArtifacts).toBe(true);
      expect(results[0].data.artifactTypes).toEqual(['archive', 'junit']);
    });

    it('should use finished_at for timestamp when available', async () => {
      const job = makeJob({ finished_at: '2025-06-01T12:00:00Z' });
      mockOkFetch([job]);

      const results = await adapter.fetchPipelineJobs(config, 1);

      expect(results[0].timestamp).toEqual(new Date('2025-06-01T12:00:00Z'));
    });

    it('should fall back to started_at when finished_at is null', async () => {
      const job = makeJob({ finished_at: null, started_at: '2025-06-01T10:00:00Z' });
      mockOkFetch([job]);

      const results = await adapter.fetchPipelineJobs(config, 1);

      expect(results[0].timestamp).toEqual(new Date('2025-06-01T10:00:00Z'));
    });

    it('should fall back to created_at when both finished_at and started_at are null', async () => {
      const job = makeJob({
        finished_at: null,
        started_at: null,
        created_at: '2025-06-01T08:00:00Z',
      });
      mockOkFetch([job]);

      const results = await adapter.fetchPipelineJobs(config, 1);

      expect(results[0].timestamp).toEqual(new Date('2025-06-01T08:00:00Z'));
    });

    it('should handle runner being null', async () => {
      const job = makeJob({ runner: null });
      mockOkFetch([job]);

      const results = await adapter.fetchPipelineJobs(config, 1);

      expect(results[0].data.runner).toBeUndefined();
    });

    it('should encode string project IDs in the URL', async () => {
      mockOkFetch([]);
      const stringConfig = { ...config, projectId: 'group/project' };

      await adapter.fetchPipelineJobs(stringConfig, 42);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('group%2Fproject');
    });
  });

  // -----------------------------------------------------------------------
  // fetchTestReport
  // -----------------------------------------------------------------------

  describe('fetchTestReport', () => {
    it('should return test report evidence on success', async () => {
      mockOkFetch(makeTestReport());

      const result = await adapter.fetchTestReport(config, 99);

      expect(result).not.toBeNull();
      expect(result!.type).toBe('test_report');
      expect(result!.sourceId).toBe('gitlab-test-report-99');
      expect(result!.data.pipelineId).toBe(99);
      expect(result!.data.totalCount).toBe(100);
      expect(result!.data.successCount).toBe(95);
      expect(result!.data.failedCount).toBe(3);
      expect(result!.data.skippedCount).toBe(1);
      expect(result!.data.errorCount).toBe(1);
      expect(result!.data.totalTime).toBe(120.5);
      expect(result!.metadata.pipelineId).toBe(99);
      expect(result!.metadata.resourceType).toBe('test_report');
    });

    it('should map test suites correctly', async () => {
      mockOkFetch(makeTestReport());

      const result = await adapter.fetchTestReport(config, 99);

      const suites = result!.data.suites as Array<Record<string, unknown>>;
      expect(suites).toHaveLength(1);
      expect(suites[0].name).toBe('unit-tests');
      expect(suites[0].totalCount).toBe(50);
      expect(suites[0].successCount).toBe(48);
    });

    it('should return null when API call fails', async () => {
      mockErrorFetch(404, 'Not Found');

      const result = await adapter.fetchTestReport(config, 99);

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      const result = await adapter.fetchTestReport(config, 99);

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // fetchMergeRequests
  // -----------------------------------------------------------------------

  describe('fetchMergeRequests', () => {
    it('should fetch merge requests and convert to evidence', async () => {
      mockOkFetch([makeMergeRequest()]);

      const results = await adapter.fetchMergeRequests(config);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('merge_request');
      expect(results[0].sourceId).toBe('gitlab-mr-50');
      expect(results[0].data.title).toBe('Test MR');
      expect(results[0].data.state).toBe('merged');
      expect(results[0].data.author).toBe('developer');
      expect(results[0].data.targetBranch).toBe('main');
      expect(results[0].data.sourceBranch).toBe('feature');
      expect(results[0].data.mergedBy).toBe('reviewer');
      expect(results[0].data.labels).toEqual(['bug', 'urgent']);
      expect(results[0].data.hasConflicts).toBe(false);
      expect(results[0].data.changesCount).toBe('5');
      expect(results[0].data.draft).toBe(false);
    });

    it('should use state=all by default', async () => {
      mockOkFetch([]);

      await adapter.fetchMergeRequests(config);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('state=all');
    });

    it('should pass state filter when provided', async () => {
      mockOkFetch([]);

      await adapter.fetchMergeRequests(config, { state: 'merged' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('state=merged');
    });

    it('should handle MR without merged_by', async () => {
      const openMR = makeMergeRequest({
        state: 'opened',
        merged_by: null,
        merged_at: null,
      });
      mockOkFetch([openMR]);

      const results = await adapter.fetchMergeRequests(config);

      expect(results[0].data.mergedBy).toBeUndefined();
      expect(results[0].data.mergedAt).toBeNull();
    });

    it('should map assignees and reviewers', async () => {
      const mr = makeMergeRequest({
        assignees: [
          { id: 10, username: 'dev1', name: 'Dev One' },
          { id: 11, username: 'dev2', name: 'Dev Two' },
        ],
        reviewers: [{ id: 20, username: 'rev1', name: 'Reviewer One' }],
      });
      mockOkFetch([mr]);

      const results = await adapter.fetchMergeRequests(config);

      expect(results[0].data.assignees).toEqual(['dev1', 'dev2']);
      expect(results[0].data.reviewers).toEqual(['rev1']);
    });
  });

  // -----------------------------------------------------------------------
  // fetchReleases
  // -----------------------------------------------------------------------

  describe('fetchReleases', () => {
    it('should fetch releases and convert to evidence', async () => {
      mockOkFetch([makeRelease()]);

      const results = await adapter.fetchReleases(config);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('release');
      expect(results[0].sourceId).toBe('gitlab-release-v1.0.0');
      expect(results[0].data.tagName).toBe('v1.0.0');
      expect(results[0].data.name).toBe('Version 1.0.0');
      expect(results[0].data.author).toBe('releaser');
      expect(results[0].data.commitId).toBe('abc123');
      expect(results[0].data.assetsCount).toBe(2);
      expect(results[0].data.sources).toEqual(['zip']);
      expect(results[0].timestamp).toEqual(new Date('2025-01-01T00:00:00Z'));
    });

    it('should use default pagination', async () => {
      mockOkFetch([]);

      await adapter.fetchReleases(config);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=20');
      expect(url).toContain('page=1');
    });

    it('should pass custom pagination', async () => {
      mockOkFetch([]);

      await adapter.fetchReleases(config, { perPage: 5, page: 2 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=5');
      expect(url).toContain('page=2');
    });

    it('should handle release with asset links', async () => {
      const release = makeRelease({
        assets: {
          count: 3,
          sources: [{ format: 'zip', url: 'https://example.com/zip' }],
          links: [
            { id: 1, name: 'Binary', url: 'https://example.com/bin', link_type: 'other' },
          ],
        },
      });
      mockOkFetch([release]);

      const results = await adapter.fetchReleases(config);

      expect(results[0].data.links).toEqual([{ name: 'Binary', type: 'other' }]);
    });
  });

  // -----------------------------------------------------------------------
  // fetchVulnerabilities
  // -----------------------------------------------------------------------

  describe('fetchVulnerabilities', () => {
    it('should fetch vulnerabilities and convert to evidence', async () => {
      mockOkFetch([makeVulnerability()]);

      const results = await adapter.fetchVulnerabilities(config);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('vulnerability');
      expect(results[0].sourceId).toBe('gitlab-vuln-1');
      expect(results[0].data.title).toBe('SQL Injection');
      expect(results[0].data.severity).toBe('high');
      expect(results[0].data.confidence).toBe('medium');
      expect(results[0].data.reportType).toBe('sast');
      expect(results[0].data.scanner).toBe('Semgrep');
      expect(results[0].data.scannerVendor).toBe('Semgrep');
      expect(results[0].data.solution).toBeNull();
    });

    it('should map identifiers correctly', async () => {
      mockOkFetch([makeVulnerability()]);

      const results = await adapter.fetchVulnerabilities(config);

      const identifiers = results[0].data.identifiers as Array<Record<string, string>>;
      expect(identifiers).toHaveLength(1);
      expect(identifiers[0]).toEqual({
        type: 'cve',
        id: 'CVE-2025-0001',
        name: 'CVE-2025-0001',
      });
    });

    it('should append state filter when provided', async () => {
      mockOkFetch([]);

      await adapter.fetchVulnerabilities(config, { state: 'detected' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('state=detected');
    });

    it('should append severity filter when provided', async () => {
      mockOkFetch([]);

      await adapter.fetchVulnerabilities(config, { severity: 'critical' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('severity=critical');
    });

    it('should use perPage=50 by default', async () => {
      mockOkFetch([]);

      await adapter.fetchVulnerabilities(config);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('per_page=50');
    });

    it('should return empty array on API error', async () => {
      mockErrorFetch(403, 'Forbidden');

      const results = await adapter.fetchVulnerabilities(config);

      expect(results).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      const results = await adapter.fetchVulnerabilities(config);

      expect(results).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // fetchCoverageHistory
  // -----------------------------------------------------------------------

  describe('fetchCoverageHistory', () => {
    it('should return coverage evidence when coverage jobs exist', async () => {
      const jobs = [
        makeJob({ id: 1, coverage: 80, ref: 'main', finished_at: '2025-01-01T00:00:00Z' }),
        makeJob({ id: 2, coverage: 85, ref: 'main', finished_at: '2025-01-02T00:00:00Z' }),
      ];
      mockOkFetch(jobs);

      const result = await adapter.fetchCoverageHistory(config);

      expect(result).not.toBeNull();
      expect(result!.type).toBe('coverage');
      expect(result!.sourceId).toBe('gitlab-coverage-123-main');
      expect(result!.data.ref).toBe('main');
      expect(result!.data.jobCount).toBe(2);
      expect(result!.data.latestCoverage).toBe(80);
      expect(result!.data.averageCoverage).toBe(82.5);
      expect(result!.metadata.ref).toBe('main');
      expect(result!.metadata.resourceType).toBe('coverage_history');
    });

    it('should filter jobs by ref', async () => {
      const jobs = [
        makeJob({ id: 1, coverage: 80, ref: 'main' }),
        makeJob({ id: 2, coverage: 90, ref: 'develop' }),
        makeJob({ id: 3, coverage: null, ref: 'main' }),
      ];
      mockOkFetch(jobs);

      const result = await adapter.fetchCoverageHistory(config, { ref: 'main' });

      expect(result).not.toBeNull();
      expect(result!.data.jobCount).toBe(1);
    });

    it('should return null when no jobs have coverage data for the ref', async () => {
      const jobs = [
        makeJob({ id: 1, coverage: null, ref: 'main' }),
        makeJob({ id: 2, coverage: 85, ref: 'develop' }),
      ];
      mockOkFetch(jobs);

      const result = await adapter.fetchCoverageHistory(config, { ref: 'main' });

      expect(result).toBeNull();
    });

    it('should return null when no jobs at all', async () => {
      mockOkFetch([]);

      const result = await adapter.fetchCoverageHistory(config);

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockErrorFetch(500, 'Internal Server Error');

      const result = await adapter.fetchCoverageHistory(config);

      expect(result).toBeNull();
    });

    it('should default to ref=main', async () => {
      mockOkFetch([makeJob({ coverage: 70, ref: 'main' })]);

      const result = await adapter.fetchCoverageHistory(config);

      expect(result!.data.ref).toBe('main');
    });

    it('should use custom ref', async () => {
      mockOkFetch([makeJob({ coverage: 70, ref: 'develop' })]);

      const result = await adapter.fetchCoverageHistory(config, { ref: 'develop' });

      expect(result).not.toBeNull();
      expect(result!.data.ref).toBe('develop');
    });
  });

  // -----------------------------------------------------------------------
  // verifyWebhookToken
  // -----------------------------------------------------------------------

  describe('verifyWebhookToken', () => {
    it('should return true when tokens match', () => {
      expect(adapter.verifyWebhookToken('secret-abc', 'secret-abc')).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      expect(adapter.verifyWebhookToken('wrong-token', 'correct-token')).toBe(false);
    });

    it('should return false for empty vs non-empty', () => {
      expect(adapter.verifyWebhookToken('', 'some-token')).toBe(false);
    });

    it('should return true when both are empty', () => {
      expect(adapter.verifyWebhookToken('', '')).toBe(true);
    });

    it('should be case-sensitive', () => {
      expect(adapter.verifyWebhookToken('Token', 'token')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // ingestAllEvidence
  // -----------------------------------------------------------------------

  describe('ingestAllEvidence', () => {
    const sessionId = 'session-abc-123';

    /**
     * Helper: set up a full successful ingestion where each API call returns
     * a minimal valid response.  Each makeRequest call triggers DNS + fetch,
     * so we queue enough DNS + fetch responses for the entire flow.
     */
    function setupFullSuccessIngestion(): void {
      // fetchPipelines => 1 pipeline
      const pipeline = makePipeline({ id: 10 });
      mockOkFetch([pipeline]);

      // fetchPipelineJobs for pipeline id 10 (first of slice 0..5)
      mockOkFetch([makeJob({ id: 2001 })]);

      // fetchTestReport for pipeline id 10
      mockOkFetch(makeTestReport());

      // fetchMergeRequests
      mockOkFetch([makeMergeRequest()]);

      // fetchReleases
      mockOkFetch([makeRelease()]);

      // fetchVulnerabilities
      mockOkFetch([makeVulnerability()]);

      // fetchCoverageHistory
      mockOkFetch([makeJob({ coverage: 80, ref: 'main' })]);
    }

    it('should orchestrate all fetches and return aggregated results', async () => {
      setupFullSuccessIngestion();

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.ingested).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
      expect(result.results.pipelines).toBe(1);
      expect(result.results.jobs).toBe(1);
      expect(result.results.test_reports).toBe(1);
      expect(result.results.merge_requests).toBe(1);
      expect(result.results.releases).toBe(1);
      expect(result.results.vulnerabilities).toBe(1);
      expect(result.results.coverage).toBe(1);
    });

    it('should report total ingested count correctly', async () => {
      setupFullSuccessIngestion();

      const result = await adapter.ingestAllEvidence(config, sessionId);

      // 1 pipeline + 1 job + 1 test_report + 1 MR + 1 release + 1 vuln + 1 coverage = 7
      expect(result.ingested).toBe(7);
    });

    it('should continue when pipeline fetch fails and record the error', async () => {
      // fetchPipelines fails
      mockErrorFetch(500, 'Server Error');

      // fetchMergeRequests succeeds
      mockOkFetch([makeMergeRequest()]);

      // fetchReleases succeeds
      mockOkFetch([makeRelease()]);

      // fetchVulnerabilities succeeds
      mockOkFetch([makeVulnerability()]);

      // fetchCoverageHistory succeeds
      mockOkFetch([makeJob({ coverage: 80, ref: 'main' })]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Pipelines')]),
      );
      expect(result.results.pipelines).toBe(0);
      expect(result.results.merge_requests).toBe(1);
    });

    it('should continue when MR fetch fails and record the error', async () => {
      // fetchPipelines (empty to skip job/test iterations)
      mockOkFetch([]);

      // fetchMergeRequests fails
      mockErrorFetch(403, 'Forbidden');

      // fetchReleases succeeds
      mockOkFetch([makeRelease()]);

      // fetchVulnerabilities succeeds
      mockOkFetch([makeVulnerability()]);

      // fetchCoverageHistory succeeds
      mockOkFetch([makeJob({ coverage: 80, ref: 'main' })]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Merge requests')]),
      );
      expect(result.results.merge_requests).toBe(0);
      expect(result.results.releases).toBe(1);
    });

    it('should continue when release fetch fails', async () => {
      // fetchPipelines (empty)
      mockOkFetch([]);

      // fetchMergeRequests
      mockOkFetch([]);

      // fetchReleases fails
      mockErrorFetch(404, 'Not Found');

      // fetchVulnerabilities
      mockOkFetch([]);

      // fetchCoverageHistory
      mockOkFetch([]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Releases')]),
      );
      expect(result.results.releases).toBe(0);
    });

    it('should continue when vulnerability fetch fails (returns [] internally)', async () => {
      // fetchPipelines (empty)
      mockOkFetch([]);

      // fetchMergeRequests
      mockOkFetch([]);

      // fetchReleases
      mockOkFetch([]);

      // fetchVulnerabilities - the method itself catches errors and returns [],
      // so ingestAllEvidence won't see an error from it directly.
      // However, if the whole catch block in ingest fires, it records.
      // The inner fetchVulnerabilities already handles its own errors.
      mockErrorFetch(500, 'Server Error');

      // fetchCoverageHistory
      mockOkFetch([]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      // vulnerabilities returns [] on error (no error in ingest), so no error entry
      expect(result.results.vulnerabilities).toBe(0);
    });

    it('should handle job fetch failure for a specific pipeline', async () => {
      // fetchPipelines - 1 pipeline
      mockOkFetch([makePipeline({ id: 10 })]);

      // fetchPipelineJobs for pipeline 10 fails
      mockErrorFetch(500, 'Server Error');

      // fetchTestReport for pipeline 10 succeeds
      mockOkFetch(makeTestReport());

      // fetchMergeRequests
      mockOkFetch([]);

      // fetchReleases
      mockOkFetch([]);

      // fetchVulnerabilities
      mockOkFetch([]);

      // fetchCoverageHistory
      mockOkFetch([]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Jobs for pipeline 10')]),
      );
      expect(result.results.jobs).toBe(0);
      expect(result.results.pipelines).toBe(1);
    });

    it('should process jobs and test reports for up to 5 pipelines', async () => {
      // Create 6 pipelines; only first 5 should get jobs/test_reports fetched
      const pipelines = Array.from({ length: 6 }, (_, i) =>
        makePipeline({ id: i + 1, iid: 100 + i }),
      );
      mockOkFetch(pipelines);

      // For each of the first 5 pipelines: jobs + test report = 10 fetches
      for (let i = 0; i < 5; i++) {
        mockOkFetch([makeJob({ id: 2000 + i })]);
        mockOkFetch(makeTestReport());
      }

      // fetchMergeRequests
      mockOkFetch([]);

      // fetchReleases
      mockOkFetch([]);

      // fetchVulnerabilities
      mockOkFetch([]);

      // fetchCoverageHistory
      mockOkFetch([]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.results.pipelines).toBe(6);
      expect(result.results.jobs).toBe(5);
      expect(result.results.test_reports).toBe(5);
    });

    it('should handle test report returning null for a pipeline', async () => {
      // fetchPipelines
      mockOkFetch([makePipeline({ id: 10 })]);

      // fetchPipelineJobs
      mockOkFetch([]);

      // fetchTestReport returns error (fetchTestReport catches and returns null)
      mockErrorFetch(404, 'Not Found');

      // fetchMergeRequests
      mockOkFetch([]);

      // fetchReleases
      mockOkFetch([]);

      // fetchVulnerabilities
      mockOkFetch([]);

      // fetchCoverageHistory
      mockOkFetch([]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.results.test_reports).toBe(0);
      // No error recorded because fetchTestReport handles it internally
    });

    it('should handle coverage returning null', async () => {
      // fetchPipelines (empty)
      mockOkFetch([]);

      // fetchMergeRequests
      mockOkFetch([]);

      // fetchReleases
      mockOkFetch([]);

      // fetchVulnerabilities
      mockOkFetch([]);

      // fetchCoverageHistory returns jobs with no coverage
      mockOkFetch([makeJob({ coverage: null, ref: 'main' })]);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.results.coverage).toBe(0);
    });

    it('should return zero counts and empty errors when everything is empty', async () => {
      mockOkFetch([]); // pipelines
      mockOkFetch([]); // merge_requests
      mockOkFetch([]); // releases
      mockOkFetch([]); // vulnerabilities
      mockOkFetch([]); // coverage (jobs)

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.ingested).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.results).toEqual({
        pipelines: 0,
        jobs: 0,
        test_reports: 0,
        merge_requests: 0,
        releases: 0,
        vulnerabilities: 0,
        coverage: 0,
      });
    });
  });

  // -----------------------------------------------------------------------
  // Hash calculation (consistency check)
  // -----------------------------------------------------------------------

  describe('hash calculation', () => {
    it('should produce consistent hashes for identical data', async () => {
      const pipeline = makePipeline();
      mockOkFetch([pipeline]);
      const results1 = await adapter.fetchPipelines(config);

      dnsResolvePublic();
      mockOkFetch([pipeline]);
      const results2 = await adapter.fetchPipelines(config);

      expect(results1[0].hash).toBe(results2[0].hash);
    });

    it('should produce different hashes for different data', async () => {
      mockOkFetch([makePipeline({ id: 1, status: 'success' })]);
      const results1 = await adapter.fetchPipelines(config);

      dnsResolvePublic();
      mockOkFetch([makePipeline({ id: 2, status: 'failed' })]);
      const results2 = await adapter.fetchPipelines(config);

      expect(results1[0].hash).not.toBe(results2[0].hash);
    });
  });

  // -----------------------------------------------------------------------
  // Project ID encoding in URLs
  // -----------------------------------------------------------------------

  describe('project ID encoding in URLs', () => {
    it('should use numeric project ID directly in URL', async () => {
      const numericConfig = { token: 'test-token', projectId: 456 };
      mockOkFetch([]);

      await adapter.fetchPipelines(numericConfig);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/projects/456/');
    });

    it('should URL-encode string project ID with slashes', async () => {
      const pathConfig = { token: 'test-token', projectId: 'my-group/my-project' };
      mockOkFetch([]);

      await adapter.fetchPipelines(pathConfig);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/projects/my-group%2Fmy-project/');
    });
  });
});
