// ---------------------------------------------------------------------------
// Orchestrator Config — environment loading, defaults, validation
// ---------------------------------------------------------------------------

import type {
  IOrchestratorConfig,
  IPromptBudget,
  IErrorBudget,
  TaskTier,
  LogLevel,
} from './interfaces';
import { createLogger } from '../utils/logger';

// Create a basic logger for config validation (before full config is available)
const log = createLogger('config', 'info');

// ── Defaults ────────────────────────────────────────────────────────────────

/** Default token budgets per task tier. */
const DEFAULT_TIER_BUDGETS: Record<TaskTier, number> = {
  S: 4_000,
  M: 25_000,
  L: 60_000,
  XL: 120_000,
};

/** Default 5-section prompt token budget allocation. */
const DEFAULT_PROMPT_BUDGET: IPromptBudget = {
  totalMax: 13_500,
  identity: 2_000,
  rules: 2_000,
  currentTask: 3_000,
  context: 4_000,
  history: 2_500,
};

/** Default error budgets per task tier. */
const DEFAULT_ERROR_BUDGETS: Record<TaskTier, IErrorBudget> = {
  S: { maxRetries: 1, maxCorrectionCycles: 0 },
  M: { maxRetries: 3, maxCorrectionCycles: 2 },
  L: { maxRetries: 3, maxCorrectionCycles: 2 },
  XL: { maxRetries: 5, maxCorrectionCycles: 3 },
};

