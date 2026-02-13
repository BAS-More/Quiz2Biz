import {
  SetMetadata,
  applyDecorators,
  UseGuards,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApprovalCategory, ApprovalWorkflowService } from '../approval-workflow.service';

/**
 * Metadata key for approval requirements
 */
export const APPROVAL_REQUIRED_KEY = 'approval_required';

/**
 * Approval requirement options
 */
export interface ApprovalRequirementOptions {
  /** Category of approval required */
  category: ApprovalCategory;

  /** Resource ID parameter name (from request params or body) */
  resourceIdParam?: string;

  /** Resource type for approval tracking */
  resourceType: string;

  /** Whether to allow bypassing if user is admin */
  allowAdminBypass?: boolean;

  /** Custom error message */
  errorMessage?: string;
}

/**
 * @RequireApproval Decorator
 *
 * Enforces two-person rule by requiring prior approval before execution.
 * Used for high-risk operations like:
 * - Policy locks
 * - ADR approvals
 * - Security exceptions
 *
 * Usage:
 * ```typescript
 * @RequireApproval({
 *   category: ApprovalCategory.POLICY_LOCK,
 *   resourceType: 'Policy',
 *   resourceIdParam: 'policyId',
 * })
 * @Post(':policyId/lock')
 * async lockPolicy(@Param('policyId') policyId: string) { ... }
 * ```
 */
export function RequireApproval(options: ApprovalRequirementOptions) {
  return applyDecorators(SetMetadata(APPROVAL_REQUIRED_KEY, options), UseGuards(ApprovalGuard));
}

/**
 * ApprovalGuard - Enforces approval requirements
 *
 * Checks if the resource has an approved approval request
 * before allowing the operation to proceed.
 */
@Injectable()
export class ApprovalGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly approvalService: ApprovalWorkflowService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<ApprovalRequirementOptions>(
      APPROVAL_REQUIRED_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check admin bypass
    if (options.allowAdminBypass && user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Get resource ID from params or body
    const resourceId = this.getResourceId(request, options);

    if (!resourceId) {
      throw new ForbiddenException('Resource ID not found in request');
    }

    // Check if resource has approved approval
    const approvalStatus = await this.approvalService.hasApproval(
      options.resourceType,
      resourceId,
      options.category,
    );

    if (!approvalStatus.hasApproved) {
      if (approvalStatus.hasPending) {
        throw new ForbiddenException(
          options.errorMessage || `This action requires approval. A request is pending review.`,
        );
      }

      throw new ForbiddenException(
        options.errorMessage ||
          `This action requires two-person approval. Please request approval first.`,
      );
    }

    return true;
  }

  /**
   * Extract resource ID from request
   */
  private getResourceId(request: any, options: ApprovalRequirementOptions): string | null {
    const paramName = options.resourceIdParam || 'id';

    // Check route params
    if (request.params?.[paramName]) {
      return request.params[paramName];
    }

    // Check body
    if (request.body?.[paramName]) {
      return request.body[paramName];
    }

    // Check query
    if (request.query?.[paramName]) {
      return request.query[paramName];
    }

    return null;
  }
}

/**
 * @RequirePolicyApproval - Shorthand decorator for policy locks
 */
export function RequirePolicyApproval(resourceIdParam: string = 'policyId') {
  return RequireApproval({
    category: ApprovalCategory.POLICY_LOCK,
    resourceType: 'Policy',
    resourceIdParam,
    errorMessage: 'Policy lock requires two-person approval',
  });
}

/**
 * @RequireADRApproval - Shorthand decorator for ADR approvals
 */
export function RequireADRApproval(resourceIdParam: string = 'adrId') {
  return RequireApproval({
    category: ApprovalCategory.ADR_APPROVAL,
    resourceType: 'ADR',
    resourceIdParam,
    errorMessage: 'ADR requires peer approval before finalization',
  });
}

/**
 * @RequireDecisionApproval - Shorthand decorator for high-risk decisions
 */
export function RequireDecisionApproval(resourceIdParam: string = 'decisionId') {
  return RequireApproval({
    category: ApprovalCategory.HIGH_RISK_DECISION,
    resourceType: 'DecisionLog',
    resourceIdParam,
    errorMessage: 'High-risk decision requires two-person approval',
  });
}

/**
 * @RequireSecurityExceptionApproval - Shorthand for security exceptions
 */
export function RequireSecurityExceptionApproval(resourceIdParam: string = 'exceptionId') {
  return RequireApproval({
    category: ApprovalCategory.SECURITY_EXCEPTION,
    resourceType: 'SecurityException',
    resourceIdParam,
    allowAdminBypass: false, // Security exceptions should never bypass
    errorMessage: 'Security exception requires explicit approval',
  });
}
