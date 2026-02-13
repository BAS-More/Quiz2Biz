import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Questionnaire, Section, Question, QuestionType, Persona } from '@prisma/client';
import { PaginationDto } from '@libs/shared';

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  value?: string | number | boolean;
}

export interface QuestionResponse {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  explanation?: string;
  placeholder?: string;
  options?: QuestionOption[];
  validation?: Record<string, unknown>;
}

export interface SectionResponse {
  id: string;
  name: string;
  description?: string;
  order: number;
  icon?: string;
  estimatedTime?: number;
  questionCount: number;
  questions?: QuestionResponse[];
}

export interface QuestionnaireListItem {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  version: number;
  estimatedTime?: number;
  totalQuestions: number;
  sections: {
    id: string;
    name: string;
    questionCount: number;
  }[];
  createdAt: Date;
}

export interface QuestionnaireDetail {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  version: number;
  estimatedTime?: number;
  sections: SectionResponse[];
}

@Injectable()
export class QuestionnaireService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    pagination: PaginationDto,
    industry?: string,
  ): Promise<{ items: QuestionnaireListItem[]; total: number }> {
    const where = {
      isActive: true,
      ...(industry && { industry }),
    };

    const [questionnaires, total] = await Promise.all([
      this.prisma.questionnaire.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sections: {
            orderBy: { orderIndex: 'asc' },
            include: {
              _count: {
                select: { questions: true },
              },
            },
          },
        },
      }),
      this.prisma.questionnaire.count({ where }),
    ]);

    const items = questionnaires.map((q) => this.mapToListItem(q));
    return { items, total };
  }

  async findById(id: string): Promise<QuestionnaireDetail> {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id, isActive: true },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                visibilityRules: true,
              },
            },
          },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire not found');
    }

    return this.mapToDetail(questionnaire);
  }

  async getDefaultQuestionnaire(): Promise<QuestionnaireDetail | null> {
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                visibilityRules: true,
              },
            },
          },
        },
      },
    });

    if (!questionnaire) {
      return null;
    }

    return this.mapToDetail(questionnaire);
  }

  async getQuestionById(questionId: string): Promise<Question | null> {
    return this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        visibilityRules: true,
        section: {
          include: {
            questionnaire: true,
          },
        },
      },
    });
  }

  async getQuestionsBySection(sectionId: string): Promise<Question[]> {
    return this.prisma.question.findMany({
      where: { sectionId },
      orderBy: { orderIndex: 'asc' },
      include: {
        visibilityRules: true,
      },
    });
  }

  async getTotalQuestionCount(questionnaireId: string, persona?: Persona): Promise<number> {
    return this.prisma.question.count({
      where: {
        section: {
          questionnaireId,
        },
        ...(persona && { persona }),
      },
    });
  }

  /**
   * Get all questions for a questionnaire filtered by persona.
   * Returns questions ordered by dimension severity (highest first) for NQS compatibility.
   */
  async getQuestionsForPersona(questionnaireId: string, persona?: Persona): Promise<Question[]> {
    return this.prisma.question.findMany({
      where: {
        section: {
          questionnaireId,
        },
        ...(persona && { persona }),
      },
      orderBy: [{ severity: 'desc' }, { orderIndex: 'asc' }],
      include: {
        dimension: true,
        visibilityRules: true,
        section: true,
      },
    });
  }

  private mapToListItem(
    questionnaire: Questionnaire & {
      sections: (Section & { _count: { questions: number } })[];
    },
  ): QuestionnaireListItem {
    const totalQuestions = questionnaire.sections.reduce(
      (sum, section) => sum + section._count.questions,
      0,
    );

    return {
      id: questionnaire.id,
      name: questionnaire.name,
      description: questionnaire.description ?? undefined,
      industry: questionnaire.industry ?? undefined,
      version: questionnaire.version,
      estimatedTime: questionnaire.estimatedTime ?? undefined,
      totalQuestions,
      sections: questionnaire.sections.map((section) => ({
        id: section.id,
        name: section.name,
        questionCount: section._count.questions,
      })),
      createdAt: questionnaire.createdAt,
    };
  }

  private mapToDetail(
    questionnaire: Questionnaire & {
      sections: (Section & { questions: Question[] })[];
    },
  ): QuestionnaireDetail {
    return {
      id: questionnaire.id,
      name: questionnaire.name,
      description: questionnaire.description ?? undefined,
      industry: questionnaire.industry ?? undefined,
      version: questionnaire.version,
      estimatedTime: questionnaire.estimatedTime ?? undefined,
      sections: questionnaire.sections.map((section) => ({
        id: section.id,
        name: section.name,
        description: section.description ?? undefined,
        order: section.orderIndex,
        icon: section.icon ?? undefined,
        estimatedTime: section.estimatedTime ?? undefined,
        questionCount: section.questions.length,
        questions: section.questions.map((question) => this.mapQuestion(question)),
      })),
    };
  }

  private mapQuestion(question: Question): QuestionResponse {
    const options = question.options as QuestionOption[] | null;
    const validation = question.validationRules as Record<string, unknown> | null;

    return {
      id: question.id,
      text: question.text,
      type: question.type,
      required: question.isRequired,
      helpText: question.helpText ?? undefined,
      explanation: question.explanation ?? undefined,
      placeholder: question.placeholder ?? undefined,
      options: options ?? undefined,
      validation: validation ?? undefined,
    };
  }
}
