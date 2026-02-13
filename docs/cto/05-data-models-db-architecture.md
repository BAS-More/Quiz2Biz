# Data Models and Database Architecture
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Database Architect  
**Classification:** Internal

---

## 1. Overview

This document defines the data models, database architecture, and data management strategies for the Adaptive Client Questionnaire System. The system uses PostgreSQL as the primary database with Redis for caching and session management.

---

## 2. Database Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary Database | PostgreSQL 15+ | Transactional data, JSONB support |
| Cache Layer | Redis 7+ | Session cache, rate limiting |
| Search | PostgreSQL Full-Text / Elasticsearch | Question search |
| Object Storage | S3/Azure Blob | Generated documents |
| Data Warehouse | PostgreSQL Analytics / Redshift | Reporting |

---

## 3. Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │   organizations  │         │      users       │                         │
│  ├──────────────────┤         ├──────────────────┤                         │
│  │ PK: id           │◀────────│ FK: org_id       │                         │
│  │    name          │    1:N  │ PK: id           │                         │
│  │    settings      │         │    email         │                         │
│  │    subscription  │         │    password_hash │                         │
│  │    created_at    │         │    role          │                         │
│  └──────────────────┘         │    profile       │                         │
│                               │    created_at    │                         │
│                               └────────┬─────────┘                         │
│                                        │                                    │
│          ┌─────────────────────────────┼─────────────────────────────┐     │
│          │                             │                             │     │
│          ▼                             ▼                             ▼     │
│  ┌──────────────────┐         ┌──────────────────┐         ┌────────────┐ │
│  │    sessions      │         │   audit_logs     │         │ api_keys   │ │
│  ├──────────────────┤         ├──────────────────┤         ├────────────┤ │
│  │ PK: id           │         │ PK: id           │         │ PK: id     │ │
│  │ FK: user_id      │         │ FK: user_id      │         │ FK: user_id│ │
│  │ FK: questionnaire│         │    action        │         │    key_hash│ │
│  │    status        │         │    resource      │         │    scopes  │ │
│  │    progress      │         │    ip_address    │         │    expires │ │
│  │    industry      │         │    created_at    │         └────────────┘ │
│  │    metadata      │         └──────────────────┘                        │
│  │    started_at    │                                                      │
│  │    completed_at  │                                                      │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           │ 1:N                                                             │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │    responses     │         ┌──────────────────┐                         │
│  ├──────────────────┤         │  questionnaires  │                         │
│  │ PK: id           │         ├──────────────────┤                         │
│  │ FK: session_id   │         │ PK: id           │◀────────────────┐      │
│  │ FK: question_id  │────────▶│    name          │                 │      │
│  │    value         │         │    description   │                 │      │
│  │    answered_at   │         │    industry      │                 │      │
│  │    time_spent    │         │    version       │                 │      │
│  └──────────────────┘         │    is_active     │                 │      │
│                               │    created_at    │                 │      │
│           │                   └────────┬─────────┘                 │      │
│           │                            │                           │      │
│           │                            │ 1:N                       │      │
│           │                            ▼                           │      │
│           │                   ┌──────────────────┐                 │      │
│           │                   │    sections      │                 │      │
│           │                   ├──────────────────┤                 │      │
│           │                   │ PK: id           │                 │      │
│           │                   │ FK: questionnaire│                 │      │
│           │                   │    name          │                 │      │
│           │                   │    description   │                 │      │
│           │                   │    order         │                 │      │
│           │                   └────────┬─────────┘                 │      │
│           │                            │                           │      │
│           │                            │ 1:N                       │      │
│           │                            ▼                           │      │
│           │                   ┌──────────────────┐                 │      │
│           │                   │    questions     │                 │      │
│           └──────────────────▶├──────────────────┤                 │      │
│                               │ PK: id           │                 │      │
│                               │ FK: section_id   │                 │      │
│                               │    text          │                 │      │
│                               │    type          │                 │      │
│                               │    options       │                 │      │
│                               │    validation    │                 │      │
│                               │    visibility    │                 │      │
│                               │    order         │                 │      │
│                               │    metadata      │                 │      │
│                               └────────┬─────────┘                 │      │
│                                        │                           │      │
│                                        │ 1:N                       │      │
│                                        ▼                           │      │
│                               ┌──────────────────┐                 │      │
│                               │ visibility_rules │                 │      │
│                               ├──────────────────┤                 │      │
│                               │ PK: id           │                 │      │
│                               │ FK: question_id  │                 │      │
│                               │    condition     │                 │      │
│                               │    action        │                 │      │
│                               │    target_ids    │                 │      │
│                               └──────────────────┘                 │      │
│                                                                    │      │
│  ┌──────────────────┐         ┌──────────────────┐                │      │
│  │    documents     │         │ document_types   │                │      │
│  ├──────────────────┤         ├──────────────────┤                │      │
│  │ PK: id           │         │ PK: id           │◀───────────────┘      │
│  │ FK: session_id   │         │    name          │                       │
│  │ FK: type_id      │────────▶│    category      │                       │
│  │ FK: approved_by  │         │    template_path │                       │
│  │    status        │         │    required_qs   │                       │
│  │    storage_url   │         └──────────────────┘                       │
│  │    metadata      │                                                     │
│  │    generated_at  │                                                     │
│  │    approved_at   │                                                     │
│  └──────────────────┘                                                     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Schema Definitions

