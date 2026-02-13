/**
 * Incident Response Configuration
 * Severity levels, escalation procedures, and response runbooks
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface IncidentSeverity {
  level: SeverityLevel;
  name: string;
  description: string;
  responseTimeMinutes: number;
  resolutionTargetMinutes: number;
  escalationDelayMinutes: number;
  oncallRequired: boolean;
  examples: string[];
  impactMetrics: ImpactMetrics;
}

export type SeverityLevel = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';

export interface ImpactMetrics {
  userImpact: 'critical' | 'major' | 'minor' | 'minimal';
  revenueImpact: 'high' | 'medium' | 'low' | 'none';
  dataRisk: 'breach' | 'potential' | 'none';
  reputationRisk: 'high' | 'medium' | 'low' | 'none';
}

export interface EscalationPath {
  level: number;
  roles: string[];
  notificationChannels: string[];
  timeoutMinutes: number;
  autoEscalate: boolean;
}

export interface IncidentRunbook {
  id: string;
  name: string;
  description: string;
  applicableSeverities: SeverityLevel[];
  triggerConditions: TriggerCondition[];
  steps: RunbookStep[];
  communicationTemplates: CommunicationTemplate[];
  postIncidentActions: string[];
}

export interface TriggerCondition {
  type: TriggerType;
  metric?: string;
  threshold?: number;
  comparison?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  duration?: number;
  condition?: string;
}

export type TriggerType =
  | 'alert'
  | 'metric_threshold'
  | 'error_rate'
  | 'availability'
  | 'security_event'
  | 'manual_report'
  | 'customer_complaint';

export interface RunbookStep {
  order: number;
  action: string;
  description: string;
  responsible: string;
  timeLimit: number;
  verification?: string;
  rollbackStep?: number;
  automatable: boolean;
  command?: string;
}

export interface CommunicationTemplate {
  type: 'initial' | 'update' | 'resolution' | 'postmortem';
  channel: 'slack' | 'email' | 'status_page' | 'teams' | 'pagerduty';
  template: string;
}

export interface IncidentResponseConfig {
  severityDefinitions: IncidentSeverity[];
  escalationPaths: Record<SeverityLevel, EscalationPath[]>;
  runbooks: IncidentRunbook[];
  oncallSchedule: OncallSchedule;
  communicationConfig: CommunicationConfig;
}

export interface OncallSchedule {
  primaryRotation: OncallRotation;
  secondaryRotation: OncallRotation;
  escalationManagers: string[];
  overrides: OncallOverride[];
}

export interface OncallRotation {
  name: string;
  members: string[];
  rotationIntervalDays: number;
  handoffTime: string; // HH:mm format
  timezone: string;
}

export interface OncallOverride {
  date: string;
  originalPerson: string;
  replacementPerson: string;
  reason: string;
}

export interface CommunicationConfig {
  incidentChannel: string;
  statusPageUrl: string;
  emailDistributionList: string;
  pagerdutyServiceKey: string;
  slackWebhook: string;
  teamsWebhook: string;
}

// ============================================================================
// Severity Definitions
// ============================================================================

/**
 * Get severity level definitions
 */
