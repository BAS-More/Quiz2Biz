# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: security@quiz2biz.com
3. Include detailed steps to reproduce the vulnerability
4. Allow up to 48 hours for initial response

## Security Measures

### Authentication
- JWT tokens with short expiration (15 minutes)
- Refresh token rotation
- bcrypt password hashing (12 rounds)
- MFA support

### Authorization
- Role-based access control (RBAC)
- Endpoint-level permission checks
- API rate limiting (100 req/min general, 5 req/min login)

### Data Protection
- All data encrypted at rest (Azure managed keys)
- TLS 1.2+ for all connections
- No sensitive data in logs
- PII handling per GDPR requirements

### Infrastructure
- Azure Container Apps with managed identity
- Private VNet for database access
- Key Vault for secrets management
- WAF protection enabled

### Dependency Management
- Automated Dependabot updates
- npm audit in CI pipeline
- Snyk vulnerability scanning
- SBOM generation for supply chain security

## Compliance

- ISO/IEC 27001 security controls
- OWASP Top 10 mitigation
- NIST SSDF practices
