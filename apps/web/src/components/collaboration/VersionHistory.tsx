/**
 * VersionHistory.tsx - Sprint 35 Task 2
 * Response Version History with timestamps, view, and restore
 * Nielsen Heuristic: User control and freedom, Help users recover from errors
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ResponseVersion {
  id: string;
  responseId: string;
  questionId: string;
  version: number;
  value: string;
  createdAt: Date;
  createdBy: string;
  changeType: 'create' | 'update' | 'restore';
  changeDescription?: string;
  previousVersionId?: string;
  metadata?: Record<string, unknown>;
}

export interface VersionDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface VersionHistoryContextValue {
  versions: Map<string, ResponseVersion[]>;
  isLoading: boolean;
  getVersions: (responseId: string) => ResponseVersion[];
  saveVersion: (responseId: string, questionId: string, value: string, userId: string) => void;
  restoreVersion: (versionId: string) => ResponseVersion | null;
  compareVersions: (versionId1: string, versionId2: string) => VersionDiff | null;
  clearHistory: (responseId: string) => void;
}

// ============================================================================
// Storage Service
// ============================================================================

class VersionStorage {
  private static readonly STORAGE_KEY = 'quiz2biz_version_history';
  private static maxVersionsPerResponse = 50;

  static load(): Map<string, ResponseVersion[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return new Map();
      }

      const parsed = JSON.parse(data);
      const map = new Map<string, ResponseVersion[]>();

      Object.entries(parsed).forEach(([key, versions]) => {
        map.set(
          key,
          (versions as any[]).map((v) => ({
            ...v,
            createdAt: new Date(v.createdAt),
          })),
        );
      });

      return map;
    } catch {
      return new Map();
    }
  }

  static save(versions: Map<string, ResponseVersion[]>): void {
    try {
      const obj: Record<string, ResponseVersion[]> = {};
      versions.forEach((value, key) => {
        // Keep only latest N versions per response
        obj[key] = value.slice(-this.maxVersionsPerResponse);
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to save version history:', error);
    }
  }

  static generateId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Context
// ============================================================================

const VersionHistoryContext = createContext<VersionHistoryContextValue | null>(null);

export const useVersionHistory = (): VersionHistoryContextValue => {
  const context = useContext(VersionHistoryContext);
  if (!context) {
    throw new Error('useVersionHistory must be used within VersionHistoryProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface VersionHistoryProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export const VersionHistoryProvider: React.FC<VersionHistoryProviderProps> = ({
  children,
  userId = 'anonymous',
}) => {
  const [versions, setVersions] = useState<Map<string, ResponseVersion[]>>(() =>
    VersionStorage.load(),
  );
  const [isLoading, _setIsLoading] = useState(false);

  // Save to storage whenever versions change
  useEffect(() => {
    VersionStorage.save(versions);
  }, [versions]);

  const getVersions = useCallback(
    (responseId: string): ResponseVersion[] => {
      return versions.get(responseId) || [];
    },
    [versions],
  );

  const saveVersion = useCallback(
    (responseId: string, questionId: string, value: string, createdBy: string): void => {
      setVersions((prev) => {
        const existing = prev.get(responseId) || [];
        const lastVersion = existing[existing.length - 1];

        // Don't save if value hasn't changed
        if (lastVersion && lastVersion.value === value) {
          return prev;
        }

        const newVersion: ResponseVersion = {
          id: VersionStorage.generateId(),
          responseId,
          questionId,
          version: existing.length + 1,
          value,
          createdAt: new Date(),
          createdBy,
          changeType: existing.length === 0 ? 'create' : 'update',
          previousVersionId: lastVersion?.id,
        };

        const updated = new Map(prev);
        updated.set(responseId, [...existing, newVersion]);
        return updated;
      });
    },
    [],
  );

  const restoreVersion = useCallback(
    (versionId: string): ResponseVersion | null => {
      let restoredVersion: ResponseVersion | null = null;

      setVersions((prev) => {
        const updated = new Map(prev);

        // Find the version to restore
        prev.forEach((versionList, responseId) => {
          const targetVersion = versionList.find((v) => v.id === versionId);
          if (targetVersion) {
            // Create a new version with the restored value
            const newVersion: ResponseVersion = {
              id: VersionStorage.generateId(),
              responseId: targetVersion.responseId,
              questionId: targetVersion.questionId,
              version: versionList.length + 1,
              value: targetVersion.value,
              createdAt: new Date(),
              createdBy: userId,
              changeType: 'restore',
              changeDescription: `Restored to version ${targetVersion.version}`,
              previousVersionId: versionList[versionList.length - 1]?.id,
            };

            updated.set(responseId, [...versionList, newVersion]);
            restoredVersion = newVersion;
          }
        });

        return updated;
      });

      return restoredVersion;
    },
    [userId],
  );

  const compareVersions = useCallback(
    (versionId1: string, versionId2: string): VersionDiff | null => {
      let version1: ResponseVersion | undefined;
      let version2: ResponseVersion | undefined;

      versions.forEach((versionList) => {
        const v1 = versionList.find((v) => v.id === versionId1);
        const v2 = versionList.find((v) => v.id === versionId2);
        if (v1) {
          version1 = v1;
        }
        if (v2) {
          version2 = v2;
        }
      });

      if (!version1 || !version2) {
        return null;
      }

      const words1 = version1.value.split(/\s+/);
      const words2 = version2.value.split(/\s+/);

      const added = words2.filter((w) => !words1.includes(w));
      const removed = words1.filter((w) => !words2.includes(w));
      const unchanged = words1.filter((w) => words2.includes(w));

      return { added, removed, unchanged };
    },
    [versions],
  );

  const clearHistory = useCallback((responseId: string): void => {
    setVersions((prev) => {
      const updated = new Map(prev);
      updated.delete(responseId);
      return updated;
    });
  }, []);

  const value: VersionHistoryContextValue = {
    versions,
    isLoading,
    getVersions,
    saveVersion,
    restoreVersion,
    compareVersions,
    clearHistory,
  };

  return <VersionHistoryContext.Provider value={value}>{children}</VersionHistoryContext.Provider>;
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  modal: 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5',
  modalContent: 'bg-surface-50 rounded-2xl w-full max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col',
  modalHeader: 'px-6 py-5 border-b border-surface-200 flex items-center justify-between',
  modalTitle: 'text-lg font-semibold text-surface-800 m-0',
  closeButton: 'bg-transparent border-none p-2 cursor-pointer text-surface-500 rounded-lg flex items-center justify-center',
  modalBody: 'flex-1 overflow-auto p-0',
  versionList: 'list-none m-0 p-0',
  versionItem: 'px-6 py-4 border-b border-surface-100 cursor-pointer transition-colors',
  versionItemActive: 'bg-brand-50 border-l-[3px] border-l-brand-500 pl-[21px]',
  versionItemHover: 'bg-surface-50',
  versionHeader: 'flex items-center justify-between mb-2',
  versionNumber: 'flex items-center gap-2',
  versionBadge: 'px-2 py-0.5 text-xs font-semibold rounded-xl bg-surface-200 text-surface-600',
  versionBadgeCurrent: 'bg-brand-100 text-brand-700',
  versionBadgeRestore: 'bg-success-50 text-success-700',
  versionTime: 'text-xs text-surface-400',
  versionPreview: 'text-sm text-surface-500 leading-normal overflow-hidden text-ellipsis line-clamp-2',
  versionActions: 'flex gap-2 mt-3',
  actionButton: 'px-3 py-1.5 text-xs font-medium rounded-md border-none cursor-pointer transition-colors',
  restoreButton: 'bg-brand-100 text-brand-700',
  compareButton: 'bg-surface-100 text-surface-600',
  diffView: 'px-6 py-4 bg-surface-100 border-t border-surface-200',
  diffHeader: 'flex items-center justify-between mb-3',
  diffTitle: 'text-sm font-semibold text-surface-800 m-0',
  diffStats: 'flex gap-3 text-xs',
  diffStatAdded: 'text-success-600',
  diffStatRemoved: 'text-danger-600',
  diffContent: 'text-sm leading-relaxed whitespace-pre-wrap break-words font-mono',
  diffAdded: 'bg-success-50 text-success-700 px-0.5 rounded-sm',
  diffRemoved: 'bg-danger-50 text-danger-600 px-0.5 rounded-sm line-through',
  emptyState: 'py-12 px-6 text-center text-surface-400',
  emptyIcon: 'w-12 h-12 mx-auto mb-4 text-surface-300',
  emptyTitle: 'text-base font-medium text-surface-500 mb-2 mt-0',
  emptyText: 'text-sm m-0',
  trigger: 'inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-surface-100 text-surface-600 border-none rounded-md cursor-pointer transition-colors',
};

// ============================================================================
// UI Components
// ============================================================================

interface VersionHistoryModalProps {
  responseId: string;
  questionText?: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (version: ResponseVersion) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  responseId,
  questionText,
  isOpen,
  onClose,
  onRestore,
}) => {
  const { getVersions, restoreVersion, compareVersions } = useVersionHistory();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion1, setCompareVersion1] = useState<string | null>(null);
  const [compareVersion2, setCompareVersion2] = useState<string | null>(null);
  const [hoveredVersion, setHoveredVersion] = useState<string | null>(null);

  const versions = getVersions(responseId);
  const diff =
    compareVersion1 && compareVersion2 ? compareVersions(compareVersion1, compareVersion2) : null;

  useEffect(() => {
    if (!isOpen) {
      setSelectedVersion(null);
      setCompareMode(false);
      setCompareVersion1(null);
      setCompareVersion2(null);
    }
  }, [isOpen]);

  const handleRestore = (versionId: string) => {
    const restored = restoreVersion(versionId);
    if (restored && onRestore) {
      onRestore(restored);
    }
  };

  const handleCompareSelect = (versionId: string) => {
    if (!compareVersion1) {
      setCompareVersion1(versionId);
    } else if (!compareVersion2) {
      setCompareVersion2(versionId);
    } else {
      setCompareVersion1(versionId);
      setCompareVersion2(null);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return 'Just now';
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minutes ago`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeBadgeStyle = (_changeType: ResponseVersion['changeType']) => {
    switch (_changeType) {
      case 'restore':
        return styles.versionBadgeRestore;
      default:
        return {};
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Version History</h3>
            {questionText && (
              <p className="mt-1 text-[13px] text-surface-500">
                {questionText.slice(0, 50)}...
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button
              className={`${styles.actionButton} ${compareMode ? styles.restoreButton : styles.compareButton}`}
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersion1(null);
                setCompareVersion2(null);
              }}
            >
              {compareMode ? 'Exit Compare' : 'Compare'}
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {versions.length === 0 ? (
            <div className={styles.emptyState}>
              <svg
                className={styles.emptyIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <h4 className={styles.emptyTitle}>No version history</h4>
              <p className={styles.emptyText}>Changes to this response will be tracked here.</p>
            </div>
          ) : (
            <ul className={styles.versionList}>
              {[...versions].reverse().map((version, index) => {
                const isCurrent = index === 0;
                const isSelected = selectedVersion === version.id;
                const isCompareSelected =
                  compareVersion1 === version.id || compareVersion2 === version.id;
                const isHovered = hoveredVersion === version.id;

                return (
                  <li
                    key={version.id}
                    className={`${styles.versionItem} ${isSelected || isCompareSelected ? styles.versionItemActive : ''} ${isHovered && !isSelected && !isCompareSelected ? styles.versionItemHover : ''}`}
                    onMouseEnter={() => setHoveredVersion(version.id)}
                    onMouseLeave={() => setHoveredVersion(null)}
                    onClick={() => {
                      if (compareMode) {
                        handleCompareSelect(version.id);
                      } else {
                        setSelectedVersion(selectedVersion === version.id ? null : version.id);
                      }
                    }}
                  >
                    <div className={styles.versionHeader}>
                      <div className={styles.versionNumber}>
                        <span
                          className={`${styles.versionBadge} ${isCurrent ? styles.versionBadgeCurrent : ''} ${version.changeType === 'restore' ? styles.versionBadgeRestore : ''}`}
                        >
                          v{version.version}
                          {isCurrent && ' (Current)'}
                        </span>
                        {version.changeType === 'restore' && (
                          <span className="text-xs text-success-600">Restored</span>
                        )}
                        {compareMode && isCompareSelected && (
                          <span
                            className="px-1.5 py-0.5 text-[10px] bg-brand-500 text-white rounded-full"
                          >
                            {compareVersion1 === version.id ? 'A' : 'B'}
                          </span>
                        )}
                      </div>
                      <span className={styles.versionTime}>{formatDate(version.createdAt)}</span>
                    </div>

                    <p className={styles.versionPreview}>{version.value || '(empty)'}</p>

                    {isSelected && !compareMode && !isCurrent && (
                      <div className={styles.versionActions}>
                        <button
                          className={`${styles.actionButton} ${styles.restoreButton}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(version.id);
                          }}
                        >
                          Restore this version
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {compareMode && diff && (
          <div className={styles.diffView}>
            <div className={styles.diffHeader}>
              <h4 className={styles.diffTitle}>Changes</h4>
              <div className={styles.diffStats}>
                <span className={styles.diffStatAdded}>+{diff.added.length} added</span>
                <span className={styles.diffStatRemoved}>-{diff.removed.length} removed</span>
              </div>
            </div>
            <div className={styles.diffContent}>
              {diff.removed.map((word, i) => (
                <span key={`r-${i}`} className={styles.diffRemoved}>
                  {word}{' '}
                </span>
              ))}
              {diff.added.map((word, i) => (
                <span key={`a-${i}`} className={styles.diffAdded}>
                  {word}{' '}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Trigger Button
// ============================================================================

interface VersionHistoryTriggerProps {
  responseId: string;
  questionText?: string;
  onRestore?: (version: ResponseVersion) => void;
}

export const VersionHistoryTrigger: React.FC<VersionHistoryTriggerProps> = ({
  responseId,
  questionText,
  onRestore,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getVersions } = useVersionHistory();
  const versions = getVersions(responseId);

  return (
    <>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(true)}
        title="View version history"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
        {versions.length > 0 ? `${versions.length} versions` : 'History'}
      </button>

      <VersionHistoryModal
        responseId={responseId}
        questionText={questionText}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onRestore={onRestore}
      />
    </>
  );
};

// ============================================================================
// Hook for Auto-Saving Versions
// ============================================================================

interface UseVersionedResponseOptions {
  responseId: string;
  questionId: string;
  userId: string;
  debounceMs?: number;
}

export const useVersionedResponse = (options: UseVersionedResponseOptions) => {
  const { saveVersion } = useVersionHistory();
  const [value, setValue] = useState('');
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const updateValue = useCallback(
    (newValue: string) => {
      setValue(newValue);

      // Debounce save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        saveVersion(options.responseId, options.questionId, newValue, options.userId);
      }, options.debounceMs ?? 1000);
    },
    [options, saveVersion],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { value, updateValue };
};

export default {
  VersionHistoryProvider,
  useVersionHistory,
  VersionHistoryModal,
  VersionHistoryTrigger,
  useVersionedResponse,
};
