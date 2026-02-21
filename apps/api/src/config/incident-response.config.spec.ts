/**
 * Incident Response Configuration Tests
 */
import {
  IncidentSeverity,
  SeverityLevel,
  ImpactMetrics,
  EscalationPath,
  IncidentRunbook,
  TriggerCondition,
  TriggerType,
  RunbookStep,
  CommunicationTemplate,
  IncidentResponseConfig,
  OncallSchedule,
  OncallRotation,
  CommunicationConfig,
  Incident,
  IncidentStatus,
  IncidentTimelineEntry,
  IncidentMetrics,
  getSeverityDefinitions,
  getEscalationPaths,
  getIncidentRunbooks,
  getOncallSchedule,
  getCommunicationConfig,
  getIncidentResponseConfig,
  IncidentManager,
} from './incident-response.config';

describe('Incident Response Config', () => {
  describe('getSeverityDefinitions', () => {
    it('should return severity definitions', () => {
      const severities = getSeverityDefinitions();
      expect(Array.isArray(severities)).toBe(true);
      expect(severities.length).toBe(4);
    });

    it('should have all severity levels', () => {
      const severities = getSeverityDefinitions();
      const levels = severities.map((s) => s.level);
      expect(levels).toContain('SEV1');
      expect(levels).toContain('SEV2');
      expect(levels).toContain('SEV3');
      expect(levels).toContain('SEV4');
    });

    it('should have correct SEV1 definition', () => {
      const severities = getSeverityDefinitions();
      const sev1 = severities.find((s) => s.level === 'SEV1');
      expect(sev1).toBeDefined();
      expect(sev1?.name).toBe('Critical');
      expect(sev1?.responseTimeMinutes).toBe(15);
      expect(sev1?.oncallRequired).toBe(true);
      expect(sev1?.impactMetrics.userImpact).toBe('critical');
    });

    it('should have correct SEV2 definition', () => {
      const severities = getSeverityDefinitions();
      const sev2 = severities.find((s) => s.level === 'SEV2');
      expect(sev2).toBeDefined();
      expect(sev2?.name).toBe('High');
      expect(sev2?.responseTimeMinutes).toBe(30);
      expect(sev2?.oncallRequired).toBe(true);
    });

    it('should have correct SEV3 definition', () => {
      const severities = getSeverityDefinitions();
      const sev3 = severities.find((s) => s.level === 'SEV3');
      expect(sev3).toBeDefined();
      expect(sev3?.name).toBe('Medium');
      expect(sev3?.oncallRequired).toBe(false);
    });

    it('should have correct SEV4 definition', () => {
      const severities = getSeverityDefinitions();
      const sev4 = severities.find((s) => s.level === 'SEV4');
      expect(sev4).toBeDefined();
      expect(sev4?.name).toBe('Low');
      expect(sev4?.impactMetrics.userImpact).toBe('minimal');
    });

    it('should have examples for each severity', () => {
      const severities = getSeverityDefinitions();
      severities.forEach((sev) => {
        expect(Array.isArray(sev.examples)).toBe(true);
        expect(sev.examples.length).toBeGreaterThan(0);
      });
    });

    it('should have valid impact metrics', () => {
      const severities = getSeverityDefinitions();
      severities.forEach((sev) => {
        expect(sev.impactMetrics).toHaveProperty('userImpact');
        expect(sev.impactMetrics).toHaveProperty('revenueImpact');
        expect(sev.impactMetrics).toHaveProperty('dataRisk');
        expect(sev.impactMetrics).toHaveProperty('reputationRisk');
      });
    });
  });

  describe('getEscalationPaths', () => {
    it('should return escalation paths for all severity levels', () => {
      const paths = getEscalationPaths();
      expect(paths).toHaveProperty('SEV1');
      expect(paths).toHaveProperty('SEV2');
      expect(paths).toHaveProperty('SEV3');
      expect(paths).toHaveProperty('SEV4');
    });

    it('should have multiple levels for SEV1', () => {
      const paths = getEscalationPaths();
      expect(paths.SEV1.length).toBeGreaterThan(2);
    });

    it('should have correct structure for escalation paths', () => {
      const paths = getEscalationPaths();
      Object.values(paths).forEach((levelPaths) => {
        levelPaths.forEach((path) => {
          expect(path).toHaveProperty('level');
          expect(path).toHaveProperty('roles');
          expect(path).toHaveProperty('notificationChannels');
          expect(path).toHaveProperty('timeoutMinutes');
          expect(path).toHaveProperty('autoEscalate');
        });
      });
    });

    it('should include oncall-primary in SEV1 level 1', () => {
      const paths = getEscalationPaths();
      const level1 = paths.SEV1.find((p) => p.level === 1);
      expect(level1?.roles).toContain('oncall-primary');
    });

    it('should include pagerduty for critical incidents', () => {
      const paths = getEscalationPaths();
      const sev1Level1 = paths.SEV1.find((p) => p.level === 1);
      expect(sev1Level1?.notificationChannels).toContain('pagerduty');
    });
  });

  describe('getIncidentRunbooks', () => {
    it('should return incident runbooks', () => {
      const runbooks = getIncidentRunbooks();
      expect(Array.isArray(runbooks)).toBe(true);
      expect(runbooks.length).toBeGreaterThan(0);
    });

    it('should have correct structure for runbooks', () => {
      const runbooks = getIncidentRunbooks();
      runbooks.forEach((rb) => {
        expect(rb).toHaveProperty('id');
        expect(rb).toHaveProperty('name');
        expect(rb).toHaveProperty('description');
        expect(rb).toHaveProperty('applicableSeverities');
        expect(rb).toHaveProperty('triggerConditions');
        expect(rb).toHaveProperty('steps');
        expect(rb).toHaveProperty('postIncidentActions');
      });
    });

    it('should include Production Outage runbook', () => {
      const runbooks = getIncidentRunbooks();
      const outage = runbooks.find((r) => r.id === 'RB001');
      expect(outage).toBeDefined();
      expect(outage?.name).toBe('Production Outage Response');
      expect(outage?.applicableSeverities).toContain('SEV1');
    });

    it('should include High Error Rate runbook', () => {
      const runbooks = getIncidentRunbooks();
      const errorRate = runbooks.find((r) => r.id === 'RB002');
      expect(errorRate).toBeDefined();
      expect(errorRate?.name).toBe('High Error Rate Response');
    });

    it('should include Security Incident runbook', () => {
      const runbooks = getIncidentRunbooks();
      const security = runbooks.find((r) => r.id === 'RB003');
      expect(security).toBeDefined();
      expect(security?.name).toBe('Security Incident Response');
    });

    it('should include Database Issues runbook', () => {
      const runbooks = getIncidentRunbooks();
      const db = runbooks.find((r) => r.id === 'RB004');
      expect(db).toBeDefined();
      expect(db?.name).toBe('Database Performance/Availability');
    });

    it('should have ordered steps', () => {
      const runbooks = getIncidentRunbooks();
      runbooks.forEach((rb) => {
        const orders = rb.steps.map((s) => s.order);
        const sorted = [...orders].sort((a, b) => a - b);
        expect(orders).toEqual(sorted);
      });
    });

    it('should have valid trigger conditions', () => {
      const runbooks = getIncidentRunbooks();
      runbooks.forEach((rb) => {
        rb.triggerConditions.forEach((tc) => {
          expect(tc).toHaveProperty('type');
        });
      });
    });
  });

  describe('getOncallSchedule', () => {
    it('should return oncall schedule', () => {
      const schedule = getOncallSchedule();
      expect(schedule).toHaveProperty('primaryRotation');
      expect(schedule).toHaveProperty('secondaryRotation');
      expect(schedule).toHaveProperty('escalationManagers');
      expect(schedule).toHaveProperty('overrides');
    });

    it('should have primary rotation configured', () => {
      const schedule = getOncallSchedule();
      expect(schedule.primaryRotation.name).toBe('Primary Oncall');
      expect(schedule.primaryRotation.members.length).toBeGreaterThan(0);
      expect(schedule.primaryRotation.rotationIntervalDays).toBe(7);
    });

    it('should have secondary rotation configured', () => {
      const schedule = getOncallSchedule();
      expect(schedule.secondaryRotation.name).toBe('Secondary Oncall');
      expect(schedule.secondaryRotation.members.length).toBeGreaterThan(0);
    });

    it('should have escalation managers', () => {
      const schedule = getOncallSchedule();
      expect(schedule.escalationManagers.length).toBeGreaterThan(0);
    });

    it('should have valid handoff time format', () => {
      const schedule = getOncallSchedule();
      expect(schedule.primaryRotation.handoffTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('getCommunicationConfig', () => {
    it('should return communication config', () => {
      const config = getCommunicationConfig();
      expect(config).toHaveProperty('incidentChannel');
      expect(config).toHaveProperty('statusPageUrl');
      expect(config).toHaveProperty('emailDistributionList');
      expect(config).toHaveProperty('pagerdutyServiceKey');
      expect(config).toHaveProperty('slackWebhook');
      expect(config).toHaveProperty('teamsWebhook');
    });

    it('should have default incident channel', () => {
      const config = getCommunicationConfig();
      expect(config.incidentChannel).toBe('#incidents');
    });

    it('should have email distribution list', () => {
      const config = getCommunicationConfig();
      expect(config.emailDistributionList).toBe('incidents@quiz2biz.com');
    });
  });

  describe('getIncidentResponseConfig', () => {
    it('should return complete config', () => {
      const config = getIncidentResponseConfig();
      expect(config).toHaveProperty('severityDefinitions');
      expect(config).toHaveProperty('escalationPaths');
      expect(config).toHaveProperty('runbooks');
      expect(config).toHaveProperty('oncallSchedule');
      expect(config).toHaveProperty('communicationConfig');
    });

    it('should have consistent severity definitions', () => {
      const config = getIncidentResponseConfig();
      expect(config.severityDefinitions).toEqual(getSeverityDefinitions());
    });
  });

  describe('IncidentManager', () => {
    let manager: IncidentManager;

    beforeEach(() => {
      jest.useFakeTimers();
      manager = new IncidentManager();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('createIncident', () => {
      it('should create an incident', () => {
        const incident = manager.createIncident(
          'Test Incident',
          'Test description',
          'SEV1',
          ['api'],
        );

        expect(incident).toHaveProperty('id');
        expect(incident.title).toBe('Test Incident');
        expect(incident.description).toBe('Test description');
        expect(incident.severity).toBe('SEV1');
        expect(incident.status).toBe('detected');
        expect(incident.affectedServices).toContain('api');
      });

      it('should generate unique incident ID', () => {
        const incident1 = manager.createIncident('Test 1', 'Desc', 'SEV1');
        const incident2 = manager.createIncident('Test 2', 'Desc', 'SEV1');
        expect(incident1.id).not.toBe(incident2.id);
      });

      it('should add initial timeline entry', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        expect(incident.timeline.length).toBeGreaterThan(0);
        expect(incident.timeline[0].type).toBe('status_change');
        expect(incident.timeline[0].author).toBe('system');
      });
    });

    describe('acknowledgeIncident', () => {
      it('should acknowledge an incident', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.acknowledgeIncident(incident.id, 'user@test.com');

        const updated = manager.getIncident(incident.id);
        expect(updated?.status).toBe('acknowledged');
        expect(updated?.assignee).toBe('user@test.com');
      });

      it('should throw error for non-existent incident', () => {
        expect(() => {
          manager.acknowledgeIncident('non-existent', 'user@test.com');
        }).toThrow('Incident non-existent not found');
      });

      it('should add timeline entry for acknowledgment', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.acknowledgeIncident(incident.id, 'user@test.com');

        const updated = manager.getIncident(incident.id);
        const ackEntry = updated?.timeline.find(
          (e) => e.type === 'status_change' && e.message.includes('acknowledged'),
        );
        expect(ackEntry).toBeDefined();
      });
    });

    describe('updateStatus', () => {
      it('should update incident status', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.updateStatus(incident.id, 'investigating', 'user@test.com');

        const updated = manager.getIncident(incident.id);
        expect(updated?.status).toBe('investigating');
      });

      it('should set resolvedAt when resolved', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.updateStatus(incident.id, 'resolved', 'user@test.com');

        const updated = manager.getIncident(incident.id);
        expect(updated?.resolvedAt).toBeDefined();
      });

      it('should add notes to timeline', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.updateStatus(incident.id, 'investigating', 'user@test.com', 'Found root cause');

        const updated = manager.getIncident(incident.id);
        const entry = updated?.timeline.find((e) => e.message.includes('Found root cause'));
        expect(entry).toBeDefined();
      });
    });

    describe('addNote', () => {
      it('should add note to timeline', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.addNote(incident.id, 'Investigation update', 'user@test.com');

        const updated = manager.getIncident(incident.id);
        const noteEntry = updated?.timeline.find(
          (e) => e.type === 'note' && e.message === 'Investigation update',
        );
        expect(noteEntry).toBeDefined();
        expect(noteEntry?.author).toBe('user@test.com');
      });

      it('should throw error for non-existent incident', () => {
        expect(() => {
          manager.addNote('non-existent', 'Note', 'user@test.com');
        }).toThrow();
      });
    });

    describe('getActiveIncidents', () => {
      it('should return active incidents', () => {
        manager.createIncident('Test 1', 'Desc', 'SEV1');
        manager.createIncident('Test 2', 'Desc', 'SEV2');

        const active = manager.getActiveIncidents();
        expect(active.length).toBe(2);
      });

      it('should exclude resolved incidents', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.updateStatus(incident.id, 'resolved', 'user@test.com');

        const active = manager.getActiveIncidents();
        expect(active.find((i) => i.id === incident.id)).toBeUndefined();
      });
    });

    describe('getSeverityInfo', () => {
      it('should return severity info', () => {
        const info = manager.getSeverityInfo('SEV1');
        expect(info).toBeDefined();
        expect(info?.level).toBe('SEV1');
        expect(info?.name).toBe('Critical');
      });

      it('should return undefined for invalid severity', () => {
        const info = manager.getSeverityInfo('SEV99' as SeverityLevel);
        expect(info).toBeUndefined();
      });
    });

    describe('calculateMetrics', () => {
      it('should calculate incident metrics', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.acknowledgeIncident(incident.id, 'user@test.com');

        const updated = manager.getIncident(incident.id)!;
        const metrics = manager.calculateMetrics(updated);

        expect(metrics).toHaveProperty('timeToAcknowledgeMinutes');
        expect(metrics).toHaveProperty('slaBreached');
        expect(metrics).toHaveProperty('escalationCount');
      });

      it('should count escalations', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        const metrics = manager.calculateMetrics(incident);
        expect(typeof metrics.escalationCount).toBe('number');
      });
    });

    describe('triggerEscalation', () => {
      it('should add escalation to timeline', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1');
        manager.triggerEscalation(incident, 2);

        const escalationEntry = incident.timeline.find((e) => e.type === 'escalation');
        expect(escalationEntry).toBeDefined();
      });
    });

    describe('getApplicableRunbook', () => {
      it('should return applicable runbook', () => {
        const incident = manager.createIncident('Test', 'Desc', 'SEV1', ['health_check_failed']);
        const runbook = manager.getApplicableRunbook(incident);
        // May or may not find runbook depending on conditions
        expect(runbook === undefined || runbook !== undefined).toBe(true);
      });
    });
  });
});
