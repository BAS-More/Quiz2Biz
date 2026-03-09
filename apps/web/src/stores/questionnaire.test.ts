import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock the questionnaire API
vi.mock('../api/questionnaire', () => ({
  questionnaireApi: {
    createSession: vi.fn(),
    getSession: vi.fn(),
    listSessions: vi.fn(),
    continueSession: vi.fn(),
    submitResponse: vi.fn(),
    completeSession: vi.fn(),
    getScore: vi.fn(),
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

import { useQuestionnaireStore } from './questionnaire';
import { questionnaireApi } from '../api/questionnaire';

const mockSession = {
  id: 'sess-1',
  questionnaireId: 'q-1',
  userId: 'user-1',
  status: 'IN_PROGRESS' as const,
  progress: {
    percentage: 25,
    answeredQuestions: 5,
    totalQuestions: 20,
    sectionsLeft: 3,
    questionsLeft: 15,
    totalSections: 4,
    completedSections: 1,
  },
  createdAt: '2024-01-01T00:00:00Z',
  lastActivityAt: '2024-01-01T01:00:00Z',
};

const mockQuestion = {
  id: 'question-1',
  text: 'Do you have CI/CD?',
  type: 'SINGLE_CHOICE',
  required: true,
  options: [
    { id: 'opt-1', label: 'Yes', value: 'yes' },
    { id: 'opt-2', label: 'No', value: 'no' },
  ],
};

const mockOptionalQuestion = {
  id: 'question-2',
  text: 'Additional comments?',
  type: 'TEXT',
  required: false,
};

const mockContinueResponse = {
  session: mockSession,
  nextQuestions: [mockQuestion],
  currentSection: { id: 'sec-1', name: 'DevOps' },
  readinessScore: 42,
  canComplete: false,
  isComplete: false,
};

const mockSubmitResult = {
  responseId: 'resp-1',
  questionId: 'question-1',
  value: 'yes',
  validationResult: { isValid: true },
  readinessScore: 55,
  nextQuestionByNQS: {
    questionId: 'question-3',
    text: 'Next question',
    dimensionKey: 'security',
    expectedScoreLift: 5,
  },
  progress: mockSession.progress,
  createdAt: '2024-01-01T02:00:00Z',
};

describe('useQuestionnaireStore', () => {
  beforeEach(() => {
    act(() => {
      useQuestionnaireStore.getState().reset();
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useQuestionnaireStore.getState();
      expect(state.session).toBeNull();
      expect(state.sessions).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.currentQuestions).toEqual([]);
      expect(state.currentSection).toBeNull();
      expect(state.questionHistory).toEqual([]);
      expect(state.isReviewingPrevious).toBe(false);
      expect(state.reviewIndex).toBe(-1);
      expect(state.readinessScore).toBeNull();
      expect(state.dimensions).toEqual([]);
      expect(state.canComplete).toBe(false);
      expect(state.isComplete).toBe(false);
    });
  });

  describe('createSession', () => {
    it('creates session and auto-continues', async () => {
      vi.mocked(questionnaireApi.createSession).mockResolvedValueOnce(mockSession);
      vi.mocked(questionnaireApi.continueSession).mockResolvedValueOnce(mockContinueResponse);

      await act(async () => {
        await useQuestionnaireStore.getState().createSession('q-1', 'CTO', 'tech');
      });

      expect(questionnaireApi.createSession).toHaveBeenCalledWith({
        questionnaireId: 'q-1',
        persona: 'CTO',
        industry: 'tech',
      });
      expect(questionnaireApi.continueSession).toHaveBeenCalledWith('sess-1');

      const state = useQuestionnaireStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.currentQuestions).toEqual([mockQuestion]);
      expect(state.isLoading).toBe(false);
    });

    it('handles error on create', async () => {
      vi.mocked(questionnaireApi.createSession).mockRejectedValueOnce({
        response: { data: { message: 'Quota exceeded' } },
      });

      await act(async () => {
        await useQuestionnaireStore.getState().createSession('q-1');
      });

      expect(useQuestionnaireStore.getState().error).toBe('Quota exceeded');
      expect(useQuestionnaireStore.getState().isLoading).toBe(false);
    });
  });

  describe('loadSession', () => {
    it('loads a single session', async () => {
      vi.mocked(questionnaireApi.getSession).mockResolvedValueOnce(mockSession);

      await act(async () => {
        await useQuestionnaireStore.getState().loadSession('sess-1');
      });

      expect(useQuestionnaireStore.getState().session).toEqual(mockSession);
      expect(useQuestionnaireStore.getState().isLoading).toBe(false);
    });

    it('handles error', async () => {
      vi.mocked(questionnaireApi.getSession).mockRejectedValueOnce(
        new Error('Not found'),
      );

      await act(async () => {
        await useQuestionnaireStore.getState().loadSession('bad-id');
      });

      expect(useQuestionnaireStore.getState().error).toBe('Not found');
    });
  });

  describe('loadSessions', () => {
    it('loads sessions list', async () => {
      vi.mocked(questionnaireApi.listSessions).mockResolvedValueOnce({
        items: [mockSession],
        total: 1,
      });

      await act(async () => {
        await useQuestionnaireStore.getState().loadSessions();
      });

      expect(useQuestionnaireStore.getState().sessions).toEqual([mockSession]);
      expect(useQuestionnaireStore.getState().isLoading).toBe(false);
    });

    it('handles error', async () => {
      vi.mocked(questionnaireApi.listSessions).mockRejectedValueOnce(
        new Error('Server error'),
      );

      await act(async () => {
        await useQuestionnaireStore.getState().loadSessions();
      });

      expect(useQuestionnaireStore.getState().error).toBe('Server error');
    });
  });

  describe('continueSession', () => {
    it('fetches next questions and updates state', async () => {
      vi.mocked(questionnaireApi.continueSession).mockResolvedValueOnce(mockContinueResponse);

      await act(async () => {
        await useQuestionnaireStore.getState().continueSession('sess-1');
      });

      const state = useQuestionnaireStore.getState();
      expect(state.currentQuestions).toEqual([mockQuestion]);
      expect(state.currentSection).toEqual({ id: 'sec-1', name: 'DevOps' });
      expect(state.readinessScore).toBe(42);
      expect(state.canComplete).toBe(false);
      expect(state.isComplete).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('handles missing optional fields gracefully', async () => {
      vi.mocked(questionnaireApi.continueSession).mockResolvedValueOnce({
        session: mockSession,
      } as any);

      await act(async () => {
        await useQuestionnaireStore.getState().continueSession('sess-1');
      });

      const state = useQuestionnaireStore.getState();
      expect(state.currentQuestions).toEqual([]);
      expect(state.currentSection).toBeNull();
      expect(state.readinessScore).toBeNull();
      expect(state.canComplete).toBe(false);
    });
  });

  describe('submitResponse', () => {
    it('submits response and refreshes session', async () => {
      // Setup: set current question
      act(() => {
        useQuestionnaireStore.setState({
          currentQuestions: [mockQuestion],
          currentSection: { id: 'sec-1', name: 'DevOps' },
        });
      });

      vi.mocked(questionnaireApi.submitResponse).mockResolvedValueOnce(mockSubmitResult);
      vi.mocked(questionnaireApi.continueSession).mockResolvedValueOnce(mockContinueResponse);

      let result: any;
      await act(async () => {
        result = await useQuestionnaireStore
          .getState()
          .submitResponse('sess-1', 'question-1', 'yes', 10);
      });

      expect(result).toEqual(mockSubmitResult);
      expect(questionnaireApi.submitResponse).toHaveBeenCalledWith('sess-1', {
        questionId: 'question-1',
        value: 'yes',
        timeSpentSeconds: 10,
      });

      // Should have added to history
      const state = useQuestionnaireStore.getState();
      expect(state.questionHistory).toHaveLength(1);
      expect(state.questionHistory[0].question.id).toBe('question-1');
      expect(state.questionHistory[0].answeredValue).toBe('yes');
      expect(state.nqsHint).toEqual(mockSubmitResult.nextQuestionByNQS);
    });

    it('throws and sets error on failure', async () => {
      vi.mocked(questionnaireApi.submitResponse).mockRejectedValueOnce(
        new Error('Validation failed'),
      );

      await expect(
        act(async () => {
          await useQuestionnaireStore
            .getState()
            .submitResponse('sess-1', 'question-1', 'bad');
        }),
      ).rejects.toThrow('Validation failed');

      expect(useQuestionnaireStore.getState().error).toBe('Validation failed');
    });
  });

  describe('completeSession', () => {
    it('completes session and sets isComplete', async () => {
      const completedSession = { ...mockSession, status: 'COMPLETED' as const };
      vi.mocked(questionnaireApi.completeSession).mockResolvedValueOnce(completedSession);

      await act(async () => {
        await useQuestionnaireStore.getState().completeSession('sess-1');
      });

      const state = useQuestionnaireStore.getState();
      expect(state.session?.status).toBe('COMPLETED');
      expect(state.isComplete).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('handles error', async () => {
      vi.mocked(questionnaireApi.completeSession).mockRejectedValueOnce({
        response: { data: { message: 'Score too low' } },
      });

      await act(async () => {
        await useQuestionnaireStore.getState().completeSession('sess-1');
      });

      expect(useQuestionnaireStore.getState().error).toBe('Score too low');
    });
  });

  describe('loadScore', () => {
    it('loads score and dimensions', async () => {
      vi.mocked(questionnaireApi.getScore).mockResolvedValueOnce({
        score: 75,
        dimensions: [{ key: 'security', name: 'Security', residual: 0.3 }] as any,
        trend: 'UP',
      } as any);

      await act(async () => {
        await useQuestionnaireStore.getState().loadScore('sess-1');
      });

      const state = useQuestionnaireStore.getState();
      expect(state.readinessScore).toBe(75);
      expect(state.scoreTrend).toBe('UP');
      expect(state.dimensions).toHaveLength(1);
    });

    it('logs warning on failure (non-critical)', async () => {
      const { logger } = await import('../lib/logger');
      vi.mocked(questionnaireApi.getScore).mockRejectedValueOnce(
        new Error('Service down'),
      );

      await act(async () => {
        await useQuestionnaireStore.getState().loadScore('sess-1');
      });

      // Should not set error (non-critical)
      expect(useQuestionnaireStore.getState().error).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to load score:',
        expect.any(Error),
      );
    });
  });

  describe('navigation', () => {
    const setupHistoryState = () => {
      const historyEntries = [
        {
          question: { ...mockQuestion, id: 'q-1' },
          section: { id: 'sec-1', name: 'DevOps' },
          answeredValue: 'yes',
          timestamp: 1000,
        },
        {
          question: { ...mockQuestion, id: 'q-2', text: 'Second question' },
          section: { id: 'sec-1', name: 'DevOps' },
          answeredValue: 'no',
          timestamp: 2000,
        },
        {
          question: { ...mockQuestion, id: 'q-3', text: 'Third question' },
          section: { id: 'sec-2', name: 'Security' },
          answeredValue: 'maybe',
          timestamp: 3000,
        },
      ];

      act(() => {
        useQuestionnaireStore.setState({
          questionHistory: historyEntries,
          currentQuestions: [{ ...mockQuestion, id: 'q-4', text: 'Current' }],
          session: mockSession,
        });
      });

      return historyEntries;
    };

    describe('goToPrevious', () => {
      it('enters review mode at last history entry', () => {
        setupHistoryState();

        act(() => {
          useQuestionnaireStore.getState().goToPrevious();
        });

        const state = useQuestionnaireStore.getState();
        expect(state.isReviewingPrevious).toBe(true);
        expect(state.reviewIndex).toBe(2);
        expect(state.currentQuestions[0].id).toBe('q-3');
      });

      it('navigates further back in history', () => {
        setupHistoryState();

        act(() => {
          useQuestionnaireStore.getState().goToPrevious(); // index 2
        });
        act(() => {
          useQuestionnaireStore.getState().goToPrevious(); // index 1
        });

        const state = useQuestionnaireStore.getState();
        expect(state.reviewIndex).toBe(1);
        expect(state.currentQuestions[0].id).toBe('q-2');
      });

      it('does nothing with empty history', () => {
        act(() => {
          useQuestionnaireStore.getState().goToPrevious();
        });

        expect(useQuestionnaireStore.getState().isReviewingPrevious).toBe(false);
      });

      it('does not go below index 0', () => {
        setupHistoryState();

        // Go all the way back
        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // 2
        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // 1
        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // 0
        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // still 0

        expect(useQuestionnaireStore.getState().reviewIndex).toBe(0);
      });
    });

    describe('goToNext', () => {
      it('moves forward in history', () => {
        setupHistoryState();

        // Enter review mode and go back
        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // 2
        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // 1

        act(() => {
          useQuestionnaireStore.getState().goToNext(); // 2
        });

        expect(useQuestionnaireStore.getState().reviewIndex).toBe(2);
      });

      it('exits review mode at end of history', async () => {
        setupHistoryState();
        vi.mocked(questionnaireApi.continueSession).mockResolvedValueOnce(mockContinueResponse);

        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // 2

        await act(async () => {
          useQuestionnaireStore.getState().goToNext(); // exits review
        });

        const state = useQuestionnaireStore.getState();
        expect(state.isReviewingPrevious).toBe(false);
        expect(state.reviewIndex).toBe(-1);
      });

      it('does nothing when not in review mode', () => {
        setupHistoryState();

        act(() => {
          useQuestionnaireStore.getState().goToNext();
        });

        expect(useQuestionnaireStore.getState().isReviewingPrevious).toBe(false);
      });
    });

    describe('canGoBack', () => {
      it('returns true when history has entries', () => {
        setupHistoryState();
        expect(useQuestionnaireStore.getState().canGoBack()).toBe(true);
      });

      it('returns false with empty history', () => {
        expect(useQuestionnaireStore.getState().canGoBack()).toBe(false);
      });

      it('returns false when at index 0 in review mode', () => {
        setupHistoryState();
        act(() => { useQuestionnaireStore.getState().goToPrevious(); });
        act(() => { useQuestionnaireStore.getState().goToPrevious(); });
        act(() => { useQuestionnaireStore.getState().goToPrevious(); });

        expect(useQuestionnaireStore.getState().reviewIndex).toBe(0);
        expect(useQuestionnaireStore.getState().canGoBack()).toBe(false);
      });
    });

    describe('canSkip', () => {
      it('returns false for required question', () => {
        act(() => {
          useQuestionnaireStore.setState({ currentQuestions: [mockQuestion] });
        });
        expect(useQuestionnaireStore.getState().canSkip()).toBe(false);
      });

      it('returns true for optional question', () => {
        act(() => {
          useQuestionnaireStore.setState({ currentQuestions: [mockOptionalQuestion as any] });
        });
        expect(useQuestionnaireStore.getState().canSkip()).toBe(true);
      });

      it('returns false when no current question', () => {
        expect(useQuestionnaireStore.getState().canSkip()).toBe(false);
      });
    });

    describe('skipQuestion', () => {
      it('calls goToNext when reviewing', () => {
        setupHistoryState();
        act(() => { useQuestionnaireStore.getState().goToPrevious(); }); // enter review

        // Set optional question
        act(() => {
          useQuestionnaireStore.setState({
            currentQuestions: [mockOptionalQuestion as any],
          });
        });

        act(() => {
          useQuestionnaireStore.getState().skipQuestion('sess-1');
        });

        // Should have moved forward or exited review
        const state = useQuestionnaireStore.getState();
        // goToNext was called which either moves forward or exits review
        expect(state.reviewIndex).not.toBe(2);
      });

      it('continues session when not reviewing', async () => {
        vi.mocked(questionnaireApi.continueSession).mockResolvedValueOnce(mockContinueResponse);

        act(() => {
          useQuestionnaireStore.setState({
            currentQuestions: [mockOptionalQuestion as any],
          });
        });

        await act(async () => {
          await useQuestionnaireStore.getState().skipQuestion('sess-1');
        });

        expect(questionnaireApi.continueSession).toHaveBeenCalledWith('sess-1');
      });

      it('does nothing for required questions', async () => {
        act(() => {
          useQuestionnaireStore.setState({ currentQuestions: [mockQuestion] });
        });

        await act(async () => {
          await useQuestionnaireStore.getState().skipQuestion('sess-1');
        });

        expect(questionnaireApi.continueSession).not.toHaveBeenCalled();
      });
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      act(() => {
        useQuestionnaireStore.setState({ error: 'Something broke' });
      });

      act(() => {
        useQuestionnaireStore.getState().clearError();
      });

      expect(useQuestionnaireStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      vi.mocked(questionnaireApi.createSession).mockResolvedValueOnce(mockSession);
      vi.mocked(questionnaireApi.continueSession).mockResolvedValueOnce(mockContinueResponse);

      await act(async () => {
        await useQuestionnaireStore.getState().createSession('q-1');
      });

      act(() => {
        useQuestionnaireStore.getState().reset();
      });

      const state = useQuestionnaireStore.getState();
      expect(state.session).toBeNull();
      expect(state.currentQuestions).toEqual([]);
      expect(state.questionHistory).toEqual([]);
      expect(state.readinessScore).toBeNull();
      expect(state.isComplete).toBe(false);
    });
  });
});
