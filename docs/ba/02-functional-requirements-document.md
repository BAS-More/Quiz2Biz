# Functional Requirements Document (FRD)
## Software Requirements Specification (SRS)
### Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** 2026-02-07  
**Document Owner:** Business Analyst / Technical Lead  
**Status:** APPROVED

---

## 1. Introduction

### 1.1 Purpose
This Functional Requirements Document (FRD) / Software Requirements Specification (SRS) details how the Adaptive Client Questionnaire System should function to meet the business requirements defined in the BRD. It serves as the primary reference for development, testing, and acceptance.

### 1.2 Scope
This document covers all functional requirements for:
- Web application (React)
- Mobile applications (React Native - iOS/Android)
- API services (Node.js/NestJS)
- Admin portal functionality
- Power Apps connector

### 1.3 Definitions and Acronyms

| Term | Definition |
|------|------------|
| Client | End user completing questionnaires |
| Developer | Admin user with review/management privileges |
| Session | A single questionnaire attempt from start to completion |
| Adaptive Logic | Rules determining question visibility based on answers |
| Document Package | Collection of generated documents from one session |

---

## 2. System Overview

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM CONTEXT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     ┌──────────────┐                           ┌──────────────────┐         │
│     │    Client    │                           │    Developer     │         │
│     │  (Mobile/Web)│                           │   (Web Portal)   │         │
│     └──────┬───────┘                           └────────┬─────────┘         │
│            │                                            │                    │
│            │         ┌──────────────────────┐          │                    │
│            └────────▶│   Adaptive Client    │◀─────────┘                    │
│                      │ Questionnaire System │                               │
│                      └──────────┬───────────┘                               │
│                                 │                                            │
│         ┌───────────────────────┼───────────────────────┐                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐             │
│  │    Auth     │        │   Payment   │        │    Email    │             │
│  │   Provider  │        │   Provider  │        │   Service   │             │
│  │ (Auth0)     │        │  (Stripe)   │        │ (SendGrid)  │             │
│  └─────────────┘        └─────────────┘        └─────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| Guest | Unauthenticated visitor | View marketing, register |
| Client | Authenticated entrepreneur | Create/complete questionnaires, download approved docs |
| Developer | Business consultant/admin | Review documents, manage questions, view analytics |
| Super Admin | System administrator | Full system access, user management |

---

## 3. Functional Requirements

### 3.1 User Authentication & Authorization (FR-100)

#### FR-101: User Registration
**Description:** System shall allow new users to create accounts.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Guest |
| Trigger | User clicks "Sign Up" |

**Input:**
- Email address (required, valid format)
- Password (required, min 12 chars, complexity rules)
- Name (required, 2-100 chars)
- Accepted terms & conditions (required)

**Process:**
1. Validate all input fields
2. Check email uniqueness
3. Hash password using bcrypt/Argon2
4. Create user record with "unverified" status
5. Send verification email
6. Return success message

**Output:**
- Success: User created, verification email sent
- Error: Validation errors returned with field-level detail

**Acceptance Criteria:**
- [ ] User cannot register with existing email
- [ ] Password must meet complexity requirements
- [ ] Verification email sent within 30 seconds
- [ ] User cannot log in until email verified

#### FR-102: Social Login
**Description:** System shall allow users to authenticate via third-party providers.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Guest |
| Providers | Google, Microsoft |

**Process:**
1. User clicks social login button
2. Redirect to provider OAuth flow
3. Receive authorization code
4. Exchange for access token
5. Fetch user profile
6. Create/update user record
7. Issue application JWT

#### FR-103: Login
**Description:** System shall authenticate users with credentials.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Guest |

**Input:**
- Email address
- Password
- Remember me (optional)

**Process:**
1. Validate credentials format
2. Retrieve user by email
3. Compare password hash
4. Check account status (verified, not locked)
5. Generate JWT access token (15 min)
6. Generate refresh token (7 days, 30 if "remember me")
7. Log authentication event

**Security:**
- Lock account after 5 failed attempts (30 min)
- Rate limit: 10 attempts per minute per IP
- Log all authentication attempts

#### FR-104: Multi-Factor Authentication
**Description:** System shall support optional MFA.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Methods | TOTP (Google Authenticator), SMS (backup) |

#### FR-105: Password Reset
**Description:** System shall allow users to reset forgotten passwords.

