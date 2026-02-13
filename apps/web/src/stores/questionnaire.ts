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

interface QuestionnaireState {
  // Session state
  session: SessionResponse | null;
  sessions: SessionResponse[];
  isLoading: boolean;
  error: string | null;

  // Question flow
  currentQuestions: QuestionItem[];
  currentSection: ContinueSessionResponse['currentSection'] | null;

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
  submitResponse: (sessionId: string, questionId: string, value: unknown, timeSpent?: number) => Promise<SubmitResponseResult>;
  completeSession: (sessionId: string) => Promise<void>;
  loadScore: (sessionId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  session: null,
  sessions: [],
  isLoading: false,
  error: null,
  currentQuestions: [],
  currentSection: null,
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
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  loadSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const session = await questionnaireApi.getSession(sessionId);
      set({ session, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await questionnaireApi.listSessions();
      set({ sessions: result.items, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  continueSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await questionnaireApi.continueSession(sessionId);
      set({
        session: result.session,
        currentQuestions: result.nextQuestions,
        currentSection: result.currentSection,
        readinessScore: result.readinessScore ?? null,
        canComplete: result.canComplete,
        isComplete: result.isComplete,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  submitResponse: async (sessionId, questionId, value, timeSpent) => {
    set({ isLoading: true, error: null });
    try {
      const result = await questionnaireApi.submitResponse(sessionId, {
        questionId,
        value,
        timeSpentSeconds: timeSpent,
      });
      // Update local state with new score and NQS hint
      set({
        readinessScore: result.readinessScore ?? get().readinessScore,
        nqsHint: result.nextQuestionByNQS ?? null,
      });
      // Refresh session state to get next question
      await get().continueSession(sessionId);
      return result;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
      throw err;
    }
  },

  completeSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const session = await questionnaireApi.completeSession(sessionId);
      set({ session, isComplete: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
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
    } catch (err: any) {
      // Non-critical, don't block the UI
      console.warn('Failed to load score:', err);
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
