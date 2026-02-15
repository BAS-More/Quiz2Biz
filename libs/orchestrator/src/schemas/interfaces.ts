// ---------------------------------------------------------------------------
// Core Domain Interfaces — agents, tasks, entities, messages, routing
// ---------------------------------------------------------------------------

import type {
  AgentLevel,
  AgentStatus,
  MessageType,
  TaskStatus,
  TaskTier,
  ValidationResult,
} from '../config/interfaces';

// ── Agent ───────────────────────────────────────────────────────────────────

/** Runtime representation of an agent in the hierarchy. */
export interface IAgent {
  /** Unique agent identifier (e.g. "coo", "cto", "security_officer"). */
  agent_id: string;
  /** Human-readable name shown in logs and UI. */
  display_name: string;
  /** Hierarchy level — L1 (COO) through L4 (specialist). */
  level: AgentLevel;
  /** Current runtime status of the agent. */
  status: AgentStatus;
  /** Agent ID this agent reports to, or null for the top-level COO. */
  reports_to: string | null;
  /** Project phase this agent is active in (0 = all phases). */
  phase: number;
  /** Department grouping (e.g. "engineering", "compliance"). */
  department: string;
  /** ID of the currently active config version, or null if unconfigured. */
  current_config_version_id: number | null;
}

/** Versioned configuration that defines an agent's behaviour. */
export interface IAgentConfig {
  /** Auto-incremented config version identifier. */
  config_version_id: number;
  /** Agent this configuration belongs to. */
  agent_id: string;
  /** Monotonically increasing version number within the agent. */
  version: number;
  /** Whether this is the active configuration. */
  is_current: boolean;
  /** Full role definition injected as the identity prompt section. */
  role_definition: string;
  /** List of scope items this agent is responsible for. */
  scope_inclusions: string[];
  /** Scope items explicitly excluded, with the responsible agent identified. */
  scope_exclusions: Array<{ /** Description of the excluded scope. */ exclusion: string; /** Agent responsible for this scope instead. */ responsible_agent: string }>;
  /** Operational rules — plain strings or structured rules with applicability. */
  rules: Array<string | { /** Rule text. */ text: string; /** Scope this rule applies to. */ applies_to: string }>;
  /** Slash-commands or special actions this agent can invoke. */
  commands: string[];
  /** Conditions that trigger escalation to a higher-level agent. */
  escalation_triggers: Array<string | { /** Condition description. */ condition: string; /** Agent to escalate to. */ escalate_to: string }>;
  /** Actions this agent is explicitly forbidden from performing. */
  prohibited_behaviours: string[];
  /** Decision domains this agent has authority over. */
  decision_domains: string[];
  /** Decisions this agent must NOT make, with escalation targets. */
  excluded_decisions: Array<{ /** Decision description. */ decision: string; /** Agent to escalate to. */ escalate_to: string }>;
}

// ── Task ────────────────────────────────────────────────────────────────────

/** A unit of work flowing through the orchestrator pipeline. */
export interface ITask {
  /** Auto-incremented task identifier. */
  task_id: number;
  /** Size tier determining token and error budgets. */
  tier: TaskTier;
  /** Classification label (e.g. "create_entity", "review_code"). */
  task_type: string;
  /** Target project name, or null for cross-project tasks. */
  project: string | null;
  /** Target module within the project, or null for project-wide tasks. */
  module: string | null;
  /** Natural-language instruction provided by the user or delegating agent. */
  instruction: string;
  /** Current lifecycle status. */
  status: TaskStatus;
  /** Position in the FIFO queue, or null if not queued. */
  queue_position: number | null;
  /** Agent currently executing this task, or null if unassigned. */
  assigned_agent: string | null;
  /** Agent that delegated this task, or null if user-initiated. */
  delegated_by: string | null;
  /** Maximum tokens allocated for this task, or null for default tier budget. */
  token_budget: number | null;
  /** Tokens consumed so far across all API calls for this task. */
  tokens_consumed: number;
  /** Number of errors encountered during execution. */
  error_count: number;
  /** Maximum errors allowed before the task fails. */
  max_errors: number;
  /** Final output payload — structure varies by task type. */
  output: unknown;
  /** Aggregated validation results across all tiers, or null if not validated. */
  validation_summary: IValidationSummary | null;
  /** JSON Schema name that the output must conform to, or null. */
  expected_output_schema: string | null;
  /** Reasoning provided by the classifier for the tier/type assignment. */
  classification_reasoning: string | null;
  /** Whether this task bypasses the queue and executes immediately. */
  is_urgent: boolean;
  /** ISO 8601 timestamp when the task was created. */
  created_at: string;
  /** ISO 8601 timestamp when execution started, or null. */
  started_at: string | null;
  /** ISO 8601 timestamp when execution completed, or null. */
  completed_at: string | null;
}

