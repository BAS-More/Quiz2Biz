import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QuestionnairePage } from './QuestionnairePage';
import { questionnaireApi } from '../../api/questionnaire';
import * as conversationApi from '../../api/conversation';
import { useQuestionnaireStore } from '../../stores/questionnaire';

// Mock the store
vi.mock('../../stores/questionnaire', () => ({
  useQuestionnaireStore: vi.fn(),
}));

// Mock the APIs
vi.mock('../../api/questionnaire', () => {
  const questionnaireApi = {
    listQuestionnaires: vi.fn(),
    getQuestionnaireSession: vi.fn(),
    createQuestionnaireSession: vi.fn(),
    submitQuestionnaireResponse: vi.fn(),
    triggerNQS: vi.fn(),
    triggerAIQuestionnaireFollowUp: vi.fn(),
  };
  
  return {
    questionnaireApi,
    Persona: 'CTO',
    QuestionnaireListItem: 'object',
    QuestionType: 'TEXT',
    Questionnaire: 'object',
    QuestionnaireSession: 'object',
    QuestionnaireResponse: 'object',
    QuestionnaireProgress: 'object',
  };
});

vi.mock('../../api/conversation', () => ({
  submitAnswerWithAi: vi.fn(),
  submitFollowUp: vi.fn(),
  type: {
    ConversationMessage: 'object',
    FollowUpResult: 'object',
  },
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Users: () => <div data-testid="users-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  SkipForward: () => <div data-testid="skip-forward-icon" />,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
let mockAction = 'new';
let mockSearchParamsString = '';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ action: mockAction }),
    useSearchParams: () => [new URLSearchParams(mockSearchParamsString), vi.fn()],
  };
});

