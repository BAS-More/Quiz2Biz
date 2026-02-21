/**
 * @fileoverview Tests for canary-deployment.config.ts
 */
import {
  getCanaryDeploymentConfig,
  getDefaultCanaryStages,
  getDefaultHealthChecks,
  getDefaultRollbackTriggers,
  getGlobalCanarySettings,
  getCanaryNotificationConfig,
  getCanaryMetricsConfig,
  getAzureContainerAppsTrafficConfig,
  generateTerraformTrafficConfig,
  getCanaryAzureCliCommands,
  CanaryDeploymentManager,
} from './canary-deployment.config';

describe('getCanaryDeploymentConfig', () => {
  it('should return enabled config', () => {
    const config = getCanaryDeploymentConfig();
    expect(config.enabled).toBe(true);
  });

  it('should have linear strategy', () => {
    const config = getCanaryDeploymentConfig();
    expect(config.strategy).toBe('linear');
  });

  it('should have 4 stages', () => {
    const config = getCanaryDeploymentConfig();
    expect(config.stages.length).toBe(4);
  });

  it('should have global settings', () => {
    const config = getCanaryDeploymentConfig();
    expect(config.globalSettings).toBeDefined();
  });

  it('should have notification config', () => {
    const config = getCanaryDeploymentConfig();
    expect(config.notificationConfig.enabled).toBe(true);
  });

  it('should have metrics config', () => {
    const config = getCanaryDeploymentConfig();
    expect(config.metricsConfig.provider).toBe('azure_monitor');
  });
});

describe('getDefaultCanaryStages', () => {
  it('should return 4 stages', () => {
    const stages = getDefaultCanaryStages();
    expect(stages.length).toBe(4);
  });

  it('should have progressive traffic percentages', () => {
    const stages = getDefaultCanaryStages();
    expect(stages[0].trafficPercentage).toBe(5);
    expect(stages[1].trafficPercentage).toBe(25);
    expect(stages[2].trafficPercentage).toBe(50);
    expect(stages[3].trafficPercentage).toBe(100);
  });

  it('should have correct stage names', () => {
    const stages = getDefaultCanaryStages();
    expect(stages[0].name).toBe('canary-initial');
    expect(stages[1].name).toBe('canary-expanded');
    expect(stages[2].name).toBe('canary-half');
    expect(stages[3].name).toBe('canary-full');
  });

  it('should require manual approval at 50% stage', () => {
    const stages = getDefaultCanaryStages();
    const halfStage = stages.find((s) => s.trafficPercentage === 50);
    expect(halfStage?.promotionCriteria.requireManualApproval).toBe(true);
  });

  it('should have stricter criteria at full rollout', () => {
    const stages = getDefaultCanaryStages();
    const fullStage = stages[3];
    expect(fullStage.promotionCriteria.maxErrorRate).toBe(0.5);
    expect(fullStage.promotionCriteria.maxLatencyP95Ms).toBe(400);
  });
});

describe('getDefaultHealthChecks', () => {
  it('should be enabled', () => {
    const checks = getDefaultHealthChecks();
    expect(checks.enabled).toBe(true);
  });

  it('should have 10 second interval', () => {
    const checks = getDefaultHealthChecks();
    expect(checks.intervalSeconds).toBe(10);
  });

  it('should have 3 endpoints', () => {
    const checks = getDefaultHealthChecks();
    expect(checks.endpoints.length).toBe(3);
  });

  it('should have live endpoint', () => {
    const checks = getDefaultHealthChecks();
    const live = checks.endpoints.find((e) => e.path.includes('live'));
    expect(live).toBeDefined();
    expect(live?.expectedStatus).toContain(200);
  });

  it('should have ready endpoint with body check', () => {
    const checks = getDefaultHealthChecks();
    const ready = checks.endpoints.find((e) => e.path.includes('ready'));
    expect(ready?.bodyContains).toBe('"status":"healthy"');
  });
});

