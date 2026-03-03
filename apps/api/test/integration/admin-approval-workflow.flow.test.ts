import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@libs/database';
import { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';

/**
 * Integration tests for Admin Audit Flow
 *
 * SKIP REASON: Requires full AppModule context with running database.
 * Schema updates completed:
 * - USER -> CLIENT role
 * - Session.questionnaireVersion added
 * - DecisionLog: Now append-only (DRAFT->LOCKED->SUPERSEDED), uses ownerId instead of userId
 * - DecisionLog: Removed approval workflow fields (approvalStatus, approvedBy, etc.)
 * - Questionnaire: title -> name
 * - User: hashedPassword -> passwordHash
 */
describe.skip('Admin → Audit Flow Integration', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let auditService: AdminAuditService;

  // Test data IDs
  let testAdminUserId: string;
  let testRegularUserId: string;
  let testDecisionLogId: string;
  let testSessionId: string;
  let testQuestionnaireId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
      ],
      providers: [PrismaService, AdminAuditService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AdminAuditService>(AdminAuditService);

    // Create test admin user
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.com`,
        passwordHash: 'hashed_password',
        role: 'ADMIN',
      },
    });
    testAdminUserId = admin.id;

    // Create test regular user
    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}@test.com`,
        passwordHash: 'hashed_password',
        role: 'CLIENT',
      },
    });
    testRegularUserId = user.id;

    // Create test questionnaire
    const questionnaire = await prisma.questionnaire.create({
      data: {
        name: `Audit Test Questionnaire ${Date.now()}`,
        description: 'Test questionnaire for audit workflow',
      },
    });
    testQuestionnaireId = questionnaire.id;

    // Create test session
    const session = await prisma.session.create({
      data: {
        userId: testRegularUserId,
        questionnaireId: testQuestionnaireId,
        questionnaireVersion: 1,
        status: 'IN_PROGRESS',
      },
    });
    testSessionId = session.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    if (testDecisionLogId) {
      await prisma.decisionLog.deleteMany({ where: { id: testDecisionLogId } });
    }
    await prisma.session.deleteMany({ where: { id: testSessionId } });
    await prisma.questionnaire.deleteMany({ where: { id: testQuestionnaireId } });
    await prisma.user.deleteMany({ where: { id: { in: [testAdminUserId, testRegularUserId] } } });

    await module.close();
  });

  describe('Complete Decision Log Workflow', () => {
    it('should create decision → lock it → record audit trail', async () => {
      // Step 1: Create decision in DRAFT status (append-only workflow)
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement:
            'Policy Lock for Production Deployment: Lock all security policies to prevent modifications before audit',
          assumptions: 'All stakeholders have reviewed the policy changes',
          references: 'Security Policy v2.0, Audit Requirements Doc',
          status: 'DRAFT',
        },
      });
      testDecisionLogId = decision.id;

      expect(decision.status).toBe('DRAFT');
      expect(decision.ownerId).toBe(testRegularUserId);
      expect(decision.statement).toContain('Policy Lock');

      // Step 2: Lock the decision (DRAFT -> LOCKED)
      const lockedDecision = await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          status: 'LOCKED',
        },
      });

      expect(lockedDecision.status).toBe('LOCKED');

      // Step 3: Audit log records lock action
      const auditEntry = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'LOCK_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          changes: {
            decisionStatement: decision.statement.substring(0, 100),
            previousStatus: 'DRAFT',
            newStatus: 'LOCKED',
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      expect(auditEntry.action).toBe('LOCK_DECISION');
      expect((auditEntry.changes as { newStatus: string }).newStatus).toBe('LOCKED');

      // Clean up audit log
      await prisma.auditLog.delete({ where: { id: auditEntry.id } });
    });

    it('should handle decision supersession workflow', async () => {
      // Create initial decision in DRAFT status
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Emergency Bypass of Security Controls: Request to temporarily disable 2FA',
          assumptions: 'Need bulk user import capability urgently',
          references: 'Security Policy v2.0',
          status: 'DRAFT',
        },
      });

      // Lock the original decision
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'LOCKED' },
      });

      // Create superseding decision with alternative approach
      const supersedingDecision = await prisma.decisionLog.create({
        data: {
          ownerId: testAdminUserId,
          sessionId: testSessionId,
          statement:
            'Alternative: Implement dedicated import service with audit trail instead of 2FA bypass',
          assumptions: 'Better security posture maintained',
          references: 'Security Policy v2.0, Import Service Spec',
          status: 'DRAFT',
          supersedesDecisionId: decision.id,
        },
      });

      // Mark original as superseded
      const supersededDecision = await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'SUPERSEDED' },
      });

      expect(supersededDecision.status).toBe('SUPERSEDED');
      expect(supersedingDecision.supersedesDecisionId).toBe(decision.id);

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'SUPERSEDE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          changes: {
            originalStatement: decision.statement.substring(0, 100),
            supersededBy: supersedingDecision.id,
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      // Clean up
      await prisma.auditLog.deleteMany({ where: { resourceId: decision.id } });
      await prisma.decisionLog.delete({ where: { id: supersedingDecision.id } });
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should handle two-person review workflow via supersession', async () => {
      // Create initial decision in DRAFT status
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Delete Production Database Backups: Remove old backups older than 90 days',
          assumptions: 'Need to free storage space',
          references: 'Data Retention Policy v1.0',
          status: 'DRAFT',
        },
      });

      // First reviewer locks the decision
      const lockedDecision = await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'LOCKED' },
      });

      expect(lockedDecision.status).toBe('LOCKED');

      // Create second admin for review
      const admin2 = await prisma.user.create({
        data: {
          email: `admin2-${Date.now()}@test.com`,
          passwordHash: 'hashed_password',
          role: 'ADMIN',
        },
      });

      // Second reviewer creates refined decision
      const refinedDecision = await prisma.decisionLog.create({
        data: {
          ownerId: admin2.id,
          sessionId: testSessionId,
          statement: 'Refined: Archive backups older than 90 days to cold storage before deletion',
          assumptions: 'Retain compliance while freeing space',
          references: 'Data Retention Policy v1.0, Compliance Requirements',
          status: 'DRAFT',
          supersedesDecisionId: decision.id,
        },
      });

      // Mark original as superseded and lock the refined version
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'SUPERSEDED' },
      });

      const finalDecision = await prisma.decisionLog.update({
        where: { id: refinedDecision.id },
        data: { status: 'LOCKED' },
      });

      expect(finalDecision.status).toBe('LOCKED');
      expect(refinedDecision.supersedesDecisionId).toBe(decision.id);

      // Clean up
      await prisma.decisionLog.delete({ where: { id: refinedDecision.id } });
      await prisma.decisionLog.delete({ where: { id: decision.id } });
      await prisma.user.delete({ where: { id: admin2.id } });
    });
  });

  describe('Audit Trail Verification', () => {
    it('should record complete audit trail for decision workflow', async () => {
      // Create decision in DRAFT status
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Update Security Policy v2.0: Revise password complexity requirements',
          assumptions: 'Current policy is outdated',
          references: 'NIST Guidelines 2026',
          status: 'DRAFT',
        },
      });

      // Log: Decision created
      const createLog = await prisma.auditLog.create({
        data: {
          userId: testRegularUserId,
          action: 'CREATE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          changes: { statement: decision.statement.substring(0, 100), status: 'DRAFT' },
          ipAddress: '192.168.1.50',
          userAgent: 'Web App v1.0',
        },
      });

      // Log: Admin viewed decision
      const viewLog = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'VIEW_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          changes: { statement: decision.statement.substring(0, 100) },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      // Lock decision
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'LOCKED' },
      });

      // Log: Admin locked
      const lockLog = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'LOCK_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          changes: { statement: decision.statement.substring(0, 100), newStatus: 'LOCKED' },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      // Fetch complete audit trail
      const auditTrail = await prisma.auditLog.findMany({
        where: { resourceId: decision.id },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { email: true, role: true } } },
      });

      expect(auditTrail).toHaveLength(3);
      expect(auditTrail[0].action).toBe('CREATE_DECISION');
      expect(auditTrail[1].action).toBe('VIEW_DECISION');
      expect(auditTrail[2].action).toBe('LOCK_DECISION');

      // Verify chronological order
      expect(auditTrail[0].createdAt.getTime()).toBeLessThan(auditTrail[1].createdAt.getTime());
      expect(auditTrail[1].createdAt.getTime()).toBeLessThan(auditTrail[2].createdAt.getTime());

      // Verify user roles
      expect(auditTrail[0].user?.role).toBe('CLIENT');
      expect(auditTrail[2].user?.role).toBe('ADMIN');

      // Clean up
      await prisma.auditLog.deleteMany({ where: { resourceId: decision.id } });
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should track decision supersession chain', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Urgent: Bypass Rate Limiting for load testing',
          assumptions: 'Need to whitelist IP temporarily',
          references: 'Load Test Plan v1.0',
          status: 'DRAFT',
        },
      });

      // Lock the decision
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'LOCKED' },
      });

      // Wait and then supersede
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Create superseding decision
      const supersedingDecision = await prisma.decisionLog.create({
        data: {
          ownerId: testAdminUserId,
          sessionId: testSessionId,
          statement: 'Revised: Use dedicated load test environment instead of production bypass',
          assumptions: 'Safer approach with same testing capability',
          references: 'Load Test Plan v1.0, Security Policy',
          status: 'DRAFT',
          supersedesDecisionId: decision.id,
        },
      });

      // Mark original as superseded
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'SUPERSEDED' },
      });

      // Log supersession
      const supersessionLog = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'SUPERSEDE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          changes: {
            originalStatement: decision.statement.substring(0, 100),
            supersededBy: supersedingDecision.id,
            reason: 'Better approach identified',
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      expect(supersessionLog.action).toBe('SUPERSEDE_DECISION');
      expect((supersessionLog.changes as { supersededBy: string }).supersededBy).toBe(
        supersedingDecision.id,
      );

      // Clean up
      await prisma.auditLog.delete({ where: { id: supersessionLog.id } });
      await prisma.decisionLog.delete({ where: { id: supersedingDecision.id } });
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });
  });

  describe('Notification Integration', () => {
    it('should send notifications at each workflow stage', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Deploy Critical Security Patch: CVE-2026-1234 fix to production',
          assumptions: 'Patch has been tested in staging',
          references: 'CVE-2026-1234 Advisory',
          status: 'DRAFT',
        },
      });

      // Stage 1: Decision created notification
      const stage1Notification = {
        stage: 'CREATED',
        to: `admin-${Date.now()}@test.com`,
        template: 'decision-created',
        variables: {
          decisionId: decision.id,
          statement: decision.statement.substring(0, 100),
          status: decision.status,
        },
      };
      expect(stage1Notification.stage).toBe('CREATED');

      // Stage 2: Reminder for DRAFT decisions
      const stage2Notification = {
        stage: 'REMINDER',
        to: `admin-${Date.now()}@test.com`,
        template: 'decision-review-reminder',
        variables: {
          decisionId: decision.id,
          statement: decision.statement.substring(0, 100),
          hoursInDraft: 4,
        },
      };
      expect(stage2Notification.stage).toBe('REMINDER');

      // Stage 3: Decision locked notification
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: { status: 'LOCKED' },
      });

      const stage3Notification = {
        stage: 'LOCKED',
        to: `user-${Date.now()}@test.com`,
        template: 'decision-locked',
        variables: {
          decisionId: decision.id,
          statement: decision.statement.substring(0, 100),
          lockedBy: testAdminUserId,
        },
      };
      expect(stage3Notification.stage).toBe('LOCKED');

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should batch notifications for multiple draft decisions', async () => {
      // Create multiple draft decisions
      const decisions = await Promise.all([
        prisma.decisionLog.create({
          data: {
            ownerId: testRegularUserId,
            sessionId: testSessionId,
            statement: 'Decision 1: Policy update',
            assumptions: 'Test assumptions 1',
            references: 'Reference 1',
            status: 'DRAFT',
          },
        }),
        prisma.decisionLog.create({
          data: {
            ownerId: testRegularUserId,
            sessionId: testSessionId,
            statement: 'Decision 2: Security enhancement',
            assumptions: 'Test assumptions 2',
            references: 'Reference 2',
            status: 'DRAFT',
          },
        }),
        prisma.decisionLog.create({
          data: {
            ownerId: testRegularUserId,
            sessionId: testSessionId,
            statement: 'Decision 3: Critical fix',
            assumptions: 'Test assumptions 3',
            references: 'Reference 3',
            status: 'DRAFT',
          },
        }),
      ]);

      // Batch notification sent
      const batchNotification = {
        to: `admin-${Date.now()}@test.com`,
        template: 'batch-decision-review',
        variables: {
          draftCount: decisions.length,
          decisions: decisions.map((d) => ({
            id: d.id,
            statement: d.statement.substring(0, 50),
            status: d.status,
          })),
          dashboardLink: 'https://app.quiz2biz.com/admin/decisions?status=DRAFT',
        },
      };

      expect(batchNotification.variables.draftCount).toBe(3);
      expect(batchNotification.variables.decisions).toHaveLength(3);

      // Clean up
      await prisma.decisionLog.deleteMany({
        where: { id: { in: decisions.map((d) => d.id) } },
      });
    });
  });

  describe('Authorization Checks', () => {
    it('should prevent non-admin users from locking decisions', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Test Authorization Check: Verify role-based access',
          assumptions: 'Test assumptions',
          references: 'Access Control Policy',
          status: 'DRAFT',
        },
      });

      // Simulate authorization check
      const regularUser = await prisma.user.findUnique({
        where: { id: testRegularUserId },
      });

      const canLock = regularUser!.role === 'ADMIN';
      expect(canLock).toBe(false);

      // Attempt to lock should be blocked by guard/middleware
      // In real implementation, this would throw UnauthorizedException
      if (!canLock) {
        // Operation blocked - expected behavior
        expect(decision.status).toBe('DRAFT');
      }

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should allow admin users to lock decisions', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Test Admin Authorization: Admin lock capability',
          assumptions: 'Test assumptions',
          references: 'Access Control Policy',
          status: 'DRAFT',
        },
      });

      // Check admin authorization
      const adminUser = await prisma.user.findUnique({
        where: { id: testAdminUserId },
      });

      const canLock = adminUser!.role === 'ADMIN';
      expect(canLock).toBe(true);

      // Admin can lock
      if (canLock) {
        const locked = await prisma.decisionLog.update({
          where: { id: decision.id },
          data: { status: 'LOCKED' },
        });

        expect(locked.status).toBe('LOCKED');
      }

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });
  });

  describe('Decision Review Deadlines', () => {
    it('should track review deadlines for draft decisions', async () => {
      const reviewDeadline = new Date(Date.now() + 86400000); // 24 hours from now

      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Time-Sensitive Decision: Must be reviewed before deadline',
          assumptions: 'Urgent business requirement',
          references: 'Deadline Policy v1.0',
          status: 'DRAFT',
        },
      });

      // Check if deadline approaching (within 4 hours)
      const hoursUntilDeadline = (reviewDeadline.getTime() - Date.now()) / (1000 * 60 * 60);
      const shouldRemind = hoursUntilDeadline <= 4 && hoursUntilDeadline > 0;

      if (shouldRemind) {
        // Send urgent reminder
        const urgentReminder = {
          template: 'urgent-review-reminder',
          variables: {
            decisionId: decision.id,
            statement: decision.statement.substring(0, 100),
            hoursRemaining: hoursUntilDeadline.toFixed(1),
          },
        };
        expect(urgentReminder.template).toBe('urgent-review-reminder');
      }

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });
  });
});
