import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

// Extract enum values for Swagger schema generation
const SessionStatusValues = Object.values(SessionStatus);
import {
  SessionService,
  SessionResponse,
  NextQuestionResponse,
  SubmitResponseResult,
  ContinueSessionResponse,
} from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { ContinueSessionDto } from './dto/continue-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { PaginationDto } from '@libs/shared';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new questionnaire session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionResponse> {
    return this.sessionService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List user's sessions" })
  @ApiQuery({ name: 'status', enum: SessionStatusValues, required: false })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ): Promise<{
    items: SessionResponse[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
  }> {
    const { items, total } = await this.sessionService.findAllByUser(
      user.id,
      pagination,
      status as SessionStatus,
    );
    return {
      items,
      pagination: {
        page: pagination.page ?? 1,
        limit: pagination.limit ?? 20,
        totalItems: total,
        totalPages: Math.ceil(total / (pagination.limit ?? 20)),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({ status: 200, description: 'Session details' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionResponse> {
    return this.sessionService.findById(id, user.id);
  }

  @Get(':id/continue')
  @ApiOperation({
    summary: 'Continue questionnaire session',
    description:
      'Retrieves the current session state, applies adaptive logic rules, and returns the next question(s) along with progress information. Use this endpoint to resume a questionnaire session.',
  })
  @ApiQuery({
    name: 'questionCount',
    required: false,
    type: Number,
    description: 'Number of questions to fetch (default: 1, max: 5)',
  })
  @ApiResponse({
    status: 200,
    description: 'Session state with next question(s) and progress information',
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this session' })
  async continueSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: ContinueSessionDto,
  ): Promise<ContinueSessionResponse> {
    const questionCount = Math.min(Math.max(dto.questionCount || 1, 1), 5);
    return this.sessionService.continueSession(id, user.id, questionCount);
  }

  @Get(':id/questions/next')
  @ApiOperation({ summary: 'Get next question(s) based on adaptive logic' })
  @ApiQuery({
    name: 'count',
    required: false,
    type: Number,
    description: 'Number of questions to fetch (default: 1, max: 5)',
  })
  @ApiResponse({ status: 200, description: 'Next question(s)' })
  async getNextQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('count') count?: number,
  ): Promise<NextQuestionResponse> {
    const questionCount = Math.min(Math.max(count || 1, 1), 5);
    return this.sessionService.getNextQuestion(id, user.id, questionCount);
  }

  @Post(':id/responses')
  @ApiOperation({ summary: 'Submit a response to a question' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  async submitResponse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitResponseDto,
  ): Promise<SubmitResponseResult> {
    return this.sessionService.submitResponse(id, user.id, dto);
  }

  @Put(':id/responses/:questionId')
  @ApiOperation({ summary: 'Update a response' })
  @ApiResponse({ status: 200, description: 'Response updated successfully' })
  async updateResponse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: Omit<SubmitResponseDto, 'questionId'>,
  ): Promise<SubmitResponseResult> {
    return this.sessionService.submitResponse(id, user.id, { ...dto, questionId });
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark session as complete' })
  @ApiResponse({ status: 200, description: 'Session completed' })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionResponse> {
    return this.sessionService.completeSession(id, user.id);
  }
}
