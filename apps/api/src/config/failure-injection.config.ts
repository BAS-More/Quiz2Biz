/**
 * Failure Injection Scenarios
 *
 * Comprehensive chaos experiment definitions for testing system resilience
 * under various failure conditions.
 */

import {
  ChaosExperimentConfig,
  ChaosMeshExperiment,
  ChaosMeshKind,
  ExperimentResult,
} from './chaos-engineering.config';

// =============================================================================
// FAILURE INJECTION TYPES
// =============================================================================

export interface FailureScenario {
  id: string;
  name: string;
  category: FailureCategory;
  description: string;
  impact: ImpactLevel;
  targetService: string;
  injectionType: InjectionType;
  parameters: FailureParameters;
  expectedBehavior: ExpectedBehavior;
  validation: ValidationChecks;
  rollbackTriggers: RollbackTrigger[];
}

export type FailureCategory =
  | 'database'
  | 'network'
  | 'compute'
  | 'storage'
  | 'external-service'
  | 'application'
  | 'infrastructure';

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export type InjectionType =
  | 'latency'
  | 'timeout'
  | 'connection-failure'
  | 'data-corruption'
  | 'resource-exhaustion'
  | 'crash'
  | 'partition'
  | 'dns-failure'
  | 'certificate-failure';

export interface FailureParameters {
  duration: string;
  intensity?: number;
  targetPercentage?: number;
  delayMs?: number;
  errorCode?: number;
  errorMessage?: string;
  affectedEndpoints?: string[];
}

export interface ExpectedBehavior {
  description: string;
  maxResponseTimeMs: number;
  maxErrorRate: number;
  acceptableDataLoss: boolean;
  recoveryTimeSeconds: number;
  fallbackMechanism?: string;
}

export interface ValidationChecks {
  healthCheck: boolean;
  dataIntegrity: boolean;
  circuitBreakerActivation?: boolean;
  fallbackActivation?: boolean;
  alertTriggered?: boolean;
  logsGenerated?: boolean;
}

export interface RollbackTrigger {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  action: 'stop' | 'pause' | 'notify';
}

// =============================================================================
// DATABASE FAILURE SCENARIOS
// =============================================================================

export function getDatabaseFailureScenarios(): FailureScenario[] {
  return [
    // DB Connection Timeout
    {
      id: 'db-connection-timeout',
      name: 'Database Connection Timeout',
      category: 'database',
      description: 'Simulate database connection timeout by injecting 30s latency',
      impact: 'high',
      targetService: 'postgresql',
      injectionType: 'timeout',
      parameters: {
        duration: '5m',
        delayMs: 30000,
        targetPercentage: 100,
      },
      expectedBehavior: {
        description: 'Connection pool should handle timeout gracefully, circuit breaker activates',
        maxResponseTimeMs: 35000,
        maxErrorRate: 5,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 60,
        fallbackMechanism: 'Circuit breaker opens, read from cache if available',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        circuitBreakerActivation: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'error_rate', threshold: 10, operator: 'gt', action: 'stop' },
        { metric: 'data_loss_events', threshold: 1, operator: 'gt', action: 'stop' },
      ],
    },

    // DB Connection Pool Exhaustion
    {
      id: 'db-pool-exhaustion',
      name: 'Database Connection Pool Exhaustion',
      category: 'database',
      description: 'Exhaust database connection pool by holding connections',
      impact: 'high',
      targetService: 'postgresql',
      injectionType: 'resource-exhaustion',
      parameters: {
        duration: '3m',
        intensity: 100, // Use 100% of pool
      },
      expectedBehavior: {
        description: 'New requests should queue or fail gracefully with proper error messages',
        maxResponseTimeMs: 10000,
        maxErrorRate: 50,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 30,
        fallbackMechanism: 'Connection queue with timeout',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'connection_wait_time_ms', threshold: 15000, operator: 'gt', action: 'stop' },
      ],
    },

    // DB Query Timeout
    {
      id: 'db-query-timeout',
      name: 'Slow Database Queries',
      category: 'database',
      description: 'Inject latency into database queries to simulate slow queries',
      impact: 'medium',
      targetService: 'postgresql',
      injectionType: 'latency',
      parameters: {
        duration: '5m',
        delayMs: 5000,
        targetPercentage: 30,
      },
      expectedBehavior: {
        description: 'Query timeouts should be handled, results cached where possible',
        maxResponseTimeMs: 8000,
        maxErrorRate: 10,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 10,
        fallbackMechanism: 'Query timeout with retry',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'query_timeout_rate', threshold: 50, operator: 'gt', action: 'stop' },
      ],
    },

    // DB Connection Reset
    {
      id: 'db-connection-reset',
      name: 'Database Connection Reset',
      category: 'database',
      description: 'Forcefully reset database connections to test reconnection logic',
      impact: 'medium',
      targetService: 'postgresql',
      injectionType: 'connection-failure',
      parameters: {
        duration: '2m',
        targetPercentage: 50,
      },
      expectedBehavior: {
        description:
          'Connection pool should automatically reconnect, transactions should be retried',
        maxResponseTimeMs: 5000,
        maxErrorRate: 20,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 15,
        fallbackMechanism: 'Automatic reconnection with exponential backoff',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'reconnection_failures', threshold: 10, operator: 'gt', action: 'stop' },
      ],
    },
  ];
}

