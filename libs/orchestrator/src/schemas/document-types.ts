// ---------------------------------------------------------------------------
// Document Type Schemas — 8 business document types with required sections,
// word counts, ISO references, and structural validation
// ---------------------------------------------------------------------------
//
// Replaces the old quest_specification with purpose-built document schemas
// aligned to the Quiz2Biz document menu (CLAUDE.md § DOCUMENT TYPES).
// ---------------------------------------------------------------------------

import wordCount from 'word-count';

// ── Types ───────────────────────────────────────────────────────────────────

/** Output format for generated documents. */
export type DocumentFormat = 'DOCX' | 'PDF' | 'MARKDOWN';

/** Unique slug identifiers for the 8 document types. */
export type DocumentSlug =
  | 'business-plan'
  | 'tech-architecture'
  | 'marketing-strategy'
  | 'financial-projections'
  | 'investor-pitch'
  | 'ai-dev-prompts'
  | 'custom'
  | 'privacy-policy';

/** A required section within a document type schema. */
export interface IDocumentSection {
  /** Section identifier (e.g. "executive_summary", "market_analysis"). */
  key: string;
  /** Human-readable section title. */
  title: string;
  /** Brief description of what this section should contain. */
  description: string;
  /** Minimum word count for this section at 100% quality. */
  minWords: number;
  /** Maximum word count for this section at 100% quality. */
  maxWords: number;
  /** Whether this section is mandatory. */
  required: boolean;
  /** Sort order within the document. */
  order: number;
}

/** ISO or industry standard reference applicable to a document type. */
export interface IStandardReference {
  /** Standard identifier (e.g. "ISO 22301", "GDPR Art. 13"). */
  standardId: string;
  /** Human-readable name of the standard. */
  name: string;
  /** Specific clause or section within the standard. */
  clause: string;
  /** Brief description of the compliance requirement. */
  requirement: string;
}

/** Complete schema definition for a document type. */
export interface IDocumentTypeSchema {
  /** Unique slug identifier. */
  slug: DocumentSlug;
  /** Human-readable document name. */
  name: string;
  /** Description of the document's purpose. */
  description: string;
  /** Base price in AUD. */
  basePrice: number;
  /** Supported output formats. */
  formats: DocumentFormat[];
  /** Required and optional sections. */
  sections: IDocumentSection[];
  /** Applicable ISO / industry standards. */
  standards: IStandardReference[];
  /** Minimum total word count at 100% quality. */
  minTotalWords: number;
  /** Maximum total word count at 100% quality. */
  maxTotalWords: number;
}

// ── Document Type Schemas ───────────────────────────────────────────────────

const BUSINESS_PLAN: IDocumentTypeSchema = {
  slug: 'business-plan',
  name: 'Business Plan',
  description: 'Comprehensive business plan covering market analysis, financials, operations, and growth strategy.',
  basePrice: 49.00,
  formats: ['DOCX', 'PDF'],
  sections: [
    { key: 'executive_summary', title: 'Executive Summary', description: 'High-level overview of the business, its value proposition, and key financials.', minWords: 500, maxWords: 1500, required: true, order: 1 },
    { key: 'company_description', title: 'Company Description', description: 'Business structure, history, mission, vision, and legal entity details.', minWords: 300, maxWords: 800, required: true, order: 2 },
    { key: 'market_analysis', title: 'Market Analysis', description: 'Target market size (TAM/SAM/SOM), trends, customer segments, and competitive landscape.', minWords: 800, maxWords: 2000, required: true, order: 3 },
    { key: 'products_services', title: 'Products & Services', description: 'Detailed description of offerings, pricing model, and competitive advantages.', minWords: 400, maxWords: 1200, required: true, order: 4 },
    { key: 'marketing_sales', title: 'Marketing & Sales Strategy', description: 'Customer acquisition channels, sales funnel, partnerships, and growth tactics.', minWords: 500, maxWords: 1500, required: true, order: 5 },
    { key: 'operations', title: 'Operations Plan', description: 'Day-to-day operations, supply chain, technology stack, and key processes.', minWords: 400, maxWords: 1000, required: true, order: 6 },
    { key: 'management_team', title: 'Management Team', description: 'Key personnel, roles, experience, and advisory board.', minWords: 200, maxWords: 600, required: true, order: 7 },
    { key: 'financial_projections', title: 'Financial Projections', description: '3–5 year P&L, cash flow, balance sheet, break-even analysis, and key assumptions.', minWords: 600, maxWords: 2000, required: true, order: 8 },
    { key: 'funding_request', title: 'Funding Request', description: 'Capital required, use of funds, and proposed terms.', minWords: 200, maxWords: 800, required: false, order: 9 },
    { key: 'appendices', title: 'Appendices', description: 'Supporting documents, charts, research data.', minWords: 0, maxWords: 2000, required: false, order: 10 },
  ],
  standards: [
    { standardId: 'ISO 22301', name: 'Business Continuity Management', clause: '8.2', requirement: 'Business impact analysis and risk assessment must be documented.' },
    { standardId: 'SBA Guidelines', name: 'U.S. Small Business Administration', clause: 'Business Plan Template', requirement: 'Standard business plan structure with financial projections.' },
  ],
  minTotalWords: 4000,
  maxTotalWords: 15000,
};