### 4.1 Core Tables

#### organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription JSONB DEFAULT '{}',
    -- subscription: { plan, status, seats, trial_ends_at, billing }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created ON organizations(created_at);
```

#### users
```sql
CREATE TYPE user_role AS ENUM ('CLIENT', 'DEVELOPER', 'ADMIN', 'SUPER_ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'CLIENT',
    profile JSONB DEFAULT '{}',
    -- profile: { name, phone, timezone, language, avatar_url }
    preferences JSONB DEFAULT '{}',
    -- preferences: { notifications, theme, accessibility }
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at);
```

### 4.2 Questionnaire Tables

#### questionnaires
```sql
CREATE TABLE questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    estimated_time INTEGER, -- minutes
    metadata JSONB DEFAULT '{}',
    -- metadata: { tags, difficulty, target_audience }
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_questionnaires_industry ON questionnaires(industry);
CREATE INDEX idx_questionnaires_active ON questionnaires(is_active);
```

#### sections
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    icon VARCHAR(50),
    estimated_time INTEGER, -- minutes
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_questionnaire ON sections(questionnaire_id);
CREATE INDEX idx_sections_order ON sections(questionnaire_id, order_index);
```

#### questions
```sql
CREATE TYPE question_type AS ENUM (
    'TEXT',
    'TEXTAREA',
    'NUMBER',
    'EMAIL',
    'URL',
    'DATE',
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'SCALE',
    'FILE_UPLOAD',
    'MATRIX'
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type question_type NOT NULL,
    help_text TEXT,
    explanation TEXT,
    placeholder VARCHAR(255),
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    options JSONB,
    -- options: [{ id, label, description, icon, value }]
    validation_rules JSONB,
    -- validation: { minLength, maxLength, min, max, pattern, customMessage }
    default_value JSONB,
    suggested_answer JSONB,
    -- suggested: { value, reason, confidence }
    industry_tags VARCHAR(50)[],
    document_mappings JSONB,
    -- mappings: [{ documentType, section, field }]
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_section ON questions(section_id);
CREATE INDEX idx_questions_order ON questions(section_id, order_index);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_industry ON questions USING GIN(industry_tags);
```

#### visibility_rules
```sql
CREATE TYPE visibility_action AS ENUM ('SHOW', 'HIDE', 'REQUIRE', 'UNREQUIRE');

CREATE TABLE visibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    condition JSONB NOT NULL,
    -- condition: { field, operator, value, logicalOp, nested }
    -- operators: eq, ne, gt, lt, gte, lte, in, not_in, contains, not_contains
    action visibility_action NOT NULL,
    target_question_ids UUID[] NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visibility_rules_question ON visibility_rules(question_id);
CREATE INDEX idx_visibility_rules_targets ON visibility_rules USING GIN(target_question_ids);
```

### 4.3 Session Tables

#### sessions
```sql
CREATE TYPE session_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED');

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    questionnaire_id UUID NOT NULL REFERENCES questionnaires(id),
    questionnaire_version INTEGER NOT NULL,
    status session_status NOT NULL DEFAULT 'IN_PROGRESS',
    industry VARCHAR(100),
    progress JSONB DEFAULT '{"percentage": 0, "answered": 0, "total": 0}',
    current_section_id UUID REFERENCES sections(id),
    current_question_id UUID REFERENCES questions(id),
    adaptive_state JSONB DEFAULT '{}',
    -- adaptive_state: { activeQuestionIds, skippedQuestionIds, branchHistory }
    metadata JSONB DEFAULT '{}',
    -- metadata: { userAgent, deviceType, referrer }
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_questionnaire ON sessions(questionnaire_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started ON sessions(started_at);
```

