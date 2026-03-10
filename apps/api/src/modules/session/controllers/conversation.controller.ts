import { Controller, Post, Get, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ConversationService,
  AnswerWithFollowUpResult,
  ConversationMessageDto,
} from '../services/conversation.service';

class SubmitAnswerDto {
  questionId: string;
  questionText: string;
  answerText: string;
  dimensionContext: string;
}

class FollowUpAnswerDto {
  questionId: string;
  content: string;
}

@ApiTags('conversation')
@Controller('sessions/:sessionId/conversation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('answer')
  @ApiOperation({
    summary: 'Submit an answer with AI evaluation',
    description:
      'Stores the answer and evaluates completeness. Returns follow-up question if needed.',
  })
  @ApiResponse({ status: 201, description: 'Answer processed with AI evaluation' })
  async submitAnswerWithAi(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SubmitAnswerDto,
  ): Promise<AnswerWithFollowUpResult> {
    return this.conversationService.processAnswerWithAi({
      sessionId,
      questionId: dto.questionId,
      questionText: dto.questionText,
      answerText: dto.answerText,
      dimensionContext: dto.dimensionContext,
    });
  }

  @Post('follow-up')
  @ApiOperation({
    summary: 'Submit a follow-up answer',
    description: 'Records a user response to an AI follow-up question.',
  })
  @ApiResponse({ status: 201, description: 'Follow-up answer stored' })
  async submitFollowUp(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: FollowUpAnswerDto,
  ): Promise<ConversationMessageDto> {
    return this.conversationService.storeFollowUpAnswer(sessionId, dto.questionId, dto.content);
  }

  @Get()
  @ApiOperation({ summary: 'Get full conversation history for a session' })
  @ApiResponse({ status: 200, description: 'Conversation messages' })
  async getConversation(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<ConversationMessageDto[]> {
    return this.conversationService.getSessionConversation(sessionId);
  }

  @Get('question/:questionId')
  @ApiOperation({ summary: 'Get conversation for a specific question' })
  @ApiResponse({ status: 200, description: 'Question conversation messages' })
  async getQuestionConversation(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<ConversationMessageDto[]> {
    return this.conversationService.getQuestionConversation(sessionId, questionId);
  }
}
