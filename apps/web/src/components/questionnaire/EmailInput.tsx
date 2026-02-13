import React from 'react';
import type { QuestionInputProps } from '../../types';

/**
 * Email input component with validation
 */
export const EmailInput: React.FC<QuestionInputProps<string>> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  return (
    <div className="question-input email-input">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
            />
          </svg>
        </span>
        <input
          type="email"
          id={`question-${question.id}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || 'email@example.com'}
          disabled={disabled}
          required={question.isRequired}
          className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-colors
                        ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
                        focus:outline-none focus:ring-2 focus:border-transparent
                        disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-describedby={error ? `${question.id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${question.id}-error`} className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};