#### responses
```sql
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    value JSONB NOT NULL,
    -- value structure depends on question type:
    -- TEXT/TEXTAREA/EMAIL/URL: { text: "..." }
    -- NUMBER: { number: 123 }
    -- SINGLE_CHOICE: { selectedOptionId: "..." }
    -- MULTIPLE_CHOICE: { selectedOptionIds: ["...", "..."] }
    -- SCALE: { rating: 5 }
    -- DATE: { date: "2025-01-15" }
    -- FILE_UPLOAD: { fileUrl: "...", fileName: "...", fileSize: 1234 }
    -- MATRIX: { rows: { row1: "opt1", row2: "opt2" } }
    is_valid BOOLEAN DEFAULT TRUE,
    validation_errors JSONB,
    time_spent_seconds INTEGER,
    revision INTEGER DEFAULT 1,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, question_id)
);

CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_responses_question ON responses(question_id);
CREATE INDEX idx_responses_answered ON responses(answered_at);
```

### 4.4 Document Tables

#### document_types
```sql
CREATE TYPE document_category AS ENUM ('CTO', 'CFO', 'BA');

CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category document_category NOT NULL,
    template_path VARCHAR(500),
    required_questions UUID[],
    output_formats VARCHAR(10)[] DEFAULT ARRAY['PDF', 'DOCX'],
    estimated_pages INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_types_category ON document_types(category);
CREATE INDEX idx_document_types_active ON document_types(is_active);
```

#### documents
```sql
CREATE TYPE document_status AS ENUM (
    'PENDING',
    'GENERATING',
    'GENERATED',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'FAILED'
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    status document_status NOT NULL DEFAULT 'PENDING',
    format VARCHAR(10) NOT NULL DEFAULT 'PDF',
    storage_url VARCHAR(1000),
    file_name VARCHAR(255),
    file_size BIGINT,
    page_count INTEGER,
    version INTEGER DEFAULT 1,
    generation_metadata JSONB,
    -- generation_metadata: { startedAt, completedAt, duration, errors }
    review_status JSONB DEFAULT '{}',
    -- review: { assignedTo, comments, internalNotes }
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_session ON documents(session_id);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_generated ON documents(generated_at);
```

### 4.5 Audit and Security Tables

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    changes JSONB,
    -- changes: { before: {...}, after: {...} }
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Partitioning for audit logs (by month)
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### api_keys
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification
    key_hash VARCHAR(255) NOT NULL,
    scopes VARCHAR(50)[] NOT NULL,
    rate_limit INTEGER DEFAULT 1000,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

---

## 5. JSONB Schema Definitions

### 5.1 Question Options Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "label"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "label": { "type": "string", "maxLength": 500 },
      "description": { "type": "string", "maxLength": 1000 },
      "icon": { "type": "string", "maxLength": 50 },
      "value": { "type": ["string", "number", "boolean"] },
      "isExclusive": { "type": "boolean" },
      "order": { "type": "integer" }
    }
  }
}
```

### 5.2 Visibility Condition Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["field", "operator", "value"],
  "properties": {
    "field": { "type": "string", "description": "Question ID reference" },
    "operator": {
      "type": "string",
      "enum": ["eq", "ne", "gt", "lt", "gte", "lte", "in", "not_in", "contains", "not_contains", "is_empty", "is_not_empty"]
    },
    "value": {},
    "logicalOp": { "type": "string", "enum": ["AND", "OR"] },
    "nested": {
      "type": "array",
      "items": { "$ref": "#" }
    }
  }
}
```

### 5.3 Response Value Schema (by type)
```json
{
  "TEXT": { "text": "string" },
  "NUMBER": { "number": "number" },
  "SINGLE_CHOICE": { "selectedOptionId": "uuid" },
  "MULTIPLE_CHOICE": { "selectedOptionIds": ["uuid"] },
  "SCALE": { "rating": "integer", "min": 1, "max": 10 },
  "DATE": { "date": "date", "includeTime": "boolean" },
  "FILE_UPLOAD": {
    "fileUrl": "url",
    "fileName": "string",
    "fileSize": "integer",
    "mimeType": "string"
  },
  "MATRIX": {
    "rows": { "rowId": "optionId" }
  }
}
```

---

## 6. Database Indexes Strategy

### 6.1 Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_sessions_user_status ON sessions(user_id, status);
CREATE INDEX idx_responses_session_answered ON responses(session_id, answered_at);
CREATE INDEX idx_documents_session_status ON documents(session_id, status);

-- Partial indexes for active records
CREATE INDEX idx_sessions_active ON sessions(user_id, started_at)
    WHERE status = 'IN_PROGRESS';
CREATE INDEX idx_documents_pending_review ON documents(created_at)
    WHERE status = 'PENDING_REVIEW';

-- Full-text search on questions
CREATE INDEX idx_questions_text_search ON questions
    USING GIN(to_tsvector('english', text || ' ' || COALESCE(help_text, '')));
