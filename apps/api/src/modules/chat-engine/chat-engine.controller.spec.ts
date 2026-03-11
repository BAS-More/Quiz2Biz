/**
 * Chat Engine Controller Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ChatEngineController } from './chat-engine.controller';
import { ChatEngineService } from './chat-engine.service';
import { Response } from 'express';

describe('ChatEngineController', () => {
  let controller: ChatEngineController;
  let chatEngineService: jest.Mocked<ChatEngineService>;

  const mockChatStatus = {
    projectId: 'project-123',
    messageCount: 10,
    messageLimit: 50,
    remainingMessages: 40,
    limitReached: false,
    qualityScore: 75.5,
  };

  const mockMessage = {
    id: 'msg-123',
    projectId: 'project-123',
    role: 'assistant' as const,
    content: 'AI response',
    aiProviderId: 'provider-1',
    inputTokens: 100,
    outputTokens: 50,
    latencyMs: 500,
    createdAt: new Date('2024-01-01'),
  };

  const mockUser = { sub: 'user-123' };

  beforeEach(async () => {
    const mockService = {
      getChatStatus: jest.fn(),
      getMessages: jest.fn(),
      sendMessage: jest.fn(),
      sendMessageStream: jest.fn(),
      checkLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatEngineController],
      providers: [
        { provide: ChatEngineService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ChatEngineController>(ChatEngineController);
    chatEngineService = module.get(ChatEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return chat status for a project', async () => {
      chatEngineService.getChatStatus.mockResolvedValue(mockChatStatus);

      const result = await controller.getStatus('project-123');

      expect(result).toEqual(mockChatStatus);
      expect(chatEngineService.getChatStatus).toHaveBeenCalledWith('project-123');
    });

    it('should propagate service errors', async () => {
      chatEngineService.getChatStatus.mockRejectedValue(new Error('Not found'));

      await expect(controller.getStatus('bad-id')).rejects.toThrow('Not found');
    });
  });

  describe('listMessages', () => {
    it('should return messages with default pagination', async () => {
      chatEngineService.getMessages.mockResolvedValue([mockMessage]);

      const result = await controller.listMessages('project-123', {});

      expect(result).toEqual([mockMessage]);
      expect(chatEngineService.getMessages).toHaveBeenCalledWith('project-123', 0, 50);
    });

    it('should pass custom skip and take', async () => {
      chatEngineService.getMessages.mockResolvedValue([]);

      await controller.listMessages('project-123', { skip: 10, take: 25 });

      expect(chatEngineService.getMessages).toHaveBeenCalledWith('project-123', 10, 25);
    });

    it('should return empty array when no messages', async () => {
      chatEngineService.getMessages.mockResolvedValue([]);

      const result = await controller.listMessages('project-123', {});

      expect(result).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('should send message and return AI response', async () => {
      chatEngineService.sendMessage.mockResolvedValue(mockMessage);

      const result = await controller.sendMessage(
        'project-123',
        { content: 'Hello AI', provider: 'claude' },
        mockUser,
      );

      expect(result).toEqual(mockMessage);
      expect(chatEngineService.sendMessage).toHaveBeenCalledWith(
        'project-123',
        'user-123',
        'Hello AI',
        'claude',
      );
    });

    it('should send message without specifying provider', async () => {
      chatEngineService.sendMessage.mockResolvedValue(mockMessage);

      await controller.sendMessage(
        'project-123',
        { content: 'Hello AI' },
        mockUser,
      );

      expect(chatEngineService.sendMessage).toHaveBeenCalledWith(
        'project-123',
        'user-123',
        'Hello AI',
        undefined,
      );
    });

    it('should propagate BadRequestException when limit reached', async () => {
      chatEngineService.sendMessage.mockRejectedValue(new Error('Message limit reached'));

      await expect(
        controller.sendMessage('project-123', { content: 'Hello' }, mockUser),
      ).rejects.toThrow('Message limit reached');
    });
  });

  describe('sendMessageStream', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    });

    it('should set SSE headers and stream chunks', async () => {
      const chunks = [
        { content: 'Hello', done: false },
        { content: ' world', done: true },
      ];

      async function* streamGenerator() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      chatEngineService.sendMessageStream.mockReturnValue(streamGenerator());

      await controller.sendMessageStream(
        'project-123',
        { content: 'Hello AI', provider: 'claude' },
        mockRes as Response,
        mockUser,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
      expect(mockRes.write).toHaveBeenCalledWith(`data: ${JSON.stringify(chunks[0])}\n\n`);
      expect(mockRes.write).toHaveBeenCalledWith(`data: ${JSON.stringify(chunks[1])}\n\n`);
      expect(mockRes.write).toHaveBeenCalledWith('event: done\ndata: {}\n\n');
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should handle stream errors and write error event', async () => {
      async function* failingStream() {
        throw new Error('Stream failed');
        yield { content: '', done: false }; // unreachable, satisfies generator type
      }

      chatEngineService.sendMessageStream.mockReturnValue(failingStream());

      await controller.sendMessageStream(
        'project-123',
        { content: 'Hello' },
        mockRes as Response,
        mockUser,
      );

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('event: error'),
      );
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('Stream failed'),
      );
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions in stream', async () => {
      async function* failingStream() {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- deliberately testing non-Error throw path
        throw 'string error';
        yield { content: '', done: false }; // unreachable
      }

      chatEngineService.sendMessageStream.mockReturnValue(failingStream());

      await controller.sendMessageStream(
        'project-123',
        { content: 'Hello' },
        mockRes as Response,
        mockUser,
      );

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('Stream failed'),
      );
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should call res.end in finally block even on success', async () => {
      async function* emptyStream() {
        yield { content: 'done', done: true };
      }

      chatEngineService.sendMessageStream.mockReturnValue(emptyStream());

      await controller.sendMessageStream(
        'project-123',
        { content: 'Hello' },
        mockRes as Response,
        mockUser,
      );

      expect(mockRes.end).toHaveBeenCalledTimes(1);
    });

    it('should call sendMessageStream with correct args', async () => {
      async function* emptyStream() {
        yield { content: 'done', done: true };
      }

      chatEngineService.sendMessageStream.mockReturnValue(emptyStream());

      await controller.sendMessageStream(
        'project-123',
        { content: 'Tell me more', provider: 'openai' },
        mockRes as Response,
        mockUser,
      );

      expect(chatEngineService.sendMessageStream).toHaveBeenCalledWith(
        'project-123',
        'user-123',
        'Tell me more',
        'openai',
      );
    });
  });

  describe('canSend', () => {
    it('should return canSend true when under limit', async () => {
      chatEngineService.checkLimit.mockResolvedValue({
        canSend: true,
        remaining: 40,
      });

      const result = await controller.canSend('project-123');

      expect(result.canSend).toBe(true);
      expect(result.remaining).toBe(40);
      expect(chatEngineService.checkLimit).toHaveBeenCalledWith('project-123');
    });

    it('should return canSend false with message when limit reached', async () => {
      chatEngineService.checkLimit.mockResolvedValue({
        canSend: false,
        remaining: 0,
        message: 'Limit reached',
      });

      const result = await controller.canSend('project-123');

      expect(result.canSend).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toBe('Limit reached');
    });
  });
});
