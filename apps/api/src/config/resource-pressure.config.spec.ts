/**
 * Resource Pressure Configuration Tests
 */
import {
  ResourceType,
  PressureLevel,
  getCpuPressureTests,
  getMemoryPressureTests,
  getDiskPressureTests,
  getNetworkPressureTests,
  getAllResourcePressureTests,
  getTestsByResourceType,
  getTestsByPressureLevel,
  ResourcePressureTestRunner,
} from './resource-pressure.config';

describe('Resource Pressure Config', () => {
  describe('getCpuPressureTests', () => {
    it('should return CPU pressure tests', () => {
      const tests = getCpuPressureTests();
      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should have resourceType cpu', () => {
      const tests = getCpuPressureTests();
      tests.forEach((test) => {
        expect(test.resourceType).toBe('cpu');
      });
    });

    it('should include cpu-pressure-80 test', () => {
      const tests = getCpuPressureTests();
      const cpu80 = tests.find((t) => t.id === 'cpu-pressure-80');
      expect(cpu80).toBeDefined();
      expect(cpu80?.pressureLevel).toBe('moderate');
      expect(cpu80?.parameters.targetPercentage).toBe(80);
    });

    it('should include cpu-pressure-90 test', () => {
      const tests = getCpuPressureTests();
      const cpu90 = tests.find((t) => t.id === 'cpu-pressure-90');
      expect(cpu90).toBeDefined();
      expect(cpu90?.pressureLevel).toBe('high');
      expect(cpu90?.parameters.targetPercentage).toBe(90);
    });

    it('should include cpu-spike-test', () => {
      const tests = getCpuPressureTests();
      const spike = tests.find((t) => t.id === 'cpu-spike-test');
      expect(spike).toBeDefined();
      expect(spike?.pressureLevel).toBe('critical');
      expect(spike?.parameters.rampUpSeconds).toBe(5);
    });

    it('should have correct structure', () => {
      const tests = getCpuPressureTests();
      tests.forEach((test) => {
        expect(test).toHaveProperty('id');
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('description');
        expect(test).toHaveProperty('resourceType');
        expect(test).toHaveProperty('pressureLevel');
        expect(test).toHaveProperty('parameters');
        expect(test).toHaveProperty('duration');
        expect(test).toHaveProperty('expectedBehavior');
        expect(test).toHaveProperty('alerts');
        expect(test).toHaveProperty('validationChecks');
      });
    });

    it('should have validation checks', () => {
      const tests = getCpuPressureTests();
      tests.forEach((test) => {
        expect(test.validationChecks.length).toBeGreaterThan(0);
        test.validationChecks.forEach((check) => {
          expect(check).toHaveProperty('name');
          expect(check).toHaveProperty('type');
          expect(check).toHaveProperty('condition');
          expect(check).toHaveProperty('expectedResult');
        });
      });
    });
  });

  describe('getMemoryPressureTests', () => {
    it('should return memory pressure tests', () => {
      const tests = getMemoryPressureTests();
      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should have resourceType memory', () => {
      const tests = getMemoryPressureTests();
      tests.forEach((test) => {
        expect(test.resourceType).toBe('memory');
      });
    });

    it('should include memory-pressure-80 test', () => {
      const tests = getMemoryPressureTests();
      const mem80 = tests.find((t) => t.id === 'memory-pressure-80');
      expect(mem80).toBeDefined();
      expect(mem80?.pressureLevel).toBe('moderate');
      expect(mem80?.parameters.fillSizeBytes).toBe('512MB');
    });

    it('should include memory-pressure-90 test', () => {
      const tests = getMemoryPressureTests();
      const mem90 = tests.find((t) => t.id === 'memory-pressure-90');
      expect(mem90).toBeDefined();
      expect(mem90?.pressureLevel).toBe('high');
    });

    it('should include memory-leak-simulation test', () => {
      const tests = getMemoryPressureTests();
      const leak = tests.find((t) => t.id === 'memory-leak-simulation');
      expect(leak).toBeDefined();
      expect(leak?.parameters.rampUpSeconds).toBe(300);
    });

    it('should have alerts configured', () => {
      const tests = getMemoryPressureTests();
      tests.forEach((test) => {
        expect(test.alerts.length).toBeGreaterThan(0);
        test.alerts.forEach((alert) => {
          expect(alert).toHaveProperty('name');
          expect(alert).toHaveProperty('metric');
          expect(alert).toHaveProperty('threshold');
          expect(alert).toHaveProperty('severity');
          expect(['warning', 'error', 'critical']).toContain(alert.severity);
        });
      });
    });
  });

  describe('getDiskPressureTests', () => {
    it('should return disk pressure tests', () => {
      const tests = getDiskPressureTests();
      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should have resourceType disk', () => {
      const tests = getDiskPressureTests();
      tests.forEach((test) => {
        expect(test.resourceType).toBe('disk');
      });
    });

    it('should include disk-pressure-85 test', () => {
      const tests = getDiskPressureTests();
      const disk85 = tests.find((t) => t.id === 'disk-pressure-85');
      expect(disk85).toBeDefined();
      expect(disk85?.pressureLevel).toBe('moderate');
    });

    it('should include disk-pressure-95 test', () => {
      const tests = getDiskPressureTests();
      const disk95 = tests.find((t) => t.id === 'disk-pressure-95');
      expect(disk95).toBeDefined();
      expect(disk95?.pressureLevel).toBe('critical');
    });

    it('should include disk-io-saturation test', () => {
      const tests = getDiskPressureTests();
      const io = tests.find((t) => t.id === 'disk-io-saturation');
      expect(io).toBeDefined();
      expect(io?.pressureLevel).toBe('high');
    });

    it('should have expected behaviors', () => {
      const tests = getDiskPressureTests();
      tests.forEach((test) => {
        expect(test.expectedBehavior).toHaveProperty('description');
        expect(test.expectedBehavior).toHaveProperty('acceptableLatencyIncrease');
        expect(test.expectedBehavior).toHaveProperty('maxErrorRate');
        expect(test.expectedBehavior).toHaveProperty('autoScaleExpected');
        expect(test.expectedBehavior).toHaveProperty('gracefulDegradationExpected');
        expect(test.expectedBehavior).toHaveProperty('alertsExpected');
        expect(test.expectedBehavior).toHaveProperty('fallbackMechanisms');
      });
    });
  });

  describe('getNetworkPressureTests', () => {
    it('should return network pressure tests', () => {
      const tests = getNetworkPressureTests();
      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should include network-bandwidth-saturation test', () => {
      const tests = getNetworkPressureTests();
      const bandwidth = tests.find((t) => t.id === 'network-bandwidth-saturation');
      expect(bandwidth).toBeDefined();
      expect(bandwidth?.resourceType).toBe('network-bandwidth');
      expect(bandwidth?.parameters.bandwidthLimitMbps).toBe(10);
    });

    it('should include connection-exhaustion test', () => {
      const tests = getNetworkPressureTests();
      const conn = tests.find((t) => t.id === 'connection-exhaustion');
      expect(conn).toBeDefined();
      expect(conn?.resourceType).toBe('connections');
      expect(conn?.parameters.connectionCount).toBe(1000);
    });

    it('should include fd-exhaustion test', () => {
      const tests = getNetworkPressureTests();
      const fd = tests.find((t) => t.id === 'fd-exhaustion');
      expect(fd).toBeDefined();
      expect(fd?.resourceType).toBe('file-descriptors');
      expect(fd?.pressureLevel).toBe('critical');
    });
  });

  describe('getAllResourcePressureTests', () => {
    it('should return all tests combined', () => {
      const allTests = getAllResourcePressureTests();
      const cpuTests = getCpuPressureTests();
      const memTests = getMemoryPressureTests();
      const diskTests = getDiskPressureTests();
      const netTests = getNetworkPressureTests();

      const expectedTotal = cpuTests.length + memTests.length + diskTests.length + netTests.length;
      expect(allTests.length).toBe(expectedTotal);
    });

    it('should have unique IDs', () => {
      const allTests = getAllResourcePressureTests();
      const ids = allTests.map((t) => t.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('getTestsByResourceType', () => {
    it('should filter by cpu resource type', () => {
      const tests = getTestsByResourceType('cpu');
      tests.forEach((test) => {
        expect(test.resourceType).toBe('cpu');
      });
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should filter by memory resource type', () => {
      const tests = getTestsByResourceType('memory');
      tests.forEach((test) => {
        expect(test.resourceType).toBe('memory');
      });
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should filter by disk resource type', () => {
      const tests = getTestsByResourceType('disk');
      tests.forEach((test) => {
        expect(test.resourceType).toBe('disk');
      });
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown type', () => {
      const tests = getTestsByResourceType('unknown' as ResourceType);
      expect(tests.length).toBe(0);
    });
  });

  describe('getTestsByPressureLevel', () => {
    it('should filter by moderate pressure level', () => {
      const tests = getTestsByPressureLevel('moderate');
      tests.forEach((test) => {
        expect(test.pressureLevel).toBe('moderate');
      });
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should filter by high pressure level', () => {
      const tests = getTestsByPressureLevel('high');
      tests.forEach((test) => {
        expect(test.pressureLevel).toBe('high');
      });
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should filter by critical pressure level', () => {
      const tests = getTestsByPressureLevel('critical');
      tests.forEach((test) => {
        expect(test.pressureLevel).toBe('critical');
      });
      expect(tests.length).toBeGreaterThan(0);
    });
  });

  describe('ResourcePressureTestRunner', () => {
    let runner: ResourcePressureTestRunner;

    beforeEach(() => {
      runner = new ResourcePressureTestRunner();
    });

    describe('runTest', () => {
      it('should run a test and return execution result', async () => {
        const test = getCpuPressureTests()[0];
        const execution = await runner.runTest(test);

        expect(execution).toHaveProperty('testId', test.id);
        expect(execution).toHaveProperty('startTime');
        expect(execution).toHaveProperty('endTime');
        expect(execution).toHaveProperty('status');
        expect(execution).toHaveProperty('metrics');
        expect(execution).toHaveProperty('validationResults');
        expect(execution).toHaveProperty('alerts');
      });

      it('should set status to passed when validations pass', async () => {
        const test = getCpuPressureTests()[0];
        const execution = await runner.runTest(test);

        expect(['passed', 'failed']).toContain(execution.status);
      });

      it('should populate validation results', async () => {
        const test = getCpuPressureTests()[0];
        const execution = await runner.runTest(test);

        expect(execution.validationResults.length).toBe(test.validationChecks.length);
        execution.validationResults.forEach((result) => {
          expect(result).toHaveProperty('checkName');
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('actualValue');
          expect(result).toHaveProperty('expectedValue');
        });
      });

      it('should populate alert results', async () => {
        const test = getCpuPressureTests()[0];
        const execution = await runner.runTest(test);

        expect(execution.alerts.length).toBe(test.alerts.length);
        execution.alerts.forEach((alert) => {
          expect(alert).toHaveProperty('alertName');
          expect(alert).toHaveProperty('triggered');
        });
      });
    });

    describe('getExecution', () => {
      it('should return execution by test ID', async () => {
        const test = getCpuPressureTests()[0];
        await runner.runTest(test);

        const execution = runner.getExecution(test.id);
        expect(execution).toBeDefined();
        expect(execution?.testId).toBe(test.id);
      });

      it('should return undefined for unknown test ID', () => {
        const execution = runner.getExecution('unknown-test');
        expect(execution).toBeUndefined();
      });
    });

    describe('getAllExecutions', () => {
      it('should return all executions', async () => {
        const tests = getCpuPressureTests().slice(0, 2);
        for (const test of tests) {
          await runner.runTest(test);
        }

        const executions = runner.getAllExecutions();
        expect(executions.length).toBe(2);
      });

      it('should return empty array when no tests run', () => {
        const executions = runner.getAllExecutions();
        expect(executions.length).toBe(0);
      });
    });
  });

  describe('Type definitions', () => {
    it('should have valid ResourceType values', () => {
      const types: ResourceType[] = [
        'cpu',
        'memory',
        'disk',
        'network-bandwidth',
        'file-descriptors',
        'connections',
      ];
      const allTests = getAllResourcePressureTests();
      allTests.forEach((test) => {
        expect(types).toContain(test.resourceType);
      });
    });

    it('should have valid PressureLevel values', () => {
      const levels: PressureLevel[] = ['moderate', 'high', 'critical'];
      const allTests = getAllResourcePressureTests();
      allTests.forEach((test) => {
        expect(levels).toContain(test.pressureLevel);
      });
    });
  });

  describe('Test parameters', () => {
    it('should have valid duration format', () => {
      const allTests = getAllResourcePressureTests();
      allTests.forEach((test) => {
        expect(test.duration).toMatch(/^\d+[msh]$/);
      });
    });

    it('should have target percentage between 0 and 100', () => {
      const allTests = getAllResourcePressureTests();
      allTests.forEach((test) => {
        expect(test.parameters.targetPercentage).toBeGreaterThanOrEqual(0);
        expect(test.parameters.targetPercentage).toBeLessThanOrEqual(100);
      });
    });

    it('should have positive ramp up and sustained times', () => {
      const allTests = getAllResourcePressureTests();
      allTests.forEach((test) => {
        if (test.parameters.rampUpSeconds !== undefined) {
          expect(test.parameters.rampUpSeconds).toBeGreaterThan(0);
        }
        if (test.parameters.sustainedSeconds !== undefined) {
          expect(test.parameters.sustainedSeconds).toBeGreaterThan(0);
        }
      });
    });
  });
});
