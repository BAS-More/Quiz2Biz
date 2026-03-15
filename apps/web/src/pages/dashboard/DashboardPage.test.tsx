import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

// Mock stores
const mockUser = {
  id: 'user_123',
  name: 'John Doe',
  email: 'john@example.com',
};

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

// Mock the projects API
const mockProjects = [
  {
    id: 'proj_1',
    name: 'My Web App',
    status: 'ACTIVE',
    messageCount: 12,
    qualityScore: 75,
    projectTypeName: 'Web Application',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
    lastActivityAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'proj_2',
    name: 'Mobile Strategy',
    status: 'COMPLETED',
    messageCount: 50,
    qualityScore: 92,
    projectTypeName: 'Mobile App',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
    lastActivityAt: '2026-01-20T00:00:00Z',
  },
];

vi.mock('../../api/projects', () => ({
  default: {
    getProjects: vi.fn(),
  },
  getProjects: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import after mocks
import projectApi from '../../api/projects';

const renderDashboardPage = () => {
  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectApi.getProjects).mockResolvedValue({
      items: mockProjects,
      total: 2,
    });
  });

  it('renders dashboard with greeting', async () => {
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText(/john/i)).toBeInTheDocument();
    });
  });

  it('loads projects on mount', async () => {
    renderDashboardPage();

    await waitFor(() => {
      expect(projectApi.getProjects).toHaveBeenCalledWith(1, 50);
    });
  });

  it('displays active projects stat', async () => {
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });
  });

  it('displays completed stat', async () => {
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('displays best quality stat', async () => {
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Best Quality')).toBeInTheDocument();
    });
  });

  it('navigates to new chat on New Project click', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });

    const newProjectButton = screen.getByRole('button', { name: /new project/i });
    await user.click(newProjectButton);

    expect(mockNavigate).toHaveBeenCalledWith('/chat/new');
  });

  it('displays active project cards', async () => {
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('My Web App')).toBeInTheDocument();
    });
  });

  it('displays completed project cards', async () => {
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Mobile Strategy')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    vi.mocked(projectApi.getProjects).mockImplementation(() => new Promise(() => {}));
    renderDashboardPage();

    // Should not crash while loading
    expect(screen.getByText(/john/i)).toBeInTheDocument();
  });

  it('shows error when project loading fails', async () => {
    vi.mocked(projectApi.getProjects).mockRejectedValue(new Error('Network error'));
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects exist', async () => {
    vi.mocked(projectApi.getProjects).mockResolvedValue({
      items: [],
      total: 0,
    });
    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('No active projects')).toBeInTheDocument();
    });
  });
});
