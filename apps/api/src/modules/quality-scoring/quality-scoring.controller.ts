/**
 * Quality Scoring Controller
 * 
 * REST endpoints for project quality scoring based on extracted facts
 * and quality dimensions.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '@libs/database';
import { QualityScoringService } from './services';
import {
  ProjectQualityScoreDto,
  QualityImprovementDto,
} from './dto';

@ApiTags('Quality Scoring')
@Controller('quality')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QualityScoringController {
  private readonly logger = new Logger(QualityScoringController.name);

  constructor(
    private readonly qualityScoring: QualityScoringService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get quality score for a project
   */
  @Get(':projectId/score')
  @ApiOperation({ summary: 'Get quality score for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: ProjectQualityScoreDto })
  async getProjectScore(
    @Param('projectId') projectId: string,
  ): Promise<ProjectQualityScoreDto> {
    this.logger.log(`Getting quality score for project ${projectId}`);
    
    // Get project to determine project type
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { projectType: true },
    });

    if (!project) {
      return this.emptyScoreResponse(projectId);
    }

    const score = await this.qualityScoring.calculateProjectScore(
      projectId,
      project.projectType?.slug || 'business-plan',
    );

    return this.mapToDto(score);
  }

  /**
   * Get quality improvement suggestions
   */
  @Get(':projectId/improvements')
  @ApiOperation({ summary: 'Get quality improvement suggestions' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: [QualityImprovementDto] })
  async getImprovements(
    @Param('projectId') projectId: string,
  ): Promise<QualityImprovementDto[]> {
    this.logger.log(`Getting improvements for project ${projectId}`);
    
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { projectType: true },
    });

    if (!project) {
      return [];
    }

    const improvements = await this.qualityScoring.getImprovements(
      projectId,
      project.projectType?.slug || 'business-plan',
    );

    return improvements.map((i) => ({
      dimensionId: i.dimensionId,
      dimensionName: i.dimensionName,
      currentScore: i.currentScore,
      potentialScore: i.potentialScore,
      missingCriteria: i.missingCriteria,
      suggestedQuestions: i.suggestedQuestions,
    }));
  }

  /**
   * Recalculate and save project score
   */
  @Post(':projectId/recalculate')
  @ApiOperation({ summary: 'Recalculate and save project score' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, type: ProjectQualityScoreDto })
  async recalculateScore(
    @Param('projectId') projectId: string,
  ): Promise<ProjectQualityScoreDto> {
    this.logger.log(`Recalculating score for project ${projectId}`);
    
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { projectType: true },
    });

    if (!project) {
      return this.emptyScoreResponse(projectId);
    }

    const score = await this.qualityScoring.calculateProjectScore(
      projectId,
      project.projectType?.slug || 'business-plan',
    );

    // Save the score to project
    await this.qualityScoring.saveProjectScore(projectId, score);

    return this.mapToDto(score);
  }

  /**
   * Map score to DTO
   */
  private mapToDto(score: {
    projectId: string;
    overallScore: number;
    completenessScore: number;
    confidenceScore: number;
    dimensionScores: Array<{
      dimensionId: string;
      dimensionName: string;
      weight: number;
      score: number;
      completeness: number;
      criteriaScores: Array<{
        criterionKey: string;
        criterionDescription: string;
        met: boolean;
        confidence: number;
        sourceFactKey?: string;
      }>;
    }>;
    recommendations: string[];
    scoredAt: Date;
  }): ProjectQualityScoreDto {
    return {
      projectId: score.projectId,
      overallScore: score.overallScore,
      completenessScore: score.completenessScore,
      confidenceScore: score.confidenceScore,
      dimensionScores: score.dimensionScores.map((d) => ({
        dimensionId: d.dimensionId,
        dimensionName: d.dimensionName,
        weight: d.weight,
        score: d.score,
        completeness: d.completeness,
        criteriaScores: d.criteriaScores.map((c) => ({
          criterionKey: c.criterionKey,
          criterionDescription: c.criterionDescription,
          met: c.met,
          confidence: c.confidence,
          sourceFactKey: c.sourceFactKey,
        })),
      })),
      recommendations: score.recommendations,
      scoredAt: score.scoredAt,
    };
  }

  /**
   * Empty score response
   */
  private emptyScoreResponse(projectId: string): ProjectQualityScoreDto {
    return {
      projectId,
      overallScore: 0,
      completenessScore: 0,
      confidenceScore: 0,
      dimensionScores: [],
      recommendations: ['Start a conversation to build your project profile'],
      scoredAt: new Date(),
    };
  }
}