const TECH_ARCHITECTURE: IDocumentTypeSchema = {
  slug: 'tech-architecture',
  name: 'CTO / Architecture Pack',
  description: 'Technical architecture document covering system design, infrastructure, security, and deployment.',
  basePrice: 59.00,
  formats: ['DOCX', 'PDF', 'MARKDOWN'],
  sections: [
    { key: 'system_overview', title: 'System Overview', description: 'High-level architecture diagram description, component inventory, and technology choices.', minWords: 500, maxWords: 1500, required: true, order: 1 },
    { key: 'component_design', title: 'Component Design', description: 'Detailed design of each major component, APIs, data models, and integration points.', minWords: 800, maxWords: 3000, required: true, order: 2 },
    { key: 'data_architecture', title: 'Data Architecture', description: 'Database schema, data flow diagrams, storage strategy, and backup procedures.', minWords: 500, maxWords: 1500, required: true, order: 3 },
    { key: 'security', title: 'Security Architecture', description: 'Authentication, authorization, encryption, vulnerability management, and compliance.', minWords: 500, maxWords: 1500, required: true, order: 4 },
    { key: 'infrastructure', title: 'Infrastructure & Deployment', description: 'Cloud services, CI/CD pipeline, monitoring, scaling strategy, and disaster recovery.', minWords: 500, maxWords: 1500, required: true, order: 5 },
    { key: 'api_reference', title: 'API Reference', description: 'Endpoint specifications, request/response schemas, and authentication flows.', minWords: 400, maxWords: 2000, required: true, order: 6 },
    { key: 'performance', title: 'Performance & Scalability', description: 'Load targets, bottleneck analysis, caching strategy, and horizontal scaling plan.', minWords: 300, maxWords: 1000, required: false, order: 7 },
    { key: 'tech_debt', title: 'Technical Debt & Roadmap', description: 'Known debt items, prioritised remediation, and future architecture evolution.', minWords: 200, maxWords: 800, required: false, order: 8 },
  ],
  standards: [
    { standardId: 'ISO 27001', name: 'Information Security Management', clause: 'A.14', requirement: 'System acquisition, development, and maintenance security controls.' },
    { standardId: 'ISO 25010', name: 'Systems and Software Quality', clause: '4.2', requirement: 'Quality characteristics: reliability, security, performance efficiency, maintainability.' },
    { standardId: 'OWASP Top 10', name: 'Web Application Security Risks', clause: '2021', requirement: 'Address top 10 security vulnerabilities in architecture design.' },
  ],
  minTotalWords: 3500,
  maxTotalWords: 14000,
};

