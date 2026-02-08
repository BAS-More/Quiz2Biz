/**
 * Screen Reader Accessibility Tests
 * WCAG 2.2 Level AA compliance - Screen Reader compatibility
 *
 * Tests:
 * - ARIA labels and roles
 * - Form labels
 * - Alt text for images
 * - Landmark roles
 * - Live regions
 * - Expanded/collapsed states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

// ============================================================================
// Mock Components for Screen Reader Testing
// ============================================================================

/**
 * Mock Page with proper landmark structure
 */
function MockPageWithLandmarks() {
  return (
    <div>
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>

      <header role="banner">
        <nav aria-label="Main navigation">
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/about">About</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
          </ul>
        </nav>
      </header>

      <aside role="complementary" aria-label="Sidebar">
        <h2>Related Links</h2>
        <nav aria-label="Related navigation">
          <ul>
            <li>
              <a href="/faq">FAQ</a>
            </li>
            <li>
              <a href="/help">Help</a>
            </li>
          </ul>
        </nav>
      </aside>

      <main id="main-content" role="main">
        <article aria-labelledby="article-title">
          <h1 id="article-title">Page Title</h1>
          <p>Article content</p>
        </article>
      </main>

      <footer role="contentinfo">
        <p>&copy; 2026 Company Name</p>
      </footer>
    </div>
  );
}

/**
 * Mock Form with accessible labels
 */
function MockAccessibleForm() {
  return (
    <form aria-labelledby="form-title">
      <h2 id="form-title">Contact Form</h2>

      {/* Standard label */}
      <div>
        <label htmlFor="name">Full Name</label>
        <input type="text" id="name" required aria-required="true" />
      </div>

      {/* Label with hint */}
      <div>
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          required
          aria-required="true"
          aria-describedby="email-hint"
        />
        <p id="email-hint" className="text-sm text-gray-500">
          We'll never share your email.
        </p>
      </div>

      {/* Label with error */}
      <div>
        <label htmlFor="phone">Phone Number</label>
        <input type="tel" id="phone" aria-invalid="true" aria-describedby="phone-error" />
        <p id="phone-error" role="alert" className="text-red-500">
          Please enter a valid phone number.
        </p>
      </div>

      {/* Visually hidden label */}
      <div>
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <input type="search" id="search" placeholder="Search..." />
      </div>

      {/* aria-label instead of visible label */}
      <div>
        <input
          type="text"
          aria-label="Additional notes"
          placeholder="Additional notes (optional)"
        />
      </div>

      {/* Checkbox group */}
      <fieldset>
        <legend>Preferred contact method</legend>
        <div>
          <input type="checkbox" id="contact-email" name="contact" value="email" />
          <label htmlFor="contact-email">Email</label>
        </div>
        <div>
          <input type="checkbox" id="contact-phone" name="contact" value="phone" />
          <label htmlFor="contact-phone">Phone</label>
        </div>
      </fieldset>

      {/* Radio group */}
      <fieldset>
        <legend>Priority</legend>
        <div>
          <input type="radio" id="priority-low" name="priority" value="low" />
          <label htmlFor="priority-low">Low</label>
        </div>
        <div>
          <input type="radio" id="priority-high" name="priority" value="high" />
          <label htmlFor="priority-high">High</label>
        </div>
      </fieldset>

      <button type="submit">Submit Form</button>
    </form>
  );
}

/**
 * Mock component with images
 */
