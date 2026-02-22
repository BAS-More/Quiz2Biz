/**
 * @fileoverview Tests for alerting-rules.config.ts
 */
import {
  AlertingConfiguration,
  NotificationChannels,
  DefaultEscalationPolicy,
  CriticalEscalationPolicy,
  getAlertsBySeverity,
  getAlertsByCategory,
  getEscalationPolicy,
  formatAlertMessage,
  shouldSendAlert,
  getAlertSummary,
  AlertingSummary,
  Severity,
  AlertState,
  AlertRule,
} from './alerting-rules.config';

describe('AlertingConfiguration', () => {
  describe('globalConfig', () => {
    it('should have valid evaluation interval', () => {
      expect(AlertingConfiguration.globalConfig.evaluationInterval).toBe('30s');
    });

    it('should have valid resolve timeout', () => {
      expect(AlertingConfiguration.globalConfig.resolveTimeout).toBe('5m');
    });

    it('should have group by labels', () => {
      expect(AlertingConfiguration.globalConfig.groupByLabels).toContain('severity');
      expect(AlertingConfiguration.globalConfig.groupByLabels).toContain('service');
    });

    it('should have inhibit rules', () => {
      expect(AlertingConfiguration.globalConfig.inhibitRules.length).toBeGreaterThan(0);
    });
  });

  describe('errorAlerts', () => {
    it('should have HighErrorRate alert', () => {
      const alert = AlertingConfiguration.errorAlerts.find((a) => a.name === 'HighErrorRate');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('critical');
    });

    it('should have Http5xxErrors alert', () => {
      const alert = AlertingConfiguration.errorAlerts.find((a) => a.name === 'Http5xxErrors');
      expect(alert).toBeDefined();
      expect(alert?.threshold).toBe(10);
    });

    it('should have valid channels for critical alerts', () => {
      const criticalAlerts = AlertingConfiguration.errorAlerts.filter(
        (a) => a.severity === 'critical',
      );
      criticalAlerts.forEach((alert) => {
        expect(alert.channels).toContain('pagerduty');
      });
    });
  });

  describe('performanceAlerts', () => {
    it('should have HighResponseTime alert', () => {
      const alert = AlertingConfiguration.performanceAlerts.find(
        (a) => a.name === 'HighResponseTime',
      );
      expect(alert).toBeDefined();
      expect(alert?.metric).toBe('http_response_time_p95_ms');
    });

    it('should have SlowDatabaseQueries alert', () => {
      const alert = AlertingConfiguration.performanceAlerts.find(
        (a) => a.name === 'SlowDatabaseQueries',
      );
      expect(alert).toBeDefined();
      expect(alert?.threshold).toBe(1000);
    });
  });

  describe('securityAlerts', () => {
    it('should have HighAuthFailures alert', () => {
      const alert = AlertingConfiguration.securityAlerts.find((a) => a.name === 'HighAuthFailures');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('critical');
    });

    it('should have RateLimitExceeded alert', () => {
      const alert = AlertingConfiguration.securityAlerts.find((a) => a.name === 'RateLimitExceeded');
      expect(alert).toBeDefined();
    });
  });

  describe('businessAlerts', () => {
    it('should have PaymentFailures alert', () => {
      const alert = AlertingConfiguration.businessAlerts.find((a) => a.name === 'PaymentFailures');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('high');
    });

    it('should have DocumentGenerationFailures alert', () => {
      const alert = AlertingConfiguration.businessAlerts.find(
        (a) => a.name === 'DocumentGenerationFailures',
      );
      expect(alert).toBeDefined();
    });
  });

  describe('resourceAlerts', () => {
    it('should have HighCPUUsage alert', () => {
      const alert = AlertingConfiguration.resourceAlerts.find((a) => a.name === 'HighCPUUsage');
      expect(alert).toBeDefined();
      expect(alert?.threshold).toBe(80);
    });

    it('should have DatabaseConnectionPoolExhaustion alert', () => {
      const alert = AlertingConfiguration.resourceAlerts.find(
        (a) => a.name === 'DatabaseConnectionPoolExhaustion',
      );
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('critical');
    });
  });
});

describe('NotificationChannels', () => {
  it('should have email configuration', () => {
    expect(NotificationChannels.email).toBeDefined();
    expect(NotificationChannels.email.enabled).toBe(true);
  });

  it('should have slack configuration', () => {
    expect(NotificationChannels.slack).toBeDefined();
    expect(NotificationChannels.slack.username).toBe('Quiz2Build Alerts');
  });

  it('should have pagerduty configuration', () => {
    expect(NotificationChannels.pagerduty).toBeDefined();
    expect(NotificationChannels.pagerduty.escalationPolicy).toBe('default');
  });

  it('should have webhook configuration', () => {
    expect(NotificationChannels.webhook).toBeDefined();
    expect(NotificationChannels.webhook.headers['Content-Type']).toBe('application/json');
  });
});

describe('EscalationPolicies', () => {
  describe('DefaultEscalationPolicy', () => {
    it('should have 3 levels', () => {
      expect(DefaultEscalationPolicy.levels.length).toBe(3);
    });

    it('should have level 1 with no delay', () => {
      const level1 = DefaultEscalationPolicy.levels[0];
      expect(level1.delayMinutes).toBe(0);
    });

    it('should have correct repeat interval', () => {
      expect(DefaultEscalationPolicy.repeatAfterMinutes).toBe(60);
    });
  });

  describe('CriticalEscalationPolicy', () => {
    it('should have faster escalation', () => {
      const level2 = CriticalEscalationPolicy.levels[1];
      expect(level2.delayMinutes).toBe(5);
    });

    it('should include sms in level 1', () => {
      expect(CriticalEscalationPolicy.levels[0].channels).toContain('sms');
    });
  });
});

