import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock the questionnaire API
vi.mock('../api/questionnaire', () => ({
  questionnaireApi: {
    listDecisions: vi.fn(),
    createDecision: vi.fn(),
  },
}));

import { useDecisionsStore } from './decisions';
import { questionnaireApi } from '../api/questionnaire';

const mockDecisions = [
  {
    id: 'dec-1',
    sessionId: 'session-1',
    statement: 'Use microservices architecture',
    assumptions: 'Team is experienced',
    status: 'APPROVED',
    ownerId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'dec-2',
    sessionId: 'session-1',
    statement: 'Deploy to AWS',
    assumptions: null,
    status: 'PENDING',
    ownerId: 'user-1',
    createdAt: '2024-01-02T00:00:00Z',
  },
];

describe('useDecisionsStore', () => {
  beforeEach(() => {
    act(() => {
      useDecisionsStore.getState().reset();
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useDecisionsStore.getState();
      expect(state.decisions).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadDecisions', () => {
    it('fetches decisions and sets state', async () => {
      vi.mocked(questionnaireApi.listDecisions).mockResolvedValueOnce(mockDecisions);

      await act(async () => {
        await useDecisionsStore.getState().loadDecisions('session-1');
      });

      const state = useDecisionsStore.getState();
      expect(state.decisions).toEqual(mockDecisions);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(questionnaireApi.listDecisions).toHaveBeenCalledWith('session-1');
    });

    it('sets loading to true during fetch', async () => {
      let loadingDuringFetch = false;
      vi.mocked(questionnaireApi.listDecisions).mockImplementation(async () => {
        loadingDuringFetch = useDecisionsStore.getState().isLoading;
        return mockDecisions;
      });

      await act(async () => {
        await useDecisionsStore.getState().loadDecisions('session-1');
      });

      expect(loadingDuringFetch).toBe(true);
    });

    it('handles API error with response message', async () => {
      const apiError = {
        response: { data: { message: 'Session not found' } },
      };
      vi.mocked(questionnaireApi.listDecisions).mockRejectedValueOnce(apiError);

      await act(async () => {
        await useDecisionsStore.getState().loadDecisions('bad-session');
      });

      const state = useDecisionsStore.getState();
      expect(state.error).toBe('Session not found');
      expect(state.isLoading).toBe(false);
    });

    it('handles API error with message fallback', async () => {
      const err = new Error('Network error');
      vi.mocked(questionnaireApi.listDecisions).mockRejectedValueOnce(err);

      await act(async () => {
        await useDecisionsStore.getState().loadDecisions('session-1');
      });

      expect(useDecisionsStore.getState().error).toBe('Network error');
    });

    it('handles unknown error', async () => {
      vi.mocked(questionnaireApi.listDecisions).mockRejectedValueOnce(42);

      await act(async () => {
        await useDecisionsStore.getState().loadDecisions('session-1');
      });

      expect(useDecisionsStore.getState().error).toBe('Unknown error');
    });
  });

  describe('createDecision', () => {
    it('creates a decision and prepends to list', async () => {
      const newDecision = {
        id: 'dec-3',
        sessionId: 'session-1',
        statement: 'Use PostgreSQL',
        status: 'PENDING',
        createdAt: '2024-01-03T00:00:00Z',
      };
      vi.mocked(questionnaireApi.createDecision).mockResolvedValueOnce(newDecision);

      // Pre-populate with existing decisions
      act(() => {
        useDecisionsStore.setState({ decisions: mockDecisions });
      });

      await act(async () => {
        await useDecisionsStore
          .getState()
          .createDecision('session-1', 'Use PostgreSQL', 'Good fit');
      });

      const state = useDecisionsStore.getState();
      expect(state.decisions).toHaveLength(3);
      expect(state.decisions[0].id).toBe('dec-3');
      expect(state.isLoading).toBe(false);
      expect(questionnaireApi.createDecision).toHaveBeenCalledWith(
        'session-1',
        'Use PostgreSQL',
        'Good fit',
      );
    });

    it('handles error on create', async () => {
      vi.mocked(questionnaireApi.createDecision).mockRejectedValueOnce(new Error('Forbidden'));

      await act(async () => {
        await useDecisionsStore.getState().createDecision('session-1', 'test');
      });

      expect(useDecisionsStore.getState().error).toBe('Forbidden');
      expect(useDecisionsStore.getState().isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets to initial state', async () => {
      vi.mocked(questionnaireApi.listDecisions).mockResolvedValueOnce(mockDecisions);

      await act(async () => {
        await useDecisionsStore.getState().loadDecisions('session-1');
      });
      expect(useDecisionsStore.getState().decisions).toHaveLength(2);

      act(() => {
        useDecisionsStore.getState().reset();
      });

      const state = useDecisionsStore.getState();
      expect(state.decisions).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
