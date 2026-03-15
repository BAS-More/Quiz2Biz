/**
 * RealTimeCollaboration.tsx - Sprint 35 Task 3 & 4
 * Real-Time Collaboration with WebSocket, Presence, Cursors, and Conflict Resolution
 * Nielsen Heuristic: Visibility of system status, User control
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CollaboratorInfo {
  userId: string;
  userName: string;
  avatarUrl?: string;
  color: string;
  joinedAt: Date;
  lastActiveAt: Date;
  isOnline: boolean;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  elementId?: string;
  timestamp: number;
}

export interface EditLock {
  fieldId: string;
  userId: string;
  userName: string;
  acquiredAt: Date;
  expiresAt: Date;
}

export interface ConflictEvent {
  id: string;
  fieldId: string;
  localValue: string;
  remoteValue: string;
  localUser: string;
  remoteUser: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merged';
  mergedValue?: string;
}

export interface CollaborationMessage {
  type: 'join' | 'leave' | 'cursor' | 'edit' | 'lock' | 'unlock' | 'conflict' | 'sync';
  userId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface RealTimeContextValue {
  isConnected: boolean;
  collaborators: CollaboratorInfo[];
  cursors: Map<string, CursorPosition>;
  locks: Map<string, EditLock>;
  conflicts: ConflictEvent[];
  connect: (sessionId: string, userId: string, userName: string) => void;
  disconnect: () => void;
  broadcastCursor: (x: number, y: number, elementId?: string) => void;
  acquireLock: (fieldId: string) => boolean;
  releaseLock: (fieldId: string) => void;
  resolveConflict: (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merged',
    mergedValue?: string,
  ) => void;
  sendEdit: (fieldId: string, value: string) => void;
}

// ============================================================================
// Color Palette for Collaborators
// ============================================================================

const COLLABORATOR_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

const getCollaboratorColor = (index: number): string => {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
};

// ============================================================================
// Mock WebSocket Service (Replace with actual Socket.io)
// ============================================================================

class MockWebSocketService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;
  private userId = '';
  connect(sessionId: string, userId: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = true;
        this.userId = userId;
        this.emit('connected', { userId, sessionId });
        resolve();
      }, 100);
    });
  }

  disconnect(): void {
    this.isConnected = false;
    this.emit('disconnected', { userId: this.userId });
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  send(message: CollaborationMessage): void {
    if (!this.isConnected) {
      return;
    }
    // Simulate broadcast to other users
    setTimeout(() => {
      this.emit('message', message);
    }, 50);
  }
}

const wsService = new MockWebSocketService();

// ============================================================================
// Context
// ============================================================================

const RealTimeContext = createContext<RealTimeContextValue | null>(null);

export const useRealTime = (): RealTimeContextValue => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within RealTimeProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface RealTimeProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
}

export const RealTimeProvider: React.FC<RealTimeProviderProps> = ({
  children,
  serverUrl: _serverUrl = 'ws://localhost:3001',
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [locks, setLocks] = useState<Map<string, EditLock>>(new Map());
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);

  const userIdRef = useRef<string>('');
  const userNameRef = useRef<string>('');
  const cursorThrottle = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket server
  const connect = useCallback(async (sessionId: string, userId: string, userName: string) => {
    userIdRef.current = userId;
    userNameRef.current = userName;

    await wsService.connect(sessionId, userId);
    setIsConnected(true);

    // Add self to collaborators
    setCollaborators([
      {
        userId,
        userName,
        color: getCollaboratorColor(0),
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isOnline: true,
      },
    ]);

    // Broadcast join
    wsService.send({
      type: 'join',
      userId,
      payload: { userName },
      timestamp: Date.now(),
    });
  }, []);

  // Disconnect from server
  const disconnect = useCallback(() => {
    wsService.send({
      type: 'leave',
      userId: userIdRef.current,
      payload: {},
      timestamp: Date.now(),
    });
    wsService.disconnect();
    setIsConnected(false);
    setCollaborators([]);
    setCursors(new Map());
    setLocks(new Map());
  }, []);

  // Broadcast cursor position (throttled)
  const broadcastCursor = useCallback((x: number, y: number, elementId?: string) => {
    if (cursorThrottle.current) {
      clearTimeout(cursorThrottle.current);
    }

    cursorThrottle.current = setTimeout(() => {
      wsService.send({
        type: 'cursor',
        userId: userIdRef.current,
        payload: { x, y, elementId },
        timestamp: Date.now(),
      });
    }, 50); // Throttle to 20fps
  }, []);

  // Acquire lock on a field
  const acquireLock = useCallback(
    (fieldId: string): boolean => {
      const existingLock = locks.get(fieldId);

      if (existingLock && existingLock.userId !== userIdRef.current) {
        // Field is locked by another user
        return false;
      }

      const newLock: EditLock = {
        fieldId,
        userId: userIdRef.current,
        userName: userNameRef.current,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 30000), // 30 second lock
      };

      setLocks((prev) => {
        const updated = new Map(prev);
        updated.set(fieldId, newLock);
        return updated;
      });

      wsService.send({
        type: 'lock',
        userId: userIdRef.current,
        payload: { fieldId, userName: userNameRef.current },
        timestamp: Date.now(),
      });

      return true;
    },
    [locks],
  );

  // Release lock on a field
  const releaseLock = useCallback((fieldId: string) => {
    setLocks((prev) => {
      const updated = new Map(prev);
      updated.delete(fieldId);
      return updated;
    });

    wsService.send({
      type: 'unlock',
      userId: userIdRef.current,
      payload: { fieldId },
      timestamp: Date.now(),
    });
  }, []);

  // Send edit to other collaborators
  const sendEdit = useCallback((fieldId: string, value: string) => {
    wsService.send({
      type: 'edit',
      userId: userIdRef.current,
      payload: { fieldId, value },
      timestamp: Date.now(),
    });
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedValue?: string) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId ? { ...c, resolved: true, resolution, mergedValue } : c,
        ),
      );
    },
    [],
  );

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (message: CollaborationMessage) => {
      if (message.userId === userIdRef.current) {
        return;
      }

      switch (message.type) {
        case 'join':
          setCollaborators((prev) => {
            if (prev.find((c) => c.userId === message.userId)) {
              return prev;
            }
            return [
              ...prev,
              {
                userId: message.userId,
                userName: message.payload.userName as string,
                color: getCollaboratorColor(prev.length),
                joinedAt: new Date(message.timestamp),
                lastActiveAt: new Date(message.timestamp),
                isOnline: true,
              },
            ];
          });
          break;

        case 'leave':
          setCollaborators((prev) =>
            prev.map((c) => (c.userId === message.userId ? { ...c, isOnline: false } : c)),
          );
          setCursors((prev) => {
            const updated = new Map(prev);
            updated.delete(message.userId);
            return updated;
          });
          break;

        case 'cursor':
          setCursors((prev) => {
            const updated = new Map(prev);
            updated.set(message.userId, {
              userId: message.userId,
              x: message.payload.x as number,
              y: message.payload.y as number,
              elementId: message.payload.elementId as string,
              timestamp: message.timestamp,
            });
            return updated;
          });
          break;

        case 'lock':
          setLocks((prev) => {
            const updated = new Map(prev);
            updated.set(message.payload.fieldId as string, {
              fieldId: message.payload.fieldId as string,
              userId: message.userId,
              userName: message.payload.userName as string,
              acquiredAt: new Date(message.timestamp),
              expiresAt: new Date(message.timestamp + 30000),
            });
            return updated;
          });
          break;

        case 'unlock':
          setLocks((prev) => {
            const updated = new Map(prev);
            updated.delete(message.payload.fieldId as string);
            return updated;
          });
          break;
      }
    };

    wsService.on('message', handleMessage);
    return () => wsService.off('message', handleMessage);
  }, []);

  // Clean up stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const updated = new Map(prev);
        updated.forEach((cursor, id) => {
          if (now - cursor.timestamp > 5000) {
            updated.delete(id);
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const value: RealTimeContextValue = {
    isConnected,
    collaborators,
    cursors,
    locks,
    conflicts,
    connect,
    disconnect,
    broadcastCursor,
    acquireLock,
    releaseLock,
    resolveConflict,
    sendEdit,
  };

  return <RealTimeContext.Provider value={value}>{children}</RealTimeContext.Provider>;
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  presenceBar:
    'flex items-center gap-2 px-4 py-2 bg-surface-50 rounded-lg border border-surface-200',
  presenceLabel: 'text-[13px] text-surface-500 mr-2',
  avatarStack: 'flex items-center',
  avatar:
    'w-8 h-8 rounded-full border-2 border-surface-50 -ml-2 flex items-center justify-center text-xs font-semibold text-white cursor-pointer relative',
  avatarFirst: 'ml-0',
  onlineIndicator:
    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-50',
  onlineIndicatorOnline: 'bg-success-500',
  onlineIndicatorOffline: 'bg-surface-400',
  moreAvatars: 'bg-surface-400 text-[11px]',
  cursor: 'fixed pointer-events-none z-[9999] transition-transform duration-100 ease-out',
  cursorPointer:
    'w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px]',
  cursorLabel: 'mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium text-white whitespace-nowrap',
  lockBadge:
    'inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-warning-50 text-warning-600',
  conflictModal: 'fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]',
  conflictContent: 'bg-surface-50 rounded-2xl w-full max-w-[600px] overflow-hidden',
  conflictHeader: 'px-6 py-5 bg-danger-50 border-b border-danger-100',
  conflictTitle: 'flex items-center gap-2 text-lg font-semibold text-danger-600 m-0',
  conflictBody: 'p-6',
  conflictVersions: 'grid grid-cols-2 gap-4 mb-6',
  conflictVersion: 'p-4 rounded-lg border border-surface-200',
  conflictVersionHeader: 'text-xs font-semibold text-surface-500 mb-2 uppercase',
  conflictVersionContent:
    'text-sm text-surface-800 leading-normal bg-surface-50 p-3 rounded-md font-mono min-h-[80px] whitespace-pre-wrap',
  conflictActions: 'flex gap-3 justify-end',
  conflictButton:
    'px-5 py-2.5 text-sm font-medium rounded-lg border-none cursor-pointer transition-colors',
  conflictButtonLocal: 'bg-brand-100 text-brand-700',
  conflictButtonRemote: 'bg-success-50 text-success-700',
  conflictButtonMerge: 'bg-surface-800 text-white',
  mergeTextarea:
    'w-full min-h-[100px] p-3 text-sm border border-surface-200 rounded-lg resize-y mb-4 font-mono',
  typingIndicator:
    'flex items-center gap-2 px-3 py-2 text-[13px] text-surface-500 bg-surface-50 rounded-lg mt-2',
  typingDots: 'flex gap-[3px]',
  typingDot: 'w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce',
};

// ============================================================================
// UI Components
// ============================================================================

interface PresenceBarProps {
  maxVisible?: number;
}

export const PresenceBar: React.FC<PresenceBarProps> = ({ maxVisible = 5 }) => {
  const { collaborators, isConnected } = useRealTime();
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  const onlineUsers = collaborators.filter((c) => c.isOnline);
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const remainingCount = onlineUsers.length - maxVisible;

  if (!isConnected) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={styles.presenceBar}>
      <span className={styles.presenceLabel}>{onlineUsers.length} online</span>
      <div className={styles.avatarStack}>
        {visibleUsers.map((user, index) => (
          <div
            key={user.userId}
            className={`${styles.avatar} ${index === 0 ? styles.avatarFirst : ''}`}
            style={{ backgroundColor: user.color, zIndex: visibleUsers.length - index }}
            onMouseEnter={() => setHoveredUser(user.userId)}
            onMouseLeave={() => setHoveredUser(null)}
            title={user.userName}
          >
            {getInitials(user.userName)}
            <div
              className={`${styles.onlineIndicator} ${user.isOnline ? styles.onlineIndicatorOnline : styles.onlineIndicatorOffline}`}
            />
            {hoveredUser === user.userId && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-800 text-white text-xs rounded whitespace-nowrap">
                {user.userName}
              </div>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className={`${styles.avatar} ${styles.moreAvatars}`}>+{remainingCount}</div>
        )}
      </div>
    </div>
  );
};

export const RemoteCursors: React.FC = () => {
  const { cursors, collaborators } = useRealTime();

  const getCollaboratorInfo = (userId: string) => {
    return collaborators.find((c) => c.userId === userId);
  };

  return (
    <>
      {Array.from(cursors.entries()).map(([userId, position]) => {
        const user = getCollaboratorInfo(userId);
        if (!user) {
          return null;
        }

        return (
          <div
            key={userId}
            className={styles.cursor}
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          >
            <div className={styles.cursorPointer} style={{ borderBottomColor: user.color }} />
            <div className={styles.cursorLabel} style={{ backgroundColor: user.color }}>
              {user.userName}
            </div>
          </div>
        );
      })}
    </>
  );
};

interface FieldLockIndicatorProps {
  fieldId: string;
}

export const FieldLockIndicator: React.FC<FieldLockIndicatorProps> = ({ fieldId }) => {
  const { locks } = useRealTime();
  const lock = locks.get(fieldId);

  if (!lock) {
    return null;
  }

  return (
    <div className={styles.lockBadge}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      Editing by {lock.userName}
    </div>
  );
};

interface ConflictResolverProps {
  conflict: ConflictEvent;
  onResolve: (resolution: 'local' | 'remote' | 'merged', mergedValue?: string) => void;
  onDismiss: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflict,
  onResolve,
  onDismiss,
}) => {
  const [showMerge, setShowMerge] = useState(false);
  const [mergedValue, setMergedValue] = useState(conflict.localValue);

  return (
    <div className={styles.conflictModal} onClick={onDismiss}>
      <div className={styles.conflictContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.conflictHeader}>
          <h3 className={styles.conflictTitle}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Edit Conflict Detected
          </h3>
          <p className="mt-2 text-sm text-danger-600">
            {conflict.remoteUser} made changes while you were editing.
          </p>
        </div>

        <div className={styles.conflictBody}>
          <div className={styles.conflictVersions}>
            <div className={styles.conflictVersion}>
              <div className={styles.conflictVersionHeader}>
                Your Version ({conflict.localUser})
              </div>
              <div className={styles.conflictVersionContent}>{conflict.localValue}</div>
            </div>
            <div className={styles.conflictVersion}>
              <div className={styles.conflictVersionHeader}>
                Their Version ({conflict.remoteUser})
              </div>
              <div className={styles.conflictVersionContent}>{conflict.remoteValue}</div>
            </div>
          </div>

          {showMerge && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Merged Version</label>
              <textarea
                className={styles.mergeTextarea}
                value={mergedValue}
                onChange={(e) => setMergedValue(e.target.value)}
                placeholder="Combine both versions..."
              />
            </div>
          )}

          <div className={styles.conflictActions}>
            <button
              className={`${styles.conflictButton} ${styles.conflictButtonLocal}`}
              onClick={() => onResolve('local')}
            >
              Keep Mine
            </button>
            <button
              className={`${styles.conflictButton} ${styles.conflictButtonRemote}`}
              onClick={() => onResolve('remote')}
            >
              Use Theirs
            </button>
            {!showMerge ? (
              <button
                className={`${styles.conflictButton} ${styles.conflictButtonMerge}`}
                onClick={() => setShowMerge(true)}
              >
                Merge...
              </button>
            ) : (
              <button
                className={`${styles.conflictButton} ${styles.conflictButtonMerge}`}
                onClick={() => onResolve('merged', mergedValue)}
              >
                Save Merged
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TypingIndicatorProps {
  fieldId: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ fieldId }) => {
  const { locks, collaborators } = useRealTime();
  const lock = locks.get(fieldId);

  if (!lock) {
    return null;
  }

  const user = collaborators.find((c) => c.userId === lock.userId);
  if (!user) {
    return null;
  }

  return (
    <div className={styles.typingIndicator}>
      <div className={styles.typingDots}>
        <div className={`${styles.typingDot}`} style={{ animationDelay: '0s' }} />
        <div className={`${styles.typingDot}`} style={{ animationDelay: '0.2s' }} />
        <div className={`${styles.typingDot}`} style={{ animationDelay: '0.4s' }} />
      </div>
      <span>{user.userName} is typing...</span>
    </div>
  );
};

// ============================================================================
// Hook for Collaborative Input
// ============================================================================

interface UseCollaborativeInputOptions {
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
}

export const useCollaborativeInput = (options: UseCollaborativeInputOptions) => {
  const { acquireLock, releaseLock, sendEdit, locks } = useRealTime();
  const [_isLocked, setIsLocked] = useState(false);

  const handleFocus = useCallback(() => {
    const acquired = acquireLock(options.fieldId);
    setIsLocked(!acquired);
  }, [acquireLock, options.fieldId]);

  const handleBlur = useCallback(() => {
    releaseLock(options.fieldId);
    setIsLocked(false);
  }, [releaseLock, options.fieldId]);

  const handleChange = useCallback(
    (newValue: string) => {
      options.onChange(newValue);
      sendEdit(options.fieldId, newValue);
    },
    [options, sendEdit],
  );

  const lock = locks.get(options.fieldId);
  const isLockedByOther = lock && lock.userId !== 'current-user';

  return {
    isLocked: isLockedByOther,
    lockInfo: lock,
    handlers: {
      onFocus: handleFocus,
      onBlur: handleBlur,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        handleChange(e.target.value);
      },
    },
  };
};

// ============================================================================
// CSS Animation
// ============================================================================

const globalStyle = document.createElement('style');
globalStyle.textContent = `
  @keyframes typing-bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;
if (!document.querySelector('style[data-realtime-collab]')) {
  globalStyle.setAttribute('data-realtime-collab', 'true');
  document.head.appendChild(globalStyle);
}

export default {
  RealTimeProvider,
  useRealTime,
  PresenceBar,
  RemoteCursors,
  FieldLockIndicator,
  ConflictResolver,
  TypingIndicator,
  useCollaborativeInput,
};
