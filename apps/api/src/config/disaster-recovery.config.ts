/**
 * Disaster Recovery Configuration
 *
 * Defines disaster recovery procedures including:
 * - Backup/Restore procedures
 * - Point-in-time recovery
 * - RTO/RPO targets
 * - Failover configuration
 * - Multi-region deployment
 */

// =============================================================================
// DISASTER RECOVERY TARGETS
// =============================================================================

export interface DisasterRecoveryTargets {
  /**
   * Recovery Time Objective (RTO)
   * Maximum acceptable time to restore service after disaster
   */
  rtoMinutes: number;

  /**
   * Recovery Point Objective (RPO)
   * Maximum acceptable data loss measured in time
   */
  rpoMinutes: number;

  /**
   * Maximum tolerable downtime per month (for SLA)
   */
  maxDowntimeMinutesPerMonth: number;

  /**
   * Target availability percentage (e.g., 99.9%)
   */
  targetAvailability: number;
}

export function getDisasterRecoveryTargets(): DisasterRecoveryTargets {
  return {
    rtoMinutes: 240, // 4 hours to full recovery
    rpoMinutes: 15, // Maximum 15 minutes of data loss
    maxDowntimeMinutesPerMonth: 43.8, // 99.9% availability = 43.8 minutes/month
    targetAvailability: 99.9,
  };
}

// =============================================================================
// BACKUP CONFIGURATION
// =============================================================================

export interface BackupConfig {
  type: BackupType;
  name: string;
  description: string;
  schedule: BackupSchedule;
  retention: RetentionPolicy;
  storage: BackupStorage;
  encryption: BackupEncryption;
  validation: BackupValidation;
}

export type BackupType =
  | 'full'
  | 'incremental'
  | 'differential'
  | 'transaction-log'
  | 'snapshot'
  | 'continuous-replication';

export interface BackupSchedule {
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:mm format in UTC
  dayOfWeek?: number; // 0-6 for weekly backups
  dayOfMonth?: number; // 1-31 for monthly backups
  enabled: boolean;
}

export interface RetentionPolicy {
  hourlyRetentionDays: number;
  dailyRetentionDays: number;
  weeklyRetentionWeeks: number;
  monthlyRetentionMonths: number;
  yearlyRetentionYears: number;
  minimumRetentionDays: number;
}

export interface BackupStorage {
  type: 'azure-blob' | 'azure-backup-vault' | 's3' | 'gcs' | 'local';
  primaryRegion: string;
  secondaryRegion?: string;
  storageAccountName?: string;
  containerName?: string;
  redundancy: 'LRS' | 'GRS' | 'ZRS' | 'GZRS' | 'RA-GRS' | 'RA-GZRS';
}

export interface BackupEncryption {
  enabled: boolean;
  algorithm: 'AES-256' | 'RSA-2048' | 'RSA-4096';
  keyVaultUrl?: string;
  keyName?: string;
}

export interface BackupValidation {
  enabled: boolean;
  frequency: 'after-each' | 'daily' | 'weekly';
  restoreTestEnabled: boolean;
  restoreTestFrequency?: 'weekly' | 'monthly' | 'quarterly';
  checksumValidation: boolean;
}

