// ---------------------------------------------------------------------------
// MCP Database Client — connection pool, health check, CRUD, audit logging
// ---------------------------------------------------------------------------

import { Pool, type PoolClient, type QueryResult } from 'pg';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import type {
  AuditOperation,
  TaskTier,
  ValidationTier,
} from '../config/interfaces';
import type {
  IAgent,
  IAgentConfig,
  IEntity,
  IFastPath,
  IMessage,
  IPrecedenceRule,
  ITask,
} from '../schemas/interfaces';

const log = createLogger('mcp-client', config.logLevel);

// ── Default Task Configuration ──────────────────────────────────────────────

/** Default tier for tasks when none is specified. */
const DEFAULT_TASK_TIER: TaskTier = 'M';

/**
 * Get the default maximum errors for a given task tier.
 * Uses the tier's configured maxRetries from the error budget.
 *
 * @param tier - The task tier (S, M, L, XL).
 * @returns The maximum number of errors allowed before task failure.
 */
function getDefaultMaxErrors(tier: TaskTier): number {
  return config.errorBudgets[tier].maxRetries;
}

// ── Tier ordering for fast path max_tier comparison ─────────────────────────

const TIER_ORDER: Record<TaskTier, number> = { S: 1, M: 2, L: 3, XL: 4 };

// ── Connection Pool ─────────────────────────────────────────────────────────

let pool: Pool | null = null;

/**
 * Initialise the PostgreSQL connection pool using orchestrator config.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function init(): void {
  if (pool) {return;}

  const { db } = config;
  pool = new Pool({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    min: db.poolMin,
    max: db.poolMax,
  });

  pool.on('error', (err: Error) => {
    log.error('Unexpected pool error', { error: err.message });
  });

  log.info('Connection pool initialised', { host: db.host, database: db.database });
}

/**
 * Gracefully shut down the connection pool, draining all active connections.
 */
export async function shutdown(): Promise<void> {
  if (!pool) {return;}
  await pool.end();
  pool = null;
  log.info('Connection pool shut down');
}

/** Get the pool instance, throwing if not initialised. */
function getPool(): Pool {
  if (!pool) {throw new Error('MCP client not initialised — call init() first');}
  return pool;
}

/**
 * Check database connectivity and return health status.
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  server_time?: string;
  db?: string;
  error?: string;
}> {
  try {
    const result = await query('SELECT NOW() AS server_time, current_database() AS db');
    const row = result.rows[0] as { server_time: string; db: string };
    return { healthy: true, server_time: String(row.server_time), db: String(row.db) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { healthy: false, error: message };
  }
}

/**
 * Acquire a client from the pool for transaction use.
 * Caller is responsible for calling client.release().
 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/**
 * Execute a parameterised SQL query against the pool.
 *
 * @param sql - SQL statement with $1, $2, etc. placeholders.
 * @param params - Bind parameters.
 * @returns The query result.
 */
export async function query(sql: string, params?: unknown[]): Promise<QueryResult> {
  return getPool().query(sql, params);
}

// ── Agent Queries ───────────────────────────────────────────────────────────

/**
 * Fetch an agent by ID.
 */
export async function getAgent(agentId: string): Promise<IAgent | null> {
  const result = await query(
    `SELECT agent_id, display_name, level, status, reports_to, phase, department, current_config_version_id
     FROM agents WHERE agent_id = $1`,
    [agentId],
  );
  return (result.rows[0] as IAgent | undefined) ?? null;
}

/**
 * Fetch the current active configuration for an agent.
 */
export async function getAgentConfig(agentId: string): Promise<IAgentConfig | null> {
  const result = await query(
    `SELECT config_version_id, agent_id, version, is_current,
            role_definition, scope_inclusions, scope_exclusions, rules,
            commands, escalation_triggers, prohibited_behaviours,
            decision_domains, excluded_decisions
     FROM agent_configs
     WHERE agent_id = $1 AND is_current = true
     ORDER BY version DESC LIMIT 1`,
    [agentId],
  );
  return (result.rows[0] as IAgentConfig | undefined) ?? null;
}

/**
 * Fetch a specific config version by its ID.
 */
export async function getAgentConfigVersion(configVersionId: number): Promise<IAgentConfig | null> {
  const result = await query(
    `SELECT config_version_id, agent_id, version, is_current,
            role_definition, scope_inclusions, scope_exclusions, rules,
            commands, escalation_triggers, prohibited_behaviours,
            decision_domains, excluded_decisions
     FROM agent_configs
     WHERE config_version_id = $1`,
    [configVersionId],
  );
  return (result.rows[0] as IAgentConfig | undefined) ?? null;
}

