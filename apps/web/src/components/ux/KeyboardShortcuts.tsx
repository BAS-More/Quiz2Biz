/**
 * Keyboard Shortcuts Component
 *
 * Modal showing all keyboard shortcuts.
 * Press '?' to open from anywhere.
 *
 * Nielsen Heuristic #7: Flexibility and Efficiency
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface KeyboardShortcut {
  /** Shortcut key(s) */
  keys: string[];
  /** Description of action */
  description: string;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Whether this shortcut is global (works anywhere) */
  global?: boolean;
  /** Context where this shortcut works */
  context?: string;
  /** The action to perform */
  action?: () => void;
  /** Whether shortcut is enabled */
  enabled?: boolean;
}

export type ShortcutCategory =
  | 'navigation'
  | 'forms'
  | 'questionnaire'
  | 'general'
  | 'editing'
  | 'accessibility';

export interface ShortcutCategoryInfo {
  id: ShortcutCategory;
  name: string;
  icon: string;
}

// ============================================================================
// Shortcut Categories
// ============================================================================

export const SHORTCUT_CATEGORIES: ShortcutCategoryInfo[] = [
  { id: 'navigation', name: 'Navigation', icon: '🧭' },
  { id: 'forms', name: 'Forms', icon: '📝' },
  { id: 'questionnaire', name: 'Questionnaire', icon: '📋' },
  { id: 'editing', name: 'Editing', icon: '✏️' },
  { id: 'general', name: 'General', icon: '⌨️' },
  { id: 'accessibility', name: 'Accessibility', icon: '♿' },
];

// ============================================================================
// Default Shortcuts
// ============================================================================

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { keys: ['g', 'h'], description: 'Go to Home/Dashboard', category: 'navigation', global: true },
  { keys: ['g', 'q'], description: 'Go to Questionnaires', category: 'navigation', global: true },
  { keys: ['g', 's'], description: 'Go to Settings', category: 'navigation', global: true },
  { keys: ['g', 'b'], description: 'Go to Billing', category: 'navigation', global: true },
  { keys: ['g', 'r'], description: 'Go to Reports', category: 'navigation', global: true },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'navigation', global: true },
  { keys: ['Escape'], description: 'Close modal/dialog', category: 'navigation', global: true },
  { keys: ['/'], description: 'Focus search', category: 'navigation', global: true },

  // Forms
  { keys: ['Tab'], description: 'Move to next field', category: 'forms' },
  { keys: ['Shift', 'Tab'], description: 'Move to previous field', category: 'forms' },
  { keys: ['Enter'], description: 'Submit form', category: 'forms', context: 'When in form' },
  { keys: ['Ctrl', 's'], description: 'Save draft', category: 'forms', global: true },
  { keys: ['Ctrl', 'Enter'], description: 'Submit form', category: 'forms' },

  // Questionnaire
  {
    keys: ['→'],
    description: 'Next question',
    category: 'questionnaire',
    context: 'Questionnaire',
  },
  {
    keys: ['←'],
    description: 'Previous question',
    category: 'questionnaire',
    context: 'Questionnaire',
  },
  {
    keys: ['s'],
    description: 'Skip current question',
    category: 'questionnaire',
    context: 'Questionnaire',
  },
  {
    keys: ['1-5'],
    description: 'Select answer (numbered)',
    category: 'questionnaire',
    context: 'Multiple choice',
  },
  {
    keys: ['Ctrl', 'Shift', 'u'],
    description: 'Upload evidence',
    category: 'questionnaire',
    context: 'Questionnaire',
  },
  {
    keys: ['Space'],
    description: 'Toggle checkbox/option',
    category: 'questionnaire',
    context: 'Selection',
  },

  // Editing
  { keys: ['Ctrl', 'z'], description: 'Undo', category: 'editing', global: true },
  { keys: ['Ctrl', 'y'], description: 'Redo', category: 'editing', global: true },
  { keys: ['Ctrl', 'a'], description: 'Select all', category: 'editing' },
  { keys: ['Ctrl', 'c'], description: 'Copy', category: 'editing' },
  { keys: ['Ctrl', 'v'], description: 'Paste', category: 'editing' },
  { keys: ['Ctrl', 'x'], description: 'Cut', category: 'editing' },

  // General
  { keys: ['Ctrl', 'k'], description: 'Open command palette', category: 'general', global: true },
  { keys: ['Ctrl', 'p'], description: 'Print/export', category: 'general', global: true },
  { keys: ['F1'], description: 'Open help', category: 'general', global: true },
  { keys: ['F5'], description: 'Refresh page', category: 'general', global: true },
  { keys: ['Alt', 'F4'], description: 'Close window', category: 'general', global: true },

  // Accessibility
  {
    keys: ['Alt', '1'],
    description: 'Skip to main content',
    category: 'accessibility',
    global: true,
  },
  {
    keys: ['Alt', '2'],
    description: 'Skip to navigation',
    category: 'accessibility',
    global: true,
  },
  { keys: ['Ctrl', '+'], description: 'Zoom in', category: 'accessibility', global: true },
  { keys: ['Ctrl', '-'], description: 'Zoom out', category: 'accessibility', global: true },
  { keys: ['Ctrl', '0'], description: 'Reset zoom', category: 'accessibility', global: true },
  { keys: ['Tab'], description: 'Navigate focus forward', category: 'accessibility', global: true },
];