```

### 6.2 JSONB Indexes
```sql
-- GIN indexes for JSONB queries
CREATE INDEX idx_questions_options ON questions USING GIN(options);
CREATE INDEX idx_responses_value ON responses USING GIN(value);
CREATE INDEX idx_sessions_progress ON sessions USING GIN(progress);

-- Specific JSONB path indexes
CREATE INDEX idx_users_profile_name ON users((profile->>'name'));
CREATE INDEX idx_sessions_progress_pct ON sessions(((progress->>'percentage')::int));
```

---

## 7. Data Migration Strategy

### 7.1 Migration Framework
- Tool: Prisma Migrate or node-pg-migrate
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Reversibility: All migrations must have rollback scripts
- Testing: Migrations tested in staging before production

### 7.2 Migration Example
```sql
-- Migration: 20250115120000_add_session_analytics.sql

-- Up
ALTER TABLE sessions ADD COLUMN analytics JSONB DEFAULT '{}';
CREATE INDEX idx_sessions_analytics ON sessions USING GIN(analytics);

-- Down
DROP INDEX IF EXISTS idx_sessions_analytics;
ALTER TABLE sessions DROP COLUMN IF EXISTS analytics;
```

### 7.3 Data Seeding
```sql
-- Seed default document types
INSERT INTO document_types (name, slug, category, template_path) VALUES
    ('Technology Roadmap', 'technology-roadmap', 'CTO', '/templates/cto/roadmap.hbs'),
    ('Technology Strategy', 'technology-strategy', 'CTO', '/templates/cto/strategy.hbs'),
    ('Product Architecture', 'product-architecture', 'CTO', '/templates/cto/architecture.hbs'),
    -- ... all 25 document types
    ('Business Plan', 'business-plan', 'CFO', '/templates/cfo/business-plan.hbs'),
    ('Business Requirements Document', 'brd', 'BA', '/templates/ba/brd.hbs');
```

---

## 8. Backup and Recovery

### 8.1 Backup Strategy

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full Backup | Daily | 30 days | S3 Glacier |
| Incremental | Hourly | 7 days | S3 Standard |
| WAL Archive | Continuous | 7 days | S3 Standard |
| Point-in-Time | On-demand | 24 hours | RDS Snapshots |

### 8.2 Recovery Procedures
1. **Point-in-Time Recovery (PITR):** Available for any time in last 7 days
2. **Full Restore:** From daily backup, RTO < 4 hours
3. **Table-Level Recovery:** Using pg_restore with specific tables
4. **Cross-Region Recovery:** From replicated backups in DR region

---

## 9. Performance Optimization

### 9.1 Query Optimization Guidelines
- Use EXPLAIN ANALYZE for all new queries
- Limit result sets with pagination
- Use connection pooling (PgBouncer)
- Batch inserts for responses
- Use read replicas for reporting queries

### 9.2 Caching Strategy

| Data | Cache Type | TTL | Invalidation |
|------|------------|-----|--------------|
| Questionnaire structure | Redis | 1 hour | On update |
| User session | Redis | 24 hours | On logout |
| Question visibility | App memory | 5 min | On rule change |
| Document metadata | Redis | 30 min | On generation |

### 9.3 Connection Pooling
```
PgBouncer Configuration:
- pool_mode: transaction
- max_client_conn: 1000
- default_pool_size: 20
- reserve_pool_size: 5
```

---

## 10. Data Retention and Archival

### 10.1 Retention Policies

| Data Type | Active Retention | Archive | Deletion |
|-----------|------------------|---------|----------|
| User accounts | Indefinite | N/A | On request |
| Sessions | 2 years | 5 years | After 7 years |
| Responses | 2 years | 5 years | After 7 years |
| Documents | 2 years | Indefinite | Never |
| Audit logs | 1 year | 7 years | After 7 years |
| API logs | 90 days | N/A | After 90 days |

### 10.2 Archival Process
```sql
-- Archive completed sessions older than 2 years
INSERT INTO sessions_archive
SELECT * FROM sessions
WHERE completed_at < NOW() - INTERVAL '2 years'
  AND status = 'COMPLETED';

DELETE FROM sessions
WHERE completed_at < NOW() - INTERVAL '2 years'
  AND status = 'COMPLETED';
