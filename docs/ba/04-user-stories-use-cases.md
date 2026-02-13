# User Stories and Use Cases
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** Business Analyst / Product Owner  
**Status:** {{STATUS}}

---

## 1. Introduction

This document defines user stories and use cases for the Adaptive Client Questionnaire System, following Agile methodologies. Each user story follows the format: "As a [role], I want [feature], so that [benefit]."

---

## 2. Epic Overview

| Epic ID | Epic Name | Description | Priority |
|---------|-----------|-------------|----------|
| EPIC-01 | User Management | Registration, authentication, profiles | High |
| EPIC-02 | Questionnaire | Core question/answer functionality | High |
| EPIC-03 | Document Generation | Creating and managing documents | High |
| EPIC-04 | Admin Portal | Developer/admin functionality | Medium |
| EPIC-05 | Notifications | Email and in-app notifications | Medium |
| EPIC-06 | Billing | Subscriptions and payments | Medium |
| EPIC-07 | Analytics | Usage tracking and reporting | Low |

---

## 3. User Stories by Epic

### 3.1 EPIC-01: User Management

#### US-001: User Registration
**As a** guest visitor  
**I want to** create an account with my email and password  
**So that** I can access the questionnaire system

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] User can enter email, password, and name
- [ ] Password must be at least 12 characters with complexity
- [ ] System validates email format and uniqueness
- [ ] Verification email is sent within 30 seconds
- [ ] User cannot log in until email is verified
- [ ] Clear error messages for invalid inputs

**Technical Notes:**
- Use bcrypt/Argon2 for password hashing
- JWT for session management
- Rate limit registration attempts

---

#### US-002: Social Login
**As a** guest visitor  
**I want to** sign up using my Google or Microsoft account  
**So that** I don't have to remember another password

**Priority:** Should Have  
**Story Points:** 8

**Acceptance Criteria:**
- [ ] Google OAuth button is visible on login/register pages
- [ ] Microsoft OAuth button is visible
- [ ] First social login creates account automatically
- [ ] Subsequent logins authenticate existing account
- [ ] User profile populated from OAuth provider

---

#### US-003: Login
**As a** registered user  
**I want to** log in with my credentials  
**So that** I can access my questionnaires and documents

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] User can enter email and password
- [ ] "Remember me" option available (extends session)
- [ ] Account locks after 5 failed attempts
- [ ] Clear error message for invalid credentials
- [ ] Redirect to dashboard after successful login

---

#### US-004: Password Reset
**As a** user who forgot their password  
**I want to** reset my password via email  
**So that** I can regain access to my account

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Forgot password" link on login page
- [ ] Reset email sent within 1 minute
- [ ] Reset link expires after 1 hour
- [ ] New password must meet complexity requirements
- [ ] All existing sessions invalidated after reset

---

#### US-005: Profile Management
**As a** logged-in user  
**I want to** update my profile information  
**So that** my generated documents have accurate details

**Priority:** Should Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] User can update name, phone, company name
- [ ] User can upload profile picture
- [ ] User can change notification preferences
- [ ] Changes saved immediately

---

#### US-006: Enable MFA
**As a** security-conscious user  
**I want to** enable two-factor authentication  
**So that** my account is more secure

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Option to enable MFA in security settings
- [ ] Support for authenticator apps (TOTP)
- [ ] Backup codes provided
- [ ] MFA required on subsequent logins
- [ ] Option to disable MFA (with verification)

---

### 3.2 EPIC-02: Questionnaire

#### US-010: Start New Questionnaire
**As a** client user  
**I want to** start a new questionnaire session  
**So that** I can begin generating my business documents

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] "Start New Questionnaire" button on dashboard
- [ ] Industry selection screen displayed first
- [ ] Session created with unique ID
- [ ] First question displayed after selection
- [ ] Progress shows 0% at start

---

