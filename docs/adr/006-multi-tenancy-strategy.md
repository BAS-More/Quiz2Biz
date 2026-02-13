# ADR 006: Multi-Tenancy Strategy

## Status
Accepted

## Date
2026-01-28

## Context

Quiz-to-Build serves multiple organizations (tenants) that require:
- Data isolation between organizations
- Organization-specific customization
- Shared infrastructure for cost efficiency
- Compliance with data residency requirements (see ADR 003)
- Scalability as customer base grows

We need to decide on a multi-tenancy architecture that balances isolation, cost, and operational complexity.

## Decision Drivers

1. **Data Isolation**: Organizations must not see each other's assessment data
2. **Compliance**: GDPR, SOC2, ISO 27001 require demonstrable data segregation
3. **Scalability**: Support hundreds of organizations without linear cost growth
4. **Operational Simplicity**: Single deployment, unified maintenance
5. **Performance**: No noisy neighbor issues between tenants
6. **Cost Efficiency**: Shared resources where appropriate

## Options Considered

### Option 1: Database-per-Tenant (Silo Model)
- Separate PostgreSQL database per organization
- Complete physical isolation
- Pros: Maximum isolation, easy compliance, simple backup/restore per tenant
- Cons: High cost, complex migrations, connection pool management overhead

### Option 2: Schema-per-Tenant (Bridge Model)
- Shared database, separate schema per organization
- Pros: Good isolation, easier migrations than Option 1, moderate cost
- Cons: Schema migration complexity, PostgreSQL schema limits (~15,000)

### Option 3: Shared Schema with Tenant ID (Pool Model)
- Single database, single schema, tenant_id column on all tables
- Pros: Lowest cost, simplest deployment, easy migrations
- Cons: Requires row-level security, potential data leak risk, noisy neighbor risk

### Option 4: Hybrid Model
- Pool model for most data with silo model for sensitive/enterprise customers
- Pros: Flexible, cost-effective for SMB, isolated for enterprise
- Cons: Two code paths, operational complexity

## Decision

**Option 3: Shared Schema with Tenant ID** with PostgreSQL Row-Level Security (RLS)

We implement a pool model with robust safeguards:

1. **Tenant ID Column**: Every table includes `organizationId` foreign key
2. **Row-Level Security**: PostgreSQL RLS policies enforce tenant isolation at database level
3. **Application-Level Guards**: NestJS guards validate tenant context on every request
4. **Audit Trail**: All queries logged with tenant context for compliance

### Implementation

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_registry ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation ON sessions
    FOR ALL
    USING (organization_id = current_setting('app.current_tenant')::uuid);

-- Application sets tenant context per request
SET app.current_tenant = '<tenant-uuid>';
```

```typescript
// NestJS Guard sets tenant context
@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Set PostgreSQL session variable for RLS
    await this.prisma.$executeRaw`
      SET app.current_tenant = ${user.organizationId}::text
    `;
    
    return true;
  }
}
```

### Data Model

```
Organization (tenant)
├── Users (belong to one org)
├── Sessions (scoped to org)
│   ├── Responses (scoped to session → org)
│   ├── Evidence (scoped to session → org)
│   └── Scores (scoped to session → org)
├── DecisionLog (scoped to org)
└── Documents (scoped to org)
```

## Consequences

### Positive
- **Cost Efficient**: Single database, single schema, horizontal scaling
- **Simple Operations**: One migration path, one backup strategy
- **Fast Onboarding**: New tenant = new organization record
- **Database-Level Security**: RLS provides defense-in-depth beyond application code

### Negative
- **Query Complexity**: Must always include organizationId in queries
- **Risk of Data Leak**: Bug in RLS policy or application code could expose data
- **Noisy Neighbor**: Large tenant queries could impact others (mitigated by connection pooling limits)

### Mitigations
1. **Mandatory Query Validation**: All Prisma queries validated to include tenant filter
2. **Integration Tests**: Test suite verifies cross-tenant isolation
3. **Per-Tenant Rate Limiting**: Prevent any single tenant from monopolizing resources
4. **Regular Audits**: Monthly review of query logs for cross-tenant access attempts

## Related Standards

- **ISO 27001 A.9.4.1**: Information access restriction
- **SOC2 CC6.1**: Logical and physical access controls
- **GDPR Article 32**: Security of processing (data isolation)

## Related ADRs

- ADR 003: Data Residency (regional data storage)
- ADR 005: Database Choice (PostgreSQL with RLS capability)

## Notes

Enterprise customers requiring physical isolation can be accommodated via dedicated infrastructure with premium pricing. This maintains the simplicity of the pool model for 95% of customers while offering silo model for high-compliance requirements.
