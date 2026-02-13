# Component Interactions

<cite>
**Referenced Files in This Document**
- [app.module.ts](file://apps/api/src/app.module.ts)
- [main.ts](file://apps/api/src/main.ts)
- [prisma.module.ts](file://libs/database/src/prisma.module.ts)
- [redis.module.ts](file://libs/redis/src/redis.module.ts)
- [auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts)
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts)
- [user.decorator.ts](file://apps/api/src/modules/auth/decorators/user.decorator.ts)
- [jwt.strategy.ts](file://apps/api/src/modules/auth/strategies/jwt.strategy.ts)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts)
- [questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts)
- [condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts)
- [rule.types.ts](file://apps/api/src/modules/adaptive-logic/types/rule.types.ts)
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
This document explains how the Quiz-to-build system composes its modules and orchestrates interactions across authentication, questionnaire management, session handling, and adaptive logic. It documents the authentication flow from registration and login through JWT token validation to protected route access, and traces the data flow between modules during typical user workflows such as starting a session, submitting responses, and completing assessments. It also covers integration patterns with shared libraries (database and Redis), the strategy pattern used in condition evaluation, and the modular architecture’s benefits for loose coupling and high cohesion.

## Project Structure
The API application is organized as a NestJS monorepo with feature modules and shared libraries:
- Application bootstrap initializes global middleware, guards, interceptors, and Swagger documentation.
- Feature modules include authentication, users, questionnaire, session, adaptive logic, and standards.
- Shared libraries provide database and Redis services via global modules.

```mermaid
graph TB
subgraph "App Bootstrap"
MAIN["main.ts"]
APPMOD["app.module.ts"]
end
subgraph "Shared Libraries"
PRISMAMOD["libs/database/src/prisma.module.ts"]
REDISMOD["libs/redis/src/redis.module.ts"]
end
subgraph "Feature Modules"
AUTHMOD["apps/api/src/modules/auth/auth.module.ts"]
SESSIONMOD["apps/api/src/modules/session/session.module.ts"]
QNSMOD["apps/api/src/modules/questionnaire/questionnaire.module.ts"]
ADAPTIVEMOD["apps/api/src/modules/adaptive-logic/adaptive-logic.module.ts"]
end
MAIN --> APPMOD
APPMOD --> PRISMAMOD
APPMOD --> REDISMOD
APPMOD --> AUTHMOD
APPMOD --> SESSIONMOD
APPMOD --> QNSMOD
APPMOD --> ADAPTIVEMOD
```

**Diagram sources**
- [main.ts](file://apps/api/src/main.ts#L11-L86)
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)
- [prisma.module.ts](file://libs/database/src/prisma.module.ts#L1-L9)
- [redis.module.ts](file://libs/redis/src/redis.module.ts#L1-L9)

**Section sources**
- [main.ts](file://apps/api/src/main.ts#L11-L86)
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)

## Core Components
- Authentication module: Provides JWT-based login, registration, refresh/logout, guards, and strategies. Integrates with database and Redis for persistence and token storage.
- Session module: Manages questionnaire sessions, progress tracking, response submission, and completion. Coordinates with questionnaire and adaptive logic services.
- Questionnaire module: Loads questionnaire metadata, sections, and questions, including visibility rules.
- Adaptive logic module: Evaluates visibility rules and conditions to compute visible questions and derive next steps.
- Shared libraries: Database (Prisma) and Redis modules are globally provided and exported for use across feature modules.

**Section sources**
- [auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts#L11-L28)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L87-L94)
- [questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L63-L65)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L19-L26)
- [prisma.module.ts](file://libs/database/src/prisma.module.ts#L1-L9)
- [redis.module.ts](file://libs/redis/src/redis.module.ts#L1-L9)

## Architecture Overview
The system follows a layered, modular architecture:
- Controllers orchestrate requests and delegate to services.
- Services encapsulate domain logic and coordinate with shared libraries.
- Guards and strategies enforce authentication and authorization.
- Inter-module dependencies are explicit and injected via NestJS DI.

```mermaid
graph TB
CLIENT["Client"]
CTRL_AUTH["AuthController"]
CTRL_SESSION["SessionController"]
SVC_AUTH["AuthService"]
SVC_SESSION["SessionService"]
SVC_QNS["QuestionnaireService"]
SVC_ADAPT["AdaptiveLogicService"]
EVAL["ConditionEvaluator"]
PRISMA["@libs/database: PrismaService"]
REDIS["@libs/redis: RedisService"]
CLIENT --> CTRL_AUTH
CLIENT --> CTRL_SESSION
CTRL_AUTH --> SVC_AUTH
CTRL_SESSION --> SVC_SESSION
SVC_AUTH --> PRISMA
SVC_AUTH --> REDIS
SVC_SESSION --> PRISMA
SVC_SESSION --> SVC_QNS
SVC_SESSION --> SVC_ADAPT
SVC_QNS --> PRISMA
SVC_ADAPT --> PRISMA
SVC_ADAPT --> EVAL
```

**Diagram sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L24-L73)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L34-L52)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L87-L94)
- [questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L63-L65)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L19-L26)
- [condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts#L4-L22)

## Detailed Component Analysis

### Authentication Flow: Registration, Login, JWT Validation, Protected Access
This sequence illustrates the end-to-end authentication flow and protected route access.

```mermaid
sequenceDiagram
participant C as "Client"
participant AC as "AuthController"
participant AS as "AuthService"
participant PS as "PrismaService"
participant RS as "RedisService"
participant GS as "JwtStrategy"
participant GG as "JwtAuthGuard"
C->>AC : "POST /auth/register"
AC->>AS : "register(RegisterDto)"
AS->>PS : "findUnique(email)"
AS->>PS : "create(user)"
AS->>AS : "generateTokens(user)"
AS->>RS : "set(refresh : {token}, userId, ttl)"
AS->>PS : "create(refreshToken)"
AS-->>AC : "TokenResponseDto"
AC-->>C : "201 Created"
C->>AC : "POST /auth/login"
AC->>AS : "login(LoginDto)"
AS->>PS : "findUnique(email)"
AS->>PS : "compare(passwordHash)"
AS->>PS : "update(user : reset failed attempts)"
AS->>AS : "generateTokens(user)"
AS->>RS : "set(refresh : {token}, userId, ttl)"
AS-->>AC : "TokenResponseDto"
AC-->>C : "200 OK"
C->>AC : "GET /auth/me (Authorization : Bearer)"
AC->>GG : "JwtAuthGuard.canActivate()"
GG->>GS : "validate(jwt payload)"
GS->>AS : "validateUser(payload)"
AS->>PS : "findUnique(sub)"
AS-->>GS : "AuthenticatedUser"
GS-->>GG : "AuthenticatedUser"
GG-->>AC : "AuthenticatedUser"
AC-->>C : "200 OK"
```

**Diagram sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L27-L72)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L54-L232)
- [jwt.strategy.ts](file://apps/api/src/modules/auth/strategies/jwt.strategy.ts#L20-L28)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts#L12-L36)

**Section sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L27-L72)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L54-L232)
- [jwt.strategy.ts](file://apps/api/src/modules/auth/strategies/jwt.strategy.ts#L20-L28)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts#L12-L36)

### Session Lifecycle: Starting, Answering, Completing
This sequence shows how a user session is created, questions are delivered based on adaptive logic, responses are validated and persisted, and the session is completed.

```mermaid
sequenceDiagram
participant C as "Client"
participant SC as "SessionController"
participant SS as "SessionService"
participant QS as "QuestionnaireService"
participant ALS as "AdaptiveLogicService"
participant PS as "PrismaService"
participant EVAL as "ConditionEvaluator"
C->>SC : "POST /sessions (CreateSessionDto)"
SC->>SS : "create(userId, dto)"
SS->>QS : "findById(questionnaireId)"
SS->>QS : "getTotalQuestionCount(questionnaireId)"
SS->>PS : "create(Session)"
SS-->>SC : "SessionResponse"
SC-->>C : "201 Created"
C->>SC : "GET /sessions/ : id/next?count=N"
SC->>SS : "getNextQuestion(sessionId, userId, count)"
SS->>PS : "findMany(Response)"
SS->>QS : "getQuestionById(currentQuestionId)"
SS->>ALS : "getVisibleQuestions(questionnaireId, responseMap)"
ALS->>PS : "findMany(Question with visibilityRules)"
ALS->>EVAL : "evaluate(condition, responses)"
ALS-->>SS : "visibleQuestions"
SS-->>SC : "NextQuestionResponse"
SC-->>C : "200 OK"
C->>SC : "POST /sessions/ : id/responses (SubmitResponseDto)"
SC->>SS : "submitResponse(sessionId, userId, dto)"
SS->>QS : "getQuestionById(questionId)"
SS->>SS : "validateResponse(question, value)"
SS->>PS : "upsert(Response)"
SS->>ALS : "getVisibleQuestions(questionnaireId, responseMap)"
ALS->>EVAL : "evaluate(condition, responses)"
SS->>PS : "update(Session : progress, currentQuestionId)"
SS-->>SC : "SubmitResponseResult"
SC-->>C : "200 OK"
C->>SC : "POST /sessions/ : id/complete"
SC->>SS : "completeSession(sessionId, userId)"
SS->>PS : "update(Session : status=COMPLETED)"
SS-->>SC : "SessionResponse"
SC-->>C : "200 OK"
```

**Diagram sources**
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L96-L386)
- [questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L100-L162)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L31-L66)
- [condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts#L9-L22)

**Section sources**
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L96-L386)
- [questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L100-L162)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L31-L66)

### Data Model Classes
```mermaid
classDiagram
class AuthService {
+register(dto)
+login(dto)
+refresh(refreshToken)
+logout(refreshToken)
+validateUser(payload)
}
class SessionService {
+create(userId, dto)
+getNextQuestion(sessionId, userId, count)
+submitResponse(sessionId, userId, dto)
+completeSession(sessionId, userId)
+continueSession(sessionId, userId, questionCount)
}
class QuestionnaireService {
+findAll(pagination, industry)
+findById(id)
+getDefaultQuestionnaire()
+getQuestionById(questionId)
+getQuestionsBySection(sectionId)
+getTotalQuestionCount(questionnaireId)
}
class AdaptiveLogicService {
+getVisibleQuestions(questionnaireId, responses)
+evaluateQuestionState(question, responses)
+evaluateCondition(condition, responses)
+evaluateConditions(conditions, operator, responses)
+calculateAdaptiveChanges(questionnaireId, prev, curr)
+getRulesForQuestion(questionId)
+buildDependencyGraph(questionnaireId)
}
class ConditionEvaluator {
+evaluate(condition, responses)
}
AuthService --> PrismaService : "uses"
AuthService --> RedisService : "uses"
SessionService --> PrismaService : "uses"
SessionService --> QuestionnaireService : "uses"
SessionService --> AdaptiveLogicService : "uses"
QuestionnaireService --> PrismaService : "uses"
AdaptiveLogicService --> PrismaService : "uses"
AdaptiveLogicService --> ConditionEvaluator : "uses"
```

**Diagram sources**
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L34-L52)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L87-L94)
- [questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L63-L65)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L19-L26)
- [condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts#L4-L5)

### Strategy Pattern: Condition Evaluation
The adaptive logic module delegates condition evaluation to a dedicated evaluator, enabling extensibility and testability. The evaluator supports a wide range of operators and handles structured response values.

```mermaid
flowchart TD
Start(["Evaluate Condition"]) --> HasNested{"Has nested conditions?"}
HasNested --> |Yes| EvalNested["Evaluate nested with logical operator"]
HasNested --> |No| HasField{"Has field/operator?"}
HasField --> |No| True["Return true (no-op)"]
HasField --> |Yes| GetValue["Get response value by field"]
GetValue --> Op["Dispatch operator"]
Op --> Equals["equals/not_equals"]
Op --> Includes["includes/not_includes"]
Op --> InOp["in/not_in"]
Op --> Gt["greater_than/less_than"]
Op --> Gte["greater_than_or_equal/less_than_or_equal"]
Op --> Between["between"]
Op --> Empty["is_empty/is_not_empty"]
Op --> StartEnd["starts_with/ends_with"]
Op --> Matches["matches"]
EvalNested --> Result
Equals --> Result
Includes --> Result
InOp --> Result
Gt --> Result
Gte --> Result
Between --> Result
Empty --> Result
StartEnd --> Result
Matches --> Result
True --> End(["Return"])
Result --> End
```

**Diagram sources**
- [condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts#L9-L109)
- [rule.types.ts](file://apps/api/src/modules/adaptive-logic/types/rule.types.ts#L4-L28)

**Section sources**
- [condition.evaluator.ts](file://apps/api/src/modules/adaptive-logic/evaluators/condition.evaluator.ts#L9-L109)
- [rule.types.ts](file://apps/api/src/modules/adaptive-logic/types/rule.types.ts#L4-L28)

### Observer Pattern: Response Validation
While not a classical publish-subscribe system, the session service centralizes response validation and updates downstream components:
- Validation occurs before persisting responses.
- After persistence, the session service recomputes visibility and progress, effectively notifying dependent modules (UI, analytics) through the returned DTOs.

```mermaid
sequenceDiagram
participant SS as "SessionService"
participant QS as "QuestionnaireService"
participant PS as "PrismaService"
participant ALS as "AdaptiveLogicService"
SS->>QS : "getQuestionById(questionId)"
SS->>SS : "validateResponse(question, value)"
SS->>PS : "upsert(Response)"
SS->>ALS : "getVisibleQuestions(questionnaireId, responseMap)"
SS->>PS : "update(Session : progress, currentQuestionId)"
```

**Diagram sources**
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L270-L359)
- [questionnaire.service.ts](file://apps/api/src/modules/questionnaire/questionnaire.service.ts#L150-L162)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L31-L66)

**Section sources**
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L270-L359)

## Dependency Analysis
- AppModule aggregates all feature modules and shared libraries, ensuring global availability.
- Services depend on shared libraries via constructor injection.
- Cross-module dependencies are explicit: SessionService depends on QuestionnaireService and AdaptiveLogicService; AdaptiveLogicService depends on PrismaService and ConditionEvaluator.

```mermaid
graph LR
APP["AppModule"]
AUTH["AuthModule"]
USERS["UsersModule"]
QNS["QuestionnaireModule"]
SES["SessionModule"]
ADAPT["AdaptiveLogicModule"]
STAND["StandardsModule"]
PRISMA["PrismaModule"]
REDIS["RedisModule"]
APP --> AUTH
APP --> USERS
APP --> QNS
APP --> SES
APP --> ADAPT
APP --> STAND
APP --> PRISMA
APP --> REDIS
SES --> QNS
SES --> ADAPT
ADAPT --> PRISMA
AUTH --> PRISMA
AUTH --> REDIS
```

**Diagram sources**
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)

**Section sources**
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)

## Performance Considerations
- Database queries: Several services perform multiple queries per request. Consider batching and caching frequently accessed metadata (e.g., questionnaire structure) to reduce latency.
- Redis usage: Refresh tokens are stored in Redis with TTL, reducing repeated database writes. Ensure Redis is provisioned appropriately for concurrent sessions.
- Validation overhead: Centralized validation is efficient but can be optimized by precomputing question metadata and minimizing repeated evaluations.
- Pagination: Services support pagination to avoid large payloads and improve responsiveness.

## Troubleshooting Guide
- Authentication failures:
  - Invalid credentials or locked accounts trigger specific exceptions during login. Review failed login attempts and lockout logic.
  - Expired or invalid tokens are handled by guards and strategies, returning appropriate unauthorized responses.
- Session access:
  - Access denied errors occur when a user tries to access another user’s session. Ensure proper user context is passed.
  - Completed sessions cannot accept further submissions; verify session status before submitting.
- Adaptive logic:
  - If visibility does not update as expected, confirm rule priorities and condition logic. The evaluator applies the first applicable action per category (visibility, requirement).

**Section sources**
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L85-L126)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts#L25-L36)
- [session.service.ts](file://apps/api/src/modules/session/session.service.ts#L548-L565)
- [adaptive-logic.service.ts](file://apps/api/src/modules/adaptive-logic/adaptive-logic.service.ts#L87-L153)

## Conclusion
The Quiz-to-build system achieves clean separation of concerns through a modular architecture. Authentication, session management, and adaptive logic are cohesive units with well-defined responsibilities. The strategy pattern in condition evaluation and the centralized validation in session handling exemplify maintainable design. Shared database and Redis modules provide low-level services that remain decoupled from business logic, enabling scalability and resilience.