# Quiz2Biz Quest-Mode Prompt Examples

This document contains 5 example Quest-Mode prompts demonstrating how the QPG (Qoder Prompt Generator) system produces actionable prompts from readiness gaps.

---

## Quest 1: Architecture Documentation Gap

**Dimension**: CTO - Architecture  
**Gap Identified**: Missing system architecture documentation with current coverage 0.25  
**Target Coverage**: 0.75

### Generated Prompt

```
# Goal
Create comprehensive system architecture documentation for Quiz2Biz that achieves 75% coverage for the Architecture dimension readiness assessment.

# Tasks
1. Create C4 Level 1 System Context diagram showing Quiz2Biz and its external actors (Users, Admin, External Systems, Payment Provider, Email Service)
2. Create C4 Level 2 Container diagram showing all major containers:
   - React SPA Frontend
   - NestJS API Backend
   - PostgreSQL Database
   - Redis Cache
   - Azure Container Apps hosting
3. Create C4 Level 3 Component diagrams for these modules:
   - Authentication Module
   - Questionnaire Module
   - Scoring Engine
   - Evidence Registry
4. Document data flows between components with sequence diagrams for:
   - User login flow
   - Question answering flow
   - Evidence upload flow
5. Create deployment architecture diagram showing Azure resources

# Acceptance Criteria
- All C4 diagrams follow the official C4 model specification
- Each diagram includes proper labels, relationships, and technology annotations
- Diagrams are created in Mermaid format for easy maintenance
- Documentation covers 100% of currently implemented modules
- Peer review by at least one other team member

# Constraints
- Use Mermaid.js syntax (compatible with GitHub rendering)
- No proprietary tooling required to view diagrams
- Keep diagrams simple enough to fit on a single page when rendered
- Use consistent naming conventions from codebase

# Deliverables
1. `/docs/architecture/c4-01-system-context.mmd` - System context diagram
2. `/docs/architecture/c4-02-container.md` - Container diagram
3. `/docs/architecture/c4-03-component.md` - Component diagrams
4. `/docs/architecture/data-flows.md` - Data flow documentation
5. Update this evidence record with file hashes upon completion

# Evidence Attachment
- [ ] Upload completed diagram files
- [ ] Attach rendered PNG/SVG exports
- [ ] Include PR link for documentation changes
```

---

## Quest 2: Security Controls Implementation

**Dimension**: CTO - Security  
**Gap Identified**: Container signing not implemented, coverage 0.0  
**Target Coverage**: 1.0

### Generated Prompt

```
# Goal
Implement container signing and verification using Sigstore/cosign to achieve full security attestation for Quiz2Biz container images.

# Tasks
1. Install cosign in the CI/CD pipeline (Azure DevOps)
2. Generate and securely store signing keys in Azure Key Vault
3. Add container signing step to the deployment pipeline:
   - Sign images after successful build
   - Include provenance attestation
   - Publish signature to container registry
4. Implement signature verification before deployment
5. Create SLSA Level 2 provenance attestation
6. Document the signing process and key management procedures

# Acceptance Criteria
- All container images are signed before deployment to any environment
- Signature verification fails deployment if signature is invalid or missing
- Signing keys are stored in Azure Key Vault with appropriate access controls
- SLSA provenance attestation is generated and stored alongside images
- Pipeline fails if signing step fails (no continue-on-error)

# Constraints
- Must use Sigstore/cosign (industry standard)
- Keys must never be exposed in logs or code
- Signing must complete within 2 minutes per image
- Compatible with Azure Container Registry

# Deliverables
1. Updated `azure-pipelines.yml` with signing steps
2. Key Vault configuration for signing keys
3. `/docs/security/container-signing.md` - Process documentation
4. Test results showing signature verification

# Evidence Attachment
- [ ] Pipeline run showing successful signing
- [ ] Screenshot of signed image in registry
- [ ] cosign verify output for signed images
- [ ] SLSA provenance attestation JSON
```

---

## Quest 3: Financial Controls Documentation

**Dimension**: CFO - Unit Economics  
**Gap Identified**: No documented pricing model or unit economics, coverage 0.0  
**Target Coverage**: 0.75

### Generated Prompt

```
# Goal
Create comprehensive unit economics documentation for Quiz2Biz that demonstrates financial viability and supports investor due diligence.

# Tasks
1. Define and document the pricing tier structure:
   - Free tier: limitations and conversion funnel
   - Professional tier: pricing, features, target market
   - Enterprise tier: pricing model (per-seat/per-assessment)
2. Calculate Customer Acquisition Cost (CAC):
   - Marketing channels and costs
   - Sales cycle length
   - Conversion rates by channel
3. Calculate Lifetime Value (LTV):
   - Average subscription duration
   - Expansion revenue potential
   - Churn rate assumptions
4. Document the LTV:CAC ratio with 3 scenarios:
   - Conservative (LTV:CAC 2:1)
   - Expected (LTV:CAC 3:1)
   - Optimistic (LTV:CAC 5:1)
5. Create a break-even analysis
6. Document gross margin calculations

# Acceptance Criteria
- All financial assumptions are clearly stated
- Calculations are reproducible with provided formulas
- Comparison to industry benchmarks included
- Sensitivity analysis for key variables
- Document reviewed by finance stakeholder

# Constraints
- Use realistic assumptions based on comparable SaaS companies
- All numbers must have supporting rationale
- Document must be presentable to investors
- No disclosure of confidential strategic information

# Deliverables
1. `/docs/cfo/business-plan.md` - Updated with unit economics section
2. `/docs/cfo/pricing-strategy.md` - Detailed pricing documentation
3. Financial model spreadsheet (or calculations document)
4. Executive summary presentation (optional)

# Evidence Attachment
- [ ] Upload completed financial documents
- [ ] Attach CFO/Finance stakeholder approval email
- [ ] Include any market research sources used
```

