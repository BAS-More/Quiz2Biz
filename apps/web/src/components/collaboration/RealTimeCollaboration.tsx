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
  presenceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  presenceLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginRight: '8px',
  },
  avatarStack: {
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid #fff',
    marginLeft: '-8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  avatarFirst: {
    marginLeft: '0',
  },
  onlineIndicator: {
    position: 'absolute' as const,
    bottom: '-2px',
    right: '-2px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid #fff',
  },
  onlineIndicatorOnline: {
    backgroundColor: '#22c55e',
  },
  onlineIndicatorOffline: {
    backgroundColor: '#94a3b8',
  },
  moreAvatars: {
    backgroundColor: '#94a3b8',
    fontSize: '11px',
  },
  cursor: {
    position: 'fixed' as const,
    pointerEvents: 'none' as const,
    zIndex: 9999,
    transition: 'transform 0.1s ease-out',
  },
  cursorPointer: {
    width: '0',
    height: '0',
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderBottom: '10px solid',
  },
  cursorLabel: {
    marginTop: '2px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#fff',
    whiteSpace: 'nowrap' as const,
  },
  lockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  conflictModal: {
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
  },
  conflictContent: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    overflow: 'hidden',
  },
  conflictHeader: {
    padding: '20px 24px',
    backgroundColor: '#fef2f2',
    borderBottom: '1px solid #fee2e2',
  },
  conflictTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#991b1b',
    margin: 0,
  },
  conflictBody: {
    padding: '24px',
  },
  conflictVersions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  conflictVersion: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  conflictVersionHeader: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  },
  conflictVersionContent: {
    fontSize: '14px',
    color: '#1e293b',
    lineHeight: 1.5,
    backgroundColor: '#f8fafc',
    padding: '12px',
    borderRadius: '6px',
    fontFamily: 'ui-monospace, monospace',
    minHeight: '80px',
    whiteSpace: 'pre-wrap' as const,
  },
  conflictActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  conflictButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  conflictButtonLocal: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  conflictButtonRemote: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  conflictButtonMerge: {
    backgroundColor: '#1e293b',
    color: '#fff',
  },
  mergeTextarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    resize: 'vertical' as const,
    marginBottom: '16px',
    fontFamily: 'ui-monospace, monospace',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginTop: '8px',
  },
  typingDots: {
    display: 'flex',
    gap: '3px',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#94a3b8',
    animation: 'typing-bounce 1.4s infinite ease-in-out both',
  },
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
    <div style={styles.presenceBar}>
      <span style={styles.presenceLabel}>{onlineUsers.length} online</span>
      <div style={styles.avatarStack}>
        {visibleUsers.map((user, index) => (
          <div
            key={user.userId}
            style={{
              ...styles.avatar,
              ...(index === 0 ? styles.avatarFirst : {}),
              backgroundColor: user.color,
              zIndex: visibleUsers.length - index,
            }}
            onMouseEnter={() => setHoveredUser(user.userId)}
            onMouseLeave={() => setHoveredUser(null)}
            title={user.userName}
          >
            {getInitials(user.userName)}
            <div
              style={{
                ...styles.onlineIndicator,
                ...(user.isOnline ? styles.onlineIndicatorOnline : styles.onlineIndicatorOffline),
              }}
            />
            {hoveredUser === user.userId && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#1e293b',
                  color: '#fff',
                  fontSize: '12px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.userName}
              </div>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div style={{ ...styles.avatar, ...styles.moreAvatars }}>+{remainingCount}</div>
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
            style={{
              ...styles.cursor,
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
          >
            <div
              style={{
                ...styles.cursorPointer,
                borderBottomColor: user.color,
              }}
            />
            <div
              style={{
                ...styles.cursorLabel,
                backgroundColor: user.color,
              }}
            >
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
    <div style={styles.lockBadge}>
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
    <div style={styles.conflictModal} onClick={onDismiss}>
      <div style={styles.conflictContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.conflictHeader}>
          <h3 style={styles.conflictTitle}>
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
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#7f1d1d' }}>
            {conflict.remoteUser} made changes while you were editing.
          </p>
        </div>

        <div style={styles.conflictBody}>
          <div style={styles.conflictVersions}>
            <div style={styles.conflictVersion}>
              <div style={styles.conflictVersionHeader}>Your Version ({conflict.localUser})</div>
              <div style={styles.conflictVersionContent}>{conflict.localValue}</div>
            </div>
            <div style={styles.conflictVersion}>
              <div style={styles.conflictVersionHeader}>Their Version ({conflict.remoteUser})</div>
              <div style={styles.conflictVersionContent}>{conflict.remoteValue}</div>
            </div>
          </div>

          {showMerge && (
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}
              >
                Merged Version
              </label>
              <textarea
                style={styles.mergeTextarea}
                value={mergedValue}
                onChange={(e) => setMergedValue(e.target.value)}
                placeholder="Combine both versions..."
              />
            </div>
          )}

          <div style={styles.conflictActions}>
            <button
              style={{ ...styles.conflictButton, ...styles.conflictButtonLocal }}
              onClick={() => onResolve('local')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#bfdbfe')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
            >
              Keep Mine
            </button>
            <button
              style={{ ...styles.conflictButton, ...styles.conflictButtonRemote }}
              onClick={() => onResolve('remote')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#bbf7d0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dcfce7')}
            >
              Use Theirs
            </button>
            {!showMerge ? (
              <button
                style={{ ...styles.conflictButton, ...styles.conflictButtonMerge }}
                onClick={() => setShowMerge(true)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
              >
                Merge...
              </button>
            ) : (
              <button
                style={{ ...styles.conflictButton, ...styles.conflictButtonMerge }}
                onClick={() => onResolve('merged', mergedValue)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
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
    <div style={styles.typingIndicator}>
      <div style={styles.typingDots}>
        <div style={{ ...styles.typingDot, animationDelay: '0s' }} />
        <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
        <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
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
