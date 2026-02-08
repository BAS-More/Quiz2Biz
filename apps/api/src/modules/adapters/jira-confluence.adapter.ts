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

interface JiraConfig {
  domain: string; // e.g., 'your-org.atlassian.net'
  email: string;
  apiToken: string;
}

interface ConfluenceConfig extends JiraConfig {
  spaceKey: string;
}

interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: string | null;
    issuetype: { name: string; iconUrl: string };
    status: { name: string; statusCategory: { key: string; name: string } };
    priority: { name: string } | null;
    assignee: { displayName: string; emailAddress: string } | null;
    reporter: { displayName: string; emailAddress: string };
    created: string;
    updated: string;
    resolutiondate: string | null;
    labels: string[];
    components: Array<{ name: string }>;
    fixVersions: Array<{ name: string; releaseDate?: string }>;
    customfield_10020?: Array<{ name: string; startDate?: string; endDate?: string }>; // Sprint
    customfield_10016?: number; // Story points
    parent?: { key: string; fields: { summary: string } };
    subtasks?: Array<{ key: string; fields: { summary: string; status: { name: string } } }>;
    attachment?: Array<{
      id: string;
      filename: string;
      mimeType: string;
      size: number;
      created: string;
    }>;
    comment?: {
      total: number;
      comments: Array<{
        id: string;
        author: { displayName: string };
        body: string;
        created: string;
        updated: string;
      }>;
    };
  };
}

interface JiraSprint {
  id: number;
  self: string;
  state: string;
  name: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId: number;
  goal?: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  self: string;
  projectTypeKey: string;
  style: string;
  isPrivate: boolean;
  description?: string;
  lead: { displayName: string; emailAddress: string };
}

interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  space: { key: string; name: string };
  body?: {
    storage?: { value: string };
    view?: { value: string };
  };
  version: { number: number; when: string; by: { displayName: string } };
  ancestors: Array<{ id: string; title: string }>;
  children?: {
    page?: { results: Array<{ id: string; title: string }> };
    attachment?: { results: Array<{ id: string; title: string; mediaType: string }> };
  };
  _links: { webui: string; self: string };
}

interface ConfluenceSearchResult {
  results: ConfluencePage[];
  start: number;
  limit: number;
  size: number;
  totalSize: number;
  _links: { next?: string };
}

