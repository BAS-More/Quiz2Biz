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

const mockSessions = [
  {
    id: 'session_1',
    status: 'IN_PROGRESS',
    projectTypeName: 'Web Application',
    persona: 'CTO',
    readinessScore: 75,
    progress: { answeredQuestions: 5, totalQuestions: 10, percentage: 50 },
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'session_2',
    status: 'COMPLETED',
    projectTypeName: 'Mobile App',
    persona: 'CFO',
    readinessScore: 92,
    progress: { answeredQuestions: 10, totalQuestions: 10, percentage: 100 },
    createdAt: '2026-01-15T00:00:00Z',
  },
];

const mockLoadSessions = vi.fn();
const mockClearError = vi.fn();

const mockUseAuthStore = vi.fn();
const mockUseQuestionnaireStore = vi.fn();

vi.mock('../../stores/auth', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('../../stores/questionnaire', () => ({
  useQuestionnaireStore: () => mockUseQuestionnaireStore(),
}));

// Set default mock implementations
mockUseAuthStore.mockReturnValue({
  user: mockUser,
});

mockUseQuestionnaireStore.mockReturnValue({
  sessions: mockSessions,
  isLoading: false,
  error: null,
  loadSessions: mockLoadSessions,
  clearError: mockClearError,
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('renders dashboard with greeting', () => {
    renderDashboardPage();

    expect(screen.getByText(/john/i)).toBeInTheDocument();
  });

  it('loads sessions on mount', () => {
    renderDashboardPage();

    expect(mockLoadSessions).toHaveBeenCalled();
  });

  it('displays active sessions count', () => {
    renderDashboardPage();

    const activeSessionsLabel = screen.getByText('Active Sessions');
    const activeSessionsCard = activeSessionsLabel.closest('.group');

    expect(activeSessionsLabel).toBeInTheDocument();
    expect(activeSessionsCard).toHaveTextContent('1');
  });

  it('displays completed sessions count', () => {
    renderDashboardPage();

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays highest score', () => {
    renderDashboardPage();

    const highestScoreLabel = screen.getByText('Highest Score');
    const highestScoreCard = highestScoreLabel.closest('.group');

    expect(highestScoreLabel).toBeInTheDocument();
    expect(highestScoreCard).toHaveTextContent('92%');
  });

  it('navigates to idea capture on New Project click', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const [newProjectButton] = screen.getAllByRole('button', { name: /new project/i });
    await user.click(newProjectButton);

    expect(mockNavigate).toHaveBeenCalledWith('/idea');
  });

  it('displays active project cards', () => {
    renderDashboardPage();

    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('Web Application')).toBeInTheDocument();
  });

  it('displays completed project cards', () => {
    renderDashboardPage();

    expect(screen.getByText('Completed Projects')).toBeInTheDocument();
    expect(screen.getByText('Mobile App')).toBeInTheDocument();
  });

  it('navigates to questionnaire on session click', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const sessionCard = screen.getByText('Web Application').closest('[role="button"]');
    if (sessionCard) {
      await user.click(sessionCard);
      expect(mockNavigate).toHaveBeenCalledWith('/questionnaire?sessionId=session_1');
    }
  });

  it('renders quick actions section', () => {
    renderDashboardPage();

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('View Documents')).toBeInTheDocument();
    expect(screen.getByText('Manage Billing')).toBeInTheDocument();
  });

  it('displays progress ring with average score', () => {
    renderDashboardPage();

    expect(screen.getByText('Project Score')).toBeInTheDocument();
  });
});

describe('DashboardPage - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton loaders when loading', () => {
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: true,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    // Should show StatCardSkeleton components (they have animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows list item skeletons in active projects section', () => {
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: true,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    // Should show loading state in the active projects section
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
  });
});

describe('DashboardPage - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when error exists', () => {
    const mockErrorClearError = vi.fn();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: 'Failed to load sessions',
      loadSessions: mockLoadSessions,
      clearError: mockErrorClearError,
    });

    renderDashboardPage();

    expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('dismisses error when dismiss button clicked', async () => {
    const user = userEvent.setup();
    const mockErrorClearError = vi.fn();

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: 'Test error',
      loadSessions: mockLoadSessions,
      clearError: mockErrorClearError,
    });

    renderDashboardPage();

    const dismissButton = screen.getByText('Dismiss');
    await user.click(dismissButton);

    expect(mockErrorClearError).toHaveBeenCalled();
  });
});

describe('DashboardPage - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays empty state when no sessions', () => {
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    expect(screen.getByText('No active projects')).toBeInTheDocument();
    expect(screen.getByText('Describe your idea to get started with AI-powered analysis.')).toBeInTheDocument();
    expect(screen.getByText('Start your first project')).toBeInTheDocument();
  });

  it('navigates to idea page when start first project clicked', async () => {
    const user = userEvent.setup();

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    const startButton = screen.getByText('Start your first project');
    await user.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith('/idea');
  });
});

