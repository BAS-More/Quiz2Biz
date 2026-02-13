# API Documentation
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Lead Developer  
**Classification:** Internal/External

---

## 1. Overview

This document provides comprehensive API documentation for the Adaptive Client Questionnaire System. The API follows RESTful principles with JSON payloads and supports OAuth 2.0 authentication.

### 1.1 Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.questionnaire.app/v1` |
| Staging | `https://api.staging.questionnaire.app/v1` |
| Development | `https://api.dev.questionnaire.app/v1` |

### 1.2 API Versioning
- Version included in URL path (`/v1/`, `/v2/`)
- Deprecation notice: 6 months before sunset
- Sunset header included in deprecated endpoints

---

## 2. Authentication

### 2.1 OAuth 2.0 Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Client App                    API Server                Auth0      │
│      │                             │                        │       │
│      │──── Login Request ─────────▶│                        │       │
│      │                             │──── Validate ─────────▶│       │
│      │                             │◀─── User Info ─────────│       │
│      │◀─── Access + Refresh Token ─│                        │       │
│      │                             │                        │       │
│      │──── API Request + Token ───▶│                        │       │
│      │◀─── Protected Resource ─────│                        │       │
│      │                             │                        │       │
│      │──── Refresh Token ─────────▶│                        │       │
│      │◀─── New Access Token ───────│                        │       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Authentication Endpoints

#### POST /auth/login
Authenticate user and obtain tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "role": "CLIENT",
      "name": "John Doe"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### POST /auth/logout
Invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### 2.3 Authorization Header
```
Authorization: Bearer <access_token>
```

---

## 3. Questionnaire API

### 3.1 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /questionnaires | List available questionnaires | Yes |
| GET | /questionnaires/:id | Get questionnaire details | Yes |
| POST | /sessions | Start new questionnaire session | Yes |
| GET | /sessions/:id | Get session state and progress | Yes |
| GET | /sessions/:id/questions/next | Get next question(s) | Yes |
| POST | /sessions/:id/responses | Submit response | Yes |
| PUT | /sessions/:id/responses/:responseId | Update response | Yes |
| POST | /sessions/:id/complete | Mark session complete | Yes |

### 3.2 Questionnaire Endpoints

#### GET /questionnaires
List all available questionnaires.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| industry | string | Filter by industry (optional) |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20, max: 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "quest_001",
        "name": "Business Plan Questionnaire",
        "description": "Comprehensive questionnaire for business plan generation",
        "industry": "general",
        "estimatedTime": 45,
        "totalQuestions": 87,
        "sections": [
          {
            "id": "sec_001",
            "name": "Business Foundation",
            "questionCount": 12
          }
        ],
        "version": "2.0",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 5,
      "totalPages": 1
    }
  }
}
```

#### GET /questionnaires/:id
Get detailed questionnaire structure.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "quest_001",
    "name": "Business Plan Questionnaire",
    "description": "Comprehensive questionnaire for business plan generation",
    "industry": "general",
    "sections": [
      {
        "id": "sec_001",
        "name": "Business Foundation",
        "description": "Basic information about your business",
        "order": 1,
        "questions": [
          {
            "id": "q_001",
            "text": "What is your business name?",
            "type": "TEXT",
            "required": true,
            "helpText": "Enter your registered business name or proposed name",
            "validation": {
              "minLength": 2,
              "maxLength": 100
            }
          }
        ]
      }
    ]
  }
}
```

### 3.3 Session Endpoints

#### POST /sessions
Start a new questionnaire session.

