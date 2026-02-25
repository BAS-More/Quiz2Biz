/**
 * Integration tests for Config class - actual implementation testing
 * These tests do NOT mock the Config class, giving real coverage
 */

// Unmock to use real implementation (other test files mock this)
jest.unmock('../lib/config');
jest.unmock('conf');

import { Config, OfflineSessionData } from '../lib/config';

describe('Config Integration Tests', () => {
  let config: Config;

  beforeEach(() => {
    config = new Config();
    // Reset to clean state
    config.reset();
  });

  afterEach(() => {
    // Clean up after each test
    config.reset();
  });

  describe('constructor', () => {
    it('should create a Config instance', () => {
      expect(config).toBeInstanceOf(Config);
    });
  });

  describe('get/set', () => {
    it('should set and get apiUrl', () => {
      config.set('apiUrl', 'https://test-api.example.com');
      expect(config.get('apiUrl')).toBe('https://test-api.example.com');
    });

    it('should set and get apiToken', () => {
      config.set('apiToken', 'test-token-123');
      expect(config.get('apiToken')).toBe('test-token-123');
    });

    it('should set and get defaultSession', () => {
      config.set('defaultSession', 'session-abc');
      expect(config.get('defaultSession')).toBe('session-abc');
    });

    it('should return empty string for unset values', () => {
      config.reset();
      // After reset, apiToken should be empty (default)
      expect(config.get('apiToken')).toBe('');
    });
  });

  describe('getAll', () => {
    it('should return all configuration values', () => {
      config.set('apiUrl', 'https://api.test.com');
      config.set('apiToken', 'token-xyz');

      const all = config.getAll();

      expect(all).toHaveProperty('apiUrl');
      expect(all).toHaveProperty('apiToken');
      expect(all).toHaveProperty('defaultSession');
      expect(all).toHaveProperty('offlineData');
    });
  });

  describe('reset', () => {
    it('should reset configuration to defaults', () => {
      config.set('apiToken', 'some-token');
      expect(config.get('apiToken')).toBe('some-token');

      config.reset();

      expect(config.get('apiToken')).toBe('');
    });
  });

  describe('getPath', () => {
    it('should return the configuration file path', () => {
      const path = config.getPath();

      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
      expect(path).toContain('quiz2biz-cli');
    });
  });

  describe('Offline Data Management', () => {
    const mockOfflineData: OfflineSessionData = {
      sessionId: 'test-session-1',
      syncedAt: new Date().toISOString(),
      score: { overallScore: 85 },
      heatmap: { areas: ['compliance', 'security'] },
      questions: [{ id: 'q1', answer: 'yes' }],
    };

    it('should set and get offline data for a session', () => {
      config.setOfflineData('test-session-1', mockOfflineData);

      const retrieved = config.getOfflineData('test-session-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe('test-session-1');
      expect(retrieved?.score.overallScore).toBe(85);
    });

    it('should return undefined for non-existent session', () => {
      const result = config.getOfflineData('non-existent-session');
      expect(result).toBeUndefined();
    });

    it('should list all offline sessions', () => {
      const session1: OfflineSessionData = {
        ...mockOfflineData,
        sessionId: 'session-1',
      };
      const session2: OfflineSessionData = {
        ...mockOfflineData,
        sessionId: 'session-2',
      };

      config.setOfflineData('session-1', session1);
      config.setOfflineData('session-2', session2);

      const sessions = config.listOfflineSessions();

      expect(sessions.length).toBe(2);
      expect(sessions.map((s) => s.sessionId)).toContain('session-1');
      expect(sessions.map((s) => s.sessionId)).toContain('session-2');
    });

    it('should clear offline data for a specific session', () => {
      config.setOfflineData('session-to-clear', mockOfflineData);
      expect(config.getOfflineData('session-to-clear')).toBeDefined();

      config.clearOfflineData('session-to-clear');

      expect(config.getOfflineData('session-to-clear')).toBeUndefined();
    });

    it('should clear all offline data', () => {
      config.setOfflineData('session-1', mockOfflineData);
      config.setOfflineData('session-2', mockOfflineData);
      expect(config.listOfflineSessions().length).toBe(2);

      config.clearAllOfflineData();

      expect(config.listOfflineSessions().length).toBe(0);
    });
  });
});
