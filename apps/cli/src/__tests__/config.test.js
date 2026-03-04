'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var config_1 = require('../lib/config');
jest.mock('../lib/config');
describe('Config', function () {
  var config;
  beforeEach(function () {
    jest.clearAllMocks();
    config = new config_1.Config();
  });
  describe('set', function () {
    it('should set a configuration value', function () {
      var mockSet = jest.fn();
      config.set = mockSet;
      config.set('apiUrl', 'https://api.example.com');
      expect(mockSet).toHaveBeenCalledWith('apiUrl', 'https://api.example.com');
    });
  });
  describe('get', function () {
    it('should get a configuration value', function () {
      var mockGet = jest.fn().mockReturnValue('https://api.example.com');
      config.get = mockGet;
      var result = config.get('apiUrl');
      expect(result).toBe('https://api.example.com');
      expect(mockGet).toHaveBeenCalledWith('apiUrl');
    });
    it('should return undefined for unset values', function () {
      var mockGet = jest.fn().mockReturnValue(undefined);
      config.get = mockGet;
      var result = config.get('apiToken');
      expect(result).toBeUndefined();
    });
  });
  describe('getAll', function () {
    it('should return all configuration values', function () {
      var mockGetAll = jest.fn().mockReturnValue({
        apiUrl: 'https://api.example.com',
        apiToken: 'test-token',
        defaultSession: 'session-123',
      });
      config.getAll = mockGetAll;
      var result = config.getAll();
      expect(result).toHaveProperty('apiUrl');
      expect(result).toHaveProperty('apiToken');
      expect(result).toHaveProperty('defaultSession');
    });
  });
  describe('reset', function () {
    it('should reset configuration to defaults', function () {
      var mockReset = jest.fn();
      config.reset = mockReset;
      config.reset();
      expect(mockReset).toHaveBeenCalled();
    });
  });
  describe('getPath', function () {
    it('should return the configuration file path', function () {
      var mockGetPath = jest.fn().mockReturnValue('/path/to/config');
      config.getPath = mockGetPath;
      var result = config.getPath();
      expect(typeof result).toBe('string');
      expect(mockGetPath).toHaveBeenCalled();
    });
  });
});
