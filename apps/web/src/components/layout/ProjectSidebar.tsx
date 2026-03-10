/**
 * Project Sidebar Navigation
 * Shows project-specific navigation when viewing a project
 */

import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import projectApi from '../../api/projects';
import type { Project } from '../../api/projects';
import {
  MessageSquare,
  FileText,
  ClipboardList,
  Target,
  ArrowLeft,
  MoreHorizontal,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  path: string;
  label: string;
  icon: typeof MessageSquare;
  badge?: string | number;
}

export function ProjectSidebar() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      setIsLoading(true);
      try {
        const data = await projectApi.getProject(projectId);
        setProject(data);
      } catch {
        // Silent fail - sidebar will show placeholder
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  if (!projectId) return null;

  const navItems: NavItem[] = [
    {
      path: `/chat/${projectId}`,
      label: 'Chat',
      icon: MessageSquare,
      badge: project?.messageCount,
    },
    {
      path: `/project/${projectId}/facts`,
      label: 'Facts',
      icon: ClipboardList,
    },
    {
      path: `/project/${projectId}/documents`,
      label: 'Documents',
      icon: FileText,
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const chatProgress = project ? Math.min((project.messageCount / 50) * 100, 100) : 0;
  const qualityScore = project?.qualityScore ?? 0;

  return (
    <div className="w-64 bg-white border-r border-surface-200 flex flex-col h-full">
      {/* Project Header */}
      <div className="p-4 border-b border-surface-100">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate('/workspace')}
            className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors"
            title="Back to workspace"
          >
            <ArrowLeft className="h-4 w-4 text-surface-500" />
          </button>
          <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
            Project
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-100 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-surface-100 rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-surface-100 rounded animate-pulse" />
            </div>
          </div>
        ) : project ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold">
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
            <button className="p-1 rounded hover:bg-surface-100">
              <MoreHorizontal className="h-4 w-4 text-surface-400" />
            </button>
          </div>
        ) : (
          <div className="text-sm text-surface-500">Project not found</div>
        )}
      </div>

      {/* Progress Stats */}
      {project && (
        <div className="px-4 py-3 border-b border-surface-100">
          <div className="grid grid-cols-2 gap-3">
            {/* Chat Progress */}
            <div className="p-2 rounded-lg bg-surface-50">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-3 w-3 text-brand-500" />
                <span className="text-xs text-surface-600">Chat</span>
              </div>
              <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ width: `${chatProgress}%` }}
                />
              </div>
              <p className="text-xs text-surface-500 mt-1">{project.messageCount}/50</p>
            </div>

            {/* Quality Score */}
            <div className="p-2 rounded-lg bg-surface-50">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3 w-3 text-success-500" />
                <span className="text-xs text-surface-600">Quality</span>
              </div>
              <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    qualityScore >= 80
                      ? 'bg-success-500'
                      : qualityScore >= 50
                        ? 'bg-warning-500'
                        : 'bg-surface-400',
                  )}
                  style={{ width: `${qualityScore}%` }}
                />
              </div>
              <p className="text-xs text-surface-500 mt-1">
                {qualityScore > 0 ? `${qualityScore.toFixed(0)}%` : '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-1',
              isActive(item.path)
                ? 'bg-brand-50 text-brand-700'
                : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900',
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.badge != null && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 text-xs font-medium rounded',
                  isActive(item.path)
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-surface-100 text-surface-600',
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-100">
        <button
          onClick={() => navigate('/workspace')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-surface-600 hover:bg-surface-50 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Projects
        </button>
      </div>
    </div>
  );
}

export default ProjectSidebar;
