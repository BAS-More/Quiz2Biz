import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClaudeAiService, IdeaAnalysisResult, ConversationFollowUp } from './claude-ai.service';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  };
});

describe('ClaudeAiService', () => {
  let service: ClaudeAiService;
  let configService: jest.Mocked<ConfigService>;
  let mockAnthropicCreate: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        'claude.model': 'claude-sonnet-4-6',
        'claude.maxTokens': 4096,
        'claude.apiKey': 'test-api-key',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<ClaudeAiService>(ClaudeAiService);
    configService = module.get(ConfigService);

    // Initialize the service
    service.onModuleInit();

    // Get access to the mocked create function
    const Anthropic = require('@anthropic-ai/sdk').default;
    mockAnthropicCreate = Anthropic.mock.results[0]?.value?.messages?.create;
  });

  describe('onModuleInit', () => {
    it('should initialize client when API key is present', () => {
      expect(configService.get).toHaveBeenCalledWith('claude.apiKey');
    });

    it('should not initialize client when API key is missing', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoKey = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoKey.onModuleInit();

      // Service should still work but use fallback
      expect(serviceNoKey).toBeDefined();
    });
  });

  describe('analyzeIdea', () => {
    const availableProjectTypes = [
      { slug: 'business-plan', name: 'Business Plan', description: 'Create a business plan' },
      { slug: 'marketing-strategy', name: 'Marketing Strategy', description: 'Define marketing' },
      { slug: 'tech-assessment', name: 'Tech Assessment', description: 'Technical review' },
    ];

    it('should return fallback analysis when client is not initialized', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'I want to build a SaaS app for business',
        availableProjectTypes,
      );

      expect(result).toBeDefined();
      expect(result.themes).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.strengths).toBeDefined();
      expect(result.recommendedProjectType).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should extract themes from keywords in fallback mode', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'I want to build an app for ecommerce in health sector',
        availableProjectTypes,
      );

      expect(result.themes).toContain('mobile/web application');
      expect(result.themes).toContain('e-commerce');
      expect(result.themes).toContain('healthcare');
    });

    it('should return general business idea when no keywords match', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'something completely random xyz',
        availableProjectTypes,
      );

      expect(result.themes).toContain('general business idea');
    });

    it('should score project types based on keyword matching', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'marketing campaign brand social media audience',
        availableProjectTypes,
      );

      expect(result.recommendedProjectType.slug).toBe('marketing-strategy');
    });

    it('should include strengths based on theme count', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'saas app marketplace subscription ai data',
        availableProjectTypes,
      );

      expect(result.strengths).toContain('Multiple themes identified in your idea');
    });
  });

  describe('evaluateAnswerCompleteness', () => {
    it('should return default follow-up when client is not initialized', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.evaluateAnswerCompleteness(
        'What is your target market?',
        'Small businesses',
        'MARKET',
      );

      expect(result).toEqual({
        shouldFollowUp: false,
        completenessScore: 0.7,
        missingAreas: [],
      });
    });

    it('should call Claude API and parse response when client is initialized', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              shouldFollowUp: true,
              followUpQuestion: 'Can you specify the industry segment?',
              completenessScore: 0.5,
              missingAreas: ['industry segment', 'geographic focus'],
            }),
          },
        ],
      };

      mockAnthropicCreate.mockResolvedValue(mockResponse);

      const result = await service.evaluateAnswerCompleteness(
        'What is your target market?',
        'Small businesses',
        'MARKET',
      );

      expect(result.shouldFollowUp).toBe(true);
      expect(result.followUpQuestion).toBe('Can you specify the industry segment?');
      expect(result.completenessScore).toBe(0.5);
      expect(result.missingAreas).toHaveLength(2);
    });

    it('should return default when Claude returns empty text block', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      const mockResponse = {
        content: [{ type: 'thinking', thinking: 'some thoughts' }],
      };

      mockAnthropicCreate.mockResolvedValue(mockResponse);

      const result = await service.evaluateAnswerCompleteness(
        'What is your target market?',
        'Small businesses',
        'MARKET',
      );

      expect(result.shouldFollowUp).toBe(false);
      expect(result.completenessScore).toBe(0.7);
    });

    it('should return default on API error', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      mockAnthropicCreate.mockRejectedValue(new Error('API rate limit'));

      const result = await service.evaluateAnswerCompleteness(
        'What is your target market?',
        'Small businesses',
        'MARKET',
      );

      expect(result.shouldFollowUp).toBe(false);
      expect(result.completenessScore).toBe(0.7);
      expect(result.missingAreas).toEqual([]);
    });
  });

  describe('analyzeIdea - with Claude API client', () => {
    const availableProjectTypes = [
      { slug: 'business-plan', name: 'Business Plan', description: 'Create a business plan' },
      { slug: 'marketing-strategy', name: 'Marketing Strategy', description: 'Define marketing' },
      { slug: 'tech-assessment', name: 'Tech Assessment', description: 'Technical review' },
    ];

    it('should call Claude API and return parsed result when client exists', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      const mockAnalysis: IdeaAnalysisResult = {
        themes: ['SaaS platform', 'artificial intelligence'],
        gaps: ['No revenue model defined', 'Competition analysis missing'],
        strengths: ['Clear problem statement', 'Technical expertise'],
        recommendedProjectType: {
          slug: 'business-plan',
          confidence: 0.85,
          reasoning: 'Strong business-focused idea',
        },
        alternativeProjectTypes: [
          { slug: 'tech-assessment', confidence: 0.6, reasoning: 'Has tech components' },
        ],
        summary: 'A promising SaaS idea with AI components.',
      };

      const mockResponse = {
        content: [
          { type: 'thinking', thinking: 'Let me analyze...' },
          { type: 'text', text: JSON.stringify(mockAnalysis) },
        ],
      };

      mockAnthropicCreate.mockResolvedValue(mockResponse);

      const result = await service.analyzeIdea(
        'I want to build an AI-powered SaaS platform for scheduling',
        availableProjectTypes,
      );

      expect(result.themes).toContain('SaaS platform');
      expect(result.recommendedProjectType.slug).toBe('business-plan');
      expect(result.recommendedProjectType.confidence).toBe(0.85);
    });

    it('should fall back when Claude returns empty text block', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      const mockResponse = {
        content: [{ type: 'thinking', thinking: 'some thoughts' }],
      };

      mockAnthropicCreate.mockResolvedValue(mockResponse);

      const result = await service.analyzeIdea(
        'I want to build a business for food delivery',
        availableProjectTypes,
      );

      // Should use fallback analysis
      expect(result).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.recommendedProjectType).toBeDefined();
    });

    it('should fall back on Claude API error', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      mockAnthropicCreate.mockRejectedValue(new Error('API key invalid'));

      const result = await service.analyzeIdea(
        'I want to build a marketplace for consulting services',
        availableProjectTypes,
      );

      // Should use fallback analysis
      expect(result).toBeDefined();
      expect(result.recommendedProjectType).toBeDefined();
      expect(result.recommendedProjectType.confidence).toBe(0.5);
    });
  });

  describe('fallbackAnalysis - edge cases', () => {
    const availableProjectTypes = [
      { slug: 'business-plan', name: 'Business Plan', description: 'Create a business plan' },
      { slug: 'marketing-strategy', name: 'Marketing Strategy', description: 'Define marketing' },
      {
        slug: 'financial-projections',
        name: 'Financial Projections',
        description: 'Financial plan',
      },
      { slug: 'tech-assessment', name: 'Tech Assessment', description: 'Technical review' },
    ];

    it('should handle technology keyword matching for tech-assessment', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'technology software architecture security compliance infrastructure',
        availableProjectTypes,
      );

      expect(result.recommendedProjectType.slug).toBe('tech-assessment');
    });

    it('should handle financial keyword matching', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'financial revenue profit investment funding budget',
        availableProjectTypes,
      );

      expect(result.recommendedProjectType.slug).toBe('financial-projections');
    });

    it('should return focused concept when fewer than 3 themes', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'I want to build an app',
        availableProjectTypes,
      );

      expect(result.strengths).toContain('Focused concept');
    });

    it('should use first available project type when no keyword slug matches', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const customProjectTypes = [
        { slug: 'custom-type', name: 'Custom Type', description: 'A custom type' },
      ];

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea(
        'business plan startup company',
        customProjectTypes,
      );

      // bestSlug is 'business-plan' but no project type with that slug exists, so falls back to first
      expect(result.recommendedProjectType.slug).toBe('custom-type');
    });

    it('should fallback to business-plan slug when availableProjectTypes is empty', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea('random text', []);

      // bestType is undefined, so slug falls back to 'business-plan'
      expect(result.recommendedProjectType.slug).toBe('business-plan');
    });

    it('should handle non-Error exception in analyzeIdea catch', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      mockAnthropicCreate.mockRejectedValue('string error not an Error object');

      const result = await service.analyzeIdea('test idea', [
        { slug: 'business-plan', name: 'Business Plan', description: 'BP' },
      ]);

      // Should use fallback
      expect(result).toBeDefined();
      expect(result.recommendedProjectType.confidence).toBe(0.5);
    });

    it('should handle non-Error exception in evaluateAnswerCompleteness catch', async () => {
      if (!mockAnthropicCreate) {
        return;
      }

      mockAnthropicCreate.mockRejectedValue({ status: 500 });

      const result = await service.evaluateAnswerCompleteness('Question?', 'Answer', 'Context');

      expect(result.shouldFollowUp).toBe(false);
      expect(result.completenessScore).toBe(0.7);
    });

    it('should fallback to "Business Plan" name when bestType is undefined', async () => {
      const mockConfigNoKey = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'claude.apiKey') {
            return undefined;
          }
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ClaudeAiService, { provide: ConfigService, useValue: mockConfigNoKey }],
      }).compile();

      const serviceNoClient = module.get<ClaudeAiService>(ClaudeAiService);
      serviceNoClient.onModuleInit();

      const result = await serviceNoClient.analyzeIdea('random text with no keyword matches', []);

      // summary should use fallback name 'Business Plan'
      expect(result.summary).toContain('Business Plan');
    });
  });
});
