# Quiz-to-build (Quiz2Biz) - Product Overview

## What is Quiz-to-build?

**Quiz-to-build** (also known as **Quiz2Biz**) is an **Adaptive Client Questionnaire System** that helps businesses assess their technology readiness and generate comprehensive technical documentation packages.

## Core Purpose

The system enables companies to:
1. **Complete interactive questionnaires** about their business and technical requirements
2. **Receive adaptive questions** that adjust based on previous answers
3. **Get scored assessments** across multiple technical dimensions
4. **Generate professional documents** including architecture dossiers, SDLC playbooks, policy packs, and more
5. **Track progress** through visual dashboards and heatmaps

## Target Users (Personas)

The system addresses different stakeholder needs:
- **CTO**: Technical architecture and development standards
- **CFO**: Financial projections and resource planning
- **CEO**: Business strategy and executive summaries
- **BA (Business Analyst)**: Requirements and process documentation
- **Policy**: Compliance and governance documentation

## Key Features

### 1. Adaptive Questionnaire Engine
- **11 question types**: Text, textarea, number, email, URL, date, single choice, multiple choice, scale, file upload, matrix
- **Conditional logic**: Questions adapt based on previous answers
- **Progress tracking**: Visual indicators showing completion status
- **Auto-save**: Preserves answers every 30 seconds
- **Session resume**: Continue where you left off

### 2. Intelligent Scoring System
- **Multi-dimensional scoring**: Evaluates across 7 standard categories:
  - Modern Architecture
  - AI-Assisted Development
  - Coding Standards
  - Testing & QA
  - Security & DevSecOps
  - Workflow & Operations
  - Documentation & Knowledge Management
- **Real-time score updates**: See scores as you answer questions
- **Heatmap visualization**: Visual representation of strengths and weaknesses
- **Gap analysis**: Identifies areas needing improvement

### 3. Document Generation
Automatically generates professional documents including:
- **Architecture Dossier**: Technical architecture documentation
- **SDLC Playbook**: Software development lifecycle processes
- **Test Strategy**: Quality assurance and testing approach
- **DevSecOps Guide**: Security and operations practices
- **Privacy & Data Policy**: Data protection documentation
- **Observability Guide**: Monitoring and logging strategy
- **Finance Documents**: Budget and resource planning
- **Policy Pack**: Governance and compliance policies

### 4. Evidence Registry
- **Track deliverables**: Link evidence to specific requirements
- **Integration**: Connect with GitHub, GitLab, Jira, Confluence, Azure DevOps
- **Evidence types**: Files, images, links, logs, SBOMs, reports, test results, screenshots
- **Compliance tracking**: Ensure all requirements have supporting evidence

### 5. Decision Log & Approval Workflow
- **Record decisions**: Track architectural and technical decisions (ADRs)
- **Two-person rule**: Critical decisions require dual approval
- **Approval categories**: Policy locks, ADR approvals, high-risk decisions, security exceptions
- **Audit trail**: Complete history of decisions and approvals

### 6. Advanced Features
- **Bulk operations**: Upload multiple files at once
- **Keyboard shortcuts**: Power user efficiency (press ? to see shortcuts)
- **Accessibility**: WCAG 2.2 Level AA compliant
- **Offline support**: Draft autosave with IndexedDB
- **Real-time collaboration**: Live updates on scoring and progress
- **Multi-language support**: Internationalization ready
- **Mobile responsive**: Works on all devices

## Technical Stack

### Frontend (Web App)
- **React 19** with TypeScript
- **Vite 7** for build tooling
- **Tailwind CSS 4** for styling
- **React Router 7** for navigation
- **React Query** for data fetching
- **Zustand** for state management

### Backend (API)
- **NestJS** framework
- **PostgreSQL** database
- **Prisma** ORM
- **Redis** for caching
- **JWT** authentication
- **Stripe** for payments
- **Sentry** for error tracking
- **Azure Blob Storage** for file storage