**Request:**
```json
{
  "questionnaireId": "quest_001",
  "industry": "saas"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "sess_abc123",
    "questionnaireId": "quest_001",
    "userId": "usr_xyz789",
    "status": "IN_PROGRESS",
    "progress": {
      "percentage": 0,
      "answeredQuestions": 0,
      "totalQuestions": 87,
      "estimatedTimeRemaining": 45
    },
    "currentSection": {
      "id": "sec_001",
      "name": "Business Foundation"
    },
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

#### GET /sessions/:id/questions/next
Get next question(s) based on adaptive logic.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| count | integer | Number of questions to fetch (default: 1, max: 5) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "q_015",
        "text": "What type of software product are you building?",
        "type": "SINGLE_CHOICE",
        "required": true,
        "helpText": "This helps us customize your technology documentation",
        "explanation": "Different product types require different technical approaches and considerations.",
        "options": [
          {
            "id": "opt_001",
            "label": "Web Application (SaaS)",
            "description": "Browser-based software accessed via internet",
            "icon": "web"
          },
          {
            "id": "opt_002",
            "label": "Mobile Application",
            "description": "Native or hybrid app for iOS/Android",
            "icon": "mobile"
          },
          {
            "id": "opt_003",
            "label": "Desktop Application",
            "description": "Software installed on Windows/Mac/Linux",
            "icon": "desktop"
          },
          {
            "id": "opt_004",
            "label": "API/Backend Service",
            "description": "Server-side service consumed by other applications",
            "icon": "api"
          }
        ],
        "suggestedAnswer": {
          "optionId": "opt_001",
          "reason": "Based on your industry selection (SaaS), web applications are most common"
        }
      }
    ],
    "section": {
      "id": "sec_003",
      "name": "Technology Requirements",
      "progress": 25
    },
    "overallProgress": {
      "percentage": 35,
      "answeredQuestions": 30,
      "totalQuestions": 87
    }
  }
}
```

#### POST /sessions/:id/responses
Submit a response to a question.

**Request:**
```json
{
  "questionId": "q_015",
  "value": {
    "selectedOptionId": "opt_001"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "responseId": "resp_def456",
    "questionId": "q_015",
    "value": {
      "selectedOptionId": "opt_001"
    },
    "validationResult": {
      "isValid": true
    },
    "adaptiveChanges": {
      "questionsAdded": ["q_016", "q_017", "q_018"],
      "questionsRemoved": ["q_050", "q_051"],
      "newEstimatedTotal": 88
    },
    "progress": {
      "percentage": 36,
      "answeredQuestions": 31,
      "totalQuestions": 88
    },
    "createdAt": "2025-01-15T10:45:00Z"
  }
}
```

---

## 4. Document Generation API

### 4.1 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /documents/generate | Request document generation | Yes |
| GET | /documents | List user's documents | Yes |
| GET | /documents/:id | Get document details | Yes |
| GET | /documents/:id/download | Download document file | Yes |
| POST | /documents/:id/approve | Approve document (Developer only) | Yes (DEVELOPER) |

### 4.2 Document Generation

#### POST /documents/generate
Request generation of documents from completed session.

**Request:**
```json
{
  "sessionId": "sess_abc123",
  "documentTypes": ["BUSINESS_PLAN", "TECHNOLOGY_ROADMAP", "BRD"],
  "format": "PDF",
  "options": {
    "includeAppendices": true,
    "branding": {
      "companyName": "TechStartup Inc.",
      "logo": "https://..."
    }
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "job_gen_789",
    "status": "QUEUED",
    "estimatedCompletionTime": "2025-01-15T11:00:00Z",
    "documents": [
      {
        "id": "doc_001",
        "type": "BUSINESS_PLAN",
        "status": "PENDING",
        "format": "PDF"
      },
      {
        "id": "doc_002",
        "type": "TECHNOLOGY_ROADMAP",
        "status": "PENDING",
        "format": "PDF"
      },
      {
        "id": "doc_003",
        "type": "BRD",
        "status": "PENDING",
        "format": "PDF"
      }
    ]
  }
}
```

