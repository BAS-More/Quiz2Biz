# Severity Default Policy

## Overview

This document defines the default severity assignment policy for Quiz-to-Build readiness assessments. When a question's severity cannot be determined from existing evidence or explicit user input, the system applies a **default severity of 0.7** (HIGH).

## Policy Statement

> **All unanswered questions or gaps without explicit severity assessment shall be assigned a default severity of 0.7 (HIGH) until evidence is provided to justify a lower severity.**

## Rationale

### Why 0.7?

The severity scale ranges from 0.0 (no impact) to 1.0 (critical impact):

| Severity | Label | Description |
|----------|-------|-------------|
| 0.0 - 0.2 | LOW | Minor impact, cosmetic issues |
| 0.3 - 0.4 | MEDIUM | Moderate impact, workarounds exist |
| 0.5 - 0.6 | HIGH | Significant impact, limited workarounds |
| 0.7 - 0.8 | CRITICAL | Major impact, business risk |
| 0.9 - 1.0 | BLOCKER | Severe impact, showstopper |

**0.7 is chosen because:**

1. **Assume Worst Case**: Unknown risks should be treated seriously until proven otherwise
2. **Incentivize Assessment**: Higher default severity motivates users to provide evidence
3. **Compliance Safety**: Conservative estimates are preferred for audit readiness
4. **Risk Management**: Underestimating severity leads to unmitigated risks

### The "Assume RED" Principle

In the Quiz-to-Build heatmap, severity determines color coding:

```
Residual Risk = Severity × (1 - Coverage)
```

With 0.7 default severity and 0% coverage:
- Residual = 0.7 × 1.0 = **0.7 (RED cell)**

This ensures gaps appear RED by default, drawing attention until addressed.

## Implementation

### Scoring Engine

```typescript
// scoring-engine.service.ts
const DEFAULT_SEVERITY = 0.7;

calculateResidualRisk(severity: number | null, coverage: number): number {
  const effectiveSeverity = severity ?? DEFAULT_SEVERITY;
  return effectiveSeverity * (1 - coverage);
}
```

### Database Schema

```prisma
model Question {
  id              String   @id @default(uuid())
  defaultSeverity Float    @default(0.7)  // Can be overridden per question
  // ...
}

model Response {
  id              String   @id @default(uuid())
  severity        Float?   // null = use default
  coverage        Float    @default(0)
  // ...
}
```

### API Response

```json
{
  "questionId": "q-123",
  "severity": null,
  "effectiveSeverity": 0.7,
  "severitySource": "DEFAULT_POLICY",
  "coverage": 0.0,
  "residualRisk": 0.7
}
```

## Severity Override Process

Users can override the default severity by:

1. **Answering the Question**: Providing a response with explicit severity
2. **Uploading Evidence**: Documentation that justifies lower severity
3. **Risk Assessment**: Formal risk assessment documenting actual impact

### Required Evidence for Severity Reduction

| Target Severity | Required Evidence |
|-----------------|-------------------|
| 0.5 - 0.6 | Documented workaround or mitigation |
| 0.3 - 0.4 | Formal risk acceptance with business justification |
| 0.1 - 0.2 | Third-party audit or assessment report |
| 0.0 | Complete irrelevance justification (e.g., N/A for industry) |

## Audit Trail

All severity assignments are logged:

```typescript
interface SeverityAuditEntry {
  questionId: string;
  sessionId: string;
  previousSeverity: number | null;
  newSeverity: number;
  source: 'DEFAULT_POLICY' | 'USER_INPUT' | 'EVIDENCE_BASED' | 'RISK_ASSESSMENT';
  justification?: string;
  evidenceIds?: string[];
  timestamp: Date;
  userId: string;
}
```

## Exceptions

### Industry-Specific Defaults

Some questions may have industry-specific severity defaults:

```typescript
const INDUSTRY_SEVERITY_OVERRIDES = {
  'healthcare': {
    'data-encryption': 0.9,  // HIPAA requirement
    'audit-logging': 0.8,
  },
  'fintech': {
    'transaction-integrity': 0.95,
    'fraud-detection': 0.85,
  },
  'general': {
    // All questions use 0.7 default
  }
};
```

### Administrative Override

Organization administrators can configure a custom default:

```typescript
// Per-organization configuration
interface OrganizationSettings {
  defaultSeverity: number;  // Must be >= 0.5, max 1.0
  requireJustificationBelow: number;  // e.g., 0.5
}
```

## Related Standards

- **ISO 27005**: Information security risk management
- **NIST SP 800-30**: Risk assessment guidelines
- **OWASP Risk Rating**: Methodology for severity assessment

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-01-28 | Initial policy established |