```

---

## 11. Related Documents

- [Product Architecture Document](./03-product-architecture.md)
- [API Documentation](./04-api-documentation.md)
- [Data Protection/Privacy Policy](./10-data-protection-privacy-policy.md)
- [Disaster Recovery Plan](./11-disaster-recovery-business-continuity.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Database Architect | {{DBA_NAME}} | | |
| Security Officer | {{CISO_NAME}} | | |
# Data Models and Database Architecture
## Adaptive Client Questionnaire System

**Document Version:** 1.0  
**Last Updated:** {{GENERATION_DATE}}  
**Document Owner:** CTO / Database Architect  
**Classification:** Internal

---

## 1. Overview

This document defines the data models, database architecture, and data management strategies for the Adaptive Client Questionnaire System. The system uses PostgreSQL as the primary database with Redis for caching and session management.

---

## 2. Database Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary Database | PostgreSQL 15+ | Transactional data, JSONB support |
| Cache Layer | Redis 7+ | Session cache, rate limiting |
| Search | PostgreSQL Full-Text / Elasticsearch | Question search |
| Object Storage | S3/Azure Blob | Generated documents |
| Data Warehouse | PostgreSQL Analytics / Redshift | Reporting |

---

## 3. Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐         ┌──────────────────┐                         │
│  │   organizations  │         │      users       │                         │
│  ├──────────────────┤         ├──────────────────┤                         │
│  │ PK: id           │◀────────│ FK: org_id       │                         │
│  │    name          │    1:N  │ PK: id           │                         │
│  │    settings      │         │    email         │                         │
│  │    subscription  │         │    password_hash │                         │
│  │    created_at    │         │    role          │                         │
│  └──────────────────┘         │    profile       │                         │
│                               │    created_at    │                         │
│                               └────────┬─────────┘                         │
│                                        │                                    │
│          ┌─────────────────────────────┼─────────────────────────────┐     │
│          │                             │                             │     │
│          ▼                             ▼                             ▼     │
│  ┌──────────────────┐         ┌──────────────────┐         ┌────────────┐ │
│  │    sessions      │         │   audit_logs     │         │ api_keys   │ │
│  ├──────────────────┤         ├──────────────────┤         ├────────────┤ │
│  │ PK: id           │         │ PK: id           │         │ PK: id     │ │
│  │ FK: user_id      │         │ FK: user_id      │         │ FK: user_id│ │
│  │ FK: questionnaire│         │    action        │         │    key_hash│ │
│  │    status        │         │    resource      │         │    scopes  │ │
│  │    progress      │         │    ip_address    │         │    expires │ │
│  │    industry      │         │    created_at    │         └────────────┘ │
│  │    metadata      │         └──────────────────┘                        │
│  │    started_at    │                                                      │
│  │    completed_at  │                                                      │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           │ 1:N                                                             │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │    responses     │         ┌──────────────────┐                         │
│  ├──────────────────┤         │  questionnaires  │                         │
│  │ PK: id           │         ├──────────────────┤                         │
│  │ FK: session_id   │         │ PK: id           │◀────────────────┐      │
│  │ FK: question_id  │────────▶│    name          │                 │      │
│  │    value         │         │    description   │                 │      │
│  │    answered_at   │         │    industry      │                 │      │
│  │    time_spent    │         │    version       │                 │      │
│  └──────────────────┘         │    is_active     │                 │      │
│                               │    created_at    │                 │      │
│           │                   └────────┬─────────┘                 │      │
│           │                            │                           │      │
│           │                            │ 1:N                       │      │
│           │                            ▼                           │      │
│           │                   ┌──────────────────┐                 │      │
│           │                   │    sections      │                 │      │
│           │                   ├──────────────────┤                 │      │
│           │                   │ PK: id           │                 │      │
│           │                   │ FK: questionnaire│                 │      │
│           │                   │    name          │                 │      │
│           │                   │    description   │                 │      │
│           │                   │    order         │                 │      │
│           │                   └────────┬─────────┘                 │      │
│           │                            │                           │      │
│           │                            │ 1:N                       │      │
│           │                            ▼                           │      │
│           │                   ┌──────────────────┐                 │      │
│           │                   │    questions     │                 │      │
│           └──────────────────▶├──────────────────┤                 │      │
│                               │ PK: id           │                 │      │
│                               │ FK: section_id   │                 │      │
│                               │    text          │                 │      │
│                               │    type          │                 │      │
│                               │    options       │                 │      │
│                               │    validation    │                 │      │
│                               │    visibility    │                 │      │
│                               │    order         │                 │      │
│                               │    metadata      │                 │      │
│                               └────────┬─────────┘                 │      │
│                                        │                           │      │
│                                        │ 1:N                       │      │
│                                        ▼                           │      │
│                               ┌──────────────────┐                 │      │
│                               │ visibility_rules │                 │      │
│                               ├──────────────────┤                 │      │
│                               │ PK: id           │                 │      │
│                               │ FK: question_id  │                 │      │
│                               │    condition     │                 │      │
│                               │    action        │                 │      │
│                               │    target_ids    │                 │      │
│                               └──────────────────┘                 │      │
│                                                                    │      │
│  ┌──────────────────┐         ┌──────────────────┐                │      │
│  │    documents     │         │ document_types   │                │      │
│  ├──────────────────┤         ├──────────────────┤                │      │
│  │ PK: id           │         │ PK: id           │◀───────────────┘      │
│  │ FK: session_id   │         │    name          │                       │
│  │ FK: type_id      │────────▶│    category      │                       │
│  │ FK: approved_by  │         │    template_path │                       │
│  │    status        │         │    required_qs   │                       │
│  │    storage_url   │         └──────────────────┘                       │
│  │    metadata      │                                                     │
│  │    generated_at  │                                                     │
│  │    approved_at   │                                                     │
│  └──────────────────┘                                                     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Schema Definitions

### 4.1 Core Tables

#### organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription JSONB DEFAULT '{}',
    -- subscription: { plan, status, seats, trial_ends_at, billing }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created ON organizations(created_at);
```

