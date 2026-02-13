/**
 * Alerting Rules Configuration
 *
 * Defines alerting thresholds, notification channels, and escalation policies
 * for production monitoring and incident response.
 */

// =============================================================================
// Threshold Types
// =============================================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertState = 'firing' | 'pending' | 'resolved';
export type NotificationChannel = 'email' | 'slack' | 'teams' | 'pagerduty' | 'sms' | 'webhook';

// =============================================================================
// Alert Rule Interface
// =============================================================================

export interface AlertRule {
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration: string; // e.g., '5m', '15m', '1h'
  severity: Severity;
  channels: NotificationChannel[];
  runbook?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface AlertingConfig {
  globalConfig: GlobalAlertConfig;
  errorAlerts: AlertRule[];
  performanceAlerts: AlertRule[];
  securityAlerts: AlertRule[];
  businessAlerts: AlertRule[];
  resourceAlerts: AlertRule[];
}

export interface GlobalAlertConfig {
  evaluationInterval: string;
  resolveTimeout: string;
  repeatInterval: string;
  groupByLabels: string[];
  inhibitRules: InhibitRule[];
}

export interface InhibitRule {
  sourceMatch: Record<string, string>;
  targetMatch: Record<string, string>;
  equal: string[];
}

// =============================================================================
// Alerting Configuration
// =============================================================================

export const AlertingConfiguration: AlertingConfig = {
  globalConfig: {
    evaluationInterval: '30s',
    resolveTimeout: '5m',
    repeatInterval: '4h',
    groupByLabels: ['severity', 'service', 'environment'],
    inhibitRules: [
      // Don't alert on lower severity if critical is firing
      {
        sourceMatch: { severity: 'critical' },
        targetMatch: { severity: 'high' },
        equal: ['service'],
      },
      {
        sourceMatch: { severity: 'critical' },
        targetMatch: { severity: 'medium' },
        equal: ['service'],
      },
    ],
  },

  // ==========================================================================
  // Error Rate Alerts
  // ==========================================================================
  errorAlerts: [
    {
      name: 'HighErrorRate',
      description: 'Error rate exceeds 1% of total requests',
      metric: 'error_rate_percentage',
      condition: 'gt',
      threshold: 1,
      duration: '5m',
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      runbook: 'https://runbooks.quiz2build.com/error-rate',
      labels: {
        category: 'error',
        component: 'api',
      },
      annotations: {
        summary: 'Error rate is {{ $value }}% (threshold: 1%)',
        description:
          'The API error rate has exceeded 1% for the past 5 minutes. Immediate investigation required.',
      },
    },
    {
      name: 'Http5xxErrors',
      description: 'More than 10 5xx errors per minute',
      metric: 'http_5xx_errors_per_minute',
      condition: 'gt',
      threshold: 10,
      duration: '2m',
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      runbook: 'https://runbooks.quiz2build.com/5xx-errors',
      labels: {
        category: 'error',
        component: 'api',
      },
    },
    {
      name: 'Http4xxSpike',
      description: 'Unusual spike in 4xx client errors',
      metric: 'http_4xx_errors_per_minute',
      condition: 'gt',
      threshold: 100,
      duration: '5m',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'error',
        component: 'api',
      },
    },
    {
      name: 'UnhandledException',
      description: 'Unhandled exception detected',
      metric: 'unhandled_exceptions_total',
      condition: 'gt',
      threshold: 0,
      duration: '1m',
      severity: 'high',
      channels: ['email', 'slack'],
      labels: {
        category: 'error',
        component: 'api',
      },
    },
  ],

