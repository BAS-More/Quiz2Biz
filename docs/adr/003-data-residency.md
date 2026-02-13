# ADR-003: Data Residency and Geographic Compliance

## Status
Accepted

## Date
2026-01-28

## Context
Quiz-to-Build processes business-sensitive data including organizational assessments, readiness scores, and potentially personally identifiable information (PII). Data residency requirements vary by customer geography and regulatory framework.

### Requirements
- Support customers in multiple regions (initially AU, future: US, EU)
- Comply with Australian Privacy Principles (APP)
- Future-proof for GDPR, CCPA compliance
- Clear data location transparency
- Support data sovereignty requirements

### Options Considered

#### Option 1: Single Region (Australia)
- **Pros**: Simple, cost-effective, clear data location
- **Cons**: Latency for non-AU users, no geographic redundancy

#### Option 2: Multi-Region with Data Replication
- **Pros**: Low latency globally, high availability
- **Cons**: Complex, data residency compliance issues, expensive

#### Option 3: Regional Isolation (Data Sharding by Region)
- **Pros**: Clear data boundaries, compliance-friendly, scalable
- **Cons**: More complex architecture, cross-region reporting challenges

## Decision
**We will implement Regional Isolation with Australia as the primary region**, with architecture ready for future regional expansion:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AUSTRALIA REGION                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Australia East (Primary)                               ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  ││
│  │  │Container │  │PostgreSQL│  │    Azure Key Vault   │  ││
│  │  │  Apps    │  │ Flexible │  │    (au-secrets)      │  ││
│  │  └──────────┘  │  Server  │  └──────────────────────┘  ││
│  │                └──────────┘                             ││
│  │                     │                                   ││
│  │                     ▼                                   ││
│  │              ┌──────────────┐                           ││
│  │              │    Redis     │                           ││
│  │              │   (Cache)    │                           ││
│  │              └──────────────┘                           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Classification

| Data Type | Classification | Residency Requirement | Encryption |
|-----------|---------------|----------------------|------------|
| User PII | Sensitive | In-region only | At-rest + Transit |
| Assessment Data | Confidential | In-region only | At-rest + Transit |
| Scores/Reports | Confidential | In-region only | At-rest + Transit |
| System Logs | Internal | Regional preference | Transit |
| Analytics (Aggregated) | Internal | Any region | Transit |

### Implementation

#### Database Strategy
```sql
-- All user data includes region identifier
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  region VARCHAR(10) NOT NULL DEFAULT 'AU',  -- AU, US, EU
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data queries always filter by region
SELECT * FROM assessments 
WHERE organization_id = $1 
AND region = current_region();
```

#### Application Configuration
```typescript
// Region-aware configuration
export const regionConfig = {
  AU: {
    database: process.env.AU_DATABASE_URL,
    keyVault: 'quiz-to-build-kv-au',
    storageAccount: 'q2baustralia',
    timezone: 'Australia/Sydney'
  },
  // Future regions
  US: { /* ... */ },
  EU: { /* ... */ }
};
```

### Compliance Controls

#### Australian Privacy Principles (APP)
- APP 8: Cross-border disclosure - Data stays in AU
- APP 11: Security - Encryption at rest and transit
- APP 12: Access - User data export capability

#### Future GDPR Readiness
- Data portability endpoints (export user data)
- Right to erasure (hard delete capability)
- Processing records maintained
- DPO contact information displayed

### Backup & Recovery
- Backups stored in same region as primary data
- Point-in-time recovery: 7 days
- Geo-redundant backups: Same country (AU East ↔ AU Southeast)

## Consequences

### Positive
- Clear data residency guarantees
- Simplified compliance reporting
- Ready for multi-region expansion
- Customer confidence in data handling

### Negative
- Initial single-region limits global latency optimization
- Future multi-region adds complexity
- Cross-region reporting requires aggregation service

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Single region outage | Azure availability zones, DR plan |
| Regulatory change | Architecture supports regional isolation |
| Customer data export | Built-in export APIs |

## Compliance Mapping
- **Australian Privacy Principles**: APP 1-13
- **ISO 27001**: A.18.1.4 (Privacy and protection of PII)
- **Future GDPR**: Articles 44-49 (International transfers)

## Related ADRs
- ADR-002: Secrets Management (regional Key Vaults)
- ADR-005: Database Choice
