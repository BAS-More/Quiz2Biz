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
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    color: '#64748b',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    overflow: 'auto',
    padding: '0',
  },
  versionList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  versionItem: {
    padding: '16px 24px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  versionItemActive: {
    backgroundColor: '#f0f9ff',
    borderLeft: '3px solid #3b82f6',
    paddingLeft: '21px',
  },
  versionItemHover: {
    backgroundColor: '#f8fafc',
  },
  versionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  versionNumber: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  versionBadge: {
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '12px',
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  versionBadgeCurrent: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  versionBadgeRestore: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  versionTime: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  versionPreview: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
  },
  versionActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  restoreButton: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  compareButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  diffView: {
    padding: '16px 24px',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #e2e8f0',
  },
  diffHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  diffTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  diffStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
  },
  diffStatAdded: {
    color: '#16a34a',
  },
  diffStatRemoved: {
    color: '#dc2626',
  },
  diffContent: {
    fontSize: '14px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    fontFamily: 'ui-monospace, monospace',
  },
  diffAdded: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '0 2px',
    borderRadius: '2px',
  },
  diffRemoved: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '0 2px',
    borderRadius: '2px',
    textDecoration: 'line-through',
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center' as const,
    color: '#94a3b8',
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    color: '#cbd5e1',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#64748b',
    margin: '0 0 8px',
  },
  emptyText: {
    fontSize: '14px',
    margin: 0,
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
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

  const getChangeTypeBadgeStyle = (changeType: ResponseVersion['changeType']) => {
    switch (changeType) {
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
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Version History</h3>
            {questionText && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                {questionText.slice(0, 50)}...
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              style={{
                ...styles.actionButton,
                ...(compareMode ? styles.restoreButton : styles.compareButton),
              }}
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersion1(null);
                setCompareVersion2(null);
              }}
            >
              {compareMode ? 'Exit Compare' : 'Compare'}
            </button>
            <button style={styles.closeButton} onClick={onClose}>
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

        <div style={styles.modalBody}>
          {versions.length === 0 ? (
            <div style={styles.emptyState}>
              <svg
                style={styles.emptyIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <h4 style={styles.emptyTitle}>No version history</h4>
              <p style={styles.emptyText}>Changes to this response will be tracked here.</p>
            </div>
          ) : (
            <ul style={styles.versionList}>
              {[...versions].reverse().map((version, index) => {
                const isCurrent = index === 0;
                const isSelected = selectedVersion === version.id;
                const isCompareSelected =
                  compareVersion1 === version.id || compareVersion2 === version.id;
                const isHovered = hoveredVersion === version.id;

                return (
                  <li
                    key={version.id}
                    style={{
                      ...styles.versionItem,
                      ...(isSelected || isCompareSelected ? styles.versionItemActive : {}),
                      ...(isHovered && !isSelected && !isCompareSelected
                        ? styles.versionItemHover
                        : {}),
                    }}
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
                    <div style={styles.versionHeader}>
                      <div style={styles.versionNumber}>
                        <span
                          style={{
                            ...styles.versionBadge,
                            ...(isCurrent ? styles.versionBadgeCurrent : {}),
                            ...getChangeTypeBadgeStyle(version.changeType),
                          }}
                        >
                          v{version.version}
                          {isCurrent && ' (Current)'}
                        </span>
                        {version.changeType === 'restore' && (
                          <span style={{ fontSize: '12px', color: '#16a34a' }}>Restored</span>
                        )}
                        {compareMode && isCompareSelected && (
                          <span
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              backgroundColor: '#3b82f6',
                              color: '#fff',
                              borderRadius: '10px',
                            }}
                          >
                            {compareVersion1 === version.id ? 'A' : 'B'}
                          </span>
                        )}
                      </div>
                      <span style={styles.versionTime}>{formatDate(version.createdAt)}</span>
                    </div>

                    <p style={styles.versionPreview}>{version.value || '(empty)'}</p>

                    {isSelected && !compareMode && !isCurrent && (
                      <div style={styles.versionActions}>
                        <button
                          style={{ ...styles.actionButton, ...styles.restoreButton }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(version.id);
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#bfdbfe')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
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
          <div style={styles.diffView}>
            <div style={styles.diffHeader}>
              <h4 style={styles.diffTitle}>Changes</h4>
              <div style={styles.diffStats}>
                <span style={styles.diffStatAdded}>+{diff.added.length} added</span>
                <span style={styles.diffStatRemoved}>-{diff.removed.length} removed</span>
              </div>
            </div>
            <div style={styles.diffContent}>
              {diff.removed.map((word, i) => (
                <span key={`r-${i}`} style={styles.diffRemoved}>
                  {word}{' '}
                </span>
              ))}
              {diff.added.map((word, i) => (
                <span key={`a-${i}`} style={styles.diffAdded}>
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
        style={styles.trigger}
        onClick={() => setIsOpen(true)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
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