// ============================================================================
// Context
// ============================================================================

interface KeyboardShortcutsContextValue {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (keys: string[]) => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
  shortcuts?: KeyboardShortcut[];
  enableGlobalShortcuts?: boolean;
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({
  children,
  shortcuts: initialShortcuts = DEFAULT_SHORTCUTS,
  enableGlobalShortcuts = true,
}) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(initialShortcuts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [_keySequence, setKeySequence] = useState<string[]>([]);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      // Check if shortcut already exists
      const exists = prev.some((s) => JSON.stringify(s.keys) === JSON.stringify(shortcut.keys));
      if (exists) {
        return prev;
      }
      return [...prev, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((keys: string[]) => {
    setShortcuts((prev) => prev.filter((s) => JSON.stringify(s.keys) !== JSON.stringify(keys)));
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const toggleModal = useCallback(() => setIsModalOpen((prev) => !prev), []);

  // Global keyboard handler
  useEffect(() => {
    if (!enableGlobalShortcuts) {
      return;
    }

    let sequenceTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow '?' shortcut even in inputs
        if (e.key !== '?') {
          return;
        }
      }

      // Build key string
      const key = e.key.toLowerCase();

      // '?' opens shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        toggleModal();
        return;
      }

      // Escape closes modal
      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        closeModal();
        return;
      }

      // Build modifier+key combo
      const modifiers: string[] = [];
      if (e.ctrlKey || e.metaKey) {
        modifiers.push('Ctrl');
      }
      if (e.altKey) {
        modifiers.push('Alt');
      }
      if (e.shiftKey) {
        modifiers.push('Shift');
      }

      const keyCombo = [...modifiers, key].join('+').toLowerCase();

      // Add to sequence for multi-key shortcuts (like g+h)
      setKeySequence((prev) => {
        const newSequence = [...prev, key];

        // Clear sequence after delay
        clearTimeout(sequenceTimeout);
        sequenceTimeout = setTimeout(() => {
          setKeySequence([]);
        }, 1000);

        // Check for matching shortcut
        const matchingShortcut = shortcuts.find((s) => {
          if (s.enabled === false) {
            return false;
          }

          // Check single key shortcut
          if (s.keys.length === 1) {
            const shortcutKey = s.keys[0].toLowerCase();
            return keyCombo === shortcutKey || key === shortcutKey;
          }

          // Check multi-key sequence
          if (s.keys.length === newSequence.length) {
            return s.keys.every((k, i) => k.toLowerCase() === newSequence[i]?.toLowerCase());
          }

          return false;
        });

        if (matchingShortcut?.action) {
          e.preventDefault();
          matchingShortcut.action();
          return []; // Clear sequence
        }

        return newSequence;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(sequenceTimeout);
    };
  }, [enableGlobalShortcuts, shortcuts, isModalOpen, toggleModal, closeModal]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        isModalOpen,
        openModal,
        closeModal,
        toggleModal,
      }}
    >
      {children}
      {isModalOpen && <KeyboardShortcutsModal onClose={closeModal} />}
    </KeyboardShortcutsContext.Provider>
  );
};

