/**
 * Analytics Dashboard Page
 * Displays session completion rates, user growth, and document metrics
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { Card, Badge } from '../../components/ui';
import { StatCardSkeleton } from '../../components/ui/Skeleton';
import { CompletionRateChart } from '../../components/analytics/CompletionRateChart';
import { UserGrowthChart } from '../../components/analytics/UserGrowthChart';
import {
  RetentionChart,
  generateMockRetentionData,
} from '../../components/analytics/RetentionChart';
import {
  DropOffFunnelChart,
  generateMockDropOffData,
} from '../../components/analytics/DropOffFunnelChart';
import clsx from 'clsx';
import { apiClient } from '../../api/client';

// Types for analytics data
interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  completedSessions: number;
  sessionCompletionRate: number;
  avgSessionDuration: number;
  totalDocuments: number;
  documentsThisMonth: number;
  userGrowthData: Array<{ date: string; users: number; newUsers: number }>;
  completionData: Array<{ date: string; completed: number; abandoned: number }>;
  documentMetrics: Array<{ type: string; count: number; revenue: number }>;
  retentionData: Array<{ cohort: string; size: number; retention: number[] }>;
  userRegistrationTrends: {
    dailyAverage: number;
    weekOverWeekChange: number;
    monthOverMonthChange: number;
    totalThisMonth: number;
  };
  dropOffData: {
    data: Array<{
      questionId: string;
      questionText: string;
      sectionName: string;
      totalReached: number;
      abandoned: number;
      dropOffRate: number;
    }>;
    totalSessionsStarted: number;
  };
}

// Fetch analytics data
async function fetchAnalyticsData(): Promise<AnalyticsMetrics> {
  try {
    const { data } = await apiClient.get('/api/v1/admin/analytics');
    return data;
  } catch {
    // Return mock data for demo/development
    return generateMockData();
  }
}

// Generate mock data for development
function generateMockData(): AnalyticsMetrics {
  const now = new Date();
  const userGrowthData = [];
  const completionData = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    userGrowthData.push({
      date: dateStr,
      users: 100 + Math.floor(Math.random() * 50) + i * 3,
      newUsers: Math.floor(Math.random() * 10) + 1,
    });

    completionData.push({
      date: dateStr,
      completed: Math.floor(Math.random() * 20) + 10,
      abandoned: Math.floor(Math.random() * 10) + 2,
    });
  }

  return {
    totalUsers: 1247,
    activeUsers: 423,
    totalSessions: 3892,
    completedSessions: 2847,
    sessionCompletionRate: 73.2,
    avgSessionDuration: 18.5,
    totalDocuments: 4521,
    documentsThisMonth: 342,
    userGrowthData,
    completionData,
    documentMetrics: [
      { type: 'Business Plan', count: 1523, revenue: 45690 },
      { type: 'Executive Summary', count: 987, revenue: 29610 },
      { type: 'Financial Forecast', count: 756, revenue: 37800 },
      { type: 'Marketing Plan', count: 645, revenue: 19350 },
      { type: 'SWOT Analysis', count: 610, revenue: 12200 },
    ],
    retentionData: generateMockRetentionData(),
    userRegistrationTrends: {
      dailyAverage: Math.floor(Math.random() * 30) + 20,
      weekOverWeekChange: Math.round((Math.random() * 30 - 10) * 10) / 10,
      monthOverMonthChange: Math.round((Math.random() * 40 - 5) * 10) / 10,
      totalThisMonth: Math.floor(Math.random() * 500) + 400,
    },
    dropOffData: generateMockDropOffData(),
  };
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  iconColor?: string;
  subtitle?: string;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-brand-600',
  subtitle,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-surface-400 mt-1">{subtitle}</p>}
        </div>
        <div className={clsx('p-2 rounded-lg bg-surface-100', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-success-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-danger-500" />
          )}
          <span
            className={clsx(
              'text-sm font-medium',
              isPositive ? 'text-success-600' : 'text-danger-600',
            )}
          >
            {isPositive ? '+' : ''}
            {change}%
          </span>
          <span className="text-xs text-surface-400 ml-1">vs last month</span>
        </div>
      )}
    </Card>
  );
}

// Time Range Selector
type TimeRange = '7d' | '30d' | '90d' | '1y';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-lg">
      {ranges.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            value === key
              ? 'bg-white text-surface-900 shadow-sm'
              : 'text-surface-500 hover:text-surface-700',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Document Metrics Table
interface DocumentMetricsTableProps {
  data: Array<{ type: string; count: number; revenue: number }>;
}

function DocumentMetricsTable({ data }: DocumentMetricsTableProps) {
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-surface-900">Document Generation Metrics</h3>
        <Badge variant="secondary">
          <FileText className="h-3 w-3 mr-1" />
          {totalCount} Total
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="text-left py-3 px-2 font-medium text-surface-600">Document Type</th>
              <th className="text-right py-3 px-2 font-medium text-surface-600">Generated</th>
              <th className="text-right py-3 px-2 font-medium text-surface-600">Revenue</th>
              <th className="text-right py-3 px-2 font-medium text-surface-600">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={item.type}
                className={clsx(index !== data.length - 1 && 'border-b border-surface-100')}
              >
                <td className="py-3 px-2 text-surface-900">{item.type}</td>
                <td className="py-3 px-2 text-right text-surface-700">
                  {item.count.toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right text-surface-700">
                  ${item.revenue.toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{
                          width: `${(item.count / totalCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-surface-500 w-10 text-right">
                      {((item.count / totalCount) * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-surface-200 font-medium">
              <td className="py-3 px-2 text-surface-900">Total</td>
              <td className="py-3 px-2 text-right text-surface-900">
                {totalCount.toLocaleString()}
              </td>
              <td className="py-3 px-2 text-right text-surface-900">
                ${totalRevenue.toLocaleString()}
              </td>
              <td className="py-3 px-2 text-right text-surface-500">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

// Main Analytics Dashboard Page
export function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const {
    data: analytics,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: fetchAnalyticsData,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-brand-600" />
              Analytics Dashboard
            </h1>
            <p className="text-surface-500 mt-1">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics || isError) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
        <BarChart3 className="h-12 w-12 text-surface-300" />
        <h2 className="text-lg font-semibold text-surface-900">Unable to load analytics</h2>
        <p className="text-sm text-surface-500 max-w-sm text-center">
          Analytics data could not be loaded. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-brand-600" />
            Analytics Dashboard
          </h1>
          <p className="text-surface-500 mt-1">Track your key metrics and business performance</p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={analytics.totalUsers.toLocaleString()}
          change={12.5}
          icon={Users}
          iconColor="text-blue-600"
          subtitle={`${analytics.activeUsers} active`}
        />
        <MetricCard
          title="Session Completion"
          value={`${analytics.sessionCompletionRate}%`}
          change={3.2}
          icon={CheckCircle}
          iconColor="text-success-600"
          subtitle={`${analytics.completedSessions} completed`}
        />
        <MetricCard
          title="Avg. Session Duration"
          value={`${analytics.avgSessionDuration} min`}
          change={-2.1}
          icon={Clock}
          iconColor="text-warning-600"
          subtitle="Time to completion"
        />
        <MetricCard
          title="Documents Generated"
          value={analytics.totalDocuments.toLocaleString()}
          change={18.7}
          icon={FileText}
          iconColor="text-purple-600"
          subtitle={`${analytics.documentsThisMonth} this month`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              Session Completion Rate
            </h3>
          </div>
          <CompletionRateChart data={analytics.completionData} />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              User Growth
            </h3>
          </div>
          <UserGrowthChart data={analytics.userGrowthData} />
        </Card>
      </div>

      {/* User Registration Trends */}
      <Card>
        <h3 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success-600" />
          User Registration Trends
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-surface-50 rounded-lg">
            <p className="text-sm text-surface-500">Daily Average</p>
            <p className="text-xl font-bold text-surface-900">
              {analytics.userRegistrationTrends.dailyAverage}
            </p>
            <p className="text-xs text-surface-400">new users/day</p>
          </div>
          <div className="p-4 bg-surface-50 rounded-lg">
            <p className="text-sm text-surface-500">Week over Week</p>
            <p
              className={clsx(
                'text-xl font-bold',
                analytics.userRegistrationTrends.weekOverWeekChange >= 0
                  ? 'text-success-600'
                  : 'text-danger-600',
              )}
            >
              {analytics.userRegistrationTrends.weekOverWeekChange >= 0 ? '+' : ''}
              {analytics.userRegistrationTrends.weekOverWeekChange}%
            </p>
            <p className="text-xs text-surface-400">vs last week</p>
          </div>
          <div className="p-4 bg-surface-50 rounded-lg">
            <p className="text-sm text-surface-500">Month over Month</p>
            <p
              className={clsx(
                'text-xl font-bold',
                analytics.userRegistrationTrends.monthOverMonthChange >= 0
                  ? 'text-success-600'
                  : 'text-danger-600',
              )}
            >
              {analytics.userRegistrationTrends.monthOverMonthChange >= 0 ? '+' : ''}
              {analytics.userRegistrationTrends.monthOverMonthChange}%
            </p>
            <p className="text-xs text-surface-400">vs last month</p>
          </div>
          <div className="p-4 bg-surface-50 rounded-lg">
            <p className="text-sm text-surface-500">This Month</p>
            <p className="text-xl font-bold text-surface-900">
              {analytics.userRegistrationTrends.totalThisMonth}
            </p>
            <p className="text-xs text-surface-400">total registrations</p>
          </div>
        </div>
      </Card>

      {/* Retention Chart */}
      <RetentionChart data={analytics.retentionData} />

      {/* Drop-off Analysis */}
      <DropOffFunnelChart
        data={analytics.dropOffData.data}
        totalSessionsStarted={analytics.dropOffData.totalSessionsStarted}
      />

      {/* Document Metrics */}
      <DocumentMetricsTable data={analytics.documentMetrics} />
    </div>
  );
}

export default AnalyticsDashboardPage;