  // ==========================================================================
  // Performance Alerts
  // ==========================================================================
  performanceAlerts: [
    {
      name: 'HighResponseTime',
      description: 'API response time exceeds 500ms',
      metric: 'http_response_time_p95_ms',
      condition: 'gt',
      threshold: 500,
      duration: '5m',
      severity: 'high',
      channels: ['email', 'slack'],
      runbook: 'https://runbooks.quiz2build.com/slow-response',
      labels: {
        category: 'performance',
        component: 'api',
      },
    },
    {
      name: 'CriticalResponseTime',
      description: 'API response time exceeds 2s (critical)',
      metric: 'http_response_time_p95_ms',
      condition: 'gt',
      threshold: 2000,
      duration: '2m',
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      labels: {
        category: 'performance',
        component: 'api',
      },
    },
    {
      name: 'SlowDatabaseQueries',
      description: 'Database query time exceeds 1s',
      metric: 'database_query_time_p95_ms',
      condition: 'gt',
      threshold: 1000,
      duration: '5m',
      severity: 'high',
      channels: ['email', 'slack'],
      labels: {
        category: 'performance',
        component: 'database',
      },
    },
    {
      name: 'HighRequestLatency',
      description: 'Request latency p99 exceeds 3s',
      metric: 'http_request_latency_p99_ms',
      condition: 'gt',
      threshold: 3000,
      duration: '5m',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'performance',
        component: 'api',
      },
    },
    {
      name: 'LowThroughput',
      description: 'Request throughput dropped significantly',
      metric: 'requests_per_second',
      condition: 'lt',
      threshold: 10, // Adjust based on baseline
      duration: '10m',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'performance',
        component: 'api',
      },
    },
  ],

  // ==========================================================================
  // Security Alerts
  // ==========================================================================
  securityAlerts: [
    {
      name: 'HighAuthFailures',
      description: 'More than 100 authentication failures in 5 minutes',
      metric: 'auth_failures_5m',
      condition: 'gt',
      threshold: 100,
      duration: '5m',
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      runbook: 'https://runbooks.quiz2build.com/auth-failures',
      labels: {
        category: 'security',
        component: 'auth',
      },
      annotations: {
        summary: 'Potential brute force attack detected',
        description:
          '{{ $value }} authentication failures in the past 5 minutes. May indicate a brute force attack.',
      },
    },
    {
      name: 'UnauthorizedAccessAttempt',
      description: 'Multiple 403 forbidden responses to same user',
      metric: 'unauthorized_access_attempts_per_user',
      condition: 'gt',
      threshold: 10,
      duration: '5m',
      severity: 'high',
      channels: ['email', 'slack'],
      labels: {
        category: 'security',
        component: 'auth',
      },
    },
    {
      name: 'SuspiciousIPActivity',
      description: 'Multiple failed requests from same IP',
      metric: 'failed_requests_per_ip',
      condition: 'gt',
      threshold: 50,
      duration: '5m',
      severity: 'high',
      channels: ['email', 'slack'],
      labels: {
        category: 'security',
        component: 'firewall',
      },
    },
    {
      name: 'JWTTokenAnomalies',
      description: 'Invalid or expired JWT token usage spike',
      metric: 'invalid_jwt_tokens_per_minute',
      condition: 'gt',
      threshold: 20,
      duration: '5m',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'security',
        component: 'auth',
      },
    },
    {
      name: 'RateLimitExceeded',
      description: 'Rate limit exceeded frequently',
      metric: 'rate_limit_exceeded_count',
      condition: 'gt',
      threshold: 50,
      duration: '5m',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'security',
        component: 'api',
      },
    },
  ],

  // ==========================================================================
  // Business Alerts
  // ==========================================================================
  businessAlerts: [
    {
      name: 'QuestionnaireCompletionDrop',
      description: 'Questionnaire completion rate dropped significantly',
      metric: 'questionnaire_completion_rate_1h',
      condition: 'lt',
      threshold: 50, // Percentage
      duration: '1h',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'business',
        component: 'questionnaire',
      },
    },
    {
      name: 'PaymentFailures',
      description: 'Multiple payment failures detected',
      metric: 'payment_failures_per_hour',
      condition: 'gt',
      threshold: 5,
      duration: '1h',
      severity: 'high',
      channels: ['email', 'slack', 'pagerduty'],
      runbook: 'https://runbooks.quiz2build.com/payment-failures',
      labels: {
        category: 'business',
        component: 'payment',
      },
    },
    {
      name: 'DocumentGenerationFailures',
      description: 'Document generation failing frequently',
      metric: 'document_generation_failures_per_hour',
      condition: 'gt',
      threshold: 10,
      duration: '1h',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'business',
        component: 'documents',
      },
    },
    {
      name: 'NoActiveUsers',
      description: 'No active users detected (during business hours)',
      metric: 'active_users_count',
      condition: 'eq',
      threshold: 0,
      duration: '30m',
      severity: 'medium',
      channels: ['email', 'slack'],
      labels: {
        category: 'business',
        component: 'users',
      },
    },
  ],

  // ==========================================================================
  // Resource Alerts
  // ==========================================================================
  resourceAlerts: [
    {
      name: 'HighCPUUsage',
      description: 'CPU usage exceeds 80%',
      metric: 'cpu_usage_percentage',
      condition: 'gt',
      threshold: 80,
      duration: '5m',
      severity: 'high',
      channels: ['email', 'slack'],
      runbook: 'https://runbooks.quiz2build.com/high-cpu',
      labels: {
        category: 'resource',
        component: 'infrastructure',
      },
    },
    {
      name: 'CriticalCPUUsage',
      description: 'CPU usage exceeds 95%',
      metric: 'cpu_usage_percentage',
      condition: 'gt',
      threshold: 95,
      duration: '2m',
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      labels: {
        category: 'resource',
        component: 'infrastructure',
      },
    },
    {
      name: 'HighMemoryUsage',
      description: 'Memory usage exceeds 80%',
      metric: 'memory_usage_percentage',
      condition: 'gt',
      threshold: 80,
      duration: '5m',
      severity: 'high',
      channels: ['email', 'slack'],
      runbook: 'https://runbooks.quiz2build.com/high-memory',
      labels: {
        category: 'resource',
        component: 'infrastructure',
      },
    },
    {
      name: 'CriticalMemoryUsage',
      description: 'Memory usage exceeds 95%',
      metric: 'memory_usage_percentage',
      condition: 'gt',
      threshold: 95,
      duration: '2m',
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      labels: {
        category: 'resource',
        component: 'infrastructure',
      },
    },
    {
      name: 'HighDiskUsage',
      description: 'Disk usage exceeds 85%',
      metric: 'disk_usage_percentage',
      condition: 'gt',
      threshold: 85,
      duration: '15m',
      severity: 'high',
      channels: ['email', 'slack'],
      labels: {
        category: 'resource',
        component: 'infrastructure',
      },
    },
    {
      name: 'DatabaseConnectionPoolExhaustion',
      description: 'Database connection pool near exhaustion',
      metric: 'db_connection_pool_used_percentage',
      condition: 'gt',
      threshold: 90,
      duration: '5m',
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      labels: {
        category: 'resource',
        component: 'database',
      },
    },
    {
      name: 'RedisMemoryHigh',
      description: 'Redis memory usage high',
      metric: 'redis_memory_usage_percentage',
      condition: 'gt',
      threshold: 80,
      duration: '10m',
      severity: 'high',
      channels: ['email', 'slack'],
      labels: {
        category: 'resource',
        component: 'redis',
      },
    },
  ],
};

