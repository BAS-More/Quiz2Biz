# Change Request Document
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** Business Analyst / Project Manager  
**Status:** Template

---

## 1. Introduction

This document serves as the template and tracking system for all change requests to the Adaptive Client Questionnaire System project. It ensures proper documentation, evaluation, and approval of modifications to the original scope.

---

## 2. Change Request Process

### 2.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHANGE REQUEST PROCESS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Change Identified]                                                        │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────┐                                                        │
│  │ 1. Submit CR    │  Requestor completes Change Request Form               │
│  │    Form         │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ 2. Initial      │  BA/PM reviews for completeness                        │
│  │    Review       │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ 3. Impact       │  Technical, schedule, cost analysis                    │
│  │    Analysis     │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ 4. CCB Review   │  Change Control Board evaluates                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│     ┌─────┴─────┐                                                           │
│     │           │                                                           │
│     ▼           ▼                                                           │
│ [Approved]  [Rejected]                                                      │
│     │           │                                                           │
│     ▼           ▼                                                           │
│ ┌─────────┐  ┌─────────────┐                                               │
│ │ 5. Plan │  │ Notify      │                                               │
│ │ & Impl. │  │ Requestor   │                                               │
│ └────┬────┘  └─────────────┘                                               │
│      │                                                                       │
│      ▼                                                                       │
│ ┌─────────────┐                                                             │
│ │ 6. Verify   │                                                             │
│ │ & Close     │                                                             │
│ └─────────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Change Control Board (CCB)

| Role | Name | Responsibility |
|------|------|----------------|
| Chair | {{PM_NAME}} | Final approval, meeting facilitation |
| Technical Lead | {{TECH_LEAD}} | Technical impact assessment |
| Business Analyst | {{BA_NAME}} | Requirements impact |
| QA Lead | {{QA_LEAD}} | Testing impact |
| Sponsor Representative | {{SPONSOR_REP}} | Budget/scope authority |

### 2.3 Meeting Schedule

| Meeting | Frequency | Participants |
|---------|-----------|--------------|
| CCB Review | Weekly | Full CCB |
| Emergency CCB | As needed | Chair + 2 members minimum |

---

## 3. Change Request Form Template

---

### CHANGE REQUEST FORM

**CR Number:** CR-{{NUMBER}}  
**Date Submitted:** {{DATE}}  
**Submitted By:** {{REQUESTOR_NAME}}  
**Department:** {{DEPARTMENT}}

---

#### Section 1: Change Description

**Change Title:**  
{{BRIEF_TITLE}}

**Detailed Description:**  
{{DETAILED_DESCRIPTION}}

**Business Justification:**  
{{WHY_IS_THIS_CHANGE_NEEDED}}

**Affected Components:**
- [ ] Web Application
- [ ] iOS Application
- [ ] Android Application
- [ ] Power Apps Connector
- [ ] API/Backend
- [ ] Database
- [ ] Documentation
- [ ] Other: {{SPECIFY}}

---

#### Section 2: Classification

**Change Type:**
- [ ] New Feature
- [ ] Enhancement
- [ ] Bug Fix
- [ ] Documentation
- [ ] Infrastructure
- [ ] Security
- [ ] Other: {{SPECIFY}}

**Priority:**
- [ ] Critical - Business cannot operate
- [ ] High - Significant impact
- [ ] Medium - Moderate impact
- [ ] Low - Minor impact

**Urgency:**
- [ ] Immediate - Within 24 hours
- [ ] Urgent - Within 1 week
- [ ] Normal - Next sprint
- [ ] Low - Can wait for future release

---

#### Section 3: Impact Analysis

**Requirements Impacted:**

| Requirement ID | Description | Impact |
|----------------|-------------|--------|
| {{BR/FR-XXX}} | {{DESCRIPTION}} | {{IMPACT}} |

**User Stories Impacted:**

