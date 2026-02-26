/**
 * @fileoverview Tests for disaster-recovery.config.ts
 */
import {
  getDisasterRecoveryTargets,
  getBackupConfigurations,
  getDRProcedures,
  getFailoverConfig,
  getPITRConfig,
  getDRTestConfigurations,
  DisasterRecoveryTargets,
} from './disaster-recovery.config';

describe('getDisasterRecoveryTargets', () => {
  let targets: DisasterRecoveryTargets;

  beforeAll(() => {
    targets = getDisasterRecoveryTargets();
  });

  it('should return valid RTO', () => {
    expect(targets.rtoMinutes).toBe(240); // 4 hours
  });

  it('should return valid RPO', () => {
    expect(targets.rpoMinutes).toBe(15); // 15 minutes
  });

  it('should return max downtime per month', () => {
    expect(targets.maxDowntimeMinutesPerMonth).toBeCloseTo(43.8, 1);
  });

  it('should return 99.9% availability target', () => {
    expect(targets.targetAvailability).toBe(99.9);
  });
});

describe('getBackupConfigurations', () => {
  it('should return array of backup configs', () => {
    const configs = getBackupConfigurations();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
  });

  it('should have database full backup', () => {
    const configs = getBackupConfigurations();
    const dbBackup = configs.find((c) => c.name === 'database-full-backup');

    expect(dbBackup).toBeDefined();
    expect(dbBackup?.type).toBe('full');
    expect(dbBackup?.schedule.frequency).toBe('daily');
  });

  it('should have WAL backup for PITR', () => {
    const configs = getBackupConfigurations();
    const walBackup = configs.find((c) => c.name === 'database-wal-backup');

    expect(walBackup).toBeDefined();
    expect(walBackup?.type).toBe('transaction-log');
    expect(walBackup?.schedule.frequency).toBe('continuous');
  });

  it('should have blob storage backup', () => {
    const configs = getBackupConfigurations();
    const blobBackup = configs.find((c) => c.name === 'blob-storage-backup');

    expect(blobBackup).toBeDefined();
    expect(blobBackup?.type).toBe('incremental');
  });

  it('should have encryption enabled for all backups', () => {
    const configs = getBackupConfigurations();

    configs.forEach((config) => {
      expect(config.encryption.enabled).toBe(true);
      expect(['AES-256', 'RSA-2048', 'RSA-4096']).toContain(config.encryption.algorithm);
    });
  });

  it('should have validation enabled for all backups', () => {
    const configs = getBackupConfigurations();

    configs.forEach((config) => {
      expect(config.validation.enabled).toBe(true);
      expect(config.validation.checksumValidation).toBe(true);
    });
  });

  it('should have proper redundancy', () => {
    const configs = getBackupConfigurations();
    const validRedundancy = ['LRS', 'GRS', 'ZRS', 'GZRS', 'RA-GRS', 'RA-GZRS'];

    configs.forEach((config) => {
      expect(validRedundancy).toContain(config.storage.redundancy);
    });
  });
});