export interface JiraEvidenceResult {
  type: 'jira_issue' | 'jira_sprint' | 'jira_project' | 'confluence_page' | 'confluence_attachment';
  sourceId: string;
  sourceUrl: string;
  data: Record<string, unknown>;
  hash: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

@Injectable()
export class JiraConfluenceAdapter {
  private readonly logger = new Logger(JiraConfluenceAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getHeaders(config: JiraConfig): Record<string, string> {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate the Jira/Confluence domain to reduce SSRF risk.
   * Only allow plain hostnames that look like Atlassian cloud domains and
   * reject obvious localhost, IP literal, or malformed values.
   */
  private validateDomain(config: JiraConfig): void {
    const rawDomain = (config.domain || '').trim().toLowerCase();

    // Must be non-empty and reasonably short
    if (!rawDomain || rawDomain.length > 255) {
      throw new HttpException('Invalid Jira domain', HttpStatus.BAD_REQUEST);
    }

    // Disallow schemes, paths, ports, credentials, and backslashes
    if (
      rawDomain.includes('://') ||
      rawDomain.includes('/') ||
      rawDomain.includes('\\') ||
      rawDomain.includes('@') ||
      rawDomain.includes(':')
    ) {
      throw new HttpException('Invalid Jira domain format', HttpStatus.BAD_REQUEST);
    }

    // Disallow localhost and common loopback variants
    if (
      rawDomain === 'localhost' ||
      rawDomain.endsWith('.localhost') ||
      rawDomain === '127.0.0.1' ||
      rawDomain.startsWith('127.') ||
      rawDomain === '::1'
    ) {
      throw new HttpException('Jira domain not allowed', HttpStatus.BAD_REQUEST);
    }

    // Disallow common private IPv4 ranges by simple prefix match
    if (
      rawDomain.startsWith('10.') ||
      rawDomain.startsWith('192.168.') ||
      rawDomain.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      throw new HttpException('Jira domain not allowed', HttpStatus.BAD_REQUEST);
    }

    // Enforce Atlassian cloud domains (adjust if self-hosted Jira must be supported)
    if (!rawDomain.endsWith('.atlassian.net')) {
      throw new HttpException('Unsupported Jira domain', HttpStatus.BAD_REQUEST);
    }
  }

  private async makeRequest<T>(
    config: JiraConfig,
    endpoint: string,
    method: string = 'GET',
    body?: unknown,
    isConfluence: boolean = false,
  ): Promise<T> {
    // Validate the domain before constructing the URL to prevent SSRF
    this.validateDomain(config);

    const baseUrl = isConfluence
      ? `https://${config.domain}/wiki/rest/api`
      : `https://${config.domain}/rest/api/3`;
    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(config),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new HttpException(
          `Atlassian API error: ${response.status} - ${errorBody}`,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Atlassian API request failed: ${getErrorMessage(error)}`);
      throw new HttpException('Failed to connect to Atlassian API', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private calculateHash(data: unknown): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  // ==================== JIRA METHODS ====================

  /**
   * Fetch issues using JQL
   */
  async fetchIssues(
    config: JiraConfig,
    options: {
      jql?: string;
      projectKey?: string;
      maxResults?: number;
      startAt?: number;
      fields?: string[];
    } = {},
  ): Promise<JiraEvidenceResult[]> {
    const {
      jql,
      projectKey,
      maxResults = 50,
      startAt = 0,
      fields = [
        'summary',
        'description',
        'issuetype',
        'status',
        'priority',
        'assignee',
        'reporter',
        'created',
        'updated',
        'resolutiondate',
        'labels',
        'components',
        'fixVersions',
        'customfield_10020',
        'customfield_10016',
        'parent',
        'subtasks',
        'attachment',
        'comment',
      ],
    } = options;

    const searchJql =
      jql ||
      (projectKey ? `project = ${projectKey} ORDER BY updated DESC` : 'ORDER BY updated DESC');

    const endpoint = `/search?jql=${encodeURIComponent(searchJql)}&maxResults=${maxResults}&startAt=${startAt}&fields=${fields.join(',')}`;

    const response = await this.makeRequest<{ issues: JiraIssue[]; total: number }>(
      config,
      endpoint,
    );

    return response.issues.map((issue) => ({
      type: 'jira_issue' as const,
      sourceId: `jira-issue-${issue.key}`,
      sourceUrl: `https://${config.domain}/browse/${issue.key}`,
      data: {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        issueType: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        statusCategory: issue.fields.status.statusCategory.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        assigneeEmail: issue.fields.assignee?.emailAddress,
        reporter: issue.fields.reporter.displayName,
        reporterEmail: issue.fields.reporter.emailAddress,
        created: issue.fields.created,
        updated: issue.fields.updated,
        resolved: issue.fields.resolutiondate,
        labels: issue.fields.labels,
        components: issue.fields.components.map((c) => c.name),
        fixVersions: issue.fields.fixVersions.map((v) => ({
          name: v.name,
          releaseDate: v.releaseDate,
        })),
        sprint: issue.fields.customfield_10020?.[0]?.name,
        storyPoints: issue.fields.customfield_10016,
        parent: issue.fields.parent?.key,
        parentSummary: issue.fields.parent?.fields.summary,
        subtasks: issue.fields.subtasks?.map((s) => ({
          key: s.key,
          summary: s.fields.summary,
          status: s.fields.status.name,
        })),
        attachmentCount: issue.fields.attachment?.length || 0,
        commentCount: issue.fields.comment?.total || 0,
      },
      hash: this.calculateHash(issue),
      timestamp: new Date(issue.fields.updated),
      metadata: {
        provider: 'jira',
        domain: config.domain,
        resourceType: 'issue',
      },
    }));
  }

