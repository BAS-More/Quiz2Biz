import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock the questionnaire API
vi.mock('../api/questionnaire', () => ({
  questionnaireApi: {
    listEvidence: vi.fn(),
    getEvidenceStats: vi.fn(),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useEvidenceStore } from './evidence';
import { questionnaireApi } from '../api/questionnaire';

const mockEvidence = [
  {
    id: 'ev-1',
    sessionId: 'session-1',
    questionId: 'q-1',
    artifactUrl: 'https://example.com/doc.pdf',
    artifactType: 'document',
    fileName: 'doc.pdf',
    verified: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ev-2',
    sessionId: 'session-1',
    questionId: 'q-2',
    artifactUrl: 'https://example.com/screenshot.png',
    artifactType: 'screenshot',
    fileName: null,
    verified: false,
    createdAt: '2024-01-02T00:00:00Z',
  },
];

const mockStats = {
  total: 5,
  verified: 3,
  pending: 2,
  byType: { document: 3, screenshot: 2 },
};

describe('useEvidenceStore', () => {
  beforeEach(() => {
    act(() => {
      useEvidenceStore.getState().reset();
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useEvidenceStore.getState();
      expect(state.items).toEqual([]);
      expect(state.stats).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadEvidence', () => {
    it('fetches evidence and sets state', async () => {
      vi.mocked(questionnaireApi.listEvidence).mockResolvedValueOnce(mockEvidence);

      await act(async () => {
        await useEvidenceStore.getState().loadEvidence('session-1');
      });

      const state = useEvidenceStore.getState();
      expect(state.items).toEqual(mockEvidence);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(questionnaireApi.listEvidence).toHaveBeenCalledWith('session-1');
    });

    it('sets loading during fetch', async () => {
      let loadingDuringFetch = false;
      vi.mocked(questionnaireApi.listEvidence).mockImplementation(async () => {
        loadingDuringFetch = useEvidenceStore.getState().isLoading;
        return mockEvidence;
      });

      await act(async () => {
        await useEvidenceStore.getState().loadEvidence('session-1');
      });

      expect(loadingDuringFetch).toBe(true);
    });

    it('handles API error with response data message', async () => {
      vi.mocked(questionnaireApi.listEvidence).mockRejectedValueOnce({
        response: { data: { message: 'Unauthorized' } },
      });

      await act(async () => {
        await useEvidenceStore.getState().loadEvidence('session-1');
      });

      expect(useEvidenceStore.getState().error).toBe('Unauthorized');
      expect(useEvidenceStore.getState().isLoading).toBe(false);
    });

    it('handles Error object', async () => {
      vi.mocked(questionnaireApi.listEvidence).mockRejectedValueOnce(new Error('Timeout'));

      await act(async () => {
        await useEvidenceStore.getState().loadEvidence('session-1');
      });

      expect(useEvidenceStore.getState().error).toBe('Timeout');
    });

    it('handles unknown error type', async () => {
      vi.mocked(questionnaireApi.listEvidence).mockRejectedValueOnce(null);

      await act(async () => {
        await useEvidenceStore.getState().loadEvidence('session-1');
      });

      expect(useEvidenceStore.getState().error).toBe('Unknown error');
    });
  });

  describe('loadStats', () => {
    it('fetches and sets stats', async () => {
      vi.mocked(questionnaireApi.getEvidenceStats).mockResolvedValueOnce(mockStats);

      await act(async () => {
        await useEvidenceStore.getState().loadStats('session-1');
      });

      expect(useEvidenceStore.getState().stats).toEqual(mockStats);
      expect(questionnaireApi.getEvidenceStats).toHaveBeenCalledWith('session-1');
    });

    it('logs warning on stats load failure', async () => {
      const { logger } = await import('../lib/logger');
      vi.mocked(questionnaireApi.getEvidenceStats).mockRejectedValueOnce(new Error('Not found'));

      await act(async () => {
        await useEvidenceStore.getState().loadStats('session-1');
      });

      expect(useEvidenceStore.getState().stats).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Failed to load evidence stats:', expect.any(Error));
    });
  });

  describe('reset', () => {
    it('resets to initial state', async () => {
      vi.mocked(questionnaireApi.listEvidence).mockResolvedValueOnce(mockEvidence);
      vi.mocked(questionnaireApi.getEvidenceStats).mockResolvedValueOnce(mockStats);

      await act(async () => {
        await useEvidenceStore.getState().loadEvidence('session-1');
        await useEvidenceStore.getState().loadStats('session-1');
      });

      expect(useEvidenceStore.getState().items).toHaveLength(2);

      act(() => {
        useEvidenceStore.getState().reset();
      });

      const state = useEvidenceStore.getState();
      expect(state.items).toEqual([]);
      expect(state.stats).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
