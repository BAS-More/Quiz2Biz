// ---------------------------------------------------------------------------
// Token Estimation — Model-specific tokenization with fallback heuristics
// ---------------------------------------------------------------------------

import { get_encoding, type Tiktoken } from 'tiktoken';
import { countTokens as anthropicCountTokens } from '@anthropic-ai/tokenizer';

// ── Types ───────────────────────────────────────────────────────────────────

/** Supported AI providers for token estimation. */
export type TokenProvider = 'anthropic' | 'openai' | 'heuristic';

/** Token estimation options. */
export interface TokenEstimationOptions {
  /** AI provider/model to use for accurate tokenization. Defaults to 'heuristic'. */
  provider?: TokenProvider;
  /** OpenAI model name (e.g., 'gpt-4o', 'gpt-4'). Used only when provider is 'openai'. */
  openaiModel?: string;
  /** Safety margin multiplier (0-1). Reduces effective budget to prevent truncation. Default: 0 (no margin). */
  safetyMargin?: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * Average characters per token for English text.
 * Claude and GPT tokenizers average ~3.5–4 chars/token for English prose.
 * We use 3.8 as a conservative middle ground.
 *
 * LIMITATIONS:
 * - This is a rough approximation and may differ significantly for:
 *   • Code (typically 2.5–3 chars/token due to symbols and operators)
 *   • JSON/structured data (variable ratio depending on key/value density)
 *   • Non-English text (CJK languages may have different tokenization)
 * - Different models have different tokenizers:
 *   • Claude (Anthropic): custom tokenizer
 *   • GPT-4/GPT-3.5 (OpenAI): tiktoken (cl100k_base)
 * - For production use cases requiring precise token counting, consider:
 *   • Using model-specific tokenizer libraries (tiktoken for OpenAI, @anthropic-ai/tokenizer)
 *   • Adding a configurable chars-per-token ratio per model
 *   • Implementing a safety margin (e.g., 10% buffer) to prevent prompt truncation
 *
 * @see https://github.com/openai/tiktoken for OpenAI tokenization
 * @see https://docs.anthropic.com/claude/reference/models for Claude tokenization
 */
const CHARS_PER_TOKEN = {
  /** Conservative fallback for mixed content. */
  default: 3.8,
  /** English prose (Anthropic/OpenAI average). */
  prose: 3.8,
  /** Code, JSON, or structured data (more tokens per char). */
  code: 2.8,
} as const;

/**
 * Encoding cache for tiktoken to avoid repeated initialization overhead.
 * Cleared on module unload via cleanup function.
 */
let tiktokenCache: Tiktoken | null = null;

// ── Tokenization Helpers ────────────────────────────────────────────────────

/**
 * Get or initialize the tiktoken encoder for OpenAI models.
 * Caches the encoder to avoid repeated initialization.
 *
 * @param model - OpenAI model name (e.g., 'gpt-4o', 'gpt-4').
 * @returns The tiktoken encoder instance.
 */
function getTiktokenEncoder(model: string): Tiktoken {
  if (!tiktokenCache) {
    // Map common model names to their encoding
    const encoding = model.startsWith('gpt-4') ? 'cl100k_base' : 'cl100k_base';
    tiktokenCache = get_encoding(encoding);
  }
  return tiktokenCache!;
}

/**
 * Clean up the tiktoken encoder cache.
 * Should be called when shutting down the orchestrator.
 */
export function cleanupTokenizer(): void {
  if (tiktokenCache) {
    tiktokenCache.free();
    tiktokenCache = null;
  }
}

/**
 * Count tokens using the appropriate tokenizer based on provider.
 *
 * @param text - The text to tokenize.
 * @param options - Tokenization options (provider, model, etc.).
 * @returns The exact or estimated token count.
 */
function countTokensInternal(text: string, options: TokenEstimationOptions = {}): number {
  if (!text) return 0;

  const { provider = 'heuristic', openaiModel = 'gpt-4o' } = options;

  try {
    switch (provider) {
      case 'anthropic':
        // Use Anthropic's official tokenizer
        return anthropicCountTokens(text);

      case 'openai': {
        // Use tiktoken for OpenAI models
        const encoder = getTiktokenEncoder(openaiModel);
        return encoder.encode(text).length;
      }

      case 'heuristic':
      default:
        // Fallback to character-based heuristic
        return Math.ceil(text.length / CHARS_PER_TOKEN.default);
    }
  } catch (error) {
    // If tokenizer fails, fall back to heuristic
    console.warn(`Tokenizer failed for provider '${provider}', falling back to heuristic:`, error);
    return Math.ceil(text.length / CHARS_PER_TOKEN.default);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Estimate the token count for a string.
 *
 * **Accuracy:**
 * - `provider: 'anthropic'` — Uses Anthropic's official tokenizer (most accurate for Claude)
 * - `provider: 'openai'` — Uses tiktoken (most accurate for GPT models)
 * - `provider: 'heuristic'` (default) — Character-based estimation (~±15% accuracy)
 *
 * **Limitations:**
 * - Heuristic mode does not account for content type (code vs prose)
 * - Different models within the same provider may have slightly different tokenization
 * - Tokenizer libraries add ~5-10ms latency per call
 *
 * @param text - The input text to estimate.
 * @param options - Tokenization options (provider, model, safety margin).
 * @returns Estimated or exact token count (rounded up).
 *
 * @example
 * ```ts
 * // Fast heuristic (default)
 * const tokens = estimateTokens(prompt);
 *
 * // Accurate for Claude
 * const tokens = estimateTokens(prompt, { provider: 'anthropic' });
 *
 * // Accurate for GPT-4
 * const tokens = estimateTokens(prompt, { provider: 'openai', openaiModel: 'gpt-4o' });
 * ```
 */
export function estimateTokens(text: string, options?: TokenEstimationOptions): number {
  return countTokensInternal(text, options);
}

/**
 * Truncate text to fit within a token budget.
 *
 * Iteratively removes content from the end of the text until it fits within
 * the specified token budget. Cuts at the last whitespace boundary to avoid
 * splitting words. Appends "... [truncated]" if truncation occurred.
 *
 * **Safety Margin:**
 * Use `safetyMargin` (0-1) to reserve buffer space. For example:
 * - `safetyMargin: 0.1` reserves 10% of the budget as a safety buffer
 * - Effective budget = `maxTokens * (1 - safetyMargin)`
 *
 * @param text - The input text to truncate.
 * @param maxTokens - Maximum token budget.
 * @param options - Tokenization options (provider, model, safety margin).
 * @returns The truncated text, or the original if it fits.
 *
 * @example
 * ```ts
 * // Truncate with 10% safety margin for Claude
 * const truncated = truncateToTokens(longText, 4000, {
 *   provider: 'anthropic',
 *   safetyMargin: 0.1
 * });
 * ```
 */
export function truncateToTokens(
  text: string,
  maxTokens: number,
  options?: TokenEstimationOptions,
): string {
  if (!text) return '';

  const { safetyMargin = 0 } = options || {};

  // Apply safety margin to reduce effective budget
  const effectiveMaxTokens = Math.floor(maxTokens * (1 - Math.max(0, Math.min(1, safetyMargin))));

  const currentTokens = countTokensInternal(text, options);
  if (currentTokens <= effectiveMaxTokens) return text;

  // Reserve space for the truncation marker
  const marker = '... [truncated]';
  const markerTokens = countTokensInternal(marker, options);
  const targetTokens = effectiveMaxTokens - markerTokens;

  if (targetTokens <= 0) return marker;

  // Binary search for the optimal cut point
  // Start with a character-based estimate, then refine
  const { provider = 'heuristic' } = options || {};
  const avgCharsPerToken =
    provider === 'heuristic' ? CHARS_PER_TOKEN.default : CHARS_PER_TOKEN.prose;

  let estimatedChars = Math.floor(targetTokens * avgCharsPerToken);
  let low = 0;
  let high = Math.min(text.length, estimatedChars * 2);
  let bestCut = 0;

  // Binary search to find the longest substring that fits
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const substring = text.slice(0, mid);
    const tokens = countTokensInternal(substring, options);

    if (tokens <= targetTokens) {
      bestCut = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (bestCut === 0) return marker;

  // Find the last whitespace boundary before the cut point
  let cutPoint = bestCut;
  while (cutPoint > 0 && text[cutPoint] !== ' ' && text[cutPoint] !== '\n') {
    cutPoint--;
  }

  // If no whitespace found, use the best cut point
  if (cutPoint === 0) {
    cutPoint = bestCut;
  }

  return text.slice(0, cutPoint) + marker;
}

/**
 * Check whether text fits within a token budget.
 *
 * @param text - The input text to check.
 * @param maxTokens - Maximum token budget.
 * @param options - Tokenization options (provider, model, safety margin).
 * @returns True if the estimated token count is within budget.
 *
 * @example
 * ```ts
 * if (fitsWithinBudget(prompt, 4000, { provider: 'anthropic', safetyMargin: 0.1 })) {
 *   // Safe to send to Claude
 * }
 * ```
 */
export function fitsWithinBudget(
  text: string,
  maxTokens: number,
  options?: TokenEstimationOptions,
): boolean {
  const { safetyMargin = 0 } = options || {};
  const effectiveMaxTokens = Math.floor(maxTokens * (1 - Math.max(0, Math.min(1, safetyMargin))));
  return countTokensInternal(text, options) <= effectiveMaxTokens;
}

// ── Re-exports for Convenience ──────────────────────────────────────────────

export { CHARS_PER_TOKEN };