| Story ID | Description | Impact |
|----------|-------------|--------|
| {{US-XXX}} | {{DESCRIPTION}} | {{IMPACT}} |

**Technical Impact:**  
{{TECHNICAL_IMPACT_DESCRIPTION}}

**Schedule Impact:**

| Aspect | Original | Revised | Variance |
|--------|----------|---------|----------|
| Development | {{ORIG}} | {{REV}} | {{VAR}} |
| Testing | {{ORIG}} | {{REV}} | {{VAR}} |
| Deployment | {{ORIG}} | {{REV}} | {{VAR}} |

**Cost Impact:**

| Category | Original Budget | Additional Cost | Justification |
|----------|-----------------|-----------------|---------------|
| Development | ${{ORIG}} | ${{ADD}} | {{JUST}} |
| Infrastructure | ${{ORIG}} | ${{ADD}} | {{JUST}} |
| Other | ${{ORIG}} | ${{ADD}} | {{JUST}} |
| **Total** | ${{TOTAL_ORIG}} | ${{TOTAL_ADD}} | |

**Risk Impact:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {{RISK}} | {{PROB}} | {{IMPACT}} | {{MIT}} |

---

#### Section 4: Alternatives Considered

| Alternative | Pros | Cons | Recommendation |
|-------------|------|------|----------------|
| {{ALT_1}} | {{PROS}} | {{CONS}} | {{REC}} |
| {{ALT_2}} | {{PROS}} | {{CONS}} | {{REC}} |
| Do Nothing | No cost/effort | Problem persists | {{REC}} |

---

#### Section 5: Approval

**Requestor Signature:**  
Name: {{NAME}}  
Date: {{DATE}}

---

**Impact Assessment Completed By:**

| Role | Name | Date |
|------|------|------|
| Business Analyst | {{NAME}} | {{DATE}} |
| Technical Lead | {{NAME}} | {{DATE}} |
| QA Lead | {{NAME}} | {{DATE}} |

---

**CCB Decision:**

- [ ] Approved
- [ ] Approved with Conditions
- [ ] Rejected
- [ ] Deferred to: {{DATE/RELEASE}}
- [ ] More Information Required

**Conditions/Comments:**  
{{CONDITIONS_OR_REJECTION_REASON}}

**CCB Signatures:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Chair | {{NAME}} | | |
| Technical Lead | {{NAME}} | | |
| Sponsor Rep | {{NAME}} | | |

---

#### Section 6: Implementation (if approved)

**Assigned To:** {{ASSIGNEE}}  
**Target Sprint:** {{SPRINT}}  
**Target Release:** {{RELEASE}}

**Implementation Plan:**  
{{IMPLEMENTATION_STEPS}}

**Testing Plan:**  
{{TESTING_APPROACH}}

**Rollback Plan:**  
{{ROLLBACK_STEPS}}

---

#### Section 7: Verification & Closure

**Verification Completed By:** {{NAME}}  
**Verification Date:** {{DATE}}

**Verification Results:**
- [ ] Change implemented as specified
- [ ] Testing completed successfully
- [ ] Documentation updated
- [ ] Stakeholders notified

**Closure Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Requestor | {{NAME}} | | |
| BA/PM | {{NAME}} | | |

---

## 4. Change Request Log

### 4.1 Active Change Requests

| CR # | Title | Priority | Status | Submitted | Target |
|------|-------|----------|--------|-----------|--------|
| CR-001 | {{TITLE}} | {{PRIORITY}} | {{STATUS}} | {{DATE}} | {{TARGET}} |

### 4.2 Status Definitions

| Status | Description |
|--------|-------------|
| Submitted | CR received, awaiting initial review |
| Under Review | Impact analysis in progress |
| CCB Pending | Ready for CCB review |
| Approved | Approved, awaiting implementation |
| In Progress | Implementation underway |
| Testing | Implementation complete, in testing |
| Completed | Verified and closed |
| Rejected | Not approved by CCB |
| Deferred | Postponed to future release |
| Cancelled | Withdrawn by requestor |