function MockImagesComponent() {
  return (
    <div>
      {/* Informative image with alt text */}
      <img src="/logo.png" alt="Quiz2Biz company logo" data-testid="logo-img" />

      {/* Complex image with detailed description */}
      <figure>
        <img
          src="/chart.png"
          alt="Quarterly sales chart showing 25% growth"
          aria-describedby="chart-description"
          data-testid="chart-img"
        />
        <figcaption id="chart-description">
          Bar chart displaying Q1-Q4 sales figures. Q1: $100k, Q2: $110k, Q3: $115k, Q4: $125k.
        </figcaption>
      </figure>

      {/* Decorative image */}
      <img src="/decorative-divider.png" alt="" role="presentation" data-testid="decorative-img" />

      {/* Icon with aria-hidden */}
      <span aria-hidden="true" data-testid="icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 2L2 12h3v8h14v-8h3L12 2z" />
        </svg>
      </span>
      <span className="sr-only">Home</span>

      {/* Background image with meaningful content */}
      <div
        role="img"
        aria-label="Team collaboration in modern office"
        data-testid="bg-img"
        style={{ backgroundImage: 'url(/team.jpg)' }}
      />
    </div>
  );
}

/**
 * Mock component with live regions
 */
function MockLiveRegions() {
  const [status, setStatus] = React.useState('');
  const [alert, setAlert] = React.useState('');
  const [log, setLog] = React.useState<string[]>([]);

  return (
    <div>
      {/* Status region - polite announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" data-testid="status-region">
        {status}
      </div>

      {/* Alert region - assertive announcements */}
      <div role="alert" aria-live="assertive" data-testid="alert-region">
        {alert}
      </div>

      {/* Log region - additions only */}
      <div role="log" aria-live="polite" aria-relevant="additions" data-testid="log-region">
        {log.map((entry, i) => (
          <p key={i}>{entry}</p>
        ))}
      </div>

      {/* Timer region */}
      <div role="timer" aria-live="off" aria-atomic="true" data-testid="timer-region">
        00:00:00
      </div>

      {/* Progress region */}
      <div
        role="progressbar"
        aria-valuenow={50}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
        data-testid="progress-region"
      />

      {/* Controls */}
      <button onClick={() => setStatus('Form saved successfully')}>Save</button>
      <button onClick={() => setAlert('Error: Unable to save')}>Trigger Error</button>
      <button onClick={() => setLog([...log, `Log entry ${log.length + 1}`])}>Add Log</button>
    </div>
  );
}

/**
 * Mock component with expanded/collapsed states
 */
