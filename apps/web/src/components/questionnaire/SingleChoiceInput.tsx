import React from 'react';
import type { QuestionInputProps, QuestionOption } from '../../types';

/**
 * Single choice (radio button) input component
 */
export const SingleChoiceInput: React.FC<QuestionInputProps<string>> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const options: QuestionOption[] = question.options || [];

  return (
    <div className="question-input single-choice-input">
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all
                            ${
                              value === option.value
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                            ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div className="ml-3">
              <span className="block font-medium text-gray-900">{option.label}</span>
              {option.description && (
                <span className="block mt-1 text-sm text-gray-500">{option.description}</span>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};