### 4.3 Completed Change Requests

| CR # | Title | Completed Date | Release |
|------|-------|----------------|---------|
| - | No completed CRs yet | - | - |

### 4.4 Rejected/Deferred Change Requests

| CR # | Title | Decision | Reason | Date |
|------|-------|----------|--------|------|
| - | No rejected CRs yet | - | - | - |

---

## 5. Change Metrics

### 5.1 Monthly Metrics

| Month | Submitted | Approved | Rejected | Avg. Cycle Time |
|-------|-----------|----------|----------|-----------------|
| - | - | - | - | - |

### 5.2 Change by Category

| Category | Count | % of Total |
|----------|-------|------------|
| New Feature | - | - |
| Enhancement | - | - |
| Bug Fix | - | - |
| Other | - | - |

---

## 6. Escalation Procedures

### 6.1 When to Escalate

| Trigger | Escalate To | Timeframe |
|---------|-------------|-----------|
| Emergency change | CCB Chair → Sponsor | Immediate |
| CR pending > 2 weeks | CCB Chair | Within 24 hours |
| Scope impact > 10% | Sponsor | Before CCB decision |
| Budget impact > $50K | CFO | Before CCB decision |

### 6.2 Escalation Path

```
[Project Manager]
       │
       ▼
[Project Sponsor]
       │
       ▼
[Steering Committee]
       │
       ▼
[Executive Leadership]
```

---

## 7. Related Documents

- [Business Requirements Document](./01-business-requirements-document.md)
- [Requirements Traceability Matrix](./05-requirements-traceability-matrix.md)
- [Project Charter]({{PROJECT_CHARTER_LINK}})
- [Risk Register]({{RISK_REGISTER_LINK}})

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Manager | {{PM_NAME}} | | |
| Business Analyst | {{BA_NAME}} | | |
| Project Sponsor | {{SPONSOR_NAME}} | | |
# Change Request Document
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** Business Analyst / Project Manager  
**Status:** Template

---

## 1. Introduction

This document serves as the template and tracking system for all change requests to the Adaptive Client Questionnaire System project. It ensures proper documentation, evaluation, and approval of modifications to the original scope.

---

## 2. Change Request Process

### 2.1 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHANGE REQUEST PROCESS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Change Identified]                                                        │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────┐                                                        │
│  │ 1. Submit CR    │  Requestor completes Change Request Form               │
│  │    Form         │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ 2. Initial      │  BA/PM reviews for completeness                        │
│  │    Review       │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ 3. Impact       │  Technical, schedule, cost analysis                    │
│  │    Analysis     │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ 4. CCB Review   │  Change Control Board evaluates                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│     ┌─────┴─────┐                                                           │
│     │           │                                                           │
│     ▼           ▼                                                           │
│ [Approved]  [Rejected]                                                      │
│     │           │                                                           │
│     ▼           ▼                                                           │
│ ┌─────────┐  ┌─────────────┐                                               │
│ │ 5. Plan │  │ Notify      │                                               │
│ │ & Impl. │  │ Requestor   │                                               │
│ └────┬────┘  └─────────────┘                                               │
│      │                                                                       │
│      ▼                                                                       │
│ ┌─────────────┐                                                             │
│ │ 6. Verify   │                                                             │
│ │ & Close     │                                                             │
│ └─────────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Change Control Board (CCB)

| Role | Name | Responsibility |
|------|------|----------------|
| Chair | {{PM_NAME}} | Final approval, meeting facilitation |
| Technical Lead | {{TECH_LEAD}} | Technical impact assessment |
| Business Analyst | {{BA_NAME}} | Requirements impact |
| QA Lead | {{QA_LEAD}} | Testing impact |
| Sponsor Representative | {{SPONSOR_REP}} | Budget/scope authority |

### 2.3 Meeting Schedule

