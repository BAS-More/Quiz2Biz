/**
 * Feature Flags & A/B Testing Configuration
 * LaunchDarkly integration for gradual feature rollouts
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description: string;
  kind: FlagKind;
  defaultValue: unknown;
  variations: FlagVariation[];
  targeting: TargetingConfig;
  prerequisites?: PrerequisiteFlag[];
  tags: string[];
  environments: EnvironmentConfig[];
  maintainer?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FlagKind = 'boolean' | 'string' | 'number' | 'json';

export interface FlagVariation {
  value: unknown;
  name: string;
  description?: string;
}

export interface TargetingConfig {
  enabled: boolean;
  rules: TargetingRule[];
  fallthrough: FallthroughConfig;
  offVariation: number;
}

export interface TargetingRule {
  id: string;
  clauses: TargetingClause[];
  variation: number;
  rollout?: RolloutConfig;
  trackEvents?: boolean;
}

export interface TargetingClause {
  attribute: string;
  op: ClauseOperator;
  values: unknown[];
  negate?: boolean;
}

export type ClauseOperator =
  | 'in'
  | 'endsWith'
  | 'startsWith'
  | 'matches'
  | 'contains'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'before'
  | 'after'
  | 'semVerEqual'
  | 'semVerLessThan'
  | 'semVerGreaterThan';

export interface RolloutConfig {
  variations: WeightedVariation[];
  bucketBy?: string;
}

export interface WeightedVariation {
  variation: number;
  weight: number; // 0-100000 (100% = 100000)
}

export interface FallthroughConfig {
  variation?: number;
  rollout?: RolloutConfig;
}

export interface PrerequisiteFlag {
  key: string;
  variation: number;
}

export interface EnvironmentConfig {
  key: string;
  on: boolean;
  archived: boolean;
  trackEvents: boolean;
  trackEventsFallthrough: boolean;
}

// ============================================================================
// A/B Testing Types
// ============================================================================

export interface ABTestConfig {
  key: string;
  name: string;
  hypothesis: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  variants: ABVariant[];
  allocation: ABAllocation;
  duration: ABTestDuration;
  status: ABTestStatus;
  results?: ABTestResults;
}

export interface ABVariant {
  key: string;
  name: string;
  description: string;
  isControl: boolean;
  allocation: number; // Percentage 0-100
}

export interface ABAllocation {
  type: 'random' | 'percentage' | 'sticky';
  stickyBucket?: string;
  exposurePercentage: number;
}

export interface ABTestDuration {
  startDate: Date;
  endDate?: Date;
  minRuntime: number; // Days
  maxRuntime: number; // Days
  sampleSize: number;
}

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface ABTestResults {
  winner?: string;
  confidence: number;
  metrics: ABMetricResult[];
  recommendation: string;
}

export interface ABMetricResult {
  name: string;
  control: MetricValue;
  treatment: MetricValue;
  uplift: number;
  pValue: number;
  significant: boolean;
}

export interface MetricValue {
  mean: number;
  standardDeviation: number;
  sampleSize: number;
}

// ============================================================================
// LaunchDarkly Configuration
// ============================================================================

export interface LaunchDarklyConfig {
  sdkKey: string;
  clientSideId?: string;
  projectKey: string;
  environmentKey: string;
  baseUri: string;
  eventsUri: string;
  streamUri: string;
  options: LaunchDarklyOptions;
}

export interface LaunchDarklyOptions {
  offline: boolean;
  sendEvents: boolean;
  allAttributesPrivate: boolean;
  privateAttributes: string[];
  flushInterval: number;
  timeout: number;
  capacity: number;
  stream: boolean;
  useLdd: boolean;
  diagnosticOptOut: boolean;
}

/**
 * Get LaunchDarkly configuration
 */
