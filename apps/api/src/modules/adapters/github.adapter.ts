import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@libs/database';
import { createHash } from 'crypto';

// Helper to extract error message from unknown error type
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  apiUrl?: string;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  merged: boolean;
  merged_at: string | null;
  user: { login: string };
  base: { ref: string };
  head: { ref: string; sha: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  mergeable: boolean | null;
  review_comments: number;
  commits: number;
}

interface GitHubCheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  html_url: string;
  output: {
    title: string | null;
    summary: string | null;
    annotations_count: number;
  };
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

interface GitHubReleaseAsset {
  id: number;
  name: string;
  content_type: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  workflow_id: number;
  run_number: number;
  event: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_sha: string;
  head_branch: string;
}

interface GitHubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  expires_at: string;
}

export interface GitHubEvidenceResult {
  type: 'pull_request' | 'check_run' | 'release' | 'workflow_run' | 'sbom' | 'security_advisory';
  sourceId: string;
  sourceUrl: string;
  data: Record<string, unknown>;
  hash: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

@Injectable()
export class GitHubAdapter {
  private readonly logger = new Logger(GitHubAdapter.name);
  private readonly defaultApiUrl = 'https://api.github.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private async makeRequest<T>(
    config: GitHubConfig,
    endpoint: string,
    method: string = 'GET',
    body?: unknown,
  ): Promise<T> {
    const baseUrl = config.apiUrl || this.defaultApiUrl;
    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(config.token),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new HttpException(
          `GitHub API error: ${response.status} - ${errorBody}`,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`GitHub API request failed: ${getErrorMessage(error)}`);
      throw new HttpException('Failed to connect to GitHub API', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private calculateHash(data: unknown): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Fetch pull requests and convert to evidence
   */
  async fetchPullRequests(
    config: GitHubConfig,
    options: { state?: 'open' | 'closed' | 'all'; perPage?: number; page?: number } = {},
  ): Promise<GitHubEvidenceResult[]> {
    const { state = 'all', perPage = 30, page = 1 } = options;
    const endpoint = `/repos/${config.owner}/${config.repo}/pulls?state=${state}&per_page=${perPage}&page=${page}`;

    const pullRequests = await this.makeRequest<GitHubPullRequest[]>(config, endpoint);

    return pullRequests.map((pr) => ({
      type: 'pull_request' as const,
      sourceId: `github-pr-${pr.number}`,
      sourceUrl: pr.html_url,
      data: {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        merged: pr.merged,
        mergedAt: pr.merged_at,
        author: pr.user.login,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        headSha: pr.head.sha,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        reviewComments: pr.review_comments,
        commits: pr.commits,
      },
      hash: this.calculateHash(pr),
      timestamp: new Date(pr.updated_at),
      metadata: {
        provider: 'github',
        owner: config.owner,
        repo: config.repo,
        resourceType: 'pull_request',
      },
    }));
  }

  /**
   * Fetch check runs for a specific commit SHA
   */
  async fetchCheckRuns(config: GitHubConfig, commitSha: string): Promise<GitHubEvidenceResult[]> {
    const endpoint = `/repos/${config.owner}/${config.repo}/commits/${commitSha}/check-runs`;

    const response = await this.makeRequest<{ check_runs: GitHubCheckRun[] }>(config, endpoint);

    return response.check_runs.map((check) => ({
      type: 'check_run' as const,
      sourceId: `github-check-${check.id}`,
      sourceUrl: check.html_url,
      data: {
        name: check.name,
        status: check.status,
        conclusion: check.conclusion,
        startedAt: check.started_at,
        completedAt: check.completed_at,
        annotationsCount: check.output.annotations_count,
        outputTitle: check.output.title,
        outputSummary: check.output.summary,
      },
      hash: this.calculateHash(check),
      timestamp: new Date(check.completed_at || check.started_at),
      metadata: {
        provider: 'github',
        owner: config.owner,
        repo: config.repo,
        commitSha,
        resourceType: 'check_run',
      },
    }));
  }

  /**
   * Fetch workflow runs
   */
  async fetchWorkflowRuns(
    config: GitHubConfig,
    options: { perPage?: number; page?: number; status?: string } = {},
  ): Promise<GitHubEvidenceResult[]> {
    const { perPage = 30, page = 1, status } = options;
    let endpoint = `/repos/${config.owner}/${config.repo}/actions/runs?per_page=${perPage}&page=${page}`;
    if (status) {
      endpoint += `&status=${status}`;
    }

    const response = await this.makeRequest<{ workflow_runs: GitHubWorkflowRun[] }>(
      config,
      endpoint,
    );

    return response.workflow_runs.map((run) => ({
      type: 'workflow_run' as const,
      sourceId: `github-workflow-${run.id}`,
      sourceUrl: run.html_url,
      data: {
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        workflowId: run.workflow_id,
        runNumber: run.run_number,
        event: run.event,
        headSha: run.head_sha,
        headBranch: run.head_branch,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
      },
      hash: this.calculateHash(run),
      timestamp: new Date(run.updated_at),
      metadata: {
        provider: 'github',
        owner: config.owner,
        repo: config.repo,
        resourceType: 'workflow_run',
      },
    }));
  }

  /**
   * Fetch workflow artifacts (SBOM, test reports, etc.)
   */
  async fetchWorkflowArtifacts(
    config: GitHubConfig,
    runId: number,
  ): Promise<GitHubEvidenceResult[]> {
    const endpoint = `/repos/${config.owner}/${config.repo}/actions/runs/${runId}/artifacts`;

    const response = await this.makeRequest<{ artifacts: GitHubArtifact[] }>(config, endpoint);

    return response.artifacts
      .filter((artifact) => !artifact.expired)
      .map((artifact) => ({
        type: 'sbom' as const, // Classify artifacts that might be SBOMs
        sourceId: `github-artifact-${artifact.id}`,
        sourceUrl: artifact.archive_download_url,
        data: {
          name: artifact.name,
          sizeInBytes: artifact.size_in_bytes,
          createdAt: artifact.created_at,
          expiresAt: artifact.expires_at,
          downloadUrl: artifact.archive_download_url,
        },
        hash: this.calculateHash(artifact),
        timestamp: new Date(artifact.created_at),
        metadata: {
          provider: 'github',
          owner: config.owner,
          repo: config.repo,
          runId,
          resourceType: 'artifact',
          isSbom:
            artifact.name.toLowerCase().includes('sbom') ||
            artifact.name.toLowerCase().includes('cyclonedx') ||
            artifact.name.toLowerCase().includes('spdx'),
        },
      }));
  }

  /**
   * Fetch releases
   */
  async fetchReleases(
    config: GitHubConfig,
    options: { perPage?: number; page?: number } = {},
  ): Promise<GitHubEvidenceResult[]> {
    const { perPage = 30, page = 1 } = options;
    const endpoint = `/repos/${config.owner}/${config.repo}/releases?per_page=${perPage}&page=${page}`;

    const releases = await this.makeRequest<GitHubRelease[]>(config, endpoint);

    return releases.map((release) => ({
      type: 'release' as const,
      sourceId: `github-release-${release.id}`,
      sourceUrl: release.html_url,
      data: {
        tagName: release.tag_name,
        name: release.name,
        body: release.body,
        draft: release.draft,
        prerelease: release.prerelease,
        createdAt: release.created_at,
        publishedAt: release.published_at,
        assets: release.assets.map((a) => ({
          name: a.name,
          contentType: a.content_type,
          size: a.size,
          downloadCount: a.download_count,
          downloadUrl: a.browser_download_url,
        })),
      },
      hash: this.calculateHash(release),
      timestamp: new Date(release.published_at || release.created_at),
      metadata: {
        provider: 'github',
        owner: config.owner,
        repo: config.repo,
        resourceType: 'release',
      },
    }));
  }

  /**
   * Fetch Dependency Graph SBOM (GitHub native SBOM)
   */
  async fetchDependencyGraphSbom(config: GitHubConfig): Promise<GitHubEvidenceResult | null> {
    try {
      const endpoint = `/repos/${config.owner}/${config.repo}/dependency-graph/sbom`;
      const sbom = await this.makeRequest<{ sbom: Record<string, unknown> }>(config, endpoint);

      return {
        type: 'sbom' as const,
        sourceId: `github-sbom-${config.owner}-${config.repo}`,
        sourceUrl: `https://github.com/${config.owner}/${config.repo}/network/dependencies`,
        data: sbom.sbom,
        hash: this.calculateHash(sbom),
        timestamp: new Date(),
        metadata: {
          provider: 'github',
          owner: config.owner,
          repo: config.repo,
          resourceType: 'dependency_graph_sbom',
          format: 'spdx',
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch dependency graph SBOM: ${getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Fetch security advisories (Dependabot alerts)
   */
  async fetchSecurityAdvisories(config: GitHubConfig): Promise<GitHubEvidenceResult[]> {
    try {
      const endpoint = `/repos/${config.owner}/${config.repo}/dependabot/alerts?state=open`;
      const alerts = await this.makeRequest<
        Array<{
          number: number;
          state: string;
          dependency: { package: { name: string; ecosystem: string }; manifest_path: string };
          security_advisory: {
            ghsa_id: string;
            cve_id: string | null;
            summary: string;
            severity: string;
          };
          security_vulnerability: { severity: string; vulnerable_version_range: string };
          created_at: string;
          html_url: string;
        }>
      >(config, endpoint);

      return alerts.map((alert) => ({
        type: 'security_advisory' as const,
        sourceId: `github-advisory-${alert.number}`,
        sourceUrl: alert.html_url,
        data: {
          alertNumber: alert.number,
          state: alert.state,
          package: alert.dependency.package.name,
          ecosystem: alert.dependency.package.ecosystem,
          manifestPath: alert.dependency.manifest_path,
          ghsaId: alert.security_advisory.ghsa_id,
          cveId: alert.security_advisory.cve_id,
          summary: alert.security_advisory.summary,
          severity: alert.security_advisory.severity,
          vulnerableVersionRange: alert.security_vulnerability.vulnerable_version_range,
        },
        hash: this.calculateHash(alert),
        timestamp: new Date(alert.created_at),
        metadata: {
          provider: 'github',
          owner: config.owner,
          repo: config.repo,
          resourceType: 'dependabot_alert',
        },
      }));
    } catch (error) {
      this.logger.warn(`Failed to fetch security advisories: ${getErrorMessage(error)}`);
      return [];
    }
  }

  /**
   * Ingest all evidence from a GitHub repository
   */
  async ingestAllEvidence(
    config: GitHubConfig,
    sessionId: string,
  ): Promise<{
    ingested: number;
    errors: string[];
    results: Record<string, number>;
  }> {
    const results: Record<string, number> = {
      pull_requests: 0,
      workflow_runs: 0,
      check_runs: 0,
      releases: 0,
      sbom: 0,
      security_advisories: 0,
    };
    const errors: string[] = [];
    let totalIngested = 0;

    // Fetch PRs
    try {
      const prs = await this.fetchPullRequests(config, { state: 'all', perPage: 50 });
      for (const pr of prs) {
        await this.saveEvidence(sessionId, pr);
        totalIngested++;
      }
      results.pull_requests = prs.length;
    } catch (error) {
      errors.push(`Pull requests: ${getErrorMessage(error)}`);
    }

    // Fetch workflow runs
    try {
      const runs = await this.fetchWorkflowRuns(config, { perPage: 20 });
      for (const run of runs) {
        await this.saveEvidence(sessionId, run);
        totalIngested++;
      }
      results.workflow_runs = runs.length;

      // Fetch check runs for recent commits
      const recentShas = [...new Set(runs.slice(0, 5).map((r) => r.data.headSha as string))];
      for (const sha of recentShas) {
        try {
          const checks = await this.fetchCheckRuns(config, sha);
          for (const check of checks) {
            await this.saveEvidence(sessionId, check);
            totalIngested++;
          }
          results.check_runs += checks.length;
        } catch (error) {
          errors.push(`Check runs for ${sha}: ${getErrorMessage(error)}`);
        }
      }
    } catch (error) {
      errors.push(`Workflow runs: ${getErrorMessage(error)}`);
    }

    // Fetch releases
    try {
      const releases = await this.fetchReleases(config, { perPage: 10 });
      for (const release of releases) {
        await this.saveEvidence(sessionId, release);
        totalIngested++;
      }
      results.releases = releases.length;
    } catch (error) {
      errors.push(`Releases: ${getErrorMessage(error)}`);
    }

    // Fetch SBOM
    try {
      const sbom = await this.fetchDependencyGraphSbom(config);
      if (sbom) {
        await this.saveEvidence(sessionId, sbom);
        totalIngested++;
        results.sbom = 1;
      }
    } catch (error) {
      errors.push(`SBOM: ${getErrorMessage(error)}`);
    }

    // Fetch security advisories
    try {
      const advisories = await this.fetchSecurityAdvisories(config);
      for (const advisory of advisories) {
        await this.saveEvidence(sessionId, advisory);
        totalIngested++;
      }
      results.security_advisories = advisories.length;
    } catch (error) {
      errors.push(`Security advisories: ${getErrorMessage(error)}`);
    }

    this.logger.log(
      `GitHub ingestion complete: ${totalIngested} items from ${config.owner}/${config.repo}`,
    );

    return {
      ingested: totalIngested,
      errors,
      results,
    };
  }

  /**
   * Save evidence - stores in memory/cache for later processing
   * Note: Actual persistence requires linking to EvidenceRegistry via questionId
   */
  private async saveEvidence(sessionId: string, evidence: GitHubEvidenceResult): Promise<void> {
    // Log evidence for audit trail
    this.logger.debug(
      `Ingested ${evidence.type} evidence: ${evidence.sourceId} for session ${sessionId}`,
    );
    // Evidence data is returned via ingestAllEvidence results
    // Actual database persistence should be handled by the calling service
    // after mapping to appropriate question/evidence relationships
  }

  /**
   * Verify GitHub webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = `sha256=${createHash('sha256')
      .update(payload)
      .update(secret)
      .digest('hex')}`;

    return signature === expectedSignature;
  }
}
