import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTheme, usePrefersDarkMode, type ThemeMode } from './useTheme';

const THEME_STORAGE_KEY = 'quiz2biz-theme-mode';

// Helper to create a controllable matchMedia mock
function createMatchMediaMock(prefersDark = false) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    dispatchEvent: vi.fn(() => false),
  };

  return {
    mql,
    listeners,
    matchMedia: vi.fn((_query: string) => mql),
    fireChange: (dark: boolean) => {
      mql.matches = dark;
      listeners.forEach((cb) => cb({ matches: dark, media: mql.media } as MediaQueryListEvent));
    },
  };
}

describe('useTheme', () => {
  let mmMock: ReturnType<typeof createMatchMediaMock>;

  beforeEach(() => {
    localStorage.clear();
    mmMock = createMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mmMock.matchMedia,
    });
    // Clean up document classes
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default behavior', () => {
    it('defaults to system mode when no stored value', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('system');
    });

    it('resolves to light when system prefers light', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('resolves to dark when system prefers dark', () => {
      mmMock = createMatchMediaMock(true);
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: mmMock.matchMedia,
      });

      const { result } = renderHook(() => useTheme());
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    it('reads stored theme from localStorage', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('ignores invalid stored values', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'invalid-value');
      const { result } = renderHook(() => useTheme());
      expect(result.current.mode).toBe('system');
    });

    it('persists mode change to localStorage', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('dark');
      });

      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
  });

  describe('setMode', () => {
    it('switches to dark mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('dark');
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('switches to light mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('light');
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('switches to system mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('dark');
      });
      act(() => {
        result.current.setMode('system');
      });

      expect(result.current.mode).toBe('system');
      // System prefers light in our mock
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('light');
      });
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('toggles from dark to light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('dark');
      });
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('document class application', () => {
    it('adds dark class for dark mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('removes dark class for light mode', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('dark');
      });
      act(() => {
        result.current.setMode('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });

  describe('system preference changes', () => {
    it('responds to system preference change in system mode', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.resolvedTheme).toBe('light');

      act(() => {
        mmMock.fireChange(true);
      });

      expect(result.current.systemPrefersDark).toBe(true);
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('ignores system change when explicit mode set', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setMode('light');
      });

      act(() => {
        mmMock.fireChange(true);
      });

      // Should still be light because mode is explicit
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const { unmount } = renderHook(() => useTheme());

      unmount();

      expect(mmMock.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});

describe('usePrefersDarkMode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when system prefers light', () => {
    const mock = createMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mock.matchMedia,
    });

    const { result } = renderHook(() => usePrefersDarkMode());
    expect(result.current).toBe(false);
  });

  it('returns true when system prefers dark', () => {
    const mock = createMatchMediaMock(true);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mock.matchMedia,
    });

    const { result } = renderHook(() => usePrefersDarkMode());
    expect(result.current).toBe(true);
  });

  it('updates when system preference changes', () => {
    const mock = createMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mock.matchMedia,
    });

    const { result } = renderHook(() => usePrefersDarkMode());
    expect(result.current).toBe(false);

    act(() => {
      mock.fireChange(true);
    });

    expect(result.current).toBe(true);
  });
});
