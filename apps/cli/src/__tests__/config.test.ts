/**
 * Unit tests for Config class - Real implementation (no mocking)
 * Tests actual Config functionality for coverage collection
 */

import { Config, OfflineSessionData } from '../lib/config';

describe('Config', () => {
  let config: Config;

  beforeEach(() => {
    config = new Config();
    // Start with clean state
    config.reset();
  });

  afterEach(() => {
    // Clean up after each test
    config.reset();
  });

  describe('constructor', () => {
    it('should create a Config instance', () => {
      const newConfig = new Config();
      expect(newConfig).toBeInstanceOf(Config);
    });
  });

  describe('set and get', () => {
    it('should set and retrieve apiUrl', () => {
      config.set('apiUrl', 'https://api.example.com');
      expect(config.get('apiUrl')).toBe('https://api.example.com');
    });

    it('should set and retrieve apiToken', () => {
      config.set('apiToken', 'test-token-abc123');
      expect(config.get('apiToken')).toBe('test-token-abc123');
    });

    it('should set and retrieve defaultSession', () => {
      config.set('defaultSession', 'session-xyz');
      expect(config.get('defaultSession')).toBe('session-xyz');
    });

    it('should return empty string for unset apiToken after reset', () => {
      config.reset();
      expect(config.get('apiToken')).toBe('');
    });

    it('should return default apiUrl after reset', () => {
      config.reset();
      expect(config.get('apiUrl')).toBe('http://localhost:3000/api');
    });
  });

  describe('getAll', () => {
    it('should return all configuration values as object', () => {
      config.set('apiUrl', 'https://api.test.com');
      config.set('apiToken', 'token-123');
      config.set('defaultSession', 'sess-456');

      const all = config.getAll();

      expect(all).toHaveProperty('apiUrl', 'https://api.test.com');
      expect(all).toHaveProperty('apiToken', 'token-123');
      expect(all).toHaveProperty('defaultSession', 'sess-456');
      expect(all).toHaveProperty('offlineData');
    });

    it('should include offlineData in getAll result', () => {
      const all = config.getAll();
      expect(all).toHaveProperty('offlineData');
    });
  });

  describe('reset', () => {
    it('should clear all custom values', () => {
      config.set('apiToken', 'some-token');
      config.set('defaultSession', 'some-session');

      config.reset();

      expect(config.get('apiToken')).toBe('');
      expect(config.get('defaultSession')).toBe('');
    });

    it('should restore default apiUrl', () => {
      config.set('apiUrl', 'https://custom.api.com');
      config.reset();
      expect(config.get('apiUrl')).toBe('http://localhost:3000/api');
    });
  });

  describe('getPath', () => {
    it('should return a non-empty string path', () => {
      const path = config.getPath();

      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('should return path containing project name', () => {
      const path = config.getPath();
      expect(path).toContain('quiz2biz-cli');
    });
  });

  describe('Offline Data Management', () => {
    const createMockOfflineData = (sessionId: string): OfflineSessionData => ({
      sessionId,
      syncedAt: new Date().toISOString(),
      score: { overallScore: 75 },
      heatmap: { areas: ['compliance'] },
      questions: [{ id: 'q1', answer: 'yes' }],
    });

    describe('setOfflineData and getOfflineData', () => {
      it('should store and retrieve offline data for a session', () => {
        const data = createMockOfflineData('session-001');
        config.setOfflineData('session-001', data);

        const retrieved = config.getOfflineData('session-001');

        expect(retrieved).toBeDefined();
        expect(retrieved?.sessionId).toBe('session-001');
        expect(retrieved?.score.overallScore).toBe(75);
      });

      it('should return undefined for non-existent session', () => {
        const result = config.getOfflineData('non-existent');
        expect(result).toBeUndefined();
      });

      it('should overwrite existing session data', () => {
        const data1 = createMockOfflineData('session-002');
        data1.score.overallScore = 50;
        config.setOfflineData('session-002', data1);

        const data2 = createMockOfflineData('session-002');
        data2.score.overallScore = 90;
        config.setOfflineData('session-002', data2);

        const retrieved = config.getOfflineData('session-002');
        expect(retrieved?.score.overallScore).toBe(90);
      });
    });

    describe('listOfflineSessions', () => {
      it('should return empty array when no sessions exist', () => {
        config.clearAllOfflineData();
        const sessions = config.listOfflineSessions();
        expect(sessions).toEqual([]);
      });

      it('should list all stored offline sessions', () => {
        config.setOfflineData('session-a', createMockOfflineData('session-a'));
        config.setOfflineData('session-b', createMockOfflineData('session-b'));
        config.setOfflineData('session-c', createMockOfflineData('session-c'));

        const sessions = config.listOfflineSessions();

        expect(sessions.length).toBe(3);
        const ids = sessions.map((s) => s.sessionId);
        expect(ids).toContain('session-a');
        expect(ids).toContain('session-b');
        expect(ids).toContain('session-c');
      });
    });

    describe('clearOfflineData', () => {
      it('should remove specific session data', () => {
        config.setOfflineData('to-keep', createMockOfflineData('to-keep'));
        config.setOfflineData('to-remove', createMockOfflineData('to-remove'));

        config.clearOfflineData('to-remove');

        expect(config.getOfflineData('to-keep')).toBeDefined();
        expect(config.getOfflineData('to-remove')).toBeUndefined();
      });

      it('should not throw when clearing non-existent session', () => {
        expect(() => {
          config.clearOfflineData('does-not-exist');
        }).not.toThrow();
      });
    });

    describe('clearAllOfflineData', () => {
      it('should remove all offline session data', () => {
        config.setOfflineData('sess-1', createMockOfflineData('sess-1'));
        config.setOfflineData('sess-2', createMockOfflineData('sess-2'));

        config.clearAllOfflineData();

        expect(config.listOfflineSessions().length).toBe(0);
        expect(config.getOfflineData('sess-1')).toBeUndefined();
        expect(config.getOfflineData('sess-2')).toBeUndefined();
      });
    });
  });
});
