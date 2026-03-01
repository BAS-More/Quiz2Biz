import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JiraConfluenceAdapter } from './jira-confluence.adapter';
import { PrismaService } from '@libs/database';

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers & shared fixtures
// ---------------------------------------------------------------------------

const jiraConfig = {
  domain: 'test.atlassian.net',
  email: 'test@test.com',
  apiToken: 'token123',
};

const confluenceConfig = {
  ...jiraConfig,
  spaceKey: 'TEST',
};

const expectedAuthHeader = `Basic ${Buffer.from('test@test.com:token123').toString('base64')}`;

/** Shorthand for a successful JSON response from fetch. */
function okResponse(body: unknown): Partial<Response> {
  return {
    ok: true,
    json: async () => body,
  } as Partial<Response>;
}

/** Shorthand for a failed HTTP response from fetch. */
function errorResponse(status: number, text: string): Partial<Response> {
  return {
    ok: false,
    status,
    text: async () => text,
  } as Partial<Response>;
}

// ---------------------------------------------------------------------------
// Confluence page fixture used by multiple test groups
// ---------------------------------------------------------------------------

function makeConfluencePage(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    id: '12345',
    type: 'page',
    status: 'current',
    title: 'Test Page',
    space: { key: 'TEST', name: 'Test Space' },
    body: { storage: { value: '<p>Hello</p>' } },
    version: { number: 3, when: '2025-06-01T00:00:00Z', by: { displayName: 'Author' } },
    ancestors: [{ id: '100', title: 'Parent' }],
    children: {
      page: { results: [{ id: '200', title: 'Child' }] },
      attachment: { results: [{ id: '300', title: 'file.png', mediaType: 'image/png' }] },
    },
    _links: {
      webui: '/spaces/TEST/pages/12345/Test+Page',
      self: 'https://test.atlassian.net/wiki/rest/api/content/12345',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('JiraConfluenceAdapter', () => {
  let adapter: JiraConfluenceAdapter;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraConfluenceAdapter,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    adapter = module.get<JiraConfluenceAdapter>(JiraConfluenceAdapter);

    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'JIRA_DOMAIN') return 'test.atlassian.net';
      return undefined;
    });
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  // =========================================================================
  // 1. validateDomain (private, tested through makeRequest via public methods)
  // =========================================================================
  describe('validateDomain', () => {
    // Each invalid domain value is exercised by calling fetchProject (which
    // calls makeRequest -> validateDomain).  Because makeRequest first checks
    // domain equality against JIRA_DOMAIN, we must set JIRA_DOMAIN to the
    // same invalid value so that the domain-mismatch check passes and we
    // actually reach validateDomain.

    const expectDomainRejected = async (domain: string, expectedMessage?: string) => {
      const cfg = { ...jiraConfig, domain };
      mockConfigService.get.mockReturnValue(domain);
      await expect(adapter.fetchProject(cfg, 'TEST')).rejects.toThrow(HttpException);
      if (expectedMessage) {
        await expect(adapter.fetchProject(cfg, 'TEST')).rejects.toThrow(expectedMessage);
      }
    };

    it('should reject domain with scheme (http://)', async () => {
      await expectDomainRejected('http://evil.atlassian.net', 'Invalid Jira domain format');
    });

    it('should reject domain with scheme (https://)', async () => {
      await expectDomainRejected('https://evil.atlassian.net', 'Invalid Jira domain format');
    });

    it('should reject domain with a path', async () => {
      await expectDomainRejected('evil.atlassian.net/path', 'Invalid Jira domain format');
    });

    it('should reject domain with a port', async () => {
      await expectDomainRejected('evil.atlassian.net:8080', 'Invalid Jira domain format');
    });

    it('should reject domain with backslash', async () => {
      await expectDomainRejected('evil.atlassian.net\\path', 'Invalid Jira domain format');
    });

    it('should reject domain with credentials (@)', async () => {
      await expectDomainRejected('user@evil.atlassian.net', 'Invalid Jira domain format');
    });

    it('should reject "localhost"', async () => {
      await expectDomainRejected('localhost', 'Jira domain not allowed');
    });

    it('should reject subdomain of localhost', async () => {
      await expectDomainRejected('api.localhost', 'Jira domain not allowed');
    });

    it('should reject 127.0.0.1', async () => {
      await expectDomainRejected('127.0.0.1', 'Jira domain not allowed');
    });

    it('should reject other 127.x addresses', async () => {
      await expectDomainRejected('127.0.0.2', 'Jira domain not allowed');
    });

    it('should reject IPv6 loopback ::1 (caught by colon check)', async () => {
      await expectDomainRejected('::1', 'Invalid Jira domain format');
    });

    it('should reject private IP 10.x.x.x', async () => {
      await expectDomainRejected('10.0.0.1', 'Jira domain not allowed');
    });

    it('should reject private IP 192.168.x.x', async () => {
      await expectDomainRejected('192.168.1.1', 'Jira domain not allowed');
    });

    it('should reject private IP 172.16.x.x', async () => {
      await expectDomainRejected('172.16.0.1', 'Jira domain not allowed');
    });

    it('should reject private IP 172.31.x.x', async () => {
      await expectDomainRejected('172.31.255.255', 'Jira domain not allowed');
    });

    it('should reject non-atlassian domain', async () => {
      await expectDomainRejected('evil.com', 'Unsupported Jira domain');
    });

    it('should reject empty domain', async () => {
      const cfg = { ...jiraConfig, domain: '' };
      mockConfigService.get.mockReturnValue('');
      // Empty JIRA_DOMAIN will trigger "JIRA_DOMAIN is not configured"
      await expect(adapter.fetchProject(cfg, 'TEST')).rejects.toThrow(
        'JIRA_DOMAIN is not configured',
      );
    });

    it('should accept a valid .atlassian.net domain', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          id: '1',
          key: 'TEST',
          name: 'Test',
          self: 'https://test.atlassian.net/rest/api/3/project/1',
          projectTypeKey: 'software',
          style: 'classic',
          isPrivate: false,
          lead: { displayName: 'Lead', emailAddress: 'lead@test.com' },
        }),
      );

      const result = await adapter.fetchProject(jiraConfig, 'TEST');
      expect(result.type).toBe('jira_project');
    });
  });

  // =========================================================================
  // 2. sanitizeEndpoint (private, tested indirectly)
  // =========================================================================
  describe('sanitizeEndpoint', () => {
    // sanitizeEndpoint is called inside makeRequest. We provoke it with custom
    // endpoints via methods that forward the endpoint (e.g., fetchProject
    // builds its own endpoint, but we can test via fetchIssues with a JQL
    // that results in a valid endpoint, or more precisely we just observe
    // behaviour through fetch call inspection).

    // For direct control we use a helper that gets us to makeRequest with a
    // specific endpoint. fetchProject(config, key) builds endpoint = /project/${key}
    // which runs through sanitizeEndpoint. We abuse the projectKey to smuggle
    // bad endpoint fragments.

    it('should strip leading slash from endpoint', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          id: '1',
          key: 'TEST',
          name: 'Test',
          self: 'self',
          projectTypeKey: 'software',
          style: 'classic',
          isPrivate: false,
          lead: { displayName: 'L', emailAddress: 'l@t.com' },
        }),
      );

      // fetchProject builds endpoint = `/project/TEST` which starts with "/"
      // sanitizeEndpoint strips the leading slash -> "project/TEST"
      await adapter.fetchProject(jiraConfig, 'TEST');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/rest/api/3/project/TEST');
      expect(calledUrl).not.toContain('//project/TEST');
    });

    // The path-traversal and protocol checks in sanitizeEndpoint cause
    // HttpException. We verify them through fetchIssues where we can
    // construct a JQL that results in an endpoint containing dangerous chars.
    // Actually: sanitizeEndpoint checks the endpoint string itself.
    // We can exercise it by passing a JQL that, when encoded, is fine but
    // injecting a malicious value is harder because the methods encode JQL.
    // Instead we test endpoint validation by directly verifying that paths
    // like "../" or "://" within a project key do get rejected.

    it('should reject endpoint with path traversal (../)', async () => {
      // projectKey = '../../etc/passwd' -> endpoint = '/project/../../etc/passwd'
      await expect(adapter.fetchProject(jiraConfig, '../../etc/passwd')).rejects.toThrow(
        'Invalid Atlassian API endpoint format',
      );
    });

    it('should reject endpoint containing protocol (://)', async () => {
      await expect(adapter.fetchProject(jiraConfig, 'http://evil')).rejects.toThrow(
        'Invalid Atlassian API endpoint format',
      );
    });

    it('should reject endpoint with backslashes', async () => {
      await expect(adapter.fetchProject(jiraConfig, 'foo\\bar')).rejects.toThrow(
        'Invalid Atlassian API endpoint format',
      );
    });
  });

  // =========================================================================
  // 3. getTrustedJiraDomain (private)
  // =========================================================================
  describe('getTrustedJiraDomain', () => {
    it('should throw SERVICE_UNAVAILABLE when JIRA_DOMAIN is not configured', async () => {
      mockConfigService.get.mockReturnValue('');

      await expect(adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' })).rejects.toThrow(
        'JIRA_DOMAIN is not configured',
      );
    });

    it('should throw SERVICE_UNAVAILABLE when JIRA_DOMAIN is undefined', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' })).rejects.toThrow(
        'JIRA_DOMAIN is not configured',
      );
    });

    it('should return the configured domain when set', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('test.atlassian.net');
    });
  });

  // =========================================================================
  // 4. makeRequest
  // =========================================================================
  describe('makeRequest', () => {
    it('should throw when config.domain does not match JIRA_DOMAIN', async () => {
      const mismatchedConfig = { ...jiraConfig, domain: 'other.atlassian.net' };

      await expect(
        adapter.fetchIssues(mismatchedConfig, { jql: 'project = TEST' }),
      ).rejects.toThrow('Configured Jira domain does not match trusted server configuration');
    });

    it('should throw HttpException on HTTP error response', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));

      await expect(adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' })).rejects.toThrow(
        HttpException,
      );

      try {
        mockFetch.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));
        await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(401);
        expect((e as HttpException).message).toContain('Unauthorized');
      }
    });

    it('should throw SERVICE_UNAVAILABLE on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      try {
        await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });
        fail('Expected exception');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect((e as HttpException).message).toContain('Failed to connect to Atlassian API');
      }
    });

    it('should use /wiki/rest/api base for Confluence requests (isConfluence=true)', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          results: [],
          start: 0,
          limit: 25,
          size: 0,
          totalSize: 0,
        }),
      );

      await adapter.searchPages(confluenceConfig, { query: 'test' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/wiki/rest/api/');
    });

    it('should use /rest/agile/1.0 base for Agile requests (isAgile=true)', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ values: [] }));

      await adapter.fetchSprints(jiraConfig, 1);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/rest/agile/1.0/');
    });

    it('should use /rest/api/3 base for standard Jira requests', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/rest/api/3/');
    });

    it('should construct URL with https protocol', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl.startsWith('https://')).toBe(true);
    });
  });

  // =========================================================================
  // 5. Auth header verification
  // =========================================================================
  describe('API authentication', () => {
    it('should send Basic auth header with Base64-encoded email:apiToken', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe(expectedAuthHeader);
    });

    it('should set Accept and Content-Type to application/json', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Accept).toBe('application/json');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  // =========================================================================
  // 6. fetchIssues
  // =========================================================================
  describe('fetchIssues', () => {
    const makeIssue = (key: string, summary: string) => ({
      id: '10001',
      key,
      self: `https://test.atlassian.net/rest/api/3/issue/10001`,
      fields: {
        summary,
        description: 'A description',
        issuetype: { name: 'Story', iconUrl: 'https://icon' },
        status: {
          name: 'In Progress',
          statusCategory: { key: 'indeterminate', name: 'In Progress' },
        },
        priority: { name: 'High' },
        assignee: { displayName: 'Alice', emailAddress: 'alice@test.com' },
        reporter: { displayName: 'Bob', emailAddress: 'bob@test.com' },
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-02T00:00:00Z',
        resolutiondate: null,
        labels: ['backend'],
        components: [{ name: 'API' }],
        fixVersions: [{ name: '1.0.0', releaseDate: '2025-06-01' }],
        customfield_10020: [{ name: 'Sprint 1' }],
        customfield_10016: 5,
        parent: { key: 'TEST-1', fields: { summary: 'Epic' } },
        subtasks: [{ key: 'TEST-3', fields: { summary: 'Sub', status: { name: 'Done' } } }],
        attachment: [
          {
            id: 'a1',
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            created: '2025-01-01T00:00:00Z',
          },
        ],
        comment: {
          total: 2,
          comments: [
            {
              id: 'c1',
              author: { displayName: 'Alice' },
              body: 'Comment',
              created: '2025-01-01T00:00:00Z',
              updated: '2025-01-01T00:00:00Z',
            },
          ],
        },
      },
    });

    it('should fetch issues with JQL query and map to evidence results', async () => {
      const issue = makeIssue('TEST-123', 'Test Issue');
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [issue], total: 1 }));

      const results = await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.type).toBe('jira_issue');
      expect(r.sourceId).toBe('jira-issue-TEST-123');
      expect(r.sourceUrl).toBe('https://test.atlassian.net/browse/TEST-123');
      expect(r.data.summary).toBe('Test Issue');
      expect(r.data.issueType).toBe('Story');
      expect(r.data.status).toBe('In Progress');
      expect(r.data.statusCategory).toBe('In Progress');
      expect(r.data.priority).toBe('High');
      expect(r.data.assignee).toBe('Alice');
      expect(r.data.assigneeEmail).toBe('alice@test.com');
      expect(r.data.reporter).toBe('Bob');
      expect(r.data.reporterEmail).toBe('bob@test.com');
      expect(r.data.labels).toEqual(['backend']);
      expect(r.data.components).toEqual(['API']);
      expect(r.data.fixVersions).toEqual([{ name: '1.0.0', releaseDate: '2025-06-01' }]);
      expect(r.data.sprint).toBe('Sprint 1');
      expect(r.data.storyPoints).toBe(5);
      expect(r.data.parent).toBe('TEST-1');
      expect(r.data.parentSummary).toBe('Epic');
      expect(r.data.subtasks).toEqual([{ key: 'TEST-3', summary: 'Sub', status: 'Done' }]);
      expect(r.data.attachmentCount).toBe(1);
      expect(r.data.commentCount).toBe(2);
      expect(r.hash).toBeDefined();
      expect(r.timestamp).toEqual(new Date('2025-01-02T00:00:00Z'));
      expect(r.metadata.provider).toBe('jira');
      expect(r.metadata.domain).toBe('test.atlassian.net');
      expect(r.metadata.resourceType).toBe('issue');
    });

    it('should use JQL from options when provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig, { jql: 'assignee = currentUser()' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(encodeURIComponent('assignee = currentUser()'));
    });

    it('should build JQL from projectKey when jql is not provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig, { projectKey: 'PROJ' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(encodeURIComponent('project = PROJ ORDER BY updated DESC'));
    });

    it('should use default JQL when neither jql nor projectKey is provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.fetchIssues(jiraConfig);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(encodeURIComponent('ORDER BY updated DESC'));
    });

    it('should handle issues with null optional fields', async () => {
      const issue = {
        id: '10002',
        key: 'TEST-456',
        self: 'https://test.atlassian.net/rest/api/3/issue/10002',
        fields: {
          summary: 'Minimal Issue',
          description: null,
          issuetype: { name: 'Task', iconUrl: '' },
          status: { name: 'Open', statusCategory: { key: 'new', name: 'To Do' } },
          priority: null,
          assignee: null,
          reporter: { displayName: 'Bob', emailAddress: 'bob@test.com' },
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          resolutiondate: null,
          labels: [],
          components: [],
          fixVersions: [],
        },
      };
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [issue], total: 1 }));

      const results = await adapter.fetchIssues(jiraConfig, { jql: 'key = TEST-456' });

      expect(results).toHaveLength(1);
      expect(results[0].data.priority).toBeUndefined();
      expect(results[0].data.assignee).toBeUndefined();
      expect(results[0].data.sprint).toBeUndefined();
      expect(results[0].data.storyPoints).toBeUndefined();
      expect(results[0].data.attachmentCount).toBe(0);
      expect(results[0].data.commentCount).toBe(0);
    });

    it('should return empty array when no issues found', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      const results = await adapter.fetchIssues(jiraConfig, { jql: 'project = EMPTY' });

      expect(results).toEqual([]);
    });
  });

  // =========================================================================
  // 7. fetchIssueDetails
  // =========================================================================
  describe('fetchIssueDetails', () => {
    it('should fetch a single issue with full expansion', async () => {
      const issue = {
        id: '10001',
        key: 'TEST-123',
        self: 'https://test.atlassian.net/rest/api/3/issue/10001',
        fields: {
          summary: 'Detailed Issue',
          description: 'Full description',
          issuetype: { name: 'Bug', iconUrl: '' },
          status: { name: 'Done', statusCategory: { key: 'done', name: 'Done' } },
          priority: { name: 'Critical' },
          assignee: { displayName: 'Alice', emailAddress: 'alice@test.com' },
          reporter: { displayName: 'Bob', emailAddress: 'bob@test.com' },
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-05T00:00:00Z',
          resolutiondate: '2025-01-04T00:00:00Z',
          labels: ['bug', 'critical'],
          components: [{ name: 'Frontend' }, { name: 'Backend' }],
          fixVersions: [],
          attachment: [
            {
              id: 'a1',
              filename: 'screenshot.png',
              mimeType: 'image/png',
              size: 2048,
              created: '2025-01-02T00:00:00Z',
            },
          ],
          comment: {
            total: 1,
            comments: [
              {
                id: 'c1',
                author: { displayName: 'Alice' },
                body: 'Fixed it',
                created: '2025-01-03T00:00:00Z',
                updated: '2025-01-03T00:00:00Z',
              },
            ],
          },
        },
      };
      mockFetch.mockResolvedValueOnce(okResponse(issue));

      const result = await adapter.fetchIssueDetails(jiraConfig, 'TEST-123');

      expect(result.type).toBe('jira_issue');
      expect(result.sourceId).toBe('jira-issue-TEST-123');
      expect(result.metadata.resourceType).toBe('issue_detail');
      expect(result.data.key).toBe('TEST-123');
      expect(result.data.components).toEqual(['Frontend', 'Backend']);
      expect(result.data.attachments).toEqual([
        {
          id: 'a1',
          filename: 'screenshot.png',
          mimeType: 'image/png',
          size: 2048,
          created: '2025-01-02T00:00:00Z',
        },
      ]);
      expect(result.data.comments).toEqual([
        { id: 'c1', author: 'Alice', body: 'Fixed it', created: '2025-01-03T00:00:00Z' },
      ]);
    });

    it('should request the issue endpoint with changelog and renderedFields expansion', async () => {
      const issue = {
        id: '10001',
        key: 'TEST-99',
        self: 'self',
        fields: {
          summary: 'S',
          description: null,
          issuetype: { name: 'Task', iconUrl: '' },
          status: { name: 'Open', statusCategory: { key: 'new', name: 'To Do' } },
          priority: null,
          assignee: null,
          reporter: { displayName: 'R', emailAddress: 'r@t.com' },
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          resolutiondate: null,
          labels: [],
          components: [],
          fixVersions: [],
        },
      };
      mockFetch.mockResolvedValueOnce(okResponse(issue));

      await adapter.fetchIssueDetails(jiraConfig, 'TEST-99');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/issue/TEST-99');
      expect(calledUrl).toContain('expand=changelog,renderedFields');
    });
  });

  // =========================================================================
  // 8. fetchSprints
  // =========================================================================
  describe('fetchSprints', () => {
    const sprintData = {
      values: [
        {
          id: 1,
          self: 'https://test.atlassian.net/rest/agile/1.0/sprint/1',
          state: 'active',
          name: 'Sprint 1',
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-14T00:00:00Z',
          completeDate: null,
          originBoardId: 10,
          goal: 'Deliver MVP',
        },
        {
          id: 2,
          self: 'https://test.atlassian.net/rest/agile/1.0/sprint/2',
          state: 'closed',
          name: 'Sprint 0',
          startDate: '2024-12-01T00:00:00Z',
          endDate: '2024-12-14T00:00:00Z',
          completeDate: '2024-12-15T00:00:00Z',
          originBoardId: 10,
          goal: 'Setup',
        },
      ],
    };

    it('should fetch sprints for a board and map to evidence results', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(sprintData));

      const results = await adapter.fetchSprints(jiraConfig, 10);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('jira_sprint');
      expect(results[0].sourceId).toBe('jira-sprint-1');
      expect(results[0].data.name).toBe('Sprint 1');
      expect(results[0].data.state).toBe('active');
      expect(results[0].data.goal).toBe('Deliver MVP');
      expect(results[0].data.boardId).toBe(10);
      expect(results[0].metadata.provider).toBe('jira');
      expect(results[0].metadata.boardId).toBe(10);
      expect(results[0].metadata.resourceType).toBe('sprint');
    });

    it('should include state filter in the URL when provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ values: [] }));

      await adapter.fetchSprints(jiraConfig, 5, { state: 'active' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('state=active');
    });

    it('should not include state filter when not provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ values: [] }));

      await adapter.fetchSprints(jiraConfig, 5);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('state=');
    });

    it('should use the agile API base URL', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ values: [] }));

      await adapter.fetchSprints(jiraConfig, 5);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/rest/agile/1.0/board/5/sprint');
    });

    it('should handle sprint with completeDate for timestamp', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          values: [
            {
              id: 3,
              self: 'self',
              state: 'closed',
              name: 'Done Sprint',
              startDate: '2025-01-01T00:00:00Z',
              endDate: '2025-01-14T00:00:00Z',
              completeDate: '2025-01-13T00:00:00Z',
              originBoardId: 1,
            },
          ],
        }),
      );

      const results = await adapter.fetchSprints(jiraConfig, 1);

      // completeDate is first in the fallback chain
      expect(results[0].timestamp).toEqual(new Date('2025-01-13T00:00:00Z'));
    });
  });

  // =========================================================================
  // 9. fetchProject
  // =========================================================================
  describe('fetchProject', () => {
    const projectResponse = {
      id: '10000',
      key: 'TEST',
      name: 'Test Project',
      self: 'https://test.atlassian.net/rest/api/3/project/10000',
      projectTypeKey: 'software',
      style: 'classic',
      isPrivate: false,
      description: 'A test project',
      lead: { displayName: 'Lead Person', emailAddress: 'lead@test.com' },
    };

    it('should fetch and map a Jira project', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(projectResponse));

      const result = await adapter.fetchProject(jiraConfig, 'TEST');

      expect(result.type).toBe('jira_project');
      expect(result.sourceId).toBe('jira-project-TEST');
      expect(result.sourceUrl).toBe('https://test.atlassian.net/browse/TEST');
      expect(result.data.id).toBe('10000');
      expect(result.data.key).toBe('TEST');
      expect(result.data.name).toBe('Test Project');
      expect(result.data.description).toBe('A test project');
      expect(result.data.projectType).toBe('software');
      expect(result.data.style).toBe('classic');
      expect(result.data.isPrivate).toBe(false);
      expect(result.data.lead).toBe('Lead Person');
      expect(result.data.leadEmail).toBe('lead@test.com');
      expect(result.metadata.provider).toBe('jira');
      expect(result.metadata.resourceType).toBe('project');
    });

    it('should call the correct project endpoint', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(projectResponse));

      await adapter.fetchProject(jiraConfig, 'MYPROJ');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/rest/api/3/project/MYPROJ');
    });
  });

  // =========================================================================
  // 10. searchPages
  // =========================================================================
  describe('searchPages', () => {
    const searchResult = {
      results: [makeConfluencePage()],
      start: 0,
      limit: 25,
      size: 1,
      totalSize: 1,
    };

    it('should search with CQL when cql option is provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(searchResult));

      const results = await adapter.searchPages(confluenceConfig, {
        cql: 'type = page AND space = TEST',
      });

      expect(results).toHaveLength(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/content/search');
      expect(calledUrl).toContain(encodeURIComponent('type = page AND space = TEST'));
    });

    it('should build CQL from query when query option is provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(searchResult));

      await adapter.searchPages(confluenceConfig, { query: 'architecture' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/content/search');
      expect(calledUrl).toContain(encodeURIComponent(`space = TEST AND text ~ "architecture"`));
    });

    it('should use content endpoint with spaceKey when neither cql nor query is provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(searchResult));

      await adapter.searchPages(confluenceConfig);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/content?spaceKey=TEST');
      expect(calledUrl).not.toContain('/search');
    });

    it('should map Confluence page to evidence result correctly', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(searchResult));

      const results = await adapter.searchPages(confluenceConfig, { cql: 'space = TEST' });

      const r = results[0];
      expect(r.type).toBe('confluence_page');
      expect(r.sourceId).toBe('confluence-page-12345');
      expect(r.sourceUrl).toBe('https://test.atlassian.net/wiki/spaces/TEST/pages/12345/Test+Page');
      expect(r.data.id).toBe('12345');
      expect(r.data.title).toBe('Test Page');
      expect(r.data.type).toBe('page');
      expect(r.data.status).toBe('current');
      expect(r.data.spaceKey).toBe('TEST');
      expect(r.data.spaceName).toBe('Test Space');
      expect(r.data.version).toBe(3);
      expect(r.data.versionDate).toBe('2025-06-01T00:00:00Z');
      expect(r.data.versionAuthor).toBe('Author');
      expect(r.data.ancestors).toEqual([{ id: '100', title: 'Parent' }]);
      expect(r.data.childPageCount).toBe(1);
      expect(r.data.attachmentCount).toBe(1);
      expect(r.data.content).toBe('<p>Hello</p>');
      expect(r.metadata.provider).toBe('confluence');
      expect(r.metadata.spaceKey).toBe('TEST');
      expect(r.metadata.resourceType).toBe('page');
    });

    it('should use the Confluence API base URL', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 25, size: 0, totalSize: 0 }),
      );

      await adapter.searchPages(confluenceConfig);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/wiki/rest/api/');
    });

    it('should return empty array when no pages found', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 25, size: 0, totalSize: 0 }),
      );

      const results = await adapter.searchPages(confluenceConfig, { cql: 'space = EMPTY' });

      expect(results).toEqual([]);
    });
  });

  // =========================================================================
  // 11. fetchPage
  // =========================================================================
  describe('fetchPage', () => {
    it('should fetch a single Confluence page by ID', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      const result = await adapter.fetchPage(confluenceConfig, '12345');

      expect(result.type).toBe('confluence_page');
      expect(result.sourceId).toBe('confluence-page-12345');
      expect(result.data.title).toBe('Test Page');
    });

    it('should request the content endpoint with default expand parameters', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.fetchPage(confluenceConfig, '99999');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/content/99999');
      expect(calledUrl).toContain('expand=');
      expect(calledUrl).toContain('body.storage');
      expect(calledUrl).toContain('body.view');
      expect(calledUrl).toContain('version');
      expect(calledUrl).toContain('ancestors');
    });

    it('should use custom expand parameters when provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.fetchPage(confluenceConfig, '12345', ['space', 'version']);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('expand=space,version');
    });

    it('should fall back to body.view.value when body.storage.value is absent', async () => {
      const page = makeConfluencePage({
        body: { view: { value: '<p>View content</p>' } },
      });
      mockFetch.mockResolvedValueOnce(okResponse(page));

      const result = await adapter.fetchPage(confluenceConfig, '12345');

      expect(result.data.content).toBe('<p>View content</p>');
    });
  });

  // =========================================================================
  // 12. fetchPagesByLabel
  // =========================================================================
  describe('fetchPagesByLabel', () => {
    it('should search pages with a CQL label filter', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          results: [makeConfluencePage()],
          start: 0,
          limit: 25,
          size: 1,
          totalSize: 1,
        }),
      );

      const results = await adapter.fetchPagesByLabel(confluenceConfig, 'architecture');

      expect(results).toHaveLength(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain(encodeURIComponent('space = TEST AND label = "architecture"'));
    });

    it('should pass custom limit and start options', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 10, limit: 5, size: 0, totalSize: 0 }),
      );

      await adapter.fetchPagesByLabel(confluenceConfig, 'docs', { limit: 5, start: 10 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('limit=5');
      expect(calledUrl).toContain('start=10');
    });
  });

  // =========================================================================
  // 13. fetchChildPages
  // =========================================================================
  describe('fetchChildPages', () => {
    it('should fetch child pages of a parent page', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          results: [makeConfluencePage({ id: '200', title: 'Child Page' })],
          start: 0,
          limit: 25,
          size: 1,
          totalSize: 1,
        }),
      );

      const results = await adapter.fetchChildPages(confluenceConfig, '100');

      expect(results).toHaveLength(1);
      expect(results[0].data.title).toBe('Child Page');
    });

    it('should use the child page endpoint', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 25, size: 0, totalSize: 0 }),
      );

      await adapter.fetchChildPages(confluenceConfig, '100', { limit: 10, start: 5 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/content/100/child/page');
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('start=5');
    });
  });

  // =========================================================================
  // 14. syncPage
  // =========================================================================
  describe('syncPage', () => {
    const newPage = makeConfluencePage({ id: '555', title: 'New Page' });

    it('should create a new page when existingPageId is not provided', async () => {
      // POST /content for new page
      mockFetch.mockResolvedValueOnce(okResponse(newPage));

      const result = await adapter.syncPage(confluenceConfig, {
        title: 'New Page',
        content: '<p>New content</p>',
        parentId: '100',
      });

      expect(result.type).toBe('confluence_page');
      expect(result.data.title).toBe('New Page');

      // Verify POST was used
      const [, fetchOpts] = mockFetch.mock.calls[0];
      expect(fetchOpts.method).toBe('POST');

      // Verify body contains correct structure
      const body = JSON.parse(fetchOpts.body);
      expect(body.type).toBe('page');
      expect(body.title).toBe('New Page');
      expect(body.space.key).toBe('TEST');
      expect(body.ancestors).toEqual([{ id: '100' }]);
      expect(body.body.storage.value).toBe('<p>New content</p>');
    });

    it('should update an existing page when existingPageId is provided', async () => {
      const existingPage = makeConfluencePage({
        version: { number: 3, when: '2025-01-01T00:00:00Z', by: { displayName: 'Author' } },
      });
      const updatedPage = makeConfluencePage({
        version: { number: 4, when: '2025-01-02T00:00:00Z', by: { displayName: 'Author' } },
      });

      // GET existing page to read version number
      mockFetch.mockResolvedValueOnce(okResponse(existingPage));
      // PUT updated page
      mockFetch.mockResolvedValueOnce(okResponse(updatedPage));

      const result = await adapter.syncPage(confluenceConfig, {
        title: 'Updated Page',
        content: '<p>Updated content</p>',
        existingPageId: '12345',
      });

      expect(result.type).toBe('confluence_page');

      // First call: GET existing page
      expect(mockFetch.mock.calls[0][1].method).toBe('GET');
      const getUrl = mockFetch.mock.calls[0][0] as string;
      expect(getUrl).toContain('/content/12345');

      // Second call: PUT with incremented version
      expect(mockFetch.mock.calls[1][1].method).toBe('PUT');
      const putBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(putBody.version.number).toBe(4);
    });

    it('should add labels after creating a page', async () => {
      mockFetch
        .mockResolvedValueOnce(okResponse(newPage)) // POST /content
        .mockResolvedValueOnce(okResponse({})); // POST /content/{id}/label

      await adapter.syncPage(confluenceConfig, {
        title: 'Labeled Page',
        content: '<p>Content</p>',
        labels: ['docs', 'generated'],
      });

      // 2 calls: create page + add labels
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const labelUrl = mockFetch.mock.calls[1][0] as string;
      expect(labelUrl).toContain('/content/555/label');

      const labelBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(labelBody).toEqual([
        { prefix: 'global', name: 'docs' },
        { prefix: 'global', name: 'generated' },
      ]);
    });

    it('should not add labels when labels array is empty', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(newPage));

      await adapter.syncPage(confluenceConfig, {
        title: 'No Labels',
        content: '<p>Content</p>',
        labels: [],
      });

      // Only 1 call for page creation, no label call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not include ancestors when parentId is not provided', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(newPage));

      await adapter.syncPage(confluenceConfig, {
        title: 'Root Page',
        content: '<p>Content</p>',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.ancestors).toBeUndefined();
    });
  });

  // =========================================================================
  // 15. syncDocumentation
  // =========================================================================
  describe('syncDocumentation', () => {
    const documents = [
      {
        title: 'Architecture Overview',
        content: '# Architecture\n\nOverview of system architecture.',
        category: 'technical',
        labels: ['architecture'],
      },
      {
        title: 'User Guide',
        content: '## Getting Started\n\nHow to use the system.',
        category: 'user-docs',
        labels: ['guide'],
      },
    ];

    it('should sync new documents when no existing pages match', async () => {
      // searchPages call to find existing pages
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );

      // syncPage for doc 1 (POST /content)
      mockFetch.mockResolvedValueOnce(
        okResponse(makeConfluencePage({ id: '1001', title: 'Architecture Overview' })),
      );
      // addLabels for doc 1
      mockFetch.mockResolvedValueOnce(okResponse({}));

      // syncPage for doc 2 (POST /content)
      mockFetch.mockResolvedValueOnce(
        okResponse(makeConfluencePage({ id: '1002', title: 'User Guide' })),
      );
      // addLabels for doc 2
      mockFetch.mockResolvedValueOnce(okResponse({}));

      const result = await adapter.syncDocumentation(confluenceConfig, documents, 'parent-123');

      expect(result.synced).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('should update existing pages when title matches', async () => {
      // searchPages returns one existing page matching 'Architecture Overview'
      const existingPage = makeConfluencePage({ id: '1001', title: 'Architecture Overview' });
      mockFetch.mockResolvedValueOnce(
        okResponse({
          results: [existingPage],
          start: 0,
          limit: 100,
          size: 1,
          totalSize: 1,
        }),
      );

      // syncPage for doc 1 (existing) -> GET existing + PUT update
      mockFetch.mockResolvedValueOnce(okResponse(existingPage)); // GET for version
      mockFetch.mockResolvedValueOnce(
        okResponse(makeConfluencePage({ id: '1001', title: 'Architecture Overview' })),
      ); // PUT
      // addLabels for doc 1
      mockFetch.mockResolvedValueOnce(okResponse({}));

      // syncPage for doc 2 (new) -> POST
      mockFetch.mockResolvedValueOnce(
        okResponse(makeConfluencePage({ id: '1002', title: 'User Guide' })),
      );
      // addLabels for doc 2
      mockFetch.mockResolvedValueOnce(okResponse({}));

      const result = await adapter.syncDocumentation(confluenceConfig, documents, 'parent-123');

      expect(result.synced).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('should collect errors for individual document sync failures', async () => {
      // searchPages returns empty
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );

      // Doc 1 fails
      mockFetch.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'));

      // Doc 2 succeeds
      mockFetch.mockResolvedValueOnce(
        okResponse(makeConfluencePage({ id: '1002', title: 'User Guide' })),
      );
      // addLabels for doc 2
      mockFetch.mockResolvedValueOnce(okResponse({}));

      const result = await adapter.syncDocumentation(confluenceConfig, documents, 'parent-123');

      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to sync "Architecture Overview"');
    });

    it('should add quiz2biz-generated and category labels to each page', async () => {
      // searchPages
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );

      // syncPage for doc 1
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage({ id: '1001' })));
      // addLabels for doc 1
      mockFetch.mockResolvedValueOnce(okResponse({}));

      // Only sync one document to simplify
      const singleDoc = [documents[0]];
      await adapter.syncDocumentation(confluenceConfig, singleDoc, 'parent-123');

      // The label POST is the 3rd fetch call (index 2)
      const labelBody = JSON.parse(mockFetch.mock.calls[2][1].body);
      const labelNames = labelBody.map((l: { name: string }) => l.name);
      expect(labelNames).toContain('architecture');
      expect(labelNames).toContain('quiz2biz-generated');
      expect(labelNames).toContain('technical');
    });

    it('should handle empty documents array', async () => {
      // searchPages
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );

      const result = await adapter.syncDocumentation(confluenceConfig, [], 'parent-123');

      expect(result.synced).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  // =========================================================================
  // 16. wrapInConfluenceStorage (private, tested through syncDocumentation)
  // =========================================================================
  describe('wrapInConfluenceStorage', () => {
    // wrapInConfluenceStorage is called inside syncDocumentation. We verify
    // the content body sent to the Confluence API after conversion.

    it('should convert markdown headings to HTML', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.syncDocumentation(
        confluenceConfig,
        [
          {
            title: 'Test',
            content: '# Heading 1\n## Heading 2\n### Heading 3',
            category: 'test',
            labels: [],
          },
        ],
        'parent-1',
      );

      // The syncPage POST is the 2nd call (index 1)
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      const storageValue = body.body.storage.value;
      expect(storageValue).toContain('<h1>');
      expect(storageValue).toContain('<h2>');
      expect(storageValue).toContain('<h3>');
    });

    it('should convert bold markdown to <strong>', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.syncDocumentation(
        confluenceConfig,
        [{ title: 'Test', content: '**bold text**', category: 'test', labels: [] }],
        'parent-1',
      );

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.body.storage.value).toContain('<strong>bold text</strong>');
    });

    it('should convert italic markdown to <em>', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.syncDocumentation(
        confluenceConfig,
        [{ title: 'Test', content: '*italic text*', category: 'test', labels: [] }],
        'parent-1',
      );

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.body.storage.value).toContain('<em>italic text</em>');
    });

    it('should convert inline code markdown to <code>', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.syncDocumentation(
        confluenceConfig,
        [{ title: 'Test', content: '`code snippet`', category: 'test', labels: [] }],
        'parent-1',
      );

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.body.storage.value).toContain('<code>code snippet</code>');
    });

    it('should convert list items to <li> elements', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.syncDocumentation(
        confluenceConfig,
        [{ title: 'Test', content: '- Item 1\n- Item 2', category: 'test', labels: [] }],
        'parent-1',
      );

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.body.storage.value).toContain('<li>Item 1</li>');
      expect(body.body.storage.value).toContain('<li>Item 2</li>');
    });

    it('should wrap output in <p> tags', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ results: [], start: 0, limit: 100, size: 0, totalSize: 0 }),
      );
      mockFetch.mockResolvedValueOnce(okResponse(makeConfluencePage()));

      await adapter.syncDocumentation(
        confluenceConfig,
        [{ title: 'Test', content: 'Simple text', category: 'test', labels: [] }],
        'parent-1',
      );

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.body.storage.value).toMatch(/^<p>.*<\/p>$/);
    });
  });

  // =========================================================================
  // 17. ingestAllEvidence
  // =========================================================================
  describe('ingestAllEvidence', () => {
    const projectResponse = {
      id: '10000',
      key: 'TEST',
      name: 'Test Project',
      self: 'https://test.atlassian.net/rest/api/3/project/10000',
      projectTypeKey: 'software',
      style: 'classic',
      isPrivate: false,
      lead: { displayName: 'Lead', emailAddress: 'lead@test.com' },
    };

    const issuesResponse = {
      issues: [
        {
          id: '10001',
          key: 'TEST-1',
          self: 'self',
          fields: {
            summary: 'Issue 1',
            description: null,
            issuetype: { name: 'Task', iconUrl: '' },
            status: { name: 'Open', statusCategory: { key: 'new', name: 'To Do' } },
            priority: null,
            assignee: null,
            reporter: { displayName: 'R', emailAddress: 'r@t.com' },
            created: '2025-01-01T00:00:00Z',
            updated: '2025-01-01T00:00:00Z',
            resolutiondate: null,
            labels: [],
            components: [],
            fixVersions: [],
          },
        },
        {
          id: '10002',
          key: 'TEST-2',
          self: 'self',
          fields: {
            summary: 'Issue 2',
            description: null,
            issuetype: { name: 'Task', iconUrl: '' },
            status: { name: 'Open', statusCategory: { key: 'new', name: 'To Do' } },
            priority: null,
            assignee: null,
            reporter: { displayName: 'R', emailAddress: 'r@t.com' },
            created: '2025-01-01T00:00:00Z',
            updated: '2025-01-01T00:00:00Z',
            resolutiondate: null,
            labels: [],
            components: [],
            fixVersions: [],
          },
        },
      ],
      total: 2,
    };

    it('should ingest Jira project and issues (without Confluence)', async () => {
      // fetchProject
      mockFetch.mockResolvedValueOnce(okResponse(projectResponse));
      // fetchIssues
      mockFetch.mockResolvedValueOnce(okResponse(issuesResponse));

      const result = await adapter.ingestAllEvidence(jiraConfig, null, 'session-1', 'TEST');

      expect(result.ingested).toBe(3); // 1 project + 2 issues
      expect(result.results.jira_project).toBe(1);
      expect(result.results.jira_issues).toBe(2);
      expect(result.results.confluence_pages).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should also ingest Confluence pages when confluenceConfig is provided', async () => {
      // fetchProject
      mockFetch.mockResolvedValueOnce(okResponse(projectResponse));
      // fetchIssues
      mockFetch.mockResolvedValueOnce(okResponse(issuesResponse));
      // searchPages
      mockFetch.mockResolvedValueOnce(
        okResponse({
          results: [makeConfluencePage()],
          start: 0,
          limit: 50,
          size: 1,
          totalSize: 1,
        }),
      );

      const result = await adapter.ingestAllEvidence(
        jiraConfig,
        confluenceConfig,
        'session-1',
        'TEST',
      );

      expect(result.ingested).toBe(4); // 1 project + 2 issues + 1 page
      expect(result.results.jira_project).toBe(1);
      expect(result.results.jira_issues).toBe(2);
      expect(result.results.confluence_pages).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should collect errors but continue ingesting other sources on partial failure', async () => {
      // fetchProject fails
      mockFetch.mockResolvedValueOnce(errorResponse(403, 'Forbidden'));
      // fetchIssues succeeds
      mockFetch.mockResolvedValueOnce(okResponse(issuesResponse));

      const result = await adapter.ingestAllEvidence(jiraConfig, null, 'session-1', 'TEST');

      expect(result.ingested).toBe(2); // only issues
      expect(result.results.jira_project).toBe(0);
      expect(result.results.jira_issues).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Jira project');
    });

    it('should handle all sources failing gracefully', async () => {
      // fetchProject fails
      mockFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error'));
      // fetchIssues fails
      mockFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error'));
      // searchPages fails
      mockFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error'));

      const result = await adapter.ingestAllEvidence(
        jiraConfig,
        confluenceConfig,
        'session-1',
        'TEST',
      );

      expect(result.ingested).toBe(0);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toContain('Jira project');
      expect(result.errors[1]).toContain('Jira issues');
      expect(result.errors[2]).toContain('Confluence pages');
    });

    it('should skip Confluence ingestion when confluenceConfig is null', async () => {
      // fetchProject
      mockFetch.mockResolvedValueOnce(okResponse(projectResponse));
      // fetchIssues
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      const result = await adapter.ingestAllEvidence(jiraConfig, null, 'session-1', 'TEST');

      // Only 2 fetch calls: project + issues (no Confluence)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.results.confluence_pages).toBe(0);
    });

    it('should pass projectKey to fetchIssues with maxResults=100', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(projectResponse));
      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      await adapter.ingestAllEvidence(jiraConfig, null, 'session-1', 'MYKEY');

      // Second call is fetchIssues
      const issuesUrl = mockFetch.mock.calls[1][0] as string;
      expect(issuesUrl).toContain(encodeURIComponent('project = MYKEY ORDER BY updated DESC'));
      expect(issuesUrl).toContain('maxResults=100');
    });
  });

  // =========================================================================
  // 18. calculateHash (private, verified through returned evidence hashes)
  // =========================================================================
  describe('calculateHash', () => {
    it('should produce consistent hashes for identical data', async () => {
      const issueData = {
        issues: [
          {
            id: '10001',
            key: 'TEST-1',
            self: 'self',
            fields: {
              summary: 'Issue',
              description: null,
              issuetype: { name: 'Task', iconUrl: '' },
              status: { name: 'Open', statusCategory: { key: 'new', name: 'To Do' } },
              priority: null,
              assignee: null,
              reporter: { displayName: 'R', emailAddress: 'r@t.com' },
              created: '2025-01-01T00:00:00Z',
              updated: '2025-01-01T00:00:00Z',
              resolutiondate: null,
              labels: [],
              components: [],
              fixVersions: [],
            },
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce(okResponse(issueData));
      const results1 = await adapter.fetchIssues(jiraConfig, { jql: 'key = TEST-1' });

      mockFetch.mockResolvedValueOnce(okResponse(issueData));
      const results2 = await adapter.fetchIssues(jiraConfig, { jql: 'key = TEST-1' });

      expect(results1[0].hash).toBe(results2[0].hash);
      expect(results1[0].hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should produce different hashes for different data', async () => {
      const makeIssueResponse = (summary: string) => ({
        issues: [
          {
            id: '10001',
            key: 'TEST-1',
            self: 'self',
            fields: {
              summary,
              description: null,
              issuetype: { name: 'Task', iconUrl: '' },
              status: { name: 'Open', statusCategory: { key: 'new', name: 'To Do' } },
              priority: null,
              assignee: null,
              reporter: { displayName: 'R', emailAddress: 'r@t.com' },
              created: '2025-01-01T00:00:00Z',
              updated: '2025-01-01T00:00:00Z',
              resolutiondate: null,
              labels: [],
              components: [],
              fixVersions: [],
            },
          },
        ],
        total: 1,
      });

      mockFetch.mockResolvedValueOnce(okResponse(makeIssueResponse('Summary A')));
      const results1 = await adapter.fetchIssues(jiraConfig, { jql: 'key = TEST-1' });

      mockFetch.mockResolvedValueOnce(okResponse(makeIssueResponse('Summary B')));
      const results2 = await adapter.fetchIssues(jiraConfig, { jql: 'key = TEST-1' });

      expect(results1[0].hash).not.toBe(results2[0].hash);
    });
  });

  // =========================================================================
  // 19. Edge cases & error boundary
  // =========================================================================
  describe('edge cases', () => {
    it('should handle HTTP 404 with proper exception', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(404, 'Not Found'));

      try {
        await adapter.fetchProject(jiraConfig, 'NONEXISTENT');
        fail('Expected exception');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(404);
      }
    });

    it('should handle HTTP 429 (rate limiting) with proper exception', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(429, 'Rate limit exceeded'));

      try {
        await adapter.fetchIssues(jiraConfig, { jql: 'project = TEST' });
        fail('Expected exception');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(429);
      }
    });

    it('should handle Confluence page with no body', async () => {
      const page = makeConfluencePage({ body: undefined });
      mockFetch.mockResolvedValueOnce(okResponse(page));

      const result = await adapter.fetchPage(confluenceConfig, '12345');

      expect(result.data.content).toBeUndefined();
    });

    it('should handle Confluence page with no children', async () => {
      const page = makeConfluencePage({ children: undefined });
      mockFetch.mockResolvedValueOnce(okResponse(page));

      const result = await adapter.fetchPage(confluenceConfig, '12345');

      expect(result.data.childPageCount).toBe(0);
      expect(result.data.attachmentCount).toBe(0);
    });

    it('should handle Confluence page with no version info for timestamp', async () => {
      const page = makeConfluencePage({ version: undefined });
      mockFetch.mockResolvedValueOnce(okResponse(page));

      const result = await adapter.fetchPage(confluenceConfig, '12345');

      // Falls back to new Date() when version.when is undefined
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.data.version).toBeUndefined();
    });

    it('should handle domain with leading/trailing whitespace', async () => {
      const whitespaceDomain = '  test.atlassian.net  ';
      const cfg = { ...jiraConfig, domain: whitespaceDomain };
      mockConfigService.get.mockReturnValue(whitespaceDomain);

      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      // Should succeed because both sides are trimmed
      const results = await adapter.fetchIssues(cfg, { jql: 'project = TEST' });
      expect(results).toEqual([]);
    });

    it('should handle domain case insensitively', async () => {
      const upperDomain = 'TEST.ATLASSIAN.NET';
      const cfg = { ...jiraConfig, domain: upperDomain };
      mockConfigService.get.mockReturnValue(upperDomain);

      mockFetch.mockResolvedValueOnce(okResponse({ issues: [], total: 0 }));

      const results = await adapter.fetchIssues(cfg, { jql: 'project = TEST' });
      expect(results).toEqual([]);
    });
  });
});
