// ---------------------------------------------------------------------------
// Token Estimation — character-based heuristic, truncation helper
// ---------------------------------------------------------------------------

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
const CHARS_PER_TOKEN = 3.8;

/**
 * Estimate the token count for a string using a character-based heuristic.
 *
 * @param text - The input text to estimate.
 * @returns Estimated token count (rounded up).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Truncate text to fit within a token budget.
 *
 * Cuts at the last whitespace boundary before the character limit to avoid
 * splitting words. Appends "... [truncated]" if truncation occurred.
 *
 * @param text - The input text to truncate.
 * @param maxTokens - Maximum token budget.
 * @returns The truncated text, or the original if it fits.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  if (!text) return '';

  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN);

  if (text.length <= maxChars) return text;

  // Reserve space for the truncation marker
  const marker = '... [truncated]';
  const targetLength = maxChars - marker.length;

  if (targetLength <= 0) return marker;

  // Find the last whitespace boundary before the limit
  let cutPoint = targetLength;
  while (cutPoint > 0 && text[cutPoint] !== ' ' && text[cutPoint] !== '\n') {
    cutPoint--;
  }

  // If no whitespace found, hard-cut at the character limit
  if (cutPoint === 0) {
    cutPoint = targetLength;
  }

  return text.slice(0, cutPoint) + marker;
}

/**
 * Check whether text fits within a token budget.
 *
 * @param text - The input text to check.
 * @param maxTokens - Maximum token budget.
 * @returns True if the estimated token count is within budget.
 */
export function fitsWithinBudget(text: string, maxTokens: number): boolean {
  return estimateTokens(text) <= maxTokens;
}
