/**
 * QPG Types - Core interfaces for the Qoder Prompt Generator
 */

/**
 * Structured prompt format following Quest-Mode specification
 */
export interface QuestModePrompt {
  /** Unique identifier for the prompt */
  id: string;

  /** Dimension this prompt addresses */
  dimensionKey: string;

  /** Question ID that triggered this prompt */
  questionId: string;

  /** Clear objective statement */
  goal: string;

  /** Numbered list of specific tasks */
  tasks: PromptTask[];

  /** Measurable acceptance criteria */
  acceptanceCriteria: string[];

  /** Technical and process constraints */
  constraints: string[];

  /** Expected deliverables */
  deliverables: string[];

  /** Priority level (1-5, 1 being highest) */
  priority: number;

  /** Estimated effort in hours */
  estimatedEffort: number;

  /** Required evidence type for verification */
  evidenceType: EvidenceType;

  /** Tags for categorization */
  tags: string[];

  /** Generated timestamp */
  generatedAt: Date;
}

export interface PromptTask {
  /** Task sequence number */
  order: number;

  /** Task description */
  description: string;

  /** Subtasks if any */
  subtasks?: string[];

  /** Files likely to be affected */
  affectedFiles?: string[];
}

export enum EvidenceType {
  SCREENSHOT = 'SCREENSHOT',
  DOCUMENT = 'DOCUMENT',
  CODE = 'CODE',
  CONFIG = 'CONFIG',
  TEST_REPORT = 'TEST_REPORT',
  AUDIT_LOG = 'AUDIT_LOG',
  POLICY = 'POLICY',
  ARCHITECTURE_DIAGRAM = 'ARCHITECTURE_DIAGRAM',
}

/**
 * Gap context from the scoring engine
 */
export interface GapContext {
  /** Session ID */
  sessionId: string;

  /** Dimension key (e.g., 'arch_sec', 'devops_iac') */
  dimensionKey: string;

  /** Dimension name for display */
  dimensionName: string;

  /** Question that revealed the gap */
  questionId: string;
  questionText: string;

  /** Current coverage level (0.0, 0.25, 0.5, 0.75, 1.0) */
  currentCoverage: number;

  /** Severity weight of the question */
  severity: number;

  /** Calculated residual risk */
  residualRisk: number;

  /** Best practice recommendation */
  bestPractice: string;

  /** Practical explanation */
  practicalExplainer: string;

  /** Related standard references */
  standardRefs: string[];

  /** Answer provided by user */
  userAnswer?: string;

  /** Notes from user */
  userNotes?: string;
}

/**
 * Prompt template for a dimension
 */
export interface PromptTemplate {
  /** Template ID */
  id: string;

  /** Dimension key this template is for */
  dimensionKey: string;

  /** Template version */
  version: string;

  /** Goal template with placeholders */
  goalTemplate: string;

  /** Task templates */
  taskTemplates: TaskTemplate[];

  /** Default acceptance criteria */
  defaultAcceptanceCriteria: string[];

  /** Default constraints */
  defaultConstraints: string[];

  /** Default deliverables */
  defaultDeliverables: string[];

  /** Evidence type for this dimension */
  evidenceType: EvidenceType;

  /** Base effort estimate in hours */
  baseEffortHours: number;
}

export interface TaskTemplate {
  /** Order in the task list */
  order: number;

  /** Template with {{placeholders}} */
  template: string;

  /** Condition for including this task */
  condition?: TaskCondition;
}

export interface TaskCondition {
  /** Field to check */
  field: string;

  /** Operator */
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains';

  /** Value to compare */
  value: string | number;
}

/**
 * Generated prompt batch for a session
 */
export interface PromptBatch {
  /** Batch ID */
  id: string;

  /** Session ID */
  sessionId: string;

  /** Generated prompts */
  prompts: QuestModePrompt[];

  /** Total estimated effort */
  totalEffortHours: number;

  /** Dimensions covered */
  dimensionsCovered: string[];

  /** Generated timestamp */
  generatedAt: Date;

  /** Score at time of generation */
  scoreAtGeneration: number;
}
