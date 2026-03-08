/**
 * Chat API client for Quiz2Biz conversational interface
 * Handles chat messages, SSE streaming, and chat status
 */

import { apiClient } from './client';

// Types
export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  createdAt: string;
}

export interface ChatStatus {
  projectId: string;
  messageCount: number;
  messageLimit: number;
  remainingMessages: number;
  isLimitReached: boolean;
  lastMessageAt?: string;
}

export interface SendMessageRequest {
  content: string;
  provider?: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  status: ChatStatus;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  status: ChatStatus;
}

/**
 * Get chat status for a project (message count, limit, etc.)
 */
export async function getChatStatus(projectId: string): Promise<ChatStatus> {
  const response = await apiClient.get<ChatStatus>(`/api/v1/chat/${projectId}/status`);
  return response.data;
}

/**
 * Get chat history for a project
 */
export async function getChatHistory(projectId: string): Promise<ChatHistoryResponse> {
  const response = await apiClient.get<ChatHistoryResponse>(`/api/v1/chat/${projectId}`);
  return response.data;
}

/**
 * Send a chat message (non-streaming)
 */
export async function sendMessage(
  projectId: string,
  request: SendMessageRequest,
): Promise<SendMessageResponse> {
  const response = await apiClient.post<SendMessageResponse>(
    `/api/v1/chat/${projectId}/message`,
    request,
  );
  return response.data;
}

/**
 * SSE streaming chat message
 * Returns an EventSource that emits chunks
 */
export function streamMessage(
  projectId: string,
  content: string,
  provider?: string,
): EventSource {
  const params = new URLSearchParams({ content });
  if (provider) {
    params.append('provider', provider);
  }
  
  // Get the base URL from the API client
  const baseUrl = apiClient.defaults.baseURL || '';
  const url = `${baseUrl}/api/v1/chat/${projectId}/stream?${params.toString()}`;
  
  // Create EventSource with credentials
  const eventSource = new EventSource(url, { withCredentials: true });
  
  return eventSource;
}

/**
 * SSE streaming helper that returns an async generator
 * More convenient for React components
 */
export async function* streamMessageGenerator(
  projectId: string,
  content: string,
  provider?: string,
): AsyncGenerator<{ type: string; content?: string; done?: boolean; error?: string }> {
  const eventSource = streamMessage(projectId, content, provider);
  
  const queue: Array<{ type: string; content?: string; done?: boolean; error?: string }> = [];
  let resolveNext: (() => void) | null = null;
  let isDone = false;
  let error: Error | null = null;
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      queue.push(data);
      if (data.type === 'done' || data.type === 'error') {
        isDone = true;
        eventSource.close();
      }
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error('Parse error');
      isDone = true;
      eventSource.close();
    }
  };
  
  eventSource.onerror = () => {
    if (!isDone) {
      error = new Error('SSE connection error');
      isDone = true;
      eventSource.close();
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    }
  };
  
  while (!isDone || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift()!;
    } else if (!isDone) {
      await new Promise<void>((resolve) => {
        resolveNext = resolve;
      });
    }
  }
  
  if (error) {
    throw error;
  }
}

const chatApi = {
  getChatStatus,
  getChatHistory,
  sendMessage,
  streamMessage,
  streamMessageGenerator,
};

export default chatApi;
