# Onboarding / Offboarding Procedures
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / HR / IT  
**Classification:** Internal

---

## 1. Purpose and Scope

### 1.1 Purpose
This document establishes standardized procedures for granting and revoking access to code repositories, production environments, and other technical systems for employees, contractors, and third parties.

### 1.2 Scope
Applies to:
- Full-time employees
- Part-time employees
- Contractors and consultants
- Interns
- Third-party vendors with system access

### 1.3 Principles
- **Least Privilege:** Grant minimum access required for role
- **Need-to-Know:** Access based on business necessity
- **Timely Provisioning:** Enable productivity from day one
- **Prompt Revocation:** Remove access immediately upon termination
- **Audit Trail:** Document all access changes

---

## 2. Role-Based Access Matrix

### 2.1 Access Levels by Role

| System | Junior Dev | Senior Dev | Lead | DevOps | Admin |
|--------|------------|------------|------|--------|-------|
| GitHub (read) | ✓ | ✓ | ✓ | ✓ | ✓ |
| GitHub (write) | ✓ | ✓ | ✓ | ✓ | ✓ |
| GitHub (admin) | - | - | ✓ | ✓ | ✓ |
| Dev Environment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Staging Environment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Production (read) | - | ✓ | ✓ | ✓ | ✓ |
| Production (write) | - | - | ✓ | ✓ | ✓ |
| Production (admin) | - | - | - | ✓ | ✓ |
| Database (dev) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Database (prod read) | - | ✓ | ✓ | ✓ | ✓ |
| Database (prod write) | - | - | - | ✓ | ✓ |
| AWS Console | - | - | ✓ | ✓ | ✓ |
| Secrets Manager | - | - | ✓ | ✓ | ✓ |
| Admin Portal | - | - | ✓ | ✓ | ✓ |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ |

### 2.2 Access by Department

| System | Engineering | Product | Design | Support | Finance |
|--------|-------------|---------|--------|---------|---------|
| GitHub | Write | Read | - | - | - |
| Jira | Write | Write | Write | Read | Read |
| Figma | Read | Read | Write | - | - |
| Admin Portal | - | Read | - | Write | Read |
| Analytics | Read | Write | Read | Read | Write |
| Billing System | - | - | - | - | Write |

---

## 3. Onboarding Procedures

### 3.1 Onboarding Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING WORKFLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Offer Accepted] ──▶ [HR Notification] ──▶ [IT Ticket Created]            │
│                                                   │                         │
│        Day -5                        Day -3       │      Day 1              │
│  ┌─────────────────┐          ┌─────────────┐    │  ┌─────────────┐        │
│  │  Order         │          │ Create      │    │  │ First Day   │        │
│  │  Equipment     │          │ Accounts    │    └──│ Setup       │        │
│  └─────────────────┘          └─────────────┘       └──────┬──────┘        │
│                                                              │              │
│                                                              ▼              │
│                              Day 1                   Day 1-5               │
│                         ┌─────────────┐          ┌─────────────┐           │
│                         │ Security    │──────────│ Technical   │           │
│                         │ Training    │          │ Onboarding  │           │
│                         └─────────────┘          └──────┬──────┘           │
│                                                          │                  │
│                                                          ▼                  │
│                                                  ┌─────────────┐           │
│                                                  │ Full Access │           │
│                                                  │ Granted     │           │
│                                                  └─────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Pre-Start Checklist (IT/Ops)

**5 Business Days Before Start:**
```
PRE-START CHECKLIST
===================

Hardware:
□ Order laptop (MacBook Pro/Windows as per role)
□ Order monitors (if office-based)
□ Order peripherals (keyboard, mouse, headset)
□ Configure hardware inventory record

Accounts:
□ Create company email (Google Workspace/Microsoft 365)
□ Create identity provider account (Okta/Auth0)
□ Create Slack account
□ Add to appropriate Slack channels
□ Create calendar and add to team calendars

Access Requests:
□ Submit GitHub access request (manager approval)
□ Submit cloud console access request (if applicable)
□ Submit VPN access request
□ Submit building access request (if office-based)

Documentation:
□ Prepare welcome email with login instructions
□ Prepare access credentials (securely)
□ Add to IT asset tracking system
```