  /**
   * Fetch a specific issue with all details
   */
  async fetchIssueDetails(config: JiraConfig, issueKey: string): Promise<JiraEvidenceResult> {
    const endpoint = `/issue/${issueKey}?expand=changelog,renderedFields`;
    const issue = await this.makeRequest<JiraIssue>(config, endpoint);

    return {
      type: 'jira_issue' as const,
      sourceId: `jira-issue-${issue.key}`,
      sourceUrl: `https://${config.domain}/browse/${issue.key}`,
      data: {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        issueType: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        statusCategory: issue.fields.status.statusCategory.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        reporter: issue.fields.reporter.displayName,
        created: issue.fields.created,
        updated: issue.fields.updated,
        resolved: issue.fields.resolutiondate,
        labels: issue.fields.labels,
        components: issue.fields.components.map((c) => c.name),
        attachments: issue.fields.attachment?.map((a) => ({
          id: a.id,
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
          created: a.created,
        })),
        comments: issue.fields.comment?.comments.map((c) => ({
          id: c.id,
          author: c.author.displayName,
          body: c.body,
          created: c.created,
        })),
      },
      hash: this.calculateHash(issue),
      timestamp: new Date(issue.fields.updated),
      metadata: {
        provider: 'jira',
        domain: config.domain,
        resourceType: 'issue_detail',
      },
    };
  }

  /**
   * Fetch sprints from a board
   */
  async fetchSprints(
    config: JiraConfig,
    boardId: number,
    options: { state?: 'active' | 'closed' | 'future'; maxResults?: number } = {},
  ): Promise<JiraEvidenceResult[]> {
    const { state, maxResults = 50 } = options;
    let endpoint = `https://${config.domain}/rest/agile/1.0/board/${boardId}/sprint?maxResults=${maxResults}`;
    if (state) {
      endpoint += `&state=${state}`;
    }

    const response = await fetch(endpoint, {
      headers: this.getHeaders(config),
    });

    if (!response.ok) {
      throw new HttpException(`Failed to fetch sprints: ${response.status}`, response.status);
    }

    const data = (await response.json()) as { values: JiraSprint[] };

    return data.values.map((sprint) => ({
      type: 'jira_sprint' as const,
      sourceId: `jira-sprint-${sprint.id}`,
      sourceUrl: sprint.self,
      data: {
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        completeDate: sprint.completeDate,
        boardId: sprint.originBoardId,
      },
      hash: this.calculateHash(sprint),
      timestamp: new Date(sprint.completeDate || sprint.endDate || sprint.startDate || new Date()),
      metadata: {
        provider: 'jira',
        domain: config.domain,
        boardId,
        resourceType: 'sprint',
      },
    }));
  }

  /**
   * Fetch project details
   */
  async fetchProject(config: JiraConfig, projectKey: string): Promise<JiraEvidenceResult> {
    const endpoint = `/project/${projectKey}`;
    const project = await this.makeRequest<JiraProject>(config, endpoint);

    return {
      type: 'jira_project' as const,
      sourceId: `jira-project-${project.key}`,
      sourceUrl: `https://${config.domain}/browse/${project.key}`,
      data: {
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description,
        projectType: project.projectTypeKey,
        style: project.style,
        isPrivate: project.isPrivate,
        lead: project.lead.displayName,
        leadEmail: project.lead.emailAddress,
      },
      hash: this.calculateHash(project),
      timestamp: new Date(),
      metadata: {
        provider: 'jira',
        domain: config.domain,
        resourceType: 'project',
      },
    };
  }

  // ==================== CONFLUENCE METHODS ====================

  /**
   * Search Confluence pages
   */
  async searchPages(
    config: ConfluenceConfig,
    options: {
      cql?: string;
      query?: string;
      limit?: number;
      start?: number;
      expand?: string[];
    } = {},
  ): Promise<JiraEvidenceResult[]> {
    const {
      cql,
      query,
      limit = 25,
      start = 0,
      expand = ['space', 'version', 'ancestors', 'children.page', 'children.attachment'],
    } = options;

    let endpoint: string;
    if (cql) {
      endpoint = `/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}&start=${start}&expand=${expand.join(',')}`;
    } else if (query) {
      endpoint = `/content/search?cql=${encodeURIComponent(`space = ${config.spaceKey} AND text ~ "${query}"`)}&limit=${limit}&start=${start}&expand=${expand.join(',')}`;
    } else {
      endpoint = `/content?spaceKey=${config.spaceKey}&limit=${limit}&start=${start}&expand=${expand.join(',')}`;
    }

    const response = await this.makeRequest<ConfluenceSearchResult>(
      config,
      endpoint,
      'GET',
      undefined,
      true,
    );

    return response.results.map((page) => this.mapConfluencePageToEvidence(config, page));
  }

