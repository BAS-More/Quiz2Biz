/**
 * Document API client
 * Handles document type listing, generation requests, and downloads
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1';

/** Extended timeout for long-running operations (2 minutes) */
const LONG_TIMEOUT = 120_000;

export interface DocumentType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  outputFormats: string[];
  estimatedPages: number | null;
  isActive: boolean;
}

export interface DocumentResponse {
  id: string;
  sessionId: string;
  documentTypeId: string;
  status: string;
  format: string;
  fileName?: string;
  fileSize?: string;
  version: number;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
  documentType?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    category: string;
    outputFormats: string[];
    estimatedPages?: number | null;
    isActive: boolean;
  };
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
  const { data } = await apiClient.post(
    `${API_PREFIX}/documents/generate`,
    { sessionId, documentTypeId, format },
    { timeout: LONG_TIMEOUT },
  );
  return data.data ?? data;
}

export async function getSessionDocuments(sessionId: string): Promise<DocumentResponse[]> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/session/${sessionId}`);
  return data.data ?? data.items ?? data;
}

export async function downloadDocument(documentId: string): Promise<Blob> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/${documentId}/download`, {
    responseType: 'blob',
    timeout: LONG_TIMEOUT,
  });
  return data;
}

export async function bulkDownloadSession(sessionId: string): Promise<Blob> {
  const { data } = await apiClient.get(
    `${API_PREFIX}/documents/session/${sessionId}/bulk-download`,
    {
      responseType: 'blob',
      timeout: LONG_TIMEOUT,
    },
  );
  return data;
}

export async function bulkDownloadSelected(documentIds: string[]): Promise<Blob> {
  const { data } = await apiClient.post(
    `${API_PREFIX}/documents/bulk-download`,
    { documentIds },
    { responseType: 'blob', timeout: LONG_TIMEOUT },
  );
  return data;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  status: string;
  format: string;
  fileName?: string;
  fileSize?: number;
  generatedAt?: string;
  createdAt: string;
  downloadUrl?: string;
  changeDescription?: string;
  metadata?: {
    generatedBy?: string;
    aiModel?: string;
    templateVersion?: string;
  };
}

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/${documentId}/versions`);
  return data.data ?? data.items ?? data;
}

export async function downloadDocumentVersion(documentId: string, version: number): Promise<Blob> {
  const { data } = await apiClient.get(
    `${API_PREFIX}/documents/${documentId}/versions/${version}/download`,
    { responseType: 'blob' },
  );
  return data;
}
