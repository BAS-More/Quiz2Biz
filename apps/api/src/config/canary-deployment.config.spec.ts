/**
 * @fileoverview Tests for canary-deployment.config.ts
 */
import { Logger } from '@nestjs/common';
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
  MetricSnapshot,
  RollbackTrigger,
  PromotionCriteria,
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

  describe('startDeployment', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should set status to in_progress', async () => {
      // Mock monitorDeployment to prevent infinite loop
      jest.spyOn(manager as any, 'monitorDeployment').mockResolvedValue(undefined);

      await manager.startDeployment('rev-abc123');

      const state = manager.getState();
      expect(state.status).toBe('in_progress');
    });

    it('should set stageStartTime to a recent timestamp', async () => {
      jest.spyOn(manager as any, 'monitorDeployment').mockResolvedValue(undefined);

      const before = new Date();
      await manager.startDeployment('rev-abc123');
      const after = new Date();

      const state = manager.getState();
      expect(state.stageStartTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state.stageStartTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should log deployment info including revision name', async () => {
      jest.spyOn(manager as any, 'monitorDeployment').mockResolvedValue(undefined);

      await manager.startDeployment('rev-test-deploy');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('rev-test-deploy'));
    });

    it('should log stage 1 info', async () => {
      jest.spyOn(manager as any, 'monitorDeployment').mockResolvedValue(undefined);

      await manager.startDeployment('rev-xyz');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Stage 1/'));
    });

    it('should log initial traffic weight percentage', async () => {
      jest.spyOn(manager as any, 'monitorDeployment').mockResolvedValue(undefined);

      await manager.startDeployment('rev-xyz');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('5%'));
    });

    it('should call notifyEvent with deployment_started', async () => {
      jest.spyOn(manager as any, 'monitorDeployment').mockResolvedValue(undefined);
      const notifySpy = jest.spyOn(manager as any, 'notifyEvent').mockResolvedValue(undefined);

      await manager.startDeployment('rev-notify');

      expect(notifySpy).toHaveBeenCalledWith('deployment_started', {
        revision: 'rev-notify',
        totalStages: 4,
      });
    });

    it('should call monitorDeployment after setup', async () => {
      const monitorSpy = jest
        .spyOn(manager as any, 'monitorDeployment')
        .mockResolvedValue(undefined);

      await manager.startDeployment('rev-monitor');

      expect(monitorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('promoteToNextStage', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should advance currentStage by 1 when not at last stage', async () => {
      (manager as any).state.currentStage = 0;
      (manager as any).state.status = 'in_progress';

      await manager.promoteToNextStage();

      const state = manager.getState();
      expect(state.currentStage).toBe(1);
    });

    it('should set status to in_progress after promotion', async () => {
      (manager as any).state.currentStage = 0;
      (manager as any).state.status = 'promoting';

      await manager.promoteToNextStage();

      const state = manager.getState();
      expect(state.status).toBe('in_progress');
    });

    it('should reset stageStartTime on promotion', async () => {
      (manager as any).state.currentStage = 0;
      const oldTime = new Date('2020-01-01');
      (manager as any).state.stageStartTime = oldTime;

      const before = new Date();
      await manager.promoteToNextStage();
      const after = new Date();

      const state = manager.getState();
      expect(state.stageStartTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state.stageStartTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should log promotion with stage number and traffic percentage', async () => {
      (manager as any).state.currentStage = 0;

      await manager.promoteToNextStage();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Promoting to stage 2/'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('canary-expanded'));
    });

    it('should call notifyEvent with stage_promoted', async () => {
      const notifySpy = jest.spyOn(manager as any, 'notifyEvent').mockResolvedValue(undefined);
      (manager as any).state.currentStage = 0;

      await manager.promoteToNextStage();

      expect(notifySpy).toHaveBeenCalledWith('stage_promoted', {
        fromStage: 'canary-initial',
        toStage: 'canary-expanded',
        trafficPercentage: 25,
      });
    });

    it('should call updateTrafficWeight with next stage percentage', async () => {
      const trafficSpy = jest
        .spyOn(manager as any, 'updateTrafficWeight')
        .mockResolvedValue(undefined);
      (manager as any).state.currentStage = 1;

      await manager.promoteToNextStage();

      expect(trafficSpy).toHaveBeenCalledWith(50);
    });

    it('should promote through multiple stages sequentially', async () => {
      (manager as any).state.currentStage = 0;

      await manager.promoteToNextStage();
      expect(manager.getState().currentStage).toBe(1);

      await manager.promoteToNextStage();
      expect(manager.getState().currentStage).toBe(2);

      await manager.promoteToNextStage();
      expect(manager.getState().currentStage).toBe(3);
    });

    it('should set status to completed when at last stage', async () => {
      (manager as any).state.currentStage = 3; // last stage (index 3 of 4 stages)

      await manager.promoteToNextStage();

      const state = manager.getState();
      expect(state.status).toBe('completed');
    });

    it('should log deployment completed when at last stage', async () => {
      (manager as any).state.currentStage = 3;

      await manager.promoteToNextStage();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deployment completed successfully'),
      );
    });

    it('should call notifyEvent with deployment_completed when at last stage', async () => {
      const notifySpy = jest.spyOn(manager as any, 'notifyEvent').mockResolvedValue(undefined);
      (manager as any).state.currentStage = 3;

      await manager.promoteToNextStage();

      expect(notifySpy).toHaveBeenCalledWith(
        'deployment_completed',
        expect.objectContaining({ totalDuration: expect.any(Number) }),
      );
    });

    it('should not advance currentStage when completing deployment', async () => {
      (manager as any).state.currentStage = 3;

      await manager.promoteToNextStage();

      // currentStage should remain at 3 (not incremented to 4)
      const state = manager.getState();
      expect(state.currentStage).toBe(3);
    });
  });

  describe('initiateRollback', () => {
    let consoleSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should set status to failed after rollback completes', async () => {
      (manager as any).state.status = 'in_progress';

      await manager.initiateRollback('error_rate threshold breached');

      const state = manager.getState();
      expect(state.status).toBe('failed');
    });

    it('should set lastError to the reason', async () => {
      await manager.initiateRollback('latency_p99 too high');

      const state = manager.getState();
      expect(state.lastError).toBe('latency_p99 too high');
    });

    it('should log rollback initiation with reason', async () => {
      await manager.initiateRollback('memory_usage exceeded 90%');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initiating rollback: memory_usage exceeded 90%'),
      );
    });

    it('should log rollback completed', async () => {
      await manager.initiateRollback('some error');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Rollback completed'));
    });

    it('should call notifyEvent with rollback_initiated', async () => {
      const notifySpy = jest.spyOn(manager as any, 'notifyEvent').mockResolvedValue(undefined);

      await manager.initiateRollback('test reason');

      expect(notifySpy).toHaveBeenCalledWith('rollback_initiated', {
        reason: 'test reason',
      });
    });

    it('should call notifyEvent with rollback_completed', async () => {
      const notifySpy = jest.spyOn(manager as any, 'notifyEvent').mockResolvedValue(undefined);

      await manager.initiateRollback('test reason');

      expect(notifySpy).toHaveBeenCalledWith('rollback_completed', {
        reason: 'test reason',
      });
    });

    it('should call updateTrafficWeight with 0 to route all traffic to stable', async () => {
      const trafficSpy = jest
        .spyOn(manager as any, 'updateTrafficWeight')
        .mockResolvedValue(undefined);

      await manager.initiateRollback('critical failure');

      expect(trafficSpy).toHaveBeenCalledWith(0);
    });

    it('should transition through rolling_back status before failed', async () => {
      const statusCaptures: string[] = [];

      jest.spyOn(manager as any, 'updateTrafficWeight').mockImplementation(async () => {
        // Capture status during the traffic weight update (mid-rollback)
        statusCaptures.push(manager.getState().status);
      });

      await manager.initiateRollback('testing status transition');

      // During updateTrafficWeight, status should have been 'rolling_back'
      expect(statusCaptures).toContain('rolling_back');
      // After completion, status should be 'failed'
      expect(manager.getState().status).toBe('failed');
    });
  });

  describe('checkRollbackTriggers (private)', () => {
    it('should return null when no triggers are breached', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 5.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.5,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });

    it('should detect breached error_rate threshold', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 5.0,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.triggered).toBe(true);
      expect(result.reason).toContain('error_rate');
    });

    it('should detect breached latency_p99 threshold', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'latency_p99',
          threshold: 2000,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 3000,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('latency_p99');
      expect(result.reason).toContain('3000');
    });

    it('should detect breached latency_p95 threshold', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'latency_p95',
          threshold: 1000,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 1500,
        latencyP99Ms: 2000,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('latency_p95');
    });

    it('should detect breached memory_usage threshold', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'memory_usage',
          threshold: 90,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 95,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('memory_usage');
    });

    it('should detect breached cpu_usage threshold', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'cpu_usage',
          threshold: 90,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 95,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('cpu_usage');
    });

    it('should skip disabled triggers', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: false,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 50.0,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });

    it('should support less_than comparison', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'less_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.5,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.triggered).toBe(true);
    });

    it('should support equals comparison', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'cpu_usage',
          threshold: 40,
          windowMinutes: 5,
          comparison: 'equals',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.triggered).toBe(true);
    });

    it('should check latency_avg against latencyP50Ms', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'latency_avg',
          threshold: 100,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 200,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('latency_avg');
    });

    it('should return on first breached trigger when multiple exist', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
        {
          type: 'cpu_usage',
          threshold: 90,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 10.0,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 95,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      // Should return the first breached trigger (error_rate)
      expect(result.reason).toContain('error_rate');
    });

    it('should skip unknown trigger types gracefully', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'custom_metric' as any,
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });
  });

  describe('checkPromotionCriteria (private)', () => {
    it('should return false when not enough successful health checks', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 10,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      // Only 3 successful health checks (need 10)
      (manager as any).state.healthCheckResults = Array.from({ length: 3 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));

      (manager as any).state.metricsHistory = Array.from({ length: 5 }, () => ({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));

      const result = (manager as any).checkPromotionCriteria(criteria);
      expect(result).toBe(false);
    });

    it('should return true when all promotion criteria are met', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 5,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      // 10 successful health checks (need 5)
      (manager as any).state.healthCheckResults = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));

      // Metrics with low error rate, low latency, and enough requests
      (manager as any).state.metricsHistory = Array.from({ length: 5 }, () => ({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));

      const result = (manager as any).checkPromotionCriteria(criteria);
      expect(result).toBe(true);
    });

    it('should return false when error rate exceeds max', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 5,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      (manager as any).state.healthCheckResults = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));

      // High error rate (5.0 > 1.0)
      (manager as any).state.metricsHistory = Array.from({ length: 5 }, () => ({
        timestamp: new Date(),
        errorRate: 5.0,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));

      const result = (manager as any).checkPromotionCriteria(criteria);
      expect(result).toBe(false);
    });

    it('should return false when latencyP95 exceeds max', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 5,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      (manager as any).state.healthCheckResults = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));

      // High latency (800 > 500)
      (manager as any).state.metricsHistory = Array.from({ length: 5 }, () => ({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 800,
        latencyP99Ms: 1200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));

      const result = (manager as any).checkPromotionCriteria(criteria);
      expect(result).toBe(false);
    });

    it('should return false when total requests are below minimum', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 5,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 5000,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      (manager as any).state.healthCheckResults = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));

      // Low request count (10 * 50 = 500 total, need 5000)
      (manager as any).state.metricsHistory = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 50,
        cpuUsage: 30,
        memoryUsage: 50,
      }));

      const result = (manager as any).checkPromotionCriteria(criteria);
      expect(result).toBe(false);
    });

    it('should return false when metrics history is empty', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 5,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      (manager as any).state.healthCheckResults = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));

      (manager as any).state.metricsHistory = [];

      const result = (manager as any).checkPromotionCriteria(criteria);
      expect(result).toBe(false);
    });

    it('should only consider the last N health checks matching minSuccessfulHealthChecks', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 5,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      // 3 old failures followed by 5 recent successes
      const failures = Array.from({ length: 3 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: false,
        responseTimeMs: 5000,
        statusCode: 500,
      }));
      const successes = Array.from({ length: 5 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));
      (manager as any).state.healthCheckResults = [...failures, ...successes];

      (manager as any).state.metricsHistory = Array.from({ length: 5 }, () => ({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));

      const result = (manager as any).checkPromotionCriteria(criteria);
      // Last 5 are all successes, so criteria should be met
      expect(result).toBe(true);
    });

    it('should use only the last 10 metrics for calculation', () => {
      const criteria: PromotionCriteria = {
        minSuccessfulHealthChecks: 5,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      };

      (manager as any).state.healthCheckResults = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));

      // 10 old high-error metrics followed by 10 recent low-error metrics
      const oldBadMetrics = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        errorRate: 50.0,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));
      const recentGoodMetrics = Array.from({ length: 10 }, () => ({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));
      (manager as any).state.metricsHistory = [...oldBadMetrics, ...recentGoodMetrics];

      const result = (manager as any).checkPromotionCriteria(criteria);
      // Only last 10 (good) metrics should be considered
      expect(result).toBe(true);
    });
  });

  describe('approvePromotion (success case)', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should promote to next stage when status is waiting_approval', async () => {
      (manager as any).state.status = 'waiting_approval';
      (manager as any).state.currentStage = 1;

      await manager.approvePromotion();

      const state = manager.getState();
      expect(state.currentStage).toBe(2);
      expect(state.status).toBe('in_progress');
    });

    it('should complete deployment when approved at last stage', async () => {
      (manager as any).state.status = 'waiting_approval';
      (manager as any).state.currentStage = 3;

      await manager.approvePromotion();

      const state = manager.getState();
      expect(state.status).toBe('completed');
    });

    it('should call promoteToNextStage internally', async () => {
      const promoteSpy = jest.spyOn(manager, 'promoteToNextStage');
      (manager as any).state.status = 'waiting_approval';
      (manager as any).state.currentStage = 0;

      await manager.approvePromotion();

      expect(promoteSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ================================================================
  // ADDITIONAL COVERAGE: uncovered branches and methods
  // ================================================================

  describe('checkRollbackTriggers - additional trigger types', () => {
    it('should detect breached http_5xx_rate threshold (uses errorRate)', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'http_5xx_rate',
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 3.0,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('http_5xx_rate');
    });

    it('should detect breached http_4xx_rate threshold (uses errorRate)', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'http_4xx_rate',
          threshold: 2.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 5.0,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('http_4xx_rate');
    });

    it('should not breach http_5xx_rate when below threshold', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'http_5xx_rate',
          threshold: 5.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.5,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });

    it('should skip pod_restart_rate as unknown/unhandled type', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'pod_restart_rate',
          threshold: 3,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      // pod_restart_rate falls through to default case in switch
      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });

    it('should handle exact threshold for greater_than (not breached at exact value)', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 1.0, // exactly at threshold, should NOT trigger greater_than
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });

    it('should handle exact threshold for less_than (not breached at exact value)', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 1.0,
          windowMinutes: 5,
          comparison: 'less_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 1.0, // exactly at threshold, should NOT trigger less_than
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });

    it('should handle equals comparison not matching', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'cpu_usage',
          threshold: 50,
          windowMinutes: 5,
          comparison: 'equals',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).toBeNull();
    });

    it('should handle multiple triggers where only the second one breaches', () => {
      const triggers: RollbackTrigger[] = [
        {
          type: 'error_rate',
          threshold: 10.0,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
        {
          type: 'memory_usage',
          threshold: 50,
          windowMinutes: 5,
          comparison: 'greater_than',
          enabled: true,
        },
      ];
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 80,
      };

      const result = (manager as any).checkRollbackTriggers(triggers, metrics);
      expect(result).not.toBeNull();
      expect(result.reason).toContain('memory_usage');
    });

    it('should handle empty triggers array', () => {
      const metrics: MetricSnapshot = {
        timestamp: new Date(),
        errorRate: 50.0,
        latencyP50Ms: 5000,
        latencyP95Ms: 10000,
        latencyP99Ms: 20000,
        requestCount: 0,
        cpuUsage: 99,
        memoryUsage: 99,
      };

      const result = (manager as any).checkRollbackTriggers([], metrics);
      expect(result).toBeNull();
    });
  });

  describe('notifyEvent (private)', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log notification for matching event and channel', async () => {
      await (manager as any).notifyEvent('deployment_started', { test: true });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deployment_started'));
    });

    it('should not log for unregistered event', async () => {
      await (manager as any).notifyEvent('nonexistent_event', {});
      // Should not have been called with the event name
      const calls = consoleSpy.mock.calls.filter(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('nonexistent_event'),
      );
      expect(calls.length).toBe(0);
    });

    it('should notify on multiple channels for stage_failed event', async () => {
      await (manager as any).notifyEvent('stage_failed', { reason: 'test' });
      // stage_failed goes to teams, slack, email, pagerduty
      const notifyCalls = consoleSpy.mock.calls.filter(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('Notifying'),
      );
      expect(notifyCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('httpRequest (private)', () => {
    it('should return 200 with healthy body (stub)', async () => {
      const endpoint = {
        path: '/api/v1/health/live',
        method: 'GET' as const,
        expectedStatus: [200],
        timeoutMs: 5000,
      };

      const result = await (manager as any).httpRequest(endpoint);
      expect(result.status).toBe(200);
      expect(result.body).toContain('healthy');
    });
  });

  describe('collectMetrics (private)', () => {
    it('should return a MetricSnapshot with expected fields', async () => {
      const metrics = await (manager as any).collectMetrics();
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.latencyP50Ms).toBe('number');
      expect(typeof metrics.latencyP95Ms).toBe('number');
      expect(typeof metrics.latencyP99Ms).toBe('number');
      expect(typeof metrics.requestCount).toBe('number');
      expect(typeof metrics.cpuUsage).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });
  });

  describe('runHealthChecks (private)', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should return results for all endpoints', async () => {
      const config = getDefaultHealthChecks();
      const results = await (manager as any).runHealthChecks(config);
      expect(results.length).toBe(config.endpoints.length);
      for (const result of results) {
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.responseTimeMs).toBe('number');
      }
    });

    it('should mark successful when response status matches expected', async () => {
      const config = getDefaultHealthChecks();
      const results = await (manager as any).runHealthChecks(config);
      // Default httpRequest returns 200, all endpoints expect 200
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
      }
    });

    it('should handle http request errors gracefully', async () => {
      jest.spyOn(manager as any, 'httpRequest').mockRejectedValue(new Error('Connection refused'));
      const notifySpy = jest.spyOn(manager as any, 'notifyEvent').mockResolvedValue(undefined);

      const config = getDefaultHealthChecks();
      const results = await (manager as any).runHealthChecks(config);

      for (const result of results) {
        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(0);
        expect(result.error).toBe('Connection refused');
      }
      expect(notifySpy).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should handle non-Error throw in httpRequest', async () => {
      jest.spyOn(manager as any, 'httpRequest').mockRejectedValue('string error');
      jest.spyOn(manager as any, 'notifyEvent').mockResolvedValue(undefined);

      const config = getDefaultHealthChecks();
      const results = await (manager as any).runHealthChecks(config);

      for (const result of results) {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      }

      jest.restoreAllMocks();
    });
  });

  describe('monitorDeployment (private) - controlled scenarios', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should exit when status is neither in_progress nor waiting_approval', async () => {
      (manager as any).state.status = 'completed';

      await (manager as any).monitorDeployment();
      // Should exit immediately without error
      expect(manager.getState().status).toBe('completed');
    });

    it('should initiate rollback when trigger is breached during monitoring', async () => {
      (manager as any).state.status = 'in_progress';
      (manager as any).state.currentStage = 0;

      // Mock httpRequest to succeed
      jest
        .spyOn(manager as any, 'httpRequest')
        .mockResolvedValue({ status: 200, body: '{"status":"healthy"}' });

      // Mock collectMetrics to return breaching metrics
      jest.spyOn(manager as any, 'collectMetrics').mockResolvedValue({
        timestamp: new Date(),
        errorRate: 50.0, // will breach error_rate threshold of 1.0
        latencyP50Ms: 50,
        latencyP95Ms: 150,
        latencyP99Ms: 300,
        requestCount: 1000,
        cpuUsage: 40,
        memoryUsage: 60,
      });

      await (manager as any).monitorDeployment();

      expect(manager.getState().status).toBe('failed');
    });

    it('should set waiting_approval when promotion requires manual approval', async () => {
      (manager as any).state.status = 'in_progress';
      (manager as any).state.currentStage = 2; // canary-half requires manual approval

      // Seed enough successful health checks and good metrics to meet promotion criteria
      (manager as any).state.healthCheckResults = Array.from({ length: 200 }, () => ({
        timestamp: new Date(),
        endpoint: '/api/v1/health',
        success: true,
        responseTimeMs: 50,
        statusCode: 200,
      }));
      (manager as any).state.metricsHistory = Array.from({ length: 20 }, () => ({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      }));

      // Mock httpRequest and collectMetrics to return good data
      jest
        .spyOn(manager as any, 'httpRequest')
        .mockResolvedValue({ status: 200, body: '{"status":"healthy"}' });
      jest.spyOn(manager as any, 'collectMetrics').mockResolvedValue({
        timestamp: new Date(),
        errorRate: 0.1,
        latencyP50Ms: 50,
        latencyP95Ms: 100,
        latencyP99Ms: 200,
        requestCount: 500,
        cpuUsage: 30,
        memoryUsage: 50,
      });

      // Mock sleep so it does not actually wait, and change status to break the loop
      jest.spyOn(manager as any, 'sleep').mockImplementation(async () => {
        // After one iteration with waiting_approval, break the loop by changing status
        if ((manager as any).state.status === 'waiting_approval') {
          (manager as any).state.status = 'cancelled';
        }
      });

      await (manager as any).monitorDeployment();

      // Status should have been set to waiting_approval at some point
      // (we then changed it to cancelled in mock to break the loop)
      expect(manager.getState().status).toBe('cancelled');
    });
  });

  describe('getAzureContainerAppsTrafficConfig - boundary values', () => {
    it('should handle 0% canary (all traffic to stable)', () => {
      const config = getAzureContainerAppsTrafficConfig('stable', 'canary', 0);
      expect(config.trafficWeights[0].weight).toBe(100);
      expect(config.trafficWeights[1].weight).toBe(0);
    });

    it('should handle 100% canary (all traffic to canary)', () => {
      const config = getAzureContainerAppsTrafficConfig('stable', 'canary', 100);
      expect(config.trafficWeights[0].weight).toBe(0);
      expect(config.trafficWeights[1].weight).toBe(100);
    });
  });

  describe('generateTerraformTrafficConfig - boundary values', () => {
    it('should handle 0% canary', () => {
      const config = generateTerraformTrafficConfig(0);
      expect(config).toContain('percentage      = 100');
      expect(config).toContain('percentage      = 0');
    });

    it('should handle 100% canary', () => {
      const config = generateTerraformTrafficConfig(100);
      expect(config).toContain('percentage      = 0');
      expect(config).toContain('percentage      = 100');
    });

    it('should output valid terraform block structure', () => {
      const config = generateTerraformTrafficConfig(30);
      expect(config).toContain('ingress {');
      expect(config).toContain('external_enabled = true');
      expect(config).toContain('target_port      = 3000');
      expect(config).toContain('transport        = "auto"');
    });
  });

  describe('getCanaryAzureCliCommands - content validation', () => {
    it('should include container image in update command', () => {
      const commands = getCanaryAzureCliCommands('app', 'rg', 'myregistry.azurecr.io/app:v2');
      const hasImage = commands.some((cmd) => cmd.includes('myregistry.azurecr.io/app:v2'));
      expect(hasImage).toBe(true);
    });

    it('should include progressive traffic percentages', () => {
      const commands = getCanaryAzureCliCommands('app', 'rg', 'img');
      const all = commands.join('\n');
      expect(all).toContain('stable=95 canary=5');
      expect(all).toContain('stable=75 canary=25');
      expect(all).toContain('stable=50 canary=50');
      expect(all).toContain('canary=100');
      expect(all).toContain('stable=100');
    });

    it('should include revision-suffix in update command', () => {
      const commands = getCanaryAzureCliCommands('app', 'rg', 'img');
      const hasRevision = commands.some((cmd) => cmd.includes('--revision-suffix'));
      expect(hasRevision).toBe(true);
    });
  });

  describe('getCanaryNotificationConfig - channel validation', () => {
    it('should have pagerduty channel with critical priority', () => {
      const config = getCanaryNotificationConfig();
      const pagerduty = config.channels.find((c) => c.type === 'pagerduty');
      expect(pagerduty).toBeDefined();
      expect(pagerduty?.priority).toBe('critical');
    });

    it('should have email channel with high priority', () => {
      const config = getCanaryNotificationConfig();
      const email = config.channels.find((c) => c.type === 'email');
      expect(email).toBeDefined();
      expect(email?.priority).toBe('high');
    });

    it('should have slack channel with normal priority', () => {
      const config = getCanaryNotificationConfig();
      const slack = config.channels.find((c) => c.type === 'slack');
      expect(slack).toBeDefined();
      expect(slack?.priority).toBe('normal');
    });

    it('should notify health_check_failed via pagerduty', () => {
      const config = getCanaryNotificationConfig();
      const event = config.events.find((e) => e.event === 'health_check_failed');
      expect(event?.channels).toContain('pagerduty');
    });

    it('should notify threshold_breached via email', () => {
      const config = getCanaryNotificationConfig();
      const event = config.events.find((e) => e.event === 'threshold_breached');
      expect(event?.channels).toContain('email');
    });

    it('should notify manual_approval_required via email', () => {
      const config = getCanaryNotificationConfig();
      const event = config.events.find((e) => e.event === 'manual_approval_required');
      expect(event?.channels).toContain('email');
    });

    it('should notify threshold_warning via teams and slack only', () => {
      const config = getCanaryNotificationConfig();
      const event = config.events.find((e) => e.event === 'threshold_warning');
      expect(event?.channels).toEqual(['teams', 'slack']);
    });

    it('should have 10 events configured', () => {
      const config = getCanaryNotificationConfig();
      expect(config.events.length).toBe(10);
    });

    it('should have 4 channels configured', () => {
      const config = getCanaryNotificationConfig();
      expect(config.channels.length).toBe(4);
    });
  });

  describe('getCanaryMetricsConfig - additional validation', () => {
    it('should have canary_latency_p95 metric with percentile', () => {
      const config = getCanaryMetricsConfig();
      const latencyMetric = config.customMetrics.find((m) => m.name === 'canary_latency_p95');
      expect(latencyMetric).toBeDefined();
      expect(latencyMetric?.aggregation).toBe('percentile');
      expect(latencyMetric?.percentile).toBe(95);
      expect(latencyMetric?.unit).toBe('milliseconds');
    });

    it('should have canary_throughput metric', () => {
      const config = getCanaryMetricsConfig();
      const throughput = config.customMetrics.find((m) => m.name === 'canary_throughput');
      expect(throughput).toBeDefined();
      expect(throughput?.unit).toBe('requests_per_second');
      expect(throughput?.aggregation).toBe('avg');
    });

    it('should have 3 custom metrics', () => {
      const config = getCanaryMetricsConfig();
      expect(config.customMetrics.length).toBe(3);
    });

    it('should have non-empty queries for all custom metrics', () => {
      const config = getCanaryMetricsConfig();
      for (const metric of config.customMetrics) {
        expect(metric.query.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('getGlobalCanarySettings - additional validation', () => {
    it('should have revision history limit of 10', () => {
      const settings = getGlobalCanarySettings();
      expect(settings.revisionHistoryLimit).toBe(10);
    });

    it('should have stable revision label', () => {
      const settings = getGlobalCanarySettings();
      expect(settings.stableRevisionLabel).toBe('stable');
    });

    it('should have canary revision label', () => {
      const settings = getGlobalCanarySettings();
      expect(settings.canaryRevisionLabel).toBe('canary');
    });
  });

  describe('getDefaultCanaryStages - additional validation', () => {
    it('should have increasing minDurationMinutes across stages', () => {
      const stages = getDefaultCanaryStages();
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].minDurationMinutes).toBeGreaterThanOrEqual(
          stages[i - 1].minDurationMinutes,
        );
      }
    });

    it('should have health checks enabled for all stages', () => {
      const stages = getDefaultCanaryStages();
      for (const stage of stages) {
        expect(stage.healthChecks.enabled).toBe(true);
      }
    });

    it('should have rollback triggers for all stages', () => {
      const stages = getDefaultCanaryStages();
      for (const stage of stages) {
        expect(stage.rollbackTriggers.length).toBeGreaterThan(0);
      }
    });

    it('should not require manual approval for initial and expanded stages', () => {
      const stages = getDefaultCanaryStages();
      expect(stages[0].promotionCriteria.requireManualApproval).toBe(false);
      expect(stages[1].promotionCriteria.requireManualApproval).toBe(false);
    });

    it('should not require manual approval for full rollout stage', () => {
      const stages = getDefaultCanaryStages();
      expect(stages[3].promotionCriteria.requireManualApproval).toBe(false);
    });

    it('should have increasing minRequestsProcessed across stages', () => {
      const stages = getDefaultCanaryStages();
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].promotionCriteria.minRequestsProcessed).toBeGreaterThanOrEqual(
          stages[i - 1].promotionCriteria.minRequestsProcessed,
        );
      }
    });
  });
});
