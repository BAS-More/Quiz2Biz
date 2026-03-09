/**
 * Completion Rate Chart Component
 * Displays session completion vs abandonment over time
 */

import { useMemo } from 'react';
import clsx from 'clsx';

interface CompletionRateChartProps {
  data: Array<{
    date: string;
    completed: number;
    abandoned: number;
  }>;
  height?: number;
}

export function CompletionRateChart({
  data,
  height = 250,
}: CompletionRateChartProps) {
  // Calculate chart dimensions and scales
  const chartData = useMemo(() => {
    if (!data.length) return { maxValue: 0, bars: [] };

    const maxValue = Math.max(
      ...data.map((d) => d.completed + d.abandoned)
    );

    const bars = data.map((d) => ({
      date: d.date,
      completed: d.completed,
      abandoned: d.abandoned,
      total: d.completed + d.abandoned,
      completionRate: d.completed / (d.completed + d.abandoned) * 100,
    }));

    return { maxValue, bars };
  }, [data]);

  // Calculate averages
  const avgCompletionRate = useMemo(() => {
    if (!chartData.bars.length) return 0;
    const totalCompleted = chartData.bars.reduce((sum, b) => sum + b.completed, 0);
    const totalAll = chartData.bars.reduce((sum, b) => sum + b.total, 0);
    return totalAll > 0 ? (totalCompleted / totalAll) * 100 : 0;
  }, [chartData.bars]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!data.length) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-surface-400"
      >
        No data available
      </div>
    );
  }

  const barWidth = 100 / data.length;
  const padding = barWidth * 0.2;

  return (
    <div style={{ height }}>
      {/* Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-success-500" />
            <span className="text-surface-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-danger-300" />
            <span className="text-surface-600">Abandoned</span>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-surface-500">Avg. Rate: </span>
          <span className="font-semibold text-success-600">
            {avgCompletionRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: height - 60 }}>
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[100, 75, 50, 25, 0].map((pct) => (
            <div
              key={pct}
              className="flex items-center"
              style={{ height: 0 }}
            >
              <span className="w-8 text-xs text-surface-400 text-right pr-2">
                {Math.round((chartData.maxValue * pct) / 100)}
              </span>
              <div className="flex-1 border-b border-surface-100" />
            </div>
          ))}
        </div>

        {/* Bars */}
        <div
          className="absolute left-8 right-0 bottom-6 top-0 flex items-end"
        >
          {chartData.bars.map((bar, index) => {
            const totalHeight =
              chartData.maxValue > 0
                ? (bar.total / chartData.maxValue) * 100
                : 0;
            const completedHeight =
              bar.total > 0 ? (bar.completed / bar.total) * 100 : 0;

            return (
              <div
                key={bar.date}
                className="relative flex flex-col items-center justify-end group"
                style={{ width: `${barWidth}%`, padding: `0 ${padding / 2}%` }}
              >
                {/* Stacked Bar */}
                <div
                  className="w-full rounded-t-sm overflow-hidden transition-all duration-200 group-hover:opacity-80"
                  style={{ height: `${totalHeight}%` }}
                >
                  {/* Abandoned (top) */}
                  <div
                    className="w-full bg-danger-300"
                    style={{ height: `${100 - completedHeight}%` }}
                  />
                  {/* Completed (bottom) */}
                  <div
                    className="w-full bg-success-500"
                    style={{ height: `${completedHeight}%` }}
                  />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-surface-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                    <div className="font-medium mb-1">{formatDate(bar.date)}</div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm bg-success-400" />
                      Completed: {bar.completed}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm bg-danger-300" />
                      Abandoned: {bar.abandoned}
                    </div>
                    <div className="border-t border-surface-600 mt-1 pt-1">
                      Rate: {bar.completionRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="absolute left-8 right-0 bottom-0 flex text-xs text-surface-400">
          {chartData.bars.map((bar, index) => (
            <div
              key={bar.date}
              className="text-center truncate"
              style={{ width: `${barWidth}%` }}
            >
              {index % Math.ceil(data.length / 7) === 0 && formatDate(bar.date)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompletionRateChart;