export function getSeverityDefinitions(): IncidentSeverity[] {
  return [
    // SEV1: Critical - Complete service outage
    {
      level: 'SEV1',
      name: 'Critical',
      description: 'Complete service outage or critical security breach affecting all users',
      responseTimeMinutes: 15,
      resolutionTargetMinutes: 60,
      escalationDelayMinutes: 15,
      oncallRequired: true,
      examples: [
        'Complete production outage',
        'Data breach with PII exposure',
        'Critical security vulnerability actively exploited',
        'Payment processing completely down',
        'Database corruption with data loss',
        'Authentication system failure (no user can login)',
      ],
      impactMetrics: {
        userImpact: 'critical',
        revenueImpact: 'high',
        dataRisk: 'breach',
        reputationRisk: 'high',
      },
    },

    // SEV2: High - Major functionality degraded
    {
      level: 'SEV2',
      name: 'High',
      description: 'Major functionality degraded affecting significant portion of users',
      responseTimeMinutes: 30,
      resolutionTargetMinutes: 240,
      escalationDelayMinutes: 30,
      oncallRequired: true,
      examples: [
        'Questionnaire submissions failing for 50%+ users',
        'Significant performance degradation (>5x latency)',
        'Document generation completely broken',
        'Email notifications not sending',
        'API error rate exceeding 10%',
        'Single region outage in multi-region setup',
      ],
      impactMetrics: {
        userImpact: 'major',
        revenueImpact: 'medium',
        dataRisk: 'potential',
        reputationRisk: 'medium',
      },
    },

    // SEV3: Medium - Minor functionality impaired
    {
      level: 'SEV3',
      name: 'Medium',
      description: 'Minor functionality impaired with workaround available',
      responseTimeMinutes: 120,
      resolutionTargetMinutes: 480,
      escalationDelayMinutes: 60,
      oncallRequired: false,
      examples: [
        'Single feature broken (e.g., heatmap export)',
        'Slow performance for specific operations',
        'Non-critical background jobs failing',
        'Third-party integration degraded',
        'UI display issues affecting usability',
        'File upload size limit being hit unexpectedly',
      ],
      impactMetrics: {
        userImpact: 'minor',
        revenueImpact: 'low',
        dataRisk: 'none',
        reputationRisk: 'low',
      },
    },

    // SEV4: Low - Cosmetic or minor issues
    {
      level: 'SEV4',
      name: 'Low',
      description: 'Cosmetic issues or minor bugs with no functional impact',
      responseTimeMinutes: 480,
      resolutionTargetMinutes: 2880, // 2 days
      escalationDelayMinutes: 240,
      oncallRequired: false,
      examples: [
        'Typo in UI text',
        'Minor styling inconsistency',
        'Logging verbosity issues',
        'Documentation outdated',
        'Non-critical deprecation warnings',
        'Test flakiness in CI',
      ],
      impactMetrics: {
        userImpact: 'minimal',
        revenueImpact: 'none',
        dataRisk: 'none',
        reputationRisk: 'none',
      },
    },
  ];
}

// ============================================================================
// Escalation Paths
// ============================================================================

/**
 * Get escalation paths for each severity level
 */
export function getEscalationPaths(): Record<SeverityLevel, EscalationPath[]> {
  return {
    SEV1: [
      {
        level: 1,
        roles: ['oncall-primary', 'oncall-secondary'],
        notificationChannels: ['pagerduty', 'phone', 'sms'],
        timeoutMinutes: 5,
        autoEscalate: true,
      },
      {
        level: 2,
        roles: ['engineering-lead', 'sre-lead'],
        notificationChannels: ['pagerduty', 'phone', 'slack'],
        timeoutMinutes: 10,
        autoEscalate: true,
      },
      {
        level: 3,
        roles: ['vp-engineering', 'cto'],
        notificationChannels: ['phone', 'email', 'slack'],
        timeoutMinutes: 15,
        autoEscalate: true,
      },
      {
        level: 4,
        roles: ['ceo', 'executive-team'],
        notificationChannels: ['phone', 'email'],
        timeoutMinutes: 30,
        autoEscalate: false,
      },
    ],

    SEV2: [
      {
        level: 1,
        roles: ['oncall-primary'],
        notificationChannels: ['pagerduty', 'slack'],
        timeoutMinutes: 15,
        autoEscalate: true,
      },
      {
        level: 2,
        roles: ['oncall-secondary', 'engineering-lead'],
        notificationChannels: ['pagerduty', 'slack', 'email'],
        timeoutMinutes: 30,
        autoEscalate: true,
      },
      {
        level: 3,
        roles: ['sre-lead', 'vp-engineering'],
        notificationChannels: ['slack', 'email', 'phone'],
        timeoutMinutes: 60,
        autoEscalate: false,
      },
    ],

    SEV3: [
      {
        level: 1,
        roles: ['engineering-team'],
        notificationChannels: ['slack', 'email'],
        timeoutMinutes: 60,
        autoEscalate: true,
      },
      {
        level: 2,
        roles: ['engineering-lead'],
        notificationChannels: ['slack', 'email'],
        timeoutMinutes: 120,
        autoEscalate: false,
      },
    ],

    SEV4: [
      {
        level: 1,
        roles: ['engineering-team'],
        notificationChannels: ['slack'],
        timeoutMinutes: 480,
        autoEscalate: false,
      },
    ],
  };
}

