import React from 'react';
import type { SessionProgress } from '../../types';

interface ProgressDisplayProps {
  progress: SessionProgress;
  sectionName?: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * ProgressDisplay - Shows questionnaire progress in format:
 * 'Sections left: n | Questions left: m | This section: x/y'
 */
export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  progress,
  sectionName,
  showDetails = true,
  className = '',
}) => {
  const {
    percentage,
    answered,
    total,
    sectionsCompleted,
    totalSections,
    currentSectionProgress,
    currentSectionTotal,
  } = progress;

  const sectionsLeft = totalSections - sectionsCompleted;
  const questionsLeft = total - answered;

  return (
    <div className={`progress-display ${className}`}>
      {/* Main progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-blue-600"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-sm">
        {/* Sections left */}
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
          <svg
            className="w-4 h-4 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="text-purple-700">
            <strong>{sectionsLeft}</strong> sections left
          </span>
        </div>

        {/* Questions left */}
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
          <svg
            className="w-4 h-4 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-orange-700">
            <strong>{questionsLeft}</strong> questions left
          </span>
        </div>

        {/* This section */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <span className="text-green-700">
            This section:{' '}
            <strong>
              {currentSectionProgress}/{currentSectionTotal}
            </strong>
          </span>
        </div>
      </div>

      {/* Section progress */}
      {showDetails && sectionName && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">{sectionName}</span>
            <span className="text-sm font-medium text-gray-800">
              {currentSectionProgress} / {currentSectionTotal}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300 bg-green-500"
              style={{
                width: `${currentSectionTotal > 0 ? (currentSectionProgress / currentSectionTotal) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Completion estimate */}
      {showDetails && questionsLeft > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Est. {Math.ceil(questionsLeft * 1.5)} minutes remaining
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Compact progress badge for inline display
 */
export const ProgressBadge: React.FC<{ progress: SessionProgress }> = ({ progress }) => {
  const getColorClass = () => {
    if (progress.percentage === 100) {
      return 'bg-green-500';
    }
    if (progress.percentage >= 75) {
      return 'bg-blue-500';
    }
    if (progress.percentage >= 50) {
      return 'bg-yellow-500';
    }
    if (progress.percentage >= 25) {
      return 'bg-orange-500';
    }
    return 'bg-gray-400';
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className="w-24 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getColorClass()}`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600">{progress.percentage}%</span>
    </div>
  );
};

export default ProgressDisplay;
