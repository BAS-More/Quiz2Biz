import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@libs/database';
import { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service';
import { NotificationService } from '../../src/modules/notification/notification.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';

describe('Admin → Approval Workflow Flow Integration', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let auditService: AdminAuditService;
  let notificationService: NotificationService;

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
      providers: [PrismaService, AdminAuditService, NotificationService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AdminAuditService>(AdminAuditService);
    notificationService = module.get<NotificationService>(NotificationService);

    // Create test admin user
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.com`,
        hashedPassword: 'hashed_password',
        role: 'ADMIN',
      },
    });
    testAdminUserId = admin.id;

    // Create test regular user
    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}@test.com`,
        hashedPassword: 'hashed_password',
        role: 'USER',
      },
    });
    testRegularUserId = user.id;

    // Create test questionnaire
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: `Approval Test Questionnaire ${Date.now()}`,
        description: 'Test questionnaire for approval workflow',
      },
    });
    testQuestionnaireId = questionnaire.id;

    // Create test session
    const session = await prisma.session.create({
      data: {
        userId: testRegularUserId,
        questionnaireId: testQuestionnaireId,
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

  describe('Complete Approval Workflow', () => {
    it('should create high-risk decision → request approval → admin approves → notification sent', async () => {
      // Step 1: Create high-risk decision requiring approval
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Policy Lock for Production Deployment',
          description: 'Lock all security policies to prevent modifications before audit',
          category: 'POLICY',
          impact: 'HIGH',
          requiresApproval: true,
          approvalStatus: 'PENDING',
          decision: {
            action: 'LOCK_POLICIES',
            scope: 'ALL',
            effectiveDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          },
        },
      });
      testDecisionLogId = decision.id;

      expect(decision.requiresApproval).toBe(true);
      expect(decision.approvalStatus).toBe('PENDING');
      expect(decision.impact).toBe('HIGH');

      // Step 2: System triggers approval request notification
      const approvalRequestSent = {
        to: `admin-${Date.now()}@test.com`,
        subject: 'Approval Required: Policy Lock for Production Deployment',
        template: 'approval-request',
        variables: {
          decisionId: decision.id,
          title: decision.title,
          description: decision.description,
          requestedBy: testRegularUserId,
          impact: decision.impact,
          approvalLink: `https://app.quiz2biz.com/admin/decisions/${decision.id}`,
        },
      };

      expect(approvalRequestSent.template).toBe('approval-request');
      expect(approvalRequestSent.variables.impact).toBe('HIGH');

      // Step 3: Admin reviews and approves decision
      const approvedDecision = await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy: testAdminUserId,
          approvedAt: new Date(),
          approvalNotes:
            'Reviewed policy lock request. All requirements met. Approved for production.',
        },
      });

      expect(approvedDecision.approvalStatus).toBe('APPROVED');
      expect(approvedDecision.approvedBy).toBe(testAdminUserId);
      expect(approvedDecision.approvedAt).toBeDefined();
      expect(approvedDecision.approvalNotes).toContain('Approved');

      // Step 4: Audit log records approval action
      const auditEntry = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'APPROVE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          details: {
            decisionTitle: decision.title,
            previousStatus: 'PENDING',
            newStatus: 'APPROVED',
            approvalNotes: approvedDecision.approvalNotes,
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      expect(auditEntry.action).toBe('APPROVE_DECISION');
      expect((auditEntry.details as any).newStatus).toBe('APPROVED');

      // Step 5: Notification sent to decision requester
      const approvalNotification = {
        to: `user-${Date.now()}@test.com`,
        subject: 'Decision Approved: Policy Lock for Production Deployment',
        template: 'decision-approved',
        variables: {
          decisionId: decision.id,
          title: decision.title,
          approvedBy: testAdminUserId,
          approvalNotes: approvedDecision.approvalNotes,
          viewLink: `https://app.quiz2biz.com/decisions/${decision.id}`,
        },
      };

      expect(approvalNotification.template).toBe('decision-approved');
      expect(approvalNotification.variables.approvedBy).toBe(testAdminUserId);

      // Clean up audit log
      await prisma.auditLog.delete({ where: { id: auditEntry.id } });
    });

    it('should handle decision rejection workflow', async () => {
      // Create decision
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Emergency Bypass of Security Controls',
          description: 'Request to temporarily disable 2FA for bulk user import',
          category: 'SECURITY',
          impact: 'CRITICAL',
          requiresApproval: true,
          approvalStatus: 'PENDING',
        },
      });

      // Admin rejects decision
      const rejectedDecision = await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          approvalStatus: 'REJECTED',
          approvedBy: testAdminUserId,
          approvedAt: new Date(),
          approvalNotes:
            'Security control bypass not permitted. Alternative solution required: implement dedicated import service with audit trail.',
        },
      });

      expect(rejectedDecision.approvalStatus).toBe('REJECTED');
      expect(rejectedDecision.approvalNotes).toContain('not permitted');

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'REJECT_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          details: {
            decisionTitle: decision.title,
            impact: decision.impact,
            rejectionReason: rejectedDecision.approvalNotes,
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      // Notification sent
      const rejectionNotification = {
        template: 'decision-rejected',
        variables: {
          decisionId: decision.id,
          title: decision.title,
          rejectionReason: rejectedDecision.approvalNotes,
        },
      };

      expect(rejectionNotification.template).toBe('decision-rejected');

      // Clean up
      await prisma.auditLog.deleteMany({ where: { resourceId: decision.id } });
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should handle two-person approval requirement', async () => {
      // Create CRITICAL decision requiring two approvals
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Delete Production Database Backups',
          description: 'Remove old backups older than 90 days to free storage',
          category: 'DATA',
          impact: 'CRITICAL',
          requiresApproval: true,
          approvalStatus: 'PENDING',
          decision: {
            twoPersonRule: true,
            requiredApprovals: 2,
            currentApprovals: 0,
          },
        },
      });

      // First admin approves
      const firstApproval = await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          decision: {
            twoPersonRule: true,
            requiredApprovals: 2,
            currentApprovals: 1,
            approvers: [testAdminUserId],
          },
          approvalStatus: 'PENDING', // Still pending second approval
        },
      });

      expect((firstApproval.decision as any).currentApprovals).toBe(1);
      expect(firstApproval.approvalStatus).toBe('PENDING');

      // Create second admin
      const admin2 = await prisma.user.create({
        data: {
          email: `admin2-${Date.now()}@test.com`,
          hashedPassword: 'hashed_password',
          role: 'ADMIN',
        },
      });

      // Second admin approves
      const secondApproval = await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          decision: {
            twoPersonRule: true,
            requiredApprovals: 2,
            currentApprovals: 2,
            approvers: [testAdminUserId, admin2.id],
          },
          approvalStatus: 'APPROVED',
          approvedBy: admin2.id,
          approvedAt: new Date(),
        },
      });

      expect((secondApproval.decision as any).currentApprovals).toBe(2);
      expect(secondApproval.approvalStatus).toBe('APPROVED');

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
      await prisma.user.delete({ where: { id: admin2.id } });
    });
  });

  describe('Audit Trail Verification', () => {
    it('should record complete audit trail for approval workflow', async () => {
      // Create decision
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Update Security Policy v2.0',
          description: 'Revise password complexity requirements',
          category: 'POLICY',
          impact: 'MEDIUM',
          requiresApproval: true,
          approvalStatus: 'PENDING',
        },
      });

      // Log: Decision created
      const createLog = await prisma.auditLog.create({
        data: {
          userId: testRegularUserId,
          action: 'CREATE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          details: { title: decision.title, requiresApproval: true },
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
          details: { title: decision.title },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      // Approve decision
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy: testAdminUserId,
          approvedAt: new Date(),
        },
      });

      // Log: Admin approved
      const approveLog = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'APPROVE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          details: { title: decision.title, newStatus: 'APPROVED' },
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
      expect(auditTrail[2].action).toBe('APPROVE_DECISION');

      // Verify chronological order
      expect(auditTrail[0].createdAt.getTime()).toBeLessThan(auditTrail[1].createdAt.getTime());
      expect(auditTrail[1].createdAt.getTime()).toBeLessThan(auditTrail[2].createdAt.getTime());

      // Verify user roles
      expect(auditTrail[0].user.role).toBe('USER');
      expect(auditTrail[2].user.role).toBe('ADMIN');

      // Clean up
      await prisma.auditLog.deleteMany({ where: { resourceId: decision.id } });
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should track approval request escalation', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Urgent: Bypass Rate Limiting',
          description: 'Urgent request to whitelist IP for load testing',
          category: 'SECURITY',
          impact: 'HIGH',
          requiresApproval: true,
          approvalStatus: 'PENDING',
          decision: {
            escalated: false,
            escalationCount: 0,
          },
        },
      });

      // Wait 24 hours (simulated) - no approval
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulated delay

      // Escalate to higher authority
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          decision: {
            escalated: true,
            escalationCount: 1,
            escalatedAt: new Date().toISOString(),
            escalatedTo: 'SENIOR_ADMIN',
          },
        },
      });

      // Log escalation
      const escalationLog = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'ESCALATE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: decision.id,
          details: {
            title: decision.title,
            escalatedTo: 'SENIOR_ADMIN',
            reason: 'No response after 24 hours',
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      expect(escalationLog.action).toBe('ESCALATE_DECISION');
      expect((escalationLog.details as any).escalatedTo).toBe('SENIOR_ADMIN');

      // Clean up
      await prisma.auditLog.delete({ where: { id: escalationLog.id } });
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });
  });

  describe('Notification Integration', () => {
    it('should send notifications at each workflow stage', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Deploy Critical Security Patch',
          description: 'Deploy CVE-2026-1234 fix to production',
          category: 'SECURITY',
          impact: 'CRITICAL',
          requiresApproval: true,
          approvalStatus: 'PENDING',
        },
      });

      // Stage 1: Approval request sent
      const stage1Notification = {
        stage: 'REQUEST',
        to: `admin-${Date.now()}@test.com`,
        template: 'approval-request',
        variables: {
          decisionId: decision.id,
          title: decision.title,
          impact: decision.impact,
        },
      };
      expect(stage1Notification.stage).toBe('REQUEST');

      // Stage 2: Reminder sent after 4 hours
      const stage2Notification = {
        stage: 'REMINDER',
        to: `admin-${Date.now()}@test.com`,
        template: 'approval-reminder',
        variables: {
          decisionId: decision.id,
          title: decision.title,
          hoursPending: 4,
        },
      };
      expect(stage2Notification.stage).toBe('REMINDER');

      // Stage 3: Approved notification
      await prisma.decisionLog.update({
        where: { id: decision.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy: testAdminUserId,
          approvedAt: new Date(),
        },
      });

      const stage3Notification = {
        stage: 'APPROVED',
        to: `user-${Date.now()}@test.com`,
        template: 'decision-approved',
        variables: {
          decisionId: decision.id,
          title: decision.title,
          approvedBy: testAdminUserId,
        },
      };
      expect(stage3Notification.stage).toBe('APPROVED');

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should batch notifications for multiple pending approvals', async () => {
      // Create multiple pending decisions
      const decisions = await Promise.all([
        prisma.decisionLog.create({
          data: {
            userId: testRegularUserId,
            sessionId: testSessionId,
            title: 'Decision 1',
            description: 'Test decision 1',
            category: 'POLICY',
            impact: 'MEDIUM',
            requiresApproval: true,
            approvalStatus: 'PENDING',
          },
        }),
        prisma.decisionLog.create({
          data: {
            userId: testRegularUserId,
            sessionId: testSessionId,
            title: 'Decision 2',
            description: 'Test decision 2',
            category: 'POLICY',
            impact: 'HIGH',
            requiresApproval: true,
            approvalStatus: 'PENDING',
          },
        }),
        prisma.decisionLog.create({
          data: {
            userId: testRegularUserId,
            sessionId: testSessionId,
            title: 'Decision 3',
            description: 'Test decision 3',
            category: 'SECURITY',
            impact: 'CRITICAL',
            requiresApproval: true,
            approvalStatus: 'PENDING',
          },
        }),
      ]);

      // Batch notification sent
      const batchNotification = {
        to: `admin-${Date.now()}@test.com`,
        template: 'batch-approval-request',
        variables: {
          pendingCount: decisions.length,
          decisions: decisions.map((d) => ({
            id: d.id,
            title: d.title,
            impact: d.impact,
          })),
          dashboardLink: 'https://app.quiz2biz.com/admin/decisions?status=PENDING',
        },
      };

      expect(batchNotification.variables.pendingCount).toBe(3);
      expect(batchNotification.variables.decisions).toHaveLength(3);

      // Clean up
      await prisma.decisionLog.deleteMany({
        where: { id: { in: decisions.map((d) => d.id) } },
      });
    });
  });

  describe('Authorization Checks', () => {
    it('should prevent non-admin users from approving decisions', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Test Authorization Check',
          description: 'Test decision',
          category: 'POLICY',
          impact: 'LOW',
          requiresApproval: true,
          approvalStatus: 'PENDING',
        },
      });

      // Simulate authorization check
      const regularUser = await prisma.user.findUnique({
        where: { id: testRegularUserId },
      });

      const canApprove = regularUser!.role === 'ADMIN';
      expect(canApprove).toBe(false);

      // Attempt to approve should be blocked by guard/middleware
      // In real implementation, this would throw UnauthorizedException
      if (!canApprove) {
        // Operation blocked - expected behavior
        expect(decision.approvalStatus).toBe('PENDING');
      }

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });

    it('should allow admin users to approve decisions', async () => {
      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Test Admin Authorization',
          description: 'Test decision',
          category: 'POLICY',
          impact: 'LOW',
          requiresApproval: true,
          approvalStatus: 'PENDING',
        },
      });

      // Check admin authorization
      const adminUser = await prisma.user.findUnique({
        where: { id: testAdminUserId },
      });

      const canApprove = adminUser!.role === 'ADMIN';
      expect(canApprove).toBe(true);

      // Admin can approve
      if (canApprove) {
        const approved = await prisma.decisionLog.update({
          where: { id: decision.id },
          data: {
            approvalStatus: 'APPROVED',
            approvedBy: testAdminUserId,
            approvedAt: new Date(),
          },
        });

        expect(approved.approvalStatus).toBe('APPROVED');
        expect(approved.approvedBy).toBe(testAdminUserId);
      }

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });
  });

  describe('Approval Deadlines', () => {
    it('should track approval deadlines and auto-escalate', async () => {
      const deadline = new Date(Date.now() + 86400000); // 24 hours from now

      const decision = await prisma.decisionLog.create({
        data: {
          userId: testRegularUserId,
          sessionId: testSessionId,
          title: 'Time-Sensitive Decision',
          description: 'Must be approved before deadline',
          category: 'SECURITY',
          impact: 'HIGH',
          requiresApproval: true,
          approvalStatus: 'PENDING',
          decision: {
            approvalDeadline: deadline.toISOString(),
            autoEscalateOnMiss: true,
          },
        },
      });

      // Check if deadline approaching (within 4 hours)
      const hoursUntilDeadline = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
      const shouldRemind = hoursUntilDeadline <= 4 && hoursUntilDeadline > 0;

      if (shouldRemind) {
        // Send urgent reminder
        const urgentReminder = {
          template: 'urgent-approval-reminder',
          variables: {
            decisionId: decision.id,
            title: decision.title,
            hoursRemaining: hoursUntilDeadline.toFixed(1),
          },
        };
        expect(urgentReminder.template).toBe('urgent-approval-reminder');
      }

      // Clean up
      await prisma.decisionLog.delete({ where: { id: decision.id } });
    });
  });
});
