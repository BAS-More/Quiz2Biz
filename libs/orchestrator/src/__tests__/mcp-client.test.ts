// ---------------------------------------------------------------------------
// MCP Client Tests — validation and security tests for updateTask
// ---------------------------------------------------------------------------

import { updateTask } from '../mcp/client';
import type { ITask } from '../schemas/interfaces';

// Mock the query function to avoid actual database calls
jest.mock('../mcp/client', () => {
  const actual = jest.requireActual('../mcp/client');
  return {
    ...actual,
    query: jest.fn().mockResolvedValue({ rows: [] }),
  };
});

describe('updateTask', () => {
  const validTaskId = 123;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('field validation', () => {
    it('should accept valid fields from allowed list', async () => {
      const validUpdate: Partial<ITask> = {
        status: 'ACTIVE',
        assigned_agent: 'agent-1',
        tokens_consumed: 100,
      };

      await expect(updateTask(validTaskId, validUpdate)).resolves.not.toThrow();
    });

    it('should throw error for invalid field', async () => {
      const invalidUpdate = {
        status: 'ACTIVE',
        invalid_field: 'bad_value',
      } as any;

      await expect(updateTask(validTaskId, invalidUpdate)).rejects.toThrow(
        /Invalid field\(s\) in task update: invalid_field/
      );
    });

    it('should throw error for multiple invalid fields', async () => {
      const invalidUpdate = {
        status: 'ACTIVE',
        bad_field_1: 'value1',
        bad_field_2: 'value2',
      } as any;

      await expect(updateTask(validTaskId, invalidUpdate)).rejects.toThrow(
        /Invalid field\(s\) in task update: bad_field_1, bad_field_2/
      );
    });

    it('should include allowed fields in error message', async () => {
      const invalidUpdate = {
        malicious_field: 'injection_attempt',
      } as any;

      await expect(updateTask(validTaskId, invalidUpdate)).rejects.toThrow(
        /Allowed fields:.*tier.*task_type.*project.*module/
      );
    });

    it('should accept empty updates object', async () => {
      const emptyUpdate: Partial<ITask> = {};

      await expect(updateTask(validTaskId, emptyUpdate)).resolves.not.toThrow();
    });

    it('should reject task_id field in updates', async () => {
      // task_id is readonly and should not be in allowed list
      const updateWithId = {
        task_id: 999,
        status: 'COMPLETE',
      } as any;

      await expect(updateTask(validTaskId, updateWithId)).rejects.toThrow(
        /Invalid field\(s\) in task update: task_id/
      );
    });

    it('should reject created_at field in updates', async () => {
      // created_at is auto-managed and should not be in allowed list
      const updateWithCreatedAt = {
        created_at: '2024-01-01T00:00:00Z',
        status: 'COMPLETE',
      } as any;

      await expect(updateTask(validTaskId, updateWithCreatedAt)).rejects.toThrow(
        /Invalid field\(s\) in task update: created_at/
      );
    });

    it('should accept all allowed timestamp fields', async () => {
      const timestampUpdate: Partial<ITask> = {
        started_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T11:00:00Z',
      };

      await expect(updateTask(validTaskId, timestampUpdate)).resolves.not.toThrow();
    });

    it('should accept all allowed nullable fields', async () => {
      const nullableUpdate: Partial<ITask> = {
        project: null,
        module: null,
        queue_position: null,
        assigned_agent: null,
        delegated_by: null,
        token_budget: null,
      };

      await expect(updateTask(validTaskId, nullableUpdate)).resolves.not.toThrow();
    });

    it('should prevent SQL injection attempts via field names', async () => {
      const sqlInjectionAttempt = {
        'status; DROP TABLE tasks; --': 'malicious',
      } as any;

      await expect(updateTask(validTaskId, sqlInjectionAttempt)).rejects.toThrow(
        /Invalid field\(s\) in task update/
      );
    });

    it('should prevent field name obfuscation attempts', async () => {
      const obfuscationAttempt = {
        ' status ': 'COMPLETE', // spaces around field name
      } as any;

      await expect(updateTask(validTaskId, obfuscationAttempt)).rejects.toThrow(
        /Invalid field\(s\) in task update/
      );
    });
  });

  describe('type safety', () => {
    it('should accept complex object in output field', async () => {
      const complexUpdate: Partial<ITask> = {
        output: { result: 'success', data: { nested: 'value' } },
      };

      await expect(updateTask(validTaskId, complexUpdate)).resolves.not.toThrow();
    });

    it('should accept validation_summary object', async () => {
      const validationUpdate: Partial<ITask> = {
        validation_summary: {
          tier_1: {
            status: 'PASS',
            checksRun: 5,
            checksPassed: 5,
            errors: [],
          },
          tier_2: {
            status: 'FAIL',
            model: 'gpt-4',
            criteriaCount: 10,
            criteriaPassed: 7,
            criteriaResults: [],
          },
          tier_3: {
            status: 'AWAITING_APPROVAL',
          },
        },
      };

      await expect(updateTask(validTaskId, validationUpdate)).resolves.not.toThrow();
    });
  });
});