#### US-011: View Question with Options
**As a** client user  
**I want to** see a question with multiple choice options and explanations  
**So that** I can make an informed decision

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Question text prominently displayed
- [ ] All options visible with descriptions
- [ ] Help text available (expandable)
- [ ] Suggested answer highlighted (if applicable)
- [ ] Required indicator shown
- [ ] Accessible for screen readers

---

#### US-012: Submit Answer
**As a** client user  
**I want to** submit my answer and see the next question  
**So that** I can progress through the questionnaire

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Answer validated on submission
- [ ] Clear error message if validation fails
- [ ] Progress bar updates
- [ ] Next question loads within 1 second
- [ ] Adaptive logic applied (relevant questions shown)

---

#### US-013: See Progress
**As a** client user  
**I want to** see my completion progress  
**So that** I know how much more I need to complete

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Progress percentage displayed
- [ ] Current section name shown
- [ ] Visual progress bar
- [ ] Estimated time remaining shown
- [ ] Progress updates after each answer

---

#### US-014: Save and Exit
**As a** client user  
**I want to** save my progress and exit  
**So that** I can continue later

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Save and Exit" button available
- [ ] Progress auto-saved every 30 seconds
- [ ] Confirmation message shown
- [ ] Session appears on dashboard for resumption

---

#### US-015: Resume Session
**As a** client user  
**I want to** resume an incomplete questionnaire  
**So that** I don't have to start over

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Incomplete sessions listed on dashboard
- [ ] Shows last activity date and progress
- [ ] One-click to resume
- [ ] Resumes at exact question left off

---

#### US-016: Navigate Back
**As a** client user  
**I want to** go back to previous questions  
**So that** I can review or change my answers

**Priority:** Should Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Previous" button available
- [ ] Previous answer pre-filled
- [ ] Can edit and resubmit
- [ ] Adaptive logic re-evaluated if answer changes

---

#### US-017: Skip Optional Question
**As a** client user  
**I want to** skip optional questions  
**So that** I can complete the questionnaire faster

**Priority:** Should Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Skip button shown for optional questions
- [ ] Required questions cannot be skipped
- [ ] Progress still advances
- [ ] Can return to skipped questions later

---

#### US-018: Industry-Specific Questions
**As a** client user  
**I want to** answer questions relevant to my industry  
**So that** my documents are tailored to my business

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Industry selection affects question set
- [ ] Industry-specific questions shown
- [ ] Irrelevant questions hidden
- [ ] Document templates adjusted for industry

---

### 3.3 EPIC-03: Document Generation

#### US-020: Complete Questionnaire
**As a** client user  
**I want to** mark my questionnaire as complete  
**So that** document generation can begin

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Complete" button shown when all required questions answered
- [ ] Summary review screen shown
- [ ] Confirmation dialog before submission
- [ ] Status changes to "Generating Documents"

---

#### US-021: Receive Notification on Generation Complete
**As a** client user  
**I want to** be notified when my documents are generated  
**So that** I know they're ready for review

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Email sent when generation complete
- [ ] In-app notification shown
- [ ] Push notification on mobile
- [ ] Link to view documents in notification

---

#### US-022: Preview Document
**As a** client user  
**I want to** preview my generated documents  
**So that** I can see what was created

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] PDF preview in browser
- [ ] Page navigation controls
- [ ] Zoom functionality
- [ ] Works on mobile devices

---

#### US-023: Download Approved Documents
**As a** client user  
**I want to** download my approved documents  
**So that** I can use them for my business

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Download button for approved documents
- [ ] PDF and DOCX format options
- [ ] Individual or bulk download (ZIP)
- [ ] Download only available for approved docs

---

#### US-024: View Document Status
**As a** client user  
**I want to** see the status of my documents  
**So that** I know if they're pending review or approved

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Status badges on document list
- [ ] Statuses: Generating, Pending Review, Approved, Rejected
- [ ] Filter by status
- [ ] Timestamp of last status change

---

### 3.4 EPIC-04: Admin Portal

#### US-030: View Review Queue
**As a** developer  
**I want to** see all pending document reviews  
**So that** I can prioritize my work

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] List of all pending reviews
- [ ] Sort by date, client, priority
- [ ] Filter by document type
- [ ] Show client name and submission date
- [ ] Badge showing queue count

