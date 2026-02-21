/**
 * @fileoverview Tests for chaos-engineering.config.ts
 */
import {
  getDefaultChaosExperiments,
  getAzureChaosStudioConfig,
  getChaosMeshConfig,
  getDefaultGameDayConfig,
  getSteadyStateHypotheses,
  ChaosExperimentConfig,
} from './chaos-engineering.config';

describe('getDefaultChaosExperiments', () => {
  let experiments: ChaosExperimentConfig[];

  beforeAll(() => {
    experiments = getDefaultChaosExperiments();
  });

  it('should return array of experiments', () => {
    expect(Array.isArray(experiments)).toBe(true);
    expect(experiments.length).toBeGreaterThan(0);
  });

  it('should have database timeout experiment', () => {
    const dbExp = experiments.find((e) => e.id === 'exp-db-timeout');
    expect(dbExp).toBeDefined();
    expect(dbExp?.name).toBe('Database Connection Timeout');
    expect(dbExp?.type).toBe('network-latency');
  });

  it('should have external API timeout experiment', () => {
    const apiExp = experiments.find((e) => e.id === 'exp-api-timeout');
    expect(apiExp).toBeDefined();
    expect(apiExp?.type).toBe('http-chaos');
    expect(apiExp?.parameters.errorRate).toBe(0.5);
  });

  it('should have network latency 500ms experiment', () => {
    const latencyExp = experiments.find((e) => e.id === 'exp-network-latency-500ms');
    expect(latencyExp).toBeDefined();
    expect(latencyExp?.parameters.latencyMs).toBe(500);
    expect(latencyExp?.parameters.jitterMs).toBe(100);
  });

  it('should have network latency 2000ms experiment', () => {
    const latencyExp = experiments.find((e) => e.id === 'exp-network-latency-2000ms');
    expect(latencyExp).toBeDefined();
    expect(latencyExp?.parameters.latencyMs).toBe(2000);
    expect(latencyExp?.target.percentage).toBe(25);
  });

  it('should have pod kill experiment', () => {
    const podExp = experiments.find((e) => e.id === 'exp-pod-kill');
    expect(podExp).toBeDefined();
    expect(podExp?.type).toBe('pod-kill');
    expect(podExp?.target.percentage).toBe(50);
  });

  it('should have CPU pressure experiment', () => {
    const cpuExp = experiments.find((e) => e.id === 'exp-cpu-pressure');
    expect(cpuExp).toBeDefined();
    expect(cpuExp?.parameters.cpuPercent).toBe(90);
  });

  it('should have memory pressure experiment', () => {
    const memExp = experiments.find((e) => e.id === 'exp-memory-pressure');
    expect(memExp).toBeDefined();
    expect(memExp?.parameters.memoryBytes).toBe('512Mi');
  });

  it('should have disk pressure experiment', () => {
    const diskExp = experiments.find((e) => e.id === 'exp-disk-pressure');
    expect(diskExp).toBeDefined();
    expect(diskExp?.parameters.diskFillPercent).toBe(95);
  });

  it('should have DNS chaos experiment', () => {
    const dnsExp = experiments.find((e) => e.id === 'exp-dns-chaos');
    expect(dnsExp).toBeDefined();
    expect(dnsExp?.type).toBe('dns-chaos');
  });

  it('should have HTTP error injection experiment', () => {
    const httpExp = experiments.find((e) => e.id === 'exp-http-errors');
    expect(httpExp).toBeDefined();
    expect(httpExp?.parameters.httpStatusCode).toBe(503);
    expect(httpExp?.parameters.errorRate).toBe(0.2);
  });

  it('should have all experiments enabled', () => {
    experiments.forEach((exp) => {
      expect(exp.enabled).toBe(true);
    });
  });

  it('should have rollback config for all experiments', () => {
    experiments.forEach((exp) => {
      expect(exp.rollback).toBeDefined();
      expect(exp.rollback.automatic).toBe(true);
      expect(exp.rollback.triggerConditions.length).toBeGreaterThan(0);
    });
  });

  it('should have monitoring config for all experiments', () => {
    experiments.forEach((exp) => {
      expect(exp.monitoring).toBeDefined();
      expect(exp.monitoring.alertsEnabled).toBe(true);
      expect(exp.monitoring.metricsToWatch.length).toBeGreaterThan(0);
    });
  });
});

