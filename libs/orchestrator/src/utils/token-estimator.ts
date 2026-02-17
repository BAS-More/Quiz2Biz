// ---------------------------------------------------------------------------
// Token Estimation — character-based heuristic, truncation helper
// ---------------------------------------------------------------------------

/**
 * Average characters per token for English text.
 * Claude and GPT tokenizers average ~3.5–4 chars/token for English prose.
 * We use 3.8 as a conservative middle ground.
 * 
 * **Limitations:**
 * - This is a heuristic and not exact tokenization
 * - Different models have different tokenizers (Claude vs GPT)
 * - Code, JSON, and structured data have different ratios
 * - Non-English text (especially CJK) may have very different ratios
 * 
 * **For production use**, consider:
 * - Using actual tokenizer libraries (tiktoken for OpenAI, Anthropic's tokenizer)
 * - Making the ratio configurable per model
 * - Adding a safety margin to prevent prompt truncation
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
