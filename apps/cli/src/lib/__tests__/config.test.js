"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("../config");
var conf_1 = require("conf");
jest.mock('conf');
describe('Config', function () {
    var config;
    var mockStore;
    beforeEach(function () {
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
        conf_1.default.mockImplementation(function () { return mockStore; });
        config = new config_1.Config();
    });
    describe('constructor', function () {
        it('initializes Conf with correct project name and defaults', function () {
            expect(conf_1.default).toHaveBeenCalledWith({
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
    describe('get', function () {
        it('retrieves string value from store', function () {
            mockStore.get.mockReturnValue('http://api.example.com');
            var result = config.get('apiUrl');
            expect(mockStore.get).toHaveBeenCalledWith('apiUrl');
            expect(result).toBe('http://api.example.com');
        });
        it('returns empty string for non-string values', function () {
            mockStore.get.mockReturnValue({ complex: 'object' });
            var result = config.get('apiUrl');
            expect(result).toBe('');
        });
        it('returns empty string for undefined values', function () {
            mockStore.get.mockReturnValue(undefined);
            var result = config.get('apiToken');
            expect(result).toBe('');
        });
    });
    describe('set', function () {
        it('sets string value in store', function () {
            config.set('apiToken', 'new-token-456');
            expect(mockStore.set).toHaveBeenCalledWith('apiToken', 'new-token-456');
        });
        it('sets apiUrl', function () {
            config.set('apiUrl', 'https://production.api.com');
            expect(mockStore.set).toHaveBeenCalledWith('apiUrl', 'https://production.api.com');
        });
    });
    describe('getAll', function () {
        it('returns entire config store', function () {
            var result = config.getAll();
            expect(result).toEqual({
                apiUrl: 'http://localhost:3000/api',
                apiToken: 'test-token',
                defaultSession: 'session-123',
                offlineData: {},
            });
        });
    });
    describe('reset', function () {
        it('clears all config values', function () {
            config.reset();
            expect(mockStore.clear).toHaveBeenCalled();
        });
    });
    describe('getPath', function () {
        it('returns config file path', function () {
            var path = config.getPath();
            expect(path).toBe('/mock/path/config.json');
        });
    });
    describe('getOfflineData', function () {
        it('retrieves offline session data', function () {
            var mockOfflineData = {
                'session-123': {
                    sessionId: 'session-123',
                    syncedAt: '2026-01-28T10:00:00Z',
                    score: { overallScore: 85.5 },
                    heatmap: { dimensions: [] },
                    questions: [{ id: 'q1', text: 'Test' }],
                },
            };
            mockStore.get.mockReturnValue(mockOfflineData);
            var result = config.getOfflineData('session-123');
            expect(mockStore.get).toHaveBeenCalledWith('offlineData');
            expect(result).toEqual(mockOfflineData['session-123']);
        });
        it('returns undefined for non-existent session', function () {
            mockStore.get.mockReturnValue({});
            var result = config.getOfflineData('non-existent');
            expect(result).toBeUndefined();
        });
        it('handles missing offlineData', function () {
            mockStore.get.mockReturnValue(undefined);
            var result = config.getOfflineData('session-123');
            expect(result).toBeUndefined();
        });
    });
    describe('setOfflineData', function () {
        it('stores offline session data', function () {
            var sessionData = {
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
        it('merges with existing offline data', function () {
            var existingData = {
                'session-111': { sessionId: 'session-111', syncedAt: '2026-01-28T09:00:00Z' },
            };
            var newData = {
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
    describe('listOfflineSessions', function () {
        it('returns all offline session data as array', function () {
            var mockData = {
                'session-1': { sessionId: 'session-1', syncedAt: '2026-01-28T10:00:00Z' },
                'session-2': { sessionId: 'session-2', syncedAt: '2026-01-28T11:00:00Z' },
            };
            mockStore.get.mockReturnValue(mockData);
            var result = config.listOfflineSessions();
            expect(result).toHaveLength(2);
            expect(result).toContainEqual(mockData['session-1']);
            expect(result).toContainEqual(mockData['session-2']);
        });
        it('returns empty array when no offline data', function () {
            mockStore.get.mockReturnValue({});
            var result = config.listOfflineSessions();
            expect(result).toEqual([]);
        });
    });
    describe('clearOfflineData', function () {
        it('removes specific session offline data', function () {
            var existingData = {
                'session-1': { sessionId: 'session-1' },
                'session-2': { sessionId: 'session-2' },
            };
            mockStore.get.mockReturnValue(existingData);
            config.clearOfflineData('session-1');
            expect(mockStore.set).toHaveBeenCalledWith('offlineData', {
                'session-2': existingData['session-2'],
            });
        });
        it('handles clearing non-existent session', function () {
            mockStore.get.mockReturnValue({});
            config.clearOfflineData('non-existent');
            expect(mockStore.set).toHaveBeenCalledWith('offlineData', {});
        });
    });
    describe('clearAllOfflineData', function () {
        it('removes all offline session data', function () {
            config.clearAllOfflineData();
            expect(mockStore.set).toHaveBeenCalledWith('offlineData', {});
        });
    });
});
