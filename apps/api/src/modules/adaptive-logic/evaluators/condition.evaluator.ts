import { Injectable } from '@nestjs/common';
import { Condition, ConditionOperator, LogicalOperator } from '../types/rule.types';

@Injectable()
export class ConditionEvaluator {
  /**
   * Evaluate a single condition or nested conditions
   */
  evaluate(condition: Condition, responses: Map<string, unknown>): boolean {
    // Handle nested conditions
    if (condition.nested && condition.nested.length > 0) {
      return this.evaluateNested(condition.nested, condition.logicalOp || 'AND', responses);
    }

    // Evaluate single condition
    if (!condition.field || !condition.operator) {
      return true; // No condition means always true
    }

    const value = responses.get(condition.field);
    return this.evaluateOperator(condition.operator, value, condition.value);
  }

  /**
   * Evaluate nested conditions with logical operator
   */
  private evaluateNested(
    conditions: Condition[],
    operator: LogicalOperator,
    responses: Map<string, unknown>,
  ): boolean {
    const results = conditions.map((c) => this.evaluate(c, responses));

    if (operator === 'AND') {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  /**
   * Evaluate a single operator
   */
  private evaluateOperator(
    operator: ConditionOperator,
    actualValue: unknown,
    expectedValue: unknown,
  ): boolean {
    switch (operator) {
      case 'equals':
      case 'eq':
        return this.equals(actualValue, expectedValue);

      case 'not_equals':
      case 'ne':
        return !this.equals(actualValue, expectedValue);

      case 'includes':
      case 'contains':
        return this.includes(actualValue, expectedValue);

      case 'not_includes':
      case 'not_contains':
        return !this.includes(actualValue, expectedValue);

      case 'in':
        return this.isIn(actualValue, expectedValue);

      case 'not_in':
        return !this.isIn(actualValue, expectedValue);

      case 'greater_than':
      case 'gt':
        return this.greaterThan(actualValue, expectedValue);

      case 'less_than':
      case 'lt':
        return this.lessThan(actualValue, expectedValue);

      case 'greater_than_or_equal':
      case 'gte':
        return this.greaterThanOrEqual(actualValue, expectedValue);

      case 'less_than_or_equal':
      case 'lte':
        return this.lessThanOrEqual(actualValue, expectedValue);

      case 'between':
        return this.between(actualValue, expectedValue);

      case 'is_empty':
        return this.isEmpty(actualValue);

      case 'is_not_empty':
        return !this.isEmpty(actualValue);

      case 'starts_with':
        return this.startsWith(actualValue, expectedValue);

      case 'ends_with':
        return this.endsWith(actualValue, expectedValue);

      case 'matches':
        return this.matches(actualValue, expectedValue);

      default:
        return false;
    }
  }

  /**
   * Check equality (handles various types)
   */
  private equals(actual: unknown, expected: unknown): boolean {
    if (actual === expected) {
      return true;
    }

    // Handle object comparison for response values
    if (typeof actual === 'object' && actual !== null) {
      const actualObj = actual as Record<string, unknown>;

      // Check common response value patterns
      if ('selectedOptionId' in actualObj) {
        return actualObj.selectedOptionId === expected;
      }
      if ('text' in actualObj) {
        return actualObj.text === expected;
      }
      if ('number' in actualObj) {
        return actualObj.number === expected;
      }
      if ('rating' in actualObj) {
        return actualObj.rating === expected;
      }
    }

    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  /**
   * Check if array includes value or if value contains substring
   */
  private includes(actual: unknown, expected: unknown): boolean {
    // Handle response objects
    if (typeof actual === 'object' && actual !== null) {
      const actualObj = actual as Record<string, unknown>;

      // Multi-choice responses
      if ('selectedOptionIds' in actualObj && Array.isArray(actualObj.selectedOptionIds)) {
        return actualObj.selectedOptionIds.includes(expected);
      }

      // Text contains
      if ('text' in actualObj && typeof actualObj.text === 'string') {
        return actualObj.text.includes(String(expected));
      }
    }

    // Array includes
    if (Array.isArray(actual)) {
      return actual.includes(expected);
    }

    // String contains
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.includes(expected);
    }

    return false;
  }

  /**
   * Check if value is in an array of expected values
   */
  private isIn(actual: unknown, expected: unknown): boolean {
    if (!Array.isArray(expected)) {
      return false;
    }

    // Handle response objects
    if (typeof actual === 'object' && actual !== null) {
      const actualObj = actual as Record<string, unknown>;

      if ('selectedOptionId' in actualObj) {
        return expected.includes(actualObj.selectedOptionId);
      }
      if ('text' in actualObj) {
        return expected.includes(actualObj.text);
      }
      if ('number' in actualObj) {
        return expected.includes(actualObj.number);
      }
    }

    return expected.includes(actual);
  }

  /**
   * Numeric comparison: greater than
   */
  private greaterThan(actual: unknown, expected: unknown): boolean {
    const actualNum = this.extractNumber(actual);
    const expectedNum = this.extractNumber(expected);

    if (actualNum === null || expectedNum === null) {
      return false;
    }

    return actualNum > expectedNum;
  }

  /**
   * Numeric comparison: less than
   */
  private lessThan(actual: unknown, expected: unknown): boolean {
    const actualNum = this.extractNumber(actual);
    const expectedNum = this.extractNumber(expected);

    if (actualNum === null || expectedNum === null) {
      return false;
    }

    return actualNum < expectedNum;
  }

  /**
   * Numeric comparison: greater than or equal
   */
  private greaterThanOrEqual(actual: unknown, expected: unknown): boolean {
    const actualNum = this.extractNumber(actual);
    const expectedNum = this.extractNumber(expected);

    if (actualNum === null || expectedNum === null) {
      return false;
    }

    return actualNum >= expectedNum;
  }

  /**
   * Numeric comparison: less than or equal
   */
  private lessThanOrEqual(actual: unknown, expected: unknown): boolean {
    const actualNum = this.extractNumber(actual);
    const expectedNum = this.extractNumber(expected);

    if (actualNum === null || expectedNum === null) {
      return false;
    }

    return actualNum <= expectedNum;
  }

  /**
   * Range check: value is between min and max
   */
  private between(actual: unknown, expected: unknown): boolean {
    if (!Array.isArray(expected) || expected.length !== 2) {
      return false;
    }

    const actualNum = this.extractNumber(actual);
    const [min, max] = expected.map((v) => this.extractNumber(v));

    if (actualNum === null || min === null || max === null) {
      return false;
    }

    return actualNum >= min && actualNum <= max;
  }

  /**
   * Check if value is empty
   */
  private isEmpty(actual: unknown): boolean {
    if (actual === null || actual === undefined) {
      return true;
    }

    if (typeof actual === 'string' && actual.trim() === '') {
      return true;
    }

    if (Array.isArray(actual) && actual.length === 0) {
      return true;
    }

    if (typeof actual === 'object') {
      const obj = actual as Record<string, unknown>;

      // Check response objects
      if ('text' in obj && (obj.text === '' || obj.text === null)) {
        return true;
      }
      if ('selectedOptionId' in obj && obj.selectedOptionId === null) {
        return true;
      }
      if (
        'selectedOptionIds' in obj &&
        Array.isArray(obj.selectedOptionIds) &&
        obj.selectedOptionIds.length === 0
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * String starts with
   */
  private startsWith(actual: unknown, expected: unknown): boolean {
    const actualStr = this.extractString(actual);
    const expectedStr = this.extractString(expected);

    if (actualStr === null || expectedStr === null) {
      return false;
    }

    return actualStr.startsWith(expectedStr);
  }

  /**
   * String ends with
   */
  private endsWith(actual: unknown, expected: unknown): boolean {
    const actualStr = this.extractString(actual);
    const expectedStr = this.extractString(expected);

    if (actualStr === null || expectedStr === null) {
      return false;
    }

    return actualStr.endsWith(expectedStr);
  }

  /**
   * Regex match
   */
  private matches(actual: unknown, expected: unknown): boolean {
    const actualStr = this.extractString(actual);

    if (actualStr === null || typeof expected !== 'string') {
      return false;
    }

    try {
      const regex = new RegExp(expected);
      return regex.test(actualStr);
    } catch {
      return false;
    }
  }

  /**
   * Extract number from various value types
   */
  private extractNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;

      if ('number' in obj && typeof obj.number === 'number') {
        return obj.number;
      }
      if ('rating' in obj && typeof obj.rating === 'number') {
        return obj.rating;
      }
    }

    return null;
  }

  /**
   * Extract string from various value types
   */
  private extractString(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;

      if ('text' in obj && typeof obj.text === 'string') {
        return obj.text;
      }
      if ('selectedOptionId' in obj && typeof obj.selectedOptionId === 'string') {
        return obj.selectedOptionId;
      }
    }

    return null;
  }
}
