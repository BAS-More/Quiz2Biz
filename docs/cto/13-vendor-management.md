# Vendor Management / Third-Party Risk Documents
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Procurement  
**Classification:** Confidential

---

## 1. Purpose and Scope

### 1.1 Purpose
This document establishes the framework for managing third-party vendors, including security assessments, contract requirements, and ongoing monitoring to ensure vendors meet our security, compliance, and operational standards.

### 1.2 Scope
Applies to all third-party vendors that:
- Access, process, or store company or customer data
- Provide critical services or infrastructure
- Integrate with our systems
- Have access to our networks or facilities

---

## 2. Vendor Classification

### 2.1 Risk Tiers

| Tier | Criteria | Assessment Required | Review Frequency |
|------|----------|---------------------|------------------|
| **Critical** | Processes sensitive data, critical to operations | Full assessment, SOC 2/ISO 27001 | Quarterly |
| **High** | Access to customer data, significant integration | Security questionnaire, certifications | Semi-annual |
| **Medium** | Limited data access, replaceable service | Basic questionnaire | Annual |
| **Low** | No data access, minimal integration | Standard terms review | Biennial |

### 2.2 Classification Factors

| Factor | Weight | Questions |
|--------|--------|-----------|
| Data Sensitivity | High | What data types will vendor access? |
| System Access | High | Will vendor connect to our systems? |
| Business Criticality | High | Impact if vendor unavailable? |
| Replaceability | Medium | How easily can we switch vendors? |
| Regulatory Impact | High | Does vendor affect our compliance? |

---

## 3. Current Vendor Register

### 3.1 Critical Vendors

| Vendor | Service | Data Access | Certification | Contract Expiry | Owner |
|--------|---------|-------------|---------------|-----------------|-------|
| AWS | Cloud Infrastructure | All (encrypted) | SOC 2, ISO 27001 | {{DATE}} | Ops |
| Auth0 | Authentication | User credentials | SOC 2, ISO 27001 | {{DATE}} | Eng |
| Stripe | Payment Processing | Billing info | PCI-DSS Level 1 | {{DATE}} | Finance |

### 3.2 High-Risk Vendors

| Vendor | Service | Data Access | Certification | Contract Expiry | Owner |
|--------|---------|-------------|---------------|-----------------|-------|
| SendGrid | Email Delivery | Email, name | SOC 2 | {{DATE}} | Eng |
| DataDog | Monitoring | Logs (filtered) | SOC 2 | {{DATE}} | Ops |
| GitHub | Code Repository | Source code | SOC 2 | {{DATE}} | Eng |

### 3.3 Medium-Risk Vendors

| Vendor | Service | Data Access | Contract Expiry | Owner |
|--------|---------|-------------|-----------------|-------|
| Slack | Team Communication | Internal comms | {{DATE}} | IT |
| Notion | Documentation | Internal docs | {{DATE}} | Ops |
| Figma | Design | UI mockups | {{DATE}} | Design |

---

## 4. Vendor Assessment Process

### 4.1 Assessment Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VENDOR ASSESSMENT WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [New Vendor Request]                                                       │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   Initial   │───▶│    Risk     │───▶│  Security   │                     │
│  │  Screening  │    │Classification│   │ Assessment  │                     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                     │
│                                               │                             │
│                         ┌─────────────────────┴─────────────────────┐       │
│                         │                                           │       │
│                         ▼                                           ▼       │
│                  [Pass Assessment]                          [Fail/Issues]   │
│                         │                                           │       │
│                         ▼                                           ▼       │
│                  ┌─────────────┐                           ┌─────────────┐  │
│                  │  Contract   │                           │ Remediation │  │
│                  │  Negotiation│                           │  Required   │  │
│                  └──────┬──────┘                           └──────┬──────┘  │
│                         │                                         │         │
│                         ▼                                         │         │
│                  ┌─────────────┐                                  │         │
│                  │   Legal     │◀─────────────────────────────────┘         │
│                  │   Review    │                                            │
│                  └──────┬──────┘                                            │
│                         │                                                    │
│                         ▼                                                    │
│                  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│                  │   Sign      │───▶│ Onboarding  │───▶│  Ongoing    │     │
│                  │  Contract   │    │             │    │ Monitoring  │     │
│                  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Security Questionnaire Topics

