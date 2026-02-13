/**
 * Dashboard page - Shows real session data, readiness scores, and active assessments
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useQuestionnaireStore } from '../../stores/questionnaire';
import { ClipboardList, FileText, Target, TrendingUp, Play, CheckCircle } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { sessions, isLoading, error, loadSessions, clearError } = useQuestionnaireStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const activeSessions = sessions.filter((s) => s.status === 'IN_PROGRESS');
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const scores = completedSessions
    .filter((s) => s.readinessScore != null)
    .map((s) => s.readinessScore!);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const stats = [
    { name: 'Active Sessions', value: String(activeSessions.length), icon: ClipboardList, color: 'bg-blue-500' },
    { name: 'Completed', value: String(completedSessions.length), icon: CheckCircle, color: 'bg-green-500' },
    { name: 'Highest Score', value: highestScore > 0 ? `${highestScore.toFixed(0)}%` : '-', icon: Target, color: 'bg-purple-500' },
    { name: 'Avg Score', value: avgScore > 0 ? `${avgScore.toFixed(0)}%` : '-', icon: TrendingUp, color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}!</h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your readiness assessments and progress.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 underline text-sm">Dismiss</button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow p-6 flex items-center space-x-4"
          >
            <div className={`${stat.color} rounded-lg p-3`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active sessions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Active Assessments</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <p className="text-gray-500 text-center py-4">Loading sessions...</p>
          ) : activeSessions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No active assessments</p>
              <p className="text-sm">Start a new assessment to begin evaluating your readiness.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {s.persona ?? 'General'} Assessment
                      </span>
                      {s.readinessScore != null && (
                        <span
                          className={`text-sm font-bold px-2 py-0.5 rounded ${
                            s.readinessScore >= 95
                              ? 'bg-green-100 text-green-700'
                              : s.readinessScore >= 70
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {s.readinessScore.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {s.progress.answeredQuestions}/{s.progress.totalQuestions} questions |{' '}
                      {s.progress.percentage}% complete
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${s.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/questionnaire?sessionId=${s.id}`)}
                    className="ml-4 flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Play className="h-4 w-4 mr-1" aria-hidden="true" />
                    Continue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed sessions */}
      {completedSessions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Completed Assessments</h2>
          </div>
          <div className="p-6 space-y-3">
            {completedSessions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {s.persona ?? 'General'} Assessment
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    Score: {s.readinessScore?.toFixed(1) ?? 'N/A'}%
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => navigate('/questionnaire/new')}
            className="flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            aria-label="Start a new questionnaire"
          >
            <ClipboardList className="h-5 w-5 mr-2" aria-hidden="true" />
            Start New Assessment
          </button>
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="View your documents"
          >
            <FileText className="h-5 w-5 mr-2" aria-hidden="true" />
            View Documents
          </button>
        </div>
      </div>
    </div>
  );
}
