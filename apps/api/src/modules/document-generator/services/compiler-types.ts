/**
 * Types, interfaces, and constants for the Deliverables Compiler.
 */

// Maximum words per section before auto-splitting
export const MAX_WORDS_PER_SECTION = 1000;

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
