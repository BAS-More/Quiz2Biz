/**
 * Help Center Component
 *
 * Provides searchable FAQ with categories:
 * - Getting Started
 * - Questionnaires
 * - Billing
 * - Troubleshooting
 *
 * Nielsen Heuristic #10: Help and Documentation
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string[];
  helpful?: number;
  notHelpful?: number;
}

export type FAQCategory =
  | 'getting-started'
  | 'questionnaires'
  | 'billing'
  | 'troubleshooting'
  | 'security'
  | 'integrations';

export interface CategoryInfo {
  id: FAQCategory;
  name: string;
  icon: string;
  description: string;
}

// ============================================================================
// FAQ Data
// ============================================================================

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: '🚀',
    description: 'Learn the basics and get up to speed quickly',
  },
  {
    id: 'questionnaires',
    name: 'Questionnaires',
    icon: '📝',
    description: 'Creating, managing, and completing assessments',
  },
  {
    id: 'billing',
    name: 'Billing & Subscription',
    icon: '💳',
    description: 'Plans, payments, invoices, and upgrades',
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    icon: '🔧',
    description: 'Common issues and how to resolve them',
  },
  {
    id: 'security',
    name: 'Security & Privacy',
    icon: '🔒',
    description: 'Data protection, access control, and compliance',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: '🔗',
    description: 'Connecting with external tools and services',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  // Getting Started
  {
    id: 'gs-1',
    category: 'getting-started',
    question: 'How do I create my first questionnaire?',
    answer: `To create your first questionnaire:
    
1. Navigate to the Dashboard
2. Click "New Assessment" in the top right
3. Select a template (Security, Technology, Business)
4. Customize the questions if needed
5. Click "Start Assessment"

Your progress is automatically saved every 30 seconds, so you can continue anytime.`,
    tags: ['create', 'new', 'first', 'start', 'assessment'],
    helpful: 45,
    notHelpful: 2,
  },
  {
    id: 'gs-2',
    category: 'getting-started',
    question: 'What is the readiness score?',
    answer: `The readiness score is a 0-100% metric that measures your organization's preparedness across multiple dimensions:

- **Technical Architecture** - System design and scalability
- **Security Posture** - Protection mechanisms and policies
- **Compliance** - Regulatory adherence (ISO, NIST, OWASP)
- **Operations** - Monitoring, incident response, and recovery
- **Documentation** - Technical and business documentation

A score of 95%+ indicates production readiness. The score updates in real-time as you answer questions.`,
    tags: ['score', 'readiness', 'percentage', 'metric', 'dashboard'],
    helpful: 62,
    notHelpful: 1,
  },
  {
    id: 'gs-3',
    category: 'getting-started',
    question: 'Can I invite team members to collaborate?',
    answer: `Yes! Quiz2Biz supports team collaboration:

**To invite team members:**
1. Go to Settings → Team Management
2. Click "Invite Member"
3. Enter their email address
4. Select their role (Viewer, Editor, Admin)
5. Click "Send Invitation"

Team members can view real-time updates, comment on questions, and contribute answers based on their permissions.`,
    tags: ['team', 'invite', 'collaborate', 'share', 'members'],
    helpful: 38,
    notHelpful: 3,
  },
  {
    id: 'gs-4',
    category: 'getting-started',
    question: 'How do I reset my password?',
    answer: `To reset your password:

1. Go to the login page
2. Click "Forgot Password?"
3. Enter your registered email
4. Check your inbox for the reset link (check spam folder)
5. Click the link and create a new password

**Password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

For security, reset links expire after 24 hours.`,
    tags: ['password', 'reset', 'forgot', 'login', 'access'],
    helpful: 29,
    notHelpful: 0,
  },

  // Questionnaires
  {
    id: 'q-1',
    category: 'questionnaires',
    question: 'How are questions scored?',
    answer: `Each question contributes to your readiness score based on:

**Coverage Levels (5-point scale):**
- **0%** - Not implemented
- **25%** - Partially planned
- **50%** - In progress
- **75%** - Mostly complete
- **100%** - Fully implemented with evidence

**Evidence Requirements:**
Questions with attached evidence (documents, screenshots, links) receive higher confidence scores.

**Dimension Weighting:**
Critical dimensions like Security have higher weight than others. The exact weights are shown in the heatmap view.`,
    tags: ['score', 'points', 'coverage', 'evidence', 'weight'],
    helpful: 51,
    notHelpful: 4,
  },
  {
    id: 'q-2',
    category: 'questionnaires',
    question: 'Can I skip questions and come back later?',
    answer: `Yes, you can skip any question and return to it later:

- Click "Skip for Now" to move to the next question
- Skipped questions appear with a yellow indicator
- Use the progress sidebar to navigate to any question
- Your answers are saved automatically

**Tip:** Focus on questions you can answer confidently first. The adaptive logic will suggest which questions to prioritize based on their impact on your readiness score.`,
    tags: ['skip', 'later', 'navigate', 'return', 'progress'],
    helpful: 44,
    notHelpful: 1,
  },
  {
    id: 'q-3',
    category: 'questionnaires',
    question: 'What file types can I upload as evidence?',
    answer: `Quiz2Biz supports various file types for evidence:

**Documents:** PDF, DOCX, DOC, TXT, RTF
**Spreadsheets:** XLSX, XLS, CSV
**Images:** PNG, JPG, JPEG, GIF, SVG
**Code:** JSON, YAML, XML, MD
**Archives:** ZIP (max 100MB)

**File size limits:**
- Individual files: 50MB
- Total per question: 200MB

Files are scanned for viruses and stored encrypted. You can preview uploaded files before submission.`,
    tags: ['upload', 'file', 'evidence', 'attachment', 'document'],
    helpful: 33,
    notHelpful: 2,
  },
  {
    id: 'q-4',
    category: 'questionnaires',
    question: 'How do I edit a previously submitted answer?',
    answer: `To edit a submitted answer:

1. Navigate to the question using the progress sidebar
2. Click the "Edit Response" button (pencil icon)
3. Modify your answer
4. Click "Save Changes"

**Note:** Editing an answer creates a version history. Admins can see all previous versions for audit purposes. The readiness score updates automatically after edits.`,
    tags: ['edit', 'change', 'modify', 'update', 'submitted'],
    helpful: 28,
    notHelpful: 1,
  },

  // Billing
  {
    id: 'b-1',
    category: 'billing',
    question: 'What plans are available?',
    answer: `Quiz2Biz offers three subscription tiers:

**Free Plan ($0/month)**
- 1 active assessment
- Basic templates
- Email support

**Professional ($49/month)**
- Unlimited assessments
- All templates + custom questions
- Document generation
- Priority support

**Enterprise (Custom pricing)**
- Everything in Professional
- SSO/SAML integration
- Custom integrations
- Dedicated account manager
- SLA guarantee

All paid plans include a 14-day free trial.`,
    tags: ['plan', 'pricing', 'subscription', 'tier', 'cost'],
    helpful: 56,
    notHelpful: 3,
  },
  {
    id: 'b-2',
    category: 'billing',
    question: 'How do I upgrade my plan?',
    answer: `To upgrade your plan:

1. Go to Settings → Billing
2. Click "Upgrade Plan"
3. Select your desired plan
4. Enter payment details (card or bank)
5. Click "Confirm Upgrade"

**What happens on upgrade:**
- Immediate access to new features
- Pro-rated billing for the current period
- Previous data is preserved
- No service interruption`,
    tags: ['upgrade', 'change', 'plan', 'subscription', 'payment'],
    helpful: 31,
    notHelpful: 0,
  },
  {
    id: 'b-3',
    category: 'billing',
    question: 'Can I get a refund?',
    answer: `Refund policy:

**Within 14-day trial:** Full refund, no questions asked
**Monthly plans:** Pro-rated refund for unused days
**Annual plans:** Refund within 30 days of purchase

**To request a refund:**
1. Contact support@quiz2biz.com
2. Include your account email and reason
3. We process refunds within 5-7 business days

Enterprise customers should contact their account manager.`,
    tags: ['refund', 'cancel', 'money', 'back', 'return'],
    helpful: 19,
    notHelpful: 2,
  },

  // Troubleshooting
  {
    id: 't-1',
    category: 'troubleshooting',
    question: 'My progress is not saving. What should I do?',
    answer: `If your progress is not saving:

**Check these first:**
1. Verify internet connection (look for offline indicator)
2. Check if autosave icon shows error (red X)
3. Try refreshing the page

**If issue persists:**
1. Clear browser cache and cookies
2. Disable browser extensions temporarily
3. Try a different browser (Chrome recommended)

**Data recovery:**
Quiz2Biz stores drafts locally. If you see "Resume Draft" banner, click it to restore unsaved work.

**Still stuck?** Contact support with error code if shown.`,
    tags: ['save', 'progress', 'lost', 'not working', 'error'],
    helpful: 47,
    notHelpful: 5,
  },
  {
    id: 't-2',
    category: 'troubleshooting',
    question: 'I received an error code. What does it mean?',
    answer: `Quiz2Biz uses structured error codes for quick troubleshooting:

**AUTH-xxx:** Authentication issues
- AUTH-001: Invalid credentials
- AUTH-002: Session expired (re-login required)
- AUTH-003: Account locked (too many attempts)

**NET-xxx:** Network issues
- NET-001: Connection lost (check internet)
- NET-002: Server timeout (try again later)

**API-xxx:** Server errors
- API-400: Invalid request data
- API-500: Server error (contact support)

**FILE-xxx:** File upload issues
- FILE-001: File too large
- FILE-002: Invalid file type

Copy the full error code when contacting support for faster resolution.`,
    tags: ['error', 'code', 'problem', 'issue', 'help'],
    helpful: 62,
    notHelpful: 1,
  },
  {
    id: 't-3',
    category: 'troubleshooting',
    question: 'The page is loading slowly. How can I fix it?',
    answer: `To improve page performance:

**Quick fixes:**
1. Close other browser tabs
2. Clear browser cache (Ctrl+Shift+Delete)
3. Disable browser extensions
4. Use Chrome, Firefox, or Edge (latest version)

**Network issues:**
- Check if other websites load normally
- Try a different network/WiFi
- Disable VPN temporarily

**If problem continues:**
- Check our status page (status.quiz2biz.com)
- Report performance issues to support
- Include your browser version and location`,
    tags: ['slow', 'performance', 'loading', 'speed', 'freeze'],
    helpful: 24,
    notHelpful: 3,
  },

  // Security
  {
    id: 's-1',
    category: 'security',
    question: 'How is my data protected?',
    answer: `Quiz2Biz implements enterprise-grade security:

**Data Encryption:**
- TLS 1.3 for data in transit
- AES-256 for data at rest
- End-to-end encryption for sensitive fields

**Access Control:**
- Role-based permissions (RBAC)
- Multi-factor authentication (MFA)
- Session timeout after 30 minutes of inactivity

**Compliance:**
- SOC 2 Type II certified
- GDPR compliant
- ISO 27001 aligned

**Infrastructure:**
- Azure cloud with geo-redundancy
- Daily encrypted backups
- 99.9% uptime SLA

View our full security whitepaper in the Trust Center.`,
    tags: ['security', 'data', 'privacy', 'encryption', 'protection'],
    helpful: 71,
    notHelpful: 0,
  },
  {
    id: 's-2',
    category: 'security',
    question: 'How do I enable two-factor authentication?',
    answer: `To enable 2FA:

1. Go to Settings → Security
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with authenticator app:
   - Google Authenticator
   - Microsoft Authenticator
   - Authy
4. Enter the 6-digit code to verify
5. Save backup codes securely

**Tip:** Store backup codes in a password manager. You'll need them if you lose access to your authenticator app.`,
    tags: ['2fa', 'mfa', 'authentication', 'security', 'login'],
    helpful: 35,
    notHelpful: 1,
  },

  // Integrations
  {
    id: 'i-1',
    category: 'integrations',
    question: 'How do I connect GitHub for automated evidence?',
    answer: `To connect GitHub:

1. Go to Settings → Integrations
2. Click "Connect GitHub"
3. Authorize Quiz2Biz in GitHub OAuth
4. Select repositories to monitor

**What gets imported:**
- Pull request reviews (code quality evidence)
- Security scan results (Dependabot, CodeQL)
- CI/CD workflow status
- SBOM files

Evidence is automatically attached to relevant questions, improving your readiness score with minimal effort.`,
    tags: ['github', 'integration', 'connect', 'automated', 'evidence'],
    helpful: 42,
    notHelpful: 2,
  },
  {
    id: 'i-2',
    category: 'integrations',
    question: 'Can I export reports to Confluence?',
    answer: `Yes, Quiz2Biz integrates with Confluence:

**Setup:**
1. Settings → Integrations → Confluence
2. Enter your Atlassian credentials
3. Select target space and page

**Export options:**
- Full readiness report
- Dimension-specific reports
- Decision log export
- Generated policies and procedures

Reports are formatted as Confluence pages with proper headings, tables, and linked attachments.`,
    tags: ['confluence', 'export', 'report', 'atlassian', 'jira'],
    helpful: 28,
    notHelpful: 1,
  },
];

// ============================================================================
// Search Utility
// ============================================================================

export function searchFAQ(items: FAQItem[], query: string): FAQItem[] {
  if (!query.trim()) {
    return items;
  }

  const searchTerms = query.toLowerCase().split(/\s+/);

  return items
    .map((item) => {
      const questionMatch = searchTerms.filter((term) =>
        item.question.toLowerCase().includes(term),
      ).length;
      const answerMatch = searchTerms.filter((term) =>
        item.answer.toLowerCase().includes(term),
      ).length;
      const tagMatch = searchTerms.filter((term) =>
        item.tags.some((tag) => tag.toLowerCase().includes(term)),
      ).length;

      const score = questionMatch * 3 + answerMatch * 1 + tagMatch * 2;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// ============================================================================
// Components
// ============================================================================

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  resultCount: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onClear, resultCount }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search on mount
    inputRef.current?.focus();
  }, []);

  return (
    <div className="help-search">
      <div className="help-search__input-wrapper">
        <span className="help-search__icon" aria-hidden="true">
          🔍
        </span>
        <input
          ref={inputRef}
          type="search"
          className="help-search__input"
          placeholder="Search help articles... (e.g., 'password reset', 'upgrade plan')"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search help articles"
          aria-describedby="search-results-count"
        />
        {value && (
          <button className="help-search__clear" onClick={onClear} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>
      {value && (
        <div id="search-results-count" className="help-search__results" aria-live="polite">
          {resultCount} result{resultCount !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
};

interface CategoryFilterProps {
  categories: CategoryInfo[];
  selected: FAQCategory | null;
  onSelect: (category: FAQCategory | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selected, onSelect }) => {
  return (
    <div className="help-categories" role="tablist" aria-label="FAQ Categories">
      <button
        role="tab"
        className={`help-category ${selected === null ? 'help-category--active' : ''}`}
        onClick={() => onSelect(null)}
        aria-selected={selected === null}
      >
        <span className="help-category__icon">📚</span>
        <span className="help-category__name">All Topics</span>
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          role="tab"
          className={`help-category ${selected === category.id ? 'help-category--active' : ''}`}
          onClick={() => onSelect(category.id)}
          aria-selected={selected === category.id}
        >
          <span className="help-category__icon">{category.icon}</span>
          <span className="help-category__name">{category.name}</span>
        </button>
      ))}
    </div>
  );
};

interface FAQAccordionItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  onFeedback: (helpful: boolean) => void;
}

const FAQAccordionItem: React.FC<FAQAccordionItemProps> = ({
  item,
  isOpen,
  onToggle,
  onFeedback,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const categoryInfo = CATEGORIES.find((c) => c.id === item.category);

  return (
    <div className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
      <button
        className="faq-item__question"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${item.id}`}
      >
        <span className="faq-item__category-badge">
          {categoryInfo?.icon} {categoryInfo?.name}
        </span>
        <span className="faq-item__question-text">{item.question}</span>
        <span className="faq-item__toggle" aria-hidden="true">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      <div
        id={`faq-answer-${item.id}`}
        ref={contentRef}
        className="faq-item__answer"
        role="region"
        aria-labelledby={`faq-question-${item.id}`}
        hidden={!isOpen}
      >
        <div className="faq-item__answer-content">
          {item.answer.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <div className="faq-item__feedback">
          <span className="faq-item__feedback-label">Was this helpful?</span>
          <button
            className="faq-item__feedback-btn faq-item__feedback-btn--yes"
            onClick={() => onFeedback(true)}
            aria-label="Yes, this was helpful"
          >
            👍 Yes ({item.helpful || 0})
          </button>
          <button
            className="faq-item__feedback-btn faq-item__feedback-btn--no"
            onClick={() => onFeedback(false)}
            aria-label="No, this was not helpful"
          >
            👎 No ({item.notHelpful || 0})
          </button>
        </div>

        <div className="faq-item__tags">
          {item.tags.map((tag) => (
            <span key={tag} className="faq-item__tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ContactSupportProps {
  searchQuery?: string;
}

const ContactSupport: React.FC<ContactSupportProps> = ({ searchQuery }) => {
  return (
    <div className="help-contact">
      <h2 className="help-contact__title">Still need help?</h2>
      <p className="help-contact__description">
        Our support team is available Monday-Friday, 9am-6pm EST
      </p>

      <div className="help-contact__options">
        <a
          href={`mailto:support@quiz2biz.com?subject=Help Request${
            searchQuery ? `: ${searchQuery}` : ''
          }`}
          className="help-contact__option"
        >
          <span className="help-contact__option-icon" aria-hidden="true">
            📧
          </span>
          <span className="help-contact__option-label">Email Support</span>
          <span className="help-contact__option-detail">support@quiz2biz.com</span>
        </a>

        <button
          className="help-contact__option"
          onClick={() => {
            // Open chat widget
            (window as any).Intercom?.('show');
          }}
        >
          <span className="help-contact__option-icon" aria-hidden="true">
            💬
          </span>
          <span className="help-contact__option-label">Live Chat</span>
          <span className="help-contact__option-detail">Avg response: 5 min</span>
        </button>

        <a href="/docs" className="help-contact__option" target="_blank" rel="noopener noreferrer">
          <span className="help-contact__option-icon" aria-hidden="true">
            📖
          </span>
          <span className="help-contact__option-label">Documentation</span>
          <span className="help-contact__option-detail">Full technical docs</span>
        </a>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export interface HelpCenterProps {
  className?: string;
  initialCategory?: FAQCategory;
  initialSearch?: string;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({
  className = '',
  initialCategory = null,
  initialSearch = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | null>(initialCategory);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  // Filter and search FAQ items
  const filteredItems = useMemo(() => {
    let items = FAQ_ITEMS;

    // Filter by category
    if (selectedCategory) {
      items = items.filter((item) => item.category === selectedCategory);
    }

    // Search
    if (searchQuery.trim()) {
      items = searchFAQ(items, searchQuery);
    }

    return items;
  }, [searchQuery, selectedCategory]);

  const handleToggleItem = useCallback((id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleFeedback = useCallback((itemId: string, helpful: boolean) => {
    // In production, send to API
    console.log(`FAQ feedback: ${itemId} - ${helpful ? 'helpful' : 'not helpful'}`);
    // Could update local state or show toast
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.help-search__input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`help-center ${className}`}>
      <header className="help-center__header">
        <h1 className="help-center__title">Help Center</h1>
        <p className="help-center__subtitle">Find answers, browse tutorials, and get support</p>
        <p className="help-center__shortcut">
          <kbd>Ctrl</kbd> + <kbd>K</kbd> to search
        </p>
      </header>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={handleClearSearch}
        resultCount={filteredItems.length}
      />

      <CategoryFilter
        categories={CATEGORIES}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <main className="help-center__content" role="tabpanel">
        {filteredItems.length === 0 ? (
          <div className="help-center__no-results">
            <span className="help-center__no-results-icon" aria-hidden="true">
              🔍
            </span>
            <h2>No results found</h2>
            <p>Try different keywords or browse categories above</p>
            <button
              className="help-center__reset-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="help-center__faq-list" role="list">
            {filteredItems.map((item) => (
              <FAQAccordionItem
                key={item.id}
                item={item}
                isOpen={openItems.has(item.id)}
                onToggle={() => handleToggleItem(item.id)}
                onFeedback={(helpful) => handleFeedback(item.id, helpful)}
              />
            ))}
          </div>
        )}
      </main>

      <ContactSupport searchQuery={searchQuery} />
    </div>
  );
};

// ============================================================================
// Hooks
// ============================================================================

export function useHelpSearch(initialItems: FAQItem[] = FAQ_ITEMS) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchFAQ(initialItems, query), [initialItems, query]);

  return {
    query,
    setQuery,
    results,
    resultCount: results.length,
    hasResults: results.length > 0,
  };
}

export default HelpCenter;
