import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EvidencePage } from './EvidencePage';

// Mock evidence store
const mockEvidenceItems = [
  {
    id: 'ev_1',
    sessionId: 'session_123',
    fileName: 'screenshot.png',
    artifactType: 'SCREENSHOT',
    verified: true,
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'ev_2',
    sessionId: 'session_123',
    fileName: 'test-report.pdf',
    artifactType: 'REPORT',
    verified: false,
    createdAt: '2026-02-02T14:00:00Z',
  },
];

const mockStats = {
  total: 10,
  verified: 6,
  pending: 4,
  byType: {
    SCREENSHOT: 3,
    REPORT: 4,
    LOG: 3,
  },
};

const mockLoadEvidence = vi.fn();
const mockLoadStats = vi.fn();

const mockUseEvidenceStore = vi.fn();

vi.mock('../../stores/evidence', () => ({
  useEvidenceStore: () => mockUseEvidenceStore(),
}));

// Set default mock implementation
mockUseEvidenceStore.mockReturnValue({
  items: mockEvidenceItems,
  stats: mockStats,
  isLoading: false,
  error: null,
  loadEvidence: mockLoadEvidence,
  loadStats: mockLoadStats,
});

const renderEvidencePage = (sessionId = 'session_123') => {
  return render(
    <MemoryRouter initialEntries={[`/evidence/${sessionId}`]}>
      <Routes>
        <Route path="/evidence/:sessionId" element={<EvidencePage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('EvidencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });
  });

  it('renders evidence registry heading', () => {
    renderEvidencePage();

    expect(screen.getByText('Evidence Registry')).toBeInTheDocument();
  });

  it('loads evidence on mount', () => {
    renderEvidencePage();

    expect(mockLoadEvidence).toHaveBeenCalledWith('session_123');
    expect(mockLoadStats).toHaveBeenCalledWith('session_123');
  });

  it('displays evidence stats', () => {
    renderEvidencePage();

    expect(screen.getByText('10')).toBeInTheDocument(); // Total
    expect(screen.getByText('6')).toBeInTheDocument();  // Verified
    expect(screen.getByText('4')).toBeInTheDocument();  // Pending
  });

  it('displays evidence items table', () => {
    renderEvidencePage();

    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('test-report.pdf')).toBeInTheDocument();
  });

  it('displays artifact types', () => {
    renderEvidencePage();

    expect(screen.getByText('SCREENSHOT')).toBeInTheDocument();
    expect(screen.getByText('REPORT')).toBeInTheDocument();
  });

  it('displays verification status', () => {
    renderEvidencePage();

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2);
  });

  it('renders back to dashboard link', () => {
    renderEvidencePage();

    expect(screen.getByText(/back to dashboard/i)).toBeInTheDocument();
  });
});

describe('EvidencePage - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays empty message when no evidence', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: [],
      stats: null,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    expect(screen.getByText('No evidence uploaded yet for this session.')).toBeInTheDocument();
  });

  it('does not display stats when stats are null', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: [],
      stats: null,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    // Stats should not be visible
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('still shows back to dashboard link in empty state', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: [],
      stats: null,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    expect(screen.getByText(/back to dashboard/i)).toBeInTheDocument();
  });
});

describe('EvidencePage - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading message when loading with no items', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: [],
      stats: null,
      isLoading: true,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    expect(screen.getByText('Loading evidence...')).toBeInTheDocument();
  });

  it('does not show loading message when items already exist', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: true,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    // Should show the evidence items, not loading message
    expect(screen.queryByText('Loading evidence...')).not.toBeInTheDocument();
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
  });
});

describe('EvidencePage - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when error exists', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: 'Failed to load evidence',
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    expect(screen.getByText('Failed to load evidence')).toBeInTheDocument();
  });

  it('still displays items when error exists', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: 'Network error',
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('test-report.pdf')).toBeInTheDocument();
  });
});

describe('EvidencePage - Stats Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });
  });

  it('displays all stat categories', () => {
    renderEvidencePage();

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Types')).toBeInTheDocument();
  });

  it('displays correct types count from byType object', () => {
    renderEvidencePage();

    // 3 types in byType object: SCREENSHOT, REPORT, LOG
    const typesCard = screen.getByText('Types').closest('div');
    expect(typesCard).toHaveTextContent('3');
  });

  it('handles stats with empty byType object', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: {
        total: 5,
        verified: 2,
        pending: 3,
        byType: {},
      },
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    const typesCard = screen.getByText('Types').closest('div');
    expect(typesCard).toHaveTextContent('0');
  });
});

