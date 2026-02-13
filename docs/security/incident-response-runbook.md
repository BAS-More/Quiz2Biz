# Security Incident Response Runbook

## Document Information
| Field | Value |
|-------|-------|
| Version | 1.0 |
| Last Updated | 2026-01-28 |
| Owner | Security Team |
| Review Frequency | Quarterly |

---

## 1. Purpose

This runbook provides step-by-step procedures for responding to security incidents affecting Quiz-to-Build. It ensures consistent, effective incident handling to minimize damage and recovery time.

---

## 2. Incident Classification

### Severity Levels

| Level | Name | Description | Response Time | Examples |
|-------|------|-------------|---------------|----------|
| P1 | Critical | Active breach, data exfiltration, service unavailable | 15 minutes | Ransomware, active attacker, complete outage |
| P2 | High | Potential breach, security control bypass | 1 hour | Unauthorized access attempt, credential leak |
| P3 | Medium | Security misconfiguration, vulnerability detected | 4 hours | Unpatched CVE, exposed endpoint |
| P4 | Low | Minor security issue, policy violation | 24 hours | Failed login attempts, policy deviation |

### Incident Categories

| Category | Description |
|----------|-------------|
| **DATA_BREACH** | Unauthorized access to or exfiltration of data |
| **MALWARE** | Malicious software detected in environment |
| **UNAUTHORIZED_ACCESS** | Illegitimate access to systems/data |
| **DOS_ATTACK** | Denial of service affecting availability |
| **CREDENTIAL_COMPROMISE** | Leaked or stolen credentials |
| **INSIDER_THREAT** | Malicious or negligent insider activity |
| **VULNERABILITY** | Critical security vulnerability discovered |
| **PHISHING** | Social engineering attack attempt |

---

## 3. Incident Response Team

### Roles and Responsibilities

| Role | Primary | Backup | Responsibilities |
|------|---------|--------|------------------|
| Incident Commander | CTO | Engineering Lead | Overall coordination, decisions, communications |
| Security Lead | Security Engineer | DevOps Lead | Technical investigation, containment |
| Communications Lead | CEO | Product Manager | Stakeholder/customer communication |
| Legal Advisor | External Counsel | - | Legal guidance, regulatory compliance |
| Technical Responder | On-call Engineer | Backend Developer | Technical remediation |

### Contact Information
```
INCIDENT HOTLINE: [REDACTED]
SECURITY EMAIL: security@quiz-to-build.com
SLACK CHANNEL: #security-incidents
```

---

## 4. Incident Response Phases

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐    ┌─────────────┐
│ Detect  │───▶│  Contain    │───▶│ Eradicate   │───▶│  Recover   │───▶│   Review    │
│         │    │             │    │             │    │            │    │             │
└─────────┘    └─────────────┘    └─────────────┘    └────────────┘    └─────────────┘
   15 min         1-4 hours         4-24 hours        24-72 hours       1-2 weeks
```

---

## 5. Phase 1: Detection & Triage

### 5.1 Initial Detection Sources
- Azure Security Center alerts
- Application logs (suspicious activity)
- User reports
- Third-party notifications (HackerOne, security researchers)
- Automated monitoring (GitLeaks, Trivy)

### 5.2 Triage Checklist

```markdown
□ Confirm incident is real (not false positive)
□ Determine incident category and severity
□ Identify affected systems and data
□ Assess ongoing risk
□ Document initial findings
□ Notify Incident Commander
□ Open incident ticket in tracking system
```

### 5.3 Initial Documentation Template

```
INCIDENT ID: INC-YYYY-MM-DD-###
DETECTION TIME: [timestamp]
REPORTER: [name/system]
INITIAL SEVERITY: [P1/P2/P3/P4]
CATEGORY: [category]
AFFECTED SYSTEMS: [list]
INITIAL DESCRIPTION: [brief description]
```

---

## 6. Phase 2: Containment

### 6.1 Immediate Containment Actions

#### For Credential Compromise
```bash
# 1. Revoke compromised tokens/sessions
az keyvault secret set --name jwt-secret --value $(openssl rand -base64 32) --vault-name quiz-to-build-kv-prod

# 2. Force logout all users
redis-cli FLUSHDB  # Clear all sessions