// ── Entity ──────────────────────────────────────────────────────────────────

/** A versioned content entity stored in the orchestrator database. */
export interface IEntity {
  /** Auto-incremented entity identifier. */
  entity_id: number;
  /** Entity type classification (e.g. "business_plan", "api_endpoint"). */
  entity_type: string;
  /** Unique key within its type and project scope. */
  entity_key: string;
  /** Project this entity belongs to. */
  project: string;
  /** Module within the project, or null for project-level entities. */
  module: string | null;
  /** Monotonically increasing version number. */
  version: number;
  /** Whether this is the current/active version. */
  is_current: boolean;
  /** Full entity content — structure varies by entity type. */
  content: unknown;
  /** Human-readable summary of the content, or null. */
  content_summary: string | null;
  /** Searchable tags for filtering and retrieval. */
  tags: string[];
  /** Entity ID of the previous version, or null for the first version. */
  parent_version_id: number | null;
  /** Agent that created this entity version, or null if system-generated. */
  created_by: string | null;
  /** Agent that validated this entity version, or null. */
  validated_by: string | null;
  /** ISO 8601 timestamp when this version was created. */
  created_at: string;
}

// ── Message ─────────────────────────────────────────────────────────────────

/** An inter-agent message within a task's execution. */
export interface IMessage {
  /** Auto-incremented message identifier. */
  message_id: number;
  /** Task this message belongs to. */
  task_id: number;
  /** Sending agent identifier. */
  from_agent: string;
  /** Receiving agent identifier. */
  to_agent: string;
  /** Message protocol type. */
  message_type: MessageType;
  /** Message payload — contents vary by message type. */
  payload: Record<string, unknown>;
  /** Summary of the predecessor agent's work, or null. */
  predecessor_summary: string | null;
  /** Validation results attached to this message, or null. */
  validation_summary: IValidationSummary | null;
  /** Whether this message follows a pre-computed fast path. */
  is_fast_path: boolean;
  /** Fast path ID being followed, or null if not a fast path. */
  fast_path_id: number | null;
  /** ISO 8601 timestamp when this message was created. */
  created_at: string;
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Aggregated validation results across the 3-tier cascade. */
export interface IValidationSummary {
  /** Tier 1: mechanical schema checks (no AI). */
  tier_1: {
    /** Overall result of Tier 1 validation. */
    status: ValidationResult;
    /** Number of schema checks executed. */
    checksRun: number;
    /** Number of schema checks that passed. */
    checksPassed: number;
    /** Error messages for failed checks. */
    errors: string[];
  };
  /** Tier 2: cross-model ISO compliance scoring. */
  tier_2: {
    /** Overall result of Tier 2 validation. */
    status: ValidationResult;
    /** Model used for cross-checking, or null if not run. */
    model: string | null;
    /** Total number of ISO criteria evaluated. */
    criteriaCount: number;
    /** Number of criteria that passed. */
    criteriaPassed: number;
    /** Per-criterion evaluation results. */
    criteriaResults: ICriterionResult[];
  };
  /** Tier 3: human review gate. */
  tier_3: {
    /** Overall result of Tier 3 validation. */
    status: ValidationResult;
  };
}

/** Result of evaluating a single ISO compliance criterion. */
export interface ICriterionResult {
  /** The criterion being evaluated. */
  criterion: string;
  /** Whether the criterion was met. */
  result: 'YES' | 'NO';
  /** Explanation of the evaluation outcome. */
  reasoning: string;
}

// ── Routing ─────────────────────────────────────────────────────────────────

/** Computed route for a task through the agent hierarchy. */
export interface IRoute {
  /** Ordered list of agent IDs the task will traverse. */
  route: string[];
  /** Whether this route uses a pre-computed fast path. */
  isFastPath: boolean;
  /** Fast path ID if following one, or null. */
  fastPathId: number | null;
  /** Task tier for this route. */
  tier: TaskTier;
  /** Agents that were skipped via fast path optimization. */
  skippedAgents: string[];
}

/** Result of classifying a user instruction into a routable task. */
export interface IClassification {
  /** Assigned task size tier. */
  tier: TaskTier;
  /** Reasoning for the tier/type classification. */
  reasoning: string;
  /** Ordered chain of agents for delegation. */
  delegationChain: string[];
  /** Classified task type label. */
  taskType: string;
  /** Target project name. */
  project: string;
  /** Target module within the project, or null. */
  module: string | null;
  /** Estimated number of agents involved. */
  estimatedAgentCount: number;
  /** Whether this task requires Avi (human) approval before execution. */
  requiresAviApproval: boolean;
}

/** A pre-computed fast path for common task types. */
export interface IFastPath {
  /** Unique fast path identifier. */
  path_id: number;
  /** Task type this fast path applies to. */
  task_type: string;
  /** Maximum tier this fast path supports. */
  max_tier: TaskTier;
  /** Pre-computed agent route. */
  route: string[];
  /** Agents bypassed by this fast path. */
  skipped_agents: string[];
}

/** A precedence rule for resolving authority conflicts between agents. */
export interface IPrecedenceRule {
  /** Unique rule identifier. */
  rule_id: number;
  /** Decision domain this rule governs. */
  decision_domain: string;
  /** Agent with primary authority. */
  primary_authority: string;
  /** Agent with secondary/fallback authority. */
  secondary_authority: string;
  /** How conflicts between authorities are resolved. */
  resolution_protocol: string;
}

// ── Result ──────────────────────────────────────────────────────────────────

/** Quality score breakdown for a generated document or output. */
export interface IQualityScore {
  /** Schema conformance score (0–100). */
  schema: number;
  /** ISO compliance score (0–100). */
  isoCompliance: number;
  /** Content completeness score (0–100). */
  completeness: number;
  /** Writing clarity score (0–100). */
  clarity: number;
  /** Weighted overall score (0–100). */
  overall: number;
  /** Confidence level based on correction cycles and model agreement. */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/** Final result returned by the orchestrator for a processed instruction. */
export interface IOrchestratorResult {
  /** Outcome status of the task. */
  status: TaskStatus | 'QUEUED';
  /** Assigned task ID, if created. */
  taskId?: number;
  /** Assigned task tier, if classified. */
  tier?: TaskTier;
  /** Final output payload, if completed. */
  output?: unknown;
  /** Validation summary, if validation was run. */
  validation?: IValidationSummary;
  /** Total tokens consumed during execution. */
  tokensConsumed?: number;
  /** Quality score breakdown, if scoring was performed. */
  qualityScore?: IQualityScore;
  /** Error message, if the task failed. */
  error?: string;
  /** Human-readable reason for the outcome. */
  reason?: string;
  /** Queue position, if the task was queued. */
  position?: number;
  /** Agent route taken during execution. */
  route?: string[];
}