// ── Fast Path & Precedence ──────────────────────────────────────────────────

/**
 * Find a fast path matching the given task type and tier.
 * A fast path matches if its max_tier >= the requested tier.
 */
export async function getFastPath(taskType: string, tier: TaskTier): Promise<IFastPath | null> {
  const result = await query(
    `SELECT path_id, task_type, max_tier, route, skipped_agents
     FROM fast_paths
     WHERE task_type = $1`,
    [taskType],
  );

  const requestedOrder = TIER_ORDER[tier];

  for (const row of result.rows) {
    const fp = row as IFastPath;
    if (TIER_ORDER[fp.max_tier] >= requestedOrder) {
      return fp;
    }
  }
  return null;
}

/**
 * Fetch all active precedence rules, ordered by rule_id.
 */
export async function getPrecedenceRules(): Promise<IPrecedenceRule[]> {
  const result = await query(
    `SELECT rule_id, decision_domain, primary_authority, secondary_authority, resolution_protocol
     FROM precedence_rules
     ORDER BY rule_id`,
  );
  return result.rows as IPrecedenceRule[];
}

// ── Entity Queries ──────────────────────────────────────────────────────────

/**
 * Fetch the current version of an entity by its key.
 */
export async function getEntityByKey(entityKey: string): Promise<IEntity | null> {
  const result = await query(
    `SELECT entity_id, entity_type, entity_key, project, module, version,
            is_current, content, content_summary, tags, parent_version_id,
            created_by, validated_by, created_at
     FROM entities
     WHERE entity_key = $1 AND is_current = true
     LIMIT 1`,
    [entityKey],
  );
  return (result.rows[0] as IEntity | undefined) ?? null;
}

// ── Task Queue ──────────────────────────────────────────────────────────────

/**
 * Get the next available queue position.
 */
export async function getNextQueuePosition(): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(queue_position), 0) + 1 AS next_pos FROM tasks WHERE status = 'QUEUED'`,
  );
  return (result.rows[0] as { next_pos: number }).next_pos;
}

/**
 * Fetch all queued tasks, ordered by urgency then queue position.
 */
export async function getQueuedTasks(): Promise<ITask[]> {
  const result = await query(
    `SELECT task_id, tier, task_type, project, module, instruction, status,
            queue_position, assigned_agent, delegated_by, token_budget,
            tokens_consumed, error_count, max_errors, output,
            validation_summary, expected_output_schema, classification_reasoning,
            is_urgent, created_at, started_at, completed_at
     FROM tasks
     WHERE status = 'QUEUED'
     ORDER BY is_urgent DESC, queue_position ASC`,
  );
  return result.rows as ITask[];
}

/**
 * Fetch a single task by ID.
 */
export async function getTask(taskId: number): Promise<ITask | null> {
  const result = await query(
    `SELECT task_id, tier, task_type, project, module, instruction, status,
            queue_position, assigned_agent, delegated_by, token_budget,
            tokens_consumed, error_count, max_errors, output,
            validation_summary, expected_output_schema, classification_reasoning,
            is_urgent, created_at, started_at, completed_at
     FROM tasks
     WHERE task_id = $1`,
    [taskId],
  );
  return (result.rows[0] as ITask | undefined) ?? null;
}

/**
 * Create a new task. Auto-generates created_at timestamp.
 * Uses config-based defaults for tier and max_errors.
 *
 * @param data - Partial task data (tier, instruction, etc.).
 * @returns The fully created task row.
 */
export async function createTask(data: Partial<ITask>): Promise<ITask> {
  // Use default tier if not specified, then derive max_errors from tier's error budget
  const tier = data.tier ?? DEFAULT_TASK_TIER;
  const maxErrors = data.max_errors ?? getDefaultMaxErrors(tier);

  const result = await query(
    `INSERT INTO tasks (
       tier, task_type, project, module, instruction, status,
       queue_position, assigned_agent, delegated_by, token_budget,
       tokens_consumed, error_count, max_errors, output,
       expected_output_schema, classification_reasoning, is_urgent, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
     RETURNING *`,
    [
      tier,
      data.task_type ?? 'unknown',
      data.project ?? null,
      data.module ?? null,
      data.instruction ?? '',
      data.status ?? 'QUEUED',
      data.queue_position ?? null,
      data.assigned_agent ?? null,
      data.delegated_by ?? null,
      data.token_budget ?? null,
      data.tokens_consumed ?? 0,
      data.error_count ?? 0,
      maxErrors,
      data.output ?? null,
      data.expected_output_schema ?? null,
      data.classification_reasoning ?? null,
      data.is_urgent ?? false,
    ],
  );
  return result.rows[0] as ITask;
}

/**
 * Update a task with the given fields.
 * If tier is updated without max_errors, automatically sets max_errors based on new tier's error budget.
 *
 * @param taskId - The task ID to update.
 * @param updates - Partial task data to update.
 */
export async function updateTask(taskId: number, updates: Partial<ITask>): Promise<void> {
  // If tier is being updated but max_errors is not, derive max_errors from the new tier
  if (updates.tier && !('max_errors' in updates)) {
    updates = { ...updates, max_errors: getDefaultMaxErrors(updates.tier) };
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const allowed: Array<keyof ITask> = [
    'tier', 'task_type', 'project', 'module', 'instruction', 'status',
    'queue_position', 'assigned_agent', 'delegated_by', 'token_budget',
    'tokens_consumed', 'error_count', 'max_errors', 'output',
    'validation_summary', 'expected_output_schema', 'classification_reasoning',
    'is_urgent', 'started_at', 'completed_at',
  ];

  for (const key of allowed) {
    if (key in updates) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {return;}

  values.push(taskId);
  await query(
    `UPDATE tasks SET ${setClauses.join(', ')} WHERE task_id = $${paramIndex}`,
    values,
  );
}

// ── Messages ────────────────────────────────────────────────────────────────

/**
 * Create an inter-agent message record.
 */
export async function createMessage(data: Partial<IMessage>): Promise<IMessage> {
  const result = await query(
    `INSERT INTO messages (
       task_id, from_agent, to_agent, message_type, payload,
       predecessor_summary, validation_summary, is_fast_path,
       fast_path_id, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      data.task_id ?? 0,
      data.from_agent ?? '',
      data.to_agent ?? '',
      data.message_type ?? 'STATUS',
      JSON.stringify(data.payload ?? {}),
      data.predecessor_summary ?? null,
      data.validation_summary ? JSON.stringify(data.validation_summary) : null,
      data.is_fast_path ?? false,
      data.fast_path_id ?? null,
    ],
  );
  return result.rows[0] as IMessage;
}

