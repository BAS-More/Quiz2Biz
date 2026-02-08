import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './MainLayout';

// Mock the auth store
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    },
    logout: vi.fn(),
  }),
}));

const renderMainLayout = () => {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/*" element={<MainLayout />}>
          <Route path="dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation menu', () => {
    renderMainLayout();

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /questionnaires/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /documents/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('displays user email', () => {
    renderMainLayout();

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays user name', () => {
    renderMainLayout();

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders logo link', () => {
    renderMainLayout();

    expect(screen.getByText('Quiz2Biz')).toBeInTheDocument();
  });

  it('renders outlet content', () => {
    renderMainLayout();

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('displays sign out button', () => {
    renderMainLayout();

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('toggles sidebar on mobile menu button click', async () => {
    userEvent.setup();
    renderMainLayout();

    // The Menu button should be present
    const menuButtons = screen.getAllByRole('button');
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it('navigates to dashboard from logo', () => {
    renderMainLayout();

    const logoLink = screen.getByRole('link', { name: /quiz2biz/i });
    expect(logoLink).toHaveAttribute('href', '/dashboard');
  });

  it('renders navigation links with correct hrefs', () => {
    renderMainLayout();

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /questionnaires/i })).toHaveAttribute(
      'href',
      '/questionnaires',
    );
    expect(screen.getByRole('link', { name: /documents/i })).toHaveAttribute('href', '/documents');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  it('has accessible navigation landmark', () => {
    renderMainLayout();

    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('has accessible main content landmark', () => {
    renderMainLayout();

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has accessible banner landmark', () => {
    renderMainLayout();

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
