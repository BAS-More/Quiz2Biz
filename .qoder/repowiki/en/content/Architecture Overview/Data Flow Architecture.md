# Data Flow Architecture

<cite>
**Referenced Files in This Document**
- [main.ts](file://apps/api/src/main.ts)
- [app.module.ts](file://apps/api/src/app.module.ts)
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts)
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts)
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts)
- [session.controller.ts](file://apps/api/src/modules/session/session.controller.ts)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts)
- [questionnaire.controller.ts](file://apps/api/src/modules/questionnaire/questionnaire.controller.ts)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts)
- [prisma.module.ts](file://libs/database/src/prisma.module.ts)
- [redis.service.ts](file://libs/redis/src/redis.service.ts)
- [redis.module.ts](file://libs/redis/src/redis.module.ts)
- [schema.prisma](file://prisma/schema.prisma)
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

## Introduction
This document describes the end-to-end data flow architecture for the Quiz-to-build system. It covers how HTTP requests traverse the application via global interceptors and guards, how controllers delegate to services, how services interact with the database using Prisma ORM, and how Redis is used for session-related state and refresh tokens. It also explains request/response transformation, error handling via exception filters, and logging/metrics integration through interceptors.

## Project Structure
The application is organized as a NestJS monorepo with:
- An API application module that wires global pipes, filters, and interceptors
- Feature modules for authentication, questionnaires, sessions, and standards
- Shared libraries for database (Prisma) and cache (Redis)
- A Prisma schema defining the domain models and relationships

```mermaid
graph TB
subgraph "API Application"
MAIN["apps/api/src/main.ts"]
APPMOD["apps/api/src/app.module.ts"]
CTRL_AUTH["modules/auth/auth.controller.ts"]
CTRL_SESSION["modules/session/session.controller.ts"]
CTRL_QUESTION["modules/questionnaire/questionnaire.controller.ts"]
INT_LOG["common/interceptors/logging.interceptor.ts"]
INT_TR["common/interceptors/transform.interceptor.ts"]
FILT_EX["common/filters/http-exception.filter.ts"]
end
subgraph "Libraries"
PR_MOD["libs/database/src/prisma.module.ts"]
PR_SRV["libs/database/src/prisma.service.ts"]
RD_MOD["libs/redis/src/redis.module.ts"]
RD_SRV["libs/redis/src/redis.service.ts"]
end
SCHEMA["prisma/schema.prisma"]
MAIN --> APPMOD
APPMOD --> PR_MOD
APPMOD --> RD_MOD
APPMOD --> CTRL_AUTH
APPMOD --> CTRL_SESSION
APPMOD --> CTRL_QUESTION
CTRL_AUTH --> INT_LOG
CTRL_AUTH --> INT_TR
CTRL_SESSION --> INT_LOG
CTRL_SESSION --> INT_TR
CTRL_QUESTION --> INT_LOG
CTRL_QUESTION --> INT_TR
CTRL_AUTH --> FILT_EX
CTRL_SESSION --> FILT_EX
CTRL_QUESTION --> FILT_EX
CTRL_AUTH --> PR_SRV
CTRL_SESSION --> PR_SRV
CTRL_QUESTION --> PR_SRV
CTRL_AUTH --> RD_SRV
PR_SRV --> SCHEMA
RD_SRV --> RD_SRV
```

**Diagram sources**
- [main.ts](file://apps/api/src/main.ts#L11-L86)
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts#L16-L60)
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts#L21-L35)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L24-L73)
- [session.controller.ts](file://apps/api/src/modules/session/session.controller.ts#L30-L152)
- [questionnaire.controller.ts](file://apps/api/src/modules/questionnaire/questionnaire.controller.ts#L18-L55)
- [prisma.module.ts](file://libs/database/src/prisma.module.ts#L4-L9)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L8-L40)
- [redis.module.ts](file://libs/redis/src/redis.module.ts#L4-L9)
- [redis.service.ts](file://libs/redis/src/redis.service.ts#L10-L38)
- [schema.prisma](file://prisma/schema.prisma#L1-L12)

**Section sources**
- [main.ts](file://apps/api/src/main.ts#L11-L86)
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)

## Core Components
- Bootstrap and global middleware:
  - Helmet security headers, CORS, global prefix, validation pipe, global exception filter, and global interceptors are configured at startup.
- Interceptors:
  - Logging interceptor captures request metadata and timing; logs both successes and errors.
  - Transform interceptor wraps all successful responses into a standardized envelope with success flag, data, and optional metadata.
- Exception filter:
  - Centralized handler for all exceptions, normalizing error responses with code, message, and requestId.
- Modules and services:
  - Authentication service integrates JWT signing, bcrypt hashing, refresh token storage in Redis, and database persistence.
  - Session service orchestrates questionnaire sessions, adaptive logic evaluation, response validation, and progress computation.
  - Database and Redis modules provide PrismaClient and Redis client instances with lifecycle hooks.

**Section sources**
- [main.ts](file://apps/api/src/main.ts#L20-L49)
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts#L16-L60)
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts#L21-L35)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L34-L52)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L87-L94)

## Architecture Overview
The system follows a layered architecture:
- Transport layer: Express-based NestJS with global middleware and guards
- Presentation layer: Controllers expose endpoints and enforce auth guards
- Domain layer: Services encapsulate business logic and orchestration
- Persistence layer: Prisma ORM for PostgreSQL and Redis for ephemeral state

```mermaid
graph TB
Client["Client"]
Helmet["Helmet"]
CORS["CORS"]
Guard["JWT Guard"]
CtrlAuth["AuthController"]
CtrlSession["SessionController"]
CtrlQuest["QuestionnaireController"]
IntLog["LoggingInterceptor"]
IntTr["TransformInterceptor"]
ExFilt["HttpExceptionFilter"]
SvcAuth["AuthService"]
SvcSession["SessionService"]
SvcQuest["QuestionnaireService"]
Prisma["PrismaService"]
Redis["RedisService"]
DB["PostgreSQL"]
Cache["Redis"]
Client --> Helmet --> CORS --> Guard --> CtrlAuth
Client --> Helmet --> CORS --> Guard --> CtrlSession
Client --> Helmet --> CORS --> Guard --> CtrlQuest
CtrlAuth --> IntLog
CtrlAuth --> IntTr
CtrlSession --> IntLog
CtrlSession --> IntTr
CtrlQuest --> IntLog
CtrlQuest --> IntTr
CtrlAuth --> ExFilt
CtrlSession --> ExFilt
CtrlQuest --> ExFilt
CtrlAuth --> SvcAuth
CtrlSession --> SvcSession
CtrlQuest --> SvcQuest
SvcAuth --> Prisma
SvcSession --> Prisma
SvcQuest --> Prisma
SvcAuth --> Redis
Prisma --> DB
Redis --> Cache
```

**Diagram sources**
- [main.ts](file://apps/api/src/main.ts#L20-L49)
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L24-L73)
- [session.controller.ts](file://apps/api/src/modules/session/session.controller.ts#L30-L152)
- [questionnaire.controller.ts](file://apps/api/src/modules/questionnaire/questionnaire.controller.ts#L18-L55)
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts#L16-L60)
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts#L21-L35)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L42-L52)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L89-L94)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L8-L40)
- [redis.service.ts](file://libs/redis/src/redis.service.ts#L10-L38)

## Detailed Component Analysis

### Authentication Data Flow
This flow covers user registration, login, token refresh, logout, and protected profile retrieval.

```mermaid
sequenceDiagram
participant C as "Client"
participant G as "JWT Guard"
participant AC as "AuthController"
participant AS as "AuthService"
participant PR as "PrismaService"
participant RS as "RedisService"
C->>AC : POST /auth/register
AC->>AS : register(dto)
AS->>PR : findUnique(email)
PR-->>AS : user|null
AS->>PR : create(user)
AS->>RS : setex(refresh : <token>, userId, ttl)
AS-->>AC : TokenResponseDto
AC-->>C : 201 {success : true, data : ...}
C->>AC : POST /auth/login
AC->>AS : login({email, password, ip})
AS->>PR : findUnique(email)
PR-->>AS : user
AS->>PR : update(lastLoginAt, failedLoginAttempts=0)
AS->>RS : setex(refresh : <token>, userId, ttl)
AS-->>AC : TokenResponseDto
AC-->>C : 200 {success : true, data : ...}
C->>AC : POST /auth/refresh
AC->>AS : refresh(refreshToken)
AS->>RS : get(refresh : <token>)
RS-->>AS : userId|nil
AS->>PR : findUnique(userId)
PR-->>AS : user
AS-->>AC : {accessToken, expiresIn}
AC-->>C : 200 {success : true, data : ...}
C->>AC : POST /auth/logout
AC->>AS : logout(refreshToken)
AS->>RS : del(refresh : <token>)
AS-->>AC : void
AC-->>C : 200 {success : true, data : {message}}
C->>AC : GET /auth/me
AC->>G : JwtAuthGuard
G->>AS : validateUser(payload)
AS->>PR : findUnique(userId)
PR-->>AS : user
AS-->>G : AuthenticatedUser
G-->>AC : user
AC-->>C : 200 {success : true, data : user}
```

**Diagram sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L31-L72)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L54-L232)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L8-L40)
- [redis.service.ts](file://libs/redis/src/redis.service.ts#L40-L59)

**Section sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L27-L72)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L54-L232)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L20-L40)
- [redis.service.ts](file://libs/redis/src/redis.service.ts#L40-L59)

### Session Management Data Flow
This flow covers creating sessions, retrieving next questions, submitting responses, continuing sessions, and completing sessions.

```mermaid
sequenceDiagram
participant C as "Client"
participant G as "JWT Guard"
participant SC as "SessionController"
participant SS as "SessionService"
participant QS as "QuestionnaireService"
participant ALS as "AdaptiveLogicService"
participant PR as "PrismaService"
C->>SC : POST /sessions
SC->>SS : create(userId, dto)
SS->>QS : findById(dto.questionnaireId)
SS->>QS : getTotalQuestionCount(dto.questionnaireId)
SS->>PR : create(session)
SS-->>SC : SessionResponse
SC-->>C : 201 {success : true, data : ...}
C->>SC : GET /sessions/{id}/continue?questionCount=N
SC->>SS : continueSession(id, userId, N)
SS->>PR : findUnique(session)
SS->>PR : findMany(responses)
SS->>ALS : getVisibleQuestions(questionnaireId, responses)
SS->>PR : findUnique(currentSection)
SS->>PR : update(lastActivityAt)
SS-->>SC : ContinueSessionResponse
SC-->>C : 200 {success : true, data : ...}
C->>SC : POST /sessions/{id}/responses
SC->>SS : submitResponse(id, userId, dto)
SS->>QS : getQuestionById(dto.questionId)
SS->>PR : upsert(response)
SS->>PR : findMany(responses)
SS->>ALS : getVisibleQuestions(...)
SS->>PR : update(session.progress, currentQuestionId)
SS-->>SC : SubmitResponseResult
SC-->>C : 201 {success : true, data : ...}
C->>SC : POST /sessions/{id}/complete
SC->>SS : completeSession(id, userId)
SS->>PR : update(status=COMPLETED, completedAt)
SS-->>SC : SessionResponse
SC-->>C : 200 {success : true, data : ...}
```

**Diagram sources**
- [session.controller.ts](file://apps/api/src/modules/session/session.controller.ts#L39-L151)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L96-L546)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L8-L40)

**Section sources**
- [session.controller.ts](file://apps/api/src/modules/session/session.controller.ts#L36-L152)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L96-L546)

### Request/Response Transformation Pipeline
The transform interceptor wraps all successful responses into a consistent envelope. The logging interceptor records request metadata and timing. The exception filter ensures all errors are normalized.

```mermaid
flowchart TD
Start(["Incoming Request"]) --> Guard["JWT Guard"]
Guard --> Controller["Controller Method"]
Controller --> Service["Service Logic"]
Service --> DB["Prisma ORM Queries"]
DB --> Service
Service --> Ok{"Success?"}
Ok --> |Yes| Transform["TransformInterceptor<br/>Wrap into {success:true, data, meta}"]
Transform --> Respond["Send Response"]
Ok --> |No| Error["HttpExceptionFilter<br/>Normalize error {success:false, error}"]
Error --> Respond
Respond --> Log["LoggingInterceptor<br/>Log method/url/status/duration/ip/userAgent/requestId"]
```

**Diagram sources**
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts#L21-L35)
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts#L16-L60)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)

**Section sources**
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts#L21-L35)
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts#L16-L60)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)

### Database Interaction Patterns Using Prisma ORM
- Initialization and lifecycle:
  - PrismaService extends PrismaClient and connects/disconnects on module init/destroy.
  - In development, slow queries are logged for performance tuning.
- Query execution:
  - Services call Prisma methods (find, create, upsert, update, count) to manage Users, Sessions, Responses, and related entities.
- Transactions and connection management:
  - The code does not explicitly use Prisma transactions; most operations are single-entity writes/read. For multi-entity consistency needs, explicit transactions could be introduced.

```mermaid
classDiagram
class PrismaService {
+onModuleInit()
+onModuleDestroy()
+$connect()
+$disconnect()
+$queryRaw()
+$executeRawUnsafe()
}
class User {
+id : string
+email : string
+role : UserRole
+sessions : Session[]
}
class Session {
+id : string
+userId : string
+questionnaireId : string
+status : SessionStatus
+progress : json
+responses : Response[]
}
class Response {
+id : string
+sessionId : string
+questionId : string
+value : json
+isValid : boolean
}
PrismaService --> User : "manages"
PrismaService --> Session : "manages"
PrismaService --> Response : "manages"
User "1" --> "*" Session : "has"
Session "1" --> "*" Response : "contains"
```

**Diagram sources**
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L8-L40)
- [schema.prisma](file://prisma/schema.prisma#L99-L147)
- [schema.prisma](file://prisma/schema.prisma#L270-L322)

**Section sources**
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L20-L40)
- [schema.prisma](file://prisma/schema.prisma#L99-L147)
- [schema.prisma](file://prisma/schema.prisma#L270-L322)

### Caching Strategy Using Redis
- Refresh token storage:
  - On login/register, refresh tokens are stored in Redis with TTL derived from configuration.
  - Token verification during refresh reads the token key; logout deletes the key.
- Session state:
  - The session service maintains in-memory maps of responses for adaptive logic evaluation; Redis is not used for runtime session state.
- Redis client:
  - RedisService provides a pooled client with retry strategy, lifecycle hooks, and convenience methods for string/hash operations.

```mermaid
flowchart TD
A["AuthService: generateTokens(user)"] --> B["RedisService.setex(refresh:<token>, userId, ttl)"]
C["AuthService: refresh(refreshToken)"] --> D["RedisService.get(refresh:<token>)"]
D --> E{"Found?"}
E --> |Yes| F["PrismaService.findUnique(userId)"]
E --> |No| G["Throw Unauthorized"]
F --> H["Sign new access token"]
I["AuthService: logout(refreshToken)"] --> J["RedisService.del(refresh:<token>)"]
```

**Diagram sources**
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L192-L232)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L128-L164)
- [redis.service.ts](file://libs/redis/src/redis.service.ts#L40-L59)

**Section sources**
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L192-L232)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L128-L164)
- [redis.service.ts](file://libs/redis/src/redis.service.ts#L40-L59)

### Error Handling Throughout the Data Flow
- Centralized exception filter:
  - Converts HttpException and unhandled errors into a consistent error envelope with code, message, details, requestId, and timestamp.
  - Logs structured error entries with stack traces for debugging.
- Controller-level guard enforcement:
  - JWT guard protects endpoints; unauthorized access yields normalized 401 responses.
- Validation:
  - Global ValidationPipe enforces DTO constraints and transforms incoming data.

```mermaid
flowchart TD
Req["Request"] --> Pipe["ValidationPipe"]
Pipe --> Guard["JwtAuthGuard"]
Guard --> Ctrl["Controller"]
Ctrl --> Svc["Service"]
Svc --> Op{"Operation"}
Op --> |Success| OK["TransformInterceptor"]
Op --> |Error| EX["HttpExceptionFilter"]
OK --> Res["Response"]
EX --> Res
```

**Diagram sources**
- [main.ts](file://apps/api/src/main.ts#L34-L43)
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L64-L72)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts#L21-L35)

**Section sources**
- [main.ts](file://apps/api/src/main.ts#L34-L43)
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)

### Logging and Monitoring Integration
- Logging interceptor:
  - Captures method, URL, status code, duration, IP, user agent, and request ID; logs both success and error outcomes.
- Prisma query logging:
  - Slow query warnings are emitted in development to aid performance analysis.
- Monitoring:
  - The system logs structured events suitable for ingestion by external monitoring systems (e.g., correlation by requestId).

```mermaid
sequenceDiagram
participant L as "LoggingInterceptor"
participant R as "Express Response"
L->>R : onEnd()
R-->>L : statusCode, duration
L->>L : log(JSON with metadata)
```

**Diagram sources**
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts#L25-L59)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L25-L33)

**Section sources**
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts#L16-L60)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L25-L33)

## Dependency Analysis
- AppModule aggregates:
  - ConfigModule, ThrottlerModule, PrismaModule, RedisModule, and feature modules.
  - Registers global throttling guard and exposes guards via APP_GUARD.
- Feature modules depend on shared libraries:
  - Auth and Session modules inject PrismaService and RedisService.
- Controllers depend on services:
  - AuthController depends on AuthService.
  - SessionController depends on SessionService.
  - QuestionnaireController depends on QuestionnaireService.

```mermaid
graph LR
AppModule["AppModule"] --> Config["ConfigModule"]
AppModule --> Throttler["ThrottlerModule"]
AppModule --> PrismaMod["PrismaModule"]
AppModule --> RedisMod["RedisModule"]
AppModule --> AuthCtrl["AuthController"]
AppModule --> SessionCtrl["SessionController"]
AppModule --> QuestCtrl["QuestionnaireController"]
AuthCtrl --> AuthService
SessionCtrl --> SessionService
QuestCtrl --> QuestionnaireService
AuthService --> PrismaService
SessionService --> PrismaService
AuthService --> RedisService
```

**Diagram sources**
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L24-L73)
- [session.controller.ts](file://apps/api/src/modules/session/session.controller.ts#L30-L152)
- [questionnaire.controller.ts](file://apps/api/src/modules/questionnaire/questionnaire.controller.ts#L18-L55)
- [prisma.module.ts](file://libs/database/src/prisma.module.ts#L4-L9)
- [redis.module.ts](file://libs/redis/src/redis.module.ts#L4-L9)

**Section sources**
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)

## Performance Considerations
- Interceptors:
  - Logging adds minimal overhead; ensure requestId propagation for tracing across services.
- Prisma:
  - Use selective includes and where clauses to avoid N+1 queries; batch operations where possible.
  - Monitor slow queries in development; consider adding indexes for frequent filters.
- Redis:
  - Keep TTLs aligned with token lifetimes; monitor key expiration and eviction policies.
- Validation:
  - ValidationPipe transforms inputs; keep DTOs concise to reduce unnecessary conversions.

## Troubleshooting Guide
- Unhandled errors:
  - Inspect the exception filter logs for stack traces and error envelopes.
- Authentication failures:
  - Check Redis refresh token presence and expiry; verify Prisma user existence and lockout fields.
- Session anomalies:
  - Review Prisma session progress and response upserts; confirm adaptive visibility rules and next-question selection logic.
- Database connectivity:
  - Confirm PrismaService lifecycle logs and slow query warnings in development.

**Section sources**
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts#L56-L82)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L128-L164)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L270-L359)
- [prisma.service.ts](file://libs/database/src/prisma.service.ts#L20-L40)

## Conclusion
The Quiz-to-build system implements a robust, layered architecture with clear separation of concerns. Global interceptors and filters ensure consistent request/response handling and error normalization. Prisma ORM provides reliable persistence, while Redis supports secure, time-bound refresh tokens. The session service coordinates adaptive logic and progress tracking, enabling dynamic questionnaire experiences. The documented flows and diagrams serve as a blueprint for extending functionality, optimizing performance, and maintaining reliability.