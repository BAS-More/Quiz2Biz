import { Controller, Post, Get, Body, Param, Query, Res, UseGuards, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { ChatEngineService } from './chat-engine.service';
import {
  CreateMessageDto,
  ChatMessageDto,
  ChatStatusDto,
  ListMessagesQueryDto,
} from './dto/chat-engine.dto';

/**
 * Chat Engine Controller
 *
 * REST and SSE endpoints for project chat functionality.
 */
@ApiTags('Chat Engine')
@Controller('projects/:projectId/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatEngineController {
  private readonly logger = new Logger(ChatEngineController.name);

  constructor(private readonly chatEngine: ChatEngineService) {}

  /**
   * Get chat status for a project
   */
  @Get('status')
  @ApiOperation({ summary: 'Get chat status and limits' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: ChatStatusDto })
  async getStatus(@Param('projectId') projectId: string): Promise<ChatStatusDto> {
    return this.chatEngine.getChatStatus(projectId);
  }

  /**
   * List messages for a project
   */
  @Get()
  @ApiOperation({ summary: 'List chat messages' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: [ChatMessageDto] })
  async listMessages(
    @Param('projectId') projectId: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<ChatMessageDto[]> {
    return this.chatEngine.getMessages(projectId, query.skip || 0, query.take || 50);
  }

  /**
   * Send a message (non-streaming)
   */
  @Post()
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, type: ChatMessageDto })
  @ApiResponse({ status: 400, description: 'Message limit reached' })
  async sendMessage(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: { sub: string },
  ): Promise<ChatMessageDto> {
    return this.chatEngine.sendMessage(projectId, user.sub, dto.content, dto.provider);
  }

  /**
   * Send a message with SSE streaming response
   */
  @Post('stream')
  @ApiOperation({ summary: 'Send a chat message with streaming response' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'SSE stream of response chunks' })
  @ApiResponse({ status: 400, description: 'Message limit reached' })
  async sendMessageStream(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMessageDto,
    @Res() res: Response,
    @CurrentUser() user: { sub: string },
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const stream = this.chatEngine.sendMessageStream(
        projectId,
        user.sub,
        dto.content,
        dto.provider,
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);

        if (chunk.done) {
          res.write('event: done\ndata: {}\n\n');
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Stream failed: ${error instanceof Error ? error.message : String(error)}`);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Stream failed',
        })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  /**
   * Check if more messages can be sent
   */
  @Get('can-send')
  @ApiOperation({ summary: 'Check if more messages can be sent' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Can send status' })
  async canSend(
    @Param('projectId') projectId: string,
  ): Promise<{ canSend: boolean; remaining: number; message?: string }> {
    return this.chatEngine.checkLimit(projectId);
  }
}
