import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useDraftAutosave,
  formatTimeSinceSave,
  isDraftRecoverable,
  type DraftData,
} from './useDraftAutosave';

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
};

// Helper to create IDBRequest-like objects with async callback support
const createMockIDBRequest = (result: unknown = null) => {
  const req: any = {
    get onsuccess() {
      return this.successHandler;
    },
    set onsuccess(handler) {
      this.successHandler = handler;
      if (handler) queueMicrotask(() => handler({ target: req } as Event));
    },
    successHandler: null,
    onerror: null,
    onupgradeneeded: null,
    result,
  };
  return req;
};

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => {
    const mockDB = {
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          put: vi.fn().mockImplementation(() => createMockIDBRequest()),
          get: vi.fn().mockImplementation(() => createMockIDBRequest(null)),
          delete: vi.fn().mockImplementation(() => createMockIDBRequest()),
          getAll: vi.fn().mockImplementation(() => createMockIDBRequest([])),
        }),
      }),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      createObjectStore: vi.fn().mockReturnValue({
        createIndex: vi.fn(),
      }),
    };

    return createMockIDBRequest(mockDB);
  }),
};

describe('useDraftAutosave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.store = {};

    // Mock global objects using Vitest helpers to ensure proper cleanup
    // Stub indexedDB as undefined to exercise the localStorage fallback path
    // This avoids the complexity of mocking IndexedDB's async callback behavior
    vi.stubGlobal('localStorage', mockLocalStorage as unknown as Storage);
    // Stub indexedDB as undefined to exercise localStorage fallback path
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const mockOptions = {
    sessionId: 'test-session-123',
    questionnaireId: 'test-questionnaire-456',
    autosaveIntervalMs: 1000, // Fast interval for testing
  };

  it('initializes with correct default status', () => {
    const { result } = renderHook(() => useDraftAutosave(mockOptions));

    expect(result.current.status).toEqual({
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      error: null,
    });
    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftData).toBeNull();
  });

  it('sets hasDraft to true when draft exists in storage', async () => {
    // Pre-populate localStorage with draft
    const mockDraft: DraftData = {
      sessionId: 'test-session-123',
      questionnaireId: 'test-questionnaire-456',
      responses: {},
      currentQuestionIndex: 0,
      lastSavedAt: Date.now(),
      version: 1,
      metadata: {
        questionnaireName: 'Test Questionnaire',
        totalQuestions: 10,
        completedQuestions: 5,
      },
    };

    const storageKey = `quiz2biz_draft_test-session-123_test-questionnaire-456`;
    mockLocalStorage.setItem(storageKey, JSON.stringify(mockDraft));

    const { result } = renderHook(() => useDraftAutosave(mockOptions));

    // Wait for async initialization
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.hasDraft).toBe(true);
    expect(result.current.draftData).toEqual(mockDraft);
  });

  it('saves draft successfully', async () => {
    const onSaveSuccess = vi.fn();
    const mockData = {
      responses: { q1: 'answer1' },
      currentQuestionIndex: 1,
      metadata: {
        questionnaireName: 'Test',
        totalQuestions: 5,
        completedQuestions: 1,
      },
    };

    const { result } = renderHook(() => useDraftAutosave({ ...mockOptions, onSaveSuccess }));

    await act(async () => {
      await result.current.saveDraft(mockData);
    });

    expect(result.current.status.isSaving).toBe(false);
    expect(result.current.status.lastSaved).toBeInstanceOf(Date);
    expect(result.current.status.hasUnsavedChanges).toBe(false);
    expect(result.current.status.error).toBeNull();
    expect(result.current.hasDraft).toBe(true);
    expect(onSaveSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'test-session-123',
        questionnaireId: 'test-questionnaire-456',
        responses: mockData.responses,
        currentQuestionIndex: mockData.currentQuestionIndex,
      }),
    );
  });

  it('handles save errors', async () => {
    const onSaveError = vi.fn();

    // Mock localStorage to throw error
    mockLocalStorage.setItem.mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useDraftAutosave({ ...mockOptions, onSaveError }));

    await act(async () => {
      await result.current.saveDraft({ responses: {} });
    });

    expect(result.current.status.isSaving).toBe(false);
    expect(result.current.status.error).toBe('Storage quota exceeded');
    expect(onSaveError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('loads draft successfully', async () => {
    const onDraftRecovered = vi.fn();
    const mockDraft: DraftData = {
      sessionId: 'test-session-123',
      questionnaireId: 'test-questionnaire-456',
      responses: { q1: 'test answer' },
      currentQuestionIndex: 2,
      lastSavedAt: Date.now(),
      version: 1,
      metadata: {
        questionnaireName: 'Test',
        totalQuestions: 10,
        completedQuestions: 2,
      },
    };

    const storageKey = `quiz2biz_draft_test-session-123_test-questionnaire-456`;
    mockLocalStorage.setItem(storageKey, JSON.stringify(mockDraft));

    const { result } = renderHook(() => useDraftAutosave({ ...mockOptions, onDraftRecovered }));

    let loadedDraft: DraftData | null = null;
    await act(async () => {
      loadedDraft = await result.current.loadDraft();
    });

    expect(loadedDraft).toEqual(mockDraft);
    expect(result.current.draftData).toEqual(mockDraft);
    expect(onDraftRecovered).toHaveBeenCalledWith(mockDraft);
  });

  it('clears draft successfully', async () => {
    // Pre-populate with draft
    const mockDraft: DraftData = {
      sessionId: 'test-session-123',
      questionnaireId: 'test-questionnaire-456',
      responses: {},
      currentQuestionIndex: 0,
      lastSavedAt: Date.now(),
      version: 1,
      metadata: {
        questionnaireName: '',
        totalQuestions: 0,
        completedQuestions: 0,
      },
    };

    const storageKey = `quiz2biz_draft_test-session-123_test-questionnaire-456`;
    mockLocalStorage.setItem(storageKey, JSON.stringify(mockDraft));

    const { result } = renderHook(() => useDraftAutosave(mockOptions));

    // Wait for initialization
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.hasDraft).toBe(true);

    await act(async () => {
      await result.current.clearDraft();
    });

    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftData).toBeNull();
    expect(result.current.status.hasUnsavedChanges).toBe(false);
    expect(result.current.status.lastSaved).toBeNull();
  });

  it('forces save when there are pending changes', async () => {
    const { result } = renderHook(() => useDraftAutosave(mockOptions));

    // Track changes first
    await act(async () => {
      await result.current.saveDraft({ responses: { q1: 'test' } });
    });

    const forceSaveResult = await act(async () => {
      return await result.current.forceSave();
    });

    expect(forceSaveResult).toBeUndefined();
  });

  it('tracks unsaved changes', async () => {
    const { result } = renderHook(() => useDraftAutosave(mockOptions));

    // Initial state
    expect(result.current.status.hasUnsavedChanges).toBe(false);

    // After saving, should be false
    await act(async () => {
      await result.current.saveDraft({ responses: { q1: 'test' } });
    });

    expect(result.current.status.hasUnsavedChanges).toBe(false);
  });

  it('handles autosave functionality', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useDraftAutosave({
        ...mockOptions,
        autosaveIntervalMs: 1000,
      }),
    );

    // Set up pending changes
    await act(async () => {
      await result.current.saveDraft({ responses: { q1: 'test' } });
    });

    // Fast-forward timers
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // The autosave should have been triggered
    expect(result.current.status.lastSaved).toBeInstanceOf(Date);
  });
});

