/**
 * Color Contrast & Form Accessibility Tests
 * WCAG 2.2 Level AA compliance
 *
 * Tests:
 * - Color contrast ratios (4.5:1 normal text, 3:1 large text/UI)
 * - Form accessibility (labels, errors, required fields, hints)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

// ============================================================================
// Color Contrast Testing Utilities
// ============================================================================

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(
  color1: [number, number, number],
  color2: [number, number, number],
): number {
  const L1 = getLuminance(...color1);
  const L2 = getLuminance(...color2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse hex color to RGB tuple
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

// ============================================================================
// Color Palette from Design System
// ============================================================================

const colors = {
  // Text colors - Updated for WCAG AA compliance
  textPrimary: '#111827', // gray-900
  textSecondary: '#4B5563', // gray-600 - Darker for better contrast
  textMuted: '#6B7280', // gray-500 - Meets 3:1 for large text
  textOnDark: '#FFFFFF', // white

  // Background colors
  bgWhite: '#FFFFFF', // white
  bgGray50: '#F9FAFB', // gray-50
  bgGray100: '#F3F4F6', // gray-100
  bgGray900: '#111827', // gray-900

  // Brand colors
  primary: '#2563EB', // blue-600
  primaryHover: '#1D4ED8', // blue-700

  // Status colors - Updated for WCAG AA compliance on colored backgrounds
  success: '#047857', // green-700 - Darker for 4.5:1 on green-50
  successBg: '#ECFDF5', // green-50
  warning: '#92400E', // yellow-800 - Darker for 4.5:1 on yellow-50
  warningBg: '#FFFBEB', // yellow-50
  error: '#B91C1C', // red-700 - Darker for 4.5:1 on red-50
  errorBg: '#FEF2F2', // red-50

  // UI colors - Updated for WCAG AA compliance
  border: '#6B7280', // gray-500 - Darker for 3:1 against white
  focusRing: '#3B82F6', // blue-500
  disabled: '#6B7280', // gray-500 - Meets 3:1 for large text
};

// ============================================================================
// Mock Components for Form Testing
// ============================================================================

/**
 * Mock Form with all accessibility features
 */
