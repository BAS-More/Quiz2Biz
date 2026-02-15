// ---------------------------------------------------------------------------
// Orchestrator Config — Type Aliases & Interfaces
// ---------------------------------------------------------------------------

// ── Type Aliases ────────────────────────────────────────────────────────────

/** Task size tier — determines token budget, error budget, and routing. */
export type TaskTier = 'S' | 'M' | 'L' | 'XL';

/** Lifecycle status of a task in the queue. */
export type TaskStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETE' | 'FAILED' | 'ESCALATED';

/** Inter-agent message types following the 5-type protocol. */
export type MessageType = 'DELEGATE' | 'REPORT' | 'ESCALATE' | 'REDIRECT' | 'STATUS';

/** Agent hierarchy level — L1 (COO) through L4 (specialist). */
export type AgentLevel = 'L1' | 'L2' | 'L3' | 'L4';

/** Runtime status of an agent. */
export type AgentStatus = 'IDLE' | 'ACTIVE' | 'ERROR' | 'DISABLED';

/** Validation cascade tiers — mechanical, cross-model, human. */
export type ValidationTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

/** Outcome of a validation check at any tier. */
export type ValidationResult = 'PASS' | 'FAIL' | 'NOT_REQUIRED' | 'AWAITING_APPROVAL';

/** Log severity levels. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Database audit trail operation types. */
export type AuditOperation = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'WRITE' | 'ROLLBACK';

// ── Interfaces ──────────────────────────────────────────────────────────────

/** Token budget allocation for the 5-section prompt template. */
export interface IPromptBudget {
  /** Maximum total tokens across all sections. */
  totalMax: number;
  /** Token budget for identity/role section. */
  identity: number;
  /** Token budget for rules/constraints section. */
  rules: number;
  /** Token budget for the current task instruction. */
  currentTask: number;
  /** Token budget for entity/project context. */
  context: number;
  /** Token budget for conversation history. */
  history: number;
}

/** Per-tier error tolerance configuration. */
export interface IErrorBudget {
  /** Maximum API call retries before failing. */
  maxRetries: number;
  /** Maximum validation-triggered correction cycles. */
  maxCorrectionCycles: number;
}

/** Top-level orchestrator configuration. */
export interface IOrchestratorConfig {
  /** Anthropic API connection settings (primary model). */
  anthropic: {
    /** Anthropic API key. */
    apiKey: string;
    /** Model identifier (e.g. "claude-sonnet-4-20250514"). */
    model: string;
    /** Maximum tokens per API response. */
    maxTokens: number;
  };
  /** OpenAI API connection settings (Tier 2 validation cross-check). */
  openai: {
    /** OpenAI API key. */
    apiKey: string;
    /** Model identifier (e.g. "gpt-4o"). */
    model: string;
  };
  /** PostgreSQL database connection settings. */
  db: {
    /** Database hostname. */
    host: string;
    /** Database port number. */
    port: number;
    /** Database name. */
    database: string;
    /** Database user. */
    user: string;
    /** Database password. */
    password: string;
    /** Whether to use SSL/TLS for the connection. */
    ssl: boolean;
    /** Minimum connections in the pool. */
    poolMin: number;
    /** Maximum connections in the pool. */
    poolMax: number;
  };
  /** Token budget allocation for prompt construction. */
  promptBudget: IPromptBudget;
  /** Maximum token budget per task tier. */
  tierBudgets: Record<TaskTier, number>;
  /** Error tolerance per task tier. */
  errorBudgets: Record<TaskTier, IErrorBudget>;
  /** Orchestrator engine settings. */
  orchestrator: {
    /** Maximum correction cycles before escalation. */
    maxCorrectionCycles: number;
    /** Queue polling interval in milliseconds. */
    queuePollIntervalMs: number;
    /** Task execution timeout in milliseconds. */
    taskTimeoutMs: number;
  };
  /** Minimum log severity to output. */
  logLevel: LogLevel;
}
