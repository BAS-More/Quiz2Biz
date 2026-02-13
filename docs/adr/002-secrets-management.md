# ADR-002: Secrets Management Strategy

## Status
Accepted

## Date
2026-01-28

## Context
Quiz-to-Build handles sensitive configuration including database credentials, API keys, JWT signing keys, and third-party service credentials. These secrets must be managed securely across development, staging, and production environments.

### Requirements
- Secure storage of secrets at rest and in transit
- Environment-specific secret management
- Secret rotation capability without downtime
- Audit trail of secret access
- Developer-friendly local development workflow
- CI/CD pipeline integration

### Options Considered

#### Option 1: Environment Variables Only
- **Pros**: Simple, universal support, 12-factor app compliant
- **Cons**: No encryption at rest, no rotation, no audit trail

#### Option 2: Azure Key Vault
- **Pros**: Native Azure integration, encryption, rotation, RBAC, audit logs
- **Cons**: Azure lock-in, requires managed identity setup

#### Option 3: HashiCorp Vault
- **Pros**: Cloud-agnostic, dynamic secrets, comprehensive audit
- **Cons**: Operational overhead, additional infrastructure

#### Option 4: AWS Secrets Manager / Parameter Store
- **Pros**: AWS native, rotation, versioning
- **Cons**: AWS-specific, not aligned with Azure deployment

## Decision
**We will use Azure Key Vault as the primary secrets store** with environment variables for local development:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION/STAGING                        │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  Container  │────▶│ Managed      │────▶│  Azure Key   │ │
│  │    App      │     │ Identity     │     │    Vault     │ │
│  └─────────────┘     └──────────────┘     └──────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                         │
│  ┌─────────────┐     ┌──────────────┐                       │
│  │    App      │────▶│   .env       │  (git-ignored)        │
│  └─────────────┘     └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Secret Categories

| Category | Examples | Rotation Frequency |
|----------|----------|-------------------|
| Database | `DATABASE_URL`, connection strings | 90 days |
| Authentication | `JWT_SECRET`, `JWT_REFRESH_SECRET` | 30 days |
| API Keys | Third-party service keys | On compromise |
| Encryption | `ENCRYPTION_KEY` for data at rest | Annually |

### Implementation

#### Key Vault Structure
```
quiz-to-build-kv-{env}/
├── database-url
├── redis-connection-string
├── jwt-private-key
├── jwt-public-key
├── jwt-refresh-secret
├── encryption-key
└── third-party/
    ├── sendgrid-api-key
    └── stripe-secret-key
```

#### Application Integration
```typescript
// NestJS ConfigModule with Key Vault
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        async () => {
          if (process.env.NODE_ENV === 'production') {
            return loadFromKeyVault();
          }
          return loadFromEnv();
        }
      ]
    })
  ]
})
```

### Security Controls
1. **Access**: Managed Identity only (no service principals in production)
2. **Network**: Private endpoint within VNet
3. **Audit**: Diagnostic logs to Log Analytics
4. **Rotation**: Automated rotation for supported secrets
5. **Backup**: Soft-delete enabled, purge protection

### Local Development
- `.env` file (git-ignored) with development secrets
- `.env.example` template with placeholder values
- Never commit actual secrets

## Consequences

### Positive
- Centralized secret management
- Automatic rotation for supported secrets
- Full audit trail
- Managed Identity eliminates credential management
- Soft-delete prevents accidental loss

### Negative
- Azure-specific solution
- Slight latency on cold starts
- Requires VNet integration for private access

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Key Vault unavailability | Cache secrets with TTL, regional redundancy |
| Secret exposure in logs | Sanitize logs, use structured logging |
| Developer access to prod secrets | Separate Key Vaults per environment |

## Compliance Mapping
- **ISO 27001**: A.10.1.1 (Cryptographic controls policy)
- **OWASP ASVS**: V6.4 (Secret Management)
- **NIST CSF**: PR.DS-1 (Data-at-rest protection)

## Related ADRs
- ADR-001: Authentication (JWT keys)
- ADR-003: Data Residency