const MARKETING_STRATEGY: IDocumentTypeSchema = {
  slug: 'marketing-strategy',
  name: 'Marketing Strategy',
  description: 'Go-to-market strategy with customer personas, channel strategy, campaigns, and metrics.',
  basePrice: 39.00,
  formats: ['DOCX', 'PDF'],
  sections: [
    { key: 'market_overview', title: 'Market Overview', description: 'Industry landscape, trends, and competitive positioning.', minWords: 400, maxWords: 1200, required: true, order: 1 },
    { key: 'customer_personas', title: 'Customer Personas', description: 'Detailed buyer personas with demographics, pain points, and buying behaviour.', minWords: 500, maxWords: 1500, required: true, order: 2 },
    { key: 'value_proposition', title: 'Value Proposition', description: 'Unique selling points, positioning statement, and brand messaging.', minWords: 300, maxWords: 800, required: true, order: 3 },
    { key: 'channel_strategy', title: 'Channel Strategy', description: 'Marketing channels, budget allocation, and expected ROI per channel.', minWords: 500, maxWords: 1500, required: true, order: 4 },
    { key: 'content_plan', title: 'Content Plan', description: 'Content calendar, topics, formats, and distribution strategy.', minWords: 300, maxWords: 1000, required: true, order: 5 },
    { key: 'campaigns', title: 'Campaign Roadmap', description: 'Planned campaigns with timelines, budgets, and KPIs.', minWords: 400, maxWords: 1200, required: true, order: 6 },
    { key: 'metrics', title: 'Metrics & Analytics', description: 'KPIs, tracking setup, reporting cadence, and success criteria.', minWords: 200, maxWords: 600, required: true, order: 7 },
  ],
  standards: [
    { standardId: 'ISO 20671', name: 'Brand Evaluation', clause: '5.3', requirement: 'Brand strength assessment methodology and metrics.' },
  ],
  minTotalWords: 2800,
  maxTotalWords: 10000,
};

const FINANCIAL_PROJECTIONS: IDocumentTypeSchema = {
  slug: 'financial-projections',
  name: 'Financial Projections',
  description: 'Detailed financial model with P&L, cash flow, balance sheet, and sensitivity analysis.',
  basePrice: 59.00,
  formats: ['DOCX', 'PDF'],
  sections: [
    { key: 'assumptions', title: 'Key Assumptions', description: 'Revenue drivers, cost structure, growth rates, and market assumptions.', minWords: 400, maxWords: 1200, required: true, order: 1 },
    { key: 'revenue_model', title: 'Revenue Model', description: 'Pricing tiers, unit economics, customer LTV, and revenue streams.', minWords: 500, maxWords: 1500, required: true, order: 2 },
    { key: 'profit_loss', title: 'Profit & Loss Statement', description: '3–5 year projected P&L with monthly breakdown for Year 1.', minWords: 300, maxWords: 1000, required: true, order: 3 },
    { key: 'cash_flow', title: 'Cash Flow Statement', description: 'Operating, investing, and financing cash flows with runway analysis.', minWords: 300, maxWords: 1000, required: true, order: 4 },
    { key: 'balance_sheet', title: 'Balance Sheet', description: 'Projected assets, liabilities, and equity over the forecast period.', minWords: 200, maxWords: 800, required: true, order: 5 },
    { key: 'break_even', title: 'Break-Even Analysis', description: 'Break-even point calculation, contribution margin, and timeline.', minWords: 200, maxWords: 600, required: true, order: 6 },
    { key: 'sensitivity', title: 'Sensitivity Analysis', description: 'Best/base/worst case scenarios with key variable impacts.', minWords: 300, maxWords: 800, required: true, order: 7 },
    { key: 'funding_use', title: 'Use of Funds', description: 'Detailed allocation of requested capital across categories.', minWords: 200, maxWords: 600, required: false, order: 8 },
  ],
  standards: [
    { standardId: 'IFRS', name: 'International Financial Reporting Standards', clause: 'IAS 1', requirement: 'Financial statement presentation and classification standards.' },
    { standardId: 'AASB', name: 'Australian Accounting Standards Board', clause: 'AASB 101', requirement: 'Presentation of financial statements for Australian entities.' },
  ],
  minTotalWords: 2500,
  maxTotalWords: 10000,
};