describe('getAlertsBySeverity', () => {
  it('should return critical alerts', () => {
    const alerts = getAlertsBySeverity('critical');
    expect(alerts.length).toBeGreaterThan(0);
    alerts.forEach((alert) => {
      expect(alert.severity).toBe('critical');
    });
  });

  it('should return high severity alerts', () => {
    const alerts = getAlertsBySeverity('high');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should return medium severity alerts', () => {
    const alerts = getAlertsBySeverity('medium');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should return empty for info severity if none exist', () => {
    const alerts = getAlertsBySeverity('info');
    expect(alerts).toEqual([]);
  });
});

describe('getAlertsByCategory', () => {
  it('should return error alerts', () => {
    const alerts = getAlertsByCategory('error');
    expect(alerts).toBe(AlertingConfiguration.errorAlerts);
  });

  it('should return performance alerts', () => {
    const alerts = getAlertsByCategory('performance');
    expect(alerts).toBe(AlertingConfiguration.performanceAlerts);
  });

  it('should return security alerts', () => {
    const alerts = getAlertsByCategory('security');
    expect(alerts).toBe(AlertingConfiguration.securityAlerts);
  });

  it('should return business alerts', () => {
    const alerts = getAlertsByCategory('business');
    expect(alerts).toBe(AlertingConfiguration.businessAlerts);
  });

  it('should return resource alerts', () => {
    const alerts = getAlertsByCategory('resource');
    expect(alerts).toBe(AlertingConfiguration.resourceAlerts);
  });

  it('should return empty array for unknown category', () => {
    const alerts = getAlertsByCategory('unknown');
    expect(alerts).toEqual([]);
  });
});

describe('getEscalationPolicy', () => {
  it('should return CriticalEscalationPolicy for critical severity', () => {
    const policy = getEscalationPolicy('critical');
    expect(policy).toBe(CriticalEscalationPolicy);
  });

  it('should return DefaultEscalationPolicy for high severity', () => {
    const policy = getEscalationPolicy('high');
    expect(policy).toBe(DefaultEscalationPolicy);
  });

  it('should return DefaultEscalationPolicy for medium severity', () => {
    const policy = getEscalationPolicy('medium');
    expect(policy).toBe(DefaultEscalationPolicy);
  });
});

describe('formatAlertMessage', () => {
  const testAlert: AlertRule = {
    name: 'TestAlert',
    description: 'Test alert description',
    metric: 'test_metric',
    condition: 'gt',
    threshold: 100,
    duration: '5m',
    severity: 'critical',
    channels: ['email', 'slack'],
    runbook: 'https://runbook.example.com',
  };

  it('should format firing alert message', () => {
    const message = formatAlertMessage(testAlert, 150, 'firing');
    expect(message).toContain('FIRING');
    expect(message).toContain('TestAlert');
    expect(message).toContain('150');
  });

  it('should format resolved alert message', () => {
    const message = formatAlertMessage(testAlert, 50, 'resolved');
    expect(message).toContain('RESOLVED');
  });

  it('should format pending alert message', () => {
    const message = formatAlertMessage(testAlert, 100, 'pending');
    expect(message).toContain('PENDING');
  });

  it('should include runbook if present', () => {
    const message = formatAlertMessage(testAlert, 150, 'firing');
    expect(message).toContain('runbook.example.com');
  });

  it('should not include runbook if not present', () => {
    const alertWithoutRunbook = { ...testAlert, runbook: undefined };
    const message = formatAlertMessage(alertWithoutRunbook, 150, 'firing');
    expect(message).not.toContain('Runbook');
  });
});

describe('shouldSendAlert', () => {
  const originalDate = global.Date;

  afterEach(() => {
    global.Date = originalDate;
  });

  it('should always send critical alerts', () => {
    expect(shouldSendAlert('critical')).toBe(true);
  });

  it('should always send high severity alerts', () => {
    expect(shouldSendAlert('high')).toBe(true);
  });

  it('should send medium alerts during business hours', () => {
    const mockDate = new Date('2025-01-15T14:00:00');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    expect(shouldSendAlert('medium')).toBe(true);
  });

  it('should not send low alerts during quiet hours', () => {
    const mockDate = new Date('2025-01-15T23:00:00');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    expect(shouldSendAlert('low')).toBe(false);
  });
});

describe('getAlertSummary', () => {
  it('should return summary with all severity levels', () => {
    const summary = getAlertSummary();
    expect(summary).toHaveProperty('critical');
    expect(summary).toHaveProperty('high');
    expect(summary).toHaveProperty('medium');
    expect(summary).toHaveProperty('low');
    expect(summary).toHaveProperty('info');
  });

  it('should have correct count for critical alerts', () => {
    const summary = getAlertSummary();
    expect(summary.critical).toBeGreaterThan(0);
  });
});

describe('AlertingSummary', () => {
  it('should have totalAlerts', () => {
    expect(AlertingSummary.totalAlerts).toBeDefined();
  });

  it('should have categories', () => {
    expect(AlertingSummary.categories).toContain('error');
    expect(AlertingSummary.categories).toContain('performance');
    expect(AlertingSummary.categories).toContain('security');
  });

  it('should have escalationPolicies', () => {
    expect(AlertingSummary.escalationPolicies).toContain('default');
    expect(AlertingSummary.escalationPolicies).toContain('critical');
  });
});
