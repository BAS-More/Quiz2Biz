import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Question, Section, QuestionResponse, SessionProgress } from '../../types';
import { QuestionRenderer } from './QuestionRenderer';

interface QuestionnaireFlowProps {
  sections: Section[];
  initialResponses?: Map<string, QuestionResponse>;
  onResponseChange: (questionId: string, response: QuestionResponse) => void;
  onComplete: () => void;
  onSectionChange?: (sectionId: string) => void;
}

/**
 * QuestionnaireFlow - One-by-one question flow with progress tracking
 * Displays questions sequentially with navigation controls
 */
export const QuestionnaireFlow: React.FC<QuestionnaireFlowProps> = ({
  sections,
  initialResponses = new Map(),
  onResponseChange,
  onComplete,
  onSectionChange,
}) => {
  // Flatten all questions from all sections
  const allQuestions = useMemo(() => {
    const questions: Array<{ question: Question; section: Section; index: number }> = [];
    sections.forEach((section) => {
      section.questions.forEach((question, idx) => {
        questions.push({ question, section, index: idx });
      });
    });
    return questions;
  }, [sections]);

  // Current question index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(initialResponses);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const questionStartTime = useRef<number>(Date.now());

  const currentItem = allQuestions[currentIndex];

  // Reset timer when question changes
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);
  const totalQuestions = allQuestions.length;

  // Calculate progress
  const progress: SessionProgress = useMemo(() => {
    const answered = responses.size;
    const sectionsWithProgress = sections.map((section) => {
      const sectionQuestions = section.questions.length;
      const sectionAnswered = section.questions.filter((q) => responses.has(q.id)).length;
      return { total: sectionQuestions, answered: sectionAnswered };
    });

    const completedSections = sectionsWithProgress.filter((s) => s.answered === s.total).length;
    const currentSectionIndex = sections.findIndex((s) => s.id === currentItem?.section.id);
    const currentSectionProgress = sectionsWithProgress[currentSectionIndex]?.answered || 0;
    const currentSectionTotal = sectionsWithProgress[currentSectionIndex]?.total || 0;

    return {
      percentage: totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0,
      answered,
      total: totalQuestions,
      sectionsCompleted: completedSections,
      totalSections: sections.length,
      currentSectionProgress,
      currentSectionTotal,
    };
  }, [responses, sections, totalQuestions, currentItem]);

  // Handle value change
  const handleValueChange = useCallback(
    (value: unknown) => {
      if (!currentItem) {
        return;
      }

      const timeSpentSeconds = Math.round((Date.now() - questionStartTime.current) / 1000);
      const response: QuestionResponse = {
        questionId: currentItem.question.id,
        value,
        timeSpentSeconds,
      };

      setResponses((prev) => {
        const next = new Map(prev);
        next.set(currentItem.question.id, response);
        return next;
      });

      onResponseChange(currentItem.question.id, response);

      // Clear error for this question
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(currentItem.question.id);
        return next;
      });
    },
    [currentItem, onResponseChange],
  );

  // Validate current question
  const validateCurrentQuestion = useCallback((): boolean => {
    if (!currentItem) {
      return true;
    }

    const { question } = currentItem;
    const response = responses.get(question.id);

    if (
      question.isRequired &&
      (!response || response.value === undefined || response.value === '')
    ) {
      setErrors((prev) => {
        const next = new Map(prev);
        next.set(question.id, 'This question is required');
        return next;
      });
      return false;
    }

    return true;
  }, [currentItem, responses]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (!validateCurrentQuestion()) {
      return;
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      const nextItem = allQuestions[currentIndex + 1];
      if (nextItem && nextItem.section.id !== currentItem?.section.id) {
        onSectionChange?.(nextItem.section.id);
      }
    } else {
      onComplete();
    }
  }, [
    currentIndex,
    totalQuestions,
    allQuestions,
    currentItem,
    validateCurrentQuestion,
    onSectionChange,
    onComplete,
  ]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevItem = allQuestions[currentIndex - 1];
      if (prevItem && prevItem.section.id !== currentItem?.section.id) {
        onSectionChange?.(prevItem.section.id);
      }
    }
  }, [currentIndex, allQuestions, currentItem, onSectionChange]);

  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalQuestions) {
        setCurrentIndex(index);
        const item = allQuestions[index];
        if (item) {
          onSectionChange?.(item.section.id);
        }
      }
    },
    [totalQuestions, allQuestions, onSectionChange],
  );

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        goToNext();
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        goToNext();
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  if (!currentItem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No questions available</p>
      </div>
    );
  }

  const currentResponse = responses.get(currentItem.question.id);
  const currentError = errors.get(currentItem.question.id);

  return (
    <div className="questionnaire-flow max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">{progress.percentage}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span className="px-2 py-1 bg-gray-100 rounded">
            Section {sections.findIndex((s) => s.id === currentItem.section.id) + 1} /{' '}
            {sections.length}
          </span>
          <span>|</span>
          <span>{currentItem.section.name}</span>
        </div>
        {currentItem.section.description && (
          <p className="text-sm text-gray-600">{currentItem.section.description}</p>
        )}
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <QuestionRenderer
          question={currentItem.question}
          value={currentResponse?.value}
          onChange={handleValueChange}
          error={currentError}
          showBestPractice={true}
          showExplainer={true}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                        ${
                          currentIndex === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Previous
        </button>

        <button
          onClick={goToNext}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                        hover:bg-blue-700 transition-colors"
        >
          {currentIndex === totalQuestions - 1 ? 'Complete' : 'Next'}
          {currentIndex < totalQuestions - 1 && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Question navigator dots */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {allQuestions.map((item, idx) => {
          const isAnswered = responses.has(item.question.id);
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={item.question.id}
              onClick={() => goToQuestion(idx)}
              className={`w-3 h-3 rounded-full transition-all
                                ${isCurrent ? 'w-6 bg-blue-600' : ''}
                                ${!isCurrent && isAnswered ? 'bg-green-500' : ''}
                                ${!isCurrent && !isAnswered ? 'bg-gray-300 hover:bg-gray-400' : ''}`}
              title={`Question ${idx + 1}: ${item.question.text.substring(0, 50)}...`}
            />
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Tip: Use Ctrl+Enter or Ctrl+Arrow keys to navigate
      </p>
    </div>
  );
};

export default QuestionnaireFlow;