**Process:**
1. User submits email
2. Generate secure reset token (1 hour expiry)
3. Send reset email
4. User clicks link, enters new password
5. Validate new password, update record
6. Invalidate all existing sessions
7. Send confirmation email

---

### 3.2 Questionnaire Management (FR-200)

#### FR-201: Start New Questionnaire Session
**Description:** System shall allow clients to start a new questionnaire.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Input:**
- Questionnaire type (optional, default: general)
- Industry selection

**Process:**
1. Verify user has active subscription (or free tier eligibility)
2. Create new session record
3. Initialize adaptive state
4. Load first section and question
5. Return session ID and first question

**Output:**
```json
{
  "sessionId": "sess_abc123",
  "status": "IN_PROGRESS",
  "progress": {
    "percentage": 0,
    "currentSection": "Business Foundation",
    "estimatedMinutesRemaining": 45
  },
  "question": {
    "id": "q_001",
    "text": "What is your business name?",
    "type": "TEXT",
    "required": true,
    "helpText": "Enter your registered or proposed business name"
  }
}
```

#### FR-202: Display Question
**Description:** System shall display questions with options, suggestions, and explanations.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Question Display Requirements:**
- Question text (prominent, accessible)
- Help text/tooltip (expandable)
- Explanation of importance (collapsible)
- Input field or options
- Suggested answer (if available)
- Required indicator
- Progress bar
- Section indicator
- Navigation controls

**Question Types Supported:**

| Type | Input | Validation |
|------|-------|------------|
| TEXT | Single-line text | Min/max length, pattern |
| TEXTAREA | Multi-line text | Min/max length |
| NUMBER | Numeric input | Min/max value, decimals |
| EMAIL | Email input | Valid email format |
| URL | URL input | Valid URL format |
| DATE | Date picker | Min/max date |
| SINGLE_CHOICE | Radio buttons | Must select one |
| MULTIPLE_CHOICE | Checkboxes | Min/max selections |
| SCALE | Slider or buttons | Range validation |
| FILE_UPLOAD | File input | Type, size limits |

#### FR-203: Submit Response
**Description:** System shall accept and validate user responses.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Input:**
- Session ID
- Question ID
- Response value

**Process:**
1. Validate session ownership and status
2. Validate response against question rules
3. Store response with timestamp
4. Execute adaptive logic
5. Update progress calculation
6. Determine next question
7. Return next question and updated progress

**Validation:**
- On blur (immediate feedback)
- On submit (prevent invalid progression)
- Clear error messages with resolution guidance

#### FR-204: Adaptive Logic Execution
**Description:** System shall dynamically adjust questions based on responses.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | System |

**Logic Types:**

| Logic | Description | Example |
|-------|-------------|---------|
| Show | Display question if condition met | If industry=SaaS, show API questions |
| Hide | Hide question if condition met | If no employees, hide HR questions |
| Require | Make required if condition met | If B2B, require target company size |
| Skip | Skip section if condition met | If service business, skip inventory |

**Condition Operators:**
- `eq` - equals
- `ne` - not equals
- `gt`, `lt`, `gte`, `lte` - numeric comparisons
- `in`, `not_in` - list membership
- `contains`, `not_contains` - string matching
- `is_empty`, `is_not_empty` - null checks

**Example Rule:**
```json
{
  "condition": {
    "field": "q_industry",
    "operator": "eq",
    "value": "saas"
  },
  "action": "show",
  "targetQuestionIds": ["q_tech_stack", "q_api_needs", "q_cloud_provider"]
}
```

#### FR-205: Progress Tracking
**Description:** System shall display accurate progress information.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Progress Calculation:**
```
Progress % = (Answered Questions / Total Applicable Questions) × 100
```

**Display:**
- Percentage complete (0-100%)
- Current section name and progress
- Estimated time remaining
- Visual progress bar

#### FR-206: Save and Resume
**Description:** System shall persist progress and allow resumption.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Auto-save:**
- Save response immediately on submit
- Auto-save draft responses every 30 seconds
- Persist current position

**Resume:**
- List incomplete sessions on dashboard
- One-click resume to last position
- Show session age and progress

#### FR-207: Session Navigation
**Description:** System shall allow navigation within questionnaire.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Client |

