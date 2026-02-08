/**
 * Draft Autosave Hook
 *
 * Auto-saves questionnaire responses every 30 seconds to localStorage/IndexedDB.
 * Provides recovery functionality for session resumption.
 *
 * Nielsen Heuristic: User Control & Freedom
 * - Users should not lose work due to accidental navigation or session timeout
 * - Clear indication of autosave status
 * - Easy draft recovery on return
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DraftData {
  sessionId: string;
  questionnaireId: string;
  responses: Record<string, unknown>;
  currentQuestionIndex: number;
  lastSavedAt: number;
  version: number;
  metadata: {
    questionnaireName: string;
    totalQuestions: number;
    completedQuestions: number;
  };
}

export interface AutosaveStatus {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export interface UseDraftAutosaveOptions {
  sessionId: string;
  questionnaireId: string;
  autosaveIntervalMs?: number;
  onSaveSuccess?: (draft: DraftData) => void;
  onSaveError?: (error: Error) => void;
  onDraftRecovered?: (draft: DraftData) => void;
}

export interface UseDraftAutosaveReturn {
  status: AutosaveStatus;
  saveDraft: (data: Partial<DraftData>) => Promise<void>;
  loadDraft: () => Promise<DraftData | null>;
  clearDraft: () => Promise<void>;
  hasDraft: boolean;
  draftData: DraftData | null;
  forceSave: () => Promise<void>;
}

// ============================================================================
// Storage Keys
// ============================================================================

const DRAFT_STORAGE_PREFIX = 'quiz2biz_draft_';
const DRAFT_INDEX_KEY = 'quiz2biz_draft_index';
const DRAFT_VERSION = 1;

// ============================================================================
// IndexedDB Storage (with localStorage fallback)
// ============================================================================

class DraftStorage {
  private dbName = 'Quiz2BizDrafts';
  private storeName = 'drafts';
  private db: IDBDatabase | null = null;
  private useIndexedDB: boolean;

  constructor() {
    this.useIndexedDB = typeof indexedDB !== 'undefined';
  }

  async init(): Promise<void> {
    if (!this.useIndexedDB) {
      return;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to localStorage');
        this.useIndexedDB = false;
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('questionnaireId', 'questionnaireId', { unique: false });
          store.createIndex('lastSavedAt', 'lastSavedAt', { unique: false });
        }
      };
    });
  }

  private getStorageKey(sessionId: string, questionnaireId: string): string {
    return `${DRAFT_STORAGE_PREFIX}${sessionId}_${questionnaireId}`;
  }

  async save(draft: DraftData): Promise<void> {
    const id = this.getStorageKey(draft.sessionId, draft.questionnaireId);

    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({ ...draft, id });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to save draft to IndexedDB'));
      });
    } else {
      // Fallback to localStorage
      try {
        localStorage.setItem(id, JSON.stringify(draft));
        this.updateDraftIndex(id);
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          // Clean up old drafts and retry
          await this.cleanupOldDrafts();
          localStorage.setItem(id, JSON.stringify(draft));
        } else {
          throw error;
        }
      }
    }
  }

  async load(sessionId: string, questionnaireId: string): Promise<DraftData | null> {
    const id = this.getStorageKey(sessionId, questionnaireId);

    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error('Failed to load draft from IndexedDB'));
      });
    } else {
      const data = localStorage.getItem(id);
      return data ? JSON.parse(data) : null;
    }
  }

  async delete(sessionId: string, questionnaireId: string): Promise<void> {
    const id = this.getStorageKey(sessionId, questionnaireId);

    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete draft from IndexedDB'));
      });
    } else {
      localStorage.removeItem(id);
      this.removeDraftFromIndex(id);
    }
  }

  async exists(sessionId: string, questionnaireId: string): Promise<boolean> {
    const draft = await this.load(sessionId, questionnaireId);
    return draft !== null;
  }

  async getAllDrafts(): Promise<DraftData[]> {
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error('Failed to get all drafts'));
      });
    } else {
      const index = this.getDraftIndex();
      const drafts: DraftData[] = [];
      for (const key of index) {
        const data = localStorage.getItem(key);
        if (data) {
          drafts.push(JSON.parse(data));
        }
      }
      return drafts;
    }
  }

  private getDraftIndex(): string[] {
    try {
      const index = localStorage.getItem(DRAFT_INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch {
      return [];
    }
  }

  private updateDraftIndex(key: string): void {
    const index = this.getDraftIndex();
    if (!index.includes(key)) {
      index.push(key);
      localStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(index));
    }
  }

  private removeDraftFromIndex(key: string): void {
    const index = this.getDraftIndex().filter((k) => k !== key);
    localStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(index));
  }

  private async cleanupOldDrafts(): Promise<void> {
    const drafts = await this.getAllDrafts();
    const sortedDrafts = drafts.sort((a, b) => a.lastSavedAt - b.lastSavedAt);

    // Remove oldest 50% of drafts
    const toRemove = sortedDrafts.slice(0, Math.ceil(sortedDrafts.length / 2));
    for (const draft of toRemove) {
      await this.delete(draft.sessionId, draft.questionnaireId);
    }
  }
}

// ============================================================================
// Singleton Storage Instance
// ============================================================================

let storageInstance: DraftStorage | null = null;

async function getStorage(): Promise<DraftStorage> {
  if (!storageInstance) {
    storageInstance = new DraftStorage();
    await storageInstance.init();
  }
  return storageInstance;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useDraftAutosave(options: UseDraftAutosaveOptions): UseDraftAutosaveReturn {
  const {
    sessionId,
    questionnaireId,
    autosaveIntervalMs = 30000, // 30 seconds default
    onSaveSuccess,
    onSaveError,
    onDraftRecovered,
  } = options;

  // State
  const [status, setStatus] = useState<AutosaveStatus>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  });
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);

  // Refs for tracking changes
  const pendingDataRef = useRef<Partial<DraftData> | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storageRef = useRef<DraftStorage | null>(null);

  // Initialize storage
  useEffect(() => {
    const initStorage = async () => {
      storageRef.current = await getStorage();
      const exists = await storageRef.current.exists(sessionId, questionnaireId);
      setHasDraft(exists);

      if (exists) {
        const draft = await storageRef.current.load(sessionId, questionnaireId);
        if (draft) {
          setDraftData(draft);
        }
      }
    };
    initStorage();
  }, [sessionId, questionnaireId]);

  // Save draft function
  const saveDraft = useCallback(
    async (data: Partial<DraftData>) => {
      if (!storageRef.current) {
        await getStorage().then((s) => {
          storageRef.current = s;
        });
      }

      setStatus((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        const now = Date.now();
        const fullDraft: DraftData = {
          sessionId,
          questionnaireId,
          responses: data.responses || {},
          currentQuestionIndex: data.currentQuestionIndex || 0,
          lastSavedAt: now,
          version: DRAFT_VERSION,
          metadata: data.metadata || {
            questionnaireName: '',
            totalQuestions: 0,
            completedQuestions: 0,
          },
        };

        await storageRef.current!.save(fullDraft);

        setStatus((prev) => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(now),
          hasUnsavedChanges: false,
        }));
        setHasDraft(true);
        setDraftData(fullDraft);

        onSaveSuccess?.(fullDraft);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
        setStatus((prev) => ({
          ...prev,
          isSaving: false,
          error: errorMessage,
        }));
        onSaveError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    },
    [sessionId, questionnaireId, onSaveSuccess, onSaveError],
  );

  // Load draft function
  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    if (!storageRef.current) {
      storageRef.current = await getStorage();
    }

    const draft = await storageRef.current.load(sessionId, questionnaireId);
    if (draft) {
      setDraftData(draft);
      onDraftRecovered?.(draft);
    }
    return draft;
  }, [sessionId, questionnaireId, onDraftRecovered]);

  // Clear draft function
  const clearDraft = useCallback(async () => {
    if (!storageRef.current) {
      storageRef.current = await getStorage();
    }

    await storageRef.current.delete(sessionId, questionnaireId);
    setHasDraft(false);
    setDraftData(null);
    setStatus((prev) => ({
      ...prev,
      hasUnsavedChanges: false,
      lastSaved: null,
    }));
  }, [sessionId, questionnaireId]);

  // Force save function
  const forceSave = useCallback(async () => {
    if (pendingDataRef.current) {
      await saveDraft(pendingDataRef.current);
    }
  }, [saveDraft]);

  // Set up autosave interval
  useEffect(() => {
    const startAutosave = () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setInterval(async () => {
        if (pendingDataRef.current && status.hasUnsavedChanges) {
          await saveDraft(pendingDataRef.current);
        }
      }, autosaveIntervalMs);
    };

    startAutosave();

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [autosaveIntervalMs, saveDraft, status.hasUnsavedChanges]);

  // Track changes for autosave
  const trackChanges = useCallback((data: Partial<DraftData>) => {
    pendingDataRef.current = data;
    setStatus((prev) => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (pendingDataRef.current && status.hasUnsavedChanges) {
        // Synchronous save using localStorage as fallback
        const key = `${DRAFT_STORAGE_PREFIX}${sessionId}_${questionnaireId}`;
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              ...pendingDataRef.current,
              sessionId,
              questionnaireId,
              lastSavedAt: Date.now(),
              version: DRAFT_VERSION,
            }),
          );
        } catch {
          // Ignore errors on unload
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, questionnaireId, status.hasUnsavedChanges]);

  return {
    status,
    saveDraft: async (data: Partial<DraftData>) => {
      trackChanges(data);
      await saveDraft(data);
    },
    loadDraft,
    clearDraft,
    hasDraft,
    draftData,
    forceSave,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format time since last save for display
 */
export function formatTimeSinceSave(lastSaved: Date | null): string {
  if (!lastSaved) {
    return 'Never saved';
  }

  const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);

  if (seconds < 5) {
    return 'Just now';
  }
  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minutes ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hours ago`;
  }
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Check if draft is recent enough to recover (within 7 days)
 */
export function isDraftRecoverable(draft: DraftData): boolean {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - draft.lastSavedAt < sevenDaysMs;
}

export default useDraftAutosave;
