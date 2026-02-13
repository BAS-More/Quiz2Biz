import React from 'react';
import type { QuestionInputProps } from '../../types';

/**
 * Textarea input component for long text responses
 */
export const TextareaInput: React.FC<QuestionInputProps<string>> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  return (
    <div className="question-input textarea-input">
      <textarea
        id={`question-${question.id}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || 'Enter your detailed answer...'}
        disabled={disabled}
        required={question.isRequired}
        minLength={question.validationRules?.minLength}
        maxLength={question.validationRules?.maxLength}
        rows={5}
        className={`w-full px-4 py-3 border rounded-lg transition-colors resize-y min-h-[120px]
                    ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
                    focus:outline-none focus:ring-2 focus:border-transparent
                    disabled:bg-gray-100 disabled:cursor-not-allowed`}
        aria-describedby={error ? `${question.id}-error` : undefined}
      />
      {question.validationRules?.maxLength && (
        <p className="mt-1 text-sm text-gray-500 text-right">
          {(value || '').length} / {question.validationRules.maxLength}
        </p>
      )}
      {error && (
        <p id={`${question.id}-error`} className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};
