import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for creating a new project
 */
export class CreateProjectDto {
    @ApiProperty({ description: 'Project name', example: 'My SaaS Application' })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name!: string;

    @ApiPropertyOptional({ description: 'Project description' })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ description: 'Project type slug for scoping questionnaires' })
    @IsOptional()
    @IsString()
    projectTypeSlug?: string;
}
