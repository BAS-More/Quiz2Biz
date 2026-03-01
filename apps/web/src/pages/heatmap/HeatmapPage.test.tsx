import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HeatmapPage } from './HeatmapPage';
import * as questionnaireModule from '../../api/questionnaire';

// Mock the API module
vi.mock('../../api/questionnaire', () => ({
  questionnaireApi: {
    getHeatmap: vi.fn(),
    getHeatmapDrilldown: vi.fn(),
  },
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Get typed mock references
const mockGetHeatmap = vi.mocked(questionnaireModule.questionnaireApi.getHeatmap);
const mockGetHeatmapDrilldown = vi.mocked(questionnaireModule.questionnaireApi.getHeatmapDrilldown);

describe('HeatmapPage', () => {
  const mockHeatmapData = {
    summary: {
      totalCells: 15,
      greenCells: 8,
      amberCells: 4,
      redCells: 3,
      criticalGapCount: 2,
      overallRiskScore: 4.2,
    },
    dimensions: ['Security', 'Architecture', 'Compliance', 'Operations', 'Data'],
    severityBuckets: ['Low', 'Medium', 'High'],
    cells: [
      // Security dimension
      {
        dimensionKey: 'security',
        severityBucket: 'Low',
        cellValue: 1.5,
        colorCode: '#28A745',
        questionCount: 5,
      },
      {
        dimensionKey: 'security',
        severityBucket: 'Medium',
        cellValue: 3.2,
        colorCode: '#FFC107',
        questionCount: 3,
      },
      {
        dimensionKey: 'security',
        severityBucket: 'High',
        cellValue: 8.7,
        colorCode: '#DC3545',
        questionCount: 2,
      },
      // Architecture dimension
      {
        dimensionKey: 'architecture',
        severityBucket: 'Low',
        cellValue: 0.8,
        colorCode: '#28A745',
        questionCount: 4,
      },
      {
        dimensionKey: 'architecture',
        severityBucket: 'Medium',
        cellValue: 2.1,
        colorCode: '#28A745',
        questionCount: 3,
      },
      {
        dimensionKey: 'architecture',
        severityBucket: 'High',
        cellValue: 5.4,
        colorCode: '#FFC107',
        questionCount: 2,
      },
      // Compliance dimension
      {
        dimensionKey: 'compliance',
        severityBucket: 'Low',
        cellValue: 2.3,
        colorCode: '#FFC107',
        questionCount: 3,
      },
      {
        dimensionKey: 'compliance',
        severityBucket: 'Medium',
        cellValue: 4.1,
        colorCode: '#DC3545',
        questionCount: 2,
      },
      {
        dimensionKey: 'compliance',
        severityBucket: 'High',
        cellValue: 7.8,
        colorCode: '#DC3545',
        questionCount: 1,
      },
      // Operations dimension
      {
        dimensionKey: 'operations',
        severityBucket: 'Low',
        cellValue: 1.1,
        colorCode: '#28A745',
        questionCount: 4,
      },
      {
        dimensionKey: 'operations',
        severityBucket: 'Medium',
        cellValue: 2.8,
        colorCode: '#FFC107',
        questionCount: 2,
      },
      {
        dimensionKey: 'operations',
        severityBucket: 'High',
        cellValue: 6.2,
        colorCode: '#DC3545',
        questionCount: 1,
      },
      // Data dimension
      {
        dimensionKey: 'data',
        severityBucket: 'Low',
        cellValue: 0.5,
        colorCode: '#28A745',
        questionCount: 3,
      },
      {
        dimensionKey: 'data',
        severityBucket: 'Medium',
        cellValue: 1.9,
        colorCode: '#28A745',
        questionCount: 2,
      },
      {
        dimensionKey: 'data',
        severityBucket: 'High',
        cellValue: 4.5,
        colorCode: '#FFC107',
        questionCount: 1,
      },
    ],
  };

  const mockDrilldownData = {
    dimensionKey: 'security',
    dimensionName: 'Security',
    severityBucket: 'High',
    cellValue: 8.7,
    colorCode: '#DC3545',
    questionCount: 2,
    questions: [
      {
        questionId: 'q1',
        questionText: 'Do you have a security incident response plan?',
        severity: 9.5,
        coverage: 0.3,
        residualRisk: 6.65,
      },
      {
        questionId: 'q2',
        questionText: 'Are all data transmissions encrypted?',
        severity: 8.8,
        coverage: 0.4,
        residualRisk: 5.28,
      },
    ],
    potentialImprovement: 3.45,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockGetHeatmap.mockReset();
    mockGetHeatmapDrilldown.mockReset();
    mockGetHeatmap.mockResolvedValue(mockHeatmapData);
    mockGetHeatmapDrilldown.mockResolvedValue(mockDrilldownData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderHeatmapPage = (sessionId: string = 'session-123') => {
    return render(
      <MemoryRouter initialEntries={[`/heatmap/${sessionId}`]}>
        <Routes>
          <Route path="/heatmap/:sessionId" element={<HeatmapPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      // Make the API call pending
      mockGetHeatmap.mockImplementation(() => new Promise(() => {}));

      renderHeatmapPage();

      expect(screen.getByText('Loading heatmap...')).toBeInTheDocument();
    });

    it('shows error state when API fails', async () => {
      mockGetHeatmap.mockRejectedValue(new Error('Failed to load heatmap'));

      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to load heatmap')).toBeInTheDocument();
      });
    });

    it('shows error with specific message from API', async () => {
      const apiError = {
        response: {
          data: {
            message: 'Session not found',
          },
        },
      };
      mockGetHeatmap.mockRejectedValue(apiError);

      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Error: Session not found')).toBeInTheDocument();
      });
    });
  });

  describe('Heatmap Display', () => {
    it('renders heatmap with summary cards', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Gap Heatmap')).toBeInTheDocument();
      });

      // Should show back link
      expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();

      // Should show description
      expect(screen.getByText(/Dimension x Severity matrix/)).toBeInTheDocument();

      // Should show summary cards
      expect(screen.getByText('Total Cells')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Amber')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Critical Gaps')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders heatmap grid with correct data', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      // Should show dimension headers
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();

      // Should show dimension rows
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Architecture')).toBeInTheDocument();
      expect(screen.getByText('Compliance')).toBeInTheDocument();
      expect(screen.getByText('Operations')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();

      // Should show cell values with proper formatting
      expect(screen.getByText('1.50')).toBeInTheDocument(); // Security Low
      expect(screen.getByText('3.20')).toBeInTheDocument(); // Security Medium
      expect(screen.getByText('8.70')).toBeInTheDocument(); // Security High
      expect(screen.getByText('0.80')).toBeInTheDocument(); // Architecture Low
    });

    it('renders cells with correct colors and styling', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      // Find the High severity cell for Security (should be red)
      const securityHighCell = screen.getByText('8.70').closest('button');
      expect(securityHighCell).toBeInTheDocument();
      expect(securityHighCell).toHaveStyle({ backgroundColor: 'rgba(239, 68, 68, 0.2)' }); // #ef4444 with 0.2 opacity
      expect(securityHighCell).toHaveStyle({ color: 'rgb(239, 68, 68)' }); // #ef4444

      // Find a green cell
      const architectureLowCell = screen.getByText('0.80').closest('button');
      expect(architectureLowCell).toBeInTheDocument();
      expect(architectureLowCell).toHaveStyle({ backgroundColor: 'rgba(34, 197, 94, 0.2)' }); // #22c55e with 0.2 opacity
      expect(architectureLowCell).toHaveStyle({ color: 'rgb(34, 197, 94)' }); // #22c55e
    });

    it('shows overall risk score', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Overall Risk Score:')).toBeInTheDocument();
      });

      expect(screen.getByText('4.20')).toBeInTheDocument();
      // Since 4.2 < 5, it should be green
      const riskScore = screen.getByText('4.20');
      expect(riskScore).toHaveStyle({ color: 'rgb(34, 197, 94)' }); // #22c55e
    });

    it('shows high risk score in red', async () => {
      const highRiskData = {
        ...mockHeatmapData,
        summary: {
          ...mockHeatmapData.summary,
          overallRiskScore: 6.8,
        },
      };
      mockGetHeatmap.mockResolvedValue(highRiskData);

      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('6.80')).toBeInTheDocument();
      });

      // Since 6.8 > 5, it should be red
      const riskScore = screen.getByText('6.80');
      expect(riskScore).toHaveStyle({ color: 'rgb(239, 68, 68)' }); // #ef4444
    });
  });

  describe('Cell Interaction', () => {
    it('calls drilldown API when cell is clicked', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      // Click on Security High cell
      const securityHighCell = screen.getByText('8.70');
      fireEvent.click(securityHighCell);

      await waitFor(() => {
        expect(mockGetHeatmapDrilldown).toHaveBeenCalledWith(
          'session-123',
          'security',
          'High',
        );
      });
    });

    it('shows drilldown panel with question details', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      // Click on Security High cell
      const securityHighCell = screen.getByText('8.70');
      fireEvent.click(securityHighCell);

      // Wait for drilldown panel to appear
      await waitFor(() => {
        expect(screen.getByText('Security - High')).toBeInTheDocument();
      });

      // Should show drilldown summary
      expect(
        screen.getByText('2 questions | Cell value: 8.7000 | Potential improvement: 3.4500'),
      ).toBeInTheDocument();

      // Should show individual questions
      expect(
        screen.getByText('Do you have a security incident response plan?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Severity: 9.50 | Coverage: 30% | Residual: 6.6500'),
      ).toBeInTheDocument();

      expect(screen.getByText('Are all data transmissions encrypted?')).toBeInTheDocument();
      expect(
        screen.getByText('Severity: 8.80 | Coverage: 40% | Residual: 5.2800'),
      ).toBeInTheDocument();
    });

    it('allows closing drilldown panel', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      // Click on Security High cell
      const securityHighCell = screen.getByText('8.70');
      fireEvent.click(securityHighCell);

      await waitFor(() => {
        expect(screen.getByText('Security - High')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(screen.queryByText('Security - High')).not.toBeInTheDocument();
    });

    it('handles drilldown API error gracefully', async () => {
      mockGetHeatmapDrilldown.mockRejectedValue(
        new Error('Drilldown failed'),
      );

      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      // Click on Security High cell
      const securityHighCell = screen.getByText('8.70');
      fireEvent.click(securityHighCell);

      // Should not crash - error is logged to console
      await waitFor(() => {
        // The drilldown panel should not appear due to error
        expect(screen.queryByText('Security - High')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back to dashboard when back link is clicked', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
      });

      const backLink = screen.getByText('← Back to Dashboard');
      fireEvent.click(backLink);

      // Note: In MemoryRouter, navigation doesn't actually change the page
      // but we can verify the link has the correct href
      expect(backLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('provides accessible labels for cells', async () => {
      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      const securityHighCell = screen.getByText('8.70').closest('button');
      expect(securityHighCell).toHaveAttribute(
        'aria-label',
        'Security, severity High: 2 questions, residual score 8.70',
      );
      expect(securityHighCell).toHaveAttribute('title', '2 questions, residual: 8.7');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing session ID gracefully', () => {
      // Render without sessionId in route
      render(
        <MemoryRouter initialEntries={['/heatmap/']}>
          <Routes>
            <Route path="/heatmap/" element={<HeatmapPage />} />
            <Route path="/heatmap/:sessionId" element={<HeatmapPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>,
      );

      // Should not make API call and should not crash
      expect(mockGetHeatmap).not.toHaveBeenCalled();
    });

    it('handles empty heatmap data', async () => {
      const emptyHeatmapData = {
        summary: {
          totalCells: 0,
          greenCells: 0,
          amberCells: 0,
          redCells: 0,
          criticalGapCount: 0,
          overallRiskScore: 0,
        },
        dimensions: [],
        severityBuckets: [],
        cells: [],
      };
      mockGetHeatmap.mockResolvedValue(emptyHeatmapData);

      renderHeatmapPage();

      await waitFor(() => {
        expect(screen.getByText('Gap Heatmap')).toBeInTheDocument();
      });

      // Should show zero values - use getAllByText since there are multiple 0s (totalCells, green, amber, red, critical)
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
      expect(screen.getByText('Overall Risk Score:')).toBeInTheDocument();
      expect(screen.getByText('0.00')).toBeInTheDocument();
    });
  });
});