### 3.3 Day 1 Checklist (IT/Ops)

```
DAY 1 IT ONBOARDING
===================

Hardware Setup:
□ Deliver/ship laptop
□ Verify hardware is working
□ Install standard software package
□ Configure disk encryption (FileVault/BitLocker)
□ Enroll in MDM (Mobile Device Management)

Account Activation:
□ Guide through email activation
□ Set up MFA (multi-factor authentication)
□ Configure SSO for all applications
□ Verify Slack access
□ Verify calendar access

Security:
□ Complete security awareness training
□ Review acceptable use policy
□ Sign security acknowledgment
□ Configure password manager
□ Generate SSH key (if developer)

Access Verification:
□ Verify can access required systems
□ Test VPN connectivity
□ Verify email sending/receiving
□ Test video conferencing
```

### 3.4 Engineering Onboarding (Days 1-5)

```
ENGINEERING ONBOARDING CHECKLIST
================================

Day 1: Environment Setup
□ Clone repositories
□ Set up local development environment
□ Run application locally
□ Access development database
□ Join engineering Slack channels

Day 2: Codebase Introduction
□ Architecture overview session
□ Review key documentation
□ Code walkthrough with buddy
□ Set up IDE and extensions
□ Configure linting and formatting

Day 3: First Contribution
□ Pick up starter ticket
□ Create first branch
□ Submit first PR
□ Participate in code review
□ Merge first contribution

Day 4-5: Deep Dive
□ Shadow on-call (observe)
□ Review incident history
□ Understand deployment process
□ Complete security training (secure coding)
□ Meet with team members 1:1

Week 2+: Full Integration
□ Take on regular sprint work
□ Join on-call rotation (shadow first)
□ Complete all required training
□ 30-day check-in with manager
```

### 3.5 Access Request Form Template

```
ACCESS REQUEST FORM
===================

Requestor Information:
- Name: 
- Employee ID:
- Department:
- Manager:
- Start Date:
- Role/Title:

Access Requested:
□ GitHub - Repository: _________________ Level: □ Read □ Write □ Admin
□ AWS Console - Services: ______________ Level: □ Read □ Write □ Admin
□ Database - Environment: □ Dev □ Staging □ Prod  Level: □ Read □ Write
□ Admin Portal - Role: _________________
□ Other: _____________________________

Business Justification:
_____________________________________________

Manager Approval:
- Name: _________________ Date: _____________
- Signature: _______________________________

Security Review (if elevated access):
- Reviewed by: _____________ Date: _____________
- Approved: □ Yes □ No □ Conditional
- Conditions: _______________________________
```

---

## 4. Offboarding Procedures

### 4.1 Offboarding Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OFFBOARDING WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Resignation/Termination Notice]                                           │
│              │                                                               │
│              ▼                                                               │
│  ┌───────────────────┐                                                      │
│  │  HR Notification  │                                                      │
│  │  to IT Security   │                                                      │
│  └─────────┬─────────┘                                                      │
│            │                                                                 │
│            ├────────────────────────────────────────┐                       │
│            │                                        │                       │
│            ▼                                        ▼                       │
│  ┌───────────────────┐                    ┌───────────────────┐            │
│  │  VOLUNTARY        │                    │  INVOLUNTARY/     │            │
│  │  RESIGNATION      │                    │  IMMEDIATE        │            │
│  └─────────┬─────────┘                    └─────────┬─────────┘            │
│            │                                        │                       │
│            ▼                                        ▼                       │
│  Last Day:                                IMMEDIATE:                        │
│  • Access disabled EOD                    • All access disabled NOW        │
│  • Knowledge transfer                     • Sessions terminated            │
│  • Exit interview                         • Passwords rotated              │
│  • Equipment return                       • Equipment retrieved            │
│                                                                              │
│            │                                        │                       │
│            └────────────────────┬───────────────────┘                       │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌───────────────────┐                                    │
│                    │  Post-Departure   │                                    │
│                    │  • Audit logs     │                                    │
│                    │  • Archive data   │                                    │
│                    │  • Close tickets  │                                    │
│                    └───────────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Standard Offboarding Checklist (Voluntary)

