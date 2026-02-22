import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@libs/database';
import {
  ConversationService,
  SubmitAnswerWithAiParams,
} from './conversation.service';
import { ClaudeAiService, ConversationFollowUp } from '../../idea-capture/services/claude-ai.service';

const mockPrismaService = {
  conversationMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockClaudeAiService = {
  evaluateAnswerCompleteness: jest.fn(),
};

describe('ConversationService', () => {
  let service: ConversationService;

  const mockMessage = {
    id: 'msg-1',
    sessionId: 'session-1',
    questionId: 'question-1',
    role: 'user',
    content: 'Test answer',
    metadata: { questionText: 'What is your approach?' },
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockFollowUp: ConversationFollowUp = {
    shouldFollowUp: false,
    completenessScore: 0.9,
    missingAreas: [],
  };

  const mockFollowUpNeeded: ConversationFollowUp = {
    shouldFollowUp: true,
    completenessScore: 0.5,
    followUpQuestion: 'Can you elaborate on the security aspects?',
    missingAreas: ['security', 'scalability'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClaudeAiService, useValue: mockClaudeAiService },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAnswerWithAi', () => {
    const params: SubmitAnswerWithAiParams = {
      sessionId: 'session-1',
      questionId: 'question-1',
      questionText: 'What is your architecture approach?',
      answerText: 'We use microservices architecture.',
      dimensionContext: 'Architecture & Security',
    };

    it('should store user answer and return result without follow-up', async () => {
      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);
      mockClaudeAiService.evaluateAnswerCompleteness.mockResolvedValue(mockFollowUp);
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([mockMessage]);

      const result = await service.processAnswerWithAi(params);

      expect(result.followUp).toEqual(mockFollowUp);
      expect(result.conversationMessages).toHaveLength(1);
      expect(mockPrismaService.conversationMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: params.sessionId,
          questionId: params.questionId,
          role: 'user',
          content: params.answerText,
          metadata: { questionText: params.questionText },
        },
      });
    });

    it('should store follow-up question when AI suggests one', async () => {
      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);
      mockClaudeAiService.evaluateAnswerCompleteness.mockResolvedValue(mockFollowUpNeeded);
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([
        mockMessage,
        {
          id: 'msg-2',
          role: 'assistant',
          content: mockFollowUpNeeded.followUpQuestion,
          questionId: 'question-1',
          metadata: {
            type: 'follow_up',
            completenessScore: mockFollowUpNeeded.completenessScore,
            missingAreas: mockFollowUpNeeded.missingAreas,
          },
          createdAt: new Date(),
        },
      ]);

      const result = await service.processAnswerWithAi(params);

      expect(result.followUp.shouldFollowUp).toBe(true);
      expect(mockPrismaService.conversationMessage.create).toHaveBeenCalledTimes(2);
      
      // Second call should be for assistant follow-up
      expect(mockPrismaService.conversationMessage.create).toHaveBeenNthCalledWith(2, {
        data: {
          sessionId: params.sessionId,
          questionId: params.questionId,
          role: 'assistant',
          content: mockFollowUpNeeded.followUpQuestion,
          metadata: {
            type: 'follow_up',
            completenessScore: mockFollowUpNeeded.completenessScore,
            missingAreas: mockFollowUpNeeded.missingAreas,
          },
        },
      });
    });

    it('should call AI service with correct parameters', async () => {
      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);
      mockClaudeAiService.evaluateAnswerCompleteness.mockResolvedValue(mockFollowUp);
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([mockMessage]);

      await service.processAnswerWithAi(params);

      expect(mockClaudeAiService.evaluateAnswerCompleteness).toHaveBeenCalledWith(
        params.questionText,
        params.answerText,
        params.dimensionContext,
      );
    });

    it('should return conversation messages for the question', async () => {
      const messages = [
        mockMessage,
        { ...mockMessage, id: 'msg-2', role: 'assistant', content: 'Follow up question' },
      ];
      
      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);
      mockClaudeAiService.evaluateAnswerCompleteness.mockResolvedValue(mockFollowUp);
      mockPrismaService.conversationMessage.findMany.mockResolvedValue(messages);

      const result = await service.processAnswerWithAi(params);

      expect(result.conversationMessages).toHaveLength(2);
    });
  });

  describe('storeFollowUpAnswer', () => {
    it('should store follow-up answer and return DTO', async () => {
      const followUpMessage = {
        id: 'msg-3',
        sessionId: 'session-1',
        questionId: 'question-1',
        role: 'user',
        content: 'Additional details about security...',
        metadata: { type: 'follow_up_answer' },
        createdAt: new Date('2024-01-15T10:05:00Z'),
      };

      mockPrismaService.conversationMessage.create.mockResolvedValue(followUpMessage);

      const result = await service.storeFollowUpAnswer(
        'session-1',
        'question-1',
        'Additional details about security...',
      );

      expect(result.id).toBe('msg-3');
      expect(result.role).toBe('user');
      expect(result.content).toBe('Additional details about security...');
      expect(result.metadata).toEqual({ type: 'follow_up_answer' });
    });

    it('should call prisma with correct parameters', async () => {
      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);

      await service.storeFollowUpAnswer('session-1', 'question-1', 'My follow-up answer');

      expect(mockPrismaService.conversationMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          questionId: 'question-1',
          role: 'user',
          content: 'My follow-up answer',
          metadata: { type: 'follow_up_answer' },
        },
      });
    });
  });

  describe('getSessionConversation', () => {
    it('should return all messages for a session', async () => {
      const messages = [
        mockMessage,
        { ...mockMessage, id: 'msg-2', questionId: 'question-2' },
        { ...mockMessage, id: 'msg-3', questionId: 'question-3' },
      ];

      mockPrismaService.conversationMessage.findMany.mockResolvedValue(messages);

      const result = await service.getSessionConversation('session-1');

      expect(result).toHaveLength(3);
      expect(mockPrismaService.conversationMessage.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array for session with no messages', async () => {
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([]);

      const result = await service.getSessionConversation('empty-session');

      expect(result).toEqual([]);
    });

    it('should map messages to DTOs correctly', async () => {
      const rawMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        questionId: 'question-1',
        role: 'user',
        content: 'Test content',
        metadata: { key: 'value' },
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };

      mockPrismaService.conversationMessage.findMany.mockResolvedValue([rawMessage]);

      const result = await service.getSessionConversation('session-1');

      expect(result[0]).toEqual({
        id: 'msg-1',
        role: 'user',
        content: 'Test content',
        questionId: 'question-1',
        metadata: { key: 'value' },
        createdAt: rawMessage.createdAt,
      });
    });

    it('should handle null questionId', async () => {
      const messageWithNullQuestionId = {
        ...mockMessage,
        questionId: null,
      };

      mockPrismaService.conversationMessage.findMany.mockResolvedValue([messageWithNullQuestionId]);

      const result = await service.getSessionConversation('session-1');

      expect(result[0].questionId).toBeUndefined();
    });

    it('should handle null metadata', async () => {
      const messageWithNullMetadata = {
        ...mockMessage,
        metadata: null,
      };

      mockPrismaService.conversationMessage.findMany.mockResolvedValue([messageWithNullMetadata]);

      const result = await service.getSessionConversation('session-1');

      expect(result[0].metadata).toEqual({});
    });
  });

  describe('getQuestionConversation', () => {
    it('should return messages for a specific question', async () => {
      const messages = [
        mockMessage,
        { ...mockMessage, id: 'msg-2', role: 'assistant', content: 'Follow up' },
      ];

      mockPrismaService.conversationMessage.findMany.mockResolvedValue(messages);

      const result = await service.getQuestionConversation('session-1', 'question-1');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.conversationMessage.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1', questionId: 'question-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array for question with no messages', async () => {
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([]);

      const result = await service.getQuestionConversation('session-1', 'non-existent-question');

      expect(result).toEqual([]);
    });

    it('should order messages by createdAt ascending', async () => {
      const olderMessage = { ...mockMessage, id: 'msg-1', createdAt: new Date('2024-01-15T09:00:00Z') };
      const newerMessage = { ...mockMessage, id: 'msg-2', createdAt: new Date('2024-01-15T10:00:00Z') };

      mockPrismaService.conversationMessage.findMany.mockResolvedValue([olderMessage, newerMessage]);

      const result = await service.getQuestionConversation('session-1', 'question-1');

      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
    });
  });

  describe('toDto (private method behavior)', () => {
    it('should convert message with all fields correctly', async () => {
      const fullMessage = {
        id: 'msg-full',
        sessionId: 'session-1',
        questionId: 'question-1',
        role: 'assistant',
        content: 'Full message content',
        metadata: { type: 'follow_up', score: 0.8 },
        createdAt: new Date('2024-01-15T12:00:00Z'),
      };

      mockPrismaService.conversationMessage.findMany.mockResolvedValue([fullMessage]);

      const result = await service.getSessionConversation('session-1');

      expect(result[0]).toEqual({
        id: 'msg-full',
        role: 'assistant',
        content: 'Full message content',
        questionId: 'question-1',
        metadata: { type: 'follow_up', score: 0.8 },
        createdAt: fullMessage.createdAt,
      });
    });

    it('should handle metadata as empty object when falsy', async () => {
      const messageWithFalsyMetadata = {
        ...mockMessage,
        metadata: undefined,
      };

      mockPrismaService.conversationMessage.findMany.mockResolvedValue([messageWithFalsyMetadata]);

      const result = await service.getSessionConversation('session-1');

      expect(result[0].metadata).toEqual({});
    });
  });

  describe('AI interaction scenarios', () => {
    const params: SubmitAnswerWithAiParams = {
      sessionId: 'session-1',
      questionId: 'question-1',
      questionText: 'Describe your testing strategy',
      answerText: 'We have unit tests.',
      dimensionContext: 'Quality & Testing',
    };

    it('should handle AI returning high completeness score', async () => {
      const highScoreFollowUp: ConversationFollowUp = {
        shouldFollowUp: false,
        completenessScore: 0.95,
        missingAreas: [],
      };

      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);
      mockClaudeAiService.evaluateAnswerCompleteness.mockResolvedValue(highScoreFollowUp);
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([mockMessage]);

      const result = await service.processAnswerWithAi(params);

      expect(result.followUp.shouldFollowUp).toBe(false);
      expect(result.followUp.completenessScore).toBe(0.95);
      // Should only create one message (user answer)
      expect(mockPrismaService.conversationMessage.create).toHaveBeenCalledTimes(1);
    });

    it('should handle AI returning low completeness score with follow-up', async () => {
      const lowScoreFollowUp: ConversationFollowUp = {
        shouldFollowUp: true,
        completenessScore: 0.3,
        followUpQuestion: 'What types of tests do you have? Unit, integration, e2e?',
        missingAreas: ['integration tests', 'e2e tests', 'coverage metrics'],
      };

      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);
      mockClaudeAiService.evaluateAnswerCompleteness.mockResolvedValue(lowScoreFollowUp);
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([mockMessage]);

      const result = await service.processAnswerWithAi(params);

      expect(result.followUp.shouldFollowUp).toBe(true);
      expect(result.followUp.completenessScore).toBe(0.3);
      expect(result.followUp.missingAreas).toContain('integration tests');
      // Should create two messages (user answer + assistant follow-up)
      expect(mockPrismaService.conversationMessage.create).toHaveBeenCalledTimes(2);
    });

    it('should not store follow-up when shouldFollowUp is true but no question provided', async () => {
      const noQuestionFollowUp: ConversationFollowUp = {
        shouldFollowUp: true,
        completenessScore: 0.5,
        followUpQuestion: undefined, // No follow-up question
        missingAreas: ['details'],
      };

      mockPrismaService.conversationMessage.create.mockResolvedValue(mockMessage);
      mockClaudeAiService.evaluateAnswerCompleteness.mockResolvedValue(noQuestionFollowUp);
      mockPrismaService.conversationMessage.findMany.mockResolvedValue([mockMessage]);

      const result = await service.processAnswerWithAi(params);

      expect(result.followUp.shouldFollowUp).toBe(true);
      // Should only create one message since there's no follow-up question
      expect(mockPrismaService.conversationMessage.create).toHaveBeenCalledTimes(1);
    });
  });
});
