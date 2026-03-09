/**
 * RetentionChart.tsx
 * User retention cohort analysis chart
 * Displays week-over-week or month-over-month retention rates
 */

import { useMemo } from 'react';
import { Card } from '../ui';
import clsx from 'clsx';

interface RetentionData {
  cohort: string;
  size: number;
  retention: number[];
}

interface RetentionChartProps {
  data: RetentionData[];
  periods?: string[];
  className?: string;
}

// Color scale for retention percentages
function getRetentionColor(value: number): string {
  if (value >= 80) return 'bg-success-500 text-white';
  if (value >= 60) return 'bg-success-400 text-white';
  if (value >= 40) return 'bg-warning-400 text-surface-900';
  if (value >= 20) return 'bg-warning-300 text-surface-900';
  if (value > 0) return 'bg-surface-200 text-surface-700';
  return 'bg-surface-100 text-surface-400';
}

export function RetentionChart({ data, periods, className }: RetentionChartProps) {
  // Calculate average retention per period
  const averageRetention = useMemo(() => {
    if (!data.length) return [];
    
    const maxPeriods = Math.max(...data.map(d => d.retention.length));
    const averages: number[] = [];
    
    for (let i = 0; i < maxPeriods; i++) {
      const values = data
        .filter(d => d.retention[i] !== undefined)
        .map(d => d.retention[i]);
      
      if (values.length > 0) {
        averages.push(Math.round(values.reduce((a, b) => a + b, 0) / values.length));
      }
    }
    
    return averages;
  }, [data]);

  // Calculate overall retention rate
  const overallRetention = useMemo(() => {
    if (!averageRetention.length) return 0;
    const lastPeriodValues = data
      .filter(d => d.retention.length > 0)
      .map(d => d.retention[0]);
    if (!lastPeriodValues.length) return 0;
    return Math.round(lastPeriodValues.reduce((a, b) => a + b, 0) / lastPeriodValues.length);
  }, [averageRetention, data]);

  // Default period labels
  const periodLabels = periods || ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];

  if (!data.length) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center h-48 text-surface-400">
          No retention data available
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-surface-900">User Retention</h3>
          <p className="text-sm text-surface-500">Week-over-week retention rates</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-surface-900">{overallRetention}%</p>
          <p className="text-xs text-surface-400">Avg Week 1 Retention</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-surface-500 font-medium">Cohort</th>
              <th className="text-center py-2 px-2 text-surface-500 font-medium">Users</th>
              {periodLabels.slice(0, Math.max(...data.map(d => d.retention.length), 4)).map((label, i) => (
                <th key={i} className="text-center py-2 px-2 text-surface-500 font-medium min-w-[60px]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-surface-100">
                <td className="py-2 px-2 font-medium text-surface-700">
                  {row.cohort}
                </td>
                <td className="py-2 px-2 text-center text-surface-600">
                  {row.size.toLocaleString()}
                </td>
                {row.retention.map((value, colIndex) => (
                  <td key={colIndex} className="py-1 px-1 text-center">
                    <span
                      className={clsx(
                        'inline-block w-12 py-1 rounded text-xs font-medium',
                        getRetentionColor(value)
                      )}
                    >
                      {value}%
                    </span>
                  </td>
                ))}
                {/* Fill empty cells */}
                {Array.from({ length: Math.max(0, 4 - row.retention.length) }).map((_, i) => (
                  <td key={`empty-${i}`} className="py-1 px-1 text-center">
                    <span className="inline-block w-12 py-1 rounded text-xs bg-surface-50 text-surface-300">
                      —
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Average row */}
          <tfoot>
            <tr className="border-t-2 border-surface-200 bg-surface-50">
              <td className="py-2 px-2 font-semibold text-surface-700">Average</td>
              <td className="py-2 px-2 text-center text-surface-600">—</td>
              {averageRetention.slice(0, 4).map((value, i) => (
                <td key={i} className="py-1 px-1 text-center">
                  <span
                    className={clsx(
                      'inline-block w-12 py-1 rounded text-xs font-semibold',
                      getRetentionColor(value)
                    )}
                  >
                    {value}%
                  </span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-surface-100">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-success-500" />
          <span className="text-xs text-surface-500">High (80%+)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-success-400" />
          <span className="text-xs text-surface-500">Good (60-79%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-warning-400" />
          <span className="text-xs text-surface-500">Medium (40-59%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-surface-200" />
          <span className="text-xs text-surface-500">Low (&lt;40%)</span>
        </div>
      </div>
    </Card>
  );
}

// Helper to generate mock retention data
export function generateMockRetentionData(): RetentionData[] {
  const weeks = ['Week of Jan 1', 'Week of Jan 8', 'Week of Jan 15', 'Week of Jan 22', 'Week of Jan 29'];
  
  return weeks.map((cohort, index) => {
    const size = Math.floor(Math.random() * 200) + 100;
    const maxRetention = weeks.length - index;
    const retention: number[] = [];
    
    let lastValue = 100;
    for (let i = 0; i < maxRetention; i++) {
      // Natural decay with some randomness
      const decay = Math.random() * 20 + 10;
      lastValue = Math.max(0, Math.round(lastValue - decay));
      retention.push(i === 0 ? 100 : lastValue);
    }
    
    return { cohort, size, retention };
  });
}

export default RetentionChart;
