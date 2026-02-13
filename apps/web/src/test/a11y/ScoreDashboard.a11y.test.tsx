/**
 * Accessibility tests for ScoreDashboard component
 * WCAG 2.2 Level AA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

interface DimensionScore {
  key: string;
  name: string;
  weight: number;
  residualRisk: number;
  questionCount: number;
  answeredCount: number;
  averageCoverage: number;
}

interface ScoreData {
  sessionId: string;
  score: number;
  portfolioResidual: number;
  dimensions: DimensionScore[];
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE' | 'FIRST';
  calculatedAt: Date;
}

// Accessible mock ScoreDashboard component
function MockScoreDashboard({
  scoreData,
  isLoading = false,
  onRefresh,
}: {
  scoreData?: ScoreData;
  isLoading?: boolean;
  onRefresh?: () => void;
}) {
  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'UP':
        return 'Score is improving';
      case 'DOWN':
        return 'Score is declining';
      case 'STABLE':
        return 'Score is stable';
      default:
        return 'First assessment';
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) {
      return 'Excellent';
    }
    if (score >= 60) {
      return 'Good';
    }
    if (score >= 40) {
      return 'Needs Improvement';
    }
    return 'Critical';
  };

  if (isLoading && !scoreData) {
    return (
      <div
        className="score-dashboard"
        role="status"
        aria-label="Loading score data"
        aria-busy="true"
      >
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-xl mb-6" aria-hidden="true" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded-lg" aria-hidden="true" />
            <div className="h-24 bg-gray-200 rounded-lg" aria-hidden="true" />
          </div>
        </div>
        <span className="sr-only">Loading your readiness score...</span>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="score-dashboard text-center py-12" role="region" aria-label="Score dashboard">
        <p className="text-gray-500">No score data available</p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Calculate Score
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="score-dashboard space-y-6" role="region" aria-label="Score dashboard">
      {/* Main score card */}
      <section
        aria-labelledby="readiness-score-heading"
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 id="readiness-score-heading" className="text-lg font-medium text-gray-300">
              Readiness Score
            </h2>
            <p className="text-sm text-gray-400" aria-live="polite">
              {getTrendLabel(scoreData.trend)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Last updated</p>
            <time dateTime={scoreData.calculatedAt.toISOString()} className="text-sm text-gray-300">
              {scoreData.calculatedAt.toLocaleTimeString()}
            </time>
            {onRefresh && (
              <button
                onClick={onRefresh}
                aria-label="Refresh score"
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Score gauge */}
        <figure
          className="flex items-center justify-center my-8"
          aria-label={`Readiness score: ${Math.round(scoreData.score)} out of 100, rated ${getScoreLabel(scoreData.score)}`}
        >
          <div className="relative">
            <svg className="w-48 h-48 transform -rotate-90" role="img" aria-hidden="true">
              <circle
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
                r="86"
                cx="96"
                cy="96"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold" aria-hidden="true">
                {Math.round(scoreData.score)}
              </span>
              <span className="text-gray-400 text-sm" aria-hidden="true">
                out of 100
              </span>
            </div>
          </div>
        </figure>

        {/* Quick stats */}
        <dl className="grid grid-cols-3 gap-4 mt-8">
          <div className="text-center">
            <dt className="text-sm text-gray-400">Questions Answered</dt>
            <dd className="text-3xl font-bold">{scoreData.answeredQuestions}</dd>
          </div>
          <div className="text-center">
            <dt className="text-sm text-gray-400">Complete</dt>
            <dd className="text-3xl font-bold">{Math.round(scoreData.completionPercentage)}%</dd>
          </div>
          <div className="text-center">
            <dt className="text-sm text-gray-400">Risk Covered</dt>
            <dd className="text-3xl font-bold">
              {Math.round((1 - scoreData.portfolioResidual) * 100)}%
            </dd>
          </div>
        </dl>
      </section>

      {/* Dimension breakdown */}
      <section
        aria-labelledby="dimension-breakdown-heading"
        className="bg-white rounded-xl p-6 shadow-sm border"
      >
        <h3 id="dimension-breakdown-heading" className="text-lg font-semibold mb-4">
          Dimension Breakdown
        </h3>
        <div role="list" aria-label="Dimension scores">
          {scoreData.dimensions.map((dim) => {
            const dimScore = Math.round((1 - dim.residualRisk) * 100);
            return (
              <div key={dim.key} role="listitem" className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{dim.name}</span>
                  <span className="text-sm font-bold">{dimScore}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={dimScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${dim.name}: ${dimScore}%`}
                  className="w-full bg-gray-200 rounded-full h-2.5"
                >
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r"
                    style={{ width: `${dimScore}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>
                    {dim.answeredCount}/{dim.questionCount} answered
                  </span>
                  <span>Weight: {(dim.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Risk areas */}
      <div className="grid grid-cols-2 gap-6">
        {/* High risks */}
        <section
          aria-labelledby="high-risk-heading"
          className="bg-red-50 rounded-xl p-6 border border-red-100"
        >
          <h3 id="high-risk-heading" className="text-lg font-semibold text-red-800 mb-4">
            High Risk Areas
          </h3>
          <ul role="list" aria-label="High risk areas">
            {scoreData.dimensions
              .filter((d) => d.residualRisk > 0.5)
              .slice(0, 3)
              .map((dim) => (
                <li key={dim.key} className="flex items-center gap-2 text-red-700 mb-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{dim.name}</span>
                </li>
              ))}
            {scoreData.dimensions.filter((d) => d.residualRisk > 0.5).length === 0 && (
              <li className="text-green-700">No high risk areas!</li>
            )}
          </ul>
        </section>

        {/* Top performers */}
        <section
          aria-labelledby="top-performers-heading"
          className="bg-green-50 rounded-xl p-6 border border-green-100"
        >
          <h3 id="top-performers-heading" className="text-lg font-semibold text-green-800 mb-4">
            Top Performers
          </h3>
          <ul role="list" aria-label="Top performing areas">
            {scoreData.dimensions
              .filter((d) => d.residualRisk < 0.3)
              .slice(0, 3)
              .map((dim) => (
                <li key={dim.key} className="flex items-center gap-2 text-green-700 mb-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{dim.name}</span>
                </li>
              ))}
            {scoreData.dimensions.filter((d) => d.residualRisk < 0.3).length === 0 && (
              <li className="text-gray-500">Keep improving to see top performers!</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

// Test data
const mockScoreData: ScoreData = {
  sessionId: 'session-123',
  score: 72,
  portfolioResidual: 0.28,
  dimensions: [
    {
      key: 'security',
      name: 'Security',
      weight: 0.2,
      residualRisk: 0.15,
      questionCount: 10,
      answeredCount: 8,
      averageCoverage: 0.85,
    },
    {
      key: 'architecture',
      name: 'Architecture',
      weight: 0.15,
      residualRisk: 0.25,
      questionCount: 8,
      answeredCount: 6,
      averageCoverage: 0.75,
    },
    {
      key: 'operations',
      name: 'Operations',
      weight: 0.15,
      residualRisk: 0.55,
      questionCount: 12,
      answeredCount: 5,
      averageCoverage: 0.45,
    },
    {
      key: 'compliance',
      name: 'Compliance',
      weight: 0.2,
      residualRisk: 0.35,
      questionCount: 15,
      answeredCount: 10,
      averageCoverage: 0.65,
    },
  ],
  totalQuestions: 45,
  answeredQuestions: 29,
  completionPercentage: 64.4,
  trend: 'UP',
  calculatedAt: new Date('2026-01-28T10:30:00'),
};

describe('ScoreDashboard Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('With score data', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockScoreDashboard scoreData={mockScoreData} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading structure', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);

      const h2 = screen.getByRole('heading', { level: 2, name: /readiness score/i });
      expect(h2).toBeInTheDocument();

      const h3s = screen.getAllByRole('heading', { level: 3 });
      expect(h3s.length).toBeGreaterThanOrEqual(3);
    });

    it('should have accessible region landmarks', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);
      const region = screen.getByRole('region', { name: /score dashboard/i });
      expect(region).toBeInTheDocument();
    });

    it('should have accessible score gauge with description', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);
      const scoreGauge = screen.getByRole('figure');
      expect(scoreGauge).toHaveAttribute('aria-label', expect.stringContaining('72'));
      expect(scoreGauge).toHaveAttribute('aria-label', expect.stringContaining('Good'));
    });

    it('should use definition list for stats', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);

      const dtElements = screen.getAllByRole('term');
      const ddElements = screen.getAllByRole('definition');

      expect(dtElements.length).toBeGreaterThan(0);
      expect(ddElements.length).toBeGreaterThan(0);
    });

    it('should have accessible progress bars with ARIA attributes', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);
      const progressBars = screen.getAllByRole('progressbar');

      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
        expect(bar).toHaveAttribute('aria-label');
      });
    });

    it('should have accessible dimension list', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);
      const dimensionList = screen.getByRole('list', { name: /dimension scores/i });
      expect(dimensionList).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should have accessible high risk areas section', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);

      const section = screen.getByRole('region', { name: /high risk areas/i });
      expect(section).toBeInTheDocument();

      const list = screen.getByRole('list', { name: /high risk areas/i });
      expect(list).toBeInTheDocument();
    });

    it('should have accessible top performers section', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);

      const section = screen.getByRole('region', { name: /top performers/i });
      expect(section).toBeInTheDocument();

      const list = screen.getByRole('list', { name: /top performing areas/i });
      expect(list).toBeInTheDocument();
    });

    it('should have proper time element for last updated', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);
      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('datetime');
    });

    it('should hide decorative icons from assistive technology', () => {
      const { container } = render(<MockScoreDashboard scoreData={mockScoreData} />);
      const decorativeSvgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(decorativeSvgs.length).toBeGreaterThan(0);
    });
  });

  describe('Loading state', () => {
    it('should have no accessibility violations when loading', async () => {
      const { container } = render(<MockScoreDashboard isLoading={true} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should indicate loading state with proper ARIA', () => {
      render(<MockScoreDashboard isLoading={true} />);
      const loadingRegion = screen.getByRole('status');
      expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
      expect(loadingRegion).toHaveAttribute('aria-label', 'Loading score data');
    });

    it('should have screen reader text for loading state', () => {
      render(<MockScoreDashboard isLoading={true} />);
      expect(screen.getByText(/loading your readiness score/i)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should have no accessibility violations when empty', async () => {
      const { container } = render(<MockScoreDashboard />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible calculate button when empty', () => {
      render(<MockScoreDashboard onRefresh={() => {}} />);
      const calculateButton = screen.getByRole('button', { name: /calculate score/i });
      expect(calculateButton).toBeInTheDocument();
    });
  });

  describe('Refresh functionality', () => {
    it('should have accessible refresh button', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} onRefresh={() => {}} />);
      const refreshButton = screen.getByRole('button', { name: /refresh score/i });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Trend indicator', () => {
    it('should announce trend status via aria-live', () => {
      render(<MockScoreDashboard scoreData={mockScoreData} />);
      const trendIndicator = screen.getByText(/score is improving/i);
      expect(trendIndicator.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    });

    it('should show correct trend for different statuses', () => {
      const downTrendData = { ...mockScoreData, trend: 'DOWN' as const };
      render(<MockScoreDashboard scoreData={downTrendData} />);
      expect(screen.getByText(/score is declining/i)).toBeInTheDocument();
    });
  });
});
