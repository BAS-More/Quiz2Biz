/**
 * Chaos Engineering Configuration
 *
 * Defines chaos experiments for resilience testing using Azure Chaos Studio
 * and Chaos Mesh for Kubernetes environments.
 *
 * Purpose:
 * - Test system resilience under failure conditions
 * - Validate graceful degradation mechanisms
 * - Verify recovery procedures
 * - Ensure SLA targets during failures
 */

// =============================================================================
// CHAOS CONFIGURATION TYPES
// =============================================================================

export interface ChaosExperimentConfig {
  id: string;
  name: string;
  description: string;
  type: ChaosExperimentType;
  target: ChaosTarget;
  parameters: ChaosParameters;
  schedule: ChaosSchedule;
  rollback: RollbackConfig;
  monitoring: MonitoringConfig;
  enabled: boolean;
}

export type ChaosExperimentType =
  | 'network-latency'
  | 'network-partition'
  | 'cpu-pressure'
  | 'memory-pressure'
  | 'disk-pressure'
  | 'pod-kill'
  | 'pod-failure'
  | 'container-kill'
  | 'dns-chaos'
  | 'http-chaos'
  | 'io-chaos'
  | 'time-chaos'
  | 'jvm-chaos'
  | 'kernel-chaos'
  | 'stress-ng';

export interface ChaosTarget {
  resourceType:
    | 'container-app'
    | 'kubernetes-pod'
    | 'virtual-machine'
    | 'database'
    | 'storage'
    | 'network';
  resourceGroup?: string;
  namespace?: string;
  selector?: Record<string, string>;
  names?: string[];
  percentage?: number;
}

export interface ChaosParameters {
  duration: string;
  intensity?: number;
  latencyMs?: number;
  jitterMs?: number;
  packetLossPercent?: number;
  bandwidthLimit?: string;
  cpuPercent?: number;
  memoryBytes?: string;
  diskFillPercent?: number;
  errorRate?: number;
  httpStatusCode?: number;
  targetPort?: number;
}

export interface ChaosSchedule {
  type: 'manual' | 'scheduled' | 'continuous';
  cron?: string;
  timezone?: string;
  maxOccurrences?: number;
  gameDay?: boolean;
}

export interface RollbackConfig {
  automatic: boolean;
  triggerConditions: RollbackTrigger[];
  timeoutSeconds: number;
}

export interface RollbackTrigger {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  evaluationWindow: string;
}

export interface MonitoringConfig {
  alertsEnabled: boolean;
  dashboardUrl?: string;
  metricsToWatch: string[];
  notificationChannels: string[];
}

// =============================================================================
// AZURE CHAOS STUDIO CONFIGURATION
// =============================================================================

export interface AzureChaosStudioConfig {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  managedIdentityId: string;
  targetResourceIds: string[];
  experiments: AzureChaosExperiment[];
}

export interface AzureChaosExperiment {
  name: string;
  identity: {
    type: 'SystemAssigned' | 'UserAssigned';
    userAssignedIdentities?: Record<string, object>;
  };
  properties: {
    selectors: AzureChaosSelector[];
    steps: AzureChaosStep[];
  };
}

export interface AzureChaosSelector {
  type: 'List' | 'Query';
  id: string;
  targets: AzureChaosTargetReference[];
}

export interface AzureChaosTargetReference {
  type: string;
  id: string;
}

export interface AzureChaosStep {
  name: string;
  branches: AzureChaosBranch[];
}

export interface AzureChaosBranch {
  name: string;
  actions: AzureChaosAction[];
}

export interface AzureChaosAction {
  type: 'continuous' | 'discrete' | 'delay';
  name: string;
  selectorId?: string;
  duration?: string;
  parameters?: AzureChaosActionParameter[];
}

export interface AzureChaosActionParameter {
  key: string;
  value: string;
}

// =============================================================================
// CHAOS MESH CONFIGURATION (Kubernetes)
// =============================================================================