describe('getDefaultRollbackTriggers', () => {
  it('should have error rate trigger', () => {
    const triggers = getDefaultRollbackTriggers();
    const errorRate = triggers.find((t) => t.type === 'error_rate');
    expect(errorRate).toBeDefined();
    expect(errorRate?.threshold).toBe(1.0);
    expect(errorRate?.enabled).toBe(true);
  });

  it('should have latency p99 trigger', () => {
    const triggers = getDefaultRollbackTriggers();
    const latency = triggers.find((t) => t.type === 'latency_p99');
    expect(latency?.threshold).toBe(2000);
  });

  it('should have memory usage trigger', () => {
    const triggers = getDefaultRollbackTriggers();
    const memory = triggers.find((t) => t.type === 'memory_usage');
    expect(memory?.threshold).toBe(90);
  });

  it('should have all triggers enabled by default', () => {
    const triggers = getDefaultRollbackTriggers();
    triggers.forEach((t) => {
      expect(t.enabled).toBe(true);
    });
  });
});

describe('getGlobalCanarySettings', () => {
  it('should use Multiple revision mode', () => {
    const settings = getGlobalCanarySettings();
    expect(settings.defaultRevisionMode).toBe('Multiple');
  });

  it('should allow 3 concurrent revisions', () => {
    const settings = getGlobalCanarySettings();
    expect(settings.maxConcurrentRevisions).toBe(3);
  });

  it('should have automatic promotion enabled', () => {
    const settings = getGlobalCanarySettings();
    expect(settings.automaticPromotionEnabled).toBe(true);
  });

  it('should have automatic rollback enabled', () => {
    const settings = getGlobalCanarySettings();
    expect(settings.automaticRollbackEnabled).toBe(true);
  });

  it('should pause on warning', () => {
    const settings = getGlobalCanarySettings();
    expect(settings.pauseOnWarning).toBe(true);
  });
});

describe('getCanaryNotificationConfig', () => {
  it('should be enabled', () => {
    const config = getCanaryNotificationConfig();
    expect(config.enabled).toBe(true);
  });

  it('should have multiple channels', () => {
    const config = getCanaryNotificationConfig();
    expect(config.channels.length).toBeGreaterThan(0);
  });

  it('should have teams channel', () => {
    const config = getCanaryNotificationConfig();
    const teams = config.channels.find((c) => c.type === 'teams');
    expect(teams).toBeDefined();
  });

  it('should have events configured', () => {
    const config = getCanaryNotificationConfig();
    expect(config.events.length).toBeGreaterThan(0);
  });

  it('should notify on deployment started', () => {
    const config = getCanaryNotificationConfig();
    const event = config.events.find((e) => e.event === 'deployment_started');
    expect(event).toBeDefined();
  });

  it('should notify on rollback via critical channels', () => {
    const config = getCanaryNotificationConfig();
    const event = config.events.find((e) => e.event === 'rollback_initiated');
    expect(event?.channels).toContain('pagerduty');
  });
});

describe('getCanaryMetricsConfig', () => {
  it('should use azure_monitor provider', () => {
    const config = getCanaryMetricsConfig();
    expect(config.provider).toBe('azure_monitor');
  });

  it('should have 15 second collection interval', () => {
    const config = getCanaryMetricsConfig();
    expect(config.collectionIntervalSeconds).toBe(15);
  });

  it('should retain for 30 days', () => {
    const config = getCanaryMetricsConfig();
    expect(config.retentionDays).toBe(30);
  });

  it('should have custom metrics', () => {
    const config = getCanaryMetricsConfig();
    expect(config.customMetrics.length).toBeGreaterThan(0);
  });

  it('should have error rate metric', () => {
    const config = getCanaryMetricsConfig();
    const errorRate = config.customMetrics.find((m) => m.name === 'canary_error_rate');
    expect(errorRate).toBeDefined();
    expect(errorRate?.unit).toBe('percent');
  });
});

