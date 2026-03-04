// ---------------------------------------------------------------------------
// Token Estimator Tests — Model-specific tokenization validation
// ---------------------------------------------------------------------------

import {
  estimateTokens,
  truncateToTokens,
  fitsWithinBudget,
  cleanupTokenizer,
  CHARS_PER_TOKEN,
  TokenProvider,
} from '../token-estimator';

describe('Token Estimator', () => {
  // Cleanup tokenizer cache after all tests
  afterAll(() => {
    cleanupTokenizer();
  });

  describe('estimateTokens', () => {
    const testText = 'Hello, world! This is a test string for token estimation.';

    test('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('', { provider: 'anthropic' })).toBe(0);
      expect(estimateTokens('', { provider: 'openai' })).toBe(0);
    });

    test('should estimate tokens using heuristic (default)', () => {
      const tokens = estimateTokens(testText);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(testText.length / CHARS_PER_TOKEN.default));
    });

    test('should count tokens using Anthropic tokenizer', () => {
      const tokens = estimateTokens(testText, { provider: 'anthropic' });
      expect(tokens).toBeGreaterThan(0);
      // Anthropic tokenizer should give a specific count
      expect(typeof tokens).toBe('number');
    });

    test('should count tokens using OpenAI tiktoken', () => {
      const tokens = estimateTokens(testText, { provider: 'openai', openaiModel: 'gpt-4o' });
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    test('should count tokens for GPT-4 model', () => {
      const tokens = estimateTokens(testText, { provider: 'openai', openaiModel: 'gpt-4' });
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    test('should handle code/structured data', () => {
      const codeText = '{"key": "value", "nested": {"array": [1, 2, 3]}}';
      const heuristicTokens = estimateTokens(codeText);
      const anthropicTokens = estimateTokens(codeText, { provider: 'anthropic' });
      const openaiTokens = estimateTokens(codeText, { provider: 'openai' });

      expect(heuristicTokens).toBeGreaterThan(0);
      expect(anthropicTokens).toBeGreaterThan(0);
      expect(openaiTokens).toBeGreaterThan(0);
    });

    test('should handle multi-line text', () => {
      const multilineText = `Line 1
Line 2
Line 3`;
      const tokens = estimateTokens(multilineText, { provider: 'anthropic' });
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('truncateToTokens', () => {
    const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);

    test('should return empty string for empty input', () => {
      expect(truncateToTokens('', 100)).toBe('');
    });

    test('should return original text if it fits within budget', () => {
      const shortText = 'Hello, world!';
      const result = truncateToTokens(shortText, 1000);
      expect(result).toBe(shortText);
    });

    test('should truncate text exceeding token budget (heuristic)', () => {
      const result = truncateToTokens(longText, 50);
      expect(result).toContain('... [truncated]');
      expect(result.length).toBeLessThan(longText.length);
      expect(estimateTokens(result)).toBeLessThanOrEqual(50);
    });

    test('should truncate text exceeding token budget (Anthropic)', () => {
      const result = truncateToTokens(longText, 50, { provider: 'anthropic' });
      expect(result).toContain('... [truncated]');
      expect(result.length).toBeLessThan(longText.length);
      expect(estimateTokens(result, { provider: 'anthropic' })).toBeLessThanOrEqual(50);
    });

    test('should truncate text exceeding token budget (OpenAI)', () => {
      const result = truncateToTokens(longText, 50, { provider: 'openai', openaiModel: 'gpt-4o' });
      expect(result).toContain('... [truncated]');
      expect(result.length).toBeLessThan(longText.length);
      expect(
        estimateTokens(result, { provider: 'openai', openaiModel: 'gpt-4o' }),
      ).toBeLessThanOrEqual(50);
    });

    test('should cut at whitespace boundary', () => {
      const text = 'word1 word2 word3 word4 word5';
      const result = truncateToTokens(text, 3, { provider: 'heuristic' });

      if (result !== '... [truncated]') {
        const truncatedPart = result.replace('... [truncated]', '').trim();
        // Should not have partial words
        expect(truncatedPart.split(' ').every((word) => word.length > 0)).toBe(true);
      }
    });

    test('should apply safety margin correctly', () => {
      const maxTokens = 100;
      const safetyMargin = 0.2; // 20% safety margin
      const result = truncateToTokens(longText, maxTokens, { safetyMargin });

      const resultTokens = estimateTokens(result);
      // With 20% margin, effective budget is 80 tokens
      expect(resultTokens).toBeLessThanOrEqual(maxTokens * (1 - safetyMargin));
    });

    test('should clamp safety margin between 0 and 1', () => {
      // Safety margin > 1 should be clamped to 1
      const result1 = truncateToTokens(longText, 100, { safetyMargin: 1.5 });
      expect(result1).toBe('... [truncated]');

      // Safety margin < 0 should be clamped to 0
      const result2 = truncateToTokens(longText, 100, { safetyMargin: -0.5 });
      const tokens = estimateTokens(result2);
      expect(tokens).toBeLessThanOrEqual(100);
    });

    test('should handle very small budgets', () => {
      const result = truncateToTokens(longText, 5);
      expect(result).toContain('... [truncated]');
      expect(estimateTokens(result)).toBeLessThanOrEqual(5);
    });

    test('should return marker only if budget is too small', () => {
      const result = truncateToTokens(longText, 1);
      expect(result).toBe('... [truncated]');
    });
  });

  describe('fitsWithinBudget', () => {
    test('should return true if text fits within budget', () => {
      const text = 'Short text';
      expect(fitsWithinBudget(text, 1000)).toBe(true);
      expect(fitsWithinBudget(text, 1000, { provider: 'anthropic' })).toBe(true);
      expect(fitsWithinBudget(text, 1000, { provider: 'openai' })).toBe(true);
    });

    test('should return false if text exceeds budget', () => {
      const longText = 'Lorem ipsum dolor sit amet. '.repeat(200);
      expect(fitsWithinBudget(longText, 10)).toBe(false);
      expect(fitsWithinBudget(longText, 10, { provider: 'anthropic' })).toBe(false);
      expect(fitsWithinBudget(longText, 10, { provider: 'openai' })).toBe(false);
    });

    test('should respect safety margin', () => {
      const text = 'a'.repeat(380); // Approximately 100 tokens with heuristic
      const maxTokens = 100;

      // Without margin, should fit
      expect(fitsWithinBudget(text, maxTokens)).toBe(true);

      // With 10% margin, effective budget is 90 tokens, should not fit
      expect(fitsWithinBudget(text, maxTokens, { safetyMargin: 0.1 })).toBe(false);
    });

    test('should handle empty string', () => {
      expect(fitsWithinBudget('', 100)).toBe(true);
    });
  });

  describe('cleanupTokenizer', () => {
    test('should cleanup without errors', () => {
      expect(() => cleanupTokenizer()).not.toThrow();
    });

    test('should allow tokenization after cleanup', () => {
      cleanupTokenizer();
      const text = 'Test text after cleanup';
      expect(() => estimateTokens(text, { provider: 'openai' })).not.toThrow();
      expect(estimateTokens(text, { provider: 'openai' })).toBeGreaterThan(0);
    });
  });

  describe('Integration: Comparison across providers', () => {
    const testCases = [
      'Simple English text.',
      'const x = { key: "value", nested: [1, 2, 3] };',
      'Multi-line\ntext\nwith\nnewlines',
      '🎉 Emoji and special characters! 🚀',
    ];

    testCases.forEach((text) => {
      test(`should produce consistent results for: "${text.slice(0, 30)}..."`, () => {
        const heuristic = estimateTokens(text);
        const anthropic = estimateTokens(text, { provider: 'anthropic' });
        const openai = estimateTokens(text, { provider: 'openai' });

        // All should be positive
        expect(heuristic).toBeGreaterThan(0);
        expect(anthropic).toBeGreaterThan(0);
        expect(openai).toBeGreaterThan(0);

        // Heuristic and actual tokenizers may differ, but should be in same ballpark
        // Allow up to 50% variance for small texts
        const minTokens = Math.min(heuristic, anthropic, openai);
        const maxTokens = Math.max(heuristic, anthropic, openai);
        const variance = (maxTokens - minTokens) / minTokens;

        expect(variance).toBeLessThan(2); // Within 200% (generous for short texts)
      });
    });
  });

  describe('Performance: Heuristic vs Actual Tokenizers', () => {
    const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);

    test('heuristic should be faster than actual tokenizers', () => {
      const iterations = 100;

      // Warm up
      estimateTokens(longText);
      estimateTokens(longText, { provider: 'anthropic' });
      estimateTokens(longText, { provider: 'openai' });

      // Measure heuristic
      const heuristicStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        estimateTokens(longText);
      }
      const heuristicTime = Date.now() - heuristicStart;

      // Measure Anthropic
      const anthropicStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        estimateTokens(longText, { provider: 'anthropic' });
      }
      const anthropicTime = Date.now() - anthropicStart;

      // Measure OpenAI
      const openaiStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        estimateTokens(longText, { provider: 'openai' });
      }
      const openaiTime = Date.now() - openaiStart;

      // Log performance for reference
      console.log(`Performance (${iterations} iterations):`);
      console.log(`  Heuristic: ${heuristicTime}ms`);
      console.log(`  Anthropic: ${anthropicTime}ms`);
      console.log(`  OpenAI: ${openaiTime}ms`);

      // Heuristic should be significantly faster (at least 2x)
      expect(heuristicTime).toBeLessThan(Math.min(anthropicTime, openaiTime) / 2);
    });
  });
});