### Testing & Quality
- **Jest** for unit tests (395 tests)
- **Vitest** for web tests (308 tests)
- **Playwright** for E2E tests
- **k6** for load testing
- **Lighthouse** for performance
- **axe-core** for accessibility

## Subscription Tiers

### Free Tier
- 1 questionnaire
- 100 responses
- 3 documents
- 1,000 API calls
- Community support

### Professional ($49/month)
- 10 questionnaires
- 5,000 responses
- 50 documents
- 50,000 API calls
- Email support

### Enterprise ($199/month)
- Unlimited questionnaires
- Unlimited responses
- Unlimited documents
- Unlimited API calls
- Priority support

## Deployment & Infrastructure

- **Cloud Platform**: Microsoft Azure
- **Database**: Azure Database for PostgreSQL
- **Cache**: Azure Cache for Redis
- **Storage**: Azure Blob Storage
- **Monitoring**: Application Insights
- **CI/CD**: Azure Pipelines / GitHub Actions
- **Domain**: quiz2biz.com (planned)

## Security & Compliance

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **CSRF Protection**: Token-based CSRF guard
- **Rate Limiting**: Throttling on API endpoints
- **Input Validation**: Comprehensive validation on all inputs
- **Security Headers**: Helmet.js integration
- **Encryption**: HTTPS with managed SSL certificates
- **Audit Logging**: Complete audit trail of actions
- **GDPR Ready**: Privacy controls and data export

## Performance Characteristics

- **Page Load**: <2.1s LCP (Largest Contentful Paint)
- **Interactivity**: <3.2s TTI (Time to Interactive)
- **API Response**: <150ms average
- **Error Rate**: <0.5%
- **Uptime Target**: 99.9%
- **Concurrent Users**: Tested up to 50 VUs
- **Auto-save Frequency**: Every 30 seconds

## User Experience (UX) Score

**Nielsen 10 Heuristics Score: 94.20/100** ✅

Exceeds production readiness threshold with excellent scores across:
- Visibility of System Status: 98%
- Error Prevention: 96%
- Consistency and Standards: 95%
- User Control and Freedom: 94%
- All other heuristics: 90%+

## Development Status

**Current Status**: Production Ready ✅
- 792/792 tests passing (100%)
- All core features implemented
- Documentation complete
- Security audited
- Performance validated
- Accessibility compliant

**Next Steps**:
- Azure deployment
- Custom domain setup
- Production monitoring
- Load testing at scale
- Beta user onboarding

## Use Cases

### 1. Startup Tech Assessment
A new startup uses the questionnaire to:
- Assess their current technical maturity
- Generate architecture documentation for investors
- Create SDLC processes for their dev team
- Establish security and compliance policies

### 2. Enterprise Modernization
An enterprise uses the system to:
- Evaluate legacy system modernization needs
- Generate gap analysis reports
- Create roadmaps for technical improvements
- Document compliance requirements

### 3. Consultant Deliverables
A consulting firm uses it to:
- Standardize client assessments
- Generate consistent documentation
- Track evidence for recommendations
- Create professional deliverable packages

### 4. Investment Due Diligence
Investors use it to:
- Assess technical risk in potential acquisitions
- Compare technical maturity across portfolio
- Identify areas requiring investment
- Track technical debt

## Support & Resources

- **Documentation**: Comprehensive inline help and tooltips
- **Help Center**: Searchable FAQ with categories
- **Onboarding Tour**: Interactive product walkthrough
- **Video Tutorials**: (Planned)
- **Live Chat**: (Planned)
- **Email Support**: For Professional+ tiers
- **Priority Support**: For Enterprise tier

## License & Ownership

- **Type**: Private/Proprietary
- **Owner**: Avi-Bendetsky
- **Repository**: github.com/Avi-Bendetsky/Quiz-to-build

---

*Last Updated: February 5, 2026*
*Version: 1.0.0*
