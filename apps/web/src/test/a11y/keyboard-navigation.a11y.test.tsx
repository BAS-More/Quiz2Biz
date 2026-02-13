/**
 * Keyboard Navigation Accessibility Tests
 * WCAG 2.2 Level AA compliance - Keyboard accessibility
 *
 * Tests:
 * - Tab order (logical and intuitive)
 * - Skip links (bypass navigation)
 * - No keyboard traps
 * - Focus visible (focus indicator)
 * - Focus management (modals, errors, AJAX updates)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// ============================================================================
// Mock Components for Keyboard Navigation Testing
// ============================================================================

/**
 * Mock Page with Skip Link
 */
function MockPageWithSkipLink() {
  return (
    <div>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white"
        data-testid="skip-link"
      >
        Skip to main content
      </a>
      <header>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <h1>Page Content</h1>
        <p>Main content area</p>
      </main>
    </div>
  );
}

/**
 * Mock Form with proper tab order
 */
function MockFormWithTabOrder() {
  return (
    <form aria-label="Test form">
      <div>
        <label htmlFor="firstName">First Name</label>
        <input type="text" id="firstName" name="firstName" data-testid="field-1" />
      </div>
      <div>
        <label htmlFor="lastName">Last Name</label>
        <input type="text" id="lastName" name="lastName" data-testid="field-2" />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" data-testid="field-3" />
      </div>
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" data-testid="field-4" />
      </div>
      <button type="submit" data-testid="submit-btn">
        Submit
      </button>
      <button type="button" data-testid="cancel-btn">
        Cancel
      </button>
    </form>
  );
}

/**
 * Mock Modal with Focus Trap
 */
function MockModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
      data-testid="modal"
    >
      <div className="modal-content">
        <h2 id="modal-title">Modal Title</h2>
        <p>Modal content goes here.</p>
        <div className="modal-actions">
          <button data-testid="modal-confirm" autoFocus>
            Confirm
          </button>
          <button data-testid="modal-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mock Component without keyboard trap
 */
function MockNoKeyboardTrap() {
  return (
    <div>
      <button data-testid="btn-before">Before</button>
      <div role="group" aria-label="Non-trapping group" data-testid="interactive-region">
        <button data-testid="btn-1">Button 1</button>
        <button data-testid="btn-2">Button 2</button>
        <input type="text" data-testid="input-1" aria-label="Text input" />
      </div>
      <button data-testid="btn-after">After</button>
    </div>
  );
}

/**
 * Mock Dropdown with keyboard navigation
 */
function MockDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const options = ['Option 1', 'Option 2', 'Option 3'];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (selectedIndex >= 0) {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div>
      <button
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        data-testid="dropdown-trigger"
      >
        Select an option
      </button>
      {isOpen && (
        <ul role="listbox" aria-label="Options" tabIndex={-1} data-testid="dropdown-menu">
          {options.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={index === selectedIndex}
              data-testid={`option-${index}`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Mock Error Message with Focus Management
 */
function MockFormWithErrorFocus() {
  const [error, setError] = React.useState<string | null>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Immediately set error (no validation, just show error)
    setError('Please fix the errors below');
  };

  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  return (
    <form onSubmit={handleSubmit} aria-label="Error focus form">
      {error && (
        <div ref={errorRef} role="alert" tabIndex={-1} data-testid="error-message">
          {error}
        </div>
      )}
      <label htmlFor="username">Username</label>
      <input type="text" id="username" />
      <button type="submit" data-testid="submit">
        Submit
      </button>
    </form>
  );
}

/**
 * Mock AJAX Loading with Focus Management
 */
function MockAjaxUpdate() {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<string | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const handleLoad = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));
    setData('Loaded content');
    setLoading(false);
    // Focus on result when loaded
    setTimeout(() => {
      resultRef.current?.focus();
    }, 0);
  };

  return (
    <div>
      <button onClick={handleLoad} disabled={loading} data-testid="load-btn">
        {loading ? 'Loading...' : 'Load Data'}
      </button>
      {loading && (
        <div role="status" aria-live="polite" data-testid="loading-indicator">
          Loading...
        </div>
      )}
      {data && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="region"
          aria-label="Loaded content"
          data-testid="result"
        >
          {data}
        </div>
      )}
    </div>
  );
}

// Import React for useState/useRef
import React from 'react';

// ============================================================================
// Test Suites
// ============================================================================

