import { create } from 'zustand';
import { questionnaireApi } from '../api/questionnaire';

interface EvidenceItem {
  id: string;
  sessionId: string;
  questionId: string;
  artifactUrl: string;
  artifactType: string;
  fileName: string | null;
  verified: boolean;
  createdAt: string;
}

interface EvidenceStats {
  total: number;
  verified: number;
  pending: number;
  byType: Record<string, number>;
}

interface EvidenceState {
  items: EvidenceItem[];
  stats: EvidenceStats | null;
  isLoading: boolean;
  error: string | null;

  loadEvidence: (sessionId: string) => Promise<void>;
  loadStats: (sessionId: string) => Promise<void>;
  reset: () => void;
}

export const useEvidenceStore = create<EvidenceState>()((set) => ({
  items: [],
  stats: null,
  isLoading: false,
  error: null,

  loadEvidence: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const items = await questionnaireApi.listEvidence(sessionId);
      set({ items, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  loadStats: async (sessionId) => {
    try {
      const stats = await questionnaireApi.getEvidenceStats(sessionId);
      set({ stats });
    } catch (err: any) {
      console.warn('Failed to load evidence stats:', err);
    }
  },

  reset: () => set({ items: [], stats: null, isLoading: false, error: null }),
}));
