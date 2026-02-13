# ADR 007: Key Rotation Policy

## Status
Accepted

## Date
2026-01-28

## Context

Quiz-to-Build uses cryptographic keys and secrets for:
- JWT signing (access and refresh tokens)
- Database connection strings
- API keys for external services (SendGrid, Stripe)
- Azure service principal credentials
- Encryption keys for evidence files

These credentials must be rotated periodically to:
- Limit exposure window if a key is compromised
- Meet compliance requirements (ISO 27001, SOC2)
- Follow security best practices

We need a consistent policy for rotation frequency, procedure, and automation.

## Decision Drivers

1. **Security**: Minimize impact of potential key compromise
2. **Compliance**: ISO 27001 A.10.1.2 requires cryptographic key management
3. **Availability**: Rotation must not cause service disruption
4. **Automation**: Manual rotation is error-prone and doesn't scale
5. **Auditability**: Rotation events must be logged and verifiable

## Decision

Implement tiered key rotation policy based on sensitivity and blast radius:

### Tier 1: High-Sensitivity Keys (90-day rotation)
| Key Type | Rotation Period | Method |
|----------|-----------------|--------|
| JWT Signing Keys | 90 days | Dual-key overlap |
| Database Credentials | 90 days | Azure Key Vault auto-rotation |
| Encryption Master Key | 90 days | Key versioning |

### Tier 2: Medium-Sensitivity Keys (180-day rotation)
| Key Type | Rotation Period | Method |
|----------|-----------------|--------|
| SendGrid API Key | 180 days | Manual with notification |
| Stripe API Keys | 180 days | Manual with notification |
| Azure Service Principal | 180 days | Managed Identity preferred |

### Tier 3: Low-Sensitivity Keys (365-day rotation)
| Key Type | Rotation Period | Method |
|----------|-----------------|--------|
| Monitoring API Keys | 365 days | Manual |
| CI/CD Service Connections | 365 days | Manual |

## Implementation

### 1. JWT Key Rotation (Dual-Key Strategy)

```typescript
// config/jwt.config.ts
export const jwtConfig = {
  // Current signing key
  currentKeyId: process.env.JWT_KEY_ID_CURRENT,
  currentKey: process.env.JWT_SIGNING_KEY_CURRENT,
  
  // Previous key (for validation during transition)
  previousKeyId: process.env.JWT_KEY_ID_PREVIOUS,
  previousKey: process.env.JWT_SIGNING_KEY_PREVIOUS,
  
  // Key rotation overlap period (7 days)
  overlapDays: 7,
};

// auth.service.ts
async validateToken(token: string): Promise<User> {
  const header = this.decodeHeader(token);
  
  // Try current key first
  if (header.kid === jwtConfig.currentKeyId) {
    return this.verify(token, jwtConfig.currentKey);
  }
  
  // Fall back to previous key during rotation overlap
  if (header.kid === jwtConfig.previousKeyId) {
    return this.verify(token, jwtConfig.previousKey);
  }
  
  throw new UnauthorizedException('Unknown key ID');
}
```

### 2. Azure Key Vault Auto-Rotation

```terraform
# infrastructure/terraform/modules/keyvault/rotation.tf
resource "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  key_vault_id = azurerm_key_vault.main.id
  
  # Rotation configuration
  rotation_policy {
    automatic {
      time_before_expiry = "P30D"  # Rotate 30 days before expiry
    }
    
    expire_after         = "P90D"   # 90-day rotation
    notify_before_expiry = "P14D"   # 14-day advance warning
  }
}
```

### 3. Rotation Procedure

```
Day 0: Generate new key in Key Vault
Day 1: Deploy application with dual-key support
Day 2-7: Monitor for issues, existing tokens use old key
Day 7: Remove old key from validation
Day 8: Delete old key from Key Vault
```

### 4. Rotation Notification Flow

```typescript
// services/key-rotation.service.ts
@Injectable()
export class KeyRotationService {
  @Cron('0 9 * * 1')  // Every Monday at 9 AM
  async checkRotationSchedule() {
    const secrets = await this.keyVault.listSecrets();
    
    for (const secret of secrets) {
      const daysUntilExpiry = this.getDaysUntilExpiry(secret);
      
      if (daysUntilExpiry <= 14) {
        await this.notificationService.sendKeyRotationReminder({
          secretName: secret.name,
          expiresIn: daysUntilExpiry,
          rotationProcedure: this.getRotationProcedure(secret.name),
        });
      }
    }
  }
}
```

## Consequences

### Positive
- **Reduced Blast Radius**: Compromised key is only valid for rotation period
- **Automated Compliance**: Key Vault handles rotation automatically
- **Zero-Downtime**: Dual-key strategy prevents service disruption
- **Audit Trail**: All rotation events logged in Key Vault

### Negative
- **Complexity**: Dual-key validation adds code complexity
- **Operational Overhead**: Must monitor rotation notifications
- **Cost**: Key Vault operations have per-operation cost

### Mitigations
1. **Runbook**: Documented rotation procedure per key type
2. **Alerts**: Azure Monitor alerts for expiring secrets
3. **Testing**: Regular rotation dry-runs in staging environment

## Emergency Rotation Procedure

If a key is suspected to be compromised:

1. **Immediate**: Generate new key in Key Vault
2. **T+5 min**: Deploy application update (if code change needed)
3. **T+10 min**: Invalidate all existing sessions (for JWT compromise)
4. **T+15 min**: Remove compromised key from Key Vault
5. **T+1 hour**: Incident review, notify affected users if required

```bash
# Emergency rotation script
./scripts/emergency-key-rotation.sh --key-type=jwt --reason="suspected_compromise"
```

## Related Standards

- **ISO 27001 A.10.1.2**: Key management
- **NIST SP 800-57**: Key management recommendations
- **SOC2 CC6.1**: Cryptographic key management
- **PCI DSS 3.6**: Key management procedures

## Related ADRs

- ADR 002: Secrets Management (Key Vault usage)
- ADR 001: Authentication/Authorization (JWT usage)

## Appendix: Rotation Schedule Calendar

| Month | Week | Action |
|-------|------|--------|
| Jan | 1 | JWT key rotation |
| Jan | 2 | Database credential rotation |
| Apr | 1 | JWT key rotation |
| Apr | 2 | Database credential rotation |
| Jul | 1 | JWT key rotation + SendGrid rotation |
| Jul | 2 | Database credential rotation + Stripe rotation |
| Oct | 1 | JWT key rotation |
| Oct | 2 | Database credential rotation |
