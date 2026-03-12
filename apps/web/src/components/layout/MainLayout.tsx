/**
 * Main application layout with sidebar and header
 * Design: Modern SaaS - sleek sidebar, active indicators, collapsible, user dropdown
 */

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  CreditCard,
  HelpCircle,
  FolderKanban,
  BarChart3,
  Settings,
  Bell,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ThemeToggle } from '../settings/ThemeToggle';
import { StandaloneBreadcrumbs, DEFAULT_ROUTE_MAPPINGS } from '../ux/Breadcrumbs';
import type { BreadcrumbItem } from '../ux/Breadcrumbs';
import { featureFlags } from '../../config/feature-flags.config';
import { AIChatProvider, AIChatWidget } from '../ai/AIChatWidget';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workspace', href: '/workspace', icon: FolderKanban },
  { name: 'Assessments', href: '/questionnaire/new', icon: ClipboardList },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Billing', href: '/billing', icon: CreditCard },
];

const bottomNav = [
  { name: 'Settings', href: '/settings/profile', icon: Settings },
  { name: 'Help Center', href: '/help', icon: HelpCircle },
];

/** Computes breadcrumbs from current route and renders them in the header */
function HeaderBreadcrumbs({ pathname }: { pathname: string }) {
  const items = useMemo<BreadcrumbItem[]>(() => {
    for (const mapping of DEFAULT_ROUTE_MAPPINGS) {
      const match = pathname.match(mapping.pattern);
      if (match) {
        return typeof mapping.breadcrumbs === 'function'
          ? mapping.breadcrumbs({})
          : mapping.breadcrumbs;
      }
    }
    return [{ label: 'Home', href: '/', icon: '\u{1F3E0}' }];
  }, [pathname]);

  if (items.length <= 1) return null;

  return (
    <StandaloneBreadcrumbs
      items={items}
      showIcons={false}
      className="text-sm text-surface-500"
    />
  );
}

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    void navigate('/auth/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard')
      return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const userInitials = user?.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Skip link for keyboard accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-1 focus:left-1 focus:px-6 focus:py-3 focus:bg-brand-700 focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-surface-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') setSidebarOpen(false);
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-white border-r border-surface-200/80 flex flex-col transform transition-all duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        {/* Logo */}
        <div
          className={clsx(
            'flex h-16 items-center border-b border-surface-100 px-4',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 shadow-xs group-hover:shadow-elevated transition-shadow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-surface-900">
                Quiz<span className="text-brand-600">2</span>Biz
              </span>
            </Link>
          )}
          {collapsed && (
            <Link
              to="/dashboard"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          )}
          <button
            className="hidden lg:flex p-1.5 rounded-md text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={clsx('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
            />
          </button>
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-surface-100 text-surface-500"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main nav */}
        <nav
          className="flex-1 flex flex-col px-3 py-4 overflow-y-auto"
          aria-label="Main navigation"
        >
          <ul className="space-y-1" role="list">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-brand-50 text-brand-700 shadow-xs'
                        : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900',
                      collapsed && 'justify-center px-2',
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={clsx(
                        'h-[18px] w-[18px] shrink-0',
                        active ? 'text-brand-600' : 'text-surface-400',
                      )}
                      aria-hidden="true"
                    />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Bottom nav items */}
          <ul className="mt-auto space-y-1 pt-4 border-t border-surface-100" role="list">
            {bottomNav.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-surface-500 hover:bg-surface-50 hover:text-surface-700 transition-colors',
                    collapsed && 'justify-center px-2',
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon
                    className="h-[18px] w-[18px] shrink-0 text-surface-400"
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div
          className={clsx('border-t border-surface-100 p-3', collapsed && 'flex justify-center')}
        >
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-surface-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center w-full gap-2 px-3 py-2 text-sm text-surface-500 rounded-lg hover:bg-danger-50 hover:text-danger-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-surface-400 hover:bg-danger-50 hover:text-danger-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={clsx('transition-all duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        {/* Top header */}
        <header className="sticky top-0 z-30 h-14 bg-white/80 backdrop-blur-md border-b border-surface-200/60 flex items-center px-4 lg:px-6">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-surface-100 text-surface-500 mr-3 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Route-based breadcrumbs */}
          <div className="flex-1 min-w-0">
            <HeaderBreadcrumbs pathname={location.pathname} />
          </div>

          {/* User avatar in header (mobile/quick access) */}
          <div className="flex items-center gap-3">
            {/* Notifications bell */}
            <button
              className="relative p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* Theme toggle */}
            <ThemeToggle compact />

            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-semibold lg:hidden">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-6 max-w-7xl mx-auto" tabIndex={-1}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer
          className="border-t border-surface-100 bg-white/50 px-4 lg:px-6 py-4 mt-auto"
          role="contentinfo"
        >
          <p className="text-center text-xs text-surface-400">
            &copy; {new Date().getFullYear()} Quiz2Biz. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Floating AI Chat Widget (feature-flagged) */}
      {featureFlags.aiChatWidget && (
        <AIChatProvider>
          <AIChatWidget position="bottom-right" />
        </AIChatProvider>
      )}
    </div>
  );
}
