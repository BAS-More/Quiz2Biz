/**
 * @fileoverview Tests for modules/heatmap barrel exports
 */
import * as heatmap from './index';

describe('modules/heatmap index', () => {
  it('should export HeatmapModule', () => {
    expect(heatmap.HeatmapModule).toBeDefined();
  });

  it('should export HeatmapService', () => {
    expect(heatmap.HeatmapService).toBeDefined();
  });

  it('should export HeatmapController', () => {
    expect(heatmap.HeatmapController).toBeDefined();
  });

  it('should export DTOs', () => {
    expect(heatmap.GenerateHeatmapDto).toBeDefined();
    expect(heatmap.HeatmapCellDto).toBeDefined();
    expect(heatmap.HeatmapResultDto).toBeDefined();
  });
});