function MockAccessibleForm({ showErrors = false }: { showErrors?: boolean }) {
  return (
    <form aria-labelledby="form-title" noValidate>
      <h2 id="form-title">Contact Form</h2>

      {/* Form-level error summary */}
      {showErrors && (
        <div
          role="alert"
          aria-labelledby="error-summary-title"
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          tabIndex={-1}
          data-testid="error-summary"
        >
          <h3 id="error-summary-title" className="text-red-800 font-semibold">
            Please fix the following errors:
          </h3>
          <ul className="mt-2 list-disc list-inside text-red-700">
            <li>
              <a href="#name">Name is required</a>
            </li>
            <li>
              <a href="#email">Please enter a valid email address</a>
            </li>
          </ul>
        </div>
      )}

      {/* Text input with all features */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full Name{' '}
          <span aria-hidden="true" className="text-red-500">
            *
          </span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          aria-required="true"
          aria-invalid={showErrors}
          aria-describedby={showErrors ? 'name-error name-hint' : 'name-hint'}
          className={`mt-1 block w-full px-3 py-2 border rounded-md ${
            showErrors ? 'border-red-500' : 'border-gray-300'
          }`}
          data-testid="name-input"
        />
        <p id="name-hint" className="mt-1 text-sm text-gray-500">
          Enter your legal full name
        </p>
        {showErrors && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">
            Name is required
          </p>
        )}
      </div>

      {/* Email input with validation */}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address{' '}
          <span aria-hidden="true" className="text-red-500">
            *
          </span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          aria-required="true"
          aria-invalid={showErrors}
          aria-describedby={showErrors ? 'email-error email-hint' : 'email-hint'}
          className={`mt-1 block w-full px-3 py-2 border rounded-md ${
            showErrors ? 'border-red-500' : 'border-gray-300'
          }`}
          autoComplete="email"
          data-testid="email-input"
        />
        <p id="email-hint" className="mt-1 text-sm text-gray-500">
          We'll never share your email with anyone
        </p>
        {showErrors && (
          <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
            Please enter a valid email address
          </p>
        )}
      </div>

      {/* Optional field */}
      <div className="mb-4">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          aria-describedby="phone-hint"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          autoComplete="tel"
          data-testid="phone-input"
        />
        <p id="phone-hint" className="mt-1 text-sm text-gray-500">
          Format: (xxx) xxx-xxxx
        </p>
      </div>

      {/* Textarea */}
      <div className="mb-4">
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Message{' '}
          <span aria-hidden="true" className="text-red-500">
            *
          </span>
          <span className="sr-only">(required)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          aria-required="true"
          aria-describedby="message-counter"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          data-testid="message-input"
        />
        <p id="message-counter" className="mt-1 text-sm text-gray-500" aria-live="polite">
          0/500 characters
        </p>
      </div>

      {/* Select dropdown */}
      <div className="mb-4">
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
          Subject{' '}
          <span aria-hidden="true" className="text-red-500">
            *
          </span>
          <span className="sr-only">(required)</span>
        </label>
        <select
          id="subject"
          name="subject"
          required
          aria-required="true"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          data-testid="subject-select"
        >
          <option value="">Select a subject...</option>
          <option value="general">General Inquiry</option>
          <option value="support">Technical Support</option>
          <option value="billing">Billing Question</option>
        </select>
      </div>

      {/* Checkbox group */}
      <fieldset className="mb-4">
        <legend className="text-sm font-medium text-gray-700">
          Preferred Contact Method{' '}
          <span aria-hidden="true" className="text-red-500">
            *
          </span>
          <span className="sr-only">(required, select at least one)</span>
        </legend>
        <div className="mt-2 space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contact-email"
              name="contactMethod"
              value="email"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              data-testid="contact-email-checkbox"
            />
            <label htmlFor="contact-email" className="ml-2 text-sm text-gray-700">
              Email
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contact-phone"
              name="contactMethod"
              value="phone"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              data-testid="contact-phone-checkbox"
            />
            <label htmlFor="contact-phone" className="ml-2 text-sm text-gray-700">
              Phone
            </label>
          </div>
        </div>
      </fieldset>

      {/* Radio group */}
      <fieldset className="mb-4">
        <legend className="text-sm font-medium text-gray-700">Urgency Level</legend>
        <div className="mt-2 space-y-2">
          <div className="flex items-center">
            <input
              type="radio"
              id="urgency-low"
              name="urgency"
              value="low"
              className="h-4 w-4 text-blue-600 border-gray-300"
              data-testid="urgency-low-radio"
            />
            <label htmlFor="urgency-low" className="ml-2 text-sm text-gray-700">
              Low - Response within 5 business days
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="urgency-normal"
              name="urgency"
              value="normal"
              defaultChecked
              className="h-4 w-4 text-blue-600 border-gray-300"
              data-testid="urgency-normal-radio"
            />
            <label htmlFor="urgency-normal" className="ml-2 text-sm text-gray-700">
              Normal - Response within 2 business days
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="urgency-high"
              name="urgency"
              value="high"
              className="h-4 w-4 text-blue-600 border-gray-300"
              data-testid="urgency-high-radio"
            />
            <label htmlFor="urgency-high" className="ml-2 text-sm text-gray-700">
              High - Response within 24 hours
            </label>
          </div>
        </div>
      </fieldset>

      {/* Terms checkbox */}
      <div className="mb-6">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="terms"
            name="terms"
            required
            aria-required="true"
            className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded"
            data-testid="terms-checkbox"
          />
          <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
            I agree to the{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-500 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
              Privacy Policy
            </a>
            <span aria-hidden="true" className="text-red-500">
              {' '}
              *
            </span>
            <span className="sr-only">(required)</span>
          </label>
        </div>
      </div>

      {/* Submit buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          data-testid="submit-button"
        >
          Send Message
        </button>
        <button
          type="reset"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          data-testid="reset-button"
        >
          Clear Form
        </button>
      </div>
    </form>
  );
}

/**
 * Mock Form with inline validation
 */
function MockFormWithInlineValidation() {
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [emailValid, setEmailValid] = React.useState(false);

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Email is required');
      setEmailValid(false);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email address');
      setEmailValid(false);
    } else {
      setEmailError(null);
      setEmailValid(true);
    }
  };

  return (
    <form aria-label="Inline validation form">
      <div className="mb-4">
        <label htmlFor="inline-email" className="block text-sm font-medium">
          Email Address
        </label>
        <input
          type="email"
          id="inline-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={(e) => validateEmail(e.target.value)}
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={
            emailError ? 'inline-email-error' : emailValid ? 'inline-email-success' : undefined
          }
          className={`mt-1 block w-full px-3 py-2 border rounded-md ${
            emailError ? 'border-red-500' : emailValid ? 'border-green-500' : 'border-gray-300'
          }`}
          data-testid="inline-email"
        />
        {emailError && (
          <p
            id="inline-email-error"
            role="alert"
            className="mt-1 text-sm text-red-600 flex items-center"
          >
            <span aria-hidden="true" className="mr-1">
              ⚠️
            </span>
            {emailError}
          </p>
        )}
        {emailValid && (
          <p id="inline-email-success" className="mt-1 text-sm text-green-600 flex items-center">
            <span aria-hidden="true" className="mr-1">
              ✓
            </span>
            Email looks good!
          </p>
        )}
      </div>
    </form>
  );
}

/**
 * Mock disabled form elements
 */
function MockDisabledForm() {
  return (
    <form aria-label="Form with disabled elements">
      <div className="mb-4">
        <label htmlFor="disabled-input" className="block text-sm font-medium text-gray-700">
          Read-only field
        </label>
        <input
          type="text"
          id="disabled-input"
          value="Cannot edit this"
          disabled
          aria-disabled="true"
          className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-md"
          data-testid="disabled-input"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="readonly-input" className="block text-sm font-medium text-gray-700">
          Reference number
        </label>
        <input
          type="text"
          id="readonly-input"
          value="REF-12345"
          readOnly
          aria-readonly="true"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md"
          data-testid="readonly-input"
        />
      </div>

      <button
        type="submit"
        disabled
        aria-disabled="true"
        className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
        data-testid="disabled-button"
      >
        Cannot Submit
      </button>
    </form>
  );
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Color Contrast Accessibility', () => {
  describe('WCAG AA Compliance - Normal Text (4.5:1)', () => {
    it('primary text on white background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.textPrimary), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('secondary text on white background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.textSecondary), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('error text on white background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.error), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('success text on white background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.success), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('warning text on white background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.warning), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('white text on dark background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.textOnDark), hexToRgb(colors.bgGray900));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('link text on white background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.primary), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('WCAG AA Compliance - Large Text (3:1)', () => {
    it('muted text (large) on white background should meet 3:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.textMuted), hexToRgb(colors.bgWhite));
      // Muted text should only be used for large text (>=18pt or >=14pt bold)
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('disabled text on white background should meet 3:1 for large text', () => {
      const ratio = getContrastRatio(hexToRgb(colors.disabled), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  });

  describe('WCAG AA Compliance - UI Components (3:1)', () => {
    it('border color should meet 3:1 against background', () => {
      const ratio = getContrastRatio(hexToRgb(colors.border), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('focus ring should meet 3:1 against background', () => {
      const ratio = getContrastRatio(hexToRgb(colors.focusRing), hexToRgb(colors.bgWhite));
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('primary button text on button background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.textOnDark), hexToRgb(colors.primary));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Status Colors on Status Backgrounds', () => {
    it('error text on error background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.error), hexToRgb(colors.errorBg));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('success text on success background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.success), hexToRgb(colors.successBg));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('warning text on warning background should meet 4.5:1', () => {
      const ratio = getContrastRatio(hexToRgb(colors.warning), hexToRgb(colors.warningBg));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('Form Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Labels', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockAccessibleForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('all form inputs should have associated labels', () => {
      render(<MockAccessibleForm />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    });

    it('labels should use htmlFor to associate with inputs', () => {
      render(<MockAccessibleForm />);

      const nameLabels = screen.getAllByText(/full name/i);
      const nameLabel = nameLabels[0].closest('label');
      expect(nameLabel).toHaveAttribute('for', 'name');
    });
  });

  describe('Required Fields', () => {
    it('required inputs should have aria-required attribute', () => {
      render(<MockAccessibleForm />);

      const nameInput = screen.getByTestId('name-input');
      const emailInput = screen.getByTestId('email-input');
      const messageInput = screen.getByTestId('message-input');

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(messageInput).toHaveAttribute('aria-required', 'true');
    });

    it('required indicator should be visible and accessible', () => {
      render(<MockAccessibleForm />);

      // Visual asterisk should be hidden from screen readers
      const asterisks = document.querySelectorAll('[aria-hidden="true"]');
      expect(asterisks.length).toBeGreaterThan(0);

      // Screen reader text should be available
      const srOnlyRequired = screen.getAllByText(/\(required\)/i);
      expect(srOnlyRequired.length).toBeGreaterThan(0);
    });

    it('optional fields should be clearly marked', () => {
      render(<MockAccessibleForm />);

      const phoneLabel = screen.getByText(/phone number/i).closest('label');
      expect(phoneLabel).toHaveTextContent(/optional/i);
    });
  });

  describe('Error Messages', () => {
    it('should have no accessibility violations with errors', async () => {
      const { container } = render(<MockAccessibleForm showErrors={true} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('invalid inputs should have aria-invalid', () => {
      render(<MockAccessibleForm showErrors={true} />);

      const nameInput = screen.getByTestId('name-input');
      const emailInput = screen.getByTestId('email-input');

      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('errors should be linked via aria-describedby', () => {
      render(<MockAccessibleForm showErrors={true} />);

      const nameInput = screen.getByTestId('name-input');
      expect(nameInput).toHaveAttribute('aria-describedby', expect.stringContaining('name-error'));
    });

    it('error messages should have role alert', () => {
      render(<MockAccessibleForm showErrors={true} />);

      const errors = screen.getAllByRole('alert');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('error summary should be present and focusable', () => {
      render(<MockAccessibleForm showErrors={true} />);

      const errorSummary = screen.getByTestId('error-summary');
      expect(errorSummary).toHaveAttribute('tabIndex', '-1');
    });

    it('error summary should link to specific fields', () => {
      render(<MockAccessibleForm showErrors={true} />);

      const errorLinks = screen.getByTestId('error-summary').querySelectorAll('a');
      expect(errorLinks.length).toBeGreaterThan(0);
      expect(errorLinks[0]).toHaveAttribute('href', '#name');
    });
  });

  describe('Hints and Descriptions', () => {
    it('hint text should be linked via aria-describedby', () => {
      render(<MockAccessibleForm />);

      const nameInput = screen.getByTestId('name-input');
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-hint');
    });

    it('hints should provide useful context', () => {
      render(<MockAccessibleForm />);

      expect(screen.getByText(/enter your legal full name/i)).toBeInTheDocument();
      expect(screen.getByText(/we'll never share your email/i)).toBeInTheDocument();
    });

    it('character counter should use aria-live', () => {
      render(<MockAccessibleForm />);

      const counter = document.getElementById('message-counter');
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Fieldsets and Legends', () => {
    it('checkbox groups should be wrapped in fieldset with legend', () => {
      render(<MockAccessibleForm />);

      const fieldsets = document.querySelectorAll('fieldset');
      expect(fieldsets.length).toBeGreaterThan(0);

      fieldsets.forEach((fieldset) => {
        const legend = fieldset.querySelector('legend');
        expect(legend).toBeInTheDocument();
      });
    });

    it('radio groups should be wrapped in fieldset with legend', () => {
      render(<MockAccessibleForm />);

      const urgencyFieldset = screen.getByText(/urgency level/i).closest('fieldset');
      expect(urgencyFieldset).toBeInTheDocument();
    });
  });

  describe('Inline Validation', () => {
    it('should update aria-invalid on blur', async () => {
      const user = userEvent.setup();
      render(<MockFormWithInlineValidation />);

      const emailInput = screen.getByTestId('inline-email');

      await user.type(emailInput, 'invalid');
      await user.tab();

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should show error message on validation failure', async () => {
      const user = userEvent.setup();
      render(<MockFormWithInlineValidation />);

      const emailInput = screen.getByTestId('inline-email');

      await user.type(emailInput, 'invalid');
      await user.tab();

      const error = screen.getByRole('alert');
      expect(error).toBeInTheDocument();
    });

    it('should show success message on valid input', async () => {
      const user = userEvent.setup();
      render(<MockFormWithInlineValidation />);

      const emailInput = screen.getByTestId('inline-email');

      await user.type(emailInput, 'valid@example.com');
      await user.tab();

      expect(screen.getByText(/email looks good/i)).toBeInTheDocument();
    });
  });

  describe('Disabled Form Elements', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockDisabledForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('disabled inputs should have aria-disabled', () => {
      render(<MockDisabledForm />);

      const disabledInput = screen.getByTestId('disabled-input');
      expect(disabledInput).toHaveAttribute('aria-disabled', 'true');
    });

    it('readonly inputs should have aria-readonly', () => {
      render(<MockDisabledForm />);

      const readonlyInput = screen.getByTestId('readonly-input');
      expect(readonlyInput).toHaveAttribute('aria-readonly', 'true');
    });

    it('disabled buttons should have aria-disabled', () => {
      render(<MockDisabledForm />);

      const disabledButton = screen.getByTestId('disabled-button');
      expect(disabledButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Autocomplete Attributes', () => {
    it('email input should have autocomplete="email"', () => {
      render(<MockAccessibleForm />);

      const emailInput = screen.getByTestId('email-input');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('phone input should have autocomplete="tel"', () => {
      render(<MockAccessibleForm />);

      const phoneInput = screen.getByTestId('phone-input');
      expect(phoneInput).toHaveAttribute('autocomplete', 'tel');
    });
  });

  describe('Form Submission', () => {
    it('submit button should have type="submit"', () => {
      render(<MockAccessibleForm />);

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('reset button should have type="reset"', () => {
      render(<MockAccessibleForm />);

      const resetButton = screen.getByTestId('reset-button');
      expect(resetButton).toHaveAttribute('type', 'reset');
    });
  });
});
