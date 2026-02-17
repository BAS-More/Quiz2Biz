// ---------------------------------------------------------------------------
// Message Schema — 5 message types, builders, validators
// ---------------------------------------------------------------------------
//
// Implements the 5-type inter-agent messaging protocol:
//   DELEGATE  — parent assigns work to child agent
//   REPORT    — child returns results to parent
//   ESCALATE  — agent pushes issue upward (priority: URGENT)
//   STATUS    — progress update / heartbeat
//   REDIRECT  — re-route task to a different agent
// ---------------------------------------------------------------------------

import type { MessageType, ValidationResult, ValidationTier } from '../config/interfaces';
import type {
  ICriterionResult,
  IMessage,
  IValidationSummary,
} from './interfaces';

// ── Validation ──────────────────────────────────────────────────────────────

/** Errors found during message validation. */
export interface IMessageValidationError {
  /** Field that failed validation. */
  field: string;
  /** Human-readable description of the issue. */
  message: string;
}

/** Result of validating a message payload. */
export interface IMessageValidationResult {
  /** Whether the message passed all checks. */
  valid: boolean;
  /** List of validation errors (empty when valid). */
  errors: IMessageValidationError[];
}

/**
 * Validate an inter-agent message before it is persisted or dispatched.
 *
 * Checks:
 * 1. Required fields (task_id, from_agent, to_agent, message_type) are present.
 * 2. message_type is one of the 5 allowed values.
 * 3. DELEGATE messages include an instruction in the payload.
 * 4. REPORT messages include a validationSummary.
 * 5. ESCALATE messages include a reason in the payload.
 * 6. DELEGATE messages include predecessorSummary unless from_agent is "coo".
 *
 * @param msg - Partial message to validate.
 * @returns Validation result with any errors.
 */
