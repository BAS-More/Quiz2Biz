// ---------------------------------------------------------------------------
// Message Validation Tests — ensure createMessage enforces validation
// ---------------------------------------------------------------------------

import * as messageSchema from '../schemas/message';
import type { IMessage } from '../schemas/interfaces';

describe('Message Validation', () => {
  describe('validateMessage', () => {
    it('should reject DELEGATE message without instruction', () => {
      const msg: Partial<IMessage> = {
        task_id: 1,
        from_agent: 'cto',
        to_agent: 'backend_engineer',
        message_type: 'DELEGATE',
        payload: {}, // Missing instruction
      };

      const result = messageSchema.validateMessage(msg);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('payload.instruction');
      expect(result.errors[0].message).toContain('DELEGATE messages require an instruction');
    });

    it('should reject DELEGATE message from non-COO without predecessor_summary', () => {
      const msg: Partial<IMessage> = {
        task_id: 1,
        from_agent: 'cto',
        to_agent: 'backend_engineer',
        message_type: 'DELEGATE',
        payload: { instruction: 'Build the API' },
        // Missing predecessor_summary
      };

      const result = messageSchema.validateMessage(msg);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('predecessor_summary');
      expect(result.errors[0].message).toContain('require predecessorSummary');
    });

    it('should allow DELEGATE message from COO without predecessor_summary', () => {
      const msg: Partial<IMessage> = {
        task_id: 1,
        from_agent: 'coo',
        to_agent: 'cto',
        message_type: 'DELEGATE',
        payload: { instruction: 'Build the tech stack' },
        predecessor_summary: null,
      };

      const result = messageSchema.validateMessage(msg);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject REPORT message without validation_summary', () => {
      const msg: Partial<IMessage> = {
        task_id: 1,
        from_agent: 'backend_engineer',
        to_agent: 'cto',
        message_type: 'REPORT',
        payload: { output: { status: 'done' } },
        // Missing validation_summary
      };

      const result = messageSchema.validateMessage(msg);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('validation_summary');
      expect(result.errors[0].message).toContain('REPORT messages require a validationSummary');
    });

    it('should reject ESCALATE message without reason', () => {
      const msg: Partial<IMessage> = {
        task_id: 1,
        from_agent: 'backend_engineer',
        to_agent: 'cto',
        message_type: 'ESCALATE',
        payload: {}, // Missing reason
      };

      const result = messageSchema.validateMessage(msg);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('payload.reason');
      expect(result.errors[0].message).toContain('ESCALATE messages require a reason');
    });

    it('should reject message with invalid message_type', () => {
      const msg: Partial<IMessage> = {
        task_id: 1,
        from_agent: 'cto',
        to_agent: 'backend_engineer',
        message_type: 'INVALID' as any,
        payload: {},
      };

      const result = messageSchema.validateMessage(msg);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'message_type')).toBe(true);
    });

    it('should reject message without required fields', () => {
      const msg: Partial<IMessage> = {
        // Missing task_id, from_agent, to_agent, message_type
        payload: {},
      };

      const result = messageSchema.validateMessage(msg);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'task_id')).toBe(true);
      expect(result.errors.some(e => e.field === 'from_agent')).toBe(true);
      expect(result.errors.some(e => e.field === 'to_agent')).toBe(true);
    });
  });

  describe('Builder functions', () => {
    it('buildDelegateMessage should create valid message structure', () => {
      const msg = messageSchema.buildDelegateMessage(
        { taskId: 1, fromAgent: 'coo', toAgent: 'cto' },
        'Build the system',
        null,
      );

      const result = messageSchema.validateMessage(msg);
      expect(result.valid).toBe(true);
    });

    it('buildReportMessage should create valid message structure', () => {
      const validationSummary = messageSchema.buildEmptyValidationSummary();
      
      const msg = messageSchema.buildReportMessage(
        { taskId: 1, fromAgent: 'cto', toAgent: 'coo' },
        { result: 'success' },
        validationSummary,
        'Work completed',
      );

      const result = messageSchema.validateMessage(msg);
      expect(result.valid).toBe(true);
    });

    it('buildEscalateMessage should create valid message structure', () => {
      const msg = messageSchema.buildEscalateMessage(
        { taskId: 1, fromAgent: 'backend_engineer', toAgent: 'cto' },
        'Need help with architecture decision',
      );

      const result = messageSchema.validateMessage(msg);
      expect(result.valid).toBe(true);
    });

    it('buildStatusMessage should create valid message structure', () => {
      const msg = messageSchema.buildStatusMessage(
        { taskId: 1, fromAgent: 'backend_engineer', toAgent: 'cto' },
        { progress: 50 },
      );

      const result = messageSchema.validateMessage(msg);
      expect(result.valid).toBe(true);
    });

    it('buildRedirectMessage should create valid message structure', () => {
      const msg = messageSchema.buildRedirectMessage(
        { taskId: 1, fromAgent: 'backend_engineer', toAgent: 'cto' },
        'Wrong team',
        'frontend_engineer',
      );

      const result = messageSchema.validateMessage(msg);
      expect(result.valid).toBe(true);
    });
  });
});