export function getBackupConfigurations(): BackupConfig[] {
  return [
    // Database Full Backup
    {
      type: 'full',
      name: 'database-full-backup',
      description: 'Full PostgreSQL database backup',
      schedule: {
        frequency: 'daily',
        time: '02:00',
        enabled: true,
      },
      retention: {
        hourlyRetentionDays: 0,
        dailyRetentionDays: 30,
        weeklyRetentionWeeks: 12,
        monthlyRetentionMonths: 12,
        yearlyRetentionYears: 7,
        minimumRetentionDays: 7,
      },
      storage: {
        type: 'azure-backup-vault',
        primaryRegion: 'eastus',
        secondaryRegion: 'westus2',
        redundancy: 'GRS',
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256',
        keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
        keyName: 'backup-encryption-key',
      },
      validation: {
        enabled: true,
        frequency: 'after-each',
        restoreTestEnabled: true,
        restoreTestFrequency: 'monthly',
        checksumValidation: true,
      },
    },

    // Database Transaction Log Backup (for PITR)
    {
      type: 'transaction-log',
      name: 'database-wal-backup',
      description: 'PostgreSQL WAL archive for point-in-time recovery',
      schedule: {
        frequency: 'continuous', // Every 5 minutes by default in Azure
        enabled: true,
      },
      retention: {
        hourlyRetentionDays: 7,
        dailyRetentionDays: 0,
        weeklyRetentionWeeks: 0,
        monthlyRetentionMonths: 0,
        yearlyRetentionYears: 0,
        minimumRetentionDays: 7,
      },
      storage: {
        type: 'azure-blob',
        primaryRegion: 'eastus',
        secondaryRegion: 'westus2',
        storageAccountName: 'quiz2bizbackups',
        containerName: 'wal-archives',
        redundancy: 'RA-GRS',
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256',
        keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
        keyName: 'backup-encryption-key',
      },
      validation: {
        enabled: true,
        frequency: 'daily',
        restoreTestEnabled: false,
        checksumValidation: true,
      },
    },

    // File Storage Backup
    {
      type: 'incremental',
      name: 'blob-storage-backup',
      description: 'Azure Blob Storage incremental backup for user uploads',
      schedule: {
        frequency: 'daily',
        time: '03:00',
        enabled: true,
      },
      retention: {
        hourlyRetentionDays: 0,
        dailyRetentionDays: 30,
        weeklyRetentionWeeks: 8,
        monthlyRetentionMonths: 6,
        yearlyRetentionYears: 1,
        minimumRetentionDays: 7,
      },
      storage: {
        type: 'azure-blob',
        primaryRegion: 'eastus',
        secondaryRegion: 'westus2',
        storageAccountName: 'quiz2bizbackups',
        containerName: 'file-backups',
        redundancy: 'RA-GRS',
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256',
        keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
        keyName: 'backup-encryption-key',
      },
      validation: {
        enabled: true,
        frequency: 'weekly',
        restoreTestEnabled: true,
        restoreTestFrequency: 'quarterly',
        checksumValidation: true,
      },
    },

    // Redis Cache Snapshot
    {
      type: 'snapshot',
      name: 'redis-snapshot',
      description: 'Redis cache RDB snapshot backup',
      schedule: {
        frequency: 'hourly',
        enabled: true,
      },
      retention: {
        hourlyRetentionDays: 1,
        dailyRetentionDays: 7,
        weeklyRetentionWeeks: 4,
        monthlyRetentionMonths: 0,
        yearlyRetentionYears: 0,
        minimumRetentionDays: 1,
      },
      storage: {
        type: 'azure-blob',
        primaryRegion: 'eastus',
        storageAccountName: 'quiz2bizbackups',
        containerName: 'redis-snapshots',
        redundancy: 'LRS',
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256',
      },
      validation: {
        enabled: true,
        frequency: 'daily',
        restoreTestEnabled: false,
        checksumValidation: true,
      },
    },

    // Configuration Backup
    {
      type: 'full',
      name: 'config-backup',
      description: 'Application configuration and secrets backup',
      schedule: {
        frequency: 'daily',
        time: '01:00',
        enabled: true,
      },
      retention: {
        hourlyRetentionDays: 0,
        dailyRetentionDays: 90,
        weeklyRetentionWeeks: 12,
        monthlyRetentionMonths: 12,
        yearlyRetentionYears: 7,
        minimumRetentionDays: 30,
      },
      storage: {
        type: 'azure-backup-vault',
        primaryRegion: 'eastus',
        secondaryRegion: 'westus2',
        redundancy: 'GRS',
      },
      encryption: {
        enabled: true,
        algorithm: 'RSA-2048',
        keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
        keyName: 'config-encryption-key',
      },
      validation: {
        enabled: true,
        frequency: 'after-each',
        restoreTestEnabled: true,
        restoreTestFrequency: 'monthly',
        checksumValidation: true,
      },
    },
  ];
}