// =============================================================================
// EXTERNAL API FAILURE SCENARIOS
// =============================================================================

export function getExternalApiFailureScenarios(): FailureScenario[] {
  return [
    // Stripe API Timeout
    {
      id: 'stripe-api-timeout',
      name: 'Stripe API Timeout',
      category: 'external-service',
      description: 'Simulate Stripe payment API timeout',
      impact: 'high',
      targetService: 'stripe-api',
      injectionType: 'timeout',
      parameters: {
        duration: '5m',
        delayMs: 35000,
        targetPercentage: 100,
        affectedEndpoints: ['api.stripe.com'],
      },
      expectedBehavior: {
        description: 'Payment should be queued for retry, user notified of delay',
        maxResponseTimeMs: 40000,
        maxErrorRate: 100,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 120,
        fallbackMechanism: 'Queue payment for later processing, show pending status',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        circuitBreakerActivation: true,
        fallbackActivation: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'payment_failure_rate', threshold: 100, operator: 'eq', action: 'notify' },
      ],
    },

    // SendGrid Email Service Failure
    {
      id: 'sendgrid-failure',
      name: 'SendGrid Email Service Failure',
      category: 'external-service',
      description: 'Simulate SendGrid email delivery failure',
      impact: 'medium',
      targetService: 'sendgrid-api',
      injectionType: 'connection-failure',
      parameters: {
        duration: '10m',
        errorCode: 503,
        targetPercentage: 100,
        affectedEndpoints: ['api.sendgrid.com'],
      },
      expectedBehavior: {
        description: 'Emails should be queued for retry, system should continue functioning',
        maxResponseTimeMs: 5000,
        maxErrorRate: 0, // Email failures shouldn't cause API errors
        acceptableDataLoss: false,
        recoveryTimeSeconds: 300,
        fallbackMechanism: 'Queue emails for later delivery',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        fallbackActivation: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'email_queue_depth', threshold: 1000, operator: 'gt', action: 'notify' },
      ],
    },

    // Azure Storage Timeout
    {
      id: 'azure-storage-timeout',
      name: 'Azure Blob Storage Timeout',
      category: 'external-service',
      description: 'Simulate Azure Blob Storage API timeout',
      impact: 'medium',
      targetService: 'azure-storage',
      injectionType: 'timeout',
      parameters: {
        duration: '5m',
        delayMs: 30000,
        targetPercentage: 50,
        affectedEndpoints: ['*.blob.core.windows.net'],
      },
      expectedBehavior: {
        description: 'File operations should timeout gracefully, show error to user',
        maxResponseTimeMs: 35000,
        maxErrorRate: 50,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 60,
        fallbackMechanism: 'Retry with exponential backoff, local temp storage',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'storage_error_rate', threshold: 80, operator: 'gt', action: 'stop' },
      ],
    },

    // OAuth Provider Timeout
    {
      id: 'oauth-provider-timeout',
      name: 'OAuth Provider Timeout',
      category: 'external-service',
      description: 'Simulate Google/Microsoft OAuth API timeout',
      impact: 'high',
      targetService: 'oauth-providers',
      injectionType: 'timeout',
      parameters: {
        duration: '5m',
        delayMs: 30000,
        targetPercentage: 100,
        affectedEndpoints: ['oauth2.googleapis.com', 'login.microsoftonline.com'],
      },
      expectedBehavior: {
        description: 'Social login should fail gracefully, fallback to email/password login',
        maxResponseTimeMs: 35000,
        maxErrorRate: 100,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 60,
        fallbackMechanism: 'Show email/password login form, display OAuth unavailable message',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        fallbackActivation: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'login_failure_rate', threshold: 90, operator: 'gt', action: 'notify' },
      ],
    },
  ];
}

