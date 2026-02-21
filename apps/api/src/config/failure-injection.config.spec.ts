/**
 * Failure Injection Configuration Tests
 */
import {
  FailureScenario,
  FailureCategory,
  ImpactLevel,
  InjectionType,
  FailureParameters,
  ExpectedBehavior,
  ValidationChecks,
  RollbackTrigger,
  getDatabaseFailureScenarios,
  getExternalApiFailureScenarios,
  getNetworkFailureScenarios,
  getPodFailureScenarios,
  getResourcePressureScenarios,
  getAllFailureScenarios,
  generateChaosMeshExperiments,
  FailureInjectionRunner,
} from './failure-injection.config';

describe('Failure Injection Config', () => {
  describe('getDatabaseFailureScenarios', () => {
    it('should return database failure scenarios', () => {
      const scenarios = getDatabaseFailureScenarios();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should have correct structure for each scenario', () => {
      const scenarios = getDatabaseFailureScenarios();
      scenarios.forEach((scenario) => {
        expect(scenario).toHaveProperty('id');
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('category', 'database');
        expect(scenario).toHaveProperty('description');
        expect(scenario).toHaveProperty('impact');
        expect(scenario).toHaveProperty('targetService');
        expect(scenario).toHaveProperty('injectionType');
        expect(scenario).toHaveProperty('parameters');
        expect(scenario).toHaveProperty('expectedBehavior');
        expect(scenario).toHaveProperty('validation');
        expect(scenario).toHaveProperty('rollbackTriggers');
      });
    });

    it('should include db-connection-timeout scenario', () => {
      const scenarios = getDatabaseFailureScenarios();
      const timeout = scenarios.find((s) => s.id === 'db-connection-timeout');
      expect(timeout).toBeDefined();
      expect(timeout?.impact).toBe('high');
      expect(timeout?.injectionType).toBe('timeout');
      expect(timeout?.parameters.delayMs).toBe(30000);
    });

    it('should include db-pool-exhaustion scenario', () => {
      const scenarios = getDatabaseFailureScenarios();
      const poolExhaustion = scenarios.find((s) => s.id === 'db-pool-exhaustion');
      expect(poolExhaustion).toBeDefined();
      expect(poolExhaustion?.injectionType).toBe('resource-exhaustion');
      expect(poolExhaustion?.parameters.intensity).toBe(100);
    });

    it('should have valid rollback triggers', () => {
      const scenarios = getDatabaseFailureScenarios();
      scenarios.forEach((scenario) => {
        scenario.rollbackTriggers.forEach((trigger) => {
          expect(trigger).toHaveProperty('metric');
          expect(trigger).toHaveProperty('threshold');
          expect(['gt', 'lt', 'eq', 'gte', 'lte']).toContain(trigger.operator);
          expect(['stop', 'pause', 'notify']).toContain(trigger.action);
        });
      });
    });
  });

  describe('getExternalApiFailureScenarios', () => {
    it('should return external API failure scenarios', () => {
      const scenarios = getExternalApiFailureScenarios();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should have category external-service', () => {
      const scenarios = getExternalApiFailureScenarios();
      scenarios.forEach((scenario) => {
        expect(scenario.category).toBe('external-service');
      });
    });

    it('should include stripe-api-timeout scenario', () => {
      const scenarios = getExternalApiFailureScenarios();
      const stripe = scenarios.find((s) => s.id === 'stripe-api-timeout');
      expect(stripe).toBeDefined();
      expect(stripe?.targetService).toBe('stripe-api');
      expect(stripe?.expectedBehavior.fallbackMechanism?.toLowerCase()).toContain('queue');
    });

    it('should include sendgrid-failure scenario', () => {
      const scenarios = getExternalApiFailureScenarios();
      const sendgrid = scenarios.find((s) => s.id === 'sendgrid-failure');
      expect(sendgrid).toBeDefined();
      expect(sendgrid?.injectionType).toBe('connection-failure');
      expect(sendgrid?.parameters.errorCode).toBe(503);
    });

    it('should include azure-storage-timeout scenario', () => {
      const scenarios = getExternalApiFailureScenarios();
      const azure = scenarios.find((s) => s.id === 'azure-storage-timeout');
      expect(azure).toBeDefined();
      expect(azure?.parameters.affectedEndpoints).toContain('*.blob.core.windows.net');
    });

    it('should include oauth-provider-timeout scenario', () => {
      const scenarios = getExternalApiFailureScenarios();
      const oauth = scenarios.find((s) => s.id === 'oauth-provider-timeout');
      expect(oauth).toBeDefined();
      expect(oauth?.impact).toBe('high');
    });
  });

  describe('getNetworkFailureScenarios', () => {
    it('should return network failure scenarios', () => {
      const scenarios = getNetworkFailureScenarios();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should have category network', () => {
      const scenarios = getNetworkFailureScenarios();
      scenarios.forEach((scenario) => {
        expect(scenario.category).toBe('network');
      });
    });

    it('should include network-latency-500ms scenario', () => {
      const scenarios = getNetworkFailureScenarios();
      const latency = scenarios.find((s) => s.id === 'network-latency-500ms');
      expect(latency).toBeDefined();
      expect(latency?.parameters.delayMs).toBe(500);
      expect(latency?.impact).toBe('low');
    });

    it('should include network-partition scenario', () => {
      const scenarios = getNetworkFailureScenarios();
      const partition = scenarios.find((s) => s.id === 'network-partition');
      expect(partition).toBeDefined();
      expect(partition?.impact).toBe('critical');
      expect(partition?.injectionType).toBe('partition');
    });

    it('should include dns-failure scenario', () => {
      const scenarios = getNetworkFailureScenarios();
      const dns = scenarios.find((s) => s.id === 'dns-failure');
      expect(dns).toBeDefined();
      expect(dns?.injectionType).toBe('dns-failure');
    });
  });

  describe('getPodFailureScenarios', () => {
    it('should return pod failure scenarios', () => {
      const scenarios = getPodFailureScenarios();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should have category infrastructure', () => {
      const scenarios = getPodFailureScenarios();
      scenarios.forEach((scenario) => {
        expect(scenario.category).toBe('infrastructure');
      });
    });

    it('should include pod-kill-single scenario', () => {
      const scenarios = getPodFailureScenarios();
      const single = scenarios.find((s) => s.id === 'pod-kill-single');
      expect(single).toBeDefined();
      expect(single?.injectionType).toBe('crash');
      expect(single?.impact).toBe('low');
    });

    it('should include pod-kill-multiple scenario', () => {
      const scenarios = getPodFailureScenarios();
      const multiple = scenarios.find((s) => s.id === 'pod-kill-multiple');
      expect(multiple).toBeDefined();
      expect(multiple?.impact).toBe('high');
      expect(multiple?.parameters.targetPercentage).toBe(50);
    });

    it('should include container-oom scenario', () => {
      const scenarios = getPodFailureScenarios();
      const oom = scenarios.find((s) => s.id === 'container-oom');
      expect(oom).toBeDefined();
      expect(oom?.injectionType).toBe('resource-exhaustion');
    });
  });

  describe('getResourcePressureScenarios', () => {
    it('should return resource pressure scenarios', () => {
      const scenarios = getResourcePressureScenarios();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should have category compute or storage', () => {
      const scenarios = getResourcePressureScenarios();
      scenarios.forEach((scenario) => {
        expect(['compute', 'storage']).toContain(scenario.category);
      });
    });

    it('should include cpu-pressure-80 scenario', () => {
      const scenarios = getResourcePressureScenarios();
      const cpu80 = scenarios.find((s) => s.id === 'cpu-pressure-80');
      expect(cpu80).toBeDefined();
      expect(cpu80?.parameters.intensity).toBe(80);
    });

    it('should include memory-pressure-90 scenario', () => {
      const scenarios = getResourcePressureScenarios();
      const mem90 = scenarios.find((s) => s.id === 'memory-pressure-90');
      expect(mem90).toBeDefined();
      expect(mem90?.parameters.intensity).toBe(90);
    });
  });

  describe('getAllFailureScenarios', () => {
    it('should return all scenarios combined', () => {
      const allScenarios = getAllFailureScenarios();
      const dbScenarios = getDatabaseFailureScenarios();
      const apiScenarios = getExternalApiFailureScenarios();
      const networkScenarios = getNetworkFailureScenarios();
      const podScenarios = getPodFailureScenarios();
      const resourceScenarios = getResourcePressureScenarios();

      const expectedTotal =
        dbScenarios.length +
        apiScenarios.length +
        networkScenarios.length +
        podScenarios.length +
        resourceScenarios.length;

      expect(allScenarios.length).toBe(expectedTotal);
    });

    it('should have unique IDs', () => {
      const allScenarios = getAllFailureScenarios();
      const ids = allScenarios.map((s) => s.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('generateChaosMeshExperiments', () => {
    it('should generate ChaosMesh experiments from scenarios', () => {
      const experiments = generateChaosMeshExperiments();
      expect(Array.isArray(experiments)).toBe(true);
      expect(experiments.length).toBeGreaterThan(0);
    });

    it('should have correct ChaosMesh structure', () => {
      const experiments = generateChaosMeshExperiments();
      experiments.forEach((exp) => {
        expect(exp.apiVersion).toBe('chaos-mesh.org/v1alpha1');
        expect(exp).toHaveProperty('kind');
        expect(exp).toHaveProperty('metadata');
        expect(exp).toHaveProperty('spec');
        expect(exp.metadata).toHaveProperty('name');
        expect(exp.metadata).toHaveProperty('namespace', 'quiz2biz');
      });
    });

    it('should map injection types to ChaosMesh kinds', () => {
      const experiments = generateChaosMeshExperiments();
      const kinds = experiments.map((e) => e.kind);
      expect(kinds).toContain('NetworkChaos');
      expect(kinds).toContain('PodChaos');
      expect(kinds).toContain('StressChaos');
    });
  });

  describe('FailureInjectionRunner', () => {
    let runner: FailureInjectionRunner;

    beforeEach(() => {
      runner = new FailureInjectionRunner();
    });

    it('should execute a scenario', async () => {
      const scenario = getDatabaseFailureScenarios()[0];
      const result = await runner.executeScenario(scenario);

      expect(result).toHaveProperty('experimentId', scenario.id);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('durationMs');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('observations');
      expect(result).toHaveProperty('recommendations');
    });

    it('should track observations during execution', async () => {
      const scenario = getDatabaseFailureScenarios()[0];
      const result = await runner.executeScenario(scenario);

      expect(result.observations.length).toBeGreaterThan(0);
      expect(result.observations).toContain(`Starting experiment: ${scenario.name}`);
    });

    it('should generate recommendations', async () => {
      const scenario = getDatabaseFailureScenarios()[0];
      const result = await runner.executeScenario(scenario);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should calculate duration correctly', async () => {
      const scenario = getDatabaseFailureScenarios()[0];
      const result = await runner.executeScenario(scenario);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.endTime.getTime()).toBeGreaterThanOrEqual(result.startTime.getTime());
    });
  });

  describe('Type definitions', () => {
    it('should have valid FailureCategory values', () => {
      const categories: FailureCategory[] = [
        'database',
        'network',
        'compute',
        'storage',
        'external-service',
        'application',
        'infrastructure',
      ];
      const scenarios = getAllFailureScenarios();
      scenarios.forEach((s) => {
        expect(categories).toContain(s.category);
      });
    });

    it('should have valid ImpactLevel values', () => {
      const impacts: ImpactLevel[] = ['low', 'medium', 'high', 'critical'];
      const scenarios = getAllFailureScenarios();
      scenarios.forEach((s) => {
        expect(impacts).toContain(s.impact);
      });
    });

    it('should have valid InjectionType values', () => {
      const types: InjectionType[] = [
        'latency',
        'timeout',
        'connection-failure',
        'data-corruption',
        'resource-exhaustion',
        'crash',
        'partition',
        'dns-failure',
        'certificate-failure',
      ];
      const scenarios = getAllFailureScenarios();
      scenarios.forEach((s) => {
        expect(types).toContain(s.injectionType);
      });
    });
  });

  describe('Scenario validation', () => {
    it('should have duration in valid format', () => {
      const scenarios = getAllFailureScenarios();
      scenarios.forEach((scenario) => {
        expect(scenario.parameters.duration).toMatch(/^\d+[msh]$/);
      });
    });

    it('should have recovery time defined', () => {
      const scenarios = getAllFailureScenarios();
      scenarios.forEach((scenario) => {
        expect(scenario.expectedBehavior.recoveryTimeSeconds).toBeGreaterThan(0);
      });
    });

    it('should have max error rate defined', () => {
      const scenarios = getAllFailureScenarios();
      scenarios.forEach((scenario) => {
        expect(typeof scenario.expectedBehavior.maxErrorRate).toBe('number');
      });
    });
  });
});
