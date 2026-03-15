import { OpenAIAdapter } from './openai.adapter';

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    adapter = new OpenAIAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be unavailable when API key is not set', () => {
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should have provider set to openai', () => {
      expect(adapter.provider).toBe('openai');
    });

    it('should be available when API key is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const adapterWithKey = new OpenAIAdapter();
      expect(adapterWithKey.isAvailable()).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should accept provider configuration', () => {
      const config = {
        modelMap: { chat: 'gpt-4o-mini' },
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

      await expect(adapter.generate(request)).rejects.toThrow('OpenAI adapter not available');
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
      await expect(generator.next()).rejects.toThrow('OpenAI adapter not available');
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
      const longText = 'a'.repeat(4000);
      expect(adapter.estimateTokens(longText)).toBe(1000);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost with default pricing', () => {
      const usage = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };

      const cost = adapter.calculateCost(usage);

      expect(cost.inputCost).toBe(0.0025); // 1000/1000 * 0.0025
      expect(cost.outputCost).toBe(0.005); // 500/1000 * 0.01
      expect(cost.totalCost).toBe(0.0075);
      expect(cost.currency).toBe('USD');
    });

    it('should use config pricing when set', () => {
      adapter.setConfig({
        config: {
          pricing: { inputPer1kTokens: 0.002, outputPer1kTokens: 0.008, currency: 'GBP' },
        },
      } as any);

      const usage = { inputTokens: 5000, outputTokens: 2000, totalTokens: 7000 };
      const cost = adapter.calculateCost(usage);

      expect(cost.inputCost).toBe(0.01); // 5000/1000 * 0.002
      expect(cost.outputCost).toBe(0.016); // 2000/1000 * 0.008
      expect(cost.currency).toBe('GBP');
    });

    it('should handle zero tokens', () => {
      const cost = adapter.calculateCost({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });

      expect(cost.totalCost).toBe(0);
    });
  });
});