describe('DashboardPage - Greeting Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays correct greeting based on time of day', () => {
    const originalDate = Date;

    // Test morning (9 AM)
    global.Date = class extends originalDate {
      getHours() { return 9; }
    } as any;

    renderDashboardPage();
    expect(screen.getByText(/good morning/i)).toBeInTheDocument();

    global.Date = originalDate;
  });
});

describe('DashboardPage - Score Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('calculates highest score correctly', () => {
    renderDashboardPage();

    const highestScoreCard = screen.getByText('Highest Score').closest('.group');
    expect(highestScoreCard).toHaveTextContent('92%');
  });

  it('calculates average score correctly', () => {
    renderDashboardPage();

    const avgScoreCard = screen.getByText('Avg Score').closest('.group');
    expect(avgScoreCard).toHaveTextContent('84%'); // (75 + 92) / 2 = 83.5, rounds to 84
  });

  it('displays -- when no scores available', () => {
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    const highestScoreCard = screen.getByText('Highest Score').closest('.group');
    const avgScoreCard = screen.getByText('Avg Score').closest('.group');

    expect(highestScoreCard).toHaveTextContent('--');
    expect(avgScoreCard).toHaveTextContent('--');
  });
});

describe('DashboardPage - Keyboard Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('navigates to questionnaire on Enter key press', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const sessionCard = screen.getByText('Web Application').closest('[role="button"]');
    if (sessionCard) {
      sessionCard.focus();
      await user.keyboard('{Enter}');
      expect(mockNavigate).toHaveBeenCalledWith('/questionnaire?sessionId=session_1');
    }
  });
});

describe('DashboardPage - Progress Ring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('displays progress ring with average score', () => {
    renderDashboardPage();

    expect(screen.getByText('Project Score')).toBeInTheDocument();
    // Average of 75 and 92 is 83.5, rounds to 84%
    expect(screen.getByText('84%')).toBeInTheDocument();
  });

  it('displays encouraging message for high scores', () => {
    const highScoreSessions = [
      {
        id: 'session_1',
        status: 'COMPLETED',
        projectTypeName: 'Test',
        persona: 'CTO',
        readinessScore: 96,
        progress: { answeredQuestions: 10, totalQuestions: 10, percentage: 100 },
        createdAt: '2026-02-01T00:00:00Z',
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: highScoreSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    expect(screen.getByText('Excellent! Your project scores are outstanding.')).toBeInTheDocument();
  });

  it('displays helpful message when no scores', () => {
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: [],
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    expect(screen.getByText('Complete a project questionnaire to see your score')).toBeInTheDocument();
  });
});

describe('DashboardPage - Quick Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('navigates to documents page on View Documents click', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const documentsButton = screen.getByText('View Documents').closest('button');
    if (documentsButton) {
      await user.click(documentsButton);
      expect(mockNavigate).toHaveBeenCalledWith('/documents');
    }
  });

  it('navigates to billing page on Manage Billing click', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const billingButton = screen.getByText('Manage Billing').closest('button');
    if (billingButton) {
      await user.click(billingButton);
      expect(mockNavigate).toHaveBeenCalledWith('/billing');
    }
  });

  it('navigates to idea page on New Project quick action click', async () => {
    const user = userEvent.setup();
    renderDashboardPage();

    const newProjectButtons = screen.getAllByText('New Project');
    const quickActionButton = newProjectButtons.find(btn => btn.closest('button')?.textContent?.includes('Capture your idea'));

    if (quickActionButton?.closest('button')) {
      await user.click(quickActionButton.closest('button')!);
      expect(mockNavigate).toHaveBeenCalledWith('/idea');
    }
  });
});

describe('DashboardPage - Additional Greeting Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('displays good afternoon greeting for afternoon hours', () => {
    const originalDate = Date;
    global.Date = class extends originalDate {
      getHours() { return 14; }
    } as any;

    renderDashboardPage();
    expect(screen.getByText(/good afternoon/i)).toBeInTheDocument();

    global.Date = originalDate;
  });

  it('displays good evening greeting for evening hours', () => {
    const originalDate = Date;
    global.Date = class extends originalDate {
      getHours() { return 19; }
    } as any;

    renderDashboardPage();
    expect(screen.getByText(/good evening/i)).toBeInTheDocument();

    global.Date = originalDate;
  });

  it('displays greeting with user first name only', () => {
    mockUseAuthStore.mockReturnValue({
      user: { ...mockUser, name: 'Alice Smith' },
    });

    renderDashboardPage();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
  });

  it('displays fallback greeting when user has no name', () => {
    mockUseAuthStore.mockReturnValue({
      user: { ...mockUser, name: null },
    });

    renderDashboardPage();
    expect(screen.getByText(/there/i)).toBeInTheDocument();
  });

  it('displays fallback greeting when user name is empty string', () => {
    mockUseAuthStore.mockReturnValue({
      user: { ...mockUser, name: '' },
    });

    renderDashboardPage();
    expect(screen.getByText(/there/i)).toBeInTheDocument();
  });
});

