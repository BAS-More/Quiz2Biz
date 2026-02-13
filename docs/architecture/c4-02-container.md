```mermaid
---
title: C4 Level 2 - Container Diagram - Quiz-to-Build System
---
graph TB
    subgraph Users
        BA[Business Analyst<br/>Completes assessments]
        CON[Consultant<br/>Reviews and advises]
        ADM[Administrator<br/>Manages system]
    end

    subgraph Quiz-to-Build System
        subgraph Frontend Container
            SPA[Single Page Application<br/>React/Next.js<br/>User interface for assessments]
        end

        subgraph API Container
            API[API Application<br/>NestJS<br/>Business logic, REST API]
        end

        subgraph Database Container
            DB[(PostgreSQL<br/>Stores users, questions,<br/>sessions, scores)]
        end

        subgraph Cache Container
            REDIS[(Redis<br/>Session cache,<br/>rate limiting)]
        end

        subgraph Background Jobs
            WORKER[Background Worker<br/>NestJS<br/>Document generation,<br/>async processing]
        end
    end

    subgraph External Systems
        KEYVAULT[Azure Key Vault<br/>Secrets management]
        BLOB[Azure Blob Storage<br/>Document storage]
        EMAIL[Email Service<br/>SendGrid<br/>Notifications]
        MONITOR[Azure Monitor<br/>Logging, metrics]
    end

    BA --> SPA
    CON --> SPA
    ADM --> SPA

    SPA --> API
    API --> DB
    API --> REDIS
    API --> WORKER
    WORKER --> DB
    WORKER --> BLOB

    API --> KEYVAULT
    API --> EMAIL
    API --> MONITOR
    WORKER --> MONITOR
```

## Container Descriptions

| Container | Technology | Purpose |
|-----------|------------|---------|
| Single Page Application | React/Next.js | Interactive assessment UI, dashboards, reports |
| API Application | NestJS (Node.js) | Core business logic, REST API endpoints |
| PostgreSQL Database | PostgreSQL 15 | Primary data store for all application data |
| Redis Cache | Redis 7 | Session management, rate limiting, caching |
| Background Worker | NestJS | Async document generation, email notifications |
| Azure Key Vault | Azure PaaS | Secure secrets and key management |
| Azure Blob Storage | Azure PaaS | Generated document storage |
| Email Service | SendGrid | Transactional email delivery |
| Azure Monitor | Azure PaaS | Centralized logging and monitoring |

## Communication Patterns

| From | To | Protocol | Description |
|------|-----|----------|-------------|
| SPA | API | HTTPS/REST | User requests, authentication |
| API | PostgreSQL | TCP/TLS | Data persistence queries |
| API | Redis | TCP | Session storage, cache operations |
| API | Worker | Event Queue | Async job dispatch |
| Worker | Blob Storage | HTTPS | Document upload/retrieval |
| API | Key Vault | HTTPS | Secret retrieval |
| API | SendGrid | HTTPS | Email dispatch |