export interface ChaosMeshConfig {
  version: string;
  namespace: string;
  dashboard: {
    enabled: boolean;
    port: number;
    ingress?: {
      enabled: boolean;
      host: string;
    };
  };
  experiments: ChaosMeshExperiment[];
}

export interface ChaosMeshExperiment {
  apiVersion: string;
  kind: ChaosMeshKind;
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: ChaosMeshSpec;
}

export type ChaosMeshKind =
  | 'PodChaos'
  | 'NetworkChaos'
  | 'IOChaos'
  | 'TimeChaos'
  | 'StressChaos'
  | 'DNSChaos'
  | 'HTTPChaos'
  | 'KernelChaos'
  | 'JVMChaos'
  | 'AWSChaos'
  | 'AzureChaos'
  | 'GCPChaos';

export interface ChaosMeshSpec {
  mode: 'one' | 'all' | 'fixed' | 'fixed-percent' | 'random-max-percent';
  value?: string;
  selector: ChaosMeshSelector;
  duration?: string;
  scheduler?: ChaosMeshScheduler;
  // Specific chaos parameters
  action?: string;
  delay?: ChaosMeshDelay;
  loss?: ChaosMeshLoss;
  duplicate?: ChaosMeshDuplicate;
  corrupt?: ChaosMeshCorrupt;
  bandwidth?: ChaosMeshBandwidth;
  stressors?: ChaosMeshStressors;
}

export interface ChaosMeshSelector {
  namespaces?: string[];
  labelSelectors?: Record<string, string>;
  expressionSelectors?: ChaosMeshExpressionSelector[];
  fieldSelectors?: Record<string, string>;
  pods?: Record<string, string[]>;
}

export interface ChaosMeshExpressionSelector {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}

export interface ChaosMeshScheduler {
  cron: string;
  duration?: string;
}

export interface ChaosMeshDelay {
  latency: string;
  correlation?: string;
  jitter?: string;
}

export interface ChaosMeshLoss {
  loss: string;
  correlation?: string;
}

export interface ChaosMeshDuplicate {
  duplicate: string;
  correlation?: string;
}

export interface ChaosMeshCorrupt {
  corrupt: string;
  correlation?: string;
}

export interface ChaosMeshBandwidth {
  rate: string;
  limit: number;
  buffer: number;
}

export interface ChaosMeshStressors {
  memory?: {
    workers: number;
    size?: string;
  };
  cpu?: {
    workers: number;
    load?: number;
  };
}

// =============================================================================
// DEFAULT CHAOS EXPERIMENTS
// =============================================================================

