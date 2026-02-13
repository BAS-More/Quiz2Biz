# Quiz2Biz: Assumptions, Exclusions, and Open Risks

**Document Version**: 1.0  
**Created**: January 28, 2026  
**Last Updated**: January 28, 2026  
**Owner**: Quiz2Biz Engineering Team

---

## 1. Assumptions

This section documents assumptions made during the development and assessment of Quiz2Biz platform.

### 1.1 Technical Assumptions

| ID | Assumption | Impact if Invalid | Mitigation |
|----|------------|-------------------|------------|
| A-001 | Azure cloud services maintain 99.9% SLA | High - Service disruption | Multi-region deployment ready |
| A-002 | Node.js LTS versions receive security patches within 24 hours | Medium - Security exposure | Automated dependency updates |
| A-003 | PostgreSQL handles 10,000+ concurrent connections | Medium - Performance degradation | Connection pooling implemented |
| A-004 | Redis cache provides sub-10ms response times | Low - Slower UX | Fallback to DB-only mode |
| A-005 | Container images under 500MB for fast deployment | Low - Slower deploys | Multi-stage builds in place |
| A-006 | API response times under 200ms for 95th percentile | Medium - Poor UX | Caching and query optimization |
| A-007 | WebSocket connections stable for 8+ hours | Low - Reconnection needed | Auto-reconnect implemented |

### 1.2 Business Assumptions

| ID | Assumption | Impact if Invalid | Mitigation |
|----|------------|-------------------|------------|
| A-101 | Target customers have existing compliance needs | High - No market fit | MVP testing with early adopters |
| A-102 | Organizations willing to pay $99-999/month | High - Revenue impact | Flexible pricing tiers |
| A-103 | 70% of users complete full assessment | Medium - Lower engagement | Adaptive questioning, progress saving |
| A-104 | Single admin can manage up to 50 team members | Low - Admin overhead | Self-service user management |
| A-105 | Average assessment completion time is 2-4 hours | Medium - User drop-off | Session persistence, resumable flows |

### 1.3 Security Assumptions

| ID | Assumption | Impact if Invalid | Mitigation |
|----|------------|-------------------|------------|
| A-201 | Auth0 provides enterprise-grade identity management | High - AuthN bypass risk | JWT validation, token rotation |
| A-202 | Azure Key Vault secrets remain confidential | Critical - Full compromise | Secret rotation, audit logging |
| A-203 | Container signing prevents supply chain attacks | Medium - Malicious deployments | Signature verification blocking |
| A-204 | OWASP ASVS L2 controls are sufficient for SaaS | Medium - Compliance gaps | Continuous security testing |
| A-205 | RFC 3161 timestamps are legally admissible | Low - Evidence disputes | Multiple TSA providers |

### 1.4 Operational Assumptions

| ID | Assumption | Impact if Invalid | Mitigation |
|----|------------|-------------------|------------|
| A-301 | Support team can handle 100 tickets/day | Medium - Customer churn | Self-service documentation |
| A-302 | Updates can be deployed with zero downtime | Medium - Service disruption | Blue-green deployment |
| A-303 | Log retention of 90 days meets compliance | Medium - Audit failures | Configurable retention |
| A-304 | Monthly patch cycles are sufficient | Medium - Security exposure | Emergency patch process |

---

## 2. Exclusions

This section documents items explicitly excluded from the current scope.

### 2.1 Feature Exclusions

| ID | Exclusion | Reason | Future Consideration |
|----|-----------|--------|---------------------|
| E-001 | Mobile native applications | Focus on web platform first | Q3 2026 |
| E-002 | Offline-first architecture | Complexity vs. value | CLI offline mode provided |
| E-003 | White-label/multi-tenant UI customization | MVP simplicity | Enterprise tier feature |
| E-004 | Real-time collaborative editing | Development cost | Post-MVP evaluation |
| E-005 | Custom question authoring by end-users | Quality control concerns | Admin-only feature |
| E-006 | AI/ML-based automated scoring | Model accuracy concerns | Research phase |
| E-007 | Video evidence upload | Storage cost concerns | Enterprise tier |
| E-008 | Blockchain-based evidence storage | Complexity, cost | Research only |

### 2.2 Integration Exclusions

| ID | Exclusion | Reason | Future Consideration |
|----|-----------|--------|---------------------|
| E-101 | AWS infrastructure support | Azure-first strategy | Q2 2026 |
| E-102 | GCP infrastructure support | Azure-first strategy | Q3 2026 |
| E-103 | ServiceNow integration | Development complexity | Q2 2026 |
| E-104 | Salesforce integration | Market fit unclear | Customer-driven |
| E-105 | On-premises deployment | Cloud-native architecture | Enterprise tier |
| E-106 | Azure DevOps adapter | GitHub/GitLab priority | Q1 2026 |
| E-107 | Bitbucket adapter | Low market demand | Customer-driven |

### 2.3 Compliance Exclusions

| ID | Exclusion | Reason | Future Consideration |
|----|-----------|--------|---------------------|
| E-201 | FedRAMP certification | Federal market not targeted | 2027+ |
| E-202 | HIPAA BAA execution | Healthcare not primary market | Enterprise tier |
| E-203 | PCI DSS Level 1 | Not handling card data directly | Stripe compliance |
| E-204 | SOC 2 Type II report (current) | Type I in progress | Q2 2026 |
| E-205 | ISO 27001 certification | Self-assessment vs. certified | Q4 2026 |

