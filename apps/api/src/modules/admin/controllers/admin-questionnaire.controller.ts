import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../../auth/auth.service';
import { PaginationDto } from '@libs/shared';
import { AdminQuestionnaireService } from '../services/admin-questionnaire.service';
import {
  CreateQuestionnaireDto,
  UpdateQuestionnaireDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  ReorderQuestionsDto,
  CreateVisibilityRuleDto,
  UpdateVisibilityRuleDto,
} from '../dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminQuestionnaireController {
  constructor(private readonly questionnaireService: AdminQuestionnaireService) {}

  // ==========================================================================
  // QUESTIONNAIRE ENDPOINTS
  // ==========================================================================

  @Get('questionnaires')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all questionnaires (paginated)' })
  @ApiResponse({ status: 200, description: 'List of questionnaires' })
  async listQuestionnaires(@Query() pagination: PaginationDto) {
    const { items, total } = await this.questionnaireService.findAllQuestionnaires(pagination);
    return {
      items,
      pagination: {
        page: pagination.page ?? 1,
        limit: pagination.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (pagination.limit ?? 20)),
      },
    };
  }

  @Get('questionnaires/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get questionnaire with full details' })
  @ApiResponse({ status: 200, description: 'Questionnaire with sections and questions' })
  @ApiResponse({ status: 404, description: 'Questionnaire not found' })
  async getQuestionnaire(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionnaireService.findQuestionnaireById(id);
  }

  @Post('questionnaires')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new questionnaire' })
  @ApiResponse({ status: 201, description: 'Questionnaire created' })
  async createQuestionnaire(
    @Body() dto: CreateQuestionnaireDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.createQuestionnaire(dto, user.id);
  }

  @Patch('questionnaires/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update questionnaire metadata' })
  @ApiResponse({ status: 200, description: 'Questionnaire updated' })
  @ApiResponse({ status: 404, description: 'Questionnaire not found' })
  async updateQuestionnaire(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionnaireDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.updateQuestionnaire(id, dto, user.id);
  }

  @Delete('questionnaires/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete questionnaire (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Questionnaire deactivated' })
  @ApiResponse({ status: 404, description: 'Questionnaire not found' })
  async deleteQuestionnaire(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.questionnaireService.deleteQuestionnaire(id, user.id);
    return { message: 'Questionnaire deactivated successfully' };
  }

  // ==========================================================================
  // SECTION ENDPOINTS
  // ==========================================================================

  @Post('questionnaires/:questionnaireId/sections')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add section to questionnaire' })
  @ApiResponse({ status: 201, description: 'Section created' })
  @ApiResponse({ status: 404, description: 'Questionnaire not found' })
  async createSection(
    @Param('questionnaireId', ParseUUIDPipe) questionnaireId: string,
    @Body() dto: CreateSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.createSection(questionnaireId, dto, user.id);
  }

  @Patch('sections/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update section' })
  @ApiResponse({ status: 200, description: 'Section updated' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.updateSection(id, dto, user.id);
  }

  @Delete('sections/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete section (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Section deleted' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  @ApiResponse({ status: 400, description: 'Section has questions' })
  async deleteSection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.questionnaireService.deleteSection(id, user.id);
    return { message: 'Section deleted successfully' };
  }

  @Patch('questionnaires/:questionnaireId/sections/reorder')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reorder sections within questionnaire' })
  @ApiResponse({ status: 200, description: 'Sections reordered' })
  @ApiResponse({ status: 404, description: 'Questionnaire not found' })
  async reorderSections(
    @Param('questionnaireId', ParseUUIDPipe) questionnaireId: string,
    @Body() dto: ReorderSectionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.reorderSections(questionnaireId, dto, user.id);
  }

  // ==========================================================================
  // QUESTION ENDPOINTS
  // ==========================================================================

  @Post('sections/:sectionId/questions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add question to section' })
  @ApiResponse({ status: 201, description: 'Question created' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async createQuestion(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.createQuestion(sectionId, dto, user.id);
  }

  @Patch('questions/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update question' })
  @ApiResponse({ status: 200, description: 'Question updated' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.updateQuestion(id, dto, user.id);
  }

  @Delete('questions/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete question (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Question deleted' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 400, description: 'Question has responses' })
  async deleteQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.questionnaireService.deleteQuestion(id, user.id);
    return { message: 'Question deleted successfully' };
  }

  @Patch('sections/:sectionId/questions/reorder')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reorder questions within section' })
  @ApiResponse({ status: 200, description: 'Questions reordered' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async reorderQuestions(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: ReorderQuestionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.reorderQuestions(sectionId, dto, user.id);
  }

  // ==========================================================================
  // VISIBILITY RULE ENDPOINTS
  // ==========================================================================

  @Get('questions/:questionId/rules')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List visibility rules for question' })
  @ApiResponse({ status: 200, description: 'List of visibility rules' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async listVisibilityRules(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.questionnaireService.findRulesByQuestion(questionId);
  }

  @Post('questions/:questionId/rules')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add visibility rule to question' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async createVisibilityRule(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: CreateVisibilityRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.createVisibilityRule(questionId, dto, user.id);
  }

  @Patch('rules/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update visibility rule' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateVisibilityRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisibilityRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionnaireService.updateVisibilityRule(id, dto, user.id);
  }

  @Delete('rules/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete visibility rule' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteVisibilityRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.questionnaireService.deleteVisibilityRule(id, user.id);
    return { message: 'Visibility rule deleted successfully' };
  }
}
