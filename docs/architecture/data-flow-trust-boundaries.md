# Data Flow Diagrams with Trust Boundaries

## Overview

This document defines data flows across trust boundaries in the Quiz-to-Build system, identifying security controls at each crossing point.

---

## Trust Boundary Definitions

```mermaid
graph TB
    subgraph TB0[Trust Boundary 0: Internet - Untrusted]
        USER[User Browser]
        ATTACKER[Potential Attacker]
    end

    subgraph TB1[Trust Boundary 1: DMZ - Semi-Trusted]
        WAF[Web Application Firewall]
        LB[Load Balancer]
    end

    subgraph TB2[Trust Boundary 2: Application - Trusted]
        API[API Application]
        WORKER[Background Worker]
    end

    subgraph TB3[Trust Boundary 3: Data - Highly Trusted]
        DB[(PostgreSQL)]
        REDIS[(Redis)]
        KV[Key Vault]
    end

    USER --> WAF
    ATTACKER -.->|blocked| WAF
    WAF --> LB
    LB --> API
    API --> DB
    API --> REDIS
    API --> KV
    API --> WORKER
    WORKER --> DB
```

### Trust Level Definitions

| Level | Name | Description | Controls Required |
|-------|------|-------------|-------------------|
| TB0 | Internet | Untrusted public network | All input validation, rate limiting |
| TB1 | DMZ | Perimeter network | WAF, DDoS protection, TLS termination |
| TB2 | Application | Internal application tier | Authentication, authorization, logging |
| TB3 | Data | Database and secrets tier | Encryption, access control, audit |

---

## Data Flow 1: User Authentication

```mermaid
sequenceDiagram
    participant U as User Browser
    participant WAF as WAF/CDN
    participant API as API Server
    participant DB as PostgreSQL
    participant R as Redis

    rect rgb(255, 230, 230)
        Note over U,WAF: TB0 → TB1 Crossing
        U->>WAF: POST /auth/login (email, password)
        Note right of WAF: Rate limit check<br/>Input sanitization<br/>TLS termination
    end

    rect rgb(230, 255, 230)
        Note over WAF,API: TB1 → TB2 Crossing
        WAF->>API: Forward request
        Note right of API: JWT validation<br/>Request logging
    end

    rect rgb(230, 230, 255)
        Note over API,DB: TB2 → TB3 Crossing
        API->>DB: SELECT user WHERE email = $1
        Note right of DB: Parameterized query<br/>TLS connection
        DB-->>API: User record
    end

    API->>API: Verify password (bcrypt)
    
    rect rgb(230, 230, 255)
        Note over API,R: TB2 → TB3 Crossing
        API->>R: Store refresh token
        Note right of R: TLS connection<br/>Token expiry set
    end

    API-->>WAF: JWT access token + refresh cookie
    WAF-->>U: Response with tokens
```

### Security Controls

| Boundary Crossing | Controls |
|-------------------|----------|
| TB0 → TB1 | TLS 1.3, Rate limiting (10 req/min), Input validation |
| TB1 → TB2 | Internal TLS, Request logging, IP allowlist |
| TB2 → TB3 | Parameterized queries, Connection encryption, Audit logging |

---

## Data Flow 2: Assessment Session

```mermaid
sequenceDiagram
    participant U as User Browser
    participant API as API Server
    participant ALS as Adaptive Logic
    participant DB as PostgreSQL
    participant R as Redis

    rect rgb(255, 230, 230)
        Note over U,API: TB0 → TB2 Crossing
        U->>API: POST /sessions (JWT in header)
        Note right of API: JWT validation<br/>User extraction<br/>Rate limiting
    end

    API->>API: Validate JWT, extract user

    rect rgb(230, 230, 255)
        Note over API,DB: TB2 → TB3 Crossing
        API->>DB: INSERT session
        DB-->>API: Session ID
    end

    rect rgb(230, 230, 255)
        API->>R: Cache session state
    end

    API-->>U: Session created

    loop Question Loop
        U->>API: GET /questions/next (sessionId)
        
        rect rgb(230, 230, 255)
            API->>R: Get session state
            R-->>API: Current progress
        end

        API->>ALS: Determine next question
        
        rect rgb(230, 230, 255)
            ALS->>DB: Query question bank
            DB-->>ALS: Available questions
        end

        ALS-->>API: Next question

        rect rgb(230, 230, 255)
            API->>R: Update session state
        end

        API-->>U: Question data

        U->>API: POST /answers (questionId, answer)
        
        rect rgb(230, 230, 255)
            API->>DB: Store answer
        end

        API-->>U: Answer recorded
    end
```

