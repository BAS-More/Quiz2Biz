/**
 * AI Gateway Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AiGatewayService } from './ai-gateway.service';
import { PrismaService } from '@libs/database';
import { ClaudeAdapter, OpenAIAdapter } from './adapters';
import { CostTrackerService } from './services/cost-tracker.service';
import { AiGatewayRequest, AiGatewayResponse } from './interfaces';

describe('AiGatewayService', () => {
  let service: AiGatewayService;
  let prismaService: jest.Mocked<PrismaService>;
  let claudeAdapter: jest.Mocked<ClaudeAdapter>;
  let openAIAdapter: jest.Mocked<OpenAIAdapter>;
  let costTrackerService: jest.Mocked<CostTrackerService>;

  const mockProvider = {
    id: 'provider-1',
    slug: 'claude',
    name: 'Claude',
    apiEndpoint: 'https://api.anthropic.com',
    modelMap: { chat: 'claude-sonnet-4-20250514', extract: 'claude-sonnet-4-20250514' },
    isActive: true,
    isDefault: true,
    config: {},
  };

  const mockOpenAIProvider = {
    id: 'provider-2',
    slug: 'openai',
    name: 'OpenAI',
    apiEndpoint: 'https://api.openai.com',
    modelMap: { chat: 'gpt-4o', extract: 'gpt-4o' },
    isActive: true,
    isDefault: false,
    config: {},
  };

  const mockRequest: AiGatewayRequest = {
    taskType: 'chat',
    messages: [{ role: 'user', content: 'Hello' }],
    systemPrompt: 'You are a helpful assistant',
    projectId: 'project-123',
    userId: 'user-123',
  };

  const mockResponse: AiGatewayResponse = {
    content: 'Hello! How can I help you?',
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
    cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
    latencyMs: 300,
    finishReason: 'stop',
    usedFallback: false,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      aiProvider: {
        findMany: jest.fn(),
      },
    };

    const mockClaudeAdapter = {
      isAvailable: jest.fn(),
      generate: jest.fn(),
      generateStream: jest.fn(),
      setConfig: jest.fn(),
    };

    const mockOpenAIAdapter = {
      isAvailable: jest.fn(),
      generate: jest.fn(),
      generateStream: jest.fn(),
      setConfig: jest.fn(),
    };

    const mockCostTrackerService = {
      trackCost: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGatewayService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClaudeAdapter, useValue: mockClaudeAdapter },
        { provide: OpenAIAdapter, useValue: mockOpenAIAdapter },
        { provide: CostTrackerService, useValue: mockCostTrackerService },
      ],
    }).compile();

    service = module.get<AiGatewayService>(AiGatewayService);
    prismaService = module.get(PrismaService);
    claudeAdapter = module.get(ClaudeAdapter);
    openAIAdapter = module.get(OpenAIAdapter);
    costTrackerService = module.get(CostTrackerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should load provider configs on init', async () => {
      (prismaService.aiProvider.findMany as jest.Mock).mockResolvedValue([mockProvider]);

      await service.onModuleInit();

      expect(prismaService.aiProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
      expect(claudeAdapter.setConfig).toHaveBeenCalled();
    });

    it('should handle no providers gracefully', async () => {
      (prismaService.aiProvider.findMany as jest.Mock).mockResolvedValue([]);

      await service.onModuleInit();

      expect(prismaService.aiProvider.findMany).toHaveBeenCalled();
    });

    it('should handle database error gracefully', async () => {
      (prismaService.aiProvider.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('generate', () => {
    beforeEach(async () => {
      (prismaService.aiProvider.findMany as jest.Mock).mockResolvedValue([
        mockProvider,
        mockOpenAIProvider,
      ]);
      await service.loadProviderConfigs();
    });

    it('should generate response using preferred provider', async () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      claudeAdapter.generate.mockResolvedValue(mockResponse);

      const result = await service.generate({ ...mockRequest, provider: 'claude' });

      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.provider).toBe('claude');
      expect(costTrackerService.trackCost).toHaveBeenCalled();
    });

    it('should fallback to next provider on failure', async () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      claudeAdapter.generate.mockRejectedValue(new Error('Claude failed'));
      openAIAdapter.isAvailable.mockReturnValue(true);
      openAIAdapter.generate.mockResolvedValue({
        ...mockResponse,
        provider: 'openai',
        model: 'gpt-4o',
      });

      const result = await service.generate({ ...mockRequest, provider: 'claude' });

      expect(result.provider).toBe('openai');
      expect(result.usedFallback).toBe(true);
      expect(result.originalProvider).toBe('claude');
    });

    it('should throw error when all providers fail', async () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      claudeAdapter.generate.mockRejectedValue(new Error('Claude failed'));
      openAIAdapter.isAvailable.mockReturnValue(true);
      openAIAdapter.generate.mockRejectedValue(new Error('OpenAI failed'));

      await expect(service.generate(mockRequest)).rejects.toThrow('All providers failed');
    });

    it('should skip unavailable providers', async () => {
      claudeAdapter.isAvailable.mockReturnValue(false);
      openAIAdapter.isAvailable.mockReturnValue(true);
      openAIAdapter.generate.mockResolvedValue({
        ...mockResponse,
        provider: 'openai',
      });

      const result = await service.generate({ ...mockRequest, provider: 'claude' });

      expect(result.provider).toBe('openai');
    });

    it('should track cost after successful generation', async () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      claudeAdapter.generate.mockResolvedValue(mockResponse);

      await service.generate(mockRequest);

      expect(costTrackerService.trackCost).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-123',
          userId: 'user-123',
          provider: 'claude',
          inputTokens: 50,
          outputTokens: 20,
        }),
      );
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when all providers available', async () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      openAIAdapter.isAvailable.mockReturnValue(true);

      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.providers).toHaveLength(2);
      expect(result.providers.every((p) => p.available)).toBe(true);
    });

    it('should return degraded status when some providers unavailable', async () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      openAIAdapter.isAvailable.mockReturnValue(false);

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
    });

    it('should return unhealthy status when no providers available', async () => {
      claudeAdapter.isAvailable.mockReturnValue(false);
      openAIAdapter.isAvailable.mockReturnValue(false);

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should include timestamp', async () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      openAIAdapter.isAvailable.mockReturnValue(true);

      const result = await service.getHealth();

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getDefaultProvider', () => {
    it('should return default provider', async () => {
      (prismaService.aiProvider.findMany as jest.Mock).mockResolvedValue([mockProvider]);
      await service.loadProviderConfigs();

      const result = service.getDefaultProvider();

      expect(result).toBe('claude');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      claudeAdapter.isAvailable.mockReturnValue(true);
      openAIAdapter.isAvailable.mockReturnValue(false);

      const result = service.getAvailableProviders();

      expect(result).toContain('claude');
      expect(result).not.toContain('openai');
    });

    it('should return empty array when no providers available', () => {
      claudeAdapter.isAvailable.mockReturnValue(false);
      openAIAdapter.isAvailable.mockReturnValue(false);

      const result = service.getAvailableProviders();

      expect(result).toHaveLength(0);
    });
  });
});
