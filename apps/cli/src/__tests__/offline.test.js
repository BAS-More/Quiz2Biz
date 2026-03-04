'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var offline_1 = require('../commands/offline');
jest.mock('../lib/config');
jest.mock('../lib/api-client');
describe('Offline Command', function () {
  it('should be defined', function () {
    expect(offline_1.offlineCommand).toBeDefined();
    expect(offline_1.offlineCommand.name()).toBe('offline');
  });
  it('should have correct description', function () {
    expect(offline_1.offlineCommand.description()).toBe('Offline mode operations');
  });
  it('should have sync subcommand', function () {
    var commands = offline_1.offlineCommand.commands;
    var syncCmd = commands.find(function (cmd) {
      return cmd.name() === 'sync';
    });
    expect(syncCmd).toBeDefined();
    expect(syncCmd === null || syncCmd === void 0 ? void 0 : syncCmd.description()).toBe(
      'Download session data for offline use',
    );
  });
  it('should have import subcommand', function () {
    var commands = offline_1.offlineCommand.commands;
    var importCmd = commands.find(function (cmd) {
      return cmd.name() === 'import';
    });
    expect(importCmd).toBeDefined();
    expect(importCmd === null || importCmd === void 0 ? void 0 : importCmd.description()).toBe(
      'Import session data from JSON file',
    );
  });
  it('should have export subcommand', function () {
    var commands = offline_1.offlineCommand.commands;
    var exportCmd = commands.find(function (cmd) {
      return cmd.name() === 'export';
    });
    expect(exportCmd).toBeDefined();
    expect(exportCmd === null || exportCmd === void 0 ? void 0 : exportCmd.description()).toBe(
      'Export offline session data to JSON file',
    );
  });
  it('should have list subcommand', function () {
    var commands = offline_1.offlineCommand.commands;
    var listCmd = commands.find(function (cmd) {
      return cmd.name() === 'list';
    });
    expect(listCmd).toBeDefined();
    expect(listCmd === null || listCmd === void 0 ? void 0 : listCmd.description()).toBe(
      'List all offline sessions',
    );
  });
  it('should have clear subcommand', function () {
    var commands = offline_1.offlineCommand.commands;
    var clearCmd = commands.find(function (cmd) {
      return cmd.name() === 'clear';
    });
    expect(clearCmd).toBeDefined();
    expect(clearCmd === null || clearCmd === void 0 ? void 0 : clearCmd.description()).toBe(
      'Clear offline data (all or specific session)',
    );
  });
});