| Category | Questions |
|----------|-----------|
| **Data Security** | Encryption methods, data handling, retention policies |
| **Access Control** | Authentication, authorization, privileged access |
| **Network Security** | Firewalls, intrusion detection, segmentation |
| **Incident Response** | Breach notification, response procedures |
| **Business Continuity** | DR plans, backup procedures, RTO/RPO |
| **Compliance** | Certifications, audit reports, regulatory adherence |
| **Subprocessors** | Third parties used, data sharing |
| **Personnel** | Background checks, training, termination procedures |

### 4.3 Required Documentation by Tier

| Document | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| SOC 2 Type II Report | Required | Required | Preferred | - |
| ISO 27001 Certificate | Required | Preferred | - | - |
| Security Questionnaire | Required | Required | Required | - |
| Penetration Test Results | Required | Preferred | - | - |
| Insurance Certificate | Required | Required | Preferred | - |
| Privacy Policy | Required | Required | Required | Required |
| DPA/Data Processing Agreement | Required | Required | If data | - |

---

## 5. Contract Requirements

### 5.1 Standard Contract Clauses

| Clause | Purpose | Required For |
|--------|---------|--------------|
| Data Processing Agreement | GDPR compliance | All data processors |
| Security Requirements | Minimum security controls | Critical, High |
| Breach Notification | Incident reporting obligations | All tiers |
| Audit Rights | Right to audit vendor | Critical, High |
| Subprocessor Restrictions | Control over sub-vendors | Critical, High |
| Termination Assistance | Data return/destruction | All data processors |
| Insurance Requirements | Liability coverage | Critical, High |
| SLA with Penalties | Service level guarantees | Critical |

### 5.2 SLA Requirements

| Metric | Critical Vendor | High Vendor | Medium Vendor |
|--------|-----------------|-------------|---------------|
| Uptime | 99.9% | 99.5% | 99% |
| Response Time (P1) | 15 min | 1 hour | 4 hours |
| Resolution Time (P1) | 4 hours | 8 hours | 24 hours |
| Support Hours | 24/7 | 24/7 | Business hours |

### 5.3 Data Processing Agreement (DPA) Template

```
DATA PROCESSING AGREEMENT OUTLINE
=================================

1. DEFINITIONS AND INTERPRETATION
   - Personal Data, Processing, Controller, Processor definitions

2. SCOPE AND PURPOSE
   - Description of processing activities
   - Types of personal data
   - Categories of data subjects

3. PROCESSOR OBLIGATIONS
   - Process only on documented instructions
   - Confidentiality of personnel
   - Security measures
   - Sub-processor management
   - Assistance with data subject rights
   - Deletion/return of data

4. SECURITY MEASURES
   - Technical measures (encryption, access control)
   - Organizational measures (training, policies)
   - Regular testing and evaluation

5. SUB-PROCESSORS
   - Prior authorization required
   - Written agreements with sub-processors
   - List of approved sub-processors

6. DATA TRANSFERS
   - Transfer mechanisms (SCCs, etc.)
   - Transfer impact assessment

7. BREACH NOTIFICATION
   - Notification timeline (within 24 hours)
   - Information to be provided
   - Cooperation requirements

8. AUDIT AND COMPLIANCE
   - Audit rights and procedures
   - Certification evidence

9. TERM AND TERMINATION
   - Duration
   - Termination assistance
   - Data return/destruction
```

---

## 6. Ongoing Monitoring

### 6.1 Monitoring Activities

