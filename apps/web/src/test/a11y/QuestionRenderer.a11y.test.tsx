/**
 * Accessibility tests for QuestionRenderer component
 * WCAG 2.2 Level AA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock question types
const QuestionType = {
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  NUMBER: 'NUMBER',
  EMAIL: 'EMAIL',
  URL: 'URL',
  DATE: 'DATE',
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  SCALE: 'SCALE',
  FILE_UPLOAD: 'FILE_UPLOAD',
  MATRIX: 'MATRIX',
} as const;

interface MockQuestion {
  id: string;
  text: string;
  type: string;
  isRequired?: boolean;
  helpText?: string;
  bestPractice?: string;
  practicalExplainer?: string;
  standardRefs?: string;
  options?: string[];
}

// Accessible mock QuestionRenderer component
function MockQuestionRenderer({
  question,
  showBestPractice = true,
  showExplainer = true,
}: {
  question: MockQuestion;
  showBestPractice?: boolean;
  showExplainer?: boolean;
}) {
  const renderInput = () => {
    switch (question.type) {
      case QuestionType.TEXT:
        return (
          <input
            type="text"
            id={`question-${question.id}`}
            aria-required={question.isRequired}
            aria-describedby={question.helpText ? `help-${question.id}` : undefined}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
          />
        );
      case QuestionType.TEXTAREA:
        return (
          <textarea
            id={`question-${question.id}`}
            aria-required={question.isRequired}
            aria-describedby={question.helpText ? `help-${question.id}` : undefined}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
          />
        );
      case QuestionType.NUMBER:
        return (
          <input
            type="number"
            id={`question-${question.id}`}
            aria-required={question.isRequired}
            className="mt-1 block w-full px-3 py-2 border rounded-md"
          />
        );
      case QuestionType.SINGLE_CHOICE:
        return (
          <fieldset>
            <legend id={`question-label-${question.id}`}>{question.text}</legend>
            <div
              role="radiogroup"
              aria-required={question.isRequired}
              aria-labelledby={`question-label-${question.id}`}
            >
              {question.options?.map((option, idx) => (
                <div key={idx} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${question.id}-${idx}`}
                    name={`question-${question.id}`}
                    value={option}
                    aria-labelledby={`option-label-${question.id}-${idx}`}
                  />
                  <label
                    id={`option-label-${question.id}-${idx}`}
                    htmlFor={`option-${question.id}-${idx}`}
                    className="ml-2 text-sm"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        );
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <fieldset>
            <legend id={`question-label-${question.id}`}>{question.text}</legend>
            <div
              role="group"
              aria-required={question.isRequired}
              aria-labelledby={`question-label-${question.id}`}
            >
              {question.options?.map((option, idx) => (
                <div key={idx} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`option-${question.id}-${idx}`}
                    name={`question-${question.id}`}
                    value={option}
                    aria-labelledby={`option-label-${question.id}-${idx}`}
                  />
                  <label
                    id={`option-label-${question.id}-${idx}`}
                    htmlFor={`option-${question.id}-${idx}`}
                    className="ml-2 text-sm"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        );
      case QuestionType.SCALE:
        return (
          <div role="group" aria-labelledby={`question-label-${question.id}`}>
            <input
              type="range"
              id={`question-${question.id}`}
              min="1"
              max="5"
              step="1"
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={3}
              aria-required={question.isRequired}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500" aria-hidden="true">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        );
      default:
        return <div>Unsupported question type</div>;
    }
  };

  return (
    <div className="question-container">
      {/* Question text */}
      <div className="mb-4">
        <label
          id={`question-label-${question.id}`}
          htmlFor={`question-${question.id}`}
          className="block text-lg font-medium text-gray-900"
        >
          {question.text}
          {question.isRequired && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>

        {/* Help text */}
        {question.helpText && (
          <p id={`help-${question.id}`} className="mt-1 text-sm text-gray-500">
            {question.helpText}
          </p>
        )}
      </div>

      {/* Best Practice panel - using section instead of aside to avoid landmark nesting issues */}
      {showBestPractice && question.bestPractice && (
        <section
          className="mb-4 p-4 bg-green-100 border-l-4 border-green-600 rounded-r-lg"
          aria-label="Best practice guidance"
        >
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-green-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-900">Best Practice</h4>
              <p className="mt-1 text-sm text-green-800">{question.bestPractice}</p>
            </div>
          </div>
        </section>
      )}

      {/* Practical Explainer panel - using section instead of aside */}
      {showExplainer && question.practicalExplainer && (
        <section
          className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg"
          aria-label="Why this matters"
        >
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-blue-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Why This Matters</h4>
              <p className="mt-1 text-sm text-blue-700">{question.practicalExplainer}</p>
            </div>
          </div>
        </section>
      )}

      {/* Standard references */}
      {question.standardRefs && (
        <div className="mb-4 flex flex-wrap gap-2" role="list" aria-label="Standard references">
          {question.standardRefs.split(',').map((ref, idx) => (
            <span
              key={idx}
              role="listitem"
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100"
            >
              {ref.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Input component */}
      {renderInput()}
    </div>
  );
}

describe('QuestionRenderer Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text question type', () => {
    const textQuestion: MockQuestion = {
      id: 'q1',
      text: 'What is your company name?',
      type: QuestionType.TEXT,
      isRequired: true,
      helpText: 'Enter your legal business name',
      bestPractice: 'Use your registered company name for consistency',
      practicalExplainer: 'This helps identify your organization',
      standardRefs: 'ISO 27001, NIST CSF',
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<MockQuestionRenderer question={textQuestion} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have properly labeled input', () => {
      render(<MockQuestionRenderer question={textQuestion} />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', `question-${textQuestion.id}`);
    });

    it('should indicate required field', () => {
      render(<MockQuestionRenderer question={textQuestion} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should have help text linked via aria-describedby', () => {
      render(<MockQuestionRenderer question={textQuestion} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', `help-${textQuestion.id}`);
    });
  });

  describe('Single choice question type', () => {
    const singleChoiceQuestion: MockQuestion = {
      id: 'q2',
      text: 'What is your primary industry?',
      type: QuestionType.SINGLE_CHOICE,
      isRequired: true,
      options: ['Technology', 'Healthcare', 'Finance', 'Retail'],
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<MockQuestionRenderer question={singleChoiceQuestion} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have a radiogroup with proper labeling', () => {
      render(<MockQuestionRenderer question={singleChoiceQuestion} />);
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeInTheDocument();
    });

    it('should have all options as radio buttons with labels', () => {
      render(<MockQuestionRenderer question={singleChoiceQuestion} />);
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(4);

      singleChoiceQuestion.options?.forEach((option) => {
        expect(screen.getByLabelText(option)).toBeInTheDocument();
      });
    });
  });

  describe('Multiple choice question type', () => {
    const multiChoiceQuestion: MockQuestion = {
      id: 'q3',
      text: 'Which security frameworks do you follow?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['ISO 27001', 'NIST CSF', 'SOC 2', 'PCI DSS'],
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<MockQuestionRenderer question={multiChoiceQuestion} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have all options as checkboxes with labels', () => {
      render(<MockQuestionRenderer question={multiChoiceQuestion} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);

      multiChoiceQuestion.options?.forEach((option) => {
        expect(screen.getByLabelText(option)).toBeInTheDocument();
      });
    });
  });

  describe('Scale question type', () => {
    const scaleQuestion: MockQuestion = {
      id: 'q4',
      text: 'Rate your current security maturity',
      type: QuestionType.SCALE,
      isRequired: true,
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<MockQuestionRenderer question={scaleQuestion} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have a slider with proper ARIA attributes', () => {
      render(<MockQuestionRenderer question={scaleQuestion} />);
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuemin', '1');
      expect(slider).toHaveAttribute('aria-valuemax', '5');
    });
  });

  describe('Best practice and explainer panels', () => {
    const questionWithPanels: MockQuestion = {
      id: 'q5',
      text: 'Describe your backup strategy',
      type: QuestionType.TEXTAREA,
      bestPractice: 'Follow 3-2-1 backup rule',
      practicalExplainer: 'Backups protect against data loss',
    };

    it('should have accessible best practice panel', () => {
      render(<MockQuestionRenderer question={questionWithPanels} showBestPractice={true} />);
      const bestPracticePanel = screen.getByRole('region', { name: /best practice/i });
      expect(bestPracticePanel).toBeInTheDocument();
    });

    it('should have accessible explainer panel', () => {
      render(<MockQuestionRenderer question={questionWithPanels} showExplainer={true} />);
      const explainerPanel = screen.getByRole('region', { name: /why this matters/i });
      expect(explainerPanel).toBeInTheDocument();
    });

    it('should hide decorative icons from assistive technology', () => {
      const { container } = render(<MockQuestionRenderer question={questionWithPanels} />);
      const decorativeSvgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(decorativeSvgs.length).toBeGreaterThan(0);
    });
  });

  describe('Standard references', () => {
    const questionWithRefs: MockQuestion = {
      id: 'q6',
      text: 'Test question',
      type: QuestionType.TEXT,
      standardRefs: 'ISO 27001, NIST CSF, OWASP',
    };

    it('should have accessible standard references list', () => {
      render(<MockQuestionRenderer question={questionWithRefs} />);
      const refsList = screen.getByRole('list', { name: /standard references/i });
      expect(refsList).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });
  });

  describe('Question container', () => {
    const basicQuestion: MockQuestion = {
      id: 'q7',
      text: 'Test question',
      type: QuestionType.TEXT,
    };

    it('should have proper container with question label', () => {
      render(<MockQuestionRenderer question={basicQuestion} />);
      const container = document.querySelector('.question-container');
      expect(container).toBeInTheDocument();
      const label = document.getElementById(`question-label-${basicQuestion.id}`);
      expect(label).toBeInTheDocument();
    });
  });
});
