import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TermsPage } from './TermsPage';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
}));

describe('TermsPage', () => {
  const renderTermsPage = () => {
    return render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<TermsPage />} />
          <Route path="/privacy" element={<div>Privacy Page</div>} />
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route path="/auth/register" element={<div>Register Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Page Structure and Content', () => {
    it('renders terms of service page with correct structure', () => {
      renderTermsPage();

      // Should show skip link for accessibility
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveClass('sr-only');

      // Should show header with back link
      expect(screen.getByText('Back to Home')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();

      // Should show main content area
      const mainContent = screen.getByText('Terms of Service').closest('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');

      // Should show page title with icon
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();

      // Should show last updated date
      expect(screen.getByText('Last updated: January 28, 2026')).toBeInTheDocument();
    });

    it('renders all terms of service sections', () => {
      renderTermsPage();

      // Section 1: Acceptance of Terms
      expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
      expect(screen.getByText(/By accessing or using Quiz2Biz \(\"the Service\"\), you agree to be bound by these Terms/)).toBeInTheDocument();

      // Section 2: Description of Service
      expect(screen.getByText('2. Description of Service')).toBeInTheDocument();
      expect(screen.getByText('Complete structured questionnaires across multiple business dimensions')).toBeInTheDocument();

      // Section 3: Account Registration
      expect(screen.getByText('3. Account Registration')).toBeInTheDocument();
      expect(screen.getByText('Provide accurate, current, and complete information during registration')).toBeInTheDocument();

      // Section 4: Subscription and Payment
      expect(screen.getByText('4. Subscription and Payment')).toBeInTheDocument();
      expect(screen.getByText('4.1 Subscription Plans')).toBeInTheDocument();
      expect(screen.getByText('4.2 Billing')).toBeInTheDocument();
      expect(screen.getByText('4.3 Cancellation')).toBeInTheDocument();
      expect(screen.getByText('4.4 Free Trial')).toBeInTheDocument();

      // Section 5: Acceptable Use
      expect(screen.getByText('5. Acceptable Use')).toBeInTheDocument();
      expect(screen.getByText('You agree not to:')).toBeInTheDocument();

      // Section 6: Intellectual Property
      expect(screen.getByText('6. Intellectual Property')).toBeInTheDocument();
      expect(screen.getByText('6.1 Our Content')).toBeInTheDocument();
      expect(screen.getByText('6.2 Your Content')).toBeInTheDocument();
      expect(screen.getByText('6.3 Feedback')).toBeInTheDocument();

      // Section 7: Data and Privacy
      expect(screen.getByText('7. Data and Privacy')).toBeInTheDocument();
      expect(screen.getAllByText('Privacy Policy').length).toBeGreaterThanOrEqual(2);

      // Section 8: Service Availability
      expect(screen.getByText('8. Service Availability')).toBeInTheDocument();

      // Section 9: Disclaimer of Warranties
      expect(screen.getByText('9. Disclaimer of Warranties')).toBeInTheDocument();
      expect(screen.getByText(/THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE"/)).toBeInTheDocument();

      // Section 10: Limitation of Liability
      expect(screen.getByText('10. Limitation of Liability')).toBeInTheDocument();
      expect(
        screen.getByText(/TO THE MAXIMUM EXTENT PERMITTED BY LAW[,\s]+QUIZ2BIZ SHALL NOT BE LIABLE/),
      ).toBeInTheDocument();

      // Section 11: Indemnification
      expect(screen.getByText('11. Indemnification')).toBeInTheDocument();

      // Section 12: Termination
      expect(screen.getByText('12. Termination')).toBeInTheDocument();

      // Section 13: Governing Law
      expect(screen.getByText('13. Governing Law')).toBeInTheDocument();

      // Section 14: Changes to Terms
      expect(screen.getByText('14. Changes to Terms')).toBeInTheDocument();

      // Section 15: Severability
      expect(screen.getByText('15. Severability')).toBeInTheDocument();

      // Section 16: Contact Us
      expect(screen.getByText('16. Contact Us')).toBeInTheDocument();
      expect(screen.getByText('legal@quiz2biz.com')).toBeInTheDocument();
    });

    it('renders all list items correctly', () => {
      renderTermsPage();

      // Description of Service list
      expect(screen.getByText('Complete structured questionnaires across multiple business dimensions')).toBeInTheDocument();
      expect(screen.getByText('Upload and manage evidence documentation')).toBeInTheDocument();
      expect(screen.getByText('Receive readiness scores and gap analysis')).toBeInTheDocument();

      // Account Registration list
      expect(screen.getByText('Provide accurate, current, and complete information during registration')).toBeInTheDocument();
      expect(screen.getByText('Maintain and promptly update your account information')).toBeInTheDocument();
      expect(screen.getByText('Maintain the security and confidentiality of your password')).toBeInTheDocument();

      // Acceptable Use list
      expect(screen.getByText('Use the Service for any illegal or unauthorized purpose')).toBeInTheDocument();
      expect(screen.getByText('Violate any applicable laws or regulations')).toBeInTheDocument();
      expect(screen.getByText('Infringe on intellectual property rights of others')).toBeInTheDocument();
      expect(screen.getByText('Upload malicious code, viruses, or harmful content')).toBeInTheDocument();

      // Service Availability list
      expect(screen.getByText('Scheduled maintenance (with advance notice when possible)')).toBeInTheDocument();
      expect(screen.getByText('Emergency maintenance or security updates')).toBeInTheDocument();
      expect(screen.getByText('Factors beyond our control (network outages, natural disasters)')).toBeInTheDocument();

      // Disclaimer of Warranties list
      expect(screen.getByText('MERCHANTABILITY')).toBeInTheDocument();
      expect(screen.getByText('FITNESS FOR A PARTICULAR PURPOSE')).toBeInTheDocument();
      expect(screen.getByText('NON-INFRINGEMENT')).toBeInTheDocument();

      // Limitation of Liability list
      expect(screen.getByText('Loss of profits, revenue, or data')).toBeInTheDocument();
      expect(screen.getByText('Business interruption')).toBeInTheDocument();
      expect(screen.getByText('Cost of substitute services')).toBeInTheDocument();

      // Termination list
      expect(screen.getByText('Violation of these Terms')).toBeInTheDocument();
      expect(screen.getByText('Conduct that we believe is harmful to other users or the Service')).toBeInTheDocument();
      expect(screen.getByText('Upon your request')).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('displays complete contact information', () => {
      renderTermsPage();

      // Should show contact section
      expect(screen.getByText('Quiz2Biz Legal Team')).toBeInTheDocument();
      expect(screen.getByText('legal@quiz2biz.com')).toBeInTheDocument();
      expect(screen.getByText(/Address:\s*123 Business Park,\s*Suite 100/)).toBeInTheDocument();
      expect(screen.getByText(/Technology City,\s*TC 12345/)).toBeInTheDocument();
      const addressBlock = screen.getByText('Quiz2Biz Legal Team').closest('address');
      expect(addressBlock).not.toBeNull();
      if (!addressBlock) {
        throw new Error('Expected contact address block to exist');
      }
      expect(addressBlock).toHaveTextContent(/United States/);

      // Email should be a link
      const emailLink = screen.getByText('legal@quiz2biz.com').closest('a');
      expect(emailLink).toHaveAttribute('href', 'mailto:legal@quiz2biz.com');
    });
  });

  describe('Navigation Links', () => {
    it('renders navigation links in main content area', () => {
      renderTermsPage();

      // "Privacy Policy" appears in both section content and link list.
      const privacyLinks = screen.getAllByRole('link', { name: 'Privacy Policy' });
      expect(privacyLinks).toHaveLength(2);
      privacyLinks.forEach((privacyLink) => {
        expect(privacyLink).toHaveAttribute('href', '/privacy');
      });

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

    it('renders link to Privacy Policy within content', () => {
      renderTermsPage();

      const privacySection = screen.getByText('7. Data and Privacy').closest('section');
      expect(privacySection).toBeInTheDocument();

      if (!privacySection) {
        throw new Error('Expected "7. Data and Privacy" section to exist');
      }

      const privacyLink = within(privacySection).getByRole('link', { name: 'Privacy Policy' });
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });
  });

  describe('Footer', () => {
    it('renders footer with copyright information', () => {
      renderTermsPage();

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} Quiz2Biz. All rights reserved.`)).toBeInTheDocument();

      // Footer should have proper role
      const footer = screen.getByText(`© ${currentYear} Quiz2Biz. All rights reserved.`).closest('footer');
      expect(footer).toHaveAttribute('role', 'contentinfo');
    });
  });

  describe('Accessibility Features', () => {
    it('includes accessibility attributes', () => {
      renderTermsPage();

      // Skip link should have proper accessibility attributes
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toHaveAttribute('href', '#main-content');

      // Icons are present (visual elements)
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();

      // Main content should have proper ID and tabindex
      const mainContent = screen.getByText('Terms of Service').closest('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });

    it('renders semantic HTML structure', () => {
      renderTermsPage();

      // Should use proper heading hierarchy
      const h1 = screen.getByText('Terms of Service');
      expect(h1.tagName).toBe('H1');

      // Section headings should be H2
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThanOrEqual(16); // 16 sections

      // Subsection headings should be H3
      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      expect(h3Elements.length).toBeGreaterThanOrEqual(4); // At least 4 subsections

      // Address should be semantic
      const address = screen.getByText('Quiz2Biz Legal Team').closest('address');
      expect(address).toBeInTheDocument();
    });
  });

  describe('Content Formatting', () => {
    it('renders content with proper formatting', () => {
      renderTermsPage();

      // Should render strong text
      const strongElement = screen.getByText('Quiz2Biz Legal Team');
      expect(strongElement.tagName).toBe('STRONG');

      // Should render lists properly
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(30); // Should have many list items

      // Should render paragraphs
      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs.length).toBeGreaterThan(20); // Should have many paragraphs
    });
  });

  describe('WCAG Compliance', () => {
    it('meets basic WCAG requirements', () => {
      renderTermsPage();

      // Should have skip link for keyboard navigation
      expect(screen.getByText('Skip to main content')).toBeInTheDocument();

      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);

      // Should have sufficient color contrast (visual check)
      // This would be tested with axe or similar tools in practice

      // Should have focusable elements
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(7);

      // Should have proper landmark roles
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('uses current year in copyright', () => {
      renderTermsPage();

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} Quiz2Biz. All rights reserved.`)).toBeInTheDocument();
    });
  });

  describe('Legal Content Verification', () => {
    it('includes key legal clauses', () => {
      renderTermsPage();

      // Should include disclaimer of warranties in all caps
      expect(screen.getByText(/THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE"/)).toBeInTheDocument();

      // Should include limitation of liability in all caps
      expect(
        screen.getByText(/TO THE MAXIMUM EXTENT PERMITTED BY LAW[,\s]+QUIZ2BIZ SHALL NOT BE LIABLE/),
      ).toBeInTheDocument();

      // Should mention governing law
      expect(screen.getByText(/State of Delaware/)).toBeInTheDocument();

      // Should mention severability clause
      expect(screen.getByText(/If any provision of these Terms is found to be unenforceable/)).toBeInTheDocument();
    });
  });
});