---

#### US-031: Review Document
**As a** developer  
**I want to** review a submitted document  
**So that** I can ensure quality before client download

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Full document preview
- [ ] View client's questionnaire answers
- [ ] Add internal comments
- [ ] Add client-visible comments
- [ ] Approve/Reject/Request Changes buttons

---

#### US-032: Approve Document
**As a** developer  
**I want to** approve a document  
**So that** the client can download it

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Approval with optional comments
- [ ] Document status changes to Approved
- [ ] Client notified automatically
- [ ] Audit trail recorded

---

#### US-033: Reject Document
**As a** developer  
**I want to** reject a document with feedback  
**So that** the client knows what needs to change

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Rejection requires comment
- [ ] Document status changes to Rejected
- [ ] Client notified with feedback
- [ ] Client can revise and resubmit

---

#### US-034: Manage Questions
**As a** developer  
**I want to** add, edit, and remove questions  
**So that** I can keep the questionnaire current

**Priority:** Should Have  
**Story Points:** 8

**Acceptance Criteria:**
- [ ] CRUD operations for questions
- [ ] Set question type, options, validation
- [ ] Configure visibility rules
- [ ] Tag questions by industry
- [ ] Preview question as client sees it

---

#### US-035: View Analytics Dashboard
**As a** developer  
**I want to** see usage analytics  
**So that** I can understand how clients use the system

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Active sessions count
- [ ] Completion rate chart
- [ ] Average completion time
- [ ] Question drop-off analysis
- [ ] User growth trends

---

### 3.5 EPIC-05: Notifications

#### US-040: Receive Welcome Email
**As a** new user  
**I want to** receive a welcome email  
**So that** I know my registration was successful

**Priority:** Should Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Email sent immediately after verification
- [ ] Contains getting started guide
- [ ] Links to help resources

---

#### US-041: Receive Reminder Email
**As a** user with incomplete questionnaire  
**I want to** receive a reminder  
**So that** I don't forget to complete it

**Priority:** Nice to Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Reminder sent after 3 days of inactivity
- [ ] Shows current progress
- [ ] One-click resume link
- [ ] Can unsubscribe from reminders

---

#### US-042: In-App Notifications
**As a** logged-in user  
**I want to** see notifications in the app  
**So that** I'm aware of updates without checking email

**Priority:** Should Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Notification bell icon
- [ ] Unread count badge
- [ ] Notification dropdown list
- [ ] Mark as read functionality

---

### 3.6 EPIC-06: Billing

#### US-050: Subscribe to Plan
**As a** user  
**I want to** subscribe to a paid plan  
**So that** I can access all features

**Priority:** Must Have  
**Story Points:** 8

**Acceptance Criteria:**
- [ ] Display available plans
- [ ] Select plan and enter payment info
- [ ] Process payment via Stripe
- [ ] Immediate access to features
- [ ] Confirmation email sent

---

#### US-051: Manage Subscription
**As a** subscriber  
**I want to** view and manage my subscription  
**So that** I can upgrade, downgrade, or cancel

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] View current plan
- [ ] View billing history
- [ ] Update payment method
- [ ] Cancel subscription
- [ ] Understand cancellation implications

---

---

## 4. Use Cases (Detailed)

### 4.1 UC-001: Complete Questionnaire Session

**Use Case ID:** UC-001  
**Use Case Name:** Complete Questionnaire Session  
**Actor:** Client  
**Description:** Client completes full questionnaire from start to document generation.

**Preconditions:**
1. User is authenticated
2. User has active subscription (or free tier eligibility)

**Main Flow:**
1. Client navigates to dashboard
2. Client clicks "Start New Questionnaire"
3. System displays industry selection
4. Client selects industry
5. System creates new session
6. System displays first question
7. Client enters answer
8. Client clicks "Next"
9. System validates answer
10. System stores response
11. System executes adaptive logic
12. System displays next question
13. Repeat steps 7-12 until all questions answered
14. System displays completion summary
15. Client clicks "Complete"
16. System marks session complete
17. System triggers document generation
18. System notifies client