// =============================================================================
// POINT-IN-TIME RECOVERY
// =============================================================================

export interface PITRConfig {
  enabled: boolean;
  retentionPeriodDays: number;
  minRestorePointInterval: string;
  maxRestorePointAge: string;
  geoRedundant: boolean;
}

export function getPITRConfig(): PITRConfig {
  return {
    enabled: true,
    retentionPeriodDays: 35, // Azure default is 7-35 days
    minRestorePointInterval: 'PT5M', // 5 minutes
    maxRestorePointAge: 'PT15M', // Aligns with RPO of 15 minutes
    geoRedundant: true,
  };
}

// =============================================================================
// FAILOVER CONFIGURATION
// =============================================================================

export interface FailoverConfig {
  enabled: boolean;
  mode: FailoverMode;
  primaryRegion: string;
  secondaryRegion: string;
  healthCheckInterval: number;
  failoverThreshold: FailoverThreshold;
  automaticFailover: boolean;
  automaticFailback: boolean;
  dnsFailover: DNSFailoverConfig;
  databaseFailover: DatabaseFailoverConfig;
  storageFailover: StorageFailoverConfig;
}

export type FailoverMode = 'active-passive' | 'active-active' | 'pilot-light' | 'warm-standby';

export interface FailoverThreshold {
  consecutiveFailures: number;
  failureWindowSeconds: number;
  minHealthyPercentage: number;
}

export interface DNSFailoverConfig {
  provider: 'azure-traffic-manager' | 'aws-route53' | 'cloudflare';
  ttlSeconds: number;
  healthCheckPath: string;
  healthCheckProtocol: 'HTTP' | 'HTTPS' | 'TCP';
  healthCheckPort: number;
  routingMethod: 'priority' | 'weighted' | 'performance' | 'geographic';
}

export interface DatabaseFailoverConfig {
  replicationMode: 'synchronous' | 'asynchronous';
  readReplicaEnabled: boolean;
  autoFailoverEnabled: boolean;
  gracePeriodMinutes: number;
  connectionString: {
    primary: string;
    secondary: string;
  };
}

export interface StorageFailoverConfig {
  type: 'RA-GRS' | 'RA-GZRS';
  manualFailover: boolean;
  lastSyncTime?: Date;
  failoverStatus: 'available' | 'in-progress' | 'unavailable';
}

export function getFailoverConfig(): FailoverConfig {
  return {
    enabled: true,
    mode: 'active-passive',
    primaryRegion: 'eastus',
    secondaryRegion: 'westus2',
    healthCheckInterval: 30, // seconds
    failoverThreshold: {
      consecutiveFailures: 3,
      failureWindowSeconds: 300,
      minHealthyPercentage: 50,
    },
    automaticFailover: true,
    automaticFailback: false, // Manual failback to prevent flapping
    dnsFailover: {
      provider: 'azure-traffic-manager',
      ttlSeconds: 60,
      healthCheckPath: '/health/live',
      healthCheckProtocol: 'HTTPS',
      healthCheckPort: 443,
      routingMethod: 'priority',
    },
    databaseFailover: {
      replicationMode: 'asynchronous', // For cross-region, async is typical
      readReplicaEnabled: true,
      autoFailoverEnabled: true,
      gracePeriodMinutes: 5,
      connectionString: {
        primary: process.env.DATABASE_URL || '',
        secondary: process.env.DATABASE_URL_SECONDARY || '',
      },
    },
    storageFailover: {
      type: 'RA-GRS',
      manualFailover: true,
      failoverStatus: 'available',
    },
  };
}

// =============================================================================
// DISASTER RECOVERY PROCEDURES
// =============================================================================

export interface DRProcedure {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  steps: DRStep[];
  estimatedDuration: string;
  responsibleTeam: string;
  escalationPath: string[];
  testFrequency: string;
  lastTested?: Date;
  documentationUrl: string;
}

