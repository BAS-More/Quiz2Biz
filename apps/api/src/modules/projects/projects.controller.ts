import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { PrismaService } from '@libs/database';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  ProjectListResponseDto,
  ListProjectsQueryDto,
} from './dto';

/**
 * Projects Controller
 *
 * REST API for Quiz2Biz multi-project workspace management.
 * All endpoints are JWT-protected and scoped to the user's organization.
 */
@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolve the authenticated user's organization ID.
   * Throws ForbiddenException if user has no organization.
   */
  private async getOrganizationId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new ForbiddenException('User is not associated with an organization');
    }

    return user.organizationId;
  }

  @Get()
  @ApiOperation({
    summary: "List projects for the current user's organization",
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of projects',
    type: ProjectListResponseDto,
  })
  async listProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProjectsQueryDto,
  ): Promise<ProjectListResponseDto> {
    const organizationId = await this.getOrganizationId(user.id);
    return this.projectsService.listProjects(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project details',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getProject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    const organizationId = await this.getOrganizationId(user.id);
    return this.projectsService.getProject(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created',
    type: ProjectResponseDto,
  })
  async createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    const organizationId = await this.getOrganizationId(user.id);
    return this.projectsService.createProject(dto, organizationId, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a project (name, description, or status)',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectResponseDto> {
    const organizationId = await this.getOrganizationId(user.id);
    return this.projectsService.updateProject(id, dto, organizationId);
  }
}