### Data Classification by Flow

| Data Element | Classification | Protection |
|--------------|---------------|------------|
| Session ID | Internal | UUID, unpredictable |
| User Answers | Confidential | Encrypted at rest |
| Question Text | Internal | Read-only access |
| Progress State | Internal | Redis TTL |

---

## Data Flow 3: Score Calculation

```mermaid
sequenceDiagram
    participant U as User Browser
    participant API as API Server
    participant SE as Scoring Engine
    participant DB as PostgreSQL
    participant R as Redis

    rect rgb(255, 230, 230)
        Note over U,API: TB0 → TB2 Crossing
        U->>API: POST /scoring/calculate (sessionId)
    end

    API->>API: Validate session ownership

    rect rgb(230, 230, 255)
        Note over API,DB: TB2 → TB3 Crossing
        API->>DB: Fetch session answers
        DB-->>API: All answers for session
    end

    API->>SE: Calculate scores
    
    Note over SE: Coverage = Σ(answered)/Σ(total)<br/>Severity = max(unanswered × weight)<br/>Residual = 1 - Coverage × (1 - Severity)

    SE-->>API: Calculated scores

    rect rgb(230, 230, 255)
        API->>DB: Store scoring results
    end

    rect rgb(230, 230, 255)
        API->>R: Cache score for quick access
    end

    API-->>U: Score response
```

### Calculation Data Sensitivity

| Calculation | Sensitivity | Reason |
|-------------|-------------|--------|
| Coverage Formula | Low | Generic algorithm |
| Severity Weights | Medium | Business logic IP |
| Final Scores | High | Business-sensitive |

---

## Data Flow 4: Document Generation

```mermaid
sequenceDiagram
    participant U as User Browser
    participant API as API Server
    participant W as Background Worker
    participant DB as PostgreSQL
    participant BLOB as Blob Storage
    participant Q as Job Queue

    rect rgb(255, 230, 230)
        Note over U,API: TB0 → TB2 Crossing
        U->>API: POST /documents/generate (sessionId, type)
    end

    API->>API: Authorize document access

    rect rgb(230, 230, 255)
        Note over API,Q: TB2 → TB3 Crossing
        API->>Q: Enqueue document job
    end

    API-->>U: Job accepted (jobId)

    rect rgb(230, 230, 255)
        Note over W,Q: TB2 → TB3 Crossing
        W->>Q: Dequeue job
    end

    rect rgb(230, 230, 255)
        W->>DB: Fetch session data, scores
        DB-->>W: Complete data set
    end

    W->>W: Generate PDF

    rect rgb(230, 230, 255)
        Note over W,BLOB: TB2 → TB3 Crossing
        W->>BLOB: Upload document
        Note right of BLOB: Encrypted at rest<br/>SAS token access
        BLOB-->>W: Document URL
    end

    rect rgb(230, 230, 255)
        W->>DB: Update job status with URL
    end

    U->>API: GET /documents/status (jobId)
    
    rect rgb(230, 230, 255)
        API->>DB: Fetch job status
        DB-->>API: Status + URL
    end

    API-->>U: Document ready (signed URL)

    rect rgb(255, 230, 230)
        Note over U,BLOB: TB0 → TB3 Crossing (Controlled)
        U->>BLOB: Download via SAS URL
        Note right of BLOB: Time-limited<br/>IP restricted<br/>Read-only
        BLOB-->>U: PDF document
    end
```

### Document Access Controls

| Access Type | Control | Duration |
|-------------|---------|----------|
| Generate Request | JWT + ownership check | N/A |
| Download URL | SAS token | 15 minutes |
| Blob Access | IP restriction + HTTPS | Per request |

---