describe('EvidencePage - Table Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });
  });

  it('displays table headers', () => {
    renderEvidencePage();

    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    renderEvidencePage();

    // Check that dates are formatted as locale strings
    const dateElements = screen.getAllByText(/2\/1\/2026|2\/2\/2026/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles item with missing fileName', () => {
    const itemsWithMissingName = [
      {
        id: 'ev_3',
        sessionId: 'session_123',
        fileName: null,
        artifactType: 'LOG',
        verified: false,
        createdAt: '2026-02-03T10:00:00Z',
      },
    ];

    mockUseEvidenceStore.mockReturnValue({
      items: itemsWithMissingName,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    expect(screen.getByText('Unnamed')).toBeInTheDocument();
  });
});

describe('EvidencePage - Session ID Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });
  });

  it('calls load functions with correct sessionId', () => {
    renderEvidencePage('test_session_456');

    expect(mockLoadEvidence).toHaveBeenCalledWith('test_session_456');
    expect(mockLoadStats).toHaveBeenCalledWith('test_session_456');
  });

  it('does not call load functions when sessionId is undefined', () => {
    render(
      <MemoryRouter initialEntries={['/evidence/']}>
        <Routes>
          <Route path="/evidence/:sessionId?" element={<EvidencePage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Should not be called if sessionId is undefined
    expect(mockLoadEvidence).not.toHaveBeenCalled();
    expect(mockLoadStats).not.toHaveBeenCalled();
  });
});

describe('EvidencePage - Additional Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles multiple items with different verification statuses', () => {
    const mixedItems = [
      { ...mockEvidenceItems[0], verified: true },
      { ...mockEvidenceItems[1], verified: false },
      {
        id: 'ev_3',
        sessionId: 'session_123',
        fileName: 'log.txt',
        artifactType: 'LOG',
        verified: false,
        createdAt: '2026-02-03T10:00:00Z',
      },
    ];

    mockUseEvidenceStore.mockReturnValue({
      items: mixedItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    // Should have one "Yes" and multiple "Pending"
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2);
  });

  it('displays page title correctly', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    const heading = screen.getByText('Evidence Registry');
    expect(heading.tagName).toBe('H1');
  });
});

describe('EvidencePage - Date Formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats dates using toLocaleDateString', () => {
    const specificDateItem = [
      {
        id: 'ev_1',
        sessionId: 'session_123',
        fileName: 'test.pdf',
        artifactType: 'REPORT',
        verified: true,
        createdAt: '2026-06-15T14:30:00Z',
      },
    ];

    mockUseEvidenceStore.mockReturnValue({
      items: specificDateItem,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    const expectedDate = new Date('2026-06-15T14:30:00Z').toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('handles different date formats correctly', () => {
    const multipleItems = [
      {
        id: 'ev_1',
        sessionId: 'session_123',
        fileName: 'file1.pdf',
        artifactType: 'REPORT',
        verified: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'ev_2',
        sessionId: 'session_123',
        fileName: 'file2.pdf',
        artifactType: 'SCREENSHOT',
        verified: false,
        createdAt: '2026-12-31T23:59:59Z',
      },
    ];

    mockUseEvidenceStore.mockReturnValue({
      items: multipleItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    const date1 = new Date('2026-01-01T00:00:00Z').toLocaleDateString();
    const date2 = new Date('2026-12-31T23:59:59Z').toLocaleDateString();

    expect(screen.getByText(date1)).toBeInTheDocument();
    expect(screen.getByText(date2)).toBeInTheDocument();
  });
});

describe('EvidencePage - Back to Dashboard Link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });
  });

  it('has correct href for back to dashboard link', () => {
    renderEvidencePage();

    const backLink = screen.getByText(/back to dashboard/i);
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });
});

describe('EvidencePage - Large Datasets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles large number of evidence items', () => {
    const manyItems = Array.from({ length: 100 }, (_, i) => ({
      id: `ev_${i}`,
      sessionId: 'session_123',
      fileName: `file_${i}.pdf`,
      artifactType: 'REPORT',
      verified: i % 2 === 0,
      createdAt: '2026-02-01T10:00:00Z',
    }));

    mockUseEvidenceStore.mockReturnValue({
      items: manyItems,
      stats: {
        total: 100,
        verified: 50,
        pending: 50,
        byType: { REPORT: 100 },
      },
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    // Should render all items
    expect(screen.getByText('file_0.pdf')).toBeInTheDocument();
    expect(screen.getByText('file_99.pdf')).toBeInTheDocument();
  });
});

describe('EvidencePage - Stats Calculation Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly counts types when byType has single entry', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: {
        total: 10,
        verified: 5,
        pending: 5,
        byType: { SCREENSHOT: 10 },
      },
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    const typesCard = screen.getByText('Types').closest('div');
    expect(typesCard).toHaveTextContent('1');
  });

  it('correctly counts types when byType has many entries', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: {
        total: 20,
        verified: 10,
        pending: 10,
        byType: {
          SCREENSHOT: 5,
          REPORT: 5,
          LOG: 5,
          VIDEO: 3,
          DOCUMENT: 2,
        },
      },
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    const typesCard = screen.getByText('Types').closest('div');
    expect(typesCard).toHaveTextContent('5');
  });
});