**Navigation Options:**
- Next question (primary action)
- Previous question (review previous answers)
- Jump to section (section overview)
- Save and exit (return to dashboard)

**Constraints:**
- Cannot skip required unanswered questions
- Warning before losing unsaved changes

---

### 3.3 Document Generation (FR-300)

#### FR-301: Trigger Document Generation
**Description:** System shall generate documents upon questionnaire completion.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Trigger:**
- User clicks "Complete Questionnaire"
- All required questions answered
- Validation passed

**Process:**
1. Mark session as complete
2. Queue document generation job
3. For each document type:
   a. Collect relevant responses
   b. Apply to template
   c. Generate content
   d. Render PDF/DOCX
   e. Store in document storage
4. Update session with document references
5. Notify user of completion
6. Queue for developer review

#### FR-302: Document Types
**Description:** System shall generate the following document types.

**CTO Documents (15):**
| ID | Document | Priority |
|----|----------|----------|
| DOC-CTO-01 | Technology Roadmap | Must Have |
| DOC-CTO-02 | Technology Strategy | Must Have |
| DOC-CTO-03 | Product Architecture | Must Have |
| DOC-CTO-04 | API Documentation | Should Have |
| DOC-CTO-05 | Data Models & DB Architecture | Must Have |
| DOC-CTO-06 | User Flow/Journey Maps | Should Have |
| DOC-CTO-07 | Technical Debt Register | Nice to Have |
| DOC-CTO-08 | Information Security Policy | Must Have |
| DOC-CTO-09 | Incident Response Plan | Should Have |
| DOC-CTO-10 | Data Protection Policy | Must Have |
| DOC-CTO-11 | Disaster Recovery Plan | Should Have |
| DOC-CTO-12 | Engineering Handbook | Should Have |
| DOC-CTO-13 | Vendor Management | Nice to Have |
| DOC-CTO-14 | Onboarding/Offboarding | Nice to Have |
| DOC-CTO-15 | IP Assignment/NDA | Must Have |

**CFO Documents (1):**
| ID | Document | Priority |
|----|----------|----------|
| DOC-CFO-01 | Complete Business Plan | Must Have |

**BA Documents (9):**
| ID | Document | Priority |
|----|----------|----------|
| DOC-BA-01 | Business Requirements Document | Must Have |
| DOC-BA-02 | Functional Requirements Document | Must Have |
| DOC-BA-03 | Process Maps/Flowcharts | Should Have |
| DOC-BA-04 | User Stories/Use Cases | Must Have |
| DOC-BA-05 | Requirements Traceability Matrix | Nice to Have |
| DOC-BA-06 | Stakeholder Analysis | Should Have |
| DOC-BA-07 | Business Case | Must Have |
| DOC-BA-08 | Wireframes/Mockups | Should Have |
| DOC-BA-09 | Change Request Document | Nice to Have |

#### FR-303: Document Preview
**Description:** System shall allow preview of generated documents.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Client, Developer |

**Features:**
- In-browser PDF rendering
- Page navigation
- Zoom controls
- Search within document

#### FR-304: Document Download
**Description:** System shall allow download of approved documents.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Prerequisites:**
- Document approved by developer
- User has active subscription

**Output Formats:**
- PDF (primary)
- DOCX (optional)

**Download Options:**
- Individual document
- Full package (ZIP)

---

### 3.4 Developer/Admin Functions (FR-400)

#### FR-401: Review Queue
**Description:** System shall display pending documents for review.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Developer |

**Display:**
- List of pending reviews
- Sort by date, priority, client
- Filter by document type
- Quick preview capability

#### FR-402: Document Review
**Description:** System shall allow developers to review and approve documents.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Developer |

**Actions:**
- Approve: Release for client download
- Reject: Send back with comments
- Request Changes: Partial approval with feedback

**Process:**
1. Developer opens document
2. Reviews content for completeness/accuracy
3. Adds comments (internal or client-visible)
4. Sets status (Approved/Rejected/Changes Requested)
5. Client notified of decision

#### FR-403: Question Bank Management
**Description:** System shall allow developers to manage questions.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Developer, Super Admin |

**Operations:**
- View all questions
- Create new question
- Edit existing question
- Deactivate question
- Configure visibility rules
- Set industry tags
- Map to document sections

#### FR-404: Analytics Dashboard
**Description:** System shall provide usage analytics.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Developer, Super Admin |

