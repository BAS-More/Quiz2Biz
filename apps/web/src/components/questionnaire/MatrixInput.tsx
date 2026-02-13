import React from 'react';
import type { QuestionInputProps, MatrixConfig, QuestionOption } from '../../types';

type MatrixValue = Record<string, string>;

/**
 * Matrix input component for grid-style questions
 */
export const MatrixInput: React.FC<QuestionInputProps<MatrixValue>> = ({
  question,
  value = {},
  onChange,
  error,
  disabled = false,
}) => {
  // Extract matrix config from question options
  const matrixConfig = question.options as unknown as MatrixConfig;
  const rows: QuestionOption[] = matrixConfig?.rows || [];
  const columns: QuestionOption[] = matrixConfig?.columns || [];

  const handleChange = (rowValue: string, colValue: string) => {
    onChange({
      ...value,
      [rowValue]: colValue,
    });
  };

  return (
    <div className="question-input matrix-input overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left bg-gray-50 border-b"></th>
            {columns.map((col) => (
              <th
                key={col.value}
                className="p-3 text-center bg-gray-50 border-b text-sm font-medium text-gray-700"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.value} className="border-b hover:bg-gray-50">
              <td className="p-3 text-sm font-medium text-gray-900">
                {row.label}
                {row.description && (
                  <span className="block text-xs text-gray-500 mt-1">{row.description}</span>
                )}
              </td>
              {columns.map((col) => (
                <td key={col.value} className="p-3 text-center">
                  <input
                    type="radio"
                    name={`matrix-${question.id}-${row.value}`}
                    value={col.value}
                    checked={value[row.value] === col.value}
                    onChange={() => handleChange(row.value, col.value)}
                    disabled={disabled}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Completion indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(Object.keys(value).length / rows.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500">
          {Object.keys(value).length} / {rows.length}
        </span>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};