// =============================================================================
// NETWORK FAILURE SCENARIOS
// =============================================================================

export function getNetworkFailureScenarios(): FailureScenario[] {
  return [
    // Network Latency 500ms
    {
      id: 'network-latency-500ms',
      name: 'Network Latency 500ms',
      category: 'network',
      description: 'Inject 500ms network latency to simulate slow network',
      impact: 'low',
      targetService: 'quiz2biz-api',
      injectionType: 'latency',
      parameters: {
        duration: '10m',
        delayMs: 500,
        targetPercentage: 50,
      },
      expectedBehavior: {
        description: 'Application should remain usable with degraded performance',
        maxResponseTimeMs: 1500,
        maxErrorRate: 1,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 5,
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'p99_latency_ms', threshold: 3000, operator: 'gt', action: 'stop' },
      ],
    },

    // Network Latency 2000ms
    {
      id: 'network-latency-2000ms',
      name: 'Network Latency 2000ms',
      category: 'network',
      description: 'Inject 2000ms network latency to simulate severe network issues',
      impact: 'high',
      targetService: 'quiz2biz-api',
      injectionType: 'latency',
      parameters: {
        duration: '5m',
        delayMs: 2000,
        targetPercentage: 25,
      },
      expectedBehavior: {
        description: 'Circuit breakers should activate, fallback mechanisms engage',
        maxResponseTimeMs: 5000,
        maxErrorRate: 10,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 30,
        fallbackMechanism: 'Circuit breaker with cached data fallback',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        circuitBreakerActivation: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'p99_latency_ms', threshold: 8000, operator: 'gt', action: 'stop' },
        { metric: 'error_rate', threshold: 20, operator: 'gt', action: 'stop' },
      ],
    },

    // Network Partition
    {
      id: 'network-partition',
      name: 'Network Partition',
      category: 'network',
      description: 'Simulate network partition between services',
      impact: 'critical',
      targetService: 'quiz2biz-api',
      injectionType: 'partition',
      parameters: {
        duration: '3m',
        targetPercentage: 50,
      },
      expectedBehavior: {
        description: 'Affected pods should be isolated, healthy pods handle traffic',
        maxResponseTimeMs: 5000,
        maxErrorRate: 50,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 60,
        fallbackMechanism: 'Load balancer routes around failed pods',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'available_pods', threshold: 1, operator: 'lt', action: 'stop' },
      ],
    },

    // Packet Loss
    {
      id: 'packet-loss',
      name: 'Network Packet Loss 10%',
      category: 'network',
      description: 'Inject 10% packet loss to simulate unreliable network',
      impact: 'medium',
      targetService: 'quiz2biz-api',
      injectionType: 'connection-failure',
      parameters: {
        duration: '5m',
        intensity: 10, // 10% packet loss
        targetPercentage: 100,
      },
      expectedBehavior: {
        description: 'TCP retries should handle packet loss, minor latency increase',
        maxResponseTimeMs: 2000,
        maxErrorRate: 5,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 10,
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'tcp_retransmit_rate', threshold: 30, operator: 'gt', action: 'stop' },
      ],
    },

    // DNS Resolution Failure
    {
      id: 'dns-failure',
      name: 'DNS Resolution Failure',
      category: 'network',
      description: 'Simulate DNS resolution failures',
      impact: 'high',
      targetService: 'quiz2biz-api',
      injectionType: 'dns-failure',
      parameters: {
        duration: '3m',
        targetPercentage: 30,
      },
      expectedBehavior: {
        description: 'DNS cache should be used, retry with alternate DNS',
        maxResponseTimeMs: 10000,
        maxErrorRate: 30,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 30,
        fallbackMechanism: 'DNS cache, secondary DNS resolver',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'dns_failure_rate', threshold: 50, operator: 'gt', action: 'stop' },
      ],
    },
  ];
}

