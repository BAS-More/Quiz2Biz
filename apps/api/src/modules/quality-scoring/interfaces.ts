/**
 * Quality Scoring Interfaces
 *
 * Types for the Quiz2Biz quality scoring system that evaluates
 * projects against quality dimensions and benchmark criteria.
 */

/**
 * Quality dimension score
 */
export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  weight: number;
  score: number; // 0-100
  completeness: number; // 0-1 (percentage of criteria met)
  criteriaScores: CriteriaScore[];
}

/**
 * Individual criteria score
 */
export interface CriteriaScore {
  criterionKey: string;
  criterionDescription: string;
  met: boolean;
  confidence: number; // 0-1
  sourceFactKey?: string;
}

/**
 * Overall project quality score
 */
export interface ProjectQualityScore {
  projectId: string;
  overallScore: number; // 0-100
  completenessScore: number; // 0-100 (how many facts are present)
  confidenceScore: number; // 0-100 (average fact confidence)
  dimensionScores: DimensionScore[];
  recommendations: string[];
  scoredAt: Date;
}

/**
 * Quality improvement suggestion
 */
export interface QualityImprovement {
  dimensionId: string;
  dimensionName: string;
  currentScore: number;
  potentialScore: number;
  missingCriteria: string[];
  suggestedQuestions: string[];
}

/**
 * Quality scoring request
 */
export interface QualityScoringRequest {
  projectId: string;
  projectTypeSlug: string;
}