```
STANDARD OFFBOARDING CHECKLIST
==============================

Notice Period (2 weeks before):
□ HR notifies IT of departure date
□ IT creates offboarding ticket
□ Manager identifies knowledge transfer needs
□ Schedule exit interview

Week Before Departure:
□ Knowledge transfer sessions completed
□ Documentation updated
□ Project handoffs completed
□ Passwords/secrets rotated (if knew any)

Last Day:
□ Disable SSO/identity provider account (EOD)
□ Remove from all Slack channels
□ Revoke GitHub access
□ Revoke cloud console access
□ Revoke VPN access
□ Revoke database access
□ Disable email (set auto-reply, forward to manager)
□ Disable admin portal access
□ Remove from on-call rotation
□ Revoke building access
□ Retrieve equipment
□ Retrieve any company property

Post-Departure (within 24 hours):
□ Review audit logs for last 30 days
□ Terminate active sessions
□ Archive email (if required)
□ Remove from mailing lists
□ Update team rosters
□ Close offboarding ticket
□ Document completion
```

### 4.3 Immediate Termination Checklist

```
IMMEDIATE TERMINATION CHECKLIST
===============================

PRIORITY 1 - Within 15 minutes:
□ Disable SSO account (all sessions terminated)
□ Disable VPN access
□ Revoke cloud console access
□ Disable email account
□ Change shared passwords/secrets known to employee
□ Revoke GitHub access
□ Disable admin portal access

PRIORITY 2 - Within 1 hour:
□ Revoke database access
□ Review recent code commits
□ Review recent file access
□ Check for any scheduled jobs/scripts
□ Remove from Slack (disable account)
□ Revoke building access
□ Disable any API keys created by user

PRIORITY 3 - Within 24 hours:
□ Full audit log review (last 90 days)
□ Retrieve equipment
□ Check for any data exfiltration signs
□ Review and reassign any pending work
□ Update documentation
□ Notify relevant teams

PRIORITY 4 - Within 1 week:
□ Full security review if concerns
□ Archive user data
□ Update all relevant systems
□ Document lessons learned
```

### 4.4 Contractor Offboarding

```
CONTRACTOR OFFBOARDING CHECKLIST
================================

End of Contract:
□ Remove from all code repositories
□ Revoke development environment access
□ Disable contractor email/Slack
□ Revoke VPN access
□ Remove from project management tools
□ Retrieve any loaned equipment
□ Ensure NDA acknowledgment on file
□ Verify no company IP on personal devices
□ Archive contractor work
□ Close contractor account in HR system
□ Process final invoice
□ Document knowledge transfer
□ Update vendor/contractor register
```

---

## 5. Access Reviews

### 5.1 Regular Access Reviews

| Review Type | Frequency | Scope | Reviewer |
|-------------|-----------|-------|----------|
| User Access Review | Quarterly | All user access | Managers |
| Privileged Access | Monthly | Admin/elevated access | CISO |
| Service Account | Quarterly | System accounts | Engineering Lead |
| Third-Party | Semi-annual | Vendor access | IT/Security |

### 5.2 Access Review Process

```
ACCESS REVIEW PROCESS
=====================

1. PREPARATION
   □ Generate access report for review period
   □ Distribute to appropriate reviewers
   □ Set deadline (2 weeks)

2. REVIEW
   □ Reviewer examines each access grant
   □ Validates business need
   □ Identifies inappropriate access
   □ Documents decisions

3. REMEDIATION
   □ Remove access no longer needed
   □ Investigate anomalies
   □ Update role definitions if needed

4. DOCUMENTATION
   □ Record review completion
   □ Document changes made
   □ Archive for audit
```

### 5.3 Access Review Template

```
QUARTERLY ACCESS REVIEW
=======================

Review Period: Q1 2025
Reviewer: [Manager Name]
Department: Engineering

Employee: [Name]
Role: Senior Developer

Current Access:
┌─────────────────────┬───────────────┬────────────────┐
│ System              │ Access Level  │ Still Needed?  │
├─────────────────────┼───────────────┼────────────────┤
│ GitHub              │ Write         │ □ Yes □ No     │
│ AWS Console         │ Read          │ □ Yes □ No     │
│ Prod Database       │ Read          │ □ Yes □ No     │
│ Admin Portal        │ None          │ □ Yes □ No     │
└─────────────────────┴───────────────┴────────────────┘

Access Changes Needed:
_____________________________________________

Reviewer Signature: _____________ Date: _______
```

