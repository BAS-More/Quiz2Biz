import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ProjectStatus, Prisma } from '@prisma/client';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  ProjectListResponseDto,
  ListProjectsQueryDto,
} from './dto';

/**
 * Projects Service
 *
 * Manages project CRUD operations for the Quiz2Biz multi-project workspace.
 * Each project belongs to an organization and is scoped by the authenticated user's org.
 */
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List projects for the user's organization with pagination
   */
  async listProjects(
    organizationId: string,
    query: ListProjectsQueryDto,
  ): Promise<ProjectListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      organizationId,
      status: { not: ProjectStatus.ARCHIVED },
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastActivityAt: 'desc' },
        include: { projectType: true },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: items.map((p) => this.mapToResponse(p)),
      total,
    };
  }

  /**
   * Get a single project by ID
   */
  async getProject(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { projectType: true },
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return this.mapToResponse(project);
  }

  /**
   * Create a new project
   */
  async createProject(
    dto: CreateProjectDto,
    organizationId: string,
    userId: string,
  ): Promise<ProjectResponseDto> {
    let projectTypeId: string | undefined;
    if (dto.projectTypeSlug) {
      const projectType = await this.prisma.projectType.findFirst({
        where: { slug: dto.projectTypeSlug },
      });
      if (projectType) {
        projectTypeId = projectType.id;
      }
    }

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId,
        projectTypeId,
        status: ProjectStatus.DRAFT,
      },
      include: { projectType: true },
    });

    this.logger.log(`Project created: ${project.id} by user ${userId}`);
    return this.mapToResponse(project);
  }

  /**
   * Update a project (name, description, or status)
   */
  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
    organizationId: string,
  ): Promise<ProjectResponseDto> {
    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    if (existing.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data,
      include: { projectType: true },
    });

    this.logger.log(
      `Project updated: ${projectId} — status: ${updated.status}`,
    );
    return this.mapToResponse(updated);
  }

  /**
   * Map Prisma entity to response DTO
   */
  private mapToResponse(project: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    messageCount: number;
    qualityScore: Prisma.Decimal | null;
    projectTypeId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;
    projectType?: { name: string } | null;
  }): ProjectResponseDto {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      messageCount: project.messageCount,
      qualityScore: project.qualityScore
        ? Number(project.qualityScore)
        : null,
      projectTypeId: project.projectTypeId,
      projectTypeName: project.projectType?.name ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      lastActivityAt: project.lastActivityAt,
    };
  }
}
