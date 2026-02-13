import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { SessionProgress } from '../../types';
import { ProgressDisplay } from './ProgressDisplay';

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

interface ScoreDashboardProps {
  initialScore?: ScoreData;
  sessionId: string;
  onRefresh?: () => Promise<ScoreData>;
  refreshInterval?: number; // ms, 0 to disable
}

/**
 * ScoreDashboard - Complete score dashboard with live updates
 */
export const ScoreDashboard: React.FC<ScoreDashboardProps> = ({
  initialScore,
  sessionId: _sessionId,
  onRefresh,
  refreshInterval = 30000, // 30 seconds default
}) => {
  const [scoreData, setScoreData] = useState<ScoreData | null>(initialScore || null);
  const [isLoading, setIsLoading] = useState(!initialScore);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Calculate progress for ProgressDisplay
  const progress: SessionProgress = useMemo(() => {
    if (!scoreData) {
      return {
        percentage: 0,
        answered: 0,
        total: 0,
        sectionsCompleted: 0,
        totalSections: 0,
        currentSectionProgress: 0,
        currentSectionTotal: 0,
      };
    }

    return {
      percentage: Math.round(scoreData.completionPercentage),
      answered: scoreData.answeredQuestions,
      total: scoreData.totalQuestions,
      sectionsCompleted: scoreData.dimensions.filter((d) => d.answeredCount === d.questionCount)
        .length,
      totalSections: scoreData.dimensions.length,
      currentSectionProgress: 0,
      currentSectionTotal: 0,
    };
  }, [scoreData]);

  // Refresh function
  const refreshScore = useCallback(async () => {
    if (!onRefresh) {
      return;
    }

    try {
      setIsLoading(true);
      const newScore = await onRefresh();
      setScoreData(newScore);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh score:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onRefresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0 || !onRefresh) {
      return;
    }

    const interval = setInterval(() => void refreshScore(), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, onRefresh, refreshScore]);

  // Get trend icon
  const getTrendIcon = () => {
    if (!scoreData) {
      return null;
    }

    switch (scoreData.trend) {
      case 'UP':
        return (
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="ml-1 text-sm">Improving</span>
          </div>
        );
      case 'DOWN':
        return (
          <div className="flex items-center text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
            <span className="ml-1 text-sm">Declining</span>
          </div>
        );
      case 'STABLE':
        return (
          <div className="flex items-center text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
            <span className="ml-1 text-sm">Stable</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="ml-1 text-sm">First Assessment</span>
          </div>
        );
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) {
      return 'text-green-600';
    }
    if (score >= 60) {
      return 'text-yellow-600';
    }
    if (score >= 40) {
      return 'text-orange-600';
    }
    return 'text-red-600';
  };

  // Get score bg color for gauge
  const getScoreBgGradient = (score: number) => {
    if (score >= 80) {
      return 'from-green-400 to-green-600';
    }
    if (score >= 60) {
      return 'from-yellow-400 to-yellow-600';
    }
    if (score >= 40) {
      return 'from-orange-400 to-orange-600';
    }
    return 'from-red-400 to-red-600';
  };

  if (isLoading && !scoreData) {
    return (
      <div className="score-dashboard animate-pulse">
        <div className="h-48 bg-gray-200 rounded-xl mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-gray-200 rounded-lg" />
          <div className="h-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="score-dashboard text-center py-12">
        <p className="text-gray-500">No score data available</p>
        {onRefresh && (
          <button
            onClick={refreshScore}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Calculate Score
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="score-dashboard space-y-6">
      {/* Main score card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-300">Readiness Score</h2>
            {getTrendIcon()}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Last updated</p>
            <p className="text-sm text-gray-300">{lastUpdated.toLocaleTimeString()}</p>
            {onRefresh && (
              <button
                onClick={refreshScore}
                disabled={isLoading}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>

        {/* Large score display */}
        <div className="flex items-center justify-center my-8">
          <div className="relative">
            {/* Circular gauge background */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                className="text-gray-700"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
                r="86"
                cx="96"
                cy="96"
              />
              <circle
                className={`transition-all duration-1000 ${getScoreColor(scoreData.score).replace('text-', 'text-')}`}
                strokeWidth="12"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="86"
                cx="96"
                cy="96"
                strokeDasharray={`${(scoreData.score / 100) * 540} 540`}
                style={{
                  stroke:
                    scoreData.score >= 80
                      ? '#22C55E'
                      : scoreData.score >= 60
                        ? '#EAB308'
                        : scoreData.score >= 40
                          ? '#F97316'
                          : '#EF4444',
                }}
              />
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-5xl font-bold ${getScoreColor(scoreData.score).replace('text-', 'text-white/')}`}
              >
                {Math.round(scoreData.score)}
              </span>
              <span className="text-gray-400 text-sm">out of 100</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="text-center">
            <p className="text-3xl font-bold">{scoreData.answeredQuestions}</p>
            <p className="text-sm text-gray-400">Questions Answered</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{Math.round(scoreData.completionPercentage)}%</p>
            <p className="text-sm text-gray-400">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">
              {Math.round((1 - scoreData.portfolioResidual) * 100)}%
            </p>
            <p className="text-sm text-gray-400">Risk Covered</p>
          </div>
        </div>
      </div>

      {/* Progress display */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Progress Overview</h3>
        <ProgressDisplay progress={progress} showDetails={false} />
      </div>

      {/* Dimension breakdown */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Dimension Breakdown</h3>
        <div className="space-y-4">
          {scoreData.dimensions
            .sort((a, b) => b.residualRisk - a.residualRisk)
            .map((dim) => {
              const dimScore = Math.round((1 - dim.residualRisk) * 100);
              return (
                <div key={dim.key} className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{dim.name}</span>
                    <span className={`text-sm font-bold ${getScoreColor(dimScore)}`}>
                      {dimScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full bg-gradient-to-r ${getScoreBgGradient(dimScore)}`}
                      style={{ width: `${dimScore}%` }}
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
      </div>

      {/* Risk areas */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top risks */}
        <div className="bg-red-50 rounded-xl p-6 border border-red-100">
          <h3 className="text-lg font-semibold text-red-800 mb-4">High Risk Areas</h3>
          <ul className="space-y-2">
            {scoreData.dimensions
              .filter((d) => d.residualRisk > 0.5)
              .sort((a, b) => b.residualRisk - a.residualRisk)
              .slice(0, 3)
              .map((dim) => (
                <li key={dim.key} className="flex items-center gap-2 text-red-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
        </div>

        {/* Top performers */}
        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Top Performers</h3>
          <ul className="space-y-2">
            {scoreData.dimensions
              .filter((d) => d.residualRisk < 0.3)
              .sort((a, b) => a.residualRisk - b.residualRisk)
              .slice(0, 3)
              .map((dim) => (
                <li key={dim.key} className="flex items-center gap-2 text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
        </div>
      </div>
    </div>
  );
};

export default ScoreDashboard;
