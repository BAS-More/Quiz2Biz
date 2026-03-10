import { ClaudeAdapter } from './claude.adapter';

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    adapter = new ClaudeAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be unavailable when API key is not set', () => {
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should have provider set to claude', () => {
      expect(adapter.provider).toBe('claude');
    });

    it('should be available when API key is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const adapterWithKey = new ClaudeAdapter();
      expect(adapterWithKey.isAvailable()).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should accept provider configuration', () => {
      const config = {
        modelMap: { chat: 'claude-3-haiku' },
        config: {
          maxTokens: { chat: 2048 },
          temperature: { chat: 0.5 },
          pricing: { inputPer1kTokens: 0.001, outputPer1kTokens: 0.005, currency: 'USD' },
        },
      } as any;

      expect(() => adapter.setConfig(config)).not.toThrow();
    });
  });

  describe('generate', () => {
    it('should throw when adapter is not available', async () => {
      const request = {
        taskType: 'chat',
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
      } as any;

      await expect(adapter.generate(request)).rejects.toThrow('Claude adapter not available');
    });
  });

  describe('generateStream', () => {
    it('should throw when adapter is not available', async () => {
      const request = {
        taskType: 'chat',
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'Be helpful',
      } as any;

      const generator = adapter.generateStream(request);
      await expect(generator.next()).rejects.toThrow('Claude adapter not available');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      const result = adapter.estimateTokens('Hello world'); // 11 chars
      expect(result).toBe(Math.ceil(11 / 4)); // 3
    });

    it('should handle empty string', () => {
      expect(adapter.estimateTokens('')).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(1000);
      expect(adapter.estimateTokens(longText)).toBe(250);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost with default pricing', () => {
      const usage = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };

      const cost = adapter.calculateCost(usage);

      expect(cost.inputCost).toBe(0.003); // 1000/1000 * 0.003
      expect(cost.outputCost).toBe(0.0075); // 500/1000 * 0.015
      expect(cost.totalCost).toBeCloseTo(0.0105, 4);
      expect(cost.currency).toBe('USD');
    });

    it('should use config pricing when set', () => {
      adapter.setConfig({
        config: {
          pricing: { inputPer1kTokens: 0.001, outputPer1kTokens: 0.005, currency: 'EUR' },
        },
      } as any);

      const usage = { inputTokens: 2000, outputTokens: 1000, totalTokens: 3000 };
      const cost = adapter.calculateCost(usage);

      expect(cost.inputCost).toBe(0.002); // 2000/1000 * 0.001
      expect(cost.outputCost).toBe(0.005); // 1000/1000 * 0.005
      expect(cost.currency).toBe('EUR');
    });

    it('should handle zero tokens', () => {
      const cost = adapter.calculateCost({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });

      expect(cost.totalCost).toBe(0);
    });
  });
});