describe('getAzureContainerAppsTrafficConfig', () => {
  it('should return correct traffic weights', () => {
    const config = getAzureContainerAppsTrafficConfig('stable-rev', 'canary-rev', 25);

    expect(config.trafficWeights.length).toBe(2);
    expect(config.trafficWeights[0].weight).toBe(75);
    expect(config.trafficWeights[1].weight).toBe(25);
  });

  it('should use Multiple revision mode', () => {
    const config = getAzureContainerAppsTrafficConfig('stable', 'canary', 50);
    expect(config.revisionMode).toBe('Multiple');
  });

  it('should label revisions correctly', () => {
    const config = getAzureContainerAppsTrafficConfig('stable-rev', 'canary-rev', 10);

    const stable = config.trafficWeights.find((w) => w.label === 'stable');
    const canary = config.trafficWeights.find((w) => w.label === 'canary');

    expect(stable?.revisionName).toBe('stable-rev');
    expect(canary?.revisionName).toBe('canary-rev');
  });

  it('should mark canary as latest revision', () => {
    const config = getAzureContainerAppsTrafficConfig('stable', 'canary', 5);
    const canary = config.trafficWeights.find((w) => w.label === 'canary');
    expect(canary?.latestRevision).toBe(true);
  });

  it('should disable sticky sessions', () => {
    const config = getAzureContainerAppsTrafficConfig('stable', 'canary', 50);
    expect(config.stickySessionConfig?.enabled).toBe(false);
  });
});

describe('generateTerraformTrafficConfig', () => {
  it('should generate valid terraform config', () => {
    const config = generateTerraformTrafficConfig(25);

    expect(config).toContain('ingress');
    expect(config).toContain('traffic_weight');
    expect(config).toContain('percentage      = 75');
    expect(config).toContain('percentage      = 25');
  });

  it('should include stable label', () => {
    const config = generateTerraformTrafficConfig(10);
    expect(config).toContain('label           = "stable"');
  });

  it('should include canary label', () => {
    const config = generateTerraformTrafficConfig(10);
    expect(config).toContain('label           = "canary"');
  });

  it('should use latest_revision for canary', () => {
    const config = generateTerraformTrafficConfig(50);
    expect(config).toContain('latest_revision = true');
  });
});

describe('getCanaryAzureCliCommands', () => {
  it('should return array of commands', () => {
    const commands = getCanaryAzureCliCommands('myapp', 'myrg', 'myregistry.azurecr.io/app:latest');
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should include app name in commands', () => {
    const commands = getCanaryAzureCliCommands('quiz2biz-api', 'prod-rg', 'registry/image:tag');
    const hasAppName = commands.some((cmd) => cmd.includes('quiz2biz-api'));
    expect(hasAppName).toBe(true);
  });

  it('should include resource group', () => {
    const commands = getCanaryAzureCliCommands('app', 'my-resource-group', 'image:tag');
    const hasRg = commands.some((cmd) => cmd.includes('my-resource-group'));
    expect(hasRg).toBe(true);
  });

  it('should include rollback command', () => {
    const commands = getCanaryAzureCliCommands('app', 'rg', 'image');
    const hasRollback = commands.some((cmd) => cmd.includes('Rollback'));
    expect(hasRollback).toBe(true);
  });
});

describe('CanaryDeploymentManager', () => {
  let manager: CanaryDeploymentManager;

  beforeEach(() => {
    manager = new CanaryDeploymentManager();
  });

  it('should initialize with pending status', () => {
    const state = manager.getState();
    expect(state.status).toBe('pending');
  });

  it('should initialize at stage 0', () => {
    const state = manager.getState();
    expect(state.currentStage).toBe(0);
  });

  it('should have empty health check results initially', () => {
    const state = manager.getState();
    expect(state.healthCheckResults).toEqual([]);
  });

  it('should have empty metrics history initially', () => {
    const state = manager.getState();
    expect(state.metricsHistory).toEqual([]);
  });

  it('should accept custom config', () => {
    const customConfig = getCanaryDeploymentConfig();
    customConfig.enabled = false;

    const customManager = new CanaryDeploymentManager(customConfig);
    const state = customManager.getState();
    expect(state.status).toBe('pending');
  });

  describe('approvePromotion', () => {
    it('should throw if not waiting for approval', async () => {
      await expect(manager.approvePromotion()).rejects.toThrow(
        'Deployment is not waiting for approval',
      );
    });
  });

  describe('cancelDeployment', () => {
    it('should set status to cancelled', async () => {
      await manager.cancelDeployment();
      const state = manager.getState();
      expect(state.status).toBe('cancelled');
    });
  });

  describe('getState', () => {
    it('should return a copy of state', () => {
      const state1 = manager.getState();
      const state2 = manager.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });
});
