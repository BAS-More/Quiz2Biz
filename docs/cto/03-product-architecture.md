# Product Architecture Document
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Lead Architect  
**Classification:** Internal

---

## 1. Executive Summary

This document describes the high-level architecture of the Adaptive Client Questionnaire System, including system components, their interactions, deployment topology, and key architectural decisions. The architecture supports multi-platform delivery (Web, iOS, Android, Power Apps) with a shared backend infrastructure.

---

## 2. Architecture Overview

### 2.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL ACTORS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐     │
│   │ Entrepreneur │    │  Developer/  │    │   Enterprise Systems     │     │
│   │   (Client)   │    │    Admin     │    │   (Power Apps, SSO)      │     │
│   └──────┬───────┘    └──────┬───────┘    └────────────┬─────────────┘     │
│          │                   │                         │                    │
└──────────┼───────────────────┼─────────────────────────┼────────────────────┘
           │                   │                         │
           ▼                   ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ADAPTIVE QUESTIONNAIRE SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      CLIENT APPLICATIONS                             │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│   │  │  Web App    │  │  iOS App    │  │ Android App │  │ Power Apps│  │   │
│   │  │  (React)    │  │(React Native│  │(React Native│  │ Connector │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         API GATEWAY                                  │   │
│   │      (Authentication, Rate Limiting, Request Routing)                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│          ┌─────────────────────────┼─────────────────────────┐              │
│          ▼                         ▼                         ▼              │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
│   │  Question   │          │  Document   │          │    User     │        │
│   │   Engine    │          │  Generator  │          │  Management │        │
│   │   Service   │          │   Service   │          │   Service   │        │
│   └─────────────┘          └─────────────┘          └─────────────┘        │
│          │                         │                         │              │
│          └─────────────────────────┼─────────────────────────┘              │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         DATA LAYER                                   │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │ PostgreSQL  │  │    Redis    │  │ Object Store│                 │   │
│   │   │  Database   │  │    Cache    │  │(Documents)  │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │   Auth0/    │  │   Stripe    │  │  SendGrid   │  │   OpenAI/   │       │
│   │   Cognito   │  │  Payments   │  │   Email     │  │  AI Service │       │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Architecture Characteristics

| Characteristic | Approach | Rationale |
|----------------|----------|-----------|
| Architecture Style | Microservices | Independent scaling, technology flexibility |
| Communication | REST + GraphQL | REST for simplicity, GraphQL for flexible queries |
| Data Strategy | Polyglot persistence | Right tool for each data type |
| Deployment | Containerized (Kubernetes) | Portability, scaling |
| Caching | Multi-level (CDN, Redis, App) | Performance optimization |
| Security | Zero-trust | Defense in depth |

---

## 3. Component Architecture

### 3.1 Client Applications Layer

#### 3.1.1 Web Application (React)
```
web-client/
├── src/
│   ├── components/          # Reusable UI components (PascalCase)
│   │   ├── QuestionRenderer/
│   │   ├── ProgressIndicator/
│   │   ├── DocumentPreview/
│   │   └── common/
│   ├── pages/               # Route-level components
│   │   ├── Questionnaire/
│   │   ├── Dashboard/
│   │   ├── Documents/
│   │   └── Admin/
│   ├── hooks/               # Custom React hooks (camelCase)
│   ├── services/            # API communication layer
│   ├── stores/              # State management (Zustand)
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript definitions
├── public/
└── tests/
```

**Key Components:**

| Component | Responsibility | Key Features |
|-----------|----------------|--------------|
| QuestionRenderer | Display adaptive questions | Multi-type support, accessibility |
| ProgressIndicator | Show completion status | Real-time updates, time estimation |
| DocumentPreview | Preview generated documents | PDF rendering, download |
| AdminDashboard | Manage questions, users | CRUD operations, analytics |

#### 3.1.2 Mobile Applications (React Native)
```
mobile-app/
├── src/
│   ├── components/          # Shared components
│   ├── screens/             # Screen components
│   │   ├── QuestionnaireScreen/
│   │   ├── ProgressScreen/
│   │   └── DocumentsScreen/
│   ├── navigation/          # React Navigation setup
│   ├── services/            # API + offline sync
│   ├── stores/              # State management
│   └── utils/
├── ios/                     # iOS native code
├── android/                 # Android native code
└── __tests__/
```

**Platform-Specific Features:**

| Feature | iOS | Android |
|---------|-----|---------|
| Biometric Auth | Face ID, Touch ID | Fingerprint, Face Unlock |
| Notifications | APNs | FCM |
| Offline Storage | Core Data bridge | Room bridge |
| Deep Linking | Universal Links | App Links |

#### 3.1.3 Power Apps Connector
```
power-apps-connector/
├── apiDefinition.swagger.json    # OpenAPI spec
├── apiProperties.json            # Connector metadata
├── src/
│   ├── actions/                  # Custom actions
│   └── triggers/                 # Event triggers
└── tests/
```

### 3.2 API Gateway Layer

#### 3.2.1 Gateway Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (NestJS)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARE PIPELINE                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │   │
│  │  │  CORS   │→│  Rate   │→│  Auth   │→│ Validate│→│  Logging  │  │   │
│  │  │         │ │ Limiter │ │  Guard  │ │  Pipe   │ │           │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       ROUTE CONTROLLERS                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │   /api/v1/  │  │   /api/v1/  │  │   /api/v1/  │               │   │
│  │  │questionnaire│  │  documents  │  │    users    │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.2 Gateway Responsibilities

| Responsibility | Implementation | Configuration |
|----------------|----------------|---------------|
| Authentication | JWT validation | 15-min access, 7-day refresh |
| Rate Limiting | Token bucket | 100 req/min (client), 1000 req/min (dev) |
| Request Validation | class-validator | Schema-based validation |
| Response Transform | Interceptors | Consistent envelope format |
| Error Handling | Exception filters | Standardized error codes |
| Logging | Winston + correlation ID | Structured JSON logs |

### 3.3 Service Layer

#### 3.3.1 Question Engine Service
```
question-engine/
├── src/
│   ├── modules/
│   │   ├── questions/           # Question CRUD
│   │   ├── responses/           # Response management
│   │   ├── logic/               # Adaptive logic engine
│   │   └── progress/            # Progress calculation
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── events/
│   └── infrastructure/
│       ├── repositories/
│       └── external/
└── tests/
```

**Core Domain Model:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUESTION ENGINE DOMAIN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │ Questionnaire│──────▶│   Section   │──────▶│  Question   │       │
│  │             │ 1   * │             │ 1   * │             │       │
│  └─────────────┘       └─────────────┘       └──────┬──────┘       │
│         │                                           │               │
│         │                                           ▼               │
│         │                                    ┌─────────────┐       │
│         │                                    │   Options   │       │
│         │                                    │ (for choice)│       │
│         │                                    └─────────────┘       │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │   Session   │──────▶│  Response   │──────▶│ Visibility  │       │
│  │             │ 1   * │             │       │   Rules     │       │
│  └─────────────┘       └─────────────┘       └─────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Adaptive Logic Engine:**
```typescript
// Visibility Rule DSL Example
interface VisibilityRule {
  condition: {
    field: string;           // Reference to previous question
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
    value: any;
  };
  action: 'show' | 'hide' | 'require';
  targetQuestionIds: string[];
}

// Example Rule
{
  "condition": {
    "field": "business_type",
    "operator": "eq",
    "value": "saas"
  },
  "action": "show",
  "targetQuestionIds": ["q_tech_stack", "q_api_needs", "q_scalability"]
}
```

#### 3.3.2 Document Generator Service
```
document-generator/
├── src/
│   ├── modules/
│   │   ├── templates/           # Document templates
│   │   ├── generation/          # Generation pipeline
│   │   ├── rendering/           # PDF/DOCX rendering
│   │   └── queue/               # Async job processing
│   ├── templates/
│   │   ├── cto/                 # 15 CTO templates
│   │   ├── cfo/                 # Business plan template
│   │   └── ba/                  # 9 BA templates
│   └── infrastructure/
└── tests/
```

**Generation Pipeline:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT GENERATION PIPELINE                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │
│  │ Trigger │───▶│  Collect    │───▶│  Transform  │───▶│  Render  │  │
│  │ Request │    │  Responses  │    │   Data      │    │          │  │
│  └─────────┘    └─────────────┘    └─────────────┘    └────┬─────┘  │
│                                                              │       │
│                 ┌────────────────────────────────────────────┘       │
│                 ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    RENDER ENGINES                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │   PDF       │  │    DOCX     │  │    Markdown         │  │    │
│  │  │ (PDFKit/    │  │  (docx.js)  │  │   (for preview)     │  │    │
│  │  │  Puppeteer) │  │             │  │                     │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    OUTPUT STORAGE                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │   S3/Blob   │  │   Metadata  │  │   Notification      │  │    │
│  │  │   Storage   │  │   Database  │  │   (Email/Push)      │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

#### 3.3.3 User Management Service
```
user-management/
├── src/
│   ├── modules/
│   │   ├── authentication/      # Login, registration
│   │   ├── authorization/       # RBAC, permissions
│   │   ├── profiles/            # User profiles
│   │   └── organizations/       # Multi-tenant support
│   └── infrastructure/
└── tests/
```

**Role-Based Access Control:**

| Role | Permissions | App Version |
|------|-------------|-------------|
| CLIENT | Submit responses, view own documents | Client App |
| DEVELOPER | Review documents, approve releases, manage clients | Developer App |
| ADMIN | Full system access, user management, configuration | Developer App |
| SUPER_ADMIN | Tenant management, system configuration | Internal only |

### 3.4 Data Layer

#### 3.4.1 Database Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL SCHEMA                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐         ┌─────────────────┐                   │
│  │     users       │         │  organizations  │                   │
│  ├─────────────────┤         ├─────────────────┤                   │
│  │ id (UUID)       │◀───┐    │ id (UUID)       │                   │
│  │ email           │    │    │ name            │                   │
│  │ password_hash   │    │    │ settings (JSONB)│                   │
│  │ role            │    │    │ created_at      │                   │
│  │ org_id (FK)     │────┘    └─────────────────┘                   │
│  │ created_at      │                                                │
│  └─────────────────┘                                                │
│          │                                                          │
│          │ 1:N                                                      │
│          ▼                                                          │
│  ┌─────────────────┐         ┌─────────────────┐                   │
│  │    sessions     │         │ questionnaires  │                   │
│  ├─────────────────┤         ├─────────────────┤                   │
│  │ id (UUID)       │◀───┐    │ id (UUID)       │                   │
│  │ user_id (FK)    │    │    │ name            │                   │
│  │ questionnaire_id│────┼───▶│ industry        │                   │
│  │ status          │    │    │ sections (JSONB)│                   │
│  │ progress        │    │    │ version         │                   │
│  │ started_at      │    │    │ is_active       │                   │
│  │ completed_at    │    │    └─────────────────┘                   │
│  └─────────────────┘    │                                          │
│          │              │                                          │
│          │ 1:N          │                                          │
│          ▼              │                                          │
│  ┌─────────────────┐    │    ┌─────────────────┐                   │
│  │   responses     │    │    │   documents     │                   │
│  ├─────────────────┤    │    ├─────────────────┤                   │
│  │ id (UUID)       │    │    │ id (UUID)       │                   │
│  │ session_id (FK) │    │    │ session_id (FK) │───────────────┐   │
│  │ question_id     │    │    │ type            │               │   │
│  │ value (JSONB)   │    │    │ status          │               │   │
│  │ answered_at     │    │    │ storage_url     │               │   │
│  └─────────────────┘    │    │ approved_at     │               │   │
│                         │    │ approved_by     │               │   │
│                         │    └─────────────────┘               │   │
│                         │              ▲                       │   │
│                         │              │                       │   │
│                         └──────────────┴───────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 Redis Cache Strategy

| Cache Type | Purpose | TTL | Invalidation |
|------------|---------|-----|--------------|
| Session | User session data | 24h | On logout |
| Question Set | Active questionnaire | 1h | On update |
| Progress | Real-time progress | 5m | On response |
| Rate Limit | Request counting | 1m | Auto-expire |
| Generated Docs | Recent documents | 24h | On regenerate |

#### 3.4.3 Object Storage

| Bucket | Content | Access | Retention |
|--------|---------|--------|-----------|
| documents-draft | In-progress documents | Private | 30 days |
| documents-final | Approved documents | Signed URLs | Permanent |
| templates | Document templates | Internal | Versioned |
| uploads | User uploads | Private | 90 days |

---

## 4. Cross-Cutting Concerns

### 4.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Edge Security                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CDN (CloudFront/CloudFlare) + WAF + DDoS Protection         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 2: Transport Security                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ TLS 1.3 + Certificate Pinning (Mobile) + HSTS               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 3: Application Security                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Input Validation + Output Encoding + CSRF + XSS Prevention  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 4: Authentication/Authorization                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ OAuth2/OIDC + JWT + RBAC + Resource-level Authorization     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 5: Data Security                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Encryption at Rest (AES-256) + Field-level Encryption       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 6: Audit & Monitoring                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Audit Logs + SIEM Integration + Anomaly Detection           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      COLLECTION                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │   Metrics   │  │    Logs     │  │      Traces         │  │   │
│  │  │ (Prometheus)│  │ (Fluent Bit)│  │ (OpenTelemetry)     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      STORAGE                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │   Prometheus│  │ Elasticsearch│ │       Jaeger        │  │   │
│  │  │   (metrics) │  │   (logs)    │  │      (traces)       │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   VISUALIZATION                              │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │                    Grafana                           │    │   │
│  │  │  Dashboards + Alerts + SLO Tracking                  │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Error Handling Strategy

| Layer | Strategy | Implementation |
|-------|----------|----------------|
| Client | Graceful degradation | Error boundaries, retry logic |
| API | Standardized responses | Error codes, user messages |
| Service | Circuit breaker | Resilience4j patterns |
| Database | Retry with backoff | Transient fault handling |
| External | Fallback behavior | Cache, defaults |

**Standardized Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please provide all required fields",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

---

## 5. Deployment Architecture

### 5.1 Infrastructure Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUD INFRASTRUCTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    GLOBAL EDGE                               │   │
│  │  CDN (Static Assets) + WAF + DNS (Route 53/CloudFlare)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PRIMARY REGION (us-east-1)                │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │              KUBERNETES CLUSTER                      │    │   │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐         │    │   │
│  │  │  │ API Pods  │ │Question   │ │ Doc Gen   │         │    │   │
│  │  │  │ (3 min)   │ │Engine Pods│ │ Pods      │         │    │   │
│  │  │  └───────────┘ └───────────┘ └───────────┘         │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐      │   │
│  │  │     RDS PostgreSQL    │  │     ElastiCache       │      │   │
│  │  │     (Primary + Read)  │  │     (Redis Cluster)   │      │   │
│  │  └───────────────────────┘  └───────────────────────┘      │   │
│  │                                                              │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐      │   │
│  │  │         S3            │  │       SQS/SNS         │      │   │
│  │  │   (Document Store)    │  │   (Job Queues)        │      │   │
│  │  └───────────────────────┘  └───────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              DR REGION (us-west-2) - Standby                 │   │
│  │  RDS Read Replica + S3 Replication + Cold K8s Cluster       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CI/CD PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Code Push] ──▶ [Build] ──▶ [Test] ──▶ [Security] ──▶ [Deploy]    │
│                                                                      │
│  Build Stage:                                                        │
│  ├── Lint (ESLint, Prettier)                                        │
│  ├── Type Check (TypeScript)                                        │
│  ├── Compile/Bundle                                                  │
│  └── Docker Build                                                    │
│                                                                      │
│  Test Stage:                                                         │
│  ├── Unit Tests (Jest, >80% coverage)                               │
│  ├── Integration Tests (Supertest)                                  │
│  ├── E2E Tests (Playwright)                                         │
│  └── Performance Tests (k6)                                         │
│                                                                      │
│  Security Stage:                                                     │
│  ├── SAST (SonarQube, Semgrep)                                      │
│  ├── Dependency Scan (Snyk, npm audit)                              │
│  ├── Container Scan (Trivy)                                         │
│  └── Secret Detection (GitLeaks)                                    │
│                                                                      │
│  Deploy Stage:                                                       │
│  ├── Dev: Auto-deploy on merge                                      │
│  ├── Staging: Auto-deploy, manual promotion                         │
│  └── Production: Manual approval, canary rollout                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture Decision Records (ADRs)

### ADR-001: Microservices vs Monolith
- **Decision:** Start with modular monolith, extract services as needed
- **Rationale:** Faster initial development, easier to refactor with clear boundaries
- **Consequences:** Need strict module boundaries, plan extraction points

### ADR-002: React Native vs Flutter
- **Decision:** React Native for mobile applications
- **Rationale:** Code sharing with web (React), larger talent pool, mature ecosystem
- **Consequences:** May need native modules for performance-critical features

### ADR-003: PostgreSQL vs NoSQL
- **Decision:** PostgreSQL with JSONB for flexible data
- **Rationale:** ACID compliance, strong querying, JSONB handles schema flexibility
- **Consequences:** Schema migrations required, but manageable with tools

### ADR-004: REST vs GraphQL
- **Decision:** REST for public API, GraphQL for complex client queries
- **Rationale:** REST simpler for CRUD, GraphQL reduces over-fetching on dashboards
- **Consequences:** Two API styles to maintain, but clear use cases

### ADR-005: Authentication Provider
- **Decision:** Auth0 or AWS Cognito (final selection pending cost analysis)
- **Rationale:** Compliance complexity, MFA support, enterprise SSO features
- **Consequences:** Vendor dependency, but well-abstracted

---

## 7. Related Documents

- [Technology Roadmap](./01-technology-roadmap.md)
- [Technology Strategy](./02-technology-strategy.md)
- [API Documentation](./04-api-documentation.md)
- [Data Models and Database Architecture](./05-data-models-db-architecture.md)
- [Engineering Handbook](./12-engineering-handbook.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Lead Architect | {{ARCHITECT_NAME}} | | |
| Engineering Manager | {{EM_NAME}} | | |
# Product Architecture Document
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Lead Architect  
**Classification:** Internal

---

## 1. Executive Summary

This document describes the high-level architecture of the Adaptive Client Questionnaire System, including system components, their interactions, deployment topology, and key architectural decisions. The architecture supports multi-platform delivery (Web, iOS, Android, Power Apps) with a shared backend infrastructure.

---

## 2. Architecture Overview

### 2.1 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL ACTORS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐     │
│   │ Entrepreneur │    │  Developer/  │    │   Enterprise Systems     │     │
│   │   (Client)   │    │    Admin     │    │   (Power Apps, SSO)      │     │
│   └──────┬───────┘    └──────┬───────┘    └────────────┬─────────────┘     │
│          │                   │                         │                    │
└──────────┼───────────────────┼─────────────────────────┼────────────────────┘
           │                   │                         │
           ▼                   ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ADAPTIVE QUESTIONNAIRE SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      CLIENT APPLICATIONS                             │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│   │  │  Web App    │  │  iOS App    │  │ Android App │  │ Power Apps│  │   │
│   │  │  (React)    │  │(React Native│  │(React Native│  │ Connector │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         API GATEWAY                                  │   │
│   │      (Authentication, Rate Limiting, Request Routing)                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│          ┌─────────────────────────┼─────────────────────────┐              │
│          ▼                         ▼                         ▼              │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
│   │  Question   │          │  Document   │          │    User     │        │
│   │   Engine    │          │  Generator  │          │  Management │        │
│   │   Service   │          │   Service   │          │   Service   │        │
│   └─────────────┘          └─────────────┘          └─────────────┘        │
│          │                         │                         │              │
│          └─────────────────────────┼─────────────────────────┘              │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         DATA LAYER                                   │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│   │   │ PostgreSQL  │  │    Redis    │  │ Object Store│                 │   │
│   │   │  Database   │  │    Cache    │  │(Documents)  │                 │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │   Auth0/    │  │   Stripe    │  │  SendGrid   │  │   OpenAI/   │       │
│   │   Cognito   │  │  Payments   │  │   Email     │  │  AI Service │       │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Architecture Characteristics

| Characteristic | Approach | Rationale |
|----------------|----------|-----------|
| Architecture Style | Microservices | Independent scaling, technology flexibility |
| Communication | REST + GraphQL | REST for simplicity, GraphQL for flexible queries |
| Data Strategy | Polyglot persistence | Right tool for each data type |
| Deployment | Containerized (Kubernetes) | Portability, scaling |
| Caching | Multi-level (CDN, Redis, App) | Performance optimization |
| Security | Zero-trust | Defense in depth |

---

## 3. Component Architecture

### 3.1 Client Applications Layer

#### 3.1.1 Web Application (React)
```
web-client/
├── src/
│   ├── components/          # Reusable UI components (PascalCase)
│   │   ├── QuestionRenderer/
│   │   ├── ProgressIndicator/
│   │   ├── DocumentPreview/
│   │   └── common/
│   ├── pages/               # Route-level components
│   │   ├── Questionnaire/
│   │   ├── Dashboard/
│   │   ├── Documents/
│   │   └── Admin/
│   ├── hooks/               # Custom React hooks (camelCase)
│   ├── services/            # API communication layer
│   ├── stores/              # State management (Zustand)
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript definitions
├── public/
└── tests/
```

**Key Components:**

| Component | Responsibility | Key Features |
|-----------|----------------|--------------|
| QuestionRenderer | Display adaptive questions | Multi-type support, accessibility |
| ProgressIndicator | Show completion status | Real-time updates, time estimation |
| DocumentPreview | Preview generated documents | PDF rendering, download |
| AdminDashboard | Manage questions, users | CRUD operations, analytics |

#### 3.1.2 Mobile Applications (React Native)
```
mobile-app/
├── src/
│   ├── components/          # Shared components
│   ├── screens/             # Screen components
│   │   ├── QuestionnaireScreen/
│   │   ├── ProgressScreen/
│   │   └── DocumentsScreen/
│   ├── navigation/          # React Navigation setup
│   ├── services/            # API + offline sync
│   ├── stores/              # State management
│   └── utils/
├── ios/                     # iOS native code
├── android/                 # Android native code
└── __tests__/
```

**Platform-Specific Features:**

| Feature | iOS | Android |
|---------|-----|---------|
| Biometric Auth | Face ID, Touch ID | Fingerprint, Face Unlock |
| Notifications | APNs | FCM |
| Offline Storage | Core Data bridge | Room bridge |
| Deep Linking | Universal Links | App Links |

#### 3.1.3 Power Apps Connector
```
power-apps-connector/
├── apiDefinition.swagger.json    # OpenAPI spec
├── apiProperties.json            # Connector metadata
├── src/
│   ├── actions/                  # Custom actions
│   └── triggers/                 # Event triggers
└── tests/
```

### 3.2 API Gateway Layer

#### 3.2.1 Gateway Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (NestJS)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARE PIPELINE                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │   │
│  │  │  CORS   │→│  Rate   │→│  Auth   │→│ Validate│→│  Logging  │  │   │
│  │  │         │ │ Limiter │ │  Guard  │ │  Pipe   │ │           │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       ROUTE CONTROLLERS                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │   /api/v1/  │  │   /api/v1/  │  │   /api/v1/  │               │   │
│  │  │questionnaire│  │  documents  │  │    users    │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.2 Gateway Responsibilities

| Responsibility | Implementation | Configuration |
|----------------|----------------|---------------|
| Authentication | JWT validation | 15-min access, 7-day refresh |
| Rate Limiting | Token bucket | 100 req/min (client), 1000 req/min (dev) |
| Request Validation | class-validator | Schema-based validation |
| Response Transform | Interceptors | Consistent envelope format |
| Error Handling | Exception filters | Standardized error codes |
| Logging | Winston + correlation ID | Structured JSON logs |

### 3.3 Service Layer

#### 3.3.1 Question Engine Service
```
question-engine/
├── src/
│   ├── modules/
│   │   ├── questions/           # Question CRUD
│   │   ├── responses/           # Response management
│   │   ├── logic/               # Adaptive logic engine
│   │   └── progress/            # Progress calculation
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── events/
│   └── infrastructure/
│       ├── repositories/
│       └── external/
└── tests/
```

**Core Domain Model:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUESTION ENGINE DOMAIN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │ Questionnaire│──────▶│   Section   │──────▶│  Question   │       │
│  │             │ 1   * │             │ 1   * │             │       │
│  └─────────────┘       └─────────────┘       └──────┬──────┘       │
│         │                                           │               │
│         │                                           ▼               │
│         │                                    ┌─────────────┐       │
│         │                                    │   Options   │       │
│         │                                    │ (for choice)│       │
│         │                                    └─────────────┘       │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │   Session   │──────▶│  Response   │──────▶│ Visibility  │       │
│  │             │ 1   * │             │       │   Rules     │       │
│  └─────────────┘       └─────────────┘       └─────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Adaptive Logic Engine:**
```typescript
// Visibility Rule DSL Example
interface VisibilityRule {
  condition: {
    field: string;           // Reference to previous question
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
    value: any;
  };
  action: 'show' | 'hide' | 'require';
  targetQuestionIds: string[];
}

// Example Rule
{
  "condition": {
    "field": "business_type",
    "operator": "eq",
    "value": "saas"
  },
  "action": "show",
  "targetQuestionIds": ["q_tech_stack", "q_api_needs", "q_scalability"]
}
```

#### 3.3.2 Document Generator Service
```
document-generator/
├── src/
│   ├── modules/
│   │   ├── templates/           # Document templates
│   │   ├── generation/          # Generation pipeline
│   │   ├── rendering/           # PDF/DOCX rendering
│   │   └── queue/               # Async job processing
│   ├── templates/
│   │   ├── cto/                 # 15 CTO templates
│   │   ├── cfo/                 # Business plan template
│   │   └── ba/                  # 9 BA templates
│   └── infrastructure/
└── tests/
```

**Generation Pipeline:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT GENERATION PIPELINE                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐  │
│  │ Trigger │───▶│  Collect    │───▶│  Transform  │───▶│  Render  │  │
│  │ Request │    │  Responses  │    │   Data      │    │          │  │
│  └─────────┘    └─────────────┘    └─────────────┘    └────┬─────┘  │
│                                                              │       │
│                 ┌────────────────────────────────────────────┘       │
│                 ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    RENDER ENGINES                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │   PDF       │  │    DOCX     │  │    Markdown         │  │    │
│  │  │ (PDFKit/    │  │  (docx.js)  │  │   (for preview)     │  │    │
│  │  │  Puppeteer) │  │             │  │                     │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    OUTPUT STORAGE                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │   S3/Blob   │  │   Metadata  │  │   Notification      │  │    │
│  │  │   Storage   │  │   Database  │  │   (Email/Push)      │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

#### 3.3.3 User Management Service
```
user-management/
├── src/
│   ├── modules/
│   │   ├── authentication/      # Login, registration
│   │   ├── authorization/       # RBAC, permissions
│   │   ├── profiles/            # User profiles
│   │   └── organizations/       # Multi-tenant support
│   └── infrastructure/
└── tests/
```

**Role-Based Access Control:**

| Role | Permissions | App Version |
|------|-------------|-------------|
| CLIENT | Submit responses, view own documents | Client App |
| DEVELOPER | Review documents, approve releases, manage clients | Developer App |
| ADMIN | Full system access, user management, configuration | Developer App |
| SUPER_ADMIN | Tenant management, system configuration | Internal only |

### 3.4 Data Layer

#### 3.4.1 Database Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL SCHEMA                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐         ┌─────────────────┐                   │
│  │     users       │         │  organizations  │                   │
│  ├─────────────────┤         ├─────────────────┤                   │
│  │ id (UUID)       │◀───┐    │ id (UUID)       │                   │
│  │ email           │    │    │ name            │                   │
│  │ password_hash   │    │    │ settings (JSONB)│                   │
│  │ role            │    │    │ created_at      │                   │
│  │ org_id (FK)     │────┘    └─────────────────┘                   │
│  │ created_at      │                                                │
│  └─────────────────┘                                                │
│          │                                                          │
│          │ 1:N                                                      │
│          ▼                                                          │
│  ┌─────────────────┐         ┌─────────────────┐                   │
│  │    sessions     │         │ questionnaires  │                   │
│  ├─────────────────┤         ├─────────────────┤                   │
│  │ id (UUID)       │◀───┐    │ id (UUID)       │                   │
│  │ user_id (FK)    │    │    │ name            │                   │
│  │ questionnaire_id│────┼───▶│ industry        │                   │
│  │ status          │    │    │ sections (JSONB)│                   │
│  │ progress        │    │    │ version         │                   │
│  │ started_at      │    │    │ is_active       │                   │
│  │ completed_at    │    │    └─────────────────┘                   │
│  └─────────────────┘    │                                          │
│          │              │                                          │
│          │ 1:N          │                                          │
│          ▼              │                                          │
│  ┌─────────────────┐    │    ┌─────────────────┐                   │
│  │   responses     │    │    │   documents     │                   │
│  ├─────────────────┤    │    ├─────────────────┤                   │
│  │ id (UUID)       │    │    │ id (UUID)       │                   │
│  │ session_id (FK) │    │    │ session_id (FK) │───────────────┐   │
│  │ question_id     │    │    │ type            │               │   │
│  │ value (JSONB)   │    │    │ status          │               │   │
│  │ answered_at     │    │    │ storage_url     │               │   │
│  └─────────────────┘    │    │ approved_at     │               │   │
│                         │    │ approved_by     │               │   │
│                         │    └─────────────────┘               │   │
│                         │              ▲                       │   │
│                         │              │                       │   │
│                         └──────────────┴───────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 Redis Cache Strategy

| Cache Type | Purpose | TTL | Invalidation |
|------------|---------|-----|--------------|
| Session | User session data | 24h | On logout |
| Question Set | Active questionnaire | 1h | On update |
| Progress | Real-time progress | 5m | On response |
| Rate Limit | Request counting | 1m | Auto-expire |
| Generated Docs | Recent documents | 24h | On regenerate |

#### 3.4.3 Object Storage

| Bucket | Content | Access | Retention |
|--------|---------|--------|-----------|
| documents-draft | In-progress documents | Private | 30 days |
| documents-final | Approved documents | Signed URLs | Permanent |
| templates | Document templates | Internal | Versioned |
| uploads | User uploads | Private | 90 days |

---

## 4. Cross-Cutting Concerns

### 4.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Edge Security                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CDN (CloudFront/CloudFlare) + WAF + DDoS Protection         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 2: Transport Security                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ TLS 1.3 + Certificate Pinning (Mobile) + HSTS               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 3: Application Security                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Input Validation + Output Encoding + CSRF + XSS Prevention  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 4: Authentication/Authorization                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ OAuth2/OIDC + JWT + RBAC + Resource-level Authorization     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 5: Data Security                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Encryption at Rest (AES-256) + Field-level Encryption       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  Layer 6: Audit & Monitoring                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Audit Logs + SIEM Integration + Anomaly Detection           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      COLLECTION                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │   Metrics   │  │    Logs     │  │      Traces         │  │   │
│  │  │ (Prometheus)│  │ (Fluent Bit)│  │ (OpenTelemetry)     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      STORAGE                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │   Prometheus│  │ Elasticsearch│ │       Jaeger        │  │   │
│  │  │   (metrics) │  │   (logs)    │  │      (traces)       │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   VISUALIZATION                              │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │                    Grafana                           │    │   │
│  │  │  Dashboards + Alerts + SLO Tracking                  │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Error Handling Strategy

| Layer | Strategy | Implementation |
|-------|----------|----------------|
| Client | Graceful degradation | Error boundaries, retry logic |
| API | Standardized responses | Error codes, user messages |
| Service | Circuit breaker | Resilience4j patterns |
| Database | Retry with backoff | Transient fault handling |
| External | Fallback behavior | Cache, defaults |

**Standardized Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please provide all required fields",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

---

## 5. Deployment Architecture

### 5.1 Infrastructure Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUD INFRASTRUCTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    GLOBAL EDGE                               │   │
│  │  CDN (Static Assets) + WAF + DNS (Route 53/CloudFlare)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PRIMARY REGION (us-east-1)                │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │              KUBERNETES CLUSTER                      │    │   │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐         │    │   │
│  │  │  │ API Pods  │ │Question   │ │ Doc Gen   │         │    │   │
│  │  │  │ (3 min)   │ │Engine Pods│ │ Pods      │         │    │   │
│  │  │  └───────────┘ └───────────┘ └───────────┘         │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐      │   │
│  │  │     RDS PostgreSQL    │  │     ElastiCache       │      │   │
│  │  │     (Primary + Read)  │  │     (Redis Cluster)   │      │   │
│  │  └───────────────────────┘  └───────────────────────┘      │   │
│  │                                                              │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐      │   │
│  │  │         S3            │  │       SQS/SNS         │      │   │
│  │  │   (Document Store)    │  │   (Job Queues)        │      │   │
│  │  └───────────────────────┘  └───────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              DR REGION (us-west-2) - Standby                 │   │
│  │  RDS Read Replica + S3 Replication + Cold K8s Cluster       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CI/CD PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Code Push] ──▶ [Build] ──▶ [Test] ──▶ [Security] ──▶ [Deploy]    │
│                                                                      │
│  Build Stage:                                                        │
│  ├── Lint (ESLint, Prettier)                                        │
│  ├── Type Check (TypeScript)                                        │
│  ├── Compile/Bundle                                                  │
│  └── Docker Build                                                    │
│                                                                      │
│  Test Stage:                                                         │
│  ├── Unit Tests (Jest, >80% coverage)                               │
│  ├── Integration Tests (Supertest)                                  │
│  ├── E2E Tests (Playwright)                                         │
│  └── Performance Tests (k6)                                         │
│                                                                      │
│  Security Stage:                                                     │
│  ├── SAST (SonarQube, Semgrep)                                      │
│  ├── Dependency Scan (Snyk, npm audit)                              │
│  ├── Container Scan (Trivy)                                         │
│  └── Secret Detection (GitLeaks)                                    │
│                                                                      │
│  Deploy Stage:                                                       │
│  ├── Dev: Auto-deploy on merge                                      │
│  ├── Staging: Auto-deploy, manual promotion                         │
│  └── Production: Manual approval, canary rollout                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture Decision Records (ADRs)

### ADR-001: Microservices vs Monolith
- **Decision:** Start with modular monolith, extract services as needed
- **Rationale:** Faster initial development, easier to refactor with clear boundaries
- **Consequences:** Need strict module boundaries, plan extraction points

### ADR-002: React Native vs Flutter
- **Decision:** React Native for mobile applications
- **Rationale:** Code sharing with web (React), larger talent pool, mature ecosystem
- **Consequences:** May need native modules for performance-critical features

### ADR-003: PostgreSQL vs NoSQL
- **Decision:** PostgreSQL with JSONB for flexible data
- **Rationale:** ACID compliance, strong querying, JSONB handles schema flexibility
- **Consequences:** Schema migrations required, but manageable with tools

### ADR-004: REST vs GraphQL
- **Decision:** REST for public API, GraphQL for complex client queries
- **Rationale:** REST simpler for CRUD, GraphQL reduces over-fetching on dashboards
- **Consequences:** Two API styles to maintain, but clear use cases

### ADR-005: Authentication Provider
- **Decision:** Auth0 or AWS Cognito (final selection pending cost analysis)
- **Rationale:** Compliance complexity, MFA support, enterprise SSO features
- **Consequences:** Vendor dependency, but well-abstracted

---

## 7. Related Documents

- [Technology Roadmap](./01-technology-roadmap.md)
- [Technology Strategy](./02-technology-strategy.md)
- [API Documentation](./04-api-documentation.md)
- [Data Models and Database Architecture](./05-data-models-db-architecture.md)
- [Engineering Handbook](./12-engineering-handbook.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Lead Architect | {{ARCHITECT_NAME}} | | |
| Engineering Manager | {{EM_NAME}} | | |
