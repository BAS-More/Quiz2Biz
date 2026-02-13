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

interface GitLabConfig {
  token: string;
  projectId: string | number;
  apiUrl?: string;
}

interface GitLabPipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  web_url: string;
  before_sha: string;
  tag: boolean;
  yaml_errors: string | null;
  user: { id: number; username: string; name: string };
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  queued_duration: number | null;
  coverage: string | null;
}

interface GitLabJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  ref: string;
  tag: boolean;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  queued_duration: number | null;
  user: { id: number; username: string; name: string };
  commit: { id: string; short_id: string; title: string };
  pipeline: { id: number; project_id: number; ref: string; sha: string; status: string };
  web_url: string;
  artifacts: GitLabArtifact[];
  runner: { id: number; description: string; active: boolean } | null;
  artifacts_expire_at: string | null;
  coverage: number | null;
  allow_failure: boolean;
  failure_reason: string | null;
}

interface GitLabArtifact {
  file_type: string;
  size: number;
  filename: string;
  file_format: string | null;
}

interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  merged_by: { id: number; username: string; name: string } | null;
  merged_at: string | null;
  closed_by: { id: number; username: string; name: string } | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  target_branch: string;
  source_branch: string;
  author: { id: number; username: string; name: string };
  assignees: Array<{ id: number; username: string; name: string }>;
  reviewers: Array<{ id: number; username: string; name: string }>;
  source_project_id: number;
  target_project_id: number;
  labels: string[];
  draft: boolean;
  merge_status: string;
  sha: string;
  merge_commit_sha: string | null;
  squash_commit_sha: string | null;
  web_url: string;
  changes_count: string;
  has_conflicts: boolean;
}

interface GitLabRelease {
  tag_name: string;
  description: string;
  name: string;
  created_at: string;
  released_at: string;
  author: { id: number; username: string; name: string };
  commit: { id: string; short_id: string; title: string };
  assets: {
    count: number;
    sources: Array<{ format: string; url: string }>;
    links: Array<{ id: number; name: string; url: string; link_type: string }>;
  };
  _links: { self: string };
}

interface GitLabVulnerability {
  id: number;
  title: string;
  description: string;
  state: string;
  severity: string;
  confidence: string;
  report_type: string;
  project: { id: number; name: string; full_path: string };
  scanner: { external_id: string; name: string; vendor: string };
  identifiers: Array<{ external_type: string; external_id: string; name: string; url: string }>;
  location: Record<string, unknown>;
  solution: string | null;
  links: Array<{ url: string }>;
  created_at: string;
  updated_at: string;
  detected_at: string;
  dismissed_at: string | null;
  resolved_at: string | null;
}

interface GitLabTestReport {
  total_time: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  error_count: number;
  test_suites: Array<{
    name: string;
    total_time: number;
    total_count: number;
    success_count: number;
    failed_count: number;
    skipped_count: number;
    error_count: number;
    suite_error: string | null;
  }>;
}

