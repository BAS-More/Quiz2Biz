/**
 * Dashboard page - Project-based Chat-First Design
 * Shows projects with quality scores, chat progress, and document generation status
 * Design: Gradient stat cards, progress rings, activity timeline, hover animations
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import projectApi from '../../api/projects';
import type { Project, ProjectListResponse } from '../../api/projects';
import {
  MessageSquare,
  FileText,
  Target,
  TrendingUp,
  Play,
  CheckCircle,
  Plus,
  ArrowRight,
  Calendar,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCardSkeleton, ListItemSkeleton } from '../../components/ui/Skeleton';
import { clsx } from 'clsx';

/** Maximum messages per project (chat limit) */
const MESSAGE_LIMIT = 50;

/** Circular progress ring SVG */
function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color =
    value >= 80
      ? 'text-success-500'
      : value >= 60
        ? 'text-warning-500'
        : value >= 40
          ? 'text-brand-500'
          : 'text-danger-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={clsx(color, 'transition-all duration-1000 ease-out')}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-surface-900">
          {value > 0 ? `${value.toFixed(0)}%` : '--'}
        </span>
      </div>
    </div>
  );
}

/** Stat card with gradient icon background */
function StatCard({
  name,
  value,
  icon: Icon,
  gradient,
  subtitle,
}: {
  name: string;
  value: string;
  icon: typeof Target;
  gradient: string;
  subtitle?: string;
}) {
  return (
    <Card hover className="group">
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            'flex items-center justify-center w-11 h-11 rounded-xl shadow-xs transition-shadow group-hover:shadow-elevated',
            gradient,
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-surface-900 tracking-tight">{value}</p>
          <p className="text-sm text-surface-500">{name}</p>
          {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

/** Chat progress indicator */
function ChatProgress({ messageCount }: { messageCount: number }) {
  const percentage = Math.min((messageCount / MESSAGE_LIMIT) * 100, 100);
  const isNearLimit = messageCount >= MESSAGE_LIMIT - 5;
  const isAtLimit = messageCount >= MESSAGE_LIMIT;

  return (
    <div className="flex items-center gap-3 mt-1.5">
      <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            isAtLimit ? 'bg-success-500' : isNearLimit ? 'bg-warning-500' : 'bg-brand-500',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span
        className={clsx(
          'text-xs shrink-0',
          isAtLimit ? 'text-success-600 font-medium' : 'text-surface-400',
        )}
      >
        {messageCount}/{MESSAGE_LIMIT}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: ProjectListResponse = await projectApi.getProjects(1, 50);
      setProjects(response.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Filter projects by status
  const activeProjects = projects.filter((p) => p.status === 'DRAFT' || p.status === 'ACTIVE');
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED');

  // Calculate quality scores
  const scores = projects
    .filter((p) => p.qualityScore != null && p.qualityScore > 0)
    .map((p) => p.qualityScore!);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Greeting based on time of day
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const clearError = () => setError(null);

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="h-3.5 w-3.5 text-surface-400" />
            <p className="text-sm text-surface-500">{today}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/chat/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium shadow-xs hover:bg-brand-700 hover:shadow-elevated active:bg-brand-800 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="ml-2 text-sm font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <StatCard
            name="Active Projects"
            value={String(activeProjects.length)}
            icon={MessageSquare}
            gradient="bg-gradient-to-br from-brand-500 to-brand-600"
          />
          <StatCard
            name="Completed"
            value={String(completedProjects.length)}
            icon={CheckCircle}
            gradient="bg-gradient-to-br from-success-500 to-success-600"
          />
          <StatCard
            name="Best Quality"
            value={highestScore > 0 ? `${highestScore.toFixed(0)}%` : '--'}
            icon={Target}
            gradient="bg-gradient-to-br from-accent-500 to-accent-600"
          />
          <StatCard
            name="Avg Quality"
            value={avgScore > 0 ? `${avgScore.toFixed(0)}%` : '--'}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-warning-500 to-warning-600"
          />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active projects - takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Projects */}
          <Card padding="none" className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-brand-600" />
                </div>
                <h2 className="text-base font-semibold text-surface-900">Active Projects</h2>
              </div>
              {activeProjects.length > 0 && (
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {activeProjects.length} in progress
                </span>
              )}
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <ListItemSkeleton key={i} />
                  ))}
                </div>
              ) : activeProjects.length === 0 ? (
                <EmptyState
                  type="sessions"
                  title="No active projects"
                  description="Start a conversation to build your business plan with AI assistance."
                  action={{
                    label: 'Start your first project',
                    onClick: () => navigate('/chat/new'),
                  }}
                  size="sm"
                />
              ) : (
                <div className="space-y-2">
                  {activeProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-surface-100 hover:border-surface-200 hover:shadow-xs transition-all group cursor-pointer"
                      onClick={() => navigate(`/chat/${project.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/chat/${project.id}`);
                      }}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Project type avatar */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                          {(project.projectTypeName ?? project.name ?? 'P')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-900 truncate">
                              {project.name || project.projectTypeName || 'Untitled Project'}
                            </span>
                            {project.qualityScore != null && project.qualityScore > 0 && (
                              <span
                                className={clsx(
                                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                                  project.qualityScore >= 80
                                    ? 'bg-success-50 text-success-700'
                                    : project.qualityScore >= 60
                                      ? 'bg-warning-50 text-warning-700'
                                      : 'bg-danger-50 text-danger-700',
                                )}
                              >
                                {project.qualityScore.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <ChatProgress messageCount={project.messageCount} />
                        </div>
                      </div>
                      <div className="ml-3 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                          <Play className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Completed projects */}
          {completedProjects.length > 0 && (
            <Card padding="none" className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success-600" />
                  </div>
                  <h2 className="text-base font-semibold text-surface-900">Completed Projects</h2>
                </div>
                <span className="text-xs font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-full">
                  {completedProjects.length} ready for docs
                </span>
              </div>
              <div className="p-4 space-y-2">
                {completedProjects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-surface-100 hover:border-surface-200 transition-colors cursor-pointer"
                    onClick={() => navigate(`/project/${project.id}/documents`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/project/${project.id}/documents`);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center text-success-600 text-xs font-bold shrink-0">
                        {(project.projectTypeName ?? project.name ?? 'P').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-surface-900 truncate block">
                          {project.name || project.projectTypeName || 'Untitled Project'}
                        </span>
                        <span className="text-xs text-surface-400">
                          Quality: {project.qualityScore?.toFixed(0) ?? 'N/A'}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-400 shrink-0">
                        {new Date(project.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <ArrowRight className="h-4 w-4 text-surface-300" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar column */}
        <div className="space-y-6">
          {/* Quality Score Ring */}
          <Card
            className="animate-slide-up text-center"
            style={{ animationDelay: '0.15s' }}
            data-testid="readiness-score"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent-500" />
              <h3 className="text-sm font-semibold text-surface-700">Quality Score</h3>
            </div>
            <ProgressRing value={avgScore} size={120} strokeWidth={8} />
            <p className="text-xs text-surface-400 mt-3">
              {avgScore >= 80
                ? 'Excellent! Your project quality is outstanding.'
                : avgScore > 0
                  ? `Average across ${scores.length} scored project${scores.length !== 1 ? 's' : ''}`
                  : 'Chat with AI to build quality and unlock documents'}
            </p>
          </Card>

          {/* Quick Actions */}
          <Card padding="none" className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <div className="px-5 py-3.5 border-b border-surface-100">
              <h3 className="text-sm font-semibold text-surface-700">Quick Actions</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => navigate('/chat/new')}
                className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-brand-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-100 transition-colors">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">Start New Chat</p>
                  <p className="text-xs text-surface-400">
                    Build your business plan through conversation
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-brand-500 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/documents')}
                className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center text-surface-500 group-hover:bg-surface-200 transition-colors">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">View Documents</p>
                  <p className="text-xs text-surface-400">Access your generated reports</p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-surface-500 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/billing')}
                className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center text-surface-500 group-hover:bg-surface-200 transition-colors">
                  <Target className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">Manage Billing</p>
                  <p className="text-xs text-surface-400">Plans, invoices, and payments</p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-surface-500 transition-colors" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
