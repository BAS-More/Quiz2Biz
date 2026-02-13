/**
 * Canary Deployment Configuration
 * Progressive rollout strategy for Azure Container Apps
 * 5% → 25% → 50% → 100% with automated health-based rollback
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CanaryStage {
  name: string;
  trafficPercentage: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  healthChecks: HealthCheckConfig;
  rollbackTriggers: RollbackTrigger[];
  promotionCriteria: PromotionCriteria;
}

export interface HealthCheckConfig {
  enabled: boolean;
  intervalSeconds: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  endpoints: HealthEndpoint[];
}

export interface HealthEndpoint {
  path: string;
  method: 'GET' | 'HEAD';
  expectedStatus: number[];
  timeoutMs: number;
  bodyContains?: string;
}

export interface RollbackTrigger {
  type: RollbackTriggerType;
  threshold: number;
  windowMinutes: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  enabled: boolean;
}

export type RollbackTriggerType =
  | 'error_rate'
  | 'latency_p99'
  | 'latency_p95'
  | 'latency_avg'
  | 'http_5xx_rate'
  | 'http_4xx_rate'
  | 'pod_restart_rate'
  | 'memory_usage'
  | 'cpu_usage'
  | 'custom_metric';

export interface PromotionCriteria {
  minSuccessfulHealthChecks: number;
  maxErrorRate: number;
  maxLatencyP95Ms: number;
  minRequestsProcessed: number;
  requireManualApproval: boolean;
  approvalTimeoutMinutes: number;
}

export interface CanaryDeploymentConfig {
  enabled: boolean;
  strategy: 'linear' | 'exponential' | 'manual';
  stages: CanaryStage[];
  globalSettings: GlobalCanarySettings;
  notificationConfig: CanaryNotificationConfig;
  metricsConfig: CanaryMetricsConfig;
}

export interface GlobalCanarySettings {
  defaultRevisionMode: 'Single' | 'Multiple';
  maxConcurrentRevisions: number;
  revisionHistoryLimit: number;
  stableRevisionLabel: string;
  canaryRevisionLabel: string;
  automaticPromotionEnabled: boolean;
  automaticRollbackEnabled: boolean;
  pauseOnWarning: boolean;
}

export interface CanaryNotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  events: NotificationEvent[];
}

export interface NotificationChannel {
  type: 'slack' | 'teams' | 'email' | 'pagerduty' | 'webhook';
  url?: string;
  email?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface NotificationEvent {
  event: CanaryEvent;
  channels: string[];
  template?: string;
}

export type CanaryEvent =
  | 'deployment_started'
  | 'stage_promoted'
  | 'stage_failed'
  | 'rollback_initiated'
  | 'rollback_completed'
  | 'deployment_completed'
  | 'manual_approval_required'
  | 'health_check_failed'
  | 'threshold_warning'
  | 'threshold_breached';

export interface CanaryMetricsConfig {
  provider: 'azure_monitor' | 'prometheus' | 'datadog' | 'custom';
  collectionIntervalSeconds: number;
  retentionDays: number;
  customMetrics: CustomMetricDefinition[];
}

export interface CustomMetricDefinition {
  name: string;
  query: string;
  unit: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'percentile';
  percentile?: number;
}

// ============================================================================
// Configuration Functions
// ============================================================================

/**
 * Get default canary deployment configuration
 * Progressive rollout: 5% → 25% → 50% → 100%
 */
export function getCanaryDeploymentConfig(): CanaryDeploymentConfig {
  return {
    enabled: true,
    strategy: 'linear',
    stages: getDefaultCanaryStages(),
    globalSettings: getGlobalCanarySettings(),
    notificationConfig: getCanaryNotificationConfig(),
    metricsConfig: getCanaryMetricsConfig(),
  };
}

/**
 * Get default canary stages for progressive rollout
 */