| Meeting | Frequency | Participants |
|---------|-----------|--------------|
| CCB Review | Weekly | Full CCB |
| Emergency CCB | As needed | Chair + 2 members minimum |

---

## 3. Change Request Form Template

---

### CHANGE REQUEST FORM

**CR Number:** CR-{{NUMBER}}  
**Date Submitted:** {{DATE}}  
**Submitted By:** {{REQUESTOR_NAME}}  
**Department:** {{DEPARTMENT}}

---

#### Section 1: Change Description

**Change Title:**  
{{BRIEF_TITLE}}

**Detailed Description:**  
{{DETAILED_DESCRIPTION}}

**Business Justification:**  
{{WHY_IS_THIS_CHANGE_NEEDED}}

**Affected Components:**
- [ ] Web Application
- [ ] iOS Application
- [ ] Android Application
- [ ] Power Apps Connector
- [ ] API/Backend
- [ ] Database
- [ ] Documentation
- [ ] Other: {{SPECIFY}}

---

#### Section 2: Classification

**Change Type:**
- [ ] New Feature
- [ ] Enhancement
- [ ] Bug Fix
- [ ] Documentation
- [ ] Infrastructure
- [ ] Security
- [ ] Other: {{SPECIFY}}

**Priority:**
- [ ] Critical - Business cannot operate
- [ ] High - Significant impact
- [ ] Medium - Moderate impact
- [ ] Low - Minor impact

**Urgency:**
- [ ] Immediate - Within 24 hours
- [ ] Urgent - Within 1 week
- [ ] Normal - Next sprint
- [ ] Low - Can wait for future release

---

#### Section 3: Impact Analysis

**Requirements Impacted:**

| Requirement ID | Description | Impact |
|----------------|-------------|--------|
| {{BR/FR-XXX}} | {{DESCRIPTION}} | {{IMPACT}} |

**User Stories Impacted:**

| Story ID | Description | Impact |
|----------|-------------|--------|
| {{US-XXX}} | {{DESCRIPTION}} | {{IMPACT}} |

**Technical Impact:**  
{{TECHNICAL_IMPACT_DESCRIPTION}}

**Schedule Impact:**

| Aspect | Original | Revised | Variance |
|--------|----------|---------|----------|
| Development | {{ORIG}} | {{REV}} | {{VAR}} |
| Testing | {{ORIG}} | {{REV}} | {{VAR}} |
| Deployment | {{ORIG}} | {{REV}} | {{VAR}} |

**Cost Impact:**

| Category | Original Budget | Additional Cost | Justification |
|----------|-----------------|-----------------|---------------|
| Development | ${{ORIG}} | ${{ADD}} | {{JUST}} |
| Infrastructure | ${{ORIG}} | ${{ADD}} | {{JUST}} |
| Other | ${{ORIG}} | ${{ADD}} | {{JUST}} |
| **Total** | ${{TOTAL_ORIG}} | ${{TOTAL_ADD}} | |

**Risk Impact:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {{RISK}} | {{PROB}} | {{IMPACT}} | {{MIT}} |

---

#### Section 4: Alternatives Considered

| Alternative | Pros | Cons | Recommendation |
|-------------|------|------|----------------|
| {{ALT_1}} | {{PROS}} | {{CONS}} | {{REC}} |
| {{ALT_2}} | {{PROS}} | {{CONS}} | {{REC}} |
| Do Nothing | No cost/effort | Problem persists | {{REC}} |

---

#### Section 5: Approval

**Requestor Signature:**  
Name: {{NAME}}  
Date: {{DATE}}

---

**Impact Assessment Completed By:**

| Role | Name | Date |
|------|------|------|
| Business Analyst | {{NAME}} | {{DATE}} |
| Technical Lead | {{NAME}} | {{DATE}} |
| QA Lead | {{NAME}} | {{DATE}} |

---

**CCB Decision:**