#### GET /documents/:id
Get document details and status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "doc_001",
    "type": "BUSINESS_PLAN",
    "name": "Business Plan - TechStartup Inc.",
    "status": "PENDING_REVIEW",
    "format": "PDF",
    "fileSize": 2048576,
    "pageCount": 45,
    "generatedAt": "2025-01-15T10:55:00Z",
    "session": {
      "id": "sess_abc123",
      "completedAt": "2025-01-15T10:50:00Z"
    },
    "review": {
      "status": "PENDING",
      "assignedTo": null,
      "comments": []
    },
    "versions": [
      {
        "version": 1,
        "createdAt": "2025-01-15T10:55:00Z",
        "status": "CURRENT"
      }
    ]
  }
}
```

#### GET /documents/:id/download
Get signed download URL.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| version | integer | Document version (default: latest) |
| format | string | Output format: PDF, DOCX (default: PDF) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.example.com/docs/...",
    "expiresAt": "2025-01-15T12:00:00Z",
    "fileName": "Business_Plan_TechStartup_Inc.pdf",
    "contentType": "application/pdf",
    "fileSize": 2048576
  }
}
```

#### POST /documents/:id/approve
Approve document for client download (Developer only).

**Request:**
```json
{
  "approved": true,
  "comments": "Document reviewed and approved. Minor suggestions noted.",
  "internalNotes": "Client may need follow-up on financial projections."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "doc_001",
    "status": "APPROVED",
    "approvedBy": {
      "id": "usr_dev123",
      "name": "Jane Developer"
    },
    "approvedAt": "2025-01-15T14:00:00Z",
    "clientNotified": true
  }
}
```

---

## 5. User Management API

### 5.1 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /users/me | Get current user profile | Yes |
| PUT | /users/me | Update current user profile | Yes |
| GET | /users | List users (Admin only) | Yes (ADMIN) |
| GET | /users/:id | Get user details (Admin only) | Yes (ADMIN) |
| POST | /users | Create user (Admin only) | Yes (ADMIN) |
| PUT | /users/:id | Update user (Admin only) | Yes (ADMIN) |

### 5.2 User Endpoints

#### GET /users/me
Get current authenticated user's profile.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "entrepreneur@example.com",
    "name": "John Entrepreneur",
    "role": "CLIENT",
    "organization": {
      "id": "org_001",
      "name": "TechStartup Inc."
    },
    "preferences": {
      "language": "en",
      "timezone": "America/New_York",
      "notifications": {
        "email": true,
        "push": true
      }
    },
    "subscription": {
      "plan": "PROFESSIONAL",
      "status": "ACTIVE",
      "expiresAt": "2026-01-15T00:00:00Z"
    },
    "statistics": {
      "completedSessions": 2,
      "documentsGenerated": 12,
      "lastActiveAt": "2025-01-15T10:00:00Z"
    },
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

---

## 6. Admin API (Developer Role)

### 6.1 Question Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/questions | List all questions |
| POST | /admin/questions | Create question |
| PUT | /admin/questions/:id | Update question |
| DELETE | /admin/questions/:id | Delete question |
| POST | /admin/questions/:id/rules | Add visibility rule |

#### POST /admin/questions
Create a new question.

**Request:**
```json
{
  "sectionId": "sec_003",
  "text": "What cloud provider do you prefer?",
  "type": "SINGLE_CHOICE",
  "required": false,
  "order": 5,
  "helpText": "Select your preferred cloud infrastructure provider",
  "explanation": "This determines deployment recommendations in your architecture document.",
  "options": [
    {
      "label": "Amazon Web Services (AWS)",
      "description": "Most popular, extensive services"
    },
    {
      "label": "Microsoft Azure",
      "description": "Strong enterprise integration"
    },
    {
      "label": "Google Cloud Platform (GCP)",
      "description": "Strong in data/ML services"
    },
    {
      "label": "No preference",
      "description": "We'll recommend based on your needs"
    }
  ],
  "visibilityRules": [
    {
      "condition": {
        "field": "q_015",
        "operator": "in",
        "value": ["opt_001", "opt_002", "opt_004"]
      },
      "action": "show"
    }
  ]
}
```

### 6.2 Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/analytics/overview | Dashboard metrics |
| GET | /admin/analytics/sessions | Session analytics |
| GET | /admin/analytics/questions | Question analytics |
| GET | /admin/analytics/documents | Document analytics |

