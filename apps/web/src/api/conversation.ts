/**
 * Conversation API client
 * Handles AI follow-up questions and conversation history
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  questionId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FollowUpResult {
  shouldFollowUp: boolean;
  followUpQuestion?: string;
  completenessScore: number;
  missingAreas: string[];
}

export interface AnswerWithFollowUpResult {
  followUp: FollowUpResult;
  conversationMessages: ConversationMessage[];
}

/**
 * Submit an answer with AI evaluation for follow-up.
 */
export async function submitAnswerWithAi(
  sessionId: string,
  questionId: string,
  questionText: string,
  answerText: string,
  dimensionContext: string,
): Promise<AnswerWithFollowUpResult> {
  const { data } = await apiClient.post(`${API_PREFIX}/sessions/${sessionId}/conversation/answer`, {
    questionId,
    questionText,
    answerText,
    dimensionContext,
  });
  return data.data ?? data;
}

/**
 * Submit a follow-up answer.
 */
export async function submitFollowUp(
  sessionId: string,
  questionId: string,
  content: string,
): Promise<ConversationMessage> {
  const { data } = await apiClient.post(
    `${API_PREFIX}/sessions/${sessionId}/conversation/follow-up`,
    { questionId, content },
  );
  return data.data ?? data;
}

/**
 * Get the full conversation for a session.
 */
export async function getSessionConversation(sessionId: string): Promise<ConversationMessage[]> {
  const { data } = await apiClient.get(`${API_PREFIX}/sessions/${sessionId}/conversation`);
  return data.data ?? data;
}

/**
 * Get conversation for a specific question.
 */
export async function getQuestionConversation(
  sessionId: string,
  questionId: string,
): Promise<ConversationMessage[]> {
  const { data } = await apiClient.get(
    `${API_PREFIX}/sessions/${sessionId}/conversation/question/${questionId}`,
  );
  return data.data ?? data;
}