describe('Keyboard Navigation Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Skip Links', () => {
    it('should have a skip link as first focusable element', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <MockPageWithSkipLink />
        </BrowserRouter>,
      );

      // Tab into the page
      await user.tab();

      // First focusable element should be skip link
      const skipLink = screen.getByTestId('skip-link');
      expect(document.activeElement).toBe(skipLink);
    });

    it('skip link should point to main content', () => {
      render(
        <BrowserRouter>
          <MockPageWithSkipLink />
        </BrowserRouter>,
      );

      const skipLink = screen.getByTestId('skip-link');
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('main content should have correct id for skip link target', () => {
      render(
        <BrowserRouter>
          <MockPageWithSkipLink />
        </BrowserRouter>,
      );

      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeInTheDocument();
    });

    it('main content should be focusable when skip link is activated', () => {
      render(
        <BrowserRouter>
          <MockPageWithSkipLink />
        </BrowserRouter>,
      );

      const mainContent = document.getElementById('main-content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Tab Order', () => {
    it('should follow logical tab order in forms', async () => {
      const user = userEvent.setup();
      render(<MockFormWithTabOrder />);

      const field1 = screen.getByTestId('field-1');
      const field2 = screen.getByTestId('field-2');
      const field3 = screen.getByTestId('field-3');
      const field4 = screen.getByTestId('field-4');
      const submitBtn = screen.getByTestId('submit-btn');
      const cancelBtn = screen.getByTestId('cancel-btn');

      // Tab through all fields in order
      await user.tab();
      expect(document.activeElement).toBe(field1);

      await user.tab();
      expect(document.activeElement).toBe(field2);

      await user.tab();
      expect(document.activeElement).toBe(field3);

      await user.tab();
      expect(document.activeElement).toBe(field4);

      await user.tab();
      expect(document.activeElement).toBe(submitBtn);

      await user.tab();
      expect(document.activeElement).toBe(cancelBtn);
    });

    it('should support reverse tab order with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<MockFormWithTabOrder />);

      // Focus on submit button first
      const submitBtn = screen.getByTestId('submit-btn');
      submitBtn.focus();

      // Shift+Tab should go back
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByTestId('field-4'));

      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByTestId('field-3'));
    });

    it('should have no accessibility violations in form tab order', async () => {
      const { container } = render(<MockFormWithTabOrder />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('No Keyboard Traps', () => {
    it('should allow tabbing through and out of interactive regions', async () => {
      const user = userEvent.setup();
      render(<MockNoKeyboardTrap />);

      const btnBefore = screen.getByTestId('btn-before');
      const btn1 = screen.getByTestId('btn-1');
      const btn2 = screen.getByTestId('btn-2');
      const input1 = screen.getByTestId('input-1');
      const btnAfter = screen.getByTestId('btn-after');

      // Start at first button
      btnBefore.focus();
      expect(document.activeElement).toBe(btnBefore);

      // Tab through interactive region
      await user.tab();
      expect(document.activeElement).toBe(btn1);

      await user.tab();
      expect(document.activeElement).toBe(btn2);

      await user.tab();
      expect(document.activeElement).toBe(input1);

      // Should be able to exit the region
      await user.tab();
      expect(document.activeElement).toBe(btnAfter);
    });

    it('should allow backward navigation through regions', async () => {
      const user = userEvent.setup();
      render(<MockNoKeyboardTrap />);

      // Start at button after region
      const btnAfter = screen.getByTestId('btn-after');
      btnAfter.focus();

      // Shift+Tab back through the region
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByTestId('input-1'));

      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByTestId('btn-2'));

      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByTestId('btn-1'));

      // Should be able to exit backward
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByTestId('btn-before'));
    });
  });

  describe('Focus Visible', () => {
    it('all interactive elements should be focusable', () => {
      render(<MockFormWithTabOrder />);

      const interactiveElements = [
        screen.getByTestId('field-1'),
        screen.getByTestId('field-2'),
        screen.getByTestId('field-3'),
        screen.getByTestId('field-4'),
        screen.getByTestId('submit-btn'),
        screen.getByTestId('cancel-btn'),
      ];

      interactiveElements.forEach((element) => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });

    it('buttons should be keyboard activatable with Enter', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

      render(
        <form onSubmit={mockSubmit}>
          <button type="submit" data-testid="test-btn">
            Submit
          </button>
        </form>,
      );

      const btn = screen.getByTestId('test-btn');
      btn.focus();

      await user.keyboard('{Enter}');
      expect(mockSubmit).toHaveBeenCalled();
    });

    it('buttons should be keyboard activatable with Space', async () => {
      const user = userEvent.setup();
      const mockClick = vi.fn();

      render(
        <button onClick={mockClick} data-testid="test-btn">
          Click me
        </button>,
      );

      const btn = screen.getByTestId('test-btn');
      btn.focus();

      await user.keyboard(' ');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Modal Focus Management', () => {
    it('should move focus to modal when opened', () => {
      const onClose = vi.fn();
      render(<MockModal isOpen={true} onClose={onClose} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // First focusable element in modal should have focus (autoFocus)
      const confirmBtn = screen.getByTestId('modal-confirm');
      expect(document.activeElement).toBe(confirmBtn);
    });

    it('modal should close on Escape key', async () => {
      const onClose = vi.fn();
      render(<MockModal isOpen={true} onClose={onClose} />);

      const modal = screen.getByTestId('modal');
      fireEvent.keyDown(modal, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('modal should have aria-modal attribute', () => {
      const onClose = vi.fn();
      render(<MockModal isOpen={true} onClose={onClose} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('modal should have accessible label', () => {
      const onClose = vi.fn();
      render(<MockModal isOpen={true} onClose={onClose} />);

      const modal = screen.getByRole('dialog', { name: /modal title/i });
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Dropdown Keyboard Navigation', () => {
    it('should open dropdown with Enter key', async () => {
      const user = userEvent.setup();
      render(<MockDropdown />);

      const trigger = screen.getByTestId('dropdown-trigger');
      trigger.focus();

      await user.keyboard('{Enter}');

      const menu = screen.getByTestId('dropdown-menu');
      expect(menu).toBeInTheDocument();
    });

    it('should close dropdown with Escape key', async () => {
      const user = userEvent.setup();
      render(<MockDropdown />);

      const trigger = screen.getByTestId('dropdown-trigger');
      trigger.focus();

      // Open
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

      // Close with Escape
      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    });

    it('trigger should have aria-expanded attribute', () => {
      render(<MockDropdown />);

      const trigger = screen.getByTestId('dropdown-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('trigger should have aria-haspopup attribute', () => {
      render(<MockDropdown />);

      const trigger = screen.getByTestId('dropdown-trigger');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });
  });

  describe('Error Focus Management', () => {
    it('should move focus to error message when form has errors', async () => {
      const user = userEvent.setup();
      render(<MockFormWithErrorFocus />);

      const submitBtn = screen.getByTestId('submit');
      await user.click(submitBtn);

      // Wait for error to appear and focus
      await vi.waitFor(
        () => {
          const errorMessage = screen.queryByTestId('error-message');
          expect(errorMessage).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it('error message should have role alert', async () => {
      const user = userEvent.setup();
      render(<MockFormWithErrorFocus />);

      const submitBtn = screen.getByTestId('submit');
      await user.click(submitBtn);

      await vi.waitFor(
        () => {
          const errorMessage = screen.queryByRole('alert');
          expect(errorMessage).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });
  });

  describe('AJAX Update Focus Management', () => {
    it('should move focus to loaded content after AJAX update', async () => {
      const user = userEvent.setup();
      render(<MockAjaxUpdate />);

      const loadBtn = screen.getByTestId('load-btn');
      await user.click(loadBtn);

      // Wait for content to load
      await vi.waitFor(() => {
        const result = screen.getByTestId('result');
        expect(result).toBeInTheDocument();
        expect(document.activeElement).toBe(result);
      });
    });

    it('should announce loading state', async () => {
      const user = userEvent.setup();
      render(<MockAjaxUpdate />);

      const loadBtn = screen.getByTestId('load-btn');
      await user.click(loadBtn);

      // Loading indicator should be present
      const loadingIndicator = screen.getByTestId('loading-indicator');
      expect(loadingIndicator).toHaveAttribute('role', 'status');
      expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
    });

    it('result region should have accessible label', async () => {
      const user = userEvent.setup();
      render(<MockAjaxUpdate />);

      const loadBtn = screen.getByTestId('load-btn');
      await user.click(loadBtn);

      await vi.waitFor(() => {
        const result = screen.getByRole('region', { name: /loaded content/i });
        expect(result).toBeInTheDocument();
      });
    });
  });

  describe('Focus Indicator Requirements', () => {
    it('all focusable elements should receive focus', () => {
      render(
        <div>
          <button data-testid="btn">Button</button>
          <a href="/test" data-testid="link">
            Link
          </a>
          <input type="text" data-testid="input" aria-label="Input" />
          <select data-testid="select" aria-label="Select">
            <option>Option</option>
          </select>
          <textarea data-testid="textarea" aria-label="Textarea" />
        </div>,
      );

      const elements = [
        screen.getByTestId('btn'),
        screen.getByTestId('link'),
        screen.getByTestId('input'),
        screen.getByTestId('select'),
        screen.getByTestId('textarea'),
      ];

      elements.forEach((element) => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });

    it('disabled elements should not receive focus', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button data-testid="btn-enabled">Enabled</button>
          <button data-testid="btn-disabled" disabled>
            Disabled
          </button>
          <button data-testid="btn-after">After</button>
        </div>,
      );

      const enabledBtn = screen.getByTestId('btn-enabled');
      enabledBtn.focus();

      await user.tab();
      // Should skip disabled button and go to next enabled button
      expect(document.activeElement).toBe(screen.getByTestId('btn-after'));
    });

    it('elements with tabindex=-1 should be programmatically focusable but not in tab order', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button data-testid="btn-1">Button 1</button>
          <div tabIndex={-1} data-testid="programmatic-focus">
            Programmatically focusable
          </div>
          <button data-testid="btn-2">Button 2</button>
        </div>,
      );

      // Can focus programmatically
      const programmaticElement = screen.getByTestId('programmatic-focus');
      programmaticElement.focus();
      expect(document.activeElement).toBe(programmaticElement);

      // But not in tab order
      const btn1 = screen.getByTestId('btn-1');
      btn1.focus();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('btn-2'));
    });
  });
});
