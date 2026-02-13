/**
 * Uptime Monitoring Configuration
 *
 * Configuration for external uptime monitoring services (UptimeRobot, Pingdom, etc.)
 * Defines health check endpoints, SLA targets, and alerting policies.
 */

// =============================================================================
// SLA Configuration
// =============================================================================

export const SLAConfig = {
  // Target uptime percentage
  uptimeTarget: 99.9, // 99.9% = 8.76 hours downtime/year

  // Maximum acceptable response times (ms)
  responseTimeTargets: {
    healthCheck: 500, // Health endpoints should respond in <500ms
    apiEndpoint: 2000, // API endpoints should respond in <2s
    pageLoad: 3000, // Web pages should load in <3s
  },

  // Maintenance windows (UTC)
  maintenanceWindows: [
    { day: 'Sunday', startHour: 2, endHour: 4 }, // Sunday 2-4 AM UTC
  ],

  // SLA calculation period
  calculationPeriod: 'monthly',
};

// =============================================================================
// Health Check Endpoints
// =============================================================================

export const HealthEndpoints = {
  // API Health Checks
  api: {
    // Basic liveness probe - responds if process is running
    live: {
      path: '/health/live',
      method: 'GET',
      expectedStatus: 200,
      expectedResponse: { status: 'ok' },
      timeout: 5000,
      interval: 30, // seconds
      description: 'Kubernetes liveness probe - process is running',
    },

    // Readiness probe - responds if app can handle requests
    ready: {
      path: '/health/ready',
      method: 'GET',
      expectedStatus: 200,
      expectedResponse: { status: 'ok', database: 'connected', redis: 'connected' },
      timeout: 10000,
      interval: 30,
      description: 'Kubernetes readiness probe - dependencies available',
    },

    // Full health check - detailed system status
    full: {
      path: '/health',
      method: 'GET',
      expectedStatus: 200,
      timeout: 15000,
      interval: 60,
      description: 'Full health check with all dependencies',
    },
  },

  // Web Application Health Checks
  web: {
    // Home page loads
    homePage: {
      url: '/',
      method: 'GET',
      expectedStatus: 200,
      timeout: 10000,
      interval: 60,
      description: 'Web application home page loads',
    },

    // Login page accessible
    loginPage: {
      url: '/login',
      method: 'GET',
      expectedStatus: 200,
      timeout: 10000,
      interval: 60,
      description: 'Login page accessible',
    },
  },
};

// =============================================================================
// UptimeRobot Configuration
// =============================================================================

export const UptimeRobotConfig = {
  // Account configuration (set via environment variables)
  apiKey: process.env.UPTIMEROBOT_API_KEY || '',

  // Monitor configurations
  monitors: [
    {
      friendly_name: 'Quiz2Build API - Health',
      url: `${process.env.API_BASE_URL || 'https://api.quiz2build.com'}/health`,
      type: 1, // HTTP(s)
      interval: 60, // seconds
      alert_contacts: process.env.UPTIMEROBOT_ALERT_CONTACTS || '',
    },
    {
      friendly_name: 'Quiz2Build API - Liveness',
      url: `${process.env.API_BASE_URL || 'https://api.quiz2build.com'}/health/live`,
      type: 1,
      interval: 30,
      alert_contacts: process.env.UPTIMEROBOT_ALERT_CONTACTS || '',
    },
    {
      friendly_name: 'Quiz2Build API - Readiness',
      url: `${process.env.API_BASE_URL || 'https://api.quiz2build.com'}/health/ready`,
      type: 1,
      interval: 30,
      alert_contacts: process.env.UPTIMEROBOT_ALERT_CONTACTS || '',
    },
    {
      friendly_name: 'Quiz2Build Web - Home',
      url: process.env.WEB_BASE_URL || 'https://quiz2build.com',
      type: 1,
      interval: 60,
      alert_contacts: process.env.UPTIMEROBOT_ALERT_CONTACTS || '',
    },
    {
      friendly_name: 'Quiz2Build Web - Login',
      url: `${process.env.WEB_BASE_URL || 'https://quiz2build.com'}/login`,
      type: 1,
      interval: 60,
      alert_contacts: process.env.UPTIMEROBOT_ALERT_CONTACTS || '',
    },
  ],

  // Status page configuration
  statusPage: {
    friendly_name: 'Quiz2Build Status',
    custom_domain: 'status.quiz2build.com',
    monitors: 'all', // Include all monitors
  },
};

// =============================================================================
// Alert Configuration
// =============================================================================

