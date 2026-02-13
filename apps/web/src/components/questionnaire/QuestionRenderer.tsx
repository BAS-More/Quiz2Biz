import React from 'react';
import type { Question, QuestionInputProps } from '../../types';
import { QuestionType } from '../../types/questionnaire';
import { TextInput } from './TextInput';
import { TextareaInput } from './TextareaInput';
import { NumberInput } from './NumberInput';
import { EmailInput } from './EmailInput';
import { UrlInput } from './UrlInput';
import { DateInput } from './DateInput';
import { SingleChoiceInput } from './SingleChoiceInput';
import { MultipleChoiceInput } from './MultipleChoiceInput';
import { ScaleInput } from './ScaleInput';
import { FileUploadInput, type FileWithPreview } from './FileUploadInput';
import { MatrixInput } from './MatrixInput';

interface QuestionRendererProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  showBestPractice?: boolean;
  showExplainer?: boolean;
}

/**
 * QuestionRenderer - Dynamically renders the appropriate input component
 * based on question type
 */
export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
  showBestPractice = true,
  showExplainer = true,
}) => {
  // Render the appropriate input component based on question type
  const renderInput = () => {
    const commonProps: QuestionInputProps<unknown> = {
      question,
      value,
      onChange,
      error,
      disabled,
      showBestPractice,
      showExplainer,
    };

    switch (question.type) {
      case QuestionType.TEXT:
        return (
          <TextInput
            {...commonProps}
            value={value as string}
            onChange={onChange as (v: string) => void}
          />
        );

      case QuestionType.TEXTAREA:
        return (
          <TextareaInput
            {...commonProps}
            value={value as string}
            onChange={onChange as (v: string) => void}
          />
        );

      case QuestionType.NUMBER:
        return (
          <NumberInput
            {...commonProps}
            value={value as number}
            onChange={onChange as (v: number) => void}
          />
        );

      case QuestionType.EMAIL:
        return (
          <EmailInput
            {...commonProps}
            value={value as string}
            onChange={onChange as (v: string) => void}
          />
        );

      case QuestionType.URL:
        return (
          <UrlInput
            {...commonProps}
            value={value as string}
            onChange={onChange as (v: string) => void}
          />
        );

      case QuestionType.DATE:
        return (
          <DateInput
            {...commonProps}
            value={value as string}
            onChange={onChange as (v: string) => void}
          />
        );

      case QuestionType.SINGLE_CHOICE:
        return (
          <SingleChoiceInput
            {...commonProps}
            value={value as string}
            onChange={onChange as (v: string) => void}
          />
        );

      case QuestionType.MULTIPLE_CHOICE:
        return (
          <MultipleChoiceInput
            {...commonProps}
            value={value as string[]}
            onChange={onChange as (v: string[]) => void}
          />
        );

      case QuestionType.SCALE:
        return (
          <ScaleInput
            {...commonProps}
            value={value as number}
            onChange={onChange as (v: number) => void}
          />
        );

      case QuestionType.FILE_UPLOAD:
        return (
          <FileUploadInput
            {...commonProps}
            value={value as FileWithPreview[]}
            onChange={onChange as (v: FileWithPreview[]) => void}
          />
        );

      case QuestionType.MATRIX:
        return (
          <MatrixInput
            {...commonProps}
            value={value as Record<string, string>}
            onChange={onChange as (v: Record<string, string>) => void}
          />
        );

      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">Unsupported question type: {question.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="question-container">
      {/* Question text */}
      <div className="mb-4">
        <label
          htmlFor={`question-${question.id}`}
          className="block text-lg font-medium text-gray-900"
        >
          {question.text}
          {question.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* Help text */}
        {question.helpText && <p className="mt-1 text-sm text-gray-500">{question.helpText}</p>}
      </div>

      {/* Best Practice panel */}
      {showBestPractice && question.bestPractice && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-green-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">Best Practice</h4>
              <p className="mt-1 text-sm text-green-700">{question.bestPractice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Practical Explainer panel */}
      {showExplainer && question.practicalExplainer && (
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-blue-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Why This Matters</h4>
              <p className="mt-1 text-sm text-blue-700">{question.practicalExplainer}</p>
            </div>
          </div>
        </div>
      )}

      {/* Standard references */}
      {question.standardRefs && (
        <div className="mb-4 flex flex-wrap gap-2">
          {question.standardRefs.split(',').map((ref, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              {ref.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Input component */}
      {renderInput()}
    </div>
  );
};