// =============================================================================
// POD/CONTAINER FAILURE SCENARIOS
// =============================================================================

export function getPodFailureScenarios(): FailureScenario[] {
  return [
    // Pod Kill - Single
    {
      id: 'pod-kill-single',
      name: 'Single Pod Kill',
      category: 'infrastructure',
      description: 'Kill a single API pod to test recovery',
      impact: 'low',
      targetService: 'quiz2biz-api',
      injectionType: 'crash',
      parameters: {
        duration: '1m',
        targetPercentage: 25, // Kill ~1 of 4 pods
      },
      expectedBehavior: {
        description: 'Kubernetes should restart pod, traffic should route to healthy pods',
        maxResponseTimeMs: 2000,
        maxErrorRate: 5,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 30,
        fallbackMechanism: 'K8s auto-restart, load balancer rerouting',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'available_replicas', threshold: 2, operator: 'lt', action: 'stop' },
      ],
    },

    // Pod Kill - Multiple
    {
      id: 'pod-kill-multiple',
      name: 'Multiple Pod Kill (50%)',
      category: 'infrastructure',
      description: 'Kill 50% of API pods to test resilience under partial outage',
      impact: 'high',
      targetService: 'quiz2biz-api',
      injectionType: 'crash',
      parameters: {
        duration: '2m',
        targetPercentage: 50,
      },
      expectedBehavior: {
        description: 'System should remain available with reduced capacity, HPA should scale',
        maxResponseTimeMs: 5000,
        maxErrorRate: 20,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 120,
        fallbackMechanism: 'HPA scale-out, load shedding',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'available_replicas', threshold: 1, operator: 'lt', action: 'stop' },
        { metric: 'error_rate', threshold: 50, operator: 'gt', action: 'stop' },
      ],
    },

    // Container OOM Kill
    {
      id: 'container-oom',
      name: 'Container OOM Kill',
      category: 'infrastructure',
      description: 'Trigger OOM kill by exhausting container memory',
      impact: 'high',
      targetService: 'quiz2biz-api',
      injectionType: 'resource-exhaustion',
      parameters: {
        duration: '3m',
        intensity: 100, // Max memory
      },
      expectedBehavior: {
        description: 'Container should restart, in-flight requests fail gracefully',
        maxResponseTimeMs: 10000,
        maxErrorRate: 30,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 60,
        fallbackMechanism: 'Container restart, request retry by client',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [{ metric: 'oom_kills', threshold: 2, operator: 'gt', action: 'stop' }],
    },

    // Pod Startup Failure
    {
      id: 'pod-startup-failure',
      name: 'Pod Startup Failure',
      category: 'infrastructure',
      description: 'Simulate pod startup failure to test deployment resilience',
      impact: 'medium',
      targetService: 'quiz2biz-api',
      injectionType: 'crash',
      parameters: {
        duration: '5m',
        targetPercentage: 100, // All new pods fail
      },
      expectedBehavior: {
        description: 'Existing pods continue serving, deployment should not progress',
        maxResponseTimeMs: 2000,
        maxErrorRate: 5,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 300,
        fallbackMechanism: 'RollingUpdate with maxUnavailable=0',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'deployment_progress', threshold: 0, operator: 'eq', action: 'notify' },
      ],
    },
  ];
}

