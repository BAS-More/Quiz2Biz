/**
 * ThemeToggle - Dark mode toggle component
 * Provides UI for switching between light, dark, and system themes
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from '../../hooks/useTheme';

interface ThemeToggleProps {
  /** Whether to show labels */
  showLabels?: boolean;
  /** Layout direction */
  layout?: 'horizontal' | 'vertical';
  /** Custom class name */
  className?: string;
  /** Compact mode - only shows toggle button */
  compact?: boolean;
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Theme toggle component for switching between light/dark/system modes
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabels = true,
  layout = 'horizontal',
  className = '',
  compact = false,
}) => {
  const { mode, setMode, isDark, toggleTheme } = useTheme();

  // Compact mode - just a toggle button
  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-yellow-500" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <div
      className={`${layout === 'vertical' ? 'flex flex-col gap-2' : 'inline-flex gap-1'} ${className}`}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isSelected = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setMode(value)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all
              ${
                isSelected
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ring-1 ring-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {showLabels && <span className="text-sm font-medium">{label}</span>}
          </button>
        );
      })}
    </div>
  );
};

/**
 * ThemeSection - Settings section for theme configuration
 */
export const ThemeSection: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { mode, resolvedTheme, systemPrefersDark } = useTheme();

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Appearance
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme
          </label>
          <ThemeToggle />
        </div>

        {mode === 'system' && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Using {resolvedTheme} mode based on your system preference
            {systemPrefersDark ? ' (dark mode)' : ' (light mode)'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ThemeToggle;
