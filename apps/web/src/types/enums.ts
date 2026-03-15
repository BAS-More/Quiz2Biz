/**
 * Frontend enum definitions mirroring Prisma schema enums.
 *
 * Keep in sync with prisma/schema.prisma when enum values change.
 */

// ─── Evidence ───────────────────────────────────────────────────────────────

export const EvidenceType = {
  FILE: 'FILE',
  IMAGE: 'IMAGE',
  LINK: 'LINK',
  LOG: 'LOG',
  SBOM: 'SBOM',
  REPORT: 'REPORT',
  TEST_RESULT: 'TEST_RESULT',
  SCREENSHOT: 'SCREENSHOT',
  DOCUMENT: 'DOCUMENT',
} as const;

export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType];

// ─── Documents ──────────────────────────────────────────────────────────────

export const DocumentCategory = {
  CTO: 'CTO',
  CFO: 'CFO',
  BA: 'BA',
  CEO: 'CEO',
  POLICY: 'POLICY',
  SEO: 'SEO',
} as const;

export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const DocumentStatus = {
  PENDING: 'PENDING',
  GENERATING: 'GENERATING',
  GENERATED: 'GENERATED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const OutputFormat = {
  DOCX: 'DOCX',
  PDF: 'PDF',
  MARKDOWN: 'MARKDOWN',
} as const;

export type OutputFormat = (typeof OutputFormat)[keyof typeof OutputFormat];

// ─── Decisions ──────────────────────────────────────────────────────────────

export const DecisionStatus = {
  DRAFT: 'DRAFT',
  LOCKED: 'LOCKED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export type DecisionStatus = (typeof DecisionStatus)[keyof typeof DecisionStatus];

// ─── Projects ───────────────────────────────────────────────────────────────

export const ProjectStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  COMPLETED: 'COMPLETED',
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

// ─── Payments ───────────────────────────────────────────────────────────────

export const PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