## Data Flow 5: Admin Operations

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant API as API Server
    participant DB as PostgreSQL
    participant AUDIT as Audit Log

    rect rgb(255, 230, 230)
        Note over A,API: TB0 → TB2 Crossing
        A->>API: GET /admin/users (JWT with ADMIN role)
    end

    API->>API: Validate JWT
    API->>API: Check ADMIN role
    API->>API: Check IP allowlist

    rect rgb(230, 230, 255)
        Note over API,DB: TB2 → TB3 Crossing
        API->>DB: SELECT users (filtered by org)
        DB-->>API: User list
    end

    rect rgb(230, 230, 255)
        API->>AUDIT: Log admin access
    end

    API-->>A: User list (PII masked)

    Note over A,API: Admin modifies user

    rect rgb(255, 230, 230)
        A->>API: PUT /admin/users/:id (updates)
    end

    API->>API: Validate changes
    API->>API: Check authorization

    rect rgb(230, 230, 255)
        API->>DB: UPDATE user SET ...
        DB-->>API: Updated record
    end

    rect rgb(230, 230, 255)
        API->>AUDIT: Log modification with before/after
    end

    API-->>A: Update confirmed
```

### Admin Access Controls

| Control | Implementation |
|---------|---------------|
| Role Requirement | `ADMIN` or `SUPER_ADMIN` role |
| IP Restriction | Allowlist for admin endpoints |
| Audit Logging | All admin actions logged with details |
| PII Masking | Sensitive fields masked in responses |
| Rate Limiting | 100 req/min for admin endpoints |

---

## Trust Boundary Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TRUST BOUNDARY MAP                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ TB0: INTERNET (Untrusted)                                        │    │
│  │                                                                   │    │
│  │   [User Browser] ─────┬────── [Attacker]                        │    │
│  │                       │                                          │    │
│  └───────────────────────┼──────────────────────────────────────────┘    │
│                          │                                               │
│                    WAF/DDoS/TLS                                          │
│                          │                                               │
│  ┌───────────────────────┼──────────────────────────────────────────┐    │
│  │ TB1: DMZ (Semi-Trusted)│                                         │    │
│  │                       │                                          │    │
│  │   [WAF] ──── [Load Balancer]                                    │    │
│  │                       │                                          │    │
│  └───────────────────────┼──────────────────────────────────────────┘    │
│                          │                                               │
│                   Auth/Rate Limit                                        │
│                          │                                               │
│  ┌───────────────────────┼──────────────────────────────────────────┐    │
│  │ TB2: APPLICATION (Trusted)                                       │    │
│  │                       │                                          │    │
│  │   [API Server] ───┬───┴─── [Background Worker]                  │    │
│  │                   │                                              │    │
│  └───────────────────┼──────────────────────────────────────────────┘    │
│                      │                                                   │
│               Encryption/RBAC                                            │
│                      │                                                   │
│  ┌───────────────────┼──────────────────────────────────────────────┐    │
│  │ TB3: DATA (Highly Trusted)                                       │    │
│  │                   │                                              │    │
│  │   [PostgreSQL] ───┼─── [Redis] ─── [Key Vault] ─── [Blob]       │    │
│  │                                                                  │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Security Controls at Each Boundary

| Boundary | Inbound Controls | Outbound Controls |
|----------|-----------------|-------------------|
| TB0 → TB1 | TLS 1.3, WAF rules, DDoS protection | Response filtering |
| TB1 → TB2 | Internal TLS, JWT validation | Sanitized responses |
| TB2 → TB3 | Parameterized queries, encryption | Minimal data exposure |
| TB3 (internal) | Network isolation, encryption at rest | Audit logging |

---

## Compliance Mapping

| Requirement | Trust Boundary | Control |
|-------------|---------------|---------|
| OWASP A01:2021 Broken Access Control | TB0→TB1, TB1→TB2 | JWT + RBAC |
| OWASP A02:2021 Cryptographic Failures | All | TLS, encryption at rest |
| OWASP A03:2021 Injection | TB2→TB3 | Parameterized queries |
| ISO 27001 A.13.1 | TB1 | Network segmentation |
| ISO 27001 A.14.1 | All | Secure development |
| Australian Privacy Act | TB3 | Data residency, encryption |
