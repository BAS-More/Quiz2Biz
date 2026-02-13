import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Questionnaire, Section, Question, VisibilityRule, Prisma } from '@prisma/client';
import { PaginationDto } from '@libs/shared';
import { AdminAuditService } from './admin-audit.service';
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

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface QuestionnaireWithDetails extends Questionnaire {
  sections: (Section & {
    questions: (Question & {
      visibilityRules: VisibilityRule[];
    })[];
  })[];
  _count: {
    sessions: number;
  };
}

@Injectable()
export class AdminQuestionnaireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  // ============================================================================
  // QUESTIONNAIRE CRUD
  // ============================================================================

  async findAllQuestionnaires(pagination: PaginationDto): Promise<PaginatedResult<Questionnaire>> {
    const [items, total] = await Promise.all([
      this.prisma.questionnaire.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { sections: true, sessions: true },
          },
        },
      }),
      this.prisma.questionnaire.count(),
    ]);

    return { items, total };
  }

  async findQuestionnaireById(id: string): Promise<QuestionnaireWithDetails> {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                visibilityRules: {
                  orderBy: { priority: 'desc' },
                },
              },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    return questionnaire;
  }

  async createQuestionnaire(dto: CreateQuestionnaireDto, userId: string): Promise<Questionnaire> {
    const questionnaire = await this.prisma.questionnaire.create({
      data: {
        name: dto.name,
        description: dto.description,
        industry: dto.industry,
        isDefault: dto.isDefault ?? false,
        estimatedTime: dto.estimatedTime,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_QUESTIONNAIRE',
      resourceType: 'Questionnaire',
      resourceId: questionnaire.id,
      changes: { after: questionnaire },
    });

    return questionnaire;
  }

  async updateQuestionnaire(
    id: string,
    dto: UpdateQuestionnaireDto,
    userId: string,
  ): Promise<Questionnaire> {
    const existing = await this.prisma.questionnaire.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    const questionnaire = await this.prisma.questionnaire.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        industry: dto.industry,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
        estimatedTime: dto.estimatedTime,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_QUESTIONNAIRE',
      resourceType: 'Questionnaire',
      resourceId: id,
      changes: { before: existing, after: questionnaire },
    });

    return questionnaire;
  }

  async deleteQuestionnaire(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.questionnaire.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false
    await this.prisma.questionnaire.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      userId,
      action: 'DELETE_QUESTIONNAIRE',
      resourceType: 'Questionnaire',
      resourceId: id,
      changes: { before: existing },
    });
  }

  // ============================================================================
  // SECTION CRUD
  // ============================================================================

  async createSection(
    questionnaireId: string,
    dto: CreateSectionDto,
    userId: string,
  ): Promise<Section> {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: { sections: { select: { orderIndex: true } } },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${questionnaireId} not found`);
    }

    // Auto-calculate orderIndex if not provided
    const maxOrder = questionnaire.sections.reduce((max, s) => Math.max(max, s.orderIndex), -1);
    const orderIndex = dto.orderIndex ?? maxOrder + 1;

    const section = await this.prisma.section.create({
      data: {
        questionnaireId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        estimatedTime: dto.estimatedTime,
        orderIndex,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_SECTION',
      resourceType: 'Section',
      resourceId: section.id,
      changes: { after: section },
    });

    return section;
  }

  async updateSection(id: string, dto: UpdateSectionDto, userId: string): Promise<Section> {
    const existing = await this.prisma.section.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    const section = await this.prisma.section.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        estimatedTime: dto.estimatedTime,
        orderIndex: dto.orderIndex,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_SECTION',
      resourceType: 'Section',
      resourceId: id,
      changes: { before: existing, after: section },
    });

    return section;
  }

  async deleteSection(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.section.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    if (existing._count.questions > 0) {
      throw new BadRequestException(
        `Cannot delete section with ${existing._count.questions} questions. Delete questions first.`,
      );
    }

    await this.prisma.section.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE_SECTION',
      resourceType: 'Section',
      resourceId: id,
      changes: { before: existing },
    });
  }

  async reorderSections(
    questionnaireId: string,
    dto: ReorderSectionsDto,
    userId: string,
  ): Promise<Section[]> {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${questionnaireId} not found`);
    }

    const sections = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.section.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    await this.auditService.log({
      userId,
      action: 'REORDER_SECTIONS',
      resourceType: 'Questionnaire',
      resourceId: questionnaireId,
      changes: { after: dto.items },
    });

    return sections;
  }

  // ============================================================================
  // QUESTION CRUD
  // ============================================================================

  async createQuestion(
    sectionId: string,
    dto: CreateQuestionDto,
    userId: string,
  ): Promise<Question> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { questions: { select: { orderIndex: true } } },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    // Auto-calculate orderIndex if not provided
    const maxOrder = section.questions.reduce((max, q) => Math.max(max, q.orderIndex), -1);
    const orderIndex = dto.orderIndex ?? maxOrder + 1;

    const question = await this.prisma.question.create({
      data: {
        sectionId,
        text: dto.text,
        type: dto.type,
        helpText: dto.helpText,
        explanation: dto.explanation,
        placeholder: dto.placeholder,
        isRequired: dto.isRequired ?? false,
        options: dto.options as Prisma.InputJsonValue | undefined,
        validationRules: dto.validationRules as Prisma.InputJsonValue | undefined,
        defaultValue: dto.defaultValue as Prisma.InputJsonValue | undefined,
        suggestedAnswer: dto.suggestedAnswer as Prisma.InputJsonValue | undefined,
        industryTags: dto.industryTags ?? [],
        documentMappings: dto.documentMappings as Prisma.InputJsonValue,
        orderIndex,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_QUESTION',
      resourceType: 'Question',
      resourceId: question.id,
      changes: { after: question },
    });

    return question;
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto, userId: string): Promise<Question> {
    const existing = await this.prisma.question.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    const question = await this.prisma.question.update({
      where: { id },
      data: {
        text: dto.text,
        type: dto.type,
        helpText: dto.helpText,
        explanation: dto.explanation,
        placeholder: dto.placeholder,
        isRequired: dto.isRequired,
        options: dto.options as Prisma.InputJsonValue | undefined,
        validationRules: dto.validationRules as Prisma.InputJsonValue | undefined,
        defaultValue: dto.defaultValue as Prisma.InputJsonValue | undefined,
        suggestedAnswer: dto.suggestedAnswer as Prisma.InputJsonValue | undefined,
        industryTags: dto.industryTags,
        documentMappings: dto.documentMappings as Prisma.InputJsonValue | undefined,
        orderIndex: dto.orderIndex,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_QUESTION',
      resourceType: 'Question',
      resourceId: id,
      changes: { before: existing, after: question },
    });

    return question;
  }

  async deleteQuestion(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.question.findUnique({
      where: { id },
      include: { _count: { select: { responses: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    if (existing._count.responses > 0) {
      throw new BadRequestException(
        `Cannot delete question with ${existing._count.responses} responses. This would corrupt session data.`,
      );
    }

    await this.prisma.question.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE_QUESTION',
      resourceType: 'Question',
      resourceId: id,
      changes: { before: existing },
    });
  }

  async reorderQuestions(
    sectionId: string,
    dto: ReorderQuestionsDto,
    userId: string,
  ): Promise<Question[]> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    const questions = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.question.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    await this.auditService.log({
      userId,
      action: 'REORDER_QUESTIONS',
      resourceType: 'Section',
      resourceId: sectionId,
      changes: { after: dto.items },
    });

    return questions;
  }

  // ============================================================================
  // VISIBILITY RULE CRUD
  // ============================================================================

  async findRulesByQuestion(questionId: string): Promise<VisibilityRule[]> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    return this.prisma.visibilityRule.findMany({
      where: { questionId },
      orderBy: { priority: 'desc' },
    });
  }

  async createVisibilityRule(
    questionId: string,
    dto: CreateVisibilityRuleDto,
    userId: string,
  ): Promise<VisibilityRule> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const rule = await this.prisma.visibilityRule.create({
      data: {
        questionId,
        condition: dto.condition as Prisma.InputJsonValue,
        action: dto.action,
        targetQuestionIds: dto.targetQuestionIds,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_VISIBILITY_RULE',
      resourceType: 'VisibilityRule',
      resourceId: rule.id,
      changes: { after: rule },
    });

    return rule;
  }

  async updateVisibilityRule(
    id: string,
    dto: UpdateVisibilityRuleDto,
    userId: string,
  ): Promise<VisibilityRule> {
    const existing = await this.prisma.visibilityRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Visibility rule with ID ${id} not found`);
    }

    const rule = await this.prisma.visibilityRule.update({
      where: { id },
      data: {
        condition: dto.condition as Prisma.InputJsonValue | undefined,
        action: dto.action,
        targetQuestionIds: dto.targetQuestionIds,
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_VISIBILITY_RULE',
      resourceType: 'VisibilityRule',
      resourceId: id,
      changes: { before: existing, after: rule },
    });

    return rule;
  }

  async deleteVisibilityRule(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.visibilityRule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Visibility rule with ID ${id} not found`);
    }

    await this.prisma.visibilityRule.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE_VISIBILITY_RULE',
      resourceType: 'VisibilityRule',
      resourceId: id,
      changes: { before: existing },
    });
  }
}