#### GET /admin/analytics/overview
Get dashboard overview metrics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Start of date range |
| endDate | date | End of date range |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-01-01",
      "end": "2025-01-15"
    },
    "sessions": {
      "total": 150,
      "completed": 120,
      "inProgress": 25,
      "abandoned": 5,
      "completionRate": 80,
      "averageTime": 42
    },
    "documents": {
      "generated": 450,
      "approved": 400,
      "pendingReview": 50,
      "averageApprovalTime": 24
    },
    "users": {
      "totalActive": 200,
      "newThisPeriod": 35,
      "retention": 85
    },
    "questionMetrics": {
      "mostSkipped": [
        {
          "questionId": "q_045",
          "text": "What is your 5-year revenue projection?",
          "skipRate": 35
        }
      ],
      "mostTimeSpent": [
        {
          "questionId": "q_012",
          "text": "Describe your unique value proposition",
          "averageTime": 180
        }
      ]
    }
  }
}
```

---

## 7. Webhooks

### 7.1 Available Events

| Event | Description | Payload |
|-------|-------------|---------|
| session.completed | Session marked complete | Session object |
| document.generated | Document generation complete | Document object |
| document.approved | Document approved by developer | Document object |
| user.created | New user registered | User object |

### 7.2 Webhook Configuration

#### POST /webhooks
Register a webhook endpoint.

**Request:**
```json
{
  "url": "https://your-server.com/webhooks/questionnaire",
  "events": ["session.completed", "document.generated"],
  "secret": "your_webhook_secret"
}
```

### 7.3 Webhook Payload Format

```json
{
  "id": "evt_abc123",
  "type": "document.generated",
  "timestamp": "2025-01-15T10:55:00Z",
  "data": {
    "documentId": "doc_001",
    "documentType": "BUSINESS_PLAN",
    "sessionId": "sess_abc123",
    "userId": "usr_abc123"
  }
}
```

### 7.4 Signature Verification
```
X-Webhook-Signature: sha256=<HMAC-SHA256 of payload with secret>
```

---

## 8. Error Handling

### 8.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [],
    "requestId": "req_abc123",
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

### 8.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
| SESSION_EXPIRED | 401 | Session has expired |
| DOCUMENT_GENERATION_FAILED | 500 | Document generation error |

### 8.3 Rate Limiting

| Role | Limit | Window |
|------|-------|--------|
| CLIENT | 100 requests | 1 minute |
| DEVELOPER | 1000 requests | 1 minute |
| ADMIN | 5000 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315260
```

---

## 9. SDKs and Client Libraries

### 9.1 Available SDKs

| Platform | Package | Repository |
|----------|---------|------------|
| JavaScript/TypeScript | @questionnaire/sdk | npm |
| React Native | @questionnaire/react-native | npm |
| Python | questionnaire-sdk | PyPI |
| .NET | Questionnaire.SDK | NuGet |

### 9.2 JavaScript SDK Example

```typescript
import { QuestionnaireClient } from '@questionnaire/sdk';

const client = new QuestionnaireClient({
  baseUrl: 'https://api.questionnaire.app/v1',
  accessToken: 'your_access_token'
});

// Start a session
const session = await client.sessions.create({
  questionnaireId: 'quest_001',
  industry: 'saas'
});

// Get next question
const { question, progress } = await client.sessions.getNextQuestion(session.id);

// Submit response
await client.sessions.submitResponse(session.id, {
  questionId: question.id,
  value: { selectedOptionId: 'opt_001' }
});

// Generate documents
const job = await client.documents.generate({
  sessionId: session.id,
  documentTypes: ['BUSINESS_PLAN', 'BRD']
});
```

---

## 10. Changelog

### Version 1.0 (Initial Release)
- Core questionnaire API
- Session management
- Document generation
- User management
- Admin endpoints
- Webhook support

---

## 11. Related Documents