---

## 6. Emergency Access Procedures

### 6.1 Break-Glass Access

For emergency situations requiring elevated access:

```
BREAK-GLASS PROCEDURE
=====================

Prerequisites:
• Active production incident (P1/P2)
• Normal access insufficient
• Approved by Incident Manager

Procedure:
1. Document incident number and justification
2. Request break-glass access from CISO/designee
3. Access granted for limited time (max 4 hours)
4. All actions logged and monitored
5. Access automatically revoked after time limit
6. Post-incident review required

Break-Glass Accounts:
• emergency-admin-1@company.com (Prod access)
• emergency-admin-2@company.com (Database access)

All break-glass access is:
• Logged with video recording
• Requires justification
• Time-limited
• Reviewed within 24 hours
```

---

## 7. Audit and Compliance

### 7.1 Audit Trail Requirements

| Event | Logged Information | Retention |
|-------|-------------------|-----------|
| Account Creation | User, creator, timestamp, role | 7 years |
| Access Grant | User, system, level, approver | 7 years |
| Access Revocation | User, system, reason, revoker | 7 years |
| Login/Logout | User, IP, timestamp, result | 1 year |
| Privilege Elevation | User, elevated to, duration | 7 years |
| Password Change | User, timestamp | 7 years |

### 7.2 Compliance Reporting

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Access Summary | Monthly | IT Management | Active users, new/removed |
| Privileged Access | Monthly | CISO | Elevated access list |
| Access Review Status | Quarterly | Auditors | Review completion |
| Orphan Account Report | Monthly | IT | Accounts without owners |

---

## 8. Related Documents

