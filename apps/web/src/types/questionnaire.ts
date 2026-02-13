/**
 * Questionnaire types for Quiz2Biz frontend
 */

/**
 * Question types supported by the questionnaire
 */
export const QuestionType = {
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  NUMBER: 'NUMBER',
  EMAIL: 'EMAIL',
  URL: 'URL',
  DATE: 'DATE',
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  SCALE: 'SCALE',
  FILE_UPLOAD: 'FILE_UPLOAD',
  MATRIX: 'MATRIX',
} as const;

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

/**
 * Coverage levels for the 5-level evidence scale
 */
export const CoverageLevel = {
  NONE: 'NONE', // 0.00 - No evidence
  PARTIAL: 'PARTIAL', // 0.25 - Some evidence exists
  HALF: 'HALF', // 0.50 - Moderate coverage
  SUBSTANTIAL: 'SUBSTANTIAL', // 0.75 - Most requirements met
  FULL: 'FULL', // 1.00 - Complete coverage
} as const;

export type CoverageLevel = (typeof CoverageLevel)[keyof typeof CoverageLevel];

/**
 * Coverage level to decimal mapping
 */
export const COVERAGE_LEVEL_VALUES: Record<CoverageLevel, number> = {
  [CoverageLevel.NONE]: 0.0,
  [CoverageLevel.PARTIAL]: 0.25,
  [CoverageLevel.HALF]: 0.5,
  [CoverageLevel.SUBSTANTIAL]: 0.75,
  [CoverageLevel.FULL]: 1.0,
};

/**
 * Persona types for question targeting
 */
export const Persona = {
  CTO: 'CTO',
  CFO: 'CFO',
  CEO: 'CEO',
  BA: 'BA',
  POLICY: 'POLICY',
} as const;

export type Persona = (typeof Persona)[keyof typeof Persona];

/**
 * Question option for choice-based questions
 */
export interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

/**
 * Scale configuration for scale questions
 */
export interface ScaleConfig {
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
  showValue?: boolean;
}

/**
 * Matrix configuration for matrix questions
 */
export interface MatrixConfig {
  rows: QuestionOption[];
  columns: QuestionOption[];
}

/**
 * Validation rules for questions
 */
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

/**
 * Question definition
 */
export interface Question {
  id: string;
  sectionId: string;
  text: string;
  type: QuestionType;
  helpText?: string;
  explanation?: string;
  placeholder?: string;
  orderIndex: number;
  isRequired: boolean;
  options?: QuestionOption[];
  validationRules?: ValidationRules;
  defaultValue?: unknown;
  suggestedAnswer?: unknown;
  persona?: Persona;
  dimensionKey?: string;
  severity?: number;
  bestPractice?: string;
  practicalExplainer?: string;
  standardRefs?: string;
  acceptance?: string;
}

/**
 * Section containing questions
 */
export interface Section {
  id: string;
  questionnaireId: string;
  name: string;
  description?: string;
  orderIndex: number;
  icon?: string;
  estimatedTime?: number;
  questions: Question[];
}

/**
 * Complete questionnaire
 */
export interface Questionnaire {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  version: number;
  isActive: boolean;
  estimatedTime?: number;
  sections: Section[];
}

/**
 * Response to a question
 */
export interface QuestionResponse {
  questionId: string;
  value: unknown;
  coverageLevel?: CoverageLevel;
  coverage?: number;
  rationale?: string;
  evidenceCount?: number;
  timeSpentSeconds?: number;
}

/**
 * Session progress tracking
 */
export interface SessionProgress {
  percentage: number;
  answered: number;
  total: number;
  sectionsCompleted: number;
  totalSections: number;
  currentSectionProgress: number;
  currentSectionTotal: number;
}

/**
 * Questionnaire session state
 */
export interface QuestionnaireSession {
  id: string;
  questionnaireId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED';
  industry?: string;
  progress: SessionProgress;
  currentSectionId?: string;
  currentQuestionId?: string;
  readinessScore?: number;
  responses: Map<string, QuestionResponse>;
}

/**
 * Props for question input components
 */
export interface QuestionInputProps<T = unknown> {
  question: Question;
  value: T;
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  showBestPractice?: boolean;
  showExplainer?: boolean;
}

/**
 * Evidence item for a question
 */
export interface EvidenceItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  artifactType: string;
  verified: boolean;
  uploadedAt: Date;
  thumbnailUrl?: string;
}