- [Product Architecture Document](./03-product-architecture.md)
- [Data Models and Database Architecture](./05-data-models-db-architecture.md)
- [Information Security Policy](./08-information-security-policy.md)
- [Engineering Handbook](./12-engineering-handbook.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Lead Developer | {{DEV_NAME}} | | |
# API Documentation
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Lead Developer  
**Classification:** Internal/External

---

## 1. Overview

This document provides comprehensive API documentation for the Adaptive Client Questionnaire System. The API follows RESTful principles with JSON payloads and supports OAuth 2.0 authentication.

### 1.1 Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.questionnaire.app/v1` |
| Staging | `https://api.staging.questionnaire.app/v1` |
| Development | `https://api.dev.questionnaire.app/v1` |

### 1.2 API Versioning
- Version included in URL path (`/v1/`, `/v2/`)
- Deprecation notice: 6 months before sunset
- Sunset header included in deprecated endpoints

---

## 2. Authentication

### 2.1 OAuth 2.0 Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Client App                    API Server                Auth0      │
│      │                             │                        │       │
│      │──── Login Request ─────────▶│                        │       │
│      │                             │──── Validate ─────────▶│       │
│      │                             │◀─── User Info ─────────│       │
│      │◀─── Access + Refresh Token ─│                        │       │
│      │                             │                        │       │
│      │──── API Request + Token ───▶│                        │       │
│      │◀─── Protected Resource ─────│                        │       │
│      │                             │                        │       │
│      │──── Refresh Token ─────────▶│                        │       │
│      │◀─── New Access Token ───────│                        │       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Authentication Endpoints

#### POST /auth/login
Authenticate user and obtain tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "role": "CLIENT",
      "name": "John Doe"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 900
  }
}
```

#### POST /auth/logout
Invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### 2.3 Authorization Header
```
Authorization: Bearer <access_token>
```

---

## 3. Questionnaire API

### 3.1 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /questionnaires | List available questionnaires | Yes |
| GET | /questionnaires/:id | Get questionnaire details | Yes |
| POST | /sessions | Start new questionnaire session | Yes |
| GET | /sessions/:id | Get session state and progress | Yes |
| GET | /sessions/:id/questions/next | Get next question(s) | Yes |
| POST | /sessions/:id/responses | Submit response | Yes |
| PUT | /sessions/:id/responses/:responseId | Update response | Yes |
| POST | /sessions/:id/complete | Mark session complete | Yes |

### 3.2 Questionnaire Endpoints

#### GET /questionnaires
List all available questionnaires.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| industry | string | Filter by industry (optional) |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20, max: 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "quest_001",
        "name": "Business Plan Questionnaire",
        "description": "Comprehensive questionnaire for business plan generation",
        "industry": "general",
        "estimatedTime": 45,
        "totalQuestions": 87,
        "sections": [
          {
            "id": "sec_001",
            "name": "Business Foundation",
            "questionCount": 12
          }
        ],
        "version": "2.0",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 5,
      "totalPages": 1
    }
  }
}
```

