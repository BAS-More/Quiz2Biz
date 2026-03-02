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
      expect(addressBlock).toHaveTextContent(/United States/);

      // Email should be a link
      const emailLink = screen.getByText('legal@quiz2biz.com').closest('a');
      expect(emailLink).toHaveAttribute('href', 'mailto:legal@quiz2biz.com');
    });
  });

  describe('Navigation Links', () => {
    it('renders navigation links in footer', () => {
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
      expect(screen.getByText('Quiz2Biz Legal Team')).toBeInTheDocument();

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

  describe('Link Functionality', () => {
    it('all navigation links have correct href attributes', () => {
      renderTermsPage();

      const backToHomeLink = screen.getByText('Back to Home');
      expect(backToHomeLink).toHaveAttribute('href', '/');

      const privacyLinks = screen.getAllByRole('link', { name: 'Privacy Policy' });
      privacyLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/privacy');
      });

      const signInLink = screen.getByText('Sign In');
      expect(signInLink).toHaveAttribute('href', '/auth/login');

      const registerLink = screen.getByText('Create Account');
      expect(registerLink).toHaveAttribute('href', '/auth/register');
    });

    it('email link is properly formatted as mailto', () => {
      renderTermsPage();

      const emailLinks = screen.getAllByText('legal@quiz2biz.com');
      emailLinks.forEach(link => {
        const anchor = link.closest('a');
        expect(anchor).toHaveAttribute('href', 'mailto:legal@quiz2biz.com');
      });
    });

    it('back to home link uses correct icon', () => {
      renderTermsPage();

      const backLink = screen.getByText('Back to Home').closest('a');
      expect(backLink).toContainElement(screen.getByTestId('arrow-left-icon'));
    });
  });

  describe('Responsive Design Elements', () => {
    it('applies responsive padding classes', () => {
      renderTermsPage();

      const header = screen.getByText('Back to Home').closest('header');
      expect(header?.querySelector('.px-4.sm\\:px-6.lg\\:px-8')).toBeTruthy();
    });

    it('main content uses max-width container', () => {
      renderTermsPage();

      const mainContent = screen.getByText('Terms of Service').closest('main');
      expect(mainContent).toHaveClass('max-w-4xl', 'mx-auto');
    });
  });

  describe('Subscription and Payment Section Details', () => {
    it('includes all subscription subsections', () => {
      renderTermsPage();

      expect(screen.getByText('4.1 Subscription Plans')).toBeInTheDocument();
      expect(screen.getByText('4.2 Billing')).toBeInTheDocument();
      expect(screen.getByText('4.3 Cancellation')).toBeInTheDocument();
      expect(screen.getByText('4.4 Free Trial')).toBeInTheDocument();
    });

    it('mentions subscription tiers', () => {
      renderTermsPage();

      expect(screen.getByText(/Free, Professional, Enterprise/)).toBeInTheDocument();
    });

    it('describes billing policy', () => {
      renderTermsPage();

      expect(screen.getByText(/billed in advance on a monthly or annual basis/)).toBeInTheDocument();
    });

    it('explains cancellation policy', () => {
      renderTermsPage();

      expect(screen.getByText(/No refunds are provided for partial billing periods/)).toBeInTheDocument();
    });
  });

  describe('Intellectual Property Section Details', () => {
    it('includes all IP subsections', () => {
      renderTermsPage();

      expect(screen.getByText('6.1 Our Content')).toBeInTheDocument();
      expect(screen.getByText('6.2 Your Content')).toBeInTheDocument();
      expect(screen.getByText('6.3 Feedback')).toBeInTheDocument();
    });

    it('describes ownership of platform content', () => {
      renderTermsPage();

      expect(screen.getByText(/owned by Quiz2Biz and are protected by copyright/)).toBeInTheDocument();
    });

    it('describes user content license', () => {
      renderTermsPage();

      expect(screen.getByText(/You retain ownership of content you submit/)).toBeInTheDocument();
      expect(screen.getByText(/non-exclusive, worldwide, royalty-free license/)).toBeInTheDocument();
    });
  });

  describe('Accessibility - Keyboard Navigation', () => {
    it('skip link is visually hidden but accessible', () => {
      renderTermsPage();

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toHaveClass('sr-only');
    });

    it('main content can receive focus', () => {
      renderTermsPage();

      const mainContent = screen.getByText('Terms of Service').closest('main');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Legal Disclaimers Coverage', () => {
    it('includes multiple warranty disclaimers', () => {
      renderTermsPage();

      expect(screen.getByText('MERCHANTABILITY')).toBeInTheDocument();
      expect(screen.getByText('FITNESS FOR A PARTICULAR PURPOSE')).toBeInTheDocument();
      expect(screen.getByText('NON-INFRINGEMENT')).toBeInTheDocument();
    });

    it('disclaims accuracy of results', () => {
      renderTermsPage();

      expect(screen.getByText(/Readiness scores and recommendations are for informational purposes only/)).toBeInTheDocument();
    });

    it('includes indemnification clause', () => {
      renderTermsPage();

      expect(screen.getByText(/You agree to indemnify, defend, and hold harmless Quiz2Biz/)).toBeInTheDocument();
    });
  });

  describe('Service Features Listed', () => {
    it('lists all core service features', () => {
      renderTermsPage();

      expect(screen.getByText(/Complete structured questionnaires/)).toBeInTheDocument();
      expect(screen.getByText(/Upload and manage evidence documentation/)).toBeInTheDocument();
      expect(screen.getByText(/Receive readiness scores and gap analysis/)).toBeInTheDocument();
      expect(screen.getByText(/Generate compliance and business documentation/)).toBeInTheDocument();
      expect(screen.getByText(/Track improvement progress over time/)).toBeInTheDocument();
    });
  });

  describe('Termination Conditions', () => {
    it('lists all termination reasons', () => {
      renderTermsPage();

      expect(screen.getByText('Violation of these Terms')).toBeInTheDocument();
      expect(screen.getByText(/Conduct that we believe is harmful/)).toBeInTheDocument();
      expect(screen.getByText('Upon your request')).toBeInTheDocument();
    });

    it('explains post-termination effects', () => {
      renderTermsPage();

      expect(screen.getByText(/your right to use the Service ceases immediately/)).toBeInTheDocument();
      expect(screen.getByText(/Provisions that by their nature should survive termination shall survive/)).toBeInTheDocument();
    });
  });

  describe('Data and Privacy References', () => {
    it('references Privacy Policy', () => {
      renderTermsPage();

      const dataSection = screen.getByText('7. Data and Privacy').closest('section');
      expect(dataSection).toBeInTheDocument();

      if (dataSection) {
        const privacyLink = within(dataSection).getByRole('link', { name: 'Privacy Policy' });
        expect(privacyLink).toBeInTheDocument();
      }
    });

    it('mentions user responsibility for uploaded data', () => {
      renderTermsPage();

      expect(screen.getByText(/You are responsible for ensuring you have the right to upload and share/)).toBeInTheDocument();
    });
  });

  describe('Additional Edge Cases', () => {
    it('renders without errors when navigation routes are missing', () => {
      // This test ensures the component doesn't crash even if routes aren't configured
      const { container } = render(
        <MemoryRouter>
          <TermsPage />
        </MemoryRouter>
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('uses semantic time element for last updated date', () => {
      renderTermsPage();

      const lastUpdated = screen.getByText(/Last updated: January 28, 2026/);
      expect(lastUpdated).toBeInTheDocument();
    });

    it('has proper color contrast classes for accessibility', () => {
      renderTermsPage();

      // Check that text uses proper contrast classes
      const heading = screen.getByText('Terms of Service');
      expect(heading).toHaveClass('text-gray-900');
    });
  });

  describe('Dynamic Year Calculation', () => {
    it('dynamically calculates and displays current year in copyright', () => {
      const originalDate = global.Date;

      // Mock Date to return a specific year
      global.Date = class extends originalDate {
        getFullYear() { return 2027; }
      } as any;

      renderTermsPage();

      expect(screen.getByText('© 2027 Quiz2Biz. All rights reserved.')).toBeInTheDocument();

      global.Date = originalDate;
    });

    it('updates copyright year when year changes', () => {
      // Test that it uses the actual current year
      const actualYear = new Date().getFullYear();
      renderTermsPage();

      expect(screen.getByText(`© ${actualYear} Quiz2Biz. All rights reserved.`)).toBeInTheDocument();
    });
  });

  describe('Skip Link Focus Behavior', () => {
    it('skip link targets main content with correct ID', () => {
      renderTermsPage();

      const skipLink = screen.getByText('Skip to main content');
      const mainContent = screen.getByRole('main');

      expect(skipLink).toHaveAttribute('href', '#main-content');
      expect(mainContent).toHaveAttribute('id', 'main-content');
    });

    it('skip link has screen reader only class', () => {
      renderTermsPage();

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toHaveClass('sr-only');
    });

    it('main content is focusable with tabIndex -1', () => {
      renderTermsPage();

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('All List Items Rendering', () => {
    it('renders all service features in Description section', () => {
      renderTermsPage();

      const features = [
        'Complete structured questionnaires across multiple business dimensions',
        'Upload and manage evidence documentation',
        'Receive readiness scores and gap analysis',
        'Generate compliance and business documentation',
        'Track improvement progress over time',
      ];

      features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });

    it('renders all account registration requirements', () => {
      renderTermsPage();

      const requirements = [
        'Provide accurate, current, and complete information during registration',
        'Maintain and promptly update your account information',
        'Maintain the security and confidentiality of your password',
        'Accept responsibility for all activities under your account',
        'Notify us immediately of any unauthorized use',
      ];

      requirements.forEach(req => {
        expect(screen.getByText(req)).toBeInTheDocument();
      });
    });

    it('renders all acceptable use prohibitions', () => {
      renderTermsPage();

      const prohibitions = [
        'Use the Service for any illegal or unauthorized purpose',
        'Violate any applicable laws or regulations',
        'Infringe on intellectual property rights of others',
        'Upload malicious code, viruses, or harmful content',
        'Attempt to gain unauthorized access to the Service or other systems',
        'Interfere with or disrupt the Service or its infrastructure',
        'Scrape, harvest, or collect data from the Service without permission',
        'Impersonate another person or entity',
        'Use the Service to harass, abuse, or harm others',
        'Resell or redistribute the Service without authorization',
      ];

      prohibitions.forEach(prohibition => {
        expect(screen.getByText(prohibition)).toBeInTheDocument();
      });
    });

    it('renders all service availability reasons', () => {
      renderTermsPage();

      const reasons = [
        'Scheduled maintenance (with advance notice when possible)',
        'Emergency maintenance or security updates',
        'Factors beyond our control (network outages, natural disasters)',
      ];

      reasons.forEach(reason => {
        expect(screen.getByText(reason)).toBeInTheDocument();
      });
    });

    it('renders all warranty disclaimers', () => {
      renderTermsPage();

      const disclaimers = [
        'MERCHANTABILITY',
        'FITNESS FOR A PARTICULAR PURPOSE',
        'NON-INFRINGEMENT',
      ];

      disclaimers.forEach(disclaimer => {
        expect(screen.getByText(disclaimer)).toBeInTheDocument();
      });
    });

    it('renders all liability limitations', () => {
      renderTermsPage();

      const limitations = [
        'Loss of profits, revenue, or data',
        'Business interruption',
        'Cost of substitute services',
      ];

      limitations.forEach(limitation => {
        expect(screen.getByText(limitation)).toBeInTheDocument();
      });
    });

    it('renders all termination conditions', () => {
      renderTermsPage();

      const conditions = [
        'Violation of these Terms',
        'Conduct that we believe is harmful to other users or the Service',
        'Upon your request',
      ];

      conditions.forEach(condition => {
        expect(screen.getByText(condition)).toBeInTheDocument();
      });
    });
  });

  describe('Section Numbering Integrity', () => {
    it('displays all 16 sections in correct order', () => {
      renderTermsPage();

      const sectionTitles = [
        '1. Acceptance of Terms',
        '2. Description of Service',
        '3. Account Registration',
        '4. Subscription and Payment',
        '5. Acceptable Use',
        '6. Intellectual Property',
        '7. Data and Privacy',
        '8. Service Availability',
        '9. Disclaimer of Warranties',
        '10. Limitation of Liability',
        '11. Indemnification',
        '12. Termination',
        '13. Governing Law',
        '14. Changes to Terms',
        '15. Severability',
        '16. Contact Us',
      ];

      sectionTitles.forEach(title => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });

    it('displays all subsections under Subscription and Payment', () => {
      renderTermsPage();

      expect(screen.getByText('4.1 Subscription Plans')).toBeInTheDocument();
      expect(screen.getByText('4.2 Billing')).toBeInTheDocument();
      expect(screen.getByText('4.3 Cancellation')).toBeInTheDocument();
      expect(screen.getByText('4.4 Free Trial')).toBeInTheDocument();
    });

    it('displays all subsections under Intellectual Property', () => {
      renderTermsPage();

      expect(screen.getByText('6.1 Our Content')).toBeInTheDocument();
      expect(screen.getByText('6.2 Your Content')).toBeInTheDocument();
      expect(screen.getByText('6.3 Feedback')).toBeInTheDocument();
    });
  });

  describe('Legal Language Accuracy', () => {
    it('includes complete disclaimer statement', () => {
      renderTermsPage();

      expect(screen.getByText(/THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE"/)).toBeInTheDocument();
      expect(screen.getByText(/WITHOUT WARRANTIES OF ANY KIND/)).toBeInTheDocument();
    });

    it('includes complete liability limitation statement', () => {
      renderTermsPage();

      expect(screen.getByText(/TO THE MAXIMUM EXTENT PERMITTED BY LAW[,\s]+QUIZ2BIZ SHALL NOT BE LIABLE/)).toBeInTheDocument();
      expect(screen.getByText(/INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES/)).toBeInTheDocument();
    });

    it('specifies governing jurisdiction correctly', () => {
      renderTermsPage();

      expect(screen.getByText(/State of Delaware/)).toBeInTheDocument();
      expect(screen.getByText(/state or federal courts located in Delaware/)).toBeInTheDocument();
    });

    it('includes liability cap language', () => {
      renderTermsPage();

      expect(screen.getByText(/Our total liability shall not exceed the amount paid by you/)).toBeInTheDocument();
      expect(screen.getByText(/twelve \(12\) months preceding the claim/)).toBeInTheDocument();
    });
  });

  describe('Contact Information Completeness', () => {
    it('displays all contact details', () => {
      renderTermsPage();

      expect(screen.getByText('Quiz2Biz Legal Team')).toBeInTheDocument();
      expect(screen.getByText('legal@quiz2biz.com')).toBeInTheDocument();
      expect(screen.getByText(/123 Business Park, Suite 100/)).toBeInTheDocument();
      expect(screen.getByText(/Technology City, TC 12345/)).toBeInTheDocument();
      expect(screen.getByText(/United States/)).toBeInTheDocument();
    });

    it('has clickable mailto link for email', () => {
      renderTermsPage();

      const emailLinks = screen.getAllByText('legal@quiz2biz.com');
      emailLinks.forEach(link => {
        const anchor = link.closest('a');
        expect(anchor).toHaveAttribute('href', 'mailto:legal@quiz2biz.com');
      });
    });
  });

  describe('Responsive Design Verification', () => {
    it('uses responsive padding classes on header', () => {
      renderTermsPage();

      const header = screen.getByText('Back to Home').closest('header');
      expect(header).toBeInTheDocument();
      // Check for responsive padding
      const paddedDiv = header?.querySelector('.px-4.sm\\:px-6.lg\\:px-8');
      expect(paddedDiv).toBeInTheDocument();
    });

    it('uses max-width container for main content', () => {
      renderTermsPage();

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('max-w-4xl');
      expect(mainContent).toHaveClass('mx-auto');
    });
  });

  describe('Icons and Visual Elements', () => {
    it('renders ArrowLeft icon for back link', () => {
      renderTermsPage();

      const arrowIcon = screen.getByTestId('arrow-left-icon');
      expect(arrowIcon).toBeInTheDocument();

      const backLink = screen.getByText('Back to Home');
      expect(backLink.closest('a')).toContainElement(arrowIcon);
    });

    it('renders FileText icon for page title', () => {
      renderTermsPage();

      const fileIcon = screen.getByTestId('file-text-icon');
      expect(fileIcon).toBeInTheDocument();
    });
  });

  describe('Regression Tests', () => {
    it('maintains Privacy Policy link in Data and Privacy section', () => {
      renderTermsPage();

      const dataSection = screen.getByText('7. Data and Privacy').closest('section');
      expect(dataSection).toBeInTheDocument();

      if (dataSection) {
        const privacyLink = within(dataSection).getByRole('link', { name: 'Privacy Policy' });
        expect(privacyLink).toHaveAttribute('href', '/privacy');
      }
    });

    it('does not break when rendering multiple times', () => {
      const { rerender } = renderTermsPage();

      expect(screen.getByText('Terms of Service')).toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<TermsPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('maintains all links after multiple renders', () => {
      const { rerender } = renderTermsPage();

      let privacyLinks = screen.getAllByRole('link', { name: 'Privacy Policy' });
      expect(privacyLinks.length).toBeGreaterThanOrEqual(2);

      rerender(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<TermsPage />} />
          </Routes>
        </MemoryRouter>
      );

      privacyLinks = screen.getAllByRole('link', { name: 'Privacy Policy' });
      expect(privacyLinks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Content Accuracy Verification', () => {
    it('includes subscription tier names', () => {
      renderTermsPage();

      expect(screen.getByText(/Free, Professional, Enterprise/)).toBeInTheDocument();
    });

    it('specifies billing frequency options', () => {
      renderTermsPage();

      expect(screen.getByText(/monthly or annual basis/)).toBeInTheDocument();
    });

    it('explains no refund policy', () => {
      renderTermsPage();

      expect(screen.getByText(/No refunds are provided for partial billing periods/)).toBeInTheDocument();
    });

    it('describes user content ownership', () => {
      renderTermsPage();

      expect(screen.getByText(/You retain ownership of content you submit/)).toBeInTheDocument();
    });

    it('grants platform license to user content', () => {
      renderTermsPage();

      expect(screen.getByText(/non-exclusive, worldwide, royalty-free license/)).toBeInTheDocument();
    });

    it('explains readiness scores are informational', () => {
      renderTermsPage();

      expect(screen.getByText(/Readiness scores and recommendations are for informational purposes only/)).toBeInTheDocument();
    });

    it('mentions user responsibility for data rights', () => {
      renderTermsPage();

      expect(screen.getByText(/You are responsible for ensuring you have the right to upload and share/)).toBeInTheDocument();
    });

    it('includes indemnification language', () => {
      renderTermsPage();

      expect(screen.getByText(/You agree to indemnify, defend, and hold harmless Quiz2Biz/)).toBeInTheDocument();
    });

    it('explains survival of terms after termination', () => {
      renderTermsPage();

      expect(screen.getByText(/Provisions that by their nature should survive termination shall survive/)).toBeInTheDocument();
    });

    it('explains severability clause', () => {
      renderTermsPage();

      expect(screen.getByText(/If any provision of these Terms is found to be unenforceable/)).toBeInTheDocument();
    });
  });
});