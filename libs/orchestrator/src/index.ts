// ---------------------------------------------------------------------------
// @libs/orchestrator — Public API
// ---------------------------------------------------------------------------
//
// Barrel exports for the Quiz2Biz orchestrator library.
// Import from '@libs/orchestrator' to access all public functionality.
// ---------------------------------------------------------------------------

// ── Config ──────────────────────────────────────────────────────────────────

export { config, validateConfig, DEFAULT_TIER_BUDGETS, DEFAULT_PROMPT_BUDGET, DEFAULT_ERROR_BUDGETS } from './config';
export type { IOrchestratorConfig, IPromptBudget, IErrorBudget } from './config/interfaces';
export type {
  TaskTier,
  TaskStatus,
  MessageType,
  AgentLevel,
  AgentStatus,
  ValidationTier,
  ValidationResult,
  LogLevel,
  AuditOperation,
} from './config/interfaces';

// ── Schemas ─────────────────────────────────────────────────────────────────

export type {
  IAgent,
  IAgentConfig,
  ITask,
  IEntity,
  IMessage,
  IValidationSummary,
  ICriterionResult,
  IRoute,
  IClassification,
  IFastPath,
  IPrecedenceRule,
  IQualityScore,
  IOrchestratorResult,
} from './schemas/interfaces';

export {
  calculateOverallScore,
  determineConfidence,
  buildQualityScore,
  QUALITY_WEIGHTS,
} from './schemas/quality-score';

export {
  validateMessage,
  buildDelegateMessage,
  buildReportMessage,
  buildEscalateMessage,
  buildStatusMessage,
  buildRedirectMessage,
  buildValidationSummary,
  buildEmptyValidationSummary,
  getOverallValidationResult,
  wasTierExecuted,
} from './schemas/message';
export type {
  IMessageValidationError,
  IMessageValidationResult,
  ITier1Input,
  ITier2Input,
  ITier3Input,
} from './schemas/message';

export {
  DOCUMENT_SCHEMAS,
  getDocumentSchema,
  listDocumentSchemas,
  validateDocumentStructure,
  calculateDocumentPrice,
} from './schemas/document-types';
export type {
  DocumentFormat,
  DocumentSlug,
  IDocumentSection,
  IStandardReference,
  IDocumentTypeSchema,
  IDocumentValidationResult,
} from './schemas/document-types';

// ── MCP Database Client ─────────────────────────────────────────────────────

export {
  init as mcpInit,
  shutdown as mcpShutdown,
  healthCheck as mcpHealthCheck,
  getClient as mcpGetClient,
  query as mcpQuery,
  getAgent,
  getAgentConfig,
  getAgentConfigVersion,
  getFastPath,
  getPrecedenceRules,
  getEntityByKey,
  getNextQueuePosition,
  getQueuedTasks,
  getTask,
  createTask,
  updateTask,
  createMessage,
  createValidationResult,
  logAudit,
} from './mcp/client';
export type { CreateValidationData } from './mcp/client';

// ── Utils ───────────────────────────────────────────────────────────────────

export { createLogger } from './utils/logger';
export type { ILogger, LogMeta } from './utils/logger';

export {
  estimateTokens,
  truncateToTokens,
  fitsWithinBudget,
  cleanupTokenizer,
  CHARS_PER_TOKEN,
} from './utils/token-estimator';
export type { TokenProvider, TokenEstimationOptions } from './utils/token-estimator';