| Activity | Frequency | Owner | Output |
|----------|-----------|-------|--------|
| Security News Monitoring | Continuous | Security | Alert on issues |
| Vendor Performance Review | Monthly | Owner | Performance report |
| SLA Compliance Check | Monthly | Ops | SLA report |
| Security Re-assessment | Per tier schedule | Security | Assessment report |
| Contract Renewal Review | 90 days before expiry | Procurement | Renewal decision |
| Incident Review | As needed | Security | Incident report |

### 6.2 Performance Scorecard

| Metric | Weight | Measurement |
|--------|--------|-------------|
| Uptime/Availability | 30% | Actual vs. SLA |
| Incident Response | 20% | Response time compliance |
| Security Posture | 20% | Assessment score |
| Support Quality | 15% | Ticket resolution |
| Cost Efficiency | 15% | Value for money |

### 6.3 Red Flags

Immediate review triggered by:
- Security breach at vendor
- Significant service outage
- Acquisition or major leadership change
- Regulatory action against vendor
- Loss of compliance certification
- Financial instability indicators

---

## 7. Vendor Offboarding

### 7.1 Offboarding Checklist

```
VENDOR OFFBOARDING CHECKLIST
============================

1. ACCESS REVOCATION
   □ Revoke all API keys and tokens
   □ Remove vendor from SSO/identity systems
   □ Disable VPN access
   □ Revoke cloud provider permissions
   □ Change shared passwords
   □ Remove from communication channels

2. DATA HANDLING
   □ Request data deletion confirmation
   □ Verify backup destruction
   □ Obtain deletion certificate
   □ Confirm sub-processor data deletion

3. SYSTEM DISCONNECTION
   □ Remove integrations
   □ Update DNS/routing
   □ Archive configuration
   □ Document dependencies resolved

4. ADMINISTRATIVE
   □ Process final invoices
   □ Close purchase orders
   □ Archive contract documents
   □ Update vendor register
   □ Conduct exit review

5. TRANSITION (if applicable)
   □ Data migration complete
   □ New vendor operational
   □ Parallel run completed
   □ Stakeholders notified
```

### 7.2 Data Return/Destruction

| Requirement | Timeline | Verification |
|-------------|----------|--------------|
| Data export provided | Within 30 days | Data integrity check |
| Production data deleted | Within 30 days | Deletion certificate |
| Backup data deleted | Within 90 days | Written confirmation |
| Sub-processor data deleted | Within 90 days | Cascade confirmation |

---

## 8. Vendor Risk Register

### 8.1 Current Risks

| Vendor | Risk | Likelihood | Impact | Mitigation | Owner |
|--------|------|------------|--------|------------|-------|
| AWS | Region outage | Low | Critical | Multi-region DR | Ops |
| Auth0 | Service degradation | Medium | High | Token caching | Eng |
| Stripe | Payment outage | Low | High | Queue transactions | Finance |

### 8.2 Risk Mitigation Strategies

| Strategy | Description | Applicable When |
|----------|-------------|-----------------|
| Multi-vendor | Use multiple vendors for same service | Critical dependency |
| Caching/Queuing | Buffer against temporary outages | External APIs |
| Graceful degradation | Continue with reduced functionality | Non-critical features |
| Data portability | Maintain ability to migrate | High lock-in risk |
| Contractual protection | Strong SLAs, penalties | Business-critical |

---

## 9. Vendor Contact Directory

| Vendor | Primary Contact | Emergency Contact | Support Portal |
|--------|-----------------|-------------------|----------------|
| AWS | Account Manager | Support Hotline | console.aws.amazon.com |
| Auth0 | Customer Success | support@auth0.com | support.auth0.com |
| Stripe | Account Rep | Urgent support | dashboard.stripe.com |

---

## 10. Related Documents

