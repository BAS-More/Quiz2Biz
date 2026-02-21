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
});
