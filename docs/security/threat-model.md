# STRIDE Threat Model - Quiz2Biz Adaptive Questionnaire System

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-28  
**Author:** Security Team  
**Status:** APPROVED

---

## 1. Executive Summary

This document presents a comprehensive threat model for the Quiz2Biz Adaptive Questionnaire System using the STRIDE methodology. The analysis covers all major components of the system and identifies potential security threats, their impact, and recommended mitigations.

## 2. System Overview

### 2.1 Architecture Summary

The Quiz2Biz system is a cloud-native application deployed on Azure Container Apps consisting of:

- **Frontend**: React SPA hosted on Azure Static Web Apps
- **Backend API**: NestJS application running in Azure Container Apps
- **Database**: Azure PostgreSQL Flexible Server
- **Cache**: Azure Redis Cache
- **Storage**: Azure Blob Storage (evidence files)
- **Identity**: JWT-based authentication with Azure AD B2C integration

### 2.2 Data Flow Diagram

```
┌─────────────┐     HTTPS      ┌──────────────┐     Internal    ┌──────────────┐
│   Browser   │◄──────────────►│   API        │◄───────────────►│  PostgreSQL  │
│   (User)    │                │   Gateway    │                 │   Database   │
└─────────────┘                └──────────────┘                 └──────────────┘
                                      │                                │
                                      │                                │
                              ┌───────▼───────┐              ┌─────────▼──────┐
                              │    Redis      │              │  Blob Storage  │
                              │    Cache      │              │   (Evidence)   │
                              └───────────────┘              └────────────────┘
```

### 2.3 Trust Boundaries

| Boundary ID | Description | Components |
|-------------|-------------|------------|
| TB-1 | Public Internet to Frontend | Users ↔ React SPA |
| TB-2 | Frontend to Backend API | SPA ↔ NestJS API |
| TB-3 | Backend to Data Stores | API ↔ PostgreSQL, Redis, Blob Storage |
| TB-4 | External Services | API ↔ SendGrid, Azure AD |

---

## 3. STRIDE Analysis

### 3.1 Spoofing (S)

| Threat ID | Description | Component | Likelihood | Impact | Risk | Mitigation |
|-----------|-------------|-----------|------------|--------|------|------------|
| S-01 | Attacker spoofs user identity via stolen JWT | Auth Module | Medium | High | HIGH | Short token expiry (15min access, 7d refresh), token rotation on refresh, secure HttpOnly cookies |
| S-02 | Session hijacking via XSS | Frontend | Low | High | MEDIUM | CSP headers, HttpOnly cookies, SameSite=Strict |
| S-03 | API impersonation | Backend | Low | Critical | MEDIUM | Mutual TLS for service-to-service, API key validation |
| S-04 | Spoofed email verification links | Auth Module | Medium | Medium | MEDIUM | Signed tokens with expiry, rate limiting |

### 3.2 Tampering (T)

| Threat ID | Description | Component | Likelihood | Impact | Risk | Mitigation |
|-----------|-------------|-----------|------------|--------|------|------------|
| T-01 | Modification of questionnaire answers in transit | Session Module | Low | High | MEDIUM | TLS 1.3 for all communications |
| T-02 | Tampering with evidence files | Evidence Registry | Medium | High | HIGH | SHA-256 hash verification, immutable storage with versioning |
| T-03 | Database record modification | PostgreSQL | Low | Critical | MEDIUM | Parameterized queries, audit logging, row-level security |
| T-04 | Score manipulation | Scoring Engine | Low | Critical | MEDIUM | Server-side calculation only, audit trail for all score changes |
| T-05 | Decision log tampering | Decision Log | Low | Critical | MEDIUM | Append-only design, cryptographic signing, no delete operations |

### 3.3 Repudiation (R)

| Threat ID | Description | Component | Likelihood | Impact | Risk | Mitigation |
|-----------|-------------|-----------|------------|--------|------|------------|
| R-01 | User denies submitting answers | Session Module | Medium | Medium | MEDIUM | Comprehensive audit logging with timestamps and IP |
| R-02 | Admin denies configuration changes | Admin Module | Low | High | MEDIUM | Admin action logging, role-based audit trail |
| R-03 | Denial of evidence submission | Evidence Registry | Medium | High | HIGH | Blockchain-style chaining, timestamp authority integration |
| R-04 | Score dispute | Scoring Engine | Medium | Medium | MEDIUM | Immutable scoring snapshots, full recalculation capability |

### 3.4 Information Disclosure (I)

| Threat ID | Description | Component | Likelihood | Impact | Risk | Mitigation |
|-----------|-------------|-----------|------------|--------|------|------------|
| I-01 | Exposure of PII in logs | All Modules | Medium | High | HIGH | Log sanitization, PII masking, secure log storage |
| I-02 | Evidence file URL enumeration | Evidence Registry | Medium | Medium | MEDIUM | Signed URLs with expiry, GUID-based paths |
| I-03 | Database credential exposure | Configuration | Low | Critical | MEDIUM | Azure Key Vault, managed identities, no env var secrets |
| I-04 | API response data leakage | All Controllers | Medium | Medium | MEDIUM | Response filtering, role-based field visibility |
| I-05 | Readiness scores visible to competitors | Scoring Engine | Low | High | MEDIUM | Tenant isolation, RBAC enforcement |