**Alternative Flows:**

*A1: Validation Error (step 9)*
1. System displays error message
2. Client corrects answer
3. Continue from step 8

*A2: Save and Exit (any step)*
1. Client clicks "Save and Exit"
2. System saves current state
3. Client can resume later

*A3: Navigate Back (any step)*
1. Client clicks "Previous"
2. System displays previous question with answer
3. Client can edit and continue

**Postconditions:**
1. Session marked as complete
2. Document generation queued
3. Client notified

**Business Rules:**
- Required questions must be answered
- Session expires after 90 days if incomplete
- Adaptive logic determines question visibility

---

### 4.2 UC-002: Review and Approve Document

**Use Case ID:** UC-002  
**Use Case Name:** Review and Approve Document  
**Actor:** Developer  
**Description:** Developer reviews generated documents and approves for client download.

**Preconditions:**
1. Developer is authenticated with Developer role
2. Documents pending review exist

**Main Flow:**
1. Developer navigates to Admin Portal
2. Developer opens Review Queue
3. System displays pending reviews
4. Developer selects a submission
5. System loads document package
6. Developer opens first document
7. System displays PDF preview
8. Developer reviews content
9. Developer adds comments (optional)
10. Developer clicks "Approve"
11. System updates document status
12. System notifies client
13. Repeat steps 6-12 for remaining documents

**Alternative Flows:**

*A1: Reject Document (step 10)*
1. Developer clicks "Reject"
2. Developer enters required feedback
3. System updates status to Rejected
4. System notifies client with feedback

*A2: Request Changes (step 10)*
1. Developer clicks "Request Changes"
2. Developer specifies changes needed
3. System notifies client
4. Client can revise answers

**Postconditions:**
1. Document status updated
2. Client notified
3. Audit trail recorded

---

## 5. Story Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER STORY MAP                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER JOURNEY:                                                               │
│  [Discover] → [Register] → [Complete Questionnaire] → [Get Documents]       │
│                                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  MVP (Must Have):                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Register │ │ Start    │ │ Answer   │ │ Complete │ │ Download │          │
│  │ US-001   │ │ Session  │ │ Questions│ │ Session  │ │ Docs     │          │
│  │ US-003   │ │ US-010   │ │ US-011   │ │ US-020   │ │ US-023   │          │
│  │ US-004   │ │ US-014   │ │ US-012   │ │ US-021   │ │ US-024   │          │
│  └──────────┘ │ US-015   │ │ US-013   │ └──────────┘ └──────────┘          │
│               └──────────┘ └──────────┘                                     │
│                                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Release 2 (Should Have):                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Social   │ │ Industry │ │ Navigate │ │ Preview  │ │ In-App   │          │
│  │ Login    │ │ Questions│ │ Back     │ │ Docs     │ │ Notif    │          │
│  │ US-002   │ │ US-018   │ │ US-016   │ │ US-022   │ │ US-042   │          │
│  │ US-005   │ │          │ │ US-017   │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Release 3 (Nice to Have):                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                    │
│  │ MFA      │ │ Reminder │ │ Analytics│                                    │
│  │ US-006   │ │ US-041   │ │ US-035   │                                    │
│  └──────────┘ └──────────┘ └──────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Related Documents

