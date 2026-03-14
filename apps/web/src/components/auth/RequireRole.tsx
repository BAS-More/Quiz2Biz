/**
 * Role-based access control guard component.
 *
 * Wraps routes that require specific user roles.
 * Renders an "Access Denied" fallback when the current user's role
 * is not included in the allowed list.
 */

import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { Button } from '../ui';
import type { User } from '../../types';
import type { ReactNode } from 'react';

type UserRole = User['role'];

interface RequireRoleProps {
  /** Roles that are allowed to access the wrapped content */
  allowed: UserRole[];
  children: ReactNode;
}

/**
 * Guard component that restricts access based on user role.
 *
 * Usage:
 * ```tsx
 * <RequireRole allowed={['ADMIN', 'SUPER_ADMIN']}>
 *   <AdminPage />
 * </RequireRole>
 * ```
 */
export function RequireRole({ allowed, children }: RequireRoleProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user || !allowed.includes(user.role)) {
    return (
      <div
        className="min-h-[50vh] flex flex-col items-center justify-center gap-4"
        data-testid="access-denied"
      >
        <AlertCircle className="h-12 w-12 text-danger-500" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-surface-900">Access Denied</h2>
          <p className="text-surface-500 mt-1">
            You do not have permission to access this page.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
