/**
 * UndoRedo.tsx - Sprint 35 Task 1
 * Full Undo/Redo Stack with Command Pattern
 * Nielsen Heuristic: User control and freedom
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Command {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  execute: () => void;
  undo: () => void;
  redo?: () => void;
  data?: Record<string, unknown>;
}

export interface CommandGroup {
  id: string;
  commands: Command[];
  description: string;
  timestamp: number;
}

export interface UndoRedoState {
  past: Command[];
  future: Command[];
  maxHistorySize: number;
}

export interface UndoRedoContextValue {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: Command[];
  redoStack: Command[];
  executeCommand: (command: Omit<Command, 'id' | 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  undoMultiple: (count: number) => void;
  redoMultiple: (count: number) => void;
  clearHistory: () => void;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

// ============================================================================
// Command Factory
// ============================================================================

export const createCommand = (
  type: string,
  description: string,
  execute: () => void,
  undo: () => void,
  data?: Record<string, unknown>,
): Omit<Command, 'id' | 'timestamp'> => ({
  type,
  description,
  execute,
  undo,
  data,
});

// Pre-built command types
export const CommandTypes = {
  TEXT_CHANGE: 'TEXT_CHANGE',
  SELECTION_CHANGE: 'SELECTION_CHANGE',
  FORM_FIELD_CHANGE: 'FORM_FIELD_CHANGE',
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DELETE: 'FILE_DELETE',
  RESPONSE_SUBMIT: 'RESPONSE_SUBMIT',
  NAVIGATION: 'NAVIGATION',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  BULK_OPERATION: 'BULK_OPERATION',
} as const;

// ============================================================================
// Context
// ============================================================================

const UndoRedoContext = createContext<UndoRedoContextValue | null>(null);

export const useUndoRedo = (): UndoRedoContextValue => {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within UndoRedoProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface UndoRedoProviderProps {
  children: React.ReactNode;
  maxHistorySize?: number;
  debounceMs?: number;
}

export const UndoRedoProvider: React.FC<UndoRedoProviderProps> = ({
  children,
  maxHistorySize = 100,
  debounceMs = 300,
}) => {
  const [past, setPast] = useState<Command[]>([]);
  const [future, setFuture] = useState<Command[]>([]);
  const lastCommandType = useRef<string>('');
  const lastCommandTime = useRef<number>(0);

  // Generate unique ID
  const generateId = () => `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Execute a new command
  const executeCommand = useCallback(
    (cmd: Omit<Command, 'id' | 'timestamp'>) => {
      const now = Date.now();
      const command: Command = {
        ...cmd,
        id: generateId(),
        timestamp: now,
      };

      // Check if we should merge with previous command (for text input debouncing)
      const shouldMerge =
        cmd.type === lastCommandType.current &&
        now - lastCommandTime.current < debounceMs &&
        (cmd.type === CommandTypes.TEXT_CHANGE || cmd.type === CommandTypes.FORM_FIELD_CHANGE);

      // Execute the command
      command.execute();

      setPast((prev) => {
        let newPast: Command[];

        if (shouldMerge && prev.length > 0) {
          // Merge with previous command
          const previousCommand = prev[prev.length - 1];
          const mergedCommand: Command = {
            ...command,
            undo: previousCommand.undo, // Use original undo to go back to initial state
            description: `${cmd.description} (merged)`,
          };
          newPast = [...prev.slice(0, -1), mergedCommand];
        } else {
          newPast = [...prev, command];
        }

        // Trim history if needed
        if (newPast.length > maxHistorySize) {
          newPast = newPast.slice(-maxHistorySize);
        }

        return newPast;
      });

      // Clear redo stack when new command is executed
      setFuture([]);

      lastCommandType.current = cmd.type;
      lastCommandTime.current = now;
    },
    [maxHistorySize, debounceMs],
  );

  // Undo last command
  const undo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const lastCommand = prev[prev.length - 1];
      lastCommand.undo();

      setFuture((fut) => [lastCommand, ...fut]);
      return prev.slice(0, -1);
    });
  }, []);

  // Redo last undone command
  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const nextCommand = prev[0];
      if (nextCommand.redo) {
        nextCommand.redo();
      } else {
        nextCommand.execute();
      }

      setPast((p) => [...p, nextCommand]);
      return prev.slice(1);
    });
  }, []);

  // Undo multiple commands
  const undoMultiple = useCallback(
    (count: number) => {
      for (let i = 0; i < count; i++) {
        undo();
      }
    },
    [undo],
  );

  // Redo multiple commands
  const redoMultiple = useCallback(
    (count: number) => {
      for (let i = 0; i < count; i++) {
        redo();
      }
    },
    [redo],
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  // Get description of next undo action
  const getUndoDescription = useCallback((): string | null => {
    if (past.length === 0) {
      return null;
    }
    return past[past.length - 1].description;
  }, [past]);

  // Get description of next redo action
  const getRedoDescription = useCallback((): string | null => {
    if (future.length === 0) {
      return null;
    }
    return future[0].description;
  }, [future]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if in an input element (let native undo work)
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if (
        (event.ctrlKey || event.metaKey) &&
        ((event.key === 'z' && event.shiftKey) || event.key === 'y')
      ) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const value: UndoRedoContextValue = {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoStack: past,
    redoStack: future,
    executeCommand,
    undo,
    redo,
    undoMultiple,
    redoMultiple,
    clearHistory,
    getUndoDescription,
    getRedoDescription,
  };

  return <UndoRedoContext.Provider value={value}>{children}</UndoRedoContext.Provider>;
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.15s',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  buttonHover: {
    backgroundColor: '#e2e8f0',
    color: '#1e293b',
  },
  separator: {
    width: '1px',
    height: '20px',
    backgroundColor: '#e2e8f0',
    margin: '0 4px',
  },
  historyPanel: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '8px',
    width: '320px',
    maxHeight: '400px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  historyHeader: {
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  clearButton: {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  historyList: {
    maxHeight: '320px',
    overflowY: 'auto' as const,
  },
  historySection: {
    padding: '8px 0',
  },
  historySectionTitle: {
    padding: '4px 16px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  historyItemHover: {
    backgroundColor: '#f1f5f9',
  },
  historyItemIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#64748b',
  },
  historyItemIconUndo: {
    backgroundColor: '#dbeafe',
    color: '#2563eb',
  },
  historyItemIconRedo: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  historyItemContent: {
    flex: 1,
    minWidth: 0,
  },
  historyItemDescription: {
    fontSize: '13px',
    color: '#1e293b',
    margin: 0,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  historyItemTime: {
    fontSize: '11px',
    color: '#94a3b8',
    margin: 0,
  },
  emptyHistory: {
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: '13px',
  },
  tooltip: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    padding: '6px 10px',
    backgroundColor: '#1e293b',
    color: '#fff',
    fontSize: '12px',
    borderRadius: '6px',
    whiteSpace: 'nowrap' as const,
    pointerEvents: 'none' as const,
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  tooltipVisible: {
    opacity: 1,
  },
};

// ============================================================================
// UI Components
// ============================================================================

interface UndoRedoToolbarProps {
  showHistory?: boolean;
  compact?: boolean;
}

export const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
  showHistory = true,
  compact: _compact = false,
}) => {
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    getUndoDescription,
    getRedoDescription,
    undoStack,
    redoStack,
    clearHistory,
  } = useUndoRedo();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) {
      return 'Just now';
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case CommandTypes.TEXT_CHANGE:
      case CommandTypes.FORM_FIELD_CHANGE:
        return (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        );
      case CommandTypes.FILE_UPLOAD:
      case CommandTypes.FILE_DELETE:
        return (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
            <polyline points="13,2 13,9 20,9" />
          </svg>
        );
      case CommandTypes.RESPONSE_SUBMIT:
        return (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        );
      default:
        return (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div style={styles.toolbar}>
        {/* Undo Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            onMouseEnter={() => setHoveredButton('undo')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              ...styles.button,
              ...(!canUndo ? styles.buttonDisabled : {}),
              ...(hoveredButton === 'undo' && canUndo ? styles.buttonHover : {}),
            }}
            aria-label={`Undo${canUndo ? `: ${getUndoDescription()}` : ''}`}
            title={canUndo ? `Undo: ${getUndoDescription()}` : 'Nothing to undo'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
            </svg>
          </button>
        </div>

        {/* Redo Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={redo}
            disabled={!canRedo}
            onMouseEnter={() => setHoveredButton('redo')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              ...styles.button,
              ...(!canRedo ? styles.buttonDisabled : {}),
              ...(hoveredButton === 'redo' && canRedo ? styles.buttonHover : {}),
            }}
            aria-label={`Redo${canRedo ? `: ${getRedoDescription()}` : ''}`}
            title={canRedo ? `Redo: ${getRedoDescription()}` : 'Nothing to redo'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
            </svg>
          </button>
        </div>

        {/* History Button */}
        {showHistory && (
          <>
            <div style={styles.separator} />
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              onMouseEnter={() => setHoveredButton('history')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                ...styles.button,
                ...(hoveredButton === 'history' ? styles.buttonHover : {}),
              }}
              aria-label="View history"
              title="View history"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* History Panel */}
      {isHistoryOpen && (
        <div style={styles.historyPanel}>
          <div style={styles.historyHeader}>
            <h4 style={styles.historyTitle}>History</h4>
            {(undoStack.length > 0 || redoStack.length > 0) && (
              <button
                onClick={clearHistory}
                style={styles.clearButton}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Clear
              </button>
            )}
          </div>

          <div style={styles.historyList}>
            {undoStack.length === 0 && redoStack.length === 0 ? (
              <div style={styles.emptyHistory}>No actions yet. Your changes will appear here.</div>
            ) : (
              <>
                {/* Redo Stack (Future) */}
                {redoStack.length > 0 && (
                  <div style={styles.historySection}>
                    <div style={styles.historySectionTitle}>Redo</div>
                    {redoStack.map((cmd, index) => (
                      <div
                        key={cmd.id}
                        style={{
                          ...styles.historyItem,
                          ...(hoveredItem === `redo-${index}` ? styles.historyItemHover : {}),
                        }}
                        onMouseEnter={() => setHoveredItem(`redo-${index}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => {
                          for (let i = 0; i <= index; i++) {
                            redo();
                          }
                        }}
                      >
                        <div style={{ ...styles.historyItemIcon, ...styles.historyItemIconRedo }}>
                          {getTypeIcon(cmd.type)}
                        </div>
                        <div style={styles.historyItemContent}>
                          <p style={styles.historyItemDescription}>{cmd.description}</p>
                          <p style={styles.historyItemTime}>{formatTime(cmd.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Undo Stack (Past) - shown in reverse */}
                {undoStack.length > 0 && (
                  <div style={styles.historySection}>
                    <div style={styles.historySectionTitle}>Done</div>
                    {[...undoStack].reverse().map((cmd, index) => (
                      <div
                        key={cmd.id}
                        style={{
                          ...styles.historyItem,
                          ...(hoveredItem === `undo-${index}` ? styles.historyItemHover : {}),
                        }}
                        onMouseEnter={() => setHoveredItem(`undo-${index}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => {
                          for (let i = 0; i <= index; i++) {
                            undo();
                          }
                        }}
                      >
                        <div style={{ ...styles.historyItemIcon, ...styles.historyItemIconUndo }}>
                          {getTypeIcon(cmd.type)}
                        </div>
                        <div style={styles.historyItemContent}>
                          <p style={styles.historyItemDescription}>{cmd.description}</p>
                          <p style={styles.historyItemTime}>{formatTime(cmd.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Keyboard Shortcut Hint
// ============================================================================

export const UndoRedoShortcuts: React.FC = () => {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const modifier = isMac ? '⌘' : 'Ctrl';

  return (
    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
      <span>
        <kbd
          style={{
            padding: '2px 6px',
            backgroundColor: '#f1f5f9',
            borderRadius: '4px',
            marginRight: '4px',
          }}
        >
          {modifier}+Z
        </kbd>
        Undo
      </span>
      <span>
        <kbd
          style={{
            padding: '2px 6px',
            backgroundColor: '#f1f5f9',
            borderRadius: '4px',
            marginRight: '4px',
          }}
        >
          {modifier}+{isMac ? 'Shift+Z' : 'Y'}
        </kbd>
        Redo
      </span>
    </div>
  );
};

// ============================================================================
// Hook for Form Integration
// ============================================================================

interface UseUndoableFieldOptions {
  fieldId: string;
  description: string;
  getValue: () => string;
  setValue: (value: string) => void;
}

export const useUndoableField = (options: UseUndoableFieldOptions) => {
  const { executeCommand } = useUndoRedo();
  const previousValue = useRef<string>(options.getValue());

  const handleChange = useCallback(
    (newValue: string) => {
      const oldValue = previousValue.current;

      executeCommand({
        type: CommandTypes.FORM_FIELD_CHANGE,
        description: options.description,
        execute: () => {
          options.setValue(newValue);
        },
        undo: () => {
          options.setValue(oldValue);
        },
        data: {
          fieldId: options.fieldId,
          oldValue,
          newValue,
        },
      });

      previousValue.current = newValue;
    },
    [executeCommand, options],
  );

  return { handleChange };
};

export default {
  UndoRedoProvider,
  useUndoRedo,
  UndoRedoToolbar,
  UndoRedoShortcuts,
  useUndoableField,
  createCommand,
  CommandTypes,
};