describe('EvidencePage - SessionId Changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls loadEvidence and loadStats when sessionId changes', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/evidence/session_1']}>
        <Routes>
          <Route path="/evidence/:sessionId" element={<EvidencePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockLoadEvidence).toHaveBeenCalledWith('session_1');
    expect(mockLoadStats).toHaveBeenCalledWith('session_1');

    vi.clearAllMocks();

    // Rerender with new sessionId
    rerender(
      <MemoryRouter initialEntries={['/evidence/session_2']}>
        <Routes>
          <Route path="/evidence/:sessionId" element={<EvidencePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockLoadEvidence).toHaveBeenCalledWith('session_2');
    expect(mockLoadStats).toHaveBeenCalledWith('session_2');
  });
});

describe('EvidencePage - Artifact Type Badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders artifact type badges with correct styling', () => {
    mockUseEvidenceStore.mockReturnValue({
      items: mockEvidenceItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    const { container } = renderEvidencePage();

    // Badge should be rendered for each item type
    expect(screen.getByText('SCREENSHOT')).toBeInTheDocument();
    expect(screen.getByText('REPORT')).toBeInTheDocument();

    // Check that badges have proper styling (background, padding, etc.)
    const screenshotBadge = screen.getByText('SCREENSHOT').closest('span');
    expect(screenshotBadge).toHaveStyle({ background: '#e5e7eb' });
  });
});

describe('EvidencePage - Verification Status Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays Yes with green color for verified items', () => {
    const verifiedItem = [
      {
        id: 'ev_1',
        sessionId: 'session_123',
        fileName: 'verified.pdf',
        artifactType: 'REPORT',
        verified: true,
        createdAt: '2026-02-01T10:00:00Z',
      },
    ];

    mockUseEvidenceStore.mockReturnValue({
      items: verifiedItem,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    const { container } = renderEvidencePage();

    const yesText = screen.getByText('Yes');
    expect(yesText).toBeInTheDocument();
    expect(yesText).toHaveStyle({ color: '#22c55e' });
  });

  it('displays Pending with orange color for unverified items', () => {
    const pendingItem = [
      {
        id: 'ev_1',
        sessionId: 'session_123',
        fileName: 'pending.pdf',
        artifactType: 'REPORT',
        verified: false,
        createdAt: '2026-02-01T10:00:00Z',
      },
    ];

    mockUseEvidenceStore.mockReturnValue({
      items: pendingItem,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    const pendingTexts = screen.getAllByText('Pending');
    // Filter for the one in the table (not in stats card)
    const tablePending = pendingTexts.find(el => el.closest('td'));
    expect(tablePending).toBeInTheDocument();
    expect(tablePending).toHaveStyle({ color: '#f59e0b' });
  });
});

describe('EvidencePage - Multiple Artifact Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays all different artifact types correctly', () => {
    const mixedTypeItems = [
      {
        id: 'ev_1',
        sessionId: 'session_123',
        fileName: 'screenshot.png',
        artifactType: 'SCREENSHOT',
        verified: true,
        createdAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 'ev_2',
        sessionId: 'session_123',
        fileName: 'report.pdf',
        artifactType: 'REPORT',
        verified: false,
        createdAt: '2026-02-02T10:00:00Z',
      },
      {
        id: 'ev_3',
        sessionId: 'session_123',
        fileName: 'system.log',
        artifactType: 'LOG',
        verified: true,
        createdAt: '2026-02-03T10:00:00Z',
      },
      {
        id: 'ev_4',
        sessionId: 'session_123',
        fileName: 'demo.mp4',
        artifactType: 'VIDEO',
        verified: false,
        createdAt: '2026-02-04T10:00:00Z',
      },
    ];

    mockUseEvidenceStore.mockReturnValue({
      items: mixedTypeItems,
      stats: mockStats,
      isLoading: false,
      error: null,
      loadEvidence: mockLoadEvidence,
      loadStats: mockLoadStats,
    });

    renderEvidencePage();

    expect(screen.getByText('SCREENSHOT')).toBeInTheDocument();
    expect(screen.getByText('REPORT')).toBeInTheDocument();
    expect(screen.getByText('LOG')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
  });
});