---

## Quest 4: Test Automation Coverage

**Dimension**: CTO - Quality  
**Gap Identified**: Test coverage below 80%, current 0.5  
**Target Coverage**: 0.75

### Generated Prompt

```
# Goal
Increase test automation coverage to 80%+ across the Quiz2Biz codebase to meet quality dimension requirements.

# Tasks
1. Audit current test coverage:
   - Run coverage report for all modules
   - Identify modules with < 60% coverage
   - Prioritize critical business logic modules
2. Write unit tests for Scoring Engine module:
   - Test severity-weighted calculation
   - Test 5-level coverage scale
   - Test edge cases (empty responses, invalid data)
3. Write unit tests for Evidence Registry module:
   - Test hash chain verification
   - Test RFC 3161 timestamp validation
   - Test evidence upload/retrieval
4. Write integration tests for API endpoints:
   - Authentication flows
   - Questionnaire submission
   - Heatmap generation
5. Configure coverage thresholds in CI:
   - Fail build if coverage drops below 75%
   - Generate coverage badges
   - Trend tracking over time

# Acceptance Criteria
- Overall code coverage >= 80%
- All critical modules (Scoring, Evidence, Auth) have >= 85% coverage
- No untested public methods in core services
- Integration tests cover all happy paths
- CI pipeline enforces coverage thresholds

# Constraints
- Use Jest for all tests
- Mock external services (database, Redis, external APIs)
- Tests must complete within 5 minutes in CI
- No flaky tests allowed

# Deliverables
1. New test files for untested modules
2. Updated Jest configuration with thresholds
3. Coverage report showing >= 80%
4. Documentation of testing strategy

# Evidence Attachment
- [ ] Upload coverage report (HTML or JSON)
- [ ] Screenshot of passing CI with coverage gate
- [ ] PR links for new test files
```

---

## Quest 5: Compliance Policy Documentation

**Dimension**: Policy Writer - Governance  
**Gap Identified**: Missing ISO 27001 policy mapping, coverage 0.25  
**Target Coverage**: 1.0

### Generated Prompt

```
# Goal
Create complete ISO 27001 control mapping documentation for Quiz2Biz, demonstrating compliance readiness for certification.

# Tasks
1. Create ISO 27001 Annex A control mapping:
   - Map all 114 controls to Quiz2Biz implementation
   - Document N/A controls with justification
   - Identify gaps requiring remediation
2. Document Information Security Policy:
   - Scope and applicability
   - Roles and responsibilities
   - Policy statements for each control domain
3. Create Statement of Applicability (SoA):
   - Control ID and description
   - Implementation status
   - Evidence reference
4. Map existing controls to policy documents:
   - Link ADRs to relevant controls
   - Link runbooks to incident controls
   - Link access controls to A.9 requirements
5. Create audit trail documentation:
   - Evidence collection procedures
   - Audit schedule
   - Management review process

# Acceptance Criteria
- 100% of ISO 27001 Annex A controls addressed
- Statement of Applicability complete with evidence links
- Gap analysis identifies any remaining work
- Document structure follows ISO 27001 requirements
- Reviewed by compliance/legal stakeholder

# Constraints
- Follow ISO 27001:2022 standard (latest version)
- Use official ISO terminology
- Documents must be audit-ready
- Link to existing Quiz2Biz evidence where possible

# Deliverables
1. `/docs/compliance/iso27001-mapping.md` - Full control mapping
2. `/docs/compliance/statement-of-applicability.md` - SoA document
3. `/docs/policies/information-security-policy.md` - Master policy
4. Gap analysis summary with remediation timeline

# Evidence Attachment
- [ ] Upload all compliance documents
- [ ] Attach control mapping spreadsheet
- [ ] Include stakeholder sign-off
- [ ] Reference existing Quiz2Biz evidence records
```

---

## Usage Notes

These Quest-Mode prompts are generated automatically by the QPG module based on:
1. Current readiness assessment scores
2. Gap analysis between current and target coverage
3. Dimension-specific template rules
4. Evidence requirements for the target coverage level

Each prompt follows the GTACD format (Goal, Tasks, Acceptance, Constraints, Deliverables) and includes evidence attachment checkboxes for traceability.

To generate new Quest-Mode prompts:
```bash
# Via CLI
quiz2biz nqs --session-id <session-id>

# Via API
POST /api/qpg/generate
{
  "sessionId": "...",
  "dimensionId": "...",
  "targetCoverage": 0.75
}
```
