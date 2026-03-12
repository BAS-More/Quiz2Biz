/**
 * Comments.tsx - Comment & Discussion System
 * Sprint 35 Task 5: Comment threads on questions with @mentions
 *
 * Nielsen Heuristics Addressed:
 * - #1 Visibility: Show comment counts, unread indicators
 * - #4 Consistency: Standard comment UI patterns
 * - #7 Flexibility: @mentions, reactions, threading
 * - #10 Help: Contextual discussions for clarification
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface Mention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  questionId: string;
  parentId?: string; // For threaded replies
  content: string;
  mentions: Mention[];
  reactions: Reaction[];
  author: User;
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
  isResolved: boolean;
  isPinned: boolean;
}

export interface CommentThread {
  id: string;
  questionId: string;
  rootComment: Comment;
  replies: Comment[];
  isExpanded: boolean;
  unreadCount: number;
}

export interface CommentNotification {
  id: string;
  type: 'mention' | 'reply' | 'reaction' | 'resolved';
  commentId: string;
  questionId: string;
  fromUser: User;
  message: string;
  createdAt: Date;
  isRead: boolean;
}

export interface CommentDraft {
  questionId: string;
  parentId?: string;
  content: string;
  mentions: Mention[];
  savedAt: Date;
}

export interface CommentsContextValue {
  threads: Map<string, CommentThread[]>;
  notifications: CommentNotification[];
  unreadCount: number;
  drafts: Map<string, CommentDraft>;
  currentUser: User | null;
  teamMembers: User[];

  // Actions
  setCurrentUser: (user: User) => void;
  setTeamMembers: (members: User[]) => void;
  addComment: (
    questionId: string,
    content: string,
    mentions: Mention[],
    parentId?: string,
  ) => Comment;
  editComment: (commentId: string, content: string, mentions: Mention[]) => void;
  deleteComment: (commentId: string) => void;
  resolveThread: (threadId: string) => void;
  pinComment: (commentId: string) => void;
  addReaction: (commentId: string, emoji: string) => void;
  removeReaction: (commentId: string, emoji: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  saveDraft: (questionId: string, content: string, mentions: Mention[], parentId?: string) => void;
  getDraft: (questionId: string, parentId?: string) => CommentDraft | undefined;
  clearDraft: (questionId: string, parentId?: string) => void;
  getThreadsForQuestion: (questionId: string) => CommentThread[];
  getCommentCount: (questionId: string) => number;
}

// ============================================================================
// Context
// ============================================================================

const CommentsContext = createContext<CommentsContextValue | null>(null);

export const useComments = (): CommentsContextValue => {
  const context = useContext(CommentsContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentsProvider');
  }
  return context;
};

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  THREADS: 'quiz2biz_comment_threads',
  NOTIFICATIONS: 'quiz2biz_comment_notifications',
  DRAFTS: 'quiz2biz_comment_drafts',
};

// ============================================================================
// Provider Component
// ============================================================================

interface CommentsProviderProps {
  children: React.ReactNode;
  initialUser?: User;
  initialTeamMembers?: User[];
}

export const CommentsProvider: React.FC<CommentsProviderProps> = ({
  children,
  initialUser,
  initialTeamMembers = [],
}) => {
  const [threads, setThreads] = useState<Map<string, CommentThread[]>>(new Map());
  const [notifications, setNotifications] = useState<CommentNotification[]>([]);
  const [drafts, setDrafts] = useState<Map<string, CommentDraft>>(new Map());
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser || null);
  const [teamMembers, setTeamMembers] = useState<User[]>(initialTeamMembers);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedThreads = localStorage.getItem(STORAGE_KEYS.THREADS);
      if (savedThreads) {
        const parsed = JSON.parse(savedThreads);
        const threadsMap = new Map<string, CommentThread[]>();
        Object.entries(parsed).forEach(([key, value]) => {
          threadsMap.set(key, value as CommentThread[]);
        });
        setThreads(threadsMap);
      }

      const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }

      const savedDrafts = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      if (savedDrafts) {
        const parsed = JSON.parse(savedDrafts);
        const draftsMap = new Map<string, CommentDraft>();
        Object.entries(parsed).forEach(([key, value]) => {
          draftsMap.set(key, value as CommentDraft);
        });
        setDrafts(draftsMap);
      }
    } catch (error) {
      console.error('Failed to load comments from storage:', error);
    }
  }, []);

  // Save threads to localStorage
  useEffect(() => {
    const obj: Record<string, CommentThread[]> = {};
    threads.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(obj));
  }, [threads]);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  // Save drafts to localStorage
  useEffect(() => {
    const obj: Record<string, CommentDraft> = {};
    drafts.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(obj));
  }, [drafts]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const generateId = (): string => {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const createNotification = useCallback(
    (
      type: CommentNotification['type'],
      commentId: string,
      questionId: string,
      fromUser: User,
      message: string,
    ) => {
      const notification: CommentNotification = {
        id: generateId(),
        type,
        commentId,
        questionId,
        fromUser,
        message,
        createdAt: new Date(),
        isRead: false,
      };
      setNotifications((prev) => [notification, ...prev]);
    },
    [],
  );

  // Define helper function and clearDraft before addComment since addComment uses them
  const getDraftKey = (questionId: string, parentId?: string): string => {
    return parentId ? `${questionId}_${parentId}` : questionId;
  };

  const clearDraft = useCallback((questionId: string, parentId?: string) => {
    const key = getDraftKey(questionId, parentId);
    setDrafts((prev) => {
      const newDrafts = new Map(prev);
      newDrafts.delete(key);
      return newDrafts;
    });
  }, []);

  const addComment = useCallback(
    (questionId: string, content: string, mentions: Mention[], parentId?: string): Comment => {
      if (!currentUser) {
        throw new Error('Must be logged in to add comments');
      }

      const comment: Comment = {
        id: generateId(),
        questionId,
        parentId,
        content,
        mentions,
        reactions: [],
        author: currentUser,
        createdAt: new Date(),
        isEdited: false,
        isResolved: false,
        isPinned: false,
      };

      setThreads((prev) => {
        const newThreads = new Map(prev);
        const questionThreads = newThreads.get(questionId) || [];

        if (parentId) {
          // Add as reply to existing thread
          const updatedThreads = questionThreads.map((thread) => {
            if (
              thread.rootComment.id === parentId ||
              thread.replies.some((r) => r.id === parentId)
            ) {
              return {
                ...thread,
                replies: [...thread.replies, comment],
              };
            }
            return thread;
          });
          newThreads.set(questionId, updatedThreads);
        } else {
          // Create new thread
          const newThread: CommentThread = {
            id: generateId(),
            questionId,
            rootComment: comment,
            replies: [],
            isExpanded: true,
            unreadCount: 0,
          };
          newThreads.set(questionId, [...questionThreads, newThread]);
        }

        return newThreads;
      });

      // Create notifications for mentions
      mentions.forEach((mention) => {
        const mentionedUser = teamMembers.find((m) => m.id === mention.userId);
        if (mentionedUser && mentionedUser.id !== currentUser.id) {
          createNotification(
            'mention',
            comment.id,
            questionId,
            currentUser,
            `${currentUser.name} mentioned you in a comment`,
          );
        }
      });

      // Clear draft after successful post
      clearDraft(questionId, parentId);

      return comment;
    },
    [currentUser, teamMembers, createNotification, clearDraft],
  );

  const editComment = useCallback((commentId: string, content: string, mentions: Mention[]) => {
    setThreads((prev) => {
      const newThreads = new Map(prev);

      newThreads.forEach((questionThreads, questionId) => {
        const updatedThreads = questionThreads.map((thread) => {
          if (thread.rootComment.id === commentId) {
            return {
              ...thread,
              rootComment: {
                ...thread.rootComment,
                content,
                mentions,
                updatedAt: new Date(),
                isEdited: true,
              },
            };
          }

          const updatedReplies = thread.replies.map((reply) => {
            if (reply.id === commentId) {
              return {
                ...reply,
                content,
                mentions,
                updatedAt: new Date(),
                isEdited: true,
              };
            }
            return reply;
          });

          return { ...thread, replies: updatedReplies };
        });

        newThreads.set(questionId, updatedThreads);
      });

      return newThreads;
    });
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    setThreads((prev) => {
      const newThreads = new Map(prev);

      newThreads.forEach((questionThreads, questionId) => {
        // Filter out threads where root comment matches
        let updatedThreads = questionThreads.filter(
          (thread) => thread.rootComment.id !== commentId,
        );

        // Remove from replies
        updatedThreads = updatedThreads.map((thread) => ({
          ...thread,
          replies: thread.replies.filter((reply) => reply.id !== commentId),
        }));

        newThreads.set(questionId, updatedThreads);
      });

      return newThreads;
    });
  }, []);

  const resolveThread = useCallback((threadId: string) => {
    setThreads((prev) => {
      const newThreads = new Map(prev);

      newThreads.forEach((questionThreads, questionId) => {
        const updatedThreads = questionThreads.map((thread) => {
          if (thread.id === threadId) {
            return {
              ...thread,
              rootComment: {
                ...thread.rootComment,
                isResolved: !thread.rootComment.isResolved,
              },
            };
          }
          return thread;
        });

        newThreads.set(questionId, updatedThreads);
      });

      return newThreads;
    });
  }, []);

  const pinComment = useCallback((commentId: string) => {
    setThreads((prev) => {
      const newThreads = new Map(prev);

      newThreads.forEach((questionThreads, questionId) => {
        const updatedThreads = questionThreads.map((thread) => {
          if (thread.rootComment.id === commentId) {
            return {
              ...thread,
              rootComment: {
                ...thread.rootComment,
                isPinned: !thread.rootComment.isPinned,
              },
            };
          }
          return thread;
        });

        newThreads.set(questionId, updatedThreads);
      });

      return newThreads;
    });
  }, []);

  const addReaction = useCallback(
    (commentId: string, emoji: string) => {
      if (!currentUser) {
        return;
      }

      setThreads((prev) => {
        const newThreads = new Map(prev);

        newThreads.forEach((questionThreads, questionId) => {
          const updatedThreads = questionThreads.map((thread) => {
            const updateReactions = (comment: Comment): Comment => {
              if (comment.id !== commentId) {
                return comment;
              }

              // Check if user already reacted with this emoji
              const existingReaction = comment.reactions.find(
                (r) => r.emoji === emoji && r.userId === currentUser.id,
              );

              if (existingReaction) {
                return comment; // Already reacted
              }

              return {
                ...comment,
                reactions: [
                  ...comment.reactions,
                  {
                    emoji,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    createdAt: new Date(),
                  },
                ],
              };
            };

            return {
              ...thread,
              rootComment: updateReactions(thread.rootComment),
              replies: thread.replies.map(updateReactions),
            };
          });

          newThreads.set(questionId, updatedThreads);
        });

        return newThreads;
      });
    },
    [currentUser],
  );

  const removeReaction = useCallback(
    (commentId: string, emoji: string) => {
      if (!currentUser) {
        return;
      }

      setThreads((prev) => {
        const newThreads = new Map(prev);

        newThreads.forEach((questionThreads, questionId) => {
          const updatedThreads = questionThreads.map((thread) => {
            const updateReactions = (comment: Comment): Comment => {
              if (comment.id !== commentId) {
                return comment;
              }

              return {
                ...comment,
                reactions: comment.reactions.filter(
                  (r) => !(r.emoji === emoji && r.userId === currentUser.id),
                ),
              };
            };

            return {
              ...thread,
              rootComment: updateReactions(thread.rootComment),
              replies: thread.replies.map(updateReactions),
            };
          });

          newThreads.set(questionId, updatedThreads);
        });

        return newThreads;
      });
    },
    [currentUser],
  );

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const saveDraft = useCallback(
    (questionId: string, content: string, mentions: Mention[], parentId?: string) => {
      const key = getDraftKey(questionId, parentId);
      setDrafts((prev) => {
        const newDrafts = new Map(prev);
        newDrafts.set(key, {
          questionId,
          parentId,
          content,
          mentions,
          savedAt: new Date(),
        });
        return newDrafts;
      });
    },
    [],
  );

  const getDraft = useCallback(
    (questionId: string, parentId?: string): CommentDraft | undefined => {
      const key = getDraftKey(questionId, parentId);
      return drafts.get(key);
    },
    [drafts],
  );

  const getThreadsForQuestion = useCallback(
    (questionId: string): CommentThread[] => {
      return threads.get(questionId) || [];
    },
    [threads],
  );

  const getCommentCount = useCallback(
    (questionId: string): number => {
      const questionThreads = threads.get(questionId) || [];
      return questionThreads.reduce((count, thread) => count + 1 + thread.replies.length, 0);
    },
    [threads],
  );

  const value: CommentsContextValue = {
    threads,
    notifications,
    unreadCount,
    drafts,
    currentUser,
    teamMembers,
    setCurrentUser,
    setTeamMembers,
    addComment,
    editComment,
    deleteComment,
    resolveThread,
    pinComment,
    addReaction,
    removeReaction,
    markNotificationRead,
    markAllNotificationsRead,
    saveDraft,
    getDraft,
    clearDraft,
    getThreadsForQuestion,
    getCommentCount,
  };

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  commentSection: 'flex flex-col gap-4 p-4 bg-surface-100 rounded-lg',
  commentHeader: 'flex justify-between items-center mb-2',
  commentTitle: 'text-base font-semibold text-surface-800 m-0',
  commentCount: 'text-sm text-surface-500 bg-surface-200 px-2 py-0.5 rounded-xl',
  thread: 'bg-surface-50 rounded-lg border border-surface-200 overflow-hidden',
  threadResolved: 'opacity-70 border-success-500',
  threadPinned: 'border-warning-500 border-2',
  comment: 'py-3 px-4',
  commentMeta: 'flex items-center gap-2 mb-2',
  avatar: 'w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-semibold',
  authorName: 'font-semibold text-surface-800 text-sm',
  timestamp: 'text-xs text-surface-500',
  editedBadge: 'text-[11px] text-surface-500 italic',
  pinnedBadge: 'text-[11px] text-warning-600 bg-warning-50 px-1.5 py-0.5 rounded',
  resolvedBadge: 'text-[11px] text-success-600 bg-success-50 px-1.5 py-0.5 rounded',
  commentContent: 'text-sm leading-relaxed text-surface-800 mb-2 whitespace-pre-wrap',
  mention: 'text-brand-600 font-medium bg-brand-100 px-1 py-px rounded',
  reactions: 'flex flex-wrap gap-1 mb-2',
  reaction: 'flex items-center gap-1 px-2 py-0.5 bg-surface-100 rounded-xl text-xs cursor-pointer border-none transition-colors',
  reactionActive: 'bg-brand-100 border border-brand-500',
  reactionCount: 'text-surface-500',
  commentActions: 'flex gap-2 mt-2',
  actionButton: 'text-xs text-surface-500 bg-transparent border-none cursor-pointer px-2 py-1 rounded transition-colors',
  replies: 'ml-8 border-l-2 border-surface-200 pl-4',
  reply: 'py-3 border-b border-surface-100',
  replyLast: 'border-b-0',
  inputContainer: 'flex flex-col gap-2',
  textarea: 'w-full min-h-[80px] p-3 rounded-lg border border-surface-300 bg-surface-50 text-sm font-[inherit] resize-y outline-none',
  textareaFocused: 'border-brand-500 ring-2 ring-brand-500/10',
  inputActions: 'flex justify-between items-center',
  mentionHint: 'text-xs text-surface-500',
  submitButton: 'px-4 py-2 bg-brand-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors',
  submitButtonDisabled: 'bg-surface-300 cursor-not-allowed',
  mentionDropdown: 'absolute bg-surface-50 border border-surface-200 rounded-lg shadow-float max-h-[200px] overflow-y-auto z-[1000]',
  mentionOption: 'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
  mentionOptionHighlighted: 'bg-surface-100',
  notificationBell: 'relative cursor-pointer p-2',
  notificationBadge: 'absolute top-0 right-0 bg-danger-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[16px] text-center',
  notificationPanel: 'absolute top-full right-0 w-80 max-h-[400px] bg-surface-50 border border-surface-200 rounded-lg shadow-float overflow-y-auto z-[1000]',
  notificationHeader: 'flex justify-between items-center px-4 py-3 border-b border-surface-200',
  notificationItem: 'flex gap-3 px-4 py-3 border-b border-surface-100 cursor-pointer transition-colors',
  notificationUnread: 'bg-brand-50',
  notificationMessage: 'text-[13px] text-surface-800 leading-snug',
  notificationTime: 'text-[11px] text-surface-500 mt-1',
  emojiPicker: 'flex gap-1 p-2 bg-surface-50 border border-surface-200 rounded-lg shadow-elevated',
  emojiButton: 'text-base p-1 bg-transparent border-none cursor-pointer rounded transition-colors',
  emptyState: 'text-center p-8 text-surface-500',
  emptyIcon: 'text-5xl mb-4',
};

// ============================================================================
// Utility Functions
// ============================================================================

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return new Date(date).toLocaleDateString();
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const COMMON_REACTIONS = ['👍', '❤️', '😊', '🎉', '👀', '🤔'];

// ============================================================================
// Comment Input Component
// ============================================================================

interface CommentInputProps {
  questionId: string;
  parentId?: string;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  questionId,
  parentId,
  placeholder = 'Add a comment... Use @ to mention team members',
  onSubmit,
  autoFocus = false,
}) => {
  const { currentUser, teamMembers, addComment, saveDraft, getDraft, clearDraft } = useComments();
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft on mount
  useEffect(() => {
    const draft = getDraft(questionId, parentId);
    if (draft) {
      setContent(draft.content);
      setMentions(draft.mentions);
    }
  }, [questionId, parentId, getDraft]);

  // Auto-save draft
  useEffect(() => {
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    if (content.trim()) {
      draftSaveTimeoutRef.current = setTimeout(() => {
        saveDraft(questionId, content, mentions, parentId);
      }, 1000);
    }

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [content, mentions, questionId, parentId, saveDraft]);

  const filteredMembers = useMemo(() => {
    if (!mentionSearch) {
      return teamMembers;
    }
    const search = mentionSearch.toLowerCase();
    return teamMembers.filter(
      (m) => m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search),
    );
  }, [teamMembers, mentionSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setContent(value);
    setCursorPosition(position);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, position);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionSearch(atMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[mentionIndex]) {
          selectMention(filteredMembers[mentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectMention = (user: User) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = content.slice(cursorPosition);

    const mentionText = `@${user.name}`;
    const newContent = content.slice(0, atIndex) + mentionText + ' ' + textAfterCursor;

    const newMention: Mention = {
      userId: user.id,
      userName: user.name,
      startIndex: atIndex,
      endIndex: atIndex + mentionText.length,
    };

    setContent(newContent);
    setMentions((prev) => [...prev, newMention]);
    setShowMentions(false);
    setMentionSearch('');

    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newPosition = atIndex + mentionText.length + 1;
      textareaRef.current.setSelectionRange(newPosition, newPosition);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() || !currentUser) {
      return;
    }

    addComment(questionId, content.trim(), mentions, parentId);
    setContent('');
    setMentions([]);
    clearDraft(questionId, parentId);
    onSubmit?.();
  };

  if (!currentUser) {
    return (
      <div className={styles.emptyState}>
        <p>Please log in to add comments</p>
      </div>
    );
  }

  return (
    <div className={styles.inputContainer}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`${styles.textarea} ${isFocused ? styles.textareaFocused : ''}`}
          aria-label="Comment input"
        />

        {showMentions && filteredMembers.length > 0 && (
          <div className={`${styles.mentionDropdown} top-full left-0`}>
            {filteredMembers.map((member, index) => (
              <div
                key={member.id}
                className={`${styles.mentionOption} ${index === mentionIndex ? styles.mentionOptionHighlighted : ''}`}
                onClick={() => selectMention(member)}
                onMouseEnter={() => setMentionIndex(index)}
              >
                <div className={styles.avatar}>{getInitials(member.name)}</div>
                <div>
                  <div className="font-medium text-[13px]">{member.name}</div>
                  <div className="text-[11px] text-surface-500">{member.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.inputActions}>
        <span className={styles.mentionHint}>Press Ctrl+Enter to post • @ to mention</span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className={`${styles.submitButton} ${!content.trim() ? styles.submitButtonDisabled : ''}`}
        >
          {parentId ? 'Reply' : 'Comment'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Comment Display Component
// ============================================================================

interface CommentDisplayProps {
  comment: Comment;
  isReply?: boolean;
  isLast?: boolean;
  onReply?: () => void;
}

export const CommentDisplay: React.FC<CommentDisplayProps> = ({
  comment,
  isReply = false,
  isLast = false,
  onReply,
}) => {
  const { currentUser, editComment, deleteComment, addReaction, removeReaction, pinComment } =
    useComments();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isAuthor = currentUser?.id === comment.author.id;

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      editComment(comment.id, editContent.trim(), comment.mentions);
      setIsEditing(false);
    }
  };

  const handleReaction = (emoji: string) => {
    const hasReacted = comment.reactions.some(
      (r) => r.emoji === emoji && r.userId === currentUser?.id,
    );

    if (hasReacted) {
      removeReaction(comment.id, emoji);
    } else {
      addReaction(comment.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  // Group reactions by emoji
  const groupedReactions = useMemo(() => {
    const groups = new Map<string, Reaction[]>();
    comment.reactions.forEach((reaction) => {
      const existing = groups.get(reaction.emoji) || [];
      groups.set(reaction.emoji, [...existing, reaction]);
    });
    return groups;
  }, [comment.reactions]);

  // Render content with highlighted mentions
  const renderContent = (text: string) => {
    // Simple approach - highlight @Name patterns
    const parts = text.split(/(@\w+(?:\s+\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className={styles.mention}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`${styles.comment} ${isReply ? styles.reply : ''} ${isReply && isLast ? styles.replyLast : ''}`}
    >
      <div className={styles.commentMeta}>
        <div className={styles.avatar}>
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              style={{ width: '100%', height: '100%' }}
              className="rounded-full"
            />
          ) : (
            getInitials(comment.author.name)
          )}
        </div>
        <span className={styles.authorName}>{comment.author.name}</span>
        <span className={styles.timestamp}>{formatTimestamp(comment.createdAt)}</span>
        {comment.isEdited && <span className={styles.editedBadge}>(edited)</span>}
        {comment.isPinned && (
          <span className={styles.pinnedBadge}>
            <span aria-hidden="true">📌</span> Pinned
          </span>
        )}
        {comment.isResolved && (
          <span className={styles.resolvedBadge}>
            <span aria-hidden="true">✓</span> Resolved
          </span>
        )}
      </div>

      {isEditing ? (
        <div className={styles.inputContainer}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={styles.textarea}
            autoFocus
          />
          <div className={styles.inputActions}>
            <button className={styles.actionButton} onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button
              className={styles.submitButton}
              onClick={handleSaveEdit}
              disabled={!editContent.trim()}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.commentContent}>{renderContent(comment.content)}</div>
      )}

      {groupedReactions.size > 0 && (
        <div className={styles.reactions}>
          {Array.from(groupedReactions.entries()).map(([emoji, reactions]) => {
            const hasReacted = reactions.some((r) => r.userId === currentUser?.id);
            return (
              <button
                key={emoji}
                className={`${styles.reaction} ${hasReacted ? styles.reactionActive : ''}`}
                onClick={() => handleReaction(emoji)}
                title={reactions.map((r) => r.userName).join(', ')}
              >
                <span>{emoji}</span>
                <span className={styles.reactionCount}>{reactions.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.commentActions}>
        <div className="relative">
          <button className={styles.actionButton} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <span aria-hidden="true">😊</span> React
          </button>
          {showEmojiPicker && (
            <div className={`${styles.emojiPicker} absolute top-full left-0`}>
              {COMMON_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className={styles.emojiButton}
                  onClick={() => handleReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isReply && (
          <button className={styles.actionButton} onClick={onReply}>
            <span aria-hidden="true">💬</span> Reply
          </button>
        )}

        {isAuthor && (
          <>
            <button className={styles.actionButton} onClick={() => setIsEditing(true)}>
              <span aria-hidden="true">✏️</span> Edit
            </button>
            <button
              className={styles.actionButton}
              onClick={() => {
                if (window.confirm('Delete this comment?')) {
                  deleteComment(comment.id);
                }
              }}
            >
              <span aria-hidden="true">🗑️</span> Delete
            </button>
          </>
        )}

        {!isReply && (
          <button className={styles.actionButton} onClick={() => pinComment(comment.id)}>
            <span aria-hidden="true">📌</span> {comment.isPinned ? 'Unpin' : 'Pin'}
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Comment Thread Component
// ============================================================================

interface CommentThreadProps {
  thread: CommentThread;
}

export const CommentThreadDisplay: React.FC<CommentThreadProps> = ({ thread }) => {
  const { resolveThread } = useComments();
  const [isExpanded, setIsExpanded] = useState(thread.isExpanded);
  const [showReplyInput, setShowReplyInput] = useState(false);

  return (
    <div
      className={`${styles.thread} ${thread.rootComment.isResolved ? styles.threadResolved : ''} ${thread.rootComment.isPinned ? styles.threadPinned : ''}`}
    >
      <CommentDisplay comment={thread.rootComment} onReply={() => setShowReplyInput(true)} />

      {thread.replies.length > 0 && (
        <div className={styles.replies}>
          <button className={styles.actionButton} onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? '▼' : '▶'} {thread.replies.length} repl
            {thread.replies.length === 1 ? 'y' : 'ies'}
          </button>

          {isExpanded &&
            thread.replies.map((reply, index) => (
              <CommentDisplay
                key={reply.id}
                comment={reply}
                isReply
                isLast={index === thread.replies.length - 1}
              />
            ))}
        </div>
      )}

      {showReplyInput && (
        <div className="pb-4 px-4 ml-8">
          <CommentInput
            questionId={thread.questionId}
            parentId={thread.rootComment.id}
            placeholder="Write a reply..."
            onSubmit={() => setShowReplyInput(false)}
            autoFocus
          />
        </div>
      )}

      <div className="py-2 px-4 border-t border-surface-100">
        <button className={styles.actionButton} onClick={() => resolveThread(thread.id)}>
          {thread.rootComment.isResolved ? (
            <>
              <span aria-hidden="true">↩️</span> Reopen
            </>
          ) : (
            <>
              <span aria-hidden="true">✓</span> Resolve
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Question Comments Section
// ============================================================================

interface QuestionCommentsProps {
  questionId: string;
  questionTitle?: string;
}

export const QuestionComments: React.FC<QuestionCommentsProps> = ({
  questionId,
  questionTitle,
}) => {
  const { getThreadsForQuestion, getCommentCount } = useComments();
  const threads = getThreadsForQuestion(questionId);
  const count = getCommentCount(questionId);

  // Sort: pinned first, then resolved last, then by date
  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (a.rootComment.isPinned && !b.rootComment.isPinned) {
        return -1;
      }
      if (!a.rootComment.isPinned && b.rootComment.isPinned) {
        return 1;
      }
      if (a.rootComment.isResolved && !b.rootComment.isResolved) {
        return 1;
      }
      if (!a.rootComment.isResolved && b.rootComment.isResolved) {
        return -1;
      }
      return (
        new Date(b.rootComment.createdAt).getTime() - new Date(a.rootComment.createdAt).getTime()
      );
    });
  }, [threads]);

  return (
    <div className={styles.commentSection}>
      <div className={styles.commentHeader}>
        <h3 className={styles.commentTitle}>
          {questionTitle ? `Comments on: ${questionTitle}` : 'Comments'}
        </h3>
        <span className={styles.commentCount}>{count}</span>
      </div>

      <CommentInput questionId={questionId} />

      {sortedThreads.length > 0 ? (
        <div className="flex flex-col gap-3">
          {sortedThreads.map((thread) => (
            <CommentThreadDisplay key={thread.id} thread={thread} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            💬
          </div>
          <p>No comments yet. Be the first to start a discussion!</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Notification Bell Component
// ============================================================================

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } =
    useComments();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        className={styles.notificationBell}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.notificationPanel}>
          <div className={styles.notificationHeader}>
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.actionButton} onClick={markAllNotificationsRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length > 0 ? (
            notifications.slice(0, 20).map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notificationItem} ${!notification.isRead ? styles.notificationUnread : ''}`}
                onClick={() => markNotificationRead(notification.id)}
              >
                <div className={styles.avatar}>{getInitials(notification.fromUser.name)}</div>
                <div>
                  <div className={styles.notificationMessage}>{notification.message}</div>
                  <div className={styles.notificationTime}>
                    {formatTimestamp(notification.createdAt)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-surface-500">
              <p>No notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Comment Count Badge
// ============================================================================

interface CommentCountBadgeProps {
  questionId: string;
  onClick?: () => void;
}

export const CommentCountBadge: React.FC<CommentCountBadgeProps> = ({ questionId, onClick }) => {
  const { getCommentCount } = useComments();
  const count = getCommentCount(questionId);

  if (count === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 bg-brand-100 text-brand-600 border-none rounded-xl text-xs font-medium cursor-pointer"
      aria-label={`${count} comment${count !== 1 ? 's' : ''}`}
    >
      <span aria-hidden="true">💬</span> {count}
    </button>
  );
};

// ============================================================================
// Hook: useCommentNotifications
// ============================================================================

export const useCommentNotifications = () => {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } =
    useComments();

  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  const mentionNotifications = useMemo(() => {
    return notifications.filter((n) => n.type === 'mention');
  }, [notifications]);

  const replyNotifications = useMemo(() => {
    return notifications.filter((n) => n.type === 'reply');
  }, [notifications]);

  return {
    notifications,
    unreadNotifications,
    mentionNotifications,
    replyNotifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  };
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  CommentsProvider,
  useComments,
  QuestionComments,
  CommentInput,
  CommentDisplay,
  CommentThreadDisplay,
  NotificationBell,
  CommentCountBadge,
  useCommentNotifications,
};
