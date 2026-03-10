/**
 * Project API client for Quiz2Biz
 * Handles project management and quality scores
 */

import { apiClient } from './client';

// Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  messageCount: number;
  qualityScore?: number;
  projectTypeId?: string;
  projectTypeName?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  projectTypeSlug: string;
}

export interface ProjectQualityScore {
  projectId: string;
  overallScore: number;
  completenessScore: number;
  confidenceScore: number;
  recommendations: string[];
  scoredAt: string;
}

/**
 * Get all projects for current user
 */
export async function getProjects(page = 1, limit = 20): Promise<ProjectListResponse> {
  const response = await apiClient.get<ProjectListResponse>('/api/v1/projects', {
    params: { page, limit },
  });
  return response.data;
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/api/v1/projects/${projectId}`);
  return response.data;
}

/**
 * Create a new project
 */
export async function createProject(request: CreateProjectRequest): Promise<Project> {
  const response = await apiClient.post<Project>('/api/v1/projects', request);
  return response.data;
}

/**
 * Get quality score for a project
 */
export async function getProjectQualityScore(projectId: string): Promise<ProjectQualityScore> {
  const response = await apiClient.get<ProjectQualityScore>(`/api/v1/quality/${projectId}/score`);
  return response.data;
}

/**
 * Archive a project
 */
export async function archiveProject(projectId: string): Promise<void> {
  await apiClient.patch(`/api/v1/projects/${projectId}`, { status: 'ARCHIVED' });
}

const projectApi = {
  getProjects,
  getProject,
  createProject,
  getProjectQualityScore,
  archiveProject,
};

export default projectApi;