#### GET /questionnaires/:id
Get detailed questionnaire structure.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "quest_001",
    "name": "Business Plan Questionnaire",
    "description": "Comprehensive questionnaire for business plan generation",
    "industry": "general",
    "sections": [
      {
        "id": "sec_001",
        "name": "Business Foundation",
        "description": "Basic information about your business",
        "order": 1,
        "questions": [
          {
            "id": "q_001",
            "text": "What is your business name?",
            "type": "TEXT",
            "required": true,
            "helpText": "Enter your registered business name or proposed name",
            "validation": {
              "minLength": 2,
              "maxLength": 100
            }
          }
        ]
      }
    ]
  }
}
```

### 3.3 Session Endpoints

#### POST /sessions
Start a new questionnaire session.

**Request:**
```json
{
  "questionnaireId": "quest_001",
  "industry": "saas"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "sess_abc123",
    "questionnaireId": "quest_001",
    "userId": "usr_xyz789",
    "status": "IN_PROGRESS",
    "progress": {
      "percentage": 0,
      "answeredQuestions": 0,
      "totalQuestions": 87,
      "estimatedTimeRemaining": 45
    },
    "currentSection": {
      "id": "sec_001",
      "name": "Business Foundation"
    },
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

#### GET /sessions/:id/questions/next
Get next question(s) based on adaptive logic.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| count | integer | Number of questions to fetch (default: 1, max: 5) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "q_015",
        "text": "What type of software product are you building?",
        "type": "SINGLE_CHOICE",
        "required": true,
        "helpText": "This helps us customize your technology documentation",
        "explanation": "Different product types require different technical approaches and considerations.",
        "options": [
          {
            "id": "opt_001",
            "label": "Web Application (SaaS)",
            "description": "Browser-based software accessed via internet",
            "icon": "web"
          },
          {
            "id": "opt_002",
            "label": "Mobile Application",
            "description": "Native or hybrid app for iOS/Android",
            "icon": "mobile"
          },
          {
            "id": "opt_003",
            "label": "Desktop Application",
            "description": "Software installed on Windows/Mac/Linux",
            "icon": "desktop"
          },
          {
            "id": "opt_004",
            "label": "API/Backend Service",
            "description": "Server-side service consumed by other applications",
            "icon": "api"
          }
        ],
        "suggestedAnswer": {
          "optionId": "opt_001",
          "reason": "Based on your industry selection (SaaS), web applications are most common"
        }
      }
    ],
    "section": {
      "id": "sec_003",
      "name": "Technology Requirements",
      "progress": 25
    },
    "overallProgress": {
      "percentage": 35,
      "answeredQuestions": 30,
      "totalQuestions": 87
    }
  }
}
```

#### POST /sessions/:id/responses
Submit a response to a question.

**Request:**
```json
{
  "questionId": "q_015",
  "value": {
    "selectedOptionId": "opt_001"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "responseId": "resp_def456",
    "questionId": "q_015",
    "value": {
      "selectedOptionId": "opt_001"
    },
    "validationResult": {
      "isValid": true
    },
    "adaptiveChanges": {
      "questionsAdded": ["q_016", "q_017", "q_018"],
      "questionsRemoved": ["q_050", "q_051"],
      "newEstimatedTotal": 88
    },
    "progress": {
      "percentage": 36,
      "answeredQuestions": 31,
      "totalQuestions": 88
    },
    "createdAt": "2025-01-15T10:45:00Z"
  }
}
```

---

## 4. Document Generation API

### 4.1 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /documents/generate | Request document generation | Yes |
| GET | /documents | List user's documents | Yes |
| GET | /documents/:id | Get document details | Yes |
| GET | /documents/:id/download | Download document file | Yes |
| POST | /documents/:id/approve | Approve document (Developer only) | Yes (DEVELOPER) |

### 4.2 Document Generation

#### POST /documents/generate
Request generation of documents from completed session.

**Request:**
```json
{
  "sessionId": "sess_abc123",
  "documentTypes": ["BUSINESS_PLAN", "TECHNOLOGY_ROADMAP", "BRD"],
  "format": "PDF",
  "options": {
    "includeAppendices": true,
    "branding": {
      "companyName": "TechStartup Inc.",
      "logo": "https://..."
    }
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "job_gen_789",
    "status": "QUEUED",
    "estimatedCompletionTime": "2025-01-15T11:00:00Z",
    "documents": [
      {
        "id": "doc_001",
        "type": "BUSINESS_PLAN",
        "status": "PENDING",
        "format": "PDF"
      },
      {
        "id": "doc_002",
        "type": "TECHNOLOGY_ROADMAP",
        "status": "PENDING",
        "format": "PDF"
      },
      {
        "id": "doc_003",
        "type": "BRD",
        "status": "PENDING",
        "format": "PDF"
      }
    ]
  }
}
```

#### GET /documents/:id
Get document details and status.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "doc_001",
    "type": "BUSINESS_PLAN",
    "name": "Business Plan - TechStartup Inc.",
    "status": "PENDING_REVIEW",
    "format": "PDF",
    "fileSize": 2048576,
    "pageCount": 45,
    "generatedAt": "2025-01-15T10:55:00Z",
    "session": {
      "id": "sess_abc123",
      "completedAt": "2025-01-15T10:50:00Z"
    },
    "review": {
      "status": "PENDING",
      "assignedTo": null,
      "comments": []
    },
    "versions": [
      {
        "version": 1,
        "createdAt": "2025-01-15T10:55:00Z",
        "status": "CURRENT"
      }
    ]
  }
}
```

