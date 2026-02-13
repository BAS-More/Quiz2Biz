import React from 'react';
import type { QuestionInputProps, QuestionOption } from '../../types';

/**
 * Multiple choice (checkbox) input component
 */
export const MultipleChoiceInput: React.FC<QuestionInputProps<string[]>> = ({
  question,
  value = [],
  onChange,
  error,
  disabled = false,
}) => {
  const options: QuestionOption[] = question.options || [];

  const handleChange = (optionValue: string, checked: boolean) => {
    const newValue = checked ? [...value, optionValue] : value.filter((v) => v !== optionValue);
    onChange(newValue);
  };

  return (
    <div className="question-input multiple-choice-input">
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all
                            ${
                              value.includes(option.value)
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }
                            ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              value={option.value}
              checked={value.includes(option.value)}
              onChange={(e) => handleChange(option.value, e.target.checked)}
              disabled={disabled}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
      <p className="mt-2 text-sm text-gray-500">{value.length} selected</p>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};
