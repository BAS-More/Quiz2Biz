import { create } from 'zustand';
import { questionnaireApi, type HeatmapResult } from '../api/questionnaire';

interface HeatmapDrilldown {
  dimensionKey: string;
  dimensionName: string;
  severityBucket: string;
  cellValue: number;
  colorCode: string;
  questionCount: number;
  questions: {
    questionId: string;
    questionText: string;
    severity: number;
    coverage: number;
    residualRisk: number;
  }[];
  potentialImprovement: number;
}

interface HeatmapState {
  heatmap: HeatmapResult | null;
  isLoading: boolean;
  error: string | null;
  drilldown: HeatmapDrilldown | null;

  loadHeatmap: (sessionId: string) => Promise<void>;
  loadDrilldown: (sessionId: string, dimensionKey: string, severityBucket: string) => Promise<void>;
  clearDrilldown: () => void;
  reset: () => void;
}

export const useHeatmapStore = create<HeatmapState>()((set) => ({
  heatmap: null,
  isLoading: false,
  error: null,
  drilldown: null,

  loadHeatmap: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const heatmap = await questionnaireApi.getHeatmap(sessionId);
      set({ heatmap, isLoading: false });
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

  loadDrilldown: async (sessionId, dimensionKey, severityBucket) => {
    try {
      const drilldown = await questionnaireApi.getHeatmapDrilldown(
        sessionId,
        dimensionKey,
        severityBucket,
      );
      set({ drilldown });
    } catch (err: unknown) {
      console.warn('Drilldown failed:', err);
    }
  },

  clearDrilldown: () => set({ drilldown: null }),
  reset: () => set({ heatmap: null, isLoading: false, error: null, drilldown: null }),
}));
