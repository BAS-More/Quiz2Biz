/**
 * DropOffFunnelChart.tsx
 * Question drop-off funnel analysis visualization
 * Tracks abandonment points in questionnaire flows
 */

import { useMemo } from 'react';
import { Card } from '../ui';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface DropOffStep {
  questionId: string;
  questionText: string;
  sectionName: string;
  totalReached: number;
  abandoned: number;
  dropOffRate: number;
}

interface DropOffFunnelChartProps {
  data: DropOffStep[];
  totalSessionsStarted: number;
  className?: string;
}

// Color scale for drop-off rates
function getDropOffColor(rate: number): string {
  if (rate >= 20) return 'text-danger-600 bg-danger-50';
  if (rate >= 10) return 'text-warning-600 bg-warning-50';
  if (rate >= 5) return 'text-surface-600 bg-surface-100';
  return 'text-success-600 bg-success-50';
}


export function DropOffFunnelChart({
  data,
  totalSessionsStarted,
  className,
}: DropOffFunnelChartProps) {
  // Calculate overall metrics
  const metrics = useMemo(() => {
    if (!data.length) return null;

    const totalAbandoned = data.reduce((sum, step) => sum + step.abandoned, 0);
    const avgDropOffRate = data.reduce((sum, step) => sum + step.dropOffRate, 0) / data.length;
    
    // Find worst drop-off points
    const sortedByDropOff = [...data].sort((a, b) => b.dropOffRate - a.dropOffRate);
    const worstPoints = sortedByDropOff.slice(0, 3);
    
    // Group by section
    const sectionStats: Record<string, { abandoned: number; reached: number }> = {};
    data.forEach((step) => {
      if (!sectionStats[step.sectionName]) {
        sectionStats[step.sectionName] = { abandoned: 0, reached: 0 };
      }
      sectionStats[step.sectionName].abandoned += step.abandoned;
      sectionStats[step.sectionName].reached += step.totalReached;
    });

    return {
      totalAbandoned,
      avgDropOffRate: Math.round(avgDropOffRate * 10) / 10,
      worstPoints,
      sectionStats,
      completionRate: Math.round(((totalSessionsStarted - totalAbandoned) / totalSessionsStarted) * 100),
    };
  }, [data, totalSessionsStarted]);

  if (!data.length || !metrics) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center h-48 text-surface-400">
          No drop-off data available
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-surface-900 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-danger-500" />
            Question Drop-off Analysis
          </h3>
          <p className="text-sm text-surface-500">
            Identify where users abandon questionnaires
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-surface-900">{metrics.completionRate}%</p>
          <p className="text-xs text-surface-400">Overall Completion</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-surface-50 rounded-lg">
          <p className="text-sm text-surface-500">Sessions Started</p>
          <p className="text-lg font-bold text-surface-900">{totalSessionsStarted.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-danger-50 rounded-lg">
          <p className="text-sm text-danger-600">Total Abandoned</p>
          <p className="text-lg font-bold text-danger-700">{metrics.totalAbandoned.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-surface-50 rounded-lg">
          <p className="text-sm text-surface-500">Avg Drop-off Rate</p>
          <p className="text-lg font-bold text-surface-900">{metrics.avgDropOffRate}%</p>
        </div>
      </div>

      {/* Worst Drop-off Points */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-surface-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning-500" />
          Highest Drop-off Points
        </h4>
        <div className="space-y-3">
          {metrics.worstPoints.map((point, index) => (
            <div
              key={point.questionId}
              className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-200 flex items-center justify-center text-sm font-medium text-surface-600">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">
                  {point.questionText}
                </p>
                <p className="text-xs text-surface-400">{point.sectionName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'px-2 py-1 rounded text-xs font-medium',
                    getDropOffColor(point.dropOffRate)
                  )}
                >
                  {point.dropOffRate}% drop-off
                </span>
                <span className="text-xs text-surface-400">
                  ({point.abandoned} users)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-surface-700 mb-3">
          Drop-off Funnel
        </h4>
        <div className="relative">
          {data.slice(0, 8).map((step, index) => {
            const widthPercent = Math.max(20, (step.totalReached / totalSessionsStarted) * 100);
            const isLast = index === Math.min(data.length - 1, 7);

            return (
              <div key={step.questionId} className="relative mb-2">
                <div
                  className="h-10 rounded-lg flex items-center px-4 transition-all"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: `hsl(${220 - index * 15}, 70%, ${60 + index * 3}%)`,
                  }}
                >
                  <span className="text-xs font-medium text-white truncate">
                    Q{index + 1}: {step.totalReached.toLocaleString()} users
                  </span>
                </div>
                {!isLast && step.abandoned > 0 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-danger-400" />
                    <span className="text-xs text-danger-600 font-medium">
                      -{step.abandoned}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drop-off by Section */}
      <div>
        <h4 className="text-sm font-medium text-surface-700 mb-3">
          Drop-off by Section
        </h4>
        <div className="space-y-2">
          {Object.entries(metrics.sectionStats).map(([section, stats]) => {
            const rate = Math.round((stats.abandoned / stats.reached) * 100);
            return (
              <div
                key={section}
                className="flex items-center justify-between p-3 border border-surface-100 rounded-lg"
              >
                <span className="text-sm font-medium text-surface-700">{section}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-surface-500">
                    {stats.abandoned} / {stats.reached} users
                  </span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      getDropOffColor(rate)
                    )}
                  >
                    {rate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// Helper to generate mock drop-off data
export function generateMockDropOffData(): { data: DropOffStep[]; totalSessionsStarted: number } {
  const sections = ['Business Basics', 'Market Analysis', 'Financial Planning', 'Team & Operations'];
  const questionsPerSection = 3;
  const totalSessionsStarted = 1000;
  
  const data: DropOffStep[] = [];
  let remaining = totalSessionsStarted;
  
  sections.forEach((sectionName, sectionIndex) => {
    for (let q = 0; q < questionsPerSection; q++) {
      const questionIndex = sectionIndex * questionsPerSection + q;
      
      // Higher drop-off at beginning and end of sections
      const baseDropOff = q === 0 ? 8 : q === questionsPerSection - 1 ? 6 : 3;
      const dropOffRate = baseDropOff + Math.random() * 5;
      const abandoned = Math.floor(remaining * (dropOffRate / 100));
      
      data.push({
        questionId: `q-${sectionIndex}-${q}`,
        questionText: `Question ${questionIndex + 1}: Sample question text here?`,
        sectionName,
        totalReached: remaining,
        abandoned,
        dropOffRate: Math.round(dropOffRate * 10) / 10,
      });
      
      remaining -= abandoned;
    }
  });
  
  return { data, totalSessionsStarted };
}

export default DropOffFunnelChart;