#### GET /documents/:id/download
Get signed download URL.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| version | integer | Document version (default: latest) |
| format | string | Output format: PDF, DOCX (default: PDF) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.example.com/docs/...",
    "expiresAt": "2025-01-15T12:00:00Z",
    "fileName": "Business_Plan_TechStartup_Inc.pdf",
    "contentType": "application/pdf",
    "fileSize": 2048576
  }
}
```

#### POST /documents/:id/approve
Approve document for client download (Developer only).

**Request:**
```json
{
  "approved": true,
  "comments": "Document reviewed and approved. Minor suggestions noted.",
  "internalNotes": "Client may need follow-up on financial projections."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "doc_001",
    "status": "APPROVED",
    "approvedBy": {
      "id": "usr_dev123",
      "name": "Jane Developer"
    },
    "approvedAt": "2025-01-15T14:00:00Z",
    "clientNotified": true
  }
}
```

---

## 5. User Management API

### 5.1 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /users/me | Get current user profile | Yes |
| PUT | /users/me | Update current user profile | Yes |
| GET | /users | List users (Admin only) | Yes (ADMIN) |
| GET | /users/:id | Get user details (Admin only) | Yes (ADMIN) |
| POST | /users | Create user (Admin only) | Yes (ADMIN) |
| PUT | /users/:id | Update user (Admin only) | Yes (ADMIN) |

### 5.2 User Endpoints

#### GET /users/me
Get current authenticated user's profile.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "entrepreneur@example.com",
    "name": "John Entrepreneur",
    "role": "CLIENT",
    "organization": {
      "id": "org_001",
      "name": "TechStartup Inc."
    },
    "preferences": {
      "language": "en",
      "timezone": "America/New_York",
      "notifications": {
        "email": true,
        "push": true
      }
    },
    "subscription": {
      "plan": "PROFESSIONAL",
      "status": "ACTIVE",
      "expiresAt": "2026-01-15T00:00:00Z"
    },
    "statistics": {
      "completedSessions": 2,
      "documentsGenerated": 12,
      "lastActiveAt": "2025-01-15T10:00:00Z"
    },
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

---

## 6. Admin API (Developer Role)

### 6.1 Question Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/questions | List all questions |
| POST | /admin/questions | Create question |
| PUT | /admin/questions/:id | Update question |
| DELETE | /admin/questions/:id | Delete question |
| POST | /admin/questions/:id/rules | Add visibility rule |

#### POST /admin/questions
Create a new question.

**Request:**
```json
{
  "sectionId": "sec_003",
  "text": "What cloud provider do you prefer?",
  "type": "SINGLE_CHOICE",
  "required": false,
  "order": 5,
  "helpText": "Select your preferred cloud infrastructure provider",
  "explanation": "This determines deployment recommendations in your architecture document.",
  "options": [
    {
      "label": "Amazon Web Services (AWS)",
      "description": "Most popular, extensive services"
    },
    {
      "label": "Microsoft Azure",
      "description": "Strong enterprise integration"
    },
    {
      "label": "Google Cloud Platform (GCP)",
      "description": "Strong in data/ML services"
    },
    {
      "label": "No preference",
      "description": "We'll recommend based on your needs"
    }
  ],
  "visibilityRules": [
    {
      "condition": {
        "field": "q_015",
        "operator": "in",
        "value": ["opt_001", "opt_002", "opt_004"]
      },
      "action": "show"
    }
  ]
}
```

### 6.2 Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/analytics/overview | Dashboard metrics |
| GET | /admin/analytics/sessions | Session analytics |
| GET | /admin/analytics/questions | Question analytics |
| GET | /admin/analytics/documents | Document analytics |

#### GET /admin/analytics/overview
Get dashboard overview metrics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Start of date range |
| endDate | date | End of date range |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-01-01",
      "end": "2025-01-15"
    },
    "sessions": {
      "total": 150,
      "completed": 120,
      "inProgress": 25,
      "abandoned": 5,
      "completionRate": 80,
      "averageTime": 42
    },
    "documents": {
      "generated": 450,
      "approved": 400,
      "pendingReview": 50,
      "averageApprovalTime": 24
    },
    "users": {
      "totalActive": 200,
      "newThisPeriod": 35,
      "retention": 85
    },
    "questionMetrics": {
      "mostSkipped": [
        {
          "questionId": "q_045",
          "text": "What is your 5-year revenue projection?",
          "skipRate": 35
        }
      ],
      "mostTimeSpent": [
        {
          "questionId": "q_012",
          "text": "Describe your unique value proposition",
          "averageTime": 180
        }
      ]
    }
  }
}
```