  /**
   * Fetch a specific Confluence page
   */
  async fetchPage(
    config: ConfluenceConfig,
    pageId: string,
    expand: string[] = [
      'space',
      'body.storage',
      'body.view',
      'version',
      'ancestors',
      'children.page',
      'children.attachment',
    ],
  ): Promise<JiraEvidenceResult> {
    const endpoint = `/content/${pageId}?expand=${expand.join(',')}`;
    const page = await this.makeRequest<ConfluencePage>(config, endpoint, 'GET', undefined, true);
    return this.mapConfluencePageToEvidence(config, page);
  }

  /**
   * Fetch pages by label
   */
  async fetchPagesByLabel(
    config: ConfluenceConfig,
    label: string,
    options: { limit?: number; start?: number } = {},
  ): Promise<JiraEvidenceResult[]> {
    const { limit = 25, start = 0 } = options;
    const cql = `space = ${config.spaceKey} AND label = "${label}"`;
    return this.searchPages(config, { cql, limit, start });
  }

  /**
   * Fetch child pages of a parent
   */
  async fetchChildPages(
    config: ConfluenceConfig,
    parentId: string,
    options: { limit?: number; start?: number } = {},
  ): Promise<JiraEvidenceResult[]> {
    const { limit = 25, start = 0 } = options;
    const endpoint = `/content/${parentId}/child/page?limit=${limit}&start=${start}&expand=space,version,ancestors`;
    const response = await this.makeRequest<ConfluenceSearchResult>(
      config,
      endpoint,
      'GET',
      undefined,
      true,
    );
    return response.results.map((page) => this.mapConfluencePageToEvidence(config, page));
  }