// ============================================================================
// Incident Runbooks
// ============================================================================

/**
 * Get incident response runbooks
 */
export function getIncidentRunbooks(): IncidentRunbook[] {
  return [
    // Runbook 1: Production Outage
    {
      id: 'RB001',
      name: 'Production Outage Response',
      description: 'Response procedure for complete production service outage',
      applicableSeverities: ['SEV1'],
      triggerConditions: [
        { type: 'availability', threshold: 0, comparison: 'eq', duration: 60 },
        { type: 'alert', condition: 'health_check_failed' },
      ],
      steps: [
        {
          order: 1,
          action: 'Acknowledge Alert',
          description: 'Acknowledge the incident in PagerDuty and join incident channel',
          responsible: 'oncall-primary',
          timeLimit: 5,
          automatable: false,
        },
        {
          order: 2,
          action: 'Initial Assessment',
          description: 'Check service health endpoints and identify affected components',
          responsible: 'oncall-primary',
          timeLimit: 5,
          verification: 'Document affected services in incident channel',
          automatable: true,
          command: 'curl -s https://api.quiz2biz.com/api/v1/health | jq .',
        },
        {
          order: 3,
          action: 'Check Recent Changes',
          description: 'Review deployments, config changes, and infrastructure changes in last 24h',
          responsible: 'oncall-primary',
          timeLimit: 5,
          automatable: true,
          command:
            'az containerapp revision list --name ca-quiz2biz-api-prod --resource-group rg-quiz2biz-prod',
        },
        {
          order: 4,
          action: 'Update Status Page',
          description: 'Post initial status update indicating service degradation',
          responsible: 'oncall-primary',
          timeLimit: 3,
          automatable: true,
        },
        {
          order: 5,
          action: 'Attempt Quick Recovery',
          description: 'If recent deployment caused issue, rollback to previous revision',
          responsible: 'oncall-primary',
          timeLimit: 10,
          rollbackStep: 3,
          automatable: true,
          command:
            'az containerapp ingress traffic set --name ca-quiz2biz-api-prod --resource-group rg-quiz2biz-prod --revision-weight stable=100',
        },
        {
          order: 6,
          action: 'Engage Additional Resources',
          description: 'If not resolved, engage secondary oncall and relevant SMEs',
          responsible: 'oncall-primary',
          timeLimit: 5,
          automatable: false,
        },
        {
          order: 7,
          action: 'Deep Diagnosis',
          description: 'Analyze logs, metrics, and traces to identify root cause',
          responsible: 'incident-team',
          timeLimit: 30,
          automatable: false,
        },
        {
          order: 8,
          action: 'Implement Fix',
          description: 'Apply fix for identified root cause',
          responsible: 'incident-team',
          timeLimit: 30,
          verification: 'Verify service health endpoints return 200',
          automatable: false,
        },
        {
          order: 9,
          action: 'Verify Recovery',
          description: 'Confirm all health checks pass and service is operational',
          responsible: 'oncall-primary',
          timeLimit: 10,
          automatable: true,
        },
        {
          order: 10,
          action: 'Update Status Page - Resolved',
          description: 'Post resolution update to status page',
          responsible: 'oncall-primary',
          timeLimit: 5,
          automatable: true,
        },
      ],
      communicationTemplates: [
        {
          type: 'initial',
          channel: 'status_page',
          template: `**Investigating Issue**
We are currently investigating reports of service unavailability. 
Our team has been notified and is actively working to resolve the issue.
We will provide updates as more information becomes available.

Last updated: {{timestamp}}`,
        },
        {
          type: 'update',
          channel: 'status_page',
          template: `**Update**
Our team has identified the cause of the outage and is implementing a fix.
Affected services: {{affected_services}}
Estimated time to resolution: {{eta}}

Last updated: {{timestamp}}`,
        },
        {
          type: 'resolution',
          channel: 'status_page',
          template: `**Resolved**
The service has been restored and is now operating normally.
Root cause: {{root_cause}}
Duration: {{duration}}

We apologize for any inconvenience. A detailed postmortem will be published within 48 hours.

Last updated: {{timestamp}}`,
        },
      ],
      postIncidentActions: [
        'Create postmortem document within 24 hours',
        'Schedule postmortem review meeting within 48 hours',
        'Update runbook if new learnings discovered',
        'Create follow-up tickets for preventive measures',
        'Notify affected customers via email',
      ],
    },

    // Runbook 2: High Error Rate
    {
      id: 'RB002',
      name: 'High Error Rate Response',
      description: 'Response procedure for elevated API error rates',
      applicableSeverities: ['SEV1', 'SEV2'],
      triggerConditions: [
        { type: 'error_rate', threshold: 5, comparison: 'gt', duration: 300 },
        { type: 'metric_threshold', metric: 'http_5xx_rate', threshold: 1, comparison: 'gt' },
      ],
      steps: [
        {
          order: 1,
          action: 'Acknowledge and Assess',
          description: 'Acknowledge alert and check error rate metrics',
          responsible: 'oncall-primary',
          timeLimit: 5,
          automatable: true,
          command:
            'az monitor metrics list --resource /subscriptions/.../containerApps/ca-quiz2biz-api-prod --metric Requests --filter "StatusCodeClass eq \'5xx\'"',
        },
        {
          order: 2,
          action: 'Identify Error Pattern',
          description: 'Check Application Insights for error details and stack traces',
          responsible: 'oncall-primary',
          timeLimit: 10,
          automatable: false,
        },
        {
          order: 3,
          action: 'Check Dependencies',
          description: 'Verify database, Redis, and external services are healthy',
          responsible: 'oncall-primary',
          timeLimit: 10,
          automatable: true,
        },
        {
          order: 4,
          action: 'Determine Scope',
          description: 'Identify affected endpoints and user impact',
          responsible: 'oncall-primary',
          timeLimit: 5,
          automatable: false,
        },
        {
          order: 5,
          action: 'Apply Mitigation',
          description: 'If caused by specific endpoint, consider feature flag disable or rollback',
          responsible: 'oncall-primary',
          timeLimit: 15,
          automatable: false,
        },
        {
          order: 6,
          action: 'Monitor Recovery',
          description: 'Watch error rate metrics for improvement',
          responsible: 'oncall-primary',
          timeLimit: 15,
          verification: 'Error rate below 1%',
          automatable: true,
        },
      ],
      communicationTemplates: [
        {
          type: 'initial',
          channel: 'slack',
          template: `🚨 **High Error Rate Alert**
Error Rate: {{error_rate}}%
Affected Endpoints: {{endpoints}}
Time Started: {{start_time}}
Incident Commander: {{oncall_primary}}

Investigation in progress...`,
        },
      ],
      postIncidentActions: [
        'Document error patterns in knowledge base',
        'Add additional monitoring for affected endpoints',
        'Review error handling in affected code paths',
      ],
    },

    // Runbook 3: Security Incident
    {
      id: 'RB003',
      name: 'Security Incident Response',
      description: 'Response procedure for security incidents and breaches',
      applicableSeverities: ['SEV1', 'SEV2'],
      triggerConditions: [
        { type: 'security_event', condition: 'suspicious_activity_detected' },
        { type: 'alert', condition: 'unauthorized_access_attempt' },
        { type: 'manual_report', condition: 'security_vulnerability_reported' },
      ],
      steps: [
        {
          order: 1,
          action: 'Initial Triage',
          description: 'Assess scope and severity of security incident',
          responsible: 'security-oncall',
          timeLimit: 15,
          automatable: false,
        },
        {
          order: 2,
          action: 'Contain Threat',
          description: 'Isolate affected systems, revoke compromised credentials',
          responsible: 'security-oncall',
          timeLimit: 30,
          automatable: false,
        },
        {
          order: 3,
          action: 'Preserve Evidence',
          description: 'Capture logs, snapshots, and forensic data before any changes',
          responsible: 'security-oncall',
          timeLimit: 30,
          automatable: true,
        },
        {
          order: 4,
          action: 'Notify Legal & Compliance',
          description: 'Alert legal team for potential breach notification requirements',
          responsible: 'security-lead',
          timeLimit: 60,
          automatable: false,
        },
        {
          order: 5,
          action: 'Investigate Root Cause',
          description: 'Perform forensic analysis to understand attack vector',
          responsible: 'security-team',
          timeLimit: 240,
          automatable: false,
        },
        {
          order: 6,
          action: 'Remediate Vulnerability',
          description: 'Fix the security vulnerability that was exploited',
          responsible: 'engineering-team',
          timeLimit: 240,
          automatable: false,
        },
        {
          order: 7,
          action: 'Verify Security',
          description: 'Conduct security scan to verify remediation',
          responsible: 'security-oncall',
          timeLimit: 60,
          verification: 'No vulnerabilities detected in scan',
          automatable: true,
        },
        {
          order: 8,
          action: 'Document & Report',
          description: 'Create detailed incident report for compliance',
          responsible: 'security-lead',
          timeLimit: 1440, // 24 hours
          automatable: false,
        },
      ],
      communicationTemplates: [
        {
          type: 'initial',
          channel: 'email',
          template: `CONFIDENTIAL - Security Incident Notification

A security incident has been detected and is under investigation.
Incident ID: {{incident_id}}
Time Detected: {{detection_time}}
Initial Assessment: {{assessment}}

Please do not discuss this incident outside of secure channels.
Further updates will be provided as the investigation progresses.`,
        },
      ],
      postIncidentActions: [
        'Complete security incident report within 72 hours',
        'Notify affected users if data was exposed (per legal guidance)',
        'Update security policies based on learnings',
        'Conduct security training if human error was involved',
        'Schedule penetration test to verify remediation',
      ],
    },

    // Runbook 4: Database Issues
    {
      id: 'RB004',
      name: 'Database Performance/Availability',
      description: 'Response procedure for database performance issues or outages',
      applicableSeverities: ['SEV1', 'SEV2', 'SEV3'],
      triggerConditions: [
        {
          type: 'metric_threshold',
          metric: 'db_connection_pool_exhausted',
          threshold: 95,
          comparison: 'gt',
        },
        {
          type: 'metric_threshold',
          metric: 'db_query_latency_p99',
          threshold: 5000,
          comparison: 'gt',
        },
        { type: 'alert', condition: 'database_unreachable' },
      ],
      steps: [
        {
          order: 1,
          action: 'Check Database Health',
          description: 'Verify database server status and connectivity',
          responsible: 'oncall-primary',
          timeLimit: 5,
          automatable: true,
          command:
            'az postgres flexible-server show --resource-group rg-quiz2biz-prod --name psql-quiz2biz-prod',
        },
        {
          order: 2,
          action: 'Check Active Connections',
          description: 'Identify connection count and any long-running queries',
          responsible: 'oncall-primary',
          timeLimit: 10,
          automatable: true,
        },
        {
          order: 3,
          action: 'Kill Blocking Queries',
          description: 'If long-running queries are blocking, terminate them',
          responsible: 'oncall-primary',
          timeLimit: 10,
          automatable: false,
        },
        {
          order: 4,
          action: 'Scale Resources',
          description: 'If under heavy load, scale database compute resources',
          responsible: 'oncall-primary',
          timeLimit: 15,
          automatable: true,
        },
        {
          order: 5,
          action: 'Failover if Needed',
          description: 'If primary is unrecoverable, initiate failover to replica',
          responsible: 'oncall-primary',
          timeLimit: 15,
          automatable: true,
        },
        {
          order: 6,
          action: 'Verify Application Recovery',
          description: 'Confirm application can connect and queries succeed',
          responsible: 'oncall-primary',
          timeLimit: 10,
          verification: 'Health check passes',
          automatable: true,
        },
      ],
      communicationTemplates: [],
      postIncidentActions: [
        'Review query patterns that caused issues',
        'Add query performance monitoring',
        'Consider adding read replicas for read-heavy workloads',
        'Review connection pool configuration',
      ],
    },
  ];
}