export function validateMessage(msg: Partial<IMessage>): IMessageValidationResult {
  const errors: IMessageValidationError[] = [];

  // Required fields
  if (msg.task_id == null || msg.task_id === 0) {
    errors.push({ field: 'task_id', message: 'task_id is required and must be > 0' });
  }
  if (!msg.from_agent) {
    errors.push({ field: 'from_agent', message: 'from_agent is required' });
  }
  if (!msg.to_agent) {
    errors.push({ field: 'to_agent', message: 'to_agent is required' });
  }

  const validTypes: MessageType[] = ['DELEGATE', 'REPORT', 'ESCALATE', 'STATUS', 'REDIRECT'];
  if (!msg.message_type || !validTypes.includes(msg.message_type)) {
    errors.push({
      field: 'message_type',
      message: `message_type must be one of: ${validTypes.join(', ')}`,
    });
  }

  // Type-specific checks
  if (msg.message_type === 'DELEGATE') {
    const payload = msg.payload as Record<string, unknown> | undefined;
    if (!payload?.instruction) {
      errors.push({ field: 'payload.instruction', message: 'DELEGATE messages require an instruction in payload' });
    }
    // CEO (coo) is exempt from predecessorSummary requirement
    if (msg.from_agent && msg.from_agent !== 'coo' && !msg.predecessor_summary) {
      errors.push({
        field: 'predecessor_summary',
        message: 'DELEGATE messages require predecessorSummary (except from COO)',
      });
    }
  }

  if (msg.message_type === 'REPORT') {
    if (!msg.validation_summary) {
      errors.push({
        field: 'validation_summary',
        message: 'REPORT messages require a validationSummary',
      });
    }
  }

  if (msg.message_type === 'ESCALATE') {
    const payload = msg.payload as Record<string, unknown> | undefined;
    if (!payload?.reason) {
      errors.push({ field: 'payload.reason', message: 'ESCALATE messages require a reason in payload' });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Builder Helpers ─────────────────────────────────────────────────────────

/** Common fields required by all message builders. */
interface IBaseMessageFields {
  /** Task this message belongs to. */
  taskId: number;
  /** Sending agent identifier. */
  fromAgent: string;
  /** Receiving agent identifier. */
  toAgent: string;
}

/**
 * Build a DELEGATE message — parent assigns work to child.
 *
 * The COO (agent_id "coo") is exempt from the predecessorSummary requirement
 * because it sits at the top of the hierarchy with no predecessor.
 *
 * @param fields - Common message fields.
 * @param instruction - Natural-language instruction for the target agent.
 * @param predecessorSummary - Summary of prior work (required unless from COO).
 * @param isFastPath - Whether this delegation follows a pre-computed fast path.
 * @param fastPathId - Fast path ID, if applicable.
 * @returns Partial IMessage ready for persistence via createMessage().
 */
export function buildDelegateMessage(
  fields: IBaseMessageFields,
  instruction: string,
  predecessorSummary: string | null = null,
  isFastPath = false,
  fastPathId: number | null = null,
): Partial<IMessage> {
  return {
    task_id: fields.taskId,
    from_agent: fields.fromAgent,
    to_agent: fields.toAgent,
    message_type: 'DELEGATE' as MessageType,
    payload: { instruction },
    predecessor_summary: predecessorSummary,
    validation_summary: null,
    is_fast_path: isFastPath,
    fast_path_id: fastPathId,
  };
}

/**
 * Build a REPORT message — child returns results to parent.
 *
 * A validation summary is REQUIRED for all report messages to ensure
 * quality gates are enforced at every hand-off.
 *
 * @param fields - Common message fields.
 * @param output - The work product / result payload.
 * @param validationSummary - Validation results (required).
 * @param predecessorSummary - Summary of the work performed.
 * @returns Partial IMessage ready for persistence.
 */
export function buildReportMessage(
  fields: IBaseMessageFields,
  output: Record<string, unknown>,
  validationSummary: IValidationSummary,
  predecessorSummary: string | null = null,
): Partial<IMessage> {
  return {
    task_id: fields.taskId,
    from_agent: fields.fromAgent,
    to_agent: fields.toAgent,
    message_type: 'REPORT' as MessageType,
    payload: { output },
    predecessor_summary: predecessorSummary,
    validation_summary: validationSummary,
    is_fast_path: false,
    fast_path_id: null,
  };
}

/**
 * Build an ESCALATE message — agent pushes issue upward.
 *
 * Escalation messages automatically set priority to 'URGENT' in the payload
 * to ensure they are processed ahead of normal queue items.
 *
 * @param fields - Common message fields (toAgent should be the escalation target).
 * @param reason - Why the escalation is needed.
 * @param context - Additional context about the issue.
 * @returns Partial IMessage ready for persistence.
 */
export function buildEscalateMessage(
  fields: IBaseMessageFields,
  reason: string,
  context: Record<string, unknown> = {},
): Partial<IMessage> {
  return {
    task_id: fields.taskId,
    from_agent: fields.fromAgent,
    to_agent: fields.toAgent,
    message_type: 'ESCALATE' as MessageType,
    payload: {
      reason,
      priority: 'URGENT',
      ...context,
    },
    predecessor_summary: null,
    validation_summary: null,
    is_fast_path: false,
    fast_path_id: null,
  };
}

/**
 * Build a STATUS message — progress update or heartbeat.
 *
 * Used for in-progress reporting, health checks, and queue position updates.
 *
 * @param fields - Common message fields.
 * @param statusPayload - Arbitrary status data (e.g. progress %, tokens consumed).
 * @returns Partial IMessage ready for persistence.
 */
export function buildStatusMessage(
  fields: IBaseMessageFields,
  statusPayload: Record<string, unknown>,
): Partial<IMessage> {
  return {
    task_id: fields.taskId,
    from_agent: fields.fromAgent,
    to_agent: fields.toAgent,
    message_type: 'STATUS' as MessageType,
    payload: statusPayload,
    predecessor_summary: null,
    validation_summary: null,
    is_fast_path: false,
    fast_path_id: null,
  };
}

/**
 * Build a REDIRECT message — re-route a task to a different agent.
 *
 * Used when the current agent determines the task falls outside its scope
 * and should be handled by another agent in the hierarchy.
 *
 * @param fields - Common message fields (toAgent is the redirect target).
 * @param reason - Why the task is being redirected.
 * @param suggestedAgent - The recommended agent to handle the task.
 * @returns Partial IMessage ready for persistence.
 */
export function buildRedirectMessage(
  fields: IBaseMessageFields,
  reason: string,
  suggestedAgent: string,
): Partial<IMessage> {
  return {
    task_id: fields.taskId,
    from_agent: fields.fromAgent,
    to_agent: fields.toAgent,
    message_type: 'REDIRECT' as MessageType,
    payload: {
      reason,
      suggested_agent: suggestedAgent,
    },
    predecessor_summary: null,
    validation_summary: null,
    is_fast_path: false,
    fast_path_id: null,
  };
}

// ── Validation Summary Builder ──────────────────────────────────────────────

/** Input for building a Tier 1 (mechanical) validation result. */
export interface ITier1Input {
  /** Outcome of the schema/mechanical checks. */
  status: ValidationResult;
  /** Number of checks executed. */
  checksRun: number;
  /** Number of checks that passed. */
  checksPassed: number;
  /** Error messages for failed checks. */
  errors: string[];
}

/** Input for building a Tier 2 (cross-model) validation result. */
export interface ITier2Input {
  /** Outcome of the cross-model compliance check. */
  status: ValidationResult;
  /** Model used for cross-checking, or null if not run. */
  model: string | null;
  /** Per-criterion evaluation results. */
  criteriaResults: ICriterionResult[];
}

/** Input for building a Tier 3 (human review) validation result. */
export interface ITier3Input {
  /** Outcome of the human review gate. */
  status: ValidationResult;
}

/**
 * Build a complete 3-tier validation summary from individual tier results.
 *
 * The validation cascade follows a strict order:
 * - Tier 1: Mechanical schema checks (no AI) — always runs.
 * - Tier 2: Cross-model ISO compliance scoring — runs if Tier 1 passes.
 * - Tier 3: Human review gate — runs for XL tasks or on disagreement.
 *
 * @param tier1 - Mechanical validation results.
 * @param tier2 - Cross-model validation results.
 * @param tier3 - Human review results.
 * @returns Complete validation summary.
 */
export function buildValidationSummary(
  tier1: ITier1Input,
  tier2: ITier2Input,
  tier3: ITier3Input,
): IValidationSummary {
  const criteriaCount = tier2.criteriaResults.length;
  const criteriaPassed = tier2.criteriaResults.filter(c => c.result === 'YES').length;

  return {
    tier_1: {
      status: tier1.status,
      checksRun: tier1.checksRun,
      checksPassed: tier1.checksPassed,
      errors: [...tier1.errors],
    },
    tier_2: {
      status: tier2.status,
      model: tier2.model,
      criteriaCount,
      criteriaPassed,
      criteriaResults: [...tier2.criteriaResults],
    },
    tier_3: {
      status: tier3.status,
    },
  };
}

/**
 * Create a default "not yet validated" summary.
 *
 * Useful as a starting point before validation tiers execute.
 *
 * @returns Validation summary with all tiers set to NOT_REQUIRED / zeroed.
 */
export function buildEmptyValidationSummary(): IValidationSummary {
  return {
    tier_1: {
      status: 'NOT_REQUIRED',
      checksRun: 0,
      checksPassed: 0,
      errors: [],
    },
    tier_2: {
      status: 'NOT_REQUIRED',
      model: null,
      criteriaCount: 0,
      criteriaPassed: 0,
      criteriaResults: [],
    },
    tier_3: {
      status: 'NOT_REQUIRED',
    },
  };
}

/**
 * Determine the overall validation outcome from a summary.
 *
 * Rules:
 * - If any tier is FAIL, overall is FAIL.
 * - If any tier is AWAITING_APPROVAL, overall is AWAITING_APPROVAL.
 * - If all tiers are PASS or NOT_REQUIRED, overall is PASS.
 *
 * @param summary - The 3-tier validation summary.
 * @returns Aggregate validation result.
 */
export function getOverallValidationResult(summary: IValidationSummary): ValidationResult {
  const tiers: ValidationResult[] = [
    summary.tier_1.status,
    summary.tier_2.status,
    summary.tier_3.status,
  ];

  if (tiers.includes('FAIL')) return 'FAIL';
  if (tiers.includes('AWAITING_APPROVAL')) return 'AWAITING_APPROVAL';
  return 'PASS';
}

/**
 * Check whether a validation tier has been executed (not NOT_REQUIRED).
 *
 * @param tier - The validation tier to check.
 * @param summary - The 3-tier validation summary.
 * @returns True if the tier was actually executed.
 */
export function wasTierExecuted(
  tier: ValidationTier,
  summary: IValidationSummary,
): boolean {
  const status =
    tier === 'TIER_1' ? summary.tier_1.status
    : tier === 'TIER_2' ? summary.tier_2.status
    : summary.tier_3.status;

  return status !== 'NOT_REQUIRED';
}
