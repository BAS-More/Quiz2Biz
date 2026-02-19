"use strict";
/**
 * Configuration Manager for Quiz2Biz CLI
 *
 * Uses Conf for persistent local storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
var conf_1 = require("conf");
var Config = /** @class */ (function () {
    function Config() {
        this.store = new conf_1.default({
            projectName: 'quiz2biz-cli',
            defaults: {
                apiUrl: 'http://localhost:3000/api',
                apiToken: '',
                defaultSession: '',
                offlineData: {},
            },
        });
    }
    Config.prototype.get = function (key) {
        var value = this.store.get(key);
        if (typeof value === 'string') {
            return value;
        }
        return '';
    };
    Config.prototype.set = function (key, value) {
        this.store.set(key, value);
    };
    Config.prototype.getAll = function () {
        return this.store.store;
    };
    Config.prototype.reset = function () {
        this.store.clear();
    };
    Config.prototype.getPath = function () {
        return this.store.path;
    };
    // Offline data management
    Config.prototype.getOfflineData = function (sessionId) {
        var offlineData = this.store.get('offlineData') || {};
        return offlineData[sessionId];
    };
    Config.prototype.setOfflineData = function (sessionId, data) {
        var offlineData = this.store.get('offlineData') || {};
        offlineData[sessionId] = data;
        this.store.set('offlineData', offlineData);
    };
    Config.prototype.listOfflineSessions = function () {
        var offlineData = this.store.get('offlineData') || {};
        return Object.values(offlineData);
    };
    Config.prototype.clearOfflineData = function (sessionId) {
        var offlineData = this.store.get('offlineData') || {};
        delete offlineData[sessionId];
        this.store.set('offlineData', offlineData);
    };
    Config.prototype.clearAllOfflineData = function () {
        this.store.set('offlineData', {});
    };
    return Config;
}());
exports.Config = Config;