// ============================================================================
// Oncall Configuration
// ============================================================================

/**
 * Get oncall schedule configuration
 */
export function getOncallSchedule(): OncallSchedule {
  return {
    primaryRotation: {
      name: 'Primary Oncall',
      members: [
        'engineer1@quiz2biz.com',
        'engineer2@quiz2biz.com',
        'engineer3@quiz2biz.com',
        'engineer4@quiz2biz.com',
      ],
      rotationIntervalDays: 7,
      handoffTime: '09:00',
      timezone: 'UTC',
    },
    secondaryRotation: {
      name: 'Secondary Oncall',
      members: ['sre1@quiz2biz.com', 'sre2@quiz2biz.com'],
      rotationIntervalDays: 14,
      handoffTime: '09:00',
      timezone: 'UTC',
    },
    escalationManagers: ['engineering-lead@quiz2biz.com', 'cto@quiz2biz.com'],
    overrides: [],
  };
}

// ============================================================================
// Communication Configuration
// ============================================================================

/**
 * Get communication configuration
 */
export function getCommunicationConfig(): CommunicationConfig {
  return {
    incidentChannel: '#incidents',
    statusPageUrl: process.env.STATUS_PAGE_URL || 'https://status.quiz2biz.com',
    emailDistributionList: 'incidents@quiz2biz.com',
    pagerdutyServiceKey: process.env.PAGERDUTY_SERVICE_KEY || '',
    slackWebhook: process.env.SLACK_INCIDENT_WEBHOOK || '',
    teamsWebhook: process.env.TEAMS_INCIDENT_WEBHOOK || '',
  };
}