export interface DRStep {
  order: number;
  name: string;
  description: string;
  command?: string;
  manualAction?: string;
  expectedDuration: string;
  rollbackProcedure?: string;
  verification: string;
}

export function getDRProcedures(): DRProcedure[] {
  return [
    // Region Failover Procedure
    {
      id: 'dr-region-failover',
      name: 'Region Failover',
      description: 'Failover from primary region to secondary region',
      triggerConditions: [
        'Primary region completely unavailable',
        'Primary region declared disaster by cloud provider',
        'Network partition between primary and users > 30 minutes',
      ],
      steps: [
        {
          order: 1,
          name: 'Assess Situation',
          description: 'Confirm primary region failure and data sync status',
          manualAction: 'Check Azure Status page, verify monitoring alerts',
          expectedDuration: 'PT5M',
          verification: 'Primary region confirmed unavailable',
        },
        {
          order: 2,
          name: 'Notify Stakeholders',
          description: 'Send DR activation notification',
          command: 'curl -X POST ${PAGERDUTY_WEBHOOK} -d \'{"event":"dr_activated"}\'',
          expectedDuration: 'PT2M',
          verification: 'Notification sent successfully',
        },
        {
          order: 3,
          name: 'Verify Secondary Database',
          description: 'Check secondary database is in sync and accessible',
          command: 'psql ${DATABASE_URL_SECONDARY} -c "SELECT pg_is_in_recovery();"',
          expectedDuration: 'PT5M',
          verification: 'Database accessible and replication lag < RPO',
        },
        {
          order: 4,
          name: 'Promote Secondary Database',
          description: 'Promote secondary database to primary',
          command:
            'az postgres flexible-server replica promote --resource-group quiz2biz-prod-rg --name quiz2biz-db-secondary',
          expectedDuration: 'PT10M',
          rollbackProcedure: 'Cannot rollback - must set up new replica',
          verification: 'Database accepting writes',
        },
        {
          order: 5,
          name: 'Update DNS',
          description: 'Switch Traffic Manager to route to secondary',
          command:
            'az network traffic-manager endpoint update --name primary --profile-name quiz2biz-tm --type azureEndpoints --endpoint-status Disabled',
          expectedDuration: 'PT5M',
          rollbackProcedure: 'Re-enable primary endpoint',
          verification: 'DNS resolving to secondary region',
        },
        {
          order: 6,
          name: 'Verify Application',
          description: 'Run smoke tests against secondary',
          command: 'npm run test:smoke -- --env=dr',
          expectedDuration: 'PT10M',
          verification: 'All smoke tests passing',
        },
        {
          order: 7,
          name: 'Monitor',
          description: 'Monitor secondary region for 30 minutes',
          manualAction: 'Watch dashboards for errors and latency',
          expectedDuration: 'PT30M',
          verification: 'Error rate < 1%, latency < 500ms',
        },
      ],
      estimatedDuration: 'PT67M', // ~1 hour
      responsibleTeam: 'SRE',
      escalationPath: ['SRE Lead', 'CTO', 'CEO'],
      testFrequency: 'quarterly',
      documentationUrl: 'https://docs.quiz2biz.com/runbooks/region-failover',
    },

    // Database Point-in-Time Recovery
    {
      id: 'dr-database-pitr',
      name: 'Database Point-in-Time Recovery',
      description: 'Restore database to a specific point in time',
      triggerConditions: [
        'Accidental data deletion',
        'Data corruption detected',
        'Failed migration requiring rollback',
      ],
      steps: [
        {
          order: 1,
          name: 'Identify Target Time',
          description: 'Determine the exact point in time to restore to',
          manualAction: 'Review logs to find last known good state',
          expectedDuration: 'PT15M',
          verification: 'Target restore time identified',
        },
        {
          order: 2,
          name: 'Stop Application',
          description: 'Stop application to prevent new data loss',
          command:
            'az containerapp revision deactivate --name quiz2biz-api --resource-group quiz2biz-prod-rg',
          expectedDuration: 'PT5M',
          rollbackProcedure: 'Reactivate revision',
          verification: 'Application stopped accepting traffic',
        },
        {
          order: 3,
          name: 'Create PITR Restore',
          description: 'Initiate point-in-time restore',
          command:
            'az postgres flexible-server restore --resource-group quiz2biz-prod-rg --name quiz2biz-db-restored --source-server quiz2biz-db --restore-time ${TARGET_TIME}',
          expectedDuration: 'PT30M',
          verification: 'Restore operation completed',
        },
        {
          order: 4,
          name: 'Verify Restored Data',
          description: 'Validate restored data integrity',
          command:
            'psql ${RESTORED_DB_URL} -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM sessions;"',
          expectedDuration: 'PT10M',
          verification: 'Data counts match expected values',
        },
        {
          order: 5,
          name: 'Switch Connection',
          description: 'Update application to use restored database',
          command:
            'az containerapp update --name quiz2biz-api --resource-group quiz2biz-prod-rg --set-env-vars DATABASE_URL=${RESTORED_DB_URL}',
          expectedDuration: 'PT5M',
          rollbackProcedure: 'Revert DATABASE_URL to original',
          verification: 'Application connected to restored database',
        },
        {
          order: 6,
          name: 'Restart Application',
          description: 'Restart application and verify',
          command:
            'az containerapp revision activate --name quiz2biz-api --resource-group quiz2biz-prod-rg',
          expectedDuration: 'PT5M',
          verification: 'Application healthy and serving requests',
        },
      ],
      estimatedDuration: 'PT70M',
      responsibleTeam: 'SRE',
      escalationPath: ['SRE Lead', 'Database Admin', 'CTO'],
      testFrequency: 'monthly',
      documentationUrl: 'https://docs.quiz2biz.com/runbooks/database-pitr',
    },

    // Full System Restore from Backup
    {
      id: 'dr-full-restore',
      name: 'Full System Restore',
      description: 'Complete system restore from backups',
      triggerConditions: [
        'Complete data center failure',
        'Ransomware attack requiring clean restore',
        'Multi-service corruption',
      ],
      steps: [
        {
          order: 1,
          name: 'Activate DR Environment',
          description: 'Provision DR infrastructure in secondary region',
          command: 'terraform apply -var="environment=dr" -auto-approve',
          expectedDuration: 'PT30M',
          verification: 'DR infrastructure provisioned',
        },
        {
          order: 2,
          name: 'Restore Database',
          description: 'Restore database from latest backup',
          command:
            'az backup restore --vault-name quiz2biz-backup-vault --container-name quiz2biz-db --item-name quiz2biz-db --restore-mode OriginalLocation',
          expectedDuration: 'PT60M',
          verification: 'Database restored and accessible',
        },
        {
          order: 3,
          name: 'Restore File Storage',
          description: 'Restore blob storage from backup',
          command:
            'azcopy copy "https://quiz2bizbackups.blob.core.windows.net/file-backups/*" "https://quiz2bizstorage.blob.core.windows.net/uploads/" --recursive',
          expectedDuration: 'PT30M',
          verification: 'Files restored and accessible',
        },
        {
          order: 4,
          name: 'Restore Configuration',
          description: 'Restore Key Vault secrets and app configuration',
          command:
            'az keyvault restore --vault-name quiz2biz-kv-dr --storage-account-name quiz2bizbackups --blob-container-name config-backups',
          expectedDuration: 'PT15M',
          verification: 'Secrets and configuration restored',
        },
        {
          order: 5,
          name: 'Deploy Application',
          description: 'Deploy application containers to DR region',
          command:
            'az containerapp update --name quiz2biz-api --resource-group quiz2biz-dr-rg --image ${ACR_URL}/quiz2biz-api:latest',
          expectedDuration: 'PT15M',
          verification: 'Application deployed and starting',
        },
        {
          order: 6,
          name: 'Run Full Test Suite',
          description: 'Execute comprehensive tests against DR environment',
          command: 'npm run test:e2e -- --env=dr',
          expectedDuration: 'PT30M',
          verification: 'All tests passing',
        },
        {
          order: 7,
          name: 'Switch Traffic',
          description: 'Update DNS to point to DR environment',
          command:
            'az network traffic-manager endpoint update --profile-name quiz2biz-tm --name dr-endpoint --endpoint-status Enabled --priority 1',
          expectedDuration: 'PT10M',
          verification: 'Traffic routing to DR environment',
        },
      ],
      estimatedDuration: 'PT190M', // ~3 hours
      responsibleTeam: 'SRE',
      escalationPath: ['SRE Lead', 'CTO', 'CEO', 'Legal'],
      testFrequency: 'annually',
      documentationUrl: 'https://docs.quiz2biz.com/runbooks/full-restore',
    },
  ];
}

