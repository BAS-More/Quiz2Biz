/**
 * User Growth Chart Component
 * Displays cumulative users and new user signups over time
 */

import { useMemo } from 'react';

interface UserGrowthChartProps {
  data: Array<{
    date: string;
    users: number;
    newUsers: number;
  }>;
  height?: number;
}

export function UserGrowthChart({
  data,
  height = 250,
}: UserGrowthChartProps) {
  // Calculate chart dimensions and scales
  const chartData = useMemo(() => {
    if (!data.length) return { maxUsers: 0, maxNew: 0, points: [] };

    const maxUsers = Math.max(...data.map((d) => d.users));
    const maxNew = Math.max(...data.map((d) => d.newUsers));

    const points = data.map((d, i) => ({
      date: d.date,
      users: d.users,
      newUsers: d.newUsers,
      x: (i / (data.length - 1)) * 100,
      yUsers: maxUsers > 0 ? 100 - (d.users / maxUsers) * 100 : 100,
      yNew: maxNew > 0 ? 100 - (d.newUsers / maxNew) * 100 : 100,
    }));

    return { maxUsers, maxNew, points };
  }, [data]);

  // Calculate totals
  const totalNewUsers = useMemo(() => {
    return data.reduce((sum, d) => sum + d.newUsers, 0);
  }, [data]);

  const latestUsers = data.length > 0 ? data[data.length - 1].users : 0;

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

  // Generate SVG path for line chart
  const userLinePath = chartData.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yUsers}`)
    .join(' ');

  // Generate area path for gradient fill
  const areaPath = `${userLinePath} L ${100} ${100} L ${0} ${100} Z`;

  return (
    <div style={{ height }}>
      {/* Legend and Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-surface-600">Total Users</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-brand-400" />
            <span className="text-surface-600">New Users</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-surface-500">Total: </span>
            <span className="font-semibold text-surface-900">
              {latestUsers.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-surface-500">New: </span>
            <span className="font-semibold text-brand-600">
              +{totalNewUsers.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: height - 60 }}>
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[100, 75, 50, 25, 0].map((pct) => (
            <div key={pct} className="flex items-center" style={{ height: 0 }}>
              <span className="w-8 text-xs text-surface-400 text-right pr-2">
                {Math.round((chartData.maxUsers * pct) / 100)}
              </span>
              <div className="flex-1 border-b border-surface-100" />
            </div>
          ))}
        </div>

        {/* SVG Chart Area */}
        <svg
          className="absolute left-8 right-0 bottom-6 top-0"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaPath} fill="url(#userGradient)" />

          {/* Line */}
          <path
            d={userLinePath}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {chartData.points.map((point) => (
            <g key={point.date} className="group">
              <circle
                cx={point.x}
                cy={point.yUsers}
                r="3"
                fill="rgb(59, 130, 246)"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>

        {/* New Users Bar Overlay */}
        <div className="absolute left-8 right-0 bottom-6 top-0 flex items-end pointer-events-none">
          {chartData.points.map((point) => {
            const barHeight =
              chartData.maxNew > 0
                ? (point.newUsers / chartData.maxNew) * 30
                : 0;
            return (
              <div
                key={point.date}
                className="flex justify-center"
                style={{ width: `${100 / data.length}%` }}
              >
                <div
                  className="w-1.5 bg-brand-400 rounded-t-sm opacity-60"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Hover tooltips */}
        <div className="absolute left-8 right-0 bottom-6 top-0 flex">
          {chartData.points.map((point) => (
            <div
              key={point.date}
              className="flex-1 relative group"
            >
              <div className="absolute inset-0 hover:bg-surface-100/50 transition-colors" />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-surface-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                  <div className="font-medium mb-1">{formatDate(point.date)}</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Total Users: {point.users.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm bg-brand-400" />
                    New Users: +{point.newUsers}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="absolute left-8 right-0 bottom-0 flex text-xs text-surface-400">
          {chartData.points.map((point, index) => (
            <div
              key={point.date}
              className="text-center truncate"
              style={{ width: `${100 / data.length}%` }}
            >
              {index % Math.ceil(data.length / 7) === 0 && formatDate(point.date)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserGrowthChart;