describe('getDRProcedures', () => {
  it('should return array of procedures', () => {
    const procedures = getDRProcedures();
    expect(Array.isArray(procedures)).toBe(true);
  });

  it('should have region failover procedure', () => {
    const procedures = getDRProcedures();
    const regionFailover = procedures.find((p) => p.id === 'dr-region-failover');

    expect(regionFailover).toBeDefined();
    expect(regionFailover?.steps.length).toBeGreaterThan(0);
  });

  it('should have steps with descriptions', () => {
    const procedures = getDRProcedures();

    procedures.forEach((procedure) => {
      procedure.steps.forEach((step) => {
        expect(step.name).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });
  });
});

describe('getFailoverConfig', () => {
  it('should return valid config', () => {
    const config = getFailoverConfig();

    expect(config).toBeDefined();
    expect(config.enabled).toBe(true);
  });

  it('should have primary and secondary regions', () => {
    const config = getFailoverConfig();

    expect(config.primaryRegion).toBeDefined();
    expect(config.secondaryRegion).toBeDefined();
  });

  it('should have automatic failover configured', () => {
    const config = getFailoverConfig();

    expect(config.automaticFailover).toBeDefined();
    expect(typeof config.automaticFailover).toBe('boolean');
  });

  it('should have health check interval', () => {
    const config = getFailoverConfig();

    expect(config.healthCheckInterval).toBeDefined();
    expect(config.healthCheckInterval).toBeGreaterThan(0);
  });
});

describe('getPITRConfig', () => {
  it('should return valid config', () => {
    const config = getPITRConfig();

    expect(config).toBeDefined();
    expect(config.enabled).toBe(true);
  });

  it('should have retention period', () => {
    const config = getPITRConfig();

    expect(config.retentionPeriodDays).toBeGreaterThan(0);
  });

  it('should have geo redundancy setting', () => {
    const config = getPITRConfig();

    expect(config.geoRedundant).toBeDefined();
  });

  it('should have minimum restore point interval', () => {
    const config = getPITRConfig();

    expect(config.minRestorePointInterval).toBeDefined();
    expect(config.minRestorePointInterval).toBe('PT5M');
  });

  it('should have max restore point age aligning with RPO', () => {
    const config = getPITRConfig();

    expect(config.maxRestorePointAge).toBe('PT15M');
  });
});

describe('getDRTestConfigurations', () => {
  it('should return array of test configurations', () => {
    const configs = getDRTestConfigurations();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
  });

  it('should have quarterly DR drill', () => {
    const configs = getDRTestConfigurations();
    const quarterly = configs.find((c) => c.id === 'dr-test-quarterly');

    expect(quarterly).toBeDefined();
    expect(quarterly?.type).toBe('simulation');
    expect(quarterly?.frequency).toBe('quarterly');
  });

  it('should have monthly backup restore test', () => {
    const configs = getDRTestConfigurations();
    const monthly = configs.find((c) => c.id === 'dr-test-monthly-backup');

    expect(monthly).toBeDefined();
    expect(monthly?.type).toBe('parallel');
    expect(monthly?.frequency).toBe('monthly');
  });

  it('should have annual full DR exercise', () => {
    const configs = getDRTestConfigurations();
    const annual = configs.find((c) => c.id === 'dr-test-annual-full');

    expect(annual).toBeDefined();
    expect(annual?.type).toBe('cutover');
    expect(annual?.frequency).toBe('annually');
  });

  it('should have success criteria with critical flags', () => {
    const configs = getDRTestConfigurations();

    configs.forEach((config) => {
      expect(config.successCriteria.length).toBeGreaterThan(0);
      config.successCriteria.forEach((criteria) => {
        expect(criteria.metric).toBeDefined();
        expect(criteria.target).toBeGreaterThan(0);
        expect(criteria.unit).toBeDefined();
        expect(typeof criteria.critical).toBe('boolean');
      });
    });
  });

  it('should have participants for each test config', () => {
    const configs = getDRTestConfigurations();

    configs.forEach((config) => {
      expect(config.participants.length).toBeGreaterThan(0);
    });
  });

  it('should have scope items for each test config', () => {
    const configs = getDRTestConfigurations();

    configs.forEach((config) => {
      expect(config.scope.length).toBeGreaterThan(0);
    });
  });
});

describe('getFailoverConfig - detailed checks', () => {
  it('should have mode set to active-passive', () => {
    const config = getFailoverConfig();
    expect(config.mode).toBe('active-passive');
  });

  it('should have DNS failover configuration', () => {
    const config = getFailoverConfig();
    expect(config.dnsFailover).toBeDefined();
    expect(config.dnsFailover.provider).toBe('azure-traffic-manager');
    expect(config.dnsFailover.healthCheckPath).toBe('/health/live');
    expect(config.dnsFailover.routingMethod).toBe('priority');
  });

  it('should have database failover configuration', () => {
    const config = getFailoverConfig();
    expect(config.databaseFailover).toBeDefined();
    expect(config.databaseFailover.readReplicaEnabled).toBe(true);
    expect(config.databaseFailover.autoFailoverEnabled).toBe(true);
  });

  it('should have storage failover configuration', () => {
    const config = getFailoverConfig();
    expect(config.storageFailover).toBeDefined();
    expect(config.storageFailover.type).toBe('RA-GRS');
    expect(config.storageFailover.failoverStatus).toBe('available');
  });

  it('should have failover threshold with consecutive failures', () => {
    const config = getFailoverConfig();
    expect(config.failoverThreshold.consecutiveFailures).toBeGreaterThan(0);
    expect(config.failoverThreshold.failureWindowSeconds).toBeGreaterThan(0);
    expect(config.failoverThreshold.minHealthyPercentage).toBeGreaterThan(0);
  });

  it('should not have automatic failback enabled', () => {
    const config = getFailoverConfig();
    expect(config.automaticFailback).toBe(false);
  });
});
