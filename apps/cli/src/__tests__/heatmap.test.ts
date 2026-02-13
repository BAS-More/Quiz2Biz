import { heatmapCommand } from '../commands/heatmap';

jest.mock('../lib/api-client');
jest.mock('../lib/config');

describe('Heatmap Command', () => {
  it('should be defined', () => {
    expect(heatmapCommand).toBeDefined();
    expect(heatmapCommand.name()).toBe('heatmap');
  });

  it('should have correct description', () => {
    expect(heatmapCommand.description()).toBe('Export readiness heatmap');
  });

  it('should have format option', () => {
    const formatOption = heatmapCommand.options.find((opt) => opt.long === '--format');
    expect(formatOption).toBeDefined();
    expect(formatOption?.description).toContain('csv, markdown, json');
  });

  it('should have output option', () => {
    const outputOption = heatmapCommand.options.find((opt) => opt.long === '--output');
    expect(outputOption).toBeDefined();
  });

  it('should have stdout option', () => {
    const stdoutOption = heatmapCommand.options.find((opt) => opt.long === '--stdout');
    expect(stdoutOption).toBeDefined();
  });
});
