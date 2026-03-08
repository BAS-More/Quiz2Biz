/**
 * Facts API client
 * Handles extracted fact management for projects
 */

import { apiClient } from './client';

// Types
export interface ExtractedFact {
  id: string;
  projectId: string;
  fieldName: string;
  fieldValue: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  sourceMessageId?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FactsResponse {
  projectId: string;
  projectName: string;
  facts: ExtractedFact[];
  factsByCategory: Record<string, ExtractedFact[]>;
  totalFacts: number;
  verifiedCount: number;
  highConfidenceCount: number;
}

export interface UpdateFactRequest {
  fieldValue?: string;
  isVerified?: boolean;
}

/**
 * Get all facts for a project
 */
export async function getProjectFacts(projectId: string): Promise<FactsResponse> {
  const response = await apiClient.get<FactsResponse>(`/api/v1/facts/${projectId}`);
  return response.data;
}

/**
 * Update a fact
 */
export async function updateFact(
  factId: string,
  updates: UpdateFactRequest,
): Promise<ExtractedFact> {
  const response = await apiClient.patch<ExtractedFact>(`/api/v1/facts/${factId}`, updates);
  return response.data;
}

/**
 * Delete a fact
 */
export async function deleteFact(factId: string): Promise<void> {
  await apiClient.delete(`/api/v1/facts/${factId}`);
}

/**
 * Verify all facts for a project
 */
export async function verifyAllFacts(projectId: string): Promise<void> {
  await apiClient.post(`/api/v1/facts/${projectId}/verify-all`);
}

const factsApi = {
  getProjectFacts,
  updateFact,
  deleteFact,
  verifyAllFacts,
};

export default factsApi;
