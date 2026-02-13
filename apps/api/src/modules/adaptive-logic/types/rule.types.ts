/**
 * Condition operators supported by the adaptive logic engine
 */
export type ConditionOperator =
  | 'equals'
  | 'eq'
  | 'not_equals'
  | 'ne'
  | 'includes'
  | 'contains'
  | 'not_includes'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'gt'
  | 'less_than'
  | 'lt'
  | 'greater_than_or_equal'
  | 'gte'
  | 'less_than_or_equal'
  | 'lte'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'
  | 'starts_with'
  | 'ends_with'
  | 'matches';

/**
 * Logical operators for combining conditions
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * A single condition or group of nested conditions
 */
export interface Condition {
  /** Question ID to check (the field containing the response) */
  field?: string;

  /** The operator to use for comparison */
  operator?: ConditionOperator;

  /** The expected value to compare against */
  value?: unknown;

  /** Logical operator for nested conditions */
  logicalOp?: LogicalOperator;

  /** Nested conditions for complex logic */
  nested?: Condition[];
}

/**
 * A complete visibility rule
 */
export interface VisibilityRuleConfig {
  /** Unique identifier */
  id: string;

  /** Question ID that triggers this rule */
  sourceQuestionId: string;

  /** The condition(s) to evaluate */
  conditions: Condition[];

  /** How to combine multiple conditions */
  operator: LogicalOperator;

  /** What to do when conditions are met */
  action: 'show' | 'hide' | 'require' | 'unrequire';

  /** Question IDs affected by this rule */
  targetQuestionIds: string[];

  /** Higher priority rules take precedence */
  priority: number;

  /** Whether this rule is active */
  enabled: boolean;
}

/**
 * Branching rule for directing flow
 */
export interface BranchingRule {
  /** Question ID that triggers branching */
  sourceQuestionId: string;

  /** Possible branches */
  branches: {
    conditions: Condition[];
    targetPath: string;
    priority: number;
  }[];

  /** Default path if no branch matches */
  defaultPath: string;
}

/**
 * Evaluated state of a question
 */
export interface QuestionState {
  visible: boolean;
  required: boolean;
  disabled: boolean;
}

/**
 * Metrics for tracking rule effectiveness
 */
export interface RuleMetrics {
  ruleId: string;
  triggeredCount: number;
  averageSessionCompletion: number;
  dropOffRate: number;
}
