/**
 * @fileoverview Tests for calculate-score.dto.ts
 *
 * Covers:
 * - decimalToCoverageLevel function (all threshold branches)
 * - CoverageLevelDto enum values
 * - COVERAGE_LEVEL_VALUES mapping
 * - QuestionCoverageInput class Transform logic
 * - CalculateScoreDto, DimensionResidual, ReadinessScoreResult,
 *   NextQuestionsDto, PrioritizedQuestion, NextQuestionsResult classes
 */
import {
  CoverageLevelDto,
  COVERAGE_LEVEL_VALUES,
  decimalToCoverageLevel,
  QuestionCoverageInput,
  CalculateScoreDto,
  DimensionResidual,
  ReadinessScoreResult,
  NextQuestionsDto,
  PrioritizedQuestion,
  NextQuestionsResult,
} from './calculate-score.dto';

describe('CoverageLevelDto', () => {
  it('should have five coverage levels', () => {
    expect(Object.keys(CoverageLevelDto)).toHaveLength(5);
  });

  it('should have correct enum values', () => {
    expect(CoverageLevelDto.NONE).toBe('NONE');
    expect(CoverageLevelDto.PARTIAL).toBe('PARTIAL');
    expect(CoverageLevelDto.HALF).toBe('HALF');
    expect(CoverageLevelDto.SUBSTANTIAL).toBe('SUBSTANTIAL');
    expect(CoverageLevelDto.FULL).toBe('FULL');
  });
});

describe('COVERAGE_LEVEL_VALUES', () => {
  it('should map NONE to 0.0', () => {
    expect(COVERAGE_LEVEL_VALUES[CoverageLevelDto.NONE]).toBe(0.0);
  });

  it('should map PARTIAL to 0.25', () => {
    expect(COVERAGE_LEVEL_VALUES[CoverageLevelDto.PARTIAL]).toBe(0.25);
  });

  it('should map HALF to 0.5', () => {
    expect(COVERAGE_LEVEL_VALUES[CoverageLevelDto.HALF]).toBe(0.5);
  });

  it('should map SUBSTANTIAL to 0.75', () => {
    expect(COVERAGE_LEVEL_VALUES[CoverageLevelDto.SUBSTANTIAL]).toBe(0.75);
  });

  it('should map FULL to 1.0', () => {
    expect(COVERAGE_LEVEL_VALUES[CoverageLevelDto.FULL]).toBe(1.0);
  });
});

describe('decimalToCoverageLevel', () => {
  it('should return NONE for values below 0.125', () => {
    expect(decimalToCoverageLevel(0)).toBe(CoverageLevelDto.NONE);
    expect(decimalToCoverageLevel(0.1)).toBe(CoverageLevelDto.NONE);
    expect(decimalToCoverageLevel(0.124)).toBe(CoverageLevelDto.NONE);
  });

  it('should return PARTIAL for values from 0.125 to below 0.375', () => {
    expect(decimalToCoverageLevel(0.125)).toBe(CoverageLevelDto.PARTIAL);
    expect(decimalToCoverageLevel(0.25)).toBe(CoverageLevelDto.PARTIAL);
    expect(decimalToCoverageLevel(0.374)).toBe(CoverageLevelDto.PARTIAL);
  });

  it('should return HALF for values from 0.375 to below 0.625', () => {
    expect(decimalToCoverageLevel(0.375)).toBe(CoverageLevelDto.HALF);
    expect(decimalToCoverageLevel(0.5)).toBe(CoverageLevelDto.HALF);
    expect(decimalToCoverageLevel(0.624)).toBe(CoverageLevelDto.HALF);
  });

  it('should return SUBSTANTIAL for values from 0.625 to below 0.875', () => {
    expect(decimalToCoverageLevel(0.625)).toBe(CoverageLevelDto.SUBSTANTIAL);
    expect(decimalToCoverageLevel(0.75)).toBe(CoverageLevelDto.SUBSTANTIAL);
    expect(decimalToCoverageLevel(0.874)).toBe(CoverageLevelDto.SUBSTANTIAL);
  });

  it('should return FULL for values 0.875 and above', () => {
    expect(decimalToCoverageLevel(0.875)).toBe(CoverageLevelDto.FULL);
    expect(decimalToCoverageLevel(0.9)).toBe(CoverageLevelDto.FULL);
    expect(decimalToCoverageLevel(1.0)).toBe(CoverageLevelDto.FULL);
  });

  it('should handle exact boundary values', () => {
    expect(decimalToCoverageLevel(0.125)).toBe(CoverageLevelDto.PARTIAL);
    expect(decimalToCoverageLevel(0.375)).toBe(CoverageLevelDto.HALF);
    expect(decimalToCoverageLevel(0.625)).toBe(CoverageLevelDto.SUBSTANTIAL);
    expect(decimalToCoverageLevel(0.875)).toBe(CoverageLevelDto.FULL);
  });
});

