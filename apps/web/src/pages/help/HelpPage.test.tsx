import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HelpPage } from './HelpPage';

// Mock HelpCenter component
vi.mock('../../components/help/HelpCenter', () => ({
  HelpCenter: () => <div data-testid="help-center">Help Center Content</div>,
}));

const renderHelpPage = () => {
  return render(
    <BrowserRouter>
      <HelpPage />
    </BrowserRouter>,
  );
};

describe('HelpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders help page with HelpCenter component', () => {
    renderHelpPage();

    expect(screen.getByTestId('help-center')).toBeInTheDocument();
  });

  it('renders back to app link', () => {
    renderHelpPage();

    expect(screen.getByText(/back to app/i)).toBeInTheDocument();
  });

  it('renders contact support link', () => {
    renderHelpPage();

    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  it('renders terms link', () => {
    renderHelpPage();

    const termsLinks = screen.getAllByText('Terms');
    expect(termsLinks.length).toBeGreaterThan(0);
  });

  it('renders privacy link', () => {
    renderHelpPage();

    const privacyLinks = screen.getAllByText('Privacy');
    expect(privacyLinks.length).toBeGreaterThan(0);
  });

  it('renders footer with copyright', () => {
    renderHelpPage();

    expect(screen.getByText(/quiz2biz. all rights reserved/i)).toBeInTheDocument();
  });

  it('renders support email in footer', () => {
    renderHelpPage();

    expect(screen.getByText('support@quiz2biz.com')).toBeInTheDocument();
  });

  it('has accessible navigation', () => {
    renderHelpPage();

    expect(screen.getByRole('navigation', { name: /help navigation/i })).toBeInTheDocument();
  });

  it('has accessible contentinfo footer', () => {
    renderHelpPage();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
