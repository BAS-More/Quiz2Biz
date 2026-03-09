/**
 * EmptyState.tsx
 * Reusable empty state component for lists and dashboards
 * Provides consistent empty state UI across the application
 */

import React from 'react';
import {
  FileText,
  Inbox,
  Search,
  Users,
  FolderOpen,
  MessageSquare,
  Calendar,
  Bell,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from './Button';
import clsx from 'clsx';

// Predefined empty state configurations
export type EmptyStateType =
  | 'documents'
  | 'sessions'
  | 'messages'
  | 'users'
  | 'search'
  | 'notifications'
  | 'settings'
  | 'help'
  | 'calendar'
  | 'generic';

interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
}

const EMPTY_STATE_CONFIGS: Record<EmptyStateType, EmptyStateConfig> = {
  documents: {
    icon: FileText,
    title: 'No Documents Yet',
    description: 'Generate your first document to get started.',
    iconColor: 'text-brand-400',
  },
  sessions: {
    icon: FolderOpen,
    title: 'No Sessions Found',
    description: 'Start a new questionnaire session to begin.',
    iconColor: 'text-purple-400',
  },
  messages: {
    icon: MessageSquare,
    title: 'No Messages',
    description: 'Your inbox is empty. Start a conversation!',
    iconColor: 'text-blue-400',
  },
  users: {
    icon: Users,
    title: 'No Users Found',
    description: 'No users match your search criteria.',
    iconColor: 'text-green-400',
  },
  search: {
    icon: Search,
    title: 'No Results',
    description: 'Try adjusting your search or filters.',
    iconColor: 'text-surface-400',
  },
  notifications: {
    icon: Bell,
    title: 'All Caught Up!',
    description: 'You have no new notifications.',
    iconColor: 'text-warning-400',
  },
  settings: {
    icon: Settings,
    title: 'No Settings Available',
    description: 'Configure your preferences to see options here.',
    iconColor: 'text-surface-400',
  },
  help: {
    icon: HelpCircle,
    title: 'No Help Articles',
    description: 'Check back later for help content.',
    iconColor: 'text-info-400',
  },
  calendar: {
    icon: Calendar,
    title: 'No Events',
    description: 'Your calendar is empty for this period.',
    iconColor: 'text-danger-400',
  },
  generic: {
    icon: Inbox,
    title: 'Nothing Here',
    description: 'There are no items to display.',
    iconColor: 'text-surface-300',
  },
};

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  illustration?: React.ReactNode;
}

export function EmptyState({
  type = 'generic',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  illustration,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIGS[type];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-10 w-10',
      iconWrapper: 'w-16 h-16',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      iconWrapper: 'w-20 h-20',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      iconWrapper: 'w-24 h-24',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : (
        <div
          className={clsx(
            'rounded-full bg-surface-100 flex items-center justify-center mb-4',
            sizes.iconWrapper
          )}
        >
          <Icon className={clsx(sizes.icon, config.iconColor)} />
        </div>
      )}

      <h3 className={clsx('font-semibold text-surface-900', sizes.title)}>
        {displayTitle}
      </h3>

      <p className={clsx('text-surface-500 mt-2 max-w-sm', sizes.description)}>
        {displayDescription}
      </p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
              size={size === 'sm' ? 'sm' : 'md'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              size={size === 'sm' ? 'sm' : 'md'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Wrapper component for list empty states
interface ListEmptyStateProps extends EmptyStateProps {
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function ListEmptyState({
  isFiltered,
  onClearFilters,
  ...props
}: ListEmptyStateProps) {
  if (isFiltered && onClearFilters) {
    return (
      <EmptyState
        type="search"
        title="No Results Found"
        description="Try adjusting your search or filters to find what you're looking for."
        action={{
          label: 'Clear Filters',
          onClick: onClearFilters,
          variant: 'secondary',
        }}
        {...props}
      />
    );
  }

  return <EmptyState {...props} />;
}

// Pre-configured empty states for common use cases
export function DocumentsEmptyState({
  onCreateDocument,
}: {
  onCreateDocument?: () => void;
}) {
  return (
    <EmptyState
      type="documents"
      action={
        onCreateDocument
          ? {
              label: 'Generate Document',
              onClick: onCreateDocument,
            }
          : undefined
      }
    />
  );
}

export function SessionsEmptyState({
  onStartSession,
}: {
  onStartSession?: () => void;
}) {
  return (
    <EmptyState
      type="sessions"
      action={
        onStartSession
          ? {
              label: 'Start New Session',
              onClick: onStartSession,
            }
          : undefined
      }
    />
  );
}

export function SearchEmptyState({
  query,
  onClearSearch,
}: {
  query?: string;
  onClearSearch?: () => void;
}) {
  return (
    <EmptyState
      type="search"
      title={query ? `No results for "${query}"` : 'No Results'}
      description="Try searching with different keywords or check your spelling."
      action={
        onClearSearch
          ? {
              label: 'Clear Search',
              onClick: onClearSearch,
              variant: 'secondary',
            }
          : undefined
      }
    />
  );
}

export function NotificationsEmptyState() {
  return (
    <EmptyState
      type="notifications"
      size="sm"
    />
  );
}

export default EmptyState;
