import { Config, OfflineSessionData } from '../config';
import Conf from 'conf';

jest.mock('conf');

describe('Config', () => {
  let config: Config;
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      path: '/mock/path/config.json',
      store: {
        apiUrl: 'http://localhost:3000/api',
        apiToken: 'test-token',
        defaultSession: 'session-123',
        offlineData: {},
      },
    };

    (Conf as jest.MockedClass<typeof Conf>).mockImplementation(() => mockStore);

    config = new Config();
  });

  describe('constructor', () => {
    it('initializes Conf with correct project name and defaults', () => {
      expect(Conf).toHaveBeenCalledWith({
        projectName: 'quiz2biz-cli',
        defaults: {
          apiUrl: 'http://localhost:3000/api',
          apiToken: '',
          defaultSession: '',
          offlineData: {},
        },
      });
    });
  });

  describe('get', () => {
    it('retrieves string value from store', () => {
      mockStore.get.mockReturnValue('http://api.example.com');

      const result = config.get('apiUrl');

      expect(mockStore.get).toHaveBeenCalledWith('apiUrl');
      expect(result).toBe('http://api.example.com');
    });

    it('returns empty string for non-string values', () => {
      mockStore.get.mockReturnValue({ complex: 'object' });

      const result = config.get('apiUrl');

      expect(result).toBe('');
    });

    it('returns empty string for undefined values', () => {
      mockStore.get.mockReturnValue(undefined);

      const result = config.get('apiToken');

      expect(result).toBe('');
    });
  });

  describe('set', () => {
    it('sets string value in store', () => {
      config.set('apiToken', 'new-token-456');

      expect(mockStore.set).toHaveBeenCalledWith('apiToken', 'new-token-456');
    });

    it('sets apiUrl', () => {
      config.set('apiUrl', 'https://production.api.com');

      expect(mockStore.set).toHaveBeenCalledWith('apiUrl', 'https://production.api.com');
    });
  });

  describe('getAll', () => {
    it('returns entire config store', () => {
      const result = config.getAll();

      expect(result).toEqual({
        apiUrl: 'http://localhost:3000/api',
        apiToken: 'test-token',
        defaultSession: 'session-123',
        offlineData: {},
      });
    });
  });

  describe('reset', () => {
    it('clears all config values', () => {
      config.reset();

      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe('getPath', () => {
    it('returns config file path', () => {
      const path = config.getPath();

      expect(path).toBe('/mock/path/config.json');
    });
  });

  describe('getOfflineData', () => {
    it('retrieves offline session data', () => {
      const mockOfflineData = {
        'session-123': {
          sessionId: 'session-123',
          syncedAt: '2026-01-28T10:00:00Z',
          score: { overallScore: 85.5 },
          heatmap: { dimensions: [] },
          questions: [{ id: 'q1', text: 'Test' }],
        },
      };

      mockStore.get.mockReturnValue(mockOfflineData);

      const result = config.getOfflineData('session-123');

      expect(mockStore.get).toHaveBeenCalledWith('offlineData');
      expect(result).toEqual(mockOfflineData['session-123']);
    });

    it('returns undefined for non-existent session', () => {
      mockStore.get.mockReturnValue({});

      const result = config.getOfflineData('non-existent');

      expect(result).toBeUndefined();
    });

    it('handles missing offlineData', () => {
      mockStore.get.mockReturnValue(undefined);

      const result = config.getOfflineData('session-123');

      expect(result).toBeUndefined();
    });
  });

  describe('setOfflineData', () => {
    it('stores offline session data', () => {
      const sessionData: OfflineSessionData = {
        sessionId: 'session-456',
        syncedAt: '2026-01-28T11:00:00Z',
        score: { overallScore: 90.0 },
        heatmap: { dimensions: [] },
        questions: [],
      };

      mockStore.get.mockReturnValue({});

      config.setOfflineData('session-456', sessionData);

      expect(mockStore.get).toHaveBeenCalledWith('offlineData');
      expect(mockStore.set).toHaveBeenCalledWith('offlineData', {
        'session-456': sessionData,
      });
    });

    it('merges with existing offline data', () => {
      const existingData = {
        'session-111': { sessionId: 'session-111', syncedAt: '2026-01-28T09:00:00Z' },
      };

      const newData: OfflineSessionData = {
        sessionId: 'session-222',
        syncedAt: '2026-01-28T12:00:00Z',
        score: { overallScore: 75.0 },
        heatmap: {},
        questions: [],
      };

      mockStore.get.mockReturnValue(existingData);

      config.setOfflineData('session-222', newData);

      expect(mockStore.set).toHaveBeenCalledWith('offlineData', {
        'session-111': existingData['session-111'],
        'session-222': newData,
      });
    });
  });

  describe('listOfflineSessions', () => {
    it('returns all offline session data as array', () => {
      const mockData = {
        'session-1': { sessionId: 'session-1', syncedAt: '2026-01-28T10:00:00Z' },
        'session-2': { sessionId: 'session-2', syncedAt: '2026-01-28T11:00:00Z' },
      };

      mockStore.get.mockReturnValue(mockData);

      const result = config.listOfflineSessions();

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockData['session-1']);
      expect(result).toContainEqual(mockData['session-2']);
    });

    it('returns empty array when no offline data', () => {
      mockStore.get.mockReturnValue({});

      const result = config.listOfflineSessions();

      expect(result).toEqual([]);
    });
  });

  describe('clearOfflineData', () => {
    it('removes specific session offline data', () => {
      const existingData = {
        'session-1': { sessionId: 'session-1' },
        'session-2': { sessionId: 'session-2' },
      };

      mockStore.get.mockReturnValue(existingData);

      config.clearOfflineData('session-1');

      expect(mockStore.set).toHaveBeenCalledWith('offlineData', {
        'session-2': existingData['session-2'],
      });
    });

    it('handles clearing non-existent session', () => {
      mockStore.get.mockReturnValue({});

      config.clearOfflineData('non-existent');

      expect(mockStore.set).toHaveBeenCalledWith('offlineData', {});
    });
  });

  describe('clearAllOfflineData', () => {
    it('removes all offline session data', () => {
      config.clearAllOfflineData();

      expect(mockStore.set).toHaveBeenCalledWith('offlineData', {});
    });
  });
});
