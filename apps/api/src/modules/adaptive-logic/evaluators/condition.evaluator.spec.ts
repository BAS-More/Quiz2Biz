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

  // =====================================================================
  // BRANCH COVERAGE — equals with response object patterns
  // =====================================================================
  describe('equals - additional object patterns', () => {
    it('should match on response object with number property', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 42 };
      const responses = new Map<string, unknown>([['q1', { number: 42 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when number property does not match', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 42 };
      const responses = new Map<string, unknown>([['q1', { number: 99 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should match on response object with rating property', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 5 };
      const responses = new Map<string, unknown>([['q1', { rating: 5 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when rating property does not match', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 5 };
      const responses = new Map<string, unknown>([['q1', { rating: 3 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should fall back to JSON.stringify comparison for complex objects', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'equals',
        value: { custom: 'data' },
      };
      const responses = new Map<string, unknown>([['q1', { custom: 'data' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for JSON.stringify mismatch on complex objects', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'equals',
        value: { custom: 'data' },
      };
      const responses = new Map<string, unknown>([['q1', { custom: 'other' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle object where no recognized property matches but JSON matches', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'eq',
        value: { unrecognized: 'field' },
      };
      const responses = new Map<string, unknown>([['q1', { unrecognized: 'field' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle actual being null object (not null primitive)', () => {
      const condition: Condition = { field: 'q1', operator: 'equals', value: 'test' };
      // null is typeof 'object' but the code checks actual !== null
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — not_equals with object types
  // =====================================================================
  describe('not_equals - additional patterns', () => {
    it('should return true when selectedOptionId does not match via ne alias', () => {
      const condition: Condition = { field: 'q1', operator: 'ne', value: 'opt_001' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: 'opt_002' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when selectedOptionId matches via not_equals', () => {
      const condition: Condition = { field: 'q1', operator: 'not_equals', value: 'opt_001' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: 'opt_001' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — includes / not_includes additional paths
  // =====================================================================
  describe('includes - additional branch paths', () => {
    it('should return true when plain array includes value', () => {
      const condition: Condition = { field: 'q1', operator: 'includes', value: 'b' };
      const responses = new Map<string, unknown>([['q1', ['a', 'b', 'c']]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when plain array does not include value', () => {
      const condition: Condition = { field: 'q1', operator: 'includes', value: 'd' };
      const responses = new Map<string, unknown>([['q1', ['a', 'b', 'c']]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return true when direct string contains expected string', () => {
      const condition: Condition = { field: 'q1', operator: 'contains', value: 'world' };
      const responses = new Map<string, unknown>([['q1', 'hello world']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when direct string does not contain expected', () => {
      const condition: Condition = { field: 'q1', operator: 'contains', value: 'xyz' };
      const responses = new Map<string, unknown>([['q1', 'hello world']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for non-string non-array non-object actual values', () => {
      const condition: Condition = { field: 'q1', operator: 'includes', value: 5 };
      const responses = new Map<string, unknown>([['q1', 42]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when object has selectedOptionIds that do not include value', () => {
      const condition: Condition = { field: 'q1', operator: 'includes', value: 'opt_z' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionIds: ['opt_a'] }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle text object where text does not contain expected', () => {
      const condition: Condition = { field: 'q1', operator: 'contains', value: 'xyz' };
      const responses = new Map<string, unknown>([['q1', { text: 'hello' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('not_includes / not_contains operators', () => {
    it('should return true when array does not include value', () => {
      const condition: Condition = { field: 'q1', operator: 'not_includes', value: 'opt_d' };
      const responses = new Map<string, unknown>([
        ['q1', { selectedOptionIds: ['opt_a', 'opt_b'] }],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when array includes value', () => {
      const condition: Condition = { field: 'q1', operator: 'not_includes', value: 'opt_a' };
      const responses = new Map<string, unknown>([
        ['q1', { selectedOptionIds: ['opt_a', 'opt_b'] }],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should work with not_contains alias for text', () => {
      const condition: Condition = { field: 'q1', operator: 'not_contains', value: 'missing' };
      const responses = new Map<string, unknown>([['q1', { text: 'hello world' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when text contains expected via not_contains', () => {
      const condition: Condition = { field: 'q1', operator: 'not_contains', value: 'hello' };
      const responses = new Map<string, unknown>([['q1', { text: 'hello world' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return true for not_includes on direct string without match', () => {
      const condition: Condition = { field: 'q1', operator: 'not_includes', value: 'xyz' };
      const responses = new Map<string, unknown>([['q1', 'hello world']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for not_includes on direct string that contains the value', () => {
      const condition: Condition = { field: 'q1', operator: 'not_includes', value: 'hello' };
      const responses = new Map<string, unknown>([['q1', 'hello world']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — in / not_in additional paths
  // =====================================================================
  describe('in - additional branch paths', () => {
    it('should return false when expected is not an array', () => {
      const condition: Condition = { field: 'q1', operator: 'in', value: 'not_array' };
      const responses = new Map<string, unknown>([['q1', 'test']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should match object with text property in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: ['hello', 'world'],
      };
      const responses = new Map<string, unknown>([['q1', { text: 'hello' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for object with text not in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: ['hello', 'world'],
      };
      const responses = new Map<string, unknown>([['q1', { text: 'other' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should match object with number property in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: [1, 2, 3],
      };
      const responses = new Map<string, unknown>([['q1', { number: 2 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for object with number not in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: [1, 2, 3],
      };
      const responses = new Map<string, unknown>([['q1', { number: 5 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should match plain value directly in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: ['a', 'b', 'c'],
      };
      const responses = new Map<string, unknown>([['q1', 'b']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for plain value not in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: ['a', 'b', 'c'],
      };
      const responses = new Map<string, unknown>([['q1', 'd']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle object without recognized properties by falling through to includes(actual)', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'in',
        value: ['a', 'b'],
      };
      // Object with no selectedOptionId/text/number properties
      const responses = new Map<string, unknown>([['q1', { custom: 'thing' }]]);

      // expected.includes(actual) → false since the object won't match a string
      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('not_in operator', () => {
    it('should return true when value is not in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'not_in',
        value: ['a', 'b', 'c'],
      };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: 'd' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when value is in expected array', () => {
      const condition: Condition = {
        field: 'q1',
        operator: 'not_in',
        value: ['a', 'b', 'c'],
      };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: 'b' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return true when expected is not an array for not_in', () => {
      const condition: Condition = { field: 'q1', operator: 'not_in', value: 'not_array' };
      const responses = new Map<string, unknown>([['q1', 'test']]);

      // not_in delegates to !isIn, isIn returns false for non-array → !false = true
      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — numeric operators: edge cases and null handling
  // =====================================================================
  describe('numeric operators - edge cases', () => {
    it('should return false for greater_than when actual is NaN string', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: 5 };
      const responses = new Map<string, unknown>([['q1', 'not_a_number']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for greater_than when expected is NaN string', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: 'not_a_number' };
      const responses = new Map<string, unknown>([['q1', 10]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for greater_than when values are equal', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: 5 };
      const responses = new Map<string, unknown>([['q1', 5]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for less_than when values are equal', () => {
      const condition: Condition = { field: 'q1', operator: 'lt', value: 5 };
      const responses = new Map<string, unknown>([['q1', 5]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return true for less_than_or_equal when values are equal', () => {
      const condition: Condition = { field: 'q1', operator: 'lte', value: 5 };
      const responses = new Map<string, unknown>([['q1', 5]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for less_than_or_equal when actual is less', () => {
      const condition: Condition = { field: 'q1', operator: 'lte', value: 5 };
      const responses = new Map<string, unknown>([['q1', 3]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for less_than_or_equal when actual is greater', () => {
      const condition: Condition = { field: 'q1', operator: 'lte', value: 5 };
      const responses = new Map<string, unknown>([['q1', 7]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for less_than when actual is null', () => {
      const condition: Condition = { field: 'q1', operator: 'lt', value: 5 };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for greater_than_or_equal when actual is null', () => {
      const condition: Condition = { field: 'q1', operator: 'gte', value: 5 };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for less_than_or_equal when actual is null', () => {
      const condition: Condition = { field: 'q1', operator: 'lte', value: 5 };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should parse string numbers for greater_than', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: '5' };
      const responses = new Map<string, unknown>([['q1', '10']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should parse string numbers for less_than', () => {
      const condition: Condition = { field: 'q1', operator: 'lt', value: '10' };
      const responses = new Map<string, unknown>([['q1', '5']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle rating values for less_than', () => {
      const condition: Condition = { field: 'q1', operator: 'lt', value: 5 };
      const responses = new Map<string, unknown>([['q1', { rating: 3 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for greaterThanOrEqual when actual < expected', () => {
      const condition: Condition = { field: 'q1', operator: 'gte', value: 10 };
      const responses = new Map<string, unknown>([['q1', 5]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for extractNumber with boolean value', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: 5 };
      const responses = new Map<string, unknown>([['q1', true]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for extractNumber with object without number/rating', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: 5 };
      const responses = new Map<string, unknown>([['q1', { text: 'hello' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — between: edge cases
  // =====================================================================
  describe('between - edge cases', () => {
    it('should return false when expected is not an array', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: 5 };
      const responses = new Map<string, unknown>([['q1', 3]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when expected array has wrong length', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [1, 5, 10] };
      const responses = new Map<string, unknown>([['q1', 3]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when actual value is null', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [1, 10] };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when min value in range is non-numeric', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: ['abc', 10] };
      const responses = new Map<string, unknown>([['q1', 5]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when max value in range is non-numeric', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [1, 'abc'] };
      const responses = new Map<string, unknown>([['q1', 5]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return true at exact boundary of min', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [5, 10] };
      const responses = new Map<string, unknown>([['q1', 5]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true at exact boundary of max', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [5, 10] };
      const responses = new Map<string, unknown>([['q1', 10]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should work with response objects containing number property', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [1, 10] };
      const responses = new Map<string, unknown>([['q1', { number: 5 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should work with response objects containing rating property', () => {
      const condition: Condition = { field: 'q1', operator: 'between', value: [1, 5] };
      const responses = new Map<string, unknown>([['q1', { rating: 3 }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — isEmpty additional branches
  // =====================================================================
  describe('is_empty - additional branches', () => {
    it('should return true for whitespace-only string', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', '   ']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for object with text equal to null', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', { text: null }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for object with text equal to empty string', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', { text: '' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for object with selectedOptionId equal to null', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: null }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for object with valid text', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', { text: 'content' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for object with valid selectedOptionId', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: 'opt_1' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for non-empty object without recognized empty patterns', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', { custom: 'data' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for a number value', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', 0]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for a boolean false', () => {
      const condition: Condition = { field: 'q1', operator: 'is_empty' };
      const responses = new Map<string, unknown>([['q1', false]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  describe('is_not_empty - additional branches', () => {
    it('should return false for null', () => {
      const condition: Condition = { field: 'q1', operator: 'is_not_empty' };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false for empty array', () => {
      const condition: Condition = { field: 'q1', operator: 'is_not_empty' };
      const responses = new Map<string, unknown>([['q1', []]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return true for non-empty array', () => {
      const condition: Condition = { field: 'q1', operator: 'is_not_empty' };
      const responses = new Map<string, unknown>([['q1', ['item']]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return true for object with selectedOptionIds containing items', () => {
      const condition: Condition = { field: 'q1', operator: 'is_not_empty' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionIds: ['opt_1'] }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — string operators: direct strings, null handling
  // =====================================================================
  describe('starts_with - additional branches', () => {
    it('should return true for direct string value starting with expected', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: 'he' };
      const responses = new Map<string, unknown>([['q1', 'hello']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false for direct string value not starting with expected', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: 'xyz' };
      const responses = new Map<string, unknown>([['q1', 'hello']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when actual is null', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: 'he' };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when expected is null', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: null };
      const responses = new Map<string, unknown>([['q1', 'hello']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when actual is a number', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: '5' };
      const responses = new Map<string, unknown>([['q1', 55]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should extract string from selectedOptionId for starts_with', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: 'opt' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: 'opt_123' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  describe('ends_with - additional branches', () => {
    it('should return true for direct string value ending with expected', () => {
      const condition: Condition = { field: 'q1', operator: 'ends_with', value: 'lo' };
      const responses = new Map<string, unknown>([['q1', 'hello']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when actual is null', () => {
      const condition: Condition = { field: 'q1', operator: 'ends_with', value: 'lo' };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when expected is null', () => {
      const condition: Condition = { field: 'q1', operator: 'ends_with', value: null };
      const responses = new Map<string, unknown>([['q1', 'hello']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when actual is a non-string non-object', () => {
      const condition: Condition = { field: 'q1', operator: 'ends_with', value: '5' };
      const responses = new Map<string, unknown>([['q1', 55]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — matches: null/non-string handling
  // =====================================================================
  describe('matches - additional branches', () => {
    it('should return false when actual string is null', () => {
      const condition: Condition = { field: 'q1', operator: 'matches', value: '.*' };
      const responses = new Map<string, unknown>([['q1', null]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when expected is not a string', () => {
      const condition: Condition = { field: 'q1', operator: 'matches', value: 42 };
      const responses = new Map<string, unknown>([['q1', 'test']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return false when actual is a non-string, non-object value', () => {
      const condition: Condition = { field: 'q1', operator: 'matches', value: '\\d+' };
      const responses = new Map<string, unknown>([['q1', 42]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should match direct string value', () => {
      const condition: Condition = { field: 'q1', operator: 'matches', value: '^hello' };
      const responses = new Map<string, unknown>([['q1', 'hello world']]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return false when regex does not match', () => {
      const condition: Condition = { field: 'q1', operator: 'matches', value: '^xyz' };
      const responses = new Map<string, unknown>([['q1', 'hello world']]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — extractNumber: additional paths
  // =====================================================================
  describe('extractNumber - via numeric operators', () => {
    it('should handle object with number property that is not a number type', () => {
      // obj.number exists but typeof is not 'number' — falls through
      const condition: Condition = { field: 'q1', operator: 'gt', value: 5 };
      const responses = new Map<string, unknown>([['q1', { number: 'ten' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle object with rating property that is not a number type', () => {
      const condition: Condition = { field: 'q1', operator: 'gt', value: 5 };
      const responses = new Map<string, unknown>([['q1', { rating: 'high' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — nested conditions: default logicalOp
  // =====================================================================
  describe('nested conditions - default logicalOp', () => {
    it('should default to AND when logicalOp is not specified', () => {
      const condition: Condition = {
        nested: [
          { field: 'q1', operator: 'equals', value: 'yes' },
          { field: 'q2', operator: 'equals', value: 'yes' },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'yes'],
        ['q2', 'yes'],
      ]);

      // Without logicalOp, defaults to 'AND'
      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should fail with default AND when one nested condition fails', () => {
      const condition: Condition = {
        nested: [
          { field: 'q1', operator: 'equals', value: 'yes' },
          { field: 'q2', operator: 'equals', value: 'yes' },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'yes'],
        ['q2', 'no'],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should handle empty nested array by returning true (no conditions)', () => {
      const condition: Condition = {
        nested: [],
      };
      const responses = new Map<string, unknown>();

      // empty nested → condition.nested.length === 0 → falls through to field check
      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should handle triple-nested conditions', () => {
      const condition: Condition = {
        logicalOp: 'OR',
        nested: [
          {
            logicalOp: 'AND',
            nested: [
              { field: 'q1', operator: 'equals', value: 'a' },
              {
                logicalOp: 'OR',
                nested: [
                  { field: 'q2', operator: 'gt', value: 10 },
                  { field: 'q3', operator: 'is_empty' },
                ],
              },
            ],
          },
          { field: 'q4', operator: 'equals', value: 'b' },
        ],
      };
      const responses = new Map<string, unknown>([
        ['q1', 'a'],
        ['q2', 5], // fails gt 10
        ['q3', null], // passes is_empty → inner OR passes → inner AND passes → outer OR passes
        ['q4', 'x'],
      ]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — condition with no operator
  // =====================================================================
  describe('condition with field but no operator', () => {
    it('should return true when field is present but operator is missing', () => {
      const condition: Condition = { field: 'q1' };
      const responses = new Map<string, unknown>([['q1', 'test']]);

      // !condition.operator → returns true
      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });
  });

  // =====================================================================
  // BRANCH COVERAGE — extractString: additional paths
  // =====================================================================
  describe('extractString - via string operators', () => {
    it('should extract string from object with selectedOptionId for ends_with', () => {
      const condition: Condition = { field: 'q1', operator: 'ends_with', value: '123' };
      const responses = new Map<string, unknown>([['q1', { selectedOptionId: 'opt_123' }]]);

      expect(evaluator.evaluate(condition, responses)).toBe(true);
    });

    it('should return null for non-string non-object expected value in starts_with', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: 42 };
      const responses = new Map<string, unknown>([['q1', 'hello']]);

      // extractString(42) → null → returns false
      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });

    it('should return null for object without text or selectedOptionId', () => {
      const condition: Condition = { field: 'q1', operator: 'starts_with', value: 'abc' };
      const responses = new Map<string, unknown>([['q1', { number: 42 }]]);

      // extractString({ number: 42 }) → null → returns false
      expect(evaluator.evaluate(condition, responses)).toBe(false);
    });
  });
});
