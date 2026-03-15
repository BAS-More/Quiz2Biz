import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

/**
 * Response DTO for a single project
 */
export class ProjectResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  id!: string;

  @ApiProperty({ description: 'Project name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Project description' })
  description?: string | null;

  @ApiProperty({ enum: ProjectStatus, description: 'Current project status' })
  status!: ProjectStatus;

  @ApiProperty({ description: 'Total messages sent in this project' })
  messageCount!: number;

  @ApiPropertyOptional({ description: 'Quality score (0-100)' })
  qualityScore?: number | null;

  @ApiPropertyOptional({ description: 'Project type ID' })
  projectTypeId?: string | null;

  @ApiPropertyOptional({ description: 'Project type name' })
  projectTypeName?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  lastActivityAt?: Date;
}

/**
 * Response DTO for paginated project list
 */
export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto], description: 'List of projects' })
  items!: ProjectResponseDto[];

  @ApiProperty({ description: 'Total count of projects matching filters' })
  total!: number;
}
