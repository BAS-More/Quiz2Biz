/**
 * @fileoverview Tests for disaster-recovery.config.ts
 */
import {
  getDisasterRecoveryTargets,
  getBackupConfigurations,
  getDRProcedures,
  getFailoverConfig,
  getPITRConfig,
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
      expect(config.encryption.algorithm).toBe('AES-256');
    });
  });

  it('should have validation enabled for all backups', () => {
    const configs = getBackupConfigurations();

    configs.forEach((config) => {
      expect(config.validation.enabled).toBe(true);
      expect(config.validation.checksumValidation).toBe(true);
    });
  });

  it('should have GRS or better redundancy', () => {
    const configs = getBackupConfigurations();
    const validRedundancy = ['GRS', 'GZRS', 'RA-GRS', 'RA-GZRS'];

    configs.forEach((config) => {
      expect(validRedundancy).toContain(config.storage.redundancy);
    });
  });
});

describe('getRecoveryProcedures', () => {
  it('should return array of procedures', () => {
    const procedures = getRecoveryProcedures();
    expect(Array.isArray(procedures)).toBe(true);
  });

  it('should have database recovery procedure', () => {
    const procedures = getRecoveryProcedures();
    const dbRecovery = procedures.find((p) => p.type === 'database');

    expect(dbRecovery).toBeDefined();
    expect(dbRecovery?.steps.length).toBeGreaterThan(0);
  });

  it('should have application recovery procedure', () => {
    const procedures = getRecoveryProcedures();
    const appRecovery = procedures.find((p) => p.type === 'application');

    expect(appRecovery).toBeDefined();
  });

  it('should have steps with descriptions', () => {
    const procedures = getRecoveryProcedures();

    procedures.forEach((procedure) => {
      procedure.steps.forEach((step) => {
        expect(step.name).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });
  });
});

describe('getFailoverConfiguration', () => {
  it('should return valid config', () => {
    const config = getFailoverConfiguration();

    expect(config).toBeDefined();
    expect(config.enabled).toBe(true);
  });

  it('should have primary and secondary regions', () => {
    const config = getFailoverConfiguration();

    expect(config.primaryRegion).toBeDefined();
    expect(config.secondaryRegion).toBeDefined();
  });

  it('should have automatic failover configured', () => {
    const config = getFailoverConfiguration();

    expect(config.automaticFailover).toBeDefined();
    expect(typeof config.automaticFailover.enabled).toBe('boolean');
  });

  it('should have health check configuration', () => {
    const config = getFailoverConfiguration();

    expect(config.healthCheck).toBeDefined();
    expect(config.healthCheck.intervalSeconds).toBeGreaterThan(0);
  });
});

describe('getPointInTimeRecoveryConfig', () => {
  it('should return valid config', () => {
    const config = getPointInTimeRecoveryConfig();

    expect(config).toBeDefined();
    expect(config.enabled).toBe(true);
  });

  it('should have retention period', () => {
    const config = getPointInTimeRecoveryConfig();

    expect(config.retentionDays).toBeGreaterThan(0);
  });

  it('should have restore granularity', () => {
    const config = getPointInTimeRecoveryConfig();

    expect(config.granularity).toBeDefined();
  });
});

describe('calculateRecoveryMetrics', () => {
  it('should calculate recovery metrics', () => {
    const metrics = calculateRecoveryMetrics(30, 5);

    expect(metrics).toBeDefined();
    expect(metrics.actualRtoMinutes).toBe(30);
    expect(metrics.actualRpoMinutes).toBe(5);
  });

  it('should determine if within targets', () => {
    const withinTargets = calculateRecoveryMetrics(200, 10);
    expect(withinTargets.withinRtoTarget).toBe(true);
    expect(withinTargets.withinRpoTarget).toBe(true);

    const outsideTargets = calculateRecoveryMetrics(300, 20);
    expect(outsideTargets.withinRtoTarget).toBe(false);
    expect(outsideTargets.withinRpoTarget).toBe(false);
  });
});
