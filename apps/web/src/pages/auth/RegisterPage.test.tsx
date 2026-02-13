import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';

// Mock auth store
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
}));

// Mock auth API
vi.mock('../../api', () => ({
  authApi: {
    register: vi.fn(),
  },
}));

const renderRegisterPage = () => {
  return render(
    <BrowserRouter>
      <RegisterPage />
    </BrowserRouter>,
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows password requirements when typing password', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'test');

    // Should show requirements
    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one number/i)).toBeInTheDocument();
  });

  it('has link to login page', () => {
    renderRegisterPage();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders create account button', () => {
    renderRegisterPage();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows OAuth buttons', () => {
    renderRegisterPage();
    expect(screen.getByText(/google/i)).toBeInTheDocument();
    expect(screen.getByText(/microsoft/i)).toBeInTheDocument();
  });

  it('shows password visibility toggle', () => {
    renderRegisterPage();

    const passwordField = screen.getByLabelText(/^password$/i);
    expect(passwordField).toHaveAttribute('type', 'password');

    const toggleButton = passwordField.parentElement?.querySelector('button');
    expect(toggleButton).toBeInTheDocument();
  });

  it('validates password mismatch on form submission', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
});
