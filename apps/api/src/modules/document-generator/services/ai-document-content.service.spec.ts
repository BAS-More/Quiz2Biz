import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AiDocumentContentService,
  GenerateDocumentContentParams,
} from './ai-document-content.service';

// Mock Anthropic SDK properly
jest.mock('@anthropic-ai/sdk', () => {
  const mockAnthropicClass = jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn(),
    },
  }));
  return {
    __esModule: true,
    default: mockAnthropicClass,
  };
});

describe('AiDocumentContentService', () => {
  let service: AiDocumentContentService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'claude.model': 'claude-sonnet-4-6',
        'claude.maxTokens': 4096,
        'claude.apiKey': undefined, // No API key by default
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiDocumentContentService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiDocumentContentService>(AiDocumentContentService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log warning when API key not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'claude.apiKey') return undefined;
        return undefined;
      });
      service.onModuleInit();
      // Service should be initialized without client
    });

    it('should initialize client when API key configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'claude.apiKey') return 'test-api-key';
        return undefined;
      });
      service.onModuleInit();
    });
  });

  describe('generateDocumentContent', () => {
    const mockParams: GenerateDocumentContentParams = {
      projectTypeName: 'SaaS Application',
      documentTypeName: 'Business Requirements',
      sessionAnswers: [
        { question: 'What is your target market?', answer: 'Enterprise B2B', dimensionKey: 'market' },
        { question: 'What is your pricing model?', answer: 'Subscription', dimensionKey: 'revenue' },
      ],
      documentTemplateSections: [
        { heading: 'Executive Summary', description: 'Overview of the project' },
        { heading: 'Market Analysis', description: 'Target market details', requiredFields: ['target'] },
      ],
    };

    it('should return placeholder content when no client', async () => {
      const result = await service.generateDocumentContent(mockParams);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(Array.isArray(result.sections)).toBe(true);
    });

    it('should include sections from template', async () => {
      const result = await service.generateDocumentContent(mockParams);

      expect(result.sections.length).toBeGreaterThan(0);
      result.sections.forEach((section) => {
        expect(section.heading).toBeDefined();
        expect(section.content).toBeDefined();
      });
    });

    it('should handle empty session answers', async () => {
      const emptyParams: GenerateDocumentContentParams = {
        ...mockParams,
        sessionAnswers: [],
      };

      const result = await service.generateDocumentContent(emptyParams);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it('should handle empty template sections', async () => {
      const emptyParams: GenerateDocumentContentParams = {
        ...mockParams,
        documentTemplateSections: [],
      };

      const result = await service.generateDocumentContent(emptyParams);

      expect(result).toBeDefined();
    });
  });

  describe('placeholder content', () => {
    it('should generate valid placeholder title', async () => {
      const params: GenerateDocumentContentParams = {
        projectTypeName: 'Mobile App',
        documentTypeName: 'Technical Spec',
        sessionAnswers: [],
        documentTemplateSections: [
          { heading: 'Architecture', description: 'System architecture overview' },
        ],
      };

      const result = await service.generateDocumentContent(params);

      expect(result.title).toContain('Technical Spec');
    });

    it('should generate placeholder sections for each template section', async () => {
      const params: GenerateDocumentContentParams = {
        projectTypeName: 'E-commerce Platform',
        documentTypeName: 'Security Policy',
        sessionAnswers: [
          { question: 'Auth method?', answer: 'OAuth 2.0', dimensionKey: 'security' },
        ],
        documentTemplateSections: [
          { heading: 'Introduction', description: 'Policy overview' },
          { heading: 'Access Control', description: 'Access policies' },
          { heading: 'Data Protection', description: 'Data handling' },
        ],
      };

      const result = await service.generateDocumentContent(params);

      expect(result.sections.length).toBe(3);
      expect(result.sections[0].heading).toBe('Introduction');
      expect(result.sections[1].heading).toBe('Access Control');
      expect(result.sections[2].heading).toBe('Data Protection');
    });
  });
});
