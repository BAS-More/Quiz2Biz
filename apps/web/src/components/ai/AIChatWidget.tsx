/**
 * AI Chat Widget Component
 * Sprint 34: AI Help Assistant
 *
 * Nielsen Heuristic: Help and Documentation
 * - Contextual AI assistance
 * - Bottom-right floating widget
 * - Chat history with streaming responses
 */

import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
}

export interface PageContext {
  page: string;
  section?: string;
  questionId?: string;
  questionText?: string;
  dimensionId?: string;
  dimensionName?: string;
  userRole?: string;
  sessionProgress?: number;
  currentScore?: number;
}

export interface AIChatConfig {
  apiEndpoint: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIChatContextValue {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  pageContext: PageContext | null;
  config: AIChatConfig;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  setPageContext: (context: PageContext) => void;
  updateConfig: (config: Partial<AIChatConfig>) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AIChatConfig = {
  apiEndpoint: '/api/ai/chat',
  model: 'gpt-4',
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: `You are Quiz2Biz AI Assistant, a helpful expert on business readiness assessments, compliance frameworks, and questionnaire completion.

Your role is to:
1. Help users understand questions and provide guidance on answers
2. Explain compliance concepts (ISO 27001, NIST CSF, OWASP)
3. Provide best practice recommendations
4. Clarify terminology and scoring methods
5. Guide users through the platform

Be concise, professional, and actionable. When discussing specific questions, provide context-relevant suggestions. Always maintain a helpful and encouraging tone.`,
};

// ============================================================================
// Context
// ============================================================================

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function useAIChat(): AIChatContextValue {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

export interface AIChatProviderProps {
  children: React.ReactNode;
  config?: Partial<AIChatConfig>;
}

export const AIChatProvider: React.FC<AIChatProviderProps> = ({
  children,
  config: initialConfig,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [config, setConfig] = useState<AIChatConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  const updateConfig = useCallback((updates: Partial<AIChatConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const buildContextMessage = useCallback((): string => {
    if (!pageContext) {
      return '';
    }

    const parts: string[] = ['[Context]'];
    parts.push(`Page: ${pageContext.page}`);

    if (pageContext.section) {
      parts.push(`Section: ${pageContext.section}`);
    }
    if (pageContext.dimensionName) {
      parts.push(`Dimension: ${pageContext.dimensionName}`);
    }
    if (pageContext.questionText) {
      parts.push(`Current Question: "${pageContext.questionText}"`);
    }
    if (pageContext.userRole) {
      parts.push(`User Role: ${pageContext.userRole}`);
    }
    if (pageContext.sessionProgress !== undefined) {
      parts.push(`Progress: ${Math.round(pageContext.sessionProgress * 100)}%`);
    }
    if (pageContext.currentScore !== undefined) {
      parts.push(`Current Score: ${pageContext.currentScore.toFixed(1)}/100`);
    }

    return parts.join('\n');
  }, [pageContext]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) {
        return;
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      try {
        // Build messages array for API
        const contextMessage = buildContextMessage();
        const apiMessages = [
          { role: 'system', content: config.systemPrompt || DEFAULT_CONFIG.systemPrompt },
          ...(contextMessage ? [{ role: 'system', content: contextMessage }] : []),
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
          { role: 'user', content: content.trim() },
        ];

        const response = await fetch(config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            messages: apiMessages,
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  fullContent += content;

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: fullContent } : m,
                    ),
                  );
                } catch {
                  // Non-JSON line, might be plain text
                  fullContent += data;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: fullContent } : m,
                    ),
                  );
                }
              }
            }
          }
        }

        // Finalize message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content:
                    fullContent ||
                    'I apologize, but I could not generate a response. Please try again.',
                  isStreaming: false,
                }
              : m,
          ),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: 'I apologize, but I encountered an error. Please try again.',
                  isStreaming: false,
                  error: errorMessage,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, config, buildContextMessage],
  );

  const value: AIChatContextValue = {
    isOpen,
    messages,
    isLoading,
    pageContext,
    config,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    clearHistory,
    setPageContext,
    updateConfig,
  };

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
};

// ============================================================================
// Chat Message Component
// ============================================================================

export interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        ...styles.messageWrapper,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          ...styles.messageBubble,
          ...(isUser ? styles.userBubble : styles.assistantBubble),
        }}
      >
        {!isUser && (
          <div style={styles.messageHeader}>
            <span style={styles.avatarIcon} aria-hidden="true">
              🤖
            </span>
            <span style={styles.assistantLabel}>Quiz2Biz AI</span>
          </div>
        )}
        <div style={styles.messageContent}>
          {message.content || (message.isStreaming && '...')}
          {message.isStreaming && <span style={styles.cursor}>▌</span>}
        </div>
        {message.error && (
          <div style={styles.errorBadge}>
            <span aria-hidden="true">⚠️</span> Error: {message.error}
          </div>
        )}
        <div style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Chat Input Component
// ============================================================================

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask a question...',
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div style={styles.inputContainer}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={styles.input}
        aria-label="Chat message input"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        style={{
          ...styles.sendButton,
          opacity: disabled || !value.trim() ? 0.5 : 1,
        }}
        aria-label="Send message"
      >
        <span aria-hidden="true">➤</span>
      </button>
    </div>
  );
};

// ============================================================================
// Quick Actions Component
// ============================================================================

