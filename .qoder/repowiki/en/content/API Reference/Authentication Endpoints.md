# Authentication Endpoints

<cite>
**Referenced Files in This Document**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts)
- [register.dto.ts](file://apps/api/src/modules/auth/dto/register.dto.ts)
- [login.dto.ts](file://apps/api/src/modules/auth/dto/login.dto.ts)
- [refresh-token.dto.ts](file://apps/api/src/modules/auth/dto/refresh-token.dto.ts)
- [token.dto.ts](file://apps/api/src/modules/auth/dto/token.dto.ts)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts)
- [user.decorator.ts](file://apps/api/src/modules/auth/decorators/user.decorator.ts)
- [jwt.strategy.ts](file://apps/api/src/modules/auth/strategies/jwt.strategy.ts)
- [auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts)
- [configuration.ts](file://apps/api/src/config/configuration.ts)
- [app.module.ts](file://apps/api/src/app.module.ts)
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
10. [Appendices](#appendices)

## Introduction
This document provides comprehensive API documentation for the authentication endpoints. It covers user registration, login, token refresh, logout, and profile retrieval with detailed request/response schemas, authentication requirements, error responses, rate limiting policies, and security considerations. Practical examples using curl commands and client implementation patterns are included to help developers integrate with the API effectively.

## Project Structure
The authentication module follows NestJS conventions with clear separation of concerns:
- Controller handles HTTP requests and responses
- Service encapsulates business logic and external integrations
- DTOs define request/response schemas with validation
- Guards and strategies manage authentication and authorization
- Configuration manages environment-based settings

```mermaid
graph TB
subgraph "Auth Module"
AC[AuthController]
AS[AuthService]
RG[RegisterDto]
LG[LoginDto]
RT[RefreshTokenDto]
TR[TokenResponseDto]
RR[RefreshResponseDto]
UG[JwtAuthGuard]
UD[CurrentUser Decorator]
JS[JwtStrategy]
end
subgraph "External Services"
PR[PrismaService]
RS[RedisService]
JW[JwtService]
BC[Bcrypt]
end
AC --> AS
AS --> PR
AS --> RS
AS --> JW
AS --> BC
AC --> RG
AC --> LG
AC --> RT
AC --> TR
AC --> RR
AC --> UG
UG --> JS
UD --> AS
```

**Diagram sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L24-L74)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L35-L278)
- [auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts#L11-L29)

**Section sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L1-L74)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L1-L278)
- [auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts#L1-L30)

## Core Components
The authentication system consists of five primary endpoints, each serving a specific purpose in the authentication lifecycle:

### Endpoint Overview
- **POST /api/v1/auth/register**: Creates new user accounts with email/password validation
- **POST /api/v1/auth/login**: Authenticates users with email/password and IP tracking
- **POST /api/v1/auth/refresh**: Generates new access tokens using refresh tokens
- **POST /api/v1/auth/logout**: Invalidates refresh tokens and logs out users
- **GET /api/v1/auth/me**: Retrieves current user profile with JWT authentication

### Authentication Requirements
All protected endpoints require JWT Bearer tokens in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Error Responses
Common HTTP status codes:
- **401 Unauthorized**: Invalid credentials, expired tokens, or missing authentication
- **409 Conflict**: Email already exists during registration
- **429 Too Many Requests**: Rate limiting exceeded

**Section sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L27-L72)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts#L25-L36)

## Architecture Overview
The authentication architecture implements a layered approach with clear boundaries between presentation, business logic, and persistence layers.

```mermaid
sequenceDiagram
participant Client as "Client Application"
participant Controller as "AuthController"
participant Service as "AuthService"
participant Prisma as "PrismaService"
participant Redis as "RedisService"
participant JWT as "JwtService"
Note over Client,Controller : Registration Flow
Client->>Controller : POST /api/v1/auth/register
Controller->>Service : register(RegisterDto)
Service->>Prisma : findUnique(email)
Prisma-->>Service : User check result
Service->>Service : hash password
Service->>Prisma : createUser()
Prisma-->>Service : Created user
Service->>JWT : sign(access token)
Service->>Redis : set(refresh token)
Service->>Prisma : create refresh token record
Service-->>Controller : TokenResponseDto
Controller-->>Client : 201 Created
Note over Client,Controller : Login Flow
Client->>Controller : POST /api/v1/auth/login
Controller->>Service : login(LoginDto, ip)
Service->>Prisma : findUnique(email)
Prisma-->>Service : User data
Service->>Service : verify password
Service->>Prisma : update user (login stats)
Service->>JWT : sign(access token)
Service->>Redis : set(refresh token)
Service-->>Controller : TokenResponseDto
Controller-->>Client : 200 OK
```

**Diagram sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L31-L44)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L54-L126)

## Detailed Component Analysis

### POST /api/v1/auth/register

#### Request Schema (RegisterDto)
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| email | string | Required, valid email format | Unique user identifier |
| password | string | Required, min 8 chars, alphanumeric + special | Secure password with complexity requirements |
| name | string | Required, min 2 chars, max 100 chars | User's full name |

Password complexity requirements:
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one digit
- Maximum 100 characters

#### Response Schema (TokenResponseDto)
| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | JWT access token for API authentication |
| refreshToken | string | Unique refresh token for token renewal |
| expiresIn | number | Access token expiration in seconds (default: 900) |
| tokenType | string | Token type indicator (always "Bearer") |
| user | object | User profile information |

User Profile Schema:
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique user identifier |
| email | string | User's email address |
| role | enum | User role (CLIENT, DEVELOPER, ADMIN, SUPER_ADMIN) |
| name | string | User's display name (optional) |

#### Implementation Details
The registration process includes:
1. Email uniqueness validation
2. Password hashing with configurable cost factor
3. User creation with default CLIENT role
4. Token generation and storage
5. Audit trail creation

#### Security Considerations
- Passwords are hashed using bcrypt with configurable rounds
- Email addresses are normalized to lowercase
- User profiles are stored as JSON for flexibility
- Access tokens expire after 15 minutes

**Section sources**
- [register.dto.ts](file://apps/api/src/modules/auth/dto/register.dto.ts#L4-L23)
- [token.dto.ts](file://apps/api/src/modules/auth/dto/token.dto.ts#L18-L33)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L54-L83)

### POST /api/v1/auth/login

#### Request Schema (LoginDto)
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| email | string | Required, valid email format | User's registered email |
| password | string | Required, min 1 char | User's password |
| ip | string | Auto-populated by server | Client IP address (not sent by client) |

#### Response Schema (TokenResponseDto)
Same as registration response schema.

#### Additional Features
- **IP Tracking**: Automatically records client IP address on successful login
- **Account Lockout**: After 5 failed attempts, account locks for 15 minutes
- **Audit Logging**: Comprehensive login attempt tracking

#### Security Measures
- Account lockout mechanism prevents brute force attacks
- Failed login attempts increment with automatic lockout
- Last login IP and timestamp are recorded
- Password verification uses bcrypt comparison

**Section sources**
- [login.dto.ts](file://apps/api/src/modules/auth/dto/login.dto.ts#L4-L16)
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L41-L44)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L85-L126)

### POST /api/v1/auth/refresh

#### Request Schema (RefreshTokenDto)
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| refreshToken | string | Required, non-empty string | Previously issued refresh token |

#### Response Schema (RefreshResponseDto)
| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | New JWT access token |
| expiresIn | number | Access token expiration in seconds (default: 900) |

#### Implementation Details
The refresh endpoint validates tokens against Redis cache and generates new access tokens without requiring user credentials.

#### Security Considerations
- Refresh tokens are validated in Redis cache before token generation
- Expired refresh tokens are automatically invalidated
- Access tokens remain short-lived (15 minutes) for security

**Section sources**
- [refresh-token.dto.ts](file://apps/api/src/modules/auth/dto/refresh-token.dto.ts#L4-L9)
- [token.dto.ts](file://apps/api/src/modules/auth/dto/token.dto.ts#L35-L41)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L128-L158)

### POST /api/v1/auth/logout

#### Request Schema (RefreshTokenDto)
Same as refresh endpoint.

#### Response
Simple success message indicating logout completion.

#### Implementation Details
The logout process immediately invalidates the refresh token by removing it from Redis cache.

#### Security Benefits
- Immediate token invalidation prevents continued access
- No database updates required for logout
- Reduces token lifetime attack surface

**Section sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L59-L62)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L160-L164)

### GET /api/v1/auth/me

#### Authentication
Requires valid JWT Bearer token in Authorization header.

#### Response Schema (AuthenticatedUser)
| Field | Type | Description |
|-------|------|-------------|
| id | string | User identifier |
| email | string | User's email |
| role | enum | User role |
| name | string | User's name (optional) |

#### Implementation Details
Uses JwtAuthGuard to validate tokens and CurrentUser decorator to extract user data.

**Section sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L70-L72)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts#L1-L38)
- [user.decorator.ts](file://apps/api/src/modules/auth/decorators/user.decorator.ts#L1-L16)

## Dependency Analysis

```mermaid
classDiagram
class AuthController {
+register(RegisterDto) TokenResponseDto
+login(LoginDto) TokenResponseDto
+refresh(RefreshTokenDto) RefreshResponseDto
+logout(RefreshTokenDto) object
+getMe(AuthenticatedUser) AuthenticatedUser
}
class AuthService {
-bcryptRounds : number
-jwtRefreshSecret : string
+register(RegisterDto) TokenResponseDto
+login(LoginDto) TokenResponseDto
+refresh(string) RefreshResponseDto
+logout(string) void
+validateUser(JwtPayload) AuthenticatedUser
}
class JwtAuthGuard {
+canActivate() boolean
+handleRequest() AuthenticatedUser
}
class JwtStrategy {
+validate(JwtPayload) AuthenticatedUser
}
class CurrentUser {
+createParamDecorator() AuthenticatedUser
}
AuthController --> AuthService : "uses"
AuthController --> JwtAuthGuard : "uses"
JwtAuthGuard --> JwtStrategy : "extends"
CurrentUser --> AuthService : "extracts"
```

**Diagram sources**
- [auth.controller.ts](file://apps/api/src/modules/auth/auth.controller.ts#L24-L74)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L35-L278)
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts#L6-L38)
- [jwt.strategy.ts](file://apps/api/src/modules/auth/strategies/jwt.strategy.ts#L8-L29)

**Section sources**
- [auth.module.ts](file://apps/api/src/modules/auth/auth.module.ts#L11-L29)
- [app.module.ts](file://apps/api/src/app.module.ts#L16-L66)

## Performance Considerations
The authentication system implements several performance optimizations:

### Rate Limiting Configuration
- **Global Rate Limits**: 100 requests per minute across all endpoints
- **Login-Specific Limits**: 5 requests per minute for login attempts
- **Short Window**: 1 request per 1000ms for burst protection
- **Medium Window**: 20 requests per 10000ms for moderate traffic
- **Long Window**: 100 requests per 60000ms for sustained usage

### Caching Strategy
- **Redis Cache**: Stores refresh tokens for instant validation
- **Database Cache**: Maintains refresh token records for audit trails
- **Token Expiration**: Access tokens expire quickly (15 minutes) to minimize cache pressure

### Security Hardening
- **Password Hashing**: Configurable bcrypt rounds (default: 12)
- **Account Lockout**: Prevents brute force attacks
- **IP Tracking**: Helps detect suspicious activity patterns

**Section sources**
- [configuration.ts](file://apps/api/src/config/configuration.ts#L32-L37)
- [app.module.ts](file://apps/api/src/app.module.ts#L26-L42)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L234-L253)

## Troubleshooting Guide

### Common Authentication Issues

#### 401 Unauthorized Errors
**Causes:**
- Expired or invalid JWT tokens
- Missing Authorization header
- Incorrect token format
- User account deletion or suspension

**Solutions:**
- Use refresh token to obtain new access token
- Verify token format: "Bearer <token>"
- Check token expiration timestamps
- Ensure user account is active

#### 409 Conflict During Registration
**Cause:** Email address already exists in the system

**Solution:** Prompt user to use a different email or initiate password reset

#### 429 Too Many Requests
**Cause:** Rate limit exceeded for authentication endpoints

**Solutions:**
- Implement exponential backoff in client applications
- Reduce authentication frequency
- Check rate limiting configuration
- Consider upgrading to higher tier limits

#### Account Lockout Issues
**Cause:** Multiple failed login attempts (5 attempts)

**Resolution:** Wait for 15-minute lockout period to expire

**Section sources**
- [jwt-auth.guard.ts](file://apps/api/src/modules/auth/guards/jwt-auth.guard.ts#L25-L36)
- [auth.service.ts](file://apps/api/src/modules/auth/auth.service.ts#L90-L126)

## Conclusion
The authentication system provides a robust, secure, and scalable foundation for user management. Its layered architecture ensures clear separation of concerns while maintaining high performance through strategic caching and rate limiting. The comprehensive error handling and security measures protect against common threats while providing clear feedback for troubleshooting.

Key strengths include:
- Multi-layered security with JWT tokens and refresh mechanisms
- Comprehensive rate limiting and account protection
- Flexible user roles and profile management
- Extensive audit logging and monitoring capabilities
- Clean separation of concerns with clear API contracts

## Appendices

### API Usage Examples

#### Registration Example
```bash
curl -X POST https://api.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecureP@ss123",
    "name": "John Doe"
  }'
```

#### Login Example
```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecureP@ss123"
  }'
```

#### Using Access Token
```bash
curl -X GET https://api.example.com/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Client Implementation Patterns

**JavaScript/TypeScript Pattern:**
```typescript
class AuthenticationService {
  private accessToken: string;
  private refreshToken: string;
  
  async login(email: string, password: string): Promise<void> {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const { accessToken, refreshToken } = await response.json();
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
  
  async refreshAccessToken(): Promise<string> {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    
    const { accessToken } = await response.json();
    this.accessToken = accessToken;
    return accessToken;
  }
}
```

**Environment Configuration:**
- JWT_SECRET: Must be a 64-character secure random string
- JWT_REFRESH_SECRET: Separate secret for refresh tokens
- JWT_EXPIRES_IN: Access token expiration (default: 15m)
- JWT_REFRESH_EXPIRES_IN: Refresh token expiration (default: 7d)
- BCRYPT_ROUNDS: Password hashing cost (default: 12)

**Section sources**
- [.env.example](file://.env.example#L14-L18)
- [configuration.ts](file://apps/api/src/config/configuration.ts#L19-L25)