/**
 * @fileoverview Tests for modules/decision-log barrel exports
 */
import * as decisionLog from './index';

describe('modules/decision-log index', () => {
  it('should export DecisionLogModule', () => {
    expect(decisionLog.DecisionLogModule).toBeDefined();
  });

  it('should export DecisionLogService', () => {
    expect(decisionLog.DecisionLogService).toBeDefined();
  });

  it('should export DecisionLogController', () => {
    expect(decisionLog.DecisionLogController).toBeDefined();
  });

  it('should export ApprovalWorkflowService', () => {
    expect(decisionLog.ApprovalWorkflowService).toBeDefined();
  });

  it('should export RequireApproval decorator', () => {
    expect(decisionLog.RequireApproval).toBeDefined();
  });

  it('should export DTOs', () => {
    expect(decisionLog.CreateDecisionDto).toBeDefined();
  });
});