#### users
```sql
CREATE TYPE user_role AS ENUM ('CLIENT', 'DEVELOPER', 'ADMIN', 'SUPER_ADMIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'CLIENT',
    profile JSONB DEFAULT '{}',
    -- profile: { name, phone, timezone, language, avatar_url }
    preferences JSONB DEFAULT '{}',
    -- preferences: { notifications, theme, accessibility }
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created ON users(created_at);
```

### 4.2 Questionnaire Tables

#### questionnaires
```sql
CREATE TABLE questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    estimated_time INTEGER, -- minutes
    metadata JSONB DEFAULT '{}',
    -- metadata: { tags, difficulty, target_audience }
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_questionnaires_industry ON questionnaires(industry);
CREATE INDEX idx_questionnaires_active ON questionnaires(is_active);
```

#### sections
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    icon VARCHAR(50),
    estimated_time INTEGER, -- minutes
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_questionnaire ON sections(questionnaire_id);
CREATE INDEX idx_sections_order ON sections(questionnaire_id, order_index);
```

#### questions
```sql
CREATE TYPE question_type AS ENUM (
    'TEXT',
    'TEXTAREA',
    'NUMBER',
    'EMAIL',
    'URL',
    'DATE',
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'SCALE',
    'FILE_UPLOAD',
    'MATRIX'
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type question_type NOT NULL,
    help_text TEXT,
    explanation TEXT,
    placeholder VARCHAR(255),
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    options JSONB,
    -- options: [{ id, label, description, icon, value }]
    validation_rules JSONB,
    -- validation: { minLength, maxLength, min, max, pattern, customMessage }
    default_value JSONB,
    suggested_answer JSONB,
    -- suggested: { value, reason, confidence }
    industry_tags VARCHAR(50)[],
    document_mappings JSONB,
    -- mappings: [{ documentType, section, field }]
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_section ON questions(section_id);
CREATE INDEX idx_questions_order ON questions(section_id, order_index);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_industry ON questions USING GIN(industry_tags);
```

#### visibility_rules
```sql
CREATE TYPE visibility_action AS ENUM ('SHOW', 'HIDE', 'REQUIRE', 'UNREQUIRE');

CREATE TABLE visibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    condition JSONB NOT NULL,
    -- condition: { field, operator, value, logicalOp, nested }
    -- operators: eq, ne, gt, lt, gte, lte, in, not_in, contains, not_contains
    action visibility_action NOT NULL,
    target_question_ids UUID[] NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visibility_rules_question ON visibility_rules(question_id);
CREATE INDEX idx_visibility_rules_targets ON visibility_rules USING GIN(target_question_ids);
```

### 4.3 Session Tables

#### sessions
```sql
CREATE TYPE session_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED');

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    questionnaire_id UUID NOT NULL REFERENCES questionnaires(id),
    questionnaire_version INTEGER NOT NULL,
    status session_status NOT NULL DEFAULT 'IN_PROGRESS',
    industry VARCHAR(100),
    progress JSONB DEFAULT '{"percentage": 0, "answered": 0, "total": 0}',
    current_section_id UUID REFERENCES sections(id),
    current_question_id UUID REFERENCES questions(id),
    adaptive_state JSONB DEFAULT '{}',
    -- adaptive_state: { activeQuestionIds, skippedQuestionIds, branchHistory }
    metadata JSONB DEFAULT '{}',
    -- metadata: { userAgent, deviceType, referrer }
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_questionnaire ON sessions(questionnaire_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started ON sessions(started_at);
```

#### responses
```sql
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    value JSONB NOT NULL,
    -- value structure depends on question type:
    -- TEXT/TEXTAREA/EMAIL/URL: { text: "..." }
    -- NUMBER: { number: 123 }
    -- SINGLE_CHOICE: { selectedOptionId: "..." }
    -- MULTIPLE_CHOICE: { selectedOptionIds: ["...", "..."] }
    -- SCALE: { rating: 5 }
    -- DATE: { date: "2025-01-15" }
    -- FILE_UPLOAD: { fileUrl: "...", fileName: "...", fileSize: 1234 }
    -- MATRIX: { rows: { row1: "opt1", row2: "opt2" } }
    is_valid BOOLEAN DEFAULT TRUE,
    validation_errors JSONB,
    time_spent_seconds INTEGER,
    revision INTEGER DEFAULT 1,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, question_id)
);

CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_responses_question ON responses(question_id);
CREATE INDEX idx_responses_answered ON responses(answered_at);
```

### 4.4 Document Tables

#### document_types
```sql
CREATE TYPE document_category AS ENUM ('CTO', 'CFO', 'BA');

CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category document_category NOT NULL,
    template_path VARCHAR(500),
    required_questions UUID[],
    output_formats VARCHAR(10)[] DEFAULT ARRAY['PDF', 'DOCX'],
    estimated_pages INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_types_category ON document_types(category);
CREATE INDEX idx_document_types_active ON document_types(is_active);
```

#### documents
```sql
CREATE TYPE document_status AS ENUM (
    'PENDING',
    'GENERATING',
    'GENERATED',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'FAILED'
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    status document_status NOT NULL DEFAULT 'PENDING',
    format VARCHAR(10) NOT NULL DEFAULT 'PDF',
    storage_url VARCHAR(1000),
    file_name VARCHAR(255),
    file_size BIGINT,
    page_count INTEGER,
    version INTEGER DEFAULT 1,
    generation_metadata JSONB,
    -- generation_metadata: { startedAt, completedAt, duration, errors }
    review_status JSONB DEFAULT '{}',
    -- review: { assignedTo, comments, internalNotes }
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_session ON documents(session_id);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_generated ON documents(generated_at);
```

### 4.5 Audit and Security Tables

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    changes JSONB,
    -- changes: { before: {...}, after: {...} }
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Partitioning for audit logs (by month)
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### api_keys
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification
    key_hash VARCHAR(255) NOT NULL,
    scopes VARCHAR(50)[] NOT NULL,
    rate_limit INTEGER DEFAULT 1000,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

---

## 5. JSONB Schema Definitions

### 5.1 Question Options Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "label"],
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "label": { "type": "string", "maxLength": 500 },
      "description": { "type": "string", "maxLength": 1000 },
      "icon": { "type": "string", "maxLength": 50 },
      "value": { "type": ["string", "number", "boolean"] },
      "isExclusive": { "type": "boolean" },
      "order": { "type": "integer" }
    }
  }
}
```

### 5.2 Visibility Condition Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["field", "operator", "value"],
  "properties": {
    "field": { "type": "string", "description": "Question ID reference" },
    "operator": {
      "type": "string",
      "enum": ["eq", "ne", "gt", "lt", "gte", "lte", "in", "not_in", "contains", "not_contains", "is_empty", "is_not_empty"]
    },
    "value": {},
    "logicalOp": { "type": "string", "enum": ["AND", "OR"] },
    "nested": {
      "type": "array",
      "items": { "$ref": "#" }
    }
  }
}
```

### 5.3 Response Value Schema (by type)
```json
{
  "TEXT": { "text": "string" },
  "NUMBER": { "number": "number" },
  "SINGLE_CHOICE": { "selectedOptionId": "uuid" },
  "MULTIPLE_CHOICE": { "selectedOptionIds": ["uuid"] },
  "SCALE": { "rating": "integer", "min": 1, "max": 10 },
  "DATE": { "date": "date", "includeTime": "boolean" },
  "FILE_UPLOAD": {
    "fileUrl": "url",
    "fileName": "string",
    "fileSize": "integer",
    "mimeType": "string"
  },
  "MATRIX": {
    "rows": { "rowId": "optionId" }
  }
}
```

---

## 6. Database Indexes Strategy

### 6.1 Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_sessions_user_status ON sessions(user_id, status);
CREATE INDEX idx_responses_session_answered ON responses(session_id, answered_at);
CREATE INDEX idx_documents_session_status ON documents(session_id, status);

-- Partial indexes for active records
CREATE INDEX idx_sessions_active ON sessions(user_id, started_at)
    WHERE status = 'IN_PROGRESS';
CREATE INDEX idx_documents_pending_review ON documents(created_at)
    WHERE status = 'PENDING_REVIEW';

-- Full-text search on questions
CREATE INDEX idx_questions_text_search ON questions
    USING GIN(to_tsvector('english', text || ' ' || COALESCE(help_text, '')));
```

