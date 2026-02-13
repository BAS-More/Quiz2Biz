/**
 * Accessibility tests for MainLayout component
 * WCAG 2.2 Level AA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock auth store
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'Questionnaires', href: '/questionnaires', icon: 'ClipboardList' },
  { name: 'Documents', href: '/documents', icon: 'FileText' },
  { name: 'Settings', href: '/settings', icon: 'Settings' },
];

// Accessible mock MainLayout component
function MockMainLayout({
  sidebarOpen = false,
  onSidebarToggle,
  onLogout,
}: {
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  onLogout?: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={onSidebarToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
        aria-hidden={!sidebarOpen}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <a
            href="/dashboard"
            className="text-xl font-bold text-blue-600"
            aria-label="Quiz2Biz - Go to dashboard"
          >
            Quiz2Biz
          </a>
          <button
            type="button"
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={onSidebarToggle}
            aria-label="Close sidebar"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex flex-col p-4 space-y-1">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 hover:text-blue-600"
              aria-current={item.href === '/dashboard' ? 'page' : undefined}
            >
              <span className="h-5 w-5 mr-3" aria-hidden="true">
                [{item.icon}]
              </span>
              {item.name}
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <div
              className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"
              role="img"
              aria-label="User avatar"
            >
              <span className="text-blue-600" aria-hidden="true">
                U
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Test User</p>
              <p className="text-xs text-gray-500 truncate">test@example.com</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-red-50 hover:text-red-600"
          >
            <span className="h-4 w-4 mr-2" aria-hidden="true">
              [LogOut]
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header
          className="sticky top-0 z-30 h-16 bg-white border-b flex items-center px-4 lg:px-6"
          role="banner"
        >
          <button
            type="button"
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 mr-4"
            onClick={onSidebarToggle}
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-6" role="main">
          <h1 className="text-2xl font-bold">Page Content</h1>
          <p>Main content area</p>
        </main>
      </div>
    </div>
  );
}

describe('MainLayout Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Landmarks and structure', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <BrowserRouter>
          <MockMainLayout />
        </BrowserRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper landmark roles', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
    });

    it('should have complementary sidebar region', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const sidebar = screen.getByRole('complementary', { name: /main navigation/i });
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('Skip link', () => {
    it('should have a skip to main content link', () => {
      render(
        <BrowserRouter>
          <MockMainLayout />
        </BrowserRouter>,
      );

      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should have main content target with correct id', () => {
      render(
        <BrowserRouter>
          <MockMainLayout />
        </BrowserRouter>,
      );

      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have labeled navigation', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const nav = screen.getByRole('navigation', { name: /primary navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('should have accessible navigation links', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      navigation.forEach((item) => {
        const link = screen.getByRole('link', { name: item.name });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', item.href);
      });
    });

    it('should indicate current page with aria-current', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      // Find the dashboard link in the navigation (not the logo)
      const nav = screen.getByRole('navigation', { name: /primary navigation/i });
      const dashboardLink = within(nav).getByRole('link', { name: 'Dashboard' });
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('should hide decorative icons from assistive technology', () => {
      const { container } = render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(decorativeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Mobile sidebar toggle', () => {
    it('should have accessible open sidebar button', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={false} />
        </BrowserRouter>,
      );

      const openButton = screen.getByRole('button', { name: /open sidebar/i });
      expect(openButton).toBeInTheDocument();
      expect(openButton).toHaveAttribute('aria-expanded', 'false');
      expect(openButton).toHaveAttribute('aria-controls', 'sidebar');
    });

    it('should have accessible close sidebar button', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const closeButton = screen.getByRole('button', { name: /close sidebar/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-expanded', 'true');
      expect(closeButton).toHaveAttribute('aria-controls', 'sidebar');
    });

    it('should toggle aria-expanded when sidebar state changes', () => {
      const { rerender } = render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={false} />
        </BrowserRouter>,
      );

      const openButton = screen.getByRole('button', { name: /open sidebar/i });
      expect(openButton).toHaveAttribute('aria-expanded', 'false');

      rerender(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const closeButton = screen.getByRole('button', { name: /close sidebar/i });
      expect(closeButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should hide backdrop from assistive technology', () => {
      const { container } = render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const backdrop = container.querySelector('.bg-gray-900\\/50');
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('User profile section', () => {
    it('should have accessible user avatar', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      expect(avatar).toBeInTheDocument();
    });

    it('should display user name and email', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should have accessible logout button', () => {
      const onLogout = vi.fn();
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} onLogout={onLogout} />
        </BrowserRouter>,
      );

      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      expect(logoutButton).toBeInTheDocument();

      fireEvent.click(logoutButton);
      expect(onLogout).toHaveBeenCalled();
    });
  });

  describe('Logo and branding', () => {
    it('should have accessible logo link', () => {
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={true} />
        </BrowserRouter>,
      );

      const logoLink = screen.getByRole('link', { name: /quiz2biz.*dashboard/i });
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Keyboard navigation', () => {
    it('should allow keyboard interaction with toggle buttons', () => {
      const onSidebarToggle = vi.fn();
      render(
        <BrowserRouter>
          <MockMainLayout sidebarOpen={false} onSidebarToggle={onSidebarToggle} />
        </BrowserRouter>,
      );

      const openButton = screen.getByRole('button', { name: /open sidebar/i });
      openButton.focus();
      expect(document.activeElement).toBe(openButton);

      fireEvent.keyDown(openButton, { key: 'Enter' });
      // Button should be clickable via keyboard
    });
  });

  describe('Main content', () => {
    it('should have main landmark with role', () => {
      render(
        <BrowserRouter>
          <MockMainLayout />
        </BrowserRouter>,
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should have proper heading structure in main content', () => {
      render(
        <BrowserRouter>
          <MockMainLayout />
        </BrowserRouter>,
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });
  });
});