- [Business Requirements Document](./01-business-requirements-document.md)
- [Functional Requirements Document](./02-functional-requirements-document.md)
- [Requirements Traceability Matrix](./05-requirements-traceability-matrix.md)
- [Wireframes/Mockups](./08-wireframes-mockups.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | {{PO_NAME}} | | |
| Business Analyst | {{BA_NAME}} | | |
| Tech Lead | {{TECH_LEAD}} | | |
# User Stories and Use Cases
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** Business Analyst / Product Owner  
**Status:** {{STATUS}}

---

## 1. Introduction

This document defines user stories and use cases for the Adaptive Client Questionnaire System, following Agile methodologies. Each user story follows the format: "As a [role], I want [feature], so that [benefit]."

---

## 2. Epic Overview

| Epic ID | Epic Name | Description | Priority |
|---------|-----------|-------------|----------|
| EPIC-01 | User Management | Registration, authentication, profiles | High |
| EPIC-02 | Questionnaire | Core question/answer functionality | High |
| EPIC-03 | Document Generation | Creating and managing documents | High |
| EPIC-04 | Admin Portal | Developer/admin functionality | Medium |
| EPIC-05 | Notifications | Email and in-app notifications | Medium |
| EPIC-06 | Billing | Subscriptions and payments | Medium |
| EPIC-07 | Analytics | Usage tracking and reporting | Low |

---

## 3. User Stories by Epic

### 3.1 EPIC-01: User Management

#### US-001: User Registration
**As a** guest visitor  
**I want to** create an account with my email and password  
**So that** I can access the questionnaire system

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] User can enter email, password, and name
- [ ] Password must be at least 12 characters with complexity
- [ ] System validates email format and uniqueness
- [ ] Verification email is sent within 30 seconds
- [ ] User cannot log in until email is verified
- [ ] Clear error messages for invalid inputs

**Technical Notes:**
- Use bcrypt/Argon2 for password hashing
- JWT for session management
- Rate limit registration attempts

---

#### US-002: Social Login
**As a** guest visitor  
**I want to** sign up using my Google or Microsoft account  
**So that** I don't have to remember another password

**Priority:** Should Have  
**Story Points:** 8

**Acceptance Criteria:**
- [ ] Google OAuth button is visible on login/register pages
- [ ] Microsoft OAuth button is visible
- [ ] First social login creates account automatically
- [ ] Subsequent logins authenticate existing account
- [ ] User profile populated from OAuth provider

---

#### US-003: Login
**As a** registered user  
**I want to** log in with my credentials  
**So that** I can access my questionnaires and documents

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] User can enter email and password
- [ ] "Remember me" option available (extends session)
- [ ] Account locks after 5 failed attempts
- [ ] Clear error message for invalid credentials
- [ ] Redirect to dashboard after successful login

---

#### US-004: Password Reset
**As a** user who forgot their password  
**I want to** reset my password via email  
**So that** I can regain access to my account

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Forgot password" link on login page
- [ ] Reset email sent within 1 minute
- [ ] Reset link expires after 1 hour
- [ ] New password must meet complexity requirements
- [ ] All existing sessions invalidated after reset

---

#### US-005: Profile Management
**As a** logged-in user  
**I want to** update my profile information  
**So that** my generated documents have accurate details

**Priority:** Should Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] User can update name, phone, company name
- [ ] User can upload profile picture
- [ ] User can change notification preferences
- [ ] Changes saved immediately

---

#### US-006: Enable MFA
**As a** security-conscious user  
**I want to** enable two-factor authentication  
**So that** my account is more secure

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Option to enable MFA in security settings
- [ ] Support for authenticator apps (TOTP)
- [ ] Backup codes provided
- [ ] MFA required on subsequent logins
- [ ] Option to disable MFA (with verification)

---

### 3.2 EPIC-02: Questionnaire

#### US-010: Start New Questionnaire
**As a** client user  
**I want to** start a new questionnaire session  
**So that** I can begin generating my business documents

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] "Start New Questionnaire" button on dashboard
- [ ] Industry selection screen displayed first
- [ ] Session created with unique ID
- [ ] First question displayed after selection
- [ ] Progress shows 0% at start

---

#### US-011: View Question with Options
**As a** client user  
**I want to** see a question with multiple choice options and explanations  
**So that** I can make an informed decision

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Question text prominently displayed
- [ ] All options visible with descriptions
- [ ] Help text available (expandable)
- [ ] Suggested answer highlighted (if applicable)
- [ ] Required indicator shown
- [ ] Accessible for screen readers