export function getLaunchDarklyConfig(): LaunchDarklyConfig {
  return {
    sdkKey: process.env.LAUNCHDARKLY_SDK_KEY || '',
    clientSideId: process.env.LAUNCHDARKLY_CLIENT_SIDE_ID,
    projectKey: process.env.LAUNCHDARKLY_PROJECT_KEY || 'quiz2biz',
    environmentKey: process.env.NODE_ENV || 'development',
    baseUri: 'https://sdk.launchdarkly.com',
    eventsUri: 'https://events.launchdarkly.com',
    streamUri: 'https://stream.launchdarkly.com',
    options: {
      offline: process.env.LAUNCHDARKLY_OFFLINE === 'true',
      sendEvents: true,
      allAttributesPrivate: false,
      privateAttributes: ['email', 'password', 'creditCard'],
      flushInterval: 5000,
      timeout: 5000,
      capacity: 10000,
      stream: true,
      useLdd: false,
      diagnosticOptOut: false,
    },
  };
}

// ============================================================================
// Default Feature Flags
// ============================================================================

/**
 * Get default feature flags for Quiz2Biz
 */
export function getDefaultFeatureFlags(): FeatureFlagConfig[] {
  return [
    // New questionnaire flow
    {
      key: 'new-questionnaire-flow',
      name: 'New Questionnaire Flow',
      description: 'Enable the new streamlined questionnaire experience',
      kind: 'boolean',
      defaultValue: false,
      variations: [
        { value: false, name: 'Control', description: 'Original questionnaire flow' },
        { value: true, name: 'Treatment', description: 'New streamlined flow' },
      ],
      targeting: {
        enabled: true,
        rules: [
          {
            id: 'beta-users',
            clauses: [{ attribute: 'userRole', op: 'in', values: ['beta'] }],
            variation: 1,
          },
          {
            id: 'internal-users',
            clauses: [{ attribute: 'email', op: 'endsWith', values: ['@quiz2biz.com'] }],
            variation: 1,
          },
        ],
        fallthrough: {
          rollout: {
            variations: [
              { variation: 0, weight: 90000 }, // 90%
              { variation: 1, weight: 10000 }, // 10%
            ],
          },
        },
        offVariation: 0,
      },
      tags: ['questionnaire', 'ux', 'rollout'],
      environments: [
        {
          key: 'development',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
        {
          key: 'staging',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
        {
          key: 'production',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
      ],
      maintainer: 'product-team',
    },

    // AI-powered suggestions
    {
      key: 'ai-suggestions',
      name: 'AI-Powered Suggestions',
      description: 'Enable AI-powered answer suggestions in questionnaires',
      kind: 'boolean',
      defaultValue: false,
      variations: [
        { value: false, name: 'Disabled' },
        { value: true, name: 'Enabled' },
      ],
      targeting: {
        enabled: true,
        rules: [
          {
            id: 'enterprise-tier',
            clauses: [{ attribute: 'subscriptionTier', op: 'in', values: ['ENTERPRISE'] }],
            variation: 1,
          },
        ],
        fallthrough: { variation: 0 },
        offVariation: 0,
      },
      prerequisites: [{ key: 'new-questionnaire-flow', variation: 1 }],
      tags: ['ai', 'enterprise', 'feature'],
      environments: [
        {
          key: 'development',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: false,
        },
        {
          key: 'staging',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: false,
        },
        {
          key: 'production',
          on: false,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: false,
        },
      ],
      maintainer: 'ai-team',
    },

    // Enhanced heatmap visualization
    {
      key: 'enhanced-heatmap',
      name: 'Enhanced Heatmap Visualization',
      description: 'Enable interactive 3D heatmap with drill-down capabilities',
      kind: 'boolean',
      defaultValue: false,
      variations: [
        { value: false, name: 'Standard Heatmap' },
        { value: true, name: 'Enhanced Interactive Heatmap' },
      ],
      targeting: {
        enabled: true,
        rules: [],
        fallthrough: {
          rollout: {
            variations: [
              { variation: 0, weight: 50000 },
              { variation: 1, weight: 50000 },
            ],
          },
        },
        offVariation: 0,
      },
      tags: ['visualization', 'ab-test', 'ux'],
      environments: [
        {
          key: 'development',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
        {
          key: 'staging',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
        {
          key: 'production',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
      ],
      maintainer: 'frontend-team',
    },

    // New pricing page design
    {
      key: 'pricing-page-redesign',
      name: 'Pricing Page Redesign',
      description: 'A/B test for new pricing page layout',
      kind: 'string',
      defaultValue: 'control',
      variations: [
        { value: 'control', name: 'Control', description: 'Original pricing page' },
        { value: 'variant-a', name: 'Variant A', description: 'Feature comparison focus' },
        { value: 'variant-b', name: 'Variant B', description: 'Social proof focus' },
        { value: 'variant-c', name: 'Variant C', description: 'Simplified 2-tier' },
      ],
      targeting: {
        enabled: true,
        rules: [],
        fallthrough: {
          rollout: {
            variations: [
              { variation: 0, weight: 25000 },
              { variation: 1, weight: 25000 },
              { variation: 2, weight: 25000 },
              { variation: 3, weight: 25000 },
            ],
          },
        },
        offVariation: 0,
      },
      tags: ['pricing', 'ab-test', 'conversion'],
      environments: [
        {
          key: 'development',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
        {
          key: 'staging',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
        {
          key: 'production',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: true,
        },
      ],
      maintainer: 'growth-team',
    },

    // Dark mode
    {
      key: 'dark-mode',
      name: 'Dark Mode',
      description: 'Enable dark mode theme option',
      kind: 'boolean',
      defaultValue: false,
      variations: [
        { value: false, name: 'Disabled' },
        { value: true, name: 'Enabled' },
      ],
      targeting: {
        enabled: true,
        rules: [
          {
            id: 'beta-testers',
            clauses: [{ attribute: 'userRole', op: 'in', values: ['beta', 'admin'] }],
            variation: 1,
          },
        ],
        fallthrough: { variation: 0 },
        offVariation: 0,
      },
      tags: ['theme', 'ux', 'accessibility'],
      environments: [
        {
          key: 'development',
          on: true,
          archived: false,
          trackEvents: false,
          trackEventsFallthrough: false,
        },
        {
          key: 'staging',
          on: true,
          archived: false,
          trackEvents: false,
          trackEventsFallthrough: false,
        },
        {
          key: 'production',
          on: false,
          archived: false,
          trackEvents: false,
          trackEventsFallthrough: false,
        },
      ],
      maintainer: 'frontend-team',
    },

    // Kill switch for external APIs
    {
      key: 'external-api-killswitch',
      name: 'External API Kill Switch',
      description: 'Emergency kill switch to disable external API calls',
      kind: 'boolean',
      defaultValue: true,
      variations: [
        { value: false, name: 'APIs Disabled' },
        { value: true, name: 'APIs Enabled' },
      ],
      targeting: {
        enabled: false,
        rules: [],
        fallthrough: { variation: 1 },
        offVariation: 1,
      },
      tags: ['operational', 'kill-switch', 'emergency'],
      environments: [
        {
          key: 'development',
          on: false,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: false,
        },
        {
          key: 'staging',
          on: false,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: false,
        },
        {
          key: 'production',
          on: false,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: false,
        },
      ],
      maintainer: 'sre-team',
    },

    // Rate limiting configuration
    {
      key: 'rate-limit-config',
      name: 'Rate Limiting Configuration',
      description: 'Dynamic rate limiting thresholds',
      kind: 'json',
      defaultValue: { requestsPerMinute: 60, burstSize: 10 },
      variations: [
        { value: { requestsPerMinute: 60, burstSize: 10 }, name: 'Standard' },
        { value: { requestsPerMinute: 30, burstSize: 5 }, name: 'Reduced' },
        { value: { requestsPerMinute: 120, burstSize: 20 }, name: 'Increased' },
        { value: { requestsPerMinute: 0, burstSize: 0 }, name: 'Disabled' },
      ],
      targeting: {
        enabled: true,
        rules: [
          {
            id: 'enterprise-users',
            clauses: [{ attribute: 'subscriptionTier', op: 'in', values: ['ENTERPRISE'] }],
            variation: 2,
          },
        ],
        fallthrough: { variation: 0 },
        offVariation: 0,
      },
      tags: ['operational', 'rate-limiting', 'performance'],
      environments: [
        {
          key: 'development',
          on: true,
          archived: false,
          trackEvents: false,
          trackEventsFallthrough: false,
        },
        {
          key: 'staging',
          on: true,
          archived: false,
          trackEvents: false,
          trackEventsFallthrough: false,
        },
        {
          key: 'production',
          on: true,
          archived: false,
          trackEvents: true,
          trackEventsFallthrough: false,
        },
      ],
      maintainer: 'platform-team',
    },
  ];
}

// ============================================================================
// Default A/B Tests
// ============================================================================

/**
 * Get default A/B test configurations
 */
export function getDefaultABTests(): ABTestConfig[] {
  return [
    {
      key: 'questionnaire-cta-test',
      name: 'Questionnaire CTA Button Test',
      hypothesis:
        'Changing the CTA button text from "Continue" to "Save & Continue" will increase completion rate by 10%',
      primaryMetric: 'questionnaire_completion_rate',
      secondaryMetrics: ['time_to_complete', 'abandonment_rate', 'return_visits'],
      variants: [
        {
          key: 'control',
          name: 'Control',
          description: 'Original "Continue" button',
          isControl: true,
          allocation: 50,
        },
        {
          key: 'treatment',
          name: 'Treatment',
          description: '"Save & Continue" button with progress indicator',
          isControl: false,
          allocation: 50,
        },
      ],
      allocation: {
        type: 'sticky',
        stickyBucket: 'userId',
        exposurePercentage: 100,
      },
      duration: {
        startDate: new Date(),
        minRuntime: 14,
        maxRuntime: 30,
        sampleSize: 5000,
      },
      status: 'draft',
    },

    {
      key: 'onboarding-flow-test',
      name: 'Onboarding Flow Optimization',
      hypothesis: 'A simplified 3-step onboarding flow will increase activation rate by 15%',
      primaryMetric: 'user_activation_rate',
      secondaryMetrics: [
        'onboarding_completion_time',
        'first_questionnaire_started',
        'week1_retention',
      ],
      variants: [
        {
          key: 'control',
          name: 'Control (5-step)',
          description: 'Original 5-step onboarding',
          isControl: true,
          allocation: 33,
        },
        {
          key: 'variant-a',
          name: 'Variant A (3-step)',
          description: 'Simplified 3-step onboarding',
          isControl: false,
          allocation: 33,
        },
        {
          key: 'variant-b',
          name: 'Variant B (Interactive)',
          description: 'Interactive tutorial onboarding',
          isControl: false,
          allocation: 34,
        },
      ],
      allocation: {
        type: 'random',
        exposurePercentage: 100,
      },
      duration: {
        startDate: new Date(),
        minRuntime: 21,
        maxRuntime: 45,
        sampleSize: 3000,
      },
      status: 'draft',
    },
  ];
}

// ============================================================================
// Feature Flag Service
// ============================================================================

export interface FlagEvaluationContext {
  userId?: string;
  email?: string;
  subscriptionTier?: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
  userRole?: string;
  country?: string;
  custom?: Record<string, unknown>;
}

/**
 * Feature Flag Service
 * Wrapper around LaunchDarkly SDK
 */
export class FeatureFlagService {
  private flags: Map<string, FeatureFlagConfig> = new Map();
  private client: unknown; // LaunchDarkly client instance

  constructor(config?: LaunchDarklyConfig) {
    const ldConfig = config || getLaunchDarklyConfig();

    // Initialize flags from defaults
    for (const flag of getDefaultFeatureFlags()) {
      this.flags.set(flag.key, flag);
    }

    // In production, initialize LaunchDarkly client
    // this.client = LaunchDarkly.init(ldConfig.sdkKey, ldConfig.options);
    console.log(`[FeatureFlags] Initialized with ${this.flags.size} flags`);
  }

  /**
   * Evaluate a boolean feature flag
   */
  getBooleanFlag(key: string, context: FlagEvaluationContext, defaultValue = false): boolean {
    const flag = this.flags.get(key);
    if (!flag || flag.kind !== 'boolean') {
      return defaultValue;
    }

    // In production, use LaunchDarkly client
    // return this.client.variation(key, this.contextToLDUser(context), defaultValue);

    // Local evaluation for development
    return this.evaluateFlag(flag, context) as boolean;
  }

  /**
   * Evaluate a string feature flag
   */
  getStringFlag(key: string, context: FlagEvaluationContext, defaultValue = ''): string {
    const flag = this.flags.get(key);
    if (!flag || flag.kind !== 'string') {
      return defaultValue;
    }

    return this.evaluateFlag(flag, context) as string;
  }

  /**
   * Evaluate a JSON feature flag
   */
  getJsonFlag<T>(key: string, context: FlagEvaluationContext, defaultValue: T): T {
    const flag = this.flags.get(key);
    if (!flag || flag.kind !== 'json') {
      return defaultValue;
    }

    return this.evaluateFlag(flag, context) as T;
  }

  /**
   * Get all flags for a user (client-side bootstrap)
   */
  getAllFlags(context: FlagEvaluationContext): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, flag] of this.flags) {
      result[key] = this.evaluateFlag(flag, context);
    }

    return result;
  }

  /**
   * Track a custom event
   */
  track(eventName: string, context: FlagEvaluationContext, data?: Record<string, unknown>): void {
    console.log(`[FeatureFlags] Track event: ${eventName}`, { context, data });
    // In production: this.client.track(eventName, this.contextToLDUser(context), data);
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    // In production: await this.client.close();
    console.log('[FeatureFlags] Client closed');
  }

  // Private helper methods

  private evaluateFlag(flag: FeatureFlagConfig, context: FlagEvaluationContext): unknown {
    if (!flag.targeting.enabled) {
      return flag.variations[flag.targeting.offVariation]?.value ?? flag.defaultValue;
    }

    // Check targeting rules
    for (const rule of flag.targeting.rules) {
      if (this.matchesRule(rule, context)) {
        if (rule.rollout) {
          return this.evaluateRollout(flag, rule.rollout, context);
        }
        return flag.variations[rule.variation]?.value ?? flag.defaultValue;
      }
    }

    // Fallthrough
    if (flag.targeting.fallthrough.rollout) {
      return this.evaluateRollout(flag, flag.targeting.fallthrough.rollout, context);
    }

    if (flag.targeting.fallthrough.variation !== undefined) {
      return flag.variations[flag.targeting.fallthrough.variation]?.value ?? flag.defaultValue;
    }

    return flag.defaultValue;
  }

  private matchesRule(rule: TargetingRule, context: FlagEvaluationContext): boolean {
    return rule.clauses.every((clause) => this.matchesClause(clause, context));
  }

  private matchesClause(clause: TargetingClause, context: FlagEvaluationContext): boolean {
    const attributeValue = this.getAttributeValue(context, clause.attribute);
    if (attributeValue === undefined) {
      return false;
    }

    let matches = false;
    switch (clause.op) {
      case 'in':
        matches = clause.values.includes(attributeValue);
        break;
      case 'endsWith':
        matches = clause.values.some(
          (v) => typeof attributeValue === 'string' && attributeValue.endsWith(String(v)),
        );
        break;
      case 'startsWith':
        matches = clause.values.some(
          (v) => typeof attributeValue === 'string' && attributeValue.startsWith(String(v)),
        );
        break;
      case 'contains':
        matches = clause.values.some(
          (v) => typeof attributeValue === 'string' && attributeValue.includes(String(v)),
        );
        break;
      default:
        matches = false;
    }

    return clause.negate ? !matches : matches;
  }

  private getAttributeValue(context: FlagEvaluationContext, attribute: string): unknown {
    switch (attribute) {
      case 'userId':
        return context.userId;
      case 'email':
        return context.email;
      case 'subscriptionTier':
        return context.subscriptionTier;
      case 'userRole':
        return context.userRole;
      case 'country':
        return context.country;
      default:
        return context.custom?.[attribute];
    }
  }

  private evaluateRollout(
    flag: FeatureFlagConfig,
    rollout: RolloutConfig,
    context: FlagEvaluationContext,
  ): unknown {
    const bucketKey = context.userId || context.email || 'anonymous';
    const bucket = this.hashString(`${flag.key}:${bucketKey}`) % 100000;

    let cumulative = 0;
    for (const wv of rollout.variations) {
      cumulative += wv.weight;
      if (bucket < cumulative) {
        return flag.variations[wv.variation]?.value ?? flag.defaultValue;
      }
    }

    return flag.defaultValue;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// Export default configuration
// ============================================================================

export default {
  getLaunchDarklyConfig,
  getDefaultFeatureFlags,
  getDefaultABTests,
  FeatureFlagService,
};