export function getDefaultCanaryStages(): CanaryStage[] {
  return [
    // Stage 1: Initial canary (5% traffic)
    {
      name: 'canary-initial',
      trafficPercentage: 5,
      minDurationMinutes: 5,
      maxDurationMinutes: 30,
      healthChecks: getDefaultHealthChecks(),
      rollbackTriggers: getDefaultRollbackTriggers(),
      promotionCriteria: {
        minSuccessfulHealthChecks: 10,
        maxErrorRate: 1.0, // 1% error rate max
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 100,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      },
    },

    // Stage 2: Expanded canary (25% traffic)
    {
      name: 'canary-expanded',
      trafficPercentage: 25,
      minDurationMinutes: 10,
      maxDurationMinutes: 60,
      healthChecks: getDefaultHealthChecks(),
      rollbackTriggers: getDefaultRollbackTriggers(),
      promotionCriteria: {
        minSuccessfulHealthChecks: 30,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 500,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      },
    },

    // Stage 3: Half traffic (50% traffic)
    {
      name: 'canary-half',
      trafficPercentage: 50,
      minDurationMinutes: 15,
      maxDurationMinutes: 120,
      healthChecks: getDefaultHealthChecks(),
      rollbackTriggers: getDefaultRollbackTriggers(),
      promotionCriteria: {
        minSuccessfulHealthChecks: 60,
        maxErrorRate: 1.0,
        maxLatencyP95Ms: 500,
        minRequestsProcessed: 1000,
        requireManualApproval: true, // Manual approval at 50%
        approvalTimeoutMinutes: 120,
      },
    },

    // Stage 4: Full rollout (100% traffic)
    {
      name: 'canary-full',
      trafficPercentage: 100,
      minDurationMinutes: 30,
      maxDurationMinutes: 240,
      healthChecks: getDefaultHealthChecks(),
      rollbackTriggers: getDefaultRollbackTriggers(),
      promotionCriteria: {
        minSuccessfulHealthChecks: 120,
        maxErrorRate: 0.5, // Stricter at full rollout
        maxLatencyP95Ms: 400,
        minRequestsProcessed: 5000,
        requireManualApproval: false,
        approvalTimeoutMinutes: 60,
      },
    },
  ];
}

/**
 * Get default health check configuration
 */
export function getDefaultHealthChecks(): HealthCheckConfig {
  return {
    enabled: true,
    intervalSeconds: 10,
    healthyThreshold: 3,
    unhealthyThreshold: 2,
    endpoints: [
      {
        path: '/api/v1/health/live',
        method: 'GET',
        expectedStatus: [200],
        timeoutMs: 5000,
      },
      {
        path: '/api/v1/health/ready',
        method: 'GET',
        expectedStatus: [200],
        timeoutMs: 5000,
        bodyContains: '"status":"healthy"',
      },
      {
        path: '/api/v1/health',
        method: 'GET',
        expectedStatus: [200],
        timeoutMs: 10000,
      },
    ],
  };
}

/**
 * Get default rollback triggers
 */
export function getDefaultRollbackTriggers(): RollbackTrigger[] {
  return [
    // Error rate > 1% triggers rollback
    {
      type: 'error_rate',
      threshold: 1.0,
      windowMinutes: 5,
      comparison: 'greater_than',
      enabled: true,
    },

    // HTTP 5xx rate > 1% triggers rollback
    {
      type: 'http_5xx_rate',
      threshold: 1.0,
      windowMinutes: 5,
      comparison: 'greater_than',
      enabled: true,
    },

    // P99 latency > 2000ms triggers rollback
    {
      type: 'latency_p99',
      threshold: 2000,
      windowMinutes: 5,
      comparison: 'greater_than',
      enabled: true,
    },

    // P95 latency > 1000ms triggers rollback
    {
      type: 'latency_p95',
      threshold: 1000,
      windowMinutes: 5,
      comparison: 'greater_than',
      enabled: true,
    },

    // Pod restart rate > 3 in 5 minutes triggers rollback
    {
      type: 'pod_restart_rate',
      threshold: 3,
      windowMinutes: 5,
      comparison: 'greater_than',
      enabled: true,
    },

    // Memory usage > 90% triggers rollback
    {
      type: 'memory_usage',
      threshold: 90,
      windowMinutes: 5,
      comparison: 'greater_than',
      enabled: true,
    },

    // CPU usage > 90% triggers rollback
    {
      type: 'cpu_usage',
      threshold: 90,
      windowMinutes: 5,
      comparison: 'greater_than',
      enabled: true,
    },
  ];
}

/**
 * Get global canary settings
 */