- [Information Security Policy](./08-information-security-policy.md)
- [Data Protection Policy](./10-data-protection-privacy-policy.md)
- [Disaster Recovery Plan](./11-disaster-recovery-business-continuity.md)
- [IP Assignment Agreement](./15-ip-assignment-nda.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Procurement Lead | {{PROC_NAME}} | | |
| Legal Counsel | {{LEGAL_NAME}} | | |
# Vendor Management / Third-Party Risk Documents
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Procurement  
**Classification:** Confidential

---

## 1. Purpose and Scope

### 1.1 Purpose
This document establishes the framework for managing third-party vendors, including security assessments, contract requirements, and ongoing monitoring to ensure vendors meet our security, compliance, and operational standards.

### 1.2 Scope
Applies to all third-party vendors that:
- Access, process, or store company or customer data
- Provide critical services or infrastructure
- Integrate with our systems
- Have access to our networks or facilities

---

## 2. Vendor Classification

### 2.1 Risk Tiers

| Tier | Criteria | Assessment Required | Review Frequency |
|------|----------|---------------------|------------------|
| **Critical** | Processes sensitive data, critical to operations | Full assessment, SOC 2/ISO 27001 | Quarterly |
| **High** | Access to customer data, significant integration | Security questionnaire, certifications | Semi-annual |
| **Medium** | Limited data access, replaceable service | Basic questionnaire | Annual |
| **Low** | No data access, minimal integration | Standard terms review | Biennial |

### 2.2 Classification Factors

| Factor | Weight | Questions |
|--------|--------|-----------|
| Data Sensitivity | High | What data types will vendor access? |
| System Access | High | Will vendor connect to our systems? |
| Business Criticality | High | Impact if vendor unavailable? |
| Replaceability | Medium | How easily can we switch vendors? |
| Regulatory Impact | High | Does vendor affect our compliance? |

---

## 3. Current Vendor Register

### 3.1 Critical Vendors

| Vendor | Service | Data Access | Certification | Contract Expiry | Owner |
|--------|---------|-------------|---------------|-----------------|-------|
| AWS | Cloud Infrastructure | All (encrypted) | SOC 2, ISO 27001 | {{DATE}} | Ops |
| Auth0 | Authentication | User credentials | SOC 2, ISO 27001 | {{DATE}} | Eng |
| Stripe | Payment Processing | Billing info | PCI-DSS Level 1 | {{DATE}} | Finance |

### 3.2 High-Risk Vendors

| Vendor | Service | Data Access | Certification | Contract Expiry | Owner |
|--------|---------|-------------|---------------|-----------------|-------|
| SendGrid | Email Delivery | Email, name | SOC 2 | {{DATE}} | Eng |
| DataDog | Monitoring | Logs (filtered) | SOC 2 | {{DATE}} | Ops |
| GitHub | Code Repository | Source code | SOC 2 | {{DATE}} | Eng |

### 3.3 Medium-Risk Vendors

| Vendor | Service | Data Access | Contract Expiry | Owner |
|--------|---------|-------------|-----------------|-------|
| Slack | Team Communication | Internal comms | {{DATE}} | IT |
| Notion | Documentation | Internal docs | {{DATE}} | Ops |
| Figma | Design | UI mockups | {{DATE}} | Design |

---

## 4. Vendor Assessment Process

### 4.1 Assessment Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VENDOR ASSESSMENT WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [New Vendor Request]                                                       │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   Initial   │───▶│    Risk     │───▶│  Security   │                     │
│  │  Screening  │    │Classification│   │ Assessment  │                     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                     │
│                                               │                             │
│                         ┌─────────────────────┴─────────────────────┐       │
│                         │                                           │       │
│                         ▼                                           ▼       │
│                  [Pass Assessment]                          [Fail/Issues]   │
│                         │                                           │       │
│                         ▼                                           ▼       │
│                  ┌─────────────┐                           ┌─────────────┐  │
│                  │  Contract   │                           │ Remediation │  │
│                  │  Negotiation│                           │  Required   │  │
│                  └──────┬──────┘                           └──────┬──────┘  │
│                         │                                         │         │
│                         ▼                                         │         │
│                  ┌─────────────┐                                  │         │
│                  │   Legal     │◀─────────────────────────────────┘         │
│                  │   Review    │                                            │
│                  └──────┬──────┘                                            │
│                         │                                                    │
│                         ▼                                                    │
│                  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│                  │   Sign      │───▶│ Onboarding  │───▶│  Ongoing    │     │
│                  │  Contract   │    │             │    │ Monitoring  │     │
│                  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Security Questionnaire Topics

| Category | Questions |
|----------|-----------|
| **Data Security** | Encryption methods, data handling, retention policies |
| **Access Control** | Authentication, authorization, privileged access |
| **Network Security** | Firewalls, intrusion detection, segmentation |
| **Incident Response** | Breach notification, response procedures |
| **Business Continuity** | DR plans, backup procedures, RTO/RPO |
| **Compliance** | Certifications, audit reports, regulatory adherence |
| **Subprocessors** | Third parties used, data sharing |
| **Personnel** | Background checks, training, termination procedures |

### 4.3 Required Documentation by Tier

| Document | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| SOC 2 Type II Report | Required | Required | Preferred | - |
| ISO 27001 Certificate | Required | Preferred | - | - |
| Security Questionnaire | Required | Required | Required | - |
| Penetration Test Results | Required | Preferred | - | - |
| Insurance Certificate | Required | Required | Preferred | - |
| Privacy Policy | Required | Required | Required | Required |
| DPA/Data Processing Agreement | Required | Required | If data | - |

---

## 5. Contract Requirements

### 5.1 Standard Contract Clauses

| Clause | Purpose | Required For |
|--------|---------|--------------|
| Data Processing Agreement | GDPR compliance | All data processors |
| Security Requirements | Minimum security controls | Critical, High |
| Breach Notification | Incident reporting obligations | All tiers |
| Audit Rights | Right to audit vendor | Critical, High |
| Subprocessor Restrictions | Control over sub-vendors | Critical, High |
| Termination Assistance | Data return/destruction | All data processors |
| Insurance Requirements | Liability coverage | Critical, High |
| SLA with Penalties | Service level guarantees | Critical |

### 5.2 SLA Requirements

| Metric | Critical Vendor | High Vendor | Medium Vendor |
|--------|-----------------|-------------|---------------|
| Uptime | 99.9% | 99.5% | 99% |
| Response Time (P1) | 15 min | 1 hour | 4 hours |
| Resolution Time (P1) | 4 hours | 8 hours | 24 hours |
| Support Hours | 24/7 | 24/7 | Business hours |

### 5.3 Data Processing Agreement (DPA) Template

```
DATA PROCESSING AGREEMENT OUTLINE
=================================

1. DEFINITIONS AND INTERPRETATION
   - Personal Data, Processing, Controller, Processor definitions

2. SCOPE AND PURPOSE
   - Description of processing activities
   - Types of personal data
   - Categories of data subjects

3. PROCESSOR OBLIGATIONS
   - Process only on documented instructions
   - Confidentiality of personnel
   - Security measures
   - Sub-processor management
   - Assistance with data subject rights
   - Deletion/return of data

4. SECURITY MEASURES
   - Technical measures (encryption, access control)
   - Organizational measures (training, policies)
   - Regular testing and evaluation

5. SUB-PROCESSORS
   - Prior authorization required
   - Written agreements with sub-processors
   - List of approved sub-processors

6. DATA TRANSFERS
   - Transfer mechanisms (SCCs, etc.)
   - Transfer impact assessment

7. BREACH NOTIFICATION
   - Notification timeline (within 24 hours)
   - Information to be provided
   - Cooperation requirements

8. AUDIT AND COMPLIANCE
   - Audit rights and procedures
   - Certification evidence

9. TERM AND TERMINATION
   - Duration
   - Termination assistance
   - Data return/destruction
```

---

## 6. Ongoing Monitoring

### 6.1 Monitoring Activities

| Activity | Frequency | Owner | Output |
|----------|-----------|-------|--------|
| Security News Monitoring | Continuous | Security | Alert on issues |
| Vendor Performance Review | Monthly | Owner | Performance report |
| SLA Compliance Check | Monthly | Ops | SLA report |
| Security Re-assessment | Per tier schedule | Security | Assessment report |
| Contract Renewal Review | 90 days before expiry | Procurement | Renewal decision |
| Incident Review | As needed | Security | Incident report |

### 6.2 Performance Scorecard

| Metric | Weight | Measurement |
|--------|--------|-------------|
| Uptime/Availability | 30% | Actual vs. SLA |
| Incident Response | 20% | Response time compliance |
| Security Posture | 20% | Assessment score |
| Support Quality | 15% | Ticket resolution |
| Cost Efficiency | 15% | Value for money |

### 6.3 Red Flags

Immediate review triggered by:
- Security breach at vendor
- Significant service outage
- Acquisition or major leadership change
- Regulatory action against vendor
- Loss of compliance certification
- Financial instability indicators

---

## 7. Vendor Offboarding

### 7.1 Offboarding Checklist

```
VENDOR OFFBOARDING CHECKLIST
============================

1. ACCESS REVOCATION
   □ Revoke all API keys and tokens
   □ Remove vendor from SSO/identity systems
   □ Disable VPN access
   □ Revoke cloud provider permissions
   □ Change shared passwords
   □ Remove from communication channels

2. DATA HANDLING
   □ Request data deletion confirmation
   □ Verify backup destruction
   □ Obtain deletion certificate
   □ Confirm sub-processor data deletion

3. SYSTEM DISCONNECTION
   □ Remove integrations
   □ Update DNS/routing
   □ Archive configuration
   □ Document dependencies resolved

4. ADMINISTRATIVE
   □ Process final invoices
   □ Close purchase orders
   □ Archive contract documents
   □ Update vendor register
   □ Conduct exit review

5. TRANSITION (if applicable)
   □ Data migration complete
   □ New vendor operational
   □ Parallel run completed
   □ Stakeholders notified
```

### 7.2 Data Return/Destruction

| Requirement | Timeline | Verification |
|-------------|----------|--------------|
| Data export provided | Within 30 days | Data integrity check |
| Production data deleted | Within 30 days | Deletion certificate |
| Backup data deleted | Within 90 days | Written confirmation |
| Sub-processor data deleted | Within 90 days | Cascade confirmation |

---

## 8. Vendor Risk Register

### 8.1 Current Risks

| Vendor | Risk | Likelihood | Impact | Mitigation | Owner |
|--------|------|------------|--------|------------|-------|
| AWS | Region outage | Low | Critical | Multi-region DR | Ops |
| Auth0 | Service degradation | Medium | High | Token caching | Eng |
| Stripe | Payment outage | Low | High | Queue transactions | Finance |

### 8.2 Risk Mitigation Strategies

| Strategy | Description | Applicable When |
|----------|-------------|-----------------|
| Multi-vendor | Use multiple vendors for same service | Critical dependency |
| Caching/Queuing | Buffer against temporary outages | External APIs |
| Graceful degradation | Continue with reduced functionality | Non-critical features |
| Data portability | Maintain ability to migrate | High lock-in risk |
| Contractual protection | Strong SLAs, penalties | Business-critical |

---

## 9. Vendor Contact Directory

| Vendor | Primary Contact | Emergency Contact | Support Portal |
|--------|-----------------|-------------------|----------------|
| AWS | Account Manager | Support Hotline | console.aws.amazon.com |
| Auth0 | Customer Success | support@auth0.com | support.auth0.com |
| Stripe | Account Rep | Urgent support | dashboard.stripe.com |

---

## 10. Related Documents

- [Information Security Policy](./08-information-security-policy.md)
- [Data Protection Policy](./10-data-protection-privacy-policy.md)
- [Disaster Recovery Plan](./11-disaster-recovery-business-continuity.md)
- [IP Assignment Agreement](./15-ip-assignment-nda.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Procurement Lead | {{PROC_NAME}} | | |
| Legal Counsel | {{LEGAL_NAME}} | | |
