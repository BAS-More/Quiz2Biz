/**
 * Dashboard page - Modern SaaS design
 * Shows real session data, readiness scores, active assessments, and quick actions
 * Design: Gradient stat cards, progress rings, activity timeline, hover animations
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useQuestionnaireStore } from '../../stores/questionnaire';
import {
  ClipboardList,
  FileText,
  Target,
  TrendingUp,
  Play,
  CheckCircle,
  Plus,
  ArrowRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/ui';
import { StatCardSkeleton, ListItemSkeleton } from '../../components/ui/Skeleton';
import { clsx } from 'clsx';

/** Circular progress ring SVG */
function ProgressRing({ value, size = 80, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 95 ? 'text-success-500' : value >= 70 ? 'text-warning-500' : value >= 40 ? 'text-brand-500' : 'text-danger-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-surface-100" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className={clsx(color, 'transition-all duration-1000 ease-out')}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-surface-900">{value > 0 ? `${value.toFixed(0)}%` : '--'}</span>
      </div>
    </div>
  );
}

/** Stat card with gradient icon background */
function StatCard({ name, value, icon: Icon, gradient, subtitle }: {
  name: string; value: string; icon: typeof Target; gradient: string; subtitle?: string;
}) {
  return (
    <Card hover className="group">
      <div className="flex items-center gap-4">
        <div className={clsx('flex items-center justify-center w-11 h-11 rounded-xl shadow-xs transition-shadow group-hover:shadow-elevated', gradient)}>
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

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { sessions, isLoading, error, loadSessions, clearError } = useQuestionnaireStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const activeSessions = sessions.filter((s) => s.status === 'IN_PROGRESS');
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const scores = completedSessions.filter((s) => s.readinessScore != null).map((s) => s.readinessScore!);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
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
          onClick={() => navigate('/idea')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium shadow-xs hover:bg-brand-700 hover:shadow-elevated active:bg-brand-800 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 flex items-center justify-between animate-slide-up">
          <span className="text-sm">{error}</span>
          <button onClick={clearError} className="ml-2 text-sm font-medium underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <StatCard name="Active Sessions" value={String(activeSessions.length)} icon={ClipboardList} gradient="bg-gradient-to-br from-brand-500 to-brand-600" />
          <StatCard name="Completed" value={String(completedSessions.length)} icon={CheckCircle} gradient="bg-gradient-to-br from-success-500 to-success-600" />
          <StatCard name="Highest Score" value={highestScore > 0 ? `${highestScore.toFixed(0)}%` : '--'} icon={Target} gradient="bg-gradient-to-br from-accent-500 to-accent-600" />
          <StatCard name="Avg Score" value={avgScore > 0 ? `${avgScore.toFixed(0)}%` : '--'} icon={TrendingUp} gradient="bg-gradient-to-br from-warning-500 to-warning-600" />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active assessments - takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Sessions */}
          <Card padding="none" className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-brand-600" />
                </div>
                <h2 className="text-base font-semibold text-surface-900">Active Assessments</h2>
              </div>
              {activeSessions.length > 0 && (
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {activeSessions.length} in progress
                </span>
              )}
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <ListItemSkeleton key={i} />)}
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-50 flex items-center justify-center mb-4">
                    <ClipboardList className="h-8 w-8 text-surface-300" />
                  </div>
                  <p className="text-sm font-medium text-surface-700">No active assessments</p>
                  <p className="text-sm text-surface-400 mt-1 max-w-sm mx-auto">Describe your idea to get started with AI-powered analysis.</p>
                  <button
                    onClick={() => navigate('/idea')}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Start your first project
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-surface-100 hover:border-surface-200 hover:shadow-xs transition-all group cursor-pointer"
                      onClick={() => navigate(`/questionnaire?sessionId=${s.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/questionnaire?sessionId=${s.id}`); }}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Persona avatar */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                          {s.persona?.slice(0, 3) ?? 'GEN'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-900 truncate">
                              {s.persona ?? 'General'} Assessment
                            </span>
                            {s.readinessScore != null && (
                              <span className={clsx(
                                'text-xs font-semibold px-2 py-0.5 rounded-full',
                                s.readinessScore >= 95 ? 'bg-success-50 text-success-700'
                                  : s.readinessScore >= 70 ? 'bg-warning-50 text-warning-700'
                                    : 'bg-danger-50 text-danger-700',
                              )}>
                                {s.readinessScore.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                                style={{ width: `${s.progress.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-surface-400 shrink-0">
                              {s.progress.answeredQuestions}/{s.progress.totalQuestions}
                            </span>
                          </div>
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

          {/* Completed sessions */}
          {completedSessions.length > 0 && (
            <Card padding="none" className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success-600" />
                  </div>
                  <h2 className="text-base font-semibold text-surface-900">Completed Assessments</h2>
                </div>
                <span className="text-xs font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-full">
                  {completedSessions.length} done
                </span>
              </div>
              <div className="p-4 space-y-2">
                {completedSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-surface-100 hover:border-surface-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center text-success-600 text-xs font-bold shrink-0">
                        {s.persona?.slice(0, 2) ?? 'GN'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-surface-900 truncate block">
                          {s.persona ?? 'General'} Assessment
                        </span>
                        <span className="text-xs text-surface-400">
                          Score: {s.readinessScore?.toFixed(1) ?? 'N/A'}%
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-surface-400 shrink-0">
                      {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar column */}
        <div className="space-y-6">
          {/* Readiness Score Ring */}
          <Card className="animate-slide-up text-center" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent-500" />
              <h3 className="text-sm font-semibold text-surface-700">Overall Readiness</h3>
            </div>
            <ProgressRing value={avgScore} size={120} strokeWidth={8} />
            <p className="text-xs text-surface-400 mt-3">
              {avgScore >= 95 ? 'Excellent! You meet the readiness threshold.'
                : avgScore > 0 ? `${(95 - avgScore).toFixed(0)} points to reach the 95% threshold`
                  : 'Complete an assessment to see your score'}
            </p>
          </Card>

          {/* Quick Actions */}
          <Card padding="none" className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <div className="px-5 py-3.5 border-b border-surface-100">
              <h3 className="text-sm font-semibold text-surface-700">Quick Actions</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => navigate('/idea')}
                className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-brand-50 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-100 transition-colors">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">New Project</p>
                  <p className="text-xs text-surface-400">Capture your idea and generate documents</p>
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
