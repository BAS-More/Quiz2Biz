import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from './conversation.controller';
import { ConversationService } from '../services/conversation.service';

describe('ConversationController', () => {
  let controller: ConversationController;

  const mockConversationService = {
    processAnswerWithAi: jest.fn(),
    storeFollowUpAnswer: jest.fn(),
    getSessionConversation: jest.fn(),
    getQuestionConversation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [{ provide: ConversationService, useValue: mockConversationService }],
    }).compile();

    controller = module.get<ConversationController>(ConversationController);
    conversationService = module.get(ConversationService);
  });

  describe('submitAnswerWithAi', () => {
    it('should process answer with AI evaluation', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const dto = {
        questionId: 'q-1',
        questionText: 'What is your security policy?',
        answerText: 'We use encryption',
        dimensionContext: 'SECURITY',
      };
      const mockResult = {
        followUp: {
          shouldFollowUp: true,
          followUpQuestion: 'Can you elaborate on the encryption type?',
          completenessScore: 0.5,
          missingAreas: ['details'],
        },
        conversationMessages: [{ id: 'm-1', content: 'We use encryption', role: 'user' }],
      };

      mockConversationService.processAnswerWithAi.mockResolvedValue(mockResult);

      const result = await controller.submitAnswerWithAi(sessionId, dto);

      expect(result).toEqual(mockResult);
      expect(mockConversationService.processAnswerWithAi).toHaveBeenCalledWith({
        sessionId,
        questionId: 'q-1',
        questionText: 'What is your security policy?',
        answerText: 'We use encryption',
        dimensionContext: 'SECURITY',
      });
    });

    it('should return result without follow-up when answer is complete', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const dto = {
        questionId: 'q-1',
        questionText: 'What is your policy?',
        answerText: 'Complete answer with all details',
        dimensionContext: 'COMPLIANCE',
      };
      const mockResult = {
        followUp: { shouldFollowUp: false, completenessScore: 1.0, missingAreas: [] },
        conversationMessages: [{ id: 'm-1', content: 'Complete answer', role: 'user' }],
      };

      mockConversationService.processAnswerWithAi.mockResolvedValue(mockResult);

      const result = await controller.submitAnswerWithAi(sessionId, dto);

      expect(result.followUp.shouldFollowUp).toBe(false);
    });
  });

  describe('submitFollowUp', () => {
    it('should store follow-up answer', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const dto = {
        questionId: 'q-1',
        content: 'AES-256 encryption',
      };
      const mockMessage = {
        id: 'm-1',
        role: 'user',
        content: 'AES-256 encryption',
        createdAt: new Date(),
      };

      mockConversationService.storeFollowUpAnswer.mockResolvedValue(mockMessage);

      const result = await controller.submitFollowUp(sessionId, dto);

      expect(result).toEqual(mockMessage);
      expect(mockConversationService.storeFollowUpAnswer).toHaveBeenCalledWith(
        sessionId,
        'q-1',
        'AES-256 encryption',
      );
    });
  });

  describe('getConversation', () => {
    it('should return full conversation history', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const mockMessages = [
        { id: 'm-1', role: 'assistant', content: 'Question 1', createdAt: new Date() },
        { id: 'm-2', role: 'user', content: 'Answer 1', createdAt: new Date() },
      ];

      mockConversationService.getSessionConversation.mockResolvedValue(mockMessages);

      const result = await controller.getConversation(sessionId);

      expect(result).toEqual(mockMessages);
      expect(mockConversationService.getSessionConversation).toHaveBeenCalledWith(sessionId);
    });

    it('should return empty array for new session', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      mockConversationService.getSessionConversation.mockResolvedValue([]);

      const result = await controller.getConversation(sessionId);

      expect(result).toEqual([]);
    });
  });

  describe('getQuestionConversation', () => {
    it('should return conversation for specific question', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const questionId = '987e6543-b21c-34d5-e678-426614174111';
      const mockMessages = [
        { id: 'm-1', role: 'assistant', content: 'Follow-up', createdAt: new Date() },
        { id: 'm-2', role: 'user', content: 'Response', createdAt: new Date() },
      ];

      mockConversationService.getQuestionConversation.mockResolvedValue(mockMessages);

      const result = await controller.getQuestionConversation(sessionId, questionId);

      expect(result).toEqual(mockMessages);
      expect(mockConversationService.getQuestionConversation).toHaveBeenCalledWith(
        sessionId,
        questionId,
      );
    });
  });
});
