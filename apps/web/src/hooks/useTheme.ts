/**
 * useTheme Hook - Dark mode management
 * Provides theme state and toggle functionality with localStorage persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface UseThemeReturn {
  /** Current theme mode setting */
  mode: ThemeMode;
  /** The resolved theme (light or dark) after considering system preference */
  resolvedTheme: ResolvedTheme;
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Set the theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark (ignores system mode) */
  toggleTheme: () => void;
  /** Check if user prefers dark mode at system level */
  systemPrefersDark: boolean;
}

const THEME_STORAGE_KEY = 'quiz2biz-theme-mode';

/**
 * Hook for managing dark/light theme with system preference detection
 */
export function useTheme(): UseThemeReturn {
  // Initialize from localStorage or default to 'system'
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  });

  // Track system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Resolve the actual theme based on mode
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (mode === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemPrefersDark]);

  const isDark = resolvedTheme === 'dark';

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [resolvedTheme]);

  // Set mode with persistence
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newMode: ThemeMode = isDark ? 'light' : 'dark';
    setMode(newMode);
  }, [isDark, setMode]);

  return {
    mode,
    resolvedTheme,
    isDark,
    setMode,
    toggleTheme,
    systemPrefersDark,
  };
}

/**
 * Hook for detecting user's system dark mode preference
 */
export function usePrefersDarkMode(): boolean {
  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDark;
}

export default useTheme;