describe('QuestionCoverageInput', () => {
  it('should be instantiable', () => {
    const input = new QuestionCoverageInput();
    input.questionId = 'q-1';
    input.coverage = 0.75;
    expect(input.questionId).toBe('q-1');
    expect(input.coverage).toBe(0.75);
  });

  it('should support optional coverageLevel', () => {
    const input = new QuestionCoverageInput();
    input.questionId = 'q-1';
    input.coverageLevel = CoverageLevelDto.SUBSTANTIAL;
    input.coverage = 0.75;
    expect(input.coverageLevel).toBe(CoverageLevelDto.SUBSTANTIAL);
  });

  it('should allow undefined coverageLevel', () => {
    const input = new QuestionCoverageInput();
    input.questionId = 'q-1';
    input.coverage = 0.5;
    expect(input.coverageLevel).toBeUndefined();
  });
});

describe('CalculateScoreDto', () => {
  it('should be instantiable with required fields', () => {
    const dto = new CalculateScoreDto();
    dto.sessionId = 'session-123';
    expect(dto.sessionId).toBe('session-123');
  });

  it('should support optional coverageOverrides', () => {
    const dto = new CalculateScoreDto();
    dto.sessionId = 'session-123';

    const override = new QuestionCoverageInput();
    override.questionId = 'q-1';
    override.coverage = 0.5;

    dto.coverageOverrides = [override];
    expect(dto.coverageOverrides).toHaveLength(1);
  });

  it('should allow undefined coverageOverrides', () => {
    const dto = new CalculateScoreDto();
    dto.sessionId = 'session-123';
    expect(dto.coverageOverrides).toBeUndefined();
  });
});

describe('DimensionResidual', () => {
  it('should be instantiable with all fields', () => {
    const residual = new DimensionResidual();
    residual.dimensionKey = 'arch_sec';
    residual.displayName = 'Architecture & Security';
    residual.weight = 0.15;
    residual.residualRisk = 0.234;
    residual.weightedContribution = 0.0351;
    residual.questionCount = 10;
    residual.answeredCount = 8;
    residual.averageCoverage = 0.7;

    expect(residual.dimensionKey).toBe('arch_sec');
    expect(residual.weight).toBe(0.15);
    expect(residual.residualRisk).toBe(0.234);
    expect(residual.weightedContribution).toBe(0.0351);
    expect(residual.questionCount).toBe(10);
    expect(residual.answeredCount).toBe(8);
    expect(residual.averageCoverage).toBe(0.7);
  });
});

describe('ReadinessScoreResult', () => {
  it('should be instantiable with all fields', () => {
    const result = new ReadinessScoreResult();
    result.sessionId = 'session-1';
    result.score = 78.5;
    result.portfolioResidual = 0.215;
    result.dimensions = [];
    result.totalQuestions = 50;
    result.answeredQuestions = 40;
    result.completionPercentage = 80;
    result.calculatedAt = new Date();
    result.trend = 'UP';

    expect(result.sessionId).toBe('session-1');
    expect(result.score).toBe(78.5);
    expect(result.trend).toBe('UP');
  });

  it('should support all trend values', () => {
    const result = new ReadinessScoreResult();
    const validTrends: Array<'UP' | 'DOWN' | 'STABLE' | 'FIRST'> = ['UP', 'DOWN', 'STABLE', 'FIRST'];

    for (const trend of validTrends) {
      result.trend = trend;
      expect(result.trend).toBe(trend);
    }
  });
});

describe('NextQuestionsDto', () => {
  it('should be instantiable with required sessionId', () => {
    const dto = new NextQuestionsDto();
    dto.sessionId = 'session-1';
    expect(dto.sessionId).toBe('session-1');
  });

  it('should support optional limit', () => {
    const dto = new NextQuestionsDto();
    dto.sessionId = 'session-1';
    dto.limit = 10;
    expect(dto.limit).toBe(10);
  });
});

describe('PrioritizedQuestion', () => {
  it('should be instantiable with all fields', () => {
    const pq = new PrioritizedQuestion();
    pq.questionId = 'q-1';
    pq.text = 'What is your deployment strategy?';
    pq.dimensionKey = 'devops';
    pq.dimensionName = 'DevOps';
    pq.severity = 0.8;
    pq.currentCoverage = 0.25;
    pq.currentCoverageLevel = CoverageLevelDto.PARTIAL;
    pq.expectedScoreLift = 2.5;
    pq.rationale = 'High severity with low coverage';
    pq.rank = 1;

    expect(pq.questionId).toBe('q-1');
    expect(pq.severity).toBe(0.8);
    expect(pq.currentCoverageLevel).toBe(CoverageLevelDto.PARTIAL);
    expect(pq.rank).toBe(1);
  });
});

describe('NextQuestionsResult', () => {
  it('should be instantiable with all fields', () => {
    const result = new NextQuestionsResult();
    result.sessionId = 'session-1';
    result.currentScore = 72;
    result.questions = [];
    result.maxPotentialScore = 95;

    expect(result.sessionId).toBe('session-1');
    expect(result.currentScore).toBe(72);
    expect(result.maxPotentialScore).toBe(95);
  });
});
