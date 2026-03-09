/**
 * Admin API client
 * Handles admin-only operations for document review, user management, etc.
 */

import { apiClient } from './client';

const API_PREFIX = '/api/v1/admin';

// Document Review Types
export interface PendingReviewDocument {
  id: string;
  sessionId: string;
  fileName: string;
  format: 'pdf' | 'docx';
  status: 'PENDING_REVIEW';
  version: number;
  createdAt: string;
  updatedAt: string;
  fileSize?: number;
  documentType: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    category: string;
  };
  session?: {
    id: string;
    projectName?: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface ReviewDocumentResponse {
  id: string;
  sessionId: string;
  fileName: string;
  format: string;
  status: string;
  version: number;
  reviewStatus?: {
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface ApproveDocumentRequest {
  notes?: string;
}

export interface RejectDocumentRequest {
  reason: string;
}

/**
 * Get all documents pending review
 */
export async function getPendingReviewDocuments(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<PendingReviewDocument>> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/pending-review`, {
    params: { page, perPage },
  });
  return data;
}

/**
 * Get a single document for review
 */
export async function getDocumentForReview(
  documentId: string
): Promise<PendingReviewDocument> {
  const { data } = await apiClient.get(`${API_PREFIX}/documents/${documentId}`);
  return data;
}

/**
 * Approve a document
 */
export async function approveDocument(
  documentId: string,
  request?: ApproveDocumentRequest
): Promise<ReviewDocumentResponse> {
  const { data } = await apiClient.patch(
    `${API_PREFIX}/documents/${documentId}/approve`,
    request || {}
  );
  return data;
}

/**
 * Reject a document with reason
 */
export async function rejectDocument(
  documentId: string,
  request: RejectDocumentRequest
): Promise<ReviewDocumentResponse> {
  const { data } = await apiClient.patch(
    `${API_PREFIX}/documents/${documentId}/reject`,
    request
  );
  return data;
}

/**
 * Get document preview URL
 */
export async function getDocumentPreviewUrl(documentId: string): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>(
    `${API_PREFIX}/documents/${documentId}/preview`
  );
  return data.url;
}

/**
 * Get document download URL
 */
export async function downloadDocumentForReview(documentId: string): Promise<Blob> {
  const { data } = await apiClient.get(
    `${API_PREFIX}/documents/${documentId}/download`,
    { responseType: 'blob' }
  );
  return data;
}
