# Error Handling and Validation

<cite>
**Referenced Files in This Document**
- [http-exception.filter.ts](file://apps/api/src/common/filters/http-exception.filter.ts)
- [logging.interceptor.ts](file://apps/api/src/common/interceptors/logging.interceptor.ts)
- [transform.interceptor.ts](file://apps/api/src/common/interceptors/transform.interceptor.ts)
- [logger.config.ts](file://apps/api/src/config/logger.config.ts)
- [sentry.config.ts](file://apps/api/src/config/sentry.config.ts)
- [csrf.guard.ts](file://apps/api/src/common/guards/csrf.guard.ts)
- [subscription.guard.ts](file://apps/api/src/common/guards/subscription.guard.ts)
- [graceful-degradation.config.ts](file://apps/api/src/config/graceful-degradation.config.ts)
- [register.dto.ts](file://apps/api/src/modules/auth/dto/register.dto.ts)
- [login.dto.ts](file://apps/api/src/modules/auth/dto/login.dto.ts)
- [create-questionnaire.dto.ts](file://apps/api/src/modules/admin/dto/create-questionnaire.dto.ts)
- [http-exception.filter.spec.ts](file://apps/api/src/common/filters/http-exception.filter.spec.ts)
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
This document explains the error handling and validation patterns implemented in the backend. It covers the custom HTTP exception filter, standardized error response formats, validation pipes, DTO validation rules, custom validation decorators, exception mapping strategies, error categorization, logging integration, graceful degradation, and production monitoring with Sentry. It also provides practical examples for handling different error types and debugging techniques.

## Project Structure
The error handling and validation features are organized across common modules (filters, interceptors, guards), configuration modules (logging, monitoring, graceful degradation), and domain DTOs (validation rules). The following diagram shows the high-level structure and relationships.

```mermaid
graph TB
subgraph "Common Modules"
F["HttpExceptionFilter<br/>(filters/http-exception.filter.ts)"]
LG["LoggingInterceptor<br/>(interceptors/logging.interceptor.ts)"]
TR["TransformInterceptor<br/>(interceptors/transform.interceptor.ts)"]
CG["CsrfGuard<br/>(guards/csrf.guard.ts)"]
SG["SubscriptionGuard<br/>(guards/subscription.guard.ts)"]
end
subgraph "Configuration"
LC["Logger Config<br/>(config/logger.config.ts)"]
SC["Sentry Config<br/>(config/sentry.config.ts)"]
GD["Graceful Degradation<br/>(config/graceful-degradation.config.ts)"]
end
subgraph "Domain DTOs"
RD["RegisterDto<br/>(modules/auth/dto/register.dto.ts)"]
LD["LoginDto<br/>(modules/auth/dto/login.dto.ts)"]
QD["CreateQuestionnaireDto<br/>(modules/admin/dto/create-questionnaire.dto.ts)"]
end
F --> LC
F --> SC
LG --> LC
TR --> LC
CG --> F
SG --> F
GD --> F
RD --> F
LD --> F
QD --> F
```

**Diagram sources**
- [http-exception.filter.ts:22-82](file://apps/api/src/common/filters/http-exception.filter.ts#L22-L82)
- [logging.interceptor.ts:11-54](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L54)
- [transform.interceptor.ts:14-31](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L31)
- [csrf.guard.ts:48-148](file://apps/api/src/common/guards/csrf.guard.ts#L48-L148)
- [subscription.guard.ts:57-174](file://apps/api/src/common/guards/subscription.guard.ts#L57-L174)
- [logger.config.ts:9-61](file://apps/api/src/config/logger.config.ts#L9-L61)
- [sentry.config.ts:51-127](file://apps/api/src/config/sentry.config.ts#L51-L127)
- [graceful-degradation.config.ts:66-211](file://apps/api/src/config/graceful-degradation.config.ts#L66-L211)
- [register.dto.ts:4-24](file://apps/api/src/modules/auth/dto/register.dto.ts#L4-L24)
- [login.dto.ts:4-19](file://apps/api/src/modules/auth/dto/login.dto.ts#L4-L19)
- [create-questionnaire.dto.ts:4-36](file://apps/api/src/modules/admin/dto/create-questionnaire.dto.ts#L4-L36)

**Section sources**
- [http-exception.filter.ts:22-102](file://apps/api/src/common/filters/http-exception.filter.ts#L22-L102)
- [logging.interceptor.ts:11-56](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L56)
- [transform.interceptor.ts:14-32](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L32)
- [csrf.guard.ts:48-242](file://apps/api/src/common/guards/csrf.guard.ts#L48-L242)
- [subscription.guard.ts:57-289](file://apps/api/src/common/guards/subscription.guard.ts#L57-L289)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)
- [sentry.config.ts:51-228](file://apps/api/src/config/sentry.config.ts#L51-L228)
- [graceful-degradation.config.ts:66-910](file://apps/api/src/config/graceful-degradation.config.ts#L66-L910)
- [register.dto.ts:4-24](file://apps/api/src/modules/auth/dto/register.dto.ts#L4-L24)
- [login.dto.ts:4-19](file://apps/api/src/modules/auth/dto/login.dto.ts#L4-L19)
- [create-questionnaire.dto.ts:4-36](file://apps/api/src/modules/admin/dto/create-questionnaire.dto.ts#L4-L36)

## Core Components
- Custom HTTP Exception Filter: Centralized error handling that maps exceptions to standardized JSON responses, enriches with correlation IDs, and logs details.
- Logging Interceptor: Structured HTTP request/response logging with correlation IDs and timing.
- Transform Interceptor: Wraps successful responses in a consistent envelope with timestamps and optional request IDs.
- CSRF Guard: Validates CSRF tokens using the double-submit cookie pattern for non-safe HTTP methods.
- Subscription Guard: Enforces tier-based and feature-based access controls, returning rich error payloads for forbidden access.
- Logger Configuration: Pino-backed logger with redaction, correlation ID generation, and environment-aware transport.
- Sentry Configuration: Production-grade error tracking, performance monitoring, alerting rules, and user context management.
- Graceful Degradation: Circuit breaker, fallbacks, retry with exponential backoff, bulkhead isolation, and rate limiting.
- DTO Validation: Strongly-typed DTOs using class-validator decorators for input validation.

**Section sources**
- [http-exception.filter.ts:22-102](file://apps/api/src/common/filters/http-exception.filter.ts#L22-L102)
- [logging.interceptor.ts:11-56](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L56)
- [transform.interceptor.ts:14-32](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L32)
- [csrf.guard.ts:48-148](file://apps/api/src/common/guards/csrf.guard.ts#L48-L148)
- [subscription.guard.ts:57-174](file://apps/api/src/common/guards/subscription.guard.ts#L57-L174)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)
- [sentry.config.ts:51-228](file://apps/api/src/config/sentry.config.ts#L51-L228)
- [graceful-degradation.config.ts:66-910](file://apps/api/src/config/graceful-degradation.config.ts#L66-L910)
- [register.dto.ts:4-24](file://apps/api/src/modules/auth/dto/register.dto.ts#L4-L24)
- [login.dto.ts:4-19](file://apps/api/src/modules/auth/dto/login.dto.ts#L4-L19)
- [create-questionnaire.dto.ts:4-36](file://apps/api/src/modules/admin/dto/create-questionnaire.dto.ts#L4-L36)

## Architecture Overview
The system integrates error handling and validation across the request lifecycle:
- DTOs define validation rules.
- Guards enforce access control and CSRF protection.
- Interceptors standardize logging and response envelopes.
- The exception filter centralizes error responses and integrates with Sentry and structured logging.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Controller as "Controller"
participant Guard as "Guards (CSRF/Subscription)"
participant Interceptors as "Interceptors (Transform/Logging)"
participant Filter as "HttpExceptionFilter"
participant Logger as "Logger/Pino"
participant Sentry as "Sentry"
Client->>Controller : HTTP Request
Controller->>Guard : Validate access and CSRF
Guard-->>Controller : Access granted/denied
Controller->>Interceptors : Handle request/response
Interceptors-->>Controller : Transformed response or error
alt Error occurs
Controller->>Filter : Throw exception
Filter->>Logger : Log error with correlation ID
Filter->>Sentry : Capture exception with context
Filter-->>Client : Standardized error response
else Success
Controller-->>Client : Success response via TransformInterceptor
end
```

**Diagram sources**
- [csrf.guard.ts:66-148](file://apps/api/src/common/guards/csrf.guard.ts#L66-L148)
- [subscription.guard.ts:65-94](file://apps/api/src/common/guards/subscription.guard.ts#L65-L94)
- [transform.interceptor.ts:14-31](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L31)
- [logging.interceptor.ts:11-56](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L56)
- [http-exception.filter.ts:22-82](file://apps/api/src/common/filters/http-exception.filter.ts#L22-L82)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)
- [sentry.config.ts:51-127](file://apps/api/src/config/sentry.config.ts#L51-L127)

## Detailed Component Analysis

### Custom HTTP Exception Filter
The filter intercepts all thrown exceptions, determines appropriate HTTP status codes, and returns a standardized error response envelope. It supports:
- Mapping HTTP exceptions to structured error payloads with optional details arrays.
- Generating error codes from status codes with a predefined mapping.
- Capturing unhandled errors and logging stack traces for debugging.
- Including correlation IDs and timestamps for traceability.

```mermaid
flowchart TD
Start(["Exception caught"]) --> Type{"Is HttpException?"}
Type --> |Yes| Extract["Extract status and response"]
Extract --> RespType{"Response is object?"}
RespType --> |Yes| BuildObj["Build error from response object"]
RespType --> |No| BuildMsg["Use exception message"]
Type --> |No| IsError{"Is Error instance?"}
IsError --> |Yes| InternalErr["Set 500 INTERNAL_ERROR"]
IsError --> |No| UnknownErr["Set UNKNOWN_ERROR"]
BuildObj --> Envelope["Construct standardized error envelope"]
BuildMsg --> Envelope
InternalErr --> Envelope
UnknownErr --> Envelope
Envelope --> Log["Log error with correlation ID"]
Log --> Send["Send JSON error response"]
```

**Diagram sources**
- [http-exception.filter.ts:26-82](file://apps/api/src/common/filters/http-exception.filter.ts#L26-L82)

**Section sources**
- [http-exception.filter.ts:22-102](file://apps/api/src/common/filters/http-exception.filter.ts#L22-L102)
- [http-exception.filter.spec.ts:53-94](file://apps/api/src/common/filters/http-exception.filter.spec.ts#L53-L94)

### Logging Interceptor
The interceptor logs structured HTTP events with correlation IDs, request durations, and error details. It delegates to Pino via NestJS Logger for consistent formatting and redaction.

```mermaid
sequenceDiagram
participant Interceptor as "LoggingInterceptor"
participant Handler as "Route Handler"
participant Logger as "Nest Logger (Pino)"
Interceptor->>Handler : Forward request
Handler-->>Interceptor : Response or error
alt Success
Interceptor->>Logger : Log {method,url,statusCode,duration,ip,userAgent,requestId}
else Error
Interceptor->>Logger : Log {method,url,error,duration,ip,userAgent,requestId}
end
```

**Diagram sources**
- [logging.interceptor.ts:14-54](file://apps/api/src/common/interceptors/logging.interceptor.ts#L14-L54)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)

**Section sources**
- [logging.interceptor.ts:11-56](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L56)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)

### Transform Interceptor
The interceptor wraps successful responses in a consistent envelope containing success flags, data, and metadata such as timestamps and optional request IDs.

```mermaid
flowchart TD
Start(["Response from handler"]) --> Wrap["Wrap in {success:true,data,meta}" ]
Wrap --> Meta["Add timestamp and optional requestId"]
Meta --> Return(["Return transformed response"])
```

**Diagram sources**
- [transform.interceptor.ts:14-31](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L31)

**Section sources**
- [transform.interceptor.ts:14-32](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L32)

### CSRF Guard
The guard implements the double-submit cookie pattern:
- Generates CSRF tokens with embedded HMAC signatures.
- Requires both cookie and header tokens for non-safe methods.
- Uses constant-time comparisons to prevent timing attacks.
- Supports a decorator to skip CSRF checks for specific routes.

```mermaid
flowchart TD
Start(["Request received"]) --> Safe{"Safe method?"}
Safe --> |Yes| Allow["Allow without CSRF"]
Safe --> |No| Skip{"@SkipCsrf?"}
Skip --> |Yes| Allow
Skip --> |No| Tokens["Read header and cookie tokens"]
Tokens --> Present{"Both present?"}
Present --> |No| Deny["Throw Forbidden with code"]
Present --> |Yes| Match{"Tokens equal?"}
Match --> |No| Deny
Match --> |Yes| Format{"Token format valid?"}
Format --> |No| Deny
Format --> |Yes| Allow
```

**Diagram sources**
- [csrf.guard.ts:66-148](file://apps/api/src/common/guards/csrf.guard.ts#L66-L148)

**Section sources**
- [csrf.guard.ts:48-242](file://apps/api/src/common/guards/csrf.guard.ts#L48-L242)

### Subscription Guard
The guard enforces tier-based and feature-based access:
- Extracts organization context from multiple locations (JWT, query, headers, body).
- Checks required tiers against current subscription.
- Performs feature usage checks with configurable usage calculators.
- Returns rich error payloads for denied access, including upgrade URLs and limits.

```mermaid
flowchart TD
Start(["canActivate"]) --> Org["Extract organizationId"]
Org --> |Missing| Forbidden["Throw Forbidden (no org)"]
Org --> TierCheck{"Required tiers?"}
TierCheck --> |Yes| CheckTier["Check current tier vs required"]
CheckTier --> DeniedTier{"Allowed?"}
DeniedTier --> |No| TierDenied["Throw Forbidden with tier details"]
DeniedTier --> |Yes| FeatureCheck{"Feature check?"}
TierCheck --> |No| FeatureCheck
FeatureCheck --> |Yes| CheckFeature["Compute usage and compare limits"]
CheckFeature --> DeniedFeature{"Allowed?"}
DeniedFeature --> |No| FeatureDenied["Throw Forbidden with feature details"]
DeniedFeature --> |Yes| Allow["Allow access"]
FeatureCheck --> |No| Allow
```

**Diagram sources**
- [subscription.guard.ts:65-174](file://apps/api/src/common/guards/subscription.guard.ts#L65-L174)

**Section sources**
- [subscription.guard.ts:57-289](file://apps/api/src/common/guards/subscription.guard.ts#L57-L289)

### DTO Validation Patterns
DTOs define strict validation rules using class-validator decorators:
- RegisterDto: Email format, password length/mixed-case requirements, name length constraints.
- LoginDto: Email format, password minimum length, optional IP field populated by controller.
- CreateQuestionnaireDto: String/boolean/int/object constraints with max/min and optional fields.

These DTOs are designed to integrate with validation pipes to produce structured validation errors compatible with the exception filter.

**Section sources**
- [register.dto.ts:4-24](file://apps/api/src/modules/auth/dto/register.dto.ts#L4-L24)
- [login.dto.ts:4-19](file://apps/api/src/modules/auth/dto/login.dto.ts#L4-L19)
- [create-questionnaire.dto.ts:4-36](file://apps/api/src/modules/admin/dto/create-questionnaire.dto.ts#L4-L36)

### Graceful Degradation
The graceful degradation configuration provides resilience patterns:
- Circuit Breakers: Failure/slow-call thresholds, timeouts, fallbacks (cache, queue, default value, alternative endpoint, local cache).
- Retry Executor: Exponential backoff with jitter, configurable retryable/non-retryable error categories.
- Bulkhead: Concurrency limits, queue sizing, and wait timeouts with metrics.
- Rate Limiter: Per-user, global, login, email sending, and file upload limits.

```mermaid
flowchart TD
Start(["External call"]) --> CB["CircuitBreaker state"]
CB --> Open{"Open?"}
Open --> |Yes| Fallback["Execute fallback (cache/queue/default/alternative/local)"]
Open --> |No| Call["Invoke external service"]
Call --> Result{"Success?"}
Result --> |Yes| RecordSuccess["Record success"]
Result --> |No| RecordFailure["Record failure"]
RecordFailure --> CB
RecordSuccess --> CB
Fallback --> Return(["Return fallback result"])
```

**Diagram sources**
- [graceful-degradation.config.ts:66-326](file://apps/api/src/config/graceful-degradation.config.ts#L66-L326)

**Section sources**
- [graceful-degradation.config.ts:66-910](file://apps/api/src/config/graceful-degradation.config.ts#L66-L910)

### Sentry Integration
Sentry is initialized early in the application lifecycle with:
- Environment-aware configuration and optional profiling.
- Data redaction for sensitive headers and breadcrumbs.
- Filtering of health check transactions and specific error types.
- Alerting rules for error rates and response times.
- Utilities for capturing exceptions with context, setting user context, adding breadcrumbs, and starting transactions.

```mermaid
sequenceDiagram
participant App as "Application Startup"
participant Sentry as "Sentry SDK"
participant Logger as "Nest Logger"
App->>Sentry : initializeSentry()
Sentry->>Logger : Log initialization status
App->>Sentry : captureException/error
Sentry-->>App : Event ID
```

**Diagram sources**
- [sentry.config.ts:51-127](file://apps/api/src/config/sentry.config.ts#L51-L127)

**Section sources**
- [sentry.config.ts:51-228](file://apps/api/src/config/sentry.config.ts#L51-L228)

## Dependency Analysis
The components interact as follows:
- Exception Filter depends on structured logging and Sentry for observability.
- Guards depend on configuration services and reflection for metadata.
- Interceptors rely on Pino logger configuration for consistent formatting.
- DTOs are consumed by controllers and validated by validation pipes (not shown here but implied by DTO usage).

```mermaid
graph TB
Filter["HttpExceptionFilter"] --> LoggerCfg["Logger Config"]
Filter --> SentryCfg["Sentry Config"]
Interceptors["Logging/Transform Interceptors"] --> LoggerCfg
Guards["CSRF/Subscription Guards"] --> Filter
DTOs["Auth/Admin DTOs"] --> Filter
GD["Graceful Degradation"] --> Filter
```

**Diagram sources**
- [http-exception.filter.ts:22-102](file://apps/api/src/common/filters/http-exception.filter.ts#L22-L102)
- [logging.interceptor.ts:11-56](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L56)
- [transform.interceptor.ts:14-31](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L31)
- [csrf.guard.ts:48-148](file://apps/api/src/common/guards/csrf.guard.ts#L48-L148)
- [subscription.guard.ts:57-174](file://apps/api/src/common/guards/subscription.guard.ts#L57-L174)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)
- [sentry.config.ts:51-127](file://apps/api/src/config/sentry.config.ts#L51-L127)
- [graceful-degradation.config.ts:66-326](file://apps/api/src/config/graceful-degradation.config.ts#L66-L326)
- [register.dto.ts:4-24](file://apps/api/src/modules/auth/dto/register.dto.ts#L4-L24)
- [login.dto.ts:4-19](file://apps/api/src/modules/auth/dto/login.dto.ts#L4-L19)
- [create-questionnaire.dto.ts:4-36](file://apps/api/src/modules/admin/dto/create-questionnaire.dto.ts#L4-L36)

**Section sources**
- [http-exception.filter.ts:22-102](file://apps/api/src/common/filters/http-exception.filter.ts#L22-L102)
- [logging.interceptor.ts:11-56](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L56)
- [transform.interceptor.ts:14-32](file://apps/api/src/common/interceptors/transform.interceptor.ts#L14-L32)
- [csrf.guard.ts:48-148](file://apps/api/src/common/guards/csrf.guard.ts#L48-L148)
- [subscription.guard.ts:57-174](file://apps/api/src/common/guards/subscription.guard.ts#L57-L174)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)
- [sentry.config.ts:51-127](file://apps/api/src/config/sentry.config.ts#L51-L127)
- [graceful-degradation.config.ts:66-326](file://apps/api/src/config/graceful-degradation.config.ts#L66-L326)
- [register.dto.ts:4-24](file://apps/api/src/modules/auth/dto/register.dto.ts#L4-L24)
- [login.dto.ts:4-19](file://apps/api/src/modules/auth/dto/login.dto.ts#L4-L19)
- [create-questionnaire.dto.ts:4-36](file://apps/api/src/modules/admin/dto/create-questionnaire.dto.ts#L4-L36)

## Performance Considerations
- Prefer circuit breakers and fallbacks for external dependencies to avoid cascading failures.
- Use exponential backoff with jitter to prevent thundering herds during retries.
- Apply bulkheads to isolate high-latency or high-throughput operations.
- Leverage rate limiting to protect critical resources and maintain SLAs.
- Keep validation logic lightweight and centralized to minimize overhead.

## Troubleshooting Guide
- Unhandled errors: The exception filter logs stack traces and returns standardized error responses. Use correlation IDs from the error payload to trace logs and Sentry events.
- Validation errors: DTO validation produces structured messages compatible with the exception filter. Inspect the details array for field-specific errors.
- CSRF failures: Ensure both cookie and header tokens are present and match. Review guard logs for missing or mismatched tokens.
- Subscription access denied: Check the error payload for required tiers and feature limits. Provide upgrade URLs and adjust feature usage calculations.
- Logging and tracing: Confirm Pino configuration is applied and correlation IDs propagate through the request lifecycle. Use Sentry to correlate events and breadcrumbs.

**Section sources**
- [http-exception.filter.ts:51-82](file://apps/api/src/common/filters/http-exception.filter.ts#L51-L82)
- [logging.interceptor.ts:11-56](file://apps/api/src/common/interceptors/logging.interceptor.ts#L11-L56)
- [csrf.guard.ts:95-148](file://apps/api/src/common/guards/csrf.guard.ts#L95-L148)
- [subscription.guard.ts:128-174](file://apps/api/src/common/guards/subscription.guard.ts#L128-L174)
- [logger.config.ts:9-62](file://apps/api/src/config/logger.config.ts#L9-L62)
- [sentry.config.ts:51-127](file://apps/api/src/config/sentry.config.ts#L51-L127)

## Conclusion
The backend implements a robust, layered approach to error handling and validation:
- Centralized exception filtering ensures consistent error responses.
- Structured logging and Sentry integration provide comprehensive observability.
- Guards enforce security and access control with rich error payloads.
- DTO validation and graceful degradation patterns improve reliability and user experience under failure conditions.
This design enables clear diagnostics, actionable alerts, and graceful handling of diverse error scenarios in production.