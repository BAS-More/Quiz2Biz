/**
 * @fileoverview Tests for uptime-monitoring.config.ts
 */
import {
  SLAConfig,
  HealthEndpoints,
  UptimeRobotConfig,
  AlertConfig,
  IncidentConfig,
  StatusMessages,
  MonitoringMetrics,
  calculateSLA,
  isMaintenanceWindow,
  getResponseTimeSeverity,
  getAlertChannels,
  getAllowedDowntimeMinutes,
  UptimeMonitoringSummary,
} from './uptime-monitoring.config';

describe('SLAConfig', () => {
  it('should have 99.9% uptime target', () => {
    expect(SLAConfig.uptimeTarget).toBe(99.9);
  });

  it('should have response time targets', () => {
    expect(SLAConfig.responseTimeTargets.healthCheck).toBe(500);
    expect(SLAConfig.responseTimeTargets.apiEndpoint).toBe(2000);
    expect(SLAConfig.responseTimeTargets.pageLoad).toBe(3000);
  });

  it('should have maintenance windows', () => {
    expect(SLAConfig.maintenanceWindows.length).toBeGreaterThan(0);
    expect(SLAConfig.maintenanceWindows[0].day).toBe('Sunday');
  });

  it('should have calculation period', () => {
    expect(SLAConfig.calculationPeriod).toBe('monthly');
  });
});

describe('HealthEndpoints', () => {
  describe('api endpoints', () => {
    it('should have live endpoint', () => {
      expect(HealthEndpoints.api.live.path).toBe('/health/live');
      expect(HealthEndpoints.api.live.expectedStatus).toBe(200);
      expect(HealthEndpoints.api.live.timeout).toBe(5000);
    });

    it('should have ready endpoint', () => {
      expect(HealthEndpoints.api.ready.path).toBe('/health/ready');
      expect(HealthEndpoints.api.ready.expectedResponse).toEqual({
        status: 'ok',
        database: 'connected',
        redis: 'connected',
      });
    });

    it('should have full health endpoint', () => {
      expect(HealthEndpoints.api.full.path).toBe('/health');
      expect(HealthEndpoints.api.full.timeout).toBe(15000);
    });
  });

  describe('web endpoints', () => {
    it('should have home page endpoint', () => {
      expect(HealthEndpoints.web.homePage.url).toBe('/');
      expect(HealthEndpoints.web.homePage.method).toBe('GET');
    });

    it('should have login page endpoint', () => {
      expect(HealthEndpoints.web.loginPage.url).toBe('/login');
    });
  });
});

describe('UptimeRobotConfig', () => {
  it('should have monitors configured', () => {
    expect(UptimeRobotConfig.monitors.length).toBeGreaterThan(0);
  });

  it('should have API health monitor', () => {
    const healthMonitor = UptimeRobotConfig.monitors.find((m) =>
      m.friendly_name.includes('Health'),
    );
    expect(healthMonitor).toBeDefined();
    expect(healthMonitor?.type).toBe(1);
  });

  it('should have status page config', () => {
    expect(UptimeRobotConfig.statusPage.friendly_name).toBe('Quiz2Build Status');
    expect(UptimeRobotConfig.statusPage.monitors).toBe('all');
  });
});

describe('AlertConfig', () => {
  it('should have channels configured', () => {
    expect(AlertConfig.channels.email.enabled).toBe(true);
  });

  it('should have thresholds', () => {
    expect(AlertConfig.thresholds.consecutiveFailures).toBe(2);
    expect(AlertConfig.thresholds.responseTimeWarning).toBe(1000);
    expect(AlertConfig.thresholds.responseTimeCritical).toBe(3000);
    expect(AlertConfig.thresholds.notifyOnRecovery).toBe(true);
  });

  it('should have escalation levels', () => {
    expect(AlertConfig.escalation.levels.length).toBe(3);
    expect(AlertConfig.escalation.levels[0].delay).toBe(0);
    expect(AlertConfig.escalation.levels[1].delay).toBe(15);
    expect(AlertConfig.escalation.levels[2].delay).toBe(30);
  });
});

describe('IncidentConfig', () => {
  it('should have severity levels', () => {
    expect(IncidentConfig.severityLevels.P1.name).toBe('Critical');
    expect(IncidentConfig.severityLevels.P2.name).toBe('Major');
    expect(IncidentConfig.severityLevels.P3.name).toBe('Minor');
    expect(IncidentConfig.severityLevels.P4.name).toBe('Low');
  });

  it('should have P1 response time of 15 minutes', () => {
    expect(IncidentConfig.severityLevels.P1.responseTime).toBe(15);
  });

  it('should have auto incident rules', () => {
    expect(IncidentConfig.autoIncidentRules.length).toBeGreaterThan(0);

    const healthCheckRule = IncidentConfig.autoIncidentRules.find(
      (r) => r.condition === 'health_check_failed',
    );
    expect(healthCheckRule).toBeDefined();
    expect(healthCheckRule?.severity).toBe('P2');
  });
});

describe('StatusMessages', () => {
  it('should have all status messages', () => {
    expect(StatusMessages.operational).toBe('All Systems Operational');
    expect(StatusMessages.degraded).toBe('Degraded Performance');
    expect(StatusMessages.partialOutage).toBe('Partial System Outage');
    expect(StatusMessages.majorOutage).toBe('Major System Outage');
    expect(StatusMessages.maintenance).toBe('Scheduled Maintenance');
  });
});

