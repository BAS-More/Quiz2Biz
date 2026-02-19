"use strict";
/**
 * NQS (Next Question Suggest) Command
 *
 * Suggests the next best questions to answer based on adaptive logic
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nqsCommand = void 0;
var commander_1 = require("commander");
var chalk_1 = require("chalk");
var ora_1 = require("ora");
var api_client_1 = require("../lib/api-client");
var config_1 = require("../lib/config");
exports.nqsCommand = new commander_1.Command('nqs')
    .description('Get next question suggestions')
    .argument('[sessionId]', 'Session ID (uses default if not provided)')
    .option('-n, --count <number>', 'Number of suggestions', '5')
    .option('-d, --dimension <key>', 'Filter by dimension')
    .option('-p, --persona <type>', 'Filter by persona (CTO, CFO, CEO, BA, POLICY)')
    .option('-j, --json', 'Output as JSON')
    .action(function (sessionId, options) { return __awaiter(void 0, void 0, void 0, function () {
    var config, targetSessionId, spinner, client, suggestions, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                config = new config_1.Config();
                targetSessionId = sessionId || config.get('defaultSession');
                if (!targetSessionId) {
                    console.error(chalk_1.default.red('Error: No session ID provided and no default session configured.'));
                    process.exit(1);
                }
                spinner = (0, ora_1.default)('Fetching question suggestions...').start();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                client = new api_client_1.ApiClient(config);
                return [4 /*yield*/, client.getNextQuestions(targetSessionId, {
                        count: parseInt(options.count, 10),
                        dimension: options.dimension,
                        persona: options.persona,
                    })];
            case 2:
                suggestions = _a.sent();
                spinner.succeed("Found ".concat(suggestions.questions.length, " suggested questions"));
                if (options.json) {
                    console.log(JSON.stringify(suggestions, null, 2));
                    return [2 /*return*/];
                }
                // Display suggestions
                console.log('\n' + chalk_1.default.bold('📝 Next Question Suggestions'));
                console.log(chalk_1.default.gray('─'.repeat(60)));
                if (suggestions.questions.length === 0) {
                    console.log(chalk_1.default.green('\n✅ All questions answered! Assessment complete.'));
                    return [2 /*return*/];
                }
                suggestions.questions.forEach(function (q, i) {
                    var priorityIcon = getPriorityIcon(q.priority);
                    var severityColor = getSeverityColor(q.severity);
                    console.log("\n".concat(chalk_1.default.bold("".concat(i + 1, ". ").concat(q.text))));
                    console.log("   ".concat(chalk_1.default.gray('ID:'), " ").concat(q.id));
                    console.log("   ".concat(chalk_1.default.gray('Dimension:'), " ").concat(q.dimension, " | ").concat(chalk_1.default.gray('Persona:'), " ").concat(q.persona));
                    console.log("   ".concat(chalk_1.default.gray('Severity:'), " ").concat(severityColor("".concat((q.severity * 100).toFixed(0), "%")), " | ").concat(chalk_1.default.gray('Priority:'), " ").concat(priorityIcon));
                    if (q.bestPractice) {
                        console.log("   ".concat(chalk_1.default.gray('Best Practice:'), " ").concat(chalk_1.default.italic(truncate(q.bestPractice, 80))));
                    }
                });
                // Summary
                console.log('\n' + chalk_1.default.gray('─'.repeat(60)));
                console.log(chalk_1.default.gray("Showing ".concat(suggestions.questions.length, " of ").concat(suggestions.totalRemaining, " remaining questions")));
                if (suggestions.topDimension) {
                    console.log(chalk_1.default.gray("Focus area: ".concat(suggestions.topDimension.name, " (").concat(suggestions.topDimension.remaining, " gaps)")));
                }
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                spinner.fail('Failed to fetch suggestions');
                console.error(chalk_1.default.red(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                process.exit(1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
function getPriorityIcon(priority) {
    switch (priority) {
        case 'CRITICAL':
            return chalk_1.default.red('🔴 Critical');
        case 'HIGH':
            return chalk_1.default.hex('#FFA500')('🟠 High');
        case 'MEDIUM':
            return chalk_1.default.yellow('🟡 Medium');
        case 'LOW':
            return chalk_1.default.green('🟢 Low');
        default:
            return priority;
    }
}
function getSeverityColor(severity) {
    if (severity >= 0.8) {
        return chalk_1.default.red;
    }
    if (severity >= 0.6) {
        return chalk_1.default.hex('#FFA500');
    }
    if (severity >= 0.4) {
        return chalk_1.default.yellow;
    }
    return chalk_1.default.green;
}
function truncate(str, maxLen) {
    return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}
