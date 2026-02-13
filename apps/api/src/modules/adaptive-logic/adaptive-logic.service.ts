import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Question, VisibilityRule, VisibilityAction } from '@prisma/client';
import { ConditionEvaluator } from './evaluators/condition.evaluator';
import { Condition, LogicalOperator } from './types/rule.types';

export interface QuestionState {
  visible: boolean;
  required: boolean;
  disabled: boolean;
}

export interface EvaluationResult {
  questionId: string;
  state: QuestionState;
  appliedRules: string[];
}

@Injectable()
export class AdaptiveLogicService {
  private readonly logger = new Logger(AdaptiveLogicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluator: ConditionEvaluator,
  ) {}

  /**
   * Get all visible questions for a questionnaire based on current responses
   */
  async getVisibleQuestions(
    questionnaireId: string,
    responses: Map<string, unknown>,
    persona?: string,
  ): Promise<Question[]> {
    // Get all questions with their visibility rules
    const questions = await this.prisma.question.findMany({
      where: {
        section: {
          questionnaireId,
        },
        ...(persona && { persona: persona as any }),
      },
      include: {
        visibilityRules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
        section: true,
      },
      orderBy: [{ section: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
    });

    // Evaluate visibility for each question
    const visibleQuestions: Question[] = [];

    for (const question of questions) {
      const state = this.evaluateQuestionState(question, responses);
      if (state.visible) {
        visibleQuestions.push(question);
      }
    }

    return visibleQuestions;
  }

  /**
   * Evaluate the state of a specific question
   */
  evaluateQuestionState(
    question: Question & { visibilityRules?: VisibilityRule[] },
    responses: Map<string, unknown>,
  ): QuestionState {
    // Default state
    const state: QuestionState = {
      visible: true,
      required: question.isRequired,
      disabled: false,
    };

    // If no visibility rules, return default state
    if (!question.visibilityRules || question.visibilityRules.length === 0) {
      return state;
    }

    // Evaluate each rule in priority order (highest first)
    const sortedRules = [...question.visibilityRules].sort(
      (left, right) => (right.priority ?? 0) - (left.priority ?? 0),
    );
    let visibilityResolved = false;
    let requiredResolved = false;

    for (const rule of sortedRules) {
      const condition = rule.condition as Condition;
      const ruleResult = this.evaluateCondition(condition, responses);

      if (ruleResult) {
        // Apply the rule's action
        switch (rule.action) {
          case VisibilityAction.SHOW:
            if (!visibilityResolved) {
              state.visible = true;
              visibilityResolved = true;
            }
            break;
          case VisibilityAction.HIDE:
            if (!visibilityResolved) {
              state.visible = false;
              visibilityResolved = true;
            }
            break;
          case VisibilityAction.REQUIRE:
            if (!requiredResolved) {
              state.required = true;
              requiredResolved = true;
            }
            break;
          case VisibilityAction.UNREQUIRE:
            if (!requiredResolved) {
              state.required = false;
              requiredResolved = true;
            }
            break;
        }

        if (visibilityResolved && requiredResolved) {
          break;
        }
      }
    }

    return state;
  }

  /**
   * Get the next question in the flow based on branching rules
   */
  async getNextQuestion(
    currentQuestionId: string,
    responses: Map<string, unknown>,
    persona?: string,
  ): Promise<Question | null> {
    // Get current question
    const currentQuestion = await this.prisma.question.findUnique({
      where: { id: currentQuestionId },
      include: {
        section: {
          include: {
            questionnaire: true,
          },
        },
        visibilityRules: {
          where: { isActive: true },
        },
      },
    });

    if (!currentQuestion) {
      return null;
    }

    // Get all visible questions
    const visibleQuestions = await this.getVisibleQuestions(
      currentQuestion.section.questionnaireId,
      responses,
      persona,
    );

    // Find current position and return next
    const currentIndex = visibleQuestions.findIndex((q) => q.id === currentQuestionId);

    if (currentIndex === -1 || currentIndex >= visibleQuestions.length - 1) {
      return null;
    }

    return visibleQuestions[currentIndex + 1];
  }

  /**
   * Evaluate a condition against responses
   */
  evaluateCondition(condition: Condition, responses: Map<string, unknown>): boolean {
    return this.conditionEvaluator.evaluate(condition, responses);
  }

  /**
   * Evaluate multiple conditions with a logical operator
   */
  evaluateConditions(
    conditions: Condition[],
    operator: LogicalOperator,
    responses: Map<string, unknown>,
  ): boolean {
    if (conditions.length === 0) {
      return true;
    }

    const results = conditions.map((c) => this.evaluateCondition(c, responses));

    if (operator === 'AND') {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  /**
   * Calculate which questions were added or removed due to a response change
   */
  async calculateAdaptiveChanges(
    questionnaireId: string,
    previousResponses: Map<string, unknown>,
    currentResponses: Map<string, unknown>,
  ): Promise<{ added: string[]; removed: string[] }> {
    const previousVisible = await this.getVisibleQuestions(questionnaireId, previousResponses);
    const currentVisible = await this.getVisibleQuestions(questionnaireId, currentResponses);

    const previousIds = new Set(previousVisible.map((q) => q.id));
    const currentIds = new Set(currentVisible.map((q) => q.id));

    const added = currentVisible.filter((q) => !previousIds.has(q.id)).map((q) => q.id);
    const removed = previousVisible.filter((q) => !currentIds.has(q.id)).map((q) => q.id);

    return { added, removed };
  }

  /**
   * Get all rules that affect a specific question
   */
  async getRulesForQuestion(questionId: string): Promise<VisibilityRule[]> {
    return this.prisma.visibilityRule.findMany({
      where: {
        OR: [{ questionId }, { targetQuestionIds: { has: questionId } }],
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Build a dependency graph for questions
   */
  async buildDependencyGraph(questionnaireId: string): Promise<Map<string, Set<string>>> {
    const rules = await this.prisma.visibilityRule.findMany({
      where: {
        question: {
          section: {
            questionnaireId,
          },
        },
        isActive: true,
      },
    });

    const graph = new Map<string, Set<string>>();

    for (const rule of rules) {
      const condition = rule.condition as Condition;
      const sourceQuestionId = this.extractQuestionIdFromCondition(condition);

      if (sourceQuestionId) {
        for (const targetId of rule.targetQuestionIds) {
          if (!graph.has(sourceQuestionId)) {
            graph.set(sourceQuestionId, new Set());
          }
          graph.get(sourceQuestionId)!.add(targetId);
        }
      }
    }

    return graph;
  }

  private extractQuestionIdFromCondition(condition: Condition): string | null {
    if (condition.field) {
      return condition.field;
    }
    if (condition.nested && condition.nested.length > 0) {
      return this.extractQuestionIdFromCondition(condition.nested[0]);
    }
    return null;
  }
}
