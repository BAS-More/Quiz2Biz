/**
 * Workspace Page - Multi-Project Hub
 * Central hub for managing all user projects
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import projectApi from '../../api/projects';
import type { Project, ProjectListResponse } from '../../api/projects';
import {
  Plus,
  FileText,
  Target,
  Search,
  Filter,
  MoreVertical,
  ArrowRight,
  Clock,
  CheckCircle,
  Archive,
  Loader,
} from 'lucide-react';
import { Card } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { clsx } from 'clsx';

type ProjectFilter = 'all' | 'active' | 'completed' | 'archived';

/** Project card component */
function ProjectCard({
  project,
  onArchive,
}: {
  project: Project;
  onArchive: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const statusColors = {
    DRAFT: 'bg-surface-100 text-surface-600',
    ACTIVE: 'bg-brand-50 text-brand-700',
    COMPLETED: 'bg-success-50 text-success-700',
    ARCHIVED: 'bg-surface-100 text-surface-400',
  };

  const statusLabels = {
    DRAFT: 'Draft',
    ACTIVE: 'In Progress',
    COMPLETED: 'Ready for Docs',
    ARCHIVED: 'Archived',
  };

  const chatProgress = Math.min((project.messageCount / 50) * 100, 100);
  const isComplete = project.status === 'COMPLETED' || project.messageCount >= 50;

  return (
    <Card
      hover
      className="group relative cursor-pointer"
      onClick={() => navigate(`/chat/${project.id}`)}
      tabIndex={0}
      role="link"
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/chat/${project.id}`);
        }
      }}
    >
      {/* Menu button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 rounded-lg bg-surface-100 text-surface-500 opacity-0 group-hover:opacity-100 hover:bg-surface-200 transition-all"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {showMenu && (
          <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-xl shadow-elevated border border-surface-200 py-1 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(project.id);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-600 hover:bg-surface-50"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold',
              isComplete ? 'bg-success-100 text-success-700' : 'bg-brand-100 text-brand-700',
            )}
          >
            {(project.name ?? 'P').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-surface-900 truncate">
              {project.name || 'Untitled Project'}
            </h3>
            <p className="text-xs text-surface-500 truncate">
              {project.projectTypeName || 'General'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              statusColors[project.status],
            )}
          >
            {statusLabels[project.status]}
          </span>
          {project.qualityScore != null && project.qualityScore > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-surface-500">
              <Target className="h-3 w-3" />
              {project.qualityScore.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Chat progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
            <span>Chat Progress</span>
            <span>{project.messageCount}/50</span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                isComplete ? 'bg-success-500' : 'bg-brand-500',
              )}
              style={{ width: `${chatProgress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-100">
          <span className="text-xs text-surface-400">
            {project.lastActivityAt
              ? new Date(project.lastActivityAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              : 'No activity'}
          </span>
          <div className="flex items-center gap-2">
            {isComplete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/project/${project.id}/documents`);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <FileText className="h-3 w-3" />
                Docs
              </button>
            )}
            <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-brand-500 transition-colors" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [search, setSearch] = useState('');

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: ProjectListResponse = await projectApi.getProjects(1, 100);
      setProjects(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleArchive = async (projectId: string) => {
    try {
      await projectApi.archiveProject(projectId);
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project');
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    // Status filter
    if (filter === 'active' && !['DRAFT', 'ACTIVE'].includes(p.status)) return false;
    if (filter === 'completed' && p.status !== 'COMPLETED') return false;
    if (filter === 'archived' && p.status !== 'ARCHIVED') return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(searchLower) ||
        p.projectTypeName?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Group by status for display
  const activeProjects = filteredProjects.filter((p) => ['DRAFT', 'ACTIVE'].includes(p.status));
  const completedProjects = filteredProjects.filter((p) => p.status === 'COMPLETED');
  const archivedProjects = filteredProjects.filter((p) => p.status === 'ARCHIVED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Workspace</h1>
          <p className="text-sm text-surface-500 mt-1">Manage all your projects in one place</p>
        </div>
        <button
          onClick={() => navigate('/chat/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium shadow-xs hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-surface-400" />
          {(['all', 'active', 'completed', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === f
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200',
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 text-brand-600 animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          type="sessions"
          title="No projects yet"
          description="Start your first project by chatting with our AI to build your business plan."
          action={{
            label: 'Start Your First Project',
            onClick: () => navigate('/chat/new'),
          }}
        />
      ) : (
        <div className="space-y-8">
          {/* Active projects */}
          {activeProjects.length > 0 && (filter === 'all' || filter === 'active') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-brand-600" />
                <h2 className="text-sm font-semibold text-surface-900">
                  In Progress ({activeProjects.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} onArchive={handleArchive} />
                ))}
              </div>
            </div>
          )}

          {/* Completed projects */}
          {completedProjects.length > 0 && (filter === 'all' || filter === 'completed') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-4 w-4 text-success-600" />
                <h2 className="text-sm font-semibold text-surface-900">
                  Ready for Documents ({completedProjects.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} onArchive={handleArchive} />
                ))}
              </div>
            </div>
          )}

          {/* Archived projects */}
          {archivedProjects.length > 0 && (filter === 'all' || filter === 'archived') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Archive className="h-4 w-4 text-surface-400" />
                <h2 className="text-sm font-semibold text-surface-900">
                  Archived ({archivedProjects.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} onArchive={handleArchive} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
