import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { UserRole } from '@prisma/client';
import { ClaudeAiService, ConversationFollowUp } from '../../idea-capture/services/claude-ai.service';
import { AuthenticatedUser } from '../../auth/auth.service';

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

  private canBypassSessionOwnership(user: AuthenticatedUser): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  }

  private async assertSessionOwnership(
    sessionId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    if (this.canBypassSessionOwnership(currentUser)) {
      return;
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.userId !== currentUser.id) {
      throw new ForbiddenException(`Forbidden session access: ${sessionId}`);
    }
  }

  /**
   * Store a user answer and evaluate whether AI follow-up is needed.
   */
  async processAnswerWithAi(
    params: SubmitAnswerWithAiParams,
    currentUser: AuthenticatedUser,
  ): Promise<AnswerWithFollowUpResult> {
    await this.assertSessionOwnership(params.sessionId, currentUser);

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
      currentUser,
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
    currentUser: AuthenticatedUser,
  ): Promise<ConversationMessageDto> {
    await this.assertSessionOwnership(sessionId, currentUser);

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
  async getSessionConversation(
    sessionId: string,
    currentUser: AuthenticatedUser,
  ): Promise<ConversationMessageDto[]> {
    await this.assertSessionOwnership(sessionId, currentUser);

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
    currentUser: AuthenticatedUser,
  ): Promise<ConversationMessageDto[]> {
    await this.assertSessionOwnership(sessionId, currentUser);

    const messages = await this.prisma.conversationMessage.findMany({
      where: { sessionId, questionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => this.toDto(m));
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
