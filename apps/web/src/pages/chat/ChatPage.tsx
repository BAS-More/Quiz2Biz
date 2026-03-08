/**
 * ChatPage - Quiz2Biz conversational interface
 * Chat-first approach: users describe their business through conversation
 * AI extracts facts and benchmarks against quality dimensions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Bot, User, AlertCircle, Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui';
import chatApi, { type ChatMessage, type ChatStatus } from '../../api/chat';
import { clsx } from 'clsx';

/** Message bubble component */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  
  return (
    <div
      className={clsx(
        'flex gap-3 animate-slide-up',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isUser
            ? 'bg-brand-100 text-brand-600'
            : 'bg-gradient-to-br from-accent-500 to-brand-500 text-white',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      
      {/* Message content */}
      <div
        className={clsx(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-md'
            : 'bg-surface-100 text-surface-900 rounded-tl-md',
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={clsx(
            'text-xs mt-1.5',
            isUser ? 'text-brand-200' : 'text-surface-400',
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

/** Typing indicator */
function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-brand-500 text-white flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-surface-100 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

/** Streaming message component */
function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-brand-500 text-white flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-surface-100 rounded-2xl rounded-tl-md px-4 py-3 max-w-[75%]">
        <p className="text-sm text-surface-900 whitespace-pre-wrap">
          {content}
          <span className="inline-block w-1 h-4 bg-brand-500 ml-0.5 animate-pulse" />
        </p>
      </div>
    </div>
  );
}

export function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);
  
  // Load chat history
  useEffect(() => {
    if (!projectId) return;
    
    const loadChat = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await chatApi.getChatHistory(projectId);
        setMessages(data.messages);
        setStatus(data.status);
      } catch (err) {
        console.error('Failed to load chat:', err);
        setError('Failed to load chat history. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChat();
  }, [projectId]);
  
  // Handle sending message with streaming
  const handleSend = useCallback(async () => {
    if (!projectId || !input.trim() || isSending || status?.isLimitReached) return;
    
    const content = input.trim();
    setInput('');
    setIsSending(true);
    setError(null);
    setStreamingContent('');
    
    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      projectId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    try {
      // Use streaming
      let fullContent = '';
      
      for await (const chunk of chatApi.streamMessageGenerator(projectId, content)) {
        if (chunk.type === 'chunk' && chunk.content) {
          fullContent += chunk.content;
          setStreamingContent(fullContent);
        } else if (chunk.type === 'done') {
          // Add the complete assistant message
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            projectId,
            role: 'assistant',
            content: fullContent,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent('');
          
          // Update status
          const newStatus = await chatApi.getChatStatus(projectId);
          setStatus(newStatus);
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Streaming error');
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Remove optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(content); // Restore input
    } finally {
      setIsSending(false);
      setStreamingContent('');
      inputRef.current?.focus();
    }
  }, [projectId, input, isSending, status?.isLimitReached]);
  
  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };
  
  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
          <p className="text-surface-900 font-medium">No project selected</p>
          <p className="text-sm text-surface-500 mt-1">Please select a project to start chatting</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workspace')}
            className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
            aria-label="Back to workspace"
          >
            <ArrowLeft className="h-5 w-5 text-surface-500" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-surface-900">Project Chat</h1>
              <p className="text-xs text-surface-500">
                {status ? `${status.remainingMessages} messages remaining` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
        
        {status && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-surface-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  status.remainingMessages > 20 ? 'bg-success-500' :
                  status.remainingMessages > 10 ? 'bg-warning-500' : 'bg-danger-500',
                )}
                style={{ width: `${(status.remainingMessages / status.messageLimit) * 100}%` }}
              />
            </div>
            <span className="text-xs text-surface-500">
              {status.messageCount}/{status.messageLimit}
            </span>
          </div>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-brand-600" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900">Start the conversation</h2>
            <p className="text-sm text-surface-500 mt-2 max-w-md">
              Tell me about your business idea. I&apos;ll ask follow-up questions to understand 
              your vision and help you build comprehensive documentation.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {['Tell me about your business', 'I have a startup idea', 'Help me with my business plan'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 bg-surface-100 rounded-full text-sm text-surface-600 hover:bg-surface-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {streamingContent && <StreamingMessage content={streamingContent} />}
            {isSending && !streamingContent && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-danger-600 hover:text-danger-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Input area */}
      <div className="pt-4 border-t border-surface-100">
        {status?.isLimitReached ? (
          <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 text-center">
            <p className="text-sm text-warning-700 font-medium">Message limit reached</p>
            <p className="text-xs text-warning-600 mt-1">
              You&apos;ve used all {status.messageLimit} messages for this project.
              Review your extracted facts and proceed to document generation.
            </p>
            <button
              onClick={() => navigate(`/project/${projectId}/documents`)}
              className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              View Documents
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                disabled={isSending}
                className={clsx(
                  'w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl',
                  'resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                  'text-sm text-surface-900 placeholder:text-surface-400',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className={clsx(
                'p-3 rounded-xl transition-all',
                input.trim() && !isSending
                  ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-xs hover:shadow-elevated'
                  : 'bg-surface-100 text-surface-400 cursor-not-allowed',
              )}
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