// =============================================================================
// Notification Channel Configuration
// =============================================================================

export interface ChannelConfig {
  email: EmailConfig;
  slack: SlackConfig;
  teams: TeamsConfig;
  pagerduty: PagerDutyConfig;
  sms: SMSConfig;
  webhook: WebhookConfig;
}

export interface EmailConfig {
  enabled: boolean;
  recipients: string[];
  smtpHost: string;
  smtpPort: number;
  from: string;
  subjectPrefix: string;
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  username: string;
  iconEmoji: string;
  mentionUsers: string[];
  mentionChannels: string[];
}

export interface TeamsConfig {
  enabled: boolean;
  webhookUrl: string;
  mentionUsers: string[];
}

export interface PagerDutyConfig {
  enabled: boolean;
  serviceKey: string;
  escalationPolicy: string;
}

export interface SMSConfig {
  enabled: boolean;
  provider: 'twilio' | 'aws_sns';
  recipients: string[];
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  headers: Record<string, string>;
}

export const NotificationChannels: ChannelConfig = {
  email: {
    enabled: true,
    recipients: (process.env.ALERT_EMAIL_RECIPIENTS || 'ops@quiz2build.com').split(','),
    smtpHost: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    from: process.env.ALERT_FROM_EMAIL || 'alerts@quiz2build.com',
    subjectPrefix: '[Quiz2Build Alert]',
  },
  slack: {
    enabled: !!process.env.SLACK_WEBHOOK_URL,
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: process.env.SLACK_ALERT_CHANNEL || '#alerts-production',
    username: 'Quiz2Build Alerts',
    iconEmoji: ':rotating_light:',
    mentionUsers: (process.env.SLACK_MENTION_USERS || '').split(',').filter(Boolean),
    mentionChannels: [],
  },
  teams: {
    enabled: !!process.env.TEAMS_WEBHOOK_URL,
    webhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
    mentionUsers: (process.env.TEAMS_MENTION_USERS || '').split(',').filter(Boolean),
  },
  pagerduty: {
    enabled: !!process.env.PAGERDUTY_SERVICE_KEY,
    serviceKey: process.env.PAGERDUTY_SERVICE_KEY || '',
    escalationPolicy: process.env.PAGERDUTY_ESCALATION_POLICY || 'default',
  },
  sms: {
    enabled: !!process.env.TWILIO_ACCOUNT_SID,
    provider: 'twilio',
    recipients: (process.env.SMS_ALERT_RECIPIENTS || '').split(',').filter(Boolean),
  },
  webhook: {
    enabled: !!process.env.ALERT_WEBHOOK_URL,
    url: process.env.ALERT_WEBHOOK_URL || '',
    headers: {
      'Content-Type': 'application/json',
      'X-Alert-Source': 'quiz2build',
    },
  },
};

