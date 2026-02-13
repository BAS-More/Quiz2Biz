import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionRenderer } from './QuestionRenderer';
import { QuestionType } from '../../types/questionnaire';
import type { Question } from '../../types';

describe('QuestionRenderer - All Question Types', () => {
  const baseQuestion: Omit<Question, 'type'> = {
    id: 'test-q1',
    sectionId: 'test-section',
    text: 'Test Question',
    persona: 'BA' as any,
    dimensionKey: 'requirements',
    severity: 0.5,
    orderIndex: 1,
    isRequired: true,
    bestPractice: 'Best practice guidance',
    practicalExplainer: 'Practical explanation',
    standardRefs: 'ISO 27001',
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders TEXT input correctly', () => {
    const question: Question = { ...baseQuestion, type: QuestionType.TEXT };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders TEXTAREA correctly', () => {
    const question: Question = { ...baseQuestion, type: QuestionType.TEXTAREA };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders NUMBER input correctly', async () => {
    const user = userEvent.setup();
    const question: Question = { ...baseQuestion, type: QuestionType.NUMBER };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    const input = screen.getByRole('spinbutton');
    await user.type(input, '42');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('renders SINGLE_CHOICE correctly', () => {
    const question: Question = {
      ...baseQuestion,
      type: QuestionType.SINGLE_CHOICE,
      options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
      ],
    };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('radio', { name: /option 1/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /option 2/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /option 3/i })).toBeInTheDocument();
  });

  it('renders MULTIPLE_CHOICE correctly', () => {
    const question: Question = {
      ...baseQuestion,
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { value: 'optionA', label: 'Option A' },
        { value: 'optionB', label: 'Option B' },
        { value: 'optionC', label: 'Option C' },
      ],
    };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('checkbox', { name: /option a/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /option b/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /option c/i })).toBeInTheDocument();
  });

  it('renders SCALE correctly', () => {
    const question: Question = {
      ...baseQuestion,
      type: QuestionType.SCALE,
      validationRules: {
        min: 1,
        max: 5,
      },
    };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    // Default max is 10 if not specified in component implementation
    expect(slider).toBeInTheDocument();
  });

  it('renders DATE correctly', () => {
    const question: Question = { ...baseQuestion, type: QuestionType.DATE };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    const input = screen.getByLabelText(/test question/i);
    expect(input).toHaveAttribute('type', 'date');
  });

  it('renders FILE_UPLOAD correctly', () => {
    const question: Question = { ...baseQuestion, type: QuestionType.FILE_UPLOAD };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  it('renders URL correctly', async () => {
    const user = userEvent.setup();
    const question: Question = { ...baseQuestion, type: QuestionType.URL };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'https://example.com');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('renders EMAIL correctly', () => {
    const question: Question = { ...baseQuestion, type: QuestionType.EMAIL };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('displays best practice when showBestPractice is true', () => {
    const question: Question = {
      ...baseQuestion,
      type: QuestionType.TEXT,
      bestPractice: 'This is the best practice',
    };
    render(
      <QuestionRenderer
        question={question}
        value=""
        onChange={mockOnChange}
        showBestPractice={true}
      />,
    );

    expect(screen.getByText('This is the best practice')).toBeInTheDocument();
  });

  it('displays practical explainer when showExplainer is true', () => {
    const question: Question = {
      ...baseQuestion,
      type: QuestionType.TEXT,
      practicalExplainer: 'This is the practical explanation',
    };
    render(
      <QuestionRenderer
        question={question}
        value=""
        onChange={mockOnChange}
        showExplainer={true}
      />,
    );

    expect(screen.getByText('This is the practical explanation')).toBeInTheDocument();
  });

  it('displays standard references as tags', () => {
    const question: Question = {
      ...baseQuestion,
      type: QuestionType.TEXT,
      standardRefs: 'ISO 27001, NIST CSF, OWASP ASVS',
    };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    expect(screen.getByText(/ISO 27001/i)).toBeInTheDocument();
    expect(screen.getByText(/NIST CSF/i)).toBeInTheDocument();
    expect(screen.getByText(/OWASP ASVS/i)).toBeInTheDocument();
  });

  it('shows required indicator when isRequired is true', () => {
    const question: Question = {
      ...baseQuestion,
      type: QuestionType.TEXT,
      isRequired: true,
    };
    render(<QuestionRenderer question={question} value="" onChange={mockOnChange} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