export function getGlobalCanarySettings(): GlobalCanarySettings {
  return {
    defaultRevisionMode: 'Multiple',
    maxConcurrentRevisions: 3,
    revisionHistoryLimit: 10,
    stableRevisionLabel: 'stable',
    canaryRevisionLabel: 'canary',
    automaticPromotionEnabled: true,
    automaticRollbackEnabled: true,
    pauseOnWarning: true,
  };
}

/**
 * Get notification configuration for canary events
 */
export function getCanaryNotificationConfig(): CanaryNotificationConfig {
  return {
    enabled: true,
    channels: [
      {
        type: 'teams',
        url: process.env.TEAMS_WEBHOOK_URL,
        priority: 'normal',
      },
      {
        type: 'slack',
        url: process.env.SLACK_WEBHOOK_URL,
        priority: 'normal',
      },
      {
        type: 'email',
        email: process.env.ALERT_EMAIL || 'devops@quiz2biz.com',
        priority: 'high',
      },
      {
        type: 'pagerduty',
        url: process.env.PAGERDUTY_INTEGRATION_URL,
        priority: 'critical',
      },
    ],
    events: [
      {
        event: 'deployment_started',
        channels: ['teams', 'slack'],
      },
      {
        event: 'stage_promoted',
        channels: ['teams', 'slack'],
      },
      {
        event: 'stage_failed',
        channels: ['teams', 'slack', 'email', 'pagerduty'],
      },
      {
        event: 'rollback_initiated',
        channels: ['teams', 'slack', 'email', 'pagerduty'],
      },
      {
        event: 'rollback_completed',
        channels: ['teams', 'slack', 'email'],
      },
      {
        event: 'deployment_completed',
        channels: ['teams', 'slack'],
      },
      {
        event: 'manual_approval_required',
        channels: ['teams', 'slack', 'email'],
      },
      {
        event: 'health_check_failed',
        channels: ['teams', 'slack', 'pagerduty'],
      },
      {
        event: 'threshold_warning',
        channels: ['teams', 'slack'],
      },
      {
        event: 'threshold_breached',
        channels: ['teams', 'slack', 'email', 'pagerduty'],
      },
    ],
  };
}

/**
 * Get metrics configuration for canary monitoring
 */
export function getCanaryMetricsConfig(): CanaryMetricsConfig {
  return {
    provider: 'azure_monitor',
    collectionIntervalSeconds: 15,
    retentionDays: 30,
    customMetrics: [
      {
        name: 'canary_error_rate',
        query: `
          requests
          | where timestamp > ago(5m)
          | where cloud_RoleName contains "canary"
          | summarize errors = countif(success == false), total = count()
          | extend error_rate = todouble(errors) / todouble(total) * 100
        `,
        unit: 'percent',
        aggregation: 'avg',
      },
      {
        name: 'canary_latency_p95',
        query: `
          requests
          | where timestamp > ago(5m)
          | where cloud_RoleName contains "canary"
          | summarize p95 = percentile(duration, 95)
        `,
        unit: 'milliseconds',
        aggregation: 'percentile',
        percentile: 95,
      },
      {
        name: 'canary_throughput',
        query: `
          requests
          | where timestamp > ago(5m)
          | where cloud_RoleName contains "canary"
          | summarize throughput = count() / 300
        `,
        unit: 'requests_per_second',
        aggregation: 'avg',
      },
    ],
  };
}

// ============================================================================
// Canary Deployment Manager
// ============================================================================

export interface DeploymentState {
  currentStage: number;
  stageStartTime: Date;
  healthCheckResults: HealthCheckResult[];
  metricsHistory: MetricSnapshot[];
  status: DeploymentStatus;
  lastError?: string;
}

export type DeploymentStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting_approval'
  | 'promoting'
  | 'rolling_back'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface HealthCheckResult {
  timestamp: Date;
  endpoint: string;
  success: boolean;
  responseTimeMs: number;
  statusCode: number;
  error?: string;
}

export interface MetricSnapshot {
  timestamp: Date;
  errorRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  requestCount: number;
  cpuUsage: number;
  memoryUsage: number;
}

/**
 * Canary Deployment Manager
 * Manages progressive rollout with health checks and automated rollback
 */
export class CanaryDeploymentManager {
  private config: CanaryDeploymentConfig;
  private state: DeploymentState;