### 3.5 Denial of Service (D)

| Threat ID | Description | Component | Likelihood | Impact | Risk | Mitigation |
|-----------|-------------|-----------|------------|--------|------|------------|
| D-01 | API rate limit exhaustion | All Endpoints | High | Medium | HIGH | Rate limiting (100 req/min), IP-based throttling |
| D-02 | Large file upload DoS | Evidence Registry | Medium | Medium | MEDIUM | File size limits (50MB), upload quota per user |
| D-03 | Database connection exhaustion | PostgreSQL | Low | High | MEDIUM | Connection pooling, circuit breakers |
| D-04 | Cache poisoning/flooding | Redis | Low | Medium | LOW | Cache size limits, TTL enforcement |
| D-05 | Scoring calculation resource exhaustion | Scoring Engine | Medium | Medium | MEDIUM | Async processing, job queues, timeouts |

### 3.6 Elevation of Privilege (E)

| Threat ID | Description | Component | Likelihood | Impact | Risk | Mitigation |
|-----------|-------------|-----------|------------|--------|------|------------|
| E-01 | User to Admin privilege escalation | Auth Module | Low | Critical | MEDIUM | Role validation on every request, JWT claims verification |
| E-02 | Cross-tenant data access | All Modules | Medium | Critical | HIGH | Tenant ID in JWT, query-level tenant filtering |
| E-03 | SQL injection privilege escalation | Database Layer | Low | Critical | MEDIUM | Parameterized queries only, Prisma ORM |
| E-04 | IDOR to access other users' sessions | Session Module | Medium | High | HIGH | User ownership validation, UUID session IDs |
| E-05 | Bypass of Score Gate | CI/CD Pipeline | Low | High | MEDIUM | Pipeline as code, approval gates |

---

## 4. Threat Summary by Risk Level

### 4.1 Critical Risks (Immediate Action Required)

| ID | Threat | Current Status | Action |
|----|--------|----------------|--------|
| E-02 | Cross-tenant data access | ⚠️ Mitigated | Ensure tenant filtering on ALL queries |
| I-01 | PII in logs | ⚠️ Mitigated | Implement log sanitization |

### 4.2 High Risks

| ID | Threat | Current Status | Action |
|----|--------|----------------|--------|
| T-02 | Evidence file tampering | ✅ Mitigated | SHA-256 verification implemented |
| D-01 | API rate limiting | ✅ Mitigated | Rate limiting configured |
| E-04 | IDOR vulnerability | ⚠️ In Progress | Review all endpoints |

### 4.3 Medium Risks

| ID | Threat | Current Status | Action |
|----|--------|----------------|--------|
| S-01 | JWT theft | ✅ Mitigated | Short expiry, secure cookies |
| R-03 | Evidence repudiation | ✅ Mitigated | Audit logging implemented |

---

## 5. Security Controls Summary

### 5.1 Authentication & Authorization
- JWT-based authentication with 15-minute access tokens
- Refresh token rotation
- Role-based access control (RBAC)
- Azure AD B2C integration for enterprise SSO

### 5.2 Data Protection
- TLS 1.3 for all communications
- AES-256 encryption at rest
- SHA-256 file integrity verification
- Azure Key Vault for secrets management

### 5.3 Audit & Monitoring
- Comprehensive audit logging
- Azure Monitor integration
- Security event alerts
- Append-only decision log

### 5.4 Infrastructure Security
- Azure Container Apps with managed identity
- Network isolation via VNet
- WAF protection
- DDoS protection standard

---

## 6. Recommendations

### 6.1 Immediate Actions
1. ✅ Implement rate limiting on all API endpoints
2. ✅ Enable SHA-256 verification for evidence files
3. ⬜ Complete IDOR review for all endpoints
4. ⬜ Implement log sanitization for PII

### 6.2 Short-term (30 days)
1. Implement tenant isolation testing
2. Enable Azure Defender for Containers
3. Configure SAST/DAST in CI/CD (BLOCKING)
4. Implement security headers audit

### 6.3 Long-term (90 days)
1. Third-party penetration testing
2. SOC 2 Type II preparation
3. Bug bounty program consideration
4. Security awareness training

---

## 7. Appendix

### 7.1 STRIDE Category Definitions

| Category | Description |
|----------|-------------|
| **S**poofing | Pretending to be something or someone other than yourself |
| **T**ampering | Modifying data or code |
| **R**epudiation | Claiming to not have performed an action |
| **I**nformation Disclosure | Exposing information to unauthorized parties |
| **D**enial of Service | Denying or degrading service to users |
| **E**levation of Privilege | Gaining capabilities without proper authorization |

### 7.2 Risk Rating Matrix

| Likelihood / Impact | Low | Medium | High | Critical |
|---------------------|-----|--------|------|----------|
| High | MEDIUM | HIGH | HIGH | CRITICAL |
| Medium | LOW | MEDIUM | HIGH | HIGH |
| Low | LOW | LOW | MEDIUM | MEDIUM |

### 7.3 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-28 | Security Team | Initial release |

---

## 8. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CISO | _____________ | __________ | __________ |
| CTO | _____________ | __________ | __________ |
| Lead Architect | _____________ | __________ | __________ |