describe('getAzureChaosStudioConfig', () => {
  it('should return valid config', () => {
    const config = getAzureChaosStudioConfig();

    expect(config).toBeDefined();
    expect(config.resourceGroup).toBe('quiz2biz-prod-rg');
    expect(config.location).toBe('eastus');
  });

  it('should have target resource IDs', () => {
    const config = getAzureChaosStudioConfig();
    expect(config.targetResourceIds.length).toBeGreaterThan(0);
  });

  it('should have experiments', () => {
    const config = getAzureChaosStudioConfig();
    expect(config.experiments.length).toBeGreaterThan(0);
  });

  it('should have CPU pressure experiment', () => {
    const config = getAzureChaosStudioConfig();
    const cpuExp = config.experiments.find((e) => e.name.includes('cpu-pressure'));

    expect(cpuExp).toBeDefined();
    expect(cpuExp?.identity.type).toBe('SystemAssigned');
  });

  it('should have network latency experiment', () => {
    const config = getAzureChaosStudioConfig();
    const networkExp = config.experiments.find((e) => e.name.includes('network-latency'));

    expect(networkExp).toBeDefined();
    expect(networkExp?.properties.steps.length).toBeGreaterThan(0);
  });

  it('should have selectors in experiments', () => {
    const config = getAzureChaosStudioConfig();

    config.experiments.forEach((exp) => {
      expect(exp.properties.selectors.length).toBeGreaterThan(0);
    });
  });
});

describe('getChaosMeshConfig', () => {
  it('should return valid config', () => {
    const config = getChaosMeshConfig();

    expect(config).toBeDefined();
    expect(config.version).toBe('2.6.0');
    expect(config.namespace).toBe('chaos-mesh');
  });

  it('should have dashboard enabled', () => {
    const config = getChaosMeshConfig();

    expect(config.dashboard.enabled).toBe(true);
    expect(config.dashboard.port).toBe(2333);
  });

  it('should have ingress configured', () => {
    const config = getChaosMeshConfig();

    expect(config.dashboard.ingress?.enabled).toBe(true);
    expect(config.dashboard.ingress?.host).toBe('chaos.quiz2biz.com');
  });

  it('should have experiments', () => {
    const config = getChaosMeshConfig();
    expect(config.experiments.length).toBeGreaterThan(0);
  });

  it('should have PodChaos experiment', () => {
    const config = getChaosMeshConfig();
    const podChaos = config.experiments.find((e) => e.kind === 'PodChaos');

    expect(podChaos).toBeDefined();
    expect(podChaos?.spec.action).toBe('pod-kill');
  });

  it('should have NetworkChaos experiments', () => {
    const config = getChaosMeshConfig();
    const networkExps = config.experiments.filter((e) => e.kind === 'NetworkChaos');

    expect(networkExps.length).toBeGreaterThan(0);
  });

  it('should have network delay experiment', () => {
    const config = getChaosMeshConfig();
    const delayExp = config.experiments.find((e) => e.metadata.name === 'network-delay-500ms');

    expect(delayExp).toBeDefined();
    expect(delayExp?.spec.delay?.latency).toBe('500ms');
  });

  it('should have StressChaos experiments', () => {
    const config = getChaosMeshConfig();
    const stressExps = config.experiments.filter((e) => e.kind === 'StressChaos');

    expect(stressExps.length).toBeGreaterThan(0);
  });

  it('should have CPU stress experiment', () => {
    const config = getChaosMeshConfig();
    const cpuStress = config.experiments.find((e) => e.metadata.name === 'stress-cpu-90');

    expect(cpuStress).toBeDefined();
    expect(cpuStress?.spec.stressors?.cpu?.load).toBe(90);
  });

  it('should have DNSChaos experiment', () => {
    const config = getChaosMeshConfig();
    const dnsExp = config.experiments.find((e) => e.kind === 'DNSChaos');

    expect(dnsExp).toBeDefined();
    expect(dnsExp?.spec.action).toBe('error');
  });

  it('should have HTTPChaos experiment', () => {
    const config = getChaosMeshConfig();
    const httpExp = config.experiments.find((e) => e.kind === 'HTTPChaos');

    expect(httpExp).toBeDefined();
  });

  it('should have IOChaos experiment', () => {
    const config = getChaosMeshConfig();
    const ioExp = config.experiments.find((e) => e.kind === 'IOChaos');

    expect(ioExp).toBeDefined();
    expect(ioExp?.spec.action).toBe('latency');
  });

  it('should target quiz2biz namespace', () => {
    const config = getChaosMeshConfig();

    config.experiments.forEach((exp) => {
      expect(exp.metadata.namespace).toBe('quiz2biz');
      expect(exp.spec.selector.namespaces).toContain('quiz2biz');
    });
  });
});

