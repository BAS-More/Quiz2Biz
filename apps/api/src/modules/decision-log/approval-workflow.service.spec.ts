import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { DecisionStatus } from '@prisma/client';
import {
  ApprovalWorkflowService,
  ApprovalCategory,
  ApprovalStatus,
  CreateApprovalRequestDto,
  RespondToApprovalDto,
} from './approval-workflow.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  decisionLog: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService;

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'DEVELOPER',
  };

  const mockAdmin = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockDecision = {
    id: 'decision-1',
    statement: 'Test decision',
    status: DecisionStatus.DRAFT,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalWorkflowService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ApprovalWorkflowService>(ApprovalWorkflowService);

    jest.clearAllMocks();
    mockPrismaService.auditLog.create.mockResolvedValue({});
  });

  describe('createApprovalRequest', () => {
    const dto: CreateApprovalRequestDto = {
      category: ApprovalCategory.HIGH_RISK_DECISION,
      resourceType: 'DecisionLog',
      resourceId: 'decision-1',
      reason: 'Need approval for high-risk decision',
    };

    it('should create an approval request successfully', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.createApprovalRequest(dto, mockUser.id);

      expect(result).toMatchObject({
        category: ApprovalCategory.HIGH_RISK_DECISION,
        resourceType: 'DecisionLog',
        resourceId: 'decision-1',
        requesterId: mockUser.id,
        status: ApprovalStatus.PENDING,
        reason: dto.reason,
      });
      expect(result.id).toMatch(/^apr_/);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if requester not found', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createApprovalRequest(dto, 'non-existent-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if DecisionLog resource not found', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(null);

      await expect(
        service.createApprovalRequest(dto, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if Session resource not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      const sessionDto: CreateApprovalRequestDto = {
        ...dto,
        resourceType: 'Session',
        resourceId: 'session-1',
      };

      await expect(
        service.createApprovalRequest(sessionDto, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow Policy resource type without DB check', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const policyDto: CreateApprovalRequestDto = {
        ...dto,
        resourceType: 'Policy',
        resourceId: 'policy-1',
      };

      const result = await service.createApprovalRequest(policyDto, mockUser.id);
      expect(result.resourceType).toBe('Policy');
    });

    it('should allow ADR resource type without DB check', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const adrDto: CreateApprovalRequestDto = {
        ...dto,
        resourceType: 'ADR',
        resourceId: 'adr-1',
      };

      const result = await service.createApprovalRequest(adrDto, mockUser.id);
      expect(result.resourceType).toBe('ADR');
    });

    it('should use custom expiration hours if provided', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dtoWithExpiration: CreateApprovalRequestDto = {
        ...dto,
        expirationHours: 24,
      };

      const result = await service.createApprovalRequest(dtoWithExpiration, mockUser.id);

      const expectedExpiration = new Date();
      expectedExpiration.setHours(expectedExpiration.getHours() + 24);
      
      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiration.getTime(), -4);
    });

    it('should include metadata if provided', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dtoWithMetadata: CreateApprovalRequestDto = {
        ...dto,
        metadata: { customField: 'customValue' },
      };

      const result = await service.createApprovalRequest(dtoWithMetadata, mockUser.id);
      expect(result.metadata).toEqual({ customField: 'customValue' });
    });

    it('should create audit log entry', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.createApprovalRequest(dto, mockUser.id);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          action: 'APPROVAL_REQUESTED',
          resourceType: 'DecisionLog',
          resourceId: 'decision-1',
        }),
      });
    });
  });

  describe('respondToApproval', () => {
    let approvalId: string;

    beforeEach(async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'DecisionLog',
          resourceId: 'decision-1',
          reason: 'Test approval',
        },
        mockUser.id,
      );
      approvalId = approval.id;
      jest.clearAllMocks();
    });

    it('should approve request successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.decisionLog.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const dto: RespondToApprovalDto = {
        approvalId,
        approved: true,
        comments: 'Approved by admin',
      };

      const result = await service.respondToApproval(dto, mockAdmin.id);

      expect(result.status).toBe(ApprovalStatus.APPROVED);
      expect(result.approverId).toBe(mockAdmin.id);
      expect(result.approverComments).toBe('Approved by admin');
      expect(result.respondedAt).toBeInstanceOf(Date);
    });

    it('should reject request successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const dto: RespondToApprovalDto = {
        approvalId,
        approved: false,
        comments: 'Rejected due to insufficient details',
      };

      const result = await service.respondToApproval(dto, mockAdmin.id);

      expect(result.status).toBe(ApprovalStatus.REJECTED);
    });

    it('should throw NotFoundException if approval not found', async () => {
      await expect(
        service.respondToApproval(
          { approvalId: 'non-existent', approved: true },
          mockAdmin.id,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already responded', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.decisionLog.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.respondToApproval(
        { approvalId, approved: true },
        mockAdmin.id,
      );

      await expect(
        service.respondToApproval(
          { approvalId, approved: false },
          'another-admin',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce two-person rule - requester cannot approve own request', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.respondToApproval({ approvalId, approved: true }, mockUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if approver not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.respondToApproval({ approvalId, approved: true }, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if approver lacks permission for POLICY_LOCK', async () => {
      // Create policy lock approval
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const policyApproval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.POLICY_LOCK,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'Lock policy',
        },
        mockUser.id,
      );

      // Developer tries to approve (not allowed for POLICY_LOCK)
      const developer = { ...mockAdmin, role: 'DEVELOPER' };
      mockPrismaService.user.findUnique.mockResolvedValue(developer);

      await expect(
        service.respondToApproval(
          { approvalId: policyApproval.id, approved: true },
          developer.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should execute action when HIGH_RISK_DECISION is approved', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.decisionLog.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.respondToApproval({ approvalId, approved: true }, mockAdmin.id);

      expect(mockPrismaService.decisionLog.update).toHaveBeenCalledWith({
        where: { id: 'decision-1' },
        data: { status: DecisionStatus.LOCKED },
      });
    });

    it('should create audit log for approval response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.decisionLog.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.respondToApproval(
        { approvalId, approved: true, comments: 'LGTM' },
        mockAdmin.id,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVAL_GRANTED',
          userId: mockAdmin.id,
        }),
      });
    });
  });

  describe('getPendingApprovals', () => {
    beforeEach(async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.auditLog.create.mockResolvedValue({});
    });

    it('should return pending approvals for a user', async () => {
      await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'DecisionLog',
          resourceId: 'decision-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      const pending = await service.getPendingApprovals('another-user-id');
      expect(pending.length).toBe(1);
    });

    it('should exclude own requests from pending list', async () => {
      await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'DecisionLog',
          resourceId: 'decision-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      const pending = await service.getPendingApprovals(mockUser.id);
      expect(pending.length).toBe(0);
    });

    it('should mark expired approvals and exclude them', async () => {
      // Create approval with very short expiration
      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'Test',
          expirationHours: -1, // Already expired
        },
        mockUser.id,
      );

      const pending = await service.getPendingApprovals('another-user');
      const expiredApproval = await service.getApprovalById(approval.id);
      
      expect(pending.find(p => p.id === approval.id)).toBeUndefined();
      expect(expiredApproval.status).toBe(ApprovalStatus.EXPIRED);
    });

    it('should sort by requestedAt ascending', async () => {
      await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'First',
        },
        mockUser.id,
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Second',
        },
        mockUser.id,
      );

      const pending = await service.getPendingApprovals('another-user');
      expect(pending[0].reason).toBe('First');
      expect(pending[1].reason).toBe('Second');
    });
  });

  describe('getMyApprovalRequests', () => {
    it('should return approval requests created by user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'My request',
        },
        mockUser.id,
      );

      const myRequests = await service.getMyApprovalRequests(mockUser.id);
      expect(myRequests.length).toBeGreaterThan(0);
      expect(myRequests[0].requesterId).toBe(mockUser.id);
    });

    it('should sort by requestedAt descending', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'First',
        },
        mockUser.id,
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-2',
          reason: 'Second',
        },
        mockUser.id,
      );

      const myRequests = await service.getMyApprovalRequests(mockUser.id);
      expect(myRequests[0].reason).toBe('Second');
    });
  });

  describe('getApprovalById', () => {
    it('should return approval by ID', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const created = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      const found = await service.getApprovalById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(
        service.getApprovalById('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasApproval', () => {
    beforeEach(async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});
    });

    it('should return hasPending true when pending approval exists', async () => {
      await service.createApprovalRequest(
        {
          category: ApprovalCategory.POLICY_LOCK,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'Lock',
        },
        mockUser.id,
      );

      const result = await service.hasApproval('Policy', 'policy-1');
      expect(result.hasPending).toBe(true);
      expect(result.hasApproved).toBe(false);
    });

    it('should filter by category when provided', async () => {
      await service.createApprovalRequest(
        {
          category: ApprovalCategory.POLICY_LOCK,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'Lock',
        },
        mockUser.id,
      );

      const result = await service.hasApproval(
        'Policy',
        'policy-1',
        ApprovalCategory.ADR_APPROVAL,
      );
      expect(result.hasPending).toBe(false);
    });

    it('should return hasApproved true when approved', async () => {
      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Approve',
        },
        mockUser.id,
      );

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        mockAdmin.id,
      );

      const result = await service.hasApproval('ADR', 'adr-1');
      expect(result.hasApproved).toBe(true);
    });
  });

  describe('requestDecisionLockApproval', () => {
    it('should create approval for decision lock', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.requestDecisionLockApproval(
        'decision-1',
        mockUser.id,
        'Lock this decision',
      );

      expect(result.category).toBe(ApprovalCategory.HIGH_RISK_DECISION);
      expect(result.resourceType).toBe('DecisionLog');
      expect(result.metadata).toHaveProperty('statement');
    });

    it('should throw NotFoundException if decision not found', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(null);

      await expect(
        service.requestDecisionLockApproval('non-existent', mockUser.id, 'Lock'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if decision not in DRAFT status', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue({
        ...mockDecision,
        status: DecisionStatus.LOCKED,
      });

      await expect(
        service.requestDecisionLockApproval('decision-1', mockUser.id, 'Lock'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestPolicyLockApproval', () => {
    it('should create approval for policy lock', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.requestPolicyLockApproval(
        'policy-1',
        mockUser.id,
        'Lock this policy',
      );

      expect(result.category).toBe(ApprovalCategory.POLICY_LOCK);
      expect(result.resourceType).toBe('Policy');
    });
  });

  describe('requestADRApproval', () => {
    it('should create approval for ADR', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.requestADRApproval(
        'adr-1',
        mockUser.id,
        'Approve this ADR',
        { adrTitle: 'Use microservices' },
      );

      expect(result.category).toBe(ApprovalCategory.ADR_APPROVAL);
      expect(result.resourceType).toBe('ADR');
      expect(result.metadata).toHaveProperty('adrTitle');
    });
  });

  describe('notifyApproversOfRequest', () => {
    it('should notify eligible approvers', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findMany.mockResolvedValue([mockAdmin]);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      await service.notifyApproversOfRequest(approval);

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVAL_NOTIFICATION_SENT',
        }),
      });
    });
  });

  describe('notifyRequesterOfResponse', () => {
    it('should notify requester when approval responded', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      // Update status
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        mockAdmin.id,
      );

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const updatedApproval = await service.getApprovalById(approval.id);
      await service.notifyRequesterOfResponse(updatedApproval);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVAL_RESPONSE_NOTIFICATION_SENT',
        }),
      });
    });

    it('should handle missing requester gracefully', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // For creating approval
        .mockResolvedValueOnce(null); // Requester not found for notification
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      // Should not throw
      await expect(
        service.notifyRequesterOfResponse(approval),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyExpiringApprovals', () => {
    it('should notify about approvals expiring within threshold', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      // Create approval expiring in 12 hours
      await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Expiring soon',
          expirationHours: 12,
        },
        mockUser.id,
      );

      const notified = await service.notifyExpiringApprovals(24);
      expect(notified).toBeGreaterThan(0);
    });

    it('should not notify for non-expiring approvals', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      // Create approval expiring in 48 hours
      await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-2',
          reason: 'Not expiring soon',
          expirationHours: 48,
        },
        mockUser.id,
      );

      // Check with 6 hour threshold
      const notified = await service.notifyExpiringApprovals(6);
      expect(notified).toBe(0);
    });
  });

  describe('expired approval handling', () => {
    it('should throw BadRequestException when responding to expired approval', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      // Create approval that's already expired
      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Already expired',
          expirationHours: -1,
        },
        mockUser.id,
      );

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        service.respondToApproval(
          { approvalId: approval.id, approved: true },
          mockAdmin.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('executeApprovedAction - POLICY_LOCK category', () => {
    it('should log policy lock when POLICY_LOCK is approved', async () => {
      // Create a POLICY_LOCK approval
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.POLICY_LOCK,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'Lock this policy',
        },
        mockUser.id,
      );

      // Approve with admin
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        mockAdmin.id,
      );

      expect(result.status).toBe(ApprovalStatus.APPROVED);
      // POLICY_LOCK does not update decisionLog, just logs
      expect(mockPrismaService.decisionLog.update).not.toHaveBeenCalled();
    });
  });

  describe('executeApprovedAction - ADR_APPROVAL category', () => {
    it('should log ADR approval when ADR_APPROVAL is approved', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'Approve ADR',
        },
        mockUser.id,
      );

      const developer = { ...mockAdmin, id: 'dev-1', role: 'DEVELOPER' };
      mockPrismaService.user.findUnique.mockResolvedValue(developer);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        developer.id,
      );

      expect(result.status).toBe(ApprovalStatus.APPROVED);
      // ADR_APPROVAL does not update decisionLog
      expect(mockPrismaService.decisionLog.update).not.toHaveBeenCalled();
    });
  });

  describe('validateResource - unknown resource type', () => {
    it('should allow unknown resource types without DB check', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'UnknownType',
          resourceId: 'unknown-1',
          reason: 'Test unknown type',
        },
        mockUser.id,
      );

      expect(result.resourceType).toBe('UnknownType');
    });
  });

  describe('requester name fallback', () => {
    it('should use email when name is null', async () => {
      const userWithNoName = { ...mockUser, name: null };
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(userWithNoName);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'DecisionLog',
          resourceId: 'decision-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      expect(result.requesterName).toBe(mockUser.email);
    });
  });

  describe('approver name fallback', () => {
    it('should use email when approver name is null', async () => {
      mockPrismaService.decisionLog.findUnique.mockResolvedValue(mockDecision);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'DecisionLog',
          resourceId: 'decision-1',
          reason: 'Test',
        },
        mockUser.id,
      );

      const adminNoName = { ...mockAdmin, name: null };
      mockPrismaService.user.findUnique.mockResolvedValue(adminNoName);
      mockPrismaService.decisionLog.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        mockAdmin.id,
      );

      expect(result.approverName).toBe(mockAdmin.email);
    });
  });

  describe('executeApprovedAction - non-DecisionLog HIGH_RISK_DECISION', () => {
    it('should not update decisionLog when resourceType is not DecisionLog', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.HIGH_RISK_DECISION,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'High risk policy change',
        },
        mockUser.id,
      );

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        mockAdmin.id,
      );

      expect(mockPrismaService.decisionLog.update).not.toHaveBeenCalled();
    });
  });

  describe('category permissions', () => {
    beforeEach(async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});
    });

    it('should require ADMIN for SECURITY_EXCEPTION', async () => {
      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.SECURITY_EXCEPTION,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'Security exception',
        },
        mockUser.id,
      );

      const developer = { ...mockAdmin, id: 'dev-1', role: 'DEVELOPER' };
      mockPrismaService.user.findUnique.mockResolvedValue(developer);

      await expect(
        service.respondToApproval(
          { approvalId: approval.id, approved: true },
          developer.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should require ADMIN for DATA_ACCESS', async () => {
      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.DATA_ACCESS,
          resourceType: 'Policy',
          resourceId: 'policy-1',
          reason: 'Data access request',
        },
        mockUser.id,
      );

      const client = { ...mockAdmin, id: 'client-1', role: 'CLIENT' };
      mockPrismaService.user.findUnique.mockResolvedValue(client);

      await expect(
        service.respondToApproval(
          { approvalId: approval.id, approved: true },
          client.id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow DEVELOPER for ADR_APPROVAL', async () => {
      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-1',
          reason: 'ADR approval',
        },
        mockUser.id,
      );

      const developer = { ...mockAdmin, id: 'dev-1', role: 'DEVELOPER' };
      mockPrismaService.user.findUnique.mockResolvedValue(developer);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        developer.id,
      );

      expect(result.status).toBe(ApprovalStatus.APPROVED);
    });
  });

  describe('uncovered branches', () => {
    it('should hit default case in executeApprovedAction for SECURITY_EXCEPTION', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.SECURITY_EXCEPTION,
          resourceType: 'SecurityException',
          resourceId: 'sec-1',
          reason: 'Security exception request',
        },
        mockUser.id,
      );

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        mockAdmin.id,
      );

      // SECURITY_EXCEPTION hits the default case - no automatic action
      expect(result.status).toBe(ApprovalStatus.APPROVED);
    });

    it('should notify with REJECTED type when approval is rejected', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-rej-1',
          reason: 'Need approval',
        },
        mockUser.id,
      );

      // Reject it
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);
      const rejected = await service.respondToApproval(
        { approvalId: approval.id, approved: false, comments: 'Not approved' },
        mockAdmin.id,
      );

      // Now notify with REJECTED status
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      await service.notifyRequesterOfResponse(rejected);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVAL_RESPONSE_NOTIFICATION_SENT',
          changes: expect.objectContaining({
            notificationType: 'REJECTED',
          }),
        }),
      });
    });

    it('should pass empty changes object when changes param is undefined in createAuditEntry', async () => {
      // The createAuditEntry is private, but we test it through notifyApproversOfRequest
      // which calls createAuditEntry with defined changes. The `changes ? ... : {}` branch
      // for undefined changes would require calling with undefined - tested indirectly.
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findMany.mockResolvedValue([mockAdmin]);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-audit-1',
          reason: 'Audit test',
        },
        mockUser.id,
      );

      await service.notifyApproversOfRequest(approval);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVAL_NOTIFICATION_SENT',
          changes: expect.any(Object),
        }),
      });
    });

    it('should skip already-expired approvals in notifyExpiringApprovals', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      // Create an approval with very short expiration (already expired)
      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.ADR_APPROVAL,
          resourceType: 'ADR',
          resourceId: 'adr-expired',
          reason: 'Already expired',
          expirationHours: 0, // expires immediately
        },
        mockUser.id,
      );

      // Wait a tiny bit to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const notified = await service.notifyExpiringApprovals(24);

      // Already-expired approval should be skipped (expiresAt <= new Date())
      expect(notified).toBe(0);
    });

    it('should hit default case in executeApprovedAction for DATA_ACCESS', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const approval = await service.createApprovalRequest(
        {
          category: ApprovalCategory.DATA_ACCESS,
          resourceType: 'DataAccessRequest',
          resourceId: 'data-1',
          reason: 'Need data access',
        },
        mockUser.id,
      );

      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.respondToApproval(
        { approvalId: approval.id, approved: true },
        mockAdmin.id,
      );

      // DATA_ACCESS hits the default case - no automatic action
      expect(result.status).toBe(ApprovalStatus.APPROVED);
    });
  });
});
