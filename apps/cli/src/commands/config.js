"use strict";
/**
 * Config Command
 *
 * Manages CLI configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configCommand = void 0;
var commander_1 = require("commander");
var chalk_1 = require("chalk");
var config_1 = require("../lib/config");
exports.configCommand = new commander_1.Command('config').description('Manage CLI configuration');
var VALID_KEYS = ['apiUrl', 'apiToken', 'defaultSession'];
function isValidConfigKey(key) {
    return VALID_KEYS.includes(key);
}
exports.configCommand
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(function (key, value) {
    if (!isValidConfigKey(key)) {
        console.log(chalk_1.default.red("\u274C Invalid config key: ".concat(key)));
        console.log(chalk_1.default.gray("Valid keys: ".concat(VALID_KEYS.join(', '))));
        return;
    }
    var config = new config_1.Config();
    config.set(key, value);
    console.log(chalk_1.default.green("\u2705 Set ".concat(key, " = ").concat(value)));
});
exports.configCommand
    .command('get <key>')
    .description('Get a configuration value')
    .action(function (key) {
    if (!isValidConfigKey(key)) {
        console.log(chalk_1.default.red("\u274C Invalid config key: ".concat(key)));
        console.log(chalk_1.default.gray("Valid keys: ".concat(VALID_KEYS.join(', '))));
        return;
    }
    var config = new config_1.Config();
    var value = config.get(key);
    if (value !== undefined) {
        console.log(value);
    }
    else {
        console.log(chalk_1.default.gray('(not set)'));
    }
});
exports.configCommand
    .command('list')
    .description('List all configuration values')
    .action(function () {
    var config = new config_1.Config();
    var all = config.getAll();
    console.log(chalk_1.default.bold('Quiz2Biz CLI Configuration'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    Object.entries(all).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        if (key !== 'offlineData') {
            console.log("".concat(chalk_1.default.cyan(key), ": ").concat(String(value)));
        }
    });
});
exports.configCommand
    .command('reset')
    .description('Reset configuration to defaults')
    .action(function () {
    var config = new config_1.Config();
    config.reset();
    console.log(chalk_1.default.green('✅ Configuration reset to defaults'));
});
exports.configCommand
    .command('path')
    .description('Show configuration file path')
    .action(function () {
    var config = new config_1.Config();
    console.log(config.getPath());
});