**Metrics:**
- Active sessions
- Completion rates
- Average completion time
- Question drop-off points
- Document generation stats
- User growth

---

### 3.5 Notifications (FR-500)

#### FR-501: Email Notifications
**Description:** System shall send email notifications for key events.

| Event | Recipient | Timing |
|-------|-----------|--------|
| Welcome | Client | On registration |
| Email Verification | Client | On registration |
| Session Reminder | Client | 3 days after last activity |
| Documents Ready | Client | On generation complete |
| Documents Approved | Client | On approval |
| Review Pending | Developer | On new submission |
| Password Reset | User | On request |

#### FR-502: In-App Notifications
**Description:** System shall display in-app notifications.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |

**Features:**
- Notification bell with count
- Notification list (mark as read)
- Push notifications (mobile)

---

### 3.6 Payment & Subscription (FR-600)

#### FR-601: Subscription Plans
**Description:** System shall support tiered subscription plans.

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 questionnaire, limited documents |
| Professional | $49/mo | Unlimited questionnaires, all documents |
| Enterprise | Custom | Team features, API access, custom templates |

#### FR-602: Payment Processing
**Description:** System shall process payments via Stripe.

**Operations:**
- Subscribe to plan
- Update payment method
- Cancel subscription
- View billing history
- Handle failed payments

---

## 4. Interface Requirements

### 4.1 User Interface Requirements

| Requirement | Specification |
|-------------|---------------|
| Responsive Breakpoints | 320px, 768px, 1024px, 1440px |
| Touch Targets | Minimum 44x44px |
| Color Contrast | 4.5:1 (text), 3:1 (UI elements) |
| Focus Indicators | Visible on all interactive elements |
| Loading States | Skeleton loaders for >300ms operations |
| Empty States | Designed states for empty lists/dashboards |
| Dark Mode | Support prefers-color-scheme |
| Button States | Idle, Hover, Active, Disabled |

### 4.2 API Interface Requirements

| Requirement | Specification |
|-------------|---------------|
| Protocol | HTTPS (TLS 1.3) |
| Format | JSON |
| Authentication | Bearer JWT |
| Versioning | URL path (/v1/) |
| Rate Limiting | 100/min (Client), 1000/min (Developer) |
| Error Format | Standardized error envelope |

---

## 5. Data Requirements

### 5.1 Data Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| User | System user | id, email, role, profile |
| Session | Questionnaire attempt | id, userId, status, progress |
| Response | Answer to question | id, sessionId, questionId, value |
| Question | Questionnaire question | id, text, type, options, rules |
| Document | Generated document | id, sessionId, type, status, url |

### 5.2 Data Retention

| Data Type | Retention | Deletion |
|-----------|-----------|----------|
| User Account | Until deletion requested | 30-day grace period |
| Sessions | 2 years (active) | Automated after 2 years |
| Documents | User-controlled | On user request |
| Audit Logs | 7 years | Automated |

---

## 6. Quality Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Page Load (LCP) | <2.5s |
| Time to Interactive | <3.5s |
| API Response (p95) | <500ms |
| Document Generation | <60s |

### 6.2 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Data Durability | 99.999999999% |
| Backup RPO | 1 hour |
| Recovery RTO | 4 hours |

### 6.3 Security

| Requirement | Implementation |
|-------------|----------------|
| OWASP Top 10 | All mitigations implemented |
| Penetration Testing | Annual third-party test |
| Vulnerability Scanning | Weekly automated scans |
| Security Training | Annual for all developers |

---

## 7. Traceability

See [Requirements Traceability Matrix](./05-requirements-traceability-matrix.md) for mapping between business requirements, functional requirements, and test cases.

---

## 8. Related Documents

