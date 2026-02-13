# ADR-001: Authentication and Authorization Strategy

## Status
Accepted

## Date
2026-01-28

## Context
Quiz-to-Build requires secure user authentication and fine-grained authorization to protect sensitive business readiness data and ensure only authorized users can access specific features and data.

### Requirements
- Support multiple user roles (Admin, Consultant, Business User)
- Secure session management
- API authentication for service-to-service communication
- Audit trail of authentication events
- Compliance with security standards (OWASP ASVS)

### Options Considered

#### Option 1: Session-based Authentication (Cookies)
- **Pros**: Simple, built-in CSRF protection, server-side session control
- **Cons**: Server-side state, scaling challenges, not ideal for API-first architecture

#### Option 2: JWT (JSON Web Tokens)
- **Pros**: Stateless, scalable, works well with microservices, standard claims
- **Cons**: Token revocation complexity, larger payload, requires refresh token strategy

#### Option 3: OAuth 2.0 / OpenID Connect
- **Pros**: Industry standard, supports SSO, delegated authorization
- **Cons**: Complex setup, overkill for single-application initially

## Decision
**We will use JWT-based authentication with refresh tokens**, implemented via NestJS Passport with the following architecture:

### Authentication Flow
1. User authenticates with email/password
2. Server validates credentials against bcrypt-hashed password
3. Server issues:
   - **Access Token** (JWT): Short-lived (15 minutes), contains user claims
   - **Refresh Token**: Long-lived (7 days), stored in HTTP-only cookie
4. Client includes Access Token in Authorization header
5. Refresh Token used to obtain new Access Token when expired

### Authorization Model
- **Role-Based Access Control (RBAC)** for feature access
- **Attribute-Based Access Control (ABAC)** for data-level permissions
- Roles: `SUPER_ADMIN`, `ADMIN`, `CONSULTANT`, `USER`

### Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["USER"],
  "organizationId": "org-uuid",
  "iat": 1706400000,
  "exp": 1706400900
}
```

### Security Measures
- Access tokens signed with RS256 (asymmetric)
- Refresh tokens rotated on use (rotation strategy)
- Token blacklist in Redis for revocation
- Rate limiting on auth endpoints
- Account lockout after failed attempts

## Consequences

### Positive
- Stateless authentication scales horizontally
- Standard JWT libraries available
- Clear separation of access and refresh concerns
- Supports future OAuth/SSO integration

### Negative
- Must implement refresh token rotation
- Requires Redis for token blacklist
- Slightly larger request headers

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Token theft | Short expiry, HTTP-only cookies for refresh |
| Token replay | JTI claim, single-use refresh tokens |
| Algorithm confusion | Explicit RS256 verification |

## Compliance Mapping
- **OWASP ASVS**: V2.1 (Password Security), V3.1 (Session Management)
- **ISO 27001**: A.9.4.2 (Secure log-on procedures)
- **NIST CSF**: PR.AC-1 (Identities and credentials)

## Related ADRs
- ADR-002: Secrets Management
- ADR-005: Database Choice (user storage)
