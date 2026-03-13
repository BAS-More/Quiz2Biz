/**
 * QuestionnaireNavigation - Navigation controls for questionnaire
 * Provides Previous/Skip/Submit buttons with proper state handling
 */

import React from 'react';
import { ChevronLeft, SkipForward, ArrowRight, Loader2 } from 'lucide-react';

interface QuestionnaireNavigationProps {
  /** Handler for going to previous question */
  onPrevious: () => void;
  /** Handler for skipping current optional question */
  onSkip: () => void;
  /** Handler for submitting current answer */
  onSubmit: () => void;
  /** Whether user can go back to previous question */
  canGoBack: boolean;
  /** Whether current question can be skipped */
  canSkip: boolean;
  /** Whether submit is disabled (no value entered) */
  isSubmitDisabled: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Whether currently reviewing a previous question */
  isReviewing: boolean;
  /** Current review index (1-based for display) */
  reviewPosition?: number;
  /** Total questions in history */
  totalHistory?: number;
}

export const QuestionnaireNavigation: React.FC<QuestionnaireNavigationProps> = ({
  onPrevious,
  onSkip,
  onSubmit,
  canGoBack,
  canSkip,
  isSubmitDisabled,
  isLoading,
  isReviewing,
  reviewPosition,
  totalHistory,
}) => {
  return (
    <div className="flex items-center justify-between mt-6" data-testid="question-navigator">
      {/* Left side: Previous button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoBack || isLoading}
          data-testid="previous-question"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${canGoBack && !isLoading
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          aria-label="Go to previous question"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>

        {/* Review indicator */}
        {isReviewing && reviewPosition !== undefined && totalHistory !== undefined && (
          <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Reviewing {reviewPosition} of {totalHistory}
          </span>
        )}
      </div>

      {/* Right side: Skip and Submit buttons */}
      <div className="flex items-center gap-3">
        {/* Skip button (only for optional questions) */}
        {canSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={isLoading}
            data-testid="skip-question"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Skip this optional question"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            Skip
          </button>
        )}

        {/* Submit/Next button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitDisabled || isLoading}
          data-testid="submit-answer"
          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={isReviewing ? 'Update and continue' : 'Submit answer'}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {isReviewing ? 'Updating...' : 'Submitting...'}
            </>
          ) : (
            <>
              {isReviewing ? 'Update Answer' : 'Submit Answer'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default QuestionnaireNavigation;
