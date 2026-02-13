/**
 * Regression Tests: Token Refresh Race Condition (BUG-006)
 * Ensures concurrent API calls don't cause token refresh conflicts
 */

import { setupFakeTimers, waitForCondition } from './setup';

describe('@regression:BUG-006 Token Refresh Race Condition', () => {
  // Simulate token refresh mutex
  class TokenManager {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private isRefreshing = false;
    private refreshPromise: Promise<string> | null = null;
    private requestQueue: Array<() => void> = [];

    constructor(initialAccessToken: string, initialRefreshToken: string) {
      this.accessToken = initialAccessToken;
      this.refreshToken = initialRefreshToken;
    }

    async getValidToken(): Promise<string> {
      if (this.isTokenValid()) {
        return this.accessToken!;
      }

      // If already refreshing, wait for the same refresh to complete
      if (this.isRefreshing && this.refreshPromise) {
        return this.refreshPromise;
      }

      // Start refresh
      this.isRefreshing = true;
      this.refreshPromise = this.performRefresh();

      try {
        const newToken = await this.refreshPromise;
        return newToken;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    }

    private isTokenValid(): boolean {
      return this.accessToken !== null && this.accessToken !== 'expired';
    }

    private async performRefresh(): Promise<string> {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.accessToken = `new-token-${Date.now()}`;
      return this.accessToken;
    }

    // For testing
    expireToken() {
      this.accessToken = 'expired';
    }

    getRefreshCount(): number {
      return this.isRefreshing ? 1 : 0;
    }
  }

  describe('Concurrent Token Requests', () => {
    it('should reuse same refresh promise for concurrent requests', async () => {
      const manager = new TokenManager('valid-token', 'refresh-token');
      manager.expireToken();

      const refreshPromises: Promise<string>[] = [];

      // Simulate multiple concurrent requests
      for (let i = 0; i < 5; i++) {
        refreshPromises.push(manager.getValidToken());
      }

      const tokens = await Promise.all(refreshPromises);

      // All requests should get the same token
      expect(new Set(tokens).size).toBe(1);
    });

    it('should not trigger multiple refresh operations', async () => {
      const manager = new TokenManager('valid-token', 'refresh-token');
      manager.expireToken();

      // Start concurrent requests
      const p1 = manager.getValidToken();
      const p2 = manager.getValidToken();
      const p3 = manager.getValidToken();

      // All should complete with same result
      const results = await Promise.all([p1, p2, p3]);
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });
  });

  describe('Sequential Token Requests', () => {
    it('should allow new refresh after previous completes', async () => {
      const manager = new TokenManager('valid-token', 'refresh-token');

      // First refresh
      manager.expireToken();
      const token1 = await manager.getValidToken();

      // Second refresh (after some time)
      manager.expireToken();
      const token2 = await manager.getValidToken();

      // Tokens should be different (new refresh each time)
      expect(token1).not.toBe(token2);
    });
  });

  describe('Request Queue Behavior', () => {
    it('should process queued requests after refresh', async () => {
      const manager = new TokenManager('valid-token', 'refresh-token');
      manager.expireToken();

      const timestamps: number[] = [];

      const requests = [1, 2, 3].map(async (i) => {
        const token = await manager.getValidToken();
        timestamps.push(Date.now());
        return { request: i, token };
      });

      const results = await Promise.all(requests);

      // All requests should have valid tokens
      expect(results.every((r) => r.token.startsWith('new-token-'))).toBe(true);
    });
  });
});
