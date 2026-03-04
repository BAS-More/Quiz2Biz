'use strict';
/**
 * Heatmap Command
 *
 * Exports readiness heatmap in various formats
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
exports.heatmapCommand = void 0;
var commander_1 = require('commander');
var chalk_1 = require('chalk');
var ora_1 = require('ora');
var fs = require('fs');
var path = require('path');
var api_client_1 = require('../lib/api-client');
var config_1 = require('../lib/config');
exports.heatmapCommand = new commander_1.Command('heatmap')
  .description('Export readiness heatmap')
  .argument('[sessionId]', 'Session ID (uses default if not provided)')
  .option('-f, --format <type>', 'Output format: csv, markdown, json', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .option('--stdout', 'Print to stdout instead of file')
  .action(function (sessionId, options) {
    return __awaiter(void 0, void 0, void 0, function () {
      var config,
        targetSessionId,
        spinner,
        client,
        heatmapData,
        output,
        extension,
        outputPath,
        error_1;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            config = new config_1.Config();
            targetSessionId = sessionId || config.get('defaultSession');
            if (!targetSessionId) {
              console.error(
                chalk_1.default.red(
                  'Error: No session ID provided and no default session configured.',
                ),
              );
              process.exit(1);
            }
            spinner = (0, ora_1.default)('Generating heatmap...').start();
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            client = new api_client_1.ApiClient(config);
            return [4 /*yield*/, client.getHeatmap(targetSessionId)];
          case 2:
            heatmapData = _a.sent();
            spinner.succeed('Heatmap data retrieved');
            output = void 0;
            extension = void 0;
            switch (options.format) {
              case 'csv':
                output = formatCSV(heatmapData);
                extension = '.csv';
                break;
              case 'json':
                output = JSON.stringify(heatmapData, null, 2);
                extension = '.json';
                break;
              case 'markdown':
              default:
                output = formatMarkdown(heatmapData);
                extension = '.md';
                break;
            }
            if (options.stdout) {
              console.log(output);
            } else {
              outputPath =
                options.output ||
                'quiz2biz-heatmap-'.concat(targetSessionId.substring(0, 8)).concat(extension);
              fs.writeFileSync(outputPath, output);
              console.log(
                chalk_1.default.green(
                  '\u2705 Heatmap exported to: '.concat(path.resolve(outputPath)),
                ),
              );
            }
            return [3 /*break*/, 4];
          case 3:
            error_1 = _a.sent();
            spinner.fail('Failed to generate heatmap');
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
function formatMarkdown(data) {
  var lines = [
    '# Quiz2Biz Readiness Heatmap',
    '',
    '**Session:** '.concat(data.sessionName),
    '**Generated:** '.concat(new Date().toISOString()),
    '**Overall Score:** '.concat((data.overallScore * 100).toFixed(1), '%'),
    '',
    '## Dimension Summary',
    '',
    '| Dimension | Score | Coverage | Status |',
    '|-----------|-------|----------|--------|',
  ];
  data.dimensions.forEach(function (dim) {
    var status =
      dim.score >= 0.95 ? '🟢' : dim.score >= 0.7 ? '🟡' : dim.score >= 0.4 ? '🟠' : '🔴';
    lines.push(
      '| '
        .concat(dim.name, ' | ')
        .concat((dim.score * 100).toFixed(0), '% | ')
        .concat(dim.questionsAnswered, '/')
        .concat(dim.totalQuestions, ' | ')
        .concat(status, ' |'),
    );
  });
  lines.push('', '## Question Details', '');
  data.dimensions.forEach(function (dim) {
    lines.push('### '.concat(dim.name), '');
    lines.push('| Question | Severity | Coverage | Status |');
    lines.push('|----------|----------|----------|--------|');
    dim.questions.forEach(function (q) {
      var residual = q.severity * (1 - q.coverage);
      var status =
        residual <= 0.05 ? '🟢' : residual <= 0.15 ? '🟡' : residual <= 0.3 ? '🟠' : '🔴';
      var questionText = q.text.length > 50 ? q.text.substring(0, 47) + '...' : q.text;
      lines.push(
        '| '
          .concat(questionText, ' | ')
          .concat((q.severity * 100).toFixed(0), '% | ')
          .concat((q.coverage * 100).toFixed(0), '% | ')
          .concat(status, ' |'),
      );
    });
    lines.push('');
  });
  return lines.join('\n');
}
function formatCSV(data) {
  var rows = ['Dimension,Question ID,Question Text,Severity,Coverage,Residual Risk,Status'];
  data.dimensions.forEach(function (dim) {
    dim.questions.forEach(function (q) {
      var residual = q.severity * (1 - q.coverage);
      var status =
        residual <= 0.05
          ? 'GREEN'
          : residual <= 0.15
            ? 'YELLOW'
            : residual <= 0.3
              ? 'ORANGE'
              : 'RED';
      var escapedText = '"'.concat(q.text.replace(/"/g, '""'), '"');
      rows.push(
        ''
          .concat(dim.name, ',')
          .concat(q.id, ',')
          .concat(escapedText, ',')
          .concat(q.severity.toFixed(2), ',')
          .concat(q.coverage.toFixed(2), ',')
          .concat(residual.toFixed(2), ',')
          .concat(status),
      );
    });
  });
  return rows.join('\n');
}