export interface GitLabEvidenceResult {
  type:
    | 'pipeline'
    | 'job'
    | 'merge_request'
    | 'release'
    | 'vulnerability'
    | 'test_report'
    | 'coverage';
  sourceId: string;
  sourceUrl: string;
  data: Record<string, unknown>;
  hash: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

@Injectable()
export class GitLabAdapter {
  private readonly logger = new Logger(GitLabAdapter.name);
  private readonly defaultApiUrl = 'https://gitlab.com/api/v4';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getHeaders(token: string): Record<string, string> {
    return {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    config: GitLabConfig,
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
          `GitLab API error: ${response.status} - ${errorBody}`,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`GitLab API request failed: ${getErrorMessage(error)}`);
      throw new HttpException('Failed to connect to GitLab API', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private calculateHash(data: unknown): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private encodeProjectId(projectId: string | number): string {
    return typeof projectId === 'string' ? encodeURIComponent(projectId) : String(projectId);
  }

  /**
   * Fetch pipelines
   */
  async fetchPipelines(
    config: GitLabConfig,
    options: { perPage?: number; page?: number; status?: string; ref?: string } = {},
  ): Promise<GitLabEvidenceResult[]> {
    const { perPage = 20, page = 1, status, ref } = options;
    const projectId = this.encodeProjectId(config.projectId);
    let endpoint = `/projects/${projectId}/pipelines?per_page=${perPage}&page=${page}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    if (ref) {
      endpoint += `&ref=${ref}`;
    }

    const pipelines = await this.makeRequest<GitLabPipeline[]>(config, endpoint);

    return pipelines.map((pipeline) => ({
      type: 'pipeline' as const,
      sourceId: `gitlab-pipeline-${pipeline.id}`,
      sourceUrl: pipeline.web_url,
      data: {
        id: pipeline.id,
        iid: pipeline.iid,
        sha: pipeline.sha,
        ref: pipeline.ref,
        status: pipeline.status,
        source: pipeline.source,
        tag: pipeline.tag,
        user: pipeline.user.username,
        startedAt: pipeline.started_at,
        finishedAt: pipeline.finished_at,
        duration: pipeline.duration,
        queuedDuration: pipeline.queued_duration,
        coverage: pipeline.coverage,
        yamlErrors: pipeline.yaml_errors,
      },
      hash: this.calculateHash(pipeline),
      timestamp: new Date(pipeline.updated_at),
      metadata: {
        provider: 'gitlab',
        projectId: config.projectId,
        resourceType: 'pipeline',
      },
    }));
  }

  /**
   * Fetch jobs for a pipeline
   */
  async fetchPipelineJobs(
    config: GitLabConfig,
    pipelineId: number,
  ): Promise<GitLabEvidenceResult[]> {
    const projectId = this.encodeProjectId(config.projectId);
    const endpoint = `/projects/${projectId}/pipelines/${pipelineId}/jobs`;

    const jobs = await this.makeRequest<GitLabJob[]>(config, endpoint);

    return jobs.map((job) => ({
      type: 'job' as const,
      sourceId: `gitlab-job-${job.id}`,
      sourceUrl: job.web_url,
      data: {
        id: job.id,
        name: job.name,
        stage: job.stage,
        status: job.status,
        ref: job.ref,
        tag: job.tag,
        user: job.user.username,
        commitId: job.commit.id,
        commitTitle: job.commit.title,
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        duration: job.duration,
        coverage: job.coverage,
        allowFailure: job.allow_failure,
        failureReason: job.failure_reason,
        hasArtifacts: job.artifacts.length > 0,
        artifactTypes: job.artifacts.map((a) => a.file_type),
        runner: job.runner?.description,
      },
      hash: this.calculateHash(job),
      timestamp: new Date(job.finished_at || job.started_at || job.created_at),
      metadata: {
        provider: 'gitlab',
        projectId: config.projectId,
        pipelineId,
        resourceType: 'job',
      },
    }));
  }

  /**
   * Fetch pipeline test report
   */
  async fetchTestReport(
    config: GitLabConfig,
    pipelineId: number,
  ): Promise<GitLabEvidenceResult | null> {
    try {
      const projectId = this.encodeProjectId(config.projectId);
      const endpoint = `/projects/${projectId}/pipelines/${pipelineId}/test_report`;

      const report = await this.makeRequest<GitLabTestReport>(config, endpoint);

      return {
        type: 'test_report' as const,
        sourceId: `gitlab-test-report-${pipelineId}`,
        sourceUrl: `https://gitlab.com/api/v4/projects/${projectId}/pipelines/${pipelineId}/test_report`,
        data: {
          pipelineId,
          totalTime: report.total_time,
          totalCount: report.total_count,
          successCount: report.success_count,
          failedCount: report.failed_count,
          skippedCount: report.skipped_count,
          errorCount: report.error_count,
          suites: report.test_suites.map((suite) => ({
            name: suite.name,
            totalCount: suite.total_count,
            successCount: suite.success_count,
            failedCount: suite.failed_count,
            skippedCount: suite.skipped_count,
            errorCount: suite.error_count,
          })),
        },
        hash: this.calculateHash(report),
        timestamp: new Date(),
        metadata: {
          provider: 'gitlab',
          projectId: config.projectId,
          pipelineId,
          resourceType: 'test_report',
        },
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch test report for pipeline ${pipelineId}: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Fetch merge requests
   */
  async fetchMergeRequests(
    config: GitLabConfig,
    options: {
      state?: 'opened' | 'closed' | 'merged' | 'all';
      perPage?: number;
      page?: number;
    } = {},
  ): Promise<GitLabEvidenceResult[]> {
    const { state = 'all', perPage = 20, page = 1 } = options;
    const projectId = this.encodeProjectId(config.projectId);
    const endpoint = `/projects/${projectId}/merge_requests?state=${state}&per_page=${perPage}&page=${page}`;

    const mergeRequests = await this.makeRequest<GitLabMergeRequest[]>(config, endpoint);

    return mergeRequests.map((mr) => ({
      type: 'merge_request' as const,
      sourceId: `gitlab-mr-${mr.iid}`,
      sourceUrl: mr.web_url,
      data: {
        iid: mr.iid,
        title: mr.title,
        state: mr.state,
        draft: mr.draft,
        author: mr.author.username,
        assignees: mr.assignees.map((a) => a.username),
        reviewers: mr.reviewers.map((r) => r.username),
        targetBranch: mr.target_branch,
        sourceBranch: mr.source_branch,
        sha: mr.sha,
        mergeCommitSha: mr.merge_commit_sha,
        squashCommitSha: mr.squash_commit_sha,
        mergeStatus: mr.merge_status,
        hasConflicts: mr.has_conflicts,
        changesCount: mr.changes_count,
        labels: mr.labels,
        mergedBy: mr.merged_by?.username,
        mergedAt: mr.merged_at,
        createdAt: mr.created_at,
        updatedAt: mr.updated_at,
      },
      hash: this.calculateHash(mr),
      timestamp: new Date(mr.updated_at),
      metadata: {
        provider: 'gitlab',
        projectId: config.projectId,
        resourceType: 'merge_request',
      },
    }));
  }

  /**
   * Fetch releases
   */
  async fetchReleases(
    config: GitLabConfig,
    options: { perPage?: number; page?: number } = {},
  ): Promise<GitLabEvidenceResult[]> {
    const { perPage = 20, page = 1 } = options;
    const projectId = this.encodeProjectId(config.projectId);
    const endpoint = `/projects/${projectId}/releases?per_page=${perPage}&page=${page}`;

    const releases = await this.makeRequest<GitLabRelease[]>(config, endpoint);

    return releases.map((release) => ({
      type: 'release' as const,
      sourceId: `gitlab-release-${release.tag_name}`,
      sourceUrl: release._links.self,
      data: {
        tagName: release.tag_name,
        name: release.name,
        description: release.description,
        author: release.author.username,
        commitId: release.commit.id,
        commitTitle: release.commit.title,
        releasedAt: release.released_at,
        createdAt: release.created_at,
        assetsCount: release.assets.count,
        sources: release.assets.sources.map((s) => s.format),
        links: release.assets.links.map((l) => ({ name: l.name, type: l.link_type })),
      },
      hash: this.calculateHash(release),
      timestamp: new Date(release.released_at),
      metadata: {
        provider: 'gitlab',
        projectId: config.projectId,
        resourceType: 'release',
      },
    }));
  }

  /**
   * Fetch project vulnerabilities
   */
  async fetchVulnerabilities(
    config: GitLabConfig,
    options: { perPage?: number; page?: number; state?: string; severity?: string } = {},
  ): Promise<GitLabEvidenceResult[]> {
    try {
      const { perPage = 50, page = 1, state, severity } = options;
      const projectId = this.encodeProjectId(config.projectId);
      let endpoint = `/projects/${projectId}/vulnerabilities?per_page=${perPage}&page=${page}`;
      if (state) {
        endpoint += `&state=${state}`;
      }
      if (severity) {
        endpoint += `&severity=${severity}`;
      }

      const vulnerabilities = await this.makeRequest<GitLabVulnerability[]>(config, endpoint);

      return vulnerabilities.map((vuln) => ({
        type: 'vulnerability' as const,
        sourceId: `gitlab-vuln-${vuln.id}`,
        sourceUrl: `https://gitlab.com/${vuln.project.full_path}/-/security/vulnerabilities/${vuln.id}`,
        data: {
          id: vuln.id,
          title: vuln.title,
          description: vuln.description,
          state: vuln.state,
          severity: vuln.severity,
          confidence: vuln.confidence,
          reportType: vuln.report_type,
          scanner: vuln.scanner.name,
          scannerVendor: vuln.scanner.vendor,
          identifiers: vuln.identifiers.map((i) => ({
            type: i.external_type,
            id: i.external_id,
            name: i.name,
          })),
          location: vuln.location,
          solution: vuln.solution,
          detectedAt: vuln.detected_at,
          resolvedAt: vuln.resolved_at,
          dismissedAt: vuln.dismissed_at,
        },
        hash: this.calculateHash(vuln),
        timestamp: new Date(vuln.updated_at),
        metadata: {
          provider: 'gitlab',
          projectId: config.projectId,
          resourceType: 'vulnerability',
        },
      }));
    } catch (error) {
      this.logger.warn(`Failed to fetch vulnerabilities: ${getErrorMessage(error)}`);
      return [];
    }
  }

  /**
   * Fetch code coverage history
   */
  async fetchCoverageHistory(
    config: GitLabConfig,
    options: { ref?: string; startDate?: string; endDate?: string } = {},
  ): Promise<GitLabEvidenceResult | null> {
    try {
      const projectId = this.encodeProjectId(config.projectId);
      const { ref = 'main' } = options;
      const endpoint = `/projects/${projectId}/jobs?scope=success&per_page=50`;

      const jobs = await this.makeRequest<GitLabJob[]>(config, endpoint);
      const coverageJobs = jobs.filter((j) => j.coverage !== null && j.ref === ref);

      if (coverageJobs.length === 0) {
        return null;
      }

      const coverageData = coverageJobs.map((job) => ({
        jobId: job.id,
        name: job.name,
        coverage: job.coverage,
        finishedAt: job.finished_at,
        commitId: job.commit.id,
      }));

      return {
        type: 'coverage' as const,
        sourceId: `gitlab-coverage-${projectId}-${ref}`,
        sourceUrl: `https://gitlab.com/api/v4/projects/${projectId}/jobs`,
        data: {
          ref,
          coverageHistory: coverageData,
          latestCoverage: coverageData[0]?.coverage,
          jobCount: coverageData.length,
          averageCoverage:
            coverageData.reduce((sum, j) => sum + (j.coverage || 0), 0) / coverageData.length,
        },
        hash: this.calculateHash(coverageData),
        timestamp: new Date(),
        metadata: {
          provider: 'gitlab',
          projectId: config.projectId,
          ref,
          resourceType: 'coverage_history',
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch coverage history: ${getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Ingest all evidence from a GitLab project
   */
  async ingestAllEvidence(
    config: GitLabConfig,
    sessionId: string,
  ): Promise<{
    ingested: number;
    errors: string[];
    results: Record<string, number>;
  }> {
    const results: Record<string, number> = {
      pipelines: 0,
      jobs: 0,
      test_reports: 0,
      merge_requests: 0,
      releases: 0,
      vulnerabilities: 0,
      coverage: 0,
    };
    const errors: string[] = [];
    let totalIngested = 0;

    // Fetch pipelines
    try {
      const pipelines = await this.fetchPipelines(config, { perPage: 20 });
      for (const pipeline of pipelines) {
        await this.saveEvidence(sessionId, pipeline);
        totalIngested++;
      }
      results.pipelines = pipelines.length;

      // Fetch jobs and test reports for recent pipelines
      for (const pipeline of pipelines.slice(0, 5)) {
        const pipelineId = pipeline.data.id as number;
        try {
          const jobs = await this.fetchPipelineJobs(config, pipelineId);
          for (const job of jobs) {
            await this.saveEvidence(sessionId, job);
            totalIngested++;
          }
          results.jobs += jobs.length;
        } catch (error) {
          errors.push(`Jobs for pipeline ${pipelineId}: ${getErrorMessage(error)}`);
        }

        try {
          const testReport = await this.fetchTestReport(config, pipelineId);
          if (testReport) {
            await this.saveEvidence(sessionId, testReport);
            totalIngested++;
            results.test_reports++;
          }
        } catch (error) {
          errors.push(`Test report for pipeline ${pipelineId}: ${getErrorMessage(error)}`);
        }
      }
    } catch (error) {
      errors.push(`Pipelines: ${getErrorMessage(error)}`);
    }

    // Fetch merge requests
    try {
      const mrs = await this.fetchMergeRequests(config, { state: 'all', perPage: 30 });
      for (const mr of mrs) {
        await this.saveEvidence(sessionId, mr);
        totalIngested++;
      }
      results.merge_requests = mrs.length;
    } catch (error) {
      errors.push(`Merge requests: ${getErrorMessage(error)}`);
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

    // Fetch vulnerabilities
    try {
      const vulns = await this.fetchVulnerabilities(config);
      for (const vuln of vulns) {
        await this.saveEvidence(sessionId, vuln);
        totalIngested++;
      }
      results.vulnerabilities = vulns.length;
    } catch (error) {
      errors.push(`Vulnerabilities: ${getErrorMessage(error)}`);
    }

    // Fetch coverage history
    try {
      const coverage = await this.fetchCoverageHistory(config);
      if (coverage) {
        await this.saveEvidence(sessionId, coverage);
        totalIngested++;
        results.coverage = 1;
      }
    } catch (error) {
      errors.push(`Coverage: ${getErrorMessage(error)}`);
    }

    this.logger.log(
      `GitLab ingestion complete: ${totalIngested} items from project ${config.projectId}`,
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
  private async saveEvidence(sessionId: string, evidence: GitLabEvidenceResult): Promise<void> {
    // Log evidence for audit trail
    this.logger.debug(
      `Ingested ${evidence.type} evidence: ${evidence.sourceId} for session ${sessionId}`,
    );
    // Evidence data is returned via ingestAllEvidence results
    // Actual database persistence should be handled by the calling service
  }

  /**
   * Verify GitLab webhook token
   */
  verifyWebhookToken(requestToken: string, configuredToken: string): boolean {
    return requestToken === configuredToken;
  }
}
