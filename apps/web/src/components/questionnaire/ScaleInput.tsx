import React from 'react';
import type { QuestionInputProps, ScaleConfig } from '../../types';

/**
 * Scale/slider input component
 */
export const ScaleInput: React.FC<QuestionInputProps<number>> = ({
  question,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  // Extract scale config from question options
  const scaleConfig: ScaleConfig = (question.options as unknown as ScaleConfig) || {
    min: 1,
    max: 10,
    step: 1,
    minLabel: 'Low',
    maxLabel: 'High',
    showValue: true,
  };

  const { min, max, step, minLabel, maxLabel, showValue } = scaleConfig;
  const currentValue = value ?? min;

  // Calculate percentage for styling
  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className="question-input scale-input">
      <div className="space-y-4">
        {/* Value display */}
        {showValue && (
          <div className="text-center">
            <span className="text-4xl font-bold text-blue-600">{currentValue}</span>
            <span className="text-gray-500 text-sm ml-2">/ {max}</span>
          </div>
        )}

        {/* Slider */}
        <div className="relative pt-1">
          <input
            type="range"
            id={`question-${question.id}`}
            min={min}
            max={max}
            step={step}
            value={currentValue}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                            disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`,
            }}
          />

          {/* Scale markers */}
          <div className="flex justify-between mt-2">
            {Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step)
              .filter((_, i, arr) => i === 0 || i === arr.length - 1 || arr.length <= 11)
              .map((val) => (
                <span
                  key={val}
                  className={`text-xs ${val === currentValue ? 'text-blue-600 font-bold' : 'text-gray-400'}`}
                >
                  {val}
                </span>
              ))}
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};
