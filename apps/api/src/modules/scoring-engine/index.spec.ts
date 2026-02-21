/**
 * @fileoverview Tests for modules/scoring-engine barrel exports
 */
import * as scoringEngine from './index';

describe('modules/scoring-engine index', () => {
  it('should export ScoringEngineModule', () => {
    expect(scoringEngine.ScoringEngineModule).toBeDefined();
  });

  it('should export ScoringEngineService', () => {
    expect(scoringEngine.ScoringEngineService).toBeDefined();
  });

  it('should export ScoringEngineController', () => {
    expect(scoringEngine.ScoringEngineController).toBeDefined();
  });

  it('should export coverageLevelToDecimal function', () => {
    expect(scoringEngine.coverageLevelToDecimal).toBeDefined();
    expect(typeof scoringEngine.coverageLevelToDecimal).toBe('function');
  });

  it('should export COVERAGE_LEVEL_VALUES', () => {
    expect(scoringEngine.COVERAGE_LEVEL_VALUES).toBeDefined();
  });

  it('should export decimalToCoverageLevel function', () => {
    expect(scoringEngine.decimalToCoverageLevel).toBeDefined();
    expect(typeof scoringEngine.decimalToCoverageLevel).toBe('function');
  });

  it('should export DTOs', () => {
    expect(scoringEngine.CoverageLevelDto).toBeDefined();
    expect(scoringEngine.CalculateScoreDto).toBeDefined();
    expect(scoringEngine.NextQuestionsDto).toBeDefined();
  });
});