const INVESTOR_PITCH: IDocumentTypeSchema = {
  slug: 'investor-pitch',
  name: 'Investor Pitch Content',
  description: 'Pitch deck content with problem/solution narrative, traction, team, and ask.',
  basePrice: 39.00,
  formats: ['DOCX', 'PDF'],
  sections: [
    { key: 'problem', title: 'Problem Statement', description: 'Market problem, pain points, and why existing solutions fail.', minWords: 200, maxWords: 500, required: true, order: 1 },
    { key: 'solution', title: 'Solution', description: 'Product description, unique approach, and key differentiators.', minWords: 200, maxWords: 600, required: true, order: 2 },
    { key: 'market_opportunity', title: 'Market Opportunity', description: 'TAM/SAM/SOM, growth trajectory, and timing thesis.', minWords: 200, maxWords: 600, required: true, order: 3 },
    { key: 'business_model', title: 'Business Model', description: 'Revenue model, pricing, unit economics, and scalability.', minWords: 200, maxWords: 500, required: true, order: 4 },
    { key: 'traction', title: 'Traction & Milestones', description: 'Key metrics, growth trajectory, partnerships, and social proof.', minWords: 200, maxWords: 500, required: true, order: 5 },
    { key: 'team', title: 'Team', description: 'Founders, key hires, advisors, and why this team wins.', minWords: 150, maxWords: 400, required: true, order: 6 },
    { key: 'financials_summary', title: 'Financials Summary', description: 'High-level revenue, burn rate, and path to profitability.', minWords: 150, maxWords: 400, required: true, order: 7 },
    { key: 'ask', title: 'The Ask', description: 'Funding amount, valuation, use of funds, and timeline.', minWords: 150, maxWords: 400, required: true, order: 8 },
  ],
  standards: [
    { standardId: 'AASB', name: 'Australian Accounting Standards Board', clause: 'AASB 101', requirement: 'Financial claims must align with accounting standards.' },
  ],
  minTotalWords: 1500,
  maxTotalWords: 5000,
};

const AI_DEV_PROMPTS: IDocumentTypeSchema = {
  slug: 'ai-dev-prompts',
  name: 'AI Development Prompts',
  description: 'Structured prompt library for AI-assisted development workflows.',
  basePrice: 29.00,
  formats: ['MARKDOWN'],
  sections: [
    { key: 'system_prompts', title: 'System Prompts', description: 'Core system prompts for each AI agent role in the development workflow.', minWords: 500, maxWords: 2000, required: true, order: 1 },
    { key: 'task_templates', title: 'Task Templates', description: 'Reusable prompt templates for common development tasks.', minWords: 400, maxWords: 1500, required: true, order: 2 },
    { key: 'chain_of_thought', title: 'Chain-of-Thought Prompts', description: 'Step-by-step reasoning prompts for complex problem-solving.', minWords: 300, maxWords: 1000, required: true, order: 3 },
    { key: 'validation_prompts', title: 'Validation Prompts', description: 'Prompts for code review, testing, and quality assurance.', minWords: 300, maxWords: 1000, required: true, order: 4 },
    { key: 'context_management', title: 'Context Management', description: 'Strategies for managing context windows and conversation history.', minWords: 200, maxWords: 800, required: false, order: 5 },
  ],
  standards: [
    { standardId: 'ISO 25010', name: 'Systems and Software Quality', clause: '4.2', requirement: 'Quality model for software development outputs.' },
  ],
  minTotalWords: 1800,
  maxTotalWords: 8000,
};

const PRIVACY_POLICY: IDocumentTypeSchema = {
  slug: 'privacy-policy',
  name: 'Privacy Policy',
  description: 'GDPR/APPs-compliant privacy policy tailored to the business and its data practices.',
  basePrice: 34.00,
  formats: ['DOCX', 'PDF', 'MARKDOWN'],
  sections: [
    { key: 'data_collection', title: 'Data Collection', description: 'Types of personal information collected, collection methods, and lawful basis.', minWords: 300, maxWords: 800, required: true, order: 1 },
    { key: 'data_use', title: 'Use of Data', description: 'Purposes for processing, legitimate interests, and consent mechanisms.', minWords: 300, maxWords: 800, required: true, order: 2 },
    { key: 'data_sharing', title: 'Data Sharing & Disclosure', description: 'Third parties, processors, international transfers, and safeguards.', minWords: 300, maxWords: 800, required: true, order: 3 },
    { key: 'data_retention', title: 'Data Retention', description: 'Retention periods, deletion policies, and archival procedures.', minWords: 200, maxWords: 600, required: true, order: 4 },
    { key: 'user_rights', title: 'User Rights', description: 'Access, rectification, erasure, portability, and objection rights.', minWords: 300, maxWords: 800, required: true, order: 5 },
    { key: 'security_measures', title: 'Security Measures', description: 'Technical and organisational measures to protect personal data.', minWords: 200, maxWords: 600, required: true, order: 6 },
    { key: 'cookies', title: 'Cookies & Tracking', description: 'Cookie policy, tracking technologies, and opt-out mechanisms.', minWords: 200, maxWords: 500, required: true, order: 7 },
    { key: 'contact', title: 'Contact Information', description: 'Data controller details, DPO contact, and complaint procedures.', minWords: 100, maxWords: 300, required: true, order: 8 },
  ],
  standards: [
    { standardId: 'GDPR', name: 'General Data Protection Regulation', clause: 'Art. 13/14', requirement: 'Information to be provided to data subjects at collection.' },
    { standardId: 'APPs', name: 'Australian Privacy Principles', clause: 'APP 1, 5', requirement: 'Open and transparent management of personal information; notification of collection.' },
    { standardId: 'ISO 27701', name: 'Privacy Information Management', clause: '7.2', requirement: 'Conditions for collecting and processing personally identifiable information.' },
  ],
  minTotalWords: 2000,
  maxTotalWords: 7000,
};

