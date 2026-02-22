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
      providers: [
        ClaudeAiService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
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
          if (key === 'claude.apiKey') {return undefined;}
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClaudeAiService,
          { provide: ConfigService, useValue: mockConfigNoKey },
        ],
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
          if (key === 'claude.apiKey') {return undefined;}
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClaudeAiService,
          { provide: ConfigService, useValue: mockConfigNoKey },
        ],
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
          if (key === 'claude.apiKey') {return undefined;}
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClaudeAiService,
          { provide: ConfigService, useValue: mockConfigNoKey },
        ],
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
          if (key === 'claude.apiKey') {return undefined;}
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClaudeAiService,
          { provide: ConfigService, useValue: mockConfigNoKey },
        ],
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
          if (key === 'claude.apiKey') {return undefined;}
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClaudeAiService,
          { provide: ConfigService, useValue: mockConfigNoKey },
        ],
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
          if (key === 'claude.apiKey') {return undefined;}
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClaudeAiService,
          { provide: ConfigService, useValue: mockConfigNoKey },
        ],
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
          if (key === 'claude.apiKey') {return undefined;}
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClaudeAiService,
          { provide: ConfigService, useValue: mockConfigNoKey },
        ],
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
  });
});