export function getDefaultChaosExperiments(): ChaosExperimentConfig[] {
  return [
    // Database Connection Failure
    {
      id: 'exp-db-timeout',
      name: 'Database Connection Timeout',
      description:
        'Simulate database connection timeout to test circuit breaker and fallback mechanisms',
      type: 'network-latency',
      target: {
        resourceType: 'database',
        names: ['quiz2biz-db'],
      },
      parameters: {
        duration: '5m',
        latencyMs: 30000, // 30 second delay = timeout
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'error_rate', operator: 'gt', threshold: 5, evaluationWindow: '1m' },
          { metric: 'p99_latency_ms', operator: 'gt', threshold: 10000, evaluationWindow: '1m' },
        ],
        timeoutSeconds: 300,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['db_connection_errors', 'circuit_breaker_state', 'fallback_invocations'],
        notificationChannels: ['slack-chaos-alerts', 'pagerduty'],
      },
      enabled: true,
    },

    // External API Timeout
    {
      id: 'exp-api-timeout',
      name: 'External API Timeout',
      description: 'Simulate external API timeout (Stripe, SendGrid) to test retry and fallback',
      type: 'http-chaos',
      target: {
        resourceType: 'network',
        selector: { 'external-service': 'true' },
      },
      parameters: {
        duration: '3m',
        latencyMs: 35000, // 35 second delay
        errorRate: 0.5, // 50% of requests affected
      },
      schedule: {
        type: 'scheduled',
        cron: '0 3 * * 0', // Sunday 3 AM
        timezone: 'UTC',
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'external_api_errors', operator: 'gt', threshold: 20, evaluationWindow: '1m' },
        ],
        timeoutSeconds: 180,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['external_api_latency', 'retry_count', 'queue_depth'],
        notificationChannels: ['slack-chaos-alerts'],
      },
      enabled: true,
    },

    // Network Latency - Moderate
    {
      id: 'exp-network-latency-500ms',
      name: 'Network Latency 500ms',
      description: 'Inject 500ms network latency to test performance degradation handling',
      type: 'network-latency',
      target: {
        resourceType: 'container-app',
        selector: { app: 'quiz2biz-api' },
        percentage: 50,
      },
      parameters: {
        duration: '10m',
        latencyMs: 500,
        jitterMs: 100,
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'p95_latency_ms', operator: 'gt', threshold: 2000, evaluationWindow: '2m' },
        ],
        timeoutSeconds: 600,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['request_latency', 'timeout_rate', 'user_experience_score'],
        notificationChannels: ['slack-chaos-alerts'],
      },
      enabled: true,
    },

    // Network Latency - Severe
    {
      id: 'exp-network-latency-2000ms',
      name: 'Network Latency 2000ms',
      description: 'Inject 2000ms network latency to test extreme degradation and timeouts',
      type: 'network-latency',
      target: {
        resourceType: 'container-app',
        selector: { app: 'quiz2biz-api' },
        percentage: 25,
      },
      parameters: {
        duration: '5m',
        latencyMs: 2000,
        jitterMs: 500,
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'p99_latency_ms', operator: 'gt', threshold: 5000, evaluationWindow: '1m' },
          { metric: 'error_rate', operator: 'gt', threshold: 10, evaluationWindow: '1m' },
        ],
        timeoutSeconds: 300,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['request_latency', 'timeout_rate', 'circuit_breaker_trips'],
        notificationChannels: ['slack-chaos-alerts', 'pagerduty'],
      },
      enabled: true,
    },

    // Pod Kill
    {
      id: 'exp-pod-kill',
      name: 'Pod Kill - API Service',
      description: 'Kill API pods to test auto-scaling and recovery',
      type: 'pod-kill',
      target: {
        resourceType: 'kubernetes-pod',
        namespace: 'quiz2biz',
        selector: { app: 'quiz2biz-api' },
        percentage: 50,
      },
      parameters: {
        duration: '1m',
      },
      schedule: {
        type: 'scheduled',
        cron: '0 4 * * 3', // Wednesday 4 AM
        timezone: 'UTC',
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'available_replicas', operator: 'lt', threshold: 2, evaluationWindow: '30s' },
        ],
        timeoutSeconds: 120,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['pod_restart_count', 'available_replicas', 'request_success_rate'],
        notificationChannels: ['slack-chaos-alerts'],
      },
      enabled: true,
    },

    // CPU Pressure
    {
      id: 'exp-cpu-pressure',
      name: 'CPU Pressure 90%',
      description: 'Apply 90% CPU pressure to test resource limits and auto-scaling',
      type: 'cpu-pressure',
      target: {
        resourceType: 'container-app',
        selector: { app: 'quiz2biz-api' },
        percentage: 100,
      },
      parameters: {
        duration: '5m',
        cpuPercent: 90,
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          {
            metric: 'response_time_avg_ms',
            operator: 'gt',
            threshold: 3000,
            evaluationWindow: '1m',
          },
        ],
        timeoutSeconds: 300,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['cpu_utilization', 'request_latency', 'scale_out_events'],
        notificationChannels: ['slack-chaos-alerts'],
      },
      enabled: true,
    },

    // Memory Pressure
    {
      id: 'exp-memory-pressure',
      name: 'Memory Pressure 90%',
      description: 'Apply 90% memory pressure to test OOM handling and graceful degradation',
      type: 'memory-pressure',
      target: {
        resourceType: 'container-app',
        selector: { app: 'quiz2biz-api' },
        percentage: 100,
      },
      parameters: {
        duration: '5m',
        memoryBytes: '512Mi',
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'oom_kills', operator: 'gt', threshold: 1, evaluationWindow: '1m' },
        ],
        timeoutSeconds: 300,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['memory_utilization', 'oom_kills', 'gc_pause_time'],
        notificationChannels: ['slack-chaos-alerts', 'pagerduty'],
      },
      enabled: true,
    },

    // Disk Pressure
    {
      id: 'exp-disk-pressure',
      name: 'Disk Space 95% Full',
      description: 'Fill disk to 95% to test low disk space handling',
      type: 'disk-pressure',
      target: {
        resourceType: 'container-app',
        selector: { app: 'quiz2biz-api' },
      },
      parameters: {
        duration: '5m',
        diskFillPercent: 95,
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'disk_write_errors', operator: 'gt', threshold: 5, evaluationWindow: '1m' },
        ],
        timeoutSeconds: 300,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['disk_utilization', 'log_write_failures', 'temp_file_errors'],
        notificationChannels: ['slack-chaos-alerts'],
      },
      enabled: true,
    },

    // DNS Chaos
    {
      id: 'exp-dns-chaos',
      name: 'DNS Resolution Failure',
      description: 'Simulate DNS resolution failures to test service discovery fallbacks',
      type: 'dns-chaos',
      target: {
        resourceType: 'network',
        selector: { app: 'quiz2biz-api' },
      },
      parameters: {
        duration: '3m',
        errorRate: 0.3, // 30% DNS failures
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          {
            metric: 'dns_resolution_failures',
            operator: 'gt',
            threshold: 50,
            evaluationWindow: '1m',
          },
        ],
        timeoutSeconds: 180,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['dns_resolution_time', 'dns_failures', 'service_discovery_errors'],
        notificationChannels: ['slack-chaos-alerts'],
      },
      enabled: true,
    },

    // HTTP Error Injection
    {
      id: 'exp-http-errors',
      name: 'HTTP 503 Injection',
      description: 'Inject HTTP 503 errors to test retry logic and circuit breakers',
      type: 'http-chaos',
      target: {
        resourceType: 'container-app',
        selector: { app: 'quiz2biz-api' },
      },
      parameters: {
        duration: '5m',
        httpStatusCode: 503,
        errorRate: 0.2, // 20% of requests return 503
      },
      schedule: {
        type: 'manual',
        gameDay: true,
      },
      rollback: {
        automatic: true,
        triggerConditions: [
          { metric: 'http_5xx_rate', operator: 'gt', threshold: 30, evaluationWindow: '1m' },
        ],
        timeoutSeconds: 300,
      },
      monitoring: {
        alertsEnabled: true,
        metricsToWatch: ['http_5xx_count', 'retry_attempts', 'circuit_breaker_state'],
        notificationChannels: ['slack-chaos-alerts'],
      },
      enabled: true,
    },
  ];
}