// =============================================================================
// Escalation Policy
// =============================================================================

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  channels: NotificationChannel[];
  targets: string[]; // email addresses or user IDs
}

export interface EscalationPolicy {
  name: string;
  levels: EscalationLevel[];
  repeatAfterMinutes: number;
  autoResolveAfterMinutes: number;
}

export const DefaultEscalationPolicy: EscalationPolicy = {
  name: 'default',
  levels: [
    {
      level: 1,
      delayMinutes: 0,
      channels: ['email', 'slack'],
      targets: ['on-call@quiz2build.com'],
    },
    {
      level: 2,
      delayMinutes: 15,
      channels: ['email', 'slack', 'teams'],
      targets: ['team-lead@quiz2build.com', 'on-call@quiz2build.com'],
    },
    {
      level: 3,
      delayMinutes: 30,
      channels: ['email', 'slack', 'teams', 'pagerduty', 'sms'],
      targets: ['cto@quiz2build.com', 'team-lead@quiz2build.com'],
    },
  ],
  repeatAfterMinutes: 60,
  autoResolveAfterMinutes: 240, // 4 hours
};

export const CriticalEscalationPolicy: EscalationPolicy = {
  name: 'critical',
  levels: [
    {
      level: 1,
      delayMinutes: 0,
      channels: ['email', 'slack', 'pagerduty', 'sms'],
      targets: ['on-call@quiz2build.com'],
    },
    {
      level: 2,
      delayMinutes: 5,
      channels: ['email', 'slack', 'teams', 'pagerduty', 'sms'],
      targets: ['team-lead@quiz2build.com', 'cto@quiz2build.com'],
    },
    {
      level: 3,
      delayMinutes: 15,
      channels: ['email', 'slack', 'teams', 'pagerduty', 'sms'],
      targets: ['ceo@quiz2build.com', 'cto@quiz2build.com'],
    },
  ],
  repeatAfterMinutes: 15,
  autoResolveAfterMinutes: 60,
};

