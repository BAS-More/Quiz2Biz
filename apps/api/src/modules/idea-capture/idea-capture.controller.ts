import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { IdeaCaptureService } from './services/idea-capture.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { ConfirmProjectTypeDto } from './dto/confirm-project-type.dto';
import { IdeaCaptureResponseDto } from './dto/idea-response.dto';

@ApiTags('idea-capture')
@Controller('sessions/idea')
export class IdeaCaptureController {
  constructor(private readonly ideaCaptureService: IdeaCaptureService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a business idea for AI analysis',
    description:
      'Accepts free-form text describing a business idea. AI analyzes the input to extract themes, identify gaps, and recommend the best project type.',
  })
  @ApiResponse({
    status: 201,
    description: 'Idea captured and analyzed',
    type: IdeaCaptureResponseDto,
  })
  async captureIdea(
    @Body() dto: CreateIdeaDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<IdeaCaptureResponseDto> {
    return this.ideaCaptureService.captureAndAnalyze(dto, user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get idea capture details by ID' })
  @ApiResponse({ status: 200, type: IdeaCaptureResponseDto })
  async getIdea(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IdeaCaptureResponseDto> {
    return this.ideaCaptureService.getById(id);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Confirm project type selection for an idea',
    description:
      'After reviewing the AI recommendation, the user confirms which project type to use for their questionnaire session.',
  })
  @ApiResponse({ status: 200, type: IdeaCaptureResponseDto })
  async confirmProjectType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmProjectTypeDto,
  ): Promise<IdeaCaptureResponseDto> {
    return this.ideaCaptureService.confirmProjectType(id, dto.projectTypeId);
  }

  @Post(':id/session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a questionnaire session from a confirmed idea',
    description:
      'Creates a new questionnaire session linked to the idea capture, using the confirmed project type to load the appropriate questions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Session created',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async createSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ sessionId: string }> {
    return this.ideaCaptureService.createSessionFromIdea(id, user.id);
  }
}