export const AlertConfig = {
  // Alert channels
  channels: {
    email: {
      enabled: true,
      recipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(','),
    },
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      channel: '#alerts-production',
    },
    teams: {
      enabled: !!process.env.TEAMS_WEBHOOK_URL,
      webhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
    },
    pagerDuty: {
      enabled: !!process.env.PAGERDUTY_SERVICE_KEY,
      serviceKey: process.env.PAGERDUTY_SERVICE_KEY || '',
    },
  },

  // Alert thresholds
  thresholds: {
    // Consecutive failures before alerting
    consecutiveFailures: 2,

    // Response time thresholds (ms)
    responseTimeWarning: 1000,
    responseTimeCritical: 3000,

    // Recovery notification
    notifyOnRecovery: true,
  },

  // Escalation policy
  escalation: {
    levels: [
      {
        level: 1,
        delay: 0, // Immediate
        channels: ['email', 'slack'],
      },
      {
        level: 2,
        delay: 15, // 15 minutes
        channels: ['email', 'slack', 'teams'],
      },
      {
        level: 3,
        delay: 30, // 30 minutes
        channels: ['email', 'slack', 'teams', 'pagerDuty'],
      },
    ],
  },
};

// =============================================================================
// Incident Response Configuration
// =============================================================================

export const IncidentConfig = {
  // Severity levels
  severityLevels: {
    P1: {
      name: 'Critical',
      description: 'Complete service outage affecting all users',
      responseTime: 15, // minutes
      escalationDelay: 15,
      notifyChannels: ['email', 'slack', 'teams', 'pagerDuty'],
    },
    P2: {
      name: 'Major',
      description: 'Significant functionality impaired for many users',
      responseTime: 30,
      escalationDelay: 30,
      notifyChannels: ['email', 'slack', 'teams'],
    },
    P3: {
      name: 'Minor',
      description: 'Limited functionality impact or workaround available',
      responseTime: 120,
      escalationDelay: 60,
      notifyChannels: ['email', 'slack'],
    },
    P4: {
      name: 'Low',
      description: 'Cosmetic issues or minor bugs',
      responseTime: 480,
      escalationDelay: 240,
      notifyChannels: ['email'],
    },
  },

  // Auto-incident creation rules
  autoIncidentRules: [
    {
      condition: 'health_check_failed',
      consecutiveFailures: 3,
      severity: 'P2',
    },
    {
      condition: 'all_health_checks_failed',
      consecutiveFailures: 1,
      severity: 'P1',
    },
    {
      condition: 'response_time_exceeded',
      threshold: 5000,
      consecutiveOccurrences: 5,
      severity: 'P3',
    },
  ],
};

// =============================================================================
// Status Page Messages
// =============================================================================

export const StatusMessages = {
  operational: 'All Systems Operational',
  degraded: 'Degraded Performance',
  partialOutage: 'Partial System Outage',
  majorOutage: 'Major System Outage',
  maintenance: 'Scheduled Maintenance',
};

// =============================================================================
// Monitoring Metrics to Track
// =============================================================================

export const MonitoringMetrics = {
  // Uptime metrics
  uptime: {
    hourly: true,
    daily: true,
    weekly: true,
    monthly: true,
  },

  // Response time metrics
  responseTime: {
    average: true,
    p50: true,
    p95: true,
    p99: true,
    max: true,
  },

  // Availability metrics
  availability: {
    successRate: true,
    failureRate: true,
    meanTimeBetweenFailures: true,
    meanTimeToRecovery: true,
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate SLA percentage from downtime minutes
 */
export function calculateSLA(downtimeMinutes: number, periodDays: number = 30): number {
  const totalMinutes = periodDays * 24 * 60;
  const uptimeMinutes = totalMinutes - downtimeMinutes;
  return (uptimeMinutes / totalMinutes) * 100;
}

/**
 * Check if current time is within maintenance window
 */
export function isMaintenanceWindow(): boolean {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const hour = now.getUTCHours();

  return SLAConfig.maintenanceWindows.some(
    (window) => window.day === dayName && hour >= window.startHour && hour < window.endHour,
  );
}

/**
 * Get severity level for response time
 */
export function getResponseTimeSeverity(responseTimeMs: number): 'ok' | 'warning' | 'critical' {
  if (responseTimeMs < AlertConfig.thresholds.responseTimeWarning) {
    return 'ok';
  }
  if (responseTimeMs < AlertConfig.thresholds.responseTimeCritical) {
    return 'warning';
  }
  return 'critical';
}

/**
 * Get appropriate alert channels for severity
 */
export function getAlertChannels(severity: keyof typeof IncidentConfig.severityLevels): string[] {
  return IncidentConfig.severityLevels[severity].notifyChannels;
}

/**
 * Calculate allowed downtime per month for SLA target
 */
export function getAllowedDowntimeMinutes(slaPercentage: number = SLAConfig.uptimeTarget): number {
  const minutesPerMonth = 30 * 24 * 60; // Assuming 30-day month
  return minutesPerMonth * (1 - slaPercentage / 100);
}

// Export summary for documentation
export const UptimeMonitoringSummary = {
  slaTarget: `${SLAConfig.uptimeTarget}%`,
  allowedDowntimePerMonth: `${getAllowedDowntimeMinutes().toFixed(1)} minutes`,
  healthCheckIntervals: {
    liveness: `${HealthEndpoints.api.live.interval}s`,
    readiness: `${HealthEndpoints.api.ready.interval}s`,
    full: `${HealthEndpoints.api.full.interval}s`,
  },
  alertEscalationLevels: AlertConfig.escalation.levels.length,
  severityLevels: Object.keys(IncidentConfig.severityLevels).length,
};