// ── Validation Results ──────────────────────────────────────────────────────

/** Input shape for creating a validation result record. */
export interface CreateValidationData {
  /** Task ID this validation applies to, or null for standalone validation. */
  taskId: number | null;
  /** Validation tier that was executed. */
  tier: ValidationTier;
  /** Outcome: PASS, FAIL, etc. */
  result: string;
  /** Number of checks/criteria run. */
  checksRun: number;
  /** Number of checks/criteria passed. */
  checksPassed: number;
  /** Per-criterion results (Tier 2). */
  criteriaResults: unknown[];
  /** Model that performed the validation. */
  validatedByModel: string;
  /** Whether primary and cross-check models disagreed. */
  disagreement?: boolean;
  /** Tokens consumed by this validation. */
  tokensConsumed?: number;
  /** Cost in USD for this validation. */
  costUsd?: number;
}

/**
 * Create a validation result record.
 */
export async function createValidationResult(
  data: CreateValidationData,
): Promise<{ validation_id: number }> {
  const result = await query(
    `INSERT INTO validation_results (
       task_id, tier, result, checks_run, checks_passed,
       criteria_results, validated_by_model, disagreement,
       tokens_consumed, cost_usd, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING validation_id`,
    [
      data.taskId,
      data.tier,
      data.result,
      data.checksRun,
      data.checksPassed,
      JSON.stringify(data.criteriaResults),
      data.validatedByModel,
      data.disagreement ?? false,
      data.tokensConsumed ?? 0,
      data.costUsd ?? 0,
    ],
  );
  return result.rows[0] as { validation_id: number };
}

// ── Audit Logging ───────────────────────────────────────────────────────────

/**
 * Write an audit log entry within a transaction.
 *
 * @param client - Transaction client from getClient().
 * @param operation - The CRUD operation being audited.
 * @param tableName - Target table name.
 * @param entityId - Target entity/row ID, or null.
 * @param agentId - Agent performing the operation, or null.
 * @param taskId - Associated task ID, or null.
 * @param contentSize - Size of the content in bytes, or null.
 * @param detail - Arbitrary metadata, or null.
 */
export async function logAudit(
  client: PoolClient,
  operation: AuditOperation,
  tableName: string,
  entityId: number | null,
  agentId: string | null,
  taskId: number | null,
  contentSize: number | null,
  detail: Record<string, unknown> | null,
): Promise<void> {
  await client.query(
    `INSERT INTO audit_log (
       operation, table_name, entity_id, agent_id, task_id,
       content_size, detail, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      operation,
      tableName,
      entityId,
      agentId,
      taskId,
      contentSize,
      detail ? JSON.stringify(detail) : null,
    ],
  );
}