// ============================================================================
// Modal Component
// ============================================================================

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  const { shortcuts } = useKeyboardShortcuts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | null>(null);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    let result = shortcuts;

    if (selectedCategory) {
      result = result.filter((s) => s.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.description.toLowerCase().includes(query) ||
          s.keys.some((k) => k.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [shortcuts, selectedCategory, searchQuery]);

  // Group by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<ShortcutCategory, KeyboardShortcut[]> = {
      navigation: [],
      forms: [],
      questionnaire: [],
      editing: [],
      general: [],
      accessibility: [],
    };

    filteredShortcuts.forEach((s) => {
      groups[s.category].push(s);
    });

    return groups;
  }, [filteredShortcuts]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="shortcuts-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="shortcuts-modal">
        <div className="shortcuts-modal__header">
          <h2 id="shortcuts-title" className="shortcuts-modal__title">
            ⌨️ Keyboard Shortcuts
          </h2>
          <button className="shortcuts-modal__close" onClick={onClose} aria-label="Close shortcuts">
            ✕
          </button>
        </div>

        <div className="shortcuts-modal__search">
          <input
            type="search"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="shortcuts-modal__search-input"
            autoFocus
          />
        </div>

        <div className="shortcuts-modal__categories">
          <button
            className={`shortcuts-modal__category-btn ${
              selectedCategory === null ? 'shortcuts-modal__category-btn--active' : ''
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {SHORTCUT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`shortcuts-modal__category-btn ${
                selectedCategory === cat.id ? 'shortcuts-modal__category-btn--active' : ''
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        <div className="shortcuts-modal__content">
          {SHORTCUT_CATEGORIES.map((category) => {
            const categoryShortcuts = groupedShortcuts[category.id];
            if (categoryShortcuts.length === 0) {
              return null;
            }

            return (
              <div key={category.id} className="shortcuts-section">
                <h3 className="shortcuts-section__title">
                  {category.icon} {category.name}
                </h3>
                <div className="shortcuts-section__list">
                  {categoryShortcuts.map((shortcut, idx) => (
                    <div key={idx} className="shortcut-item">
                      <div className="shortcut-item__keys">
                        {shortcut.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            {keyIdx > 0 && <span className="shortcut-item__plus">+</span>}
                            <kbd className="shortcut-item__key">{formatKey(key)}</kbd>
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="shortcut-item__description">
                        {shortcut.description}
                        {shortcut.context && (
                          <span className="shortcut-item__context">({shortcut.context})</span>
                        )}
                        {shortcut.global && (
                          <span className="shortcut-item__global" title="Works anywhere">
                            🌐
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="shortcuts-modal__empty">
              <p>No shortcuts found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        <div className="shortcuts-modal__footer">
          <p>
            Press <kbd>?</kbd> to toggle this dialog · <kbd>Esc</kbd> to close
          </p>
        </div>
      </div>

      <style>{`
        .shortcuts-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .shortcuts-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 700px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .shortcuts-modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .shortcuts-modal__title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .shortcuts-modal__close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #718096;
          padding: 4px;
        }

        .shortcuts-modal__close:hover {
          color: #1a202c;
        }

        .shortcuts-modal__search {
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .shortcuts-modal__search-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
        }

        .shortcuts-modal__search-input:focus {
          border-color: #3182ce;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        }

        .shortcuts-modal__categories {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .shortcuts-modal__category-btn {
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .shortcuts-modal__category-btn:hover {
          background: #f7fafc;
        }

        .shortcuts-modal__category-btn--active {
          background: #3182ce;
          color: white;
          border-color: #3182ce;
        }

        .shortcuts-modal__content {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
        }

        .shortcuts-section {
          margin-bottom: 24px;
        }

        .shortcuts-section:last-child {
          margin-bottom: 0;
        }

        .shortcuts-section__title {
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .shortcuts-section__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f7fafc;
          border-radius: 6px;
        }

        .shortcut-item__keys {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .shortcut-item__key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 8px;
          background: white;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          font-family: ui-monospace, monospace;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .shortcut-item__plus {
          color: #a0aec0;
          font-size: 12px;
        }

        .shortcut-item__description {
          font-size: 14px;
          color: #4a5568;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .shortcut-item__context {
          font-size: 12px;
          color: #718096;
        }

        .shortcut-item__global {
          font-size: 12px;
        }

        .shortcuts-modal__empty {
          text-align: center;
          padding: 40px 20px;
          color: #718096;
        }

        .shortcuts-modal__footer {
          padding: 12px 24px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 13px;
          color: #718096;
        }

        .shortcuts-modal__footer kbd {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          background: #edf2f7;
          border-radius: 3px;
          font-family: ui-monospace, monospace;
          font-size: 11px;
        }

        @media (max-width: 640px) {
          .shortcuts-modal {
            max-height: 90vh;
          }

          .shortcut-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatKey(key: string): string {
  const keyMappings: Record<string, string> = {
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
    meta: '⌘',
    enter: '↵',
    escape: 'Esc',
    space: '␣',
    tab: '⇥',
    backspace: '⌫',
    delete: '⌦',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    '→': '→',
    '←': '←',
  };

  const lowerKey = key.toLowerCase();
  return keyMappings[lowerKey] || key.toUpperCase();
}

// ============================================================================
// Hook for registering shortcuts
// ============================================================================

export function useShortcut(
  keys: string[],
  callback: () => void,
  options: Partial<Omit<KeyboardShortcut, 'keys' | 'action'>> = {},
) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const shortcut: KeyboardShortcut = {
      keys,
      description: options.description || 'Custom shortcut',
      category: options.category || 'general',
      action: callback,
      ...options,
    };

    registerShortcut(shortcut);

    return () => {
      unregisterShortcut(keys);
    };
  }, [keys, callback, options, registerShortcut, unregisterShortcut]);
}

// ============================================================================
// Trigger Button Component
// ============================================================================

interface ShortcutHelpButtonProps {
  className?: string;
}

export const ShortcutHelpButton: React.FC<ShortcutHelpButtonProps> = ({ className = '' }) => {
  const { openModal } = useKeyboardShortcuts();

  return (
    <button
      className={`shortcut-help-btn ${className}`}
      onClick={openModal}
      aria-label="View keyboard shortcuts"
      title="Keyboard shortcuts (?)"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        background: '#f7fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 14,
      }}
    >
      ⌨️
    </button>
  );
};

export default KeyboardShortcutsProvider;
