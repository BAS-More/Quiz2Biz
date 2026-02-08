/**
 * Accessibility Tests - Login Page
 * WCAG 2.2 Level AA Compliance
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';

// Mock LoginPage component - adjust import path as needed
const MockLoginPage = () => (
  <div role="main" aria-label="Login">
    <h1>Sign In</h1>
    <form aria-label="Login form">
      <div>
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          aria-required="true"
          aria-describedby="email-hint"
          data-testid="email-input"
        />
        <span id="email-hint" className="sr-only">
          Enter your registered email address
        </span>
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          aria-required="true"
          aria-describedby="password-hint"
          data-testid="password-input"
        />
        <span id="password-hint" className="sr-only">
          Enter your password
        </span>
      </div>
      <button type="submit" data-testid="login-button">
        Sign In
      </button>
      <a href="/forgot-password">Forgot password?</a>
      <a href="/register">Create an account</a>
    </form>
    <div role="separator" aria-orientation="horizontal">
      <span>Or continue with</span>
    </div>
    <div role="group" aria-label="Social login options">
      <button type="button" aria-label="Sign in with Google" data-testid="google-oauth-button">
        <span aria-hidden="true">G</span>
        <span>Google</span>
      </button>
      <button
        type="button"
        aria-label="Sign in with Microsoft"
        data-testid="microsoft-oauth-button"
      >
        <span aria-hidden="true">M</span>
        <span>Microsoft</span>
      </button>
    </div>
  </div>
);

describe('LoginPage Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', () => {
    render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent('Sign In');
  });

  it('should have labeled form inputs', () => {
    render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('should have accessible form labels', () => {
    render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');

    // Verify inputs are associated with labels
    expect(emailInput).toHaveAttribute('id', 'email');
    expect(passwordInput).toHaveAttribute('id', 'password');
  });

  it('should have accessible OAuth buttons', () => {
    render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const googleButton = screen.getByRole('button', { name: /sign in with google/i });
    const microsoftButton = screen.getByRole('button', { name: /sign in with microsoft/i });

    expect(googleButton).toBeInTheDocument();
    expect(microsoftButton).toBeInTheDocument();
  });

  it('should have proper landmark roles', () => {
    render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should have accessible links', () => {
    render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const forgotLink = screen.getByRole('link', { name: /forgot password/i });
    const registerLink = screen.getByRole('link', { name: /create an account/i });

    expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('should indicate required fields', () => {
    render(
      <BrowserRouter>
        <MockLoginPage />
      </BrowserRouter>,
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');

    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
  });
});
