import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { createHash } from 'crypto';
import { GitHubAdapter } from './github.adapter';
import { PrismaService } from '@libs/database';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  const config = {
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
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------
  // Helper: simulate a successful fetch response
  // ---------------------------------------------------------------
  function mockOk(body: unknown) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => body,
    });
  }

  // ---------------------------------------------------------------
  // Helper: simulate a non-ok fetch response
  // ---------------------------------------------------------------
  function mockApiError(status: number, text: string) {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      text: async () => text,
    });
  }

  // ---------------------------------------------------------------
  // Helper: simulate a network-level failure
  // ---------------------------------------------------------------
  function mockNetworkError(message = 'Network error') {
    mockFetch.mockRejectedValueOnce(new Error(message));
  }

  // ---------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------
  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  // ---------------------------------------------------------------
  // API configuration (headers / custom URL)
  // ---------------------------------------------------------------
  describe('API configuration', () => {
    it('should use the default GitHub API URL when none is provided', async () => {
      mockOk([]);
      await adapter.fetchPullRequests(config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com'),
        expect.any(Object),
      );
    });

    it('should use a custom API URL when provided', async () => {
      mockOk([]);
      const customConfig = { ...config, apiUrl: 'https://ghe.example.com/api/v3' };
      await adapter.fetchPullRequests(customConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://ghe.example.com/api/v3'),
        expect.any(Object),
      );
    });

    it('should set the correct Authorization, Accept, and API-version headers', async () => {
      mockOk([]);
      await adapter.fetchPullRequests(config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }),
      );
    });
  });

  // ---------------------------------------------------------------
  // fetchPullRequests
  // ---------------------------------------------------------------
  describe('fetchPullRequests', () => {
    const samplePR = {
      id: 1,
      number: 123,
      title: 'Add feature X',
      state: 'open',
      merged: false,
      merged_at: null,
      user: { login: 'alice' },
      base: { ref: 'main' },
      head: { ref: 'feature-x', sha: 'abc123def' },
      created_at: '2025-06-01T00:00:00Z',
      updated_at: '2025-06-02T12:00:00Z',
      html_url: 'https://github.com/test-owner/test-repo/pull/123',
      additions: 150,
      deletions: 30,
      changed_files: 7,
      mergeable: true,
      review_comments: 4,
      commits: 3,
    };

    it('should map all fields correctly for a single PR', async () => {
      mockOk([samplePR]);

      const results = await adapter.fetchPullRequests(config);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.type).toBe('pull_request');
      expect(r.sourceId).toBe('github-pr-123');
      expect(r.sourceUrl).toBe(samplePR.html_url);
      expect(r.data).toEqual({
        number: 123,
        title: 'Add feature X',
        state: 'open',
        merged: false,
        mergedAt: null,
        author: 'alice',
        baseBranch: 'main',
        headBranch: 'feature-x',
        headSha: 'abc123def',
        additions: 150,
        deletions: 30,
        changedFiles: 7,
        reviewComments: 4,
        commits: 3,
      });
      expect(r.timestamp).toEqual(new Date('2025-06-02T12:00:00Z'));
      expect(r.metadata).toEqual({
        provider: 'github',
        owner: 'test-owner',
        repo: 'test-repo',
        resourceType: 'pull_request',
      });
      // Hash must be deterministic
      const expectedHash = createHash('sha256').update(JSON.stringify(samplePR)).digest('hex');
      expect(r.hash).toBe(expectedHash);
    });

    it('should return an empty array when no pull requests exist', async () => {
      mockOk([]);
      const results = await adapter.fetchPullRequests(config);
      expect(results).toEqual([]);
    });

    it('should use default pagination options (state=all, perPage=30, page=1)', async () => {
      mockOk([]);
      await adapter.fetchPullRequests(config);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('state=all');
      expect(calledUrl).toContain('per_page=30');
      expect(calledUrl).toContain('page=1');
    });

    it('should apply custom pagination and state options', async () => {
      mockOk([]);
      await adapter.fetchPullRequests(config, { state: 'closed', perPage: 50, page: 3 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('state=closed');
      expect(calledUrl).toContain('per_page=50');
      expect(calledUrl).toContain('page=3');
    });

    it('should handle multiple pull requests', async () => {
      const secondPR = { ...samplePR, id: 2, number: 124, title: 'PR 2' };
      mockOk([samplePR, secondPR]);

      const results = await adapter.fetchPullRequests(config);
      expect(results).toHaveLength(2);
      expect(results[0].sourceId).toBe('github-pr-123');
      expect(results[1].sourceId).toBe('github-pr-124');
    });

    it('should throw HttpException with the API status code on non-ok response', async () => {
      mockApiError(403, 'Forbidden');

      await expect(adapter.fetchPullRequests(config)).rejects.toThrow(HttpException);
      try {
        mockApiError(403, 'Forbidden');
        await adapter.fetchPullRequests(config);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(403);
        expect((e as HttpException).message).toContain('GitHub API error');
      }
    });

    it('should throw HttpException SERVICE_UNAVAILABLE on network failure', async () => {
      mockNetworkError('ECONNREFUSED');

      try {
        await adapter.fetchPullRequests(config);
        fail('Expected HttpException');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  // ---------------------------------------------------------------
  // fetchCheckRuns
  // ---------------------------------------------------------------
  describe('fetchCheckRuns', () => {
    const sampleCheck = {
      id: 500,
      name: 'lint',
      status: 'completed',
      conclusion: 'success',
      started_at: '2025-07-01T10:00:00Z',
      completed_at: '2025-07-01T10:05:00Z',
      html_url: 'https://github.com/test-owner/test-repo/runs/500',
      output: {
        title: 'Lint passed',
        summary: 'No issues found',
        annotations_count: 0,
      },
    };

    it('should map all fields correctly', async () => {
      mockOk({ check_runs: [sampleCheck] });

      const results = await adapter.fetchCheckRuns(config, 'sha-abc');

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.type).toBe('check_run');
      expect(r.sourceId).toBe('github-check-500');
      expect(r.sourceUrl).toBe(sampleCheck.html_url);
      expect(r.data).toEqual({
        name: 'lint',
        status: 'completed',
        conclusion: 'success',
        startedAt: sampleCheck.started_at,
        completedAt: sampleCheck.completed_at,
        annotationsCount: 0,
        outputTitle: 'Lint passed',
        outputSummary: 'No issues found',
      });
      expect(r.timestamp).toEqual(new Date('2025-07-01T10:05:00Z'));
      expect(r.metadata.commitSha).toBe('sha-abc');
      expect(r.metadata.resourceType).toBe('check_run');
    });

    it('should use started_at for timestamp when completed_at is null', async () => {
      const inProgressCheck = { ...sampleCheck, completed_at: null, conclusion: null };
      mockOk({ check_runs: [inProgressCheck] });

      const results = await adapter.fetchCheckRuns(config, 'sha-xyz');

      expect(results[0].timestamp).toEqual(new Date('2025-07-01T10:00:00Z'));
    });

    it('should return an empty array when no check runs exist', async () => {
      mockOk({ check_runs: [] });
      const results = await adapter.fetchCheckRuns(config, 'sha-none');
      expect(results).toEqual([]);
    });

    it('should call the correct endpoint with the commit SHA', async () => {
      mockOk({ check_runs: [] });
      await adapter.fetchCheckRuns(config, 'deadbeef');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/repos/test-owner/test-repo/commits/deadbeef/check-runs');
    });

    it('should throw HttpException on API error', async () => {
      mockApiError(404, 'Not Found');
      await expect(adapter.fetchCheckRuns(config, 'bad-sha')).rejects.toThrow(HttpException);
    });

    it('should throw HttpException SERVICE_UNAVAILABLE on network error', async () => {
      mockNetworkError();
      try {
        await adapter.fetchCheckRuns(config, 'sha');
        fail('Expected HttpException');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  // ---------------------------------------------------------------
  // fetchWorkflowRuns
  // ---------------------------------------------------------------
  describe('fetchWorkflowRuns', () => {
    const sampleRun = {
      id: 900,
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
      workflow_id: 10,
      run_number: 42,
      event: 'push',
      created_at: '2025-08-01T08:00:00Z',
      updated_at: '2025-08-01T08:20:00Z',
      html_url: 'https://github.com/test-owner/test-repo/actions/runs/900',
      head_sha: 'sha-run',
      head_branch: 'main',
    };

    it('should map all fields correctly', async () => {
      mockOk({ workflow_runs: [sampleRun] });

      const results = await adapter.fetchWorkflowRuns(config);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.type).toBe('workflow_run');
      expect(r.sourceId).toBe('github-workflow-900');
      expect(r.sourceUrl).toBe(sampleRun.html_url);
      expect(r.data).toEqual({
        name: 'CI',
        status: 'completed',
        conclusion: 'success',
        workflowId: 10,
        runNumber: 42,
        event: 'push',
        headSha: 'sha-run',
        headBranch: 'main',
        createdAt: sampleRun.created_at,
        updatedAt: sampleRun.updated_at,
      });
      expect(r.timestamp).toEqual(new Date('2025-08-01T08:20:00Z'));
      expect(r.metadata.resourceType).toBe('workflow_run');
    });

    it('should use default pagination when no options are given', async () => {
      mockOk({ workflow_runs: [] });
      await adapter.fetchWorkflowRuns(config);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('per_page=30');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).not.toContain('status=');
    });

    it('should append status filter when provided', async () => {
      mockOk({ workflow_runs: [] });
      await adapter.fetchWorkflowRuns(config, { status: 'failure' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=failure');
    });

    it('should return an empty array when no workflow runs exist', async () => {
      mockOk({ workflow_runs: [] });
      const results = await adapter.fetchWorkflowRuns(config);
      expect(results).toEqual([]);
    });

    it('should throw HttpException on API error', async () => {
      mockApiError(500, 'Internal Server Error');
      await expect(adapter.fetchWorkflowRuns(config)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException SERVICE_UNAVAILABLE on network error', async () => {
      mockNetworkError();
      try {
        await adapter.fetchWorkflowRuns(config);
        fail('Expected HttpException');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  // ---------------------------------------------------------------
  // fetchWorkflowArtifacts
  // ---------------------------------------------------------------
  describe('fetchWorkflowArtifacts', () => {
    const activeArtifact = {
      id: 10,
      name: 'build-output',
      size_in_bytes: 5000,
      archive_download_url: 'https://api.github.com/repos/o/r/actions/artifacts/10/zip',
      expired: false,
      created_at: '2025-09-01T00:00:00Z',
      expires_at: '2025-12-01T00:00:00Z',
    };

    const expiredArtifact = {
      ...activeArtifact,
      id: 11,
      name: 'old-build',
      expired: true,
    };

    it('should return non-expired artifacts', async () => {
      mockOk({ artifacts: [activeArtifact, expiredArtifact] });

      const results = await adapter.fetchWorkflowArtifacts(config, 900);

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe('github-artifact-10');
    });

    it('should map all data fields correctly', async () => {
      mockOk({ artifacts: [activeArtifact] });

      const results = await adapter.fetchWorkflowArtifacts(config, 900);

      const r = results[0];
      expect(r.type).toBe('sbom');
      expect(r.sourceUrl).toBe(activeArtifact.archive_download_url);
      expect(r.data).toEqual({
        name: 'build-output',
        sizeInBytes: 5000,
        createdAt: activeArtifact.created_at,
        expiresAt: activeArtifact.expires_at,
        downloadUrl: activeArtifact.archive_download_url,
      });
      expect(r.timestamp).toEqual(new Date('2025-09-01T00:00:00Z'));
      expect(r.metadata.runId).toBe(900);
      expect(r.metadata.resourceType).toBe('artifact');
    });

    it('should detect SBOM artifacts by name containing "sbom"', async () => {
      const sbomArtifact = { ...activeArtifact, name: 'project-sbom-report' };
      mockOk({ artifacts: [sbomArtifact] });

      const results = await adapter.fetchWorkflowArtifacts(config, 1);
      expect(results[0].metadata.isSbom).toBe(true);
    });

    it('should detect SBOM artifacts by name containing "cyclonedx"', async () => {
      const cycloneArtifact = { ...activeArtifact, name: 'CycloneDX-output' };
      mockOk({ artifacts: [cycloneArtifact] });

      const results = await adapter.fetchWorkflowArtifacts(config, 1);
      expect(results[0].metadata.isSbom).toBe(true);
    });

    it('should detect SBOM artifacts by name containing "spdx"', async () => {
      const spdxArtifact = { ...activeArtifact, name: 'SPDX-bom' };
      mockOk({ artifacts: [spdxArtifact] });

      const results = await adapter.fetchWorkflowArtifacts(config, 1);
      expect(results[0].metadata.isSbom).toBe(true);
    });

    it('should set isSbom to false for non-SBOM artifact names', async () => {
      mockOk({ artifacts: [activeArtifact] }); // name = 'build-output'

      const results = await adapter.fetchWorkflowArtifacts(config, 1);
      expect(results[0].metadata.isSbom).toBe(false);
    });

    it('should return an empty array when all artifacts are expired', async () => {
      mockOk({ artifacts: [expiredArtifact] });

      const results = await adapter.fetchWorkflowArtifacts(config, 1);
      expect(results).toEqual([]);
    });

    it('should return an empty array when no artifacts exist', async () => {
      mockOk({ artifacts: [] });
      const results = await adapter.fetchWorkflowArtifacts(config, 1);
      expect(results).toEqual([]);
    });

    it('should call the correct endpoint with runId', async () => {
      mockOk({ artifacts: [] });
      await adapter.fetchWorkflowArtifacts(config, 777);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/repos/test-owner/test-repo/actions/runs/777/artifacts');
    });

    it('should throw HttpException on API error', async () => {
      mockApiError(404, 'Not Found');
      await expect(adapter.fetchWorkflowArtifacts(config, 1)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException SERVICE_UNAVAILABLE on network error', async () => {
      mockNetworkError();
      try {
        await adapter.fetchWorkflowArtifacts(config, 1);
        fail('Expected HttpException');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  // ---------------------------------------------------------------
  // fetchReleases
  // ---------------------------------------------------------------
  describe('fetchReleases', () => {
    const sampleRelease = {
      id: 200,
      tag_name: 'v2.0.0',
      name: 'Version 2.0.0',
      body: 'Major release',
      draft: false,
      prerelease: false,
      created_at: '2025-10-01T00:00:00Z',
      published_at: '2025-10-02T00:00:00Z',
      html_url: 'https://github.com/test-owner/test-repo/releases/tag/v2.0.0',
      assets: [
        {
          id: 301,
          name: 'app.zip',
          content_type: 'application/zip',
          size: 100000,
          download_count: 42,
          browser_download_url:
            'https://github.com/test-owner/test-repo/releases/download/v2.0.0/app.zip',
        },
      ],
    };

    it('should map all fields correctly including assets', async () => {
      mockOk([sampleRelease]);

      const results = await adapter.fetchReleases(config);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.type).toBe('release');
      expect(r.sourceId).toBe('github-release-200');
      expect(r.sourceUrl).toBe(sampleRelease.html_url);
      expect(r.data.tagName).toBe('v2.0.0');
      expect(r.data.name).toBe('Version 2.0.0');
      expect(r.data.body).toBe('Major release');
      expect(r.data.draft).toBe(false);
      expect(r.data.prerelease).toBe(false);
      expect(r.data.createdAt).toBe(sampleRelease.created_at);
      expect(r.data.publishedAt).toBe(sampleRelease.published_at);

      const assets = r.data.assets as Array<Record<string, unknown>>;
      expect(assets).toHaveLength(1);
      expect(assets[0]).toEqual({
        name: 'app.zip',
        contentType: 'application/zip',
        size: 100000,
        downloadCount: 42,
        downloadUrl: sampleRelease.assets[0].browser_download_url,
      });
    });

    it('should use published_at for timestamp when available', async () => {
      mockOk([sampleRelease]);

      const results = await adapter.fetchReleases(config);
      expect(results[0].timestamp).toEqual(new Date('2025-10-02T00:00:00Z'));
    });

    it('should fall back to created_at when published_at is falsy', async () => {
      const draftRelease = { ...sampleRelease, published_at: '', draft: true };
      mockOk([draftRelease]);

      const results = await adapter.fetchReleases(config);
      expect(results[0].timestamp).toEqual(new Date('2025-10-01T00:00:00Z'));
    });

    it('should return an empty array when no releases exist', async () => {
      mockOk([]);
      const results = await adapter.fetchReleases(config);
      expect(results).toEqual([]);
    });

    it('should handle releases with no assets', async () => {
      const noAssetsRelease = { ...sampleRelease, assets: [] };
      mockOk([noAssetsRelease]);

      const results = await adapter.fetchReleases(config);
      expect(results[0].data.assets).toEqual([]);
    });

    it('should use default pagination options', async () => {
      mockOk([]);
      await adapter.fetchReleases(config);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('per_page=30');
      expect(calledUrl).toContain('page=1');
    });

    it('should apply custom pagination options', async () => {
      mockOk([]);
      await adapter.fetchReleases(config, { perPage: 5, page: 2 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('per_page=5');
      expect(calledUrl).toContain('page=2');
    });

    it('should throw HttpException on API error', async () => {
      mockApiError(401, 'Unauthorized');
      await expect(adapter.fetchReleases(config)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException SERVICE_UNAVAILABLE on network error', async () => {
      mockNetworkError();
      try {
        await adapter.fetchReleases(config);
        fail('Expected HttpException');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  // ---------------------------------------------------------------
  // fetchDependencyGraphSbom
  // ---------------------------------------------------------------
  describe('fetchDependencyGraphSbom', () => {
    const sampleSbom = {
      sbom: {
        spdxVersion: 'SPDX-2.3',
        name: 'test-repo',
        packages: [{ name: 'lodash', version: '4.17.21' }],
      },
    };

    it('should return a single evidence result on success', async () => {
      mockOk(sampleSbom);

      const result = await adapter.fetchDependencyGraphSbom(config);

      expect(result).not.toBeNull();
      expect(result!.type).toBe('sbom');
      expect(result!.sourceId).toBe('github-sbom-test-owner-test-repo');
      expect(result!.sourceUrl).toBe(
        'https://github.com/test-owner/test-repo/network/dependencies',
      );
      expect(result!.data).toEqual(sampleSbom.sbom);
      expect(result!.metadata).toEqual({
        provider: 'github',
        owner: 'test-owner',
        repo: 'test-repo',
        resourceType: 'dependency_graph_sbom',
        format: 'spdx',
      });
    });

    it('should return a valid hash', async () => {
      mockOk(sampleSbom);

      const result = await adapter.fetchDependencyGraphSbom(config);

      const expectedHash = createHash('sha256').update(JSON.stringify(sampleSbom)).digest('hex');
      expect(result!.hash).toBe(expectedHash);
    });

    it('should return a recent timestamp', async () => {
      mockOk(sampleSbom);

      const before = new Date();
      const result = await adapter.fetchDependencyGraphSbom(config);
      const after = new Date();

      expect(result!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should return null when the API returns an error', async () => {
      mockApiError(404, 'Not Found');

      const result = await adapter.fetchDependencyGraphSbom(config);
      expect(result).toBeNull();
    });

    it('should return null on network failure', async () => {
      mockNetworkError();

      const result = await adapter.fetchDependencyGraphSbom(config);
      expect(result).toBeNull();
    });

    it('should call the correct endpoint', async () => {
      mockOk(sampleSbom);
      await adapter.fetchDependencyGraphSbom(config);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/repos/test-owner/test-repo/dependency-graph/sbom');
    });
  });

  // ---------------------------------------------------------------
  // fetchSecurityAdvisories
  // ---------------------------------------------------------------
  describe('fetchSecurityAdvisories', () => {
    const sampleAlert = {
      number: 5,
      state: 'open',
      dependency: {
        package: { name: 'axios', ecosystem: 'npm' },
        manifest_path: 'package-lock.json',
      },
      security_advisory: {
        ghsa_id: 'GHSA-aaaa-bbbb-cccc',
        cve_id: 'CVE-2025-9999',
        summary: 'Prototype pollution in axios',
        severity: 'critical',
      },
      security_vulnerability: {
        severity: 'critical',
        vulnerable_version_range: '< 1.6.0',
      },
      created_at: '2025-11-01T00:00:00Z',
      html_url: 'https://github.com/test-owner/test-repo/security/dependabot/5',
    };

    it('should map all fields correctly', async () => {
      mockOk([sampleAlert]);

      const results = await adapter.fetchSecurityAdvisories(config);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.type).toBe('security_advisory');
      expect(r.sourceId).toBe('github-advisory-5');
      expect(r.sourceUrl).toBe(sampleAlert.html_url);
      expect(r.data).toEqual({
        alertNumber: 5,
        state: 'open',
        package: 'axios',
        ecosystem: 'npm',
        manifestPath: 'package-lock.json',
        ghsaId: 'GHSA-aaaa-bbbb-cccc',
        cveId: 'CVE-2025-9999',
        summary: 'Prototype pollution in axios',
        severity: 'critical',
        vulnerableVersionRange: '< 1.6.0',
      });
      expect(r.timestamp).toEqual(new Date('2025-11-01T00:00:00Z'));
      expect(r.metadata).toEqual({
        provider: 'github',
        owner: 'test-owner',
        repo: 'test-repo',
        resourceType: 'dependabot_alert',
      });
    });

    it('should handle alerts with null cve_id', async () => {
      const noCveAlert = {
        ...sampleAlert,
        security_advisory: { ...sampleAlert.security_advisory, cve_id: null },
      };
      mockOk([noCveAlert]);

      const results = await adapter.fetchSecurityAdvisories(config);
      expect(results[0].data.cveId).toBeNull();
    });

    it('should return an empty array when no advisories exist', async () => {
      mockOk([]);
      const results = await adapter.fetchSecurityAdvisories(config);
      expect(results).toEqual([]);
    });

    it('should return an empty array on API error (graceful degradation)', async () => {
      mockApiError(403, 'Dependabot alerts disabled');

      const results = await adapter.fetchSecurityAdvisories(config);
      expect(results).toEqual([]);
    });

    it('should return an empty array on network failure (graceful degradation)', async () => {
      mockNetworkError();

      const results = await adapter.fetchSecurityAdvisories(config);
      expect(results).toEqual([]);
    });

    it('should call the correct endpoint', async () => {
      mockOk([]);
      await adapter.fetchSecurityAdvisories(config);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/repos/test-owner/test-repo/dependabot/alerts?state=open');
    });
  });

  // ---------------------------------------------------------------
  // verifyWebhookSignature
  // ---------------------------------------------------------------
  describe('verifyWebhookSignature', () => {
    const secret = 'webhook-secret-key';
    const payload = '{"action":"opened"}';

    // The source code builds the signature as:
    //   sha256= + createHash('sha256').update(payload).update(secret).digest('hex')
    function computeExpectedSignature(p: string, s: string): string {
      return `sha256=${createHash('sha256').update(p).update(s).digest('hex')}`;
    }

    it('should return true for a valid signature', () => {
      const validSig = computeExpectedSignature(payload, secret);
      expect(adapter.verifyWebhookSignature(payload, validSig, secret)).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      expect(adapter.verifyWebhookSignature(payload, 'sha256=invalid', secret)).toBe(false);
    });

    it('should return false when the signature prefix is missing', () => {
      const rawHash = createHash('sha256').update(payload).update(secret).digest('hex');
      // Missing "sha256=" prefix
      expect(adapter.verifyWebhookSignature(payload, rawHash, secret)).toBe(false);
    });

    it('should return false when using the wrong secret', () => {
      const sigWithWrongSecret = computeExpectedSignature(payload, 'wrong-secret');
      expect(adapter.verifyWebhookSignature(payload, sigWithWrongSecret, secret)).toBe(false);
    });

    it('should return false when payload is altered', () => {
      const validSig = computeExpectedSignature(payload, secret);
      expect(adapter.verifyWebhookSignature('{"action":"closed"}', validSig, secret)).toBe(false);
    });

    it('should handle an empty payload', () => {
      const sig = computeExpectedSignature('', secret);
      expect(adapter.verifyWebhookSignature('', sig, secret)).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // ingestAllEvidence
  // ---------------------------------------------------------------
  describe('ingestAllEvidence', () => {
    const sessionId = 'session-123';

    // Helpers to build minimal valid API responses for each sub-fetcher.
    const prResponse = [
      {
        id: 1,
        number: 10,
        title: 'PR',
        state: 'open',
        merged: false,
        merged_at: null,
        user: { login: 'dev' },
        base: { ref: 'main' },
        head: { ref: 'feat', sha: 'sha-pr' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        html_url: 'https://github.com/o/r/pull/10',
        additions: 1,
        deletions: 0,
        changed_files: 1,
        mergeable: true,
        review_comments: 0,
        commits: 1,
      },
    ];

    const workflowRunsResponse = {
      workflow_runs: [
        {
          id: 20,
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          workflow_id: 1,
          run_number: 1,
          event: 'push',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/o/r/actions/runs/20',
          head_sha: 'sha-wf',
          head_branch: 'main',
        },
      ],
    };

    const checkRunsResponse = {
      check_runs: [
        {
          id: 30,
          name: 'test',
          status: 'completed',
          conclusion: 'success',
          started_at: '2025-01-01T00:00:00Z',
          completed_at: '2025-01-01T00:01:00Z',
          html_url: 'https://github.com/o/r/runs/30',
          output: { title: null, summary: null, annotations_count: 0 },
        },
      ],
    };

    const releasesResponse = [
      {
        id: 40,
        tag_name: 'v1.0.0',
        name: 'v1',
        body: '',
        draft: false,
        prerelease: false,
        created_at: '2025-01-01T00:00:00Z',
        published_at: '2025-01-01T00:00:00Z',
        html_url: 'https://github.com/o/r/releases/tag/v1.0.0',
        assets: [],
      },
    ];

    const sbomResponse = {
      sbom: { spdxVersion: 'SPDX-2.3', name: 'r' },
    };

    const advisoriesResponse = [
      {
        number: 50,
        state: 'open',
        dependency: {
          package: { name: 'pkg', ecosystem: 'npm' },
          manifest_path: 'package.json',
        },
        security_advisory: {
          ghsa_id: 'GHSA-xxxx',
          cve_id: null,
          summary: 'vuln',
          severity: 'low',
        },
        security_vulnerability: {
          severity: 'low',
          vulnerable_version_range: '< 1.0.0',
        },
        created_at: '2025-01-01T00:00:00Z',
        html_url: 'https://github.com/o/r/security/dependabot/50',
      },
    ];

    /**
     * Sets up mockFetch responses for all 6 calls made by ingestAllEvidence
     * in order: PRs, workflow runs, check runs (for sha-wf), releases, SBOM, advisories.
     */
    function setupAllSuccess() {
      mockOk(prResponse); // 1. fetchPullRequests
      mockOk(workflowRunsResponse); // 2. fetchWorkflowRuns
      mockOk(checkRunsResponse); // 3. fetchCheckRuns (for head_sha from workflow run)
      mockOk(releasesResponse); // 4. fetchReleases
      mockOk(sbomResponse); // 5. fetchDependencyGraphSbom
      mockOk(advisoriesResponse); // 6. fetchSecurityAdvisories
    }

    it('should aggregate results from all sub-fetchers on success', async () => {
      setupAllSuccess();

      const result = await adapter.ingestAllEvidence(config, sessionId);

      // 1 PR + 1 workflow run + 1 check run + 1 release + 1 SBOM + 1 advisory = 6
      expect(result.ingested).toBe(6);
      expect(result.errors).toEqual([]);
      expect(result.results).toEqual({
        pull_requests: 1,
        workflow_runs: 1,
        check_runs: 1,
        releases: 1,
        sbom: 1,
        security_advisories: 1,
      });
    });

    it('should continue when pull requests fetch fails', async () => {
      mockApiError(500, 'Server Error'); // PRs fail
      mockOk(workflowRunsResponse);
      mockOk(checkRunsResponse);
      mockOk(releasesResponse);
      mockOk(sbomResponse);
      mockOk(advisoriesResponse);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Pull requests');
      expect(result.results.pull_requests).toBe(0);
      // Remaining should still succeed: 1 wf + 1 check + 1 release + 1 sbom + 1 advisory = 5
      expect(result.ingested).toBe(5);
    });

    it('should continue when workflow runs fetch fails', async () => {
      mockOk(prResponse); // PRs succeed
      mockApiError(500, 'Server Error'); // Workflow runs fail
      mockOk(releasesResponse); // Releases
      mockOk(sbomResponse); // SBOM
      mockOk(advisoriesResponse); // Advisories

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Workflow runs');
      expect(result.results.workflow_runs).toBe(0);
      expect(result.results.check_runs).toBe(0); // no check runs because workflows failed
      // 1 PR + 1 release + 1 SBOM + 1 advisory = 4
      expect(result.ingested).toBe(4);
    });

    it('should continue when releases fetch fails', async () => {
      mockOk(prResponse);
      mockOk(workflowRunsResponse);
      mockOk(checkRunsResponse);
      mockApiError(404, 'Not Found'); // Releases fail
      mockOk(sbomResponse);
      mockOk(advisoriesResponse);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Releases');
      expect(result.results.releases).toBe(0);
      expect(result.ingested).toBe(5); // 1 PR + 1 wf + 1 check + 1 SBOM + 1 advisory
    });

    it('should handle SBOM fetch failure (fetchDependencyGraphSbom returns null)', async () => {
      mockOk(prResponse);
      mockOk(workflowRunsResponse);
      mockOk(checkRunsResponse);
      mockOk(releasesResponse);
      mockApiError(404, 'Not Found'); // SBOM fails — but fetchDependencyGraphSbom catches and returns null
      mockOk(advisoriesResponse);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      // fetchDependencyGraphSbom swallows the error and returns null, so no error is added
      // to ingestAllEvidence's errors array and sbom count stays 0
      expect(result.results.sbom).toBe(0);
      // 1 PR + 1 wf + 1 check + 1 release + 1 advisory = 5
      expect(result.ingested).toBe(5);
    });

    it('should handle security advisories fetch failure (returns empty)', async () => {
      mockOk(prResponse);
      mockOk(workflowRunsResponse);
      mockOk(checkRunsResponse);
      mockOk(releasesResponse);
      mockOk(sbomResponse);
      mockApiError(403, 'Forbidden'); // Advisories fail — but fetchSecurityAdvisories catches and returns []

      const result = await adapter.ingestAllEvidence(config, sessionId);

      // fetchSecurityAdvisories swallows the error and returns []
      expect(result.results.security_advisories).toBe(0);
      // 1 PR + 1 wf + 1 check + 1 release + 1 SBOM = 5
      expect(result.ingested).toBe(5);
    });

    it('should handle check run failures for individual commits without stopping other fetchers', async () => {
      mockOk(prResponse);
      mockOk(workflowRunsResponse);
      mockApiError(404, 'Not Found'); // Check runs for sha-wf fail
      mockOk(releasesResponse);
      mockOk(sbomResponse);
      mockOk(advisoriesResponse);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Check runs for sha-wf');
      expect(result.results.check_runs).toBe(0);
      // 1 PR + 1 wf + 1 release + 1 SBOM + 1 advisory = 5
      expect(result.ingested).toBe(5);
    });

    it('should return correct structure when everything fails', async () => {
      mockApiError(500, 'fail'); // PRs
      mockApiError(500, 'fail'); // Workflow runs (also prevents check runs)
      mockApiError(500, 'fail'); // Releases
      mockApiError(500, 'fail'); // SBOM — caught internally, returns null
      mockApiError(500, 'fail'); // Advisories — caught internally, returns []

      const result = await adapter.ingestAllEvidence(config, sessionId);

      expect(result.ingested).toBe(0);
      expect(result.errors.length).toBeGreaterThanOrEqual(2); // PRs and workflow runs
      expect(result.results).toEqual({
        pull_requests: 0,
        workflow_runs: 0,
        check_runs: 0,
        releases: 0,
        sbom: 0,
        security_advisories: 0,
      });
    });

    it('should deduplicate commit SHAs for check runs', async () => {
      // Create workflow runs with duplicate head_sha values
      const dupeWorkflowRuns = {
        workflow_runs: [
          { ...workflowRunsResponse.workflow_runs[0], id: 20, head_sha: 'same-sha' },
          { ...workflowRunsResponse.workflow_runs[0], id: 21, head_sha: 'same-sha' },
          { ...workflowRunsResponse.workflow_runs[0], id: 22, head_sha: 'same-sha' },
        ],
      };

      mockOk(prResponse);
      mockOk(dupeWorkflowRuns);
      mockOk(checkRunsResponse); // Only one check runs call should be made
      mockOk(releasesResponse);
      mockOk(sbomResponse);
      mockOk(advisoriesResponse);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      // Count how many times check-runs endpoint was called
      const checkRunCalls = mockFetch.mock.calls.filter((call) =>
        (call[0] as string).includes('/check-runs'),
      );
      expect(checkRunCalls).toHaveLength(1); // Deduplicated to 1 unique SHA

      expect(result.results.check_runs).toBe(1);
    });

    it('should only fetch check runs for the first 5 unique workflow run SHAs', async () => {
      // Create 7 workflow runs with unique SHAs
      const manyWorkflowRuns = {
        workflow_runs: Array.from({ length: 7 }, (_, i) => ({
          ...workflowRunsResponse.workflow_runs[0],
          id: 100 + i,
          head_sha: `unique-sha-${i}`,
        })),
      };

      mockOk(prResponse);
      mockOk(manyWorkflowRuns);
      // 5 check run responses (only first 5 SHAs via .slice(0, 5))
      for (let i = 0; i < 5; i++) {
        mockOk(checkRunsResponse);
      }
      mockOk(releasesResponse);
      mockOk(sbomResponse);
      mockOk(advisoriesResponse);

      const result = await adapter.ingestAllEvidence(config, sessionId);

      const checkRunCalls = mockFetch.mock.calls.filter((call) =>
        (call[0] as string).includes('/check-runs'),
      );
      expect(checkRunCalls).toHaveLength(5);

      expect(result.results.check_runs).toBe(5);
    });
  });
});
