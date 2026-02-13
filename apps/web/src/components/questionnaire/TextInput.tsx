import React from 'react';
import type { QuestionInputProps } from '../../types';

/**
 * Text input component for short text responses
 */
export const TextInput: React.FC<QuestionInputProps<string>> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  return (
    <div className="question-input text-input">
      <input
        type="text"
        id={`question-${question.id}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || 'Enter your answer...'}
        disabled={disabled}
        required={question.isRequired}
        minLength={question.validationRules?.minLength}
        maxLength={question.validationRules?.maxLength}
        pattern={question.validationRules?.pattern}
        className={`w-full px-4 py-3 border rounded-lg transition-colors
                    ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
                    focus:outline-none focus:ring-2 focus:border-transparent
                    disabled:bg-gray-100 disabled:cursor-not-allowed`}
        aria-describedby={error ? `${question.id}-error` : undefined}
      />
      {error && (
        <p id={`${question.id}-error`} className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};
