import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { DecisionStatus } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Approval categories that require two-person rule
 */
export enum ApprovalCategory {
  POLICY_LOCK = 'POLICY_LOCK',
  ADR_APPROVAL = 'ADR_APPROVAL',
  HIGH_RISK_DECISION = 'HIGH_RISK_DECISION',
  SECURITY_EXCEPTION = 'SECURITY_EXCEPTION',
  DATA_ACCESS = 'DATA_ACCESS',
}

/**
 * Approval status for workflow tracking
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * Approval request interface
 */
export interface ApprovalRequest {
  id: string;
  category: ApprovalCategory;
  resourceType: string;
  resourceId: string;
  requesterId: string;
  requesterName?: string;
  approverId?: string;
  approverName?: string;
  status: ApprovalStatus;
  reason: string;
  approverComments?: string;
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Create approval request DTO
 */
export interface CreateApprovalRequestDto {
  category: ApprovalCategory;
  resourceType: string;
  resourceId: string;
  reason: string;
  expirationHours?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Respond to approval request DTO
 */
export interface RespondToApprovalDto {
  approvalId: string;
  approved: boolean;
  comments?: string;
}

/**
 * ApprovalWorkflowService - Two-Person Rule Implementation
 *
 * Implements Quiz2Biz two-person rule for high-risk decisions:
 * - Policy locks require second approver
 * - ADR approvals require peer review
 * - Security exceptions require manager approval
 *
 * Key Principles:
 * 1. Requester cannot approve their own request
 * 2. Approver must have appropriate role/permissions
 * 3. Approvals expire after configurable timeout
 * 4. Full audit trail maintained
 */
@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);

  /** Default expiration time in hours */
  private readonly DEFAULT_EXPIRATION_HOURS = 72;

