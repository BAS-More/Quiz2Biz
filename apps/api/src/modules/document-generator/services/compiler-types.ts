/**
 * Types, interfaces, and constants for the Deliverables Compiler.
 */

import type { Decimal } from '@prisma/client/runtime/library';

// Maximum words per section before auto-splitting
export const MAX_WORDS_PER_SECTION = 1000;

// === Builder input types (replace `any` with explicit shapes) ===

/** Minimal session shape used by section builders */
export interface CompilerSession {
  id: string;
  userId: string;
  status: string;
  industry?: string | null;
  questionnaireVersion: number;
  readinessScore?: Decimal | number | null;
  questionnaire?: { name: string; version?: number } | null;
}

/** Question dimension (key used for filtering responses by domain) */
export interface CompilerDimension {
  key: string;
  name?: string;
}

/** Question shape as seen through the Response→Question include */
export interface CompilerQuestion {
  id: string;
  text: string;
  type?: string;
  dimension?: CompilerDimension | null;
  section?: { id: string; name: string } | null;
}

/** Response row with its included question + dimension */
export interface CompilerResponse {
  id: string;
  sessionId: string;
  questionId: string;
  value: unknown;
  coverage?: Decimal | number | null;
  isValid?: boolean;
  question: CompilerQuestion;
}

/** Decision log entry used by governance builders */
export interface CompilerDecision {
  id: string;
  sessionId: string;
  statement: string;
  description?: string | null;
  status: string;
  ownerId?: string | null;
  rationale?: string | null;
  assumptions?: string | null;
  createdAt: Date;
}

/** Evidence registry entry used by readiness report builder */
export interface CompilerEvidence {
  id: string;
  sessionId: string;
  questionId: string;
  artifactType: string;
  verified: boolean;
  question?: { id: string; text: string } | null;
}

// Document categories
export enum DeliverableCategory {
  ARCHITECTURE = 'ARCHITECTURE',
  SDLC = 'SDLC',
  TESTING = 'TESTING',
  DEVSECOPS = 'DEVSECOPS',
  PRIVACY = 'PRIVACY',
  OBSERVABILITY = 'OBSERVABILITY',
  FINANCE = 'FINANCE',
  GOVERNANCE = 'GOVERNANCE',
  READINESS = 'READINESS',
}

export interface DeliverablePack {
  sessionId: string;
  generatedAt: Date;
  documents: CompiledDocument[];
  summary: PackSummary;
  readinessScore: number;
  metadata: PackMetadata;
}

export interface CompiledDocument {
  id: string;
  title: string;
  category: DeliverableCategory;
  sections: DocumentSection[];
  wordCount: number;
  subSectionCount: number;
  generatedAt: Date;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  subSections?: DocumentSection[];
  order: number;
}

export interface PackSummary {
  totalDocuments: number;
  totalSections: number;
  totalWordCount: number;
  categories: Record<DeliverableCategory, number>;
  completenessScore: number;
}

export interface PackMetadata {
  sessionId: string;
  userId: string;
  questionnaireVersion: number;
  industry?: string;
  readinessScore: number;
  dimensionScores: Record<string, number>;
  generationTimestamp: string;
}

export interface CompilerOptions {
  includeDecisionLog?: boolean;
  includeReadinessReport?: boolean;
  includePolicyPack?: boolean;
  autoSection?: boolean;
  maxWordsPerSection?: number;
}
