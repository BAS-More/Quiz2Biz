import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ClaudeAiService, ConversationFollowUp } from '../../idea-capture/services/claude-ai.service';

export interface ConversationMessageDto {
  id: string;
  role: string;
  content: string;
  questionId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface SubmitAnswerWithAiParams {
  sessionId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  dimensionContext: string;
}

export interface AnswerWithFollowUpResult {
  followUp: ConversationFollowUp;
  conversationMessages: ConversationMessageDto[];
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claudeAi: ClaudeAiService,
  ) {}

  /**
   * Store a user answer and evaluate whether AI follow-up is needed.
   */
  async processAnswerWithAi(
    params: SubmitAnswerWithAiParams,
  ): Promise<AnswerWithFollowUpResult> {
    // Store the user's answer as a conversation message
    await this.prisma.conversationMessage.create({
      data: {
        sessionId: params.sessionId,
        questionId: params.questionId,
        role: 'user',
        content: params.answerText,
        metadata: { questionText: params.questionText },
      },
    });

    // Evaluate completeness with AI
    const followUp = await this.claudeAi.evaluateAnswerCompleteness(
      params.questionText,
      params.answerText,
      params.dimensionContext,
    );

    // If AI suggests a follow-up, store it
    if (followUp.shouldFollowUp && followUp.followUpQuestion) {
      await this.prisma.conversationMessage.create({
        data: {
          sessionId: params.sessionId,
          questionId: params.questionId,
          role: 'assistant',
          content: followUp.followUpQuestion,
          metadata: {
            type: 'follow_up',
            completenessScore: followUp.completenessScore,
            missingAreas: followUp.missingAreas,
          },
        },
      });
    }

    // Return recent conversation for this question
    const messages = await this.getQuestionConversation(
      params.sessionId,
      params.questionId,
    );

    return { followUp, conversationMessages: messages };
  }

  /**
   * Store a follow-up answer from the user (response to AI follow-up).
   */
  async storeFollowUpAnswer(
    sessionId: string,
    questionId: string,
    content: string,
  ): Promise<ConversationMessageDto> {
    const message = await this.prisma.conversationMessage.create({
      data: {
        sessionId,
        questionId,
        role: 'user',
        content,
        metadata: { type: 'follow_up_answer' },
      },
    });

    return this.toDto(message);
  }

  /**
   * Get all conversation messages for a session.
   */
  async getSessionConversation(sessionId: string): Promise<ConversationMessageDto[]> {
    const messages = await this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => this.toDto(m));
  }

  /**
   * Get conversation messages for a specific question within a session.
   */
  async getQuestionConversation(
    sessionId: string,
    questionId: string,
  ): Promise<ConversationMessageDto[]> {
    const messages = await this.prisma.conversationMessage.findMany({
      where: { sessionId, questionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => this.toDto(m));
  }

  /**
   * Get full conversation history formatted for document generation context.
   * Returns a condensed format: question → answer pairs with follow-ups.
   */
  async getConversationForDocGen(
    sessionId: string,
  ): Promise<Array<{ question: string; answer: string; followUps: string[] }>> {
    const messages = await this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const byQuestion = new Map<string, typeof messages>();
    for (const msg of messages) {
      const qId = msg.questionId || '__system__';
      const arr = byQuestion.get(qId) || [];
      arr.push(msg);
      byQuestion.set(qId, arr);
    }

    const result: Array<{ question: string; answer: string; followUps: string[] }> = [];

    for (const [, qMessages] of byQuestion) {
      const userMessages = qMessages.filter((m) => m.role === 'user');
      const assistantMessages = qMessages.filter((m) => m.role === 'assistant');

      if (userMessages.length === 0) continue;

      const questionText =
        (userMessages[0].metadata as Record<string, unknown>)?.questionText as string ||
        'Question';
      const answer = userMessages[0].content;
      const followUps = [
        ...assistantMessages.map((m) => `AI: ${m.content}`),
        ...userMessages.slice(1).map((m) => `User: ${m.content}`),
      ];

      result.push({ question: questionText, answer, followUps });
    }

    return result;
  }

  private toDto(message: {
    id: string;
    role: string;
    content: string;
    questionId: string | null;
    metadata: unknown;
    createdAt: Date;
  }): ConversationMessageDto {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      questionId: message.questionId || undefined,
      metadata: (message.metadata as Record<string, unknown>) || {},
      createdAt: message.createdAt,
    };
  }
}