// =============================================================================
// Alert Helper Functions
// =============================================================================

/**
 * Get alerts by severity level
 */
export function getAlertsBySeverity(severity: Severity): AlertRule[] {
  const allAlerts = [
    ...AlertingConfiguration.errorAlerts,
    ...AlertingConfiguration.performanceAlerts,
    ...AlertingConfiguration.securityAlerts,
    ...AlertingConfiguration.businessAlerts,
    ...AlertingConfiguration.resourceAlerts,
  ];
  return allAlerts.filter((alert) => alert.severity === severity);
}

/**
 * Get alerts by category
 */
export function getAlertsByCategory(category: string): AlertRule[] {
  switch (category) {
    case 'error':
      return AlertingConfiguration.errorAlerts;
    case 'performance':
      return AlertingConfiguration.performanceAlerts;
    case 'security':
      return AlertingConfiguration.securityAlerts;
    case 'business':
      return AlertingConfiguration.businessAlerts;
    case 'resource':
      return AlertingConfiguration.resourceAlerts;
    default:
      return [];
  }
}

/**
 * Get appropriate escalation policy based on severity
 */
export function getEscalationPolicy(severity: Severity): EscalationPolicy {
  return severity === 'critical' ? CriticalEscalationPolicy : DefaultEscalationPolicy;
}

/**
 * Format alert message for notification
 */
export function formatAlertMessage(
  alert: AlertRule,
  currentValue: number,
  state: AlertState,
): string {
  const emoji = state === 'firing' ? '🔴' : state === 'resolved' ? '✅' : '🟡';
  const severityEmoji = {
    critical: '🚨',
    high: '🔥',
    medium: '⚠️',
    low: 'ℹ️',
    info: '📝',
  };

  return `
${emoji} ${state.toUpperCase()}: ${alert.name}
${severityEmoji[alert.severity]} Severity: ${alert.severity.toUpperCase()}

📊 Metric: ${alert.metric}
📏 Condition: ${alert.condition} ${alert.threshold}
📈 Current Value: ${currentValue}
⏱️ Duration: ${alert.duration}

📋 Description: ${alert.description}
${alert.runbook ? `📖 Runbook: ${alert.runbook}` : ''}
`.trim();
}

/**
 * Check if alert should be sent based on quiet hours
 */
export function shouldSendAlert(severity: Severity): boolean {
  // Always send critical and high severity alerts
  if (severity === 'critical' || severity === 'high') {
    return true;
  }

  // Check quiet hours for lower severity (e.g., 10 PM - 7 AM local time)
  const now = new Date();
  const hour = now.getHours();
  const isQuietHours = hour >= 22 || hour < 7;

  return !isQuietHours;
}

/**
 * Get total alert count by severity
 */
export function getAlertSummary(): Record<Severity, number> {
  const allAlerts = [
    ...AlertingConfiguration.errorAlerts,
    ...AlertingConfiguration.performanceAlerts,
    ...AlertingConfiguration.securityAlerts,
    ...AlertingConfiguration.businessAlerts,
    ...AlertingConfiguration.resourceAlerts,
  ];

  return {
    critical: allAlerts.filter((a) => a.severity === 'critical').length,
    high: allAlerts.filter((a) => a.severity === 'high').length,
    medium: allAlerts.filter((a) => a.severity === 'medium').length,
    low: allAlerts.filter((a) => a.severity === 'low').length,
    info: allAlerts.filter((a) => a.severity === 'info').length,
  };
}

// Export summary
export const AlertingSummary = {
  totalAlerts: getAlertSummary(),
  categories: ['error', 'performance', 'security', 'business', 'resource'],
  channels: Object.keys(NotificationChannels).filter(
    (k) => NotificationChannels[k as keyof ChannelConfig].enabled,
  ),
  escalationPolicies: ['default', 'critical'],
};