---

## 7. Webhooks

### 7.1 Available Events

| Event | Description | Payload |
|-------|-------------|---------|
| session.completed | Session marked complete | Session object |
| document.generated | Document generation complete | Document object |
| document.approved | Document approved by developer | Document object |
| user.created | New user registered | User object |

### 7.2 Webhook Configuration

#### POST /webhooks
Register a webhook endpoint.

**Request:**
```json
{
  "url": "https://your-server.com/webhooks/questionnaire",
  "events": ["session.completed", "document.generated"],
  "secret": "your_webhook_secret"
}
```

### 7.3 Webhook Payload Format

```json
{
  "id": "evt_abc123",
  "type": "document.generated",
  "timestamp": "2025-01-15T10:55:00Z",
  "data": {
    "documentId": "doc_001",
    "documentType": "BUSINESS_PLAN",
    "sessionId": "sess_abc123",
    "userId": "usr_abc123"
  }
}
```

### 7.4 Signature Verification
```
X-Webhook-Signature: sha256=<HMAC-SHA256 of payload with secret>
```

---

## 8. Error Handling

### 8.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [],
    "requestId": "req_abc123",
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

### 8.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
| SESSION_EXPIRED | 401 | Session has expired |
| DOCUMENT_GENERATION_FAILED | 500 | Document generation error |

### 8.3 Rate Limiting

| Role | Limit | Window |
|------|-------|--------|
| CLIENT | 100 requests | 1 minute |
| DEVELOPER | 1000 requests | 1 minute |
| ADMIN | 5000 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315260
```

---

## 9. SDKs and Client Libraries

### 9.1 Available SDKs

| Platform | Package | Repository |
|----------|---------|------------|
| JavaScript/TypeScript | @questionnaire/sdk | npm |
| React Native | @questionnaire/react-native | npm |
| Python | questionnaire-sdk | PyPI |
| .NET | Questionnaire.SDK | NuGet |

### 9.2 JavaScript SDK Example

```typescript
import { QuestionnaireClient } from '@questionnaire/sdk';

const client = new QuestionnaireClient({
  baseUrl: 'https://api.questionnaire.app/v1',
  accessToken: 'your_access_token'
});

// Start a session
const session = await client.sessions.create({
  questionnaireId: 'quest_001',
  industry: 'saas'
});

// Get next question
const { question, progress } = await client.sessions.getNextQuestion(session.id);

// Submit response
await client.sessions.submitResponse(session.id, {
  questionId: question.id,
  value: { selectedOptionId: 'opt_001' }
});

// Generate documents
const job = await client.documents.generate({
  sessionId: session.id,
  documentTypes: ['BUSINESS_PLAN', 'BRD']
});
```

---

## 10. Changelog

### Version 1.0 (Initial Release)
- Core questionnaire API
- Session management
- Document generation
- User management
- Admin endpoints
- Webhook support

---

## 11. Related Documents

- [Product Architecture Document](./03-product-architecture.md)
- [Data Models and Database Architecture](./05-data-models-db-architecture.md)
- [Information Security Policy](./08-information-security-policy.md)
- [Engineering Handbook](./12-engineering-handbook.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Lead Developer | {{DEV_NAME}} | | |
