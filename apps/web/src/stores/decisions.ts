import { create } from 'zustand';
import { questionnaireApi } from '../api/questionnaire';

interface Decision {
  id: string;
  sessionId: string;
  statement: string;
  assumptions: string | null;
  status: string;
  ownerId: string;
  createdAt: string;
}

interface DecisionsState {
  decisions: Decision[];
  isLoading: boolean;
  error: string | null;

  loadDecisions: (sessionId: string) => Promise<void>;
  createDecision: (sessionId: string, statement: string, assumptions?: string) => Promise<void>;
  /** Optimistic status update with automatic rollback on failure */
  updateStatus: (decisionId: string, newStatus: string) => Promise<void>;
  reset: () => void;
}

export const useDecisionsStore = create<DecisionsState>()((set, get) => ({
  decisions: [],
  isLoading: false,
  error: null,

  loadDecisions: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const decisions = await questionnaireApi.listDecisions(sessionId);
      set({ decisions, isLoading: false });
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

  createDecision: async (sessionId, statement, assumptions) => {
    set({ isLoading: true, error: null });
    try {
      const decision = await questionnaireApi.createDecision(sessionId, statement, assumptions);
      set({ decisions: [decision as Decision, ...get().decisions], isLoading: false });
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

  updateStatus: async (decisionId, newStatus) => {
    const previousDecisions = get().decisions;
    // Optimistic update — immediately reflect the new status in the UI
    set({
      decisions: previousDecisions.map((d) =>
        d.id === decisionId ? { ...d, status: newStatus } : d,
      ),
      error: null,
    });
    try {
      await questionnaireApi.updateDecisionStatus(decisionId, newStatus);
    } catch (err: unknown) {
      // Rollback to previous state on failure
      set({
        decisions: previousDecisions,
        error:
          (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ??
          (err as { message?: string })?.message ??
          'Failed to update decision status',
      });
    }
  },

  reset: () => set({ decisions: [], isLoading: false, error: null }),
}));
