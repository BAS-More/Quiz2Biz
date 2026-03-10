import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ChatMessage, Prisma } from '@prisma/client';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { AiStreamChunk, AiMessage } from '../ai-gateway/interfaces';
import { ChatMessageDto, ChatStatusDto } from './dto/chat-engine.dto';

/**
 * Chat Engine Service
 *
 * Core service for Quiz2Biz chat functionality.
 * Features:
 * - Project-based chat sessions
 * - 50-message limit enforcement
 * - AI provider integration via AI Gateway
 * - Streaming response support
 * - Message persistence
 */
@Injectable()
export class ChatEngineService {
  private readonly logger = new Logger(ChatEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  /**
   * Get chat status for a project
   */
  async getChatStatus(projectId: string): Promise<ChatStatusDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        messageCount: true,
        messageLimit: true,
        qualityScore: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const remaining = Math.max(0, project.messageLimit - project.messageCount);

    return {
      projectId: project.id,
      messageCount: project.messageCount,
      messageLimit: project.messageLimit,
      remainingMessages: remaining,
      limitReached: remaining === 0,
      qualityScore: project.qualityScore ? Number(project.qualityScore) : undefined,
    };
  }

  /**
   * Get messages for a project
   */
  async getMessages(
    projectId: string,
    skip = 0,
    take = 50,
  ): Promise<ChatMessageDto[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });

    return messages.map((m: ChatMessage) => ({
      id: m.id,
      projectId: m.projectId,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      aiProviderId: m.aiProviderId || undefined,
      inputTokens: m.inputTokens || undefined,
      outputTokens: m.outputTokens || undefined,
      latencyMs: m.latencyMs || undefined,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Send a message and get AI response (non-streaming)
   */
  async sendMessage(
    projectId: string,
    userId: string,
    content: string,
    provider?: 'claude' | 'openai',
  ): Promise<ChatMessageDto> {
    // Verify project exists and check limit
    const status = await this.getChatStatus(projectId);
    if (status.limitReached) {
      throw new BadRequestException('Message limit reached for this project');
    }

    // Save user message
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        projectId,
        role: 'user',
        content,
      },
    });

    // Build conversation history for AI
    const history = await this.getConversationHistory(projectId);
    const systemPrompt = await this.promptBuilder.buildSystemPrompt(projectId);

    // Check if approaching limit
    const remaining = status.messageLimit - status.messageCount - 1;
    let promptSuffix = '';
    if (remaining <= 5 && remaining > 0) {
      promptSuffix = this.promptBuilder.buildLimitApproachingPrompt(remaining);
    }

    try {
      // Generate AI response
      const response = await this.aiGateway.generate({
        taskType: 'chat',
        provider,
        messages: history,
        systemPrompt: systemPrompt + promptSuffix,
        projectId,
        userId,
      });

      // Find provider ID from database
      const aiProvider = await this.prisma.aiProvider.findUnique({
        where: { slug: response.provider },
        select: { id: true },
      });

      // Save assistant message
      const assistantMessage = await this.prisma.chatMessage.create({
        data: {
          projectId,
          aiProviderId: aiProvider?.id,
          role: 'assistant',
          content: response.content,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
          latencyMs: response.latencyMs,
          metadata: {
            model: response.model,
            cost: response.cost,
            finishReason: response.finishReason,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // Update project message count and activity
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          messageCount: { increment: 2 }, // User + assistant
          lastActivityAt: new Date(),
        },
      });

      return {
        id: assistantMessage.id,
        projectId: assistantMessage.projectId,
        role: 'assistant',
        content: assistantMessage.content,
        aiProviderId: assistantMessage.aiProviderId || undefined,
        inputTokens: assistantMessage.inputTokens || undefined,
        outputTokens: assistantMessage.outputTokens || undefined,
        latencyMs: assistantMessage.latencyMs || undefined,
        createdAt: assistantMessage.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to generate response: ${error}`);
      
      // Delete user message on failure
      await this.prisma.chatMessage.delete({ where: { id: userMessage.id } });
      
      throw error;
    }
  }

  /**
   * Send a message and get AI response with streaming
   */
  async *sendMessageStream(
    projectId: string,
    userId: string,
    content: string,
    provider?: 'claude' | 'openai',
  ): AsyncGenerator<AiStreamChunk, void, unknown> {
    // Verify project exists and check limit
    const status = await this.getChatStatus(projectId);
    if (status.limitReached) {
      yield {
        content: '',
        done: true,
        provider: provider || 'claude',
        error: 'Message limit reached for this project',
      };
      return;
    }

    // Save user message
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        projectId,
        role: 'user',
        content,
      },
    });

    // Build conversation history for AI
    const history = await this.getConversationHistory(projectId);
    const systemPrompt = await this.promptBuilder.buildSystemPrompt(projectId);

    // Check if approaching limit
    const remaining = status.messageLimit - status.messageCount - 1;
    let promptSuffix = '';
    if (remaining <= 5 && remaining > 0) {
      promptSuffix = this.promptBuilder.buildLimitApproachingPrompt(remaining);
    }

    // Collect full response for persistence
    let fullContent = '';
    let finalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let finalCost = { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' };
    let usedProvider: 'claude' | 'openai' | 'gemini' = provider || 'claude';

    try {
      const stream = this.aiGateway.generateStream({
        taskType: 'chat',
        provider,
        messages: history,
        systemPrompt: systemPrompt + promptSuffix,
        projectId,
        userId,
        stream: true,
      });

      for await (const chunk of stream) {
        if (!chunk.done) {
          fullContent += chunk.content;
        } else {
          // Final chunk with usage info
          if (chunk.usage) {finalUsage = chunk.usage;}
          if (chunk.cost) {finalCost = chunk.cost;}
          usedProvider = chunk.provider;
        }

        yield chunk;
      }

      // Find provider ID from database
      const aiProvider = await this.prisma.aiProvider.findUnique({
        where: { slug: usedProvider },
        select: { id: true },
      });

      // Save assistant message
      await this.prisma.chatMessage.create({
        data: {
          projectId,
          aiProviderId: aiProvider?.id,
          role: 'assistant',
          content: fullContent,
          inputTokens: finalUsage.inputTokens,
          outputTokens: finalUsage.outputTokens,
          totalTokens: finalUsage.totalTokens,
          metadata: { cost: finalCost } as Prisma.InputJsonValue,
        },
      });

      // Update project message count and activity
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          messageCount: { increment: 2 }, // User + assistant
          lastActivityAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Stream failed: ${error}`);
      
      // Delete user message on failure
      await this.prisma.chatMessage.delete({ where: { id: userMessage.id } });
      
      yield {
        content: '',
        done: true,
        provider: usedProvider,
        error: error instanceof Error ? error.message : 'Stream failed',
      };
    }
  }

  /**
   * Get conversation history for AI context
   */
  private async getConversationHistory(projectId: string): Promise<AiMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
      },
      take: 200,
    });

    return messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  /**
   * Check if limit is reached (helper for controller)
   */
  async checkLimit(projectId: string): Promise<{
    canSend: boolean;
    remaining: number;
    message?: string;
  }> {
    const status = await this.getChatStatus(projectId);
    
    if (status.limitReached) {
      return {
        canSend: false,
        remaining: 0,
        message: this.promptBuilder.buildLimitReachedPrompt(),
      };
    }

    return {
      canSend: true,
      remaining: status.remainingMessages,
    };
  }
}