// ============================================================================
// Full Configuration
// ============================================================================

/**
 * Get complete incident response configuration
 */
export function getIncidentResponseConfig(): IncidentResponseConfig {
  return {
    severityDefinitions: getSeverityDefinitions(),
    escalationPaths: getEscalationPaths(),
    runbooks: getIncidentRunbooks(),
    oncallSchedule: getOncallSchedule(),
    communicationConfig: getCommunicationConfig(),
  };
}

// ============================================================================
// Incident Manager Class
// ============================================================================

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  timeline: IncidentTimelineEntry[];
  affectedServices: string[];
  runbookId?: string;
  postmortemUrl?: string;
}

export type IncidentStatus =
  | 'detected'
  | 'acknowledged'
  | 'investigating'
  | 'identified'
  | 'mitigating'
  | 'resolved'
  | 'postmortem';

export interface IncidentTimelineEntry {
  timestamp: Date;
  type: 'status_change' | 'action' | 'communication' | 'escalation' | 'note';
  message: string;
  author: string;
}

/**
 * Incident Manager
 * Manages incident lifecycle and response
 */
export class IncidentManager {
  private config: IncidentResponseConfig;
  private activeIncidents: Map<string, Incident> = new Map();

  constructor(config?: IncidentResponseConfig) {
    this.config = config || getIncidentResponseConfig();
  }