---

#### US-012: Submit Answer
**As a** client user  
**I want to** submit my answer and see the next question  
**So that** I can progress through the questionnaire

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Answer validated on submission
- [ ] Clear error message if validation fails
- [ ] Progress bar updates
- [ ] Next question loads within 1 second
- [ ] Adaptive logic applied (relevant questions shown)

---

#### US-013: See Progress
**As a** client user  
**I want to** see my completion progress  
**So that** I know how much more I need to complete

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Progress percentage displayed
- [ ] Current section name shown
- [ ] Visual progress bar
- [ ] Estimated time remaining shown
- [ ] Progress updates after each answer

---

#### US-014: Save and Exit
**As a** client user  
**I want to** save my progress and exit  
**So that** I can continue later

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Save and Exit" button available
- [ ] Progress auto-saved every 30 seconds
- [ ] Confirmation message shown
- [ ] Session appears on dashboard for resumption

---

#### US-015: Resume Session
**As a** client user  
**I want to** resume an incomplete questionnaire  
**So that** I don't have to start over

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Incomplete sessions listed on dashboard
- [ ] Shows last activity date and progress
- [ ] One-click to resume
- [ ] Resumes at exact question left off

---

#### US-016: Navigate Back
**As a** client user  
**I want to** go back to previous questions  
**So that** I can review or change my answers

**Priority:** Should Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Previous" button available
- [ ] Previous answer pre-filled
- [ ] Can edit and resubmit
- [ ] Adaptive logic re-evaluated if answer changes

---

#### US-017: Skip Optional Question
**As a** client user  
**I want to** skip optional questions  
**So that** I can complete the questionnaire faster

**Priority:** Should Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Skip button shown for optional questions
- [ ] Required questions cannot be skipped
- [ ] Progress still advances
- [ ] Can return to skipped questions later

---

#### US-018: Industry-Specific Questions
**As a** client user  
**I want to** answer questions relevant to my industry  
**So that** my documents are tailored to my business

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Industry selection affects question set
- [ ] Industry-specific questions shown
- [ ] Irrelevant questions hidden
- [ ] Document templates adjusted for industry

---

### 3.3 EPIC-03: Document Generation

#### US-020: Complete Questionnaire
**As a** client user  
**I want to** mark my questionnaire as complete  
**So that** document generation can begin

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Complete" button shown when all required questions answered
- [ ] Summary review screen shown
- [ ] Confirmation dialog before submission
- [ ] Status changes to "Generating Documents"

---

#### US-021: Receive Notification on Generation Complete
**As a** client user  
**I want to** be notified when my documents are generated  
**So that** I know they're ready for review

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Email sent when generation complete
- [ ] In-app notification shown
- [ ] Push notification on mobile
- [ ] Link to view documents in notification

---

#### US-022: Preview Document
**As a** client user  
**I want to** preview my generated documents  
**So that** I can see what was created

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] PDF preview in browser
- [ ] Page navigation controls
- [ ] Zoom functionality
- [ ] Works on mobile devices

---

#### US-023: Download Approved Documents
**As a** client user  
**I want to** download my approved documents  
**So that** I can use them for my business

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Download button for approved documents
- [ ] PDF and DOCX format options
- [ ] Individual or bulk download (ZIP)
- [ ] Download only available for approved docs

---

#### US-024: View Document Status
**As a** client user  
**I want to** see the status of my documents  
**So that** I know if they're pending review or approved

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Status badges on document list
- [ ] Statuses: Generating, Pending Review, Approved, Rejected
- [ ] Filter by status
- [ ] Timestamp of last status change

---

### 3.4 EPIC-04: Admin Portal

#### US-030: View Review Queue
**As a** developer  
**I want to** see all pending document reviews  
**So that** I can prioritize my work

**Priority:** Must Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] List of all pending reviews
- [ ] Sort by date, client, priority
- [ ] Filter by document type
- [ ] Show client name and submission date
- [ ] Badge showing queue count

---

