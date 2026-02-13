import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionRenderer } from './QuestionRenderer';
import { QuestionType } from '../../types/questionnaire';
import type { Question } from '../../types';

describe('QuestionRenderer', () => {
  const mockQuestion: Question = {
    id: 'test-q1',
    sectionId: 'test-section',
    text: 'What is your favorite color?',
    type: QuestionType.TEXT,
    persona: 'BA' as any,
    dimensionKey: 'requirements',
    severity: 0.5,
    orderIndex: 1,
    isRequired: true,
    bestPractice: 'Choose colors that align with brand identity',
    practicalExplainer: 'Color choice affects user perception',
    standardRefs: 'WCAG 2.2',
  };

  it('should render question text', () => {
    render(<QuestionRenderer question={mockQuestion} value="" onChange={() => {}} />);

    expect(screen.getByText('What is your favorite color?')).toBeInTheDocument();
  });

  it('should show required indicator', () => {
    render(<QuestionRenderer question={mockQuestion} value="" onChange={() => {}} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should display best practice when enabled', () => {
    render(
      <QuestionRenderer
        question={mockQuestion}
        value=""
        onChange={() => {}}
        showBestPractice={true}
      />,
    );

    expect(screen.getByText('Best Practice')).toBeInTheDocument();
    expect(screen.getByText('Choose colors that align with brand identity')).toBeInTheDocument();
  });

  it('should display practical explainer when enabled', () => {
    render(
      <QuestionRenderer
        question={mockQuestion}
        value=""
        onChange={() => {}}
        showExplainer={true}
      />,
    );

    expect(screen.getByText('Why This Matters')).toBeInTheDocument();
    expect(screen.getByText('Color choice affects user perception')).toBeInTheDocument();
  });

  it('should display standard references', () => {
    render(<QuestionRenderer question={mockQuestion} value="" onChange={() => {}} />);

    expect(screen.getByText('WCAG 2.2')).toBeInTheDocument();
  });
});
