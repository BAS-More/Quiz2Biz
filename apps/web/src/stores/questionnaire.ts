/**
 * Questionnaire store using Zustand
 * Manages session state, current question, scoring, and adaptive flow
 */

import { create } from 'zustand';
import {
  questionnaireApi,
  type Persona,
  type SessionResponse,
  type QuestionItem,
  type ContinueSessionResponse,
  type SubmitResponseResult,
  type DimensionResidual,
} from '../api/questionnaire';
import { logger } from '../lib/logger';

/** History entry for tracking answered questions */
interface QuestionHistoryEntry {
  question: QuestionItem;
  section: ContinueSessionResponse['currentSection'] | null;
  answeredValue: unknown;
  timestamp: number;
}

interface QuestionnaireState {
  // Session state
  session: SessionResponse | null;
  sessions: SessionResponse[];
  isLoading: boolean;
  error: string | null;

  // Question flow
  currentQuestions: QuestionItem[];
  currentSection: ContinueSessionResponse['currentSection'] | null;

  // Navigation history for back/skip
  questionHistory: QuestionHistoryEntry[];
  isReviewingPrevious: boolean;
  reviewIndex: number;

  // Scoring
  readinessScore: number | null;
  dimensions: DimensionResidual[];
  scoreTrend: 'UP' | 'DOWN' | 'STABLE' | 'FIRST' | null;

  // Adaptive state
  canComplete: boolean;
  isComplete: boolean;
  nqsHint: SubmitResponseResult['nextQuestionByNQS'] | null;

  // Actions
  createSession: (questionnaireId: string, persona?: Persona, industry?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  continueSession: (sessionId: string) => Promise<void>;
  submitResponse: (
    sessionId: string,
    questionId: string,
    value: unknown,
    timeSpent?: number,
  ) => Promise<SubmitResponseResult>;
  completeSession: (sessionId: string) => Promise<void>;
  loadScore: (sessionId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // Navigation actions
  goToPrevious: () => void;
  goToNext: () => void;
  skipQuestion: (sessionId: string) => Promise<void>;
  canGoBack: () => boolean;
  canSkip: () => boolean;
}

const initialState = {
  session: null,
  sessions: [],
  isLoading: false,
  error: null,
  currentQuestions: [],
  currentSection: null,
  questionHistory: [] as QuestionHistoryEntry[],
  isReviewingPrevious: false,
  reviewIndex: -1,
  readinessScore: null,
  dimensions: [],
  scoreTrend: null,
  canComplete: false,
  isComplete: false,
  nqsHint: null,
};

export const useQuestionnaireStore = create<QuestionnaireState>()((set, get) => ({
  ...initialState,

  createSession: async (questionnaireId, persona, industry) => {
    set({ isLoading: true, error: null });
    try {
      const session = await questionnaireApi.createSession({ questionnaireId, persona, industry });
      set({ session });
      // Auto-continue to get first question (keeps isLoading: true until done)
      await get().continueSession(session.id);
    } catch (err: unknown) {
      set({
        isLoading: false,
        error:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Unknown error',
      });
    }
  },

  loadSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const session = await questionnaireApi.getSession(sessionId);
      set({ session, isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Unknown error',
      });
    }
  },

  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await questionnaireApi.listSessions();
      set({ sessions: result.items, isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Unknown error',
      });
    }
  },

  continueSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await questionnaireApi.continueSession(sessionId);
      set({
        session: result.session,
        currentQuestions: result.nextQuestions ?? [],
        currentSection: result.currentSection ?? null,
        readinessScore: result.readinessScore ?? null,
        canComplete: result.canComplete ?? false,
        isComplete: result.isComplete ?? false,
        isLoading: false,
      });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Unknown error',
      });
    }
  },

  submitResponse: async (sessionId, questionId, value, timeSpent) => {
    const { currentQuestions, currentSection, questionHistory, isReviewingPrevious, reviewIndex } = get();
    const currentQuestion = currentQuestions[0];

    set({ isLoading: true, error: null });
    try {
      const result = await questionnaireApi.submitResponse(sessionId, {
        questionId,
        value,
        timeSpentSeconds: timeSpent,
      });

      // Track question in history (only if answering new questions, not reviewing)
      if (currentQuestion && !isReviewingPrevious) {
        const historyEntry: QuestionHistoryEntry = {
          question: currentQuestion,
          section: currentSection,
          answeredValue: value,
          timestamp: Date.now(),
        };
        // Append to history
        set({ questionHistory: [...questionHistory, historyEntry] });
      } else if (isReviewingPrevious && reviewIndex >= 0) {
        // Update existing history entry when re-answering
        const updatedHistory = [...questionHistory];
        if (updatedHistory[reviewIndex]) {
          updatedHistory[reviewIndex] = {
            ...updatedHistory[reviewIndex],
            answeredValue: value,
            timestamp: Date.now(),
          };
        }
        set({ questionHistory: updatedHistory });
      }

      // Update local state with new score and NQS hint
      set({
        readinessScore: result.readinessScore ?? get().readinessScore,
        nqsHint: result.nextQuestionByNQS ?? null,
        isReviewingPrevious: false,
        reviewIndex: -1,
      });

      // Refresh session state to get next question
      await get().continueSession(sessionId);
      return result;
    } catch (err: unknown) {
      set({
        isLoading: false,
        error:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Unknown error',
      });
      throw err;
    }
  },

  completeSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const session = await questionnaireApi.completeSession(sessionId);
      set({ session, isComplete: true, isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Unknown error',
      });
    }
  },

  loadScore: async (sessionId) => {
    try {
      const scoreResult = await questionnaireApi.getScore(sessionId);
      set({
        readinessScore: scoreResult.score,
        dimensions: scoreResult.dimensions,
        scoreTrend: scoreResult.trend,
      });
    } catch (err: unknown) {
      // Non-critical, don't block the UI
      logger.warn('Failed to load score:', err);
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),

  // Navigation: go to previous question in history
  goToPrevious: () => {
    const { questionHistory, isReviewingPrevious, reviewIndex } = get();
    if (questionHistory.length === 0) return;

    if (!isReviewingPrevious) {
      // Start reviewing from the last answered question
      const lastIndex = questionHistory.length - 1;
      const entry = questionHistory[lastIndex];
      set({
        isReviewingPrevious: true,
        reviewIndex: lastIndex,
        currentQuestions: [entry.question],
        currentSection: entry.section,
      });
    } else if (reviewIndex > 0) {
      // Go further back in history
      const newIndex = reviewIndex - 1;
      const entry = questionHistory[newIndex];
      set({
        reviewIndex: newIndex,
        currentQuestions: [entry.question],
        currentSection: entry.section,
      });
    }
  },

  // Navigation: go to next question (or exit review mode)
  goToNext: () => {
    const { questionHistory, isReviewingPrevious, reviewIndex, session } = get();
    if (!isReviewingPrevious) return;

    if (reviewIndex < questionHistory.length - 1) {
      // Move forward in history
      const newIndex = reviewIndex + 1;
      const entry = questionHistory[newIndex];
      set({
        reviewIndex: newIndex,
        currentQuestions: [entry.question],
        currentSection: entry.section,
      });
    } else {
      // Exit review mode and continue session to get next question
      set({ isReviewingPrevious: false, reviewIndex: -1 });
      if (session) {
        get().continueSession(session.id);
      }
    }
  },

  // Navigation: skip current optional question
  skipQuestion: async (sessionId: string) => {
    const { currentQuestions, isReviewingPrevious, goToNext } = get();
    const currentQuestion = currentQuestions[0];

    if (!currentQuestion || currentQuestion.required) return;

    if (isReviewingPrevious) {
      // If reviewing, just move forward
      goToNext();
    } else {
      // Submit empty response and continue
      set({ isLoading: true });
      try {
        await get().continueSession(sessionId);
      } finally {
        set({ isLoading: false });
      }
    }
  },

  // Check if can go back
  canGoBack: () => {
    const { questionHistory, isReviewingPrevious, reviewIndex } = get();
    if (!isReviewingPrevious) {
      return questionHistory.length > 0;
    }
    return reviewIndex > 0;
  },

  // Check if current question can be skipped
  canSkip: () => {
    const { currentQuestions } = get();
    const currentQuestion = currentQuestions[0];
    return currentQuestion ? !currentQuestion.required : false;
  },
}));
