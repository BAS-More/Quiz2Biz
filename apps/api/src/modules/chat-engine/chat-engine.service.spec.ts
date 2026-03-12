/**
 * Chat Engine Service Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ChatEngineService } from './chat-engine.service';
import { PrismaService } from '@libs/database';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ChatEngineService', () => {
  let service: ChatEngineService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;
  let promptBuilderService: jest.Mocked<PromptBuilderService>;

  const mockProject = {
    id: 'project-123',
    messageCount: 10,
    messageLimit: 50,
    qualityScore: 75.5,
  };

  const mockMessage = {
    id: 'msg-123',
    projectId: 'project-123',
    role: 'user',
    content: 'Hello, I need help with my business plan',
    aiProviderId: null,
    inputTokens: null,
    outputTokens: null,
    latencyMs: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      project: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      aiProvider: {
        findUnique: jest.fn(),
      },
    };

    const mockAiGatewayService = {
      generate: jest.fn(),
      generateStream: jest.fn(),
    };

    const mockPromptBuilderService = {
      buildSystemPrompt: jest.fn(),
      buildLimitApproachingPrompt: jest.fn(),
      buildLimitReachedPrompt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiGatewayService, useValue: mockAiGatewayService },
        { provide: PromptBuilderService, useValue: mockPromptBuilderService },
      ],
    }).compile();

    service = module.get<ChatEngineService>(ChatEngineService);
    prismaService = module.get(PrismaService);
    aiGatewayService = module.get(AiGatewayService);
    promptBuilderService = module.get(PromptBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChatStatus', () => {
    it('should return chat status for existing project', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getChatStatus('project-123');

      expect(result).toEqual({
        projectId: 'project-123',
        messageCount: 10,
        messageLimit: 50,
        remainingMessages: 40,
        limitReached: false,
        qualityScore: 75.5,
      });
    });

    it('should throw NotFoundException for non-existent project', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getChatStatus('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should return limitReached true when messageCount equals messageLimit', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        messageCount: 50,
      });

      const result = await service.getChatStatus('project-123');

      expect(result.limitReached).toBe(true);
      expect(result.remainingMessages).toBe(0);
    });

    it('should handle project without qualityScore', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        qualityScore: null,
      });

      const result = await service.getChatStatus('project-123');

      expect(result.qualityScore).toBeUndefined();
    });
  });

  describe('getMessages', () => {
    it('should return messages for project', async () => {
      (prismaService.chatMessage.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      const result = await service.getMessages('project-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-123');
      expect(result[0].role).toBe('user');
    });

    it('should apply skip and take parameters', async () => {
      (prismaService.chatMessage.findMany as jest.Mock).mockResolvedValue([]);

      await service.getMessages('project-123', 10, 20);

      expect(prismaService.chatMessage.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        orderBy: { createdAt: 'asc' },
        skip: 10,
        take: 20,
      });
    });

    it('should use default skip and take values', async () => {
      (prismaService.chatMessage.findMany as jest.Mock).mockResolvedValue([]);

      await service.getMessages('project-123');

      expect(prismaService.chatMessage.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        orderBy: { createdAt: 'asc' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prismaService.chatMessage.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.chatMessage.create as jest.Mock).mockResolvedValue(mockMessage);
      (prismaService.aiProvider.findUnique as jest.Mock).mockResolvedValue({ id: 'provider-1' });
      (prismaService.project.update as jest.Mock).mockResolvedValue(mockProject);

      promptBuilderService.buildSystemPrompt.mockResolvedValue('System prompt');
      promptBuilderService.buildLimitApproachingPrompt.mockReturnValue('');

      aiGatewayService.generate.mockResolvedValue({
        content: 'AI response content',
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03, currency: 'USD' },
        latencyMs: 500,
        finishReason: 'stop',
      });
    });

    it('should send message and get AI response', async () => {
      const result = await service.sendMessage('project-123', 'user-123', 'Hello, AI!');

      expect(result.role).toBe('assistant');
      expect(prismaService.chatMessage.create).toHaveBeenCalledTimes(2);
      expect(prismaService.project.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when limit reached', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        messageCount: 50,
        messageLimit: 50,
      });

      await expect(service.sendMessage('project-123', 'user-123', 'Hello')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should add limit warning prompt when approaching limit', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        messageCount: 46,
        messageLimit: 50,
      });
      promptBuilderService.buildLimitApproachingPrompt.mockReturnValue(
        'Warning: 3 messages remaining',
      );

      await service.sendMessage('project-123', 'user-123', 'Hello');

      expect(promptBuilderService.buildLimitApproachingPrompt).toHaveBeenCalledWith(3);
    });

    it('should delete user message on AI failure', async () => {
      aiGatewayService.generate.mockRejectedValue(new Error('AI failed'));

      await expect(service.sendMessage('project-123', 'user-123', 'Hello')).rejects.toThrow(
        'AI failed',
      );

      expect(prismaService.chatMessage.delete).toHaveBeenCalled();
    });
  });

  describe('checkLimit', () => {
    it('should return canSend true when under limit', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.checkLimit('project-123');

      expect(result.canSend).toBe(true);
      expect(result.remaining).toBe(40);
    });

    it('should return canSend false when limit reached', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        messageCount: 50,
        messageLimit: 50,
      });
      promptBuilderService.buildLimitReachedPrompt.mockReturnValue('Limit reached message');

      const result = await service.checkLimit('project-123');

      expect(result.canSend).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toBe('Limit reached message');
    });
  });
});
