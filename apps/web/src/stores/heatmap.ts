import { create } from 'zustand';
import { questionnaireApi, type HeatmapResult } from '../api/questionnaire';

interface HeatmapState {
  heatmap: HeatmapResult | null;
  isLoading: boolean;
  error: string | null;
  drilldown: any | null;

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
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message ?? err.message });
    }
  },

  loadDrilldown: async (sessionId, dimensionKey, severityBucket) => {
    try {
      const drilldown = await questionnaireApi.getHeatmapDrilldown(sessionId, dimensionKey, severityBucket);
      set({ drilldown });
    } catch (err: any) {
      console.warn('Drilldown failed:', err);
    }
  },

  clearDrilldown: () => set({ drilldown: null }),
  reset: () => set({ heatmap: null, isLoading: false, error: null, drilldown: null }),
}));
