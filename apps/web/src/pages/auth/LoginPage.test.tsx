import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

// Mock auth store
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
}));

// Mock auth API
vi.mock('../../api', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>,
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has link to register page', () => {
    renderLoginPage();
    expect(screen.getByText(/new to quiz2biz/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument();
  });

  it('has link to forgot password', () => {
    renderLoginPage();
    expect(screen.getByRole('link', { name: /forgot.*password/i })).toBeInTheDocument();
  });

  it('shows password visibility toggle', () => {
    renderLoginPage();

    const passwordField = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordField).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('shows OAuth buttons', () => {
    renderLoginPage();
    expect(screen.getByText(/google/i)).toBeInTheDocument();
    expect(screen.getByText(/microsoft/i)).toBeInTheDocument();
  });
});