function MockExpandableContent() {
  const [accordionOpen, setAccordionOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div>
      {/* Accordion */}
      <div>
        <button
          aria-expanded={accordionOpen}
          aria-controls="accordion-content"
          onClick={() => setAccordionOpen(!accordionOpen)}
          data-testid="accordion-trigger"
        >
          {accordionOpen ? 'Collapse' : 'Expand'} Section
        </button>
        <div id="accordion-content" hidden={!accordionOpen} data-testid="accordion-content">
          Accordion content here
        </div>
      </div>

      {/* Dropdown menu */}
      <div>
        <button
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls="dropdown-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="menu-trigger"
        >
          Options
        </button>
        {menuOpen && (
          <ul id="dropdown-menu" role="menu" aria-label="Actions" data-testid="dropdown-menu">
            <li role="menuitem">
              <button>Edit</button>
            </li>
            <li role="menuitem">
              <button>Delete</button>
            </li>
            <li role="menuitem">
              <button>Share</button>
            </li>
          </ul>
        )}
      </div>

      {/* Disclosure widget */}
      <details data-testid="details">
        <summary>More Information</summary>
        <p>Additional details are shown here.</p>
      </details>

      {/* Tree view */}
      <ul role="tree" aria-label="File browser">
        <li role="treeitem" aria-expanded="false" data-testid="tree-folder">
          Documents
          <ul role="group" hidden>
            <li role="treeitem">report.pdf</li>
            <li role="treeitem">notes.txt</li>
          </ul>
        </li>
      </ul>

      {/* Dialog trigger */}
      <button
        aria-haspopup="dialog"
        onClick={() => setDialogOpen(true)}
        data-testid="dialog-trigger"
      >
        Open Dialog
      </button>
      {dialogOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" data-testid="dialog">
          <h2 id="dialog-title">Dialog Title</h2>
          <p>Dialog content</p>
          <button onClick={() => setDialogOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
}

/**
 * Mock table with proper accessibility
 */
function MockAccessibleTable() {
  return (
    <table aria-labelledby="table-caption">
      <caption id="table-caption">Monthly Sales Report</caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">Sales</th>
          <th scope="col">Growth</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">January</th>
          <td>$10,000</td>
          <td>+5%</td>
        </tr>
        <tr>
          <th scope="row">February</th>
          <td>$12,000</td>
          <td>+20%</td>
        </tr>
        <tr>
          <th scope="row">March</th>
          <td>$11,500</td>
          <td>-4%</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td>$33,500</td>
          <td aria-label="Average growth">+7%</td>
        </tr>
      </tfoot>
    </table>
  );
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Screen Reader Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Landmark Roles', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have banner landmark (header)', () => {
      render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should have main landmark', () => {
      render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have navigation landmark with label', () => {
      render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });

    it('should have complementary landmark (aside) with label', () => {
      render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );
      expect(screen.getByRole('complementary', { name: /sidebar/i })).toBeInTheDocument();
    });

    it('should have contentinfo landmark (footer)', () => {
      render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should have article with accessible name', () => {
      render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );
      expect(screen.getByRole('article', { name: /page title/i })).toBeInTheDocument();
    });

    it('should differentiate multiple navigation regions', () => {
      render(
        <BrowserRouter>
          <MockPageWithLandmarks />
        </BrowserRouter>,
      );

      const navigations = screen.getAllByRole('navigation');
      expect(navigations).toHaveLength(2);

      // Each should have a unique label
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /related navigation/i })).toBeInTheDocument();
    });
  });

  describe('Form Labels', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockAccessibleForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('all inputs should have associated labels', () => {
      render(<MockAccessibleForm />);

      // Check labeled inputs
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument();
    });

    it('required fields should have aria-required', () => {
      render(<MockAccessibleForm />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
    });

    it('fields with hints should have aria-describedby', () => {
      render(<MockAccessibleForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-hint');
    });

    it('invalid fields should have aria-invalid', () => {
      render(<MockAccessibleForm />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('error messages should have role alert', () => {
      render(<MockAccessibleForm />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(/valid phone number/i);
    });

    it('fieldsets should have legends', () => {
      render(<MockAccessibleForm />);

      const groups = screen.getAllByRole('group');
      expect(groups.length).toBeGreaterThan(0);

      // Check legends
      expect(screen.getByText(/preferred contact method/i)).toBeInTheDocument();
      expect(screen.getByText(/priority/i)).toBeInTheDocument();
    });

    it('checkbox and radio inputs should be properly labeled', () => {
      render(<MockAccessibleForm />);

      // Check checkbox inputs specifically by their labels
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
      expect(screen.getByLabelText('Low')).toBeInTheDocument();
      expect(screen.getByLabelText('High')).toBeInTheDocument();
    });
  });

  describe('Image Alt Text', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockImagesComponent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('informative images should have descriptive alt text', () => {
      render(<MockImagesComponent />);

      const logo = screen.getByTestId('logo-img');
      expect(logo).toHaveAttribute('alt', 'Quiz2Biz company logo');
    });

    it('complex images should have detailed descriptions', () => {
      render(<MockImagesComponent />);

      const chart = screen.getByTestId('chart-img');
      expect(chart).toHaveAttribute('aria-describedby', 'chart-description');

      const description = document.getElementById('chart-description');
      expect(description).toHaveTextContent(/Q1-Q4 sales figures/i);
    });

    it('decorative images should have empty alt text', () => {
      render(<MockImagesComponent />);

      const decorative = screen.getByTestId('decorative-img');
      expect(decorative).toHaveAttribute('alt', '');
      expect(decorative).toHaveAttribute('role', 'presentation');
    });

    it('icons should be hidden from screen readers with text alternative', () => {
      render(<MockImagesComponent />);

      const icon = screen.getByTestId('icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');

      // Should have a text alternative
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('background images with meaning should have role img and aria-label', () => {
      render(<MockImagesComponent />);

      const bgImage = screen.getByTestId('bg-img');
      expect(bgImage).toHaveAttribute('role', 'img');
      expect(bgImage).toHaveAttribute('aria-label', 'Team collaboration in modern office');
    });
  });

  describe('Live Regions', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockLiveRegions />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('status region should have role status and aria-live polite', () => {
      render(<MockLiveRegions />);

      const status = screen.getByTestId('status-region');
      expect(status).toHaveAttribute('role', 'status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('alert region should have role alert and aria-live assertive', () => {
      render(<MockLiveRegions />);

      const alert = screen.getByTestId('alert-region');
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('log region should have role log and aria-relevant additions', () => {
      render(<MockLiveRegions />);

      const log = screen.getByTestId('log-region');
      expect(log).toHaveAttribute('role', 'log');
      expect(log).toHaveAttribute('aria-relevant', 'additions');
    });

    it('timer region should have role timer', () => {
      render(<MockLiveRegions />);

      const timer = screen.getByTestId('timer-region');
      expect(timer).toHaveAttribute('role', 'timer');
    });

    it('progress region should have proper ARIA attributes', () => {
      render(<MockLiveRegions />);

      const progress = screen.getByTestId('progress-region');
      expect(progress).toHaveAttribute('role', 'progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '50');
      expect(progress).toHaveAttribute('aria-valuemin', '0');
      expect(progress).toHaveAttribute('aria-valuemax', '100');
    });

    it('status updates should be announced', async () => {
      const user = userEvent.setup();
      render(<MockLiveRegions />);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      const status = screen.getByTestId('status-region');
      expect(status).toHaveTextContent('Form saved successfully');
    });
  });

  describe('Expanded/Collapsed States', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockExpandableContent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('accordion should have aria-expanded attribute', () => {
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('accordion-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('accordion should have aria-controls pointing to content', () => {
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('accordion-trigger');
      expect(trigger).toHaveAttribute('aria-controls', 'accordion-content');
    });

    it('accordion aria-expanded should update on click', async () => {
      const user = userEvent.setup();
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('accordion-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('dropdown should have aria-haspopup menu', () => {
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('menu-trigger');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('dropdown menu should have role menu', async () => {
      const user = userEvent.setup();
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('menu-trigger');
      await user.click(trigger);

      const menu = screen.getByTestId('dropdown-menu');
      expect(menu).toHaveAttribute('role', 'menu');
    });

    it('menu items should have role menuitem', async () => {
      const user = userEvent.setup();
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('menu-trigger');
      await user.click(trigger);

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
    });

    it('tree items should have aria-expanded', () => {
      render(<MockExpandableContent />);

      const treeItem = screen.getByTestId('tree-folder');
      expect(treeItem).toHaveAttribute('aria-expanded', 'false');
    });

    it('dialog trigger should have aria-haspopup dialog', () => {
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('dialog-trigger');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    });

    it('dialog should have aria-modal and accessible name', async () => {
      const user = userEvent.setup();
      render(<MockExpandableContent />);

      const trigger = screen.getByTestId('dialog-trigger');
      await user.click(trigger);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
    });
  });

  describe('Tables', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockAccessibleTable />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('table should have caption', () => {
      render(<MockAccessibleTable />);

      const table = screen.getByRole('table', { name: /monthly sales report/i });
      expect(table).toBeInTheDocument();
    });

    it('column headers should have scope col', () => {
      render(<MockAccessibleTable />);

      const columnHeaders = screen.getAllByRole('columnheader');
      columnHeaders.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('row headers should have scope row', () => {
      render(<MockAccessibleTable />);

      const rowHeaders = screen.getAllByRole('rowheader');
      rowHeaders.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'row');
      });
    });
  });
});