/** Valid log levels for runtime filtering. */
const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'] as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read an environment variable with Q2B_ prefix, falling back to a
 * secondary key (for compatibility with the app's existing .env) and
 * then to a default value.
 */
function env(primary: string, fallback?: string, defaultValue?: string): string {
  const value =
    process.env[`Q2B_${primary}`] ?? (fallback ? process.env[fallback] : undefined) ?? defaultValue;
  return value ?? '';
}

/** Parse an integer from env, returning the default if missing or NaN. */
function envInt(primary: string, fallback: string | undefined, defaultValue: number): number {
  const raw = env(primary, fallback);
  if (raw === '') return defaultValue;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/** Parse a boolean from env — "true"/"1" are truthy. */
function envBool(primary: string, fallback: string | undefined, defaultValue: boolean): boolean {
  const raw = env(primary, fallback);
  if (raw === '') return defaultValue;
  return raw === 'true' || raw === '1';
}

// ── Config Builder ──────────────────────────────────────────────────────────

/** Build the orchestrator configuration from environment variables. */
function buildConfig(): IOrchestratorConfig {
  const logLevel = env('LOG_LEVEL', 'LOG_LEVEL', 'info') as LogLevel;

  return {
    anthropic: {
      apiKey: env('ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'),
      model: env('ANTHROPIC_MODEL', undefined, 'claude-sonnet-4-20250514'),
      maxTokens: envInt('ANTHROPIC_MAX_TOKENS', undefined, 16_384),
    },

    openai: {
      apiKey: env('OPENAI_API_KEY', 'OPENAI_API_KEY'),
      model: env('OPENAI_MODEL', undefined, 'gpt-4o'),
    },

    db: {
      host: env('DATABASE_HOST', undefined, 'localhost'),
      port: envInt('DATABASE_PORT', undefined, 5432),
      database: env('DATABASE_NAME', undefined, 'orchestrator'),
      user: env('DATABASE_USER', undefined, 'postgres'),
      password: env('DATABASE_PASSWORD', undefined, ''),
      ssl: envBool('DATABASE_SSL', undefined, false),
      poolMin: envInt('DATABASE_POOL_MIN', undefined, 2),
      poolMax: envInt('DATABASE_POOL_MAX', 'DATABASE_CONNECTION_LIMIT', 10),
    },

    promptBudget: {
      totalMax: envInt('PROMPT_BUDGET_TOTAL', undefined, DEFAULT_PROMPT_BUDGET.totalMax),
      identity: envInt('PROMPT_BUDGET_IDENTITY', undefined, DEFAULT_PROMPT_BUDGET.identity),
      rules: envInt('PROMPT_BUDGET_RULES', undefined, DEFAULT_PROMPT_BUDGET.rules),
      currentTask: envInt('PROMPT_BUDGET_TASK', undefined, DEFAULT_PROMPT_BUDGET.currentTask),
      context: envInt('PROMPT_BUDGET_CONTEXT', undefined, DEFAULT_PROMPT_BUDGET.context),
      history: envInt('PROMPT_BUDGET_HISTORY', undefined, DEFAULT_PROMPT_BUDGET.history),
    },

    tierBudgets: {
      S: envInt('TIER_BUDGET_S', undefined, DEFAULT_TIER_BUDGETS.S),
      M: envInt('TIER_BUDGET_M', undefined, DEFAULT_TIER_BUDGETS.M),
      L: envInt('TIER_BUDGET_L', undefined, DEFAULT_TIER_BUDGETS.L),
      XL: envInt('TIER_BUDGET_XL', undefined, DEFAULT_TIER_BUDGETS.XL),
    },

    errorBudgets: {
      S: {
        maxRetries: envInt('ERROR_RETRIES_S', undefined, DEFAULT_ERROR_BUDGETS.S.maxRetries),
        maxCorrectionCycles: envInt(
          'ERROR_CYCLES_S',
          undefined,
          DEFAULT_ERROR_BUDGETS.S.maxCorrectionCycles,
        ),
      },
      M: {
        maxRetries: envInt('ERROR_RETRIES_M', undefined, DEFAULT_ERROR_BUDGETS.M.maxRetries),
        maxCorrectionCycles: envInt(
          'ERROR_CYCLES_M',
          undefined,
          DEFAULT_ERROR_BUDGETS.M.maxCorrectionCycles,
        ),
      },
      L: {
        maxRetries: envInt('ERROR_RETRIES_L', undefined, DEFAULT_ERROR_BUDGETS.L.maxRetries),
        maxCorrectionCycles: envInt(
          'ERROR_CYCLES_L',
          undefined,
          DEFAULT_ERROR_BUDGETS.L.maxCorrectionCycles,
        ),
      },
      XL: {
        maxRetries: envInt('ERROR_RETRIES_XL', undefined, DEFAULT_ERROR_BUDGETS.XL.maxRetries),
        maxCorrectionCycles: envInt(
          'ERROR_CYCLES_XL',
          undefined,
          DEFAULT_ERROR_BUDGETS.XL.maxCorrectionCycles,
        ),
      },
    },

    orchestrator: {
      maxCorrectionCycles: envInt('MAX_CORRECTION_CYCLES', undefined, 2),
      queuePollIntervalMs: envInt('QUEUE_POLL_INTERVAL_MS', undefined, 1_000),
      taskTimeoutMs: envInt('TASK_TIMEOUT_MS', undefined, 300_000),
    },

    logLevel: LOG_LEVELS.includes(logLevel) ? logLevel : 'info',
  };
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Required environment variables — config key, description. */
const REQUIRED_VARS: ReadonlyArray<{
  key: keyof IOrchestratorConfig;
  path: string;
  description: string;
}> = [
  {
    key: 'anthropic',
    path: 'anthropic.apiKey',
    description: 'Anthropic API key (Q2B_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY)',
  },
];

/**
 * Validate that all required configuration values are present.
 * Throws an Error listing all missing variables if any are absent.
 */
export function validateConfig(cfg: IOrchestratorConfig): void {
  const missing: string[] = [];

  if (!cfg.anthropic.apiKey) {
    missing.push('Anthropic API key (Q2B_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY)');
  }

  // OpenAI key is optional but should warn if missing for Tier 2 validation
  if (!cfg.openai.apiKey) {
    log.warn('OpenAI API key not configured — Tier 2 cross-model validation will be unavailable', {
      env: 'Q2B_OPENAI_API_KEY or OPENAI_API_KEY',
    });
  }

  if (!cfg.db.host) {
    missing.push('Database host (Q2B_DATABASE_HOST)');
  }

  if (!cfg.db.password && cfg.db.host !== 'localhost' && cfg.db.host !== '127.0.0.1') {
    missing.push('Database password (Q2B_DATABASE_PASSWORD) — required for non-local databases');
  }

  if (missing.length > 0) {
    throw new Error(
      `Orchestrator configuration validation failed.\n\nMissing required values:\n${missing.map((m) => `  - ${m}`).join('\n')}`,
    );
  }
}

// ── Export ───────────────────────────────────────────────────────────────────

/** Singleton orchestrator configuration, built from environment variables. */
export const config: IOrchestratorConfig = buildConfig();

export { DEFAULT_TIER_BUDGETS, DEFAULT_PROMPT_BUDGET, DEFAULT_ERROR_BUDGETS };
