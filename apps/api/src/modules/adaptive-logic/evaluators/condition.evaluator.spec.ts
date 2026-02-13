import { ConditionEvaluator } from './condition.evaluator';
import { Condition } from '../types/rule.types';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
  });

  describe('equals operator', () => {
    it('should return true when values match exactly', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 'yes' };
      const responses = new Map([['q1', 'yes']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when values differ', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 'yes' };
      const responses = new Map([['q1', 'no']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle response objects with selectedOptionId', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 'opt_001' };
      const responses = new Map([['q1', { selectedOptionId: 'opt_001' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle response objects with text', () => {
      const condition: Condition = { field: 'q1', operator: 'eq', value: 'hello world' };
      const responses = new Map([['q1', { text: 'hello world' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle null values correctly', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: null };
      const responses = new Map([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when field is missing', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 'yes' };
      const responses = new Map<string, unknown>();

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('not_equals operator', () => {
    it('should return true when values differ', () => {
      const condition: Condition = { field: 'q1', operator: 'not_equals', value: 'yes' };
      const responses = new Map([['q1', 'no']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when values match', () => {
      const condition: Condition = { field: 'q1', operator: 'ne', value: 'yes' };
      const responses = new Map([['q1', 'yes']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('includes operator', () => {
    it('should return true when array includes value', () => {
      const condition: Condition = { field: 'q1', operator: 'includes', value: 'opt_b' };
      const responses = new Map([['q1', { selectedOptionIds: ['opt_a', 'opt_b', 'opt_c'] }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when array does not include value', () => {
      const condition: Condition = { field: 'q1', operator: 'includes', value: 'opt_d' };
      const responses = new Map([['q1', { selectedOptionIds: ['opt_a', 'opt_b'] }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle string contains', () => {
      const condition: Condition = { field: 'q1', operator: 'contains', value: 'world' };
      const responses = new Map([['q1', { text: 'hello world' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  describe('in operator', () => {
    it('should return true when value is in array of expected values', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: ['opt_a', 'opt_b', 'opt_c'],
      };
      const responses = new Map([['q1', { selectedOptionId: 'opt_b' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when value is not in array', () => {
      const condition: Condition = { field: 'q1', operator: 'in', value: ['opt_a', 'opt_b'] };
      const responses = new Map([['q1', { selectedOptionId: 'opt_c' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('numeric operators', () => {
    it('should handle greater_than', () => {
      const condition: Condition = { field: 'q1', operator: 'greater_than', value: 5 };
      const responses = new Map([['q1', { number: 10 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle less_than', () => {
      const condition: Condition = { field: 'q1', operator: 'lt', value: 5 };
      const responses = new Map([['q1', { number: 3 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle greater_than_or_equal', () => {
      const condition: Condition = { field: 'q1', operator: 'gte', value: 5 };
      const responses1 = new Map([['q1', { number: 5 }]]);
      const responses2 = new Map([['q1', { number: 6 }]]);

      expect(evaluator.evaluate(condition, responses1)).toBe(true);
      expect(evaluator.evaluate(condition, responses2)).toBe(true);
    });

    it('should handle between', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [1, 10] };
      const responses = new Map([['q1', { number: 5 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for between when out of range', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [1, 10] };
      const responses = new Map([['q1', { number: 15 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle rating values', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: 3 };
      const responses = new Map([['q1', { rating: 5 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  describe('is_empty operator', () => {
    it('should return true for null', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for undefined', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>();

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for empty string', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map([['q1', '']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for empty array', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map([['q1', []]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for empty selectedOptionIds', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map([['q1', { selectedOptionIds: [] }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for non-empty value', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map([['q1', 'hello']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('is_not_empty operator', () => {
    it('should return true for non-empty value', () => {
      const condition: Condition = { field: 'q1', operator: 'is_not_empty' };
      const responses = new Map([['q1', 'hello']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for empty value', () => {
      const condition: Condition = { field: 'q1', operator: 'is_not_empty' };
      const responses = new Map([['q1', '']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('string operators', () => {
    it('should handle starts_with', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: 'hello' };
      const responses = new Map([['q1', { text: 'hello world' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle ends_with', () => {
      const condition: Condition = { field: 'q1', operator: 'ends_with', value: 'world' };
      const responses = new Map([['q1', { text: 'hello world' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle matches (regex)', () => {
      const condition: Condition = { field: 'q1', operator: 'matches', value: '^\\d{3}-\\d{4}$' };
      const responses = new Map([['q1', { text: '123-4567' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for invalid regex', () => {
      const condition: Condition = { field: 'q1', operator: 'matches', value: '[invalid' };
      const responses = new Map([['q1', { text: 'test' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('nested conditions', () => {
    it('should evaluate AND nested conditions correctly', () => {
      const condition: Condition = {
        logicalOp: 'AND',
        nested: [
          { field: 'q1', operator: 'equals', value: 'yes' },
          { field: 'q2', operator: 'gt', value: 5 },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'yes'],
        ['q2', { number: 10 }],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when one AND condition fails', () => {
      const condition: Condition = {
        logicalOp: 'AND',
        nested: [
          { field: 'q1', operator: 'equals', value: 'yes' },
          { field: 'q2', operator: 'gt', value: 5 },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'yes'],
        ['q2', { number: 3 }],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should evaluate OR nested conditions correctly', () => {
      const condition: Condition = {
        logicalOp: 'OR',
        nested: [
          { field: 'q1', operator: 'equals', value: 'yes' },
          { field: 'q2', operator: 'gt', value: 5 },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'no'],
        ['q2', { number: 10 }],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when all OR conditions fail', () => {
      const condition: Condition = {
        logicalOp: 'OR',
        nested: [
          { field: 'q1', operator: 'equals', value: 'yes' },
          { field: 'q2', operator: 'gt', value: 5 },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'no'],
        ['q2', { number: 3 }],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle deeply nested conditions', () => {
      const condition: Condition = {
        logicalOp: 'AND',
        nested: [
          { field: 'q1', operator: 'equals', value: 'yes' },
          {
            logicalOp: 'OR',
            nested: [
              { field: 'q2', operator: 'gt', value: 5 },
              { field: 'q3', operator: 'equals', value: 'active' },
            ],
          },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'yes'],
        ['q2', { number: 3 }],
        ['q3', 'active'],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return true for empty condition', () => {
      const condition: Condition = {};
      const responses = new Map<string, unknown>();

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for condition with no field', () => {
      const condition: Condition = { operator: 'equals', value: 'test' };
      const responses = new Map<string, unknown>();

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for unknown operator', () => {
      const condition = { field: 'q1', operator: 'unknown_op' as any, value: 'test' };
      const responses = new Map([['q1', 'test']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });
});
