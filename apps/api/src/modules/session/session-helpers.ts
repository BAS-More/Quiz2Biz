/**
 * Pure helper functions shared by session query and mutation services.
 * No injected dependencies — all state passed as arguments.
 */
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Session, Question } from '@prisma/client';
import { PrismaService } from '@libs/database';
import { QuestionResponse, QuestionOption } from '../questionnaire/questionnaire.service';
import { ProgressInfo, SessionResponse, READINESS_GATED_PROJECT_TYPE } from './session-types';

// ---------------------------------------------------------------------------
// Async helpers (require PrismaService)
// ---------------------------------------------------------------------------

export async function getSessionWithValidation(
  prisma: PrismaService,
  sessionId: string,
  userId: string,
): Promise<Session> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    throw new NotFoundException('Session not found');
  }
  if (session.userId !== userId) {
    throw new ForbiddenException('Access denied to this session');
  }
  return session;
}

export async function isReadinessGatedSession(
  prisma: PrismaService,
  session: { projectTypeId: string | null },
): Promise<boolean> {
  if (!session.projectTypeId) {
    return false;
  }
  const projectType = await prisma.projectType.findUnique({
    where: { id: session.projectTypeId },
    select: { slug: true },
  });
  return projectType?.slug === READINESS_GATED_PROJECT_TYPE;
}

// ---------------------------------------------------------------------------
// Pure helpers (no async, no external deps)
// ---------------------------------------------------------------------------

export function mapToSessionResponse(
  session: Session & {
    currentSection?: { id: string; name: string } | null;
    projectType?: { name: string; slug: string } | null;
  },
  totalQuestions: number,
  sectionInfo?: { totalSections: number; completedSections: number },
): SessionResponse {
  const progress = buildProgressFromSession(session, totalQuestions, sectionInfo);

  return {
    id: session.id,
    questionnaireId: session.questionnaireId,
    userId: session.userId,
    status: session.status,
    persona: session.persona ?? undefined,
    industry: session.industry ?? undefined,
    projectTypeName: session.projectType?.name ?? undefined,
    projectTypeSlug: session.projectType?.slug ?? undefined,
    readinessScore: session.readinessScore ? Number(session.readinessScore) : undefined,
    progress,
    currentSection: session.currentSection
      ? { id: session.currentSection.id, name: session.currentSection.name }
      : undefined,
    createdAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
  };
}

function buildProgressFromSession(
  session: Session,
  totalQuestions: number,
  sectionInfo?: { totalSections: number; completedSections: number },
): ProgressInfo {
  const raw = session.progress as {
    percentage: number;
    answered: number;
    total: number;
  };
  const questionsLeft = (raw.total || totalQuestions) - raw.answered;
  const sectionsLeft = (sectionInfo?.totalSections ?? 0) - (sectionInfo?.completedSections ?? 0);

  return {
    percentage: raw.percentage ?? 0,
    answeredQuestions: raw.answered ?? 0,
    totalQuestions: raw.total || totalQuestions,
    estimatedTimeRemaining: questionsLeft > 0 ? Math.ceil(questionsLeft * 1.5) : 0,
    sectionsLeft,
    questionsLeft,
    totalSections: sectionInfo?.totalSections ?? 0,
    completedSections: sectionInfo?.completedSections ?? 0,
  };
}

export function mapQuestionToResponse(question: Question): QuestionResponse {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    required: question.isRequired,
    helpText: question.helpText ?? undefined,
    explanation: question.explanation ?? undefined,
    placeholder: question.placeholder ?? undefined,
    options: question.options ? (question.options as unknown as QuestionOption[]) : undefined,
    validation: question.validationRules
      ? (question.validationRules as Record<string, unknown>)
      : undefined,
    bestPractice: question.bestPractice ?? undefined,
    practicalExplainer: question.practicalExplainer ?? undefined,
    dimensionKey: question.dimensionKey ?? undefined,
  };
}

export function calculateProgress(
  answeredCount: number,
  totalQuestions: number,
  sectionInfo?: { totalSections: number; completedSections: number },
): ProgressInfo {
  const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const questionsLeft = totalQuestions - answeredCount;
  const sectionsLeft = (sectionInfo?.totalSections ?? 0) - (sectionInfo?.completedSections ?? 0);

  return {
    percentage,
    answeredQuestions: answeredCount,
    totalQuestions,
    estimatedTimeRemaining: questionsLeft > 0 ? Math.ceil(questionsLeft * 1.5) : 0,
    sectionsLeft,
    questionsLeft,
    totalSections: sectionInfo?.totalSections ?? 0,
    completedSections: sectionInfo?.completedSections ?? 0,
  };
}

export function validateResponse(
  question: Question,
  value: unknown,
): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];
  const validation = question.validationRules as Record<string, unknown> | null;

  // Check required
  if (question.isRequired && (value === null || value === undefined || value === '')) {
    errors.push('This field is required');
  }

  // Type-specific validation
  if (value !== null && value !== undefined && validation) {
    validateStringConstraints(value, validation, errors);
    validateNumericConstraints(value, validation, errors);
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

function validateStringConstraints(
  value: unknown,
  validation: Record<string, unknown>,
  errors: string[],
): void {
  if (typeof value !== 'string') {
    return;
  }
  const minLength = typeof validation.minLength === 'number' ? validation.minLength : undefined;
  const maxLength = typeof validation.maxLength === 'number' ? validation.maxLength : undefined;
  if (minLength !== undefined && value.length < minLength) {
    errors.push(`Minimum length is ${minLength} characters`);
  }
  if (maxLength !== undefined && value.length > maxLength) {
    errors.push(`Maximum length is ${maxLength} characters`);
  }
}

function validateNumericConstraints(
  value: unknown,
  validation: Record<string, unknown>,
  errors: string[],
): void {
  if (typeof value !== 'number') {
    return;
  }
  const min = typeof validation.min === 'number' ? validation.min : undefined;
  const max = typeof validation.max === 'number' ? validation.max : undefined;
  if (min !== undefined && value < min) {
    errors.push(`Minimum value is ${min}`);
  }
  if (max !== undefined && value > max) {
    errors.push(`Maximum value is ${max}`);
  }
}

export function findNextUnansweredQuestion(
  visibleQuestions: Question[],
  currentQuestionId: string,
  responseMap: Map<string, unknown>,
): Question | null {
  const currentIndex = visibleQuestions.findIndex((q) => q.id === currentQuestionId);

  for (let i = currentIndex + 1; i < visibleQuestions.length; i++) {
    if (!responseMap.has(visibleQuestions[i].id)) {
      return visibleQuestions[i];
    }
  }
  // Check unanswered questions before current
  for (let i = 0; i < currentIndex; i++) {
    if (!responseMap.has(visibleQuestions[i].id)) {
      return visibleQuestions[i];
    }
  }
  return null;
}