// =============================================================================
// RESOURCE PRESSURE SCENARIOS
// =============================================================================

export function getResourcePressureScenarios(): FailureScenario[] {
  return [
    // CPU Pressure 80%
    {
      id: 'cpu-pressure-80',
      name: 'CPU Pressure 80%',
      category: 'compute',
      description: 'Apply 80% CPU pressure to test auto-scaling',
      impact: 'medium',
      targetService: 'quiz2biz-api',
      injectionType: 'resource-exhaustion',
      parameters: {
        duration: '5m',
        intensity: 80,
      },
      expectedBehavior: {
        description: 'HPA should scale out, latency should increase but stay acceptable',
        maxResponseTimeMs: 2000,
        maxErrorRate: 5,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 60,
        fallbackMechanism: 'HPA scale-out',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'cpu_throttle_rate', threshold: 50, operator: 'gt', action: 'stop' },
      ],
    },

    // CPU Pressure 90%
    {
      id: 'cpu-pressure-90',
      name: 'CPU Pressure 90%',
      category: 'compute',
      description: 'Apply 90% CPU pressure to test extreme load handling',
      impact: 'high',
      targetService: 'quiz2biz-api',
      injectionType: 'resource-exhaustion',
      parameters: {
        duration: '3m',
        intensity: 90,
      },
      expectedBehavior: {
        description: 'System should degrade gracefully, not crash',
        maxResponseTimeMs: 5000,
        maxErrorRate: 20,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 120,
        fallbackMechanism: 'Load shedding, request queuing',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'cpu_throttle_rate', threshold: 80, operator: 'gt', action: 'stop' },
        { metric: 'error_rate', threshold: 30, operator: 'gt', action: 'stop' },
      ],
    },

    // Memory Pressure 80%
    {
      id: 'memory-pressure-80',
      name: 'Memory Pressure 80%',
      category: 'compute',
      description: 'Apply 80% memory pressure to test memory handling',
      impact: 'medium',
      targetService: 'quiz2biz-api',
      injectionType: 'resource-exhaustion',
      parameters: {
        duration: '5m',
        intensity: 80,
      },
      expectedBehavior: {
        description: 'GC should manage memory, no OOM kills',
        maxResponseTimeMs: 3000,
        maxErrorRate: 5,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 60,
        fallbackMechanism: 'Aggressive GC, memory-efficient data structures',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'gc_pause_time_ms', threshold: 1000, operator: 'gt', action: 'notify' },
      ],
    },

    // Memory Pressure 90%
    {
      id: 'memory-pressure-90',
      name: 'Memory Pressure 90%',
      category: 'compute',
      description: 'Apply 90% memory pressure to test OOM handling',
      impact: 'high',
      targetService: 'quiz2biz-api',
      injectionType: 'resource-exhaustion',
      parameters: {
        duration: '3m',
        intensity: 90,
      },
      expectedBehavior: {
        description: 'Memory limits should prevent OOM, GC should be aggressive',
        maxResponseTimeMs: 5000,
        maxErrorRate: 20,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 120,
        fallbackMechanism: 'Memory limit protection, request rejection',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [{ metric: 'oom_imminent', threshold: 1, operator: 'eq', action: 'stop' }],
    },

    // Disk Pressure 95%
    {
      id: 'disk-pressure-95',
      name: 'Disk Pressure 95%',
      category: 'storage',
      description: 'Fill disk to 95% to test low disk space handling',
      impact: 'high',
      targetService: 'quiz2biz-api',
      injectionType: 'resource-exhaustion',
      parameters: {
        duration: '5m',
        intensity: 95,
      },
      expectedBehavior: {
        description: 'Logs should rotate, temp files cleaned, no crashes',
        maxResponseTimeMs: 2000,
        maxErrorRate: 10,
        acceptableDataLoss: false,
        recoveryTimeSeconds: 30,
        fallbackMechanism: 'Log rotation, temp file cleanup',
      },
      validation: {
        healthCheck: true,
        dataIntegrity: true,
        alertTriggered: true,
        logsGenerated: true,
      },
      rollbackTriggers: [
        { metric: 'disk_write_errors', threshold: 10, operator: 'gt', action: 'stop' },
      ],
    },
  ];
}