### 6.2 JSONB Indexes
```sql
-- GIN indexes for JSONB queries
CREATE INDEX idx_questions_options ON questions USING GIN(options);
CREATE INDEX idx_responses_value ON responses USING GIN(value);
CREATE INDEX idx_sessions_progress ON sessions USING GIN(progress);

-- Specific JSONB path indexes
CREATE INDEX idx_users_profile_name ON users((profile->>'name'));
CREATE INDEX idx_sessions_progress_pct ON sessions(((progress->>'percentage')::int));
```

---

## 7. Data Migration Strategy

### 7.1 Migration Framework
- Tool: Prisma Migrate or node-pg-migrate
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Reversibility: All migrations must have rollback scripts
- Testing: Migrations tested in staging before production

### 7.2 Migration Example
```sql
-- Migration: 20250115120000_add_session_analytics.sql

-- Up
ALTER TABLE sessions ADD COLUMN analytics JSONB DEFAULT '{}';
CREATE INDEX idx_sessions_analytics ON sessions USING GIN(analytics);

-- Down
DROP INDEX IF EXISTS idx_sessions_analytics;
ALTER TABLE sessions DROP COLUMN IF EXISTS analytics;
```

### 7.3 Data Seeding
```sql
-- Seed default document types
INSERT INTO document_types (name, slug, category, template_path) VALUES
    ('Technology Roadmap', 'technology-roadmap', 'CTO', '/templates/cto/roadmap.hbs'),
    ('Technology Strategy', 'technology-strategy', 'CTO', '/templates/cto/strategy.hbs'),
    ('Product Architecture', 'product-architecture', 'CTO', '/templates/cto/architecture.hbs'),
    -- ... all 25 document types
    ('Business Plan', 'business-plan', 'CFO', '/templates/cfo/business-plan.hbs'),
    ('Business Requirements Document', 'brd', 'BA', '/templates/ba/brd.hbs');
```

---

## 8. Backup and Recovery

### 8.1 Backup Strategy

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full Backup | Daily | 30 days | S3 Glacier |
| Incremental | Hourly | 7 days | S3 Standard |
| WAL Archive | Continuous | 7 days | S3 Standard |
| Point-in-Time | On-demand | 24 hours | RDS Snapshots |

### 8.2 Recovery Procedures
1. **Point-in-Time Recovery (PITR):** Available for any time in last 7 days
2. **Full Restore:** From daily backup, RTO < 4 hours
3. **Table-Level Recovery:** Using pg_restore with specific tables
4. **Cross-Region Recovery:** From replicated backups in DR region

---

## 9. Performance Optimization

### 9.1 Query Optimization Guidelines
- Use EXPLAIN ANALYZE for all new queries
- Limit result sets with pagination
- Use connection pooling (PgBouncer)
- Batch inserts for responses
- Use read replicas for reporting queries

### 9.2 Caching Strategy

| Data | Cache Type | TTL | Invalidation |
|------|------------|-----|--------------|
| Questionnaire structure | Redis | 1 hour | On update |
| User session | Redis | 24 hours | On logout |
| Question visibility | App memory | 5 min | On rule change |
| Document metadata | Redis | 30 min | On generation |

### 9.3 Connection Pooling
```
PgBouncer Configuration:
- pool_mode: transaction
- max_client_conn: 1000
- default_pool_size: 20
- reserve_pool_size: 5
```

---

## 10. Data Retention and Archival

### 10.1 Retention Policies

| Data Type | Active Retention | Archive | Deletion |
|-----------|------------------|---------|----------|
| User accounts | Indefinite | N/A | On request |
| Sessions | 2 years | 5 years | After 7 years |
| Responses | 2 years | 5 years | After 7 years |
| Documents | 2 years | Indefinite | Never |
| Audit logs | 1 year | 7 years | After 7 years |
| API logs | 90 days | N/A | After 90 days |

### 10.2 Archival Process
```sql
-- Archive completed sessions older than 2 years
INSERT INTO sessions_archive
SELECT * FROM sessions
WHERE completed_at < NOW() - INTERVAL '2 years'
  AND status = 'COMPLETED';

DELETE FROM sessions
WHERE completed_at < NOW() - INTERVAL '2 years'
  AND status = 'COMPLETED';
```

---

## 11. Related Documents

- [Product Architecture Document](./03-product-architecture.md)
- [API Documentation](./04-api-documentation.md)
- [Data Protection/Privacy Policy](./10-data-protection-privacy-policy.md)
- [Disaster Recovery Plan](./11-disaster-recovery-business-continuity.md)

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | {{CTO_NAME}} | | |
| Database Architect | {{DBA_NAME}} | | |
| Security Officer | {{CISO_NAME}} | | |