# 3. Rotate affected credentials
# Update database passwords, API keys as needed
```

#### For Unauthorized Access
```bash
# 1. Block suspicious IP addresses
az network nsg rule create \
  --resource-group quiz-to-build-rg \
  --nsg-name quiz-to-build-nsg \
  --name BlockAttacker \
  --priority 100 \
  --access Deny \
  --source-address-prefixes [ATTACKER_IP]

# 2. Disable compromised accounts
# Via admin panel or direct database update

# 3. Enable enhanced logging
# Increase log verbosity for affected systems
```

#### For Data Breach
```bash
# 1. Isolate affected database
# Restrict network access to database

# 2. Preserve evidence
pg_dump quiz_to_build > incident_$(date +%Y%m%d)_backup.sql

# 3. Enable audit logging if not already active
```

#### For DoS Attack
```bash
# 1. Enable Azure DDoS Protection
az network ddos-protection create \
  --resource-group quiz-to-build-rg \
  --name quiz-to-build-ddos

# 2. Scale up application
az containerapp update \
  --name quiz-to-build-api \
  --resource-group quiz-to-build-rg \
  --max-replicas 20

# 3. Enable rate limiting rules
# Update WAF/Application Gateway rules
```

### 6.2 Containment Verification
```markdown
□ Attacker access blocked
□ Affected systems isolated
□ Evidence preserved
□ Business continuity maintained where possible
□ Containment documented
```

---

## 7. Phase 3: Eradication

### 7.1 Root Cause Analysis

```markdown
□ Identify attack vector
□ Determine vulnerability exploited
□ Assess full scope of compromise
□ Identify all affected systems/data
□ Document findings
```

### 7.2 Eradication Actions

#### Remove Malicious Artifacts
```bash
# Scan for malware/backdoors
trivy fs --severity HIGH,CRITICAL /app

# Review and clean compromised files
git diff HEAD~10..HEAD --name-only | xargs -I {} git checkout origin/main -- {}
```

#### Patch Vulnerabilities
```bash
# Update dependencies
npm audit fix

# Apply security patches
npm update --include=dev

# Deploy patched version
az containerapp update --name quiz-to-build-api --image $NEW_IMAGE
```

#### Reset Compromised Credentials
```bash
# Rotate all secrets in Key Vault
az keyvault secret list --vault-name quiz-to-build-kv-prod --query "[].name" -o tsv | \
  while read secret; do
    az keyvault secret set --name $secret --value $(openssl rand -base64 32) --vault-name quiz-to-build-kv-prod
  done
```

### 7.3 Eradication Verification
```markdown
□ Vulnerability patched/mitigated
□ Malicious artifacts removed
□ Compromised credentials rotated
□ Security controls strengthened
□ Changes tested in staging first
```

---

## 8. Phase 4: Recovery

### 8.1 Recovery Steps

```bash
# 1. Restore from clean backup (if needed)
az postgres server restore \
  --resource-group quiz-to-build-rg \
  --name quiz-to-build-db-restored \
  --source-server quiz-to-build-db \
  --restore-point-in-time "2026-01-27T00:00:00Z"

# 2. Redeploy application
az containerapp update \
  --name quiz-to-build-api \
  --resource-group quiz-to-build-rg \
  --image quiztobuildreg.azurecr.io/api:latest

# 3. Verify application health
curl -f https://api.quiz-to-build.com/health || exit 1

# 4. Re-enable user access gradually
# Start with internal users, then expand
```

### 8.2 Recovery Verification
```markdown
□ Systems restored to known-good state
□ All services operational
□ Security controls in place
□ Monitoring active
□ User access restored
□ Performance verified
```

### 8.3 Monitoring During Recovery
- Enhanced logging enabled
- Real-time alerting active
- Manual verification of critical functions
- Regular health checks

---

## 9. Phase 5: Post-Incident Review

### 9.1 Post-Incident Report Template

```markdown
# Post-Incident Report: INC-YYYY-MM-DD-###

## Executive Summary
[Brief overview of incident, impact, and resolution]

## Timeline
| Time | Event |
|------|-------|
| [timestamp] | Incident detected |
| [timestamp] | Incident commander notified |
| [timestamp] | Containment initiated |
| [timestamp] | Containment complete |
| [timestamp] | Eradication complete |
| [timestamp] | Recovery complete |
| [timestamp] | Incident closed |

## Impact Assessment
- **Systems Affected**: [list]
- **Data Affected**: [description]
- **Users Affected**: [number/description]
- **Business Impact**: [description]
- **Financial Impact**: [estimate if known]