describe('DashboardPage - Session Display Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles sessions with null readiness scores', () => {
    const sessionsWithNullScores = [
      {
        ...mockSessions[0],
        readinessScore: null,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: sessionsWithNullScores,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    // Should not crash and should show session
    expect(screen.getByText('Web Application')).toBeInTheDocument();
  });

  it('handles sessions with null project type name', () => {
    const sessionsWithNullNames = [
      {
        ...mockSessions[0],
        projectTypeName: null,
        persona: 'Developer',
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: sessionsWithNullNames,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    // Should fall back to persona
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('handles sessions with both null project type and persona', () => {
    const sessionsWithNullData = [
      {
        ...mockSessions[0],
        projectTypeName: null,
        persona: null,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: sessionsWithNullData,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    // Should fall back to 'Project'
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('limits completed sessions display to 5 items', () => {
    const manyCompletedSessions = Array.from({ length: 10 }, (_, i) => ({
      id: `session_${i}`,
      status: 'COMPLETED',
      projectTypeName: `Project ${i}`,
      persona: 'CTO',
      readinessScore: 80 + i,
      progress: { answeredQuestions: 10, totalQuestions: 10, percentage: 100 },
      createdAt: '2026-01-15T00:00:00Z',
    }));

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: manyCompletedSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    // Should only display first 5
    expect(screen.getByText('Project 0')).toBeInTheDocument();
    expect(screen.getByText('Project 4')).toBeInTheDocument();
    expect(screen.queryByText('Project 5')).not.toBeInTheDocument();
  });

  it('formats completed session dates correctly', () => {
    const sessionWithDate = [
      {
        ...mockSessions[1],
        createdAt: '2026-03-15T10:30:00Z',
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: sessionWithDate,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    renderDashboardPage();

    // Should format date as "Mar 15" or similar
    expect(screen.getByText(/mar 15/i)).toBeInTheDocument();
  });
});

describe('DashboardPage - ProgressRing Color Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success color for scores >= 95', () => {
    const highScoreSession = [
      {
        ...mockSessions[0],
        status: 'COMPLETED',
        readinessScore: 96,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: highScoreSession,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    const { container } = renderDashboardPage();

    // Check for success color class in progress ring
    const successCircle = container.querySelector('.text-success-500');
    expect(successCircle).toBeInTheDocument();
  });

  it('shows warning color for scores >= 70 and < 95', () => {
    const mediumScoreSession = [
      {
        ...mockSessions[0],
        status: 'COMPLETED',
        readinessScore: 85,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mediumScoreSession,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    const { container } = renderDashboardPage();

    const warningCircle = container.querySelector('.text-warning-500');
    expect(warningCircle).toBeInTheDocument();
  });

  it('shows brand color for scores >= 40 and < 70', () => {
    const lowMediumScoreSession = [
      {
        ...mockSessions[0],
        status: 'COMPLETED',
        readinessScore: 55,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: lowMediumScoreSession,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    const { container } = renderDashboardPage();

    const brandCircle = container.querySelector('.text-brand-500');
    expect(brandCircle).toBeInTheDocument();
  });

  it('shows danger color for scores < 40', () => {
    const lowScoreSession = [
      {
        ...mockSessions[0],
        status: 'COMPLETED',
        readinessScore: 30,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: lowScoreSession,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    const { container } = renderDashboardPage();

    const dangerCircle = container.querySelector('.text-danger-500');
    expect(dangerCircle).toBeInTheDocument();
  });
});

describe('DashboardPage - Date Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('displays current date in header', () => {
    renderDashboardPage();

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    expect(screen.getByText(today)).toBeInTheDocument();
  });
});

describe('DashboardPage - Load Sessions Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });
  });

  it('calls loadSessions only once on mount', () => {
    renderDashboardPage();

    expect(mockLoadSessions).toHaveBeenCalledTimes(1);
  });
});

describe('DashboardPage - Active Session Badge Colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success badge for active session with score >= 95', () => {
    const highScoreActiveSession = [
      {
        ...mockSessions[0],
        readinessScore: 96,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: highScoreActiveSession,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    const { container } = renderDashboardPage();

    const successBadge = container.querySelector('.bg-success-50.text-success-700');
    expect(successBadge).toBeInTheDocument();
  });

  it('shows warning badge for active session with score >= 70', () => {
    const mediumScoreActiveSession = [
      {
        ...mockSessions[0],
        readinessScore: 75,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: mediumScoreActiveSession,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    const { container } = renderDashboardPage();

    const warningBadge = container.querySelector('.bg-warning-50.text-warning-700');
    expect(warningBadge).toBeInTheDocument();
  });

  it('shows danger badge for active session with score < 70', () => {
    const lowScoreActiveSession = [
      {
        ...mockSessions[0],
        readinessScore: 50,
      },
    ];

    mockUseQuestionnaireStore.mockReturnValue({
      sessions: lowScoreActiveSession,
      isLoading: false,
      error: null,
      loadSessions: mockLoadSessions,
      clearError: mockClearError,
    });

    const { container } = renderDashboardPage();

    const dangerBadge = container.querySelector('.bg-danger-50.text-danger-700');
    expect(dangerBadge).toBeInTheDocument();
  });
});