- [Information Security Policy](./08-information-security-policy.md)
- [Engineering Handbook](./12-engineering-handbook.md)
- [IP Assignment Agreement](./15-ip-assignment-nda.md)
- [Incident Response Plan](./09-incident-response-plan.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| HR Director | {{HR_NAME}} | | |
| IT Manager | {{IT_NAME}} | | |
# Onboarding / Offboarding Procedures
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / HR / IT  
**Classification:** Internal

---

## 1. Purpose and Scope

### 1.1 Purpose
This document establishes standardized procedures for granting and revoking access to code repositories, production environments, and other technical systems for employees, contractors, and third parties.

### 1.2 Scope
Applies to:
- Full-time employees
- Part-time employees
- Contractors and consultants
- Interns
- Third-party vendors with system access

### 1.3 Principles
- **Least Privilege:** Grant minimum access required for role
- **Need-to-Know:** Access based on business necessity
- **Timely Provisioning:** Enable productivity from day one
- **Prompt Revocation:** Remove access immediately upon termination
- **Audit Trail:** Document all access changes

---

## 2. Role-Based Access Matrix

### 2.1 Access Levels by Role

| System | Junior Dev | Senior Dev | Lead | DevOps | Admin |
|--------|------------|------------|------|--------|-------|
| GitHub (read) | ✓ | ✓ | ✓ | ✓ | ✓ |
| GitHub (write) | ✓ | ✓ | ✓ | ✓ | ✓ |
| GitHub (admin) | - | - | ✓ | ✓ | ✓ |
| Dev Environment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Staging Environment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Production (read) | - | ✓ | ✓ | ✓ | ✓ |
| Production (write) | - | - | ✓ | ✓ | ✓ |
| Production (admin) | - | - | - | ✓ | ✓ |
| Database (dev) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Database (prod read) | - | ✓ | ✓ | ✓ | ✓ |
| Database (prod write) | - | - | - | ✓ | ✓ |
| AWS Console | - | - | ✓ | ✓ | ✓ |
| Secrets Manager | - | - | ✓ | ✓ | ✓ |
| Admin Portal | - | - | ✓ | ✓ | ✓ |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ |

### 2.2 Access by Department

| System | Engineering | Product | Design | Support | Finance |
|--------|-------------|---------|--------|---------|---------|
| GitHub | Write | Read | - | - | - |
| Jira | Write | Write | Write | Read | Read |
| Figma | Read | Read | Write | - | - |
| Admin Portal | - | Read | - | Write | Read |
| Analytics | Read | Write | Read | Read | Write |
| Billing System | - | - | - | - | Write |

---

## 3. Onboarding Procedures

### 3.1 Onboarding Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING WORKFLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Offer Accepted] ──▶ [HR Notification] ──▶ [IT Ticket Created]            │
│                                                   │                         │
│        Day -5                        Day -3       │      Day 1              │
│  ┌─────────────────┐          ┌─────────────┐    │  ┌─────────────┐        │
│  │  Order         │          │ Create      │    │  │ First Day   │        │
│  │  Equipment     │          │ Accounts    │    └──│ Setup       │        │
│  └─────────────────┘          └─────────────┘       └──────┬──────┘        │
│                                                              │              │
│                                                              ▼              │
│                              Day 1                   Day 1-5               │
│                         ┌─────────────┐          ┌─────────────┐           │
│                         │ Security    │──────────│ Technical   │           │
│                         │ Training    │          │ Onboarding  │           │
│                         └─────────────┘          └──────┬──────┘           │
│                                                          │                  │
│                                                          ▼                  │
│                                                  ┌─────────────┐           │
│                                                  │ Full Access │           │
│                                                  │ Granted     │           │
│                                                  └─────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Pre-Start Checklist (IT/Ops)

**5 Business Days Before Start:**
```
PRE-START CHECKLIST
===================

Hardware:
□ Order laptop (MacBook Pro/Windows as per role)
□ Order monitors (if office-based)
□ Order peripherals (keyboard, mouse, headset)
□ Configure hardware inventory record

Accounts:
□ Create company email (Google Workspace/Microsoft 365)
□ Create identity provider account (Okta/Auth0)
□ Create Slack account
□ Add to appropriate Slack channels
□ Create calendar and add to team calendars

Access Requests:
□ Submit GitHub access request (manager approval)
□ Submit cloud console access request (if applicable)
□ Submit VPN access request
□ Submit building access request (if office-based)

Documentation:
□ Prepare welcome email with login instructions
□ Prepare access credentials (securely)
□ Add to IT asset tracking system
```

### 3.3 Day 1 Checklist (IT/Ops)

```
DAY 1 IT ONBOARDING
===================

Hardware Setup:
□ Deliver/ship laptop
□ Verify hardware is working
□ Install standard software package
□ Configure disk encryption (FileVault/BitLocker)
□ Enroll in MDM (Mobile Device Management)

Account Activation:
□ Guide through email activation
□ Set up MFA (multi-factor authentication)
□ Configure SSO for all applications
□ Verify Slack access
□ Verify calendar access

Security:
□ Complete security awareness training
□ Review acceptable use policy
□ Sign security acknowledgment
□ Configure password manager
□ Generate SSH key (if developer)

Access Verification:
□ Verify can access required systems
□ Test VPN connectivity
□ Verify email sending/receiving
□ Test video conferencing
```

### 3.4 Engineering Onboarding (Days 1-5)

```
ENGINEERING ONBOARDING CHECKLIST
================================

Day 1: Environment Setup
□ Clone repositories
□ Set up local development environment
□ Run application locally
□ Access development database
□ Join engineering Slack channels

Day 2: Codebase Introduction
□ Architecture overview session
□ Review key documentation
□ Code walkthrough with buddy
□ Set up IDE and extensions
□ Configure linting and formatting

Day 3: First Contribution
□ Pick up starter ticket
□ Create first branch
□ Submit first PR
□ Participate in code review
□ Merge first contribution

Day 4-5: Deep Dive
□ Shadow on-call (observe)
□ Review incident history
□ Understand deployment process
□ Complete security training (secure coding)
□ Meet with team members 1:1

Week 2+: Full Integration
□ Take on regular sprint work
□ Join on-call rotation (shadow first)
□ Complete all required training
□ 30-day check-in with manager
```

### 3.5 Access Request Form Template

```
ACCESS REQUEST FORM
===================

Requestor Information:
- Name: 
- Employee ID:
- Department:
- Manager:
- Start Date:
- Role/Title:

Access Requested:
□ GitHub - Repository: _________________ Level: □ Read □ Write □ Admin
□ AWS Console - Services: ______________ Level: □ Read □ Write □ Admin
□ Database - Environment: □ Dev □ Staging □ Prod  Level: □ Read □ Write
□ Admin Portal - Role: _________________
□ Other: _____________________________

Business Justification:
_____________________________________________

Manager Approval:
- Name: _________________ Date: _____________
- Signature: _______________________________

Security Review (if elevated access):
- Reviewed by: _____________ Date: _____________
- Approved: □ Yes □ No □ Conditional
- Conditions: _______________________________
```

---

## 4. Offboarding Procedures

### 4.1 Offboarding Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OFFBOARDING WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Resignation/Termination Notice]                                           │
│              │                                                               │
│              ▼                                                               │
│  ┌───────────────────┐                                                      │
│  │  HR Notification  │                                                      │
│  │  to IT Security   │                                                      │
│  └─────────┬─────────┘                                                      │
│            │                                                                 │
│            ├────────────────────────────────────────┐                       │
│            │                                        │                       │
│            ▼                                        ▼                       │
│  ┌───────────────────┐                    ┌───────────────────┐            │
│  │  VOLUNTARY        │                    │  INVOLUNTARY/     │            │
│  │  RESIGNATION      │                    │  IMMEDIATE        │            │
│  └─────────┬─────────┘                    └─────────┬─────────┘            │
│            │                                        │                       │
│            ▼                                        ▼                       │
│  Last Day:                                IMMEDIATE:                        │
│  • Access disabled EOD                    • All access disabled NOW        │
│  • Knowledge transfer                     • Sessions terminated            │
│  • Exit interview                         • Passwords rotated              │
│  • Equipment return                       • Equipment retrieved            │
│                                                                              │
│            │                                        │                       │
│            └────────────────────┬───────────────────┘                       │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌───────────────────┐                                    │
│                    │  Post-Departure   │                                    │
│                    │  • Audit logs     │                                    │
│                    │  • Archive data   │                                    │
│                    │  • Close tickets  │                                    │
│                    └───────────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Standard Offboarding Checklist (Voluntary)

```
STANDARD OFFBOARDING CHECKLIST
==============================

Notice Period (2 weeks before):
□ HR notifies IT of departure date
□ IT creates offboarding ticket
□ Manager identifies knowledge transfer needs
□ Schedule exit interview

Week Before Departure:
□ Knowledge transfer sessions completed
□ Documentation updated
□ Project handoffs completed
□ Passwords/secrets rotated (if knew any)

Last Day:
□ Disable SSO/identity provider account (EOD)
□ Remove from all Slack channels
□ Revoke GitHub access
□ Revoke cloud console access
□ Revoke VPN access
□ Revoke database access
□ Disable email (set auto-reply, forward to manager)
□ Disable admin portal access
□ Remove from on-call rotation
□ Revoke building access
□ Retrieve equipment
□ Retrieve any company property

Post-Departure (within 24 hours):
□ Review audit logs for last 30 days
□ Terminate active sessions
□ Archive email (if required)
□ Remove from mailing lists
□ Update team rosters
□ Close offboarding ticket
□ Document completion
```

### 4.3 Immediate Termination Checklist

```
IMMEDIATE TERMINATION CHECKLIST
===============================

PRIORITY 1 - Within 15 minutes:
□ Disable SSO account (all sessions terminated)
□ Disable VPN access
□ Revoke cloud console access
□ Disable email account
□ Change shared passwords/secrets known to employee
□ Revoke GitHub access
□ Disable admin portal access

PRIORITY 2 - Within 1 hour:
□ Revoke database access
□ Review recent code commits
□ Review recent file access
□ Check for any scheduled jobs/scripts
□ Remove from Slack (disable account)
□ Revoke building access
□ Disable any API keys created by user

PRIORITY 3 - Within 24 hours:
□ Full audit log review (last 90 days)
□ Retrieve equipment
□ Check for any data exfiltration signs
□ Review and reassign any pending work
□ Update documentation
□ Notify relevant teams

PRIORITY 4 - Within 1 week:
□ Full security review if concerns
□ Archive user data
□ Update all relevant systems
□ Document lessons learned
```

### 4.4 Contractor Offboarding

```
CONTRACTOR OFFBOARDING CHECKLIST
================================

End of Contract:
□ Remove from all code repositories
□ Revoke development environment access
□ Disable contractor email/Slack
□ Revoke VPN access
□ Remove from project management tools
□ Retrieve any loaned equipment
□ Ensure NDA acknowledgment on file
□ Verify no company IP on personal devices
□ Archive contractor work
□ Close contractor account in HR system
□ Process final invoice
□ Document knowledge transfer
□ Update vendor/contractor register
```

---

## 5. Access Reviews

### 5.1 Regular Access Reviews

| Review Type | Frequency | Scope | Reviewer |
|-------------|-----------|-------|----------|
| User Access Review | Quarterly | All user access | Managers |
| Privileged Access | Monthly | Admin/elevated access | CISO |
| Service Account | Quarterly | System accounts | Engineering Lead |
| Third-Party | Semi-annual | Vendor access | IT/Security |

### 5.2 Access Review Process

```
ACCESS REVIEW PROCESS
=====================

1. PREPARATION
   □ Generate access report for review period
   □ Distribute to appropriate reviewers
   □ Set deadline (2 weeks)

2. REVIEW
   □ Reviewer examines each access grant
   □ Validates business need
   □ Identifies inappropriate access
   □ Documents decisions

3. REMEDIATION
   □ Remove access no longer needed
   □ Investigate anomalies
   □ Update role definitions if needed

4. DOCUMENTATION
   □ Record review completion
   □ Document changes made
   □ Archive for audit
```

### 5.3 Access Review Template

```
QUARTERLY ACCESS REVIEW
=======================

Review Period: Q1 2025
Reviewer: [Manager Name]
Department: Engineering

Employee: [Name]
Role: Senior Developer

Current Access:
┌─────────────────────┬───────────────┬────────────────┐
│ System              │ Access Level  │ Still Needed?  │
├─────────────────────┼───────────────┼────────────────┤
│ GitHub              │ Write         │ □ Yes □ No     │
│ AWS Console         │ Read          │ □ Yes □ No     │
│ Prod Database       │ Read          │ □ Yes □ No     │
│ Admin Portal        │ None          │ □ Yes □ No     │
└─────────────────────┴───────────────┴────────────────┘

Access Changes Needed:
_____________________________________________

Reviewer Signature: _____________ Date: _______
```

---

## 6. Emergency Access Procedures

### 6.1 Break-Glass Access

For emergency situations requiring elevated access:

```
BREAK-GLASS PROCEDURE
=====================

Prerequisites:
• Active production incident (P1/P2)
• Normal access insufficient
• Approved by Incident Manager

Procedure:
1. Document incident number and justification
2. Request break-glass access from CISO/designee
3. Access granted for limited time (max 4 hours)
4. All actions logged and monitored
5. Access automatically revoked after time limit
6. Post-incident review required

Break-Glass Accounts:
• emergency-admin-1@company.com (Prod access)
• emergency-admin-2@company.com (Database access)

All break-glass access is:
• Logged with video recording
• Requires justification
• Time-limited
• Reviewed within 24 hours
```

---

## 7. Audit and Compliance

### 7.1 Audit Trail Requirements

| Event | Logged Information | Retention |
|-------|-------------------|-----------|
| Account Creation | User, creator, timestamp, role | 7 years |
| Access Grant | User, system, level, approver | 7 years |
| Access Revocation | User, system, reason, revoker | 7 years |
| Login/Logout | User, IP, timestamp, result | 1 year |
| Privilege Elevation | User, elevated to, duration | 7 years |
| Password Change | User, timestamp | 7 years |

### 7.2 Compliance Reporting

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Access Summary | Monthly | IT Management | Active users, new/removed |
| Privileged Access | Monthly | CISO | Elevated access list |
| Access Review Status | Quarterly | Auditors | Review completion |
| Orphan Account Report | Monthly | IT | Accounts without owners |

---

## 8. Related Documents

- [Information Security Policy](./08-information-security-policy.md)
- [Engineering Handbook](./12-engineering-handbook.md)
- [IP Assignment Agreement](./15-ip-assignment-nda.md)
- [Incident Response Plan](./09-incident-response-plan.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| HR Director | {{HR_NAME}} | | |
| IT Manager | {{IT_NAME}} | | |