describe('MonitoringMetrics', () => {
  it('should have uptime metrics', () => {
    expect(MonitoringMetrics.uptime.hourly).toBe(true);
    expect(MonitoringMetrics.uptime.daily).toBe(true);
    expect(MonitoringMetrics.uptime.weekly).toBe(true);
    expect(MonitoringMetrics.uptime.monthly).toBe(true);
  });

  it('should have response time metrics', () => {
    expect(MonitoringMetrics.responseTime.average).toBe(true);
    expect(MonitoringMetrics.responseTime.p95).toBe(true);
    expect(MonitoringMetrics.responseTime.p99).toBe(true);
  });

  it('should have availability metrics', () => {
    expect(MonitoringMetrics.availability.successRate).toBe(true);
    expect(MonitoringMetrics.availability.meanTimeBetweenFailures).toBe(true);
    expect(MonitoringMetrics.availability.meanTimeToRecovery).toBe(true);
  });
});

describe('calculateSLA', () => {
  it('should calculate 100% SLA with no downtime', () => {
    const sla = calculateSLA(0, 30);
    expect(sla).toBe(100);
  });

  it('should calculate correct SLA with downtime', () => {
    // 30 days = 43200 minutes
    // 43.2 minutes downtime = 99.9% uptime
    const sla = calculateSLA(43.2, 30);
    expect(sla).toBeCloseTo(99.9, 1);
  });

  it('should calculate SLA with default 30-day period', () => {
    const sla = calculateSLA(432);
    expect(sla).toBeCloseTo(99, 0);
  });

  it('should handle large downtime', () => {
    // Half the month is downtime
    const sla = calculateSLA(21600, 30);
    expect(sla).toBe(50);
  });
});

describe('isMaintenanceWindow', () => {
  const originalDate = global.Date;

  afterEach(() => {
    global.Date = originalDate;
  });

  it('should return true during maintenance window', () => {
    // Sunday 3 AM UTC
    const mockDate = new Date('2025-01-19T03:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as Date);

    expect(isMaintenanceWindow()).toBe(true);
  });

  it('should return false outside maintenance window', () => {
    // Monday 10 AM UTC
    const mockDate = new Date('2025-01-20T10:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as Date);

    expect(isMaintenanceWindow()).toBe(false);
  });
});

describe('getResponseTimeSeverity', () => {
  it('should return ok for response time below warning', () => {
    expect(getResponseTimeSeverity(500)).toBe('ok');
    expect(getResponseTimeSeverity(999)).toBe('ok');
  });

  it('should return warning for response time between warning and critical', () => {
    expect(getResponseTimeSeverity(1000)).toBe('warning');
    expect(getResponseTimeSeverity(2000)).toBe('warning');
    expect(getResponseTimeSeverity(2999)).toBe('warning');
  });

  it('should return critical for response time above critical', () => {
    expect(getResponseTimeSeverity(3000)).toBe('critical');
    expect(getResponseTimeSeverity(5000)).toBe('critical');
  });
});

describe('getAlertChannels', () => {
  it('should return P1 alert channels', () => {
    const channels = getAlertChannels('P1');
    expect(channels).toContain('email');
    expect(channels).toContain('slack');
    expect(channels).toContain('teams');
    expect(channels).toContain('pagerDuty');
  });

  it('should return P2 alert channels', () => {
    const channels = getAlertChannels('P2');
    expect(channels).toContain('email');
    expect(channels).toContain('slack');
    expect(channels).toContain('teams');
    expect(channels).not.toContain('pagerDuty');
  });

  it('should return P4 alert channels', () => {
    const channels = getAlertChannels('P4');
    expect(channels).toContain('email');
    expect(channels.length).toBe(1);
  });
});

describe('getAllowedDowntimeMinutes', () => {
  it('should calculate default allowed downtime for 99.9% SLA', () => {
    const downtime = getAllowedDowntimeMinutes();
    // 30 days * 24 hours * 60 minutes * 0.001 = 43.2 minutes
    expect(downtime).toBeCloseTo(43.2, 1);
  });

  it('should calculate allowed downtime for custom SLA', () => {
    const downtime = getAllowedDowntimeMinutes(99.5);
    // 30 days * 24 hours * 60 minutes * 0.005 = 216 minutes
    expect(downtime).toBeCloseTo(216, 0);
  });

  it('should return 0 for 100% SLA', () => {
    const downtime = getAllowedDowntimeMinutes(100);
    expect(downtime).toBe(0);
  });
});

describe('UptimeMonitoringSummary', () => {
  it('should have slaTarget', () => {
    expect(UptimeMonitoringSummary.slaTarget).toBe('99.9%');
  });

  it('should have allowedDowntimePerMonth', () => {
    expect(UptimeMonitoringSummary.allowedDowntimePerMonth).toContain('minutes');
  });

  it('should have healthCheckIntervals', () => {
    expect(UptimeMonitoringSummary.healthCheckIntervals.liveness).toBe('30s');
    expect(UptimeMonitoringSummary.healthCheckIntervals.readiness).toBe('30s');
    expect(UptimeMonitoringSummary.healthCheckIntervals.full).toBe('60s');
  });

  it('should have correct number of escalation levels', () => {
    expect(UptimeMonitoringSummary.alertEscalationLevels).toBe(3);
  });

  it('should have correct number of severity levels', () => {
    expect(UptimeMonitoringSummary.severityLevels).toBe(4);
  });
});