// =============================================================================
// DR TESTING CONFIGURATION
// =============================================================================

export interface DRTestConfig {
  id: string;
  name: string;
  type: 'tabletop' | 'walkthrough' | 'simulation' | 'parallel' | 'cutover';
  scope: string[];
  frequency: string;
  duration: string;
  participants: string[];
  successCriteria: DRTestCriteria[];
  lastExecution?: DRTestExecution;
}

export interface DRTestCriteria {
  metric: string;
  target: number;
  unit: string;
  critical: boolean;
}

export interface DRTestExecution {
  date: Date;
  status: 'passed' | 'failed' | 'partial';
  rtoAchieved: number;
  rpoAchieved: number;
  findings: string[];
  actionItems: string[];
}

export function getDRTestConfigurations(): DRTestConfig[] {
  return [
    {
      id: 'dr-test-quarterly',
      name: 'Quarterly DR Drill',
      type: 'simulation',
      scope: ['database-failover', 'application-failover', 'dns-switch'],
      frequency: 'quarterly',
      duration: '4h',
      participants: ['SRE Team', 'Database Team', 'Development Team'],
      successCriteria: [
        { metric: 'RTO', target: 240, unit: 'minutes', critical: true },
        { metric: 'RPO', target: 15, unit: 'minutes', critical: true },
        { metric: 'Data Integrity', target: 100, unit: 'percent', critical: true },
        { metric: 'Smoke Tests', target: 100, unit: 'percent', critical: true },
      ],
    },
    {
      id: 'dr-test-monthly-backup',
      name: 'Monthly Backup Restore Test',
      type: 'parallel',
      scope: ['database-restore', 'file-restore'],
      frequency: 'monthly',
      duration: '2h',
      participants: ['SRE Team', 'Database Team'],
      successCriteria: [
        { metric: 'Restore Time', target: 60, unit: 'minutes', critical: false },
        { metric: 'Data Integrity', target: 100, unit: 'percent', critical: true },
        { metric: 'Checksum Validation', target: 100, unit: 'percent', critical: true },
      ],
    },
    {
      id: 'dr-test-annual-full',
      name: 'Annual Full DR Exercise',
      type: 'cutover',
      scope: ['full-system-restore', 'region-failover', 'all-services'],
      frequency: 'annually',
      duration: '8h',
      participants: [
        'SRE Team',
        'Database Team',
        'Development Team',
        'Product Team',
        'Executive Team',
      ],
      successCriteria: [
        { metric: 'RTO', target: 240, unit: 'minutes', critical: true },
        { metric: 'RPO', target: 15, unit: 'minutes', critical: true },
        { metric: 'Full Functionality', target: 100, unit: 'percent', critical: true },
        { metric: 'User Acceptance', target: 95, unit: 'percent', critical: false },
      ],
    },
  ];
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  getDisasterRecoveryTargets,
  getBackupConfigurations,
  getPITRConfig,
  getFailoverConfig,
  getDRProcedures,
  getDRTestConfigurations,
};
