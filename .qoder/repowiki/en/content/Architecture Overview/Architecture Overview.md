# Architecture Overview

<cite>
**Referenced Files in This Document**
- [apps/api/src/main.ts](file://apps/api/src/main.ts)
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts)
- [apps/api/src/modules/auth/auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts)
- [apps/api/src/modules/session/session.module.ts](file://apps/api/src/modules/session/session.module.ts)
- [apps/api/src/modules/adaptive-logic/adaptive-logic.module.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.module.ts)
- [apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts)
- [apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts)
- [apps/api/src/modules/session/session.service.ts](file://apps/api/src/modules/session/session.service.ts)
- [apps/api/src/modules/questionnaire/questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts)
- [apps/api/src/modules/standards/standards.module.ts](file://apps/api/src/modules/standards/standards.module.ts)
- [apps/api/src/modules/standards/standards.service.ts](file://apps/api/src/modules/standards/standards.service.ts)
- [libs/database/src/prisma.module.ts](file://libs/database/src/prisma.module.ts)
- [libs/redis/src/redis.module.ts](file://libs/redis/src/redis.module.ts)
- [libs/shared/src/index.ts](file://libs/shared/src/index.ts)
- [docker/api/Dockerfile](file://docker/api/Dockerfile)
- [docker/postgres/init.sql](file://docker/postgres/init.sql)
- [infrastructure/terraform/main.tf](file://infrastructure/terraform/main.tf)
- [infrastructure/terraform/providers.tf](file://infrastructure/terraform/providers.tf)
- [infrastructure/terraform/backend.tf](file://infrastructure/terraform/backend.tf)
- [infrastructure/terraform/variables.tf](file://infrastructure/terraform/variables.tf)
- [infrastructure/terraform/modules/database/main.tf](file://infrastructure/terraform/modules/database/main.tf)
- [infrastructure/terraform/modules/container-apps/main.tf](file://infrastructure/terraform/modules/container-apps/main.tf)
- [infrastructure/terraform/modules/cache/main.tf](file://infrastructure/terraform/modules/cache/main.tf)
- [infrastructure/terraform/modules/networking/main.tf](file://infrastructure/terraform/modules/networking/main.tf)
- [infrastructure/terraform/modules/monitoring/main.tf](file://infrastructure/terraform/modules/monitoring/main.tf)
- [prisma/schema.prisma](file://prisma/schema.prisma)
- [prisma/seed.ts](file://prisma/seed.ts)
- [scripts/deploy.sh](file://scripts/deploy.sh)
- [scripts/setup-azure.sh](file://scripts/setup-azure.sh)
- [package.json](file://package.json)
- [turbo.json](file://turbo.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document presents the architecture of the Quiz-to-build system, a NestJS-based monorepo designed to deliver an adaptive client questionnaire platform. The system emphasizes modular design, layered architecture, and robust cross-cutting concerns such as authentication, validation, caching, and observability. It supports dynamic visibility and branching of questions based on user responses, integrates standards mapping for engineering compliance, and provides scalable infrastructure via containerization and Terraform.

## Project Structure
The repository follows a classic NestJS monorepo layout:
- apps/api: The primary NestJS application containing feature modules, controllers, services, guards, strategies, DTOs, and configuration.
- libs: Shared libraries for database (Prisma), caching (Redis), and common DTOs.
- prisma: Database schema and seeding logic.
- infrastructure/terraform: Infrastructure-as-code for cloud resources.
- docker: Container configurations for the API and database initialization.
- docs: Business and technical documentation supporting the product.
- scripts: Deployment and environment setup helpers.

```mermaid
graph TB
subgraph "Apps"
API["apps/api"]
end
subgraph "Libs"
DB["@libs/database"]
REDIS["@libs/redis"]
SHARED["@libs/shared"]
end
subgraph "Root"
PRISMA["prisma"]
DOCKER["docker"]
INFRA["infrastructure/terraform"]
SCRIPTS["scripts"]
end
API --> DB
API --> REDIS
API --> SHARED
API -. uses .-> PRISMA
DOCKER --> API
INFRA --> API
SCRIPTS --> INFRA
```

**Diagram sources**
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L1-L67)
- [libs/database/src/prisma.module.ts](file://libs/database/src/prisma.module.ts#L1-L10)
- [libs/redis/src/redis.module.ts](file://libs/redis/src/redis.module.ts#L1-L10)
- [libs/shared/src/index.ts](file://libs/shared/src/index.ts#L1-L3)

**Section sources**
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L1-L67)
- [turbo.json](file://turbo.json)

## Core Components
- Application bootstrap and middleware pipeline:
  - Helmet-based security headers, CORS configuration, global prefix, validation pipe, global exception filter, and interceptors are configured at startup.
  - Swagger documentation is enabled in non-production environments.
- Central AppModule aggregates:
  - Configuration module with environment loading.
  - Rate limiting guard registration.
  - Database and Redis modules.
  - Feature modules: Auth, Users, Questionnaire, Session, Adaptive Logic, and Standards.
- Cross-cutting concerns:
  - Global ValidationPipe enforces DTO sanitation and transformation.
  - Global HttpExceptionFilter centralizes error responses.
  - Logging and Transform interceptors standardize request logging and response shaping.

Key implementation references:
- Bootstrap and middleware: [apps/api/src/main.ts](file://apps/api/src/main.ts#L11-L86)
- Root module composition: [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L16-L64)

**Section sources**
- [apps/api/src/main.ts](file://apps/api/src/main.ts#L11-L86)
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L16-L64)

## Architecture Overview
The system employs a layered architecture:
- Presentation layer: Controllers expose REST endpoints.
- Application layer: Services orchestrate business logic and coordinate between modules.
- Domain and persistence layer: Prisma service abstracts database operations; Redis service provides caching.
- Cross-cutting services: Auth guards and strategies, DTO validation, logging, and response transformation.

```mermaid
graph TB
Client["Client"]
CtrlAuth["AuthController"]
CtrlUsers["UsersController"]
CtrlQuest["QuestionnaireController"]
CtrlSession["SessionController"]
CtrlStandards["StandardsController"]
SvcAuth["AuthService"]
SvcUsers["UsersService"]
SvcQuest["QuestionnaireService"]
SvcSession["SessionService"]
SvcAdaptive["AdaptiveLogicService"]
SvcStandards["StandardsService"]
DB["PrismaService"]
Cache["RedisService"]
Client --> CtrlAuth
Client --> CtrlUsers
Client --> CtrlQuest
Client --> CtrlSession
Client --> CtrlStandards
CtrlAuth --> SvcAuth
CtrlUsers --> SvcUsers
CtrlQuest --> SvcQuest
CtrlSession --> SvcSession
CtrlStandards --> SvcStandards
SvcSession --> SvcAdaptive
SvcSession --> SvcQuest
SvcAdaptive --> DB
SvcQuest --> DB
SvcSession --> DB
SvcStandards --> DB
SvcSession --> Cache
```

**Diagram sources**
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L1-L67)
- [apps/api/src/modules/session/session.service.ts](file://apps/api/src/modules/session/session.service.ts#L87-L94)
- [apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L19-L26)
- [libs/database/src/prisma.module.ts](file://libs/database/src/prisma.module.ts#L1-L10)
- [libs/redis/src/redis.module.ts](file://libs/redis/src/redis.module.ts#L1-L10)

## Detailed Component Analysis

### Authentication and Authorization Module
- Composition:
  - Passport strategy registration and JWT module configuration.
  - Guards: JWT auth guard and role-based guard.
  - Strategies: JWT strategy for token verification.
- Design pattern: Strategy pattern is used for JWT authentication, enabling pluggable authentication mechanisms.
- Integration:
  - Guards enforce protected routes.
  - Services encapsulate token issuance and user validation.

```mermaid
classDiagram
class AuthModule {
+imports
+controllers
+providers
+exports
}
class AuthService {
+validateUser()
+login()
+refreshToken()
}
class JwtStrategy {
+validate()
}
class JwtAuthGuard
class RolesGuard
AuthModule --> AuthService : "provides"
AuthModule --> JwtStrategy : "provides"
AuthModule --> JwtAuthGuard : "provides"
AuthModule --> RolesGuard : "provides"
```

**Diagram sources**
- [apps/api/src/modules/auth/auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts#L11-L28)

**Section sources**
- [apps/api/src/modules/auth/auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts#L1-L30)

### Adaptive Logic Module
- Purpose: Compute visibility, branching, and required state of questions based on user responses.
- Core components:
  - AdaptiveLogicService orchestrates evaluation and interacts with Prisma for rule retrieval.
  - ConditionEvaluator implements a Strategy-like evaluation engine for rule conditions.
- Patterns:
  - Strategy pattern: ConditionEvaluator encapsulates operator evaluation strategies.
  - Service Layer pattern: AdaptiveLogicService coordinates domain logic.
  - Repository pattern: PrismaService abstracts persistence.

```mermaid
classDiagram
class AdaptiveLogicService {
+getVisibleQuestions()
+evaluateQuestionState()
+getNextQuestion()
+evaluateCondition()
+evaluateConditions()
+calculateAdaptiveChanges()
+getRulesForQuestion()
+buildDependencyGraph()
}
class ConditionEvaluator {
+evaluate()
-evaluateNested()
-evaluateOperator()
-equals()
-includes()
-isIn()
-greaterThan()
-lessThan()
-greaterThanOrEqual()
-lessThanOrEqual()
-between()
-isEmpty()
-startsWith()
-endsWith()
-matches()
}
AdaptiveLogicService --> ConditionEvaluator : "uses"
```

**Diagram sources**
- [apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L19-L306)
- [apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts#L4-L401)

**Section sources**
- [apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L19-L306)
- [apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts#L4-L401)

### Session Management Module
- Responsibilities:
  - Create, continue, and complete user sessions.
  - Retrieve next questions respecting visibility rules.
  - Validate responses and compute progress.
  - Integrate with AdaptiveLogicService for dynamic question flow.
- Patterns:
  - Service Layer pattern: SessionService encapsulates session lifecycle and business rules.
  - Repository pattern: PrismaService persists sessions, responses, and related entities.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Controller as "SessionController"
participant Service as "SessionService"
participant Logic as "AdaptiveLogicService"
participant DB as "PrismaService"
Client->>Controller : "GET /sessions/ : id/next"
Controller->>Service : "getNextQuestion(sessionId, userId, count)"
Service->>DB : "find responses for sessionId"
DB-->>Service : "responses"
Service->>Logic : "getVisibleQuestions(questionnaireId, responses)"
Logic->>DB : "fetch visibility rules"
DB-->>Logic : "rules"
Logic-->>Service : "visible questions"
Service->>Service : "select next N unanswered"
Service-->>Controller : "NextQuestionResponse"
Controller-->>Client : "200 OK"
```

**Diagram sources**
- [apps/api/src/modules/session/session.service.ts](file://apps/api/src/modules/session/session.service.ts#L198-L268)
- [apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L31-L66)

**Section sources**
- [apps/api/src/modules/session/session.service.ts](file://apps/api/src/modules/session/session.service.ts#L87-L684)

### Questionnaire Management Module
- Responsibilities:
  - List, fetch, and map questionnaire structures with sections and questions.
  - Provide question metadata and validation rules.
- Patterns:
  - Service Layer pattern: QuestionnaireService exposes domain operations.
  - Repository pattern: PrismaService handles queries.

```mermaid
flowchart TD
Start(["Get Questionnaire Details"]) --> Fetch["Fetch Questionnaire with Sections"]
Fetch --> Map["Map to QuestionnaireDetail DTO"]
Map --> Return["Return DTO"]
```

**Diagram sources**
- [apps/api/src/modules/questionnaire/questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L100-L123)

**Section sources**
- [apps/api/src/modules/questionnaire/questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L63-L253)

### Standards Management Module
- Responsibilities:
  - Retrieve engineering standards and category-specific mappings.
  - Generate standardized sections for documents based on mappings.
- Patterns:
  - Service Layer pattern: StandardsService encapsulates mapping and generation logic.
  - Repository pattern: PrismaService retrieves standards and mappings.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Controller as "StandardsController"
participant Service as "StandardsService"
participant DB as "PrismaService"
Client->>Controller : "GET /standards/ : category"
Controller->>Service : "findByCategory(category)"
Service->>DB : "find standard by category"
DB-->>Service : "standard"
Service-->>Controller : "StandardResponse"
Controller-->>Client : "200 OK"
```

**Diagram sources**
- [apps/api/src/modules/standards/standards.service.ts](file://apps/api/src/modules/standards/standards.service.ts#L25-L35)

**Section sources**
- [apps/api/src/modules/standards/standards.service.ts](file://apps/api/src/modules/standards/standards.service.ts#L12-L197)

### Data Persistence and Caching
- Database: PrismaModule provides a globally scoped PrismaService for database operations.
- Cache: RedisModule provides a globally scoped RedisService for caching and session-related operations.

```mermaid
graph LR
AppModule["AppModule"]
PrismaModule["PrismaModule"]
RedisModule["RedisModule"]
PrismaService["PrismaService"]
RedisService["RedisService"]
AppModule --> PrismaModule
AppModule --> RedisModule
PrismaModule --> PrismaService
RedisModule --> RedisService
```

**Diagram sources**
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L44-L48)
- [libs/database/src/prisma.module.ts](file://libs/database/src/prisma.module.ts#L1-L10)
- [libs/redis/src/redis.module.ts](file://libs/redis/src/redis.module.ts#L1-L10)

**Section sources**
- [libs/database/src/prisma.module.ts](file://libs/database/src/prisma.module.ts#L1-L10)
- [libs/redis/src/redis.module.ts](file://libs/redis/src/redis.module.ts#L1-L10)

## Dependency Analysis
- Module dependencies:
  - AppModule composes feature modules and shared modules.
  - SessionModule imports QuestionnaireModule and forward-ref imports AdaptiveLogicModule to avoid circular dependencies.
  - AdaptiveLogicModule imports SessionModule via forwardRef to access session context during evaluation.
  - StandardsModule depends on PrismaModule for persistence.
- External dependencies:
  - NestJS ecosystem: Config, Throttler, JWT, Passport, Swagger.
  - Prisma for ORM and migrations.
  - Redis for caching.
  - Helmet for security headers.
  - Turborepo for monorepo task orchestration.

```mermaid
graph TB
AppModule["AppModule"]
AuthModule["AuthModule"]
UsersModule["UsersModule"]
QuestionnaireModule["QuestionnaireModule"]
SessionModule["SessionModule"]
AdaptiveLogicModule["AdaptiveLogicModule"]
StandardsModule["StandardsModule"]
PrismaModule["PrismaModule"]
RedisModule["RedisModule"]
AppModule --> AuthModule
AppModule --> UsersModule
AppModule --> QuestionnaireModule
AppModule --> SessionModule
AppModule --> AdaptiveLogicModule
AppModule --> StandardsModule
AppModule --> PrismaModule
AppModule --> RedisModule
SessionModule --> QuestionnaireModule
SessionModule --> AdaptiveLogicModule
AdaptiveLogicModule --> SessionModule
StandardsModule --> PrismaModule
```

**Diagram sources**
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L50-L56)
- [apps/api/src/modules/session/session.module.ts](file://apps/api/src/modules/session/session.module.ts#L7-L11)
- [apps/api/src/modules/adaptive-logic/adaptive-logic.module.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.module.ts#L6-L10)
- [apps/api/src/modules/standards/standards.module.ts](file://apps/api/src/modules/standards/standards.module.ts#L6-L10)

**Section sources**
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L1-L67)
- [apps/api/src/modules/session/session.module.ts](file://apps/api/src/modules/session/session.module.ts#L1-L17)
- [apps/api/src/modules/adaptive-logic/adaptive-logic.module.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.module.ts#L1-L12)
- [apps/api/src/modules/standards/standards.module.ts](file://apps/api/src/modules/standards/standards.module.ts#L1-L13)

## Performance Considerations
- Caching:
  - Use RedisService for frequently accessed data (e.g., user sessions, questionnaire metadata) to reduce database load.
- Database optimization:
  - Leverage Prisma’s query batching and selective includes to minimize payload sizes.
  - Index frequently queried fields (e.g., questionnaireId, sectionId, userId).
- Request processing:
  - ValidationPipe with transformation reduces downstream type coercion overhead.
  - Global throttling prevents abuse and stabilizes throughput under load.
- Observability:
  - Enable structured logging and metrics collection in production deployments.
- Scalability:
  - Stateless API design enables horizontal scaling behind a load balancer.
  - Use connection pooling and async/await patterns to maximize concurrency.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Common issues and mitigations:
  - Authentication failures: Verify JWT secret configuration and token expiration settings.
  - Validation errors: Review DTO validation rules and ensure client payloads conform to schemas.
  - Session access denied: Confirm session ownership checks and user identity propagation.
  - Database connectivity: Check Prisma connection strings and migration status.
  - Cache misses: Validate Redis availability and TTL settings.
- Monitoring and diagnostics:
  - Use Swagger documentation for endpoint testing in development.
  - Inspect logs for global interceptor outputs and exception filter messages.
  - Track rate-limiting triggers and adjust thresholds as needed.

**Section sources**
- [apps/api/src/main.ts](file://apps/api/src/main.ts#L34-L49)
- [apps/api/src/modules/session/session.service.ts](file://apps/api/src/modules/session/session.service.ts#L548-L565)

## Conclusion
The Quiz-to-build system demonstrates a well-structured, modular NestJS architecture with clear separation of concerns. By leveraging the Service Layer, Repository, Strategy, and forward-ref patterns, the system achieves maintainability, testability, and extensibility. The integration of Prisma and Redis, combined with robust security and validation layers, provides a solid foundation for adaptive questionnaire delivery and standards-driven content generation.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### System Context Diagram
This diagram shows how authentication, questionnaire management, session handling, and adaptive logic modules interact within the API boundary and with external systems.

```mermaid
graph TB
subgraph "External"
Browser["Web/Mobile Client"]
AdminPortal["Admin Portal"]
end
subgraph "API Boundary"
Auth["Auth Module"]
Users["Users Module"]
Quest["Questionnaire Module"]
Session["Session Module"]
Logic["Adaptive Logic Module"]
Standards["Standards Module"]
end
subgraph "Infrastructure"
Postgres["PostgreSQL"]
Redis["Redis"]
end
Browser --> Auth
Browser --> Session
Browser --> Quest
Browser --> Standards
Auth --> Users
Session --> Quest
Session --> Logic
Logic --> Postgres
Quest --> Postgres
Session --> Postgres
Session --> Redis
Standards --> Postgres
AdminPortal --> Auth
AdminPortal --> Users
AdminPortal --> Quest
AdminPortal --> Standards
```

**Diagram sources**
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L1-L67)
- [apps/api/src/modules/session/session.service.ts](file://apps/api/src/modules/session/session.service.ts#L87-L94)
- [apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L19-L26)
- [libs/database/src/prisma.module.ts](file://libs/database/src/prisma.module.ts#L1-L10)
- [libs/redis/src/redis.module.ts](file://libs/redis/src/redis.module.ts#L1-L10)

### Technology Stack and Dependencies
- Backend framework: NestJS
- Database ORM: Prisma
- Caching: Redis
- Authentication: JWT via Passport
- Validation: Class-validator through NestJS ValidationPipe
- Security: Helmet
- Documentation: Swagger
- Orchestration: Turborepo
- Infrastructure: Terraform (Azure)
- Packaging: Docker

**Section sources**
- [apps/api/src/main.ts](file://apps/api/src/main.ts#L4-L9)
- [apps/api/src/app.module.ts](file://apps/api/src/app.module.ts#L1-L67)
- [package.json](file://package.json)

### Infrastructure and Deployment Topology
- Containerization:
  - API service built from docker/api/Dockerfile.
  - PostgreSQL initialized via docker/postgres/init.sql.
- Cloud infrastructure:
  - Terraform modules define database, container apps, cache, networking, monitoring, and registry resources.
  - Providers and backend configured in providers.tf and backend.tf.
- Deployment:
  - scripts/deploy.sh and scripts/setup-azure.sh automate provisioning and deployment steps.

```mermaid
graph TB
subgraph "Local Dev"
Dockerfile["Dockerfile"]
InitSQL["init.sql"]
end
subgraph "Cloud"
TFMain["Terraform main.tf"]
TFProviders["providers.tf"]
TFBackend["backend.tf"]
TFVars["variables.tf"]
DBMod["database/main.tf"]
CAzure["container-apps/main.tf"]
CacheMod["cache/main.tf"]
NetMod["networking/main.tf"]
MonMod["monitoring/main.tf"]
end
Dockerfile --> TFMain
InitSQL --> TFMain
TFMain --> DBMod
TFMain --> CAzure
TFMain --> CacheMod
TFMain --> NetMod
TFMain --> MonMod
TFProviders --> TFMain
TFBackend --> TFMain
TFVars --> TFMain
```

**Diagram sources**
- [docker/api/Dockerfile](file://docker/api/Dockerfile)
- [docker/postgres/init.sql](file://docker/postgres/init.sql)
- [infrastructure/terraform/main.tf](file://infrastructure/terraform/main.tf)
- [infrastructure/terraform/providers.tf](file://infrastructure/terraform/providers.tf)
- [infrastructure/terraform/backend.tf](file://infrastructure/terraform/backend.tf)
- [infrastructure/terraform/variables.tf](file://infrastructure/terraform/variables.tf)
- [infrastructure/terraform/modules/database/main.tf](file://infrastructure/terraform/modules/database/main.tf)
- [infrastructure/terraform/modules/container-apps/main.tf](file://infrastructure/terraform/modules/container-apps/main.tf)
- [infrastructure/terraform/modules/cache/main.tf](file://infrastructure/terraform/modules/cache/main.tf)
- [infrastructure/terraform/modules/networking/main.tf](file://infrastructure/terraform/modules/networking/main.tf)
- [infrastructure/terraform/modules/monitoring/main.tf](file://infrastructure/terraform/modules/monitoring/main.tf)

**Section sources**
- [docker/api/Dockerfile](file://docker/api/Dockerfile)
- [docker/postgres/init.sql](file://docker/postgres/init.sql)
- [infrastructure/terraform/main.tf](file://infrastructure/terraform/main.tf)
- [infrastructure/terraform/providers.tf](file://infrastructure/terraform/providers.tf)
- [infrastructure/terraform/backend.tf](file://infrastructure/terraform/backend.tf)
- [infrastructure/terraform/variables.tf](file://infrastructure/terraform/variables.tf)
- [scripts/deploy.sh](file://scripts/deploy.sh)
- [scripts/setup-azure.sh](file://scripts/setup-azure.sh)

### Data Model Overview
The Prisma schema defines entities for questionnaires, sections, questions, visibility rules, sessions, responses, and standards. The schema supports adaptive branching, progress tracking, and standards mapping.

```mermaid
erDiagram
QUESTIONNAIRE {
string id PK
string name
string description
string industry
number version
boolean isDefault
boolean isActive
datetime createdAt
datetime updatedAt
}
SECTION {
string id PK
string questionnaireId FK
string name
number orderIndex
boolean isActive
}
QUESTION {
string id PK
string sectionId FK
string text
string type
boolean isRequired
json options
json validationRules
number orderIndex
boolean isActive
}
VISIBILITY_RULE {
string id PK
string questionId FK
string targetQuestionIds
json condition
string action
number priority
boolean isActive
}
SESSION {
string id PK
string userId
string questionnaireId FK
number questionnaireVersion
string industry
string status
json progress
string currentSectionId
string currentQuestionId
json adaptiveState
datetime startedAt
datetime lastActivityAt
datetime completedAt
}
RESPONSE {
string id PK
string sessionId FK
string questionId FK
json value
boolean isValid
json validationErrors
number revision
datetime answeredAt
number timeSpentSeconds
}
ENGINEERING_STANDARD {
string id PK
string category
string title
string description
json principles
number version
boolean isActive
}
QUESTIONNAIRE ||--o{ SECTION : "has"
SECTION ||--o{ QUESTION : "has"
QUESTION ||--o{ VISIBILITY_RULE : "targets"
SESSION ||--o{ RESPONSE : "contains"
QUESTION ||--o{ RESPONSE : "answered"
```

**Diagram sources**
- [prisma/schema.prisma](file://prisma/schema.prisma)

**Section sources**
- [prisma/schema.prisma](file://prisma/schema.prisma)
- [prisma/seed.ts](file://prisma/seed.ts)