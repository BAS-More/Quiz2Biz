/**
 * @fileoverview Tests for feature-flags.config.ts
 */
import {
  getLaunchDarklyConfig,
  getDefaultFeatureFlags,
  getDefaultABTests,
  FeatureFlagService,
  FlagEvaluationContext,
} from './feature-flags.config';

describe('getLaunchDarklyConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default config when no env vars set', () => {
    delete process.env.LAUNCHDARKLY_SDK_KEY;
    delete process.env.LAUNCHDARKLY_PROJECT_KEY;
    delete process.env.LAUNCHDARKLY_OFFLINE;

    const config = getLaunchDarklyConfig();

    expect(config.sdkKey).toBe('');
    expect(config.projectKey).toBe('quiz2biz');
    expect(config.options.offline).toBe(false);
  });

  it('should use env vars when set', () => {
    process.env.LAUNCHDARKLY_SDK_KEY = 'sdk-key-123';
    process.env.LAUNCHDARKLY_CLIENT_SIDE_ID = 'client-id-456';
    process.env.LAUNCHDARKLY_PROJECT_KEY = 'my-project';
    process.env.LAUNCHDARKLY_OFFLINE = 'true';

    const config = getLaunchDarklyConfig();

    expect(config.sdkKey).toBe('sdk-key-123');
    expect(config.clientSideId).toBe('client-id-456');
    expect(config.projectKey).toBe('my-project');
    expect(config.options.offline).toBe(true);
  });

  it('should have correct base URIs', () => {
    const config = getLaunchDarklyConfig();

    expect(config.baseUri).toBe('https://sdk.launchdarkly.com');
    expect(config.eventsUri).toBe('https://events.launchdarkly.com');
    expect(config.streamUri).toBe('https://stream.launchdarkly.com');
  });

  it('should have private attributes configured', () => {
    const config = getLaunchDarklyConfig();

    expect(config.options.privateAttributes).toContain('email');
    expect(config.options.privateAttributes).toContain('password');
    expect(config.options.privateAttributes).toContain('creditCard');
  });

  it('should have correct option defaults', () => {
    const config = getLaunchDarklyConfig();

    expect(config.options.sendEvents).toBe(true);
    expect(config.options.stream).toBe(true);
    expect(config.options.flushInterval).toBe(5000);
    expect(config.options.timeout).toBe(5000);
  });
});

describe('getDefaultFeatureFlags', () => {
  it('should return array of flags', () => {
    const flags = getDefaultFeatureFlags();
    expect(Array.isArray(flags)).toBe(true);
    expect(flags.length).toBeGreaterThan(0);
  });

  it('should have new-questionnaire-flow flag', () => {
    const flags = getDefaultFeatureFlags();
    const flag = flags.find((f) => f.key === 'new-questionnaire-flow');

    expect(flag).toBeDefined();
    expect(flag?.kind).toBe('boolean');
    expect(flag?.defaultValue).toBe(false);
  });

  it('should have ai-suggestions flag with prerequisite', () => {
    const flags = getDefaultFeatureFlags();
    const flag = flags.find((f) => f.key === 'ai-suggestions');

    expect(flag).toBeDefined();
    expect(flag?.prerequisites).toBeDefined();
    expect(flag?.prerequisites?.[0].key).toBe('new-questionnaire-flow');
  });

  it('should have enhanced-heatmap flag', () => {
    const flags = getDefaultFeatureFlags();
    const flag = flags.find((f) => f.key === 'enhanced-heatmap');

    expect(flag).toBeDefined();
    expect(flag?.tags).toContain('ab-test');
  });

  it('should have pricing-page-redesign as string flag', () => {
    const flags = getDefaultFeatureFlags();
    const flag = flags.find((f) => f.key === 'pricing-page-redesign');

    expect(flag).toBeDefined();
    expect(flag?.kind).toBe('string');
    expect(flag?.variations.length).toBe(4);
  });

  it('should have dark-mode flag', () => {
    const flags = getDefaultFeatureFlags();
    const flag = flags.find((f) => f.key === 'dark-mode');

    expect(flag).toBeDefined();
    expect(flag?.tags).toContain('accessibility');
  });

  it('should have external-api-killswitch', () => {
    const flags = getDefaultFeatureFlags();
    const flag = flags.find((f) => f.key === 'external-api-killswitch');

    expect(flag).toBeDefined();
    expect(flag?.tags).toContain('kill-switch');
    expect(flag?.defaultValue).toBe(true);
  });

  it('should have rate-limit-config as json flag', () => {
    const flags = getDefaultFeatureFlags();
    const flag = flags.find((f) => f.key === 'rate-limit-config');

    expect(flag).toBeDefined();
    expect(flag?.kind).toBe('json');
    expect(flag?.defaultValue).toEqual({ requestsPerMinute: 60, burstSize: 10 });
  });

  it('should have environment configs for all flags', () => {
    const flags = getDefaultFeatureFlags();

    flags.forEach((flag) => {
      expect(flag.environments.length).toBe(3);
      const envKeys = flag.environments.map((e) => e.key);
      expect(envKeys).toContain('development');
      expect(envKeys).toContain('staging');
      expect(envKeys).toContain('production');
    });
  });
});