#### US-031: Review Document
**As a** developer  
**I want to** review a submitted document  
**So that** I can ensure quality before client download

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Full document preview
- [ ] View client's questionnaire answers
- [ ] Add internal comments
- [ ] Add client-visible comments
- [ ] Approve/Reject/Request Changes buttons

---

#### US-032: Approve Document
**As a** developer  
**I want to** approve a document  
**So that** the client can download it

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Approval with optional comments
- [ ] Document status changes to Approved
- [ ] Client notified automatically
- [ ] Audit trail recorded

---

#### US-033: Reject Document
**As a** developer  
**I want to** reject a document with feedback  
**So that** the client knows what needs to change

**Priority:** Must Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Rejection requires comment
- [ ] Document status changes to Rejected
- [ ] Client notified with feedback
- [ ] Client can revise and resubmit

---

#### US-034: Manage Questions
**As a** developer  
**I want to** add, edit, and remove questions  
**So that** I can keep the questionnaire current

**Priority:** Should Have  
**Story Points:** 8

**Acceptance Criteria:**
- [ ] CRUD operations for questions
- [ ] Set question type, options, validation
- [ ] Configure visibility rules
- [ ] Tag questions by industry
- [ ] Preview question as client sees it

---

#### US-035: View Analytics Dashboard
**As a** developer  
**I want to** see usage analytics  
**So that** I can understand how clients use the system

**Priority:** Should Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] Active sessions count
- [ ] Completion rate chart
- [ ] Average completion time
- [ ] Question drop-off analysis
- [ ] User growth trends

---

### 3.5 EPIC-05: Notifications

#### US-040: Receive Welcome Email
**As a** new user  
**I want to** receive a welcome email  
**So that** I know my registration was successful

**Priority:** Should Have  
**Story Points:** 2

**Acceptance Criteria:**
- [ ] Email sent immediately after verification
- [ ] Contains getting started guide
- [ ] Links to help resources

---

#### US-041: Receive Reminder Email
**As a** user with incomplete questionnaire  
**I want to** receive a reminder  
**So that** I don't forget to complete it

**Priority:** Nice to Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Reminder sent after 3 days of inactivity
- [ ] Shows current progress
- [ ] One-click resume link
- [ ] Can unsubscribe from reminders

---

#### US-042: In-App Notifications
**As a** logged-in user  
**I want to** see notifications in the app  
**So that** I'm aware of updates without checking email

**Priority:** Should Have  
**Story Points:** 3

**Acceptance Criteria:**
- [ ] Notification bell icon
- [ ] Unread count badge
- [ ] Notification dropdown list
- [ ] Mark as read functionality

---

### 3.6 EPIC-06: Billing

#### US-050: Subscribe to Plan
**As a** user  
**I want to** subscribe to a paid plan  
**So that** I can access all features

**Priority:** Must Have  
**Story Points:** 8

**Acceptance Criteria:**
- [ ] Display available plans
- [ ] Select plan and enter payment info
- [ ] Process payment via Stripe
- [ ] Immediate access to features
- [ ] Confirmation email sent

---

#### US-051: Manage Subscription
**As a** subscriber  
**I want to** view and manage my subscription  
**So that** I can upgrade, downgrade, or cancel

**Priority:** Must Have  
**Story Points:** 5

**Acceptance Criteria:**
- [ ] View current plan
- [ ] View billing history
- [ ] Update payment method
- [ ] Cancel subscription
- [ ] Understand cancellation implications

---

---

## 4. Use Cases (Detailed)

### 4.1 UC-001: Complete Questionnaire Session

**Use Case ID:** UC-001  
**Use Case Name:** Complete Questionnaire Session  
**Actor:** Client  
**Description:** Client completes full questionnaire from start to document generation.

**Preconditions:**
1. User is authenticated
2. User has active subscription (or free tier eligibility)

