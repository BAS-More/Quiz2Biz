import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RequireApproval,
  RequirePolicyApproval,
  RequireADRApproval,
  RequireDecisionApproval,
  RequireSecurityExceptionApproval,
  ApprovalGuard,
  APPROVAL_REQUIRED_KEY,
  ApprovalRequirementOptions,
} from './require-approval.decorator';
import { ApprovalCategory, ApprovalWorkflowService } from '../approval-workflow.service';

describe('RequireApproval Decorator', () => {
  describe('decorator factory functions', () => {
    it('should create RequireApproval decorator with options', () => {
      const decorator = RequireApproval({
        category: ApprovalCategory.POLICY_LOCK,
        resourceType: 'Policy',
        resourceIdParam: 'policyId',
      });
      expect(decorator).toBeDefined();
    });

    it('should create RequirePolicyApproval decorator', () => {
      const decorator = RequirePolicyApproval();
      expect(decorator).toBeDefined();
    });

    it('should create RequirePolicyApproval decorator with custom param', () => {
      const decorator = RequirePolicyApproval('customId');
      expect(decorator).toBeDefined();
    });

    it('should create RequireADRApproval decorator', () => {
      const decorator = RequireADRApproval();
      expect(decorator).toBeDefined();
    });

    it('should create RequireADRApproval decorator with custom param', () => {
      const decorator = RequireADRApproval('customAdrId');
      expect(decorator).toBeDefined();
    });

    it('should create RequireDecisionApproval decorator', () => {
      const decorator = RequireDecisionApproval();
      expect(decorator).toBeDefined();
    });

    it('should create RequireDecisionApproval decorator with custom param', () => {
      const decorator = RequireDecisionApproval('customDecisionId');
      expect(decorator).toBeDefined();
    });

    it('should create RequireSecurityExceptionApproval decorator', () => {
      const decorator = RequireSecurityExceptionApproval();
      expect(decorator).toBeDefined();
    });

    it('should create RequireSecurityExceptionApproval decorator with custom param', () => {
      const decorator = RequireSecurityExceptionApproval('customExceptionId');
      expect(decorator).toBeDefined();
    });
  });
});

describe('ApprovalGuard', () => {
  let guard: ApprovalGuard;
  let reflector: Reflector;
  let approvalService: ApprovalWorkflowService;

  const mockReflector = {
    get: jest.fn(),
  };

  const mockApprovalService = {
    hasApproval: jest.fn(),
  };

  const createMockContext = (
    overrides: {
      user?: any;
      params?: any;
      body?: any;
      query?: any;
    } = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: overrides.user,
          params: overrides.params || {},
          body: overrides.body || {},
          query: overrides.query || {},
        }),
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = mockReflector as unknown as Reflector;
    approvalService = mockApprovalService as unknown as ApprovalWorkflowService;
    guard = new ApprovalGuard(reflector, approvalService);
    jest.clearAllMocks();
  });

  it('should return true when no approval options set', async () => {
    mockReflector.get.mockReturnValue(undefined);
    const context = createMockContext();
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when no user', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
    };
    mockReflector.get.mockReturnValue(options);
    const context = createMockContext({ user: undefined });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
  });

  it('should allow admin bypass when allowAdminBypass is true', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      allowAdminBypass: true,
    };
    mockReflector.get.mockReturnValue(options);
    const context = createMockContext({ user: { role: 'SUPER_ADMIN' } });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should not allow admin bypass when allowAdminBypass is false', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'id',
      allowAdminBypass: false,
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: true });
    const context = createMockContext({
      user: { role: 'SUPER_ADMIN' },
      params: { id: 'resource-1' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockApprovalService.hasApproval).toHaveBeenCalled();
  });

  it('should throw ForbiddenException when resource ID not found', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'missingParam',
    };
    mockReflector.get.mockReturnValue(options);
    const context = createMockContext({ user: { id: 'user-1' } });
    await expect(guard.canActivate(context)).rejects.toThrow('Resource ID not found in request');
  });

  it('should extract resource ID from params', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'policyId',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: true });
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { policyId: 'policy-123' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockApprovalService.hasApproval).toHaveBeenCalledWith(
      'Policy',
      'policy-123',
      ApprovalCategory.POLICY_LOCK,
    );
  });

  it('should extract resource ID from body when not in params', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'policyId',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: true });
    const context = createMockContext({
      user: { id: 'user-1' },
      body: { policyId: 'policy-456' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockApprovalService.hasApproval).toHaveBeenCalledWith(
      'Policy',
      'policy-456',
      ApprovalCategory.POLICY_LOCK,
    );
  });

  it('should extract resource ID from query when not in params or body', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'policyId',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: true });
    const context = createMockContext({
      user: { id: 'user-1' },
      query: { policyId: 'policy-789' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockApprovalService.hasApproval).toHaveBeenCalledWith(
      'Policy',
      'policy-789',
      ApprovalCategory.POLICY_LOCK,
    );
  });

  it('should use default "id" param name when resourceIdParam not specified', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: true });
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { id: 'resource-default' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockApprovalService.hasApproval).toHaveBeenCalledWith(
      'Policy',
      'resource-default',
      ApprovalCategory.POLICY_LOCK,
    );
  });

  it('should throw when pending approval exists', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'id',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: false, hasPending: true });
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { id: 'resource-1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      'requires approval. A request is pending',
    );
  });

  it('should throw with custom error message when pending', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'id',
      errorMessage: 'Custom pending message',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: false, hasPending: true });
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { id: 'resource-1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow('Custom pending message');
  });

  it('should throw when no approval exists', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'id',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: false, hasPending: false });
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { id: 'resource-1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow('requires two-person approval');
  });

  it('should throw with custom error message when no approval', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.POLICY_LOCK,
      resourceType: 'Policy',
      resourceIdParam: 'id',
      errorMessage: 'Custom no approval message',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: false, hasPending: false });
    const context = createMockContext({
      user: { id: 'user-1' },
      params: { id: 'resource-1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow('Custom no approval message');
  });

  it('should return true when approved', async () => {
    const options: ApprovalRequirementOptions = {
      category: ApprovalCategory.ADR_APPROVAL,
      resourceType: 'ADR',
      resourceIdParam: 'adrId',
    };
    mockReflector.get.mockReturnValue(options);
    mockApprovalService.hasApproval.mockResolvedValue({ hasApproved: true });
    const context = createMockContext({
      user: { id: 'user-1', role: 'USER' },
      params: { adrId: 'adr-123' },
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