  constructor(config?: CanaryDeploymentConfig) {
    this.config = config || getCanaryDeploymentConfig();
    this.state = {
      currentStage: 0,
      stageStartTime: new Date(),
      healthCheckResults: [],
      metricsHistory: [],
      status: 'pending',
    };
  }

  /**
   * Start canary deployment
   */
  async startDeployment(revisionName: string): Promise<void> {
    this.state.status = 'in_progress';
    this.state.stageStartTime = new Date();

    console.log(`[Canary] Starting deployment for revision: ${revisionName}`);
    console.log(`[Canary] Stage 1/${this.config.stages.length}: ${this.config.stages[0].name}`);
    console.log(`[Canary] Traffic weight: ${this.config.stages[0].trafficPercentage}%`);

    await this.notifyEvent('deployment_started', {
      revision: revisionName,
      totalStages: this.config.stages.length,
    });

    // Start monitoring loop
    await this.monitorDeployment();
  }

  /**
   * Monitor deployment progress
   */
  private async monitorDeployment(): Promise<void> {
    while (this.state.status === 'in_progress' || this.state.status === 'waiting_approval') {
      const currentStage = this.config.stages[this.state.currentStage];

      // Run health checks
      const healthResults = await this.runHealthChecks(currentStage.healthChecks);
      this.state.healthCheckResults.push(...healthResults);

      // Collect metrics
      const metrics = await this.collectMetrics();
      this.state.metricsHistory.push(metrics);

      // Check rollback triggers
      const shouldRollback = this.checkRollbackTriggers(currentStage.rollbackTriggers, metrics);
      if (shouldRollback) {
        await this.initiateRollback(shouldRollback.reason);
        return;
      }

      // Check promotion criteria
      const canPromote = this.checkPromotionCriteria(currentStage.promotionCriteria);
      if (canPromote) {
        if (currentStage.promotionCriteria.requireManualApproval) {
          this.state.status = 'waiting_approval';
          await this.notifyEvent('manual_approval_required', {
            stage: currentStage.name,
            nextStage: this.config.stages[this.state.currentStage + 1]?.name,
          });
        } else {
          await this.promoteToNextStage();
        }
      }

      // Wait before next check
      await this.sleep(currentStage.healthChecks.intervalSeconds * 1000);
    }
  }

