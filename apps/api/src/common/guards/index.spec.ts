/**
 * @fileoverview Tests for common/guards barrel exports
 */
import * as guards from './index';

describe('common/guards index', () => {
  it('should export SubscriptionGuard', () => {
    expect(guards.SubscriptionGuard).toBeDefined();
  });

  it('should export CsrfGuard', () => {
    expect(guards.CsrfGuard).toBeDefined();
  });
});