### 2.4 Geographic Exclusions

| ID | Exclusion | Reason | Future Consideration |
|----|-----------|--------|---------------------|
| E-301 | China data residency | Regulatory complexity | Not planned |
| E-302 | Russia data residency | Sanctions concerns | Not planned |
| E-303 | Middle East data centers | Limited demand | Customer-driven |
| E-304 | Africa data centers | Infrastructure availability | 2027+ |

---

## 3. Open Risks

This section documents identified risks that require ongoing monitoring and management.

### 3.1 Technical Risks

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|----|------|-------------|--------|------------|-------|--------|
| R-001 | Database performance degradation at scale | Medium | High | Implement read replicas, query optimization | Platform Team | Monitoring |
| R-002 | Third-party API rate limiting (GitHub, GitLab) | High | Medium | Implement caching, queue-based processing | Integration Team | Active |
| R-003 | Container vulnerability discovered post-deployment | Medium | High | Daily Trivy scans, rapid patch process | Security Team | Active |
| R-004 | Auth0 service outage | Low | Critical | JWT caching, graceful degradation | Platform Team | Monitoring |
| R-005 | Redis cache eviction during peak load | Medium | Medium | Cache sizing, fallback patterns | Platform Team | Monitoring |
| R-006 | Azure region outage | Low | High | Multi-region failover capability | DevOps Team | Planned |

### 3.2 Security Risks

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|----|------|-------------|--------|------------|-------|--------|
| R-101 | Zero-day vulnerability in NestJS framework | Low | High | Subscribe to security advisories, WAF rules | Security Team | Monitoring |
| R-102 | API key exposure in client-side code | Medium | High | Server-side API proxying, key rotation | Development Team | Mitigated |
| R-103 | Evidence tampering by malicious admin | Low | Medium | Hash chain, two-person rule, audit logs | Security Team | Mitigated |
| R-104 | DDoS attack on API endpoints | Medium | High | Azure DDoS protection, rate limiting | Platform Team | Active |
| R-105 | Insider threat from contractor access | Low | High | Least privilege, access reviews | Security Team | Active |
| R-106 | Phishing attack on admin accounts | Medium | High | MFA required, security training | Security Team | Active |

### 3.3 Business Risks

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|----|------|-------------|--------|------------|-------|--------|
| R-201 | Market adoption slower than projected | Medium | High | Pivot capability, burn rate management | Leadership | Monitoring |
| R-202 | Competitor releases similar product | Medium | Medium | Feature differentiation, customer success | Product Team | Monitoring |
| R-203 | Key personnel departure | Medium | Medium | Documentation, knowledge sharing | HR | Active |
| R-204 | Regulatory change affecting compliance mapping | Low | Medium | Standard update subscription, agile response | Compliance Team | Monitoring |
| R-205 | Customer data breach leading to reputation damage | Low | Critical | Security controls, insurance, incident response | Security Team | Active |

### 3.4 Operational Risks

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|----|------|-------------|--------|------------|-------|--------|
| R-301 | Azure cost overrun | Medium | Medium | Budget alerts, reserved instances | Finance | Monitoring |
| R-302 | Support ticket backlog during launch | High | Medium | KB articles, chatbot, scaled support | Support Team | Planned |
| R-303 | Failed deployment during business hours | Medium | Medium | Blue-green deployment, rollback automation | DevOps Team | Mitigated |
| R-304 | Data migration failure during updates | Low | High | Backup strategy, migration testing | Platform Team | Active |
| R-305 | Third-party dependency deprecated | Medium | Low | Dependency audit, alternative research | Development Team | Monitoring |

---

## 4. Risk Matrix Summary

```
Impact →        Low         Medium        High        Critical
Probability ↓
─────────────────────────────────────────────────────────────────
High            R-305       R-002,R-302   -           -
                            R-106

Medium          R-005       R-001,R-104   R-103,R-201 -
                R-203       R-202,R-301   R-202,R-303
                            R-102

Low             E-204       R-204,R-304   R-003,R-006 R-104,R-205
                                          R-101
─────────────────────────────────────────────────────────────────
```

### Risk Acceptance Criteria

- **Critical Impact**: Requires executive approval, no accepted risks
- **High Impact**: Requires mitigation plan within 30 days
- **Medium Impact**: Monitored quarterly, mitigation planned
- **Low Impact**: Accepted with documentation

---

## 5. Document Maintenance

### Review Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Full document review | Quarterly | Risk Manager |
| Risk status updates | Monthly | Risk Owners |
| New risk identification | Continuous | All Teams |
| Assumption validation | Bi-annually | Product Team |
| Exclusion review | Release cycles | Product Team |

### Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| Jan 28, 2026 | 1.0 | Initial document creation | Engineering Team |

---

## 6. Acknowledgments

This document has been reviewed and acknowledged by:

- [ ] CTO / Technical Leadership
- [ ] Security Officer
- [ ] Product Manager
- [ ] Compliance Officer
- [ ] Finance Representative

---

*This document is a living record and should be updated as new information becomes available or circumstances change.*
