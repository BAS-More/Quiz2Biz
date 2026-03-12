import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';

describe('AiGatewayController', () => {
  let controller: AiGatewayController;
  let aiGatewayService: jest.Mocked<AiGatewayService>;

  const mockUser = { sub: 'user-123' };

  const mockResponse = {
    content: 'Hello! How can I help?',
    provider: 'claude' as const,
    model: 'claude-sonnet-4-20250514',
    usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
    cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
    latencyMs: 250,
    finishReason: 'stop' as const,
    usedFallback: false,
  };

  const mockRequest = {
    taskType: 'chat',
    messages: [{ role: 'user', content: 'Hello' }],
    systemPrompt: 'You are a helpful assistant',
    projectId: 'project-123',
  };

  beforeEach(async () => {
    const mockAiGatewayService = {
      generate: jest.fn(),
      generateStream: jest.fn(),
      getHealth: jest.fn(),
      getDefaultProvider: jest.fn(),
      getAvailableProviders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiGatewayController],
      providers: [{ provide: AiGatewayService, useValue: mockAiGatewayService }],
    }).compile();

    controller = module.get<AiGatewayController>(AiGatewayController);
    aiGatewayService = module.get(AiGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a response successfully', async () => {
      aiGatewayService.generate.mockResolvedValue(mockResponse);

      const result = await controller.generate(mockRequest as any, mockUser);

      expect(result).toEqual(mockResponse);
      expect(aiGatewayService.generate).toHaveBeenCalledWith({
        ...mockRequest,
        userId: 'user-123',
      });
    });

    it('should throw HttpException on service failure', async () => {
      aiGatewayService.generate.mockRejectedValue(new Error('Provider unavailable'));

      await expect(controller.generate(mockRequest as any, mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should return 500 status on error', async () => {
      aiGatewayService.generate.mockRejectedValue(new Error('All providers failed'));

      try {
        await controller.generate(mockRequest as any, mockUser);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });

    it('should handle non-Error thrown values', async () => {
      aiGatewayService.generate.mockRejectedValue('string error');

      await expect(controller.generate(mockRequest as any, mockUser)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('stream', () => {
    it('should set SSE headers and stream chunks', async () => {
      const chunks = [
        { content: 'Hello', done: false, provider: 'claude' },
        {
          content: '',
          done: true,
          provider: 'claude',
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        },
      ];

      async function* mockStream() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      aiGatewayService.generateStream.mockReturnValue(mockStream() as any);

      const writes: string[] = [];
      const mockReq = { on: jest.fn() } as any;
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn((data: string) => writes.push(data)),
        end: jest.fn(),
      } as any;

      await controller.stream(mockRequest as any, mockReq, mockRes, mockUser);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.end).toHaveBeenCalled();
      expect(writes.length).toBeGreaterThanOrEqual(2);
      expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should send error event on stream failure', async () => {
      async function* failingStream() {
        yield { content: '', done: false }; // yield before throw to satisfy require-yield
        throw new Error('Stream failed');
      }

      aiGatewayService.generateStream.mockReturnValue(failingStream() as any);

      const writes: string[] = [];
      const mockReq = { on: jest.fn() } as any;
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn((data: string) => writes.push(data)),
        end: jest.fn(),
      } as any;

      await controller.stream(mockRequest as any, mockReq, mockRes, mockUser);

      expect(writes.some((w) => w.includes('error'))).toBe(true);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const healthStatus = {
        status: 'healthy' as const,
        providers: [
          { provider: 'claude', available: true },
          { provider: 'openai', available: true },
        ],
        timestamp: new Date(),
      };
      aiGatewayService.getHealth.mockResolvedValue(healthStatus);

      const result = await controller.getHealth();

      expect(result).toEqual(healthStatus);
      expect(aiGatewayService.getHealth).toHaveBeenCalled();
    });
  });

  describe('getProviders', () => {
    it('should return default and available providers', async () => {
      aiGatewayService.getDefaultProvider.mockReturnValue('claude');
      aiGatewayService.getAvailableProviders.mockReturnValue(['claude', 'openai']);

      const result = await controller.getProviders();

      expect(result).toEqual({
        default: 'claude',
        available: ['claude', 'openai'],
      });
    });

    it('should handle no available providers', async () => {
      aiGatewayService.getDefaultProvider.mockReturnValue('claude');
      aiGatewayService.getAvailableProviders.mockReturnValue([]);

      const result = await controller.getProviders();

      expect(result.available).toHaveLength(0);
    });
  });
});