const CUSTOM: IDocumentTypeSchema = {
  slug: 'custom',
  name: 'Custom Document',
  description: 'User-defined document structure with custom sections and requirements.',
  basePrice: 44.00,
  formats: ['DOCX', 'PDF', 'MARKDOWN'],
  sections: [
    { key: 'overview', title: 'Overview', description: 'Document purpose, scope, and intended audience.', minWords: 200, maxWords: 800, required: true, order: 1 },
    { key: 'main_content', title: 'Main Content', description: 'Primary content sections as defined by the user.', minWords: 500, maxWords: 5000, required: true, order: 2 },
    { key: 'recommendations', title: 'Recommendations', description: 'Actionable recommendations based on the analysis.', minWords: 200, maxWords: 1000, required: false, order: 3 },
    { key: 'appendices', title: 'Appendices', description: 'Supporting materials, references, and additional data.', minWords: 0, maxWords: 2000, required: false, order: 4 },
  ],
  standards: [],
  minTotalWords: 1000,
  maxTotalWords: 10000,
};

// ── Registry ────────────────────────────────────────────────────────────────

/** Immutable registry of all document type schemas, keyed by slug. */
export const DOCUMENT_SCHEMAS: ReadonlyMap<DocumentSlug, IDocumentTypeSchema> = new Map<DocumentSlug, IDocumentTypeSchema>([
  ['business-plan', BUSINESS_PLAN],
  ['tech-architecture', TECH_ARCHITECTURE],
  ['marketing-strategy', MARKETING_STRATEGY],
  ['financial-projections', FINANCIAL_PROJECTIONS],
  ['investor-pitch', INVESTOR_PITCH],
  ['ai-dev-prompts', AI_DEV_PROMPTS],
  ['privacy-policy', PRIVACY_POLICY],
  ['custom', CUSTOM],
]);

/**
 * Retrieve a document type schema by its slug.
 *
 * @param slug - Document type slug.
 * @returns The schema, or null if not found.
 */
export function getDocumentSchema(slug: string): IDocumentTypeSchema | null {
  return DOCUMENT_SCHEMAS.get(slug as DocumentSlug) ?? null;
}

/**
 * List all registered document type schemas.
 *
 * @returns Array of all document type schemas, ordered by slug.
 */