- [Business Requirements Document](./01-business-requirements-document.md)
- [User Stories](./04-user-stories-use-cases.md)
- [Process Maps](./03-process-maps-flowcharts.md)
- [Wireframes](./08-wireframes-mockups.md)
- [Product Architecture](../cto/03-product-architecture.md)
- [API Documentation](../cto/04-api-documentation.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Business Analyst | {{BA_NAME}} | | |
| Technical Lead | {{TECH_LEAD}} | | |
| QA Lead | {{QA_LEAD}} | | |
# Functional Requirements Document (FRD)
## Software Requirements Specification (SRS)
### Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** 2026-02-07  
**Document Owner:** Business Analyst / Technical Lead  
**Status:** APPROVED

---

## 1. Introduction

### 1.1 Purpose
This Functional Requirements Document (FRD) / Software Requirements Specification (SRS) details how the Adaptive Client Questionnaire System should function to meet the business requirements defined in the BRD. It serves as the primary reference for development, testing, and acceptance.

### 1.2 Scope
This document covers all functional requirements for:
- Web application (React)
- Mobile applications (React Native - iOS/Android)
- API services (Node.js/NestJS)
- Admin portal functionality
- Power Apps connector

### 1.3 Definitions and Acronyms

| Term | Definition |
|------|------------|
| Client | End user completing questionnaires |
| Developer | Admin user with review/management privileges |
| Session | A single questionnaire attempt from start to completion |
| Adaptive Logic | Rules determining question visibility based on answers |
| Document Package | Collection of generated documents from one session |

---

## 2. System Overview

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM CONTEXT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     ┌──────────────┐                           ┌──────────────────┐         │
│     │    Client    │                           │    Developer     │         │
│     │  (Mobile/Web)│                           │   (Web Portal)   │         │
│     └──────┬───────┘                           └────────┬─────────┘         │
│            │                                            │                    │
│            │         ┌──────────────────────┐          │                    │
│            └────────▶│   Adaptive Client    │◀─────────┘                    │
│                      │ Questionnaire System │                               │
│                      └──────────┬───────────┘                               │
│                                 │                                            │
│         ┌───────────────────────┼───────────────────────┐                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐             │
│  │    Auth     │        │   Payment   │        │    Email    │             │
│  │   Provider  │        │   Provider  │        │   Service   │             │
│  │ (Auth0)     │        │  (Stripe)   │        │ (SendGrid)  │             │
│  └─────────────┘        └─────────────┘        └─────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| Guest | Unauthenticated visitor | View marketing, register |
| Client | Authenticated entrepreneur | Create/complete questionnaires, download approved docs |
| Developer | Business consultant/admin | Review documents, manage questions, view analytics |
| Super Admin | System administrator | Full system access, user management |

---

## 3. Functional Requirements

### 3.1 User Authentication & Authorization (FR-100)

#### FR-101: User Registration
**Description:** System shall allow new users to create accounts.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Guest |
| Trigger | User clicks "Sign Up" |

**Input:**
- Email address (required, valid format)
- Password (required, min 12 chars, complexity rules)
- Name (required, 2-100 chars)
- Accepted terms & conditions (required)

**Process:**
1. Validate all input fields
2. Check email uniqueness
3. Hash password using bcrypt/Argon2
4. Create user record with "unverified" status
5. Send verification email
6. Return success message

**Output:**
- Success: User created, verification email sent
- Error: Validation errors returned with field-level detail

**Acceptance Criteria:**
- [ ] User cannot register with existing email
- [ ] Password must meet complexity requirements
- [ ] Verification email sent within 30 seconds
- [ ] User cannot log in until email verified

#### FR-102: Social Login
**Description:** System shall allow users to authenticate via third-party providers.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Guest |
| Providers | Google, Microsoft |

**Process:**
1. User clicks social login button
2. Redirect to provider OAuth flow
3. Receive authorization code
4. Exchange for access token
5. Fetch user profile
6. Create/update user record
7. Issue application JWT

#### FR-103: Login
**Description:** System shall authenticate users with credentials.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Guest |

**Input:**
- Email address
- Password
- Remember me (optional)

**Process:**
1. Validate credentials format
2. Retrieve user by email
3. Compare password hash
4. Check account status (verified, not locked)
5. Generate JWT access token (15 min)
6. Generate refresh token (7 days, 30 if "remember me")
7. Log authentication event

**Security:**
- Lock account after 5 failed attempts (30 min)
- Rate limit: 10 attempts per minute per IP
- Log all authentication attempts

#### FR-104: Multi-Factor Authentication
**Description:** System shall support optional MFA.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Methods | TOTP (Google Authenticator), SMS (backup) |

#### FR-105: Password Reset
**Description:** System shall allow users to reset forgotten passwords.

**Process:**
1. User submits email
2. Generate secure reset token (1 hour expiry)
3. Send reset email
4. User clicks link, enters new password
5. Validate new password, update record
6. Invalidate all existing sessions
7. Send confirmation email

---

### 3.2 Questionnaire Management (FR-200)

#### FR-201: Start New Questionnaire Session
**Description:** System shall allow clients to start a new questionnaire.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Input:**
- Questionnaire type (optional, default: general)
- Industry selection

**Process:**
1. Verify user has active subscription (or free tier eligibility)
2. Create new session record
3. Initialize adaptive state
4. Load first section and question
5. Return session ID and first question

**Output:**
```json
{
  "sessionId": "sess_abc123",
  "status": "IN_PROGRESS",
  "progress": {
    "percentage": 0,
    "currentSection": "Business Foundation",
    "estimatedMinutesRemaining": 45
  },
  "question": {
    "id": "q_001",
    "text": "What is your business name?",
    "type": "TEXT",
    "required": true,
    "helpText": "Enter your registered or proposed business name"
  }
}
```

#### FR-202: Display Question
**Description:** System shall display questions with options, suggestions, and explanations.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Question Display Requirements:**
- Question text (prominent, accessible)
- Help text/tooltip (expandable)
- Explanation of importance (collapsible)
- Input field or options
- Suggested answer (if available)
- Required indicator
- Progress bar
- Section indicator
- Navigation controls

**Question Types Supported:**

| Type | Input | Validation |
|------|-------|------------|
| TEXT | Single-line text | Min/max length, pattern |
| TEXTAREA | Multi-line text | Min/max length |
| NUMBER | Numeric input | Min/max value, decimals |
| EMAIL | Email input | Valid email format |
| URL | URL input | Valid URL format |
| DATE | Date picker | Min/max date |
| SINGLE_CHOICE | Radio buttons | Must select one |
| MULTIPLE_CHOICE | Checkboxes | Min/max selections |
| SCALE | Slider or buttons | Range validation |
| FILE_UPLOAD | File input | Type, size limits |

#### FR-203: Submit Response
**Description:** System shall accept and validate user responses.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Input:**
- Session ID
- Question ID
- Response value

**Process:**
1. Validate session ownership and status
2. Validate response against question rules
3. Store response with timestamp
4. Execute adaptive logic
5. Update progress calculation
6. Determine next question
7. Return next question and updated progress

**Validation:**
- On blur (immediate feedback)
- On submit (prevent invalid progression)
- Clear error messages with resolution guidance

#### FR-204: Adaptive Logic Execution
**Description:** System shall dynamically adjust questions based on responses.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | System |

**Logic Types:**

| Logic | Description | Example |
|-------|-------------|---------|
| Show | Display question if condition met | If industry=SaaS, show API questions |
| Hide | Hide question if condition met | If no employees, hide HR questions |
| Require | Make required if condition met | If B2B, require target company size |
| Skip | Skip section if condition met | If service business, skip inventory |

**Condition Operators:**
- `eq` - equals
- `ne` - not equals
- `gt`, `lt`, `gte`, `lte` - numeric comparisons
- `in`, `not_in` - list membership
- `contains`, `not_contains` - string matching
- `is_empty`, `is_not_empty` - null checks

**Example Rule:**
```json
{
  "condition": {
    "field": "q_industry",
    "operator": "eq",
    "value": "saas"
  },
  "action": "show",
  "targetQuestionIds": ["q_tech_stack", "q_api_needs", "q_cloud_provider"]
}
```

#### FR-205: Progress Tracking
**Description:** System shall display accurate progress information.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Progress Calculation:**
```
Progress % = (Answered Questions / Total Applicable Questions) × 100
```

**Display:**
- Percentage complete (0-100%)
- Current section name and progress
- Estimated time remaining
- Visual progress bar

#### FR-206: Save and Resume
**Description:** System shall persist progress and allow resumption.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Auto-save:**
- Save response immediately on submit
- Auto-save draft responses every 30 seconds
- Persist current position

**Resume:**
- List incomplete sessions on dashboard
- One-click resume to last position
- Show session age and progress

#### FR-207: Session Navigation
**Description:** System shall allow navigation within questionnaire.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Client |

**Navigation Options:**
- Next question (primary action)
- Previous question (review previous answers)
- Jump to section (section overview)
- Save and exit (return to dashboard)

**Constraints:**
- Cannot skip required unanswered questions
- Warning before losing unsaved changes

---

### 3.3 Document Generation (FR-300)

#### FR-301: Trigger Document Generation
**Description:** System shall generate documents upon questionnaire completion.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Trigger:**
- User clicks "Complete Questionnaire"
- All required questions answered
- Validation passed

**Process:**
1. Mark session as complete
2. Queue document generation job
3. For each document type:
   a. Collect relevant responses
   b. Apply to template
   c. Generate content
   d. Render PDF/DOCX
   e. Store in document storage
4. Update session with document references
5. Notify user of completion
6. Queue for developer review

#### FR-302: Document Types
**Description:** System shall generate the following document types.

**CTO Documents (15):**
| ID | Document | Priority |
|----|----------|----------|
| DOC-CTO-01 | Technology Roadmap | Must Have |
| DOC-CTO-02 | Technology Strategy | Must Have |
| DOC-CTO-03 | Product Architecture | Must Have |
| DOC-CTO-04 | API Documentation | Should Have |
| DOC-CTO-05 | Data Models & DB Architecture | Must Have |
| DOC-CTO-06 | User Flow/Journey Maps | Should Have |
| DOC-CTO-07 | Technical Debt Register | Nice to Have |
| DOC-CTO-08 | Information Security Policy | Must Have |
| DOC-CTO-09 | Incident Response Plan | Should Have |
| DOC-CTO-10 | Data Protection Policy | Must Have |
| DOC-CTO-11 | Disaster Recovery Plan | Should Have |
| DOC-CTO-12 | Engineering Handbook | Should Have |
| DOC-CTO-13 | Vendor Management | Nice to Have |
| DOC-CTO-14 | Onboarding/Offboarding | Nice to Have |
| DOC-CTO-15 | IP Assignment/NDA | Must Have |

**CFO Documents (1):**
| ID | Document | Priority |
|----|----------|----------|
| DOC-CFO-01 | Complete Business Plan | Must Have |

**BA Documents (9):**
| ID | Document | Priority |
|----|----------|----------|
| DOC-BA-01 | Business Requirements Document | Must Have |
| DOC-BA-02 | Functional Requirements Document | Must Have |
| DOC-BA-03 | Process Maps/Flowcharts | Should Have |
| DOC-BA-04 | User Stories/Use Cases | Must Have |
| DOC-BA-05 | Requirements Traceability Matrix | Nice to Have |
| DOC-BA-06 | Stakeholder Analysis | Should Have |
| DOC-BA-07 | Business Case | Must Have |
| DOC-BA-08 | Wireframes/Mockups | Should Have |
| DOC-BA-09 | Change Request Document | Nice to Have |

#### FR-303: Document Preview
**Description:** System shall allow preview of generated documents.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Client, Developer |

**Features:**
- In-browser PDF rendering
- Page navigation
- Zoom controls
- Search within document

#### FR-304: Document Download
**Description:** System shall allow download of approved documents.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Client |

**Prerequisites:**
- Document approved by developer
- User has active subscription

**Output Formats:**
- PDF (primary)
- DOCX (optional)

**Download Options:**
- Individual document
- Full package (ZIP)

---

### 3.4 Developer/Admin Functions (FR-400)

#### FR-401: Review Queue
**Description:** System shall display pending documents for review.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Developer |

**Display:**
- List of pending reviews
- Sort by date, priority, client
- Filter by document type
- Quick preview capability

#### FR-402: Document Review
**Description:** System shall allow developers to review and approve documents.

| Attribute | Value |
|-----------|-------|
| Priority | Must Have |
| Actor | Developer |

**Actions:**
- Approve: Release for client download
- Reject: Send back with comments
- Request Changes: Partial approval with feedback

**Process:**
1. Developer opens document
2. Reviews content for completeness/accuracy
3. Adds comments (internal or client-visible)
4. Sets status (Approved/Rejected/Changes Requested)
5. Client notified of decision

#### FR-403: Question Bank Management
**Description:** System shall allow developers to manage questions.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Developer, Super Admin |

**Operations:**
- View all questions
- Create new question
- Edit existing question
- Deactivate question
- Configure visibility rules
- Set industry tags
- Map to document sections

#### FR-404: Analytics Dashboard
**Description:** System shall provide usage analytics.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |
| Actor | Developer, Super Admin |

**Metrics:**
- Active sessions
- Completion rates
- Average completion time
- Question drop-off points
- Document generation stats
- User growth

---

### 3.5 Notifications (FR-500)

#### FR-501: Email Notifications
**Description:** System shall send email notifications for key events.

| Event | Recipient | Timing |
|-------|-----------|--------|
| Welcome | Client | On registration |
| Email Verification | Client | On registration |
| Session Reminder | Client | 3 days after last activity |
| Documents Ready | Client | On generation complete |
| Documents Approved | Client | On approval |
| Review Pending | Developer | On new submission |
| Password Reset | User | On request |

#### FR-502: In-App Notifications
**Description:** System shall display in-app notifications.

| Attribute | Value |
|-----------|-------|
| Priority | Should Have |

**Features:**
- Notification bell with count
- Notification list (mark as read)
- Push notifications (mobile)

---

### 3.6 Payment & Subscription (FR-600)

#### FR-601: Subscription Plans
**Description:** System shall support tiered subscription plans.

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 questionnaire, limited documents |
| Professional | $49/mo | Unlimited questionnaires, all documents |
| Enterprise | Custom | Team features, API access, custom templates |

#### FR-602: Payment Processing
**Description:** System shall process payments via Stripe.

**Operations:**
- Subscribe to plan
- Update payment method
- Cancel subscription
- View billing history
- Handle failed payments

---

## 4. Interface Requirements

### 4.1 User Interface Requirements

| Requirement | Specification |
|-------------|---------------|
| Responsive Breakpoints | 320px, 768px, 1024px, 1440px |
| Touch Targets | Minimum 44x44px |
| Color Contrast | 4.5:1 (text), 3:1 (UI elements) |
| Focus Indicators | Visible on all interactive elements |
| Loading States | Skeleton loaders for >300ms operations |
| Empty States | Designed states for empty lists/dashboards |
| Dark Mode | Support prefers-color-scheme |
| Button States | Idle, Hover, Active, Disabled |

### 4.2 API Interface Requirements

| Requirement | Specification |
|-------------|---------------|
| Protocol | HTTPS (TLS 1.3) |
| Format | JSON |
| Authentication | Bearer JWT |
| Versioning | URL path (/v1/) |
| Rate Limiting | 100/min (Client), 1000/min (Developer) |
| Error Format | Standardized error envelope |

---

## 5. Data Requirements

### 5.1 Data Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| User | System user | id, email, role, profile |
| Session | Questionnaire attempt | id, userId, status, progress |
| Response | Answer to question | id, sessionId, questionId, value |
| Question | Questionnaire question | id, text, type, options, rules |
| Document | Generated document | id, sessionId, type, status, url |

### 5.2 Data Retention

| Data Type | Retention | Deletion |
|-----------|-----------|----------|
| User Account | Until deletion requested | 30-day grace period |
| Sessions | 2 years (active) | Automated after 2 years |
| Documents | User-controlled | On user request |
| Audit Logs | 7 years | Automated |

---

## 6. Quality Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Page Load (LCP) | <2.5s |
| Time to Interactive | <3.5s |
| API Response (p95) | <500ms |
| Document Generation | <60s |

### 6.2 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Data Durability | 99.999999999% |
| Backup RPO | 1 hour |
| Recovery RTO | 4 hours |

### 6.3 Security

| Requirement | Implementation |
|-------------|----------------|
| OWASP Top 10 | All mitigations implemented |
| Penetration Testing | Annual third-party test |
| Vulnerability Scanning | Weekly automated scans |
| Security Training | Annual for all developers |

---

## 7. Traceability

See [Requirements Traceability Matrix](./05-requirements-traceability-matrix.md) for mapping between business requirements, functional requirements, and test cases.

---

## 8. Related Documents

- [Business Requirements Document](./01-business-requirements-document.md)
- [User Stories](./04-user-stories-use-cases.md)
- [Process Maps](./03-process-maps-flowcharts.md)
- [Wireframes](./08-wireframes-mockups.md)
- [Product Architecture](../cto/03-product-architecture.md)
- [API Documentation](../cto/04-api-documentation.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Business Analyst | {{BA_NAME}} | | |
| Technical Lead | {{TECH_LEAD}} | | |
| QA Lead | {{QA_LEAD}} | | |
