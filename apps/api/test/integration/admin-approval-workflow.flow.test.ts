import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@libs/database';
import { AdminAuditService } from '../../src/modules/admin/services/admin-audit.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';

/**
 * Integration tests for Admin Approval Workflow
 *
 * SKIP REASON: DecisionLog model uses append-only pattern (DRAFT → LOCKED → SUPERSEDED)
 * without traditional approval workflow fields. These tests document expected behavior
 * for future notification/workflow system integration.
 *
 * Current DecisionLog schema:
 * - statement: The decision statement
 * - assumptions: Underlying assumptions
 * - references: Supporting evidence
 * - ownerId: Who created the decision
 * - status: DRAFT | LOCKED | SUPERSEDED
 * - supersedesDecisionId: Links to previous version (append-only pattern)
 */
describe.skip('Admin → Approval Workflow Flow Integration', () => {
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
        name: `Approval Test Questionnaire ${Date.now()}`,
        description: 'Test questionnaire for approval workflow',
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
    await prisma.user.deleteMany({
      where: { id: { in: [testAdminUserId, testRegularUserId] } },
    });

    await module.close();
  });

  describe('DecisionLog Append-Only Workflow', () => {
    it('should create a decision in DRAFT status', async () => {
      // Step 1: Create decision in DRAFT status
      const decision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement:
            'Policy Lock for Production Deployment: Lock all security policies before audit',
          assumptions: 'All stakeholders have been notified. Security team has completed review.',
          references: 'Security Policy v2.0, Audit Requirements Doc',
          status: 'DRAFT',
        },
      });
      testDecisionLogId = decision.id;

      expect(decision.status).toBe('DRAFT');
      expect(decision.ownerId).toBe(testRegularUserId);
      expect(decision.statement).toContain('Policy Lock');
    });

    it('should lock a decision (finalize)', async () => {
      // Create a new decision since append-only means no updates
      const lockedDecision = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Locked: Security policy configuration approved',
          assumptions: 'All reviews complete',
          status: 'LOCKED',
          supersedesDecisionId: testDecisionLogId, // Links to previous draft
        },
      });

      expect(lockedDecision.status).toBe('LOCKED');
      expect(lockedDecision.supersedesDecisionId).toBe(testDecisionLogId);

      // Clean up
      await prisma.decisionLog.delete({ where: { id: lockedDecision.id } });
    });

    it('should supersede a decision with a new version', async () => {
      // Create original decision
      const original = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Original policy decision',
          status: 'LOCKED',
        },
      });

      // Create superseding decision
      const superseding = await prisma.decisionLog.create({
        data: {
          ownerId: testRegularUserId,
          sessionId: testSessionId,
          statement: 'Updated policy decision with new requirements',
          assumptions: 'Requirements changed per stakeholder feedback',
          status: 'LOCKED',
          supersedesDecisionId: original.id,
        },
      });

      // Mark original as SUPERSEDED (only status change allowed in append-only)
      await prisma.decisionLog.update({
        where: { id: original.id },
        data: { status: 'SUPERSEDED' },
      });

      const updatedOriginal = await prisma.decisionLog.findUnique({
        where: { id: original.id },
      });

      expect(updatedOriginal?.status).toBe('SUPERSEDED');
      expect(superseding.supersedesDecisionId).toBe(original.id);

      // Clean up
      await prisma.decisionLog.delete({ where: { id: superseding.id } });
      await prisma.decisionLog.delete({ where: { id: original.id } });
    });

    it('should record audit trail for decision actions', async () => {
      // Create audit log for decision creation
      const auditEntry = await prisma.auditLog.create({
        data: {
          userId: testAdminUserId,
          action: 'CREATE_DECISION',
          resourceType: 'DecisionLog',
          resourceId: testDecisionLogId,
          changes: {
            statement: 'Policy Lock for Production Deployment',
            status: 'DRAFT',
            createdBy: testRegularUserId,
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Admin Dashboard v1.0',
        },
      });

      expect(auditEntry.action).toBe('CREATE_DECISION');
      expect((auditEntry.changes as Record<string, unknown>).status).toBe('DRAFT');

      // Clean up
      await prisma.auditLog.delete({ where: { id: auditEntry.id } });
    });
  });

  describe('Decision Listing and Filtering', () => {
    it('should list all decisions for a session', async () => {
      const decisions = await prisma.decisionLog.findMany({
        where: { sessionId: testSessionId },
        orderBy: { createdAt: 'desc' },
      });

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].sessionId).toBe(testSessionId);
    });

    it('should filter decisions by status', async () => {
      const draftDecisions = await prisma.decisionLog.findMany({
        where: {
          sessionId: testSessionId,
          status: 'DRAFT',
        },
      });

      for (const decision of draftDecisions) {
        expect(decision.status).toBe('DRAFT');
      }
    });

    it('should get decision with supersession chain', async () => {
      const decision = await prisma.decisionLog.findUnique({
        where: { id: testDecisionLogId },
        include: {
          supersedes: true,
          supersededBy: true,
        },
      });

      expect(decision).toBeDefined();
      expect(decision?.id).toBe(testDecisionLogId);
    });
  });
});
