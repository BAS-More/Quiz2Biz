import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectTypeRecommendationDto {
  @ApiProperty({ description: 'Project type slug', example: 'business-plan' })
  slug: string;

  @ApiProperty({ description: 'Project type name', example: 'Business Plan' })
  name: string;

  @ApiProperty({
    description: 'Confidence score 0-1',
    example: 0.85,
  })
  confidence: number;

  @ApiProperty({
    description: 'Why this project type was recommended',
    example: 'Your idea describes a startup with a subscription business model, which aligns well with comprehensive business planning.',
  })
  reasoning: string;
}

export class IdeaAnalysisDto {
  @ApiProperty({
    description: 'Extracted themes from the idea',
    example: ['mobile app', 'pet services', 'subscription model', 'marketplace'],
  })
  themes: string[];

  @ApiProperty({
    description: 'Identified gaps or areas that need further exploration',
    example: ['target market size not specified', 'no mention of competitive landscape', 'funding strategy unclear'],
  })
  gaps: string[];

  @ApiProperty({
    description: 'Key strengths identified in the idea',
    example: ['clear problem statement', 'defined revenue model'],
  })
  strengths: string[];

  @ApiProperty({
    description: 'Recommended project type with reasoning',
    type: ProjectTypeRecommendationDto,
  })
  recommendedProjectType: ProjectTypeRecommendationDto;

  @ApiPropertyOptional({
    description: 'Alternative project types the user could consider',
    type: [ProjectTypeRecommendationDto],
  })
  alternativeProjectTypes?: ProjectTypeRecommendationDto[];

  @ApiProperty({
    description: 'Brief summary of the idea analysis',
    example: 'Your pet services marketplace idea has a clear value proposition. We recommend starting with a comprehensive Business Plan to cover market analysis, financial projections, and go-to-market strategy.',
  })
  summary: string;
}

export class IdeaCaptureResponseDto {
  @ApiProperty({ description: 'Idea capture ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Idea title' })
  title?: string;

  @ApiProperty({ description: 'Original raw input' })
  rawInput: string;

  @ApiProperty({ description: 'AI analysis results', type: IdeaAnalysisDto })
  analysis: IdeaAnalysisDto;

  @ApiProperty({ description: 'Status of the idea capture' })
  status: string;

  @ApiPropertyOptional({ description: 'Selected project type ID' })
  projectTypeId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}