// =============================================================================
// CHAOS MESH EXPERIMENT GENERATOR
// =============================================================================

export function generateChaosMeshExperiments(): ChaosMeshExperiment[] {
  const scenarios = [
    ...getDatabaseFailureScenarios(),
    ...getExternalApiFailureScenarios(),
    ...getNetworkFailureScenarios(),
    ...getPodFailureScenarios(),
    ...getResourcePressureScenarios(),
  ];

  return scenarios.map((scenario) => ({
    apiVersion: 'chaos-mesh.org/v1alpha1',
    kind: mapToChaosMeshKind(scenario.injectionType),
    metadata: {
      name: scenario.id,
      namespace: 'quiz2biz',
      labels: {
        'experiment-category': scenario.category,
        'impact-level': scenario.impact,
        'target-service': scenario.targetService,
      },
      annotations: {
        description: scenario.description,
        'expected-behavior': scenario.expectedBehavior.description,
      },
    },
    spec: {
      mode: 'fixed-percent',
      value: String(scenario.parameters.targetPercentage || 50),
      selector: {
        namespaces: ['quiz2biz'],
        labelSelectors: { app: scenario.targetService },
      },
      duration: scenario.parameters.duration,
      ...getChaosMeshSpecFromScenario(scenario),
    },
  }));
}

function mapToChaosMeshKind(injectionType: InjectionType): ChaosMeshKind {
  const mapping: Record<InjectionType, ChaosMeshKind> = {
    latency: 'NetworkChaos',
    timeout: 'NetworkChaos',
    'connection-failure': 'NetworkChaos',
    'data-corruption': 'IOChaos',
    'resource-exhaustion': 'StressChaos',
    crash: 'PodChaos',
    partition: 'NetworkChaos',
    'dns-failure': 'DNSChaos',
    'certificate-failure': 'NetworkChaos',
  };
  return mapping[injectionType] || 'PodChaos';
}

function getChaosMeshSpecFromScenario(scenario: FailureScenario): Record<string, unknown> {
  switch (scenario.injectionType) {
    case 'latency':
    case 'timeout':
      return {
        action: 'delay',
        delay: {
          latency: `${scenario.parameters.delayMs}ms`,
          jitter: '100ms',
        },
      };
    case 'crash':
      return {
        action: 'pod-kill',
      };
    case 'resource-exhaustion':
      if (scenario.category === 'compute') {
        return {
          stressors: {
            cpu: { workers: 4, load: scenario.parameters.intensity },
            memory: { workers: 4, size: '512MB' },
          },
        };
      }
      return {};
    case 'connection-failure':
      return {
        action: 'loss',
        loss: {
          loss: String(scenario.parameters.intensity || 10),
        },
      };
    case 'dns-failure':
      return {
        action: 'error',
      };
    default:
      return {};
  }
}

// =============================================================================
// EXPERIMENT RUNNER UTILITIES
// =============================================================================