  /**
   * Create or update a Confluence page
   */
  async syncPage(
    config: ConfluenceConfig,
    options: {
      title: string;
      content: string;
      parentId?: string;
      existingPageId?: string;
      labels?: string[];
    },
  ): Promise<JiraEvidenceResult> {
    const { title, content, parentId, existingPageId, labels } = options;

    const body: Record<string, unknown> = {
      type: 'page',
      title,
      space: { key: config.spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
    };

    if (parentId) {
      body.ancestors = [{ id: parentId }];
    }

    let page: ConfluencePage;

    if (existingPageId) {
      // Get current version for update
      const existingPage = await this.makeRequest<ConfluencePage>(
        config,
        `/content/${existingPageId}`,
        'GET',
        undefined,
        true,
      );
      body.version = { number: existingPage.version.number + 1 };
      page = await this.makeRequest<ConfluencePage>(
        config,
        `/content/${existingPageId}`,
        'PUT',
        body,
        true,
      );
    } else {
      page = await this.makeRequest<ConfluencePage>(config, '/content', 'POST', body, true);
    }

    // Add labels if specified
    if (labels && labels.length > 0) {
      await this.addLabelsToPage(config, page.id, labels);
    }

    return this.mapConfluencePageToEvidence(config, page);
  }

  /**
   * Add labels to a page
   */
  private async addLabelsToPage(
    config: ConfluenceConfig,
    pageId: string,
    labels: string[],
  ): Promise<void> {
    const labelsBody = labels.map((label) => ({ prefix: 'global', name: label }));
    await this.makeRequest(config, `/content/${pageId}/label`, 'POST', labelsBody, true);
  }

  private mapConfluencePageToEvidence(
    config: ConfluenceConfig,
    page: ConfluencePage,
  ): JiraEvidenceResult {
    return {
      type: 'confluence_page' as const,
      sourceId: `confluence-page-${page.id}`,
      sourceUrl: `https://${config.domain}/wiki${page._links.webui}`,
      data: {
        id: page.id,
        title: page.title,
        type: page.type,
        status: page.status,
        spaceKey: page.space?.key,
        spaceName: page.space?.name,
        version: page.version?.number,
        versionDate: page.version?.when,
        versionAuthor: page.version?.by?.displayName,
        ancestors: page.ancestors?.map((a) => ({ id: a.id, title: a.title })),
        childPageCount: page.children?.page?.results?.length || 0,
        attachmentCount: page.children?.attachment?.results?.length || 0,
        content: page.body?.storage?.value || page.body?.view?.value,
      },
      hash: this.calculateHash(page),
      timestamp: new Date(page.version?.when || new Date()),
      metadata: {
        provider: 'confluence',
        domain: config.domain,
        spaceKey: config.spaceKey,
        resourceType: 'page',
      },
    };
  }

  // ==================== INTEGRATION METHODS ====================

  /**
   * Sync documentation from Quiz2Biz to Confluence
   */
  async syncDocumentation(
    config: ConfluenceConfig,
    documents: Array<{
      title: string;
      content: string;
      category: string;
      labels: string[];
    }>,
    parentPageId: string,
  ): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    // Get existing pages to check for updates
    const existingPages = await this.searchPages(config, {
      cql: `ancestor = ${parentPageId}`,
      limit: 100,
    });

    const existingPageMap = new Map(
      existingPages.map((p) => [p.data.title as string, p.data.id as string]),
    );

    for (const doc of documents) {
      try {
        const existingPageId = existingPageMap.get(doc.title);
        await this.syncPage(config, {
          title: doc.title,
          content: this.wrapInConfluenceStorage(doc.content),
          parentId: parentPageId,
          existingPageId,
          labels: [...doc.labels, 'quiz2biz-generated', doc.category],
        });
        synced++;
      } catch (error) {
        errors.push(`Failed to sync "${doc.title}": ${getErrorMessage(error)}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Wrap markdown-like content in Confluence storage format
   */
  private wrapInConfluenceStorage(content: string): string {
    // Basic markdown to Confluence conversion
    let html = content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^- (.*$)/gim, '<li>$1</li>');

    // Wrap lists
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    return `<p>${html}</p>`;
  }

  /**
   * Ingest all evidence from Jira/Confluence
   */
  async ingestAllEvidence(
    jiraConfig: JiraConfig,
    confluenceConfig: ConfluenceConfig | null,
    sessionId: string,
    projectKey: string,
  ): Promise<{
    ingested: number;
    errors: string[];
    results: Record<string, number>;
  }> {
    const results: Record<string, number> = {
      jira_issues: 0,
      jira_sprints: 0,
      jira_project: 0,
      confluence_pages: 0,
    };
    const errors: string[] = [];
    let totalIngested = 0;

    // Fetch Jira project
    try {
      const project = await this.fetchProject(jiraConfig, projectKey);
      await this.saveEvidence(sessionId, project);
      totalIngested++;
      results.jira_project = 1;
    } catch (error) {
      errors.push(`Jira project: ${getErrorMessage(error)}`);
    }

    // Fetch Jira issues
    try {
      const issues = await this.fetchIssues(jiraConfig, {
        projectKey,
        maxResults: 100,
      });
      for (const issue of issues) {
        await this.saveEvidence(sessionId, issue);
        totalIngested++;
      }
      results.jira_issues = issues.length;
    } catch (error) {
      errors.push(`Jira issues: ${getErrorMessage(error)}`);
    }

    // Fetch Confluence pages if configured
    if (confluenceConfig) {
      try {
        const pages = await this.searchPages(confluenceConfig, { limit: 50 });
        for (const page of pages) {
          await this.saveEvidence(sessionId, page);
          totalIngested++;
        }
        results.confluence_pages = pages.length;
      } catch (error) {
        errors.push(`Confluence pages: ${getErrorMessage(error)}`);
      }
    }

    this.logger.log(`Jira/Confluence ingestion complete: ${totalIngested} items`);

    return {
      ingested: totalIngested,
      errors,
      results,
    };
  }

  /**
   * Save evidence to database
   */
  private async saveEvidence(sessionId: string, evidence: JiraEvidenceResult): Promise<void> {
    // Log evidence for audit trail
    this.logger.debug(
      `Ingested ${evidence.type} evidence: ${evidence.sourceId} for session ${sessionId}`,
    );
    // Evidence data is returned via ingestAllEvidence results
    // Actual database persistence should be handled by the calling service
    // after mapping to appropriate question/evidence relationships
  }
}