## Root Cause Analysis
[Detailed technical analysis]

## Response Effectiveness
- What went well:
- What could be improved:
- Gaps identified:

## Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [action] | [name] | [date] | [status] |

## Lessons Learned
[Key takeaways for future incident prevention/response]
```

### 9.2 Post-Incident Meeting
- Schedule within 5 business days of incident closure
- Include all incident responders
- Blameless culture - focus on process improvement
- Document action items with owners and due dates

---

## 10. Communication Templates

### 10.1 Internal Notification (Initial)
```
Subject: [SEVERITY] Security Incident - INC-YYYY-MM-DD-###

Team,

A security incident has been detected and is being investigated.

Severity: [P1/P2/P3/P4]
Affected Systems: [list]
Current Status: [Investigating/Contained/Resolved]

The incident response team has been activated. Updates will follow.

For questions, contact: [Incident Commander]

Do not discuss this incident externally until authorized.
```

### 10.2 Customer Notification (If Required)
```
Subject: Security Notice - Action May Be Required

Dear [Customer],

We are writing to inform you of a security incident that may have affected your data.

What Happened:
[Brief, factual description]

What Information Was Involved:
[Specific data types affected]

What We Are Doing:
[Actions taken to address]

What You Can Do:
[Recommended actions for customer]

For More Information:
[Contact details, FAQ link]

We apologize for any inconvenience and are committed to protecting your information.
```

### 10.3 Regulatory Notification (OAIC - Australia)
```
Notifiable Data Breach Report

Organization: Quiz-to-Build Pty Ltd
Contact: [Privacy Officer contact]
Date of Breach: [date]
Date Discovered: [date]

Description of Breach:
[Detailed description]

Types of Personal Information:
[List affected data types]

Number of Individuals Affected:
[Number or estimate]

Steps Taken:
[Containment and remediation actions]

Notification to Individuals:
[Description of customer notification]
```

---

## 11. Regulatory Requirements

### Australian Privacy Act - Notifiable Data Breaches

**Notification Required When:**
- Unauthorized access to personal information
- Likely to result in serious harm
- Unable to prevent harm through remedial action

**Notification Timeline:**
- Report to OAIC: As soon as practicable (within 30 days)
- Notify affected individuals: As soon as practicable

**Documentation Requirements:**
- Maintain breach register
- Document assessment of harm
- Record notification decisions

---

## 12. Tools and Resources

### Investigation Tools
| Tool | Purpose | Access |
|------|---------|--------|
| Azure Security Center | Threat detection, alerts | Azure Portal |
| Log Analytics | Log search, analysis | Azure Portal |
| Application Insights | Application monitoring | Azure Portal |
| GitLeaks | Secret detection | CI/CD Pipeline |
| Trivy | Vulnerability scanning | CI/CD Pipeline |

### Runbook Commands Quick Reference
```bash
# View application logs
az containerapp logs show --name quiz-to-build-api --resource-group quiz-to-build-rg

# Check security alerts
az security alert list --resource-group quiz-to-build-rg

# View Key Vault access logs
az monitor activity-log list --resource-group quiz-to-build-rg --resource-type Microsoft.KeyVault/vaults

# Scale application
az containerapp update --name quiz-to-build-api --min-replicas 3 --max-replicas 10
```

---

## 13. Appendices

### Appendix A: Incident Response Checklist
```markdown
## Detection
□ Incident confirmed
□ Severity assigned
□ Ticket created
□ Commander notified

## Containment
□ Immediate threats blocked
□ Systems isolated if needed
□ Evidence preserved
□ Business impact minimized

## Eradication
□ Root cause identified
□ Vulnerability patched
□ Malware/artifacts removed
□ Credentials rotated

## Recovery
□ Systems restored
□ Services verified
□ Users notified
□ Monitoring enhanced

## Post-Incident
□ Report written
□ Meeting held
□ Action items assigned
□ Lessons documented
```

### Appendix B: Emergency Contacts
```
Azure Support: [Enterprise Support Number]
Legal Counsel: [Law Firm Contact]
PR/Communications: [Agency Contact]
Cyber Insurance: [Policy Number, Claims Contact]
OAIC Breach Notification: https://www.oaic.gov.au/privacy/notifiable-data-breaches
```

### Appendix C: Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | Security Team | Initial version |