**Main Flow:**
1. Client navigates to dashboard
2. Client clicks "Start New Questionnaire"
3. System displays industry selection
4. Client selects industry
5. System creates new session
6. System displays first question
7. Client enters answer
8. Client clicks "Next"
9. System validates answer
10. System stores response
11. System executes adaptive logic
12. System displays next question
13. Repeat steps 7-12 until all questions answered
14. System displays completion summary
15. Client clicks "Complete"
16. System marks session complete
17. System triggers document generation
18. System notifies client

**Alternative Flows:**

*A1: Validation Error (step 9)*
1. System displays error message
2. Client corrects answer
3. Continue from step 8

*A2: Save and Exit (any step)*
1. Client clicks "Save and Exit"
2. System saves current state
3. Client can resume later

*A3: Navigate Back (any step)*
1. Client clicks "Previous"
2. System displays previous question with answer
3. Client can edit and continue

**Postconditions:**
1. Session marked as complete
2. Document generation queued
3. Client notified

**Business Rules:**
- Required questions must be answered
- Session expires after 90 days if incomplete
- Adaptive logic determines question visibility

---

### 4.2 UC-002: Review and Approve Document

**Use Case ID:** UC-002  
**Use Case Name:** Review and Approve Document  
**Actor:** Developer  
**Description:** Developer reviews generated documents and approves for client download.

**Preconditions:**
1. Developer is authenticated with Developer role
2. Documents pending review exist

**Main Flow:**
1. Developer navigates to Admin Portal
2. Developer opens Review Queue
3. System displays pending reviews
4. Developer selects a submission
5. System loads document package
6. Developer opens first document
7. System displays PDF preview
8. Developer reviews content
9. Developer adds comments (optional)
10. Developer clicks "Approve"
11. System updates document status
12. System notifies client
13. Repeat steps 6-12 for remaining documents

**Alternative Flows:**

*A1: Reject Document (step 10)*
1. Developer clicks "Reject"
2. Developer enters required feedback
3. System updates status to Rejected
4. System notifies client with feedback

*A2: Request Changes (step 10)*
1. Developer clicks "Request Changes"
2. Developer specifies changes needed
3. System notifies client
4. Client can revise answers

**Postconditions:**
1. Document status updated
2. Client notified
3. Audit trail recorded

---

## 5. Story Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER STORY MAP                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER JOURNEY:                                                               │
│  [Discover] → [Register] → [Complete Questionnaire] → [Get Documents]       │
│                                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  MVP (Must Have):                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Register │ │ Start    │ │ Answer   │ │ Complete │ │ Download │          │
│  │ US-001   │ │ Session  │ │ Questions│ │ Session  │ │ Docs     │          │
│  │ US-003   │ │ US-010   │ │ US-011   │ │ US-020   │ │ US-023   │          │
│  │ US-004   │ │ US-014   │ │ US-012   │ │ US-021   │ │ US-024   │          │
│  └──────────┘ │ US-015   │ │ US-013   │ └──────────┘ └──────────┘          │
│               └──────────┘ └──────────┘                                     │
│                                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Release 2 (Should Have):                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Social   │ │ Industry │ │ Navigate │ │ Preview  │ │ In-App   │          │
│  │ Login    │ │ Questions│ │ Back     │ │ Docs     │ │ Notif    │          │
│  │ US-002   │ │ US-018   │ │ US-016   │ │ US-022   │ │ US-042   │          │
│  │ US-005   │ │          │ │ US-017   │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Release 3 (Nice to Have):                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                                    │
│  │ MFA      │ │ Reminder │ │ Analytics│                                    │
│  │ US-006   │ │ US-041   │ │ US-035   │                                    │
│  └──────────┘ └──────────┘ └──────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Related Documents

- [Business Requirements Document](./01-business-requirements-document.md)
- [Functional Requirements Document](./02-functional-requirements-document.md)
- [Requirements Traceability Matrix](./05-requirements-traceability-matrix.md)
- [Wireframes/Mockups](./08-wireframes-mockups.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | {{PO_NAME}} | | |
| Business Analyst | {{BA_NAME}} | | |
| Tech Lead | {{TECH_LEAD}} | | |
