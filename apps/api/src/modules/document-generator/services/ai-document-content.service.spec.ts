import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AiDocumentContentService,
  GenerateDocumentContentParams,
  SessionAnswer,
} from './ai-document-content.service';

// ---------------------------------------------------------------------------
// Mock Anthropic SDK
// ---------------------------------------------------------------------------
const mockStream = {
  finalMessage: jest.fn(),
};
const mockMessagesStream = jest.fn().mockReturnValue(mockStream);

jest.mock('@anthropic-ai/sdk', () => {
  const MockAnthropicClass = jest.fn().mockImplementation(() => ({
    messages: {
      stream: mockMessagesStream,
    },
  }));
  return {
    __esModule: true,
    default: MockAnthropicClass,
  };
});

describe('AiDocumentContentService', () => {
  let service: AiDocumentContentService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        'claude.model': 'claude-sonnet-4-6',
        'claude.maxTokens': 4096,
        'claude.apiKey': undefined, // No API key by default
      };
      return config[key] ?? defaultValue;
    }),
  };

  /** Standard params reused across multiple tests */
  const baseParams: GenerateDocumentContentParams = {
    projectTypeName: 'SaaS Application',
    documentTypeName: 'Business Requirements',
    sessionAnswers: [
      { question: 'What is your target market?', answer: 'Enterprise B2B', dimensionKey: 'market' },
      { question: 'What is your pricing model?', answer: 'Subscription', dimensionKey: 'revenue' },
    ],
    documentTemplateSections: [
      { heading: 'Executive Summary', description: 'Overview of the project' },
      {
        heading: 'Market Analysis',
        description: 'Target market details',
        requiredFields: ['target', 'size'],
      },
    ],
  };

  beforeEach(async () => {
    // Reset to no-API-key default
    mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        'claude.model': 'claude-sonnet-4-6',
        'claude.maxTokens': 4096,
        'claude.apiKey': undefined,
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiDocumentContentService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiDocumentContentService>(AiDocumentContentService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // onModuleInit
  // ---------------------------------------------------------------------------
  describe('onModuleInit', () => {
    it('should log warning when API key not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'claude.apiKey') {
          return undefined;
        }
        return undefined;
      });
      // Should not throw
      service.onModuleInit();
    });

    it('should initialize Anthropic client when API key is configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'claude.apiKey') {
          return 'test-api-key';
        }
        return undefined;
      });
      // Should not throw
      service.onModuleInit();
    });
  });

  // ---------------------------------------------------------------------------
  // generateDocumentContent — no client (placeholder path)
  // ---------------------------------------------------------------------------
  describe('generateDocumentContent (no client)', () => {
    it('should return placeholder content when no client is available', async () => {
      const result = await service.generateDocumentContent(baseParams);

      expect(result).toBeDefined();
      expect(result.title).toContain('Business Requirements');
      expect(result.title).toContain('SaaS Application');
      expect(result.sections).toBeDefined();
      expect(Array.isArray(result.sections)).toBe(true);
    });

    it('should include all template sections in placeholder output', async () => {
      const result = await service.generateDocumentContent(baseParams);

      expect(result.sections.length).toBe(2);
      expect(result.sections[0].heading).toBe('Executive Summary');
      expect(result.sections[1].heading).toBe('Market Analysis');
    });

    it('should include section content in each placeholder section', async () => {
      const result = await service.generateDocumentContent(baseParams);

      result.sections.forEach((section) => {
        expect(section.heading).toBeDefined();
        expect(section.content).toBeDefined();
        expect(section.content.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty session answers', async () => {
      const params: GenerateDocumentContentParams = {
        ...baseParams,
        sessionAnswers: [],
      };

      const result = await service.generateDocumentContent(params);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.summary).toContain('0 questionnaire responses');
    });

    it('should handle empty template sections', async () => {
      const params: GenerateDocumentContentParams = {
        ...baseParams,
        documentTemplateSections: [],
      };

      const result = await service.generateDocumentContent(params);

      expect(result).toBeDefined();
      expect(result.sections.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // generateDocumentContent — with client (Claude API path)
  // ---------------------------------------------------------------------------
  describe('generateDocumentContent (with client)', () => {
    beforeEach(() => {
      // Configure API key so client gets initialized
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'claude.model': 'claude-sonnet-4-6',
          'claude.maxTokens': 4096,
          'claude.apiKey': 'test-api-key',
        };
        return config[key] ?? defaultValue;
      });

      // Re-create service with API key
      service = new AiDocumentContentService(mockConfigService as unknown as ConfigService);
      service.onModuleInit();
    });

    it('should call Claude API and return parsed content on valid JSON response', async () => {
      const validResponse = {
        title: 'Business Requirements for SaaS Application',
        sections: [
          { heading: 'Executive Summary', content: 'The SaaS application targets enterprise B2B.' },
          { heading: 'Market Analysis', content: 'Market size is estimated at $5B TAM.' },
        ],
        summary: 'This document outlines business requirements for a SaaS Application.',
      };

      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(validResponse) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(mockMessagesStream).toHaveBeenCalledTimes(1);
      expect(result.title).toBe('Business Requirements for SaaS Application');
      expect(result.sections.length).toBe(2);
      expect(result.summary).toBe(
        'This document outlines business requirements for a SaaS Application.',
      );
    });

    it('should fall back to placeholder when Claude returns empty response', async () => {
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: '' }],
      });

      const result = await service.generateDocumentContent(baseParams);

      // Should get placeholder content
      expect(result.title).toContain('Business Requirements');
      expect(result.title).toContain('SaaS Application');
    });

    it('should fall back to placeholder when Claude returns no text block', async () => {
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'thinking', thinking: 'some thinking' }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.title).toContain('Business Requirements');
    });

    it('should fall back to placeholder when API throws an error', async () => {
      mockMessagesStream.mockReturnValueOnce({
        finalMessage: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
      });

      const result = await service.generateDocumentContent(baseParams);

      // Should get placeholder content, not throw
      expect(result.title).toContain('Business Requirements');
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should fall back to placeholder when stream() itself throws', async () => {
      mockMessagesStream.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.title).toContain('Business Requirements');
    });

    it('should pass correct model and maxTokens to the stream call', async () => {
      const validResponse = {
        title: 'Test',
        sections: [{ heading: 'Intro', content: 'Content' }],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(validResponse) }],
      });

      await service.generateDocumentContent(baseParams);

      expect(mockMessagesStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
        }),
      );
    });

    it('should enable thinking in the stream call', async () => {
      const validResponse = {
        title: 'Test',
        sections: [{ heading: 'Intro', content: 'Content' }],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(validResponse) }],
      });

      await service.generateDocumentContent(baseParams);

      expect(mockMessagesStream).toHaveBeenCalledWith(
        expect.objectContaining({
          thinking: { type: 'enabled', budget_tokens: 2048 },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // parseGeneratedContent (exercised through generateDocumentContent with client)
  // ---------------------------------------------------------------------------
  describe('parseGeneratedContent (via generateDocumentContent)', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'claude.model': 'claude-sonnet-4-6',
          'claude.maxTokens': 4096,
          'claude.apiKey': 'test-api-key',
        };
        return config[key] ?? defaultValue;
      });
      service = new AiDocumentContentService(mockConfigService as unknown as ConfigService);
      service.onModuleInit();
    });

    it('should parse valid JSON with all fields', async () => {
      const response = {
        title: 'Valid Document',
        sections: [
          { heading: 'Section A', content: 'Content A' },
          { heading: 'Section B', content: 'Content B' },
        ],
        summary: 'A valid summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.title).toBe('Valid Document');
      expect(result.sections.length).toBe(2);
      expect(result.summary).toBe('A valid summary');
    });

    it('should fall back to placeholder on invalid JSON', async () => {
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.title).toContain('Business Requirements');
    });

    it('should fall back to placeholder when title is missing', async () => {
      const response = {
        sections: [{ heading: 'A', content: 'B' }],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      // Missing title => placeholder
      expect(result.title).toContain('SaaS Application');
    });

    it('should fall back to placeholder when sections is not an array', async () => {
      const response = {
        title: 'Doc',
        sections: 'not an array',
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.title).toContain('Business Requirements');
    });

    it('should fall back to placeholder when summary is missing', async () => {
      const response = {
        title: 'Doc',
        sections: [{ heading: 'A', content: 'B' }],
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      // Missing summary => placeholder
      expect(result.title).toContain('Business Requirements');
    });

    it('should filter out sections with empty heading', async () => {
      const response = {
        title: 'Doc with bad sections',
        sections: [
          { heading: '', content: 'Content without heading' },
          { heading: 'Valid Section', content: 'Valid content' },
        ],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.sections.length).toBe(1);
      expect(result.sections[0].heading).toBe('Valid Section');
    });

    it('should filter out sections with empty content', async () => {
      const response = {
        title: 'Doc',
        sections: [
          { heading: 'Empty Content', content: '' },
          { heading: 'Valid', content: 'Has content' },
        ],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.sections.length).toBe(1);
      expect(result.sections[0].heading).toBe('Valid');
    });

    it('should filter out sections with non-string heading', async () => {
      const response = {
        title: 'Doc',
        sections: [
          { heading: 123, content: 'Content' },
          { heading: 'Valid', content: 'Valid' },
        ],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      expect(result.sections.length).toBe(1);
    });

    it('should fall back to placeholder when all sections are invalid', async () => {
      const response = {
        title: 'Doc',
        sections: [
          { heading: '', content: '' },
          { heading: '', content: 'No heading' },
        ],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(response) }],
      });

      const result = await service.generateDocumentContent(baseParams);

      // All sections invalid => placeholder
      expect(result.title).toContain('Business Requirements');
    });
  });

  // ---------------------------------------------------------------------------
  // buildPlaceholderContent (exercised through generateDocumentContent)
  // ---------------------------------------------------------------------------
  describe('buildPlaceholderContent', () => {
    it('should include matching answers in section content when dimensionKey matches heading', async () => {
      const params: GenerateDocumentContentParams = {
        projectTypeName: 'E-commerce',
        documentTypeName: 'Business Plan',
        sessionAnswers: [
          { question: 'Target audience?', answer: 'SMBs', dimensionKey: 'market' },
          { question: 'Market size?', answer: '$10B', dimensionKey: 'market' },
          { question: 'Tech stack?', answer: 'React + Node', dimensionKey: 'technology' },
        ],
        documentTemplateSections: [
          { heading: 'Market Analysis', description: 'Analyze the market' },
          { heading: 'Technology Stack', description: 'Technology details' },
        ],
      };

      const result = await service.generateDocumentContent(params);

      // The "Market Analysis" heading should match answers with dimensionKey "market"
      const marketSection = result.sections.find((s) => s.heading === 'Market Analysis');
      expect(marketSection).toBeDefined();
      expect(marketSection!.content).toContain('Target audience?');
      expect(marketSection!.content).toContain('SMBs');
    });

    it('should include matching answers when question text contains heading', async () => {
      const params: GenerateDocumentContentParams = {
        projectTypeName: 'App',
        documentTypeName: 'Spec',
        sessionAnswers: [
          {
            question: 'Describe your security requirements',
            answer: 'MFA required',
            dimensionKey: 'general',
          },
        ],
        documentTemplateSections: [{ heading: 'Security', description: 'Security overview' }],
      };

      const result = await service.generateDocumentContent(params);

      const securitySection = result.sections.find((s) => s.heading === 'Security');
      expect(securitySection).toBeDefined();
      expect(securitySection!.content).toContain('MFA required');
    });

    it('should show no-match message when no answers are relevant', async () => {
      const params: GenerateDocumentContentParams = {
        projectTypeName: 'App',
        documentTypeName: 'Doc',
        sessionAnswers: [{ question: 'Budget?', answer: '$100K', dimensionKey: 'finance' }],
        documentTemplateSections: [
          { heading: 'User Experience', description: 'UX design guidelines' },
        ],
      };

      const result = await service.generateDocumentContent(params);

      const uxSection = result.sections.find((s) => s.heading === 'User Experience');
      expect(uxSection).toBeDefined();
      expect(uxSection!.content).toContain('No specific questionnaire responses matched');
    });

    it('should include requiredFields in placeholder content', async () => {
      const params: GenerateDocumentContentParams = {
        projectTypeName: 'App',
        documentTypeName: 'Doc',
        sessionAnswers: [],
        documentTemplateSections: [
          {
            heading: 'Budget',
            description: 'Financial planning',
            requiredFields: ['total_budget', 'monthly_burn_rate'],
          },
        ],
      };

      const result = await service.generateDocumentContent(params);

      const budgetSection = result.sections.find((s) => s.heading === 'Budget');
      expect(budgetSection).toBeDefined();
      expect(budgetSection!.content).toContain('total_budget');
      expect(budgetSection!.content).toContain('monthly_burn_rate');
      expect(budgetSection!.content).toContain('[To be completed]');
    });

    it('should cap relevant answers at 5 per section', async () => {
      const manyAnswers: SessionAnswer[] = Array.from({ length: 10 }, (_, i) => ({
        question: `Market question ${i + 1}`,
        answer: `Answer ${i + 1}`,
        dimensionKey: 'market',
      }));

      const params: GenerateDocumentContentParams = {
        projectTypeName: 'App',
        documentTypeName: 'Doc',
        sessionAnswers: manyAnswers,
        documentTemplateSections: [{ heading: 'Market', description: 'Market overview' }],
      };

      const result = await service.generateDocumentContent(params);

      const marketSection = result.sections.find((s) => s.heading === 'Market');
      expect(marketSection).toBeDefined();
      // Should contain first 5 answers but not 6th+
      expect(marketSection!.content).toContain('Market question 1');
      expect(marketSection!.content).toContain('Market question 5');
      expect(marketSection!.content).not.toContain('Market question 6');
    });

    it('should generate summary with answer count and project type', async () => {
      const params: GenerateDocumentContentParams = {
        projectTypeName: 'Mobile App',
        documentTypeName: 'Technical Spec',
        sessionAnswers: [
          { question: 'Q1', answer: 'A1', dimensionKey: 'general' },
          { question: 'Q2', answer: 'A2', dimensionKey: 'general' },
          { question: 'Q3', answer: 'A3', dimensionKey: 'general' },
        ],
        documentTemplateSections: [{ heading: 'Intro', description: 'Introduction' }],
      };

      const result = await service.generateDocumentContent(params);

      expect(result.summary).toContain('3 questionnaire responses');
      expect(result.summary).toContain('Mobile App');
      expect(result.summary).toContain('Technical Spec');
    });
  });

  // ---------------------------------------------------------------------------
  // formatSessionAnswers (exercised through prompt content)
  // ---------------------------------------------------------------------------
  describe('formatSessionAnswers (via generateDocumentContent with client)', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'claude.model': 'claude-sonnet-4-6',
          'claude.maxTokens': 4096,
          'claude.apiKey': 'test-api-key',
        };
        return config[key] ?? defaultValue;
      });
      service = new AiDocumentContentService(mockConfigService as unknown as ConfigService);
      service.onModuleInit();

      // Default: valid AI response so we can verify the prompt was constructed
      const validResponse = {
        title: 'Test',
        sections: [{ heading: 'A', content: 'B' }],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(validResponse) }],
      });
    });

    it('should handle empty session answers by including guidance text in prompt', async () => {
      const params: GenerateDocumentContentParams = {
        ...baseParams,
        sessionAnswers: [],
      };

      await service.generateDocumentContent(params);

      // Verify the stream was called with a user message
      expect(mockMessagesStream).toHaveBeenCalledTimes(1);
      const callArgs = mockMessagesStream.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('No questionnaire responses available');
    });

    it('should group answers by dimension in the prompt', async () => {
      const params: GenerateDocumentContentParams = {
        ...baseParams,
        sessionAnswers: [
          { question: 'Market size?', answer: '$5B', dimensionKey: 'market' },
          { question: 'Competitor?', answer: 'CompA', dimensionKey: 'market' },
          { question: 'Stack?', answer: 'React', dimensionKey: 'technology' },
        ],
      };

      await service.generateDocumentContent(params);

      const callArgs = mockMessagesStream.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;
      expect(userMessage).toContain('Dimension: market');
      expect(userMessage).toContain('Dimension: technology');
    });

    it('should include Q/A format in the prompt', async () => {
      await service.generateDocumentContent(baseParams);

      const callArgs = mockMessagesStream.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;
      expect(userMessage).toContain('Q: What is your target market?');
      expect(userMessage).toContain('A: Enterprise B2B');
    });
  });

  // ---------------------------------------------------------------------------
  // formatTemplateSections (exercised through prompt content)
  // ---------------------------------------------------------------------------
  describe('formatTemplateSections (via generateDocumentContent with client)', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'claude.model': 'claude-sonnet-4-6',
          'claude.maxTokens': 4096,
          'claude.apiKey': 'test-api-key',
        };
        return config[key] ?? defaultValue;
      });
      service = new AiDocumentContentService(mockConfigService as unknown as ConfigService);
      service.onModuleInit();

      const validResponse = {
        title: 'Test',
        sections: [{ heading: 'A', content: 'B' }],
        summary: 'Summary',
      };
      mockStream.finalMessage.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(validResponse) }],
      });
    });

    it('should include section headings and descriptions in prompt', async () => {
      await service.generateDocumentContent(baseParams);

      const callArgs = mockMessagesStream.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;
      expect(userMessage).toContain('Executive Summary');
      expect(userMessage).toContain('Overview of the project');
    });

    it('should include requiredFields when present', async () => {
      await service.generateDocumentContent(baseParams);

      const callArgs = mockMessagesStream.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;
      expect(userMessage).toContain('Required fields: target, size');
    });

    it('should handle sections without requiredFields', async () => {
      const params: GenerateDocumentContentParams = {
        ...baseParams,
        documentTemplateSections: [
          { heading: 'Introduction', description: 'Project introduction' },
        ],
      };

      await service.generateDocumentContent(params);

      const callArgs = mockMessagesStream.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;
      expect(userMessage).toContain('Introduction');
      expect(userMessage).not.toContain('Required fields');
    });

    it('should number sections sequentially in the prompt', async () => {
      const params: GenerateDocumentContentParams = {
        ...baseParams,
        documentTemplateSections: [
          { heading: 'First', description: 'First section' },
          { heading: 'Second', description: 'Second section' },
          { heading: 'Third', description: 'Third section' },
        ],
      };

      await service.generateDocumentContent(params);

      const callArgs = mockMessagesStream.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;
      expect(userMessage).toContain('1. **First**');
      expect(userMessage).toContain('2. **Second**');
      expect(userMessage).toContain('3. **Third**');
    });
  });
});
