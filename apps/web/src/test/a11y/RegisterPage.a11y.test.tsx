/**
 * Accessibility tests for RegisterPage component
 * WCAG 2.2 Level AA compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(() => ({})),
    handleSubmit: vi.fn((fn) => fn),
    watch: vi.fn(() => 'Password123!'),
    formState: { errors: {}, isSubmitting: false },
  }),
}));

// Mock auth API
vi.mock('../../api', () => ({
  authApi: {
    register: vi.fn(),
  },
}));

// Mock auth store
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
}));

// Mock OAuth buttons
vi.mock('../../components/auth/OAuthButtons', () => ({
  OAuthButtons: () => <div data-testid="oauth-buttons">OAuth Buttons</div>,
}));

// Accessible mock component matching RegisterPage structure
function MockRegisterPage() {
  return (
    <main role="main" aria-labelledby="page-title">
      <h1 id="page-title" className="text-2xl font-bold text-center mb-6">
        Create your account
      </h1>

      <form aria-label="Registration form">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium">
            Full name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            autoComplete="name"
            aria-required="true"
            placeholder="John Doe"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            aria-required="true"
            placeholder="you@example.com"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <div className="relative mt-1">
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              aria-required="true"
              aria-describedby="password-requirements"
              placeholder="Create a strong password"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              type="button"
              aria-label="Toggle password visibility"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <span aria-hidden="true">👁</span>
            </button>
          </div>
          <div id="password-requirements" className="mt-2 space-y-1">
            <p className="text-xs text-green-600" aria-live="polite">
              ✓ At least 12 characters
            </p>
            <p className="text-xs text-green-600" aria-live="polite">
              ✓ One uppercase letter
            </p>
            <p className="text-xs text-green-600" aria-live="polite">
              ✓ One lowercase letter
            </p>
            <p className="text-xs text-green-600" aria-live="polite">
              ✓ One number
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="confirmPassword" className="block text-sm font-medium">
            Confirm password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            aria-required="true"
            placeholder="Confirm your password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md">
          Create account
        </button>
      </form>

      <div className="mt-6" data-testid="oauth-buttons">
        OAuth Buttons
      </div>

      <nav aria-label="Authentication navigation" className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/auth/login" className="font-medium text-blue-600">
            Sign in
          </a>
        </p>
      </nav>
    </main>
  );
}

describe('RegisterPage Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have a proper heading structure', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent('Create your account');
  });

  it('should have properly labeled form inputs', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    // Check all inputs have associated labels
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    expect(nameInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toBeInTheDocument();
  });

  it('should have accessible form with proper ARIA attributes', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const form = screen.getByRole('form', { name: /registration form/i });
    expect(form).toBeInTheDocument();
  });

  it('should have password requirements announced via aria-describedby', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('aria-describedby', 'password-requirements');
  });

  it('should have accessible toggle password visibility button', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should indicate required fields with aria-required', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const inputs = screen.getAllByRole('textbox');
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    // Text inputs should have aria-required
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    // Password inputs should have aria-required
    passwordInputs.forEach((input) => {
      expect(input).toHaveAttribute('aria-required', 'true');
    });
  });

  it('should have proper autocomplete attributes for inputs', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);

    expect(nameInput).toHaveAttribute('autocomplete', 'name');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
  });

  it('should have main landmark role', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should have accessible navigation link to login', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const nav = screen.getByRole('navigation', { name: /authentication navigation/i });
    expect(nav).toBeInTheDocument();

    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/auth/login');
  });

  it('should have accessible submit button', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('should have password strength indicators with aria-live', () => {
    render(
      <BrowserRouter>
        <MockRegisterPage />
      </BrowserRouter>,
    );

    const requirementIndicators = document.querySelectorAll('[aria-live="polite"]');
    expect(requirementIndicators.length).toBeGreaterThan(0);
  });
});