// =============================================================================
// AZURE CHAOS STUDIO EXPERIMENT TEMPLATES
// =============================================================================

export function getAzureChaosStudioConfig(): AzureChaosStudioConfig {
  return {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || '',
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'quiz2biz-prod-rg',
    location: process.env.AZURE_LOCATION || 'eastus',
    managedIdentityId: process.env.AZURE_CHAOS_IDENTITY_ID || '',
    targetResourceIds: [
      `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${process.env.AZURE_RESOURCE_GROUP}/providers/Microsoft.App/containerApps/quiz2biz-api`,
      `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${process.env.AZURE_RESOURCE_GROUP}/providers/Microsoft.App/containerApps/quiz2biz-web`,
    ],
    experiments: [
      // CPU Pressure Experiment
      {
        name: 'quiz2biz-cpu-pressure-experiment',
        identity: { type: 'SystemAssigned' },
        properties: {
          selectors: [
            {
              type: 'List',
              id: 'selector-api',
              targets: [
                {
                  type: 'ChaosTarget',
                  id: `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${process.env.AZURE_RESOURCE_GROUP}/providers/Microsoft.App/containerApps/quiz2biz-api/providers/Microsoft.Chaos/targets/Microsoft-ContainerApp`,
                },
              ],
            },
          ],
          steps: [
            {
              name: 'Step 1 - CPU Pressure',
              branches: [
                {
                  name: 'Branch 1',
                  actions: [
                    {
                      type: 'continuous',
                      name: 'urn:csci:microsoft:containerApp:cpuPressure/1.0',
                      selectorId: 'selector-api',
                      duration: 'PT5M',
                      parameters: [{ key: 'pressureLevel', value: '90' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },

      // Network Latency Experiment
      {
        name: 'quiz2biz-network-latency-experiment',
        identity: { type: 'SystemAssigned' },
        properties: {
          selectors: [
            {
              type: 'List',
              id: 'selector-network',
              targets: [
                {
                  type: 'ChaosTarget',
                  id: `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${process.env.AZURE_RESOURCE_GROUP}/providers/Microsoft.Network/virtualNetworks/quiz2biz-vnet/providers/Microsoft.Chaos/targets/Microsoft-VirtualNetwork`,
                },
              ],
            },
          ],
          steps: [
            {
              name: 'Step 1 - Network Latency',
              branches: [
                {
                  name: 'Branch 1',
                  actions: [
                    {
                      type: 'continuous',
                      name: 'urn:csci:microsoft:virtualNetwork:disconnect/1.0',
                      selectorId: 'selector-network',
                      duration: 'PT3M',
                      parameters: [
                        { key: 'destinationFilters', value: '["*"]' },
                        { key: 'latencyInMilliseconds', value: '500' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// =============================================================================
// CHAOS MESH KUBERNETES MANIFESTS
// =============================================================================

export function getChaosMeshConfig(): ChaosMeshConfig {
  return {
    version: '2.6.0',
    namespace: 'chaos-mesh',
    dashboard: {
      enabled: true,
      port: 2333,
      ingress: {
        enabled: true,
        host: 'chaos.quiz2biz.com',
      },
    },
    experiments: [
      // Pod Chaos - Kill pods
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'PodChaos',
        metadata: {
          name: 'pod-kill-api',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'pod-kill',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'fixed-percent',
          value: '50',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          action: 'pod-kill',
          duration: '60s',
        },
      },

      // Network Chaos - Latency
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'NetworkChaos',
        metadata: {
          name: 'network-delay-500ms',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'network-latency',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'all',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          action: 'delay',
          delay: {
            latency: '500ms',
            correlation: '25',
            jitter: '100ms',
          },
          duration: '300s',
        },
      },

      // Network Chaos - Severe Latency
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'NetworkChaos',
        metadata: {
          name: 'network-delay-2000ms',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'network-latency-severe',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'fixed-percent',
          value: '25',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          action: 'delay',
          delay: {
            latency: '2000ms',
            correlation: '50',
            jitter: '500ms',
          },
          duration: '180s',
        },
      },

      // Network Chaos - Packet Loss
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'NetworkChaos',
        metadata: {
          name: 'network-packet-loss',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'network-loss',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'all',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          action: 'loss',
          loss: {
            loss: '10',
            correlation: '25',
          },
          duration: '300s',
        },
      },

      // Stress Chaos - CPU
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'StressChaos',
        metadata: {
          name: 'stress-cpu-90',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'cpu-pressure',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'all',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          stressors: {
            cpu: {
              workers: 4,
              load: 90,
            },
          },
          duration: '300s',
        },
      },

      // Stress Chaos - Memory
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'StressChaos',
        metadata: {
          name: 'stress-memory-90',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'memory-pressure',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'all',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          stressors: {
            memory: {
              workers: 4,
              size: '512MB',
            },
          },
          duration: '300s',
        },
      },

      // DNS Chaos
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'DNSChaos',
        metadata: {
          name: 'dns-failure',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'dns-chaos',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'all',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          action: 'error',
          duration: '120s',
        },
      },

      // HTTP Chaos - 503 Errors
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'HTTPChaos',
        metadata: {
          name: 'http-503-injection',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'http-error',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'all',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          duration: '300s',
        },
      },

      // IO Chaos - Disk Latency
      {
        apiVersion: 'chaos-mesh.org/v1alpha1',
        kind: 'IOChaos',
        metadata: {
          name: 'io-latency',
          namespace: 'quiz2biz',
          labels: {
            'experiment-type': 'io-chaos',
            environment: 'staging',
          },
        },
        spec: {
          mode: 'all',
          selector: {
            namespaces: ['quiz2biz'],
            labelSelectors: { app: 'quiz2biz-api' },
          },
          action: 'latency',
          duration: '300s',
        },
      },
    ],
  };
}

// =============================================================================
// CHAOS EXPERIMENT RUNNER SERVICE
// =============================================================================

export interface ExperimentResult {
  experimentId: string;
  status: 'success' | 'failed' | 'aborted' | 'timeout';
  startTime: Date;
  endTime: Date;
  durationMs: number;
  metrics: {
    errorRateDuringChaos: number;
    p99LatencyDuringChaos: number;
    recoveryTimeMs: number;
    dataLoss: boolean;
  };
  observations: string[];
  recommendations: string[];
}

export interface ChaosExperimentRunner {
  /**
   * Start a chaos experiment
   */
  startExperiment(experimentId: string): Promise<void>;

  /**
   * Stop a running chaos experiment
   */
  stopExperiment(experimentId: string): Promise<void>;

  /**
   * Get experiment status
   */
  getExperimentStatus(experimentId: string): Promise<{
    status: 'running' | 'stopped' | 'completed' | 'failed';
    progress: number;
    metrics: Record<string, number>;
  }>;

  /**
   * Get experiment results
   */
  getExperimentResults(experimentId: string): Promise<ExperimentResult>;

  /**
   * List all experiments
   */
  listExperiments(): Promise<ChaosExperimentConfig[]>;

  /**
   * Schedule a Game Day
   */
  scheduleGameDay(date: Date, experiments: string[]): Promise<void>;
}

// =============================================================================
// GAME DAY CONFIGURATION
// =============================================================================

export interface GameDayConfig {
  name: string;
  description: string;
  date: Date;
  duration: string;
  experiments: GameDayExperiment[];
  participants: GameDayParticipant[];
  runbook: string;
  successCriteria: SuccessCriteria[];
}

export interface GameDayExperiment {
  experimentId: string;
  order: number;
  startDelayMinutes: number;
  expectedOutcome: string;
}

export interface GameDayParticipant {
  name: string;
  role: 'facilitator' | 'observer' | 'responder' | 'scribe';
  notificationChannel: string;
}

export interface SuccessCriteria {
  metric: string;
  operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
  threshold: number;
  description: string;
}

export function getDefaultGameDayConfig(): GameDayConfig {
  return {
    name: 'Quiz2Biz Resilience Game Day',
    description: 'Quarterly chaos engineering game day to validate system resilience',
    date: new Date(),
    duration: '4h',
    experiments: [
      {
        experimentId: 'exp-network-latency-500ms',
        order: 1,
        startDelayMinutes: 0,
        expectedOutcome: 'System handles 500ms latency with degraded but acceptable performance',
      },
      {
        experimentId: 'exp-network-latency-2000ms',
        order: 2,
        startDelayMinutes: 30,
        expectedOutcome: 'Circuit breakers activate, fallback mechanisms engage',
      },
      {
        experimentId: 'exp-pod-kill',
        order: 3,
        startDelayMinutes: 60,
        expectedOutcome: 'Auto-scaling replaces killed pods within 60 seconds',
      },
      {
        experimentId: 'exp-db-timeout',
        order: 4,
        startDelayMinutes: 90,
        expectedOutcome: 'Database connection pool handles timeout gracefully',
      },
      {
        experimentId: 'exp-cpu-pressure',
        order: 5,
        startDelayMinutes: 120,
        expectedOutcome: 'HPA scales out, request latency stays under 1s',
      },
      {
        experimentId: 'exp-memory-pressure',
        order: 6,
        startDelayMinutes: 150,
        expectedOutcome: 'No OOM kills, garbage collection keeps memory stable',
      },
    ],
    participants: [
      { name: 'SRE Lead', role: 'facilitator', notificationChannel: 'slack-sre' },
      { name: 'Dev Team Lead', role: 'observer', notificationChannel: 'slack-dev' },
      { name: 'On-Call Engineer', role: 'responder', notificationChannel: 'pagerduty' },
      { name: 'QA Engineer', role: 'scribe', notificationChannel: 'slack-qa' },
    ],
    runbook: 'https://docs.quiz2biz.com/runbooks/game-day-procedures',
    successCriteria: [
      {
        metric: 'data_loss',
        operator: 'eq',
        threshold: 0,
        description: 'No data loss during any experiment',
      },
      {
        metric: 'recovery_time_minutes',
        operator: 'lt',
        threshold: 5,
        description: 'System recovers within 5 minutes of chaos end',
      },
      {
        metric: 'error_rate_peak',
        operator: 'lt',
        threshold: 10,
        description: 'Peak error rate stays under 10%',
      },
      {
        metric: 'user_impact_minutes',
        operator: 'lt',
        threshold: 2,
        description: 'User-visible impact under 2 minutes',
      },
    ],
  };
}

// =============================================================================
// STEADY STATE HYPOTHESIS
// =============================================================================

export interface SteadyStateHypothesis {
  name: string;
  probes: SteadyStateProbe[];
}

export interface SteadyStateProbe {
  name: string;
  type: 'http' | 'metric' | 'process';
  provider: ProbeProvider;
  tolerance: ProbeTolerance;
}

export interface ProbeProvider {
  type: 'http' | 'prometheus' | 'datadog' | 'azure-monitor';
  url?: string;
  query?: string;
  headers?: Record<string, string>;
}

export interface ProbeTolerance {
  type: 'range' | 'regex' | 'jsonpath';
  target?: string;
  pattern?: string;
  range?: { min: number; max: number };
}

export function getSteadyStateHypotheses(): SteadyStateHypothesis[] {
  return [
    {
      name: 'API Health Check',
      probes: [
        {
          name: 'Health endpoint returns 200',
          type: 'http',
          provider: {
            type: 'http',
            url: '${API_URL}/health',
          },
          tolerance: {
            type: 'jsonpath',
            target: '$.status',
            pattern: 'healthy',
          },
        },
      ],
    },
    {
      name: 'Response Time SLA',
      probes: [
        {
          name: 'P95 latency under 500ms',
          type: 'metric',
          provider: {
            type: 'azure-monitor',
            query: 'requests | summarize percentile(duration, 95) by bin(timestamp, 1m)',
          },
          tolerance: {
            type: 'range',
            range: { min: 0, max: 500 },
          },
        },
      ],
    },
    {
      name: 'Error Rate SLA',
      probes: [
        {
          name: 'Error rate under 1%',
          type: 'metric',
          provider: {
            type: 'azure-monitor',
            query:
              'requests | summarize error_rate = countif(success == false) * 100.0 / count() by bin(timestamp, 1m)',
          },
          tolerance: {
            type: 'range',
            range: { min: 0, max: 1 },
          },
        },
      ],
    },
  ];
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  getDefaultChaosExperiments,
  getAzureChaosStudioConfig,
  getChaosMeshConfig,
  getDefaultGameDayConfig,
  getSteadyStateHypotheses,
};
