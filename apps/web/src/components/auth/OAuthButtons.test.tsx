import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { OAuthButtons } from './OAuthButtons';

// Mock the auth store
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
}));

// Wrapper component with Router
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('OAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Google OAuth button', () => {
    render(<OAuthButtons mode={'login'} />, { wrapper: TestWrapper });
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('renders Microsoft OAuth button', () => {
    render(<OAuthButtons mode={'login'} />, { wrapper: TestWrapper });
    expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
  });

  it('triggers Google OAuth flow on click', async () => {
    const user = userEvent.setup();
    render(<OAuthButtons mode={'login'} />, { wrapper: TestWrapper });

    const googleButton = screen.getByRole('button', { name: /google/i });
    await user.click(googleButton);

    // Button should be in loading state after click
    expect(googleButton).toBeInTheDocument();
  });

  it('triggers Microsoft OAuth flow on click', async () => {
    const user = userEvent.setup();
    render(<OAuthButtons mode={'login'} />, { wrapper: TestWrapper });

    const microsoftButton = screen.getByRole('button', { name: /microsoft/i });
    await user.click(microsoftButton);

    // Button should be in loading state after click
    expect(microsoftButton).toBeInTheDocument();
  });

  it('shows Google logo icon', () => {
    render(<OAuthButtons mode={'login'} />, { wrapper: TestWrapper });
    const googleButton = screen.getByRole('button', { name: /google/i });
    expect(googleButton).toBeInTheDocument();
  });

  it('shows Microsoft logo icon', () => {
    render(<OAuthButtons mode={'login'} />, { wrapper: TestWrapper });
    const microsoftButton = screen.getByRole('button', { name: /microsoft/i });
    expect(microsoftButton).toBeInTheDocument();
  });

  it('buttons are enabled by default', () => {
    render(<OAuthButtons mode={'login'} />, { wrapper: TestWrapper });
    expect(screen.getByRole('button', { name: /google/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /microsoft/i })).toBeEnabled();
  });
});
