# ADR-005: Database Technology Selection

## Status
Accepted

## Date
2026-01-28

## Context
Quiz-to-Build requires persistent storage for user data, questionnaire content, assessment sessions, scoring results, and generated documents. The database choice must support the application's data model and operational requirements.

### Requirements
- Relational data with complex relationships (users, organizations, sessions, questions)
- ACID transactions for scoring calculations
- JSON/JSONB support for flexible schema (question metadata, answers)
- Full-text search capability (question bank)
- Scalability for growing data volumes
- Managed service option for reduced operations
- Cost-effective for startup phase

### Data Model Characteristics
- **Structured**: Users, Organizations, Sessions, Scores
- **Semi-structured**: Question metadata, answer payloads, evidence attachments
- **Relational**: Many-to-many (questions ↔ dimensions ↔ standards)
- **Time-series**: Session history, score trends

### Options Considered

#### Option 1: PostgreSQL
- **Pros**: ACID, JSONB, full-text search, mature ecosystem, Prisma support
- **Cons**: Manual scaling, operational overhead (if self-managed)

#### Option 2: MongoDB
- **Pros**: Flexible schema, horizontal scaling, document model
- **Cons**: Weaker transactions, no native relational integrity, Prisma limited support

#### Option 3: MySQL/MariaDB
- **Pros**: Mature, wide support, good performance
- **Cons**: Weaker JSON support, fewer advanced features than PostgreSQL

#### Option 4: Azure Cosmos DB
- **Pros**: Global distribution, multiple APIs, managed scaling
- **Cons**: Cost, proprietary query language, overkill for current scale

## Decision
**We will use PostgreSQL** deployed as Azure Database for PostgreSQL Flexible Server:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE ARCHITECTURE                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Azure PostgreSQL Flexible Server            ││
│  │                                                          ││
│  │  ┌──────────────────────────────────────────────────┐   ││
│  │  │                   quiz_to_build                   │   ││
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   ││
│  │  │  │  public  │ │ scoring  │ │    auth          │  │   ││
│  │  │  │ (shared) │ │ (scores) │ │  (users/orgs)    │  │   ││
│  │  │  └──────────┘ └──────────┘ └──────────────────┘  │   ││
│  │  └──────────────────────────────────────────────────┘   ││
│  │                                                          ││
│  │  Features: JSONB, Full-Text Search, Row-Level Security  ││
│  └─────────────────────────────────────────────────────────┘│
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    ORM Layer (Prisma)                    ││
│  │  - Type-safe queries                                     ││
│  │  - Migration management                                  ││
│  │  - Connection pooling                                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Schema Design

#### Core Tables
```sql
-- Users and Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  region VARCHAR(10) NOT NULL DEFAULT 'AU',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  roles TEXT[] DEFAULT ARRAY['USER'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questionnaire
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_key VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL,
  metadata JSONB DEFAULT '{}',
  -- Full-text search index
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', question_text)
  ) STORED
);

CREATE INDEX idx_questions_search ON questions USING GIN(search_vector);

-- Sessions and Answers
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'IN_PROGRESS',
  answers JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Scoring Results
CREATE TABLE scoring_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  dimension_key VARCHAR(50) NOT NULL,
  coverage DECIMAL(5,2),
  severity DECIMAL(5,2),
  residual DECIMAL(5,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### JSONB Usage
```typescript
// Flexible metadata without schema changes
interface QuestionMetadata {
  industry?: string[];
  difficulty?: number;
  bestPractice?: string;
  practicalExplainer?: string;
  standardRefs?: string[];
}

// Prisma model
model Question {
  id           String   @id @default(uuid())
  dimensionKey String   @map("dimension_key")
  questionText String   @map("question_text")
  metadata     Json     @default("{}")  // JSONB
}
```

### Performance Optimizations

#### Indexing Strategy
```sql
-- Primary access patterns
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_scoring_session ON scoring_results(session_id);
CREATE INDEX idx_questions_dimension ON questions(dimension_key);

-- JSONB indexes for common queries
CREATE INDEX idx_questions_industry ON questions 
  USING GIN ((metadata->'industry'));
```

#### Connection Pooling
```typescript
// Prisma with PgBouncer-compatible settings
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection limit for serverless/container environment
  connectionLimit = 10
}
```

### Backup & Recovery
- **Automated backups**: 7-day retention
- **Point-in-time restore**: Up to 5 minutes RPO
- **Geo-redundant backups**: Australia East ↔ Australia Southeast

### Migration Strategy
```bash
# Development
npx prisma migrate dev --name add_feature

# Production
npx prisma migrate deploy
```

## Consequences

### Positive
- Strong relational integrity for complex data model
- JSONB provides schema flexibility where needed
- Built-in full-text search (no external service)
- Prisma provides excellent TypeScript integration
- Mature ecosystem, extensive documentation
- Azure managed service reduces operations burden

### Negative
- Vertical scaling limits (mitigated by read replicas)
- JSONB queries can be slower than normalized data
- Learning curve for advanced PostgreSQL features

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Connection exhaustion | PgBouncer, connection pooling |
| Query performance degradation | Query analysis, proper indexing |
| Data growth | Partitioning for time-series data |
| Schema migrations | Prisma migrations with rollback plan |

## Compliance Mapping
- **ISO 27001**: A.12.3 (Information backup)
- **OWASP ASVS**: V13.1 (Generic database security)
- **Australian Privacy Principles**: APP 11 (Security of personal information)

## Related ADRs
- ADR-003: Data Residency (regional database deployment)
- ADR-004: Monolith vs Microservices (single database strategy)