describe('getDefaultGameDayConfig', () => {
  it('should return valid config', () => {
    const config = getDefaultGameDayConfig();

    expect(config).toBeDefined();
    expect(config.name).toBe('Quiz2Biz Resilience Game Day');
    expect(config.duration).toBe('4h');
  });

  it('should have experiments in order', () => {
    const config = getDefaultGameDayConfig();

    expect(config.experiments.length).toBeGreaterThan(0);
    config.experiments.forEach((exp, i) => {
      expect(exp.order).toBe(i + 1);
    });
  });

  it('should have progressive start delays', () => {
    const config = getDefaultGameDayConfig();
    const delays = config.experiments.map((e) => e.startDelayMinutes);

    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it('should have expected outcomes for all experiments', () => {
    const config = getDefaultGameDayConfig();

    config.experiments.forEach((exp) => {
      expect(exp.expectedOutcome).toBeDefined();
      expect(exp.expectedOutcome.length).toBeGreaterThan(0);
    });
  });

  it('should have participants', () => {
    const config = getDefaultGameDayConfig();

    expect(config.participants.length).toBe(4);

    const roles = config.participants.map((p) => p.role);
    expect(roles).toContain('facilitator');
    expect(roles).toContain('observer');
    expect(roles).toContain('responder');
    expect(roles).toContain('scribe');
  });

  it('should have runbook', () => {
    const config = getDefaultGameDayConfig();

    expect(config.runbook).toContain('https://');
    expect(config.runbook).toContain('game-day');
  });

  it('should have success criteria', () => {
    const config = getDefaultGameDayConfig();

    expect(config.successCriteria.length).toBeGreaterThan(0);

    const noDataLoss = config.successCriteria.find((c) => c.metric === 'data_loss');
    expect(noDataLoss).toBeDefined();
    expect(noDataLoss?.threshold).toBe(0);
  });

  it('should have recovery time criteria', () => {
    const config = getDefaultGameDayConfig();

    const recoveryTime = config.successCriteria.find(
      (c) => c.metric === 'recovery_time_minutes',
    );
    expect(recoveryTime).toBeDefined();
    expect(recoveryTime?.operator).toBe('lt');
    expect(recoveryTime?.threshold).toBe(5);
  });
});

describe('getSteadyStateHypotheses', () => {
  it('should return array of hypotheses', () => {
    const hypotheses = getSteadyStateHypotheses();

    expect(Array.isArray(hypotheses)).toBe(true);
    expect(hypotheses.length).toBeGreaterThan(0);
  });

  it('should have API Health Check hypothesis', () => {
    const hypotheses = getSteadyStateHypotheses();
    const apiHealth = hypotheses.find((h) => h.name === 'API Health Check');

    expect(apiHealth).toBeDefined();
    expect(apiHealth?.probes.length).toBeGreaterThan(0);
  });

  it('should have Response Time SLA hypothesis', () => {
    const hypotheses = getSteadyStateHypotheses();
    const responseSla = hypotheses.find((h) => h.name === 'Response Time SLA');

    expect(responseSla).toBeDefined();
    expect(responseSla?.probes[0].type).toBe('metric');
  });

  it('should have Error Rate SLA hypothesis', () => {
    const hypotheses = getSteadyStateHypotheses();
    const errorSla = hypotheses.find((h) => h.name === 'Error Rate SLA');

    expect(errorSla).toBeDefined();
    expect(errorSla?.probes[0].tolerance.range?.max).toBe(1);
  });

  it('should have valid probe configurations', () => {
    const hypotheses = getSteadyStateHypotheses();

    hypotheses.forEach((hypothesis) => {
      hypothesis.probes.forEach((probe) => {
        expect(probe.name).toBeDefined();
        expect(probe.type).toBeDefined();
        expect(probe.provider).toBeDefined();
        expect(probe.tolerance).toBeDefined();
      });
    });
  });

  it('should have azure-monitor as metric provider', () => {
    const hypotheses = getSteadyStateHypotheses();
    const metricProbes = hypotheses
      .flatMap((h) => h.probes)
      .filter((p) => p.type === 'metric');

    metricProbes.forEach((probe) => {
      expect(probe.provider.type).toBe('azure-monitor');
      expect(probe.provider.query).toBeDefined();
    });
  });
});
