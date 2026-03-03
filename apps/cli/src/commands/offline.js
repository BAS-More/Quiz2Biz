'use strict';
/**
 * Offline Command
 *
 * Work with local JSON files for offline mode
 */
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.offlineCommand = void 0;
var commander_1 = require('commander');
var chalk_1 = require('chalk');
var ora_1 = require('ora');
var fs = require('fs');
var path = require('path');
var config_1 = require('../lib/config');
var api_client_1 = require('../lib/api-client');
exports.offlineCommand = new commander_1.Command('offline').description('Offline mode operations');
exports.offlineCommand
  .command('sync <sessionId>')
  .description('Download session data for offline use')
  .option('-o, --output <file>', 'Output file path')
  .action(function (sessionId, options) {
    return __awaiter(void 0, void 0, void 0, function () {
      var config, spinner, client, _a, score, heatmap, questions, offlineData, error_1;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            config = new config_1.Config();
            spinner = (0, ora_1.default)('Syncing session data...').start();
            _b.label = 1;
          case 1:
            _b.trys.push([1, 3, , 4]);
            client = new api_client_1.ApiClient(config);
            return [
              4 /*yield*/,
              Promise.all([
                client.getScore(sessionId),
                client.getHeatmap(sessionId),
                client.getNextQuestions(sessionId, { count: 100 }),
              ]),
            ];
          case 2:
            ((_a = _b.sent()), (score = _a[0]), (heatmap = _a[1]), (questions = _a[2]));
            offlineData = {
              sessionId: sessionId,
              syncedAt: new Date().toISOString(),
              score: score,
              heatmap: heatmap,
              questions: questions.questions,
            };
            if (options.output) {
              fs.writeFileSync(options.output, JSON.stringify(offlineData, null, 2));
              spinner.succeed('Synced to: '.concat(path.resolve(options.output)));
            } else {
              config.setOfflineData(sessionId, offlineData);
              spinner.succeed('Session data synced to local storage');
            }
            return [3 /*break*/, 4];
          case 3:
            error_1 = _b.sent();
            spinner.fail('Failed to sync session data');
            console.error(
              chalk_1.default.red(error_1 instanceof Error ? error_1.message : 'Unknown error'),
            );
            process.exit(1);
            return [3 /*break*/, 4];
          case 4:
            return [2 /*return*/];
        }
      });
    });
  });
exports.offlineCommand
  .command('import <file>')
  .description('Import session data from JSON file')
  .action(function (file) {
    return __awaiter(void 0, void 0, void 0, function () {
      var config, content, data;
      return __generator(this, function (_a) {
        config = new config_1.Config();
        try {
          content = fs.readFileSync(file, 'utf-8');
          data = JSON.parse(content);
          if (!data.sessionId) {
            console.error(chalk_1.default.red('Invalid offline data file: missing sessionId'));
            process.exit(1);
          }
          config.setOfflineData(data.sessionId, data);
          console.log(chalk_1.default.green('\u2705 Imported session: '.concat(data.sessionId)));
        } catch (error) {
          console.error(
            chalk_1.default.red(
              'Failed to import: '.concat(error instanceof Error ? error.message : 'Unknown error'),
            ),
          );
          process.exit(1);
        }
        return [2 /*return*/];
      });
    });
  });
exports.offlineCommand
  .command('export <sessionId>')
  .description('Export offline session data to JSON file')
  .option('-o, --output <file>', 'Output file path')
  .action(function (sessionId, options) {
    var config = new config_1.Config();
    var data = config.getOfflineData(sessionId);
    if (!data) {
      console.error(chalk_1.default.red('No offline data found for session: '.concat(sessionId)));
      process.exit(1);
    }
    var outputPath =
      options.output || 'quiz2biz-offline-'.concat(sessionId.substring(0, 8), '.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(chalk_1.default.green('\u2705 Exported to: '.concat(path.resolve(outputPath))));
  });
exports.offlineCommand
  .command('list')
  .description('List all offline sessions')
  .action(function () {
    var config = new config_1.Config();
    var sessions = config.listOfflineSessions();
    console.log(chalk_1.default.bold('Offline Sessions'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (sessions.length === 0) {
      console.log(chalk_1.default.gray('No offline sessions stored'));
      return;
    }
    sessions.forEach(function (session) {
      console.log(''.concat(chalk_1.default.cyan(session.sessionId)));
      console.log('  Synced: '.concat(session.syncedAt));
      console.log('  Score: '.concat((session.score.overallScore * 100).toFixed(1), '%'));
      console.log('');
    });
  });
exports.offlineCommand
  .command('clear [sessionId]')
  .description('Clear offline data (all or specific session)')
  .action(function (sessionId) {
    var config = new config_1.Config();
    if (sessionId) {
      config.clearOfflineData(sessionId);
      console.log(chalk_1.default.green('\u2705 Cleared offline data for: '.concat(sessionId)));
    } else {
      config.clearAllOfflineData();
      console.log(chalk_1.default.green('✅ Cleared all offline data'));
    }
  });