export function listDocumentSchemas(): IDocumentTypeSchema[] {
  return Array.from(DOCUMENT_SCHEMAS.values());
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Result of validating a document against its type schema. */
export interface IDocumentValidationResult {
  /** Whether the document passed all structural checks. */
  valid: boolean;
  /** Missing required sections. */
  missingSections: string[];
  /** Sections that are under the minimum word count. */
  underMinWords: Array<{ section: string; actual: number; minimum: number }>;
  /** Sections that exceed the maximum word count. */
  overMaxWords: Array<{ section: string; actual: number; maximum: number }>;
  /** Whether total word count is within bounds. */
  totalWordsInRange: boolean;
  /** Actual total word count. */
  totalWords: number;
}

/**
 * Validate a document's structure against its type schema.
 *
 * Checks:
 * 1. All required sections are present.
 * 2. Each section's word count is within min/max bounds.
 * 3. Total document word count is within schema bounds.
 *
 * Word counts are scaled by the quality level (0–1), so a document generated
 * at 50% quality is expected to have proportionally fewer words.
 *
 * @param slug - Document type slug.
 * @param sections - Map of section key → section text content.
 * @param qualityLevel - Quality slider position (0–1), defaults to 1.0.
 * @returns Validation result with detailed findings.
 */
export function validateDocumentStructure(
  slug: string,
  sections: Record<string, string>,
  qualityLevel = 1.0,
): IDocumentValidationResult {
  const schema = getDocumentSchema(slug);
  if (!schema) {
    return {
      valid: false,
      missingSections: [],
      underMinWords: [],
      overMaxWords: [],
      totalWordsInRange: false,
      totalWords: 0,
    };
  }

  const clampedQuality = Math.max(0, Math.min(1, qualityLevel));
  const missingSections: string[] = [];
  const underMinWords: Array<{ section: string; actual: number; minimum: number }> = [];
  const overMaxWords: Array<{ section: string; actual: number; maximum: number }> = [];
  let totalWords = 0;

  for (const sectionDef of schema.sections) {
    const content = sections[sectionDef.key];
    const wordCount = content ? countWords(content) : 0;
    totalWords += wordCount;

    if (sectionDef.required && !content) {
      missingSections.push(sectionDef.key);
      continue;
    }

    if (!content) continue;

    // Scale word bounds by quality level
    const scaledMin = Math.floor(sectionDef.minWords * clampedQuality);
    const scaledMax = sectionDef.maxWords; // max is not scaled — more content is always OK

    if (wordCount < scaledMin) {
      underMinWords.push({ section: sectionDef.key, actual: wordCount, minimum: scaledMin });
    }
    if (wordCount > scaledMax) {
      overMaxWords.push({ section: sectionDef.key, actual: wordCount, maximum: scaledMax });
    }
  }

  const scaledMinTotal = Math.floor(schema.minTotalWords * clampedQuality);
  const totalWordsInRange = totalWords >= scaledMinTotal && totalWords <= schema.maxTotalWords;

  const valid =
    missingSections.length === 0 &&
    underMinWords.length === 0 &&
    overMaxWords.length === 0 &&
    totalWordsInRange;

  return {
    valid,
    missingSections,
    underMinWords,
    overMaxWords,
    totalWordsInRange,
    totalWords,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Count words in a text string with support for CJK languages.
 *
 * Uses the `word-count` library which:
 * - Handles CJK (Chinese, Japanese, Korean) text where words aren't space-separated
 * - Counts each CJK character as a separate word (standard for CJK languages)
 * - Treats hyphenated words as single words (e.g., "user-friendly" = 1 word)
 * - Treats contractions and possessives as single words (e.g., "don't" = 1 word)
 * - Supports multiple character sets: Latin, Cyrillic, Greek, Arabic, and CJK
 *
 * This approach aligns with ISO 2145 document structure standards and
 * common word counting practices in business documentation across languages.
 *
 * @param text - Input text in any supported language.
 * @returns Word count respecting language-specific word boundaries.
 *
 * @example
 * ```typescript
 * countWords('Hello world')              // 2
 * countWords('user-friendly interface')  // 2 (hyphenated word counted as one)
 * countWords("don't stop")               // 2 (contraction counted as one)
 * countWords('hello means 你好')         // 4 (2 English + 2 CJK characters)
 * ```
 */
function countWords(text: string): number {
  return wordCount(text);
}

/**
 * Calculate the price for a document at a given quality level.
 *
 * Uses the Quiz2Biz quality slider → price mapping:
 * - 0–25%:  1.0x (Essential)
 * - 25–50%: 2.0x (Standard)
 * - 50–75%: 3.5x (Professional)
 * - 75–100%: 5.0x (Enterprise)
 *
 * Continuous interpolation between breakpoints.
 *
 * @param basePrice - Base price in AUD.
 * @param qualityLevel - Quality slider position (0–1).
 * @returns Calculated price in AUD, rounded to 2 decimal places.
 */
export function calculateDocumentPrice(basePrice: number, qualityLevel: number): number {
  const q = Math.max(0, Math.min(1, qualityLevel));

  // Breakpoints: [position, multiplier]
  const breakpoints: Array<[number, number]> = [
    [0.00, 1.0],
    [0.25, 2.0],
    [0.50, 3.5],
    [0.75, 5.0],
    [1.00, 5.0],
  ];

  let multiplier = 1.0;

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const [pos0, mult0] = breakpoints[i];
    const [pos1, mult1] = breakpoints[i + 1];

    if (q >= pos0 && q <= pos1) {
      const t = (pos1 - pos0) > 0 ? (q - pos0) / (pos1 - pos0) : 0;
      multiplier = mult0 + t * (mult1 - mult0);
      break;
    }
  }

  return Math.round(basePrice * multiplier * 100) / 100;
}
