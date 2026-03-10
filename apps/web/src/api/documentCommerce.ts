/**
 * Document Commerce API client
 * Handles document pricing and purchasing
 */

import { apiClient } from './client';

// Types
export interface PriceCalculation {
  projectId: string;
  documentTypeSlug: string;
  documentTypeName: string;
  basePrice: number;
  qualityLevel: number;
  qualityMultiplier: number;
  finalPrice: number;
  currency: string;
  estimatedPages: number;
  features: string[];
}

export interface AvailableDocument {
  slug: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  currency: string;
  estimatedPagesBase: number;
  requiredFactCount: number;
  currentFactCount: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface DocumentPurchaseStatus {
  purchaseId: string;
  projectId: string;
  documentTypeSlug: string;
  documentTypeName: string;
  qualityLevel: number;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  documentId?: string;
  generatedAt?: string;
  downloadUrl?: string;
}

export interface ProjectDocuments {
  projectId: string;
  projectName: string;
  qualityScore: number;
  availableDocuments: AvailableDocument[];
  purchasedDocuments: DocumentPurchaseStatus[];
}

export interface PurchaseResponse {
  purchaseId: string;
  projectId: string;
  documentTypeSlug: string;
  qualityLevel: number;
  amount: number;
  currency: string;
  clientSecret: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/** Quality level names */
export const QUALITY_LEVELS = [
  { level: 0, name: 'Basic', description: 'Essential content, ~5-10 pages' },
  { level: 1, name: 'Standard', description: 'Expanded content with citations, ~10-15 pages' },
  { level: 2, name: 'Enhanced', description: 'Comprehensive with charts, ~15-25 pages' },
  { level: 3, name: 'Premium', description: 'Executive-ready with SWOT, ~25-40 pages' },
  { level: 4, name: 'Enterprise', description: 'Board-ready with appendices, ~40-60 pages' },
];

/**
 * Calculate price for a document
 */
export async function calculatePrice(
  projectId: string,
  documentTypeSlug: string,
  qualityLevel: number,
): Promise<PriceCalculation> {
  const response = await apiClient.post<PriceCalculation>('/api/v1/documents/price', {
    projectId,
    documentTypeSlug,
    qualityLevel,
  });
  return response.data;
}

/**
 * Get all documents available for a project
 */
export async function getProjectDocuments(projectId: string): Promise<ProjectDocuments> {
  const response = await apiClient.get<ProjectDocuments>(`/api/v1/documents/project/${projectId}`);
  return response.data;
}

/**
 * Create a new document purchase
 */
export async function createPurchase(
  projectId: string,
  documentTypeSlug: string,
  qualityLevel: number,
): Promise<PurchaseResponse> {
  const response = await apiClient.post<PurchaseResponse>('/api/v1/documents/purchase', {
    projectId,
    documentTypeSlug,
    qualityLevel,
  });
  return response.data;
}

/**
 * Get purchase status
 */
export async function getPurchaseStatus(purchaseId: string): Promise<DocumentPurchaseStatus> {
  const response = await apiClient.get<DocumentPurchaseStatus>(
    `/api/v1/documents/purchase/${purchaseId}`,
  );
  return response.data;
}

/**
 * Get all purchases for current user
 */
export async function getUserPurchases(): Promise<DocumentPurchaseStatus[]> {
  const response = await apiClient.get<DocumentPurchaseStatus[]>('/api/v1/documents/purchases');
  return response.data;
}

const documentCommerceApi = {
  calculatePrice,
  getProjectDocuments,
  createPurchase,
  getPurchaseStatus,
  getUserPurchases,
  QUALITY_LEVELS,
};

export default documentCommerceApi;
