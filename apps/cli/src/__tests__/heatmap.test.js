'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var heatmap_1 = require('../commands/heatmap');
jest.mock('../lib/api-client');
jest.mock('../lib/config');
describe('Heatmap Command', function () {
  it('should be defined', function () {
    expect(heatmap_1.heatmapCommand).toBeDefined();
    expect(heatmap_1.heatmapCommand.name()).toBe('heatmap');
  });
  it('should have correct description', function () {
    expect(heatmap_1.heatmapCommand.description()).toBe('Export readiness heatmap');
  });
  it('should have format option', function () {
    var formatOption = heatmap_1.heatmapCommand.options.find(function (opt) {
      return opt.long === '--format';
    });
    expect(formatOption).toBeDefined();
    expect(
      formatOption === null || formatOption === void 0 ? void 0 : formatOption.description,
    ).toContain('csv, markdown, json');
  });
  it('should have output option', function () {
    var outputOption = heatmap_1.heatmapCommand.options.find(function (opt) {
      return opt.long === '--output';
    });
    expect(outputOption).toBeDefined();
  });
  it('should have stdout option', function () {
    var stdoutOption = heatmap_1.heatmapCommand.options.find(function (opt) {
      return opt.long === '--stdout';
    });
    expect(stdoutOption).toBeDefined();
  });
});