  /** In-memory storage for approvals (would be DB in production) */
  private approvals: Map<string, ApprovalRequest> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new approval request
   *
   * @param dto - Approval request details
   * @param requesterId - ID of user requesting approval
   * @returns Created approval request
   */
  async createApprovalRequest(
    dto: CreateApprovalRequestDto,
    requesterId: string,
  ): Promise<ApprovalRequest> {
    // Validate resource exists
    await this.validateResource(dto.resourceType, dto.resourceId);

    // Get requester details
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { id: true, name: true, email: true },
    });

    if (!requester) {
      throw new NotFoundException(`User not found: ${requesterId}`);
    }

    const expirationHours = dto.expirationHours || this.DEFAULT_EXPIRATION_HOURS;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const approvalRequest: ApprovalRequest = {
      id: this.generateId(),
      category: dto.category,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      requesterId,
      requesterName: requester.name || requester.email,
      status: ApprovalStatus.PENDING,
      reason: dto.reason,
      requestedAt: new Date(),
      expiresAt,
      metadata: dto.metadata,
    };

    // Store approval request
    this.approvals.set(approvalRequest.id, approvalRequest);

    // Create audit log entry
    await this.createAuditEntry(
      'APPROVAL_REQUESTED',
      requesterId,
      dto.resourceType,
      dto.resourceId,
      { category: dto.category, reason: dto.reason },
    );

    this.logger.log(
      `Approval request created: ${approvalRequest.id} for ${dto.resourceType}/${dto.resourceId} by ${requesterId}`,
    );

    return approvalRequest;
  }

  /**
   * Respond to an approval request (approve or reject)
   *
   * TWO-PERSON RULE ENFORCEMENT:
   * - Requester cannot approve their own request
   * - Approver must have appropriate permissions
   *
   * @param dto - Response details
   * @param approverId - ID of user responding to approval
   */
  async respondToApproval(dto: RespondToApprovalDto, approverId: string): Promise<ApprovalRequest> {
    const approval = this.approvals.get(dto.approvalId);

    if (!approval) {
      throw new NotFoundException(`Approval request not found: ${dto.approvalId}`);
    }

    // Check if already responded
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Approval request already ${approval.status.toLowerCase()}`);
    }

    // Check if expired
    if (new Date() > approval.expiresAt) {
      approval.status = ApprovalStatus.EXPIRED;
      this.approvals.set(dto.approvalId, approval);
      throw new BadRequestException('Approval request has expired');
    }

    // TWO-PERSON RULE: Requester cannot approve their own request
    if (approval.requesterId === approverId) {
      throw new ForbiddenException(
        'Two-person rule violation: You cannot approve your own request',
      );
    }

    // Get approver details
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!approver) {
      throw new NotFoundException(`Approver not found: ${approverId}`);
    }

    // Validate approver has permission for this category
    await this.validateApproverPermission(approver, approval.category);

    // Update approval status
    approval.approverId = approverId;
    approval.approverName = approver.name || approver.email;
    approval.status = dto.approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    approval.approverComments = dto.comments;
    approval.respondedAt = new Date();

    this.approvals.set(dto.approvalId, approval);

    // If approved, execute the associated action
    if (dto.approved) {
      await this.executeApprovedAction(approval);
    }

    // Create audit log entry
    await this.createAuditEntry(
      dto.approved ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      approverId,
      approval.resourceType,
      approval.resourceId,
      {
        approvalId: dto.approvalId,
        category: approval.category,
        comments: dto.comments,
      },
    );

    this.logger.log(
      `Approval ${dto.approved ? 'granted' : 'rejected'}: ${dto.approvalId} by ${approverId}`,
    );

    return approval;
  }

  /**
   * Get pending approval requests for a user to review
   */
  async getPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
    const pending: ApprovalRequest[] = [];
    const now = new Date();

    for (const approval of this.approvals.values()) {
      // Skip if requester is same as potential approver
      if (approval.requesterId === userId) {
        continue;
      }

      // Skip if not pending
      if (approval.status !== ApprovalStatus.PENDING) {
        continue;
      }

      // Skip if expired
      if (now > approval.expiresAt) {
        approval.status = ApprovalStatus.EXPIRED;
        this.approvals.set(approval.id, approval);
        continue;
      }

      pending.push(approval);
    }

    return pending.sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  /**
   * Get approval requests created by a user
   */
  async getMyApprovalRequests(userId: string): Promise<ApprovalRequest[]> {
    const requests: ApprovalRequest[] = [];

    for (const approval of this.approvals.values()) {
      if (approval.requesterId === userId) {
        requests.push(approval);
      }
    }

    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Get approval request by ID
   */
  async getApprovalById(approvalId: string): Promise<ApprovalRequest> {
    const approval = this.approvals.get(approvalId);

    if (!approval) {
      throw new NotFoundException(`Approval request not found: ${approvalId}`);
    }

    return approval;
  }

  /**
   * Check if a resource has pending or approved approval
   */
  async hasApproval(
    resourceType: string,
    resourceId: string,
    category?: ApprovalCategory,
  ): Promise<{ hasPending: boolean; hasApproved: boolean }> {
    let hasPending = false;
    let hasApproved = false;

    for (const approval of this.approvals.values()) {
      if (
        approval.resourceType === resourceType &&
        approval.resourceId === resourceId &&
        (!category || approval.category === category)
      ) {
        if (approval.status === ApprovalStatus.PENDING) {
          hasPending = true;
        }
        if (approval.status === ApprovalStatus.APPROVED) {
          hasApproved = true;
        }
      }
    }

    return { hasPending, hasApproved };
  }

  /**
   * Request approval for a decision lock (two-person rule)
   */
  async requestDecisionLockApproval(
    decisionId: string,
    requesterId: string,
    reason: string,
  ): Promise<ApprovalRequest> {
    // Validate decision exists and is in DRAFT status
    const decision = await this.prisma.decisionLog.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException(`Decision not found: ${decisionId}`);
    }

    if (decision.status !== DecisionStatus.DRAFT) {
      throw new BadRequestException(`Decision is not in DRAFT status: ${decision.status}`);
    }

    return this.createApprovalRequest(
      {
        category: ApprovalCategory.HIGH_RISK_DECISION,
        resourceType: 'DecisionLog',
        resourceId: decisionId,
        reason,
        metadata: { statement: decision.statement },
      },
      requesterId,
    );
  }

  /**
   * Request approval for a policy lock
   */
  async requestPolicyLockApproval(
    policyId: string,
    requesterId: string,
    reason: string,
  ): Promise<ApprovalRequest> {
    return this.createApprovalRequest(
      {
        category: ApprovalCategory.POLICY_LOCK,
        resourceType: 'Policy',
        resourceId: policyId,
        reason,
      },
      requesterId,
    );
  }

  /**
   * Request approval for an ADR
   */
  async requestADRApproval(
    adrId: string,
    requesterId: string,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<ApprovalRequest> {
    return this.createApprovalRequest(
      {
        category: ApprovalCategory.ADR_APPROVAL,
        resourceType: 'ADR',
        resourceId: adrId,
        reason,
        metadata,
      },
      requesterId,
    );
  }

  // ========================================
  // Private helpers
  // ========================================

  /**
   * Validate resource exists
   */
  private async validateResource(resourceType: string, resourceId: string): Promise<void> {
    let exists = false;

    switch (resourceType) {
      case 'DecisionLog':
        exists = !!(await this.prisma.decisionLog.findUnique({
          where: { id: resourceId },
        }));
        break;
      case 'Session':
        exists = !!(await this.prisma.session.findUnique({
          where: { id: resourceId },
        }));
        break;
      case 'Policy':
      case 'ADR':
        // These might not have DB records yet - allow
        exists = true;
        break;
      default:
        exists = true; // Allow unknown resource types
    }

    if (!exists) {
      throw new NotFoundException(`Resource not found: ${resourceType}/${resourceId}`);
    }
  }

  /**
   * Validate approver has permission for the category
   */
  private async validateApproverPermission(
    approver: { id: string; role: string },
    category: ApprovalCategory,
  ): Promise<void> {
    // Role-based permission mapping
    const categoryPermissions: Record<ApprovalCategory, string[]> = {
      [ApprovalCategory.POLICY_LOCK]: ['ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.ADR_APPROVAL]: ['DEVELOPER', 'ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.HIGH_RISK_DECISION]: ['DEVELOPER', 'ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.SECURITY_EXCEPTION]: ['ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.DATA_ACCESS]: ['ADMIN', 'SUPER_ADMIN'],
    };

    const allowedRoles = categoryPermissions[category];
    if (!allowedRoles.includes(approver.role)) {
      throw new ForbiddenException(
        `Insufficient permissions to approve ${category}. Required roles: ${allowedRoles.join(', ')}`,
      );
    }
  }

  /**
   * Execute the action associated with an approved request
   */
  private async executeApprovedAction(approval: ApprovalRequest): Promise<void> {
    switch (approval.category) {
      case ApprovalCategory.HIGH_RISK_DECISION:
        if (approval.resourceType === 'DecisionLog') {
          // Lock the decision
          await this.prisma.decisionLog.update({
            where: { id: approval.resourceId },
            data: { status: DecisionStatus.LOCKED },
          });
          this.logger.log(`Decision ${approval.resourceId} locked after two-person approval`);
        }
        break;

      case ApprovalCategory.POLICY_LOCK:
        // Policy lock logic would go here
        this.logger.log(`Policy ${approval.resourceId} locked after approval`);
        break;

      case ApprovalCategory.ADR_APPROVAL:
        // ADR approval logic would go here
        this.logger.log(`ADR ${approval.resourceId} approved`);
        break;

      default:
        // No automatic action for other categories
        break;
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditEntry(
    action: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    changes?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : {},
      },
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `apr_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
  }

  // ========================================
  // Notification Triggers
  // ========================================

  /**
   * Notify approvers when a new approval request is created
   * Called after createApprovalRequest
   */
  async notifyApproversOfRequest(approval: ApprovalRequest): Promise<void> {
    // Get users who can approve this category
    const approvers = await this.getEligibleApprovers(approval.category, approval.requesterId);

    this.logger.log(`Notifying ${approvers.length} eligible approvers for request ${approval.id}`);

    // Log notification event (actual email sending would integrate with NotificationService)
    for (const approver of approvers) {
      await this.createAuditEntry(
        'APPROVAL_NOTIFICATION_SENT',
        approver.id,
        approval.resourceType,
        approval.resourceId,
        {
          approvalId: approval.id,
          notificationType: 'NEW_REQUEST',
          recipient: approver.email,
        },
      );
    }
  }

  /**
   * Notify requester when their approval is approved or rejected
   */
  async notifyRequesterOfResponse(approval: ApprovalRequest): Promise<void> {
    const requester = await this.prisma.user.findUnique({
      where: { id: approval.requesterId },
      select: { id: true, email: true, name: true },
    });

    if (!requester) {
      return;
    }

    this.logger.log(
      `Notifying requester ${requester.email} of ${approval.status} for request ${approval.id}`,
    );

    // Log notification event
    await this.createAuditEntry(
      'APPROVAL_RESPONSE_NOTIFICATION_SENT',
      requester.id,
      approval.resourceType,
      approval.resourceId,
      {
        approvalId: approval.id,
        notificationType: approval.status === ApprovalStatus.APPROVED ? 'APPROVED' : 'REJECTED',
        recipient: requester.email,
        respondedBy: approval.approverId,
      },
    );
  }

  /**
   * Get users eligible to approve a category (excluding requester)
   */
  private async getEligibleApprovers(
    category: ApprovalCategory,
    excludeUserId: string,
  ): Promise<Array<{ id: string; email: string; name: string | null }>> {
    const roleRequirements: Record<ApprovalCategory, string[]> = {
      [ApprovalCategory.POLICY_LOCK]: ['ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.ADR_APPROVAL]: ['DEVELOPER', 'ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.HIGH_RISK_DECISION]: ['DEVELOPER', 'ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.SECURITY_EXCEPTION]: ['ADMIN', 'SUPER_ADMIN'],
      [ApprovalCategory.DATA_ACCESS]: ['ADMIN', 'SUPER_ADMIN'],
    };

    const requiredRoles = roleRequirements[category];

    return this.prisma.user.findMany({
      where: {
        role: { in: requiredRoles as any },
        id: { not: excludeUserId },
        deletedAt: null,
      },
      select: { id: true, email: true, name: true },
    });
  }

  /**
   * Notify about expiring approval requests (to be called by scheduled job)
   */
  async notifyExpiringApprovals(hoursBeforeExpiry: number = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() + hoursBeforeExpiry);

    let notified = 0;

    for (const approval of this.approvals.values()) {
      if (
        approval.status === ApprovalStatus.PENDING &&
        approval.expiresAt <= cutoffTime &&
        approval.expiresAt > new Date()
      ) {
        // Notify requester of upcoming expiry
        this.logger.warn(
          `Approval ${approval.id} expiring soon (${approval.expiresAt.toISOString()})`,
        );

        await this.createAuditEntry(
          'APPROVAL_EXPIRY_WARNING_SENT',
          approval.requesterId,
          approval.resourceType,
          approval.resourceId,
          {
            approvalId: approval.id,
            expiresAt: approval.expiresAt.toISOString(),
          },
        );

        notified++;
      }
    }

    return notified;
  }
}