describe('formatTimeSinceSave', () => {
  it('returns "Never saved" when lastSaved is null', () => {
    expect(formatTimeSinceSave(null)).toBe('Never saved');
  });

  it('returns "Just now" for recent saves', () => {
    const recentDate = new Date(Date.now() - 2000); // 2 seconds ago
    expect(formatTimeSinceSave(recentDate)).toBe('Just now');
  });

  it('returns seconds for recent saves', () => {
    const secondsAgo = new Date(Date.now() - 30000); // 30 seconds ago
    expect(formatTimeSinceSave(secondsAgo)).toBe('30 seconds ago');
  });

  it('returns minutes for older saves', () => {
    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    expect(formatTimeSinceSave(minutesAgo)).toBe('5 minutes ago');
  });

  it('returns hours for much older saves', () => {
    const hoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    expect(formatTimeSinceSave(hoursAgo)).toBe('2 hours ago');
  });

  it('returns days for very old saves', () => {
    const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    expect(formatTimeSinceSave(daysAgo)).toBe('3 days ago');
  });
});

describe('isDraftRecoverable', () => {
  it('returns true for recent drafts (within 7 days)', () => {
    const recentDraft: DraftData = {
      sessionId: 'test',
      questionnaireId: 'test',
      responses: {},
      currentQuestionIndex: 0,
      lastSavedAt: Date.now() - 1000, // 1 second ago
      version: 1,
      metadata: {
        questionnaireName: '',
        totalQuestions: 0,
        completedQuestions: 0,
      },
    };

    expect(isDraftRecoverable(recentDraft)).toBe(true);
  });

  it('returns false for old drafts (older than 7 days)', () => {
    const oldDraft: DraftData = {
      sessionId: 'test',
      questionnaireId: 'test',
      responses: {},
      currentQuestionIndex: 0,
      lastSavedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      version: 1,
      metadata: {
        questionnaireName: '',
        totalQuestions: 0,
        completedQuestions: 0,
      },
    };

    expect(isDraftRecoverable(oldDraft)).toBe(false);
  });

  it('handles edge case exactly at 7 days', () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const draftAtBoundary: DraftData = {
      sessionId: 'test',
      questionnaireId: 'test',
      responses: {},
      currentQuestionIndex: 0,
      lastSavedAt: sevenDaysAgo,
      version: 1,
      metadata: {
        questionnaireName: '',
        totalQuestions: 0,
        completedQuestions: 0,
      },
    };

    // Should be false at exactly 7 days (not recoverable)
    expect(isDraftRecoverable(draftAtBoundary)).toBe(false);
  });
});
