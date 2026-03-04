import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PrivacyPage } from './PrivacyPage';

// Mock Lucide React icons with aria-hidden passthrough
vi.mock('lucide-react', () => ({
  ArrowLeft: (props: Record<string, unknown>) => (
    <div data-testid="arrow-left-icon" aria-hidden={props['aria-hidden'] as string} />
  ),
  Shield: (props: Record<string, unknown>) => (
    <div data-testid="shield-icon" aria-hidden={props['aria-hidden'] as string} />
  ),
}));

describe('PrivacyPage', () => {
  const renderPrivacyPage = () => {
    return render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivacyPage />} />
          <Route path="/terms" element={<div>Terms Page</div>} />
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route path="/auth/register" element={<div>Register Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  describe('Page Structure and Content', () => {
    it('renders privacy policy page with correct structure', () => {
      renderPrivacyPage();

      // Should show skip link for accessibility
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveClass('sr-only');

      // Should show header with back link
      expect(screen.getByText('Back to Home')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();

      // Should show main content area
      const mainContent = screen.getByText('Privacy Policy').closest('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');

      // Should show page title with icon
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();

      // Should show last updated date
      expect(screen.getByText('Last updated: January 28, 2026')).toBeInTheDocument();
    });

    it('renders all privacy policy sections', () => {
      renderPrivacyPage();

      // Section 1: Introduction
      expect(screen.getByText('1. Introduction')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Quiz2Biz \("we", "our", or "us"\) is committed to protecting your privacy/,
        ),
      ).toBeInTheDocument();

      // Section 2: Information We Collect
      expect(screen.getByText('2. Information We Collect')).toBeInTheDocument();
      expect(screen.getByText('2.1 Personal Information')).toBeInTheDocument();
      expect(screen.getByText('2.2 Usage Information')).toBeInTheDocument();
      expect(screen.getByText('2.3 Assessment Data')).toBeInTheDocument();

      // Section 3: How We Use Your Information
      expect(screen.getByText('3. How We Use Your Information')).toBeInTheDocument();
      expect(screen.getByText('Provide, maintain, and improve our services')).toBeInTheDocument();

      // Section 4: Information Sharing
      expect(screen.getByText('4. Information Sharing')).toBeInTheDocument();
      expect(screen.getByText(/We do not sell your personal information/)).toBeInTheDocument();

      // Section 5: Data Security
      expect(screen.getByText('5. Data Security')).toBeInTheDocument();
      expect(
        screen.getByText('Encryption of data in transit (TLS 1.3) and at rest (AES-256)'),
      ).toBeInTheDocument();

      // Section 6: Data Retention
      expect(screen.getByText('6. Data Retention')).toBeInTheDocument();

      // Section 7: Your Rights
      expect(screen.getByText('7. Your Rights')).toBeInTheDocument();
      expect(screen.getByText('Access:')).toBeInTheDocument();
      expect(screen.getByText('Correction:')).toBeInTheDocument();
      expect(screen.getByText('Deletion:')).toBeInTheDocument();

      // Section 8: Cookies and Tracking
      expect(screen.getByText('8. Cookies and Tracking')).toBeInTheDocument();

      // Section 9: International Transfers
      expect(screen.getByText('9. International Transfers')).toBeInTheDocument();

      // Section 10: Children's Privacy
      expect(screen.getByText("10. Children's Privacy")).toBeInTheDocument();

      // Section 11: Changes to This Policy
      expect(screen.getByText('11. Changes to This Policy')).toBeInTheDocument();

      // Section 12: Contact Us
      expect(screen.getByText('12. Contact Us')).toBeInTheDocument();
      expect(screen.getByText('privacy@quiz2biz.com')).toBeInTheDocument();
    });

    it('renders all list items correctly', () => {
      renderPrivacyPage();

      // Personal Information list
      expect(screen.getByText('Name and email address')).toBeInTheDocument();
      expect(screen.getByText('Account credentials')).toBeInTheDocument();
      expect(screen.getByText('Company or organization information')).toBeInTheDocument();

      // Usage Information list
      expect(
        screen.getByText('Device information (browser type, operating system)'),
      ).toBeInTheDocument();
      expect(screen.getByText('IP address and general location')).toBeInTheDocument();
      expect(screen.getByText('Pages visited and features used')).toBeInTheDocument();

      // How We Use Your Information list
      expect(screen.getByText('Provide, maintain, and improve our services')).toBeInTheDocument();
      expect(
        screen.getByText('Process your assessments and generate readiness scores'),
      ).toBeInTheDocument();
      expect(screen.getByText('Create and manage your account')).toBeInTheDocument();
      expect(screen.getByText('Process payments and send billing information')).toBeInTheDocument();

      // Information Sharing list
      expect(screen.getByText('Service Providers:')).toBeInTheDocument();
      expect(screen.getByText('Legal Requirements:')).toBeInTheDocument();
      expect(screen.getByText('Business Transfers:')).toBeInTheDocument();
      expect(screen.getByText('With Your Consent:')).toBeInTheDocument();

      // Data Security list
      expect(
        screen.getByText('Encryption of data in transit (TLS 1.3) and at rest (AES-256)'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Regular security assessments and penetration testing'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Access controls and authentication requirements'),
      ).toBeInTheDocument();

      // Your Rights list — text split across <strong> and text node
      const accessItem = screen.getByText('Access:').closest('li');
      expect(accessItem?.textContent).toContain('Request a copy of your personal data');
      const correctionItem = screen.getByText('Correction:').closest('li');
      expect(correctionItem?.textContent).toContain('Request correction of inaccurate data');
      const deletionItem = screen.getByText('Deletion:').closest('li');
      expect(deletionItem?.textContent).toContain('Request deletion of your data');
    });
  });

  describe('Contact Information', () => {
    it('displays complete contact information', () => {
      renderPrivacyPage();

      // Should show contact section
      expect(screen.getByText('Quiz2Biz Privacy Team')).toBeInTheDocument();
      expect(screen.getByText('privacy@quiz2biz.com')).toBeInTheDocument();
      // Address text nodes are within the <address> element, not standalone elements
      const address = screen.getByText('Quiz2Biz Privacy Team').closest('address');
      expect(address).toBeInTheDocument();
      expect(address?.textContent).toContain('123 Business Park, Suite 100');
      expect(address?.textContent).toContain('Technology City, TC 12345');
      expect(address?.textContent).toContain('United States');

      // Email should be a link
      const emailLink = screen.getByText('privacy@quiz2biz.com').closest('a');
      expect(emailLink).toHaveAttribute('href', 'mailto:privacy@quiz2biz.com');
    });
  });

  describe('Navigation Links', () => {
    it('renders navigation links in footer', () => {
      renderPrivacyPage();

      // Should show Terms of Service link
      const termsLink = screen.getByText('Terms of Service');
      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute('href', '/terms');

      // Should show Sign In link
      const signInLink = screen.getByText('Sign In');
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute('href', '/auth/login');

      // Should show Create Account link
      const registerLink = screen.getByText('Create Account');
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/auth/register');

      // Should show separator pipes
      const separators = screen.getAllByText('|', { selector: 'span' });
      expect(separators).toHaveLength(2);
    });
  });

  describe('Footer', () => {
    it('renders footer with copyright information', () => {
      renderPrivacyPage();

      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(`© ${currentYear} Quiz2Biz. All rights reserved.`),
      ).toBeInTheDocument();

      // Footer should have proper role
      const footer = screen
        .getByText(`© ${currentYear} Quiz2Biz. All rights reserved.`)
        .closest('footer');
      expect(footer).toHaveAttribute('role', 'contentinfo');
    });
  });

  describe('Accessibility Features', () => {
    it('includes accessibility attributes', () => {
      renderPrivacyPage();

      // Skip link should have proper accessibility attributes
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toHaveAttribute('href', '#main-content');

      // Icons should have aria-hidden
      expect(screen.getByTestId('arrow-left-icon')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByTestId('shield-icon')).toHaveAttribute('aria-hidden', 'true');

      // Main content should have proper ID and tabindex
      const mainContent = screen.getByText('Privacy Policy').closest('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });

    it('renders semantic HTML structure', () => {
      renderPrivacyPage();

      // Should use proper heading hierarchy
      const h1 = screen.getByText('Privacy Policy');
      expect(h1.tagName).toBe('H1');

      // Section headings should be H2
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThanOrEqual(12); // 12 sections

      // Subsection headings should be H3
      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      expect(h3Elements.length).toBeGreaterThanOrEqual(3); // At least 3 subsections

      // Address should be semantic
      const address = screen.getByText('Quiz2Biz Privacy Team').closest('address');
      expect(address).toBeInTheDocument();
    });
  });

  describe('Content Formatting', () => {
    it('renders content with proper formatting', () => {
      renderPrivacyPage();

      // Should render strong text
      expect(screen.getByText('Service Providers:')).toBeInTheDocument();
      expect(screen.getByText('Legal Requirements:')).toBeInTheDocument();

      // Should render lists properly
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(20); // Should have many list items

      // Should render paragraphs
      const paragraphs = screen.getAllByRole('paragraph');
      expect(paragraphs.length).toBeGreaterThan(15); // Should have many paragraphs
    });
  });

  describe('WCAG Compliance', () => {
    it('meets basic WCAG requirements', () => {
      renderPrivacyPage();

      // Should have skip link for keyboard navigation
      expect(screen.getByText('Skip to main content')).toBeInTheDocument();

      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);

      // Should have sufficient color contrast (visual check)
      // This would be tested with axe or similar tools in practice

      // Should have focusable elements
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(5);

      // Should have proper landmark roles
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('uses current year in copyright', () => {
      renderPrivacyPage();

      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(`© ${currentYear} Quiz2Biz. All rights reserved.`),
      ).toBeInTheDocument();
    });
  });
});