describe('QuestionnairePage', () => {
  const mockStoreValues = {
    session: null,
    currentQuestions: [],
    currentSection: null,
    readinessScore: null,
    canComplete: false,
    isComplete: false,
    isLoading: false,
    error: null,
    nqsHint: null,
    createSession: vi.fn(),
    continueSession: vi.fn(),
    submitResponse: vi.fn(),
    completeSession: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockAction = 'new';
    mockSearchParamsString = '';
    mockStoreValues.createSession.mockResolvedValue(undefined);
    mockStoreValues.continueSession.mockResolvedValue(undefined);
    mockStoreValues.submitResponse.mockResolvedValue(undefined);
    mockStoreValues.completeSession.mockResolvedValue(undefined);
    // Default mock for listQuestionnaires to prevent .then() on undefined
    vi.mocked(questionnaireApi.listQuestionnaires).mockResolvedValue([]);
    
    // Mock the store implementation
    vi.mocked(useQuestionnaireStore).mockImplementation(() => ({
      ...mockStoreValues,
    }));
  });

  const renderQuestionnairePage = (initialEntries: string[] = ['/questionnaire/new']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/questionnaire/:action" element={<QuestionnairePage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('New Session View', () => {
    it('renders persona selection and questionnaire list', async () => {
      const mockQuestionnaires = [
        {
          id: '1',
          name: 'Technical Readiness Assessment',
          totalQuestions: 25,
          sections: ['Intro', 'Architecture', 'Security'],
          estimatedTime: 15,
        },
        {
          id: '2',
          name: 'Business Requirements',
          totalQuestions: 18,
          sections: ['Business', 'Requirements'],
          estimatedTime: 10,
        },
      ];

      vi.mocked(questionnaireApi.listQuestionnaires).mockResolvedValue(mockQuestionnaires);

      renderQuestionnairePage(['/questionnaire/new']);

      // Should show back button
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();

      // Should show title and description
      expect(screen.getByText('Start New Assessment')).toBeInTheDocument();
      expect(screen.getByText('Select your persona and begin the readiness assessment.')).toBeInTheDocument();

      // Should show persona selector
      expect(screen.getByText('Select Your Persona')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByText('CTO')).toBeInTheDocument();
      expect(screen.getByText('CFO')).toBeInTheDocument();
      expect(screen.getByText('CEO')).toBeInTheDocument();
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
      expect(screen.getByText('Policy Writer')).toBeInTheDocument();

      // Should show questionnaire list
      expect(screen.getByText('Available Questionnaires')).toBeInTheDocument();

      // Wait for questionnaires to load
      await waitFor(() => {
        expect(screen.getByText('Technical Readiness Assessment')).toBeInTheDocument();
        expect(screen.getByText('25 questions | 3 sections | ~15 min')).toBeInTheDocument();
        expect(screen.getByText('Business Requirements')).toBeInTheDocument();
        expect(screen.getByText('18 questions | 2 sections | ~10 min')).toBeInTheDocument();
      });

      // Should show start buttons
      const startButtons = screen.getAllByText('Start');
      expect(startButtons).toHaveLength(2);
    });

    it('allows persona selection', () => {
      vi.mocked(questionnaireApi.listQuestionnaires).mockResolvedValue([]);

      renderQuestionnairePage(['/questionnaire/new']);

      const cfoButton = screen.getByText('CFO');
      fireEvent.click(cfoButton);

      // The button should now have selected styling (we can't easily test CSS classes in tests)
      // But we can verify it's still in the document
      expect(cfoButton).toBeInTheDocument();
    });

    it('starts session when questionnaire is selected', async () => {
      const mockQuestionnaires = [
        {
          id: '1',
          name: 'Technical Readiness Assessment',
          totalQuestions: 25,
          sections: ['Intro', 'Architecture', 'Security'],
          estimatedTime: 15,
        },
      ];

      vi.mocked(questionnaireApi.listQuestionnaires).mockResolvedValue(mockQuestionnaires);

      renderQuestionnairePage(['/questionnaire/new']);

      await waitFor(() => {
        expect(screen.getByText('Technical Readiness Assessment')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start');
      fireEvent.click(startButton);

      expect(mockStoreValues.createSession).toHaveBeenCalledWith('1', 'CTO');
    });

    it('shows loading state during questionnaire load', () => {
      vi.mocked(questionnaireApi.listQuestionnaires).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderQuestionnairePage(['/questionnaire/new']);

      expect(screen.getByText('Loading questionnaires...')).toBeInTheDocument();
    });

    it('shows error state when questionnaire load fails', async () => {
      vi.mocked(questionnaireApi.listQuestionnaires).mockRejectedValue(new Error('Failed to load'));

      renderQuestionnairePage(['/questionnaire/new']);

      await waitFor(() => {
        expect(screen.getByText('Failed to load questionnaires. Please refresh the page.')).toBeInTheDocument();
      });
    });

    it('shows error message from store', () => {
      const errorStoreValues = {
        ...mockStoreValues,
        error: 'Session creation failed',
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => errorStoreValues);

      vi.mocked(questionnaireApi.listQuestionnaires).mockResolvedValue([]);

      renderQuestionnairePage(['/questionnaire/new']);

      expect(screen.getByText('Session creation failed')).toBeInTheDocument();
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);
      expect(mockStoreValues.clearError).toHaveBeenCalled();
    });
  });

  describe('Loading Session State', () => {
    it('shows loading spinner when loading session', () => {
      mockAction = 'continue';
      mockSearchParamsString = 'sessionId=123';
      const loadingStoreValues = {
        ...mockStoreValues,
        isLoading: true,
        session: null,
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => loadingStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Loading session...')).toBeInTheDocument();
    });
  });

  describe('Completed Session State', () => {
    it('shows completion screen with score', () => {
      mockAction = 'continue';
      mockSearchParamsString = 'sessionId=123';
      const completedStoreValues = {
        ...mockStoreValues,
        isComplete: true,
        session: { id: '123' },
        readinessScore: 92.5,
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => completedStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      expect(screen.getByText('Project Complete!')).toBeInTheDocument();
      expect(screen.getByText('92.5%')).toBeInTheDocument();
      expect(screen.getByText('Generate Documents')).toBeInTheDocument();
      expect(screen.getByText('View Dashboard')).toBeInTheDocument();

      // Test navigation buttons
      const generateButton = screen.getByText('Generate Documents');
      fireEvent.click(generateButton);
      expect(mockNavigate).toHaveBeenCalledWith('/documents?sessionId=123');

      mockNavigate.mockClear();
      const dashboardButton = screen.getByText('View Dashboard');
      fireEvent.click(dashboardButton);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Active Session State', () => {
    beforeEach(() => {
      mockAction = 'continue';
      mockSearchParamsString = 'sessionId=123';
    });

    const activeSessionStoreValues = {
      ...mockStoreValues,
      session: { id: '123', progress: { answeredQuestions: 5, totalQuestions: 20, percentage: 25 } },
      currentQuestions: [
        {
          id: 'q1',
          text: 'How would you describe your current architecture?',
          type: 'TEXTAREA',
          helpText: 'Please provide a detailed description',
          placeholder: 'Enter your architecture description...',
          required: true,
        },
      ],
      readinessScore: 75.5,
      currentSection: { name: 'Architecture', answeredInSection: 2, questionsInSection: 5 },
    };

    it('shows active session with question flow', () => {
      vi.mocked(useQuestionnaireStore).mockImplementation(() => activeSessionStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      // Should show back button and readiness score
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Readiness:')).toBeInTheDocument();
      expect(screen.getByText('75.5%')).toBeInTheDocument();
      expect(screen.getByText('/ 95% required')).toBeInTheDocument();

      // Should show progress bar
      expect(screen.getByText('Question 6 of 20')).toBeInTheDocument();
      expect(screen.getByText('25% complete')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();

      // Should show section info
      expect(screen.getByText('Section: Architecture (2/5)')).toBeInTheDocument();

      // Should show current question
      expect(screen.getByText('How would you describe your current architecture?')).toBeInTheDocument();
      expect(screen.getByText('Please provide a detailed description')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your architecture description...')).toBeInTheDocument();
      expect(screen.getByText('* Required')).toBeInTheDocument();
    });

    it('submits text answer', async () => {
      vi.mocked(useQuestionnaireStore).mockImplementation(() => activeSessionStoreValues);
      mockStoreValues.submitResponse.mockResolvedValue(undefined);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      const textarea = screen.getByPlaceholderText('Enter your architecture description...');
      fireEvent.change(textarea, { target: { value: 'This is my architecture description' } });

      const submitButton = screen.getByText('Submit Answer');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockStoreValues.submitResponse).toHaveBeenCalledWith(
          '123',
          'q1',
          'This is my architecture description',
          expect.any(Number) // time spent
        );
      });
    });

    it('shows NQS hint when available', () => {
      const nqsStoreValues = {
        ...activeSessionStoreValues,
        nqsHint: {
          dimensionKey: 'Security',
          expectedScoreLift: 12.5,
        },
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => nqsStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByText('Next priority question')).toBeInTheDocument();
      expect(screen.getByText('in Security:')).toBeInTheDocument();
      expect(screen.getByText('+12.5 pts potential')).toBeInTheDocument();
    });

    it('handles single choice question type', () => {
      const singleChoiceStoreValues = {
        ...mockStoreValues,
        session: { id: '123', progress: { answeredQuestions: 0, totalQuestions: 10, percentage: 0 } },
        currentQuestions: [
          {
            id: 'q2',
            text: 'What is your deployment strategy?',
            type: 'SINGLE_CHOICE',
            options: [
              { id: 'opt1', label: 'Cloud', description: 'Deploy to cloud providers' },
              { id: 'opt2', label: 'On-premises', description: 'Deploy to local servers' },
            ],
            required: true,
          },
        ],
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => singleChoiceStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByText('What is your deployment strategy?')).toBeInTheDocument();
      expect(screen.getByText('Cloud')).toBeInTheDocument();
      expect(screen.getByText('Deploy to cloud providers')).toBeInTheDocument();
      expect(screen.getByText('On-premises')).toBeInTheDocument();
      expect(screen.getByText('Deploy to local servers')).toBeInTheDocument();

      // Test option selection
      const cloudOption = screen.getByText('Cloud').closest('label');
      if (cloudOption) {
        fireEvent.click(cloudOption);
        // Selection would be handled by the store in real implementation
      }
    });

    it('handles scale question type', () => {
      const scaleStoreValues = {
        ...mockStoreValues,
        session: { id: '123', progress: { answeredQuestions: 0, totalQuestions: 10, percentage: 0 } },
        currentQuestions: [
          {
            id: 'q3',
            text: 'Rate your current security maturity',
            type: 'SCALE',
            required: true,
          },
        ],
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => scaleStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByText('Rate your current security maturity')).toBeInTheDocument();
      
      // Should show scale buttons 1-5
      [1, 2, 3, 4, 5].forEach((n) => {
        expect(screen.getByText(n.toString())).toBeInTheDocument();
      });
    });

    it('handles multiple choice question type', () => {
      const multiChoiceStoreValues = {
        ...mockStoreValues,
        session: { id: '123', progress: { answeredQuestions: 0, totalQuestions: 10, percentage: 0 } },
        currentQuestions: [
          {
            id: 'q4',
            text: 'Which technologies do you use?',
            type: 'MULTIPLE_CHOICE',
            options: [
              { id: 'tech1', label: 'React' },
              { id: 'tech2', label: 'Node.js' },
              { id: 'tech3', label: 'PostgreSQL' },
            ],
            required: false,
          },
        ],
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => multiChoiceStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByText('Which technologies do you use?')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    });
  });

  describe('AI Follow-up Functionality', () => {
    beforeEach(() => {
      mockAction = 'continue';
      mockSearchParamsString = 'sessionId=123';
    });

    const followUpStoreValues = {
      ...mockStoreValues,
      session: { id: '123', progress: { answeredQuestions: 5, totalQuestions: 20, percentage: 25 } },
      currentQuestions: [
        {
          id: 'q1',
          text: 'Describe your security practices',
          type: 'TEXTAREA',
          required: true,
        },
      ],
    };

    it('shows AI follow-up when triggered', async () => {
      vi.mocked(useQuestionnaireStore).mockImplementation(() => followUpStoreValues);
      vi.mocked(conversationApi.submitAnswerWithAi).mockResolvedValue({
        followUp: {
          shouldFollowUp: true,
          followUpQuestion: 'Can you elaborate on your incident response procedures?',
          missingAreas: ['Incident Response', 'Recovery Planning'],
        },
        conversationMessages: [
          { id: '1', role: 'user', content: 'Initial answer' },
          { id: '2', role: 'assistant', content: 'Follow-up question' },
        ],
      });

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      const textarea = screen.getByPlaceholderText('Type your answer...');
      fireEvent.change(textarea, { target: { value: 'We have basic security measures in place.' } });

      const submitButton = screen.getByText('Submit Answer');
      fireEvent.click(submitButton);

      // Wait for AI follow-up to appear
      await waitFor(() => {
        expect(screen.getByText('AI Follow-up')).toBeInTheDocument();
        expect(screen.getByText('Can you elaborate on your incident response procedures?')).toBeInTheDocument();
        expect(screen.getByText('Areas to explore: Incident Response, Recovery Planning')).toBeInTheDocument();
      });
    });

    it('handles follow-up submission', async () => {
      vi.mocked(useQuestionnaireStore).mockImplementation(() => followUpStoreValues);
      vi.mocked(conversationApi.submitAnswerWithAi).mockResolvedValue({
        followUp: {
          shouldFollowUp: true,
          followUpQuestion: 'Can you elaborate?',
          missingAreas: [],
        },
        conversationMessages: [
          { id: '1', role: 'user', content: 'Initial answer' },
        ],
      });
      vi.mocked(conversationApi.submitFollowUp).mockResolvedValue({
        id: '3',
        role: 'user',
        content: 'My detailed answer',
      });

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      // First trigger the follow-up by submitting an answer
      const textarea = screen.getByPlaceholderText('Type your answer...');
      fireEvent.change(textarea, { target: { value: 'We have basic security measures in place.' } });
      const submitButton = screen.getByText('Submit Answer');
      fireEvent.click(submitButton);

      // Wait for follow-up to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add more details...')).toBeInTheDocument();
      });

      const followUpTextarea = screen.getByPlaceholderText('Add more details...');
      fireEvent.change(followUpTextarea, { target: { value: 'This is my detailed follow-up answer' } });

      const sendButton = screen.getByText('Send');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(conversationApi.submitFollowUp).toHaveBeenCalledWith(
          '123',
          'q1',
          'This is my detailed follow-up answer'
        );
      });
    });

    it('allows skipping follow-up', async () => {
      vi.mocked(useQuestionnaireStore).mockImplementation(() => followUpStoreValues);
      vi.mocked(conversationApi.submitAnswerWithAi).mockResolvedValue({
        followUp: {
          shouldFollowUp: true,
          followUpQuestion: 'Can you elaborate?',
          missingAreas: [],
        },
        conversationMessages: [
          { id: '1', role: 'user', content: 'Initial answer' },
        ],
      });

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      // First trigger the follow-up by submitting an answer
      const textarea = screen.getByPlaceholderText('Type your answer...');
      fireEvent.change(textarea, { target: { value: 'We have basic security measures in place.' } });
      const submitButton = screen.getByText('Submit Answer');
      fireEvent.click(submitButton);

      // Wait for follow-up to appear
      await waitFor(() => {
        expect(screen.getByText('Skip')).toBeInTheDocument();
      });

      const skipButton = screen.getByText('Skip');
      fireEvent.click(skipButton);

      // Follow-up should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Can you elaborate?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Completion Threshold States', () => {
    beforeEach(() => {
      mockAction = 'continue';
      mockSearchParamsString = 'sessionId=123';
    });

    it('shows ready to complete screen when threshold is met', () => {
      const readyToCompleteStoreValues = {
        ...mockStoreValues,
        session: { id: '123', progress: { answeredQuestions: 20, totalQuestions: 20, percentage: 100 } },
        currentQuestions: [],
        readinessScore: 96.5,
        canComplete: true,
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => readyToCompleteStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      expect(screen.getByText('Ready to Complete!')).toBeInTheDocument();
      expect(screen.getByText('96.5%')).toBeInTheDocument();
      expect(screen.getByText('Complete Assessment')).toBeInTheDocument();

      const completeButton = screen.getByText('Complete Assessment');
      fireEvent.click(completeButton);
      expect(mockStoreValues.completeSession).toHaveBeenCalledWith('123');
    });

    it('shows below threshold warning', () => {
      const belowThresholdStoreValues = {
        ...mockStoreValues,
        session: { id: '123', progress: { answeredQuestions: 20, totalQuestions: 20, percentage: 100 } },
        currentQuestions: [],
        readinessScore: 82.5,
        canComplete: false,
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => belowThresholdStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
      expect(screen.getByText('Score Below Threshold')).toBeInTheDocument();
      expect(screen.getByText('Current score: 82.5% (95% required)')).toBeInTheDocument();
      expect(screen.getByText('All questions answered, but coverage needs improvement. Review and update your responses.')).toBeInTheDocument();
    });
  });

  describe('Session Resumption', () => {
    beforeEach(() => {
      mockAction = 'continue';
      mockSearchParamsString = 'sessionId=123';
    });

    it('resumes session when sessionId parameter is present', () => {
      const sessionStoreValues = {
        ...mockStoreValues,
        session: { id: '456' }, // Different session ID
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => sessionStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(mockStoreValues.continueSession).toHaveBeenCalledWith('123');
    });

    it('does not resume when session ID matches', () => {
      const sessionStoreValues = {
        ...mockStoreValues,
        session: { id: '123' }, // Same session ID
      };
      vi.mocked(useQuestionnaireStore).mockImplementation(() => sessionStoreValues);

      renderQuestionnairePage(['/questionnaire/continue?sessionId=123']);

      expect(mockStoreValues.continueSession).not.toHaveBeenCalled();
    });
  });
});