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
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  createDecision: async (sessionId, statement, assumptions) => {
    set({ isLoading: true, error: null });
    try {
      const decision = await questionnaireApi.createDecision(sessionId, statement, assumptions);
      set({ decisions: [decision as Decision, ...get().decisions], isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  reset: () => set({ decisions: [], isLoading: false, error: null }),
}));
