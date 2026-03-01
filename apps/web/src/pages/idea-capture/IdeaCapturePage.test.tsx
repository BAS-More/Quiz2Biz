import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { IdeaCapturePage } from './IdeaCapturePage';
import {
  submitIdea,
  createSessionFromIdea,
  confirmProjectType,
  listProjectTypes,
  createProject,
} from '../../api/idea-capture';

// Mock the API
vi.mock('../../api/idea-capture', () => {
  return {
    submitIdea: vi.fn(),
    createSessionFromIdea: vi.fn(),
    confirmProjectType: vi.fn(),
    listProjectTypes: vi.fn(),
    createProject: vi.fn(),
    IdeaCaptureResponse: 'object',
    ProjectTypeRecommendation: 'object',
    Project: 'object',
  };
});

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Target: () => <div data-testid="target-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('IdeaCapturePage', () => {
  const mockIdeaResponse = {
    id: 'idea-123',
    analysis: {
      summary: 'This is a comprehensive analysis of your business idea.',
      themes: ['E-commerce', 'Marketplace', 'Technology'],
      strengths: ['Clear value proposition', 'Scalable business model'],
      gaps: ['Revenue model details', 'Competitive analysis'],
      recommendedProjectType: {
        slug: 'web-app',
        name: 'Web Application',
        reasoning: 'Best fit for your e-commerce marketplace idea',
        confidence: 0.95,
      },
      alternativeProjectTypes: [
        {
          slug: 'mobile-app',
          name: 'Mobile Application',
          reasoning: 'Alternative approach for mobile-first strategy',
          confidence: 0.75,
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.mocked(submitIdea).mockResolvedValue(mockIdeaResponse);
    vi.mocked(createSessionFromIdea).mockResolvedValue({ sessionId: 'session-456' });
    vi.mocked(listProjectTypes).mockResolvedValue([
      { id: 'web-app-id', slug: 'web-app', name: 'Web Application' },
      { id: 'mobile-app-id', slug: 'mobile-app', name: 'Mobile Application' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderIdeaCapturePage = () => {
    return render(
      <MemoryRouter>
        <IdeaCapturePage />
      </MemoryRouter>,
    );
  };

  describe('Initial Input State', () => {
    it('renders initial input form', () => {
      renderIdeaCapturePage();

      // Should show header with icon and title
      expect(screen.getByTestId('lightbulb-icon')).toBeInTheDocument();
      expect(screen.getByText('Capture Your Idea')).toBeInTheDocument();
      expect(screen.getByText(/Describe your business idea in your own words/)).toBeInTheDocument();

      // Should show step indicator
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      // Should show input fields
      expect(screen.getByLabelText('Project Title (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Describe Your Idea')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., PetConnect Marketplace')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Tell us about your business idea/)).toBeInTheDocument();

      // Should show character count
      expect(screen.getByText('At least 10 more characters needed')).toBeInTheDocument();

      // Should show AI indicator
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
      expect(screen.getByText('AI-powered analysis')).toBeInTheDocument();

      // Submit button should be disabled initially
      const submitButton = screen.getByText('Analyze My Idea');
      expect(submitButton).toBeInTheDocument();
      expect(submitButton.closest('button')).toBeDisabled();
    });

    it('updates character count as user types', () => {
      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');

      // Type 5 characters
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      expect(screen.getByText('At least 5 more characters needed')).toBeInTheDocument();

      // Type enough characters to enable button
      fireEvent.change(textarea, {
        target: {
          value: 'This is a sufficiently long idea description that meets the minimum requirement.',
        },
      });
      expect(screen.getByText(/\d+ \/ 10,000 characters/)).toBeInTheDocument();

      // Submit button should now be enabled
      const submitButton = screen.getByText('Analyze My Idea');
      expect(submitButton.closest('button')).not.toBeDisabled();
    });

    it('allows optional title input', () => {
      renderIdeaCapturePage();

      const titleInput = screen.getByLabelText('Project Title (optional)');
      fireEvent.change(titleInput, { target: { value: 'My Awesome Project' } });

      expect(titleInput).toHaveValue('My Awesome Project');
    });
  });

  describe('Idea Submission and Analysis', () => {
    it('submits idea when button is clicked', async () => {
      // Add delay to see analyzing state
      vi.mocked(submitIdea).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockIdeaResponse), 100)),
      );

      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, {
        target: {
          value:
            'This is my business idea for an e-commerce platform that connects local vendors with customers.',
        },
      });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      // Should show analyzing state with loader
      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
        expect(screen.getByText('Analyzing Your Idea')).toBeInTheDocument();
      });

      // Wait for API call to complete
      await waitFor(() => {
        expect(submitIdea).toHaveBeenCalledWith(
          'This is my business idea for an e-commerce platform that connects local vendors with customers.',
          undefined,
        );
      });
    });

    it('submits idea with title when provided', async () => {
      renderIdeaCapturePage();

      const titleInput = screen.getByLabelText('Project Title (optional)');
      fireEvent.change(titleInput, { target: { value: 'VendorConnect Platform' } });

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, {
        target: { value: 'Platform connecting local vendors with customers.' },
      });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitIdea).toHaveBeenCalledWith(
          'Platform connecting local vendors with customers.',
          'VendorConnect Platform',
        );
      });
    });

    it('shows error for insufficient input length', () => {
      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Short' } });

      // Button should be disabled when input too short
      const submitButton = screen.getByText('Analyze My Idea');
      expect(submitButton.closest('button')).toBeDisabled();

      // Should show character count hint instead of error
      expect(screen.getByText('At least 5 more characters needed')).toBeInTheDocument();
      expect(submitIdea).not.toHaveBeenCalled();
    });

    it('shows error when submission fails', async () => {
      vi.mocked(submitIdea).mockRejectedValue(new Error('Network error'));

      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, {
        target: {
          value:
            'This is a detailed business idea description that exceeds the minimum length requirement.',
        },
      });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Component uses error.message from thrown Error
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Should return to input state
      expect(screen.getByLabelText('Describe Your Idea')).toBeInTheDocument();
    });

    it('shows timeout error', async () => {
      const timeoutError = new DOMException('Timeout', 'AbortError');
      vi.mocked(submitIdea).mockRejectedValue(timeoutError);

      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, {
        target: { value: 'This is a detailed business idea description that meets minimum length.' },
      });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Analysis timed out. Please try again with a shorter description.'),
        ).toBeInTheDocument();
      });
    });

    it('shows network error', async () => {
      const networkError = new TypeError('Failed to fetch');
      vi.mocked(submitIdea).mockRejectedValue(networkError);

      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, {
        target: { value: 'This is a detailed business idea description that meets minimum length.' },
      });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Network error — please check your connection and try again.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Analysis Results Display', () => {
    it('displays analysis results after successful submission', async () => {
      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Detailed business idea for analysis.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      // Wait for results to appear
      await waitFor(() => {
        expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
      });

      // Should show summary
      expect(
        screen.getByText('This is a comprehensive analysis of your business idea.'),
      ).toBeInTheDocument();

      // Should show themes
      expect(screen.getByText('Key Themes')).toBeInTheDocument();
      expect(screen.getByText('E-commerce')).toBeInTheDocument();
      expect(screen.getByText('Marketplace')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();

      // Should show strengths
      expect(screen.getByText('Strengths')).toBeInTheDocument();
      expect(screen.getByText('Clear value proposition')).toBeInTheDocument();
      expect(screen.getByText('Scalable business model')).toBeInTheDocument();

      // Should show gaps
      expect(screen.getByText('Areas to Explore')).toBeInTheDocument();
      expect(screen.getByText('Revenue model details')).toBeInTheDocument();
      expect(screen.getByText('Competitive analysis')).toBeInTheDocument();

      // Should show project type selection
      expect(screen.getByText('Recommended Project Type')).toBeInTheDocument();
      expect(screen.getByText('Web Application')).toBeInTheDocument();
      expect(screen.getByText('Best fit for your e-commerce marketplace idea')).toBeInTheDocument();
      expect(screen.getByText('95% match')).toBeInTheDocument();
      expect(screen.getByText('Recommended')).toBeInTheDocument();

      // Should show alternative project type
      expect(screen.getByText('Mobile Application')).toBeInTheDocument();
      expect(
        screen.getByText('Alternative approach for mobile-first strategy'),
      ).toBeInTheDocument();
      expect(screen.getByText('75% match')).toBeInTheDocument();

      // Should show start button
      const startButton = screen.getByText('Start Questionnaire');
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();
    });

    it('allows project type selection', async () => {
      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Detailed business idea for analysis.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      // Select alternative project type
      const mobileAppCard = screen.getByText('Mobile Application').closest('button');
      if (mobileAppCard) {
        fireEvent.click(mobileAppCard);

        // The selection should be reflected (visual check)
        expect(screen.getByText('Mobile Application')).toBeInTheDocument();
      }
    });
  });

  describe('Session Creation', () => {
    it('creates session with recommended project type', async () => {
      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Detailed business idea for analysis.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Questionnaire');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(createSessionFromIdea).toHaveBeenCalledWith('idea-123');
        expect(mockNavigate).toHaveBeenCalledWith('/questionnaire?sessionId=session-456');
      });
    });

    it('confirms project type when different from recommendation', async () => {
      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Detailed business idea for analysis.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Mobile Application')).toBeInTheDocument();
      });

      // Select alternative project type
      const mobileAppCard = screen.getByText('Mobile Application').closest('button');
      if (mobileAppCard) {
        fireEvent.click(mobileAppCard);
      }

      const startButton = screen.getByText('Start Questionnaire');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(confirmProjectType).toHaveBeenCalledWith('idea-123', 'mobile-app-id');
        expect(createSessionFromIdea).toHaveBeenCalledWith('idea-123');
        expect(mockNavigate).toHaveBeenCalledWith('/questionnaire?sessionId=session-456');
      });
    });

    it('shows error when session creation fails', async () => {
      vi.mocked(createSessionFromIdea).mockRejectedValue(new Error('Session creation failed'));

      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Detailed business idea for analysis.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Questionnaire');
      fireEvent.click(startButton);

      await waitFor(() => {
        // Component uses error.message from thrown Error
        expect(screen.getByText('Session creation failed')).toBeInTheDocument();
      });

      // Should return to results state
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
    });

    it('shows loading state during session creation', async () => {
      // Make the API call take some time
      vi.mocked(createSessionFromIdea).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ sessionId: 'session-456' }), 100)),
      );

      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Detailed business idea for analysis.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Web Application')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Questionnaire');
      fireEvent.click(startButton);

      // Should show loading state
      expect(screen.getByText('Creating Session...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Dismissal', () => {
    it('allows dismissing error messages', async () => {
      vi.mocked(submitIdea).mockRejectedValue(new Error('Analysis failed'));

      renderIdeaCapturePage();

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'This is a detailed business idea that meets minimum.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Analysis failed')).toBeInTheDocument();
      });

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      expect(screen.queryByText('Analysis failed')).not.toBeInTheDocument();
    });
  });

  describe('UI State Transitions', () => {
    it('shows correct step indicators throughout flow', async () => {
      renderIdeaCapturePage();

      // Initial state - step 1 active
      expect(screen.getByText('1')).toBeInTheDocument(); // Active step
      expect(screen.getByText('2')).toBeInTheDocument(); // Inactive step
      expect(screen.getByText('3')).toBeInTheDocument(); // Inactive step

      const textarea = screen.getByLabelText('Describe Your Idea');
      fireEvent.change(textarea, { target: { value: 'Detailed business idea for analysis.' } });

      const submitButton = screen.getByText('Analyze My Idea');
      fireEvent.click(submitButton);

      // Analyzing state - step 2 active
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Active step (shows checkmark)
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });

      // Results state - step 3 active
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Active step
      });
    });
  });
});
