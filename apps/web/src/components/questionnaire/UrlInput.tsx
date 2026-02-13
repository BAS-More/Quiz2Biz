import React from 'react';
import type { QuestionInputProps } from '../../types';

/**
 * URL input component with validation
 */
export const UrlInput: React.FC<QuestionInputProps<string>> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  return (
    <div className="question-input url-input">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </span>
        <input
          type="url"
          id={`question-${question.id}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || 'https://example.com'}
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