  /**
   * Run health checks for current stage
   */
  private async runHealthChecks(config: HealthCheckConfig): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const endpoint of config.endpoints) {
      const startTime = Date.now();
      try {
        const response = await this.httpRequest(endpoint);
        results.push({
          timestamp: new Date(),
          endpoint: endpoint.path,
          success: endpoint.expectedStatus.includes(response.status),
          responseTimeMs: Date.now() - startTime,
          statusCode: response.status,
        });
      } catch (error) {
        results.push({
          timestamp: new Date(),
          endpoint: endpoint.path,
          success: false,
          responseTimeMs: Date.now() - startTime,
          statusCode: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await this.notifyEvent('health_check_failed', {
          endpoint: endpoint.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Collect deployment metrics
   */
  private async collectMetrics(): Promise<MetricSnapshot> {
    // In production, this would query Azure Monitor or Prometheus
    // For now, return placeholder metrics
    return {
      timestamp: new Date(),
      errorRate: 0.1,
      latencyP50Ms: 50,
      latencyP95Ms: 150,
      latencyP99Ms: 300,
      requestCount: 1000,
      cpuUsage: 40,
      memoryUsage: 60,
    };
  }

  /**
   * Check if any rollback triggers are breached
   */
  private checkRollbackTriggers(
    triggers: RollbackTrigger[],
    metrics: MetricSnapshot,
  ): { triggered: boolean; reason: string } | null {
    for (const trigger of triggers) {
      if (!trigger.enabled) {
        continue;
      }

      let currentValue: number;
      switch (trigger.type) {
        case 'error_rate':
        case 'http_5xx_rate':
        case 'http_4xx_rate':
          currentValue = metrics.errorRate;
          break;
        case 'latency_p99':
          currentValue = metrics.latencyP99Ms;
          break;
        case 'latency_p95':
          currentValue = metrics.latencyP95Ms;
          break;
        case 'latency_avg':
          currentValue = metrics.latencyP50Ms;
          break;
        case 'memory_usage':
          currentValue = metrics.memoryUsage;
          break;
        case 'cpu_usage':
          currentValue = metrics.cpuUsage;
          break;
        default:
          continue;
      }

      let breached = false;
      switch (trigger.comparison) {
        case 'greater_than':
          breached = currentValue > trigger.threshold;
          break;
        case 'less_than':
          breached = currentValue < trigger.threshold;
          break;
        case 'equals':
          breached = currentValue === trigger.threshold;
          break;
      }

      if (breached) {
        return {
          triggered: true,
          reason: `${trigger.type} (${currentValue}) breached threshold (${trigger.threshold})`,
        };
      }
    }

    return null;
  }

  /**
   * Check if promotion criteria are met
   */
  private checkPromotionCriteria(criteria: PromotionCriteria): boolean {
    const recentResults = this.state.healthCheckResults.slice(-criteria.minSuccessfulHealthChecks);
    const successfulChecks = recentResults.filter((r) => r.success).length;

    if (successfulChecks < criteria.minSuccessfulHealthChecks) {
      return false;
    }

    const recentMetrics = this.state.metricsHistory.slice(-10);
    if (recentMetrics.length === 0) {
      return false;
    }

    const avgErrorRate =
      recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
    const avgLatencyP95 =
      recentMetrics.reduce((sum, m) => sum + m.latencyP95Ms, 0) / recentMetrics.length;
    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.requestCount, 0);

    return (
      avgErrorRate <= criteria.maxErrorRate &&
      avgLatencyP95 <= criteria.maxLatencyP95Ms &&
      totalRequests >= criteria.minRequestsProcessed
    );
  }

  /**
   * Promote to next canary stage
   */
  async promoteToNextStage(): Promise<void> {
    const currentStage = this.config.stages[this.state.currentStage];
    const nextStageIndex = this.state.currentStage + 1;

    if (nextStageIndex >= this.config.stages.length) {
      // Deployment complete
      this.state.status = 'completed';
      console.log('[Canary] Deployment completed successfully!');
      await this.notifyEvent('deployment_completed', {
        totalDuration: Date.now() - this.state.stageStartTime.getTime(),
      });
      return;
    }

    const nextStage = this.config.stages[nextStageIndex];
    this.state.currentStage = nextStageIndex;
    this.state.stageStartTime = new Date();
    this.state.status = 'in_progress';

    console.log(`[Canary] Promoting to stage ${nextStageIndex + 1}/${this.config.stages.length}`);
    console.log(`[Canary] Stage: ${nextStage.name}, Traffic: ${nextStage.trafficPercentage}%`);

    await this.notifyEvent('stage_promoted', {
      fromStage: currentStage.name,
      toStage: nextStage.name,
      trafficPercentage: nextStage.trafficPercentage,
    });

    // Update traffic weight in Azure Container Apps
    await this.updateTrafficWeight(nextStage.trafficPercentage);
  }

  /**
   * Initiate rollback to stable revision
   */
  async initiateRollback(reason: string): Promise<void> {
    this.state.status = 'rolling_back';
    this.state.lastError = reason;

    console.log(`[Canary] Initiating rollback: ${reason}`);

    await this.notifyEvent('rollback_initiated', { reason });

    // Update traffic weight to 0% for canary, 100% for stable
    await this.updateTrafficWeight(0);

    this.state.status = 'failed';
    console.log('[Canary] Rollback completed');

    await this.notifyEvent('rollback_completed', { reason });
  }

  /**
   * Manually approve promotion (called by operator)
   */
  async approvePromotion(): Promise<void> {
    if (this.state.status !== 'waiting_approval') {
      throw new Error('Deployment is not waiting for approval');
    }

    await this.promoteToNextStage();
  }

  /**
   * Cancel deployment
   */
  async cancelDeployment(): Promise<void> {
    this.state.status = 'cancelled';
    await this.updateTrafficWeight(0);
  }

  /**
   * Get current deployment state
   */
  getState(): DeploymentState {
    return { ...this.state };
  }

  // Helper methods

  private async updateTrafficWeight(canaryPercentage: number): Promise<void> {
    // In production, this would call Azure Container Apps API
    // az containerapp ingress traffic set --name <app> --resource-group <rg> \
    //   --revision-weight <stable>=<100-canaryPercentage> <canary>=<canaryPercentage>
    console.log(
      `[Canary] Traffic weight updated: canary=${canaryPercentage}%, stable=${100 - canaryPercentage}%`,
    );
  }

  private async notifyEvent(event: CanaryEvent, data: Record<string, unknown>): Promise<void> {
    const eventConfig = this.config.notificationConfig.events.find((e) => e.event === event);
    if (!eventConfig) {
      return;
    }

    for (const channelName of eventConfig.channels) {
      const channel = this.config.notificationConfig.channels.find((c) => c.type === channelName);
      if (channel) {
        console.log(`[Canary] Notifying ${channel.type}: ${event}`, data);
        // In production, send actual notifications
      }
    }
  }

  private async httpRequest(endpoint: HealthEndpoint): Promise<{ status: number; body: string }> {
    // In production, use actual HTTP client (fetch/axios)
    return { status: 200, body: '{"status":"healthy"}' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Azure Container Apps Traffic Configuration
// ============================================================================

export interface AzureContainerAppsTrafficConfig {
  revisionMode: 'Single' | 'Multiple';
  trafficWeights: TrafficWeight[];
  stickySessionConfig?: StickySessionConfig;
}

export interface TrafficWeight {
  revisionName: string;
  label?: string;
  weight: number;
  latestRevision?: boolean;
}

export interface StickySessionConfig {
  enabled: boolean;
  affinityType: 'sticky' | 'none';
}

/**
 * Generate Azure Container Apps traffic configuration for canary deployment
 */
export function getAzureContainerAppsTrafficConfig(
  stableRevision: string,
  canaryRevision: string,
  canaryPercentage: number,
): AzureContainerAppsTrafficConfig {
  return {
    revisionMode: 'Multiple',
    trafficWeights: [
      {
        revisionName: stableRevision,
        label: 'stable',
        weight: 100 - canaryPercentage,
      },
      {
        revisionName: canaryRevision,
        label: 'canary',
        weight: canaryPercentage,
        latestRevision: true,
      },
    ],
    stickySessionConfig: {
      enabled: false, // Disable for canary testing
      affinityType: 'none',
    },
  };
}

/**
 * Generate Terraform configuration snippet for canary traffic weights
 */
export function generateTerraformTrafficConfig(canaryPercentage: number): string {
  const stablePercentage = 100 - canaryPercentage;

  return `
  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"

    traffic_weight {
      label           = "stable"
      revision_suffix = "stable"
      percentage      = ${stablePercentage}
    }

    traffic_weight {
      label           = "canary"
      latest_revision = true
      percentage      = ${canaryPercentage}
    }
  }
`;
}

// ============================================================================
// Azure CLI Commands Generator
// ============================================================================

/**
 * Generate Azure CLI commands for canary deployment
 */
export function getCanaryAzureCliCommands(
  appName: string,
  resourceGroup: string,
  containerImage: string,
): string[] {
  return [
    `# Create new revision for canary deployment`,
    `az containerapp update \\
      --name ${appName} \\
      --resource-group ${resourceGroup} \\
      --image ${containerImage} \\
      --revision-suffix canary-$(date +%Y%m%d%H%M%S)`,

    `# Set initial canary traffic weight (5%)`,
    `az containerapp ingress traffic set \\
      --name ${appName} \\
      --resource-group ${resourceGroup} \\
      --revision-weight stable=95 canary=5`,

    `# Promote to 25%`,
    `az containerapp ingress traffic set \\
      --name ${appName} \\
      --resource-group ${resourceGroup} \\
      --revision-weight stable=75 canary=25`,

    `# Promote to 50%`,
    `az containerapp ingress traffic set \\
      --name ${appName} \\
      --resource-group ${resourceGroup} \\
      --revision-weight stable=50 canary=50`,

    `# Complete rollout (100%)`,
    `az containerapp ingress traffic set \\
      --name ${appName} \\
      --resource-group ${resourceGroup} \\
      --revision-weight canary=100`,

    `# Rollback (if needed)`,
    `az containerapp ingress traffic set \\
      --name ${appName} \\
      --resource-group ${resourceGroup} \\
      --revision-weight stable=100`,
  ];
}

// ============================================================================
// Export default configuration
// ============================================================================

export default {
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
};