export interface ExperimentExecution {
  scenarioId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'rolled-back';
  observations: string[];
  metrics: Record<string, number>;
}

export class FailureInjectionRunner {
  private executions: Map<string, ExperimentExecution> = new Map();

  async executeScenario(scenario: FailureScenario): Promise<ExperimentResult> {
    const execution: ExperimentExecution = {
      scenarioId: scenario.id,
      startTime: new Date(),
      status: 'running',
      observations: [],
      metrics: {},
    };

    this.executions.set(scenario.id, execution);

    // Log experiment start
    execution.observations.push(`Starting experiment: ${scenario.name}`);
    execution.observations.push(`Expected behavior: ${scenario.expectedBehavior.description}`);

    // Monitor for rollback triggers
    const checkRollbackTriggers = async (): Promise<boolean> => {
      for (const trigger of scenario.rollbackTriggers) {
        const metricValue = await this.getMetricValue(trigger.metric);
        if (this.evaluateTrigger(metricValue, trigger)) {
          execution.observations.push(
            `Rollback trigger activated: ${trigger.metric} ${trigger.operator} ${trigger.threshold} (actual: ${metricValue})`,
          );
          return true;
        }
      }
      return false;
    };

    // Simulate experiment duration
    const shouldRollback = await checkRollbackTriggers();
    if (shouldRollback) {
      execution.status = 'rolled-back';
    } else {
      execution.status = 'completed';
    }

    execution.endTime = new Date();

    return {
      experimentId: scenario.id,
      status: execution.status === 'completed' ? 'success' : 'aborted',
      startTime: execution.startTime,
      endTime: execution.endTime,
      durationMs: execution.endTime.getTime() - execution.startTime.getTime(),
      metrics: {
        errorRateDuringChaos: execution.metrics['error_rate'] || 0,
        p99LatencyDuringChaos: execution.metrics['p99_latency_ms'] || 0,
        recoveryTimeMs: scenario.expectedBehavior.recoveryTimeSeconds * 1000,
        dataLoss: false,
      },
      observations: execution.observations,
      recommendations: this.generateRecommendations(scenario, execution),
    };
  }

  private async getMetricValue(_metricName: string): Promise<number> {
    // In real implementation, query Prometheus/Azure Monitor
    return 0;
  }

  private evaluateTrigger(value: number, trigger: RollbackTrigger): boolean {
    switch (trigger.operator) {
      case 'gt':
        return value > trigger.threshold;
      case 'lt':
        return value < trigger.threshold;
      case 'gte':
        return value >= trigger.threshold;
      case 'lte':
        return value <= trigger.threshold;
      case 'eq':
        return value === trigger.threshold;
      default:
        return false;
    }
  }

  private generateRecommendations(
    scenario: FailureScenario,
    execution: ExperimentExecution,
  ): string[] {
    const recommendations: string[] = [];

    if (execution.status === 'rolled-back') {
      recommendations.push('Experiment was rolled back due to threshold breach');
      recommendations.push(`Review ${scenario.expectedBehavior.fallbackMechanism} configuration`);
    }

    if (scenario.validation.circuitBreakerActivation) {
      recommendations.push('Verify circuit breaker configuration and thresholds');
    }

    if (scenario.validation.fallbackActivation) {
      recommendations.push('Ensure fallback mechanisms are properly tested');
    }

    return recommendations;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export function getAllFailureScenarios(): FailureScenario[] {
  return [
    ...getDatabaseFailureScenarios(),
    ...getExternalApiFailureScenarios(),
    ...getNetworkFailureScenarios(),
    ...getPodFailureScenarios(),
    ...getResourcePressureScenarios(),
  ];
}

export default {
  getDatabaseFailureScenarios,
  getExternalApiFailureScenarios,
  getNetworkFailureScenarios,
  getPodFailureScenarios,
  getResourcePressureScenarios,
  getAllFailureScenarios,
  generateChaosMeshExperiments,
  FailureInjectionRunner,
};
