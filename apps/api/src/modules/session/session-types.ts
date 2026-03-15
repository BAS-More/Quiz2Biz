import { SessionStatus, Persona } from '@prisma/client';
import { QuestionResponse } from '../questionnaire/questionnaire.service';

/** Quiz2Biz readiness score threshold for session completion */
export const READINESS_SCORE_THRESHOLD = 95.0;

/** Project type slug that enforces the strict readiness gate */
export const READINESS_GATED_PROJECT_TYPE = 'technical-readiness';

export interface ProgressInfo {
  percentage: number;
  answeredQuestions: number;
  totalQuestions: number;
  estimatedTimeRemaining?: number;
  /** Sections left: n | Questions left: m | This section: x/y */
  sectionsLeft: number;
  questionsLeft: number;
  totalSections: number;
  completedSections: number;
}

export interface SessionResponse {
  id: string;
  questionnaireId: string;
  userId: string;
  status: SessionStatus;
  persona?: Persona;
  industry?: string;
  projectTypeName?: string;
  projectTypeSlug?: string;
  readinessScore?: number;
  progress: ProgressInfo;
  currentSection?: { id: string; name: string };
  createdAt: Date;
  lastActivityAt: Date;
}

export interface NextQuestionResponse {
  questions: QuestionResponse[];
  section: { id: string; name: string; progress: number };
  overallProgress: ProgressInfo;
}

export interface SubmitResponseResult {
  responseId: string;
  questionId: string;
  value: unknown;
  validationResult: { isValid: boolean; errors?: string[] };
  adaptiveChanges?: {
    questionsAdded: string[];
    questionsRemoved: string[];
    newEstimatedTotal: number;
  };
  readinessScore?: number;
  nextQuestionByNQS?: {
    questionId: string;
    text: string;
    dimensionKey: string;
    expectedScoreLift: number;
  };
  progress: ProgressInfo;
  createdAt: Date;
}

export interface ContinueSessionResponse {
  session: SessionResponse;
  nextQuestions: QuestionResponse[];
  currentSection: {
    id: string;
    name: string;
    description?: string;
    progress: number;
    questionsInSection: number;
    answeredInSection: number;
  };
  overallProgress: ProgressInfo;
  readinessScore?: number;
  adaptiveState: {
    visibleQuestionCount: number;
    skippedQuestionCount: number;
    appliedRules: string[];
  };
  isComplete: boolean;
  canComplete: boolean;
}

/** Session analytics result */
export interface SessionAnalytics {
  sessionId: string;
  totalResponses: number;
  validResponses: number;
  invalidResponses: number;
  totalTimeSpent: number;
  averageTimePerQuestion: number;
  bySection: Record<string, { answered: number; total: number; avgTime: number }>;
  byDimension: Record<string, { answered: number; coverage: number }>;
  completionRate: number;
  analyzedAt: Date;
}

/** User session statistics */
export interface UserSessionStats {
  userId: string;
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  archivedSessions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageCompletionTimeMs: number;
  scoreImprovement: number;
  analyzedAt: Date;
}

/** Session export format */
export interface SessionExport {
  exportVersion: string;
  exportedAt: Date;
  session: {
    id: string;
    questionnaireId: string;
    questionnaireName: string;
    questionnaireVersion: number;
    status: SessionStatus;
    industry: string | null;
    startedAt: Date;
    completedAt: Date | null;
    readinessScore: number | null;
    progress: Record<string, unknown>;
  };
  responses: Array<{
    questionId: string;
    value: unknown;
    coverage: number | null;
    isValid: boolean;
    answeredAt: Date;
    timeSpentSeconds: number | null;
  }>;
}