- [ ] Approved
- [ ] Approved with Conditions
- [ ] Rejected
- [ ] Deferred to: {{DATE/RELEASE}}
- [ ] More Information Required

**Conditions/Comments:**  
{{CONDITIONS_OR_REJECTION_REASON}}

**CCB Signatures:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Chair | {{NAME}} | | |
| Technical Lead | {{NAME}} | | |
| Sponsor Rep | {{NAME}} | | |

---

#### Section 6: Implementation (if approved)

**Assigned To:** {{ASSIGNEE}}  
**Target Sprint:** {{SPRINT}}  
**Target Release:** {{RELEASE}}

**Implementation Plan:**  
{{IMPLEMENTATION_STEPS}}

**Testing Plan:**  
{{TESTING_APPROACH}}

**Rollback Plan:**  
{{ROLLBACK_STEPS}}

---

#### Section 7: Verification & Closure

**Verification Completed By:** {{NAME}}  
**Verification Date:** {{DATE}}

**Verification Results:**
- [ ] Change implemented as specified
- [ ] Testing completed successfully
- [ ] Documentation updated
- [ ] Stakeholders notified

**Closure Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Requestor | {{NAME}} | | |
| BA/PM | {{NAME}} | | |

---

## 4. Change Request Log

### 4.1 Active Change Requests

| CR # | Title | Priority | Status | Submitted | Target |
|------|-------|----------|--------|-----------|--------|
| CR-001 | {{TITLE}} | {{PRIORITY}} | {{STATUS}} | {{DATE}} | {{TARGET}} |

### 4.2 Status Definitions

| Status | Description |
|--------|-------------|
| Submitted | CR received, awaiting initial review |
| Under Review | Impact analysis in progress |
| CCB Pending | Ready for CCB review |
| Approved | Approved, awaiting implementation |
| In Progress | Implementation underway |
| Testing | Implementation complete, in testing |
| Completed | Verified and closed |
| Rejected | Not approved by CCB |
| Deferred | Postponed to future release |
| Cancelled | Withdrawn by requestor |

### 4.3 Completed Change Requests

| CR # | Title | Completed Date | Release |
|------|-------|----------------|---------|
| - | No completed CRs yet | - | - |

### 4.4 Rejected/Deferred Change Requests

| CR # | Title | Decision | Reason | Date |
|------|-------|----------|--------|------|
| - | No rejected CRs yet | - | - | - |

---

## 5. Change Metrics

### 5.1 Monthly Metrics

| Month | Submitted | Approved | Rejected | Avg. Cycle Time |
|-------|-----------|----------|----------|-----------------|
| - | - | - | - | - |

### 5.2 Change by Category

| Category | Count | % of Total |
|----------|-------|------------|
| New Feature | - | - |
| Enhancement | - | - |
| Bug Fix | - | - |
| Other | - | - |

---

## 6. Escalation Procedures

### 6.1 When to Escalate

| Trigger | Escalate To | Timeframe |
|---------|-------------|-----------|
| Emergency change | CCB Chair → Sponsor | Immediate |
| CR pending > 2 weeks | CCB Chair | Within 24 hours |
| Scope impact > 10% | Sponsor | Before CCB decision |
| Budget impact > $50K | CFO | Before CCB decision |

### 6.2 Escalation Path

```
[Project Manager]
       │
       ▼
[Project Sponsor]
       │
       ▼
[Steering Committee]
       │
       ▼
[Executive Leadership]
```

---

## 7. Related Documents

- [Business Requirements Document](./01-business-requirements-document.md)
- [Requirements Traceability Matrix](./05-requirements-traceability-matrix.md)
- [Project Charter]({{PROJECT_CHARTER_LINK}})
- [Risk Register]({{RISK_REGISTER_LINK}})

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Manager | {{PM_NAME}} | | |
| Business Analyst | {{BA_NAME}} | | |
| Project Sponsor | {{SPONSOR_NAME}} | | |
