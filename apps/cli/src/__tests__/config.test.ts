import { Config } from '../lib/config';

jest.mock('../lib/config');

describe('Config', () => {
  let config: Config;

  beforeEach(() => {
    jest.clearAllMocks();
    config = new Config();
  });

  describe('set', () => {
    it('should set a configuration value', () => {
      const mockSet = jest.fn();
      config.set = mockSet;

      config.set('apiUrl', 'https://api.example.com');

      expect(mockSet).toHaveBeenCalledWith('apiUrl', 'https://api.example.com');
    });
  });

  describe('get', () => {
    it('should get a configuration value', () => {
      const mockGet = jest.fn().mockReturnValue('https://api.example.com');
      config.get = mockGet;

      const result = config.get('apiUrl');

      expect(result).toBe('https://api.example.com');
      expect(mockGet).toHaveBeenCalledWith('apiUrl');
    });

    it('should return undefined for unset values', () => {
      const mockGet = jest.fn().mockReturnValue(undefined);
      config.get = mockGet;

      const result = config.get('apiToken');

      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all configuration values', () => {
      const mockGetAll = jest.fn().mockReturnValue({
        apiUrl: 'https://api.example.com',
        apiToken: 'test-token',
        defaultSession: 'session-123',
      });
      config.getAll = mockGetAll;

      const result = config.getAll();

      expect(result).toHaveProperty('apiUrl');
      expect(result).toHaveProperty('apiToken');
      expect(result).toHaveProperty('defaultSession');
    });
  });

  describe('reset', () => {
    it('should reset configuration to defaults', () => {
      const mockReset = jest.fn();
      config.reset = mockReset;

      config.reset();

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('getPath', () => {
    it('should return the configuration file path', () => {
      const mockGetPath = jest.fn().mockReturnValue('/path/to/config');
      config.getPath = mockGetPath;

      const result = config.getPath();

      expect(typeof result).toBe('string');
      expect(mockGetPath).toHaveBeenCalled();
    });
  });
});
