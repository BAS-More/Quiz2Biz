import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '@libs/database';

@ApiTags('project-types')
@Controller('project-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all active project types' })
  @ApiResponse({ status: 200, description: 'List of active project types' })
  async listProjectTypes() {
    return this.prisma.projectType.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      take: 100,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        isDefault: true,
        metadata: true,
      },
    });
  }
}
