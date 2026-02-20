import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { ClaudeAiService } from './claude-ai.service';
import { CreateIdeaDto } from '../dto/create-idea.dto';
import { IdeaCaptureResponseDto, IdeaAnalysisDto, ProjectTypeRecommendationDto } from '../dto/idea-response.dto';

@Injectable()
export class IdeaCaptureService {
  private readonly logger = new Logger(IdeaCaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claudeAi: ClaudeAiService,
  ) {}

  async captureAndAnalyze(
    dto: CreateIdeaDto,
    userId?: string,
  ): Promise<IdeaCaptureResponseDto> {
    const availableProjectTypes = await this.prisma.projectType.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });

    if (availableProjectTypes.length === 0) {
      throw new BadRequestException(
        'No project types available. Please seed the database first.',
      );
    }

    const analysisResult = await this.claudeAi.analyzeIdea(
      dto.rawInput,
      availableProjectTypes.map((pt) => ({
        slug: pt.slug,
        name: pt.name,
        description: pt.description ?? '',
      })),
    );

    const recommendedType = availableProjectTypes.find(
      (pt) => pt.slug === analysisResult.recommendedProjectType.slug,
    );

    const selectedProjectTypeId =
      dto.projectTypeId || recommendedType?.id || availableProjectTypes[0].id;

    const ideaCapture = await this.prisma.ideaCapture.create({
      data: {
        userId: userId || null,
        rawInput: dto.rawInput,
        title: dto.title || null,
        projectTypeId: selectedProjectTypeId,
        analysis: analysisResult as object,
        suggestedQuestions: undefined,
        status: 'ANALYZED',
      },
      include: {
        projectType: { select: { id: true, slug: true, name: true } },
      },
    });

    this.logger.log(
      `Idea captured: ${ideaCapture.id}, recommended: ${analysisResult.recommendedProjectType.slug}`,
    );

    return this.toResponseDto(ideaCapture, analysisResult, availableProjectTypes.map(pt => ({
      ...pt,
      description: pt.description ?? '',
    })));
  }

  async getById(id: string): Promise<IdeaCaptureResponseDto> {
    const ideaCapture = await this.prisma.ideaCapture.findUnique({
      where: { id },
      include: {
        projectType: { select: { id: true, slug: true, name: true } },
      },
    });

    if (!ideaCapture) {
      throw new NotFoundException(`Idea capture ${id} not found`);
    }

    const availableProjectTypes = await this.prisma.projectType.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, description: true },
    });

    const analysis = ideaCapture.analysis as unknown as {
      themes: string[];
      gaps: string[];
      strengths: string[];
      recommendedProjectType: { slug: string; confidence: number; reasoning: string };
      alternativeProjectTypes: Array<{ slug: string; confidence: number; reasoning: string }>;
      summary: string;
    };

    return this.toResponseDto(ideaCapture, analysis, availableProjectTypes.map(pt => ({
      ...pt,
      description: pt.description ?? '',
    })));
  }

  async confirmProjectType(
    ideaCaptureId: string,
    projectTypeId: string,
  ): Promise<IdeaCaptureResponseDto> {
    const projectType = await this.prisma.projectType.findUnique({
      where: { id: projectTypeId },
    });

    if (!projectType) {
      throw new NotFoundException(`Project type ${projectTypeId} not found`);
    }

    const updated = await this.prisma.ideaCapture.update({
      where: { id: ideaCaptureId },
      data: {
        projectTypeId,
        status: 'CONFIRMED',
      },
      include: {
        projectType: { select: { id: true, slug: true, name: true } },
      },
    });

    if (!updated) {
      throw new NotFoundException(`Idea capture ${ideaCaptureId} not found`);
    }

    this.logger.log(
      `Project type confirmed for idea ${ideaCaptureId}: ${projectType.slug}`,
    );

    return this.getById(ideaCaptureId);
  }

  async createSessionFromIdea(
    ideaCaptureId: string,
    userId: string,
  ): Promise<{ sessionId: string }> {
    const ideaCapture = await this.prisma.ideaCapture.findUnique({
      where: { id: ideaCaptureId },
      include: {
        projectType: true,
      },
    });

    if (!ideaCapture) {
      throw new NotFoundException(`Idea capture ${ideaCaptureId} not found`);
    }

    if (!ideaCapture.projectTypeId) {
      throw new BadRequestException(
        'Please confirm a project type before creating a session.',
      );
    }

    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: {
        projectTypeId: ideaCapture.projectTypeId,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    if (!questionnaire) {
      throw new BadRequestException(
        `No questionnaire available for project type: ${ideaCapture.projectType?.name || 'unknown'}`,
      );
    }

    const session = await this.prisma.session.create({
      data: {
        userId,
        questionnaireId: questionnaire.id,
        questionnaireVersion: questionnaire.version,
        projectTypeId: ideaCapture.projectTypeId,
        ideaCaptureId: ideaCapture.id,
        status: 'IN_PROGRESS',
        metadata: {
          ideaTitle: ideaCapture.title,
          ideaThemes: (ideaCapture.analysis as Record<string, unknown>)?.themes || [],
        },
      },
    });

    this.logger.log(
      `Session ${session.id} created from idea ${ideaCaptureId}`,
    );

    return { sessionId: session.id };
  }

  private toResponseDto(
    ideaCapture: {
      id: string;
      title: string | null;
      rawInput: string;
      analysis: unknown;
      status: string;
      projectTypeId: string | null;
      createdAt: Date;
    },
    analysis: {
      themes: string[];
      gaps: string[];
      strengths: string[];
      recommendedProjectType: { slug: string; confidence: number; reasoning: string };
      alternativeProjectTypes?: Array<{ slug: string; confidence: number; reasoning: string }>;
      summary: string;
    },
    availableProjectTypes: Array<{ id: string; slug: string; name: string; description: string }>,
  ): IdeaCaptureResponseDto {
    const recommended = availableProjectTypes.find(
      (pt) => pt.slug === analysis.recommendedProjectType.slug,
    );

    const recommendedDto: ProjectTypeRecommendationDto = {
      slug: analysis.recommendedProjectType.slug,
      name: recommended?.name || analysis.recommendedProjectType.slug,
      confidence: analysis.recommendedProjectType.confidence,
      reasoning: analysis.recommendedProjectType.reasoning,
    };

    const alternatives: ProjectTypeRecommendationDto[] = (
      analysis.alternativeProjectTypes || []
    ).map((alt) => {
      const pt = availableProjectTypes.find((p) => p.slug === alt.slug);
      return {
        slug: alt.slug,
        name: pt?.name || alt.slug,
        confidence: alt.confidence,
        reasoning: alt.reasoning,
      };
    });

    const analysisDto: IdeaAnalysisDto = {
      themes: analysis.themes,
      gaps: analysis.gaps,
      strengths: analysis.strengths,
      recommendedProjectType: recommendedDto,
      alternativeProjectTypes: alternatives,
      summary: analysis.summary,
    };

    return {
      id: ideaCapture.id,
      title: ideaCapture.title || undefined,
      rawInput: ideaCapture.rawInput,
      analysis: analysisDto,
      status: ideaCapture.status,
      projectTypeId: ideaCapture.projectTypeId || undefined,
      createdAt: ideaCapture.createdAt,
    };
  }
}