  /**
   * Create a new incident
   */
  createIncident(
    title: string,
    description: string,
    severity: SeverityLevel,
    affectedServices: string[] = [],
  ): Incident {
    const incident: Incident = {
      id: `INC-${Date.now()}`,
      title,
      description,
      severity,
      status: 'detected',
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [
        {
          timestamp: new Date(),
          type: 'status_change',
          message: `Incident created with severity ${severity}`,
          author: 'system',
        },
      ],
      affectedServices,
    };

    this.activeIncidents.set(incident.id, incident);

    // Trigger notifications based on severity
    this.triggerEscalation(incident, 1);

    console.log(`[Incident] Created incident ${incident.id}: ${title}`);
    return incident;
  }

  /**
   * Acknowledge an incident
   */
  acknowledgeIncident(incidentId: string, acknowledgedBy: string): void {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.status = 'acknowledged';
    incident.assignee = acknowledgedBy;
    incident.updatedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      type: 'status_change',
      message: `Incident acknowledged`,
      author: acknowledgedBy,
    });

    console.log(`[Incident] ${incidentId} acknowledged by ${acknowledgedBy}`);
  }

  /**
   * Update incident status
   */
  updateStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    updatedBy: string,
    notes?: string,
  ): void {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const oldStatus = incident.status;
    incident.status = newStatus;
    incident.updatedAt = new Date();

    if (newStatus === 'resolved') {
      incident.resolvedAt = new Date();
    }

    incident.timeline.push({
      timestamp: new Date(),
      type: 'status_change',
      message: `Status changed from ${oldStatus} to ${newStatus}${notes ? `: ${notes}` : ''}`,
      author: updatedBy,
    });

    console.log(`[Incident] ${incidentId} status: ${oldStatus} → ${newStatus}`);
  }

  /**
   * Add note to incident timeline
   */
  addNote(incidentId: string, note: string, author: string): void {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.timeline.push({
      timestamp: new Date(),
      type: 'note',
      message: note,
      author,
    });
    incident.updatedAt = new Date();
  }

  /**
   * Trigger escalation for an incident
   */
  triggerEscalation(incident: Incident, level: number): void {
    const escalationPaths = this.config.escalationPaths[incident.severity];
    const path = escalationPaths.find((p) => p.level === level);

    if (!path) {
      console.log(`[Incident] No escalation path for level ${level}`);
      return;
    }

    console.log(`[Incident] ${incident.id} escalating to level ${level}:`, path.roles);

    incident.timeline.push({
      timestamp: new Date(),
      type: 'escalation',
      message: `Escalated to level ${level}: ${path.roles.join(', ')}`,
      author: 'system',
    });

    // In production, send actual notifications via configured channels
    for (const channel of path.notificationChannels) {
      console.log(`[Incident] Notifying via ${channel}`);
    }

    // Set up auto-escalation timer if configured
    if (path.autoEscalate) {
      const nextLevel = level + 1;
      if (escalationPaths.find((p) => p.level === nextLevel)) {
        setTimeout(
          () => {
            const currentIncident = this.activeIncidents.get(incident.id);
            if (currentIncident && currentIncident.status !== 'resolved') {
              this.triggerEscalation(currentIncident, nextLevel);
            }
          },
          path.timeoutMinutes * 60 * 1000,
        );
      }
    }
  }

  /**
   * Get applicable runbook for an incident
   */
  getApplicableRunbook(incident: Incident): IncidentRunbook | undefined {
    return this.config.runbooks.find(
      (rb) =>
        rb.applicableSeverities.includes(incident.severity) &&
        rb.triggerConditions.some((tc) =>
          incident.affectedServices.some((s) => s.includes(tc.condition || '')),
        ),
    );
  }

  /**
   * Get severity definition
   */
  getSeverityInfo(severity: SeverityLevel): IncidentSeverity | undefined {
    return this.config.severityDefinitions.find((s) => s.level === severity);
  }

  /**
   * Get all active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.activeIncidents.values()).filter(
      (i) => i.status !== 'resolved' && i.status !== 'postmortem',
    );
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): Incident | undefined {
    return this.activeIncidents.get(incidentId);
  }

  /**
   * Calculate incident metrics
   */
  calculateMetrics(incident: Incident): IncidentMetrics {
    const severityInfo = this.getSeverityInfo(incident.severity);
    const detectedTime = incident.createdAt.getTime();
    const acknowledgedEntry = incident.timeline.find(
      (e) => e.type === 'status_change' && e.message.includes('acknowledged'),
    );
    const resolvedTime = incident.resolvedAt?.getTime();

    const timeToAcknowledge = acknowledgedEntry
      ? (acknowledgedEntry.timestamp.getTime() - detectedTime) / 60000
      : undefined;

    const timeToResolve = resolvedTime ? (resolvedTime - detectedTime) / 60000 : undefined;

    return {
      timeToAcknowledgeMinutes: timeToAcknowledge,
      timeToResolveMinutes: timeToResolve,
      slaBreached: {
        response: timeToAcknowledge
          ? timeToAcknowledge > (severityInfo?.responseTimeMinutes || 0)
          : false,
        resolution: timeToResolve
          ? timeToResolve > (severityInfo?.resolutionTargetMinutes || 0)
          : false,
      },
      escalationCount: incident.timeline.filter((e) => e.type === 'escalation').length,
    };
  }
}

export interface IncidentMetrics {
  timeToAcknowledgeMinutes?: number;
  timeToResolveMinutes?: number;
  slaBreached: {
    response: boolean;
    resolution: boolean;
  };
  escalationCount: number;
}

// ============================================================================
// Export default configuration
// ============================================================================

export default {
  getSeverityDefinitions,
  getEscalationPaths,
  getIncidentRunbooks,
  getOncallSchedule,
  getCommunicationConfig,
  getIncidentResponseConfig,
  IncidentManager,
};
