import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  QuestionnaireService,
  QuestionnaireListItem,
  QuestionnaireDetail,
} from './questionnaire.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '@libs/shared';

@ApiTags('questionnaires')
@Controller('questionnaires')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Get()
  @ApiOperation({ summary: 'List all available questionnaires' })
  @ApiQuery({ name: 'industry', required: false })
  @ApiResponse({ status: 200, description: 'List of questionnaires' })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('industry') industry?: string,
  ): Promise<{
    items: QuestionnaireListItem[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
  }> {
    const { items, total } = await this.questionnaireService.findAll(pagination, industry);
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
  @ApiOperation({ summary: 'Get questionnaire details with all sections and questions' })
  @ApiResponse({ status: 200, description: 'Questionnaire details' })
  @ApiResponse({ status: 404, description: 'Questionnaire not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<QuestionnaireDetail> {
    return this.questionnaireService.findById(id);
  }
}
