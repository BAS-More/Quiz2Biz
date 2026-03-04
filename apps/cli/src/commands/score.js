'use strict';
/**
 * Score Command
 *
 * Retrieves and displays the current readiness score
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
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.scoreCommand = void 0;
var commander_1 = require('commander');
var chalk_1 = require('chalk');
var ora_1 = require('ora');
var table_1 = require('table');
var api_client_1 = require('../lib/api-client');
var config_1 = require('../lib/config');
exports.scoreCommand = new commander_1.Command('score')
  .description('Get readiness score for a session')
  .argument('[sessionId]', 'Session ID (uses default if not provided)')
  .option('-d, --detailed', 'Show detailed dimension breakdown')
  .option('-j, --json', 'Output as JSON')
  .option('--offline', 'Use offline data file')
  .action(function (sessionId, options) {
    return __awaiter(void 0, void 0, void 0, function () {
      var config,
        targetSessionId,
        spinner,
        scoreData,
        offlineData,
        client,
        scoreColor,
        tableData,
        error_1;
      var _a, _b, _c, _d, _e, _f, _g, _h;
      return __generator(this, function (_j) {
        switch (_j.label) {
          case 0:
            config = new config_1.Config();
            targetSessionId = sessionId || config.get('defaultSession');
            if (!targetSessionId) {
              console.error(
                chalk_1.default.red(
                  'Error: No session ID provided and no default session configured.',
                ),
              );
              console.log(
                chalk_1.default.gray('Use: quiz2biz config set defaultSession <sessionId>'),
              );
              process.exit(1);
            }
            spinner = (0, ora_1.default)('Fetching readiness score...').start();
            _j.label = 1;
          case 1:
            _j.trys.push([1, 5, , 6]);
            scoreData = void 0;
            if (!options.offline) return [3 /*break*/, 2];
            offlineData = config.getOfflineData(targetSessionId);
            if (!offlineData) {
              spinner.fail('No offline data found for this session');
              process.exit(1);
            }
            scoreData = offlineData.score;
            return [3 /*break*/, 4];
          case 2:
            client = new api_client_1.ApiClient(config);
            return [4 /*yield*/, client.getScore(targetSessionId)];
          case 3:
            scoreData = _j.sent();
            _j.label = 4;
          case 4:
            spinner.succeed('Score retrieved');
            if (options.json) {
              console.log(JSON.stringify(scoreData, null, 2));
              return [2 /*return*/];
            }
            // Display score
            console.log('\n' + chalk_1.default.bold('📊 Quiz2Biz Readiness Score'));
            console.log(chalk_1.default.gray('─'.repeat(40)));
            scoreColor = getScoreColor(scoreData.overallScore);
            console.log(
              '\n'
                .concat(chalk_1.default.bold('Overall Score:'), ' ')
                .concat(scoreColor(''.concat((scoreData.overallScore * 100).toFixed(1), '%'))),
            );
            console.log(
              ''
                .concat(chalk_1.default.bold('Status:'), ' ')
                .concat(getScoreStatus(scoreData.overallScore)),
            );
            console.log(''.concat(chalk_1.default.bold('Target:'), ' 95%'));
            if (options.detailed && scoreData.dimensions) {
              console.log('\n' + chalk_1.default.bold('Dimension Breakdown:'));
              tableData = __spreadArray(
                [
                  [
                    chalk_1.default.bold('Dimension'),
                    chalk_1.default.bold('Score'),
                    chalk_1.default.bold('Coverage'),
                    chalk_1.default.bold('Gap'),
                  ],
                ],
                scoreData.dimensions.map(function (dim) {
                  return [
                    dim.name,
                    getScoreColor(dim.score)(''.concat((dim.score * 100).toFixed(0), '%')),
                    ''.concat(dim.questionsAnswered, '/').concat(dim.totalQuestions),
                    dim.score < 0.95
                      ? chalk_1.default.red(''.concat(((0.95 - dim.score) * 100).toFixed(0), '%'))
                      : chalk_1.default.green('✓'),
                  ];
                }),
                true,
              );
              console.log(
                (0, table_1.table)(tableData, {
                  border: {
                    topBody: '─',
                    bottomBody: '─',
                    joinBody: '─',
                    topJoin: '┬',
                    bottomJoin: '┴',
                    bodyLeft: '│',
                    bodyRight: '│',
                    bodyJoin: '│',
                    joinLeft: '├',
                    joinRight: '┤',
                    joinJoin: '┼',
                  },
                }),
              );
            }
            // Progress summary
            console.log('\n' + chalk_1.default.bold('Progress:'));
            console.log(
              '  Sections left: '.concat(
                (_b =
                  (_a = scoreData.progress) === null || _a === void 0
                    ? void 0
                    : _a.sectionsLeft) !== null && _b !== void 0
                  ? _b
                  : 'N/A',
              ),
            );
            console.log(
              '  Questions left: '.concat(
                (_d =
                  (_c = scoreData.progress) === null || _c === void 0
                    ? void 0
                    : _c.questionsLeft) !== null && _d !== void 0
                  ? _d
                  : 'N/A',
              ),
            );
            console.log(
              '  Current section: '
                .concat(
                  (_f =
                    (_e = scoreData.progress) === null || _e === void 0
                      ? void 0
                      : _e.currentSectionProgress) !== null && _f !== void 0
                    ? _f
                    : 0,
                  '/',
                )
                .concat(
                  (_h =
                    (_g = scoreData.progress) === null || _g === void 0
                      ? void 0
                      : _g.currentSectionTotal) !== null && _h !== void 0
                    ? _h
                    : 0,
                ),
            );
            return [3 /*break*/, 6];
          case 5:
            error_1 = _j.sent();
            spinner.fail('Failed to fetch score');
            console.error(
              chalk_1.default.red(error_1 instanceof Error ? error_1.message : 'Unknown error'),
            );
            process.exit(1);
            return [3 /*break*/, 6];
          case 6:
            return [2 /*return*/];
        }
      });
    });
  });
function getScoreColor(score) {
  if (score >= 0.95) {
    return chalk_1.default.green;
  }
  if (score >= 0.7) {
    return chalk_1.default.yellow;
  }
  if (score >= 0.4) {
    return chalk_1.default.hex('#FFA500');
  } // Orange
  return chalk_1.default.red;
}
function getScoreStatus(score) {
  if (score >= 0.95) {
    return chalk_1.default.green('✅ Ready for Production');
  }
  if (score >= 0.7) {
    return chalk_1.default.yellow('⚠️  Needs Improvement');
  }
  if (score >= 0.4) {
    return chalk_1.default.hex('#FFA500')('🔶 Significant Gaps');
  }
  return chalk_1.default.red('❌ Critical Gaps');
}