export interface QuickAction {
  label: string;
  prompt: string;
  icon?: string;
}

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Explain this question',
    prompt: 'Can you explain the current question in simpler terms?',
    icon: '❓',
  },
  {
    label: 'Best practices',
    prompt: 'What are the best practices for answering this?',
    icon: '✨',
  },
  {
    label: 'Example answer',
    prompt: 'Can you provide an example answer for this question?',
    icon: '📝',
  },
  {
    label: 'Why is this important?',
    prompt: 'Why is this question important for compliance?',
    icon: '🎯',
  },
];

export interface QuickActionsProps {
  actions?: QuickAction[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions = DEFAULT_QUICK_ACTIONS,
  onSelect,
  disabled = false,
}) => (
  <div style={styles.quickActions}>
    <span style={styles.quickActionsLabel}>Quick questions:</span>
    <div style={styles.quickActionsGrid}>
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(action.prompt)}
          disabled={disabled}
          style={styles.quickActionButton}
          title={action.prompt}
        >
          {action.icon && <span aria-hidden="true">{action.icon}</span>}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  </div>
);

// ============================================================================
// Chat Widget Component
// ============================================================================

export interface AIChatWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left';
  quickActions?: QuickAction[];
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({
  className = '',
  position = 'bottom-right',
  quickActions = DEFAULT_QUICK_ACTIONS,
}) => {
  const {
    isOpen,
    messages,
    isLoading,
    openChat,
    closeChat,
    sendMessage,
    clearHistory,
    pageContext,
  } = useAIChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const positionStyles =
    position === 'bottom-right' ? { right: '24px', left: 'auto' } : { left: '24px', right: 'auto' };

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={openChat}
          style={{ ...styles.toggleButton, ...positionStyles }}
          className={className}
          aria-label="Open AI Chat Assistant"
          aria-expanded={isOpen}
        >
          <span style={styles.toggleIcon} aria-hidden="true">
            💬
          </span>
          <span style={styles.toggleLabel}>AI Help</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{ ...styles.chatWindow, ...positionStyles }}
          role="dialog"
          aria-label="AI Chat Assistant"
          aria-modal="false"
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <span style={styles.headerIcon} aria-hidden="true">
                🤖
              </span>
              <div>
                <div style={styles.headerText}>Quiz2Biz AI</div>
                <div style={styles.headerSubtext}>
                  {pageContext?.page ? `On: ${pageContext.page}` : 'How can I help?'}
                </div>
              </div>
            </div>
            <div style={styles.headerActions}>
              <button
                onClick={clearHistory}
                style={styles.headerButton}
                aria-label="Clear chat history"
                title="Clear history"
              >
                <span aria-hidden="true">🗑️</span>
              </button>
              <button onClick={closeChat} style={styles.headerButton} aria-label="Close chat">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div style={styles.welcomeMessage}>
                <div style={styles.welcomeIcon} aria-hidden="true">
                  👋
                </div>
                <div style={styles.welcomeTitle}>Hello!</div>
                <div style={styles.welcomeText}>
                  I'm your AI assistant. Ask me anything about the questionnaire, compliance
                  frameworks, or how to improve your scores.
                </div>
              </div>
            ) : (
              messages.map((message) => <ChatMessageItem key={message.id} message={message} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 0 && (
            <QuickActions actions={quickActions} onSelect={sendMessage} disabled={isLoading} />
          )}

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            placeholder={isLoading ? 'AI is thinking...' : 'Ask a question...'}
          />
        </div>
      )}
    </>
  );
};

// ============================================================================
// Context Update Hook
// ============================================================================

export function useUpdateAIContext(context: PageContext) {
  const { setPageContext } = useAIChat();

  useEffect(() => {
    setPageContext(context);
  }, [context, setPageContext]);
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  // Toggle Button
  toggleButton: {
    position: 'fixed',
    bottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    zIndex: 9998,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
  },
  toggleIcon: {
    fontSize: '20px',
  },
  toggleLabel: {
    fontSize: '14px',
    fontWeight: 600,
  },

  // Chat Window
  chatWindow: {
    position: 'fixed',
    bottom: '24px',
    width: '380px',
    height: '560px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    color: '#FFFFFF',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  headerText: {
    fontSize: '16px',
    fontWeight: 600,
  },
  headerSubtext: {
    fontSize: '12px',
    opacity: 0.9,
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  headerButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.15s ease',
  },

  // Messages
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageWrapper: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  userBubble: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    backgroundColor: '#F3F4F6',
    color: '#111827',
    borderBottomLeftRadius: '4px',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  avatarIcon: {
    fontSize: '14px',
  },
  assistantLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  messageContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  cursor: {
    animation: 'blink 1s step-end infinite',
    marginLeft: '2px',
  },
  timestamp: {
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '6px',
    textAlign: 'right',
  },
  errorBadge: {
    marginTop: '8px',
    padding: '6px 8px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    borderRadius: '6px',
    fontSize: '11px',
  },

  // Welcome
  welcomeMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    textAlign: 'center',
    flex: 1,
  },
  welcomeIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  welcomeTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
  },
  welcomeText: {
    fontSize: '14px',
    color: '#6B7280',
    lineHeight: 1.6,
  },

  // Quick Actions
  quickActions: {
    padding: '12px 16px',
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  quickActionsLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#6B7280',
    marginBottom: '8px',
    display: 'block',
  },
  quickActionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  quickActionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    fontSize: '12px',
    color: '#374151',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },

  // Input
  inputContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.4,
    maxHeight: '120px',
  },
  sendButton: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'opacity 0.15s ease',
    flexShrink: 0,
  },
};

// ============================================================================
// Export
// ============================================================================

export default AIChatWidget;
