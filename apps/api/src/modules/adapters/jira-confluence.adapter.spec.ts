import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { JiraConfluenceAdapter } from './jira-confluence.adapter';
import { PrismaService } from '@libs/database';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('JiraConfluenceAdapter', () => {
  let adapter: JiraConfluenceAdapter;
  let configService: ConfigService;

  const mockJiraConfig = {
    domain: 'test-org.atlassian.net',
    email: 'test@example.com',
    apiToken: 'test-api-token',
  };

  const mockConfluenceConfig = {
    ...mockJiraConfig,
    spaceKey: 'DOCS',
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JIRA_DOMAIN') {return 'test-org.atlassian.net';}
      return undefined;
    }),
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
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'JIRA_DOMAIN') {return 'test-org.atlassian.net';}
      return undefined;
    });
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('fetchIssues', () => {
    const mockIssues = {
      issues: [
        {
          id: '10001',
          key: 'TEST-123',
          self: 'https://test-org.atlassian.net/rest/api/3/issue/10001',
          fields: {
            summary: 'Test Issue',
            description: 'Test description',
            issuetype: { name: 'Story', iconUrl: 'https://...' },
            status: { name: 'In Progress', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
            priority: { name: 'High' },
            assignee: { displayName: 'John Doe', emailAddress: 'john@example.com' },
            reporter: { displayName: 'Jane Doe', emailAddress: 'jane@example.com' },
            created: '2025-01-01T00:00:00Z',
            updated: '2025-01-02T00:00:00Z',
            resolutiondate: null,
            labels: ['bug', 'urgent'],
            components: [{ name: 'Backend' }],
            fixVersions: [{ name: '1.0.0' }],
          },
        },
      ],
      total: 1,
    };

    it('should fetch issues with JQL query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssues,
      });

      const results = await adapter.fetchIssues(mockJiraConfig, { jql: 'project = TEST' });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('jira_issue');
      expect(results[0].sourceId).toBe('jira-issue-TEST-123');
      expect(results[0].data.summary).toBe('Test Issue');
      expect(results[0].metadata.provider).toBe('jira');
    });

    it('should throw HttpException on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(adapter.fetchIssues(mockJiraConfig, { jql: 'project = TEST' })).rejects.toThrow(HttpException);
    });

    it('should throw error when domain not configured', async () => {
      mockConfigService.get.mockReturnValue('');

      await expect(adapter.fetchIssues(mockJiraConfig, { jql: 'project = TEST' })).rejects.toThrow('JIRA_DOMAIN is not configured');
    });
  });

  describe('fetchSprints', () => {
    const mockSprints = {
      values: [
        {
          id: 1,
          self: 'https://test-org.atlassian.net/rest/agile/1.0/sprint/1',
          state: 'active',
          name: 'Sprint 1',
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-14T00:00:00Z',
          completeDate: null,
          originBoardId: 1,
          goal: 'Complete feature X',
        },
      ],
    };

    it('should fetch sprints for a board', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSprints,
      });

      const results = await adapter.fetchSprints(mockJiraConfig, 1);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('jira_sprint');
      expect(results[0].data.name).toBe('Sprint 1');
      expect(results[0].data.state).toBe('active');
    });
  });

  describe('fetchProject', () => {
    const mockProject = {
      id: '10000',
      key: 'TEST',
      name: 'Test Project',
      self: 'https://test-org.atlassian.net/rest/api/3/project/10000',
      projectTypeKey: 'software',
      style: 'classic',
      isPrivate: false,
      description: 'Test project description',
      lead: { displayName: 'Project Lead', emailAddress: 'lead@example.com' },
    };

    it('should fetch a single project', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      });

      const result = await adapter.fetchProject(mockJiraConfig, 'TEST');

      expect(result.type).toBe('jira_project');
      expect(result.data.name).toBe('Test Project');
      expect(result.data.key).toBe('TEST');
    });
  });

  describe('searchPages', () => {
    const mockPages = {
      results: [
        {
          id: '12345',
          type: 'page',
          status: 'current',
          title: 'Architecture Decision',
          space: { key: 'DOCS', name: 'Documentation' },
          body: {
            storage: { value: '<p>Architecture content</p>' },
          },
          version: {
            number: 3,
            when: '2025-01-02T00:00:00Z',
            by: { displayName: 'Editor' },
          },
          ancestors: [{ id: '12340', title: 'Parent Page' }],
          _links: {
            webui: '/spaces/DOCS/pages/12345/Architecture+Decision',
            self: 'https://test-org.atlassian.net/wiki/rest/api/content/12345',
          },
        },
      ],
      start: 0,
      limit: 25,
      size: 1,
      totalSize: 1,
    };

    it('should search Confluence pages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPages,
      });

      const results = await adapter.searchPages(mockConfluenceConfig, { query: 'architecture' });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('confluence_page');
      expect(results[0].data.title).toBe('Architecture Decision');
      expect(results[0].metadata.spaceKey).toBe('DOCS');
    });

    it('should support CQL queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPages,
      });

      const results = await adapter.searchPages(mockConfluenceConfig, { cql: 'space = DOCS' });

      expect(results).toHaveLength(1);
    });
  });

  describe('API authentication', () => {
    it('should use Basic auth with email and API token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [], total: 0 }),
      });

      await adapter.fetchIssues(mockJiraConfig, { jql: 'project = TEST' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        }),
      );
    });
  });

  describe('domain validation', () => {
    it('should validate domain matches configured JIRA_DOMAIN', async () => {
      mockConfigService.get.mockReturnValue('other-org.atlassian.net');

      await expect(
        adapter.fetchIssues({ ...mockJiraConfig, domain: 'malicious.com' }, { jql: 'project = TEST' }),
      ).rejects.toThrow();
    });
  });
});
