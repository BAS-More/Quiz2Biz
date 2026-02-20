/**
 * Document API client
 * Handles document type listing, generation requests, and downloads
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1';

export interface DocumentType {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  outputFormats: string[];
  estimatedPages: number;
  isActive: boolean;
}

export interface DocumentResponse {
  id: string;
  fileName?: string;
  status: string;
  format?: string;
  downloadUrl?: string;
  documentType?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
}

export async function listDocumentTypes(): Promise<DocumentType[]> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/types`);
  return data.data ?? data.items ?? data;
}

export async function getSessionDocumentTypes(sessionId: string): Promise<DocumentType[]> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/session/${sessionId}/types`);
  return data.data ?? data.items ?? data;
}

export async function requestDocumentGeneration(
  sessionId: string,
  documentTypeId: string,
  format: 'DOCX' | 'PDF' = 'DOCX',
): Promise<DocumentResponse> {
  const { data } = await apiClient.post(`${API_PREFIX}/documents/generate`, {
    sessionId,
    documentTypeId,
    format,
  });
  return data.data ?? data;
}

export async function getSessionDocuments(sessionId: string): Promise<DocumentResponse[]> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/session/${sessionId}`);
  return data.data ?? data.items ?? data;
}

export async function downloadDocument(documentId: string): Promise<Blob> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  return data;
}
