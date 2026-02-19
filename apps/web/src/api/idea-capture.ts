/**
 * Idea Capture API client
 * Handles idea submission, AI analysis, project type confirmation, and session creation
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1';

// --- Types ---

export interface ProjectTypeRecommendation {
  slug: string;
  name: string;
  confidence: number;
  reasoning: string;
}

export interface IdeaAnalysis {
  themes: string[];
  gaps: string[];
  strengths: string[];
  recommendedProjectType: ProjectTypeRecommendation;
  alternativeProjectTypes?: ProjectTypeRecommendation[];
  summary: string;
}

export interface IdeaCaptureResponse {
  id: string;
  title?: string;
  rawInput: string;
  analysis: IdeaAnalysis;
  status: string;
  projectTypeId?: string;
  createdAt: string;
}

export interface ProjectType {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  isDefault: boolean;
  metadata: Record<string, unknown>;
}

// --- API calls ---

export async function submitIdea(rawInput: string, title?: string): Promise<IdeaCaptureResponse> {
  const { data } = await apiClient.post(`${API_PREFIX}/sessions/idea`, {
    rawInput,
    title: title || undefined,
  });
  return data.data ?? data;
}

export async function getIdea(id: string): Promise<IdeaCaptureResponse> {
  const { data } = await apiClient.get(`${API_PREFIX}/sessions/idea/${id}`);
  return data.data ?? data;
}

export async function confirmProjectType(
  ideaId: string,
  projectTypeId: string,
): Promise<IdeaCaptureResponse> {
  const { data } = await apiClient.patch(`${API_PREFIX}/sessions/idea/${ideaId}/confirm`, {
    projectTypeId,
  });
  return data.data ?? data;
}

export async function createSessionFromIdea(ideaId: string): Promise<{ sessionId: string }> {
  const { data } = await apiClient.post(`${API_PREFIX}/sessions/idea/${ideaId}/session`);
  return data.data ?? data;
}

export async function listProjectTypes(): Promise<ProjectType[]> {
  const { data } = await apiClient.get(`${API_PREFIX}/project-types`);
  return data.data ?? data.items ?? data;
}