describe('getDefaultABTests', () => {
  it('should return array of A/B tests', () => {
    const tests = getDefaultABTests();
    expect(Array.isArray(tests)).toBe(true);
    expect(tests.length).toBeGreaterThan(0);
  });

  it('should have questionnaire-cta-test', () => {
    const tests = getDefaultABTests();
    const test = tests.find((t) => t.key === 'questionnaire-cta-test');

    expect(test).toBeDefined();
    expect(test?.hypothesis).toContain('CTA button');
    expect(test?.primaryMetric).toBe('questionnaire_completion_rate');
  });

  it('should have onboarding-flow-test', () => {
    const tests = getDefaultABTests();
    const test = tests.find((t) => t.key === 'onboarding-flow-test');

    expect(test).toBeDefined();
    expect(test?.variants.length).toBe(3);
  });

  it('should have control variant in all tests', () => {
    const tests = getDefaultABTests();

    tests.forEach((test) => {
      const control = test.variants.find((v) => v.isControl);
      expect(control).toBeDefined();
    });
  });

  it('should have valid allocation totals', () => {
    const tests = getDefaultABTests();

    tests.forEach((test) => {
      const totalAllocation = test.variants.reduce((sum, v) => sum + v.allocation, 0);
      expect(totalAllocation).toBe(100);
    });
  });
});

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    service = new FeatureFlagService();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should initialize with default flags', () => {
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[FeatureFlags] Initialized with'),
    );
  });

  describe('getBooleanFlag', () => {
    it('should return default value for unknown flag', () => {
      const result = service.getBooleanFlag('unknown-flag', {});
      expect(result).toBe(false);
    });

    it('should return custom default value', () => {
      const result = service.getBooleanFlag('unknown-flag', {}, true);
      expect(result).toBe(true);
    });

    it('should evaluate targeting rules', () => {
      const context: FlagEvaluationContext = {
        userRole: 'beta',
      };

      const result = service.getBooleanFlag('dark-mode', context);
      expect(result).toBe(true);
    });

    it('should return off variation when targeting disabled', () => {
      const context: FlagEvaluationContext = {};
      const result = service.getBooleanFlag('external-api-killswitch', context);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getStringFlag', () => {
    it('should return default value for unknown flag', () => {
      const result = service.getStringFlag('unknown-flag', {});
      expect(result).toBe('');
    });

    it('should return custom default value', () => {
      const result = service.getStringFlag('unknown-flag', {}, 'custom-default');
      expect(result).toBe('custom-default');
    });

    it('should return default for non-string flags', () => {
      const result = service.getStringFlag('dark-mode', {}, 'default');
      expect(result).toBe('default');
    });
  });

  describe('getJsonFlag', () => {
    it('should return default value for unknown flag', () => {
      const defaultValue = { key: 'value' };
      const result = service.getJsonFlag('unknown-flag', {}, defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should evaluate rate-limit-config flag', () => {
      const context: FlagEvaluationContext = {};
      const result = service.getJsonFlag('rate-limit-config', context, {
        requestsPerMinute: 0,
        burstSize: 0,
      });
      expect(result).toHaveProperty('requestsPerMinute');
    });

    it('should return increased limits for enterprise', () => {
      const context: FlagEvaluationContext = {
        subscriptionTier: 'ENTERPRISE',
      };
      const result = service.getJsonFlag('rate-limit-config', context, {
        requestsPerMinute: 60,
        burstSize: 10,
      });
      expect(result.requestsPerMinute).toBe(120);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags for context', () => {
      const context: FlagEvaluationContext = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      const flags = service.getAllFlags(context);

      expect(flags).toHaveProperty('new-questionnaire-flow');
      expect(flags).toHaveProperty('ai-suggestions');
      expect(flags).toHaveProperty('dark-mode');
    });
  });

  describe('track', () => {
    it('should log track event', () => {
      const context: FlagEvaluationContext = { userId: 'user-123' };
      const data = { buttonClicked: true };

      service.track('button_click', context, data);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FeatureFlags] Track event: button_click'),
        expect.objectContaining({ context, data }),
      );
    });
  });

  describe('close', () => {
    it('should log client closed', async () => {
      await service.close();

      expect(consoleSpy).toHaveBeenCalledWith('[FeatureFlags] Client closed');
    });
  });

  describe('targeting rules', () => {
    it('should match email endsWith rule', () => {
      const context: FlagEvaluationContext = {
        email: 'user@quiz2biz.com',
      };

      const result = service.getBooleanFlag('new-questionnaire-flow', context);
      expect(result).toBe(true);
    });

    it('should match userRole in rule', () => {
      const context: FlagEvaluationContext = {
        userRole: 'admin',
      };

      const result = service.getBooleanFlag('dark-mode', context);
      expect(result).toBe(true);
    });

    it('should match subscriptionTier rule', () => {
      const context: FlagEvaluationContext = {
        subscriptionTier: 'ENTERPRISE',
      };

      // ai-suggestions requires new-questionnaire-flow
      const result = service.getBooleanFlag('ai-suggestions', context);
      expect(result).toBe(true);
    });
  });

  describe('rollout evaluation', () => {
    it('should produce consistent results for same user', () => {
      const context: FlagEvaluationContext = {
        userId: 'consistent-user-123',
      };

      const result1 = service.getBooleanFlag('new-questionnaire-flow', context);
      const result2 = service.getBooleanFlag('new-questionnaire-flow', context);

      expect(result1).toBe(result2);
    });

    it('should use email as bucket key if no userId', () => {
      const context: FlagEvaluationContext = {
        email: 'test@example.com',
      };

      const result = service.getBooleanFlag('new-questionnaire-flow', context);
      expect(typeof result).toBe('boolean');
    });
  });

  // =========================================================================
  // Branch Coverage Tests
  // =========================================================================

  describe('branch coverage - matchesClause operators', () => {
    it('should match startsWith operator', () => {
      // Need a flag with a startsWith clause to exercise this branch
      // We use a custom flag injected into the service
      const svc = new FeatureFlagService();
      // Access internal flags map to add a custom flag for testing
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-startswith', {
        key: 'test-startswith',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'starts-rule',
              clauses: [{ attribute: 'email', op: 'startsWith', values: ['admin@'] }],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      expect(svc.getBooleanFlag('test-startswith', { email: 'admin@quiz2biz.com' })).toBe(true);
      expect(svc.getBooleanFlag('test-startswith', { email: 'user@quiz2biz.com' })).toBe(false);
    });

    it('should match contains operator', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-contains', {
        key: 'test-contains',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'contains-rule',
              clauses: [{ attribute: 'email', op: 'contains', values: ['quiz2biz'] }],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      expect(svc.getBooleanFlag('test-contains', { email: 'user@quiz2biz.com' })).toBe(true);
      expect(svc.getBooleanFlag('test-contains', { email: 'user@other.com' })).toBe(false);
    });

    it('should handle negate clause (true branch)', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-negate', {
        key: 'test-negate',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'negate-rule',
              clauses: [
                { attribute: 'email', op: 'endsWith', values: ['@blocked.com'], negate: true },
              ],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      // endsWith matches '@blocked.com', negated -> false, so rule doesn't match
      expect(svc.getBooleanFlag('test-negate', { email: 'user@blocked.com' })).toBe(false);
      // endsWith doesn't match, negated -> true, so rule matches
      expect(svc.getBooleanFlag('test-negate', { email: 'user@allowed.com' })).toBe(true);
    });

    it('should handle default case (unknown operator)', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-unknown-op', {
        key: 'test-unknown-op',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'unknown-rule',
              clauses: [{ attribute: 'email', op: 'lessThan', values: ['z'] }],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      // 'lessThan' is not handled in the switch, should fall to default -> false
      expect(svc.getBooleanFlag('test-unknown-op', { email: 'a@test.com' })).toBe(false);
    });

    it('should return false when attribute value is undefined', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-undefined-attr', {
        key: 'test-undefined-attr',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'undef-rule',
              clauses: [{ attribute: 'email', op: 'in', values: ['test@test.com'] }],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      // no email in context -> attributeValue is undefined -> return false
      expect(svc.getBooleanFlag('test-undefined-attr', { userId: 'user-1' })).toBe(false);
    });
  });

  describe('branch coverage - getAttributeValue switch cases', () => {
    it('should resolve country attribute', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-country', {
        key: 'test-country',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'country-rule',
              clauses: [{ attribute: 'country', op: 'in', values: ['AU'] }],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      expect(svc.getBooleanFlag('test-country', { country: 'AU' })).toBe(true);
      expect(svc.getBooleanFlag('test-country', { country: 'US' })).toBe(false);
    });

    it('should resolve custom attributes via default case', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-custom', {
        key: 'test-custom',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'custom-rule',
              clauses: [{ attribute: 'companySize', op: 'in', values: ['large'] }],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      expect(svc.getBooleanFlag('test-custom', { custom: { companySize: 'large' } })).toBe(true);
      expect(svc.getBooleanFlag('test-custom', { custom: { companySize: 'small' } })).toBe(false);
    });
  });

  describe('branch coverage - evaluateFlag targeting disabled', () => {
    it('should return offVariation value when targeting is disabled', () => {
      // external-api-killswitch has targeting.enabled = false, offVariation = 1 (true)
      const result = service.getBooleanFlag('external-api-killswitch', {});
      expect(result).toBe(true);
    });

    it('should fall back to defaultValue when offVariation index is out of bounds', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-off-oob', {
        key: 'test-off-oob',
        kind: 'boolean',
        defaultValue: false,
        variations: [{ value: true, name: 'On' }],
        targeting: {
          enabled: false,
          rules: [],
          fallthrough: { variation: 0 },
          offVariation: 99, // out of bounds
        },
      });

      // variations[99] is undefined, so ?? defaultValue (false)
      expect(svc.getBooleanFlag('test-off-oob', {})).toBe(false);
    });
  });

  describe('branch coverage - evaluateFlag fallthrough with variation', () => {
    it('should use fallthrough.variation when no rollout and no rules match', () => {
      // ai-suggestions has fallthrough: { variation: 0 } and targeting.enabled = true
      // With a context that doesn't match any rules (not ENTERPRISE)
      const result = service.getBooleanFlag('ai-suggestions', { userRole: 'viewer' });
      expect(result).toBe(false); // variation 0 is false
    });

    it('should fall back to defaultValue when fallthrough variation is undefined and no rollout', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-no-fallthrough', {
        key: 'test-no-fallthrough',
        kind: 'boolean',
        defaultValue: true,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [],
          fallthrough: {},
          offVariation: 0,
        },
      });

      // No rules match, no rollout, no fallthrough.variation -> defaultValue
      expect(svc.getBooleanFlag('test-no-fallthrough', {})).toBe(true);
    });
  });

  describe('branch coverage - evaluateRollout bucket fallthrough', () => {
    it('should return defaultValue when bucket exceeds all cumulative weights', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-rollout-fallthrough', {
        key: 'test-rollout-fallthrough',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [],
          fallthrough: {
            rollout: {
              variations: [
                // Intentionally leave total < 100000 so some buckets fall through
                { variation: 0, weight: 1 },
              ],
            },
          },
          offVariation: 0,
        },
      });

      // Most bucket values will exceed cumulative weight of 1, so they fall through
      // Use anonymous (no userId/email) to get 'anonymous' as bucket key
      const result = svc.getBooleanFlag('test-rollout-fallthrough', {});
      expect(typeof result).toBe('boolean');
    });
  });

  describe('branch coverage - getJsonFlag with non-json kind', () => {
    it('should return default value for a boolean flag when called with getJsonFlag', () => {
      const defaultVal = { test: true };
      const result = service.getJsonFlag('dark-mode', {}, defaultVal);
      // dark-mode is kind: 'boolean', not 'json', so should return defaultValue
      expect(result).toEqual(defaultVal);
    });
  });

  describe('branch coverage - getBooleanFlag with non-boolean kind', () => {
    it('should return default value for a string flag when called with getBooleanFlag', () => {
      // pricing-page-redesign is kind: 'string'
      const result = service.getBooleanFlag('pricing-page-redesign', {});
      expect(result).toBe(false); // default for getBooleanFlag
    });
  });

  describe('branch coverage - rollout with anonymous bucket key', () => {
    it('should use anonymous as bucket key when no userId or email', () => {
      const result = service.getBooleanFlag('enhanced-heatmap', {});
      expect(typeof result).toBe('boolean');
    });
  });

  describe('uncovered branches', () => {
    it('should use email as bucket key in rollout when userId is missing', () => {
      const result = service.getBooleanFlag('enhanced-heatmap', { email: 'user@test.com' });
      expect(typeof result).toBe('boolean');
    });

    it('should handle rule with rollout instead of direct variation', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-rule-rollout', {
        key: 'test-rule-rollout',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'rule-with-rollout',
              clauses: [{ attribute: 'email', op: 'endsWith', values: ['@test.com'] }],
              rollout: {
                variations: [{ variation: 1, weight: 100000 }],
              },
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      const result = svc.getBooleanFlag('test-rule-rollout', {
        email: 'admin@test.com',
        userId: 'u1',
      });
      expect(result).toBe(true);
    });

    it('should fall back to defaultValue when rule.variation is out of bounds', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-rule-oob', {
        key: 'test-rule-oob',
        kind: 'boolean',
        defaultValue: true,
        variations: [{ value: false, name: 'Off' }],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'rule-oob',
              clauses: [{ attribute: 'email', op: 'in', values: ['admin@test.com'] }],
              variation: 99,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      const result = svc.getBooleanFlag('test-rule-oob', { email: 'admin@test.com' });
      expect(result).toBe(true); // defaultValue
    });

    it('should return false for unknown clause operator (default case)', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-unknown-op', {
        key: 'test-unknown-op',
        kind: 'boolean',
        defaultValue: false,
        variations: [
          { value: false, name: 'Off' },
          { value: true, name: 'On' },
        ],
        targeting: {
          enabled: true,
          rules: [
            {
              id: 'rule-unknown-op',
              clauses: [{ attribute: 'email', op: 'regex', values: ['.*'] }],
              variation: 1,
            },
          ],
          fallthrough: { variation: 0 },
          offVariation: 0,
        },
      });

      // Unknown op 'regex' -> matches = false, rule doesn't match -> falls through to variation 0
      const result = svc.getBooleanFlag('test-unknown-op', { email: 'user@test.com' });
      expect(result).toBe(false);
    });

    it('should fall back to defaultValue when rollout variation index is out of bounds', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-rollout-var-oob', {
        key: 'test-rollout-var-oob',
        kind: 'boolean',
        defaultValue: true,
        variations: [{ value: false, name: 'Off' }],
        targeting: {
          enabled: true,
          rules: [],
          fallthrough: {
            rollout: {
              variations: [{ variation: 99, weight: 100000 }],
            },
          },
          offVariation: 0,
        },
      });

      const result = svc.getBooleanFlag('test-rollout-var-oob', { userId: 'user-1' });
      expect(result).toBe(true); // variations[99] is undefined -> defaultValue
    });

    it('should fall back to defaultValue when fallthrough variation is out of bounds', () => {
      const svc = new FeatureFlagService();
      const flagsMap = (svc as any).flags as Map<string, any>;
      flagsMap.set('test-fallthrough-oob', {
        key: 'test-fallthrough-oob',
        kind: 'boolean',
        defaultValue: true,
        variations: [{ value: false, name: 'Off' }],
        targeting: {
          enabled: true,
          rules: [],
          fallthrough: { variation: 99 },
          offVariation: 0,
        },
      });

      const result = svc.getBooleanFlag('test-fallthrough-oob', {});
      expect(result).toBe(true); // variations[99] is undefined -> defaultValue
    });
  });
});
