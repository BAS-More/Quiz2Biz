// ---------------------------------------------------------------------------
// Quality Score — weights, calculation, confidence determination
// ---------------------------------------------------------------------------

// Re-export the IQualityScore interface from the central interfaces file.
export type { IQualityScore } from './interfaces';

import type { IQualityScore } from './interfaces';

// ── Weights ─────────────────────────────────────────────────────────────────

/** Weights for each quality dimension in the overall score calculation. */
export const QUALITY_WEIGHTS = {
  /** Weight for schema conformance. */
  schema: 0.20,
  /** Weight for ISO compliance. */
  isoCompliance: 0.35,
  /** Weight for content completeness. */
  completeness: 0.25,
  /** Weight for writing clarity. */
  clarity: 0.20,
} as const;

/**
 * Validate that the quality weights sum to 1.0 to keep the overall score
 * on the expected 0–100 scale.
 *
 * Throws an error at module load time if the invariant is violated so that
 * misconfigured weights do not silently skew scores.
 */
function validateQualityWeights(weights: typeof QUALITY_WEIGHTS): void {
  const sum = Object.values(weights).reduce((acc, value) => acc + value, 0);
  const EPSILON = 1e-6;
  if (Math.abs(sum - 1.0) > EPSILON) {
    throw new Error(
      `QUALITY_WEIGHTS must sum to 1.0, but the current sum is ${sum}.`,
    );
  }
}

// Validate weights at module initialization time.
validateQualityWeights(QUALITY_WEIGHTS);

// ── Score Calculation ───────────────────────────────────────────────────────

/** Component scores required to calculate the overall quality score. */
type QualityComponents = Omit<IQualityScore, 'overall' | 'confidence'>;

/**
 * Calculate the weighted overall quality score from individual components.
 *
 * @param components - Individual dimension scores (0–100 each).
 * @returns Weighted overall score (0–100), rounded to 1 decimal place.
 */
export function calculateOverallScore(components: QualityComponents): number {
  const weighted =
    components.schema * QUALITY_WEIGHTS.schema +
    components.isoCompliance * QUALITY_WEIGHTS.isoCompliance +
    components.completeness * QUALITY_WEIGHTS.completeness +
    components.clarity * QUALITY_WEIGHTS.clarity;

  return Math.round(weighted * 10) / 10;
}

// ── Confidence Determination ────────────────────────────────────────────────

/**
 * Determine confidence level based on correction cycles and model agreement.
 *
 * - HIGH: 0 correction cycles and models agree.
 * - MEDIUM: 1+ correction cycles or models disagree (but not both).
 * - LOW: 2+ correction cycles and models disagree.
 *
 * @param correctionCycles - Number of validation correction cycles applied.
 * @param modelAgreement - Whether the primary and cross-check models agree.
 * @returns Confidence level.
 */
export function determineConfidence(
  correctionCycles: number,
  modelAgreement: boolean,
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (correctionCycles === 0 && modelAgreement) return 'HIGH';
  if (correctionCycles >= 2 && !modelAgreement) return 'LOW';
  return 'MEDIUM';
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a complete IQualityScore from raw dimension scores and metadata.
 *
 * @param schema - Schema conformance score (0–100).
 * @param iso - ISO compliance score (0–100).
 * @param completeness - Content completeness score (0–100).
 * @param clarity - Writing clarity score (0–100).
 * @param correctionCycles - Number of correction cycles applied.
 * @param modelAgreement - Whether primary and cross-check models agree.
 * @returns A fully computed IQualityScore.
 */
export function buildQualityScore(
  schema: number,
  iso: number,
  completeness: number,
  clarity: number,
  correctionCycles: number,
  modelAgreement: boolean,
): IQualityScore {
  const components: QualityComponents = {
    schema,
    isoCompliance: iso,
    completeness,
    clarity,
  };

  return {
    ...components,
    overall: calculateOverallScore(components),
    confidence: determineConfidence(correctionCycles, modelAgreement),
  };
}
