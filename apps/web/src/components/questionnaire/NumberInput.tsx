import React from 'react';
import type { QuestionInputProps } from '../../types';

/**
 * Number input component for numeric values
 */
export const NumberInput: React.FC<QuestionInputProps<number>> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  return (
    <div className="question-input number-input">
      <input
        type="number"
        id={`question-${question.id}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 0)}
        placeholder={question.placeholder || 'Enter a number...'}
        disabled={disabled}
        required={question.isRequired}
        min={question.validationRules?.min}
        max={question.validationRules?.max}
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
